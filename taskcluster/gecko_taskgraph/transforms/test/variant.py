# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
import datetime
from typing import Literal, Optional

import jsone
import taskgraph
from taskgraph.transforms.base import TransformSequence
from taskgraph.util.copy import deepcopy
from taskgraph.util.schema import Schema, resolve_keyed_by, validate_schema
from taskgraph.util.templates import merge
from taskgraph.util.treeherder import join_symbol, split_symbol

from gecko_taskgraph.util.chunking import TEST_VARIANTS

transforms = TransformSequence()

"""List of available test variants defined."""


class VariantEntry(Schema, kw_only=True):
    description: str
    suffix: str
    treeherder_suffix: Optional[str] = None
    mozinfo: Optional[str] = None
    component: str
    expiration: str
    when: Optional[dict[Literal["$eval", "$if"], str]] = None
    replace: Optional[dict[str, object]] = None
    merge: Optional[dict[str, object]] = None

    def __post_init__(self):
        super().__post_init__()
        if self.expiration != "never":
            try:
                datetime.datetime.strptime(self.expiration, "%Y-%m-%d")
            except ValueError as e:
                raise ValueError(
                    f"Invalid expiration {self.expiration!r}, "
                    "must be a date in YYYY-MM-DD format or 'never'"
                ) from e


@transforms.add
def split_variants(config, tasks):
    """Splits test definitions into multiple tasks based on the `variants` key.

    If `variants` are defined, the original task will be yielded along with a
    copy of the original task for each variant defined in the list. The copies
    will have the 'unittest_variant' attribute set.
    """
    if not taskgraph.fast:
        for name, variant in TEST_VARIANTS.items():
            validate_schema(
                VariantEntry, variant, f"In variants.yml, variant {name!r}:"
            )

    def find_expired_variants(variants):
        expired = []

        # do not expire on esr/beta/release
        if config.params.get("release_type", "") in [
            "release",
            "beta",
        ]:
            return []

        if "esr" in config.params.get("release_type", ""):
            return []

        today = datetime.datetime.today()
        for variant in variants:
            expiration = variants[variant]["expiration"]
            if len(expiration.split("-")) == 1:
                continue
            expires_at = datetime.datetime.strptime(expiration, "%Y-%m-%d")
            if expires_at < today:
                expired.append(variant)
        return expired

    def remove_expired(variants, expired):
        remaining_variants = []
        for name in variants:
            parts = [p for p in name.split("+") if p in expired]
            if len(parts) > 0:
                continue

            remaining_variants.append(name)
        return remaining_variants

    def replace_task_items(task_key, variant_key):
        for item in variant_key:
            if isinstance(variant_key[item], dict):
                task_key[item] = replace_task_items(
                    task_key.get(item, {}), variant_key[item]
                )
            else:
                task_key[item] = variant_key[item]
        return task_key

    def apply_variant(variant, task, name):
        task["description"] = variant["description"].format(**task)

        suffix = f"-{variant['suffix']}"
        th_suffix = f"-{variant.get('treeherder-suffix') or variant['suffix']}"
        group, symbol = split_symbol(task["treeherder-symbol"])
        if group != "?":
            group += th_suffix
        else:
            symbol += th_suffix
        task["treeherder-symbol"] = join_symbol(group, symbol)

        # This will be used to set the label and try-name in 'make_job_description'.
        task.setdefault("variant-suffix", "")
        task["variant-suffix"] += suffix

        # Replace and/or merge the configuration.

        # we only want to update the leaf node, the the entire top level dict
        task = replace_task_items(task, variant.get("replace", {}))

        resolve_keyed_by(
            task,
            "mozharness.extra-options",
            item_name=task["test-name"],
            enforce_single_match=False,
            variant=name,
        )

        return merge(task, deepcopy(variant.get("merge", {})))

    expired_variants = find_expired_variants(TEST_VARIANTS)
    for task in tasks:
        variants = task.pop("variants", [])
        variants = remove_expired(variants, expired_variants)

        if task.pop("run-without-variant"):
            taskv = deepcopy(task) if variants else task
            taskv["attributes"]["unittest_variant"] = None
            yield taskv

        for name in variants:
            # Apply composite variants (joined by '+') in order.
            parts = name.split("+")
            taskv = deepcopy(task)
            for part in parts:
                variant = TEST_VARIANTS[part]

                # If any variant in a composite fails this check we skip it.
                if "when" in variant:
                    context = {"task": task}
                    if not jsone.render(variant["when"], context):
                        break

                taskv = apply_variant(variant, taskv, name)
            else:
                taskv["attributes"]["unittest_variant"] = name
                yield taskv
