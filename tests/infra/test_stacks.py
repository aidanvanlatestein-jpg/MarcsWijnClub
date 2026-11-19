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
    assert namen == ["bieding-index", "lid-index", "lid-index", "lijst-index", "lijst-index", "status-index"]


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
