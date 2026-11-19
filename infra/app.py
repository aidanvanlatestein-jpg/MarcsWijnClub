#!/usr/bin/env python3
"""De CDK-app van de wijnclub. Kies de omgeving met: cdk synth -c omgeving=test"""
import aws_cdk as cdk

from wijnclub_infra import config, opbouw

app = cdk.App()
opbouw.bouw(app, config.laad(app))
app.synth()
