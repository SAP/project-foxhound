# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at https://mozilla.org/MPL/2.0/.


import sys
from pathlib import Path

from mach.decorators import Command, SubCommand  # type: ignore

COMPONENT_DIR = Path(__file__).parent.resolve()
GENERATED_METRICS_PATH = COMPONENT_DIR / "generated-metrics.yaml"


@Command(
    "gecko-trace",
    category="misc",
    description="GeckoTrace utilities",
)
def gecko_trace(_):
    msg = "Gecko Trace helper utilities.\n\nRun `mach gecko-trace --help` for further details."
    print(msg)


@SubCommand(
    "gecko-trace",
    "glean-metrics",
    description="Generate Glean metrics YAML from event definitions",
)
def generate_metrics(_):
    # We need to add the component directory to the path to import the generation scripts.
    sys.path.insert(0, str(COMPONENT_DIR / "scripts"))

    from codegen import generate_glean_metrics  # type: ignore

    with open(GENERATED_METRICS_PATH, "w") as metrics_file:
        generate_glean_metrics(metrics_file)

    print(
        f"Metrics YAML successfully written to:\n\n{GENERATED_METRICS_PATH}",
        file=sys.stderr,
    )
