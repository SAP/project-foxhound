/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import {
  GET_OPEN_TABS,
  SEARCH_BROWSING_HISTORY,
  GET_PAGE_CONTENT,
  RUN_SEARCH,
  GET_USER_MEMORIES,
  GET_NAVIGATION_INFO,
  WORLD_CUP_MATCHES,
  WORLD_CUP_LIVE,
} from "moz-src:///browser/components/aiwindow/models/Tools.sys.mjs";

export const ACTION_LOG_UI_TYPE = "action-log";

const EMPTY_ROWS = Object.freeze([]);

/**
 * A localized label shown on an action log entry
 *
 * @typedef {object} ActionLogLabel
 * @property {string} l10nId - Fluent message id for the label text
 * @property {object} [l10nArgs] - optional Fluent variables (e.g. counts)
 */

/**
 * A website chip shown under an action log row when the tool returns urls
 *
 * @typedef {object} ActionLogChip
 * @property {string} url - the website the chip links to
 * @property {string} label - the chip's display text (e.g. page title)
 */

/**
 * Shared adapter for tools that return url lists
 *
 * @param {Array<object>} items - raw items returned by the tool
 * @param {(item: object) => string} getLabel - extracts the chip label
 * @returns {Array<ActionLogChip>}
 */
function urlListChips(items, getLabel) {
  return (items ?? []).map(item => ({
    url: item.url,
    label: getLabel(item),
  }));
}

/**
 * UI metadata used by the action log - keyed by tool name
 *
 * @type {Map<string, { show: boolean, label: ActionLogLabel, pendingLabel: ActionLogLabel }>}
 */
const TOOL_ACTION_LOG_CONFIG = new Map([
  [
    GET_OPEN_TABS,
    {
      show: true,
      label: { l10nId: "action-log-searched-open-tabs" },
      pendingLabel: { l10nId: "action-log-searching-tabs" },
    },
  ],
  [
    SEARCH_BROWSING_HISTORY,
    {
      show: true,
      label: { l10nId: "action-log-searched-history" },
      pendingLabel: { l10nId: "action-log-searching-history" },
    },
  ],
  [
    GET_PAGE_CONTENT,
    {
      show: true,
      label: { l10nId: "action-log-read-page" },
      pendingLabel: { l10nId: "action-log-reading-page" },
    },
  ],
  [
    RUN_SEARCH,
    {
      show: true,
      label: { l10nId: "action-log-searched-web" },
      pendingLabel: { l10nId: "action-log-searching-web" },
    },
  ],
  [
    GET_USER_MEMORIES,
    {
      show: true,
      label: { l10nId: "action-log-checked-memories" },
      pendingLabel: { l10nId: "action-log-checking-memories" },
    },
  ],
  [
    GET_NAVIGATION_INFO,
    {
      show: true,
      label: { l10nId: "action-log-searched-settings" },
      pendingLabel: { l10nId: "action-log-searching-settings" },
    },
  ],
  [
    WORLD_CUP_MATCHES,
    {
      show: true,
      label: { l10nId: "action-log-searched-world-cup-matches" },
      pendingLabel: { l10nId: "action-log-searching-world-cup-matches" },
    },
  ],
  [
    WORLD_CUP_LIVE,
    {
      show: true,
      label: { l10nId: "action-log-checked-world-cup-live" },
      pendingLabel: { l10nId: "action-log-checking-world-cup-live" },
    },
  ],
]);

/**
 * Per tool row adapters. Each takes a tool result body and returns
 * an array of rows for <ai-action-result>
 *
 * @type {Map<string, (body: object) => Array<ActionLogChip>>}
 */
const TOOL_RESULT_TO_CHIPS = new Map([
  [GET_OPEN_TABS, body => urlListChips(body, tab => tab.title)],
  [
    SEARCH_BROWSING_HISTORY,
    body => urlListChips(body?.results, result => result.title),
  ],
]);

/**
 * Look up the action log UI config for a given tool. Tools without an entry
 * default to suppressed (show: false)
 *
 * @param {string} toolName
 * @param {object} [body] - tool result body
 * @returns {{ show: boolean, label: ActionLogLabel | null, pendingLabel: ActionLogLabel | null }}
 */
export function getActionLogConfigForTool(toolName, body) {
  const cfg = TOOL_ACTION_LOG_CONFIG.get(toolName);
  if (!cfg) {
    return { show: false, label: null, pendingLabel: null };
  }
  const label = typeof cfg.label === "function" ? cfg.label(body) : cfg.label;
  return { show: cfg.show, label, pendingLabel: cfg.pendingLabel ?? null };
}

/**
 * Look up the action log website chips for a given tool
 *
 * @param {string} toolName
 * @param {object} body - tool result body
 * @param {object} [args] - parsed tool call args (URL tokens already expanded)
 * @returns {Array<ActionLogChip>}
 */
export function getActionLogChipsForTool(toolName, body, args) {
  const adapter = TOOL_RESULT_TO_CHIPS.get(toolName);
  return adapter ? (adapter(body, args) ?? EMPTY_ROWS) : EMPTY_ROWS;
}

/**
 * Build a single action log row in the shape <ai-action-result>
 * The renderer collects the rows from a turn's tool messages
 * into a single grouped card
 *
 * @param {string} toolName
 * @param {ActionLogLabel | string} label
 * @param {object} body - tool result body
 * @param {object} [args] - parsed tool call args
 * @returns {{ labelL10nId?: string, labelL10nArgs?: object, label?: string, items: Array<ActionLogChip> }}
 */
export function buildActionLogRow(toolName, label, body, args) {
  const items = getActionLogChipsForTool(toolName, body, args);
  if (label && typeof label === "object" && label.l10nId) {
    return {
      labelL10nId: label.l10nId,
      labelL10nArgs: label.l10nArgs,
      items,
    };
  }
  return {
    label: typeof label === "string" ? label : "",
    items,
  };
}
