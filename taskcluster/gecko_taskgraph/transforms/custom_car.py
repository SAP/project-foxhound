# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from taskgraph.transforms.base import TransformSequence

transforms = TransformSequence()

CUSTOM_CAR_TASKS = [
    "linux64-custom-car",
    "win64-custom-car",
    "macosx-custom-car",
    "macosx-arm64-custom-car",
    "android-custom-car",
]


@transforms.add
def add_custom_car_optimization(config, tasks):
    for task in tasks:
        if task.get("name") not in CUSTOM_CAR_TASKS:
            yield task
            continue

        task_name = task["name"]
        trust_domain = config.graph_config["trust-domain"]
        level = config.params["level"]

        index_route = f"{trust_domain}.cache.level-{level}.toolchain.{task_name}.latest"
        full_index_route = f"index.{index_route}"

        task.setdefault("routes", []).append(full_index_route)

        if config.params["project"] == "try":
            index_paths = []
            for search_level in reversed(range(int(level), 4)):
                search_route = f"{trust_domain}.cache.level-{search_level}.toolchain.{task_name}.latest"
                index_paths.append(search_route)

            task["optimization"] = {"index-search": index_paths}

        yield task
