"""Toegang voor GitHub Actions tot AWS, zonder vaste sleutels.

GitHub logt via OIDC in en krijgt een tijdelijke rol. Welke rol hangt af van waar de
workflow vandaan komt:

- een pull request: alleen lezen, voor cdk diff;
- de branch main: uitrollen naar test;
- de GitHub-omgeving `productie`: uitrollen naar productie.

Deze stack rol je eenmalig zelf uit. De pipeline rolt hem nooit uit, omdat hij rechten regelt:

    cd infra && npx aws-cdk@2.1149.0 deploy Wijnclub-GitHub -c afzender_email=...

Let op: test en productie staan in hetzelfde account en delen de uitrolrollen van CDK.
De scheiding zit dus in de voorwaarden hieronder en in de beveiliging van de omgeving
`productie` in GitHub, niet in wat de rollen in AWS mogen.
"""
from __future__ import annotations

from typing import Any, Sequence

from aws_cdk import DefaultStackSynthesizer, Duration, Stack
from aws_cdk import aws_iam as iam
from constructs import Construct

GITHUB_TOKENS = "token.actions.githubusercontent.com"

# Vaste namen, zodat de workflows de rollen kunnen vinden met alleen het accountnummer.
ROL_LEZEN = "wijnclub-github-lezen"
ROL_TEST = "wijnclub-github-test"
ROL_PROD = "wijnclub-github-prod"


def repo_uit_context(app: Any) -> str:
    repo = app.node.try_get_context("github_repo") or ""
    if repo.count("/") != 1 or repo.startswith("/") or repo.endswith("/"):
        raise ValueError("github_repo moet de vorm eigenaar/naam hebben, niet '{}'".format(repo))
    return repo


class GitHubStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, *, repo: str, **kwargs: Any) -> None:
        super().__init__(scope, construct_id, **kwargs)
        if repo.count("/") != 1:
            raise ValueError("repo moet de vorm eigenaar/naam hebben, niet '{}'".format(repo))

        provider = iam.OidcProviderNative(
            self,
            "GitHub",
            url="https://" + GITHUB_TOKENS,
            client_ids=["sts.amazonaws.com"],
        )

        def cdk_rol(soort: str) -> str:
            return "arn:{}:iam::{}:role/cdk-{}-{}-role-{}-{}".format(
                self.partition,
                self.account,
                DefaultStackSynthesizer.DEFAULT_QUALIFIER,
                soort,
                self.account,
                self.region,
            )

        def rol(naam: str, onderwerp: str, beschrijving: str, cdk_rollen: Sequence[str]) -> iam.Role:
            nieuwe_rol = iam.Role(
                self,
                naam,
                role_name=naam,
                description=beschrijving,
                max_session_duration=Duration.hours(1),
                assumed_by=iam.OpenIdConnectPrincipal(
                    provider,
                    conditions={
                        "StringEquals": {
                            GITHUB_TOKENS + ":aud": "sts.amazonaws.com",
                            GITHUB_TOKENS + ":sub": "repo:{}:{}".format(repo, onderwerp),
                        },
                    },
                ),
            )
            # De rol mag zelf niets in AWS; hij mag alleen de rollen van CDK aannemen.
            nieuwe_rol.add_to_policy(
                iam.PolicyStatement(
                    actions=["sts:AssumeRole"],
                    resources=[cdk_rol(soort) for soort in cdk_rollen],
                )
            )
            return nieuwe_rol

        uitrollen = ["deploy", "file-publishing", "image-publishing", "lookup"]
        self.lezen = rol(ROL_LEZEN, "pull_request", "GitHub: cdk diff bij een pull request, alleen lezen", ["lookup"])
        self.test = rol(ROL_TEST, "ref:refs/heads/main", "GitHub: uitrol naar test vanaf main", uitrollen)
        self.prod = rol(ROL_PROD, "environment:productie", "GitHub: uitrol naar productie vanuit de omgeving productie", uitrollen)
