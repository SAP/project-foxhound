# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from typing import Optional, Union

from taskgraph.util.schema import Schema, TaskPriority, optionally_keyed_by


class TreeherderConfig(Schema, kw_only=True):
    # Mapping of treeherder group symbols to descriptive names
    group_names: dict[str, str]
    # Mapping of head branch name to Treeherder project
    branch_map: Optional[
        optionally_keyed_by("project", dict[str, str], use_msgspec=True)
    ] = None

    def __post_init__(self):
        for key, value in self.group_names.items():
            if len(value) > 100:
                raise ValueError(
                    f"Treeherder group name for '{key}' exceeds 100 characters"
                )


class IndexConfig(Schema):
    products: list[str]


class TryConfig(Schema):
    # We have a few platforms for which we want to do some "extra" builds, or at
    # least build-ish things.  Sort of.  Anyway, these other things are implemented
    # as different "platforms".  These do *not* automatically ride along with "-p
    # all"
    ridealong_builds: dict[str, list[str]]


class ReleaseFlavor(Schema, kw_only=True):
    product: str
    target_tasks_method: str
    rebuild_kinds: Optional[list[str]] = None
    version_bump: Optional[bool] = None
    partial_updates: Optional[bool] = None


class ReleasePromotionConfig(Schema, kw_only=True):
    products: list[str]
    flavors: dict[str, ReleaseFlavor]
    rebuild_kinds: Optional[list[str]] = None


class ScriptworkerConfig(Schema):
    # Prefix to add to scopes controlling scriptworkers
    scope_prefix: str


class PartnerUrlsConfig(Schema, kw_only=True):
    release_partner_repack: optionally_keyed_by(
        "release-product",
        "release-level",
        "release-type",
        Optional[str],
        use_msgspec=True,
    )
    release_eme_free_repack: optionally_keyed_by(
        "release-product",
        "release-level",
        "release-type",
        Optional[str],
        use_msgspec=True,
    )
    release_partner_attribution: Optional[
        optionally_keyed_by(
            "release-product",
            "release-level",
            "release-type",
            Optional[str],
            use_msgspec=True,
        )
    ] = None


class WorkerAlias(Schema, kw_only=True):
    provisioner: optionally_keyed_by("level", str, use_msgspec=True)
    implementation: str
    os: str
    worker_type: optionally_keyed_by(
        "level",
        "release-level",
        "project",
        str,
        use_msgspec=True,
    )


class WorkersConfig(Schema):
    aliases: dict[str, WorkerAlias]


class HardenedSignConfigEntry(Schema, kw_only=True):
    globs: list[str]
    deep: Optional[bool] = None
    runtime: Optional[bool] = None
    force: Optional[bool] = None
    requirements: Optional[
        optionally_keyed_by(
            "release-product",
            "release-level",
            str,
            use_msgspec=True,
        )
    ] = None
    entitlements: Optional[
        optionally_keyed_by(
            "build-platform",
            "project",
            str,
            use_msgspec=True,
        )
    ] = None
    only_if_milestone_is_nightly: Optional[bool] = None


class MacSigningConfig(Schema, kw_only=True):
    mac_requirements: optionally_keyed_by("platform", str, use_msgspec=True)
    hardened_sign_config: optionally_keyed_by(
        "hardened-signing-type",
        list[HardenedSignConfigEntry],
        use_msgspec=True,
    )


class RunConfig(Schema, kw_only=True):
    use_caches: Optional[Union[bool, list[str]]] = None


class RepositoryConfig(Schema, forbid_unknown_fields=False, kw_only=True):
    name: str
    project_regex: Optional[str] = None
    ssh_secret_name: Optional[str] = None


class TaskgraphConfig(Schema, kw_only=True):
    # Python function to call to register extensions.
    register: Optional[str] = None
    decision_parameters: Optional[str] = None
    run: Optional[RunConfig] = None
    repositories: dict[str, RepositoryConfig]

    def __post_init__(self):
        if not self.repositories:
            raise ValueError("'repositories' must have at least one entry")


class GraphConfigSchema(Schema, kw_only=True):
    # The trust-domain for this graph.
    # (See https://firefox-source-docs.mozilla.org/taskcluster/taskcluster/taskgraph.html#taskgraph-trust-domain)  # noqa
    trust_domain: str
    # This specifes the prefix for repo parameters that refer to the project being built.
    # This selects between `head_rev` and `comm_head_rev` and related paramters.
    # (See http://firefox-source-docs.mozilla.org/taskcluster/taskcluster/parameters.html#push-information  # noqa
    # and http://firefox-source-docs.mozilla.org/taskcluster/taskcluster/parameters.html#comm-push-information)  # noqa
    project_repo_param_prefix: str
    # This specifies the top level directory of the application being built.
    # ie. "browser/" for Firefox, "comm/mail/" for Thunderbird.
    product_dir: str
    treeherder: TreeherderConfig
    index: IndexConfig
    try_: TryConfig
    release_promotion: ReleasePromotionConfig
    scriptworker: ScriptworkerConfig
    task_priority: optionally_keyed_by("project", TaskPriority, use_msgspec=True)
    partner_urls: PartnerUrlsConfig
    workers: WorkersConfig
    mac_signing: MacSigningConfig
    taskgraph: TaskgraphConfig
    expiration_policy: optionally_keyed_by(
        "project",
        "level",
        dict[str, str],
        use_msgspec=True,
    )
