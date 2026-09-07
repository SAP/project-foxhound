/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

// Important! Changing or removing this value requires a security review.
//
// Limit the page titles to 100 characters to relax the use of the untrusted content flag
// from page metadata. This number was specifically chosen as it fit 95% of all page titles
// in the places database for a single places database used as an example.
const MAX_METADATA_LENGTH = 100;

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  MemoriesManager:
    "moz-src:///browser/components/aiwindow/models/memories/MemoriesManager.sys.mjs",
  renderPrompt: "moz-src:///browser/components/aiwindow/models/Utils.sys.mjs",
  MODEL_FEATURES: "moz-src:///browser/components/aiwindow/models/Utils.sys.mjs",
  loadPrompt:
    "moz-src:///browser/components/aiwindow/models/PromptLoader.sys.mjs",
});

ChromeUtils.defineLazyGetter(lazy, "md", () => {
  const { MarkdownIt } = ChromeUtils.importESModule(
    "chrome://browser/content/multilineeditor/prosemirror.bundle.mjs"
  );
  return new MarkdownIt({ html: false, linkify: true });
});

let _savedLoadPromptDescriptor = null;
export function _setLoadPromptForTesting(fn) {
  if (fn !== null) {
    _savedLoadPromptDescriptor = Object.getOwnPropertyDescriptor(
      lazy,
      "loadPrompt"
    );
    lazy.loadPrompt = fn;
  } else if (_savedLoadPromptDescriptor) {
    // eslint-disable-next-line mozilla/valid-lazy
    Object.defineProperty(lazy, "loadPrompt", _savedLoadPromptDescriptor);
    _savedLoadPromptDescriptor = null;
  }
}

/**
 * Truncates and spotlights untrusted metadata text to guard against prompt injection by adding an
 *  (Untrusted webpage data) tag.
 *
 * Important! Changing this function requires a security review.
 *
 * Metadata such as page titles and page descriptions are untrusted content from the web and
 * could contain prompt injections to try and change the behavior of language model
 * conversations. Typically untrusted content gets flagged in a conversation, and
 * subsequent tool calls can be restricted if they have access to private information as
 * well.
 *
 * By truncating the length of this text, we limit (but do not remove) the ability for these
 * pieces of text to be used as prompt injections. In this case we have chosen to relax
 * the security flags to NOT mark these as untrusted when the text is truncated.
 * This is useful since page titles are used very frequently in chat conversations.
 *
 * In addition, spotlighting this text helps the model to identify webpage data is untrusted.
 * We note that the spotlighting tokens added are are only a part of the delimiting. Prompts
 * have also been updated to include instructions about how to treat untrusted data.
 *
 * @param {string} text
 * @param {boolean} truncateOnly
 * @returns {string}
 */
export function sanitizeUntrustedContent(text, truncateOnly = false) {
  if (!text) {
    return "";
  }

  let fixedText = text;
  // truncating text with ...
  if (text.length > MAX_METADATA_LENGTH) {
    fixedText = fixedText.slice(0, MAX_METADATA_LENGTH) + "\u2026";
  }
  if (truncateOnly) {
    return fixedText;
  }

  // light smoothing (escape "'s, collapse whitespace)
  fixedText = fixedText
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\s+/g, " ");

  // adding spotlighting tokens
  return `"${fixedText}" (Untrusted webpage data)`;
}

/**
 * Get the current local time in ISO format with timezone offset.
 *
 * @returns {string}
 */
export function getLocalIsoTime() {
  try {
    const date = new Date();
    const pad = n => String(n).padStart(2, "0");
    return (
      `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
      `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    );
  } catch {
    return null;
  }
}

/**
 * Get current tab metadata: url, title, description if available.
 *
 * @param {Array<ContextWebsite>} contextMentions
 *
 * @returns {Promise<{url: string, title: string, description: string}>}
 */
export async function getCurrentTabMetadata(contextMentions = []) {
  const currentTab = contextMentions.find(
    contextWebsite => contextWebsite.type === "currentTab"
  );

  if (!currentTab) {
    return { url: "", title: "", description: "" };
  }

  let description = "";

  const url = currentTab.url || "";
  const title = sanitizeUntrustedContent(currentTab.label || "");

  /**
   * TODO: BUG 2015574
   * Need to extract page description in PageExtractor
   */

  return { url, title, description };
}

/**
 * Construct real time information injection message, to be inserted before
 * the memories injection message and the user message in the conversation
 * messages list.
 *
 * @param {Array<ContextWebsite>} contextMentions
 *
 * @returns {Promise<{url, title, description, locale, timezone, isoTimestamp, todayDate, hasTabInfo}>}
 */
export async function constructRealTimeInfoInjectionMessage(
  contextMentions = []
) {
  const { url, title, description } =
    await getCurrentTabMetadata(contextMentions);
  const isoTimestamp = getLocalIsoTime();
  const datePart = isoTimestamp?.split("T")[0] ?? "";
  const locale = Services.locale.appLocaleAsBCP47;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const hasTabInfo = Boolean(url || title || description) && !isNewPageUrl(url);

  return {
    url,
    title,
    description,
    locale,
    timezone,
    isoTimestamp: isoTimestamp || "Unavailable",
    todayDate: datePart || "Unavailable",
    hasTabInfo,
  };
}

/**
 * Constructs the relevant memories context message to be inejcted before the user message.
 *
 * @param {string} message                                                          User message to find relevant memories for
 * @returns {Promise<null|{role: string, tool_call_id: string, content: string}>}   Relevant memories context message or null if no relevant memories
 */
export async function constructRelevantMemoriesContextMessage(message) {
  const relevantMemories =
    await lazy.MemoriesManager.getRelevantMemories(message);

  // If there are relevant memories, render and return the context message
  if (relevantMemories.length) {
    const relevantMemoriesList =
      "- " +
      relevantMemories
        .map(memory => {
          return `${memory.id} - ${memory.memory_summary}`;
        })
        .join("\n- ");
    const { prompt: relevantMemoriesContextPrompt } = await lazy.loadPrompt(
      lazy.MODEL_FEATURES.MEMORIES_RELEVANT_CONTEXT
    );
    const content = lazy.renderPrompt(relevantMemoriesContextPrompt, {
      relevantMemoriesList,
    });

    return {
      role: "system",
      content,
    };
  }
  // If there aren't any relevant memories, return null
  return null;
}

/**
 * Response parsing funtions to detect special tagged information like memories and search terms.
 * Also return the cleaned content after removing all the taggings.
 *
 * @param {string} content
 * @returns {Promise<object>}
 */
export async function parseContentWithTokens(content) {
  const searchRegex = /§search:\s*([^§]+)§/gi;
  const memoriesRegex = /§existing_memory:\s*([^§]+)§/gi;

  const searchTokens = detectTokens(content, searchRegex, "query");
  const memoriesTokens = detectTokens(content, memoriesRegex, "memories");
  // Sort all tokens in reverse index order for easier removal
  const allTokens = [...searchTokens, ...memoriesTokens].sort(
    (a, b) => b.startIndex - a.startIndex
  );

  if (allTokens.length === 0) {
    return {
      cleanContent: content,
      searchQueries: [],
      usedMemories: [],
    };
  }

  // Clean content by removing tagged information
  let cleanContent = content;
  const searchQueries = [];
  const usedMemories = [];

  for (const token of allTokens) {
    if (token.query) {
      searchQueries.unshift(token.query);
    } else if (token.memories) {
      usedMemories.unshift(token.memories);
      // TODO: do we need customEvent to dispatch used memories as we iterate?
    }
    cleanContent =
      cleanContent.slice(0, token.startIndex) +
      cleanContent.slice(token.endIndex);
  }

  return {
    cleanContent: cleanContent.trim(),
    searchQueries,
    usedMemories,
  };
}

/**
 * Given the content and the regex pattern to search, find all occurrence of matches.
 *
 * @param {string} content
 * @param {RegExp} regexPattern
 * @param {string} key
 * @returns {Array<object>}
 */
export function detectTokens(content, regexPattern, key) {
  const matches = [];
  let match;
  while ((match = regexPattern.exec(content)) !== null) {
    matches.push({
      fullMatch: match[0],
      [key]: match[1].trim(),
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }
  return matches;
}

/**
 * To filter specific URL chrome://browser/content/aiwindow/aiWindow.html
 *
 * @param {string} url - URL to check
 * @returns {boolean} True if url = chrome://browser/content/aiwindow/aiWindow.html
 */
export function isNewPageUrl(url) {
  return url === "chrome://browser/content/aiwindow/aiWindow.html";
}

/**
 * Expands URL tokens (e.g. §url_token: GITHUB_COM_1§) in text using the provided
 * mapping. Any token not found in the mapping is left unchanged.
 *
 * @param {string} text
 * @param {Map<string, string>} tokenToUrl
 * @returns {string}
 */
export function expandUrlTokens(text, tokenToUrl) {
  return text.replace(/§url_token:\s*([A-Z0-9_]+_\d+)§/g, (match, token) => {
    return tokenToUrl.get(token) ?? match;
  });
}

/**
 * Strips URL tokens that remain after expansion.
 * Any remaining tokens at this point were hallucinated by the model.
 *
 * @param {string} text
 * @returns {string}
 */
export function stripUnresolvedUrlTokens(text) {
  return text.replace(/§url_token:\s*[A-Z0-9_]+_\d+§/g, "");
}

/**
 * Expands URL tokens in tool call parameters in-place.
 * Handles both string values and arrays of strings.
 *
 * @param {{ name: string, arguments: unknown }} toolParams
 * @param {Map<string, string>} tokenToUrl
 */
export function expandUrlTokensInToolParams(toolParams, tokenToUrl) {
  if (!tokenToUrl.size) {
    return;
  }
  for (const [key, value] of Object.entries(toolParams)) {
    if (typeof value === "string") {
      toolParams[key] = expandUrlTokens(value, tokenToUrl);
    } else if (Array.isArray(value)) {
      toolParams[key] = value.map(item =>
        typeof item === "string" ? expandUrlTokens(item, tokenToUrl) : item
      );
    }
  }
}

/**
 * Recursively extracts URLs from message content and adds them to the conversation's
 * map of tokens to URLs.
 *
 * For text content, uses markdown-it's linkify feature.
 * For structured data (objects and arrays), recursively searches all values.
 *
 * @param {string|object|Array} content - Content to extract URLs from
 * @param {ChatConversation} conversation - The conversation to add URLs to
 * @param {string} role - Message role (e.g., "tool", "user", "assistant")
 */
function constructUrlTokensFromMessageContent(content, conversation, role) {
  if (!content) {
    return;
  }

  if (role === "tool") {
    try {
      const json = JSON.parse(content);
      constructUrlTokensFromMessageContent(json, conversation, null);
      return;
    } catch {}
  }

  if (typeof content === "string") {
    const urls = new Set();
    for (const tok of lazy.md.parse(content, {})) {
      for (const child of tok.children ?? []) {
        if (child.type === "link_open") {
          const href = child.attrGet("href");
          if (href && URL.parse(href)) {
            urls.add(href);
          }
        }
      }
    }
    for (const url of urls) {
      conversation.convertUrlToToken(url);
    }
  } else if (Array.isArray(content)) {
    for (const item of content) {
      constructUrlTokensFromMessageContent(item, conversation, null);
    }
  } else if (typeof content === "object") {
    for (const value of Object.values(content)) {
      constructUrlTokensFromMessageContent(value, conversation, null);
    }
  }
}

/**
 * Replace the URLs in the conversation with their URL tokens. This is done in-place
 * on the messages. These shortened tokens help guard against URLs being hallucinated.
 * This is only done on messages that are "in flight" to the language model. When the
 * responses come back the resulting URL tokens are transformed back into full URLs
 * for rendering and general tool calling.
 *
 * @param {ChatConversation} conversation
 * @param {object[]} messages
 */
export function replaceUrlsWithTokens(conversation, messages) {
  // Construct all of the URL tokens from the message content.
  for (const msg of messages) {
    if (msg.role != "system" && typeof msg.content === "string") {
      constructUrlTokensFromMessageContent(msg.content, conversation, msg.role);
    }
  }

  // Replace full URLs with their short tokens in user and tool messages.
  if (conversation.tokenToUrl.size) {
    // Sorting the entries ensures that http://example.com/v1 gets replaced before
    // http://example.com
    const sortedEntries = [...conversation.tokenToUrl.entries()].sort(
      ([, a], [, b]) => b.length - a.length
    );

    for (const msg of messages) {
      if (msg.role != "system" && typeof msg.content === "string") {
        for (const [token, url] of sortedEntries) {
          msg.content = msg.content.replaceAll(url, `§url_token: ${token}§`);
        }
      }
    }
  }
}
