"""Controleert de toegang van GitHub Actions tot AWS, zonder iets uit te rollen."""
import json
from pathlib import Path

import aws_cdk as cdk
import pytest
from aws_cdk.assertions import Template

from wijnclub_infra import github_stack

VLAGGEN = {
    sleutel: waarde
    for sleutel, waarde in json.loads((Path(__file__).resolve().parents[2] / "infra" / "cdk.json").read_text())["context"].items()
    if sleutel.startswith("@")
}
REPO = "eigenaar/wijnclub"


@pytest.fixture(scope="module")
def sjabloon():
    app = cdk.App(context=VLAGGEN)
    stack = github_stack.GitHubStack(app, "Wijnclub-GitHub", repo=REPO, env=cdk.Environment(region="eu-west-1"))
    return Template.from_stack(stack)


def rollen(sjabloon):
    return {r["Properties"]["RoleName"]: r["Properties"] for r in sjabloon.find_resources("AWS::IAM::Role").values()}


def test_een_oidc_koppeling_met_github(sjabloon):
    koppelingen = sjabloon.find_resources("AWS::IAM::OIDCProvider")
    assert len(koppelingen) == 1
    eigenschappen = next(iter(koppelingen.values()))["Properties"]
    assert eigenschappen["Url"] == "https://token.actions.githubusercontent.com"
    assert eigenschappen["ClientIdList"] == ["sts.amazonaws.com"]


def test_drie_rollen_met_vaste_namen(sjabloon):
    assert sorted(rollen(sjabloon)) == sorted([github_stack.ROL_LEZEN, github_stack.ROL_TEST, github_stack.ROL_PROD])


@pytest.mark.parametrize(
    "naam, onderwerp",
    [
        (github_stack.ROL_LEZEN, "repo:eigenaar/wijnclub:pull_request"),
        (github_stack.ROL_TEST, "repo:eigenaar/wijnclub:ref:refs/heads/main"),
        (github_stack.ROL_PROD, "repo:eigenaar/wijnclub:environment:productie"),
    ],
)
def test_elke_rol_alleen_vanuit_de_juiste_plek(sjabloon, naam, onderwerp):
    verklaringen = rollen(sjabloon)[naam]["AssumeRolePolicyDocument"]["Statement"]
    assert len(verklaringen) == 1
    voorwaarde = verklaringen[0]["Condition"]
    assert voorwaarde == {
        "StringEquals": {
            "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
            "token.actions.githubusercontent.com:sub": onderwerp,
        }
    }
    assert rollen(sjabloon)[naam]["MaxSessionDuration"] == 3600


def verklaringen(sjabloon, rol):
    """Alle rechten van één rol. De naam van het beleid begint met de naam van de rol."""
    gevonden = [
        verklaring
        for beleid in sjabloon.find_resources("AWS::IAM::Policy").values()
        if rol in json.dumps(beleid["Properties"]["Roles"])
        for verklaring in beleid["Properties"]["PolicyDocument"]["Statement"]
    ]
    assert gevonden, "geen rechten gevonden voor " + rol
    return gevonden


def test_elke_rol_heeft_precies_een_beleid_en_geen_beheerd_beleid(sjabloon):
    assert len(sjabloon.find_resources("AWS::IAM::Policy")) == 3
    for eigenschappen in rollen(sjabloon).values():
        assert "ManagedPolicyArns" not in eigenschappen
        assert "Policies" not in eigenschappen


@pytest.mark.parametrize("logisch", ["wijnclubgithubtest", "wijnclubgithubprod"])
def test_uitrolrollen_mogen_alleen_rollen_van_cdk_aannemen(sjabloon, logisch):
    for verklaring in verklaringen(sjabloon, logisch):
        assert verklaring["Action"] == "sts:AssumeRole"
        assert verklaring["Effect"] == "Allow"
        assert "role/cdk-hnb659fds-" in json.dumps(verklaring["Resource"])


def test_pull_request_leest_alleen_sjablonen_van_de_wijnclub(sjabloon):
    gevonden = verklaringen(sjabloon, "wijnclubgithublezen")
    assert len(gevonden) == 1
    assert gevonden[0]["Effect"] == "Allow"
    assert sorted(gevonden[0]["Action"]) == ["cloudformation:DescribeStacks", "cloudformation:GetTemplate"]
    doel = json.dumps(gevonden[0]["Resource"])
    assert ":stack/Wijnclub-*/*" in doel
    assert '"*"' not in doel


def test_pull_request_neemt_geen_rol_van_cdk_aan(sjabloon):
    # De leesrol van CDK heeft ReadOnlyAccess en kan de ledentabel lezen.
    tekst = json.dumps(verklaringen(sjabloon, "wijnclubgithublezen"))
    assert "sts:AssumeRole" not in tekst
    assert "lookup-role" not in tekst


def test_onveranderlijk_onderwerp_met_vaste_ids():
    app = cdk.App(context=VLAGGEN)
    stack = github_stack.GitHubStack(
        app, "Wijnclub-GitHub", repo="eigenaar@1/wijnclub@2", env=cdk.Environment(region="eu-west-1")
    )
    verklaring = rollen(Template.from_stack(stack))[github_stack.ROL_TEST]["AssumeRolePolicyDocument"]["Statement"][0]
    onderwerp = verklaring["Condition"]["StringEquals"]["token.actions.githubusercontent.com:sub"]
    assert onderwerp == "repo:eigenaar@1/wijnclub@2:ref:refs/heads/main"


def test_cdk_json_gebruikt_het_onveranderlijke_onderwerp():
    context = json.loads((Path(__file__).resolve().parents[2] / "infra" / "cdk.json").read_text())["context"]
    eigenaar, naam = context["github_repo"].split("/")
    assert "@" in eigenaar and "@" in naam


@pytest.mark.parametrize("repo", ["", "wijnclub", "a/b/c"])
def test_ongeldige_repository_stopt_de_synthese(repo):
    app = cdk.App(context={**VLAGGEN, "github_repo": repo})
    with pytest.raises(ValueError):
        github_stack.repo_uit_context(app)
