/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

export const titleGenerationPromptMetadata = {
  version: "v1.0",
};
export const titleGenerationPrompt = `Generate a concise chat title using only the current user message and the current context.

Rules:
- Fewer than 6 words; reflect the main topic/intent
- Do not end with punctuation
- Do not write questions
- No quotes, brackets, or emojis

Inputs:
The user is currently viewing this tab page: {current_tab}

Output: Only the title.`;
