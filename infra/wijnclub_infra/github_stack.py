"""Toegang voor GitHub Actions tot AWS, zonder vaste sleutels.

GitHub logt via OIDC in en krijgt een tijdelijke rol. Welke rol hangt af van waar de
workflow vandaan komt:

- een pull request: alleen de sjablonen van de stacks lezen, voor cdk diff;
- de branch main: uitrollen naar test;
- de GitHub-omgeving `productie`: uitrollen naar productie.

De rol voor een pull request neemt geen rol van CDK aan. De leesrol van CDK heeft
ReadOnlyAccess op het hele account en kan daarmee ook de ledentabel en de gebruikers in
Cognito lezen; een diff heeft alleen de sjablonen nodig. De CLI probeert de leesrol wel
aan te nemen, meldt dat het niet lukt en gaat verder met de rechten van deze rol.

Deze stack rol je eenmalig zelf uit. De pipeline rolt hem nooit uit, omdat hij rechten regelt:

    cd infra && npx aws-cdk@2.1149.0 deploy Wijnclub-GitHub -c afzender_email=...

Let op: test en productie staan in hetzelfde account en delen de uitrolrollen van CDK.
De scheiding zit dus in de voorwaarden hieronder en in de beveiliging van de omgeving
`productie` in GitHub, niet in wat de rollen in AWS mogen. Via die rollen kan de
pipeline alles in het account. Rol deze stack daarom alleen uit in een account met
niets anders dan de wijnclub; zie "Waarom een eigen account" in de README.
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

# De stacks van de wijnclub heten Wijnclub-<omgeving>-<deel>; zie config.Omgeving.stacknaam.
STACKS = "Wijnclub-*"


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

        def rol(naam: str, onderwerp: str, beschrijving: str, rechten: iam.PolicyStatement) -> iam.Role:
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
            nieuwe_rol.add_to_policy(rechten)
            return nieuwe_rol

        def cdk_rollen(soorten: Sequence[str]) -> iam.PolicyStatement:
            # De rol mag zelf niets in AWS; hij mag alleen de rollen van CDK aannemen.
            return iam.PolicyStatement(actions=["sts:AssumeRole"], resources=[cdk_rol(soort) for soort in soorten])

        # Wat cdk diff --change-set=false doet: de stack opzoeken en het sjabloon ophalen.
        # Geen gegevens uit tabellen, buckets, logboeken of Cognito.
        sjablonen_lezen = iam.PolicyStatement(
            actions=["cloudformation:DescribeStacks", "cloudformation:GetTemplate"],
            resources=[
                self.format_arn(service="cloudformation", resource="stack", resource_name="{}/*".format(STACKS)),
            ],
        )

        uitrollen = cdk_rollen(["deploy", "file-publishing", "image-publishing", "lookup"])
        self.lezen = rol(ROL_LEZEN, "pull_request", "GitHub: cdk diff bij een pull request, alleen sjablonen lezen", sjablonen_lezen)
        self.test = rol(ROL_TEST, "ref:refs/heads/main", "GitHub: uitrol naar test vanaf main", uitrollen)
        self.prod = rol(ROL_PROD, "environment:productie", "GitHub: uitrol naar productie vanuit de omgeving productie", uitrollen)
