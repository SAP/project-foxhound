/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

"use strict";

const { AboutWelcomeTelemetry } = ChromeUtils.importESModule(
  "resource:///modules/aboutwelcome/AboutWelcomeTelemetry.sys.mjs"
);
const { AttributionCode } = ChromeUtils.importESModule(
  "moz-src:///browser/components/attribution/AttributionCode.sys.mjs"
);
const { TelemetryController } = ChromeUtils.importESModule(
  "resource://gre/modules/TelemetryController.sys.mjs"
);
const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);
const TELEMETRY_PREF = "browser.newtabpage.activity-stream.telemetry";

add_setup(async function setup() {
  do_get_profile();
  await TelemetryController.testReset();
  Services.fog.initializeFOG();
  await TelemetryController.testSetup();
});

add_task(function test_enabled() {
  registerCleanupFunction(() => {
    Services.prefs.clearUserPref(TELEMETRY_PREF);
  });
  Services.prefs.setBoolPref(TELEMETRY_PREF, true);

  const AWTelemetry = new AboutWelcomeTelemetry();

  equal(AWTelemetry.telemetryEnabled, true, "Telemetry should be on");

  Services.prefs.setBoolPref(TELEMETRY_PREF, false);

  equal(AWTelemetry.telemetryEnabled, false, "Telemetry should be off");
});

add_task(async function test_pingPayload() {
  registerCleanupFunction(() => {
    Services.prefs.clearUserPref(TELEMETRY_PREF);
    sinon.restore();
  });
  Services.prefs.setBoolPref(TELEMETRY_PREF, true);
  const AWTelemetry = new AboutWelcomeTelemetry();
  sinon.stub(AWTelemetry, "_createPing").resolves({ event: "MOCHITEST" });

  let pingSubmitted = false;
  GleanPings.messagingSystem.testBeforeNextSubmit(() => {
    pingSubmitted = true;
    Assert.equal(Glean.messagingSystem.event.testGetValue(), "MOCHITEST");
  });
  await AWTelemetry.sendTelemetry();

  ok(pingSubmitted, "Glean ping was submitted");
});

add_task(async function test_pingPayload_write_in_microsurvey() {
  registerCleanupFunction(() => {
    Services.prefs.clearUserPref(TELEMETRY_PREF);
  });
  Services.prefs.setBoolPref(TELEMETRY_PREF, true);
  const AWTelemetry = new AboutWelcomeTelemetry();

  let pingSubmitted = false;
  GleanPings.microsurvey.testBeforeNextSubmit(() => {
    pingSubmitted = true;
    Assert.equal(Glean.microsurvey.event.testGetValue(), "MOCHITEST");
    Assert.ok(
      Glean.microsurvey.impressionId.testGetValue(),
      "impression_id should be set"
    );
  });
  await AWTelemetry.sendTelemetry({
    event: "MOCHITEST",
    event_context: { write_in_microsurvey: true },
  });

  ok(pingSubmitted, "Glean ping was submitted");
});

add_task(async function test_pingPayload_nowrite_in_microsurvey() {
  registerCleanupFunction(() => {
    Services.prefs.clearUserPref(TELEMETRY_PREF);
  });
  Services.prefs.setBoolPref(TELEMETRY_PREF, true);
  const AWTelemetry = new AboutWelcomeTelemetry();

  let pingSubmitted = false;
  GleanPings.messagingSystem.testBeforeNextSubmit(() => {
    pingSubmitted = true;
    Assert.equal(Glean.messagingSystem.event.testGetValue(), "MOCHITEST");
    Assert.ok(
      Glean.messagingSystem.clientId.testGetValue(),
      "client_id should be set"
    );
    Assert.ok(
      Glean.messagingSystem.browserSessionId.testGetValue(),
      "browser_session_id should be set"
    );
    Assert.ok(
      !Glean.messagingSystem.impressionId.testGetValue(),
      "impression_id should be excluded"
    );
  });
  await AWTelemetry.sendTelemetry({
    event: "MOCHITEST",
  });

  ok(pingSubmitted, "Glean ping was submitted");
});

add_task(async function test_mayAttachAttribution() {
  const sandbox = sinon.createSandbox();
  Services.prefs.setBoolPref(TELEMETRY_PREF, true);
  registerCleanupFunction(() => {
    sandbox.restore();
    Services.prefs.clearUserPref(TELEMETRY_PREF);
  });

  const AWTelemetry = new AboutWelcomeTelemetry();

  sandbox.stub(AttributionCode, "getCachedAttributionData").returns(null);

  let ping = AWTelemetry._maybeAttachAttribution({});

  equal(ping.attribution, undefined, "Should not set attribution if it's null");

  sandbox.restore();
  sandbox.stub(AttributionCode, "getCachedAttributionData").returns({});
  ping = AWTelemetry._maybeAttachAttribution({});

  equal(
    ping.attribution,
    undefined,
    "Should not set attribution if it's empty"
  );

  const attr = {
    source: "google.com",
    medium: "referral",
    campaign: "Firefox-Brand-US-Chrome",
    content: "(not set)",
    experiment: "(not set)",
    variation: "(not set)",
    ua: "chrome",
    dltoken: "(not set)",
    msstoresignedin: "false",
    msclkid: "(not set)",
    dlsource: "(not set)",

    invalid: "unused",
  };
  sandbox.restore();
  sandbox.stub(AttributionCode, "getCachedAttributionData").returns(attr);
  ping = AWTelemetry._maybeAttachAttribution({});

  equal(ping.attribution, attr, "Should set attribution if it presents");

  await GleanPings.messagingSystem.testSubmission(
    () => {
      const glAttr = Glean.messagingSystemAttribution;
      Assert.equal(glAttr.source.testGetValue(), attr.source);
      Assert.equal(glAttr.medium.testGetValue(), attr.medium);
      Assert.equal(glAttr.campaign.testGetValue(), attr.campaign);
      Assert.equal(glAttr.content.testGetValue(), attr.content);
      Assert.equal(glAttr.experiment.testGetValue(), attr.experiment);
      Assert.equal(glAttr.variation.testGetValue(), attr.variation);
      Assert.equal(glAttr.ua.testGetValue(), attr.ua);
      Assert.equal(glAttr.dltoken.testGetValue(), attr.dltoken);
      Assert.equal(glAttr.msstoresignedin.testGetValue(), attr.msstoresignedin);
      Assert.equal(glAttr.msclkid.testGetValue(), attr.msclkid);
      Assert.equal(glAttr.dlsource.testGetValue(), attr.dlsource);

      Assert.equal(glAttr.unknownKeys.invalid.testGetValue(), 1);
    },
    async () => {
      await AWTelemetry.sendTelemetry({ event: "MOCHITEST" });
    }
  );
});

// We recognize two kinds of unexpected data that might reach
// `submitGleanPingForPing`: unknown keys, and keys with unexpectedly-complex
// data (ie, non-scalar).
// We report the keys in special metrics to aid in system health monitoring.
add_task(function test_weird_data() {
  registerCleanupFunction(() => {
    Services.prefs.clearUserPref(TELEMETRY_PREF);
  });
  Services.prefs.setBoolPref(TELEMETRY_PREF, true);

  const AWTelemetry = new AboutWelcomeTelemetry();

  const unknownKey = "some_unknown_key";
  const camelUnknownKey = AWTelemetry._snakeToCamelCase(unknownKey);

  let pingSubmitted = false;
  GleanPings.messagingSystem.testBeforeNextSubmit(() => {
    pingSubmitted = true;
    Assert.equal(
      Glean.messagingSystem.unknownKeys[camelUnknownKey].testGetValue(),
      1,
      "caught the unknown key"
    );
    // TODO(bug 1600008): Also check the for-testing overall count.
    Assert.equal(Glean.messagingSystem.unknownKeyCount.testGetValue(), 1);
  });
  AWTelemetry.parseAndSubmitPing({
    [unknownKey]: "value doesn't matter",
  });

  Assert.ok(pingSubmitted, "Ping with unknown keys was submitted");

  const invalidNestedDataKey = "event";
  pingSubmitted = false;
  GleanPings.messagingSystem.testBeforeNextSubmit(() => {
    pingSubmitted = true;
    Assert.equal(
      Glean.messagingSystem.invalidNestedData[
        invalidNestedDataKey
      ].testGetValue("messaging-system"),
      1,
      "caught the invalid nested data"
    );
  });
  AWTelemetry.parseAndSubmitPing({
    [invalidNestedDataKey]: { this_should: "not be", complex: "data" },
  });

  Assert.ok(pingSubmitted, "Ping with invalid nested data submitted");
});

// `event_context` is weird. It's an object, but it might have been stringified
// before being provided for recording.
add_task(async function test_event_context() {
  registerCleanupFunction(() => {
    Services.prefs.clearUserPref(TELEMETRY_PREF);
  });
  Services.prefs.setBoolPref(TELEMETRY_PREF, true);

  const AWTelemetry = new AboutWelcomeTelemetry();

  const eventContext = {
    reason: "reason",
    page: "page",
    source: "source",
    value: "input value",
    something_else: "not specifically handled",
    screen_family: "family",
    screen_id: "screen_id",
    screen_index: 0,
    screen_initials: "screen_initials",
  };
  let expectedEC = { ...eventContext };
  // we delete it from context to avoid raising the metric's sensitivity
  delete expectedEC.value;
  const stringifiedExpectedEC = JSON.stringify(expectedEC);

  let pingSubmitted = false;
  GleanPings.messagingSystem.testBeforeNextSubmit(() => {
    pingSubmitted = true;
    Assert.equal(
      Glean.messagingSystem.eventReason.testGetValue(),
      eventContext.reason,
      "event_context.reason also in own metric."
    );
    Assert.equal(
      Glean.messagingSystem.eventPage.testGetValue(),
      eventContext.page,
      "event_context.page also in own metric."
    );
    Assert.equal(
      Glean.messagingSystem.eventSource.testGetValue(),
      eventContext.source,
      "event_context.source also in own metric."
    );
    Assert.ok(
      !Glean.messagingSystem.eventInputValue?.testGetValue(),
      "event_context.value is scrubbed from messagingSystem pings unless they have write_in_microsurvey: true."
    );
    Assert.equal(
      Glean.messagingSystem.eventScreenFamily.testGetValue(),
      eventContext.screen_family,
      "event_context.screen_family also in own metric."
    );
    Assert.equal(
      Glean.messagingSystem.eventScreenId.testGetValue(),
      eventContext.screen_id,
      "event_context.screen_id also in own metric."
    );
    Assert.equal(
      Glean.messagingSystem.eventScreenIndex.testGetValue(),
      eventContext.screen_index,
      "event_context.screen_index also in own metric."
    );
    Assert.equal(
      Glean.messagingSystem.eventScreenInitials.testGetValue(),
      eventContext.screen_initials,
      "event_context.screen_initials also in own metric."
    );

    Assert.equal(
      Glean.messagingSystem.eventContext.testGetValue(),
      stringifiedExpectedEC,
      "whole event_context added as text."
    );
  });
  AWTelemetry.parseAndSubmitPing({
    event_context: eventContext,
  });
  Assert.ok(pingSubmitted, "Ping with object event_context submitted");

  pingSubmitted = false;
  GleanPings.messagingSystem.testBeforeNextSubmit(() => {
    pingSubmitted = true;
    Assert.equal(
      Glean.messagingSystem.eventReason.testGetValue(),
      eventContext.reason,
      "event_context.reason also in own metric."
    );
    Assert.equal(
      Glean.messagingSystem.eventPage.testGetValue(),
      eventContext.page,
      "event_context.page also in own metric."
    );
    Assert.equal(
      Glean.messagingSystem.eventSource.testGetValue(),
      eventContext.source,
      "event_context.source also in own metric."
    );
    Assert.ok(
      !Glean.messagingSystem.eventInputValue?.testGetValue(),
      "event_context.value is scrubbed from messagingSystem pings unless they have write_in_microsurvey: true."
    );
    Assert.equal(
      Glean.messagingSystem.eventScreenFamily.testGetValue(),
      eventContext.screen_family,
      "event_context.screen_family also in own metric."
    );
    Assert.equal(
      Glean.messagingSystem.eventScreenId.testGetValue(),
      eventContext.screen_id,
      "event_context.screen_id also in own metric."
    );
    Assert.equal(
      Glean.messagingSystem.eventScreenIndex.testGetValue(),
      eventContext.screen_index,
      "event_context.screen_index also in own metric."
    );
    Assert.equal(
      Glean.messagingSystem.eventScreenInitials.testGetValue(),
      eventContext.screen_initials,
      "event_context.screen_initials also in own metric."
    );

    Assert.equal(
      Glean.messagingSystem.eventContext.testGetValue(),
      stringifiedExpectedEC,
      "whole event_context added as text."
    );
  });
  AWTelemetry.parseAndSubmitPing({
    event_context: JSON.stringify(eventContext),
  });
  Assert.ok(pingSubmitted, "Ping with string event_context submitted");

  eventContext.write_in_microsurvey = true;
  pingSubmitted = false;
  GleanPings.microsurvey.testBeforeNextSubmit(() => {
    pingSubmitted = true;
    Assert.equal(
      Glean.microsurvey.eventContext.testGetValue(),
      stringifiedExpectedEC,
      "whole event_context added as text."
    );
    Assert.equal(
      Glean.microsurvey.eventInputValue.testGetValue(),
      "input value",
      "event_context.value is included in microsurvey pings."
    );
  });
  await AWTelemetry.sendTelemetry({ event_context: eventContext });
  Assert.ok(pingSubmitted, "Ping with write_in_microsurvey submitted");
});

add_task(async function test_smart_window_user_feedback_data() {
  registerCleanupFunction(() => {
    Services.prefs.clearUserPref(TELEMETRY_PREF);
  });
  Services.prefs.setBoolPref(TELEMETRY_PREF, true);

  const AWTelemetry = new AboutWelcomeTelemetry();
  const feedbackData = {
    metadata: {
      model: "test-model",
      turn_count: 2,
      prompt_version: 4,
    },
    chat: {
      log: [{ role: 0, content: { type: "text", body: "hello" } }],
    },
  };

  let pingSubmitted = false;
  GleanPings.microsurvey.testBeforeNextSubmit(() => {
    pingSubmitted = true;
    Assert.deepEqual(
      Glean.microsurveySmartWindow.userFeedbackData.testGetValue(),
      { metadata: feedbackData.metadata },
      "microsurvey.smart_window.user_feedback_data is set on microsurvey ping."
    );
    Assert.deepEqual(
      Glean.microsurveySmartWindow.chat.testGetValue(),
      {
        log: [
          {
            role: 0,
            content: { content_type: "text", body: { text: "hello" } },
          },
        ],
      },
      "microsurvey.smart_window.chat is set with normalized body on microsurvey ping."
    );
  });
  await AWTelemetry.sendTelemetry({
    event_context: {
      smart_window_user_feedback_data: feedbackData,
      write_in_microsurvey: true,
    },
  });
  Assert.ok(pingSubmitted, "microsurvey ping was submitted");

  pingSubmitted = false;
  GleanPings.messagingSystem.testBeforeNextSubmit(() => {
    pingSubmitted = true;
    Assert.ok(
      !Glean.microsurveySmartWindow.userFeedbackData.testGetValue(),
      "user_feedback_data is not set without write_in_microsurvey."
    );
    Assert.ok(
      !Glean.microsurveySmartWindow.chat.testGetValue(),
      "chat is not set without write_in_microsurvey."
    );
  });
  await AWTelemetry.sendTelemetry({
    event_context: {
      smart_window_user_feedback_data: feedbackData,
    },
  });
  Assert.ok(
    pingSubmitted,
    "messagingSystem ping was submitted without write_in_microsurvey"
  );

  pingSubmitted = false;
  GleanPings.microsurvey.testBeforeNextSubmit(() => {
    pingSubmitted = true;
    Assert.ok(
      Glean.microsurveySmartWindow.userFeedbackData.testGetValue(),
      "user_feedback_data is set when chat is null."
    );
    Assert.ok(
      !Glean.microsurveySmartWindow.chat.testGetValue(),
      "chat is not set when chat is null."
    );
  });
  await AWTelemetry.sendTelemetry({
    event_context: {
      smart_window_user_feedback_data: {
        metadata: feedbackData.metadata,
        chat: null,
      },
      write_in_microsurvey: true,
    },
  });
  Assert.ok(pingSubmitted, "microsurvey ping was submitted with null chat");
});

add_task(async function test_chat_log_normalization() {
  registerCleanupFunction(() => {
    Services.prefs.clearUserPref(TELEMETRY_PREF);
  });
  Services.prefs.setBoolPref(TELEMETRY_PREF, true);

  const AWTelemetry = new AboutWelcomeTelemetry();
  const chat = {
    log: [
      // string body (text message) — should become { text }
      {
        role: 0,
        content: { type: "text", body: "hello" },
      },
      // array body (tool result message) — should become { result }
      {
        role: 3,
        content: {
          tool_call_id: "call_123",
          name: "get_page_content",
          body: ["page content"],
        },
      },
      // object body (function message) — should be unchanged
      {
        role: 1,
        content: {
          type: "function",
          body: {
            tool_calls: [
              {
                id: "call_123",
                type: "function",
                function: {
                  name: "get_page_content",
                  arguments: '{"url_list": ["https://example.com"]}',
                },
              },
            ],
          },
        },
      },
    ],
  };

  let pingSubmitted = false;
  GleanPings.microsurvey.testBeforeNextSubmit(() => {
    pingSubmitted = true;
    const recorded = Glean.microsurveySmartWindow.chat.testGetValue();

    Assert.deepEqual(
      recorded.log[0].content.body,
      { text: "hello" },
      "string body is normalized to { text }"
    );

    Assert.deepEqual(
      recorded.log[1].content.body,
      { result: ["page content"] },
      "array body is normalized to { result }"
    );

    Assert.deepEqual(
      recorded.log[2].content.body,
      {
        tool_calls: [
          {
            id: "call_123",
            call_type: "function",
            function: {
              name: "get_page_content",
              arguments: '{"url_list": ["https://example.com"]}',
            },
          },
        ],
      },
      "object body has tool call type renamed to call_type"
    );
  });

  await AWTelemetry.sendTelemetry({
    event_context: {
      smart_window_user_feedback_data: {
        metadata: { model: "test-model", turn_count: 1, prompt_version: 1 },
        chat,
      },
      write_in_microsurvey: true,
    },
  });
  Assert.ok(pingSubmitted, "microsurvey ping was submitted");
});

// For event_context to be more useful, we want to make sure we don't error
// in cases where it doesn't make much sense, such as a plain string that
// doesnt attempt to represent a valid object.
add_task(function test_context_errors() {
  registerCleanupFunction(() => {
    Services.prefs.clearUserPref(TELEMETRY_PREF);
  });
  Services.prefs.setBoolPref(TELEMETRY_PREF, true);

  const AWTelemetry = new AboutWelcomeTelemetry();

  let weird_context_ping = {
    event_context: "oops, this string isn't a valid JS object!",
  };

  let pingSubmitted = false;
  GleanPings.messagingSystem.testBeforeNextSubmit(() => {
    pingSubmitted = true;
    Assert.equal(
      Glean.messagingSystem.eventContextParseError.testGetValue(),
      undefined,
      "this poorly formed context shouldn't register because it was not an object!"
    );
  });

  AWTelemetry.parseAndSubmitPing(weird_context_ping);

  Assert.ok(pingSubmitted, "Ping with unknown keys was submitted");

  weird_context_ping = {
    event_context:
      "{oops : {'this string isn't a valid JS object, but it sure looks like one!}}'",
  };

  pingSubmitted = false;
  GleanPings.messagingSystem.testBeforeNextSubmit(() => {
    pingSubmitted = true;
    Assert.equal(
      Glean.messagingSystem.eventContextParseError.testGetValue(),
      1,
      "this poorly formed context should register because it was not an object!"
    );
  });

  AWTelemetry.parseAndSubmitPing(weird_context_ping);

  Assert.ok(pingSubmitted, "Ping with unknown keys was submitted");
});
