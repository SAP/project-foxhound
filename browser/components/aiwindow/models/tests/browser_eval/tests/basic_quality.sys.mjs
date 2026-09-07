/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

import { ChatConversation } from "moz-src:///browser/components/aiwindow/ui/modules/ChatConversation.sys.mjs";
import { AssistantRoleOpts } from "moz-src:///browser/components/aiwindow/ui/modules/ChatMessage.sys.mjs";
import {
  openAIEngine,
  MODEL_FEATURES,
} from "moz-src:///browser/components/aiwindow/models/Utils.sys.mjs";
import { loadCallContext } from "moz-src:///browser/components/aiwindow/models/PromptLoader.sys.mjs";

import {
  basicQualityEvalPrompt,
  basicQualityEvalResponseFormat,
  basicQualityEvalConfig,
} from "chrome://mochitests/content/browser/browser/components/aiwindow/models/tests/browser_eval/prompts/basic_quality.sys.mjs";

import { MLTestUtils } from "resource://testing-common/MLTestUtils.sys.mjs";

const TEST_CASES = [
  ["Hello there, how are you?", "about:newtab", "about:newtab"],
  [
    "Tell me about the weather today",
    "https://mylocalweather.com",
    "https://example.com/browser/browser/components/aiwindow/models/tests/browser_eval/pages/mylocalweather.html",
  ],
  [
    "Summarize the contents of the page I'm on.",
    "https://mylocalweather.com",
    "https://example.com/browser/browser/components/aiwindow/models/tests/browser_eval/pages/mylocalweather.html",
  ],
];

export async function runChatEvalForModel(
  model,
  { Assert, SpecialPowers, setupEvaluation, collectChatResponse, renderPrompt }
) {
  const token = Services.env.get("MOZ_FXA_BEARER_TOKEN");
  Assert.ok(
    token,
    "MOZ_FXA_BEARER_TOKEN must be set in the environment. Please run ./mach eval-tools login."
  );

  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.smartwindow.apiKey", token],
      ["sidebar.notification.badge.aichat", false],
      ["browser.smartwindow.model", model],
    ],
    clear: [
      "nimbus.migrations.after-remote-settings-update",
      "browser.ml.chat.onboarding.config",
      "browser.ml.chat.nimbus",
    ],
  });

  const origGetFxAccountToken = openAIEngine.getFxAccountToken;
  openAIEngine.getFxAccountToken = async () => token;
  const callContext = await loadCallContext(MODEL_FEATURES.CHAT);
  const engineInstance = await openAIEngine.build({
    model: callContext.model,
    serviceType: callContext.serviceType,
    purpose: callContext.purpose,
    flowId: null,
    feature: MODEL_FEATURES.CHAT,
  });
  for (const [userQuery, currentUrl, page] of TEST_CASES) {
    const { cleanup } = await setupEvaluation({
      url: page,
      waitForLoad: page !== "about:newtab",
    });

    const conversation = new ChatConversation({
      title: "eval chat",
      description: "",
      pageUrl: new URL(currentUrl),
      pageMeta: {},
    });
    await conversation.generatePrompt(
      userQuery,
      new URL(currentUrl),
      engineInstance
    );

    conversation.addAssistantMessage("text", "", new AssistantRoleOpts());
    const { responseText, toolCalls } = await collectChatResponse(
      conversation,
      engineInstance
    );

    Assert.ok(
      !!responseText.length || !!toolCalls.length,
      `Got a response from ${model}`
    );

    const messages = renderPrompt(basicQualityEvalPrompt, {
      model_response: responseText,
      model_tool_calls: JSON.stringify(toolCalls, null, 2),
      conversation_history: JSON.stringify(
        conversation.getMessagesInOpenAiFormat(),
        null,
        2
      ),
      query: userQuery,
      current_url: currentUrl,
    });

    MLTestUtils.reportEvalData({
      messages,
      response_format: basicQualityEvalResponseFormat,
      eval_config: basicQualityEvalConfig,
    });

    await cleanup();
  }

  openAIEngine.getFxAccountToken = origGetFxAccountToken;
  await SpecialPowers.popPrefEnv();
}
