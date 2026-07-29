# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from taskgraph.transforms.base import TransformSequence
from taskgraph.util.dependencies import get_primary_dependency

transforms = TransformSequence()

# Projects that will use the legacy "partials" implementation as upstream.
# These stable release channels continue using the proven implementation while
# partials-zucchini is being tested on nightly.
# TODO: Once we're ready to roll this out to production, we should decide if we want to
# hold it in beta for a few cycles, or let it ride the train to release.
# If holding in beta, we'll need to uplift a patch to remove the release entry.
# TODO: update taskcluster/docs/partials.rst once we are fully rolled out
LEGACY_PARTIALS_PROJECTS = {
    "mozilla-release",
    "mozilla-esr115",
    "mozilla-esr140",
}


@transforms.add
def filter_partials_by_project(config, tasks):
    """Control the rollout of partials-zucchini across release channels.

    This transform manages the gradual transition from the legacy "partials" implementation
    to the new "partials-zucchini" implementation. It ensures that partials-zucchini is only
    used on nightly builds, allowing thorough testing before the implementation rides the
    train to beta, release, and ESR channels.

    The transform filters tasks based on their primary dependency (partials or partials-zucchini)
    and the current project/channel, ensuring the appropriate implementation is used for each
    release channel.
    """
    for task in tasks:
        primary_dep = get_primary_dependency(config, task)
        assert primary_dep

        if primary_dep.kind not in (
            "partials",
            "partials-zucchini",
            "partials-zucchini-l10n",
        ):
            yield task
            continue

        if (
            primary_dep.kind == "partials"
            and config.params["project"] not in LEGACY_PARTIALS_PROJECTS
        ):
            continue

        if (
            primary_dep.kind in ("partials-zucchini", "partials-zucchini-l10n")
            and config.params["project"] in LEGACY_PARTIALS_PROJECTS
        ):
            continue

        yield task
