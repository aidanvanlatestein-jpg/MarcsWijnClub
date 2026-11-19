"""De web-app op S3 achter CloudFront, met de API onder /api/* op hetzelfde adres."""
from __future__ import annotations

from pathlib import Path

from aws_cdk import CfnOutput, RemovalPolicy, Stack
from aws_cdk import aws_cloudfront as cloudfront
from aws_cdk import aws_cloudfront_origins as origins
from aws_cdk import aws_cognito as cognito
from aws_cdk import aws_s3 as s3
from aws_cdk import aws_s3_deployment as s3deploy
from constructs import Construct

from .config import Omgeving

WEB = Path(__file__).resolve().parents[2] / "app"


class WebStack(Stack):
    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        *,
        omgeving: Omgeving,
        api_domein: str,
        user_pool: cognito.UserPool,
        user_pool_client: cognito.UserPoolClient,
        **kwargs,
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # De bucket is niet publiek: alleen CloudFront mag erbij.
        bucket = s3.Bucket(
            self,
            "Bestanden",
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            encryption=s3.BucketEncryption.S3_MANAGED,
            enforce_ssl=True,
            removal_policy=RemovalPolicy.RETAIN if omgeving.is_prod else RemovalPolicy.DESTROY,
            auto_delete_objects=not omgeving.is_prod,
        )

        self.distributie = cloudfront.Distribution(
            self,
            "Distributie",
            comment="Wijnclub {}".format(omgeving.naam),
            default_root_object="index.html",
            default_behavior=cloudfront.BehaviorOptions(
                origin=origins.S3BucketOrigin.with_origin_access_control(bucket),
                viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                response_headers_policy=cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
            ),
            additional_behaviors={
                # Geen eigen foutpagina's op deze distributie: die zouden ook
                # de foutantwoorden van de API vervangen.
                "/api/*": cloudfront.BehaviorOptions(
                    origin=origins.HttpOrigin(api_domein),
                    allowed_methods=cloudfront.AllowedMethods.ALLOW_ALL,
                    cache_policy=cloudfront.CachePolicy.CACHING_DISABLED,
                    origin_request_policy=cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
                    viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
                )
            },
            minimum_protocol_version=cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
            http_version=cloudfront.HttpVersion.HTTP2_AND_3,
            price_class=cloudfront.PriceClass.PRICE_CLASS_100,
        )

        s3deploy.BucketDeployment(
            self,
            "Uitrol",
            destination_bucket=bucket,
            sources=[
                s3deploy.Source.asset(str(WEB)),
                # Wat de web-app nodig heeft om in te loggen. Dit zijn geen geheimen.
                s3deploy.Source.json_data(
                    "config.json",
                    {
                        "regio": omgeving.regio,
                        "userPoolId": user_pool.user_pool_id,
                        "clientId": user_pool_client.user_pool_client_id,
                        "api": "/api",
                    },
                ),
            ],
            distribution=self.distributie,
            distribution_paths=["/*"],
        )

        CfnOutput(self, "Adres", value="https://{}".format(self.distributie.distribution_domain_name))
