"""DynamoDB in het geheugen (moto), met de tabellen precies zoals de datastack ze maakt.

De domeinregels bouwen transacties op als dicts; hier worden ze echt uitgevoerd. Zo valt een
tikfout in een voorwaarde of een attribuutnaam op vóór een uitrol, en niet erna.

moto vraagt Python 3.10 of hoger. Op een oudere Python worden deze tests overgeslagen, behalve
als WIJNCLUB_INTEGRATIE=verplicht staat, zoals in de pipeline: dan is een ontbrekende moto een fout.
"""
import os

import pytest

if os.environ.get("WIJNCLUB_INTEGRATIE") != "verplicht":
    pytest.importorskip("moto", reason="moto ontbreekt; draait in de pipeline op Python 3.14")

import aws_cdk as cdk  # noqa: E402
import boto3  # noqa: E402
from aws_cdk.assertions import Template  # noqa: E402
from moto import mock_aws  # noqa: E402

from wijnclub import opslag  # noqa: E402
from wijnclub.domein import dynamo  # noqa: E402
from wijnclub_infra import config  # noqa: E402
from wijnclub_infra.data_stack import DataStack  # noqa: E402

os.environ.setdefault("JSII_SILENCE_WARNING_UNTESTED_NODE_VERSION", "1")

REGIO = "eu-west-1"
_DEFINITIES = None


def tabeldefinities():
    """Naam (leden, wijnen, ...) naar de eigenschappen van de tabel uit het CloudFormation-sjabloon."""
    global _DEFINITIES
    if _DEFINITIES is None:
        app = cdk.App()
        omgeving = config.Omgeving(naam="test", regio=REGIO, afzender_email="noreply@voorbeeld.nl")
        stack = DataStack(app, "Data", omgeving=omgeving)
        bronnen = Template.from_stack(stack).to_json()["Resources"]
        _DEFINITIES = {
            naam: bronnen[stack.get_logical_id(tabel.node.default_child)]["Properties"]
            for naam, tabel in stack.tabellen.items()
        }
    return _DEFINITIES


@pytest.fixture
def tabellen(monkeypatch):
    """Maakt de tabellen aan en geeft naam -> tabelnaam terug, zoals de handlers ze krijgen."""
    for sleutel in ("AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_SESSION_TOKEN"):
        monkeypatch.setenv(sleutel, "nep")
    monkeypatch.setenv("AWS_DEFAULT_REGION", REGIO)
    monkeypatch.delenv("AWS_PROFILE", raising=False)
    with mock_aws():
        client = boto3.client("dynamodb", region_name=REGIO)
        namen = {}
        for naam, eigenschappen in tabeldefinities().items():
            tabelnaam = "t-{}".format(naam)
            vraag = {
                "TableName": tabelnaam,
                "KeySchema": eigenschappen["KeySchema"],
                "AttributeDefinitions": eigenschappen["AttributeDefinitions"],
                "BillingMode": eigenschappen["BillingMode"],
            }
            if eigenschappen.get("GlobalSecondaryIndexes"):
                vraag["GlobalSecondaryIndexes"] = eigenschappen["GlobalSecondaryIndexes"]
            client.create_table(**vraag)
            monkeypatch.setenv("TABEL_{}".format(naam.upper()), tabelnaam)
            namen[naam] = tabelnaam
        # opslag.py onthoudt zijn verbinding; begin met een verse, binnen moto.
        monkeypatch.setattr(opslag, "_bron", None)
        yield namen


@pytest.fixture
def db(tabellen):
    return boto3.client("dynamodb", region_name=REGIO)


@pytest.fixture
def zet(db, tabellen):
    """Schrijft een item in een tabel, zoals de beginsituatie van een test."""

    def zet_(naam, gegevens):
        db.put_item(TableName=tabellen[naam], Item=dynamo.item(gegevens))

    return zet_


@pytest.fixture
def lees(tabellen):
    """Leest een item terug als gewone Python-waarden (getallen als Decimal)."""
    bron = boto3.resource("dynamodb", region_name=REGIO)

    def lees_(naam, **sleutel):
        return bron.Table(tabellen[naam]).get_item(Key=sleutel, ConsistentRead=True).get("Item")

    return lees_
