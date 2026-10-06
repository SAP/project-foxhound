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

## Migrating Legacy Telemetry Analyses

```{admonition} With apologies to Jane Austen
It is a truth universally acknowledged,
that a developer in possession of analyses against Legacy Telemetry,
must be in want of migration.
```

All Legacy Telemetry probes have been collected via Glean
(mirroring to Legacy Telemetry) since [July of 2025](https://arewegleanyet.com/).

This means not only that new analyses can and should be conducted with Glean-sent data,
but most historical analyses can and should also be conducted with Glean-sent data.

### The quickest hints on how to be about this

If your analaysis is on GLAM, you're probably already looking at Glean data.
If not, follow the link in the header to find the Glean equivalent to your Legacy Telemetry probe.

If your analysis in written in SQL, you mostly replace `telemetry.main` with `firefox_desktop.metrics`,
find `client_id` in `client_info`, and use the [Glean Dictionary](https://dictionary.telemetry.mozilla.org/)
to find the column the equivalent Glean metric's data is in.

Like so, for this query counting clients per day that have `a11y.always_underline_links`:

```sql
SELECT
  DATE(submission_timestamp) AS received_day,
  payload.processes.parent.scalars.a11y_always_underline_links AS always_underline,
  COUNT(DISTINCT client_id) AS client_count,
FROM telemetry.main
WHERE
  submission_timestamp > '2026-03-01'
GROUP BY ALL
```

Becomes, in Glean:
```sql
SELECT
  DATE(submission_timestamp) AS received_day,
  metrics.boolean.a11y_always_underline_links AS always_underline,
  COUNT(DISTINCT client_info.client_id) AS client_count,
FROM firefox_desktop.metrics AS m
WHERE
  submission_timestamp > '2026-03-01'
GROUP BY ALL
```

If you're analyzing events instead of "main" ping probes, you want `firefox_desktop.events_stream`.
Each row is an event, and instead of using `mozfun` to extract extras,
you can use `.` notation as the extras are in a JSON column.

Like so, for this query looking at `pictureinpicture.saw_toggle#toggle`
to look into the first time a picture-in-picture toggle is seen:
```sql
SELECT
  mozfun.map.get_key(event_map_values, 'firstTime') AS firstTime,
  client_id,
  submission_date
FROM telemetry.events
WHERE
  event_category = "pictureinpicture"
  AND event_method IN ('saw_toggle')
  AND submission_date >= '2022-02-01'
  AND normalized_channel = "nightly"
  AND mozfun.map.get_key(event_map_values, 'firstTime') = 'true'
```

Becomes, in Glean:
```sql
SELECT
  BOOL(event_extra.firstTime) AS firstTime,
  client_id,
  DATE(submission_timestamp) AS submission_date,
FROM firefox_desktop.events_stream
WHERE
  event = "pictureinpicture.saw_toggle_toggle"
  AND event_category = 'pictureinpicture' -- for performance (clustered field)
  AND DATE(submission_timestamp) > '2022-02-01'
  AND normalized_channel = 'nightly'
  AND BOOL(event_extra.firstTime)
```

If your analysis is written in something other than SQL, you may wish to [reach out for help][contact-us].

### More words and complete explanations

How this migration might be done depends on a multitude of factors.
It is best conducted by someone who fully understands the questions the analyses intend to answer.
In many cases it may make more sense to abandon an old analysis in favour of starting afresh,
as changes in your understanding of your component under instrumentation may render it obsolete.

In general:
1. Assess the analysis's use.
    * When was it written?
      If it was written more than two years ago, it might be best ignored.
    * When was it last run?
      Some analyses are only run annually and are still useful.
      Others aren't useful if they haven't been run in the past month.
    * When were the results last of use in decisionmaking?
      Did it matter that the result of the query was 5 instead of 4?
      Did it matter that it was increasing?
      Did any of what you learned with it enter into a document, plan, or bug?
2. Assess the analysis' purpose.
    * Do you know what it aims to do? Who its audience is?
    * Has new research or other knowledge rendered it unnecessary?

If your analysis is used and useful, valuable and valued,
how to migrate it depends on a few factors:

### GLAM

If you conduct (or can conduct) your analyses on
[GLAM](https://glam.telemetry.mozilla.org),
then your job is done.
Merely select your Glean metric from the dropdown, and analyze away.
It's even publicly-accessible!

GLAM is particularly good for "How many clients X?" and "What's the performance of Y like?"
sorts of questions. It can break it down by channel and version.

If you need to break it down by something other than channel and version,
you might only need Looker.

### Looker

All Glean-sent metrics are available in Looker.
Find the Glean metric you are analysing in
[Glean Dictionary](https://dictionary.telemetry.mozilla.org),
and select the Looker link from the Access section.

### A note on `client_id`s

Legacy Telemetry and Glean both have their own, distinct `client_id`.
They operate slightly differently from each other,
and have distinct values,
but for the purposes of most analyses you can treat them both the same:
as a moderately-stable short-to-medium-term longitudinal profile identifier.

In most analyses that require such a profile identifier,
use the Glean `client_id`.
It is usually found in the column `client_info.client_id`.
If that is not available, then it is supplied as a top-level `client_id` column.

If you need the specific value of the Legacy Telemetry `client_id`,
it has been provided in Glean as the metric
[legacy.telemetry.client_id](https://dictionary.telemetry.mozilla.org/apps/firefox_desktop/metrics/legacy_telemetry_client_id).

### Histograms, Scalars, and other "main" ping probes

The Legacy Telemetry "main" ping is the default probe transport in Legacy Telemetry.
It is submitted at least once per session for a variety of reasons ranging from
"The app is shutting down" to
"Some setting, hardware, software, addon, or marketing information changed".

The Glean "metrics" ping is the default metric transport in Legacy Telemetry.
It is submitted at most once per day or application update
([docs](https://mozilla.github.io/glean/book/user/pings/metrics.html#scheduling)).

These two different scheduling schemes mean that data reported on the "main"
ping will never perfectly align with data reported on the "metrics" ping.
In most cases this does not matter, as you can see from Glean metrics displayed on
[GLAM](https://glam.telemetry.mozilla.org/): big numbers aggregate just fine.

If your analysis is sensitive to ping scheduling,
then that means your _data_ is sensitive to ping scheduling and likely should be on its own
[Custom Ping](https://mozilla.github.io/glean/book/user/pings/custom.html).
This is what the Addons team ended up needing with the
["addons" ping](https://dictionary.telemetry.mozilla.org/apps/firefox_desktop/pings/addons),
since their analyses were sensitive to exactly how many reports of how many addons were received each day.
Please [reach out][contact-us] for assistance.

#### Histograms, Scalars, and other "main" ping probes SQL specifics

Since your analysis is in the overwhelming majority of analyses that aren't sensitive in this way,
here is how you migrate SQL queries from "main"-ping-submitted data to "metrics"-ping-submitted data:

* `SELECT` clause dimensions
    * Many dimensions like `client_id` and `app_display_version` will be found in `client_info`
    * Any dimensions previously in the Legacy Telemetry Environment will be found as metrics.
      Find them in the Glean Dictionary: their column names are in the Access table.
* `SELECT` clause measures
    * Find the metric in the Glean Dictionary: its column name is in the Access table.
* `FROM` clause
    * `telemetry.main` becomes `firefox_desktop.metrics`
    * Glean automatically collects instrumentation from shared code in all products that include that code.
      This means your analysis, once migrated, might now work just as well on Firefox for Android
      (`fenix.metrics`) and Thunderbird (`thunderbird_desktop.metrics`).
      A nice little bonus.
    * `telemetry.main_1pct` becomes `firefox_desktop.metrics` with a `AND sample_id = 0`
      in the `WHERE` clause.
* `WHERE` clause
    * `submission_timestamp` remains the partition key. No change here.
    * For dimensions and measures, follow the advice for the `SELECT` clause, above.

### Events

The Legacy Telemetry "event" ping was the only ping that could include Events.
It was sent when full, as frequently as once every ten minutes.
It would [discard](https://bugzilla.mozilla.org/show_bug.cgi?id=1983602)
any events it couldn't fit into that schedule, leading to unpredictable analyses.

The Glean "events" ping is the default ping for metrics of type `event`.
Glean supports submitting events on any ping.
If your events are on a custom, non-"events" ping, follow the instructions for
"Custom Pings", below.

#### Events Stream: row-per-event table vs. row-per-ping table

Most analyses of events are about the events, not the pings the events were submitted on,
so in Glean we supply the Events Stream dataset for convenience.
It has a row per event, like the `telemetry.events` (note the `s`) view, but is:
* Faster to query
    * It is clustered on `sample_id`, `client_id`, and `event_category`
* Has more quality-of-life improvements
    * The event extras are now a JSON column `event_extra`
      as well as in typed columns `extras.{boolean|quantity|string}.<extra_name>`
    * Any non-`event` metrics present on the "events" ping are present in the
      `metrics` JSON column.
* Is available for all products, not just Firefox Desktop
    * e.g. for Firefox for Android, there is `fenix.events_stream`.

#### Events SQL specifics

* `SELECT` clause dimensions
    * Many dimensions like `client_id` and `app_display_version` will be found in `client_info`
    * Any dimensions previously in the Legacy Telemetry Environment will be found as metrics.
      Find them in the Glean Dictionary: their column names are in the Access table.
        * It is possible that the metric you need is not submitted on the "events" ping.
          You can fix this by adding "events" to the metric's definition's `send_in_pings` property.
* `SELECT` clause measures
    * Event extras from the `event_extra` column will need to be converted from JSON types using
      [BigQuery JSON functions](https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/json_functions).
    * Event extras from the type-specific `extras.{boolean|quantity|string}` columns are already SQL types.
* `FROM` clause
    * Replace `FROM telemetry.events` with `FROM firefox_desktop.events_stream`
    * Replace `FROM telemetry.event CROSS JOIN UNNEST(events)` with `FROM firefox_desktop.events_stream`
* `WHERE` clause
    * You can filter on all parts of an event's name at once with the `event` column
      e.g. `WHERE event_category = 'category' AND event_method = 'method' AND event_object = 'object'`
      can become `WHERE event = 'category.method_object'`
    * The Events Stream is clustered on `event_category`,
      so for performance you may still wish to filter on `event_category` separately.

### Custom Pings

If your analysis concerns a custom Legacy Telemetry ping,
i.e. one that is submitted in code via `TelemetryController.submitExternalPing`,
then it has an exact Glean doppleganger by the same name
([bug 1960358](https://bugzilla.mozilla.org/show_bug.cgi?id=1960358)).

Open your new Glean ping's page in
[Glean Dictionary](https://dictionary.telemetry.mozilla.org/apps/firefox_desktop?itemType=pings&page=1)
to learn how to access it and the names of its contents.

Migration is mostly a matter of replacing `telemetry.ping_name` with
`firefox_desktop.ping_name`, and `payload.some_field_name` with
`metrics.<metric type>.some_field_name`.

e.g. For this analysis using the Legacy Telemetry "sync" ping

```sql
SELECT
  DATE(submission_timestamp) AS received_day,
  SUM(payload.discarded) AS discarded_payload_sum,
FROM telemetry.sync
WHERE
  submission_timestamp > CURRENT_TIMESTAMP() - INTERVAL '7' DAY
GROUP BY ALL
```

You would,
after checking the advice above to see if the analysis deserves migration,
replace `telemetry.sync` with `firefox_desktop.sync` and,
upon finding in the Glean Dictionary that
[payload.discarded is now metrics.quantity.syncs_discarded](https://dictionary.telemetry.mozilla.org/apps/firefox_desktop/metrics/syncs_discarded),
end up with

```sql
SELECT
  DATE(submission_timestamp) AS received_day,
  SUM(metrics.quantity.syncs_discarded) AS discarded_payload_sum,
FROM firefox_desktop.sync
WHERE
  submission_timestamp > CURRENT_TIMESTAMP() - INTERVAL '7' DAY
GROUP BY ALL
```

[contact-us]: https://chat.mozilla.org/#/room/#glean:mozilla.org
