/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { ToolUITelemetry } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/ui/modules/ToolUITelemetry.sys.mjs"
);

add_task(async function test_recordBrowserActionPrompt() {
  Services.fog.testResetFOG();

  const testData = {
    location: "sidebar",
    chat_id: "test-chat-123",
    message_seq: 5,
    action_type: "close_tabs",
    prompt_type: "safety_confirmation",
    reason: "pinned_tab",
    candidates: 3,
    preselected: 0,
  };

  ToolUITelemetry.recordBrowserActionPrompt(testData);

  const events = Glean.smartWindow.browserActionPrompt.testGetValue();
  Assert.equal(
    events?.length,
    1,
    "One browser action prompt event was recorded"
  );

  const event = events[0];
  Assert.equal(
    event.extra.location,
    testData.location,
    "Location matches expected value"
  );
  Assert.equal(
    event.extra.chat_id,
    testData.chat_id,
    "Chat ID matches expected value"
  );
  Assert.equal(
    event.extra.message_seq,
    String(testData.message_seq),
    "Message sequence matches expected value"
  );
  Assert.equal(
    event.extra.action_type,
    testData.action_type,
    "Action type matches expected value"
  );
  Assert.equal(
    event.extra.prompt_type,
    testData.prompt_type,
    "Prompt type matches expected value"
  );
  Assert.equal(
    event.extra.reason,
    testData.reason,
    "Reason matches expected value"
  );
  Assert.equal(
    event.extra.candidates,
    String(testData.candidates),
    "Candidates count matches expected value"
  );
  Assert.equal(
    event.extra.preselected,
    String(testData.preselected),
    "Preselected count matches expected value"
  );
});

add_task(async function test_recordBrowserActionPromptResponse_confirm() {
  Services.fog.testResetFOG();

  const testData = {
    location: "fullpage",
    chat_id: "test-chat-456",
    message_seq: 2,
    action_type: "close_tabs",
    prompt_type: "safety_confirmation",
    response: "confirm",
    selected: 2,
    reason: "user_action",
  };

  ToolUITelemetry.recordBrowserActionPromptResponse(testData);

  const events = Glean.smartWindow.browserActionPromptResponse.testGetValue();
  Assert.equal(
    events?.length,
    1,
    "One browser action prompt response event was recorded"
  );

  const event = events[0];
  Assert.equal(
    event.extra.location,
    testData.location,
    "Location matches expected value"
  );
  Assert.equal(
    event.extra.chat_id,
    testData.chat_id,
    "Chat ID matches expected value"
  );
  Assert.equal(
    event.extra.message_seq,
    String(testData.message_seq),
    "Message sequence matches expected value"
  );
  Assert.equal(
    event.extra.action_type,
    testData.action_type,
    "Action type matches expected value"
  );
  Assert.equal(
    event.extra.prompt_type,
    testData.prompt_type,
    "Prompt type matches expected value"
  );
  Assert.equal(
    event.extra.response,
    testData.response,
    "Response matches expected value"
  );
  Assert.equal(
    event.extra.selected,
    String(testData.selected),
    "Selected count matches expected value"
  );
  Assert.equal(
    event.extra.reason,
    testData.reason,
    "Reason matches expected value"
  );
});

add_task(async function test_recordBrowserActionPromptResponse_cancel() {
  Services.fog.testResetFOG();

  const testData = {
    location: "sidebar",
    chat_id: "test-chat-789",
    message_seq: 1,
    action_type: "close_tabs",
    prompt_type: "safety_confirmation",
    response: "cancel",
    selected: 0,
    reason: "user_action",
  };

  ToolUITelemetry.recordBrowserActionPromptResponse(testData);

  const events = Glean.smartWindow.browserActionPromptResponse.testGetValue();
  Assert.equal(
    events?.length,
    1,
    "One browser action prompt response (cancel) event was recorded"
  );

  const event = events[0];
  Assert.equal(
    event.extra.response,
    "cancel",
    "Response is cancel as expected"
  );
  Assert.equal(
    event.extra.selected,
    "0",
    "Selected count is 0 for cancellation"
  );
});

add_task(async function test_recordBrowserActionUndo_success() {
  Services.fog.testResetFOG();

  const testData = {
    location: "fullpage",
    chat_id: "test-chat-undo-123",
    message_seq: 3,
    action_type: "close_tabs",
    tabs_restored: 2,
    time_delta: 5000,
    result: "success",
    error: "",
  };

  ToolUITelemetry.recordBrowserActionUndo(testData);

  const events = Glean.smartWindow.browserActionUndo.testGetValue();
  Assert.equal(events?.length, 1, "One browser action undo event was recorded");

  const event = events[0];
  Assert.equal(
    event.extra.location,
    testData.location,
    "Location matches expected value"
  );
  Assert.equal(
    event.extra.chat_id,
    testData.chat_id,
    "Chat ID matches expected value"
  );
  Assert.equal(
    event.extra.message_seq,
    String(testData.message_seq),
    "Message sequence matches expected value"
  );
  Assert.equal(
    event.extra.action_type,
    testData.action_type,
    "Action type matches expected value"
  );
  Assert.equal(
    event.extra.tabs_restored,
    String(testData.tabs_restored),
    "Tabs restored count matches expected value"
  );
  Assert.equal(
    event.extra.time_delta,
    String(testData.time_delta),
    "Time delta matches expected value"
  );
  Assert.equal(
    event.extra.result,
    testData.result,
    "Result matches expected value"
  );
  Assert.equal(
    event.extra.error,
    testData.error,
    "Error field matches expected value"
  );
});

add_task(async function test_recordBrowserActionUndo_error() {
  Services.fog.testResetFOG();

  const testData = {
    location: "sidebar",
    chat_id: "test-chat-undo-error",
    message_seq: 4,
    action_type: "close_tabs",
    tabs_restored: 0,
    time_delta: 2000,
    result: "error",
    error: "invalid_window",
  };

  ToolUITelemetry.recordBrowserActionUndo(testData);

  const events = Glean.smartWindow.browserActionUndo.testGetValue();
  Assert.equal(
    events?.length,
    1,
    "One browser action undo error event was recorded"
  );

  const event = events[0];
  Assert.equal(event.extra.result, "error", "Result is error as expected");
  Assert.equal(
    event.extra.tabs_restored,
    "0",
    "Tabs restored is 0 for error case"
  );
  Assert.equal(
    event.extra.error,
    "invalid_window",
    "Error code matches expected value"
  );
});

add_task(async function test_recordBrowserActionUndo_partial_success() {
  Services.fog.testResetFOG();

  const testData = {
    location: "fullpage",
    chat_id: "test-chat-partial",
    message_seq: 6,
    action_type: "close_tabs",
    tabs_restored: 1,
    time_delta: 3500,
    result: "partial_success",
    error: "one_or_more_tabs_failed_to_restore",
  };

  ToolUITelemetry.recordBrowserActionUndo(testData);

  const events = Glean.smartWindow.browserActionUndo.testGetValue();
  Assert.equal(
    events?.length,
    1,
    "One browser action undo partial success event was recorded"
  );

  const event = events[0];
  Assert.equal(
    event.extra.result,
    "partial_success",
    "Result is partial_success as expected"
  );
  Assert.equal(event.extra.tabs_restored, "1", "Some tabs were restored");
  Assert.equal(
    event.extra.error,
    "one_or_more_tabs_failed_to_restore",
    "Error code indicates partial failure"
  );
});

add_task(async function test_recordBrowserActionSubmit() {
  Services.fog.testResetFOG();

  const testData = {
    location: "sidebar",
    chat_id: "test-chat-submit",
    message_seq: 2,
    model: "test-model",
    prompt_version: "6",
    submit_type: "enter",
    action_type: "tab_mention",
    tabs_open: 5,
    mentions: 2,
  };

  ToolUITelemetry.recordBrowserActionSubmit(testData);

  const events = Glean.smartWindow.browserActionSubmit.testGetValue();
  Assert.equal(
    events?.length,
    1,
    "One browser action submit event was recorded"
  );

  const event = events[0];
  Assert.equal(event.extra.location, testData.location);
  Assert.equal(event.extra.chat_id, testData.chat_id);
  Assert.equal(event.extra.message_seq, String(testData.message_seq));
  Assert.equal(event.extra.model, testData.model);
  Assert.equal(event.extra.prompt_version, testData.prompt_version);
  Assert.equal(event.extra.submit_type, testData.submit_type);
  Assert.equal(event.extra.action_type, testData.action_type);
  Assert.equal(event.extra.tabs_open, String(testData.tabs_open));
  Assert.equal(event.extra.mentions, String(testData.mentions));
});

add_task(async function test_recordBrowserActionComplete_success() {
  Services.fog.testResetFOG();

  const testData = {
    location: "fullpage",
    chat_id: "test-chat-complete",
    message_seq: 3,
    model: "test-model",
    prompt_version: "6",
    action_type: "description",
    result: "success",
    tabs_affected: 2,
    undo_available: true,
    error: "",
  };

  ToolUITelemetry.recordBrowserActionComplete(testData);

  const events = Glean.smartWindow.browserActionComplete.testGetValue();
  Assert.equal(
    events?.length,
    1,
    "One browser action complete event was recorded"
  );

  const event = events[0];
  Assert.equal(event.extra.location, testData.location);
  Assert.equal(event.extra.chat_id, testData.chat_id);
  Assert.equal(event.extra.message_seq, String(testData.message_seq));
  Assert.equal(event.extra.model, testData.model);
  Assert.equal(event.extra.prompt_version, testData.prompt_version);
  Assert.equal(event.extra.action_type, testData.action_type);
  Assert.equal(event.extra.result, testData.result);
  Assert.equal(event.extra.tabs_affected, String(testData.tabs_affected));
  Assert.equal(event.extra.undo_available, String(testData.undo_available));
  Assert.equal(event.extra.error, testData.error);
});

add_task(async function test_recordBrowserActionComplete_cancelled() {
  Services.fog.testResetFOG();

  ToolUITelemetry.recordBrowserActionComplete({
    location: "sidebar",
    chat_id: "test-chat-cancelled",
    message_seq: 1,
    model: "test-model",
    prompt_version: "6",
    action_type: "tab_mention",
    result: "cancelled",
    tabs_affected: 0,
    undo_available: false,
    error: "",
  });

  const events = Glean.smartWindow.browserActionComplete.testGetValue();
  Assert.equal(events?.length, 1);
  Assert.equal(events[0].extra.result, "cancelled");
  Assert.equal(events[0].extra.tabs_affected, "0");
  Assert.equal(events[0].extra.undo_available, "false");
});

add_task(async function test_recordBrowserActionComplete_no_match() {
  Services.fog.testResetFOG();

  ToolUITelemetry.recordBrowserActionComplete({
    location: "fullpage",
    chat_id: "test-chat-nomatch",
    message_seq: 4,
    model: "test-model",
    prompt_version: "6",
    action_type: "description",
    result: "no_match",
    tabs_affected: 0,
    undo_available: false,
    error: "no_open_tab_match",
  });

  const events = Glean.smartWindow.browserActionComplete.testGetValue();
  Assert.equal(events?.length, 1);
  Assert.equal(events[0].extra.result, "no_match");
  Assert.equal(events[0].extra.error, "no_open_tab_match");
});

add_task(async function test_multiple_events_recorded_separately() {
  Services.fog.testResetFOG();

  // Record multiple events to ensure they're tracked separately
  ToolUITelemetry.recordBrowserActionPrompt({
    location: "sidebar",
    chat_id: "multi-test-1",
    message_seq: 1,
    action_type: "close_tabs",
    prompt_type: "safety_confirmation",
    reason: "user_action",
    candidates: 1,
    preselected: 0,
  });

  ToolUITelemetry.recordBrowserActionPrompt({
    location: "fullpage",
    chat_id: "multi-test-2",
    message_seq: 2,
    action_type: "close_tabs",
    prompt_type: "safety_confirmation",
    reason: "pinned_tab",
    candidates: 3,
    preselected: 0,
  });

  const promptEvents = Glean.smartWindow.browserActionPrompt.testGetValue();
  Assert.equal(
    promptEvents?.length,
    2,
    "Two separate browser action prompt events were recorded"
  );

  Assert.equal(
    promptEvents[0].extra.chat_id,
    "multi-test-1",
    "First event has correct chat_id"
  );
  Assert.equal(
    promptEvents[1].extra.chat_id,
    "multi-test-2",
    "Second event has correct chat_id"
  );
  Assert.equal(
    promptEvents[0].extra.reason,
    "user_action",
    "First event has correct reason"
  );
  Assert.equal(
    promptEvents[1].extra.reason,
    "pinned_tab",
    "Second event has correct reason"
  );
});
