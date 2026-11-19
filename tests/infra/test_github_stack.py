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


def test_rollen_mogen_alleen_rollen_van_cdk_aannemen(sjabloon):
    for beleid in sjabloon.find_resources("AWS::IAM::Policy").values():
        for verklaring in beleid["Properties"]["PolicyDocument"]["Statement"]:
            assert verklaring["Action"] == "sts:AssumeRole"
            assert verklaring["Effect"] == "Allow"


def test_pull_request_mag_alleen_de_leesrol_van_cdk_aannemen(sjabloon):
    beleid = [
        b["Properties"]["PolicyDocument"]["Statement"][0]
        for b in sjabloon.find_resources("AWS::IAM::Policy").values()
        if "lezen" in json.dumps(b["Properties"]["Roles"])
    ]
    assert len(beleid) == 1
    assert "lookup-role" in json.dumps(beleid[0]["Resource"])
    assert "deploy-role" not in json.dumps(beleid[0]["Resource"])


@pytest.mark.parametrize("repo", ["", "wijnclub", "a/b/c"])
def test_ongeldige_repository_stopt_de_synthese(repo):
    app = cdk.App(context={**VLAGGEN, "github_repo": repo})
    with pytest.raises(ValueError):
        github_stack.repo_uit_context(app)
