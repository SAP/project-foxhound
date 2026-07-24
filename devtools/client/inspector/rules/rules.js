/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const flags = require("resource://devtools/shared/flags.js");
const { l10n } = require("resource://devtools/shared/inspector/css-logic.js");
const {
  style: { ELEMENT_STYLE },
} = require("resource://devtools/shared/constants.js");
const {
  PSEUDO_CLASSES,
} = require("resource://devtools/shared/css/constants.js");
const OutputParser = require("resource://devtools/client/shared/output-parser.js");
const { PrefObserver } = require("resource://devtools/client/shared/prefs.js");
const ElementStyle = require("resource://devtools/client/inspector/rules/models/element-style.js");
const RuleEditor = require("resource://devtools/client/inspector/rules/views/rule-editor.js");
const RegisteredPropertyEditor = require("resource://devtools/client/inspector/rules/views/registered-property-editor.js");
const TooltipsOverlay = require("resource://devtools/client/inspector/shared/tooltips-overlay.js");
const {
  createChild,
} = require("resource://devtools/client/inspector/shared/utils.js");
const { debounce } = require("resource://devtools/shared/debounce.js");
const EventEmitter = require("resource://devtools/shared/event-emitter.js");

loader.lazyRequireGetter(
  this,
  ["flashElementOn", "flashElementOff"],
  "resource://devtools/client/inspector/markup/utils.js",
  true
);
loader.lazyRequireGetter(
  this,
  "ClassListPreviewer",
  "resource://devtools/client/inspector/rules/views/class-list-previewer.js"
);
loader.lazyRequireGetter(
  this,
  ["getNodeInfo", "getNodeCompatibilityInfo", "getRuleFromNode"],
  "resource://devtools/client/inspector/rules/utils/utils.js",
  true
);
loader.lazyRequireGetter(
  this,
  "StyleInspectorMenu",
  "resource://devtools/client/inspector/shared/style-inspector-menu.js"
);
loader.lazyRequireGetter(
  this,
  "AutocompletePopup",
  "resource://devtools/client/shared/autocomplete-popup.js"
);
loader.lazyRequireGetter(
  this,
  "KeyShortcuts",
  "resource://devtools/client/shared/key-shortcuts.js"
);
loader.lazyRequireGetter(
  this,
  "clipboardHelper",
  "resource://devtools/shared/platform/clipboard.js"
);
loader.lazyRequireGetter(
  this,
  "openContentLink",
  "resource://devtools/client/shared/link.js",
  true
);

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  AppConstants: "resource://gre/modules/AppConstants.sys.mjs",
});

const HTML_NS = "http://www.w3.org/1999/xhtml";
const PREF_UA_STYLES = "devtools.inspector.showUserAgentStyles";
const PREF_DEFAULT_COLOR_UNIT = "devtools.defaultColorUnit";
const PREF_DRAGGABLE = "devtools.inspector.draggable_properties";
const PREF_INPLACE_EDITOR_FOCUS_NEXT_ON_ENTER =
  "devtools.inspector.rule-view.focusNextOnEnter";
const FILTER_CHANGED_TIMEOUT = 150;
// Removes the flash-out class from an element after 1 second (100ms in tests so they
// don't take too long to run).
const PROPERTY_FLASHING_DURATION = flags.testing ? 100 : 1000;

// This is used to parse user input when filtering.
const FILTER_PROP_RE = /\s*([^:\s]*)\s*:\s*(.*?)\s*;?$/;
// This is used to parse the filter search value to see if the filter
// should be strict or not
const FILTER_STRICT_RE = /\s*`(.*?)`\s*$/;

const RULE_VIEW_HEADER_CLASSNAME = "ruleview-header";
const PSEUDO_ELEMENTS_CONTAINER_ID = "pseudo-elements-container";
const REGISTERED_PROPERTIES_CONTAINER_ID = "registered-properties-container";
const POSITION_TRY_CONTAINER_ID = "position-try-container";

/**
 * Our model looks like this:
 *
 * ElementStyle:
 *   Responsible for keeping track of which properties are overridden.
 *   Maintains a list of Rule objects that apply to the element.
 * Rule:
 *   Manages a single style declaration or rule.
 *   Responsible for applying changes to the properties in a rule.
 *   Maintains a list of TextProperty objects.
 * TextProperty:
 *   Manages a single property from the authoredText attribute of the
 *     relevant declaration.
 *   Maintains a list of computed properties that come from this
 *     property declaration.
 *   Changes to the TextProperty are sent to its related Rule for
 *     application.
 *
 * View hierarchy mostly follows the model hierarchy.
 *
 * CssRuleView:
 *   Owns an ElementStyle and creates a list of RuleEditors for its
 *    Rules.
 * RuleEditor:
 *   Owns a Rule object and creates a list of TextPropertyEditors
 *     for its TextProperties.
 *   Manages creation of new text properties.
 * TextPropertyEditor:
 *   Owns a TextProperty object.
 *   Manages changes to the TextProperty.
 *   Can be expanded to display computed properties.
 *   Can mark a property disabled or enabled.
 */

/**
 * CssRuleView is a view of the style rules and declarations that
 * apply to a given element.  After construction, the 'element'
 * property will be available with the user interface.
 */
class CssRuleView extends EventEmitter {
  /**
   * @param {Inspector} inspector
   *        Inspector toolbox panel
   * @param {Document} document
   *        The document that will contain the rule view.
   * @param {object} store
   *        The CSS rule view can use this object to store metadata
   *        that might outlast the rule view, particularly the current
   *        set of disabled properties.
   */
  constructor(inspector, document, store) {
    super();

    this.inspector = inspector;
    this.cssProperties = inspector.cssProperties;
    this.styleDocument = document;
    this.styleWindow = this.styleDocument.defaultView;
    this.store = store || {
      expandedUnusedCustomCssPropertiesRuleActorIds: new Set(),
    };

    // Allow tests to override debouncing behavior, as this can cause intermittents.
    this.debounce = debounce;

    // Used by TextPropertyEditor
    this.outputParser = new OutputParser(document, this.cssProperties);

    this.addNewRule = this.addNewRule.bind(this);
    this.refreshPanel = this.refreshPanel.bind(this);

    this.#abortController = new this.styleWindow.AbortController();
    const { signal } = this.#abortController;
    const baseEventConfig = { signal };

    const doc = this.styleDocument;
    // Delegate bulk handling of events happening within the DOM tree of the Rules view
    // to this.handleEvent(). Listening on the capture phase of the event bubbling to be
    // able to stop event propagation on a case-by-case basis and prevent event target
    // ancestor nodes from handling them.
    this.styleDocument.addEventListener("click", this, {
      capture: true,
      signal,
    });
    this.element = doc.getElementById("ruleview-container-focusable");
    this.addRuleButton = doc.getElementById("ruleview-add-rule-button");
    this.searchField = doc.getElementById("ruleview-searchbox");
    this.searchClearButton = doc.getElementById("ruleview-searchinput-clear");
    this.pseudoClassPanel = doc.getElementById("pseudo-class-panel");
    this.pseudoClassToggle = doc.getElementById("pseudo-class-panel-toggle");
    this.classPanel = doc.getElementById("ruleview-class-panel");
    this.classToggle = doc.getElementById("class-panel-toggle");
    this.colorSchemeLightSimulationButton = doc.getElementById(
      "color-scheme-simulation-light-toggle"
    );
    this.colorSchemeDarkSimulationButton = doc.getElementById(
      "color-scheme-simulation-dark-toggle"
    );
    this.printSimulationButton = doc.getElementById("print-simulation-toggle");

    this.#initSimulationFeatures();

    this.searchClearButton.hidden = true;

    this.onHighlighterShown = data =>
      this.handleHighlighterEvent("highlighter-shown", data);
    this.onHighlighterHidden = data =>
      this.handleHighlighterEvent("highlighter-hidden", data);
    this.inspector.highlighters.on(
      "highlighter-shown",
      this.onHighlighterShown
    );
    this.inspector.highlighters.on(
      "highlighter-hidden",
      this.onHighlighterHidden
    );

    this.shortcuts = new KeyShortcuts({ window: this.styleWindow });
    this.shortcuts.on("Escape", event => this.#onShortcut("Escape", event));
    this.shortcuts.on("Return", event => this.#onShortcut("Return", event));
    this.shortcuts.on("Space", event => this.#onShortcut("Space", event));
    this.shortcuts.on("CmdOrCtrl+F", event =>
      this.#onShortcut("CmdOrCtrl+F", event)
    );
    this.element.addEventListener("copy", this.#onCopy, baseEventConfig);
    this.element.addEventListener(
      "contextmenu",
      this.#onContextMenu,
      baseEventConfig
    );
    this.addRuleButton.addEventListener(
      "click",
      this.addNewRule,
      baseEventConfig
    );
    this.searchField.addEventListener(
      "input",
      this.#onFilterStyles,
      baseEventConfig
    );
    this.searchClearButton.addEventListener(
      "click",
      this.#onClearSearch,
      baseEventConfig
    );
    this.pseudoClassToggle.addEventListener(
      "click",
      this.#onTogglePseudoClassPanel,
      baseEventConfig
    );
    this.classToggle.addEventListener(
      "click",
      this.#onToggleClassPanel,
      baseEventConfig
    );
    // The "change" event bubbles up from checkbox inputs nested within the panel container.
    this.pseudoClassPanel.addEventListener(
      "change",
      this.#onTogglePseudoClass,
      baseEventConfig
    );

    if (flags.testing) {
      // In tests, we start listening immediately to avoid having to simulate a mousemove.
      this.highlighters.addToView(this);
    } else {
      this.element.addEventListener(
        "mousemove",
        () => {
          this.highlighters.addToView(this);
        },
        { once: true, signal }
      );
    }

    this.#prefObserver = new PrefObserver("devtools.");
    this.#prefObserver.on(PREF_UA_STYLES, this.#handleUAStylePrefChange);
    this.#prefObserver.on(
      PREF_DEFAULT_COLOR_UNIT,
      this.#handleDefaultColorUnitPrefChange
    );
    this.#prefObserver.on(PREF_DRAGGABLE, this.#handleDraggablePrefChange);
    // Initialize value of this.draggablePropertiesEnabled
    this.#handleDraggablePrefChange();

    this.#prefObserver.on(
      PREF_INPLACE_EDITOR_FOCUS_NEXT_ON_ENTER,
      this.#handleInplaceEditorFocusNextOnEnterPrefChange
    );
    // Initialize value of this.inplaceEditorFocusNextOnEnter
    this.#handleInplaceEditorFocusNextOnEnterPrefChange();

    // Used from tests
    this.pseudoClassCheckboxes = this.#createPseudoClassCheckboxes();
    this.#showUserAgentStyles = Services.prefs.getBoolPref(PREF_UA_STYLES);

    // Add the tooltips and highlighters to the view
    this.tooltips = new TooltipsOverlay(this);

    // Used from RuleViewTool class
    this.cssRegisteredPropertiesByTarget = new Map();

    this.#elementsWithPendingClicks = new this.styleWindow.WeakSet();
  }

  #abortController;

  #prefObserver;
  #elementsWithPendingClicks;
  #showUserAgentStyles;
  #focusNextUserAddedRule;

  // Variable used to stop the propagation of mouse events to children
  // when we are updating a value by dragging the mouse and we then release it
  #childHasDragged = false;

  // The element that we're inspecting.
  // (Used from RuleViewTool class)
  viewedElement = null;

  // Used for cancelling timeouts in the style filter.
  #filterChangedTimeout = null;

  // Empty, unconnected element of the same type as this node, used
  // to figure out how shorthand properties will be parsed.
  #dummyElement = null;

  #popup;

  get popup() {
    if (!this.#popup) {
      // The popup will be attached to the toolbox document.
      this.#popup = new AutocompletePopup(this.inspector.toolbox.doc, {
        autoSelect: true,
      });
    }

    return this.#popup;
  }

  #classListPreviewer;
  get classListPreviewer() {
    if (!this.#classListPreviewer) {
      this.#classListPreviewer = new ClassListPreviewer(
        this.inspector,
        this.classPanel
      );
    }

    return this.#classListPreviewer;
  }

  #contextMenu;
  get contextMenu() {
    if (!this.#contextMenu) {
      this.#contextMenu = new StyleInspectorMenu(this, { isRuleView: true });
    }

    return this.#contextMenu;
  }

  // Get the dummy element.
  get dummyElement() {
    return this.#dummyElement;
  }

  // Get the highlighters overlay from the Inspector.
  #highlighters;
  get highlighters() {
    if (!this.#highlighters) {
      // highlighters is a lazy getter in the inspector.
      this.#highlighters = this.inspector.highlighters;
    }

    return this.#highlighters;
  }

  // Get the filter search value.
  get searchValue() {
    return this.searchField.value.toLowerCase();
  }

  get rules() {
    return this.elementStyle ? this.elementStyle.rules : [];
  }

  get currentTarget() {
    return this.inspector.toolbox.target;
  }

  /**
   * Highlight/unhighlight all the nodes that match a given rule's selector
   * inside the document of the current selected node.
   * Only one selector can be highlighted at a time, so calling the method a
   * second time with a different rule will first unhighlight the previously
   * highlighted nodes.
   * Calling the method a second time with the same rule will just
   * unhighlight the highlighted nodes.
   *
   * @param {Rule} rule
   * @param {string} selector
   *        Elements matching this selector will be highlighted on the page.
   * @param {boolean} highlightFromRulesSelector
   */
  async toggleSelectorHighlighter(
    rule,
    selector,
    highlightFromRulesSelector = true
  ) {
    if (this.isSelectorHighlighted(selector)) {
      await this.inspector.highlighters.hideHighlighterType(
        this.inspector.highlighters.TYPES.SELECTOR
      );
    } else {
      const options = {
        hideInfoBar: true,
        hideGuides: true,
        // we still pass the selector (which can be the StyleRuleFront#computedSelector)
        // even if highlightFromRulesSelector is set to true, as it's how we keep track
        // of which selector is highlighted.
        selector,
      };
      if (highlightFromRulesSelector) {
        options.ruleActorID = rule.domRule.actorID;
      }
      await this.inspector.highlighters.showHighlighterTypeForNode(
        this.inspector.highlighters.TYPES.SELECTOR,
        this.inspector.selection.nodeFront,
        options
      );
    }
  }

  isPanelVisible() {
    return (
      this.inspector.toolbox &&
      this.inspector.sidebar &&
      this.inspector.toolbox.currentToolId === "inspector" &&
      (this.inspector.sidebar.getCurrentTabID() == "ruleview" ||
        this.inspector.isThreePaneModeEnabled)
    );
  }

  /**
   * Check whether a SelectorHighlighter is active for the given selector text.
   *
   * @param {string} selector
   * @return {boolean}
   */
  isSelectorHighlighted(selector) {
    const options = this.inspector.highlighters.getOptionsForActiveHighlighter(
      this.inspector.highlighters.TYPES.SELECTOR
    );

    return options?.selector === selector;
  }

  /**
   * Delegate handler for events happening within the DOM tree of the Rules view.
   * Itself delegates to specific handlers by event type.
   *
   * Use this instead of attaching specific event handlers when:
   * - there are many elements with the same event handler (eases memory pressure)
   * - you want to avoid having to remove event handlers manually
   * - elements are added/removed from the DOM tree arbitrarily over time
   *
   * @param {MouseEvent|UIEvent} event
   */
  handleEvent(event) {
    if (this.#childHasDragged) {
      this.#childHasDragged = false;
      event.stopPropagation();
      return;
    }
    switch (event.type) {
      case "click":
        this.handleClickEvent(event);
        break;
      default:
    }
  }

  /**
   * Delegate handler for click events happening within the DOM tree of the Rules view.
   * Stop propagation of click event wrapping a CSS rule or CSS declaration to avoid
   * triggering the prompt to add a new CSS declaration or to edit the existing one.
   *
   * @param {MouseEvent} event
   */
  async handleClickEvent(event) {
    const target = event.target;

    // Handle click on the icon next to a CSS selector.
    if (target.classList.contains("js-toggle-selector-highlighter")) {
      event.stopPropagation();
      let selector = target.dataset.computedSelector;
      const highlightFromRulesSelector =
        !!selector && !target.dataset.isUniqueSelector;
      // dataset.computedSelector will be initially empty for inline styles (inherited or not)
      // Rules associated with a regular selector should have this data-attribute
      // set in devtools/client/inspector/rules/views/rule-editor.js
      const rule = getRuleFromNode(target, this.elementStyle);
      if (selector === "") {
        try {
          if (rule.inherited) {
            // This is an inline style from an inherited rule. Need to resolve the
            // unique selector from the node which this rule is inherited from.
            selector = await rule.inherited.getUniqueSelector();
          } else {
            // This is an inline style from the current node.
            selector =
              await this.inspector.selection.nodeFront.getUniqueSelector();
          }

          // Now that the selector was computed, we can store it for subsequent usage.
          target.dataset.computedSelector = selector;
          target.dataset.isUniqueSelector = true;
        } finally {
          // Could not resolve a unique selector for the inline style.
        }
      }

      this.toggleSelectorHighlighter(
        rule,
        selector,
        highlightFromRulesSelector
      );
    }

    // Handle click on swatches next to flex and inline-flex CSS properties
    if (target.classList.contains("js-toggle-flexbox-highlighter")) {
      event.stopPropagation();
      this.inspector.highlighters.toggleFlexboxHighlighter(
        this.inspector.selection.nodeFront,
        "rule"
      );
    }

    // Handle click on swatches next to grid CSS properties
    if (target.classList.contains("js-toggle-grid-highlighter")) {
      event.stopPropagation();
      this.inspector.highlighters.toggleGridHighlighter(
        this.inspector.selection.nodeFront,
        "rule"
      );
    }

    const valueSpan = target.closest(".ruleview-propertyvalue");
    if (valueSpan) {
      if (this.#elementsWithPendingClicks.has(valueSpan)) {
        // When we start handling a drag in the TextPropertyEditor valueSpan,
        // we make the valueSpan capture the pointer. Then, `click` event target is always
        // the valueSpan with the latest spec of Pointer Events.
        // Therefore, we should stop immediate propagation of the `click` event
        // if we've handled a drag to prevent moving focus to the inplace editor.
        event.stopImmediatePropagation();
        return;
      }

      // Handle link click in RuleEditor property value
      if (target.nodeName === "a") {
        event.stopPropagation();
        event.preventDefault();
        openContentLink(target.href, {
          relatedToCurrent: true,
          inBackground:
            event.button === 1 ||
            (lazy.AppConstants.platform === "macosx"
              ? event.metaKey
              : event.ctrlKey),
        });
      }
    }
  }

  /**
   * Delegate handler for highlighter events.
   *
   * This is the place to observe for highlighter events, check the highlighter type and
   * event name, then react to specific events, for example by modifying the DOM.
   *
   * @param {string} eventName
   *        Highlighter event name. One of: "highlighter-hidden", "highlighter-shown"
   * @param {object} data
   *        Object with data associated with the highlighter event.
   */
  handleHighlighterEvent(eventName, data) {
    switch (data.type) {
      // Toggle the "highlighted" class on selector icons in the Rules view when
      // the SelectorHighlighter is shown/hidden for a certain CSS selector.
      case this.inspector.highlighters.TYPES.SELECTOR:
        {
          const selector = data?.options?.selector;
          if (!selector) {
            return;
          }

          const query = `.js-toggle-selector-highlighter[data-computed-selector='${selector}']`;
          for (const node of this.styleDocument.querySelectorAll(query)) {
            const isHighlighterDisplayed = eventName == "highlighter-shown";
            node.classList.toggle("highlighted", isHighlighterDisplayed);
            node.setAttribute("aria-pressed", isHighlighterDisplayed);
          }
        }
        break;

      // Toggle the "aria-pressed" attribute on swatches next to flex and inline-flex CSS properties
      // when the FlexboxHighlighter is shown/hidden for the currently selected node.
      case this.inspector.highlighters.TYPES.FLEXBOX:
        {
          const query = ".js-toggle-flexbox-highlighter";
          for (const node of this.styleDocument.querySelectorAll(query)) {
            node.setAttribute("aria-pressed", eventName == "highlighter-shown");
          }
        }
        break;

      // Toggle the "aria-pressed" class on swatches next to grid CSS properties
      // when the GridHighlighter is shown/hidden for the currently selected node.
      case this.inspector.highlighters.TYPES.GRID:
        {
          const query = ".js-toggle-grid-highlighter";
          for (const node of this.styleDocument.querySelectorAll(query)) {
            // From the Layout panel, we can toggle grid highlighters for nodes which are
            // not currently selected. The Rules view shows `display: grid` declarations
            // only for the selected node. Avoid mistakenly marking them as "active".
            if (data.nodeFront === this.inspector.selection.nodeFront) {
              node.setAttribute(
                "aria-pressed",
                eventName == "highlighter-shown"
              );
            }

            // When the max limit of grid highlighters is reached (default 3),
            // mark inactive grid swatches as disabled.
            node.toggleAttribute(
              "disabled",
              !this.inspector.highlighters.canGridHighlighterToggle(
                this.inspector.selection.nodeFront
              )
            );
          }
        }
        break;
    }
  }

  /**
   * Enables the print and color scheme simulation only for local and remote tab debugging.
   */
  async #initSimulationFeatures() {
    if (!this.inspector.commands.descriptorFront.isTabDescriptor) {
      return;
    }
    this.colorSchemeLightSimulationButton.removeAttribute("hidden");
    this.colorSchemeDarkSimulationButton.removeAttribute("hidden");
    this.printSimulationButton.removeAttribute("hidden");
    const { signal } = this.#abortController;
    const baseEventConfig = { signal };
    this.printSimulationButton.addEventListener(
      "click",
      this.#onTogglePrintSimulation,
      baseEventConfig
    );
    this.colorSchemeLightSimulationButton.addEventListener(
      "click",
      this.#onToggleLightColorSchemeSimulation,
      baseEventConfig
    );
    this.colorSchemeDarkSimulationButton.addEventListener(
      "click",
      this.#onToggleDarkColorSchemeSimulation,
      baseEventConfig
    );
    const { rfpCSSColorScheme } = this.inspector.walker;
    if (rfpCSSColorScheme) {
      this.colorSchemeLightSimulationButton.setAttribute("disabled", true);
      this.colorSchemeDarkSimulationButton.setAttribute("disabled", true);
      console.warn("Color scheme simulation is disabled in RFP mode.");
    }
  }

  /**
   * Get the type of a given node in the rule-view
   *
   * @param {DOMNode} node
   *        The node which we want information about
   * @return {object | null} containing the following props:
   * - type {String} One of the VIEW_NODE_XXX_TYPE const in
   *   client/inspector/shared/node-types.
   * - rule {Rule} The Rule object.
   * - value {Object} Depends on the type of the node.
   * Otherwise, returns null if the node isn't anything we care about.
   */
  getNodeInfo(node) {
    return getNodeInfo(node, this.elementStyle);
  }

  /**
   * Get the node's compatibility issues
   *
   * @param {DOMNode} node
   *        The node which we want information about
   * @return {object | null} containing the following props:
   * - type {String} Compatibility issue type.
   * - property {string} The incompatible rule
   * - alias {Array} The browser specific alias of rule
   * - url {string} Link to MDN documentation
   * - deprecated {bool} True if the rule is deprecated
   * - experimental {bool} True if rule is experimental
   * - unsupportedBrowsers {Array} Array of unsupported browser
   * Otherwise, returns null if the node has cross-browser compatible CSS
   */
  async getNodeCompatibilityInfo(node) {
    const compatibilityInfo = await getNodeCompatibilityInfo(
      node,
      this.elementStyle
    );

    return compatibilityInfo;
  }

  /**
   * Context menu handler.
   */
  #onContextMenu = event => {
    const inInput = event.composedTarget.matches(
      "input:is([type=text], [type=search], :not([type])), textarea"
    );
    if (inInput) {
      return;
    }

    event.stopPropagation();
    event.preventDefault();

    this.contextMenu.show(event);
  };

  /**
   * Callback for copy event. Copy the selected text.
   *
   * @param {Event} event
   *        copy event object.
   */
  #onCopy = event => {
    if (event) {
      this.copySelection(event.target);
      event.preventDefault();
      event.stopPropagation();
    }
  };

  /**
   * Copy the current selection. The current target is necessary
   * if the selection is inside an input or a textarea
   *
   * @param {DOMNode} target
   *        DOMNode target of the copy action
   */
  copySelection(target) {
    try {
      let text = "";

      const nodeName = target?.nodeName;
      const targetType = target?.type;

      if (
        // The target can be the enable/disable rule checkbox here (See Bug 1680893).
        (nodeName === "input" && targetType !== "checkbox") ||
        nodeName == "textarea"
      ) {
        const start = Math.min(target.selectionStart, target.selectionEnd);
        const end = Math.max(target.selectionStart, target.selectionEnd);
        const count = end - start;
        text = target.value.substr(start, count);
      } else {
        text = this.styleWindow.getSelection().toString();

        // Remove any double newlines.
        text = text.replace(/(\r?\n)\r?\n/g, "$1");
      }

      clipboardHelper.copyString(text);
    } catch (e) {
      console.error(e);
    }
  }

  /**
   * Add a new rule to the current element.
   */
  addNewRule() {
    const elementStyle = this.elementStyle;
    const element = elementStyle.element;
    const pseudoClasses = element.pseudoClassLocks;

    // Clear the search input so the new rule is visible
    this.#onClearSearch({ focusSearchField: false });

    this.#focusNextUserAddedRule = true;
    this.pageStyle.addNewRule(element, pseudoClasses);
  }

  /**
   * Returns true if the "Add Rule" action (either via the addRuleButton or the context
   * menu entry) can be performed for the currently selected node.
   *
   * @returns {boolean}
   */
  canAddNewRuleForSelectedNode() {
    return this.viewedElement && this.inspector.selection.isElementNode();
  }

  /**
   * Disables add rule button when needed
   */
  #refreshAddRuleButtonState() {
    this.addRuleButton.disabled = !this.canAddNewRuleForSelectedNode();
  }

  /**
   * Return {Boolean} true if the rule view currently has an input
   * editor visible.
   */
  get isEditing() {
    return (
      this.tooltips.isEditing ||
      !!this.element.querySelectorAll(".styleinspector-propertyeditor").length
    );
  }

  #handleUAStylePrefChange = () => {
    this.#showUserAgentStyles = Services.prefs.getBoolPref(PREF_UA_STYLES);
    this.#handlePrefChange(PREF_UA_STYLES);
  };

  #handleDefaultColorUnitPrefChange = () => {
    this.#handlePrefChange(PREF_DEFAULT_COLOR_UNIT);
  };

  #handleDraggablePrefChange = () => {
    this.draggablePropertiesEnabled = Services.prefs.getBoolPref(
      PREF_DRAGGABLE,
      false
    );
    // This event is consumed by text-property-editor instances in order to
    // update their draggable behavior. Preferences observer are costly, so
    // we are forwarding the preference update via the EventEmitter.
    this.emit("draggable-preference-updated");
  };

  #handleInplaceEditorFocusNextOnEnterPrefChange = () => {
    this.inplaceEditorFocusNextOnEnter = Services.prefs.getBoolPref(
      PREF_INPLACE_EDITOR_FOCUS_NEXT_ON_ENTER,
      false
    );
    this.#handlePrefChange(PREF_INPLACE_EDITOR_FOCUS_NEXT_ON_ENTER);
  };

  #handlePrefChange(pref) {
    // Reselect the currently selected element
    const refreshOnPrefs = [
      PREF_UA_STYLES,
      PREF_DEFAULT_COLOR_UNIT,
      PREF_INPLACE_EDITOR_FOCUS_NEXT_ON_ENTER,
    ];
    if (this.viewedElement && refreshOnPrefs.includes(pref)) {
      this.selectElement(this.viewedElement, true);
    }
  }

  /**
   * Set the filter style search value.
   *
   * @param {string} value
   *        The search value.
   * @param {object} options
   * @param {boolean} options.focusSearchField
   *        Whether or not to focus the search input. Defaults to true.
   */
  setFilterStyles(value = "", { focusSearchField = true } = {}) {
    this.searchField.value = value;
    if (focusSearchField) {
      this.searchField.focus();
    }
    this.#onFilterStyles();
  }

  /**
   * Called when the user enters a search term in the filter style search box.
   * The actual filtering (done in #doFilterStyles) will be throttled if the search input
   * isn't empty, but will happen immediately when the search gets cleared.
   */
  #onFilterStyles = () => {
    if (this.#filterChangedTimeout) {
      clearTimeout(this.#filterChangedTimeout);
    }

    const isSearchEmpty = this.searchValue.length === 0;
    this.searchClearButton.hidden = isSearchEmpty;

    // If the search is cleared update the UI directly so calls to this function (or any
    // callsite of it) can assume the UI is up to date directly after the call.
    if (isSearchEmpty) {
      this.#doFilterStyles();
    } else {
      this.#filterChangedTimeout = setTimeout(
        () => this.#doFilterStyles(),
        FILTER_CHANGED_TIMEOUT
      );
    }
  };

  /**
   * Actually update search data and update the UI to reflect the current search.
   *
   * @fires ruleview-filtered
   */
  #doFilterStyles() {
    this.searchData = {
      searchPropertyMatch: FILTER_PROP_RE.exec(this.searchValue),
      searchPropertyName: this.searchValue,
      searchPropertyValue: this.searchValue,
      strictSearchValue: "",
      strictSearchPropertyName: false,
      strictSearchPropertyValue: false,
      strictSearchAllValues: false,
    };

    if (this.searchData.searchPropertyMatch) {
      // Parse search value as a single property line and extract the
      // property name and value. If the parsed property name or value is
      // contained in backquotes (`), extract the value within the backquotes
      // and set the corresponding strict search for the property to true.
      if (FILTER_STRICT_RE.test(this.searchData.searchPropertyMatch[1])) {
        this.searchData.strictSearchPropertyName = true;
        this.searchData.searchPropertyName = FILTER_STRICT_RE.exec(
          this.searchData.searchPropertyMatch[1]
        )[1];
      } else {
        this.searchData.searchPropertyName =
          this.searchData.searchPropertyMatch[1];
      }

      if (FILTER_STRICT_RE.test(this.searchData.searchPropertyMatch[2])) {
        this.searchData.strictSearchPropertyValue = true;
        this.searchData.searchPropertyValue = FILTER_STRICT_RE.exec(
          this.searchData.searchPropertyMatch[2]
        )[1];
      } else {
        this.searchData.searchPropertyValue =
          this.searchData.searchPropertyMatch[2];
      }

      // Strict search for stylesheets will match the property line regex.
      // Extract the search value within the backquotes to be used
      // in the strict search for stylesheets in #highlightStyleSheet.
      if (FILTER_STRICT_RE.test(this.searchValue)) {
        this.searchData.strictSearchValue = FILTER_STRICT_RE.exec(
          this.searchValue
        )[1];
      }
    } else if (FILTER_STRICT_RE.test(this.searchValue)) {
      // If the search value does not correspond to a property line and
      // is contained in backquotes, extract the search value within the
      // backquotes and set the flag to perform a strict search for all
      // the values (selector, stylesheet, property and computed values).
      const searchValue = FILTER_STRICT_RE.exec(this.searchValue)[1];
      this.searchData.strictSearchAllValues = true;
      this.searchData.searchPropertyName = searchValue;
      this.searchData.searchPropertyValue = searchValue;
      this.searchData.strictSearchValue = searchValue;
    }

    this.#clearHighlight(this.element);
    this.#clearRules();
    this.#createEditors();

    this.inspector.emit("ruleview-filtered");
  }

  /**
   * Called when the user clicks on the clear button in the filter style search
   * box. Returns true if the search box is cleared and false otherwise.
   *
   * @param {object} options
   *        Options that will be passed to `setFilterStyles`
   */
  #onClearSearch = options => {
    if (this.searchField.value) {
      this.setFilterStyles("", options);
      return true;
    }

    return false;
  };

  destroy() {
    this.isDestroyed = true;
    this.#clear();

    this.#dummyElement = null;
    this.#prefObserver.destroy();

    this.outputParser = null;

    if (this.#classListPreviewer) {
      this.#classListPreviewer.destroy();
      this.#classListPreviewer = null;
    }

    if (this.#contextMenu) {
      this.#contextMenu.destroy();
      this.#contextMenu = null;
    }

    if (this.#highlighters) {
      this.#highlighters.removeFromView(this);
      this.#highlighters = null;
    }

    this.colorSchemeLightSimulationButton = null;
    this.colorSchemeDarkSimulationButton = null;
    this.printSimulationButton = null;

    this.tooltips.destroy();

    this.#abortController.abort();
    this.#abortController = null;

    this.shortcuts.destroy();

    this.inspector.highlighters.off(
      "highlighter-shown",
      this.onHighlighterShown
    );
    this.inspector.highlighters.off(
      "highlighter-hidden",
      this.onHighlighterHidden
    );

    this.searchField = null;
    this.searchClearButton = null;
    this.pseudoClassPanel = null;
    this.pseudoClassToggle = null;
    this.pseudoClassCheckboxes = null;
    this.classPanel = null;
    this.classToggle = null;

    this.inspector = null;
    this.styleDocument = null;
    this.styleWindow = null;

    if (this.element.parentNode) {
      this.element.remove();
    }

    if (this.elementStyle) {
      this.elementStyle.destroy();
    }

    if (this.#popup) {
      this.#popup.destroy();
      this.#popup = null;
    }
  }

  /**
   * Mark the view as selecting an element, disabling all interaction, and
   * visually clearing the view after a few milliseconds to avoid confusion
   * about which element's styles the rule view shows.
   */
  #startSelectingElement() {
    this.element.classList.add("non-interactive");
  }

  /**
   * Mark the view as no longer selecting an element, re-enabling interaction.
   */
  #stopSelectingElement() {
    this.element.classList.remove("non-interactive");
  }

  /**
   * Update the view with a new selected element.
   *
   * @param {NodeActor} element
   *        The node whose style rules we'll inspect.
   * @param {boolean} allowRefresh
   *        Update the view even if the element is the same as last time.
   */
  async selectElement(element, allowRefresh = false) {
    const refresh = this.viewedElement === element;
    if (refresh && !allowRefresh) {
      return;
    }

    if (this.#popup && this.#popup.isOpen) {
      this.#popup.hidePopup();
    }

    this.#clear(false);
    this.viewedElement = element;

    this.#clearPseudoClassPanel();
    this.#refreshAddRuleButtonState();

    if (!this.viewedElement) {
      this.#stopSelectingElement();
      this.#clearRules();
      this.#showEmpty();
      this.refreshPseudoClassPanel();
      if (this.pageStyle) {
        this.pageStyle.off("stylesheet-updated", this.refreshPanel);
        this.pageStyle = null;
      }
      return;
    }

    const isProfilerActive = Services.profiler?.IsActive();
    const startTime = isProfilerActive ? ChromeUtils.now() : null;

    this.pageStyle = element.inspectorFront.pageStyle;
    this.pageStyle.on("stylesheet-updated", this.refreshPanel);

    // To figure out how shorthand properties are interpreted by the
    // engine, we will set properties on a dummy element and observe
    // how their .style attribute reflects them as computed values.
    try {
      // ::before and ::after do not have a namespaceURI
      const namespaceURI =
        this.element.namespaceURI ||
        this.styleDocument.documentElement.namespaceURI;
      this.#dummyElement = this.styleDocument.createElementNS(
        namespaceURI,
        this.element.tagName
      );
    } catch (e) {
      console.error("Error while creating dummy element", e);
    }

    const elementStyle = new ElementStyle(
      element,
      this,
      this.store,
      this.pageStyle,
      this.#showUserAgentStyles
    );
    this.elementStyle = elementStyle;

    this.#startSelectingElement();

    try {
      // Bug 2016127: This is historical, but unfortunately breaks some tests if removed
      await Promise.resolve(null);

      await this.#populate();
      if (this.elementStyle !== elementStyle) {
        return;
      }
      if (!refresh) {
        this.element.scrollTop = 0;
      }
      this.#stopSelectingElement();
      this.elementStyle.onChanged = () => {
        this.#onElementStyleChanged();
      };
      if (isProfilerActive && this.elementStyle.rules) {
        let declarations = 0;
        for (const rule of this.elementStyle.rules) {
          declarations += rule.textProps.length;
        }
        ChromeUtils.addProfilerMarker(
          "DevTools:CssRuleView.selectElement",
          startTime,
          `${declarations} CSS declarations in ${this.elementStyle.rules.length} rules`
        );
      }
    } catch (e) {
      if (this.elementStyle === elementStyle) {
        this.#stopSelectingElement();
        this.#clearRules();
      }
      console.error("Error while updating the rule view", e);
    }
  }

  /**
   * Update the rules for the currently highlighted element.
   */
  async refreshPanel() {
    // Ignore refreshes when the panel is hidden, or during editing or when no element is selected.
    if (!this.isPanelVisible() || this.isEditing || !this.elementStyle) {
      return;
    }

    // Repopulate the element style once the current modifications are done.
    const promises = [];
    for (const rule of this.elementStyle.rules) {
      if (rule.applyingModifications) {
        promises.push(rule.applyingModifications);
      }
    }

    await Promise.all(promises);
    await this.#populate();
  }

  /**
   * Clear the pseudo class options panel by removing the checked and disabled
   * attributes for each checkbox.
   */
  #clearPseudoClassPanel() {
    this.pseudoClassCheckboxes.forEach(checkbox => {
      checkbox.checked = false;
      checkbox.disabled = false;
    });
  }

  /**
   * For each item in PSEUDO_CLASSES, create a checkbox input element for toggling a
   * pseudo-class on the selected element and append it to the pseudo-class panel.
   *
   * Returns an array with the checkbox input elements for pseudo-classes.
   *
   * @return {Array}
   */
  #createPseudoClassCheckboxes() {
    const doc = this.styleDocument;
    const fragment = doc.createDocumentFragment();

    for (const pseudo of PSEUDO_CLASSES) {
      const label = doc.createElement("label");
      const checkbox = doc.createElement("input");
      checkbox.setAttribute("tabindex", "-1");
      checkbox.setAttribute("type", "checkbox");
      checkbox.setAttribute("value", pseudo);

      label.append(checkbox, pseudo);
      fragment.append(label);
    }

    this.pseudoClassPanel.append(fragment);
    return Array.from(
      this.pseudoClassPanel.querySelectorAll("input[type=checkbox]")
    );
  }

  /**
   * Update the pseudo class options for the currently highlighted element.
   */
  refreshPseudoClassPanel() {
    if (
      !this.elementStyle ||
      !this.inspector.canTogglePseudoClassForSelectedNode()
    ) {
      this.pseudoClassCheckboxes.forEach(checkbox => {
        checkbox.disabled = true;
      });
      return;
    }

    const pseudoClassLocks = this.elementStyle.element.pseudoClassLocks;
    this.pseudoClassCheckboxes.forEach(checkbox => {
      checkbox.disabled = false;
      checkbox.checked = pseudoClassLocks.includes(checkbox.value);
    });
  }

  async #populate() {
    try {
      const elementStyle = this.elementStyle;

      await this.elementStyle.populate();

      if (this.elementStyle !== elementStyle || this.isDestroyed) {
        return;
      }

      this.#clearRules();
      const onEditorsReady = this.#createEditors();
      this.refreshPseudoClassPanel();

      await onEditorsReady;

      // Notify anyone that cares that we refreshed.
      this.inspector.emit("rule-view-refreshed");
    } catch (e) {
      console.error("Exception while populating the rule view", e);
      throw e;
    }
  }

  /**
   * Show the user that the rule view has no node selected.
   */
  #showEmpty() {
    if (this.styleDocument.getElementById("ruleview-no-results")) {
      return;
    }

    createChild(this.element, "div", {
      id: "ruleview-no-results",
      class: "devtools-sidepanel-no-result",
      textContent: l10n("rule.empty"),
    });
  }

  /**
   * Clear the rules.
   */
  #clearRules() {
    this.element.innerHTML = "";
  }

  /**
   * Clear the rule view.
   */
  #clear(clearDom = true) {
    if (clearDom) {
      this.#clearRules();
    }
    this.viewedElement = null;

    if (this.elementStyle) {
      this.elementStyle.destroy();
      this.elementStyle = null;
    }

    if (this.pageStyle) {
      this.pageStyle.off("stylesheet-updated", this.refreshPanel);
      this.pageStyle = null;
    }
  }

  /**
   * Called when the user has made changes to the ElementStyle.
   * Emits an event that clients can listen to.
   */
  #onElementStyleChanged() {
    this.emit("ruleview-changed");
  }

  /**
   * Text for header that shows above rules for this element
   */
  #selectedElementLabel;
  get selectedElementLabel() {
    if (this.#selectedElementLabel) {
      return this.#selectedElementLabel;
    }
    this.#selectedElementLabel = l10n("rule.selectedElement");
    return this.#selectedElementLabel;
  }

  /**
   * Text for header that shows above rules for pseudo elements
   */
  #pseudoElementLabel;
  get pseudoElementLabel() {
    if (this.#pseudoElementLabel) {
      return this.#pseudoElementLabel;
    }
    this.#pseudoElementLabel = l10n("rule.pseudoElement");
    return this.#pseudoElementLabel;
  }

  #showPseudoElements;
  get showPseudoElements() {
    if (this.#showPseudoElements === undefined) {
      this.#showPseudoElements = Services.prefs.getBoolPref(
        "devtools.inspector.show_pseudo_elements"
      );
    }
    return this.#showPseudoElements;
  }

  /**
   * Creates an expandable container in the rule view
   *
   * @param  {string} label
   *         The label for the container header
   * @param  {string} containerId
   *         The id that will be set on the container
   * @param  {boolean} isPseudo
   *         Whether or not the container will hold pseudo element rules
   * @return {DOMNode} The container element
   */
  createExpandableContainer(label, containerId, isPseudo = false) {
    const header = this.styleDocument.createElementNS(HTML_NS, "div");
    header.classList.add(
      RULE_VIEW_HEADER_CLASSNAME,
      "ruleview-expandable-header"
    );
    header.setAttribute("role", "heading");

    const toggleButton = this.styleDocument.createElementNS(HTML_NS, "button");
    toggleButton.setAttribute(
      "title",
      l10n("rule.expandableContainerToggleButton.title")
    );
    toggleButton.setAttribute("aria-expanded", "true");
    toggleButton.setAttribute("aria-controls", containerId);

    const twisty = this.styleDocument.createElementNS(HTML_NS, "span");
    twisty.className = "ruleview-expander theme-twisty";

    toggleButton.append(twisty, this.styleDocument.createTextNode(label));
    header.append(toggleButton);

    const container = this.styleDocument.createElementNS(HTML_NS, "div");
    container.id = containerId;
    container.classList.add("ruleview-expandable-container");
    container.hidden = false;

    this.element.append(header, container);

    const { signal } = this.#abortController;
    toggleButton.addEventListener(
      "click",
      () => {
        this.#toggleContainerVisibility(
          toggleButton,
          container,
          isPseudo,
          !this.showPseudoElements
        );
      },
      { signal }
    );

    if (isPseudo) {
      this.#toggleContainerVisibility(
        toggleButton,
        container,
        isPseudo,
        this.showPseudoElements
      );
    }

    return container;
  }

  /**
   * Create the `@property` expandable container
   *
   * @returns {Element}
   */
  createRegisteredPropertiesExpandableContainer() {
    const el = this.createExpandableContainer(
      "@property",
      REGISTERED_PROPERTIES_CONTAINER_ID
    );
    el.classList.add("registered-properties");
    return el;
  }

  /**
   * Return the RegisteredPropertyEditor element for a given property name
   *
   * @param {string} registeredPropertyName
   * @returns {Element|null}
   */
  getRegisteredPropertyElement(registeredPropertyName) {
    return this.styleDocument.querySelector(
      `#${REGISTERED_PROPERTIES_CONTAINER_ID} [data-name="${registeredPropertyName}"]`
    );
  }

  /**
   * Toggle the visibility of an expandable container
   *
   * @param  {DOMNode}  twisty
   *         Clickable toggle DOM Node
   * @param  {DOMNode}  container
   *         Expandable container DOM Node
   * @param  {boolean}  isPseudo
   *         Whether or not the container will hold pseudo element rules
   * @param  {boolean}  showPseudo
   *         Whether or not pseudo element rules should be displayed
   */
  #toggleContainerVisibility(toggleButton, container, isPseudo, showPseudo) {
    let isOpen = toggleButton.getAttribute("aria-expanded") === "true";

    if (isPseudo) {
      this.#showPseudoElements = !!showPseudo;

      Services.prefs.setBoolPref(
        "devtools.inspector.show_pseudo_elements",
        this.showPseudoElements
      );

      container.hidden = !this.showPseudoElements;
      isOpen = !this.showPseudoElements;
    } else {
      container.hidden = !container.hidden;
    }

    toggleButton.setAttribute("aria-expanded", !isOpen);
  }

  /**
   * Creates editor UI for each of the rules in elementStyle.
   */
  // eslint-disable-next-line complexity
  #createEditors() {
    // Run through the current list of rules, attaching
    // their editors in order.  Create editors if needed.
    let lastInherited = null;
    let lastinheritedSectionLabel = "";
    let seenNormalElement = false;
    let seenSearchTerm = false;
    const containers = new Map();

    if (!this.elementStyle.rules) {
      return Promise.resolve();
    }

    const editorReadyPromises = [];
    for (const rule of this.elementStyle.rules) {
      // Initialize rule editor
      if (!rule.editor) {
        const ruleActorID = rule.domRule.actorID;
        rule.editor = new RuleEditor(this, rule, {
          elementsWithPendingClicks: this.#elementsWithPendingClicks,
          onShowUnusedCustomCssProperties: () => {
            this.store.expandedUnusedCustomCssPropertiesRuleActorIds.add(
              ruleActorID
            );
          },
          shouldHideUnusedCustomCssProperties:
            !this.store.expandedUnusedCustomCssPropertiesRuleActorIds.has(
              ruleActorID
            ),
        });
        editorReadyPromises.push(rule.editor.once("source-link-updated"));
      }

      // Filter the rules and highlight any matches if there is a search input
      if (this.searchValue && this.searchData) {
        if (this.highlightRule(rule)) {
          seenSearchTerm = true;
        } else if (rule.domRule.type !== ELEMENT_STYLE) {
          continue;
        }
      }

      const isNonInheritedPseudo = !!rule.pseudoElement && !rule.inherited;

      // Only print header for this element if there are pseudo elements
      if (
        containers.has(PSEUDO_ELEMENTS_CONTAINER_ID) &&
        !seenNormalElement &&
        !rule.pseudoElement
      ) {
        seenNormalElement = true;
        const div = this.styleDocument.createElementNS(HTML_NS, "div");
        div.className = RULE_VIEW_HEADER_CLASSNAME;
        div.setAttribute("role", "heading");
        div.textContent = this.selectedElementLabel;
        this.element.appendChild(div);
      }

      const { inherited, inheritedSectionLabel } = rule;
      // We need to check both `inherited` (a NodeFront) and `inheritedSectionLabel` (string),
      // as element-backed pseudo element rules (e.g. `::details-content`) can have the same
      // `inherited` property as a regular rule (e.g. on `<details>`), but the element is
      // to be considered as a child of the binding element.
      // e.g. we want to have
      // This element
      // Inherited by details::details-content
      // Inherited by details
      if (
        inherited &&
        (inherited !== lastInherited ||
          inheritedSectionLabel !== lastinheritedSectionLabel)
      ) {
        const div = this.styleDocument.createElementNS(HTML_NS, "div");
        div.classList.add(RULE_VIEW_HEADER_CLASSNAME);
        div.setAttribute("role", "heading");
        div.setAttribute("aria-level", "3");
        div.textContent = rule.inheritedSectionLabel;
        lastInherited = inherited;
        lastinheritedSectionLabel = inheritedSectionLabel;
        this.element.appendChild(div);
      }

      const keyframes = rule.keyframes;

      let containerKey = null;

      // Don't display inherited pseudo element rules (e.g. ::details-content) inside
      // the pseudo element container
      if (isNonInheritedPseudo) {
        containerKey = PSEUDO_ELEMENTS_CONTAINER_ID;
        if (!containers.has(containerKey)) {
          containers.set(
            containerKey,
            this.createExpandableContainer(
              this.pseudoElementLabel,
              containerKey,
              true
            )
          );
        }
      } else if (keyframes) {
        containerKey = keyframes;
        if (!containers.has(containerKey)) {
          containers.set(
            containerKey,
            this.createExpandableContainer(
              rule.keyframesName,
              `keyframes-container-${keyframes.name}`
            )
          );
        }
      } else if (rule.domRule.className === "CSSPositionTryRule") {
        containerKey = POSITION_TRY_CONTAINER_ID;
        if (!containers.has(containerKey)) {
          containers.set(
            containerKey,
            this.createExpandableContainer(
              `@position-try`,
              `position-try-container`
            )
          );
        }
      }

      rule.editor.element.setAttribute("role", "article");
      const container = containers.get(containerKey);
      if (container) {
        container.appendChild(rule.editor.element);
      } else {
        this.element.appendChild(rule.editor.element);
      }

      // Automatically select the selector input when we are adding a user-added rule
      if (this.#focusNextUserAddedRule && rule.domRule.userAdded) {
        this.#focusNextUserAddedRule = null;
        rule.editor.selectorText.click();
        this.emitForTests("new-rule-added", rule);
      }
    }

    const targetRegisteredProperties =
      this.getRegisteredPropertiesForSelectedNodeTarget();
    if (targetRegisteredProperties?.size) {
      const registeredPropertiesContainer =
        this.createRegisteredPropertiesExpandableContainer();

      // Sort properties by their name, as we want to display them in alphabetical order
      const propertyDefinitions = Array.from(
        targetRegisteredProperties.values()
      ).sort((a, b) => (a.name < b.name ? -1 : 1));
      for (const propertyDefinition of propertyDefinitions) {
        const registeredPropertyEditor = new RegisteredPropertyEditor(
          this,
          propertyDefinition
        );

        registeredPropertiesContainer.appendChild(
          registeredPropertyEditor.element
        );
      }
    }

    const searchBox = this.searchField.parentNode;
    searchBox.classList.toggle(
      "devtools-searchbox-no-match",
      this.searchValue && !seenSearchTerm
    );

    return Promise.all(editorReadyPromises);
  }

  /**
   * Highlight rules that matches the filter search value and returns a
   * boolean indicating whether or not rules were highlighted.
   *
   * @param  {Rule} rule
   *         The rule object we're highlighting if its rule selectors or
   *         property values match the search value.
   * @return {boolean} true if the rule was highlighted, false otherwise.
   */
  highlightRule(rule) {
    const isRuleSelectorHighlighted = this.#highlightRuleSelector(rule);
    const isStyleSheetHighlighted = this.#highlightStyleSheet(rule);
    const isAncestorRulesHighlighted = this.#highlightAncestorRules(rule);
    let isHighlighted =
      isRuleSelectorHighlighted ||
      isStyleSheetHighlighted ||
      isAncestorRulesHighlighted;

    // Highlight search matches in the rule properties
    for (const textProp of rule.textProps) {
      if (!textProp.invisible && this.#highlightProperty(textProp)) {
        isHighlighted = true;
      }
    }

    return isHighlighted;
  }

  /**
   * Highlights the rule selector that matches the filter search value and
   * returns a boolean indicating whether or not the selector was highlighted.
   *
   * @param  {Rule} rule
   *         The Rule object.
   * @return {boolean} true if the rule selector was highlighted,
   *         false otherwise.
   */
  #highlightRuleSelector(rule) {
    let isSelectorHighlighted = false;

    let selectorNodes = [...rule.editor.selectorText.childNodes];
    if (
      rule.domRule.type === CSSRule.KEYFRAME_RULE ||
      rule.domRule.className === "CSSPositionTryRule"
    ) {
      selectorNodes = [rule.editor.selectorText];
    } else if (rule.domRule.type === ELEMENT_STYLE) {
      selectorNodes = [];
    }

    // Highlight search matches in the rule selectors
    for (const selectorNode of selectorNodes) {
      const selector = selectorNode.textContent.toLowerCase();
      if (
        (this.searchData.strictSearchAllValues &&
          selector === this.searchData.strictSearchValue) ||
        (!this.searchData.strictSearchAllValues &&
          selector.includes(this.searchValue))
      ) {
        selectorNode.classList.add("ruleview-highlight");
        isSelectorHighlighted = true;
      }
    }

    return isSelectorHighlighted;
  }

  /**
   * Highlights the ancestor rules data (@media / @layer) that matches the filter search
   * value and returns a boolean indicating whether or not element was highlighted.
   *
   * @return {boolean} true if the element was highlighted, false otherwise.
   */
  #highlightAncestorRules(rule) {
    const element = rule.editor.ancestorDataEl;
    if (!element) {
      return false;
    }

    const ancestorSelectors = element.querySelectorAll(
      ".ruleview-rule-ancestor-selectorcontainer"
    );

    let isHighlighted = false;
    for (const child of ancestorSelectors) {
      const dataText = child.innerText.toLowerCase();
      const matches = this.searchData.strictSearchValue
        ? dataText === this.searchData.strictSearchValue
        : dataText.includes(this.searchValue);
      if (matches) {
        isHighlighted = true;
        child.classList.add("ruleview-highlight");
      }
    }

    return isHighlighted;
  }

  /**
   * Highlights the stylesheet source that matches the filter search value and
   * returns a boolean indicating whether or not the stylesheet source was
   * highlighted.
   *
   * @return {boolean} true if the stylesheet source was highlighted, false
   *         otherwise.
   */
  #highlightStyleSheet(rule) {
    const styleSheetSource = rule.title.toLowerCase();
    const isStyleSheetHighlighted = this.searchData.strictSearchValue
      ? styleSheetSource === this.searchData.strictSearchValue
      : styleSheetSource.includes(this.searchValue);

    if (isStyleSheetHighlighted && rule.editor.source) {
      rule.editor.source.classList.add("ruleview-highlight");
    }

    return isStyleSheetHighlighted;
  }

  /**
   * Highlights the rule properties and computed properties that match the
   * filter search value and returns a boolean indicating whether or not the
   * property or computed property was highlighted.
   *
   * @param  {TextProperty} textProperty
   *         The rule property.
   * @returns {boolean} true if the property or computed property was
   *         highlighted, false otherwise.
   */
  #highlightProperty(textProperty) {
    const isPropertyHighlighted = this.#highlightRuleProperty(textProperty);
    const isComputedHighlighted = this.#highlightComputedProperty(textProperty);

    // Expand the computed list if a computed property is highlighted and the
    // property rule is not highlighted
    if (
      !isPropertyHighlighted &&
      isComputedHighlighted &&
      !textProperty.editor.computed.hasAttribute("user-open")
    ) {
      textProperty.editor.expandForFilter();
    }

    return isPropertyHighlighted || isComputedHighlighted;
  }

  /**
   * Called when TextPropertyEditor is updated and updates the rule property
   * highlight.
   *
   * @param  {TextPropertyEditor} editor
   *         The rule property TextPropertyEditor object.
   */
  updatePropertyHighlight(editor) {
    if (!this.searchValue || !this.searchData) {
      return;
    }

    this.#clearHighlight(editor.element);

    if (this.#highlightProperty(editor.prop)) {
      this.searchField.classList.remove("devtools-style-searchbox-no-match");
    }
  }

  /**
   * Highlights the rule property that matches the filter search value
   * and returns a boolean indicating whether or not the property was
   * highlighted.
   *
   * @param  {TextProperty} textProperty
   *         The rule property object.
   * @returns {boolean} true if the rule property was highlighted,
   *         false otherwise.
   */
  #highlightRuleProperty(textProperty) {
    const propertyName = textProperty.name.toLowerCase();
    // Get the actual property value displayed in the rule view if we have an editor for
    // it (that might not be the case for unused CSS custom properties).
    const propertyValue = textProperty.editor
      ? textProperty.editor.valueSpan.textContent.toLowerCase()
      : textProperty.value.toLowerCase();

    return this.#highlightMatches({
      element: textProperty.editor?.container,
      propertyName,
      propertyValue,
      textProperty,
    });
  }

  /**
   * Highlights the computed property that matches the filter search value and
   * returns a boolean indicating whether or not the computed property was
   * highlighted.
   *
   * @param  {TextProperty} textProperty
   *         The rule property object.
   * @returns {boolean} true if the computed property was highlighted, false
   *         otherwise.
   */
  #highlightComputedProperty(textProperty) {
    if (!textProperty.editor) {
      return false;
    }

    let isComputedHighlighted = false;

    // Highlight search matches in the computed list of properties
    textProperty.editor.populateComputed();
    for (const computed of textProperty.computed) {
      if (computed.element) {
        // Get the actual property value displayed in the computed list
        const computedName = computed.name.toLowerCase();
        const computedValue = computed.parsedValue.toLowerCase();

        isComputedHighlighted = this.#highlightMatches({
          element: computed.element,
          propertyName: computedName,
          propertyValue: computedValue,
          textProperty,
        })
          ? true
          : isComputedHighlighted;
      }
    }

    return isComputedHighlighted;
  }

  /**
   * Helper function for highlightRules that carries out highlighting the given
   * element if the search terms match the property, and returns a boolean
   * indicating whether or not the search terms match.
   *
   * @param  {object} options
   * @param  {DOMNode} options.element
   *         The node to highlight if search terms match
   * @param  {string} options.propertyName
   *         The property name of a rule
   * @param  {string} options.propertyValue
   *         The property value of a rule
   * @param  {TextProperty} options.textProperty
   *         The text property that we may highlight. It's helpful in cases we don't have
   *         an element yet (e.g. if the property is a hidden unused variable)
   * @return {boolean} true if the given search terms match the property, false
   *         otherwise.
   */
  #highlightMatches({ element, propertyName, propertyValue, textProperty }) {
    const {
      searchPropertyName,
      searchPropertyValue,
      searchPropertyMatch,
      strictSearchPropertyName,
      strictSearchPropertyValue,
      strictSearchAllValues,
    } = this.searchData;
    let matches = false;

    // If the inputted search value matches a property line like
    // `font-family: arial`, then check to make sure the name and value match.
    // Otherwise, just compare the inputted search string directly against the
    // name and value of the rule property.
    const hasNameAndValue =
      searchPropertyMatch && searchPropertyName && searchPropertyValue;
    const isMatch = (value, query, isStrict) => {
      return isStrict ? value === query : query && value.includes(query);
    };

    if (hasNameAndValue) {
      matches =
        isMatch(propertyName, searchPropertyName, strictSearchPropertyName) &&
        isMatch(propertyValue, searchPropertyValue, strictSearchPropertyValue);
    } else {
      matches =
        isMatch(
          propertyName,
          searchPropertyName,
          strictSearchPropertyName || strictSearchAllValues
        ) ||
        isMatch(
          propertyValue,
          searchPropertyValue,
          strictSearchPropertyValue || strictSearchAllValues
        );
    }

    if (!matches) {
      return false;
    }

    // We might not have an element when the prop is an unused custom css property.
    if (!element && textProperty?.isUnusedVariable) {
      const editor =
        textProperty.rule.editor.showUnusedCssVariable(textProperty);

      // The editor couldn't be created, bail (shouldn't happen)
      if (!editor) {
        return false;
      }

      element = editor.container;
    }

    element.classList.add("ruleview-highlight");

    return true;
  }

  /**
   * Clear all search filter highlights in the panel, and close the computed
   * list if toggled opened
   */
  #clearHighlight(element) {
    for (const el of element.querySelectorAll(".ruleview-highlight")) {
      el.classList.remove("ruleview-highlight");
    }

    for (const computed of element.querySelectorAll(
      ".ruleview-computedlist[filter-open]"
    )) {
      computed.parentNode._textPropertyEditor.collapseForFilter();
    }
  }

  /**
   * Called when the pseudo class panel button is clicked and toggles
   * the display of the pseudo class panel.
   */
  #onTogglePseudoClassPanel = () => {
    if (this.pseudoClassPanel.hidden) {
      this.showPseudoClassPanel();
    } else {
      this.hidePseudoClassPanel();
    }
  };

  showPseudoClassPanel() {
    this.hideClassPanel();

    this.pseudoClassToggle.setAttribute("aria-pressed", "true");
    this.pseudoClassCheckboxes.forEach(checkbox => {
      checkbox.setAttribute("tabindex", "0");
    });
    this.pseudoClassPanel.hidden = false;
  }

  hidePseudoClassPanel() {
    this.pseudoClassToggle.setAttribute("aria-pressed", "false");
    this.pseudoClassCheckboxes.forEach(checkbox => {
      checkbox.setAttribute("tabindex", "-1");
    });
    this.pseudoClassPanel.hidden = true;
  }

  /**
   * Called when a pseudo class checkbox is clicked and toggles
   * the pseudo class for the current selected element.
   */
  #onTogglePseudoClass = event => {
    const target = event.target;
    this.inspector.togglePseudoClass(target.value);
  };

  /**
   * Called when the class panel button is clicked and toggles the display of the class
   * panel.
   */
  #onToggleClassPanel = () => {
    if (this.classPanel.hidden) {
      this.showClassPanel();
    } else {
      this.hideClassPanel();
    }
  };

  showClassPanel() {
    this.hidePseudoClassPanel();

    this.classToggle.setAttribute("aria-pressed", "true");
    this.classPanel.hidden = false;

    this.classListPreviewer.focusAddClassField();
  }

  hideClassPanel() {
    this.classToggle.setAttribute("aria-pressed", "false");
    this.classPanel.hidden = true;
  }

  /**
   * Handle the keypress event in the rule view.
   */
  #onShortcut(name, event) {
    if (!event.target.closest("#sidebar-panel-ruleview")) {
      return;
    }

    if (name === "CmdOrCtrl+F") {
      this.searchField.focus();
      event.preventDefault();
    } else if (
      (name === "Return" || name === "Space") &&
      this.element.classList.contains("non-interactive")
    ) {
      event.preventDefault();
    } else if (
      name === "Escape" &&
      event.target === this.searchField &&
      this.#onClearSearch()
    ) {
      // Handle the search box's keypress event. If the escape key is pressed,
      // clear the search box field.
      event.preventDefault();
      event.stopPropagation();
    }
  }

  #onToggleLightColorSchemeSimulation = async () => {
    const shouldSimulateLightScheme =
      this.colorSchemeLightSimulationButton.getAttribute("aria-pressed") !==
      "true";

    this.colorSchemeLightSimulationButton.setAttribute(
      "aria-pressed",
      shouldSimulateLightScheme
    );

    this.colorSchemeDarkSimulationButton.setAttribute("aria-pressed", "false");

    await this.inspector.commands.targetConfigurationCommand.updateConfiguration(
      {
        colorSchemeSimulation: shouldSimulateLightScheme ? "light" : null,
      }
    );
    // Refresh the current element's rules in the panel.
    this.refreshPanel();
  };

  #onToggleDarkColorSchemeSimulation = async () => {
    const shouldSimulateDarkScheme =
      this.colorSchemeDarkSimulationButton.getAttribute("aria-pressed") !==
      "true";

    this.colorSchemeDarkSimulationButton.setAttribute(
      "aria-pressed",
      shouldSimulateDarkScheme
    );

    this.colorSchemeLightSimulationButton.setAttribute("aria-pressed", "false");

    await this.inspector.commands.targetConfigurationCommand.updateConfiguration(
      {
        colorSchemeSimulation: shouldSimulateDarkScheme ? "dark" : null,
      }
    );
    // Refresh the current element's rules in the panel.
    this.refreshPanel();
  };

  #onTogglePrintSimulation = async () => {
    const enabled =
      this.printSimulationButton.getAttribute("aria-pressed") !== "true";
    this.printSimulationButton.setAttribute("aria-pressed", enabled);
    await this.inspector.commands.targetConfigurationCommand.updateConfiguration(
      {
        printSimulationEnabled: enabled,
      }
    );
    // Refresh the current element's rules in the panel.
    this.refreshPanel();
  };

  /**
   * Temporarily flash the given element.
   *
   * @param  {Element} element
   *         The element.
   * @returns {Promise} Promise that resolves after the element was flashed-out
   */
  #flashMutationCallback;
  #flashElement(element) {
    flashElementOn(element, {
      backgroundClass: "theme-bg-contrast",
    });

    if (this.#flashMutationCallback) {
      this.#flashMutationCallback();
    }

    return new Promise(resolve => {
      this.#flashMutationCallback = () => {
        flashElementOff(element, {
          backgroundClass: "theme-bg-contrast",
        });
        this.#flashMutationCallback = null;
        resolve();
      };

      setTimeout(this.#flashMutationCallback, PROPERTY_FLASHING_DURATION);
    });
  }

  /**
   * Scrolls to the top of either the rule or declaration. The view will try to scroll to
   * the rule if both can fit in the viewport. If not, then scroll to the declaration.
   *
   * @param  {Element} rule
   *         The rule to scroll to.
   * @param  {Element|null} declaration
   *         Optional. The declaration to scroll to.
   * @param  {string} scrollBehavior
   *         Optional. The transition animation when scrolling. If prefers-reduced-motion
   *         system pref is set, then the scroll behavior will be overridden to "instant".
   */
  #scrollToElement(rule, declaration, scrollBehavior = "smooth") {
    let elementToScrollTo = rule;

    if (declaration) {
      const { offsetTop, offsetHeight } = declaration;
      // Get the distance between both the rule and declaration. If the distance is
      // greater than the height of the rule view, then only scroll to the declaration.
      const distance = offsetTop + offsetHeight - rule.offsetTop;

      if (this.element.parentNode.offsetHeight <= distance) {
        elementToScrollTo = declaration;
      }
    }

    // Ensure that smooth scrolling is disabled when the user prefers reduced motion.
    const win = elementToScrollTo.ownerGlobal;
    const reducedMotion = win.matchMedia("(prefers-reduced-motion)").matches;
    scrollBehavior = reducedMotion ? "instant" : scrollBehavior;
    elementToScrollTo.scrollIntoView({
      behavior: scrollBehavior,
    });
  }

  /**
   * Toggles the visibility of the pseudo element rule's container.
   */
  #togglePseudoElementRuleContainer() {
    const container = this.styleDocument.getElementById(
      PSEUDO_ELEMENTS_CONTAINER_ID
    );
    const toggle = this.styleDocument.querySelector(
      `[aria-controls="${PSEUDO_ELEMENTS_CONTAINER_ID}"]`
    );
    this.#toggleContainerVisibility(toggle, container, true, true);
  }

  /**
   * Returns whether or not the rule is in the view
   *
   * @param  {StyleRuleFront} ruleFront
   * @returns {boolean}
   */
  hasRule(ruleFront) {
    return this.rules.some(r => r.domRule === ruleFront);
  }

  /**
   * Finds the specified TextProperty name in the rule view. If found, scroll to and
   * flash the TextProperty.
   *
   * @param  {string} name
   *         The property name to scroll to and highlight.
   * @param  {object} options
   * @param  {StyleRuleFront|undefined} options.ruleFront
   *         An optional StyleRuleFront. When this is set, we will only look for the property
   *         in this exact rule.
   * @param  {Function|undefined} options.ruleValidator
   *         An optional function that can be used to filter out rules we shouldn't look
   *         into to find the property name. The function is called with a Rule object,
   *         and the rule will be skipped if the function returns a falsy value.
   * @param  {true|undefined} options.focusValue
   *         An optional boolean that indicate that the declaration value should be focused.
   *         If false (the default value), the declaration name will be focused.
   * @returns {boolean} true if the TextProperty name is found, and false otherwise.
   */
  highlightProperty = async (
    name,
    { ruleValidator, ruleFront, focusValue = false } = {}
  ) => {
    // First, let's clear any search we might have, as the property could be hidden
    this.#onClearSearch({ focusSearchField: false });

    if (ruleFront) {
      const rule = this.rules.find(r => r.domRule === ruleFront);
      if (!rule) {
        console.error("Unable to find a rule for actor", ruleFront);
        return false;
      }

      const highlighted = await this.#maybeHighlightPropertyInRule({
        name,
        rule,
        ruleValidator,
        // If ruleFront is passed, we might need to highlight a declaration that is actually
        // overridden  (e.g. when calling this from a  "matched selector" item in the
        // computed panel).
        matchOverridden: true,
        focusValue,
      });
      if (!highlighted) {
        console.error("Unable to highlight rule", name, rule);
        return false;
      }

      return true;
    }

    for (const rule of this.rules) {
      if (
        await this.#maybeHighlightPropertyInRule({
          name,
          rule,
          ruleValidator,
          focusValue,
        })
      ) {
        return true;
      }
    }
    // If the property is a CSS variable and we didn't find its declaration, it might
    // be a registered property
    if (this.#maybeHighlightCssRegisteredProperty(name)) {
      return true;
    }

    return false;
  };

  /**
   * Finds the specified TextProperty name in a specific rule. If found, scroll to it and
   * flash/focus the TextProperty.
   *
   * @param  {object} options
   * @param  {string} options.name
   *         The property name to scroll to and highlight.
   * @param  {Rule} options.rule
   *         The rule to find the property into
   * @param  {Function|undefined} options.ruleValidator
   *         An optional function that can be used to filter out rules we shouldn't look
   *         into to find the property name. The function is called with a Rule object,
   *         and the rule will be skipped if the function returns a falsy value.
   * @param  {boolean|undefined} options.matchOverridden
   *         If true, the declaration will be considered even if it is overridden.
   * @param {string} options.scrollBehavior
   *        An optional string that will be used as `scrollIntoView` `behavior` option.
   *        Note that this will be overridden to "instant" if the user prefers reduced motion.
   * @param  {true|undefined} options.focusValue
   *         An optional boolean that indicate that the declaration value should be focused.
   *         If false (the default value), the declaration name will be focused.
   * @returns {boolean} true if the TextProperty name is found, and false otherwise.
   */
  async #maybeHighlightPropertyInRule({
    name,
    rule,
    ruleValidator,
    matchOverridden = false,
    focusValue = false,
  }) {
    const hasRuleValidator = typeof ruleValidator === "function";
    if (hasRuleValidator && !ruleValidator(rule)) {
      return false;
    }

    let matchingTextPropComputed;
    // hasHigherPriorityThanEarlierProp (that we use in the loop), is expecting
    // the props to be iterated through in reverse.
    const textProps = rule.textProps.toReversed();
    for (const textProp of textProps) {
      for (const computed of textProp.computed) {
        if (
          computed.name === name &&
          !textProp.invisible &&
          textProp.enabled &&
          (!computed.overridden || matchOverridden) &&
          (!matchingTextPropComputed ||
            this.elementStyle.hasHigherPriorityThanEarlierProp(
              computed,
              matchingTextPropComputed
            ))
        ) {
          matchingTextPropComputed = computed;
        }
      }
    }

    if (!matchingTextPropComputed) {
      return false;
    }

    await this.#selectRuleViewIfNeeded();

    let scrollBehavior;

    // If the property is being applied by a pseudo element rule, expand the pseudo
    // element list container.
    if (rule.pseudoElement.length && !this.showPseudoElements) {
      // Set the scroll behavior to "instant" to avoid timing issues between toggling
      // the pseudo element container and scrolling smoothly to the rule.
      scrollBehavior = "instant";
      this.#togglePseudoElementRuleContainer();
    }

    const textProp = matchingTextPropComputed.textProp;

    // If we're jumping to an unused CSS variable, it might not be visible, so show
    // it here.
    if (!textProp.editor && textProp.isUnusedVariable) {
      textProp.rule.editor.showUnusedCssVariable(textProp);
    }

    // If the textProp is a shorthand, we need to expand the computed list so we can
    // highlight the proper element.
    const isTextPropAShorthand =
      textProp.name !== matchingTextPropComputed.name;
    if (isTextPropAShorthand) {
      textProp.editor.expandForFilter();
    }

    this.#highlightElementInRule({
      rule,
      elementToHighlight: isTextPropAShorthand
        ? // if the prop is a shorthand, we hand to highlight the exact longhand property
          matchingTextPropComputed.element
        : textProp.editor.element,
      elementToFocus: focusValue
        ? textProp.editor.valueSpan
        : textProp.editor.nameSpan,
      scrollBehavior,
    });
    return true;
  }

  /**
   * If the passed name matches a registered CSS property highlight it
   *
   * @param {string} name - The name of the registered property to highlight
   * @param {string} scrollBehavior - An optional string that will be used as
   *        `scrollIntoView` `behavior` option.
   *        Note that this will be overridden to "instant" if the user prefers reduced motion.
   * @returns {boolean} Returns true if `name` matched a registered property
   */
  #maybeHighlightCssRegisteredProperty(name, scrollBehavior) {
    if (!name.startsWith("--")) {
      return false;
    }

    // Get a potential @property section
    const propertyContainer = this.styleDocument.getElementById(
      REGISTERED_PROPERTIES_CONTAINER_ID
    );
    if (!propertyContainer) {
      return false;
    }

    const propertyEl = propertyContainer.querySelector(`[data-name="${name}"]`);
    if (!propertyEl) {
      return false;
    }

    const toggle = this.styleDocument.querySelector(
      `[aria-controls="${REGISTERED_PROPERTIES_CONTAINER_ID}"]`
    );
    if (toggle.ariaExpanded === "false") {
      this.#toggleContainerVisibility(toggle, propertyContainer);
    }

    this.#highlightElementInRule({
      elementToHighlight: propertyEl,
      scrollBehavior,
    });
    return true;
  }

  /**
   * Highlight a given element in a rule editor
   *
   * @param {object} options
   * @param {Rule} options.rule
   *        The rule the element to highlight is in.
   * @param {Element} options.elementToHighlight
   *        The element to highlight.
   * @param {Element} options.elementToFocus
   *        An optional element to focus.
   * @param {string} options.scrollBehavior
   *        An optional string that will be used as `scrollIntoView` `behavior` option.
   *        Note that this will be overridden to "instant" if the user prefers reduced motion.
   */
  async #highlightElementInRule({
    rule,
    elementToHighlight,
    elementToFocus,
    scrollBehavior,
  }) {
    if (rule) {
      this.#scrollToElement(
        rule.editor.selectorText,
        elementToHighlight,
        scrollBehavior
      );
    } else {
      this.#scrollToElement(elementToHighlight, null, scrollBehavior);
    }

    if (elementToFocus) {
      elementToFocus.focus({
        focusVisible: true,
        // Don't scroll when focusing, this is taken care of by the call to #scrollToElement
        preventScroll: true,
      });
    }

    await this.#flashElement(elementToHighlight);
    this.emitForTests("element-highlighted", elementToHighlight);
  }

  /**
   * Returns a Map (keyed by name) of the registered
   * properties for the currently selected node document.
   *
   * @returns Map<String, Object>|null
   */
  getRegisteredPropertiesForSelectedNodeTarget() {
    return this.cssRegisteredPropertiesByTarget.get(
      this.inspector.selection.nodeFront.targetFront
    );
  }

  async #selectRuleViewIfNeeded() {
    // If three-pane mode is enable, or if the rule view is already the currently selected
    // tab, there's no need to do anything.
    if (
      this.inspector.isThreePaneModeEnabled ||
      this.inspector.sidebar.getCurrentTabID() === "ruleview"
    ) {
      return;
    }

    // Otherwise, we need to select the ruleview from the sidebar. This will update the
    // panel, so we need to wait for it be populatedr
    const onRefreshed = this.inspector.once("rule-view-refreshed");
    await this.inspector.sidebar.select("ruleview");
    await onRefreshed;
  }
}

class RuleViewTool {
  constructor(inspector, window) {
    this.inspector = inspector;
    this.document = window.document;

    this.view = new CssRuleView(this.inspector, this.document);

    this.refresh = this.refresh.bind(this);
    this.onDetachedFront = this.onDetachedFront.bind(this);
    this.onPanelSelected = this.onPanelSelected.bind(this);
    this.onDetachedFront = this.onDetachedFront.bind(this);
    this.onSelected = this.onSelected.bind(this);

    this.#abortController = new window.AbortController();
    const { signal } = this.#abortController;
    const baseEventConfig = { signal };

    this.inspector.selection.on(
      "detached-front",
      this.onDetachedFront,
      baseEventConfig
    );
    this.inspector.selection.on(
      "new-node-front",
      this.onSelected,
      baseEventConfig
    );
    this.inspector.selection.on("pseudoclass", this.refresh, baseEventConfig);
    this.inspector.ruleViewSideBar.on(
      "ruleview-selected",
      this.onPanelSelected,
      baseEventConfig
    );
    this.inspector.sidebar.on(
      "ruleview-selected",
      this.onPanelSelected,
      baseEventConfig
    );
    this.inspector.toolbox.on(
      "inspector-selected",
      this.onPanelSelected,
      baseEventConfig
    );
    this.inspector.styleChangeTracker.on(
      "style-changed",
      this.refresh,
      baseEventConfig
    );

    this.inspector.commands.resourceCommand.watchResources(
      [
        this.inspector.commands.resourceCommand.TYPES.DOCUMENT_EVENT,
        this.inspector.commands.resourceCommand.TYPES.STYLESHEET,
      ],
      {
        onAvailable: this.#onResourceAvailable,
        ignoreExistingResources: true,
      }
    );

    // We do want to get already existing registered properties, so we need to watch
    // them separately
    this.inspector.commands.resourceCommand
      .watchResources(
        [
          this.inspector.commands.resourceCommand.TYPES
            .CSS_REGISTERED_PROPERTIES,
        ],
        {
          onAvailable: this.#onResourceAvailable,
          onUpdated: this.#onResourceUpdated,
          onDestroyed: this.#onResourceDestroyed,
          ignoreExistingResources: false,
        }
      )
      .catch(e => {
        // watchResources is async and even making it's resulting promise part of
        // this.readyPromise still causes test failures, so simply ignore the rejection
        // if the view was already destroyed.
        if (!this.view) {
          return;
        }
        throw e;
      });

    // At the moment `readyPromise` is only consumed in tests (see `openRuleView`) to be
    // notified when the ruleview was first populated to match the initial selected node.
    this.readyPromise = this.onSelected();
  }

  #abortController;

  isPanelVisible() {
    if (!this.view) {
      return false;
    }
    return this.view.isPanelVisible();
  }

  onDetachedFront() {
    this.onSelected(false);
  }

  async onSelected(selectElement = true) {
    // Ignore the event if the view has been destroyed, or if it's inactive.
    // But only if the current selection isn't null. If it's been set to null,
    // let the update go through as this is needed to empty the view on
    // navigation.
    if (!this.view) {
      return;
    }

    const isInactive =
      !this.isPanelVisible() && this.inspector.selection.nodeFront;
    if (isInactive) {
      return;
    }

    if (
      !this.inspector.selection.isConnected() ||
      !this.inspector.selection.isElementNode()
    ) {
      this.view.selectElement(null);
      return;
    }

    if (!selectElement) {
      return;
    }

    const done = this.inspector.updating("rule-view");
    try {
      await this.view.selectElement(this.inspector.selection.nodeFront);
    } finally {
      done();
    }
  }

  refresh() {
    if (this.isPanelVisible()) {
      this.view.refreshPanel();
    }
  }

  #onResourceAvailable = resources => {
    if (!this.inspector) {
      return;
    }

    let hasNewStylesheet = false;
    const addedRegisteredProperties = [];
    for (const resource of resources) {
      if (
        resource.resourceType ===
          this.inspector.commands.resourceCommand.TYPES.DOCUMENT_EVENT &&
        resource.name === "will-navigate"
      ) {
        this.view.cssRegisteredPropertiesByTarget.delete(resource.targetFront);
        if (resource.targetFront.isTopLevel) {
          this.clearUserProperties();
        }
        continue;
      }

      if (
        resource.resourceType ===
          this.inspector.commands.resourceCommand.TYPES.STYLESHEET &&
        // resource.isNew is only true when the stylesheet was added from DevTools,
        // for example when adding a rule in the rule view. In such cases, we're already
        // updating the rule view, so ignore those.
        !resource.isNew
      ) {
        hasNewStylesheet = true;
      }

      if (
        resource.resourceType ===
        this.inspector.commands.resourceCommand.TYPES.CSS_REGISTERED_PROPERTIES
      ) {
        if (
          !this.view.cssRegisteredPropertiesByTarget.has(resource.targetFront)
        ) {
          this.view.cssRegisteredPropertiesByTarget.set(
            resource.targetFront,
            new Map()
          );
        }
        this.view.cssRegisteredPropertiesByTarget
          .get(resource.targetFront)
          .set(resource.name, resource);
        // Only add properties from the same target as the selected node
        if (
          this.view.inspector.selection?.nodeFront?.targetFront ===
          resource.targetFront
        ) {
          addedRegisteredProperties.push(resource);
        }
      }
    }

    if (addedRegisteredProperties.length) {
      // Retrieve @property container
      let registeredPropertiesContainer =
        this.view.styleDocument.getElementById(
          REGISTERED_PROPERTIES_CONTAINER_ID
        );
      // create it if it didn't exist before
      if (!registeredPropertiesContainer) {
        registeredPropertiesContainer =
          this.view.createRegisteredPropertiesExpandableContainer();
      }

      // Then add all new registered properties
      const names = new Set();
      for (const propertyDefinition of addedRegisteredProperties) {
        const editor = new RegisteredPropertyEditor(
          this.view,
          propertyDefinition
        );
        names.add(propertyDefinition.name);

        // We need to insert the element at the right position so we keep the list of
        // properties alphabetically sorted.
        let referenceNode = null;
        for (const child of registeredPropertiesContainer.children) {
          if (child.getAttribute("data-name") > propertyDefinition.name) {
            referenceNode = child;
            break;
          }
        }
        registeredPropertiesContainer.insertBefore(
          editor.element,
          referenceNode
        );
      }

      // Finally, update textProps that might rely on those new properties
      this.#updateElementStyleRegisteredProperties(names);
    }

    if (hasNewStylesheet) {
      this.refresh();
    }
  };

  #onResourceUpdated = updates => {
    const updatedProperties = [];
    for (const update of updates) {
      if (
        update.resource.resourceType ===
        this.inspector.commands.resourceCommand.TYPES.CSS_REGISTERED_PROPERTIES
      ) {
        const { resource } = update;
        if (
          !this.view.cssRegisteredPropertiesByTarget.has(resource.targetFront)
        ) {
          continue;
        }

        this.view.cssRegisteredPropertiesByTarget
          .get(resource.targetFront)
          .set(resource.name, resource);

        // Only consider properties from the same target as the selected node
        if (
          this.view.inspector.selection?.nodeFront?.targetFront ===
          resource.targetFront
        ) {
          updatedProperties.push(resource);
        }
      }
    }

    const names = new Set();
    if (updatedProperties.length) {
      const registeredPropertiesContainer =
        this.view.styleDocument.getElementById(
          REGISTERED_PROPERTIES_CONTAINER_ID
        );
      for (const resource of updatedProperties) {
        // Replace the existing registered property editor element with a new one,
        // so we don't have to compute which elements should be updated.
        const name = resource.name;
        const el = this.view.getRegisteredPropertyElement(name);
        const editor = new RegisteredPropertyEditor(this.view, resource);
        registeredPropertiesContainer.replaceChild(editor.element, el);

        names.add(resource.name);
      }
      // Finally, update textProps that might rely on those new properties
      this.#updateElementStyleRegisteredProperties(names);
    }
  };

  #onResourceDestroyed = resources => {
    const destroyedPropertiesNames = new Set();
    for (const resource of resources) {
      if (
        resource.resourceType ===
        this.inspector.commands.resourceCommand.TYPES.CSS_REGISTERED_PROPERTIES
      ) {
        if (
          !this.view.cssRegisteredPropertiesByTarget.has(resource.targetFront)
        ) {
          continue;
        }

        const targetRegisteredProperties =
          this.view.cssRegisteredPropertiesByTarget.get(resource.targetFront);
        const resourceName = Array.from(
          targetRegisteredProperties.entries()
        ).find(
          ([_, propDef]) => propDef.resourceId === resource.resourceId
        )?.[0];
        if (!resourceName) {
          continue;
        }

        targetRegisteredProperties.delete(resourceName);

        // Only consider properties from the same target as the selected node
        if (
          this.view.inspector.selection?.nodeFront?.targetFront ===
          resource.targetFront
        ) {
          destroyedPropertiesNames.add(resourceName);
        }
      }
    }
    if (destroyedPropertiesNames.size > 0) {
      for (const name of destroyedPropertiesNames) {
        this.view.getRegisteredPropertyElement(name)?.remove();
      }
      // Finally, update textProps that were relying on those removed properties
      this.#updateElementStyleRegisteredProperties(destroyedPropertiesNames);
    }
  };

  /**
   * Update rules that reference registered properties whose name is in the passed Set,
   * so the `var()` tooltip has up-to-date information.
   *
   * @param {Set<string>} registeredPropertyNames
   */
  #updateElementStyleRegisteredProperties(registeredPropertyNames) {
    if (!this.view.elementStyle) {
      return;
    }
    this.view.elementStyle.onRegisteredPropertiesChange(
      registeredPropertyNames
    );
  }

  clearUserProperties() {
    if (this.view && this.view.store && this.view.store.userProperties) {
      this.view.store.userProperties.clear();
    }
  }

  onPanelSelected() {
    if (this.inspector.selection.nodeFront === this.view.viewedElement) {
      this.refresh();
    } else {
      this.onSelected();
    }
  }

  destroy() {
    if (this.#abortController) {
      this.#abortController.abort();
    }

    this.inspector.commands.resourceCommand.unwatchResources(
      [
        this.inspector.commands.resourceCommand.TYPES.DOCUMENT_EVENT,
        this.inspector.commands.resourceCommand.TYPES.STYLESHEET,
      ],
      {
        onAvailable: this.#onResourceAvailable,
      }
    );

    this.inspector.commands.resourceCommand.unwatchResources(
      [this.inspector.commands.resourceCommand.TYPES.CSS_REGISTERED_PROPERTIES],
      {
        onAvailable: this.#onResourceAvailable,
        onUpdated: this.#onResourceUpdated,
        onDestroyed: this.#onResourceDestroyed,
      }
    );

    this.view.destroy();

    this.view =
      this.document =
      this.inspector =
      this.readyPromise =
      this.store =
      this.#abortController =
        null;
  }
}

exports.CssRuleView = CssRuleView;
exports.RuleViewTool = RuleViewTool;
