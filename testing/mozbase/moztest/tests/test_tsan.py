import mozunit
from moztest.tsan import TSANErrorParser


class FakeLogger:
    def __init__(self):
        self.errors = []

    def tsan_error(self, **data):
        self.errors.append(data)


LOCK_ORDER = """\
WARNING: ThreadSanitizer: lock-order-inversion (potential deadlock) (pid=1666)
  Cycle in lock order graph: M0 (0x1) => M1 (0x2) => M0
  Mutex M1 acquired here while holding mutex M0 in main thread:
    #0 pthread_mutex_lock /build/tsan_interceptors_posix.cpp:1371:3 (firefox+0xc7827) (BuildId: abc123)
    #1 mutexLock /build/mozglue/misc/Mutex_posix.cpp:91:3 (firefox+0x1bd5b7)
  Mutex M0 acquired here while holding mutex M1 in thread T4:
    #0 SharedStub xptcstubs_x86_64_linux.cpp (libxul.so+0x4929d32) (BuildId: def456)
    #1 mozilla::Foo::Bar() (libxul.so+0x10)
  SUMMARY: ThreadSanitizer: lock-order-inversion (potential deadlock) /build/mozglue/misc/Mutex_posix.cpp:91:3 in mutexLock
"""

DATA_RACE = """\
WARNING: ThreadSanitizer: data race (pid=7061)
  Write of size 8 at 0x55 by main thread:
    #0 js::Activation::registerProfiling() /build/js/src/vm/Activation.cpp:16:29 (libxul.so+0xb1) (BuildId: abc123)
  SUMMARY: ThreadSanitizer: data race /build/js/src/vm/Activation.cpp:16:29 in js::Activation::registerProfiling()
"""


SEGV = """\
ThreadSanitizer:DEADLYSIGNAL
==2708==ERROR: ThreadSanitizer: SEGV on unknown address 0x000000000000 (pc 0x7f8c9a72a810 bp 0x000000000e2e sp 0x7f8b643fa610 T8177)
==2708==The signal is caused by a WRITE memory access.
==2708==Hint: address points to the zero page.
    #0 MOZ_CrashSequence /builds/worker/workspace/obj-build/dist/include/mozilla/Assertions.h:261:3 (libxul.so+0xb72a810) (BuildId: 2242523b37b4cfbbb67488eeaec361db644a3337)
    #1 MOZ_Crash /builds/worker/workspace/obj-build/dist/include/mozilla/Assertions.h:402:3 (libxul.so+0xb72a810)
    #2 mozilla::(anonymous namespace)::RunWatchdog(void*) /builds/worker/checkouts/gecko/toolkit/components/terminator/nsTerminator.cpp:238:5 (libxul.so+0xb72a810)
==2708==Register values:
rax = 0x00000000000000ee  rbx = 0x000072180001bde0  rcx = 0x00007f8baec803a0
ThreadSanitizer can not provide additional info.
SUMMARY: ThreadSanitizer: SEGV /builds/worker/workspace/obj-build/dist/include/mozilla/Assertions.h:261:3 in MOZ_CrashSequence
==2708==ABORTING
"""


def feed(parser, text, pid, scope=None):
    for line in text.splitlines():
        parser.log(line, pid=pid, scope=scope)


def test_lock_order_report():
    logger = FakeLogger()
    parser = TSANErrorParser(logger)
    feed(parser, LOCK_ORDER, pid="A", scope="browser/foo")

    assert len(logger.errors) == 1
    report = logger.errors[0]
    assert report["kind"] == "lock-order-inversion (potential deadlock)"
    assert report["pid"] == 1666
    assert report["scope"] == "browser/foo"
    assert report["signature"] == "Mutex_posix.cpp:91:3 in mutexLock"
    assert report["description"] == (
        "Cycle in lock order graph: M0 (0x1) => M1 (0x2) => M0"
    )

    stacks = report["stacks"]
    assert len(stacks) == 2
    assert (
        stacks[0]["label"]
        == "Mutex M1 acquired here while holding mutex M0 in main thread"
    )
    assert (
        stacks[1]["label"]
        == "Mutex M0 acquired here while holding mutex M1 in thread T4"
    )

    # Fully symbolized frame with path and line:column.
    top = stacks[0]["stack"][0]
    assert top == {
        "function": "pthread_mutex_lock",
        "module": "firefox",
        "module_offset": "0xc7827",
        "file": "/build/tsan_interceptors_posix.cpp",
        "line": 1371,
        "column": 3,
    }

    # A bare-filename frame (no line) and a frame with no file at all.
    shared_stub, foo_bar = stacks[1]["stack"]
    assert shared_stub["function"] == "SharedStub"
    assert shared_stub["file"] == "xptcstubs_x86_64_linux.cpp"
    assert "line" not in shared_stub
    assert foo_bar["function"] == "mozilla::Foo::Bar()"
    assert foo_bar["module"] == "libxul.so"
    assert "file" not in foo_bar


def test_data_race_report():
    logger = FakeLogger()
    parser = TSANErrorParser(logger)
    feed(parser, DATA_RACE, pid="B")

    assert len(logger.errors) == 1
    report = logger.errors[0]
    assert report["kind"] == "data race"
    assert report["pid"] == 7061
    assert report["description"] is None
    assert report["signature"] == (
        "Activation.cpp:16:29 in js::Activation::registerProfiling()"
    )
    assert len(report["stacks"]) == 1
    assert report["stacks"][0]["label"] == "Write of size 8 at 0x55 by main thread"


def test_segv_report():
    # A signal report uses a "==pid==ERROR:" header, has descriptive noise in
    # the kind, and lists frames with no preceding label line.
    logger = FakeLogger()
    parser = TSANErrorParser(logger)
    feed(parser, SEGV, pid="S")

    assert len(logger.errors) == 1
    report = logger.errors[0]
    assert report["kind"] == "SEGV"
    assert report["pid"] == 2708
    assert report["signature"] == "Assertions.h:261:3 in MOZ_CrashSequence"
    # The label-less frames are collected under a single implicit stack.
    assert len(report["stacks"]) == 1
    assert report["stacks"][0]["label"] == ""
    funcs = [f["function"] for f in report["stacks"][0]["stack"]]
    assert funcs == [
        "MOZ_CrashSequence",
        "MOZ_Crash",
        "mozilla::(anonymous namespace)::RunWatchdog(void*)",
    ]


def test_interleaved_streams():
    # Reports arriving on two different emitting streams, line-interleaved,
    # must be kept separate by pid.
    logger = FakeLogger()
    parser = TSANErrorParser(logger)
    a = LOCK_ORDER.splitlines()
    b = DATA_RACE.splitlines()
    for i in range(max(len(a), len(b))):
        if i < len(a):
            parser.log(a[i], pid="A")
        if i < len(b):
            parser.log(b[i], pid="B")

    assert len(logger.errors) == 2
    kinds = {e["kind"] for e in logger.errors}
    assert kinds == {"lock-order-inversion (potential deadlock)", "data race"}
    for e in logger.errors:
        # Each report kept its own (non-empty) stacks.
        assert e["stacks"]
        assert all(s["stack"] for s in e["stacks"])


def test_truncated_report_flushed_on_flush():
    logger = FakeLogger()
    parser = TSANErrorParser(logger)
    # Header + one stack, but no SUMMARY line (output cut off).
    truncated = "\n".join(LOCK_ORDER.splitlines()[:5])
    feed(parser, truncated, pid="C")
    assert logger.errors == []

    parser.flush()
    assert len(logger.errors) == 1
    report = logger.errors[0]
    # No SUMMARY was seen, so the signature falls back to the kind.
    assert report["signature"] == report["kind"]
    assert len(report["stacks"]) == 1


def test_non_tsan_output_is_ignored():
    logger = FakeLogger()
    parser = TSANErrorParser(logger)
    for line in ["just some output", "    #0 not in a report (libxul.so+0x1)", ""]:
        parser.log(line, pid="A")
    parser.flush()
    assert logger.errors == []


if __name__ == "__main__":
    mozunit.main()
