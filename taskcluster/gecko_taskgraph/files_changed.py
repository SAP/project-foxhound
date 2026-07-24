# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

"""
Support for optimizing tasks based on the set of files that have changed.
"""

import logging
import os
from subprocess import CalledProcessError

from mozbuild.util import memoize
from mozpack.path import join as join_path
from mozpack.path import match as mozpackmatch
from mozversioncontrol import InvalidRepoPath, get_repository_object

from gecko_taskgraph import GECKO
from gecko_taskgraph.util.hg import get_json_pushchangedfiles

logger = logging.getLogger(__name__)


@memoize
def get_changed_files(repository, revision):
    """
    Get the set of files changed in the push headed by the given revision.
    Responses are cached, so multiple calls with the same arguments are OK.
    """
    try:
        return get_json_pushchangedfiles(repository, revision)["files"]
    except KeyError:
        # We shouldn't hit this error in CI.
        if os.environ.get("MOZ_AUTOMATION"):
            raise

        # We're likely on an unpublished commit, grab changed files from
        # version control.
        return get_locally_changed_files(GECKO)


def check(params, file_patterns):
    """Determine whether any of the files changed in the indicated push to
    https://hg.mozilla.org match any of the given file patterns."""
    repository = params.get("head_repository")
    revision = params.get("head_rev")
    if not repository or not revision:
        logger.warning(
            "Missing `head_repository` or `head_rev` parameters; "
            "assuming all files have changed"
        )
        return True

    changed_files = get_changed_files(repository, revision)

    if "comm_head_repository" in params:
        repository = params.get("comm_head_repository")
        revision = params.get("comm_head_rev")
        if not revision:
            logger.warning(
                "Missing `comm_head_rev` parameters; assuming all files have changed"
            )
            return True

        changed_files |= {
            join_path("comm", file) for file in get_changed_files(repository, revision)
        }

    for pattern in file_patterns:
        for path in changed_files:
            if mozpackmatch(path, pattern):
                return True

    return False


def _get_locally_changed_files(repo):
    try:
        vcs = get_repository_object(repo)
        s = set(vcs.get_outgoing_files("AM"))
        return s
    except (InvalidRepoPath, CalledProcessError):
        return set()


class PreloadedGetLocallyChangedFiles:
    """
    Function-like class that performs eager computation of _get_locally_changed_files
    for what looks the default repo.

    The rationale is the following:
    - computing _get_locally_changed_files is relatively slow (~600ms)
    - it's already done through an external command

    So we do that in a background thread as soon as possible, so that at the
    point when we need the result, it's already "prefetched".
    """

    def __init__(self):
        self.preloaded_repo = None
        self.preloading_thread = None
        self.preloaded_answer = None

    def preload(self, repo):
        """
        Fire off preloading of get_locally_changed_files(repo).

        For the sake of simplicity, there can be only one preloaded repo.
        """
        import threading
        from pathlib import Path

        if self.preloaded_repo is not None:
            raise ValueError("Can only preload one repo")

        self.preloaded_repo = Path(repo)

        def preloading():
            self.preloaded_answer = _get_locally_changed_files(self.preloaded_repo)

        self.preloading_thread = threading.Thread(target=preloading, daemon=True)
        self.preloading_thread.start()

    @memoize
    def __call__(self, repo):
        if repo == self.preloaded_repo:
            # A thread can be joined many times, but it's going to happen only
            # once, thanks to @memoize.
            self.preloading_thread.join()
            return self.preloaded_answer
        return _get_locally_changed_files(repo)


get_locally_changed_files = PreloadedGetLocallyChangedFiles()
