========================
Adding Performance Tests
========================

.. contents::
    :depth: 3

This guide helps you choose the right framework for a new performance test
and shows how to write one. For general information about performance testing
at Mozilla (handling regressions, running tests, comparisons), see
`Performance Testing in a Nutshell <perftest-in-a-nutshell.html>`_.


Choosing a Framework
--------------------

.. list-table::
   :header-rows: 1
   :widths: 18 32 8 12 30

   * - Framework
     - Use when
     - Android
     - Cross-browser
     - Run with
   * - `MozPerftest <mozperftest.html>`_ (xpcshell)
     - Testing low-level platform code from JS (networking, intl, storage).
       No browser chrome needed.
     - No
     - No
     - ``./mach perftest path/to/test.js``
   * - `MozPerftest <mozperftest.html>`_ (mochitest)
     - Testing browser-level operations that need a content page or chrome
       privileges (DOM, accessibility, service workers, ...).
     - No
     - No
     - ``./mach perftest path/to/test.html``
   * - `MozPerftest <mozperftest.html>`_ (browsertime)
     - Full page-load or navigation scenarios that need a real browser
       session driven via Selenium/WebDriver.
     - Yes
     - Yes (Chrome, Safari)
     - ``./mach perftest path/to/perftest_example.js``
   * - `MozPerftest <mozperftest.html>`_ (custom script)
     - Shell-script-based tests (e.g. startup timing on Android).
     - Yes
     - Yes, script-dependent
     - ``./mach perftest path/to/script.sh``
   * - `GTest <https://firefox-source-docs.mozilla.org/gtest/index.html>`_
     - Micro-benchmarking C++ or Rust code at the platform level
       (parsing, layout, networking internals). Very low overhead.
     - No
     - No
     - ``./mach gtest 'SuiteName.TestName'``
   * - `Raptor <raptor.html>`__
     - Industry-standard benchmarks (Speedometer, JetStream, MotionMark)
       or cross-browser page-load comparisons. See `Getting Help`_ first.
     - Yes
     - Yes (Chrome, Safari)
     - ``./mach raptor``
   * - `Talos <talos.html>`__
     - Legacy framework. **Do not add new tests here** unless there is a
       specific limitation that prevents use of MozPerftest.
     - No
     - No
     - ``./mach talos-test``
   * - `AWSY <https://firefox-source-docs.mozilla.org/testing/perfdocs/awsy.html#awsy>`__
     - Memory-usage tracking (Are We Slim Yet) across builds.
     - No
     - No
     - ``./mach awsy-test``

For most new tests, **MozPerftest** is the recommended choice.
Pick the flavor (xpcshell, mochitest, browsertime) that matches
the level at which your code operates. For the full reference of
``perfMetadata`` fields, ``options``, and supported flavors, see the
mozperftest `writing guide <writing.html>`_.


MozPerftest: XPCShell Example
-----------------------------

XPCShell tests are the simplest flavor: a plain xpcshell test with a
``perfMetadata`` variable and ``info("perfMetrics", ...)`` calls to report
results.

In-tree examples:

- `intl/benchmarks/test/xpcshell/ <https://searchfox.org/mozilla-central/source/intl/benchmarks/test/xpcshell>`_
- `netwerk/test/unit/test_trr_bench.js <https://searchfox.org/mozilla-central/source/netwerk/test/unit/test_trr_bench.js>`_
  (`bug 2009372 <https://bugzilla.mozilla.org/show_bug.cgi?id=2009372>`_)

**Test file** (`intl/benchmarks/test/xpcshell/perftest_dateTimeFormat.js <https://searchfox.org/mozilla-central/source/intl/benchmarks/test/xpcshell/perftest_dateTimeFormat.js>`_):

.. code-block:: javascript

    "use strict";

    var perfMetadata = {
      owner: "Intl team",
      name: "Intl.DateTimeFormat",
      description: "Test the speed of Intl.DateTimeFormat",
      options: {
        default: {
          perfherder: true,
          perfherder_metrics: [
            { name: "DateTimeFormat constructor", unit: "ms" },
            { name: "DateTimeFormat.format", unit: "ms" },
          ],
        },
      },
      tags: ["intl"],
    };

    add_task(function test_dateTimeFormat() {
      let start = Cu.now();
      for (let i = 0; i < 100000; i++) {
        new Intl.DateTimeFormat("en-US");
      }
      let constructorTime = Cu.now() - start;

      let fmt = new Intl.DateTimeFormat("en-US");
      let date = new Date();
      start = Cu.now();
      for (let i = 0; i < 100000; i++) {
        fmt.format(date);
      }
      let formatTime = Cu.now() - start;

      info(
        "perfMetrics",
        JSON.stringify({
          "DateTimeFormat constructor": constructorTime,
          "DateTimeFormat.format": formatTime,
        })
      );
    });

**Manifest** (``perftest.toml``):

.. code-block:: toml

    [DEFAULT]

    ["perftest_dateTimeFormat.js"]
    disabled = "Disabled as we want to run this only as perftest, not regular CI"

The ``disabled`` field keeps the test out of the normal unit-test chunks; it
will still run when invoked via ``./mach perftest``.

**Registration** (``moz.build``):

.. code-block:: python

    PERFTESTS_MANIFESTS += ["test/xpcshell/perftest.toml"]

Run locally::

    ./mach perftest intl/benchmarks/test/xpcshell/perftest_dateTimeFormat.js


MozPerftest: Mochitest Example
------------------------------

Mochitest-flavored perftests are standard mochitests with ``perfMetadata`` and
``info("perfMetrics", ...)`` calls. They use the regular mochitest manifest
variable (e.g. ``BROWSER_CHROME_MANIFESTS``) instead of ``PERFTESTS_MANIFESTS``,
and set ``disabled`` in the manifest to prevent the test from running in regular CI.

In-tree examples:

- **mochitest-plain**: `dom/serviceworkers/test/performance/ <https://searchfox.org/mozilla-central/source/dom/serviceworkers/test/performance>`_
  (`bug 1299271 <https://bugzilla.mozilla.org/show_bug.cgi?id=1299271>`_)
- **browser-chrome**: `accessible/tests/browser/performance/ <https://searchfox.org/mozilla-central/source/accessible/tests/browser/performance>`_
  (`bug 1963174 <https://bugzilla.mozilla.org/show_bug.cgi?id=1963174>`_)
- **browser-chrome**: `toolkit/components/ml/tests/browser/ <https://searchfox.org/mozilla-central/source/toolkit/components/ml/tests/browser>`_

**Test file** (`dom/serviceworkers/test/performance/test_caching.html <https://searchfox.org/mozilla-central/source/dom/serviceworkers/test/performance/test_caching.html>`_):

.. code-block:: html

    <!DOCTYPE HTML>
    <html>
    <head>
      <title>Service worker caching perftest</title>
    </head>
    <script src="/tests/SimpleTest/SimpleTest.js"></script>
    <script src="perfutils.js"></script>
    <script>
      "use strict";

      var journal = {
        "No cache": [],
        "Cached": [],
      };

      const ITERATIONS = 10;

      var perfMetadata = {
        owner: "DOM LWS",
        name: "Service Worker Caching",
        description: "Test service worker caching.",
        options: {
          default: {
            perfherder: true,
            perfherder_metrics: [
              { name: "No cache", unit: "ms", shouldAlert: true },
              { name: "Cached", unit: "ms", shouldAlert: true },
            ],
            verbose: true,
            manifest: "perftest.toml",
            manifest_flavor: "plain",
          },
        },
      };

      add_task(async () => {
        // ... run iterations, collect timing into journal ...
      });

      add_task(() => {
        // Compute medians and report
        let metrics = {};
        for (const name in journal) {
          let sorted = [...journal[name]].sort((a, b) => a - b);
          metrics[name] = sorted[Math.floor(sorted.length / 2)];
        }
        info("perfMetrics", JSON.stringify(metrics));
      });
    </script>
    <body></body>
    </html>

**Manifest** (``perftest.toml``):

.. code-block:: toml

    [DEFAULT]

    ["test_caching.html"]
    disabled = "Disabled as we want to run this only as perftest, not regular CI"

**Registration** (``moz.build``) -- use the standard mochitest manifest variable
for the flavor you're using, not ``PERFTESTS_MANIFESTS``:

.. code-block:: python

    MOCHITEST_MANIFESTS += ["test/performance/perftest.toml"]
    # or, for browser-chrome:
    # BROWSER_CHROME_MANIFESTS += ["test/browser/performance/perftest.toml"]

Key differences from xpcshell perftests:

- ``perfMetadata`` must include ``manifest`` and ``manifest_flavor`` fields
  (``"plain"`` for mochitest-plain, ``"browser-chrome"`` for browser chrome tests).
- ``extra_args`` can specify additional mochitest arguments (e.g. ``["headless"]``).
- The manifest is registered with the standard mochitest variable, not
  ``PERFTESTS_MANIFESTS``. The ``disabled`` field on each test entry is what
  keeps it out of the normal mochitest CI chunks; it will still run when
  invoked via ``./mach perftest``.


MozPerftest: Browsertime Example
---------------------------------

Browsertime tests drive a full browser session via Selenium. Use them when
you need real navigation, user interaction, or page-load measurements.

In-tree examples (under `testing/performance/ <https://searchfox.org/mozilla-central/source/testing/performance>`_):

- ``perftest_pageload.js`` -- minimal navigation example.
- ``perftest_facebook.js`` -- form interaction with ``addText``/``click``.

**Test file** (`testing/performance/perftest_pageload.js <https://searchfox.org/mozilla-central/source/testing/performance/perftest_pageload.js>`_):

.. code-block:: javascript

    async function setUp(context) {
      context.log.info("setUp example!");
    }

    async function test(context, commands) {
      let url = context.options.browsertime.url;
      await commands.navigate("https://www.mozilla.org/en-US/");
      await commands.wait.byTime(100);
      await commands.navigate("about:blank");
      await commands.wait.byTime(50);
      return commands.measure.start(url);
    }

    async function tearDown(context) {
      context.log.info("tearDown example!");
    }

    module.exports = {
      setUp,
      tearDown,
      test,
      owner: "Performance Team",
      name: "pageload",
      description: "Measures time to load mozilla page",
    };

**Manifest** (`testing/performance/perftest.toml <https://searchfox.org/mozilla-central/source/testing/performance/perftest.toml>`_)
just lists the test files:

.. code-block:: toml

    [DEFAULT]

    ["perftest_pageload.js"]

By convention, browsertime perftest files are prefixed with ``perftest_``.

For full documentation on the browsertime scripting API, see the
`sitespeed.io scripting docs <https://www.sitespeed.io/documentation/sitespeed.io/scripting/>`_.


MozPerftest: Custom Script Example
-----------------------------------

Custom-script tests are shell scripts (or programs invoked from one) that
write a single ``perfMetrics: ...`` line to stdout. They are useful for
platform-level measurements that don't fit into xpcshell or browsertime --
for example, Android startup timing where the test needs to drive ``adb``.

In-tree examples:

- `testing/performance/mobile-startup/ <https://searchfox.org/mozilla-central/source/testing/performance/mobile-startup>`_
  -- Android cold-startup tests (``cvns.sh``, ``cmff.sh``, ...).
- `testing/performance/android-resource/ <https://searchfox.org/mozilla-central/source/testing/performance/android-resource>`_
  -- Android resource-usage tests.

**Test file** (illustrative, based on
`perftest_custom.sh <https://searchfox.org/mozilla-central/source/python/mozperftest/mozperftest/tests/data/samples/perftest_custom.sh>`_):

.. code-block:: bash

    # Name: custom-script-test
    # Owner: Perftest Team
    # Description: Runs a sample custom script test.
    # Options: {"default": {"perfherder": true, "perfherder_metrics": [{ "name": "Registration", "unit": "ms" }]}}

    echo Running...

    # ${BROWSER_BINARY} is the package name on Android, or the path to the
    # browser binary on desktop. Mozperftest verifies that it exists.
    echo Binary: ${BROWSER_BINARY}

    # The single perfMetrics line is what mozperftest parses for results.
    # Curly braces in the JSON must be doubled.
    echo 'perfMetrics: [{{"name": "metric1", "shouldAlert": false, "lowerIsBetter": false, "unit": "speed", "values": [1, 2, 3, 4]}}]'

Run locally::

    ./mach perftest path/to/your-script.sh


GTest: C++ Micro-benchmarks
---------------------------

GTest is the simplest way to add a low-level C++ or Rust performance test.
The ``MOZ_GTEST_BENCH`` macro wraps a test function so that GTest times its
execution and reports the result to Perfherder under the
``platform_microbench`` framework.

In debug/ASAN builds the test runs once without timing (as a correctness check).
In optimized builds it runs 5 times by default (configurable via
``MOZ_GTEST_NUM_ITERATIONS``) and reports the median duration.

In-tree examples:

- `layout/style/test/gtest/StyloParsingBench.cpp <https://searchfox.org/mozilla-central/source/layout/style/test/gtest/StyloParsingBench.cpp>`_
- `netwerk/test/gtest/TestStandardURL.cpp <https://searchfox.org/mozilla-central/source/netwerk/test/gtest/TestStandardURL.cpp>`_
  (currently disabled by default)

**Example** (from `StyloParsingBench.cpp <https://searchfox.org/mozilla-central/source/layout/style/test/gtest/StyloParsingBench.cpp>`_):

.. code-block:: cpp

    #include "gtest/MozGTestBench.h"

    static void ServoParsingBench() {
      // ... setup code ...
      for (int i = 0; i < PARSING_REPETITIONS; i++) {
        RefPtr<StyleStylesheetContents> stylesheet =
            Servo_StyleSheet_FromUTF8Bytes(/* ... */).Consume();
      }
    }

    MOZ_GTEST_BENCH(Stylo, Servo_StyleSheet_FromUTF8Bytes_Bench,
                    [] { ServoParsingBench(); });

There is also ``MOZ_GTEST_BENCH_F`` for fixture-based tests (wraps ``TEST_F``
instead of ``TEST``).

When the test runs in CI, it outputs::

    PERFHERDER_DATA: {"framework": {"name": "platform_microbench"},
      "suites": [{"name": "Stylo", "subtests":
        [{"name": "Servo_StyleSheet_FromUTF8Bytes_Bench",
          "value": 252674, "lowerIsBetter": true}]}]}

.. note::
   Micro-benchmark regressions are not treated as strictly as other
   performance test regressions. A regression in a micro-benchmark may not
   correspond to a user-visible regression, and large changes are expected
   when the benchmarked code is intentionally modified.

See the `GTest documentation <https://firefox-source-docs.mozilla.org/gtest/index.html#mozgtestbench>`_
for more details.


Raptor
------

Raptor is the framework used for industry-standard benchmarks (Speedometer,
JetStream, MotionMark) and cross-browser page-load comparisons.

In-tree examples (under
`testing/raptor/browsertime/ <https://searchfox.org/mozilla-central/source/testing/raptor/browsertime>`_):

- ``browsertime_pageload.js`` -- canonical page-load test runner.
- ``speculative-connect.js`` -- privileged-call + custom metric.

**Test file** (excerpt of
`speculative-connect.js <https://searchfox.org/mozilla-central/source/testing/raptor/browsertime/speculative-connect.js>`_,
`bug 1818798 <https://bugzilla.mozilla.org/show_bug.cgi?id=1818798>`_):

.. code-block:: javascript

    const { logTest } = require("./utils/profiling");

    module.exports = logTest(
      "speculative connect pageload",
      async function (context, commands) {
        const url = "https://en.wikipedia.org/wiki/Barack_Obama";

        await commands.navigate("about:blank");
        await commands.wait.byTime(1000);

        // Privileged JS to trigger a speculative connection.
        const script = `
          var URI = Services.io.newURI("${url}");
          var principal = Services.scriptSecurityManager
            .createContentPrincipal(URI, {});
          Services.io.speculativeConnect(URI, principal, callbacks, false);
        `;
        commands.js.runPrivileged(script);
        await commands.wait.byTime(1000);

        // Measure the pageload.
        await commands.measure.start();
        await commands.navigate(url);
        await commands.measure.stop();

        // Report a custom metric alongside the pageload measurements.
        const connect_time = await commands.js.run(
          `return (window.performance.timing.connectEnd -
                   window.performance.timing.navigationStart);`
        );
        await commands.measure.addObject({
          custom_data: { connect_time },
        });

        return true;
      }
    );

The wiring (manifest entry, taskcluster kind, alert thresholds, etc.) is
larger than for mozperftest tests -- see the
`contributing guide <contributing.html>`_ for adding new Raptor tests, then
`Raptor documentation <raptor.html>`_ for the full reference.

See `Getting Help`_ before adding a new Raptor test.


Talos
-----

Talos is the legacy framework. **Do not add new tests here** unless there is
a specific limitation that prevents using MozPerftest -- see `Getting Help`_
first.

A Talos test is a Python class that subclasses ``TsBase`` (or another base)
and is registered via ``@register_test()`` in
`testing/talos/talos/test.py <https://searchfox.org/mozilla-central/source/testing/talos/talos/test.py>`_.
The class fields configure the runner (URL, cycles, filters, units, etc.).

**Example** (excerpt of ``ts_paint`` from
`testing/talos/talos/test.py <https://searchfox.org/mozilla-central/source/testing/talos/talos/test.py>`_):

.. code-block:: python

    @register_test()
    class ts_paint(TsBase):
        """
        Launches tspaint_test.html with the current timestamp in the url,
        waits for [MozAfterPaint and onLoad] to fire, then records the end
        time and calculates the time to startup.
        """

        cycles = 20
        timeout = 150
        gecko_profile_startup = True
        url = "startup_test/tspaint_test.html"
        filters = filter.ignore_first.prepare(1) + filter.median.prepare()
        tpmozafterpaint = True
        unit = "ms"

The page (``startup_test/tspaint_test.html``) lives under
`testing/talos/talos/ <https://searchfox.org/mozilla-central/source/testing/talos/talos/startup_test>`_;
manifests and config wiring are also in that tree. See the
`Talos documentation <talos.html>`_ for the full reference.


AWSY
----

AWSY (Are We Slim Yet) tracks memory usage across builds.

An AWSY test is a Python class that subclasses ``AwsyTestCase``. It declares
the perfherder suites, the memory checkpoints to capture from
``about:memory``, and the URLs to load. AWSY then drives the browser through
those steps and reports the configured metrics.

**Example** (excerpt of
`testing/awsy/awsy/test_base_memory_usage.py <https://searchfox.org/mozilla-central/source/testing/awsy/awsy/test_base_memory_usage.py>`_):

.. code-block:: python

    from awsy.awsy_test_case import AwsyTestCase

    CHECKPOINTS = [
        {
            "name": "After tabs open [+30s, forced GC]",
            "path": "memory-report-TabsOpenForceGC-4.json.gz",
            "name_filter": ["web ", "Web Content"],
            "median": True,
        },
    ]

    PERF_SUITES = [
        {"name": "Base Content Resident Unique Memory", "node": "resident-unique"},
        {"name": "Base Content Heap Unclassified", "node": "explicit/heap-unclassified"},
        {"name": "Base Content JS", "node": "js-main-runtime/", "alertThreshold": 0.25},
        {"name": "Base Content Explicit", "node": "explicit/"},
    ]

    class TestMemoryUsage(AwsyTestCase):
        """Loads about:memory and reports content-process memory usage."""

        def urls(self):
            return self._urls

        def perf_suites(self):
            return PERF_SUITES

        def perf_checkpoints(self):
            return CHECKPOINTS

Run locally::

    ./mach awsy-test --base

See the
`AWSY documentation <https://firefox-source-docs.mozilla.org/testing/perfdocs/awsy.html#awsy>`__
for the full set of fields and configuration options.


Running Tests in CI
-------------------

To run your test in CI you need to add a task definition under the
appropriate taskcluster ``kinds/`` directory:

- mozperftest: `taskcluster/kinds/perftest/ <https://searchfox.org/mozilla-central/source/taskcluster/kinds/perftest>`_
- Raptor and browsertime: `taskcluster/kinds/browsertime/ <https://searchfox.org/mozilla-central/source/taskcluster/kinds/browsertime>`_

This is what determines which platforms and configurations your test runs on.
If you're not sure where your task belongs, see the `Getting Help`_ section
below -- the perf team can help.

For xpcshell and mochitest mozperftest tests, you may also need to update the
``_TRY_MAPPING`` variable in
`mozperftest/utils.py <https://searchfox.org/mozilla-central/search?q=_TRY_MAPPING&path=mozperftest>`_
so CI can locate your test file.

Once your test is registered, ``./mach try perf`` will include it in try
pushes -- but only if the test matches an existing category. If you can't
find your test in the category picker, run with ``--full`` to fall back to
the full ``./mach try fuzzy`` interface, or add a new category for your test.
To reproduce a specific alert::

    ./mach try perf --alert <ALERT-NUMBER>

Note that ``--alert`` searches across all tasks regardless of category. For
more details, see `Mach Try Perf <mach-try-perf.html>`_.


Getting Help
------------

Reach out to the Performance Testing and Tooling team in the
`#perftest channel on Matrix <https://matrix.to/#/#perftest:mozilla.org>`_
or #perf-help on Slack.
