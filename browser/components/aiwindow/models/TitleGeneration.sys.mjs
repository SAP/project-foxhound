/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import {
  openAIEngine,
  renderPrompt,
  MODEL_FEATURES,
} from "moz-src:///browser/components/aiwindow/models/Utils.sys.mjs";
import { sanitizeUntrustedContent } from "moz-src:///browser/components/aiwindow/models/ChatUtils.sys.mjs";

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  loadCallContext:
    "moz-src:///browser/components/aiwindow/models/PromptLoader.sys.mjs",
  loadPrompt:
    "moz-src:///browser/components/aiwindow/models/PromptLoader.sys.mjs",
});

/**
 * Generate a default title from the first four words of a message.
 *
 * @param {string} message - The user's message
 * @returns {string} The default title
 */
function generateDefaultTitle(message) {
  if (!message || typeof message !== "string") {
    return "New Chat";
  }

  const words = message
    .trim()
    .split(/\s+/)
    .filter(word => !!word.length);

  if (words.length === 0) {
    return "New Chat";
  }

  const titleWords = words.slice(0, 4);
  return titleWords.join(" ") + "...";
}

/**
 * Generate a chat title based on the user's message, current tab information,
 * and optionally the first assistant response.
 *
 * @param {string} message - The user's message
 * @param {object} current_tab - Object containing current tab information
 * @param {string} [assistantResponse] - The first assistant response
 * @param {string | null} [flowId] - Flow ID for correlating with firefox_ai_runtime telemetry
 * @returns {Promise<string>} The generated chat title
 */
export async function generateChatTitle(
  message,
  current_tab,
  assistantResponse,
  flowId = null
) {
  try {
    // Build the OpenAI engine
    const [callContext, { prompt: rawPrompt }] = await Promise.all([
      lazy.loadCallContext(MODEL_FEATURES.TITLE_GENERATION),
      lazy.loadPrompt(MODEL_FEATURES.TITLE_GENERATION),
    ]);
    const engine = await openAIEngine.build({
      model: callContext.model,
      serviceType: callContext.serviceType,
      purpose: callContext.purpose,
      flowId,
      feature: MODEL_FEATURES.TITLE_GENERATION,
    });

    const tabInfo = current_tab || { url: "", title: "", description: "" };
    tabInfo.title = sanitizeUntrustedContent(tabInfo.title);

    const systemPrompt = renderPrompt(rawPrompt, {
      current_tab: JSON.stringify(tabInfo),
    });

    // Prepare messages for the LLM
    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: message },
    ];

    if (assistantResponse) {
      messages.push({ role: "assistant", content: assistantResponse });
    }

    const response = await engine.run({
      args: messages,
      fxAccountToken: await openAIEngine.getFxAccountToken(),
      ...callContext.parameters,
    });

    // Extract the generated title from the response
    const title =
      response?.finalOutput?.trim() || generateDefaultTitle(message);

    return title;
  } catch (error) {
    console.error("Failed to generate chat title:", error);
    return generateDefaultTitle(message);
  }
}
