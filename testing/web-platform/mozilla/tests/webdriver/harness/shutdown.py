# META: timeout = long

import os
import signal
import subprocess

import pytest
from tests.support.sync import Poll

IS_WINDOWS = os.name == "nt"

if IS_WINDOWS:
    SIGNALS = [signal.CTRL_BREAK_EVENT]
else:
    SIGNALS = [signal.SIGINT, signal.SIGTERM]


def is_process_alive(pid):
    if IS_WINDOWS:
        try:
            output = subprocess.check_output(
                ["tasklist", "/FI", f"PID eq {pid}"], text=True
            )
            return str(pid) in output
        except subprocess.CalledProcessError:
            return False

    try:
        os.kill(pid, 0)
        return True
    except OSError:
        return False


@pytest.mark.parametrize("signal", SIGNALS)
def test_firefox_quits_on_signal(configuration, geckodriver, signal):
    popen_kwargs = {}
    if IS_WINDOWS:
        # Start geckodriver in its own process group so that
        # CTRL_BREAK_EVENT is only delivered to it and not to the
        # parent cmd.exe, which would otherwise prompt
        # "Terminate batch job (Y/N)?" and hang.
        popen_kwargs["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP

    driver = geckodriver(
        config=configuration,
        popen_kwargs=popen_kwargs,
    )
    driver.new_session()

    firefox_pid = driver.session.capabilities["moz:processID"]

    driver.proc.send_signal(signal)

    wait = Poll(
        driver.session,
        # geckodriver first attempts a graceful Firefox shutdown and waits
        # up to 70s before force-killing the process. Add a few extra seconds
        # to avoid false positives on slower systems.
        timeout=75,
        message="Firefox process still running after geckodriver was terminated",
    )
    wait.until(lambda session: not is_process_alive(firefox_pid))
