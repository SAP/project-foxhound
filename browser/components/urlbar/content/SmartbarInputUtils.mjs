/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { MultilineEditor } from "chrome://browser/content/multilineeditor/multiline-editor.mjs";
import { createMentionsPlugin } from "chrome://browser/content/multilineeditor/plugins/MentionsPlugin.mjs";

/**
 * @import {SmartbarInput} from "chrome://browser/content/urlbar/SmartbarInput.mjs"
 * @typedef {import("../../aiwindow/ui/components/smartwindow-panel-list/smartwindow-panel-list.mjs").SmartwindowPanelList} SmartwindowPanelList
 */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  AIWindowUI:
    "moz-src:///browser/components/aiwindow/ui/modules/AIWindowUI.sys.mjs",
  MENTION_TYPE:
    "moz-src:///browser/components/urlbar/SmartbarMentionsPanelSearch.sys.mjs",
  SkippableTimer: "moz-src:///browser/components/urlbar/UrlbarUtils.sys.mjs",
  SmartbarMentionsPanelSearch:
    "moz-src:///browser/components/urlbar/SmartbarMentionsPanelSearch.sys.mjs",
});

const { XPCOMUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/XPCOMUtils.sys.mjs"
);

XPCOMUtils.defineLazyPreferenceGetter(
  lazy,
  "maxResults",
  "browser.urlbar.mentions.maxResults"
);

ChromeUtils.defineLazyGetter(lazy, "log", function () {
  return console.createInstance({
    prefix: "SmartbarMentionsPanel",
    maxLogLevelPref: "browser.smartwindow.smartbarMentions.loglevel",
  });
});

// Debounce delay for the mention suggestions query.
const MENTION_QUERY_DEBOUNCE_MS = 150;

const PLACEHOLDER_HINT_L10N_IDS = [
  "smartbar-placeholder-hint-1",
  "smartbar-placeholder-hint-2",
  "smartbar-placeholder-hint-3",
  "smartbar-placeholder-hint-4",
];

/**
 * @typedef {object} TabMention
 * @property {string} id - Mention ID
 * @property {string} [label] - Tab title
 * @property {string} [icon] - Tab icon
 * @property {string} [l10nId] - Fluent l10n ID for localized items
 * @property {object} [l10nArgs] - Arguments for l10n
 */

/**
 * @typedef {object} TabMentionGroup
 * @property {string} headerL10nId - Fluent l10n ID for the group header
 * @property {Array<TabMention>} items - Tab mentions in this group
 */

/**
 * @typedef {object} MentionSuggestionsResult
 * @property {TabMentionGroup[]} groups - The grouped mention suggestions
 * @property {number} totalCount - Total number of mention items across all groups
 */

/**
 * Get mention suggestions matching the search query.
 *
 * @param {import("../SmartbarMentionsPanelSearch.sys.mjs").SmartbarMentionsPanelSearch} mentionSearch - Search for mention suggestions
 * @param {string} searchString - Query to match against title and URL
 * @returns {MentionSuggestionsResult}
 */
function getMentionSuggestions(mentionSearch, searchString) {
  try {
    // Deduplicate by URL, keeping first occurrence (prioritizes open tabs, then most recent)
    const seen = new Set();
    const deduplicated = mentionSearch
      .startQuery(searchString)
      // Sort by type to prioritize open tabs over closed tabs
      // Stable sort preserves timestamp ordering within each type
      .sort((r1, r2) => {
        if (r1.type == r2.type) {
          return 0;
        }
        return r1.type == lazy.MENTION_TYPE.TAB_OPEN ? -1 : 1;
      })
      .filter(item => {
        if (seen.has(item.url)) {
          return false;
        }
        seen.add(item.url);
        return true;
      })
      .slice(0, lazy.maxResults)
      .map(({ url, title, icon }) => ({
        id: url,
        label: title,
        icon,
      }));

    return {
      groups: [
        {
          headerL10nId: "smartbar-mentions-list-recent-tabs-label",
          items: deduplicated,
        },
      ],
      totalCount: deduplicated.length,
    };
  } catch (e) {
    lazy.log.error("Error querying tabs:", e);
    return { groups: [], totalCount: 0 };
  }
}

/**
 * Calculate anchor position for panel positioning.
 *
 * @param {object} range - The text range
 * @param {object} view - The editor view
 * @returns {object} Anchor position
 */
const getAnchorPos = (range, view) => {
  const coordsFrom = view.coordsAtPos(range.from);
  const coordsTo = view.coordsAtPos(range.to);

  return {
    left: coordsFrom.left,
    top: coordsFrom.top,
    height: coordsTo.bottom - coordsFrom.top,
    width: coordsTo.right - coordsFrom.left,
  };
};

/**
 * Setup context button to show mentions panel.
 *
 * @param {SmartbarInput} smartbarInput - The smartbar input element
 * @param {SmartwindowPanelList} panelList - The panel list component
 */
function setupContextMentionsButton(smartbarInput, panelList) {
  const contextButton = smartbarInput.querySelector("context-icon-button");

  panelList.addEventListener("shown", () => {
    if (panelList.getAttribute("data-triggered-by") === "context-mention") {
      contextButton.setAttribute("active", "");
    }
  });

  panelList.addEventListener("hidden", () => {
    contextButton.removeAttribute("active");
  });

  contextButton.addEventListener("aiwindow-context-button:on-click", () => {
    const contextMentionSearch = new lazy.SmartbarMentionsPanelSearch(
      // @ts-ignore topChromeWindow global
      window.browsingContext.topChromeWindow
    );
    panelList.anchor = contextButton;
    const { groups, totalCount } = getMentionSuggestions(
      contextMentionSearch,
      ""
    );
    panelList.groups = groups;
    panelList.setAttribute("data-triggered-by", "context-mention");
    panelList.toggle();

    const { chat_id, message_seq } = smartbarInput.conversationTelemetryInfo;
    Glean.smartWindow.addTabsClick.record({
      chat_id,
      location: smartbarInput.sapLocation,
      message_seq: String(message_seq),
      tabs_available: String(totalCount),
      tabs_preselected: String(smartbarInput.contextWebsitesCount),
    });
  });
}

/**
 * Mentions plugin setup for the editor.
 *
 * @param {MultilineEditor} editorElement - The editor element
 * @param {SmartwindowPanelList} panelList - The panel list component
 * @returns {object} plugin - The mentions plugin
 */
function setupMentionsPlugin(editorElement, panelList) {
  let isHandlingMentions = false;
  let mentionChangeTimer = null;
  let mentionSearch = null;
  let latestMentionData = null;

  document.l10n
    .formatValue("smartbar-mention-typing-placeholder")
    .then(text => {
      editorElement.style.setProperty(
        "--multiline-editor-mention-placeholder",
        `" ${text}"`
      );
    });

  const handleMentionsChange = () => {
    if (!latestMentionData || !mentionSearch) {
      return;
    }
    const { text } = latestMentionData;
    // Don't trim() the query - we need to preserve spaces to match tab titles
    // that contain spaces (e.g., "@my tab" should match "my tab title")
    const query = text.substring(1);
    const { groups } = getMentionSuggestions(mentionSearch, query);
    panelList.groups = groups;
    mentionChangeTimer = null;
  };

  const smartbarInput = /** @type {SmartbarInput} */ (
    editorElement.closest("moz-smartbar")
  );
  const plugin = createMentionsPlugin({
    triggerChar: "@",
    allowSpaces: true,
    toDOM: node => [
      "span",
      {
        "data-mention-type": node.attrs.type,
        "data-mention-id": node.attrs.id,
        "data-mention-label": node.attrs.label,
      },
      node.attrs.label,
    ],
    nodeView: node => [
      "ai-website-chip",
      {
        href: node.attrs.id,
        iconSrc: `page-icon:${node.attrs.id}`,
        label: node.attrs.label,
        type: "in-line",
      },
    ],
    onEnter: mentionData => {
      isHandlingMentions = true;
      latestMentionData = mentionData;
      mentionSearch = new lazy.SmartbarMentionsPanelSearch(
        // @ts-ignore topChromeWindow global
        window.browsingContext.topChromeWindow
      );
      panelList.anchor = getAnchorPos(mentionData.range, mentionData.view);
      const { groups, totalCount } = getMentionSuggestions(mentionSearch, "");
      panelList.groups = groups;
      panelList.setAttribute("data-triggered-by", "inline-mention");
      panelList.show();
      editorElement.setAttribute("data-mention-placeholder", "");

      const { chat_id, message_seq } = smartbarInput.conversationTelemetryInfo;
      Glean.smartWindow.mentionStart.record({
        chat_id,
        location: smartbarInput.sapLocation,
        mentions_available: String(totalCount),
        message_seq: String(message_seq),
      });
    },
    onChange: mentionData => {
      latestMentionData = mentionData;

      editorElement.toggleAttribute(
        "data-mention-placeholder",
        mentionData.text.length <= 1
      );

      if (!mentionChangeTimer) {
        mentionChangeTimer = new lazy.SkippableTimer({
          name: "SmartbarMentionsChange",
          callback: handleMentionsChange,
          time: MENTION_QUERY_DEBOUNCE_MS,
        });
      }
    },
    onExit: () => {
      isHandlingMentions = false;
      panelList.hide();
      editorElement.removeAttribute("data-mention-placeholder");

      // Cancel pending queries
      if (mentionChangeTimer) {
        mentionChangeTimer.cancel();
        mentionChangeTimer = null;
      }
      latestMentionData = null;
      mentionSearch = null;
    },
  });

  const handleChipDisconnected = e => {
    if (e.detail.type === "in-line") {
      const { chat_id, message_seq } = smartbarInput.conversationTelemetryInfo;
      Glean.smartWindow.mentionRemove.record({
        chat_id,
        location: smartbarInput.sapLocation,
        mentions: String(plugin.mentions.getAll().length),
        message_seq: String(message_seq),
      });
    }
  };

  const handleItemSelected = e => {
    const { id, label, icon } = e.detail;

    const isContextButtonTrigger =
      panelList.getAttribute("data-triggered-by") === "context-mention";

    const { chat_id, message_seq } = smartbarInput.conversationTelemetryInfo;

    // If the mention suggestions are triggered by the context “+”-button,
    // add the mention to the context header.
    if (isContextButtonTrigger) {
      const tabsPreselected = smartbarInput.contextWebsitesCount;
      smartbarInput.addContextMention({
        type: "tab",
        url: id,
        label,
        iconSrc: icon,
      });
      Glean.smartWindow.addTabsSelection.record({
        chat_id,
        location: smartbarInput.sapLocation,
        message_seq: String(message_seq),
        tabs_available: String(
          panelList.groups.reduce((sum, group) => sum + group.items.length, 0)
        ),
        tabs_preselected: String(tabsPreselected),
        tabs_selected: String(smartbarInput.contextWebsitesCount),
      });
    } else {
      // Add inline mention when triggered by typing "@".
      // Inline mentions are not added as context chips.
      Glean.smartWindow.mentionSelect.record({
        chat_id,
        length: label.length,
        location: smartbarInput.sapLocation,
        mentions_available: panelList.groups.reduce(
          (sum, group) => sum + group.items.length,
          0
        ),
        message_seq: String(message_seq),
      });
      plugin.mentions.insert(
        {
          type: "tab",
          id,
          label,
        },
        latestMentionData?.range.from ?? 0,
        latestMentionData?.range.to ?? 1
      );
    }
    panelList.removeAttribute("data-triggered-by");
  };

  const handlePanelKeyDown = e => {
    const { originalEvent } = e.detail;
    // The keys below should be handled by the panel for navigation
    if (["Tab", "ArrowUp", "ArrowDown", "Enter"].includes(originalEvent.key)) {
      return;
    }

    // Refocus editor and let any other key events bubble to the Smartbar
    editorElement.focus();
  };

  const handleEditorKeyDown = e => {
    // Prevent Smartbar submission while mentions panel is open
    if (isHandlingMentions && e.key === "Enter") {
      e.stopPropagation();
    }
  };

  panelList.addEventListener("item-selected", handleItemSelected);
  panelList.addEventListener("panel-keydown", handlePanelKeyDown);
  editorElement.addEventListener("keydown", handleEditorKeyDown, {
    capture: true,
  });
  editorElement.addEventListener(
    "ai-website-chip:disconnected",
    handleChipDisconnected
  );

  /**
   * Adds the following properties to `editorElement`:
   *
   * @property {boolean} isHandlingMentions - Whether the mentions panel is open
   * @property {boolean} hasMention - Whether the editor has inline mentions
   */
  Object.defineProperties(editorElement, {
    isHandlingMentions: {
      get: () => isHandlingMentions,
    },
    hasMention: {
      get: () => plugin.mentions.hasMention(),
    },
    getAllMentions: {
      value: () => plugin.mentions.getAll(),
    },
    /**
     * Inserts an inline mention at the specified text offset
     *
     * @param {Node} mention
     * @param {number} textOffset
     */
    insertMention: {
      value: (mention, textOffset) => {
        const pos = editorElement.textOffsetToPos(textOffset);
        plugin.mentions.insertNode(mention, pos);
      },
    },
  });

  return plugin;
}

/**
 * Creates a Smartbar editor element.
 *
 * @param {HTMLInputElement | MultilineEditor} inputElement
 *   The input element to replace.
 * @returns {{
 *   input: MultilineEditor,
 *   editor: object
 * } | null}
 *   An object with the new editor element and the adapter.
 */
export function createEditor(inputElement) {
  if (!inputElement) {
    return null;
  }

  if (inputElement instanceof MultilineEditor) {
    return {
      input: inputElement,
      editor: createEditorAdapter(inputElement),
    };
  }

  const doc = inputElement.ownerDocument;
  const editorElement = /** @type {MultilineEditor} */ (
    doc.createElement("moz-multiline-editor")
  );

  // Copy attributes except those that don’t apply.
  for (const attr of inputElement.attributes) {
    if (attr.name == "type" || attr.name == "value") {
      continue;
    }
    editorElement.setAttribute(attr.name, attr.value);
  }

  editorElement.className = inputElement.className;
  editorElement.id = inputElement.id;
  editorElement.value = inputElement.value ?? "";

  const isSidebarMode =
    window.browsingContext?.embedderElement?.id === lazy.AIWindowUI.BROWSER_ID;
  document.l10n
    .formatValues(PLACEHOLDER_HINT_L10N_IDS.map(id => ({ id })))
    .then(hints => {
      editorElement.placeholderHints = hints;
      editorElement.showPlaceholderAnimation = !isSidebarMode;
    })
    .catch(console.error);

  inputElement.replaceWith(editorElement);

  const container = editorElement.closest(".urlbar-input-container");
  const panelList = /** @type {SmartwindowPanelList} */ (
    container.querySelector("smartwindow-panel-list")
  );
  panelList.placeholderL10nId = "smartbar-mentions-list-no-results-label";
  panelList.sidebarMode = isSidebarMode;

  const mentionsPlugin = setupMentionsPlugin(editorElement, panelList);
  editorElement.plugins = [mentionsPlugin];

  const smartbarInput = /** @type {SmartbarInput} */ (
    editorElement.closest("moz-smartbar")
  );
  setupContextMentionsButton(smartbarInput, panelList);

  return {
    input: editorElement,
    editor: createEditorAdapter(editorElement),
  };
}

/**
 * Creates an adapter for the Smartbar editor element.
 *
 * @param {MultilineEditor} editorElement
 *   The editor element.
 */
export function createEditorAdapter(editorElement) {
  const getSelectionBounds = () => {
    let start = editorElement.selectionStart ?? 0;
    let end = editorElement.selectionEnd ?? start;
    if (start > end) {
      [start, end] = [end, start];
    }
    return { start, end };
  };

  return {
    get composing() {
      return !!editorElement.composing;
    },
    selection: {
      get rangeCount() {
        const { start, end } = getSelectionBounds();
        return start === end && editorElement.value === "" ? 0 : 1;
      },
      toStringWithFormat() {
        const { start, end } = getSelectionBounds();
        if (start == null || end == null) {
          return "";
        }
        return editorElement.value?.substring(start, end);
      },
    },
  };
}
