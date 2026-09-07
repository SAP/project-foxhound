/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Test that console timing methods (console.time, console.timeEnd,
 * console.timeStamp) create the expected profiler markers.
 */
add_task(async function test_console_time_markers() {
  info("Start the profiler to capture markers.");
  await ProfilerTestUtils.startProfilerForMarkerTests();

  info("Create a tab with a test page.");
  const url = BASE_URL + "single_frame.html";
  await BrowserTestUtils.withNewTab(url, async contentBrowser => {
    const contentPid = await SpecialPowers.spawn(
      contentBrowser,
      [],
      () => Services.appinfo.processID
    );

    await SpecialPowers.spawn(contentBrowser, [], async () => {
      // console.time/timeEnd pair should create a marker.
      content.console.time("testTimer");
      await new Promise(resolve => content.setTimeout(resolve, 5));
      content.console.timeEnd("testTimer");

      // console.timeStamp also should create a marker.
      content.console.timeStamp("testTimeStamp");

      // console.time without timeEnd should not create a marker.
      content.console.time("orphanedTimer");

      // console.timeEnd without matching time should not create a marker
      content.console.timeEnd("nonexistentTimer");
    });

    const { contentThread } = await stopProfilerNowAndGetThreads(contentPid);

    const markers = ProfilerTestUtils.getInflatedMarkerData(contentThread);
    const consoleMarkers = markers.filter(m => m.name === "ConsoleTiming");

    Assert.equal(
      consoleMarkers.length,
      2,
      "Should have exactly 2 ConsoleTiming markers"
    );

    info("Verify the console.time/timeEnd marker");
    const timeMarker = consoleMarkers.find(
      m => m.data && m.data.label === "testTimer"
    );
    Assert.ok(timeMarker, "Should find marker for testTimer");
    Assert.equal(
      timeMarker.data.entryType,
      "time",
      "Marker should have entryType 'time'"
    );
    Assert.equal(
      typeof timeMarker.startTime,
      "number",
      "startTime should be a number"
    );
    Assert.equal(
      typeof timeMarker.endTime,
      "number",
      "endTime should be a number"
    );
    Assert.greater(
      timeMarker.endTime,
      timeMarker.startTime,
      "endTime should be after startTime for interval marker"
    );

    info("Verify the console.timeStamp marker");
    const timeStampMarker = consoleMarkers.find(
      m => m.data && m.data.label === "testTimeStamp"
    );
    Assert.ok(timeStampMarker, "Should find marker for testTimeStamp");
    Assert.equal(
      timeStampMarker.data.entryType,
      "timeStamp",
      "Marker should have entryType 'timeStamp'"
    );
    Assert.equal(
      typeof timeStampMarker.startTime,
      "number",
      "startTime should be a number"
    );
    Assert.equal(
      typeof timeStampMarker.endTime,
      "number",
      "endTime should be a number"
    );
    Assert.equal(
      timeStampMarker.endTime,
      0,
      "endTime should be 0 for instant marker"
    );

    info("Verify the other markers don't exist.");
    // Verify that orphaned console.time did not create a marker.
    const orphanedMarker = consoleMarkers.find(
      m => m.data && m.data.label === "orphanedTimer"
    );
    Assert.ok(
      !orphanedMarker,
      "Should not find marker for orphanedTimer (time without timeEnd)"
    );

    // Verify that console.timeEnd without matching time did not create a marker.
    const nonexistentMarker = consoleMarkers.find(
      m => m.data && m.data.label === "nonexistentTimer"
    );
    Assert.ok(
      !nonexistentMarker,
      "Should not find marker for nonexistentTimer (timeEnd without time)"
    );
  });
});
