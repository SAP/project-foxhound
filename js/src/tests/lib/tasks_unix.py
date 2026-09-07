# A unix-oriented process dispatcher.  Uses a single thread with select and
# waitpid to dispatch tasks.  This avoids several deadlocks that are possible
# with fork/exec + threads + Python.

import errno
import os
import select
import signal
import sys
from collections import deque
from datetime import datetime, timedelta

from .progressbar import ProgressBar
from .results import NullTestOutput, TestOutput, escape_cmdline


class Task:
    def __init__(self, test, prefix, tempdir, pid, stdout, stderr):
        self.test = test
        self.cmd = test.get_command(prefix, tempdir)
        self.pid = pid
        self.stdout = stdout
        self.stderr = stderr
        self.start = datetime.now()
        self.out = []
        self.err = []


def spawn_test(test, prefix, tempdir, passthrough, run_skipped, show_cmd):
    """Spawn one child, return a task struct."""
    if not test.enable and not run_skipped:
        return None

    cmd = test.get_command(prefix, tempdir)
    if show_cmd:
        print(escape_cmdline(cmd))

    if passthrough:
        os.execvp(cmd[0], cmd)
        return

    (rout, wout) = os.pipe()
    (rerr, werr) = os.pipe()

    file_actions = [
        (os.POSIX_SPAWN_CLOSE, rout),
        (os.POSIX_SPAWN_CLOSE, rerr),
        (os.POSIX_SPAWN_DUP2, wout, 1),
        (os.POSIX_SPAWN_DUP2, werr, 2),
    ]
    pid = os.posix_spawnp(cmd[0], cmd, os.environ, file_actions=file_actions)

    os.close(wout)
    os.close(werr)
    return Task(test, prefix, tempdir, pid, rout, rerr)


def get_max_wait(tasks, timeout):
    """
    Return the maximum time we can wait before any task should time out.
    """

    # If we have a progress-meter, we need to wake up to update it frequently.
    wait = ProgressBar.update_granularity()

    # If a timeout is supplied, we need to wake up for the first task to
    # timeout if that is sooner.
    if timeout:
        now = datetime.now()
        timeout_delta = timedelta(seconds=timeout)
        for task in tasks:
            remaining = task.start + timeout_delta - now
            wait = min(wait, remaining)

    # Return the wait time in seconds, clamped between zero and max_wait.
    return max(wait.total_seconds(), 0)


def flush_input(fd, frags):
    """
    Read any pages sitting in the file descriptor 'fd' into the list 'frags'.
    """
    rv = os.read(fd, 4096)
    frags.append(rv)
    while len(rv) == 4096:
        # If read() returns a full buffer, it may indicate there was 1 buffer
        # worth of data, or that there is more data to read.  Poll the socket
        # before we read again to ensure that we will not block indefinitly.
        readable, _, _ = select.select([fd], [], [], 0)
        if not readable:
            return

        rv = os.read(fd, 4096)
        frags.append(rv)


def read_input(tasks, timeout):
    """
    Select on input or errors from the given task list for a max of timeout
    seconds.
    """
    rlist = []
    exlist = []
    outmap = {}  # Fast access to fragment list given fd.
    for t in tasks:
        rlist.append(t.stdout)
        rlist.append(t.stderr)
        outmap[t.stdout] = t.out
        outmap[t.stderr] = t.err
        # This will trigger with a close event when the child dies, allowing
        # us to respond immediately and not leave cores idle.
        exlist.append(t.stdout)

    readable = []
    try:
        readable, _, _ = select.select(rlist, [], exlist, timeout)
    except OverflowError:
        print >> sys.stderr, "timeout value", timeout
        raise

    for fd in readable:
        flush_input(fd, outmap[fd])


def remove_task(tasks, pid):
    """
    Remove a task from the tasks list and return it.
    """
    index = None
    for i, t in enumerate(tasks):
        if t.pid == pid:
            index = i
            break
    else:
        raise KeyError(f"No such pid: {pid}")

    out = tasks[index]
    tasks.pop(index)
    return out


def timed_out(task, timeout):
    """
    Return a timedelta with the amount we are overdue, or False if the timeout
    has not yet been reached (or timeout is falsy, indicating there is no
    timeout.)
    """
    if not timeout:
        return False

    elapsed = datetime.now() - task.start
    over = elapsed - timedelta(seconds=timeout)
    return over if over.total_seconds() > 0 else False


def reap_zombies(tasks, timeout):
    """
    Search for children of this process that have finished. If they are tasks,
    then this routine will clean up the child. This method returns a new task
    list that has had the ended tasks removed, followed by the list of finished
    tasks.
    """
    finished = []
    while True:
        try:
            pid, status = os.waitpid(0, os.WNOHANG)
            if pid == 0:
                break
        except OSError as e:
            if e.errno == errno.ECHILD:
                break
            raise e

        ended = remove_task(tasks, pid)
        flush_input(ended.stdout, ended.out)
        flush_input(ended.stderr, ended.err)
        os.close(ended.stdout)
        os.close(ended.stderr)

        returncode = os.WEXITSTATUS(status)
        if os.WIFSIGNALED(status):
            returncode = -os.WTERMSIG(status)

        finished.append(
            TestOutput(
                ended.test,
                ended.cmd,
                b"".join(ended.out).decode("utf-8", "replace"),
                b"".join(ended.err).decode("utf-8", "replace"),
                returncode,
                (datetime.now() - ended.start).total_seconds(),
                timed_out(ended, timeout),
                {"pid": ended.pid},
            )
        )
    return tasks, finished


def kill_undead(tasks, timeout):
    """
    Signal all children that are over the given timeout. Use SIGABRT first to
    generate a stack dump. If it still doesn't die for another 30 seconds, kill
    with SIGKILL.
    """
    for task in tasks:
        over = timed_out(task, timeout)
        if over:
            if over.total_seconds() < 30:
                os.kill(task.pid, signal.SIGABRT)
            else:
                os.kill(task.pid, signal.SIGKILL)


def run_all_tests(tests, prefix, tempdir, pb, options):
    max_parallel_heavy_tasks = 1

    # Updated by the main function, consulted by the `scheduler` generator.
    num_tasks = 0
    num_heavy_tasks = 0
    task = None

    def scheduler(tests, max_tasks):
        # Deques of tests seen but not yet spawned, indexed by "weight"
        # (a boolean, heavy vs light).
        pending = (deque(), deque())
        pending_heavy = pending[True]  # More readable name
        tests = iter(tests)
        xdr_mode = "off"

        def with_xdr(test, mode):
            test.selfhosted_xdr_mode = mode
            return test

        if options.use_xdr:
            xdr_mode = "encode"

            # Find a light test to spawn. Use it for XDR encoding,
            for test in tests:
                if test.heavy:
                    pending_heavy.append(test)
                else:
                    yield ("spawn", with_xdr(test, "encode"))
                    if task is not None:
                        xdr_mode = "decode"
                        break

            # Fall back to using a heavy task.
            while xdr_mode != "decode":
                if not pending_heavy:
                    return  # No runnable tests.
                test = pending_heavy.popleft()
                yield ("spawn", with_xdr(test, "encode"))
                if task is not None:
                    xdr_mode = "decode"

            # Wait for the encoding task to complete.
            yield ("wait-all", None)

        # Walk through tests and spawn them, but keep a full set of heavy tasks
        # running whenever possible (start them eagerly, and scan ahead to find
        # more when the pending list runs out). Wait whenever spawning a task
        # would exceed `max_tasks`.
        while True:
            if num_tasks >= max_tasks:
                # Task pool is full.
                yield ("wait-one", None)
                continue

            # The index within pending[], which is whether we want a heavy job.
            weight = num_heavy_tasks < max_parallel_heavy_tasks

            # If a test with the desired weight is pending, spawn it.
            if pending[weight]:
                test = pending[weight].popleft()
                yield ("spawn", with_xdr(test, xdr_mode))
                continue

            # Scan for a test with the desired weight.
            for test in tests:
                pending[test.heavy].append(test)
                if test.heavy == weight:
                    break
            else:
                # No tests of this weight left, so spawn one of the others.
                other = not weight
                if pending[other]:
                    if other:
                        # We wanted a light but only have heavy. But wanting a
                        # light means too many heavies are running. Wait.
                        assert num_heavy_tasks >= max_parallel_heavy_tasks
                        yield ("wait-one", None)
                    test = pending[other].popleft()
                    yield ("spawn", with_xdr(test, xdr_mode))
                else:
                    assert not any(pending)
                    break

        # All tests have been spawned.
        yield ("wait-all", None)

    # The set of currently running tests.
    tasks = []

    for action, test in scheduler(tests, options.worker_count):
        if action == "spawn":
            if not test.enable and not options.run_skipped:
                task = None
                yield NullTestOutput(test)
                continue

            task = spawn_test(
                test,
                prefix,
                tempdir,
                options.passthrough,
                options.run_skipped,
                options.show_cmd,
            )
            if task:
                tasks.append(task)
                if test.heavy:
                    num_heavy_tasks += 1
                num_tasks += 1
            else:
                yield NullTestOutput(test)
            continue

        assert action.startswith("wait-")
        wait_until_down_to = 0 if action == "wait-all" else num_tasks - 1
        while num_tasks > wait_until_down_to:
            timeout = get_max_wait(tasks, options.timeout)
            read_input(tasks, timeout)

            kill_undead(tasks, options.timeout)
            tasks, finished = reap_zombies(tasks, options.timeout)

            for out in finished:
                yield out
                if out.test.heavy:
                    num_heavy_tasks -= 1
                num_tasks -= 1

            # If we did not finish any tasks, poke the progress bar to show that
            # the test harness is at least not frozen.
            if len(finished) == 0:
                pb.poke()
