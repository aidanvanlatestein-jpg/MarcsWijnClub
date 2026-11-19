"""Zet de vier stacks van één omgeving in elkaar."""
from __future__ import annotations

from typing import Dict

import aws_cdk as cdk

from .api_stack import ApiStack
from .auth_stack import AuthStack
from .config import Omgeving
from .data_stack import DataStack
from .web_stack import WebStack


def bouw(app: cdk.App, omgeving: Omgeving) -> Dict[str, cdk.Stack]:
    env = cdk.Environment(region=omgeving.regio)

    data = DataStack(app, omgeving.stacknaam("Data"), omgeving=omgeving, env=env)
    inloggen = AuthStack(app, omgeving.stacknaam("Inloggen"), omgeving=omgeving, env=env)
    api = ApiStack(
        app,
        omgeving.stacknaam("Api"),
        omgeving=omgeving,
        tabellen=data.tabellen,
        user_pool=inloggen.user_pool,
        user_pool_client=inloggen.client,
        env=env,
    )
    web = WebStack(
        app,
        omgeving.stacknaam("Web"),
        omgeving=omgeving,
        api_domein=api.domein,
        user_pool=inloggen.user_pool,
        user_pool_client=inloggen.client,
        env=env,
    )
    for stack in (data, inloggen, api, web):
        cdk.Tags.of(stack).add("project", "wijnclub")
        cdk.Tags.of(stack).add("omgeving", omgeving.naam)
    return {"data": data, "inloggen": inloggen, "api": api, "web": web}
