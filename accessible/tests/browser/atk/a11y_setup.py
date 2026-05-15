# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

"""Python environment for ATK a11y browser tests."""

import os
import subprocess
import sys

import psutil

# pyatspi can't be installed using pip. Rely on the system installation.
# Get the path to the system installation of pyatspi.
# Some systems have pyatspi and gi in different locations, so get both.
extraPaths = eval(
    subprocess.check_output(
        (
            os.path.join(sys.base_prefix, "bin", "python3"),
            "-c",
            "import pyatspi, gi; print(repr([pyatspi.__file__, gi.__file__]))",
        ),
        encoding="utf-8",
    ).rstrip()
)

sys.path += [os.path.dirname(os.path.dirname(p)) for p in extraPaths]
import pyatspi
from gi.repository import GObject

del sys.path[-len(extraPaths) :]
del extraPaths


def setup():
    # We do all the setup we need at module level.
    pass


def getDoc():
    """Get the Accessible for the document being tested."""
    # We can compare the parent process ids to find the Firefox started by the
    # test harness.
    commonPid = psutil.Process().ppid()
    for app in pyatspi.Registry.getDesktop(0):
        if (
            app.name == "Firefox"
            and psutil.Process(app.get_process_id()).ppid() == commonPid
        ):
            break
    else:
        raise LookupError("Couldn't find Firefox application Accessible")
    root = app[0]
    for embeds in root.getRelationSet():
        if embeds.getRelationType() == pyatspi.RELATION_EMBEDS:
            break
    else:
        raise LookupError("Firefox root doesn't have RELATION_EMBEDS")
    doc = embeds.getTarget(0)
    child = doc[0]
    if child.get_attributes().get("id") == "default-iframe-id":
        # This is an iframe or remoteIframe test.
        doc = child[0]
    return doc


def findByDomId(root, id):
    for child in root:
        if child.get_attributes().get("id") == id:
            return child
        descendant = findByDomId(child, id)
        if descendant:
            return descendant


class WaitForEvent:
    """Wait for an event.
    This should be used as follows:
    1. Create an instance to wait for the desired event.
    2. Perform the action that should fire the event.
    3. Call wait() on the instance you created in 1) to wait for the event.
    """

    def __init__(self, eventName, match):
        """eventName is the name of the event to wait for.
        match is either None to match any object, an str containing the DOM id
        of the desired object, or a function taking an Atspi.Event object
        which should return True if this is the requested event.
        """
        self._match = match
        self._matched = None
        # self._onEvent returns a different bound method each time it is
        # fetched. Capture a single instance so we can remove it later.
        self._onEventBound = self._onEvent
        pyatspi.Registry.registerEventListener(self._onEventBound, eventName)
        self._timeoutId = GObject.timeout_add_seconds(10, self._onTimeout)

    def _onEvent(self, event):
        if isinstance(self._match, str):
            if event.source.get_attributes().get("id") == self._match:
                self._matched = event
        elif callable(self._match):
            try:
                if self._match(event):
                    self._matched = event
            except Exception as e:
                self._matched = e
        if self._matched:
            pyatspi.Registry.stop()

    def _onTimeout(self):
        pyatspi.Registry.stop()
        return False  # Remove this timeout handler.

    def wait(self):
        """Wait for and return the desired Atspi.Event object."""
        # Starts an event loop which blocks until stopped.
        pyatspi.Registry.start()
        # pyatspi.Registry.stop() will be called by self._onEvent or
        # self._onTimeout, after which execution will return here.
        pyatspi.Registry.deregisterEventListener(self._onEventBound)
        self._onEventBound = None  # Remove circular reference.
        if not self._matched:
            raise TimeoutError("Timeout before desired event received")
        # Our timeout wasn't reached, so the handler wasn't removed.
        GObject.source_remove(self._timeoutId)
        if isinstance(self._matched, Exception):
            raise self._matched from self._matched
        return self._matched
