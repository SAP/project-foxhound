/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { MultilineEditor } from "chrome://browser/content/multilineeditor/multiline-editor.mjs";
import { createMentionsPlugin } from "chrome://browser/content/multilineeditor/plugins/MentionsPlugin.mjs";

/** @typedef {import("../../aiwindow/ui/components/smartwindow-panel-list/smartwindow-panel-list.mjs").SmartwindowPanelList} SmartwindowPanelList */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
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
 * Get mention suggestions matching the search query.
 *
 * @param {import("../SmartbarMentionsPanelSearch.sys.mjs").SmartbarMentionsPanelSearch} mentionSearch - Search for mention suggestions
 * @param {string} searchString - Query to match against title and URL
 * @returns {Array<TabMentionGroup>}
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

    return [
      {
        headerL10nId: "smartbar-mentions-list-recent-tabs-label",
        items: deduplicated,
      },
    ];
  } catch (e) {
    lazy.log.error("Error querying tabs:", e);
    return [];
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
 * @param {HTMLElement} container - The urlbar input container
 * @param {SmartwindowPanelList} panelList - The panel list component
 */
function setupContextMentionsButton(container, panelList) {
  const smartbarRoot = container.parentElement;
  const contextButton = smartbarRoot.querySelector("context-icon-button");

  contextButton.addEventListener("aiwindow-context-button:on-click", () => {
    const contextMentionSearch = new lazy.SmartbarMentionsPanelSearch(
      // @ts-ignore topChromeWindow global
      window.browsingContext.topChromeWindow
    );
    panelList.anchor = contextButton;
    panelList.groups = getMentionSuggestions(contextMentionSearch, "");
    panelList.setAttribute("data-triggered-by", "context-mention");
    panelList.toggle();
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

  const handleMentionsChange = () => {
    if (!latestMentionData || !mentionSearch) {
      return;
    }
    const { text } = latestMentionData;
    // Don't trim() the query - we need to preserve spaces to match tab titles
    // that contain spaces (e.g., "@my tab" should match "my tab title")
    const query = text.substring(1);
    panelList.groups = getMentionSuggestions(mentionSearch, query);
    mentionChangeTimer = null;
  };

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
      panelList.groups = getMentionSuggestions(mentionSearch, "");
      panelList.setAttribute("data-triggered-by", "inline-mention");
      panelList.show();
    },
    onChange: mentionData => {
      latestMentionData = mentionData;

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

      // Cancel pending queries
      if (mentionChangeTimer) {
        mentionChangeTimer.cancel();
        mentionChangeTimer = null;
      }
      latestMentionData = null;
      mentionSearch = null;
    },
  });

  const handleItemSelected = e => {
    const { id, label } = e.detail;

    const isContextButtonTrigger =
      panelList.getAttribute("data-triggered-by") === "context-mention";
    // If the mention suggestions are triggered by the context “+”-button,
    // add the mention to the context header.
    if (isContextButtonTrigger) {
      const smartbarInput = editorElement.closest("moz-smartbar");
      // @ts-ignore - addContextMention method exists on SmartbarInput
      smartbarInput.addContextMention({
        type: "tab",
        url: id,
        label,
      });
    } else {
      // Add inline mention when triggered by typing “@”
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
  Object.defineProperty(editorElement, "isHandlingMentions", {
    get: () => isHandlingMentions,
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

  inputElement.replaceWith(editorElement);

  const container = editorElement.closest(".urlbar-input-container");
  const panelList = /** @type {SmartwindowPanelList} */ (
    container.querySelector("smartwindow-panel-list")
  );
  panelList.placeholderL10nId = "smartbar-mentions-list-no-results-label";

  const mentionsPlugin = setupMentionsPlugin(editorElement, panelList);
  editorElement.plugins = [mentionsPlugin];

  setupContextMentionsButton(/** @type {HTMLElement} */ (container), panelList);

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
