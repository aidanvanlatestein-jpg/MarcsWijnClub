"""De HTTP API en de Lambda-functies. Zie docs/bouwspecificatie.md, hoofdstuk 5."""
from __future__ import annotations

from pathlib import Path
from typing import Dict, Mapping

from aws_cdk import Duration, RemovalPolicy, Stack
from aws_cdk import aws_apigatewayv2 as apigwv2
from aws_cdk import aws_cognito as cognito
from aws_cdk import aws_dynamodb as dynamodb
from aws_cdk import aws_lambda as lambda_
from aws_cdk import aws_logs as logs
from aws_cdk.aws_apigatewayv2_authorizers import HttpUserPoolAuthorizer
from aws_cdk.aws_apigatewayv2_integrations import HttpLambdaIntegration
from constructs import Construct

from .config import Omgeving

FUNCTIES = Path(__file__).resolve().parents[2] / "functions"


class ApiStack(Stack):
    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        *,
        omgeving: Omgeving,
        tabellen: Mapping[str, dynamodb.Table],
        user_pool: cognito.UserPool,
        user_pool_client: cognito.UserPoolClient,
        **kwargs,
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # Alle functies delen dezelfde code. Ze gebruiken alleen boto3, dat in de runtime zit.
        self._code = lambda_.Code.from_asset(str(FUNCTIES), exclude=["**/__pycache__", "**/*.pyc"])

        # Elke aanroep vraagt een geldig token, tenzij een route dat uitdrukkelijk anders zegt.
        leden = HttpUserPoolAuthorizer("Leden", user_pool, user_pool_clients=[user_pool_client])
        self.api = apigwv2.HttpApi(
            self,
            "Api",
            description="Wijnclub {}".format(omgeving.naam),
            create_default_stage=False,
            default_authorizer=leden,
        )
        # De begrenzing voorkomt dat een fout of misbruik kosten opdrijft.
        apigwv2.HttpStage(
            self,
            "Stage",
            http_api=self.api,
            stage_name="$default",
            auto_deploy=True,
            throttle=apigwv2.ThrottleSettings(rate_limit=20, burst_limit=40),
        )
        # CloudFront stuurt /api/* door naar dit adres.
        self.domein = "{}.execute-api.{}.{}".format(self.api.api_id, self.region, self.url_suffix)

        aanbod = self._functie(
            "Aanbod",
            "wijnclub.handlers.aanbod.handler",
            {
                "TABEL_LIJSTEN": tabellen["lijsten"].table_name,
                "TABEL_WIJNEN": tabellen["wijnen"].table_name,
            },
        )
        tabellen["lijsten"].grant_read_data(aanbod)
        tabellen["wijnen"].grant_read_data(aanbod)
        self.api.add_routes(
            path="/api/aanbod",
            methods=[apigwv2.HttpMethod.GET],
            integration=HttpLambdaIntegration("AanbodIntegratie", aanbod),
        )

    def _functie(self, naam: str, handler: str, omgevingsvariabelen: Dict[str, str]) -> lambda_.Function:
        return lambda_.Function(
            self,
            naam,
            runtime=lambda_.Runtime.PYTHON_3_14,
            architecture=lambda_.Architecture.ARM_64,
            handler=handler,
            code=self._code,
            memory_size=256,
            timeout=Duration.seconds(10),
            environment=omgevingsvariabelen,
            log_group=logs.LogGroup(
                self,
                "{}Logboek".format(naam),
                retention=logs.RetentionDays.ONE_MONTH,
                removal_policy=RemovalPolicy.DESTROY,
            ),
        )
