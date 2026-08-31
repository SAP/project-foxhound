/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

do_get_profile();

const { ChatConversation, MESSAGE_ROLE } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/ui/modules/ChatStore.sys.mjs"
);
const { SYSTEM_PROMPT_TYPE } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/ui/modules/ChatEnums.sys.mjs"
);
const { _setLoadPromptForTesting } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/ui/modules/ChatConversation.sys.mjs"
);

add_task(async function test_ChatConversation_updateSystemPromptForModel() {
  _setLoadPromptForTesting(async () => "Updated system prompt");
  registerCleanupFunction(() => _setLoadPromptForTesting(null));

  const conversation = new ChatConversation({});
  conversation.addSystemMessage(
    SYSTEM_PROMPT_TYPE.TEXT,
    "Initial system prompt"
  );

  await conversation.updateSystemPromptForModel("1");

  const systemMessage = conversation.messages.find(
    message =>
      message.role === MESSAGE_ROLE.SYSTEM &&
      message.content.type === SYSTEM_PROMPT_TYPE.TEXT
  );
  Assert.equal(
    systemMessage.content.body,
    "Updated system prompt",
    "System prompt should be updated to new prompt"
  );
});

add_task(
  async function test_ChatConversation_updateSystemPromptForModel_preserves_messages() {
    _setLoadPromptForTesting(async () => "Updated system prompt");

    const conversation = new ChatConversation({});
    const mockMessages = [
      { role: MESSAGE_ROLE.USER, body: "Hello" },
      { role: MESSAGE_ROLE.ASSISTANT, body: "Hello back" },
      { role: MESSAGE_ROLE.USER, body: "How are you?" },
    ];

    conversation.addSystemMessage(
      SYSTEM_PROMPT_TYPE.TEXT,
      "Original system prompt"
    );
    conversation.addUserMessage(mockMessages[0].body, null);
    conversation.addAssistantMessage("text", mockMessages[1].body);
    conversation.addUserMessage(mockMessages[2].body, null);

    await conversation.updateSystemPromptForModel("1");

    const nonSystemMessages = conversation.messages.filter(
      message => message.role !== MESSAGE_ROLE.SYSTEM
    );

    Assert.deepEqual(
      nonSystemMessages.map(message => ({
        role: message.role,
        body: message.content.body,
      })),
      mockMessages,
      "Non-system messages should be preserved"
    );
  }
);
