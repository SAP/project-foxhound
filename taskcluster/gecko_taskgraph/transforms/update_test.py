# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
"""
Transform the update-test suite to parametrize by locale, source version, machine
"""

from enum import Enum
from pathlib import Path

from taskgraph.transforms.base import TransformSequence
from taskgraph.util.copy import deepcopy
from taskgraph.util.schema import resolve_keyed_by
from typing_extensions import final

from gecko_taskgraph import GECKO
from gecko_taskgraph.util.attributes import is_try, task_name


@final
class ReleaseType(Enum):
    """Release type"""

    release = 0
    beta = 1
    esr = 2
    other = 3


transforms = TransformSequence()

APPLICATIONS = ["fx"]

PLATFORM_TO_DOCKER = {
    "linux2404-64-shippable": "ubuntu2404-test",
}

SHIPPED_LOCALES_FILE_PATH = Path(GECKO) / "browser/locales/shipped-locales"

TOP_LOCALES = [
    "en-US",
    "zh-CN",
    "de",
    "fr",
    "it",
    "es-ES",
    "pt-BR",
    "ru",
    "pl",
    "en-GB",
]

BASE_TYPE_COMMAND = "./mach update-test"

UPDATE_ARTIFACT_NAME = "public/update-test"

DEFAULT_VERSIONS_BACK = 3

ESR_SUPPORT_CUTOFF = 140


def infix_treeherder_symbol(symbol, infix):
    head, tail = symbol.split("(", 1)
    if infix.startswith("-"):
        infix = infix[1:]
    return f"{head}({tail[:-1]}-{infix})"


@transforms.add
def set_task_configuration(config, tasks):
    release_type = ReleaseType.release
    if config.params["release_type"] == "beta":
        release_type = ReleaseType.beta
    elif config.params["release_type"].startswith("esr"):
        esr_version = int(config.params["release_type"].split("esr")[1])
        release_type = ReleaseType.esr
        if esr_version < ESR_SUPPORT_CUTOFF:
            yield None

    config_tasks = {}
    for dep in config.kind_dependencies_tasks.values():
        if "update-verify-config" in dep.kind:
            config_tasks[task_name(dep)] = dep

    for task in tasks:
        for platform in task["test-platforms"]:
            this_task = deepcopy(task)
            if config_tasks:
                if "linux" in platform:
                    config_task = config_tasks["firefox-linux64"]
                elif "win" in platform:
                    config_task = config_tasks["firefox-win64"]
                elif "osx" in platform:
                    config_task = config_tasks["firefox-macosx64"]
                this_task.setdefault("fetches", {})[config_task.label] = [
                    "update-verify.cfg",
                ]
            if "linux" in platform:
                this_task["worker"]["docker-image"] = {}
                this_task["worker"]["docker-image"]["in-tree"] = PLATFORM_TO_DOCKER[
                    platform
                ]

            this_task.setdefault("attributes", {})
            this_task["attributes"]["build_platform"] = get_build_platform(platform)
            name_segments = this_task["name"].split("-")
            this_task["name"] = "-".join([platform, *name_segments[2:]])
            this_task["description"] = f"Test updates on {platform}"
            this_task["treeherder"]["platform"] = f"{platform}/opt"
            this_task["run"]["cwd"] = "{checkout}"
            del this_task["test-platforms"]

            if this_task["shipping-product"] == "firefox":
                product_channel = release_type.name.lower()
                if this_task["shipping-phase"] == "promote":
                    update_channel = "-localtest"
                elif this_task["shipping-phase"] == "push":
                    update_channel = "-cdntest"
                else:
                    raise OSError("Expected promote or push shipping-phase.")

                if this_task["shipping-phase"] != "promote":
                    this_task["treeherder"]["symbol"] = infix_treeherder_symbol(
                        this_task["treeherder"]["symbol"],
                        this_task["shipping-phase"][:6],
                    )
                if release_type != ReleaseType.release:
                    this_task["name"] = this_task["name"] + f"-{product_channel}"
                this_task["run"]["command"] = (
                    this_task["run"]["command"]
                    + f" --channel {product_channel}{update_channel}"
                )

                if release_type == ReleaseType.esr:
                    this_task["run"]["command"] = (
                        this_task["run"]["command"] + f" --esr-version {esr_version}"
                    )

            if is_try(config.params):
                this_task["run"]["command"] = (
                    this_task["run"]["command"] + " --use-balrog-staging"
                )
                this_task["worker"]["env"]["BALROG_STAGING"] = "1"
            this_task["name"] = this_task["name"].replace("linux-docker-", "")
            this_task["index"]["job-name"] = "update-test-" + this_task["name"]

            resolve_keyed_by(
                item=this_task,
                field="worker-type",
                item_name=this_task["name"],
                **{"test-platform": platform},
            )

            for app in APPLICATIONS:
                if f"-{app}" in this_task["name"]:
                    break

            if f"{app}-" in this_task["name"]:
                (_, infix) = this_task["name"].split(app)
                this_task["treeherder"]["symbol"] = infix_treeherder_symbol(
                    this_task["treeherder"]["symbol"], infix
                )
            yield this_task


@transforms.add
def parametrize_by_locale(config, tasks):
    with open(SHIPPED_LOCALES_FILE_PATH) as f:
        shipped_locales = f.read().split()
    for task in tasks:
        if "locale" not in task.get("name"):
            yield task
            continue
        for locale in TOP_LOCALES:
            if locale not in shipped_locales:
                continue
            this_task = deepcopy(task)
            this_task["run"]["command"] = (
                this_task["run"]["command"] + f" --source-locale {locale}"
            )
            this_task["description"] = (
                f"{this_task['description']}, locale coverage: {locale}"
            )
            this_task["name"] = this_task["name"].replace("locale", locale)
            this_task["index"]["job-name"] = (
                f"{this_task['index']['job-name']}-{locale}"
            )
            this_task["treeherder"]["symbol"] = infix_treeherder_symbol(
                this_task["treeherder"]["symbol"], locale.replace("-", "")
            )
            yield this_task


@transforms.add
def parametrize_by_source_version(config, tasks):
    for task in tasks:
        if "source-version" not in task.get("name"):
            yield task
            continue
        if "-esr" in task.get("name"):
            yield task
            continue
        # NB: We actually want source_versions_back = 0, because it gives us oldest usable ver
        for v in range(5):
            # avoid tasks with different names, same defs
            if v == DEFAULT_VERSIONS_BACK:
                continue
            this_task = deepcopy(task)
            this_task["run"]["command"] = (
                this_task["run"]["command"] + f" --source-versions-back {v}"
            )
            description_tag = (
                " from 3 major versions back" if v == 0 else f" from {v} releases back"
            )
            this_task["description"] = this_task["description"] + description_tag
            ago_tag = "-from-oldest" if v == 0 else f"-from-{v}-ago"
            this_task["name"] = this_task["name"].replace("-source-version", ago_tag)
            this_task["index"]["job-name"] = this_task["index"]["job-name"] + ago_tag
            this_task["treeherder"]["symbol"] = infix_treeherder_symbol(
                this_task["treeherder"]["symbol"], "oldst" if v == 0 else f"bk{v}"
            )
            yield this_task


def get_build_platform(platform):
    build_platforms = {
        "win": "win64-shippable",
        "mac": "macosx64-shippable",
        "lin": "linux64-shippable",
    }
    return build_platforms[platform[:3]]
