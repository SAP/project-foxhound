# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


from shlex import quote as shell_quote
from typing import Literal, Optional, Union

from gecko_taskgraph.transforms.job import configure_taskdesc_for_run, run_job_using
from taskgraph.util import path
from taskgraph.util.schema import Schema, taskref_or_string_msgspec


class SecretSchema(Schema, kw_only=True):
    name: str
    path: str
    key: str
    json: Optional[bool] = None
    decode: Optional[bool] = None


class DummySecretSchema(Schema, kw_only=True):
    content: str
    path: str
    json: Optional[bool] = None


class GradlewSchema(Schema, kw_only=True):
    using: Literal["gradlew"]
    pre_gradlew: Optional[list[list[str]]] = None
    gradlew: list[str]
    post_gradlew: Optional[list[list[str]]] = None
    # Base work directory used to set up the task.
    workdir: str
    use_caches: Optional[Union[bool, list[str]]] = None
    secrets: Optional[list[SecretSchema]] = None
    dummy_secrets: Optional[list[DummySecretSchema]] = None


class MachGradleSchema(Schema, kw_only=True):
    using: Literal["mach-gradle"]
    gradle_project: str
    gradle_args: list[str]
    mach_build_exports: Optional[bool] = None
    workdir: Optional[str] = None
    use_caches: Optional[Union[bool, list[str]]] = None


class RunCommandsSchema(Schema, kw_only=True):
    using: Literal["run-commands"]
    pre_commands: Optional[list[list[str]]] = None
    commands: list[list[taskref_or_string_msgspec]]
    workdir: str
    use_caches: Optional[Union[bool, list[str]]] = None
    secrets: Optional[list[SecretSchema]] = None
    dummy_secrets: Optional[list[DummySecretSchema]] = None


@run_job_using("docker-worker", "run-commands", schema=RunCommandsSchema)
def configure_run_commands_schema(config, job, taskdesc):
    run = job["run"]
    pre_commands = run.pop("pre-commands", [])
    pre_commands += [
        _generate_dummy_secret_command(secret)
        for secret in run.pop("dummy-secrets", [])
    ]
    pre_commands += [
        _generate_secret_command(secret) for secret in run.get("secrets", [])
    ]

    all_commands = pre_commands + run.pop("commands", [])

    run["command"] = _convert_commands_to_string(all_commands)
    _inject_secrets_scopes(run, taskdesc)
    _set_run_task_attributes(job)
    configure_taskdesc_for_run(config, job, taskdesc, job["worker"]["implementation"])


@run_job_using("docker-worker", "gradlew", schema=GradlewSchema)
def configure_gradlew(config, job, taskdesc):
    run = job["run"]
    worker = taskdesc["worker"] = job["worker"]

    fetches_dir = "/builds/worker/fetches"
    topsrc_dir = "/builds/worker/checkouts/gecko"
    worker.setdefault("env", {}).update({
        "ANDROID_SDK_ROOT": path.join(fetches_dir, "android-sdk-linux"),
        "GRADLE_USER_HOME": path.join(
            topsrc_dir, "mobile/android/gradle/dotgradle-offline"
        ),
        "MOZ_BUILD_DATE": config.params["moz_build_date"],
    })
    worker["env"].setdefault(
        "MOZCONFIG",
        path.join(
            topsrc_dir,
            "mobile/android/config/mozconfigs/android-arm/nightly-android-lints",
        ),
    )
    worker["env"].setdefault(
        "MOZ_ANDROID_FAT_AAR_ARCHITECTURES", "armeabi-v7a,arm64-v8a,x86_64"
    )

    dummy_secrets = [
        _generate_dummy_secret_command(secret)
        for secret in run.pop("dummy-secrets", [])
    ]
    secrets = [_generate_secret_command(secret) for secret in run.get("secrets", [])]
    worker["env"].update({
        "PRE_GRADLEW": _convert_commands_to_string(run.pop("pre-gradlew", [])),
        "GET_SECRETS": _convert_commands_to_string(dummy_secrets + secrets),
        "GRADLEW_ARGS": " ".join(run.pop("gradlew")),
        "POST_GRADLEW": _convert_commands_to_string(run.pop("post-gradlew", [])),
    })
    run["command"] = (
        "/builds/worker/checkouts/gecko/taskcluster/scripts/builder/build-android.sh"
    )
    _inject_secrets_scopes(run, taskdesc)
    _set_run_task_attributes(job)
    configure_taskdesc_for_run(config, job, taskdesc, job["worker"]["implementation"])


@run_job_using("docker-worker", "mach-gradle", schema=MachGradleSchema)
def configure_mach_gradle(config, job, taskdesc):
    run = job["run"]
    worker = taskdesc["worker"] = job["worker"]

    fetches_dir = "/builds/worker/fetches"
    topsrc_dir = "/builds/worker/checkouts/gecko"
    worker.setdefault("env", {}).update({
        "ANDROID_SDK_ROOT": path.join(fetches_dir, "android-sdk-linux"),
        "GRADLE_USER_HOME": path.join(
            topsrc_dir, "mobile/android/gradle/dotgradle-offline"
        ),
        "MOZ_BUILD_DATE": config.params["moz_build_date"],
    })
    worker["env"].setdefault(
        "MOZCONFIG",
        path.join(
            topsrc_dir,
            "mobile/android/config/mozconfigs/android-arm/nightly-android-lints",
        ),
    )

    worker["env"].update({
        "GRADLE_PROJECT": run.pop("gradle-project"),
        "GRADLE_ARGS": " ".join(run.pop("gradle-args")),
    })
    if run.pop("mach-build-exports", False):
        worker["env"]["MACH_BUILD_EXPORTS"] = "1"
    run["command"] = path.join(topsrc_dir, "taskcluster/scripts/builder/mach-gradle.sh")
    _set_run_task_attributes(job)
    configure_taskdesc_for_run(config, job, taskdesc, job["worker"]["implementation"])


def _generate_secret_command(secret):
    secret_command = [
        "/builds/worker/checkouts/gecko/taskcluster/scripts/get-secret.py",
        "-s",
        secret["name"],
        "-k",
        secret["key"],
        "-f",
        secret["path"],
    ]
    if secret.get("json"):
        secret_command.append("--json")

    if secret.get("decode"):
        secret_command.append("--decode")

    return secret_command


def _generate_dummy_secret_command(secret):
    secret_command = [
        "/builds/worker/checkouts/gecko/taskcluster/scripts/write-dummy-secret.py",
        "-f",
        secret["path"],
        "-c",
        secret["content"],
    ]
    if secret.get("json"):
        secret_command.append("--json")

    return secret_command


def _convert_commands_to_string(commands):
    should_artifact_reference = False
    should_task_reference = False

    sanitized_commands = []
    for command in commands:
        sanitized_parts = []
        for part in command:
            if isinstance(part, dict):
                if "artifact-reference" in part:
                    part_string = part["artifact-reference"]
                    should_artifact_reference = True
                elif "task-reference" in part:
                    part_string = part["task-reference"]
                    should_task_reference = True
                else:
                    raise ValueError(f"Unsupported dict: {part}")
            else:
                part_string = part

            sanitized_parts.append(part_string)
        sanitized_commands.append(sanitized_parts)

    shell_quoted_commands = [
        " ".join(map(shell_quote, command)) for command in sanitized_commands
    ]
    full_string_command = " && ".join(shell_quoted_commands)

    if should_artifact_reference and should_task_reference:
        raise NotImplementedError(
            '"arifact-reference" and "task-reference" cannot be both used'
        )
    elif should_artifact_reference:
        return {"artifact-reference": full_string_command}
    elif should_task_reference:
        return {"task-reference": full_string_command}
    else:
        return full_string_command


def _inject_secrets_scopes(run, taskdesc):
    secrets = run.pop("secrets", [])
    scopes = taskdesc.setdefault("scopes", [])
    new_secret_scopes = ["secrets:get:{}".format(secret["name"]) for secret in secrets]
    new_secret_scopes = list(
        set(new_secret_scopes)
    )  # Scopes must not have any duplicates
    scopes.extend(new_secret_scopes)


def _set_run_task_attributes(job):
    run = job["run"]
    run["cwd"] = "{checkout}"
    run["using"] = "run-task"
