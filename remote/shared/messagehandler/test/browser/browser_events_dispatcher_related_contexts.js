/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

describe("Events with related contexts", function () {
  let root;

  afterEach(() => {
    if (root) {
      root.destroy();
      root = null;
    }
    gBrowser.removeAllTabsBut(gBrowser.tabs[0]);
  });

  it("Receives event when one related context matches descriptor", async function () {
    const tab1 = await addTab(
      "https://example.com/document-builder.sjs?html=1"
    );
    const browsingContext1 = tab1.linkedBrowser.browsingContext;

    const tab2 = await addTab(
      "https://example.com/document-builder.sjs?html=2"
    );
    const browsingContext2 = tab2.linkedBrowser.browsingContext;

    const contextDescriptor1 = {
      type: ContextDescriptorType.TopBrowsingContext,
      id: browsingContext1.browserId,
    };

    root = createRootMessageHandler("session-id-event");

    info("Subscribe to events for the first browsing context");
    const events = [];
    const onEvent = (event, data) => events.push(data.text);
    await root.eventsDispatcher.on(
      "eventemitterrelatedcontexts.testEvent",
      contextDescriptor1,
      onEvent
    );

    info(
      "Emit an event with relatedContexts containing both browsing contexts"
    );
    await emitTestEventWithRelatedContexts(root, browsingContext1, [
      browsingContext1.id,
      browsingContext2.id,
    ]);
    is(
      events.length,
      1,
      "Event should be received when one related context matches"
    );

    await root.eventsDispatcher.off(
      "eventemitterrelatedcontexts.testEvent",
      contextDescriptor1,
      onEvent
    );
  });

  it("Does not receive event when no related context matches", async function () {
    const tab1 = await addTab(
      "https://example.com/document-builder.sjs?html=1"
    );
    const browsingContext1 = tab1.linkedBrowser.browsingContext;

    const tab2 = await addTab(
      "https://example.com/document-builder.sjs?html=2"
    );
    const browsingContext2 = tab2.linkedBrowser.browsingContext;

    const tab3 = await addTab(
      "https://example.com/document-builder.sjs?html=3"
    );
    const browsingContext3 = tab3.linkedBrowser.browsingContext;

    const contextDescriptor1 = {
      type: ContextDescriptorType.TopBrowsingContext,
      id: browsingContext1.browserId,
    };

    root = createRootMessageHandler("session-id-event");

    info("Subscribe to events for the first browsing context");
    const events = [];
    const onEvent = (event, data) => events.push(data.text);
    await root.eventsDispatcher.on(
      "eventemitterrelatedcontexts.testEvent",
      contextDescriptor1,
      onEvent
    );

    info(
      "Emit an event with relatedContexts containing only second and third contexts"
    );
    await emitTestEventWithRelatedContexts(root, browsingContext1, [
      browsingContext2.id,
      browsingContext3.id,
    ]);

    is(
      events.length,
      0,
      "Event should not be received when no related context matches"
    );

    await root.eventsDispatcher.off(
      "eventemitterrelatedcontexts.testEvent",
      contextDescriptor1,
      onEvent
    );
  });

  it("Receives event with All descriptor", async function () {
    const tab1 = await addTab(
      "https://example.com/document-builder.sjs?html=1"
    );
    const browsingContext1 = tab1.linkedBrowser.browsingContext;

    const tab2 = await addTab(
      "https://example.com/document-builder.sjs?html=2"
    );
    const browsingContext2 = tab2.linkedBrowser.browsingContext;

    const contextDescriptorAll = {
      type: ContextDescriptorType.All,
    };

    root = createRootMessageHandler("session-id-event");

    info("Subscribe to events with All descriptor");
    const events = [];
    const onEvent = (event, data) => events.push(data.text);
    await root.eventsDispatcher.on(
      "eventemitterrelatedcontexts.testEvent",
      contextDescriptorAll,
      onEvent
    );

    info(
      "Emit an event with relatedContexts containing both browsing contexts"
    );
    await emitTestEventWithRelatedContexts(root, browsingContext1, [
      browsingContext1.id,
      browsingContext2.id,
    ]);
    is(events.length, 1, "Event should be received with All descriptor");

    await root.eventsDispatcher.off(
      "eventemitterrelatedcontexts.testEvent",
      contextDescriptorAll,
      onEvent
    );
  });

  it("Receives event with All descriptor and empty related contexts", async function () {
    const tab1 = await addTab(
      "https://example.com/document-builder.sjs?html=1"
    );
    const browsingContext1 = tab1.linkedBrowser.browsingContext;

    const contextDescriptorAll = {
      type: ContextDescriptorType.All,
    };

    root = createRootMessageHandler("session-id-event");

    info("Subscribe to events with All descriptor");
    const events = [];
    const onEvent = (event, data) => events.push(data.text);
    await root.eventsDispatcher.on(
      "eventemitterrelatedcontexts.testEvent",
      contextDescriptorAll,
      onEvent
    );

    info("Emit an event with an empty relatedContexts array");
    await emitTestEventWithRelatedContexts(root, browsingContext1, []);
    is(events.length, 1, "Event should be received with All descriptor");

    await root.eventsDispatcher.off(
      "eventemitterrelatedcontexts.testEvent",
      contextDescriptorAll,
      onEvent
    );
  });

  it("Receives event when related contexts match user context", async function () {
    const userContextId = 1;
    const tab1 = BrowserTestUtils.addTab(gBrowser, "https://example.com/", {
      userContextId,
    });
    await BrowserTestUtils.browserLoaded(tab1.linkedBrowser);
    const browsingContext1 = tab1.linkedBrowser.browsingContext;

    const tab2 = BrowserTestUtils.addTab(gBrowser, "https://example.com/", {
      userContextId,
    });
    await BrowserTestUtils.browserLoaded(tab2.linkedBrowser);
    const browsingContext2 = tab2.linkedBrowser.browsingContext;

    const contextDescriptor = {
      type: ContextDescriptorType.UserContext,
      id: userContextId,
    };

    root = createRootMessageHandler("session-id-event");

    info("Subscribe to events for the user context");
    const events = [];
    const onEvent = (event, data) => events.push(data.text);
    await root.eventsDispatcher.on(
      "eventemitterrelatedcontexts.testEvent",
      contextDescriptor,
      onEvent
    );

    info(
      "Emit an event with relatedContexts containing both contexts from the same user context"
    );
    await emitTestEventWithRelatedContexts(root, browsingContext1, [
      browsingContext1.id,
      browsingContext2.id,
    ]);
    is(
      events.length,
      1,
      "Event should be received when related contexts match user context"
    );

    await root.eventsDispatcher.off(
      "eventemitterrelatedcontexts.testEvent",
      contextDescriptor,
      onEvent
    );
  });

  it("No duplicate events when multiple subscriptions match", async function () {
    const tab1 = await addTab(
      "https://example.com/document-builder.sjs?html=1"
    );
    const browsingContext1 = tab1.linkedBrowser.browsingContext;

    const tab2 = await addTab(
      "https://example.com/document-builder.sjs?html=2"
    );
    const browsingContext2 = tab2.linkedBrowser.browsingContext;

    const contextDescriptor1 = {
      type: ContextDescriptorType.TopBrowsingContext,
      id: browsingContext1.browserId,
    };

    const contextDescriptor2 = {
      type: ContextDescriptorType.TopBrowsingContext,
      id: browsingContext2.browserId,
    };

    root = createRootMessageHandler("session-id-event");

    info("Subscribe to events for both browsing contexts");
    const events1 = [];
    const onEvent1 = (event, data) => events1.push(data.text);
    await root.eventsDispatcher.on(
      "eventemitterrelatedcontexts.testEvent",
      contextDescriptor1,
      onEvent1
    );

    const events2 = [];
    const onEvent2 = (event, data) => events2.push(data.text);
    await root.eventsDispatcher.on(
      "eventemitterrelatedcontexts.testEvent",
      contextDescriptor2,
      onEvent2
    );

    info(
      "Emit an event with relatedContexts containing both browsing contexts"
    );
    await emitTestEventWithRelatedContexts(root, browsingContext1, [
      browsingContext1.id,
      browsingContext2.id,
    ]);

    is(
      events1.length,
      1,
      "First subscription should receive exactly one event"
    );
    is(
      events2.length,
      1,
      "Second subscription should receive exactly one event"
    );

    await root.eventsDispatcher.off(
      "eventemitterrelatedcontexts.testEvent",
      contextDescriptor1,
      onEvent1
    );
    await root.eventsDispatcher.off(
      "eventemitterrelatedcontexts.testEvent",
      contextDescriptor2,
      onEvent2
    );
  });

  it("hasListener works correctly with multiple related contexts", async function () {
    const tab1 = await addTab(
      "https://example.com/document-builder.sjs?html=1"
    );
    const browsingContext1 = tab1.linkedBrowser.browsingContext;

    const tab2 = await addTab(
      "https://example.com/document-builder.sjs?html=2"
    );
    const browsingContext2 = tab2.linkedBrowser.browsingContext;

    const contextDescriptor1 = {
      type: ContextDescriptorType.TopBrowsingContext,
      id: browsingContext1.browserId,
    };

    root = createRootMessageHandler("session-id-event");

    function hasListener(contextId) {
      return root.eventsDispatcher.hasListener(
        "eventemitterrelatedcontexts.testEvent",
        {
          contextId,
        }
      );
    }

    const onEvent = () => {};

    ok(
      !hasListener(browsingContext1.id),
      "No listener initially for browsingContext1"
    );
    ok(
      !hasListener(browsingContext2.id),
      "No listener initially for browsingContext2"
    );

    await root.eventsDispatcher.on(
      "eventemitterrelatedcontexts.testEvent",
      contextDescriptor1,
      onEvent
    );

    ok(hasListener(browsingContext1.id), "Has a listener for browsingContext1");
    ok(
      !hasListener(browsingContext2.id),
      "No listener for browsingContext2 when only subscribed to context1"
    );

    await root.eventsDispatcher.off(
      "eventemitterrelatedcontexts.testEvent",
      contextDescriptor1,
      onEvent
    );

    ok(
      !hasListener(browsingContext1.id),
      "No listener for browsingContext1 after unsubscribe"
    );
    ok(
      !hasListener(browsingContext2.id),
      "No listener for browsingContext2 after unsubscribe"
    );
  });
});

async function emitTestEventWithRelatedContexts(
  root,
  browsingContext,
  relatedBrowsingContextIds
) {
  info("Call eventemitterrelatedcontexts.emitTestEventWithRelatedContexts");
  await root.handleCommand({
    moduleName: "eventemitterrelatedcontexts",
    commandName: "emitTestEventWithRelatedContexts",
    params: {
      relatedBrowsingContextIds,
    },
    destination: {
      type: WindowGlobalMessageHandler.type,
      id: browsingContext.id,
    },
  });
}
