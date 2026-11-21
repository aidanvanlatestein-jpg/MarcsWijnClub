"""De route naar het taalmodel, via de API van Anthropic. Zie docs/bouwspecificatie.md, hoofdstuk 5 en 7.

`vraag_model(schema)` geeft een functie met de vorm (instructie, vraag) -> str. De handlers geven die
als `vraag_model` mee aan `tekst.stel_voor()` en `herkennen.herken()`; de regels in `domein/` weten
niets van Anthropic.

- De sleutel staat in Secrets Manager. De functie krijgt alleen de naam van het geheim
  (GEHEIM_ANTHROPIC) en leest de waarde één keer per opstart.
- Het pakket `anthropic` zit in een Lambda-laag en wordt pas bij de eerste aanroep geladen. Zo
  draaien de tests ook op Python 3.9, waar het pakket niet werkt.
- Het model komt uit TAALMODEL en begint op Claude Haiku 5.5.
- Weigert het model, stopt het op de tokengrens, ontbreekt de sleutel of is de API niet bereikbaar,
  dan volgt ModelNietBeschikbaar. De handler antwoordt dan 503 en Marc vult zelf in.

In het logboek komt alleen de soort fout, nooit de instructie, de vraag of het antwoord.
"""
from __future__ import annotations

import logging
import os
import time
from typing import Any, Callable, Mapping, Optional

import boto3
from botocore.exceptions import BotoCoreError, ClientError

logger = logging.getLogger(__name__)

MODEL_STANDAARD = "claude-haiku-5-5"
TIJDSLIMIET = 20.0  # seconden per poging; de functie zelf heeft er 30
VERBINDEN = 5.0  # seconden om verbinding te maken
MAX_TOKENS = 8000  # ruim voor drie voorstellen van 600 tekens, met het denken van het model erbij
PAUZE = 1.0  # seconden voor de ene herhaling

_client: Any = None


class ModelNietBeschikbaar(Exception):
    """Het model gaf geen bruikbaar antwoord. `reden` is een korte soort, voor het logboek."""

    def __init__(self, reden: str) -> None:
        super().__init__(reden)
        self.reden = reden


def _sleutel() -> str:
    naam = os.environ.get("GEHEIM_ANTHROPIC")
    if not naam:
        raise ModelNietBeschikbaar("geen_geheim")
    try:
        waarde = boto3.client("secretsmanager").get_secret_value(SecretId=naam).get("SecretString")
    except (ClientError, BotoCoreError) as fout:
        logger.warning("sleutel van Anthropic niet te lezen: %s", type(fout).__name__)
        raise ModelNietBeschikbaar("geen_sleutel") from None
    if not isinstance(waarde, str) or not waarde.strip():
        raise ModelNietBeschikbaar("geen_sleutel")
    return waarde.strip()


def _maak_client() -> Any:
    """De client, één keer per opstart. Mislukt het lezen van de sleutel, dan de volgende keer opnieuw."""
    global _client
    if _client is None:
        sleutel = _sleutel()
        # Pas hier: het pakket zit in de laag en werkt niet op Python 3.9. De ignore is voor mypy
        # zolang het pakket niet lokaal staat.
        import anthropic  # type: ignore[import-not-found, unused-ignore]

        # Zelf herhalen, zie _vraag: de SDK zou ook na een time-out herhalen, en dan past het niet
        # meer in de 30 seconden van de functie.
        _client = anthropic.Anthropic(
            api_key=sleutel,
            timeout=anthropic.Timeout(TIJDSLIMIET, connect=VERBINDEN),
            max_retries=0,
        )
    return _client


def _model() -> str:
    return os.environ.get("TAALMODEL") or MODEL_STANDAARD


def _vraag(schema: Mapping[str, Any], instructie: str, vraag: str) -> str:
    import anthropic  # type: ignore[import-not-found, unused-ignore]

    client = _maak_client()
    argumenten = dict(
        model=_model(),
        max_tokens=MAX_TOKENS,
        system=instructie,
        messages=[{"role": "user", "content": vraag}],
        output_config={"format": {"type": "json_schema", "schema": dict(schema)}},
    )
    # Hoogstens één herhaling, en alleen na een fout die snel kwam: een volle limiet, een fout bij
    # Anthropic of een mislukte verbinding. Na een time-out is de tijd van de functie bijna op.
    poging = 0
    while True:
        poging += 1
        try:
            antwoord = client.messages.create(**argumenten)
            break
        except anthropic.APITimeoutError:
            raise ModelNietBeschikbaar("tijd") from None
        except anthropic.RateLimitError:
            if poging > 1:
                raise ModelNietBeschikbaar("limiet") from None
        except anthropic.InternalServerError as fout:
            if poging > 1:
                raise ModelNietBeschikbaar("status_{}".format(fout.status_code)) from None
        except anthropic.APIStatusError as fout:
            # 400, 401, 403, 404: opnieuw proberen helpt niet.
            raise ModelNietBeschikbaar("status_{}".format(fout.status_code)) from None
        except anthropic.APIConnectionError:
            if poging > 1:
                raise ModelNietBeschikbaar("verbinding") from None
        time.sleep(PAUZE)
    return _tekst(antwoord)


def _tekst(antwoord: Any) -> str:
    reden: Optional[str] = getattr(antwoord, "stop_reason", None)
    if reden == "refusal":
        raise ModelNietBeschikbaar("weigering")
    if reden in ("max_tokens", "model_context_window_exceeded"):
        raise ModelNietBeschikbaar("tokengrens")
    delen = [blok.text for blok in getattr(antwoord, "content", None) or [] if getattr(blok, "type", None) == "text"]
    return "".join(delen)


def vraag_model(schema: Mapping[str, Any]) -> Callable[[str, str], str]:
    """Een functie (instructie, vraag) -> str die het model vraagt om JSON in dit schema."""

    def vraag(instructie: str, tekst: str) -> str:
        return _vraag(schema, instructie, tekst)

    return vraag
