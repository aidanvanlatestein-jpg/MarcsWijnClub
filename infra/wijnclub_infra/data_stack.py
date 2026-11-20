"""De zes tabellen. Zie docs/bouwspecificatie.md, hoofdstuk 2."""
from __future__ import annotations

from typing import Dict, Optional

from aws_cdk import RemovalPolicy, Stack
from aws_cdk import aws_dynamodb as dynamodb
from constructs import Construct

from .config import Omgeving

TEKST = dynamodb.AttributeType.STRING
GETAL = dynamodb.AttributeType.NUMBER


def _veld(naam: str, soort=TEKST) -> dynamodb.Attribute:
    return dynamodb.Attribute(name=naam, type=soort)


class DataStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, *, omgeving: Omgeving, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)
        self._omgeving = omgeving
        self.tabellen: Dict[str, dynamodb.Table] = {}

        self._tabel("leden", "lidId")

        lijsten = self._tabel("lijsten", "lijstId")
        lijsten.add_global_secondary_index(
            index_name="status-index", partition_key=_veld("status"), sort_key=_veld("openTot")
        )

        wijnen = self._tabel("wijnen", "wijnId")
        wijnen.add_global_secondary_index(
            index_name="lijst-index", partition_key=_veld("lijstId"), sort_key=_veld("volgorde", GETAL)
        )
        # Alleen wijnen met een bieding hebben biedingStatus, dus alleen die staan in deze index.
        wijnen.add_global_secondary_index(
            index_name="bieding-index", partition_key=_veld("biedingStatus"), sort_key=_veld("eindtijd")
        )

        biedingen = self._tabel("biedingen", "wijnId", "tijdstipLid")
        biedingen.add_global_secondary_index(
            index_name="lid-index", partition_key=_veld("lidId"), sort_key=_veld("tijdstip")
        )

        bestellingen = self._tabel("bestellingen", "bestellingId")
        bestellingen.add_global_secondary_index(
            index_name="lid-index", partition_key=_veld("lidId"), sort_key=_veld("aangemaakt")
        )
        bestellingen.add_global_secondary_index(
            index_name="lijst-index", partition_key=_veld("lijstId"), sort_key=_veld("aangemaakt")
        )
        # Open bestellingen waarvan de termijn voorbij is: die laat de taak voor verlopen vervallen.
        bestellingen.add_global_secondary_index(
            index_name="betaal-index", partition_key=_veld("status"), sort_key=_veld("betaalVoor")
        )
        self._tabel("betalingen", "mollieBetalingId")

    def _tabel(self, naam: str, sleutel: str, sorteer: Optional[str] = None) -> dynamodb.Table:
        prod = self._omgeving.is_prod
        tabel = dynamodb.Table(
            self,
            naam.capitalize(),
            partition_key=_veld(sleutel),
            sort_key=_veld(sorteer) if sorteer else None,
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            point_in_time_recovery_specification=dynamodb.PointInTimeRecoverySpecification(
                point_in_time_recovery_enabled=True
            ),
            deletion_protection=prod,
            # In test verdwijnen de tabellen met de stack; in prod blijven ze staan.
            removal_policy=RemovalPolicy.RETAIN if prod else RemovalPolicy.DESTROY,
        )
        self.tabellen[naam] = tabel
        return tabel
