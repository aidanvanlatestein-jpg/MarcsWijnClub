"""De Lambda-laag met het pakket anthropic. Zie docs/bouwspecificatie.md, hoofdstuk 7.

CDK bouwt de laag bij `cdk synth` met pip op deze machine, voor ARM64 en Python 3.14, uit
functions/laag/requirements.txt (vaste versies met hashes). Er is geen Docker nodig: pip haalt
alleen kant-en-klare wielen voor dat platform. CDK vraagt een Docker-image, maar dat wordt nooit
gebruikt: lukt pip niet, dan stopt de synth met een fout.
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

import jsii
from aws_cdk import BundlingOptions, DockerImage, ILocalBundling
from aws_cdk import aws_lambda as lambda_
from constructs import Construct

LAAG = Path(__file__).resolve().parents[2] / "functions" / "laag"


@jsii.implements(ILocalBundling)
class _PipOpDezeMachine:
    def try_bundle(self, output_dir: str, *, image=None, **_opties) -> bool:
        subprocess.run(
            [
                sys.executable, "-m", "pip", "install",
                "--no-deps", "--require-hashes", "--only-binary=:all:",
                "--platform", "manylinux2014_aarch64", "--python-version", "3.14", "--implementation", "cp",
                "--target", str(Path(output_dir) / "python"),
                "--quiet", "--disable-pip-version-check", "--no-compile",
                "-r", str(LAAG / "requirements.txt"),
            ],
            check=True,
        )
        return True


def anthropic_laag(scope: Construct, naam: str) -> lambda_.LayerVersion:
    return lambda_.LayerVersion(
        scope,
        naam,
        description="Het pakket anthropic, voor de functies die het taalmodel aanroepen",
        compatible_runtimes=[lambda_.Runtime.PYTHON_3_14],
        compatible_architectures=[lambda_.Architecture.ARM_64],
        code=lambda_.Code.from_asset(
            str(LAAG),
            bundling=BundlingOptions(
                image=DockerImage.from_registry("niet-gebruikt"),
                local=_PipOpDezeMachine(),
            ),
        ),
    )
