"""Instellingen per omgeving. De waarden komen uit cdk.json of van de opdrachtregel."""
from __future__ import annotations

from dataclasses import dataclass

OMGEVINGEN = ("test", "prod")


@dataclass(frozen=True)
class Omgeving:
    naam: str
    regio: str
    afzender_email: str

    @property
    def is_prod(self) -> bool:
        return self.naam == "prod"

    def stacknaam(self, deel: str) -> str:
        return "Wijnclub-{}-{}".format(self.naam, deel)

    @property
    def mollie_geheim(self) -> str:
        """Naam van het geheim in Secrets Manager. De waarde staat nergens in de code."""
        return "wijnclub/{}/mollie-api-sleutel".format(self.naam)

    @property
    def anthropic_geheim(self) -> str:
        """Naam van het geheim met de sleutel van Anthropic. Aidan zet de sleutel er zelf in, per omgeving."""
        return "wijnclub/{}/anthropic-api-sleutel".format(self.naam)


def laad(app) -> Omgeving:
    naam = app.node.try_get_context("omgeving") or "test"
    regio = app.node.try_get_context("regio") or "eu-west-1"
    afzender = app.node.try_get_context("afzender_email") or ""
    if naam not in OMGEVINGEN:
        raise ValueError("omgeving moet test of prod zijn, niet '{}'".format(naam))
    if "@" not in afzender:
        raise ValueError(
            "afzender_email ontbreekt. Cognito verstuurt de inlogcode via Amazon SES en heeft "
            "een geverifieerd afzenderadres nodig. Zet het in infra/cdk.json of geef het mee "
            "met: -c afzender_email=naam@jouwdomein.nl"
        )
    return Omgeving(naam=naam, regio=regio, afzender_email=afzender)
