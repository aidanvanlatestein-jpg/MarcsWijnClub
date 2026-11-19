"""Inloggen met een code per e-mail, alleen op uitnodiging. Zie hoofdstuk 6."""
from __future__ import annotations

from aws_cdk import Duration, RemovalPolicy, Stack
from aws_cdk import aws_cognito as cognito
from constructs import Construct

from .config import Omgeving


class AuthStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, *, omgeving: Omgeving, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        self.user_pool = cognito.UserPool(
            self,
            "Leden",
            # Zelf aanmelden staat uit: alleen Marc nodigt uit.
            self_sign_up_enabled=False,
            sign_in_aliases=cognito.SignInAliases(email=True),
            sign_in_case_sensitive=False,
            auto_verify=cognito.AutoVerifiedAttrs(email=True),
            standard_attributes=cognito.StandardAttributes(
                email=cognito.StandardAttribute(required=True, mutable=True)
            ),
            # Een code per e-mail vraagt het Essentials-plan en verzending via Amazon SES.
            feature_plan=cognito.FeaturePlan.ESSENTIALS,
            sign_in_policy=cognito.SignInPolicy(
                allowed_first_auth_factors=cognito.AllowedFirstAuthFactors(password=True, email_otp=True)
            ),
            email=cognito.UserPoolEmail.with_ses(
                from_email=omgeving.afzender_email,
                from_name="Wijnclub",
                ses_region=omgeving.regio,
            ),
            mfa=cognito.Mfa.OFF,
            account_recovery=cognito.AccountRecovery.EMAIL_ONLY,
            deletion_protection=omgeving.is_prod,
            removal_policy=RemovalPolicy.RETAIN if omgeving.is_prod else RemovalPolicy.DESTROY,
        )

        self.user_pool.add_group(
            "Beheer", group_name="beheer", description="Marc en de bouwer: mogen het beheer gebruiken"
        )

        self.client = self.user_pool.add_client(
            "Web",
            # USER_AUTH is de stroom waarin het lid met een code inlogt.
            auth_flows=cognito.AuthFlow(user=True),
            generate_secret=False,
            prevent_user_existence_errors=True,
            enable_token_revocation=True,
            access_token_validity=Duration.hours(1),
            id_token_validity=Duration.hours(1),
            # Een jaar, zodat een lid op zijn telefoon ingelogd blijft.
            refresh_token_validity=Duration.days(365),
        )
