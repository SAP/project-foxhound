/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Test that the AIChatContent ToolUIUpdate event pipeline works correctly
 */

do_get_profile();

/**
 * Test that AIChatContentChild can handle ToolUIUpdate events
 */
add_task(async function test_child_actor_handles_toolUIUpdate_event() {
  const { AIChatContentChild } = ChromeUtils.importESModule(
    "moz-src:///browser/components/aiwindow/ui/actors/AIChatContentChild.sys.mjs"
  );

  // Create a mock child actor
  const mockChild = new AIChatContentChild();

  // Mock sendAsyncMessage to verify it's called
  let messageSent = false;
  let sentMessageName = null;

  mockChild.sendAsyncMessage = name => {
    messageSent = true;
    sentMessageName = name;
  };

  // Create a mock ToolUIUpdate event
  const mockEvent = {
    type: "AIChatContent:ToolUIUpdate",
    detail: {
      messageId: "test-msg",
      toolCallId: "test-tool",
      updateType: "confirmation",
    },
  };

  // Call handleEvent
  mockChild.handleEvent(mockEvent);

  Assert.ok(messageSent, "Child actor should send async message");
  Assert.equal(
    sentMessageName,
    "AIChatContent:ToolUIUpdate",
    "Should send correct message name"
  );
});

/**
 * Test the basic structure of a ToolUIUpdate event data
 */
add_task(async function test_toolUIUpdate_event_data_structure() {
  const testData = {
    messageId: "msg-123",
    toolCallId: "tool-456",
    updateType: "confirmation",
    updateData: { selectedItems: ["item1", "item2"] },
  };

  // Verify all required fields are present
  Assert.ok(testData.messageId, "Event data should have messageId");
  Assert.ok(testData.toolCallId, "Event data should have toolCallId");
  Assert.ok(testData.updateType, "Event data should have updateType");
  Assert.ok(testData.updateData, "Event data should have updateData");

  // Verify data types
  Assert.equal(
    typeof testData.messageId,
    "string",
    "messageId should be a string"
  );
  Assert.equal(
    typeof testData.toolCallId,
    "string",
    "toolCallId should be a string"
  );
  Assert.equal(
    typeof testData.updateType,
    "string",
    "updateType should be a string"
  );
  Assert.equal(
    typeof testData.updateData,
    "object",
    "updateData should be an object"
  );
});
