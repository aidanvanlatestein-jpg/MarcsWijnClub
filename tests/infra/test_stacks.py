"""Controleert wat de stacks opleveren, zonder iets uit te rollen."""
import json
from pathlib import Path

import aws_cdk as cdk
import pytest
from aws_cdk.assertions import Match, Template

from wijnclub_infra import config, opbouw

VLAGGEN = {
    sleutel: waarde
    for sleutel, waarde in json.loads((Path(__file__).resolve().parents[2] / "infra" / "cdk.json").read_text())["context"].items()
    if sleutel.startswith("@")
}


def sjablonen(naam, web_map):
    # Dezelfde instellingen als een echte synthese, zodat de test hetzelfde bouwt.
    app = cdk.App(context=VLAGGEN)
    omgeving = config.Omgeving(naam=naam, regio="eu-west-1", afzender_email="noreply@voorbeeld.nl")
    return {deel: Template.from_stack(stack) for deel, stack in opbouw.bouw(app, omgeving, web_map).items()}


@pytest.fixture(scope="module")
def web_map(tmp_path_factory):
    # Een nep-build, zodat de tests niet afhangen van npm run build.
    map_ = tmp_path_factory.mktemp("dist")
    (map_ / "index.html").write_text("<!doctype html>")
    return map_


@pytest.fixture(scope="module")
def test(web_map):
    return sjablonen("test", web_map)


@pytest.fixture(scope="module")
def prod(web_map):
    return sjablonen("prod", web_map)


def test_zes_tabellen_met_betalen_naar_gebruik_en_herstel(test):
    tabellen = test["data"].find_resources("AWS::DynamoDB::Table")
    assert len(tabellen) == 6
    for tabel in tabellen.values():
        eigenschappen = tabel["Properties"]
        assert eigenschappen["BillingMode"] == "PAY_PER_REQUEST"
        assert eigenschappen["PointInTimeRecoverySpecification"]["PointInTimeRecoveryEnabled"] is True


def test_indexen_uit_de_bouwspecificatie(test):
    namen = sorted(
        index["IndexName"]
        for tabel in test["data"].find_resources("AWS::DynamoDB::Table").values()
        for index in tabel["Properties"].get("GlobalSecondaryIndexes", [])
    )
    assert namen == [
        "betaal-index", "bieding-index", "lid-index", "lid-index", "lijst-index", "lijst-index", "status-index",
    ]


def _sleutels(schema):
    return [veld["AttributeName"] for veld in sorted(schema, key=lambda v: v["KeyType"] != "HASH")]


# Een andere sleutel betekent een nieuwe, lege tabel. In prod blijft de oude met de gegevens als wees
# staan; in test is hij weg. Tabellen worden alleen uitgebreid. Zie "Tabellen en sleutels" in de bouwspecificatie.
SLEUTELS = {
    ("leden",): ["lidId"],
    ("lijsten",): ["lijstId"],
    ("lijsten", "status-index"): ["status", "openTot"],
    ("wijnen",): ["wijnId"],
    ("wijnen", "lijst-index"): ["lijstId", "volgorde"],
    ("wijnen", "bieding-index"): ["biedingStatus", "eindtijd"],
    ("biedingen",): ["wijnId", "tijdstipLid"],
    ("biedingen", "lid-index"): ["lidId", "tijdstip"],
    ("bestellingen",): ["bestellingId"],
    ("bestellingen", "lid-index"): ["lidId", "aangemaakt"],
    ("bestellingen", "lijst-index"): ["lijstId", "aangemaakt"],
    ("bestellingen", "betaal-index"): ["status", "betaalVoor"],
    ("betalingen",): ["mollieBetalingId"],
}


@pytest.mark.parametrize("naam", ["test", "prod"])
def test_sleutels_van_elke_tabel_en_index_veranderen_niet(naam, test, prod):
    gevonden = {}
    for logisch_id, tabel in {"test": test, "prod": prod}[naam]["data"].find_resources("AWS::DynamoDB::Table").items():
        eigenschappen = tabel["Properties"]
        # De logische id begint met de naam van de tabel: Leden..., Wijnen...
        tabelnaam = next(t for (t, *_) in SLEUTELS if logisch_id.lower().startswith(t))
        gevonden[(tabelnaam,)] = _sleutels(eigenschappen["KeySchema"])
        for index in eigenschappen.get("GlobalSecondaryIndexes", []):
            gevonden[(tabelnaam, index["IndexName"])] = _sleutels(index["KeySchema"])
            assert index["Projection"] == {"ProjectionType": "ALL"}
    assert gevonden == SLEUTELS


def test_open_bestellingen_zijn_te_vinden_op_betaalvoor(test):
    # De taak voor verlopen zoekt open bestellingen waarvan betaalVoor voorbij is.
    test["data"].has_resource_properties(
        "AWS::DynamoDB::Table",
        {
            "KeySchema": [{"AttributeName": "bestellingId", "KeyType": "HASH"}],
            "GlobalSecondaryIndexes": Match.array_with([
                Match.object_like({
                    "IndexName": "betaal-index",
                    "KeySchema": [
                        {"AttributeName": "status", "KeyType": "HASH"},
                        {"AttributeName": "betaalVoor", "KeyType": "RANGE"},
                    ],
                })
            ]),
        },
    )


def test_tabellen_blijven_staan_in_prod_en_verdwijnen_in_test(test, prod):
    for tabel in prod["data"].find_resources("AWS::DynamoDB::Table").values():
        assert tabel["DeletionPolicy"] == "Retain"
        assert tabel["Properties"]["DeletionProtectionEnabled"] is True
    for tabel in test["data"].find_resources("AWS::DynamoDB::Table").values():
        assert tabel["DeletionPolicy"] == "Delete"


def test_inloggen_alleen_op_uitnodiging_met_code_per_email(test):
    test["inloggen"].has_resource_properties(
        "AWS::Cognito::UserPool",
        {
            "AdminCreateUserConfig": {"AllowAdminCreateUserOnly": True},
            "UserPoolTier": "ESSENTIALS",
            "Policies": {"SignInPolicy": {"AllowedFirstAuthFactors": Match.array_with(["EMAIL_OTP"])}},
            "EmailConfiguration": {"EmailSendingAccount": "DEVELOPER", "From": Match.string_like_regexp("noreply@voorbeeld.nl")},
        },
    )
    test["inloggen"].has_resource_properties(
        "AWS::Cognito::UserPoolClient",
        {"ExplicitAuthFlows": Match.array_with(["ALLOW_USER_AUTH"]), "GenerateSecret": False},
    )
    test["inloggen"].has_resource_properties("AWS::Cognito::UserPoolGroup", {"GroupName": "beheer"})


def test_aanbod_vraagt_een_token(test):
    test["api"].has_resource_properties(
        "AWS::ApiGatewayV2::Route", {"RouteKey": "GET /api/aanbod", "AuthorizationType": "JWT"}
    )
    test["api"].has_resource_properties("AWS::ApiGatewayV2::Authorizer", {"AuthorizerType": "JWT"})


def test_api_is_begrensd(test):
    test["api"].has_resource_properties(
        "AWS::ApiGatewayV2::Stage",
        {"DefaultRouteSettings": {"ThrottlingRateLimit": 20, "ThrottlingBurstLimit": 40}},
    )


def test_functie_draait_op_python_3_14_met_logboek_van_een_maand(test):
    test["api"].has_resource_properties(
        "AWS::Lambda::Function",
        {"Runtime": "python3.14", "Handler": "wijnclub.handlers.aanbod.handler", "Architectures": ["arm64"]},
    )
    test["api"].has_resource_properties("AWS::Logs::LogGroup", {"RetentionInDays": 30})


def test_aanbod_mag_alleen_lezen(test):
    beleid = test["api"].find_resources("AWS::IAM::Policy")
    acties = {
        actie
        for document in beleid.values()
        for regel in document["Properties"]["PolicyDocument"]["Statement"]
        for actie in ([regel["Action"]] if isinstance(regel["Action"], str) else regel["Action"])
    }
    assert acties, "geen rechten gevonden"
    assert not any(actie.startswith(("dynamodb:Put", "dynamodb:Update", "dynamodb:Delete", "dynamodb:BatchWrite")) for actie in acties)


def test_bucket_is_niet_publiek(test):
    test["web"].has_resource_properties(
        "AWS::S3::Bucket",
        {
            "PublicAccessBlockConfiguration": {
                "BlockPublicAcls": True,
                "BlockPublicPolicy": True,
                "IgnorePublicAcls": True,
                "RestrictPublicBuckets": True,
            }
        },
    )


def test_cloudfront_stuurt_api_door_zonder_cache(test):
    test["web"].has_resource_properties(
        "AWS::CloudFront::Distribution",
        {
            "DistributionConfig": {
                "DefaultRootObject": "index.html",
                "CacheBehaviors": [Match.object_like({"PathPattern": "/api/*", "ViewerProtocolPolicy": "https-only"})],
            }
        },
    )


def test_zonder_afzender_stopt_de_opbouw_met_uitleg():
    app = cdk.App(context={"omgeving": "test", "afzender_email": ""})
    with pytest.raises(ValueError, match="afzender_email ontbreekt"):
        config.laad(app)


def test_zonder_gebouwde_web_app_stopt_de_opbouw_met_uitleg(tmp_path):
    app = cdk.App(context=VLAGGEN)
    omgeving = config.Omgeving(naam="test", regio="eu-west-1", afzender_email="noreply@voorbeeld.nl")
    with pytest.raises(FileNotFoundError, match="npm run build"):
        opbouw.bouw(app, omgeving, tmp_path)


def test_onbekende_omgeving_wordt_geweigerd():
    app = cdk.App(context={"omgeving": "acceptatie", "afzender_email": "a@b.nl"})
    with pytest.raises(ValueError, match="test of prod"):
        config.laad(app)
