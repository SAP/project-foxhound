/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { UserRoleOpts, AssistantRoleOpts } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/ui/modules/ChatMessage.sys.mjs"
);
const { MESSAGE_ROLE } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/ui/modules/ChatEnums.sys.mjs"
);

// Regression test for Bug 2023557: clicking retry on an assistant response
// must re-send the original user prompt with its @mention context intact.
add_task(async function test_retry_preserves_context_mentions() {
  const sb = this.sinon.createSandbox();
  let win;

  try {
    const fetchWithHistoryStub = sb.stub(this.Chat, "fetchWithHistory");
    sb.stub(this.openAIEngine, "build").resolves({
      loadPrompt: () => Promise.resolve("Mock system prompt"),
    });
    const getRealTimeInfoStub = sb
      .stub(this.ChatConversation, "getRealTimeInfo")
      .resolves(null);

    win = await openAIWindow();
    const browser = win.gBrowser.selectedBrowser;

    const aiWindow = await TestUtils.waitForCondition(
      () => browser.contentDocument?.querySelector("ai-window"),
      "Wait for ai-window element"
    );

    const contextMentions = [
      {
        type: "tab",
        url: "https://example.com/mentioned",
        label: "Mentioned page",
      },
    ];

    const conversation = new this.ChatConversation({});
    conversation.addUserMessage(
      "Summarize this",
      null,
      new UserRoleOpts({ contextMentions })
    );
    conversation.addAssistantMessage(
      "text",
      "Initial response",
      new AssistantRoleOpts()
    );
    const assistantMessageId = conversation.messages.at(-1).id;

    aiWindow.openConversation(conversation);

    aiWindow.handleFooterAction({
      action: "retry",
      messageId: assistantMessageId,
    });

    await TestUtils.waitForCondition(
      () => fetchWithHistoryStub.calledOnce,
      "fetchWithHistory should be called once for the retry"
    );

    const retryConversation =
      fetchWithHistoryStub.firstCall.args[0].conversation;
    const userMessage = retryConversation.messages.findLast(
      m => m.role === MESSAGE_ROLE.USER
    );

    Assert.deepEqual(
      userMessage?.content?.contextMentions,
      contextMentions,
      "Retried user message preserves contextMentions"
    );

    Assert.ok(
      getRealTimeInfoStub.calledOnce,
      "getRealTimeInfo should be called once during retry"
    );
    Assert.deepEqual(
      getRealTimeInfoStub.firstCall.args[0]?.contextMentions,
      contextMentions,
      "getRealTimeInfo receives the original contextMentions on retry"
    );
  } finally {
    if (win) {
      await BrowserTestUtils.closeWindow(win);
    }
    sb.restore();
  }
});
