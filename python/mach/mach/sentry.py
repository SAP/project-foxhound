# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from __future__ import absolute_import

import abc
import re
from os.path import (
    abspath,
    expanduser,
    join,
)

import sentry_sdk
from mozboot.util import get_state_dir
from mach.telemetry import is_telemetry_enabled
from mozversioncontrol import (
    get_repository_object,
    InvalidRepoPath,
    MissingUpstreamRepo,
    MissingVCSTool,
)
from six import string_types

# The following developers frequently modify mach code, and testing will commonly cause
# exceptions to be thrown. We don't want these exceptions reported to Sentry.
_DEVELOPER_BLOCKLIST = [
    "ahalberstadt@mozilla.com",
    "mhentges@mozilla.com",
    "rstewart@mozilla.com",
    "sledru@mozilla.com",
]
# https://sentry.prod.mozaws.net/operations/mach/
_SENTRY_DSN = "https://8228c9aff64949c2ba4a2154dc515f55@sentry.prod.mozaws.net/525"


class ErrorReporter(object):
    @abc.abstractmethod
    def report_exception(self, exception):
        """Report the exception to remote error-tracking software."""


class SentryErrorReporter(ErrorReporter):
    """Reports errors using Sentry."""

    def report_exception(self, exception):
        sentry_sdk.capture_exception(exception)


class NoopErrorReporter(ErrorReporter):
    """Drops errors instead of reporting them.

    This is useful in cases where error-reporting is specifically disabled, such as
    when telemetry hasn't been allowed.
    """

    def report_exception(self, exception):
        pass


def register_sentry(argv, settings, topsrcdir=None):
    if not is_telemetry_enabled(settings):
        return NoopErrorReporter()

    if topsrcdir:
        repo = _get_repository_object(topsrcdir)
        if repo is not None:
            email = repo.get_user_email()
            if email in _DEVELOPER_BLOCKLIST:
                return NoopErrorReporter()

    sentry_sdk.init(
        _SENTRY_DSN, before_send=lambda event, _: _process_event(event, topsrcdir)
    )
    sentry_sdk.add_breadcrumb(message="./mach {}".format(" ".join(argv)))
    return SentryErrorReporter()


def _process_event(sentry_event, topsrcdir):
    if _any_modified_files_matching_event(sentry_event, topsrcdir):
        # Returning None causes the event to be dropped:
        # https://docs.sentry.io/platforms/python/configuration/filtering/#using-beforesend
        return None
    for map_fn in (_settle_mach_module_id, _patch_absolute_paths, _delete_server_name):
        sentry_event = map_fn(sentry_event, topsrcdir)
    return sentry_event


def _settle_mach_module_id(sentry_event, _):
    # Sentry groups issues according to the stack frames and their associated
    # "module" properties. However, one of the modules is being reported
    # like "mach.commands.26a828ef5164403eaff4305ab4cb0fab" (with a generated id).
    # This function replaces that generated id with the static string "<generated>"
    # so that grouping behaves as expected

    stacktrace_frames = sentry_event["exception"]["values"][0]["stacktrace"]["frames"]
    for frame in stacktrace_frames:
        module = frame.get("module")
        if not module:
            continue

        module = re.sub(
            "mach\\.commands\\.[a-f0-9]{32}", "mach.commands.<generated>", module
        )
        frame["module"] = module
    return sentry_event


def _patch_absolute_paths(sentry_event, topsrcdir):
    # As discussed here (https://bugzilla.mozilla.org/show_bug.cgi?id=1636251#c28),
    # we remove usernames from file names with a best-effort basis. The most likely
    # place for usernames to manifest in Sentry information is within absolute paths,
    # such as: "/home/mitch/dev/firefox/mach"
    # We replace the state_dir, obj_dir, src_dir with "<...>" placeholders.
    # Note that we also do a blanket find-and-replace of the user's name with "<user>",
    # which may have ill effects if the user's name is, by happenstance, a substring
    # of some other value within the Sentry event.
    def recursive_patch(value, needle, replacement):
        if isinstance(value, list):
            return [recursive_patch(v, needle, replacement) for v in value]
        elif isinstance(value, dict):
            for key in list(value.keys()):
                next_value = value.pop(key)
                key = needle.sub(replacement, key)
                value[key] = recursive_patch(next_value, needle, replacement)
            return value
        elif isinstance(value, string_types):
            return needle.sub(replacement, value)
        else:
            return value

    for (needle, replacement) in (
        (get_state_dir(), "<statedir>"),
        (topsrcdir, "<topsrcdir>"),
        (expanduser("~"), "~"),
        # Sentry converts "vars" to their "representations". When paths are in local
        # variables on Windows, "C:\Users\MozillaUser\Desktop" becomes
        # "'C:\\Users\\MozillaUser\\Desktop'". To still catch this case, we "repr"
        # the home directory and scrub the beginning and end quotes, then
        # find-and-replace on that.
        (repr(expanduser("~"))[1:-1], "~"),
    ):
        if needle is None:
            continue  # topsrcdir isn't always defined
        needle_regex = re.compile(re.escape(needle), re.IGNORECASE)
        sentry_event = recursive_patch(sentry_event, needle_regex, replacement)
    return sentry_event


def _delete_server_name(sentry_event, _):
    sentry_event.pop("server_name")
    return sentry_event


def _get_repository_object(topsrcdir):
    try:
        return get_repository_object(topsrcdir)
    except (InvalidRepoPath, MissingVCSTool):
        return None


def _any_modified_files_matching_event(sentry_event, topsrcdir):
    repo = _get_repository_object(topsrcdir)
    if repo is None:
        return False  # Conservatively assume the tree is clean.

    try:
        files = set(repo.get_outgoing_files()) | set(repo.get_changed_files())
    except MissingUpstreamRepo:
        return False

    files = set(abspath(join(topsrcdir, s)) for s in files)

    # Return True iff the abs_path in any of the stack traces match the set of
    # changed files locally. Be careful not to crash if something's missing from
    # the dictionary.
    for exception in sentry_event.get("exception", {}).get("values", []):
        for frame in exception.get("stacktrace", {}).get("frames", []):
            if frame.get("abs_path", None) in files:
                return True
    return False
