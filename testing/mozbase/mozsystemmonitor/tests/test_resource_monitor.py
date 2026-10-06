# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import multiprocessing
import time
import unittest

import mozunit

try:
    import psutil
except ImportError:
    psutil = None

from mozsystemmonitor.resourcemonitor import (
    SystemResourceMonitor,
    SystemResourceUsage,
    _parse_hg_source_url,
)


@unittest.skipIf(psutil is None, "Resource monitor requires psutil.")
class TestResourceMonitor(unittest.TestCase):
    def test_basic(self):
        monitor = SystemResourceMonitor(poll_interval=0.5)

        monitor.start()
        time.sleep(3)

        monitor.stop()

        data = list(monitor.range_usage())
        self.assertGreater(len(data), 3)

        self.assertIsInstance(data[0], SystemResourceUsage)

    def test_empty(self):
        monitor = SystemResourceMonitor(poll_interval=2.0)
        monitor.start()
        monitor.stop()

        data = list(monitor.range_usage())
        self.assertEqual(len(data), 0)

    def test_phases(self):
        monitor = SystemResourceMonitor(poll_interval=0.25)

        monitor.start()
        time.sleep(1)

        with monitor.phase("phase1"):
            time.sleep(1)

            with monitor.phase("phase2"):
                time.sleep(1)

        monitor.stop()

        self.assertEqual(len(monitor.phases), 2)
        self.assertEqual(["phase2", "phase1"], list(monitor.phases.keys()))

        all = list(monitor.range_usage())
        data1 = list(monitor.phase_usage("phase1"))
        data2 = list(monitor.phase_usage("phase2"))

        self.assertGreater(len(all), len(data1))
        self.assertGreater(len(data1), len(data2))

        # This could fail if time.monotonic() takes more than 0.1s. It really
        # shouldn't.
        self.assertAlmostEqual(data1[-1].end, data2[-1].end, delta=0.25)

    def test_no_data(self):
        monitor = SystemResourceMonitor()

        data = list(monitor.range_usage())
        self.assertEqual(len(data), 0)

    def test_events(self):
        monitor = SystemResourceMonitor(poll_interval=0.25)

        monitor.start()
        time.sleep(0.5)

        t0 = time.monotonic()
        monitor.record_event("t0")
        time.sleep(2)

        monitor.record_event("t1")
        time.sleep(0.5)
        monitor.stop()

        events = monitor.events
        self.assertEqual(len(events), 2)

        event = events[0]

        self.assertEqual(event[1], "t0")
        self.assertAlmostEqual(event[0], t0, delta=0.25)

        data = list(monitor.between_events_usage("t0", "t1"))
        self.assertGreater(len(data), 0)

    def test_aggregate_cpu(self):
        monitor = SystemResourceMonitor(poll_interval=0.25)

        monitor.start()
        time.sleep(1)
        monitor.stop()

        values = monitor.aggregate_cpu_percent()
        self.assertIsInstance(values, list)
        self.assertEqual(len(values), multiprocessing.cpu_count())
        for v in values:
            self.assertIsInstance(v, float)

        value = monitor.aggregate_cpu_percent(per_cpu=False)
        self.assertIsInstance(value, float)

        values = monitor.aggregate_cpu_times()
        self.assertIsInstance(values, list)
        self.assertGreater(len(values), 0)
        self.assertTrue(hasattr(values[0], "user"))

        t = type(values[0])

        value = monitor.aggregate_cpu_times(per_cpu=False)
        self.assertIsInstance(value, t)

    def test_aggregate_io(self):
        monitor = SystemResourceMonitor(poll_interval=0.25)

        # There's really no easy way to ensure I/O occurs. For all we know
        # reads and writes will all be serviced by the page cache.
        monitor.start()
        time.sleep(1.0)
        monitor.stop()

        values = monitor.aggregate_io()
        self.assertTrue(hasattr(values, "read_count"))

    def test_memory(self):
        monitor = SystemResourceMonitor(poll_interval=0.25)

        monitor.start()
        time.sleep(1.0)
        monitor.stop()

        v = monitor.min_memory_available()
        self.assertIsInstance(v, int)

        v = monitor.max_memory_percent()
        self.assertIsInstance(v, float)

    def test_lsan_events(self):
        monitor = SystemResourceMonitor(poll_interval=0.25)

        monitor.start()
        time.sleep(0.1)

        # Direct leak with a stack and an allow-list match -> yellow.
        SystemResourceMonitor.lsan_leak({
            "time": int(time.time() * 1000),
            "kind": "Direct",
            "bytes": 128,
            "objects": 2,
            "stack": [{"function": "Foo::Bar"}, {"function": "main"}],
            "scope": "browser/foo",
            "allowed_match": "Foo::Bar",
        })

        # Indirect leak without allow-list match -> orange, no stack/scope.
        SystemResourceMonitor.lsan_leak({
            "time": int(time.time() * 1000),
            "kind": "Indirect",
            "bytes": 32,
            "objects": 1,
        })

        # Allow-listed summary -> yellow.
        SystemResourceMonitor.lsan_summary({
            "time": int(time.time() * 1000),
            "bytes": 160,
            "allocations": 3,
            "allowed": True,
        })

        time.sleep(0.1)
        monitor.stop()

        leak_events = [e for e in monitor.events if e[1] == "LSan Leak"]
        summary_events = [e for e in monitor.events if e[1] == "LSan Summary"]
        self.assertEqual(len(leak_events), 2)
        self.assertEqual(len(summary_events), 1)

        direct, indirect = leak_events[0][2], leak_events[1][2]
        self.assertEqual(direct["type"], "LSanLeak")
        self.assertEqual(direct["kind"], "Direct")
        self.assertEqual(direct["bytes"], 128)
        self.assertEqual(direct["objects"], 2)
        self.assertEqual(direct["scope"], "browser/foo")
        self.assertEqual(direct["allowed_match"], "Foo::Bar")
        self.assertEqual(direct["color"], "yellow")
        self.assertEqual(direct["stack"][0]["function"], "Foo::Bar")

        self.assertEqual(indirect["kind"], "Indirect")
        self.assertEqual(indirect["color"], "orange")
        self.assertNotIn("stack", indirect)
        self.assertNotIn("scope", indirect)
        self.assertNotIn("allowed_match", indirect)

        summary = summary_events[0][2]
        self.assertEqual(summary["type"], "LSanSummary")
        self.assertEqual(summary["bytes"], 160)
        self.assertEqual(summary["allocations"], 3)
        self.assertEqual(summary["color"], "yellow")
        self.assertTrue(summary["allowed"])

        markers = monitor.as_profile()["threads"][0]["markers"]["data"]
        self.assertTrue(any(m.get("type") == "LSanLeak" for m in markers))
        self.assertTrue(any(m.get("type") == "LSanSummary" for m in markers))

    def test_tsan_error(self):
        monitor = SystemResourceMonitor(poll_interval=0.25)

        monitor.start()
        time.sleep(0.1)

        now = int(time.time() * 1000)
        # A lock-order inversion with two labeled acquisition stacks: it should
        # produce two markers sharing a report_index, each carrying one stack.
        SystemResourceMonitor.tsan_error({
            "time": now,
            "kind": "lock-order-inversion (potential deadlock)",
            "signature": "Mutex_posix.cpp:91:3 in mutexLock",
            "pid": 1234,
            "description": "Cycle in lock order graph: M0 => M1 => M0",
            "scope": "browser/foo",
            "stacks": [
                {
                    "label": "Mutex M1 acquired here while holding mutex M0",
                    "stack": [
                        {
                            "function": "mutexLock",
                            "module": "firefox",
                            "file": "/builds/worker/checkouts/gecko/mozglue/misc/Mutex_posix.cpp",
                            "line": 91,
                        },
                        {"function": "main", "module": "firefox"},
                    ],
                },
                {
                    "label": "Mutex M0 acquired here while holding mutex M1",
                    "stack": [{"function": "other", "module": "libxul.so"}],
                },
            ],
        })

        # A report with no stacks should still produce a single marker.
        SystemResourceMonitor.tsan_error({
            "time": now,
            "kind": "data race",
            "signature": "Activation.cpp:16 in registerProfiling",
            "stacks": [],
        })

        time.sleep(0.1)
        monitor.stop()

        events = [e[2] for e in monitor.events if e[1] == "TSan Error"]
        # 2 markers for the lock-order report + 1 for the stackless data race.
        self.assertEqual(len(events), 3)

        lock_order = [e for e in events if e["kind"].startswith("lock-order-inversion")]
        self.assertEqual(len(lock_order), 2)
        first, second = lock_order
        self.assertEqual(first["type"], "TSanError")
        self.assertEqual(first["color"], "orange")
        self.assertEqual(first["pid"], 1234)
        self.assertEqual(first["scope"], "browser/foo")
        # Both markers of one report share a report_index.
        self.assertEqual(first["report_index"], second["report_index"])
        self.assertNotEqual(first["label"], second["label"])
        self.assertEqual(first["stack"][0]["function"], "mutexLock")
        # checkouts/gecko paths are rewritten to a repo-relative/hg view.
        self.assertNotIn("/builds/worker/checkouts/gecko/", first["stack"][0]["file"])

        data_race = [e for e in events if e["kind"] == "data race"]
        self.assertEqual(len(data_race), 1)
        self.assertNotIn("stack", data_race[0])
        # The two reports get distinct report_index values.
        self.assertNotEqual(first["report_index"], data_race[0]["report_index"])

        markers = monitor.as_profile()["threads"][0]["markers"]["data"]
        self.assertTrue(any(m.get("type") == "TSanError" for m in markers))

    def test_as_profile(self):
        monitor = SystemResourceMonitor(poll_interval=0.25)

        monitor.start()
        time.sleep(0.1)
        monitor.begin_phase("phase1")
        monitor.record_event("foo")
        time.sleep(0.1)
        monitor.begin_phase("phase2")
        monitor.record_event("bar")
        time.sleep(0.2)
        monitor.finish_phase("phase1")
        time.sleep(0.2)
        monitor.finish_phase("phase2")
        time.sleep(0.4)
        monitor.stop()

        d = monitor.as_profile()

        self.assertEqual(len(d["threads"]), 1)
        self.assertIn("markers", d["threads"][0])
        self.assertIn("data", d["threads"][0]["markers"])
        markers = d["threads"][0]["markers"]["data"]
        self.assertTrue(
            any(m["type"] == "Phase" and m["phase"] == "phase1" for m in markers)
        )
        self.assertTrue(
            any(m["type"] == "Phase" and m["phase"] == "phase2" for m in markers)
        )
        self.assertIn({"type": "Text", "text": "foo"}, markers)
        self.assertIn({"type": "Text", "text": "bar"}, markers)

    def _process_output(self, monitor, line):
        SystemResourceMonitor.test_status({
            "action": "process_output",
            "data": line,
            "time": (time.monotonic() - monitor.start_time) * 1000
            + monitor.start_timestamp * 1000,
        })

    def test_process_output_docshell(self):
        monitor = SystemResourceMonitor(poll_interval=0.25)
        monitor.start()
        self._process_output(
            monitor,
            "[Child 4208: Main Thread]: I/DocShellAndDOMWindowLeak "
            "++DOCSHELL 2f804b00 == 2 [pid = 4208] [id = 37]",
        )
        time.sleep(0.05)
        self._process_output(
            monitor,
            "[Child 4208: Main Thread]: I/DocShellAndDOMWindowLeak "
            "--DOCSHELL 2f804b00 == 0 [pid = 4208] [id = 37] "
            "[url = about:aichatcontent]",
        )
        monitor.stop()

        docshell = [m for m in monitor.markers if m[0] == "DocShell"]
        self.assertEqual(len(docshell), 1)
        name, start, end, data, _ = docshell[0]
        self.assertEqual(data["type"], "DocShell")
        self.assertEqual(data["url"], "about:aichatcontent")
        self.assertEqual(data["id"], 37)
        self.assertEqual(data["pid"], 4208)
        self.assertEqual(data["process"], "Child")
        self.assertEqual(data["thread"], "Main Thread")
        self.assertEqual(data["pointer"], "2f804b00")
        self.assertLess(start, end)

    def test_process_output_domwindow(self):
        monitor = SystemResourceMonitor(poll_interval=0.25)
        monitor.start()
        self._process_output(
            monitor,
            "[Child 3444: Main Thread]: I/DocShellAndDOMWindowLeak "
            "++DOMWINDOW == 2 (b3bc400) [pid = 3444] [serial = 2] "
            "[outer = 4f60940]",
        )
        time.sleep(0.05)
        self._process_output(
            monitor,
            "[Child 3444: Main Thread]: I/DocShellAndDOMWindowLeak "
            "--DOMWINDOW == 1 (b3bc400) [pid = 3444] [serial = 2] "
            "[outer = 4f60940] [url = about:blank]",
        )
        monitor.stop()

        windows = [m for m in monitor.markers if m[0] == "DOMWindow"]
        self.assertEqual(len(windows), 1)
        _, start, end, data, _ = windows[0]
        self.assertEqual(data["type"], "DOMWindow")
        self.assertEqual(data["url"], "about:blank")
        self.assertEqual(data["serial"], 2)
        self.assertEqual(data["pointer"], "b3bc400")
        self.assertEqual(data["outer"], "4f60940")
        self.assertLess(start, end)

    def test_process_output_javascript_error(self):
        monitor = SystemResourceMonitor(poll_interval=0.25)
        monitor.start()
        self._process_output(
            monitor,
            "JavaScript error: chrome://browser/content/places/browserPlacesViews.js,"
            " line 118: Error: No DOM node set for aPlacesNode.",
        )
        self._process_output(
            monitor,
            "JavaScript warning: resource://gre/foo.js, line 12: deprecation warning",
        )
        monitor.stop()

        errors = [
            e for e in monitor.events if len(e) == 3 and e[1] == "JavaScript error"
        ]
        warns = [
            e for e in monitor.events if len(e) == 3 and e[1] == "JavaScript warning"
        ]
        self.assertEqual(len(errors), 1)
        self.assertEqual(len(warns), 1)
        _, _, data = errors[0]
        self.assertEqual(data["type"], "jsError")
        self.assertNotIn("level", data)
        self.assertNotIn("color", data)
        self.assertEqual(
            data["file"], "chrome://browser/content/places/browserPlacesViews.js"
        )
        self.assertEqual(data["line"], 118)
        self.assertIn("No DOM node set", data["message"])
        self.assertEqual(data["stack"][0]["is_js"], True)

    def test_process_output_cpp_warning(self):
        monitor = SystemResourceMonitor(poll_interval=0.25)
        monitor.start()
        # Both ": file" and ", file" separator forms occur in practice.
        self._process_output(
            monitor,
            "[Parent 72612, Main Thread] WARNING: NS_ENSURE_TRUE(uri) failed: "
            "file caps/BasePrincipal.cpp:1511",
        )
        self._process_output(
            monitor,
            "[Child 19675, Main Thread] WARNING: 'NS_FAILED(rv)', "
            "file checkouts/gecko/xpcom/threads/nsThreadUtils.cpp:238",
        )
        monitor.stop()

        warnings_ = [e for e in monitor.events if len(e) == 3 and e[1] == "C++ warning"]
        self.assertEqual(len(warnings_), 2)
        _, _, data = warnings_[0]
        self.assertEqual(data["type"], "cppDebug")
        self.assertEqual(data["message"], "NS_ENSURE_TRUE(uri) failed")
        self.assertEqual(data["file"], "caps/BasePrincipal.cpp")
        self.assertEqual(data["line"], 1511)
        self.assertEqual(data["pid"], 72612)
        self.assertEqual(data["process"], "Parent")
        self.assertEqual(data["thread"], "Main Thread")
        self.assertNotIn("color", data)
        # Comma-separator form preserves the quoted message verbatim.
        _, _, data = warnings_[1]
        self.assertEqual(data["message"], "'NS_FAILED(rv)'")

    def test_process_output_cpp_assertion(self):
        monitor = SystemResourceMonitor(poll_interval=0.25)
        monitor.start()
        self._process_output(
            monitor,
            "[Parent 5900, Main Thread] ###!!! ASSERTION: Out-of-flow frame got "
            "reflowed before its placeholder: 'Error', file "
            "layout/generic/nsPlaceholderFrame.cpp:131",
        )
        monitor.stop()

        asserts = [e for e in monitor.events if len(e) == 3 and e[1] == "C++ assertion"]
        self.assertEqual(len(asserts), 1)
        _, _, data = asserts[0]
        self.assertEqual(data["type"], "cppDebug")
        self.assertEqual(data["color"], "red")
        self.assertIn("Out-of-flow frame", data["message"])
        self.assertEqual(data["file"], "layout/generic/nsPlaceholderFrame.cpp")
        self.assertEqual(data["line"], 131)

    def test_process_output_console(self):
        monitor = SystemResourceMonitor(poll_interval=0.25)
        monitor.start()
        self._process_output(
            monitor,
            'console.error: (new Error("Unable to retrieve the translation models.",'
            ' "resource://gre/actors/TranslationsParent.sys.mjs", 2674))',
        )
        self._process_output(
            monitor, 'console.warn: "No view for invalid view, switching to default"'
        )
        self._process_output(
            monitor, "console.log: Downloads: Closing the downloads panel."
        )
        monitor.stop()

        names = sorted(e[1] for e in monitor.events if len(e) == 3)
        self.assertEqual(names, ["console.error", "console.log", "console.warn"])
        log_event = next(
            e for e in monitor.events if len(e) == 3 and e[1] == "console.log"
        )
        self.assertEqual(log_event[2]["type"], "console")
        self.assertEqual(
            log_event[2]["message"], "Downloads: Closing the downloads panel."
        )

    def test_process_output_docshell_unmatched(self):
        monitor = SystemResourceMonitor(poll_interval=0.25)
        monitor.start()
        self._process_output(
            monitor,
            "[Child 4208: Main Thread]: I/DocShellAndDOMWindowLeak "
            "++DOCSHELL 2f804b00 == 2 [pid = 4208] [id = 37]",
        )
        # No matching --DOCSHELL: simulates a process that crashed or
        # never tore down its docshells before profiling stopped.
        monitor.stop()

        docshell = [m for m in monitor.markers if m[0] == "DocShell"]
        self.assertEqual(len(docshell), 1)
        _, start, end, data, _ = docshell[0]
        self.assertIsNone(end)
        self.assertEqual(data["id"], 37)
        self.assertEqual(data["pid"], 4208)
        self.assertEqual(data["pointer"], "2f804b00")
        self.assertNotIn("url", data)

    def test_process_output_console_trace_with_stack(self):
        monitor = SystemResourceMonitor(poll_interval=0.25)
        monitor.start()
        self._process_output(
            monitor, 'console.trace: AboutHomeStartupCache: "Preloaded was updated."'
        )
        self._process_output(
            monitor,
            "resource:///modules/AboutHomeStartupCache.sys.mjs 775 onPreloadedNewTabMessage",
        )
        self._process_output(
            monitor,
            "resource://newtab/lib/ActivityStreamMessageChannel.sys.mjs 79 middleware/</<",
        )
        # A second console.trace flushes the first.
        self._process_output(
            monitor, 'console.trace: AboutHomeStartupCache: "Preloaded was updated."'
        )
        self._process_output(
            monitor, "resource:///modules/AboutHomeStartupCache.sys.mjs 775 onFoo"
        )
        monitor.stop()

        traces = [e for e in monitor.events if len(e) == 3 and e[1] == "console.trace"]
        self.assertEqual(len(traces), 2)
        _, _, data = traces[0]
        self.assertEqual(data["type"], "console")
        self.assertEqual(len(data["stack"]), 2)
        self.assertEqual(
            data["stack"][0]["file"],
            "resource:///modules/AboutHomeStartupCache.sys.mjs",
        )
        self.assertEqual(data["stack"][0]["line"], 775)
        self.assertEqual(data["stack"][0]["function"], "onPreloadedNewTabMessage")
        self.assertEqual(data["stack"][1]["function"], "middleware/</<")
        # The second trace was flushed at stop with one frame collected.
        self.assertEqual(len(traces[1][2]["stack"]), 1)

    def test_process_output_console_trace_flushed_by_other_line(self):
        monitor = SystemResourceMonitor(poll_interval=0.25)
        monitor.start()
        self._process_output(monitor, "console.trace: foo")
        self._process_output(monitor, "some/file.mjs 42 doStuff")
        # Non-frame line should flush the pending trace and be processed normally.
        self._process_output(monitor, "totally random output line")
        monitor.stop()

        traces = [e for e in monitor.events if len(e) == 3 and e[1] == "console.trace"]
        self.assertEqual(len(traces), 1)
        self.assertEqual(len(traces[0][2]["stack"]), 1)
        outputs = [e for e in monitor.events if len(e) == 3 and e[1] == "output"]
        self.assertEqual(len(outputs), 1)

    def test_process_output_console_multiline_error(self):
        """console.error from Console.sys.mjs's createMultiLineDumper produces an
        empty header followed by indented Message:/Stack: lines and JS frames.
        """
        monitor = SystemResourceMonitor(poll_interval=0.25)
        monitor.start()
        self._process_output(monitor, "console.error: ")
        self._process_output(
            monitor, "  Message: Error: Cannot attach ID to a tab in a closed window."
        )
        self._process_output(monitor, "  Stack:")
        self._process_output(
            monitor, "    setId@chrome://browser/content/parent/ext-browser.js:387:13"
        )
        self._process_output(
            monitor, "getId@chrome://browser/content/parent/ext-browser.js:363:10"
        )
        self._process_output(
            monitor, "wrapTab@chrome://browser/content/parent/ext-browser.js:1293:58"
        )
        # An unrelated line flushes the pending marker and is processed normally.
        self._process_output(monitor, "totally random output line")
        monitor.stop()

        errors = [e for e in monitor.events if len(e) == 3 and e[1] == "console.error"]
        self.assertEqual(len(errors), 1)
        data = errors[0][2]
        self.assertEqual(data["type"], "console")
        self.assertEqual(
            data["message"], "Error: Cannot attach ID to a tab in a closed window."
        )
        self.assertEqual(len(data["stack"]), 3)
        self.assertEqual(data["stack"][0]["function"], "setId")
        self.assertEqual(
            data["stack"][0]["file"],
            "chrome://browser/content/parent/ext-browser.js",
        )
        self.assertEqual(data["stack"][0]["line"], 387)
        self.assertEqual(data["stack"][0]["column"], 13)
        self.assertTrue(data["stack"][0]["is_js"])
        self.assertEqual(data["stack"][2]["function"], "wrapTab")
        outputs = [e for e in monitor.events if len(e) == 3 and e[1] == "output"]
        self.assertEqual(len(outputs), 1)

    def test_process_output_console_multiline_no_trailing_space(self):
        """The header line may or may not carry a trailing space depending on
        how the harness rstrips lines; both shapes start the multi-line body.
        """
        monitor = SystemResourceMonitor(poll_interval=0.25)
        monitor.start()
        self._process_output(monitor, "console.error:")
        self._process_output(monitor, "  Message: Boom")
        self._process_output(monitor, "  Stack:")
        self._process_output(monitor, "    foo@resource:///x.sys.mjs:10:1")
        monitor.stop()

        errors = [e for e in monitor.events if len(e) == 3 and e[1] == "console.error"]
        self.assertEqual(len(errors), 1)
        data = errors[0][2]
        self.assertEqual(data["message"], "Boom")
        self.assertEqual(len(data["stack"]), 1)

    def test_process_output_console_multiline_flushed_at_stop(self):
        """A multi-line console body without follow-up still gets flushed."""
        monitor = SystemResourceMonitor(poll_interval=0.25)
        monitor.start()
        self._process_output(monitor, "console.error: ")
        self._process_output(monitor, "  Message: Boom")
        # No Stack: follow-up; stop() must still emit the marker.
        monitor.stop()

        errors = [e for e in monitor.events if len(e) == 3 and e[1] == "console.error"]
        self.assertEqual(len(errors), 1)
        self.assertEqual(errors[0][2]["message"], "Boom")
        self.assertNotIn("stack", errors[0][2])

    def test_process_output_console_multiline_no_message(self):
        """When the line after the header isn't 'Message:', we flush an empty
        marker and let the next line be processed normally.
        """
        monitor = SystemResourceMonitor(poll_interval=0.25)
        monitor.start()
        self._process_output(monitor, "console.error: ")
        self._process_output(monitor, "totally random output line")
        monitor.stop()

        errors = [e for e in monitor.events if len(e) == 3 and e[1] == "console.error"]
        self.assertEqual(len(errors), 1)
        outputs = [e for e in monitor.events if len(e) == 3 and e[1] == "output"]
        self.assertEqual(len(outputs), 1)

    def test_process_output_console_multiline_with_prefix(self):
        """Console.sys.mjs's createConsole({prefix}) prepends "<prefix>: " to
        the header, so the multi-line body opens with "console.<m>: <prefix>:"
        rather than just "console.<m>: ".
        """
        monitor = SystemResourceMonitor(poll_interval=0.25)
        monitor.start()
        self._process_output(monitor, "console.error: services.settings:")
        self._process_output(
            monitor,
            '  Message: EmptyDatabaseError: "main/nimbus-desktop-experiments"'
            " has not been synced yet",
        )
        self._process_output(monitor, "  Stack:")
        self._process_output(
            monitor,
            "    EmptyDatabaseError@resource://services-settings/Database.sys.mjs:19:5",
        )
        self._process_output(
            monitor,
            "async*get@resource://services-settings/RemoteSettingsClient.sys.mjs:573:28",
        )
        monitor.stop()

        errors = [e for e in monitor.events if len(e) == 3 and e[1] == "console.error"]
        self.assertEqual(len(errors), 1)
        data = errors[0][2]
        # The prefix is stitched back in front of the Message: text.
        self.assertEqual(
            data["message"],
            'services.settings: EmptyDatabaseError: "main/nimbus-desktop-experiments"'
            " has not been synced yet",
        )
        self.assertEqual(len(data["stack"]), 2)
        self.assertEqual(data["stack"][0]["function"], "EmptyDatabaseError")
        self.assertEqual(data["stack"][1]["function"], "async*get")

    def test_process_output_console_speculative_falls_back_to_single_line(self):
        """A multi-line method whose body happens to end with ":" but isn't a
        multi-line header still emits a single-line marker, and the next line
        is processed normally.
        """
        monitor = SystemResourceMonitor(poll_interval=0.25)
        monitor.start()
        self._process_output(monitor, "console.error: oops, ends in colon:")
        self._process_output(monitor, "totally random output line")
        monitor.stop()

        errors = [e for e in monitor.events if len(e) == 3 and e[1] == "console.error"]
        self.assertEqual(len(errors), 1)
        self.assertEqual(errors[0][2]["message"], "oops, ends in colon:")
        outputs = [e for e in monitor.events if len(e) == 3 and e[1] == "output"]
        self.assertEqual(len(outputs), 1)

    def test_process_output_console_warn_empty_is_single_line(self):
        """console.warn uses createDumper(), not the multi-line dumper, so an
        empty body must NOT trigger the multi-line state machine.
        """
        monitor = SystemResourceMonitor(poll_interval=0.25)
        monitor.start()
        self._process_output(monitor, "console.warn: ")
        self._process_output(monitor, "  Message: not a follow-up")
        monitor.stop()

        warns = [e for e in monitor.events if len(e) == 3 and e[1] == "console.warn"]
        self.assertEqual(len(warns), 1)
        # The "  Message: ..." line wasn't consumed by a multi-line body and
        # should fall back to a generic output marker.
        outputs = [e for e in monitor.events if len(e) == 3 and e[1] == "output"]
        self.assertEqual(len(outputs), 1)

    def test_process_output_unrecognized_falls_back(self):
        monitor = SystemResourceMonitor(poll_interval=0.25)
        monitor.start()
        self._process_output(monitor, "totally random output line that we don't parse")
        monitor.stop()

        outputs = [e for e in monitor.events if len(e) == 3 and e[1] == "output"]
        self.assertEqual(len(outputs), 1)

    def test_cpp_warning_frame_uses_hg_source_url(self):
        rev = "56b3cc68b5e7557a3e13fca984f0f8aebc60dd22"
        monitor = SystemResourceMonitor(
            poll_interval=0.25,
            metadata={"sourceURL": f"https://hg.mozilla.org/try/rev/{rev}"},
        )
        monitor.start()
        self._process_output(
            monitor,
            "[Parent 100, Main Thread] WARNING: oops: file "
            "/builds/worker/workspace/obj-build/foo/./../../../../../checkouts/gecko/"
            "netwerk/protocol/http/Http2Compression.cpp:42",
        )
        monitor.stop()

        warnings_ = [e for e in monitor.events if len(e) == 3 and e[1] == "C++ warning"]
        self.assertEqual(len(warnings_), 1)
        _, _, data = warnings_[0]
        self.assertEqual(data["file"], "netwerk/protocol/http/Http2Compression.cpp")
        self.assertEqual(
            data["stack"][0]["file"],
            f"hg:hg.mozilla.org/try:netwerk/protocol/http/Http2Compression.cpp:{rev}",
        )

    def test_cpp_warning_frame_no_source_url(self):
        monitor = SystemResourceMonitor(poll_interval=0.25)
        monitor.start()
        self._process_output(
            monitor,
            "[Parent 100, Main Thread] WARNING: oops: file "
            "/builds/worker/workspace/obj-build/foo/./../../../../../checkouts/gecko/"
            "netwerk/protocol/http/Http2Compression.cpp:42",
        )
        monitor.stop()

        warnings_ = [e for e in monitor.events if len(e) == 3 and e[1] == "C++ warning"]
        self.assertEqual(len(warnings_), 1)
        _, _, data = warnings_[0]
        self.assertEqual(data["file"], "netwerk/protocol/http/Http2Compression.cpp")
        self.assertEqual(
            data["stack"][0]["file"], "netwerk/protocol/http/Http2Compression.cpp"
        )

    def test_cpp_warning_frame_sysroot_path_not_wrapped(self):
        # Even with a sourceURL set, a path that isn't repo-relative (sysroot,
        # fetches, rust stdlib) must pass through unchanged so the source view
        # doesn't try to fetch it from hg.mozilla.org and 404.
        rev = "56b3cc68b5e7557a3e13fca984f0f8aebc60dd22"
        monitor = SystemResourceMonitor(
            poll_interval=0.25,
            metadata={"sourceURL": f"https://hg.mozilla.org/try/rev/{rev}"},
        )
        monitor.start()
        sysroot = (
            "/builds/worker/fetches/sysroot-x86_64-linux-gnu/usr/lib/gcc/"
            "x86_64-linux-gnu/10/../../../../include/c++/10/bits/std_function.h"
        )
        self._process_output(
            monitor,
            f"[Parent 100, Main Thread] WARNING: oops: file {sysroot}:42",
        )
        monitor.stop()

        warnings_ = [e for e in monitor.events if len(e) == 3 and e[1] == "C++ warning"]
        self.assertEqual(len(warnings_), 1)
        _, _, data = warnings_[0]
        self.assertEqual(data["file"], sysroot)
        self.assertEqual(data["stack"][0]["file"], sysroot)


@unittest.skipIf(psutil is None, "Resource monitor requires psutil.")
class TestCleanFrameFile(unittest.TestCase):
    def _monitor(self, source_url=None):
        metadata = {"sourceURL": source_url} if source_url else {}
        return SystemResourceMonitor(poll_interval=0.25, metadata=metadata)

    def test_ci_path_no_hg_prefix(self):
        self.assertEqual(
            self._monitor()._clean_frame_file(
                "/builds/worker/workspace/obj-build/netwerk/protocol/http/./../../../"
                "../../checkouts/gecko/netwerk/protocol/http/Http2Compression.cpp"
            ),
            (
                "netwerk/protocol/http/Http2Compression.cpp",
                "netwerk/protocol/http/Http2Compression.cpp",
            ),
        )

    def test_ci_path_with_hg_prefix(self):
        rev = "56b3cc68b5e7557a3e13fca984f0f8aebc60dd22"
        self.assertEqual(
            self._monitor(f"https://hg.mozilla.org/try/rev/{rev}")._clean_frame_file(
                "/builds/worker/workspace/obj-build/netwerk/protocol/http/./../../../"
                "../../checkouts/gecko/netwerk/protocol/http/Http2Compression.cpp"
            ),
            (
                "netwerk/protocol/http/Http2Compression.cpp",
                f"hg:hg.mozilla.org/try:netwerk/protocol/http/Http2Compression.cpp:{rev}",
            ),
        )

    def test_path_without_marker_unchanged(self):
        self.assertEqual(
            self._monitor()._clean_frame_file("/home/user/firefox/foo/bar.cpp"),
            ("/home/user/firefox/foo/bar.cpp", "/home/user/firefox/foo/bar.cpp"),
        )

    def test_sysroot_path_not_wrapped_even_with_hg_prefix(self):
        # Sysroot/fetches paths must not be wrapped as "hg:..." URLs; the
        # source view would 404 trying to fetch them from hg.mozilla.org.
        rev = "deadbeef"
        sysroot = (
            "/builds/worker/fetches/sysroot-x86_64-linux-gnu/usr/lib/gcc/"
            "x86_64-linux-gnu/10/../../../../include/c++/10/bits/std_function.h"
        )
        monitor = self._monitor(f"https://hg.mozilla.org/try/rev/{rev}")
        self.assertEqual(monitor._clean_frame_file(sysroot), (sysroot, sysroot))

    def test_last_occurrence_wins(self):
        self.assertEqual(
            self._monitor()._clean_frame_file(
                "/x/checkouts/gecko/y/../../checkouts/gecko/foo/bar.cpp"
            ),
            ("foo/bar.cpp", "foo/bar.cpp"),
        )

    def test_falsy_passthrough(self):
        monitor = self._monitor()
        self.assertEqual(monitor._clean_frame_file(""), ("", ""))
        self.assertEqual(monitor._clean_frame_file(None), (None, None))


class TestParseHgSourceUrl(unittest.TestCase):
    def test_try(self):
        self.assertEqual(
            _parse_hg_source_url(
                "https://hg.mozilla.org/try/rev/56b3cc68b5e7557a3e13fca984f0f8aebc60dd22"
            ),
            (
                "hg:hg.mozilla.org/try:",
                "56b3cc68b5e7557a3e13fca984f0f8aebc60dd22",
            ),
        )

    def test_mozilla_central(self):
        self.assertEqual(
            _parse_hg_source_url(
                "https://hg.mozilla.org/mozilla-central/rev/abcdef0123456789"
            ),
            ("hg:hg.mozilla.org/mozilla-central:", "abcdef0123456789"),
        )

    def test_multi_segment_repo(self):
        self.assertEqual(
            _parse_hg_source_url(
                "https://hg.mozilla.org/integration/autoland/rev/abcdef0123456789"
            ),
            ("hg:hg.mozilla.org/integration/autoland:", "abcdef0123456789"),
        )
        self.assertEqual(
            _parse_hg_source_url(
                "https://hg.mozilla.org/releases/mozilla-beta/rev/abcdef0123456789"
            ),
            ("hg:hg.mozilla.org/releases/mozilla-beta:", "abcdef0123456789"),
        )

    def test_non_hg_returns_none(self):
        self.assertEqual(
            _parse_hg_source_url("https://github.com/mozilla/gecko-dev/commit/abc"),
            (None, None),
        )

    def test_empty_returns_none(self):
        self.assertEqual(_parse_hg_source_url(None), (None, None))
        self.assertEqual(_parse_hg_source_url(""), (None, None))


@unittest.skipIf(psutil is None, "Resource monitor requires psutil.")
class TestLsanLeakFrameRewrite(unittest.TestCase):
    def _record_lsan_leak(self, monitor, stack):
        SystemResourceMonitor.lsan_leak({
            "kind": "Direct",
            "bytes": 16,
            "objects": 1,
            "stack": stack,
            "time": int((time.time() - monitor.start_timestamp) * 1000),
        })

    def test_lsan_leak_rewrites_frame_files_with_source_url(self):
        rev = "56b3cc68b5e7557a3e13fca984f0f8aebc60dd22"
        monitor = SystemResourceMonitor(
            poll_interval=0.25,
            metadata={"sourceURL": f"https://hg.mozilla.org/try/rev/{rev}"},
        )
        monitor.start()
        original_stack = [
            {
                "function": "Foo",
                "file": "/builds/worker/workspace/obj-build/./../../../../../"
                "checkouts/gecko/xpcom/ds/nsAtomTable.cpp",
                "line": 90,
            },
            {"function": "Bar", "module": "libxul.so"},
        ]
        self._record_lsan_leak(monitor, original_stack)
        monitor.stop()

        leaks = [e for e in monitor.events if len(e) == 3 and e[1] == "LSan Leak"]
        self.assertEqual(len(leaks), 1)
        _, _, data = leaks[0]
        self.assertEqual(
            data["stack"][0]["file"],
            f"hg:hg.mozilla.org/try:xpcom/ds/nsAtomTable.cpp:{rev}",
        )
        self.assertNotIn("file", data["stack"][1])
        # Original frame dicts must not be mutated.
        self.assertEqual(
            original_stack[0]["file"],
            "/builds/worker/workspace/obj-build/./../../../../../"
            "checkouts/gecko/xpcom/ds/nsAtomTable.cpp",
        )

    def test_lsan_leak_empty_stack(self):
        monitor = SystemResourceMonitor(poll_interval=0.25)
        monitor.start()
        self._record_lsan_leak(monitor, [])
        monitor.stop()

        leaks = [e for e in monitor.events if len(e) == 3 and e[1] == "LSan Leak"]
        self.assertEqual(len(leaks), 1)
        _, _, data = leaks[0]
        self.assertNotIn("stack", data)


if __name__ == "__main__":
    mozunit.main()
