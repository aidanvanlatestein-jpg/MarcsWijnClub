#!/usr/bin/env python3
"""De CDK-app van de wijnclub. Kies de omgeving met: cdk synth -c omgeving=test"""
import aws_cdk as cdk

from wijnclub_infra import config, github_stack, opbouw

app = cdk.App()
omgeving = config.laad(app)
opbouw.bouw(app, omgeving)

# Toegang voor GitHub Actions. Eén keer per account, los van test en productie; zie github_stack.py.
github_stack.GitHubStack(
    app,
    "Wijnclub-GitHub",
    repo=github_stack.repo_uit_context(app),
    env=cdk.Environment(region=omgeving.regio),
)
app.synth()
