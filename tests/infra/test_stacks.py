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
    # Dezelfde instellingen als een echte synthese, zodat de test hetzelfde bouwt. Alleen de laag met
    # anthropic wordt niet gebouwd: dat vraagt pip en internet, en zegt niets over het sjabloon.
    app = cdk.App(context=dict(VLAGGEN, **{"aws:cdk:bundling-stacks": []}))
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


def test_zeven_tabellen_met_betalen_naar_gebruik_en_herstel(test):
    tabellen = test["data"].find_resources("AWS::DynamoDB::Table")
    assert len(tabellen) == 7
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
    ("tellers",): ["tellerId"],
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
    beleid = {
        naam: document for naam, document in test["api"].find_resources("AWS::IAM::Policy").items()
        if naam.startswith("Aanbod")
    }
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


# ---- Het taalmodel: herkennen en teksten ----

MODELFUNCTIES = ("wijnclub.handlers.herken.handler", "wijnclub.handlers.teksten.handler")


def _beleid_van(sjabloon, handler):
    """De regels in het beleid van de rol van één functie."""
    functies = sjabloon.find_resources("AWS::Lambda::Function", {"Properties": {"Handler": handler}})
    assert len(functies) == 1
    rol = next(iter(functies.values()))["Properties"]["Role"]["Fn::GetAtt"][0]
    regels = [
        regel
        for document in sjabloon.find_resources("AWS::IAM::Policy").values()
        if {"Ref": rol} in document["Properties"]["Roles"]
        for regel in document["Properties"]["PolicyDocument"]["Statement"]
    ]
    assert regels, "geen rechten gevonden voor {}".format(handler)
    return regels


def _acties(regel):
    return [regel["Action"]] if isinstance(regel["Action"], str) else regel["Action"]


@pytest.mark.parametrize("naam", ["test", "prod"])
@pytest.mark.parametrize("handler", MODELFUNCTIES)
def test_modelfunctie_leest_precies_een_geheim_en_schrijft_alleen_in_tellers(naam, handler, test, prod):
    sjabloon = {"test": test, "prod": prod}[naam]["api"]
    regels = _beleid_van(sjabloon, handler)

    geheimen = [regel for regel in regels if any(a.startswith("secretsmanager:") for a in _acties(regel))]
    assert len(geheimen) == 1
    assert json.dumps(geheimen[0]["Resource"]).count(":secret:") == 1
    assert ":secret:wijnclub/{}/anthropic-api-sleutel-".format(naam) in json.dumps(geheimen[0]["Resource"])

    schrijven = [regel for regel in regels if any(a.startswith("dynamodb:") for a in _acties(regel))]
    assert [_acties(regel) for regel in schrijven] == [["dynamodb:UpdateItem"]]
    assert "Tellers" in json.dumps(schrijven[0]["Resource"])

    alle = {actie for regel in regels for actie in _acties(regel)}
    assert alle <= {"secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret", "dynamodb:UpdateItem"}


def test_geen_rechten_op_bedrock(test):
    for document in test["api"].find_resources("AWS::IAM::Policy").values():
        for regel in document["Properties"]["PolicyDocument"]["Statement"]:
            assert not any(actie.startswith("bedrock") for actie in _acties(regel))


@pytest.mark.parametrize("route", ["POST /api/beheer/herken", "POST /api/beheer/teksten"])
def test_modelroutes_vragen_een_token(test, route):
    test["api"].has_resource_properties("AWS::ApiGatewayV2::Route", {"RouteKey": route, "AuthorizationType": "JWT"})


@pytest.mark.parametrize("handler", MODELFUNCTIES)
def test_modelfunctie_heeft_30_seconden_de_laag_en_alleen_de_naam_van_het_geheim(test, handler):
    functie = next(iter(test["api"].find_resources("AWS::Lambda::Function", {"Properties": {"Handler": handler}}).values()))
    eigenschappen = functie["Properties"]
    assert eigenschappen["Timeout"] == 30
    assert len(eigenschappen["Layers"]) == 1
    variabelen = eigenschappen["Environment"]["Variables"]
    assert variabelen["GEHEIM_ANTHROPIC"] == "wijnclub/test/anthropic-api-sleutel"
    assert set(variabelen) == {"GEHEIM_ANTHROPIC", "TABEL_TELLERS"}


def test_andere_functies_houden_10_seconden_en_geen_laag(test):
    test["api"].has_resource_properties(
        "AWS::Lambda::Function",
        {"Handler": "wijnclub.handlers.aanbod.handler", "Timeout": 10, "Layers": Match.absent()},
    )


def test_de_laag_is_voor_arm64_en_python_3_14(test):
    test["api"].has_resource_properties(
        "AWS::Lambda::LayerVersion", {"CompatibleArchitectures": ["arm64"], "CompatibleRuntimes": ["python3.14"]}
    )


def test_tellers_vervallen_vanzelf(test, prod):
    for sjabloon in (test, prod):
        sjabloon["data"].has_resource_properties(
            "AWS::DynamoDB::Table",
            {
                "KeySchema": [{"AttributeName": "tellerId", "KeyType": "HASH"}],
                "TimeToLiveSpecification": {"AttributeName": "vervaltOp", "Enabled": True},
            },
        )


def test_geheim_van_anthropic_per_omgeving():
    assert config.Omgeving(naam="prod", regio="eu-west-1", afzender_email="a@b.nl").anthropic_geheim == (
        "wijnclub/prod/anthropic-api-sleutel"
    )
