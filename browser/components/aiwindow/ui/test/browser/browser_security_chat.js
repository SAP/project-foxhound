/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * @type {import("../../../../../../toolkit/components/ml/tests/MLTestUtils.sys.mjs")}
 */
const { MLTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/MLTestUtils.sys.mjs"
);

/**
 * @type {import("../AIWindowTestUtils.sys.mjs")}
 */
const { MockEngineManager } = ChromeUtils.importESModule(
  "resource://testing-common/AIWindowTestUtils.sys.mjs"
);

/**
 * Coerce this into the proper type hint.
 *
 * @type {typeof import("../../modules/AIWindowUI.sys.mjs").AIWindowUI}
 */
const AIWindowUI = this.AIWindowUI;

/**
 * @import { ChatConversation } from "../../modules/ChatConversation.sys.mjs"
 */

/**
 * The basic setup function, which could be collected in head.js or duplicated in
 * tests as needed.
 */
async function setupSecurityTest() {
  // Install the mock before any Smart Window is opened.
  const mockEngineManager = new MockEngineManager();

  const { win, sidebarBrowser } = await openAIWindowWithSidebar();
  /** @type {MozBrowser} */
  const browser = win.gBrowser.selectedBrowser;

  return {
    win,
    browser,
    sidebarBrowser,
    mockEngineManager,
    serveHTMLInTab() {
      return MLTestUtils.serveHTMLInTab({ browser: win.gBrowser });
    },
    async cleanup() {
      mockEngineManager.cleanupMocks();
      await BrowserTestUtils.closeWindow(win);
    },
  };
}

/**
 * Do the most basic sidebar chat test using the mocked language model. This test should
 * serve as the base example for more complicated security tests. Ideally reference
 * this file (browser_security_chat.js) when creating a comment for future security tests.
 *
 * The important assertions on security tests are that they exercise the behavior
 * as end to end as possible, with a fully controlled language model mock. The security
 * properties can be checked for private data, and untrusted content.
 *
 * When a tool call is blocked, this can be demonstrated in an example test where
 * getting a language model to do it deterministically can be hard. Here, we fully
 * control the language model and can treat it as adversarial.
 */
add_task(async function test_security_chat() {
  const { win, sidebarBrowser, cleanup, serveHTMLInTab, mockEngineManager } =
    await setupSecurityTest();

  const { html } = serveHTMLInTab();

  const { url, cleanup: removeNewsArticle } = await html`
    <h1>News Article</h1>
    <p>This is a news article about technology.</p>
  `;
  info("Loaded " + url);

  await mockEngineManager.respondTo({
    purpose: "convo-starters-sidebar",
    response: "What is this article about?\nWhat technology is mentioned?",
  });

  // Capture the conversation before submit so the initial-state assertions
  // observe securityProperties before the chat handler's getRealTimeInfo
  // call (which sets privateData=true when tab info is attached) has a
  // chance to mutate them.
  /** @type {ChatConversation} */
  const conversation = AIWindow.getActiveConversation(win);
  Assert.ok(
    conversation,
    "Conversation should exist on the active AI window before submit."
  );
  Assert.equal(
    conversation.securityProperties.privateData,
    false,
    "No private data has been seen at the start of a conversation."
  );
  Assert.equal(
    conversation.securityProperties.untrustedInput,
    false,
    "No untrusted untrustedInput should be false at the start of a new conversation"
  );

  await typeInSmartbar(
    sidebarBrowser,
    "What is the title of this page? Don't look at the page content."
  );
  await submitSmartbar(sidebarBrowser);

  // There should just be the singular chat request left.
  mockEngineManager.logAllOutstandingRequests();

  const chatResponseText = "This page has no title.";
  await mockEngineManager.respondTo({
    purpose: "chat",
    response: chatResponseText,
  });

  await mockEngineManager.respondTo({
    purpose: "title-generation",
    response: "Summary request",
  });

  const aiChatBrowser = BrowserTestUtils.querySelectorDeep(
    sidebarBrowser.contentDocument,
    "#aichat-browser"
  );

  const text = await SpecialPowers.spawn(aiChatBrowser, [], async () => {
    const getAssistantText = () =>
      ContentTaskUtils.querySelectorDeep(content.document, ".message-assistant")
        ?.innerText;

    // Ensure the assistant text is present.
    await ContentTaskUtils.waitForMutationCondition(
      content.document,
      { childList: true, subtree: true },
      getAssistantText
    );

    return getAssistantText();
  });

  Assert.equal(
    text,
    chatResponseText,
    "The message assistant text is present."
  );

  Assert.equal(
    conversation.securityProperties.privateData,
    true,
    "The conversation gets marked as private as the tab info is added to it."
  );
  Assert.equal(
    conversation.securityProperties.untrustedInput,
    false,
    "Nothing untrusted is added to the conversation."
  );

  await removeNewsArticle();
  await cleanup();
});
