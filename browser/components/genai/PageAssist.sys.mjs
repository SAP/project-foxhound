/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Page Assistant
 */
export const PageAssist = {
  /**
   * Fetch AI Response
   *
   * @param {string} userPrompt
   * @param {{
   *   url: string,
   *   title: string,
   *   content: string,
   *   textContent: string,
   *   excerpt: string,
   *   isReaderable: boolean
   * }} pageData
   * @returns {Promise<string|null>}
   */
  async fetchAiResponse(userPrompt, pageData) {
    if (!pageData) {
      return null;
    }

    // TODO: Call AI API here with prompt and page context
    const mockAiResponse = `
      This is a placeholder response from the AI model
      ** User Prompt: ${userPrompt}
      ** Page URL: ${pageData.url}
      ** Page Title: ${pageData.title}
    `;

    return mockAiResponse;
  },
};
