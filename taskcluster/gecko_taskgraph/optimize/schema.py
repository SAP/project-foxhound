#  This Source Code Form is subject to the terms of the Mozilla Public
#  License, v. 2.0. If a copy of the MPL was not distributed with this
#  file, You can obtain one at http://mozilla.org/MPL/2.0/.


import logging
from typing import Optional, Union

import msgspec
import voluptuous
from mozbuild import schedules
from taskgraph.util.schema import Schema

logger = logging.getLogger(__name__)


default_optimizations = (
    # always run this task (default)
    None,
    # always optimize this task
    {"always": None},
    # optimize strategy aliases for build kind
    {"build": list(schedules.ALL_COMPONENTS)},
    # optimization for doc tasks
    {"docs": None},
    # search the index for the given index namespaces, and replace this task if found
    # the search occurs in order, with the first match winning
    {"index-search": [str]},
    # never optimize this task
    {"never": None},
    # skip the task except for every Nth push
    {"skip-unless-expanded": None},
    {"skip-unless-backstop": None},
    {"skip-unless-android-perftest-backstop": None},
    # skip this task if none of the given file patterns match
    {"skip-unless-changed": [str]},
    {"skip-unless-missing-or-changed": [voluptuous.Any(str, [str])]},
    # skip this task if unless the change files' SCHEDULES contains any of these components
    {"skip-unless-schedules": list(schedules.ALL_COMPONENTS)},
    # optimize strategy aliases for the test kind
    {"test": list(schedules.ALL_COMPONENTS)},
    {"test-inclusive": list(schedules.ALL_COMPONENTS)},
    # optimize strategy alias for test-verify tasks
    {"test-verify": list(schedules.ALL_COMPONENTS)},
    # optimize strategy alias for upload-symbols tasks
    {"upload-symbols": None},
    # optimize strategy alias for reprocess-symbols tasks
    {"reprocess-symbols": None},
    # optimization strategy for mozlint tests
    {"skip-unless-mozlint": voluptuous.Any(str, [str])},
    # optimization strategy for sphinx-js documentation
    {"skip-unless-sphinx-js": None},
)

LegacyOptimizationSchema = voluptuous.Any(*default_optimizations)


class OptimizationSchema(Schema, forbid_unknown_fields=False, kw_only=True):
    # always run this task (default)
    always: Optional[None] = None
    # optimize strategy aliases for build kind
    build: Optional[list[str]] = None
    # optimization for doc tasks
    docs: Optional[None] = None
    # search the index for the given index namespaces, and replace this task if found
    # the search occurs in order, with the first match winning
    index_search: Optional[list[str]] = None
    # never optimize this task
    never: Optional[None] = None
    # skip the task except for every Nth push
    skip_unless_expanded: Optional[None] = None
    skip_unless_backstop: Optional[None] = None
    skip_unless_android_perftest_backstop: Optional[None] = None
    # skip this task if none of the given file patterns match
    skip_unless_changed: Optional[list[str]] = None
    skip_unless_missing_or_changed: Optional[list[Union[str, list[str]]]] = None
    # skip this task if unless the change files' SCHEDULES contains any of these components
    skip_unless_schedules: Optional[list[str]] = None
    # optimize strategy aliases for the test kind
    test: Optional[list[str]] = None
    test_inclusive: Optional[list[str]] = None
    # optimize strategy alias for test-verify tasks
    test_verify: Optional[list[str]] = None
    # optimize strategy alias for upload-symbols tasks
    upload_symbols: Optional[None] = None
    # optimize strategy alias for reprocess-symbols tasks
    reprocess_symbols: Optional[None] = None
    # optimization strategy for mozlint tests
    skip_unless_mozlint: Optional[Union[str, list[str]]] = None
    # optimization strategy for sphinx-js documentation
    skip_unless_sphinx_js: Optional[None] = None

    _COMPONENT_FIELDS = (
        "build",
        "skip_unless_schedules",
        "test",
        "test_inclusive",
        "test_verify",
    )

    @classmethod
    def validate(cls, data):
        if not isinstance(data, dict) or len(data) != 1:
            keys = list(data.keys()) if isinstance(data, dict) else []
            raise msgspec.ValidationError(
                f"Exactly one optimization strategy must be specified, got: {keys}"
            )
        super().validate(data)

    def __post_init__(self):
        for field in self._COMPONENT_FIELDS:
            value = getattr(self, field)
            if value is not None:
                invalid = set(value) - set(schedules.ALL_COMPONENTS)
                if invalid:
                    raise ValueError(f"Invalid components in '{field}': {invalid}")


def set_optimization_schema(schema_tuple):
    """Sets LegacyOptimizationSchema so it can be imported by the task transform.
    This function is called by projects that extend Firefox's taskgraph.
    It should be called by the project's taskgraph:register function before
    any transport or job runner code is imported.

    :param tuple schema_tuple: Tuple of possible optimization strategies
    """
    global LegacyOptimizationSchema
    if LegacyOptimizationSchema.validators == default_optimizations:
        logger.info("LegacyOptimizationSchema updated.")
        LegacyOptimizationSchema = voluptuous.Any(*schema_tuple)
    else:
        raise Exception("Can only call set_optimization_schema once.")
