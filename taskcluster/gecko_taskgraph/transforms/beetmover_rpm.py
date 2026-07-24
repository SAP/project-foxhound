# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
from collections import defaultdict

from taskgraph.transforms.base import TransformSequence
from taskgraph.util.dependencies import get_primary_dependency

from gecko_taskgraph.util.scriptworker import (
    generate_artifact_registry_gcs_sources_rpm,
    get_beetmover_repo_action_scope,
    get_beetmover_yum_repo_scope,
)

transforms = TransformSequence()


@transforms.add
def beetmover_rpm(config, tasks):
    products_tasks = defaultdict(lambda: [])

    for task in tasks:
        dep = get_primary_dependency(config, task)
        assert dep

        product = dep.attributes.get("shipping_product")
        products_tasks[product].append(task)

    for product, product_tasks in products_tasks.items():
        dependencies = {}
        gcs_sources = []

        for task in product_tasks:
            dep = get_primary_dependency(config, task)
            assert dep

            dependencies[dep.label] = dep.label
            gcs_sources.extend(generate_artifact_registry_gcs_sources_rpm(dep))

        description = f"Beetmover YUM submission for the {config.params['release_type']} {product} .rpm packages"
        platform = f"{product}-release/opt"

        treeherder = {
            "platform": platform,
            "tier": 1,
            "kind": "other",
            "symbol": "BM-rpm",
        }

        yum_repo_scope = get_beetmover_yum_repo_scope(config)
        repo_action_scope = get_beetmover_repo_action_scope(config)

        attributes = {
            "required_signoffs": ["mar-signing"],
            "shippable": True,
            "shipping_product": product,
        }

        worker = {
            "implementation": "beetmover-import-from-gcs-to-artifact-registry",
            "product": product,
            "gcs-sources": gcs_sources,
        }

        task = {
            "label": f"{config.kind}-{platform}",
            "description": description,
            "worker-type": "beetmover",
            "treeherder": treeherder,
            "scopes": [yum_repo_scope, repo_action_scope],
            "attributes": attributes,
            "shipping-phase": "ship",
            "shipping-product": product,
            "dependencies": dependencies,
            "worker": worker,
        }

        yield task
