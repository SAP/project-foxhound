# Removing Telemetry Probes

We will be removing the Legacy Telemetry data collection system in the future.
Before we do that, we must stop using it.

## Preconditions

1. Are you reasonably certain no one is using this data from Legacy-Telemetry-sent pings in analyses?
    * You don't have to be absolutely certain: the data is also being reported via Glean,
      so it'll still be available to analyses if someone needs it.
      But if it's presently under active use,
      it'll add more work to someone's day if you remove it before they've moved their analyses.
    * If you are absolutely certain that the data's not being used _at all_, you can
      remove the instrumentation from both Glean and Legacy Telemetry by
        1. Following the instructions for removing the Legacy Telemetry probe
        2. Removing the Glean metric definition from `metrics.yaml`
        3. Removing the instrumenting code that references the Glean metric

## Histograms, Scalars, or Events

To remove a Legacy Telemetry Histogram, Scalar, or Event, you must:

0. Identify and locate the Glean metrics and Legacy Telemetry probes involved.
    * The Glean metrics will be defined in a `metrics.yaml` file in your component.
    * The Legacy Telemetry probes will be named in the
      `telemetry_mirror` field of the Glean metrics' definitions.
1. Remove the probe definition from
   {searchfox}`toolkit/components/telemetry/Histograms.json`,
   {searchfox}`toolkit/components/telemetry/Scalars.yaml`, or
   {searchfox}`toolkit/components/telemetry/Events.yaml`.
     * If some Histograms you are removing are especially old,
       you might find them referenced in one or more places in
       {searchfox}`toolkit/components/telemetry/histogram-allowlists.json` as well.
       Remove them from there, too.
2. Remove the `telemetry_mirror` fields from the Glean metrics' definitions in `metrics.yaml`.
    * If you don't, a full build will fail with a message like
      `HistogramGIFFTMap.cpp:####:##: error: no member named 'THE_HISTOGRAM_ID' in 'mozilla::Telemetry::HistogramID'...`
3. Perform a full (compiled) build and check `test_mirrors.py`
    * `./mach build && ./mach test toolkit/components/telemetry/tests/python/test_mirrors.py`
    * This should catch most kinds of mistakes in the preceding steps.
4. Convert your instrumentation tests to test the Glean metrics instead of the now-removed Legacy Telemetry probes.
    * Consult [the section on migrating tests](#migrating-tests) for more details.

## Environment Fields

To remove a Legacy Telemetry Environment field,

0. Ensure you aren't removing any sections that are required in
   [the schema](https://github.com/mozilla-services/mozilla-pipeline-schemas/blob/main/templates/include/telemetry/environment.1.schema.json).
1. Remove the code in
   {searchfox}`toolkit/components/telemetry/app/TelemetryEnvironment.sys.mjs`
   that sets its value.
2. Remove the code in
   {searchfox}`toolkit/components/telemetry/tests/unit/test_TelemetryEnvironment.js`
   and
   {searchfox}`toolkit/components/telemetry/tests/unit/test_TelemetryEnvironment_search.js`
   that tests it.
3. Remove the documentation in
   {searchfox}`toolkit/components/telemetry/docs/data/environment.rst`.

## Custom Pings

To remove a Legacy Telemetry custom ping (one that uses `TelemetryController.submitExternalPing(...)`),

1. Remove the code
2. Remove the tests
3. Move the documentation in
   {searchfox}`toolkit/components/telemetry/docs/data`
   to
   {searchfox}`toolkit/components/telemetry/docs/obsolete`
   and append the word "(obsolete)" to the doc's title.

## Migrating Tests

Testing Glean instrumentation in Firefox Desktop is straightforward:
for metrics you will use `testGetValue()` and for pings you will use `testSubmission()`.
Please familiarize yourself with
[the instrumentation testing docs](/toolkit/components/glean/user/instrumentation_tests).

Specific changes you may have to make include:

* XPCShell tests need to manually initialize FOG, or they will freeze on the first `testGetValue()` call.
    * [bug 1756055](https://bugzilla.mozilla.org/show_bug.cgi?id=1756055) hopes to change that.
    * Until then, `add_setup(function () { do_get_profile(); Services.fog.initializeFOG(); });`
* Instead of clearing via getting snapshots with `aClearStore = true`,
  clear Glean's stored data with `Services.fog.testResetFOG();` (JS),
  or by using the `FOGFixture` googletest fixture (C++).
* Instead of snapshotting all Histograms, all Events, or all Scalars,
  you should instead access the metric individually and call `testGetValue()`.
    * Though event records returned by a Glean `event`'s `testGetValue()`
      have the `event` metric's category and name, you never need to check them.
      They are always correct: e.g.
      `Assert.ok(Glean.myCategory.myEvent.testGetValue()?.every(record => record.category = 'my.category' && record.name == 'my_event'), "always true, so don't bother checking.");`
* For C++ tests you no longer need fake `JSContext`s.
  Just use `TestGetValue().unwrap().value()`.
    * If you felt like you had to add script-visible APIs to test C++ instrumentation in JS,
      you may be able to remove them now and test instrumentation directly.
* You may no longer need a `PingServer` to test that pings are submitted.
  Instead use `GleanPings.myPing.testSubmission()` (JS)
  or `mozilla::glean_pings::MyPing.TestSubmission()` (C++) to ensure that the ping is submitted,
  and to use `testGetValue()` to check that the data is correct at the time it is submitted.
* Any use of `waitForCondition()` or other busy loops to wait for Legacy Telemetry IPC
  can be replaced with `await Services.fog.testFlushAllChildren();`.
* If your test relied on clearing individual Histograms,
  it will need to be rewritten to instead clear all data via `Services.fog.testResetFOG()`.
