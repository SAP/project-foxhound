/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

const { ContextDescriptorType } = ChromeUtils.importESModule(
  "chrome://remote/content/shared/messagehandler/MessageHandler.sys.mjs"
);
const { RootMessageHandler } = ChromeUtils.importESModule(
  "chrome://remote/content/shared/messagehandler/RootMessageHandler.sys.mjs"
);
const { SessionData, SessionDataMethod } = ChromeUtils.importESModule(
  "chrome://remote/content/shared/messagehandler/sessiondata/SessionData.sys.mjs"
);

add_task(async function test_sessionData() {
  const sessionData = new SessionData(new RootMessageHandler("session-id-1"));
  equal(sessionData.getSessionData("mod", "event").length, 0);

  const globalContext = {
    type: ContextDescriptorType.All,
  };
  const otherContext = { type: "other-type", id: "some-id" };

  info("Add a first event for the global context");
  let updatedItems = sessionData.applySessionData([
    createUpdate(SessionDataMethod.Add, globalContext, ["first.event"]),
  ]);
  equal(updatedItems.length, 1, "One item updated");
  equal(updatedItems[0].method, SessionDataMethod.Add, "One item added");
  let updatedValues = updatedItems[0].values;
  equal(updatedValues.length, 1, "One value added");
  equal(updatedValues[0], "first.event", "Expected value was added");
  checkEvents(sessionData.getSessionData("mod", "event"), [
    {
      value: "first.event",
      contextDescriptor: globalContext,
    },
  ]);

  info("Add the exact same data (same module, type, context, value)");
  updatedItems = sessionData.applySessionData([
    createUpdate(SessionDataMethod.Add, globalContext, ["first.event"]),
  ]);
  equal(updatedItems.length, 0, "No new item updated");
  checkEvents(sessionData.getSessionData("mod", "event"), [
    {
      value: "first.event",
      contextDescriptor: globalContext,
    },
  ]);

  info("Add another context for the same event");
  updatedItems = sessionData.applySessionData([
    createUpdate(SessionDataMethod.Add, otherContext, ["first.event"]),
  ]);
  equal(updatedItems.length, 1, "One item updated");
  equal(updatedItems[0].method, SessionDataMethod.Add, "One item added");
  updatedValues = updatedItems[0].values;
  equal(updatedValues.length, 1, "One value added");
  equal(updatedValues[0], "first.event", "Expected value was added");
  checkEvents(sessionData.getSessionData("mod", "event"), [
    {
      value: "first.event",
      contextDescriptor: globalContext,
    },
    {
      value: "first.event",
      contextDescriptor: otherContext,
    },
  ]);

  info("Add a second event for the global context");
  updatedItems = sessionData.applySessionData([
    createUpdate(SessionDataMethod.Add, globalContext, ["second.event"]),
  ]);
  equal(updatedItems.length, 1, "One item updated");
  equal(updatedItems[0].method, SessionDataMethod.Add, "One item added");
  updatedValues = updatedItems[0].values;
  equal(updatedValues.length, 1, "One value added");
  equal(updatedValues[0], "second.event", "Expected value was added");
  checkEvents(sessionData.getSessionData("mod", "event"), [
    {
      value: "first.event",
      contextDescriptor: globalContext,
    },
    {
      value: "first.event",
      contextDescriptor: otherContext,
    },
    {
      value: "second.event",
      contextDescriptor: globalContext,
    },
  ]);

  info("Add two events for the global context");
  updatedItems = sessionData.applySessionData([
    createUpdate(SessionDataMethod.Add, globalContext, [
      "third.event",
      "fourth.event",
    ]),
  ]);
  equal(updatedItems.length, 1, "One item updated");
  equal(updatedItems[0].method, SessionDataMethod.Add, "One item added");
  updatedValues = updatedItems[0].values;
  equal(updatedValues.length, 2, "Two values added");
  equal(updatedValues[0], "third.event", "Expected value was added");
  equal(updatedValues[1], "fourth.event", "Expected value was added");
  checkEvents(sessionData.getSessionData("mod", "event"), [
    {
      value: "first.event",
      contextDescriptor: globalContext,
    },
    {
      value: "first.event",
      contextDescriptor: otherContext,
    },
    {
      value: "second.event",
      contextDescriptor: globalContext,
    },
    {
      value: "third.event",
      contextDescriptor: globalContext,
    },
    {
      value: "fourth.event",
      contextDescriptor: globalContext,
    },
  ]);

  info("Remove the second, third and fourth events");
  updatedItems = sessionData.applySessionData([
    createUpdate(SessionDataMethod.Remove, globalContext, [
      "second.event",
      "third.event",
      "fourth.event",
    ]),
  ]);
  equal(updatedItems.length, 1, "One item updated");
  equal(updatedItems[0].method, SessionDataMethod.Remove, "One item removed");
  updatedValues = updatedItems[0].values;
  equal(updatedValues.length, 3, "Three values removed");
  equal(updatedValues[0], "second.event", "Expected value was removed");
  equal(updatedValues[1], "third.event", "Expected value was removed");
  equal(updatedValues[2], "fourth.event", "Expected value was removed");
  checkEvents(sessionData.getSessionData("mod", "event"), [
    {
      value: "first.event",
      contextDescriptor: globalContext,
    },
    {
      value: "first.event",
      contextDescriptor: otherContext,
    },
  ]);

  info("Remove the global context from the first event");
  updatedItems = sessionData.applySessionData([
    createUpdate(SessionDataMethod.Remove, globalContext, ["first.event"]),
  ]);
  equal(updatedItems.length, 1, "One item updated");
  equal(updatedItems[0].method, SessionDataMethod.Remove, "One item removed");
  updatedValues = updatedItems[0].values;
  equal(updatedValues.length, 1, "One value removed");
  equal(updatedValues[0], "first.event", "Expected value was removed");
  checkEvents(sessionData.getSessionData("mod", "event"), [
    {
      value: "first.event",
      contextDescriptor: otherContext,
    },
  ]);

  info("Remove the other context from the first event");
  updatedItems = sessionData.applySessionData([
    createUpdate(SessionDataMethod.Remove, otherContext, ["first.event"]),
  ]);
  equal(updatedItems.length, 1, "One item updated");
  equal(updatedItems[0].method, SessionDataMethod.Remove, "One item removed");
  updatedValues = updatedItems[0].values;
  equal(updatedValues.length, 1, "One value removed");
  equal(updatedValues[0], "first.event", "Expected value was removed");
  checkEvents(sessionData.getSessionData("mod", "event"), []);

  info("Add two events for different contexts");
  updatedItems = sessionData.applySessionData([
    createUpdate(SessionDataMethod.Add, otherContext, ["first.event"]),
    createUpdate(SessionDataMethod.Add, globalContext, ["second.event"]),
  ]);
  equal(updatedItems.length, 2, "Two items updated");
  equal(updatedItems[0].method, SessionDataMethod.Add, "First item added");
  updatedValues = updatedItems[0].values;
  equal(updatedValues.length, 1, "One value for first item added");
  equal(updatedValues[0], "first.event", "Expected value first item was added");
  equal(updatedItems[1].method, SessionDataMethod.Add, "Second item added");
  updatedValues = updatedItems[1].values;
  equal(updatedValues.length, 1, "One value for second item added");
  equal(
    updatedValues[0],
    "second.event",
    "Expected value second item was added"
  );
  checkEvents(sessionData.getSessionData("mod", "event"), [
    {
      value: "first.event",
      contextDescriptor: otherContext,
    },
    {
      value: "second.event",
      contextDescriptor: globalContext,
    },
  ]);

  info("Remove two events for different contexts");
  updatedItems = sessionData.applySessionData([
    createUpdate(SessionDataMethod.Remove, otherContext, ["first.event"]),
    createUpdate(SessionDataMethod.Remove, globalContext, ["second.event"]),
  ]);
  equal(updatedItems.length, 2, "Two items updated");
  equal(updatedItems[0].method, SessionDataMethod.Remove, "First item removed");
  updatedValues = updatedItems[0].values;
  equal(updatedValues.length, 1, "One value for first item removed");
  equal(
    updatedValues[0],
    "first.event",
    "Expected value first item was removed"
  );
  equal(
    updatedItems[1].method,
    SessionDataMethod.Remove,
    "Second item removed"
  );
  updatedValues = updatedItems[1].values;
  equal(updatedValues.length, 1, "One value for second item removed");
  equal(
    updatedValues[0],
    "second.event",
    "Expected value second item was removed"
  );
  checkEvents(sessionData.getSessionData("mod", "event"), []);

  info("Add and remove event in different order");
  updatedItems = sessionData.applySessionData([
    createUpdate(SessionDataMethod.Remove, otherContext, ["first.event"]),
    createUpdate(SessionDataMethod.Add, otherContext, ["first.event"]),
  ]);
  equal(updatedItems.length, 1, "One item updated");
  equal(updatedItems[0].method, SessionDataMethod.Add, "One item added");
  updatedValues = updatedItems[0].values;
  equal(updatedValues.length, 1, "One value added");
  equal(updatedValues[0], "first.event", "Expected value was added");
  checkEvents(sessionData.getSessionData("mod", "event"), [
    {
      value: "first.event",
      contextDescriptor: otherContext,
    },
  ]);

  updatedItems = sessionData.applySessionData([
    createUpdate(SessionDataMethod.Add, otherContext, ["first.event"]),
    createUpdate(SessionDataMethod.Remove, otherContext, ["first.event"]),
  ]);
  equal(updatedItems.length, 1, "No item update");
  equal(updatedItems[0].method, SessionDataMethod.Remove, "One item removed");
  updatedValues = updatedItems[0].values;
  equal(updatedValues.length, 1, "One value removed");
  equal(updatedValues[0], "first.event", "Expected value was removed");
  checkEvents(sessionData.getSessionData("mod", "event"), []);
});

add_task(function test_hasSessionData() {
  const sessionData = new SessionData(new RootMessageHandler("session-id-1"));

  ok(
    !sessionData.hasSessionData("mod", "event"),
    "Starts with no session data"
  );

  const globalContext = {
    type: ContextDescriptorType.All,
  };
  const otherContext = { type: "other-type", id: "some-id" };

  sessionData.applySessionData([
    createUpdate(SessionDataMethod.Add, globalContext, ["test.event"]),
  ]);
  ok(sessionData.hasSessionData("mod", "event"), "Detects global context");
  sessionData.applySessionData([
    createUpdate(SessionDataMethod.Remove, globalContext, ["test.event"]),
  ]);
  ok(
    !sessionData.hasSessionData("mod", "event"),
    "Detects removal of global context data"
  );

  sessionData.applySessionData([
    createUpdate(SessionDataMethod.Add, otherContext, ["other.event"]),
  ]);
  ok(
    sessionData.hasSessionData("mod", "event"),
    "Detects specific context data"
  );

  sessionData.applySessionData([
    createUpdate(SessionDataMethod.Add, globalContext, ["global.event"]),
  ]);
  ok(sessionData.hasSessionData("mod", "event"), "Detects mixed context data");

  sessionData.applySessionData([
    createUpdate(SessionDataMethod.Remove, otherContext, ["other.event"]),
  ]);
  ok(
    sessionData.hasSessionData("mod", "event"),
    "Should still contain global context data"
  );

  sessionData.applySessionData([
    createUpdate(SessionDataMethod.Remove, globalContext, ["global.event"]),
  ]);
  ok(
    !sessionData.hasSessionData("mod", "event"),
    "Should detect removal of all context data"
  );

  const specificContext = { type: "specific-type", id: "some-id" };

  ok(!sessionData.hasSessionData("mod"), "Works without category");
  sessionData.applySessionData([
    createUpdate(SessionDataMethod.Add, specificContext, ["specific.event"]),
  ]);
  ok(sessionData.hasSessionData("mod"), "Detects without category");
  sessionData.applySessionData([
    createUpdate(SessionDataMethod.Remove, specificContext, ["specific.event"]),
  ]);

  ok(
    !sessionData.hasSessionData("mod", "event", specificContext),
    "No data for specific context initially"
  );
  sessionData.applySessionData([
    createUpdate(SessionDataMethod.Add, specificContext, ["specific.event"]),
  ]);
  ok(
    sessionData.hasSessionData("mod", "event", specificContext),
    "Detects specific context data"
  );
  ok(
    !sessionData.hasSessionData("mod", "event", otherContext),
    "Doesn't show for wrong context"
  );
  sessionData.applySessionData([
    createUpdate(SessionDataMethod.Remove, specificContext, ["specific.event"]),
  ]);

  ok(
    !sessionData.hasSessionData("non-existent-module"),
    "Unknown module returns false"
  );
});

add_task(async function test_getSessionDataForContext() {
  const sessionData = new SessionData(new RootMessageHandler("session-id-1"));

  const globalContextDescriptor = {
    type: ContextDescriptorType.All,
  };

  const userContextDescriptor = {
    type: ContextDescriptorType.UserContext,
    id: 1,
  };

  const browsingContextDescriptor = {
    type: ContextDescriptorType.TopBrowsingContext,
    id: 2,
  };

  sessionData.applySessionData([
    createUpdate(SessionDataMethod.Add, globalContextDescriptor, ["global"]),
    createUpdate(SessionDataMethod.Add, userContextDescriptor, ["userContext"]),
    createUpdate(SessionDataMethod.Add, browsingContextDescriptor, [
      "browsingContext",
    ]),
  ]);

  const browsingContext1 = {
    browserId: 2,
    originAttributes: {
      userContextId: 1,
    },
  };

  const sessionDataForContext1 = sessionData.getSessionDataForContext(
    "mod",
    "event",
    browsingContext1
  );
  equal(sessionDataForContext1.length, 3, "Get 3 session data items");
  equal(
    sessionDataForContext1[0].value,
    "global",
    "Get a session data item for the global context descriptor"
  );
  equal(
    sessionDataForContext1[1].value,
    "userContext",
    "Get a session data item for the user context descriptor"
  );
  equal(
    sessionDataForContext1[2].value,
    "browsingContext",
    "Get a session data item for the browsing context descriptor"
  );

  const browsingContext2 = {
    browserId: 3,
    originAttributes: {
      userContextId: 2,
    },
  };

  const sessionDataForContext2 = sessionData.getSessionDataForContext(
    "mod",
    "event",
    browsingContext2
  );
  equal(sessionDataForContext2.length, 1, "Get 1 session data items");
  equal(
    sessionDataForContext2[0].value,
    "global",
    "Get a session data item for the global context descriptor"
  );

  const browsingContext3 = {
    browserId: 4,
    originAttributes: {
      userContextId: 1,
    },
  };

  const sessionDataForContext3 = sessionData.getSessionDataForContext(
    "mod",
    "event",
    browsingContext3
  );
  equal(sessionDataForContext3.length, 2, "Get 2 session data items");
  equal(
    sessionDataForContext3[0].value,
    "global",
    "Get a session data item for the global context descriptor"
  );
  equal(
    sessionDataForContext3[1].value,
    "userContext",
    "Get a session data item for the user context descriptor"
  );
});

add_task(async function test_generateSessionDataItemUpdate() {
  const sessionData = new SessionData(new RootMessageHandler("session-id-1"));

  const browsingContextDescriptor = {
    type: ContextDescriptorType.TopBrowsingContext,
    id: 2,
  };

  sessionData.applySessionData([
    createUpdate(SessionDataMethod.Add, browsingContextDescriptor, [
      "old value",
    ]),
  ]);

  const newValue = "new value";
  const sessionDataItemUpdates = sessionData.generateSessionDataItemUpdate(
    "mod",
    "event",
    browsingContextDescriptor,
    false,
    newValue
  );

  equal(sessionDataItemUpdates.length, 2, "Get 2 session data item updates");
  equal(
    sessionDataItemUpdates[0].method,
    SessionDataMethod.Remove,
    "First update is to remove the old item"
  );
  equal(
    sessionDataItemUpdates[1].method,
    SessionDataMethod.Add,
    "Second update is to add the new item"
  );
  equal(sessionDataItemUpdates[1].values[0], newValue, "The new value is set");

  const sessionDataItemUpdatesOnlyRemove =
    sessionData.generateSessionDataItemUpdate(
      "mod",
      "event",
      browsingContextDescriptor,
      true,
      newValue
    );

  equal(
    sessionDataItemUpdatesOnlyRemove.length,
    1,
    "Get 1 session data item update"
  );
  equal(
    sessionDataItemUpdatesOnlyRemove[0].method,
    SessionDataMethod.Remove,
    "Update is to remove the old item"
  );
});

function checkEvents(events, expectedEvents) {
  // Check the arrays have the same size.
  equal(events.length, expectedEvents.length);

  // Check all the expectedEvents can be found in the events array.
  for (const expected of expectedEvents) {
    ok(
      events.some(
        event =>
          expected.contextDescriptor.type === event.contextDescriptor.type &&
          expected.contextDescriptor.id === event.contextDescriptor.id &&
          expected.value == event.value
      )
    );
  }
}

function createUpdate(method, contextDescriptor, values) {
  return {
    method,
    moduleName: "mod",
    category: "event",
    contextDescriptor,
    values,
  };
}
