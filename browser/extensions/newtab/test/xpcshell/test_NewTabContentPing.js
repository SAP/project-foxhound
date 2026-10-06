/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  NewTabContentPing: "resource://newtab/lib/NewTabContentPing.sys.mjs",
  sinon: "resource://testing-common/Sinon.sys.mjs",
});

const MAX_SUBMISSION_DELAY = Services.prefs.getIntPref(
  "browser.newtabpage.activity-stream.telemetry.privatePing.maxSubmissionDelayMs",
  5000
);

add_setup(() => {
  do_get_profile();
  Services.fog.initializeFOG();
});

/**
 * Tests that the recordEvent method will cause a delayed ping submission to be
 * scheduled, and that the right extra fields are stripped from events.
 */
add_task(async function test_recordEvent_sanitizes_and_buffers() {
  let ping = new NewTabContentPing();
  ping.test_only_resetAllStats();

  // These fields are expected to be stripped before they get recorded in the
  // event.
  let sanitizedFields = {
    newtab_visit_id: "some visit id",
    tile_id: "some tile id",
    matches_selected_topic: "not-set",
    recommended_at: "1748877997039",
    received_rank: 0,
    event_source: "card",
    layout_name: "card-layout",
  };

  // These fields are expected to survive the sanitization.
  let expectedFields = {
    section: "business",
    section_position: "2",
    position: "12",
    selected_topics: "",
    corpus_item_id: "7fc404a1-74ec-450b-8eef-4f52b45ec510",
    topic: "business",
    format: "medium-card",
    scheduled_corpus_item_id: "40f9ba69-1288-4778-8cfa-937df633819c",
    is_sponsored: "false",
    is_section_followed: "false",
  };

  ping.recordEvent("click", {
    // These should be sanitized out.
    ...sanitizedFields,
    ...expectedFields,
  });

  let extraMetrics = {
    utcOffset: "1",
    experimentBranch: "some-branch",
  };
  ping.scheduleSubmission(extraMetrics);

  await GleanPings.newtabContent.testSubmission(
    () => {
      // Test callback
      let [clickEvent] = Glean.newtabContent.click.testGetValue();
      Assert.ok(clickEvent, "Found click event.");
      for (let fieldName of Object.keys(sanitizedFields)) {
        Assert.equal(
          clickEvent.extra[fieldName],
          undefined,
          `Should not have gotten sanitized extra field: ${fieldName}`
        );
      }
      for (let fieldName of Object.keys(expectedFields)) {
        Assert.equal(
          clickEvent.extra[fieldName],
          expectedFields[fieldName],
          `Should have recorded expected extra field: ${fieldName}`
        );
      }

      for (let metricName of Object.keys(extraMetrics)) {
        Assert.equal(
          Glean.newtabContent[metricName].testGetValue(),
          extraMetrics[metricName],
          `Should have recorded metric: ${metricName}`
        );
      }
    },
    async () => {
      // Submit Callback
      let delay = await ping.testOnlyForceFlush();
      Assert.greater(delay, 1000, "Picked a random value greater than 1000");
      Assert.less(
        delay,
        MAX_SUBMISSION_DELAY,
        "Picked a random value less than MAX_SUBMISSION_DELAY"
      );
    }
  );
});

/**
 * Tests that the recordEvent caps the maximum number of events
 */
add_task(async function test_recordEventDaily_caps_events() {
  const MAX_EVENTS = 2;

  let ping = new NewTabContentPing();
  ping.setMaxEventsPerDay(MAX_EVENTS);
  ping.test_only_resetAllStats();

  // These fields are expected to survive the sanitization.
  let expectedFields = {
    section: "business",
    corpus_item_id: "7fc404a1-74ec-450b-8eef-4f52b45ec510",
    topic: "business",
  };

  ping.recordEvent("click", {
    ...expectedFields,
  });

  ping.recordEvent("impression", {
    ...expectedFields,
  });

  let extraMetrics = {
    utcOffset: "1",
    experimentBranch: "some-branch",
  };
  ping.scheduleSubmission(extraMetrics);

  await GleanPings.newtabContent.testSubmission(
    () => {
      // Test Callback
      let [clickEvent] = Glean.newtabContent.click.testGetValue();
      Assert.ok(clickEvent, "Found click event.");
      let [impression] = Glean.newtabContent.impression.testGetValue();
      Assert.ok(impression, "Found impression event.");
    },
    async () => {
      // Submit Callback
      await ping.testOnlyForceFlush();
    }
  );

  Assert.equal(
    ping.testOnlyCurInstanceEventCount,
    2,
    "Expected number of events sent"
  );

  ping.recordEvent("section_impression", {
    ...expectedFields,
  });
  ping.scheduleSubmission(extraMetrics);
  await ping.testOnlyForceFlush();

  Assert.equal(ping.testOnlyCurInstanceEventCount, 2, "No new events sent");

  ping = new NewTabContentPing();
  ping.setMaxEventsPerDay(MAX_EVENTS);

  Assert.equal(ping.testOnlyCurInstanceEventCount, 0, "Event count reset");

  ping.recordEvent("section_impression", {
    ...expectedFields,
  });
  ping.scheduleSubmission(extraMetrics);
  await ping.testOnlyForceFlush();

  Assert.equal(
    ping.testOnlyCurInstanceEventCount,
    0,
    "No new events after re-creating NewTabContentPing class"
  );

  // Some time has passed
  let sandbox = sinon.createSandbox();

  sandbox.stub(NewTabContentPing.prototype, "Date").returns({
    now: () => Date.now() + 3600 * 25 * 1000, // 25 hours in future
  });

  ping.scheduleSubmission(extraMetrics);

  ping.recordEvent("click", {
    ...expectedFields,
  });

  await GleanPings.newtabContent.testSubmission(
    () => {
      // Test Callback
      let [click] = Glean.newtabContent.click.testGetValue();
      Assert.ok(click, "Found click event.");
    },
    async () => {
      // Submit Callback
      await ping.testOnlyForceFlush();
    }
  );
  Assert.equal(ping.testOnlyCurInstanceEventCount, 1, "Event sending restored");
  sandbox.restore();
});

/**
 * Tests that the recordEvent caps the maximum number of click events
 */
add_task(async function test_recordEventDaily_caps_click_events() {
  const MAX_DAILY_CLICK_EVENTS = 2;
  const MAX_WEEKLY_CLICK_EVENTS = 10;

  let ping = new NewTabContentPing();
  ping.setMaxClickEventsPerDay(MAX_DAILY_CLICK_EVENTS);
  ping.setMaxClickEventsPerWeek(MAX_WEEKLY_CLICK_EVENTS);
  ping.test_only_resetAllStats();

  // These fields are expected to survive the sanitization.
  let expectedFields = {
    section: "business",
    corpus_item_id: "7fc404a1-74ec-450b-8eef-4f52b45ec510",
    topic: "business",
  };

  for (let i = 0; i < MAX_DAILY_CLICK_EVENTS * 2; i++) {
    ping.recordEvent("impression", {
      ...expectedFields,
    });
  }
  for (let i = 0; i < MAX_DAILY_CLICK_EVENTS; i++) {
    ping.recordEvent("click", {
      ...expectedFields,
    });
  }

  let extraMetrics = {
    utcOffset: "1",
    experimentBranch: "some-branch",
  };

  ping.scheduleSubmission(extraMetrics);

  await GleanPings.newtabContent.testSubmission(
    () => {
      // Test Callback
      let [clickEvent] = Glean.newtabContent.click.testGetValue();
      Assert.ok(clickEvent, "Found click event.");
      let [impression] = Glean.newtabContent.impression.testGetValue();
      Assert.ok(impression, "Found impression event.");
    },
    async () => {
      // Submit Callback
      await ping.testOnlyForceFlush();
    }
  );

  const curTotalEvents = MAX_DAILY_CLICK_EVENTS * 3;
  Assert.equal(
    ping.testOnlyCurInstanceEventCount,
    curTotalEvents,
    "Expected number of events sent"
  );

  ping.recordEvent("click", {
    ...expectedFields,
  });
  ping.scheduleSubmission(extraMetrics);
  await ping.testOnlyForceFlush();

  Assert.equal(
    ping.testOnlyCurInstanceEventCount,
    curTotalEvents,
    "Click cap enforced, no new events sent"
  );

  ping = new NewTabContentPing();
  ping.setMaxClickEventsPerDay(MAX_DAILY_CLICK_EVENTS);

  Assert.equal(ping.testOnlyCurInstanceEventCount, 0, "Event count reset");

  ping.recordEvent("click", {
    ...expectedFields,
  });
  ping.scheduleSubmission(extraMetrics);
  await ping.testOnlyForceFlush();

  Assert.equal(
    ping.testOnlyCurInstanceEventCount,
    0,
    "No new click events after re-creating NewTabContentPing class"
  );

  // Some time has passed
  let sandbox = sinon.createSandbox();

  sandbox.stub(NewTabContentPing.prototype, "Date").returns({
    now: () => Date.now() + 3600 * 25 * 1000, // 25 hours in future
  });

  ping.scheduleSubmission(extraMetrics);

  ping.recordEvent("click", {
    ...expectedFields,
  });

  await GleanPings.newtabContent.testSubmission(
    () => {
      // Test Callback
      let [click] = Glean.newtabContent.click.testGetValue();
      Assert.ok(click, "Found click event.");
    },
    async () => {
      // Submit Callback
      await ping.testOnlyForceFlush();
    }
  );
  Assert.equal(ping.testOnlyCurInstanceEventCount, 1, "Event sending restored");

  let cur_events_sent = ping.testOnlyCurInstanceEventCount;
  for (let i = 0; i < MAX_WEEKLY_CLICK_EVENTS; i++) {
    ping.recordEvent("click", {
      ...expectedFields,
    });
  }
  ping.scheduleSubmission(extraMetrics);
  await ping.testOnlyForceFlush();
  // Assert that less than MAX_WEEKLY_CLICK_EVENTS events were sent using a difference check (less) to avoid timing issues
  Assert.less(
    ping.testOnlyCurInstanceEventCount - cur_events_sent,
    MAX_WEEKLY_CLICK_EVENTS,
    "Weekly click cap enforced, no new events sent"
  );
  // Assert that at least 1 item was sent before we reached the cap
  Assert.greater(
    ping.testOnlyCurInstanceEventCount - cur_events_sent,
    0,
    "At least one event was sent before reaching the weekly cap"
  );

  sandbox.restore();

  // Some more time has passed - weekly reset
  sandbox = sinon.createSandbox();
  sandbox.stub(NewTabContentPing.prototype, "Date").returns({
    now: () => Date.now() + 3600 * 24 * 1000 * 8, // 8 days in the future
  });

  cur_events_sent = ping.testOnlyCurInstanceEventCount;
  for (let i = 0; i < MAX_WEEKLY_CLICK_EVENTS; i++) {
    ping.recordEvent("click", {
      ...expectedFields,
    });
  }
  ping.scheduleSubmission(extraMetrics);
  await ping.testOnlyForceFlush();
  Assert.equal(
    ping.testOnlyCurInstanceEventCount - cur_events_sent,
    MAX_DAILY_CLICK_EVENTS, // Only daily cap should apply after weekly reset
    "Event sending restored after weekly reset"
  );

  sandbox.restore();
});

add_task(function test_decideWithProbability() {
  Assert.equal(NewTabContentPing.decideWithProbability(-0.1), false);
  Assert.equal(NewTabContentPing.decideWithProbability(1.1), true);
});

add_task(function test_shuffleArray() {
  const shuffled = NewTabContentPing.shuffleArray([1, 3, 5]);
  Assert.equal(shuffled.length, 3);
  Assert.ok(shuffled.includes(3), "Shuffled item in array");
  Assert.ok(shuffled.includes(1), "Shuffled item in array");
  Assert.ok(shuffled.includes(5), "Shuffled item in array");
  Assert.equal(NewTabContentPing.shuffleArray([]).length, 0);
});

add_task(async function test_secureRandIntInRange() {
  for (let k = 0; k < 10; k++) {
    Assert.greater(
      10,
      NewTabContentPing.secureRandIntInRange(10),
      "Random value in range"
    );
    Assert.less(
      -1,
      NewTabContentPing.secureRandIntInRange(10),
      "Random value in range"
    );
  }
});
