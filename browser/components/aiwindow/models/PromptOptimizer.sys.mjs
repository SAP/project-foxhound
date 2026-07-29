/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * ===================================================================
 * ARCHITECTURE ROADMAP: The Compaction Waterfall
 * ===================================================================
 * This module prevents LLM context window collapse and reduces TTFT
 * (Time-To-First-Token) latency by deterministically compacting massive
 * background tool payloads before they are dispatched to the API.
 * * Planned Stages:
 * - Stage 1 (Active): ID-Based Upsert. Deduplicates repetitive get_page_content reads.
 * - Stage 2 (Planned): Proportional Bottom-Up Shave. Truncates old page content/Search payloads.
 * - Stage 3 (Planned): Copy-Paste Tax. Truncates massive old user queries.
 * - Stage 4 (Planned): LRU Eviction. Drops oldest conversation turns as a failsafe.
 * ===================================================================
 */

/**
 * Scans the conversation history, tracks the latest fetch for each URL, and
 * replaces older redundant page content with a lightweight placeholder.
 *
 * CRITICAL ASSUMPTION: This logic relies on an implicit contract with the
 * `get_page_content` tool. It assumes the tool returns a JSON-stringified array
 * of text contents that strictly matches the exact index order and length of
 * the requested `url_list` arguments.
 *
 * @param {Array<object>} messages - The cloned conversation history array.
 * @returns {Array<object>} The array with compacted get_page_content payloads.
 */
function deduplicatePageContent(messages) {
  const callIdToUrls = new Map();
  const urlToLatestCallId = new Map();

  // PASS 1: Build the relational map from the Assistant's requests
  for (const msg of messages) {
    if (msg.role === "assistant" && Array.isArray(msg.tool_calls)) {
      for (const toolCall of msg.tool_calls) {
        if (
          toolCall.type === "function" &&
          toolCall.function?.name === "get_page_content"
        ) {
          try {
            const args = JSON.parse(toolCall.function.arguments);

            if (Array.isArray(args.url_list)) {
              // Map the Call ID to the ordered array of URLs it requested
              callIdToUrls.set(toolCall.id, args.url_list);

              // Continually overwrite to guarantee we only store the LATEST ID for each URL
              for (const url of args.url_list) {
                urlToLatestCallId.set(url, toolCall.id);
              }
            }
          } catch (error) {
            console.warn(
              "SmartWindow: Failed to parse get_page_content arguments during compaction.",
              error
            );
          }
        }
      }
    }
  }

  // PASS 2: Execute the replacement on the Tool responses
  for (const msg of messages) {
    if (
      msg.role === "tool" &&
      msg.name === "get_page_content" &&
      msg.tool_call_id
    ) {
      const requestedUrls = callIdToUrls.get(msg.tool_call_id);

      if (requestedUrls) {
        try {
          // The get_page_content tool returns a JSON stringified array of text blocks
          const contentArray = JSON.parse(msg.content);

          if (Array.isArray(contentArray)) {
            const compactedContentArray = contentArray.map(
              (textContent, index) => {
                // Relies on the assumption that contentArray[index] maps perfectly to requestedUrls[index]
                const url = requestedUrls[index];

                // If we tracked this URL, and this tool_call_id is NOT the newest one, drop the heavy text
                if (url && urlToLatestCallId.get(url) !== msg.tool_call_id) {
                  return `[System Note: Content omitted for ${url}. A fresher read occurs later in context.]`;
                }

                return textContent;
              }
            );

            msg.content = JSON.stringify(compactedContentArray);
          }
        } catch (error) {
          console.warn(
            `SmartWindow: Failed to parse tool content for ID ${msg.tool_call_id}.`,
            error
          );
        }
      }
    }
  }

  return messages;
}

/**
 * MAIN ENTRY POINT
 * Orchestrates the prompt compaction waterfall.
 *
 * @param {Array<object>} rawMessages - The original conversation history.
 * @returns {Array<object>} The optimized array ready to be sent to the LLM API.
 */
export function compactMessages(rawMessages) {
  try {
    // Deep clone to guarantee we never mutate the frontend's active UI state
    let compactedMessages = structuredClone(rawMessages);

    // Stage 1: Deduplication (Always runs, zero semantic loss)
    compactedMessages = deduplicatePageContent(compactedMessages);

    // Future stages (Threshold checking, proportional shaving) will be injected here

    return compactedMessages;
  } catch (error) {
    console.error(
      "SmartWindow: Prompt compaction failed. Falling back to raw messages.",
      error
    );
    return rawMessages;
  }
}
