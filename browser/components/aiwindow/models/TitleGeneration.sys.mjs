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
 * Generate a chat title based on the user's message and current tab information.
 *
 * @param {string} message - The user's message
 * @param {object} current_tab - Object containing current tab information
 * @returns {Promise<string>} The generated chat title
 */
export async function generateChatTitle(message, current_tab) {
  try {
    // Build the OpenAI engine
    const engine = await openAIEngine.build(
      MODEL_FEATURES.TITLE_GENERATION,
      `${MODEL_FEATURES.TITLE_GENERATION}-engine`
    );

    const tabInfo = current_tab || { url: "", title: "", description: "" };

    // Load and render the prompt with actual values
    const rawPrompt = await engine.loadPrompt(MODEL_FEATURES.TITLE_GENERATION);
    const systemPrompt = renderPrompt(rawPrompt, {
      current_tab: JSON.stringify(tabInfo),
    });

    // Prepare messages for the LLM
    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: message },
    ];

    // Get config for inference parameters if exists
    const config = engine.getConfig(engine.feature);
    const inferenceParams = config?.parameters || {};

    const response = await engine.run({
      args: messages,
      fxAccountToken: await openAIEngine.getFxAccountToken(),
      ...inferenceParams,
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
