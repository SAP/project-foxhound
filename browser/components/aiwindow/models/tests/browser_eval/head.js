/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

async function setupEvaluation({ url, waitForLoad = true }) {
  await SpecialPowers.pushPrefEnv({
    set: [["services.settings.server", "data:,#remote-settings-dummy/v1"]],
  });

  const { RemoteSettingsClient } = ChromeUtils.importESModule(
    "resource://services-settings/RemoteSettingsClient.sys.mjs"
  );
  const originalValidateCollectionSignature =
    RemoteSettingsClient.prototype.validateCollectionSignature;
  RemoteSettingsClient.prototype.validateCollectionSignature = async () => {};

  const tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    url,
    waitForLoad
  );

  return {
    tab,

    async cleanup() {
      info("Cleaning up");
      RemoteSettingsClient.prototype.validateCollectionSignature =
        originalValidateCollectionSignature;
      await BrowserTestUtils.removeTab(tab);
      await SpecialPowers.popPrefEnv();
    },
  };
}

/**
 * Collect the full text response and tool calls from Chat.fetchWithHistory.
 *
 * @param {ChatConversation} conversation
 * @param {object} engineInstance
 * @returns {Promise<{ responseText: string, toolCalls: Array<{id: string, type: string, function: {name: string, arguments: string}}> }>}
 */
async function collectChatResponse(conversation, engineInstance) {
  const { Chat } = ChromeUtils.importESModule(
    "moz-src:///browser/components/aiwindow/models/Chat.sys.mjs"
  );
  await Chat.fetchWithHistory({ conversation, engineInstance });
  const messages = conversation.getMessagesInOpenAiFormat();
  const lastAssistant = messages.findLast(msg => msg.role === "assistant");
  const responseText = lastAssistant?.content ?? "";
  const toolCalls = messages
    .filter(msg => msg.tool_calls)
    .flatMap(msg => msg.tool_calls);
  return { responseText, toolCalls };
}

/**
 * Report eval data out to stdout, which will be picked up by the test harness for
 * analysis.
 *
 * @param {any} data - JSON serializable data.
 */
function reportEvalResult(data) {
  info("evalDataPayload | " + JSON.stringify(data));

  dump("-------------------------------------\n");
  dump("Eval result:\n");
  dump(JSON.stringify(data, null, 2));
  dump("\n");
}

/**
 * Renders a prompt from a string into a messages array, splitting on !role:[role]
 * markers and replacing {placeholder} tokens with provided values.
 *
 * @param {string} rawPromptContent              The raw prompt as a string
 * @param {object} stringsToReplace              A map of placeholder strings to their replacements
 * @returns {Array<{role: string, content: string}>}
 */
function renderPrompt(rawPromptContent, stringsToReplace = {}) {
  const roleRegex = /!role:\[(\w+)\]/g;
  const messages = [];
  let lastIndex = 0;
  let lastRole = null;
  let match;

  while ((match = roleRegex.exec(rawPromptContent)) !== null) {
    if (lastRole !== null) {
      messages.push({
        role: lastRole,
        content: rawPromptContent.slice(lastIndex, match.index).trim(),
      });
    }
    lastRole = match[1];
    lastIndex = match.index + match[0].length;
  }

  if (lastRole !== null) {
    messages.push({
      role: lastRole,
      content: rawPromptContent.slice(lastIndex).trim(),
    });
  }

  for (const message of messages) {
    for (const [orig, repl] of Object.entries(stringsToReplace)) {
      message.content = message.content.replace(
        new RegExp(`\\{${orig}\\}`, "g"),
        () => repl
      );
    }
  }

  return messages;
}
