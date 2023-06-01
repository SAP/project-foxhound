/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const { l10n } = require("resource://devtools/shared/inspector/css-logic.js");
const {
  PSEUDO_CLASSES,
} = require("resource://devtools/shared/css/constants.js");
const {
  style: { ELEMENT_STYLE },
} = require("resource://devtools/shared/constants.js");
const Rule = require("resource://devtools/client/inspector/rules/models/rule.js");
const {
  InplaceEditor,
  editableField,
  editableItem,
} = require("resource://devtools/client/shared/inplace-editor.js");
const TextPropertyEditor = require("resource://devtools/client/inspector/rules/views/text-property-editor.js");
const {
  createChild,
  blurOnMultipleProperties,
  promiseWarn,
} = require("resource://devtools/client/inspector/shared/utils.js");
const {
  parseNamedDeclarations,
  parsePseudoClassesAndAttributes,
  SELECTOR_ATTRIBUTE,
  SELECTOR_ELEMENT,
  SELECTOR_PSEUDO_CLASS,
} = require("resource://devtools/shared/css/parsing-utils.js");
const EventEmitter = require("resource://devtools/shared/event-emitter.js");
const CssLogic = require("resource://devtools/shared/inspector/css-logic.js");

loader.lazyRequireGetter(
  this,
  "Tools",
  "resource://devtools/client/definitions.js",
  true
);

const STYLE_INSPECTOR_PROPERTIES =
  "devtools/shared/locales/styleinspector.properties";
const { LocalizationHelper } = require("resource://devtools/shared/l10n.js");
const STYLE_INSPECTOR_L10N = new LocalizationHelper(STYLE_INSPECTOR_PROPERTIES);

/**
 * RuleEditor is responsible for the following:
 *   Owns a Rule object and creates a list of TextPropertyEditors
 *     for its TextProperties.
 *   Manages creation of new text properties.
 *
 * @param {CssRuleView} ruleView
 *        The CssRuleView containg the document holding this rule editor.
 * @param {Rule} rule
 *        The Rule object we're editing.
 */
function RuleEditor(ruleView, rule) {
  EventEmitter.decorate(this);

  this.ruleView = ruleView;
  this.doc = this.ruleView.styleDocument;
  this.toolbox = this.ruleView.inspector.toolbox;
  this.telemetry = this.toolbox.telemetry;
  this.rule = rule;

  this.isEditable = !rule.isSystem;
  // Flag that blocks updates of the selector and properties when it is
  // being edited
  this.isEditing = false;

  this._onNewProperty = this._onNewProperty.bind(this);
  this._newPropertyDestroy = this._newPropertyDestroy.bind(this);
  this._onSelectorDone = this._onSelectorDone.bind(this);
  this._locationChanged = this._locationChanged.bind(this);
  this.updateSourceLink = this.updateSourceLink.bind(this);
  this._onToolChanged = this._onToolChanged.bind(this);
  this._updateLocation = this._updateLocation.bind(this);
  this._onSourceClick = this._onSourceClick.bind(this);

  this.rule.domRule.on("location-changed", this._locationChanged);
  this.toolbox.on("tool-registered", this._onToolChanged);
  this.toolbox.on("tool-unregistered", this._onToolChanged);

  this._create();
}

RuleEditor.prototype = {
  destroy() {
    this.rule.domRule.off("location-changed");
    this.toolbox.off("tool-registered", this._onToolChanged);
    this.toolbox.off("tool-unregistered", this._onToolChanged);

    if (this._unsubscribeSourceMap) {
      this._unsubscribeSourceMap();
    }
  },

  get sourceMapURLService() {
    if (!this._sourceMapURLService) {
      // sourceMapURLService is a lazy getter in the toolbox.
      this._sourceMapURLService = this.toolbox.sourceMapURLService;
    }

    return this._sourceMapURLService;
  },

  get isSelectorEditable() {
    const trait =
      this.isEditable &&
      this.rule.domRule.type !== ELEMENT_STYLE &&
      this.rule.domRule.type !== CSSRule.KEYFRAME_RULE;

    // Do not allow editing anonymousselectors until we can
    // detect mutations on  pseudo elements in Bug 1034110.
    return trait && !this.rule.elementStyle.element.isAnonymous;
  },

  _create() {
    this.element = this.doc.createElement("div");
    this.element.className = "ruleview-rule devtools-monospace";
    this.element.dataset.ruleId = this.rule.domRule.actorID;
    this.element.setAttribute("uneditable", !this.isEditable);
    this.element.setAttribute("unmatched", this.rule.isUnmatched);
    this.element._ruleEditor = this;

    // Give a relative position for the inplace editor's measurement
    // span to be placed absolutely against.
    this.element.style.position = "relative";

    // Add the source link.
    this.source = createChild(this.element, "div", {
      class: "ruleview-rule-source theme-link",
    });
    this.source.addEventListener("click", this._onSourceClick);

    const sourceLabel = this.doc.createElement("span");
    sourceLabel.classList.add("ruleview-rule-source-label");
    this.source.appendChild(sourceLabel);

    this.updateSourceLink();

    if (this.rule.domRule.ancestorData.length) {
      const parts = this.rule.domRule.ancestorData.map(
        (ancestorData, index) => {
          if (ancestorData.type == "container") {
            const container = this.doc.createElement("li");
            container.classList.add("container-query");
            container.setAttribute("data-ancestor-index", index);

            createChild(container, "span", {
              class: "container-query-declaration",
              textContent: `@container${
                ancestorData.containerName
                  ? " " + ancestorData.containerName
                  : ""
              }`,
            });

            container.classList.add("has-tooltip");

            const jumpToNodeButton = createChild(container, "button", {
              class: "open-inspector",
              title: l10n("rule.containerQuery.selectContainerButton.tooltip"),
            });

            let containerNodeFront;
            const getNodeFront = async () => {
              if (!containerNodeFront) {
                const res = await this.rule.domRule.getQueryContainerForNode(
                  index,
                  this.rule.inherited ||
                    this.ruleView.inspector.selection.nodeFront
                );
                containerNodeFront = res.node;
              }
              return containerNodeFront;
            };

            jumpToNodeButton.addEventListener("click", async () => {
              const front = await getNodeFront();
              if (!front) {
                return;
              }
              this.ruleView.inspector.selection.setNodeFront(front);
              await this.ruleView.inspector.highlighters.hideHighlighterType(
                this.ruleView.inspector.highlighters.TYPES.BOXMODEL
              );
            });
            container.append(jumpToNodeButton);

            container.addEventListener("mouseenter", async () => {
              const front = await getNodeFront();
              if (!front) {
                return;
              }

              await this.ruleView.inspector.highlighters.showHighlighterTypeForNode(
                this.ruleView.inspector.highlighters.TYPES.BOXMODEL,
                front
              );
            });
            container.addEventListener("mouseleave", async () => {
              await this.ruleView.inspector.highlighters.hideHighlighterType(
                this.ruleView.inspector.highlighters.TYPES.BOXMODEL
              );
            });

            createChild(container, "span", {
              // Add a space between the container name (or @container if there's no name)
              // and the query so the title, which is computed from the DOM, displays correctly.
              textContent: " " + ancestorData.containerQuery,
            });
            return container;
          }
          if (ancestorData.type == "layer") {
            return `@layer${
              ancestorData.value ? " " + ancestorData.value : ""
            }`;
          }
          if (ancestorData.type == "media") {
            return `@media ${ancestorData.value}`;
          }

          if (ancestorData.type == "supports") {
            return `@supports ${ancestorData.conditionText}`;
          }
          // We shouldn't get here as `type` can only be set to "container", "layer", "media"
          // or "supports" (see devtools/server/actors/style-rule form()),
          // but just in case, let's return an empty string.
          console.warn("Unknown ancestor data type:", ancestorData.type);
          return ``;
        }
      );

      this.ancestorDataEl = createChild(this.element, "ul", {
        class: "ruleview-rule-ancestor-data theme-link",
      });

      for (const part of parts) {
        if (typeof part == "string") {
          createChild(this.ancestorDataEl, "li", {
            textContent: part,
          });
        } else {
          this.ancestorDataEl.append(part);
        }
      }
    }

    const code = createChild(this.element, "div", {
      class: "ruleview-code",
    });

    const header = createChild(code, "div", {});

    this.selectorText = createChild(header, "span", {
      class: "ruleview-selectorcontainer",
      tabindex: this.isSelectorEditable ? "0" : "-1",
    });

    if (this.isSelectorEditable) {
      this.selectorText.addEventListener("click", event => {
        // Clicks within the selector shouldn't propagate any further.
        event.stopPropagation();
      });

      editableField({
        element: this.selectorText,
        done: this._onSelectorDone,
        cssProperties: this.rule.cssProperties,
      });
    }

    if (this.rule.domRule.type !== CSSRule.KEYFRAME_RULE) {
      let selector = "";
      if (this.rule.domRule.selectors) {
        // This is a "normal" rule with a selector.
        selector = this.rule.domRule.selectors.join(", ");
        // Otherwise, the rule is either inherited or inline, and selectors will
        // be computed on demand when the highlighter is requested.
      }

      const isHighlighted = this.ruleView.isSelectorHighlighted(selector);
      // Handling of click events is delegated to CssRuleView.handleEvent()
      createChild(header, "span", {
        class:
          "ruleview-selectorhighlighter js-toggle-selector-highlighter" +
          (isHighlighted ? " highlighted" : ""),
        "data-selector": selector,
        title: l10n("rule.selectorHighlighter.tooltip"),
      });
    }

    this.openBrace = createChild(header, "span", {
      class: "ruleview-ruleopen",
      textContent: " {",
    });

    this.propertyList = createChild(code, "ul", {
      class: "ruleview-propertylist",
    });

    this.populate();

    this.closeBrace = createChild(code, "div", {
      class: "ruleview-ruleclose",
      tabindex: this.isEditable ? "0" : "-1",
      textContent: "}",
    });

    if (this.isEditable) {
      // A newProperty editor should only be created when no editor was
      // previously displayed. Since the editors are cleared on blur,
      // check this.ruleview.isEditing on mousedown
      this._ruleViewIsEditing = false;

      code.addEventListener("mousedown", () => {
        this._ruleViewIsEditing = this.ruleView.isEditing;
      });

      code.addEventListener("click", event => {
        const selection = this.doc.defaultView.getSelection();
        if (selection.isCollapsed && !this._ruleViewIsEditing) {
          this.newProperty();
        }
        // Cleanup the _ruleViewIsEditing flag
        this._ruleViewIsEditing = false;
      });

      this.element.addEventListener("mousedown", () => {
        this.doc.defaultView.focus();
      });

      // Create a property editor when the close brace is clicked.
      editableItem({ element: this.closeBrace }, () => {
        this.newProperty();
      });
    }
  },

  /**
   * Called when a tool is registered or unregistered.
   */
  _onToolChanged() {
    // When the source editor is registered, update the source links
    // to be clickable; and if it is unregistered, update the links to
    // be unclickable.  However, some links are never clickable, so
    // filter those out first.
    if (this.source.getAttribute("unselectable") === "permanent") {
      // Nothing.
    } else if (this.toolbox.isToolRegistered("styleeditor")) {
      this.source.removeAttribute("unselectable");
    } else {
      this.source.setAttribute("unselectable", "true");
    }
  },

  /**
   * Event handler called when a property changes on the
   * StyleRuleActor.
   */
  _locationChanged() {
    this.updateSourceLink();
  },

  _onSourceClick() {
    if (this.source.hasAttribute("unselectable")) {
      return;
    }

    const { inspector } = this.ruleView;
    if (Tools.styleEditor.isToolSupported(inspector.toolbox)) {
      inspector.toolbox.viewSourceInStyleEditorByResource(
        this.rule.sheet,
        this.rule.ruleLine,
        this.rule.ruleColumn
      );
    }
  },

  /**
   * Update the text of the source link to reflect whether we're showing
   * original sources or not.  This is a callback for
   * SourceMapURLService.subscribeByID, which see.
   *
   * @param {Object | null} originalLocation
   *        The original position object (url/line/column) or null.
   */
  _updateLocation(originalLocation) {
    let displayURL = this.rule.sheet?.href;
    const constructed = this.rule.sheet?.constructed;
    let line = this.rule.ruleLine;
    if (originalLocation) {
      displayURL = originalLocation.url;
      line = originalLocation.line;
    }

    let sourceTextContent = CssLogic.shortSource({
      constructed,
      href: displayURL,
    });
    let title = displayURL ? displayURL : sourceTextContent;
    if (line > 0) {
      sourceTextContent += ":" + line;
      title += ":" + line;
    }

    const sourceLabel = this.element.querySelector(
      ".ruleview-rule-source-label"
    );
    sourceLabel.setAttribute("title", title);
    sourceLabel.textContent = sourceTextContent;
  },

  updateSourceLink() {
    if (this.rule.isSystem) {
      const sourceLabel = this.element.querySelector(
        ".ruleview-rule-source-label"
      );
      const title = this.rule.title;
      const sourceHref = this.rule.sheet?.href || title;

      const uaLabel = STYLE_INSPECTOR_L10N.getStr("rule.userAgentStyles");
      sourceLabel.textContent = uaLabel + " " + title;

      // Special case about:PreferenceStyleSheet, as it is generated on the
      // fly and the URI is not registered with the about: handler.
      // https://bugzilla.mozilla.org/show_bug.cgi?id=935803#c37
      if (sourceHref === "about:PreferenceStyleSheet") {
        this.source.setAttribute("unselectable", "permanent");
        sourceLabel.textContent = uaLabel;
        sourceLabel.removeAttribute("title");
      }
    } else {
      this._updateLocation(null);
    }

    if (
      this.rule.sheet &&
      !this.rule.isSystem &&
      this.rule.domRule.type !== ELEMENT_STYLE
    ) {
      // Only get the original source link if the rule isn't a system
      // rule and if it isn't an inline rule.
      if (this._unsubscribeSourceMap) {
        this._unsubscribeSourceMap();
      }
      this._unsubscribeSourceMap = this.sourceMapURLService.subscribeByID(
        this.rule.sheet.resourceId,
        this.rule.ruleLine,
        this.rule.ruleColumn,
        this._updateLocation
      );
      // Set "unselectable" appropriately.
      this._onToolChanged();
    } else if (this.rule.domRule.type === ELEMENT_STYLE) {
      this.source.setAttribute("unselectable", "permanent");
    } else {
      // Set "unselectable" appropriately.
      this._onToolChanged();
    }

    Promise.resolve().then(() => {
      this.emit("source-link-updated");
    });
  },

  /**
   * Update the rule editor with the contents of the rule.
   *
   * @param {Boolean} reset
   *        True to completely reset the rule editor before populating.
   */
  populate(reset) {
    // Clear out existing viewers.
    while (this.selectorText.hasChildNodes()) {
      this.selectorText.removeChild(this.selectorText.lastChild);
    }

    // If selector text comes from a css rule, highlight selectors that
    // actually match.  For custom selector text (such as for the 'element'
    // style, just show the text directly.
    if (this.rule.domRule.type === ELEMENT_STYLE) {
      this.selectorText.textContent = this.rule.selectorText;
    } else if (this.rule.domRule.type === CSSRule.KEYFRAME_RULE) {
      this.selectorText.textContent = this.rule.domRule.keyText;
    } else {
      this.rule.domRule.selectors.forEach((selector, i) => {
        if (i !== 0) {
          createChild(this.selectorText, "span", {
            class: "ruleview-selector-separator",
            textContent: ", ",
          });
        }

        const containerClass =
          this.rule.matchedSelectors.indexOf(selector) > -1
            ? "ruleview-selector-matched"
            : "ruleview-selector-unmatched";
        const selectorContainer = createChild(this.selectorText, "span", {
          class: containerClass,
        });

        const parsedSelector = parsePseudoClassesAndAttributes(selector);

        for (const selectorText of parsedSelector) {
          let selectorClass = "";

          switch (selectorText.type) {
            case SELECTOR_ATTRIBUTE:
              selectorClass = "ruleview-selector-attribute";
              break;
            case SELECTOR_ELEMENT:
              selectorClass = "ruleview-selector";
              break;
            case SELECTOR_PSEUDO_CLASS:
              selectorClass = PSEUDO_CLASSES.some(
                pseudo => selectorText.value === pseudo
              )
                ? "ruleview-selector-pseudo-class-lock"
                : "ruleview-selector-pseudo-class";
              break;
            default:
              break;
          }

          createChild(selectorContainer, "span", {
            textContent: selectorText.value,
            class: selectorClass,
          });
        }
      });
    }

    if (reset) {
      while (this.propertyList.hasChildNodes()) {
        this.propertyList.removeChild(this.propertyList.lastChild);
      }
    }

    for (const prop of this.rule.textProps) {
      if (!prop.editor && !prop.invisible) {
        const editor = new TextPropertyEditor(this, prop);
        this.propertyList.appendChild(editor.element);
      } else if (prop.editor) {
        // If an editor already existed, append it to the bottom now to make sure the
        // order of editors in the DOM follow the order of the rule's properties.
        this.propertyList.appendChild(prop.editor.element);
      }
    }
  },

  /**
   * Programatically add a new property to the rule.
   *
   * @param {String} name
   *        Property name.
   * @param {String} value
   *        Property value.
   * @param {String} priority
   *        Property priority.
   * @param {Boolean} enabled
   *        True if the property should be enabled.
   * @param {TextProperty} siblingProp
   *        Optional, property next to which the new property will be added.
   * @return {TextProperty}
   *        The new property
   */
  addProperty(name, value, priority, enabled, siblingProp) {
    const prop = this.rule.createProperty(
      name,
      value,
      priority,
      enabled,
      siblingProp
    );
    const index = this.rule.textProps.indexOf(prop);
    const editor = new TextPropertyEditor(this, prop);

    // Insert this node before the DOM node that is currently at its new index
    // in the property list.  There is currently one less node in the DOM than
    // in the property list, so this causes it to appear after siblingProp.
    // If there is no node at its index, as is the case where this is the last
    // node being inserted, then this behaves as appendChild.
    this.propertyList.insertBefore(
      editor.element,
      this.propertyList.children[index]
    );

    return prop;
  },

  /**
   * Programatically add a list of new properties to the rule.  Focus the UI
   * to the proper location after adding (either focus the value on the
   * last property if it is empty, or create a new property and focus it).
   *
   * @param {Array} properties
   *        Array of properties, which are objects with this signature:
   *        {
   *          name: {string},
   *          value: {string},
   *          priority: {string}
   *        }
   * @param {TextProperty} siblingProp
   *        Optional, the property next to which all new props should be added.
   */
  addProperties(properties, siblingProp) {
    if (!properties || !properties.length) {
      return;
    }

    let lastProp = siblingProp;
    for (const p of properties) {
      const isCommented = Boolean(p.commentOffsets);
      const enabled = !isCommented;
      lastProp = this.addProperty(
        p.name,
        p.value,
        p.priority,
        enabled,
        lastProp
      );
    }

    // Either focus on the last value if incomplete, or start a new one.
    if (lastProp && lastProp.value.trim() === "") {
      lastProp.editor.valueSpan.click();
    } else {
      this.newProperty();
    }
  },

  /**
   * Create a text input for a property name.  If a non-empty property
   * name is given, we'll create a real TextProperty and add it to the
   * rule.
   */
  newProperty() {
    // If we're already creating a new property, ignore this.
    if (!this.closeBrace.hasAttribute("tabindex")) {
      return;
    }

    // While we're editing a new property, it doesn't make sense to
    // start a second new property editor, so disable focusing the
    // close brace for now.
    this.closeBrace.removeAttribute("tabindex");

    this.newPropItem = createChild(this.propertyList, "li", {
      class: "ruleview-property ruleview-newproperty",
    });

    this.newPropSpan = createChild(this.newPropItem, "span", {
      class: "ruleview-propertyname",
      tabindex: "0",
    });

    this.multipleAddedProperties = null;

    this.editor = new InplaceEditor({
      element: this.newPropSpan,
      done: this._onNewProperty,
      destroy: this._newPropertyDestroy,
      advanceChars: ":",
      contentType: InplaceEditor.CONTENT_TYPES.CSS_PROPERTY,
      popup: this.ruleView.popup,
      cssProperties: this.rule.cssProperties,
    });

    // Auto-close the input if multiple rules get pasted into new property.
    this.editor.input.addEventListener(
      "paste",
      blurOnMultipleProperties(this.rule.cssProperties)
    );
  },

  /**
   * Called when the new property input has been dismissed.
   *
   * @param {String} value
   *        The value in the editor.
   * @param {Boolean} commit
   *        True if the value should be committed.
   */
  _onNewProperty(value, commit) {
    if (!value || !commit) {
      return;
    }

    // parseDeclarations allows for name-less declarations, but in the present
    // case, we're creating a new declaration, it doesn't make sense to accept
    // these entries
    this.multipleAddedProperties = parseNamedDeclarations(
      this.rule.cssProperties.isKnown,
      value,
      true
    );

    // Blur the editor field now and deal with adding declarations later when
    // the field gets destroyed (see _newPropertyDestroy)
    this.editor.input.blur();

    this.telemetry.recordEvent("edit_rule", "ruleview");
  },

  /**
   * Called when the new property editor is destroyed.
   * This is where the properties (type TextProperty) are actually being
   * added, since we want to wait until after the inplace editor `destroy`
   * event has been fired to keep consistent UI state.
   */
  _newPropertyDestroy() {
    // We're done, make the close brace focusable again.
    this.closeBrace.setAttribute("tabindex", "0");

    this.propertyList.removeChild(this.newPropItem);
    delete this.newPropItem;
    delete this.newPropSpan;

    // If properties were added, we want to focus the proper element.
    // If the last new property has no value, focus the value on it.
    // Otherwise, start a new property and focus that field.
    if (this.multipleAddedProperties && this.multipleAddedProperties.length) {
      this.addProperties(this.multipleAddedProperties);
    }
  },

  /**
   * Called when the selector's inplace editor is closed.
   * Ignores the change if the user pressed escape, otherwise
   * commits it.
   *
   * @param {String} value
   *        The value contained in the editor.
   * @param {Boolean} commit
   *        True if the change should be applied.
   * @param {Number} direction
   *        The move focus direction number.
   */
  async _onSelectorDone(value, commit, direction) {
    if (
      !commit ||
      this.isEditing ||
      value === "" ||
      value === this.rule.selectorText
    ) {
      return;
    }

    const ruleView = this.ruleView;
    const elementStyle = ruleView._elementStyle;
    const element = elementStyle.element;

    this.isEditing = true;

    // Remove highlighter for the previous selector.
    if (this.ruleView.isSelectorHighlighted(this.rule.selectorText)) {
      await this.ruleView.toggleSelectorHighlighter(this.rule.selectorText);
    }

    try {
      const response = await this.rule.domRule.modifySelector(element, value);

      // We recompute the list of applied styles, because editing a
      // selector might cause this rule's position to change.
      const applied = await elementStyle.pageStyle.getApplied(element, {
        inherited: true,
        matchedSelectors: true,
        filter: elementStyle.showUserAgentStyles ? "ua" : undefined,
      });

      this.isEditing = false;

      const { ruleProps, isMatching } = response;
      if (!ruleProps) {
        // Notify for changes, even when nothing changes,
        // just to allow tests being able to track end of this request.
        ruleView.emit("ruleview-invalid-selector");
        return;
      }

      ruleProps.isUnmatched = !isMatching;
      const newRule = new Rule(elementStyle, ruleProps);
      const editor = new RuleEditor(ruleView, newRule);
      const rules = elementStyle.rules;

      let newRuleIndex = applied.findIndex(r => r.rule == ruleProps.rule);
      const oldIndex = rules.indexOf(this.rule);

      // If the selector no longer matches, then we leave the rule in
      // the same relative position.
      if (newRuleIndex === -1) {
        newRuleIndex = oldIndex;
      }

      // Remove the old rule and insert the new rule.
      rules.splice(oldIndex, 1);
      rules.splice(newRuleIndex, 0, newRule);
      elementStyle._changed();
      elementStyle.onRuleUpdated();

      // We install the new editor in place of the old -- you might
      // think we would replicate the list-modification logic above,
      // but that is complicated due to the way the UI installs
      // pseudo-element rules and the like.
      this.element.parentNode.replaceChild(editor.element, this.element);

      editor._moveSelectorFocus(direction);
    } catch (err) {
      this.isEditing = false;
      promiseWarn(err);
    }
  },

  /**
   * Handle moving the focus change after a tab or return keypress in the
   * selector inplace editor.
   *
   * @param {Number} direction
   *        The move focus direction number.
   */
  _moveSelectorFocus(direction) {
    if (!direction || direction === Services.focus.MOVEFOCUS_BACKWARD) {
      return;
    }

    if (this.rule.textProps.length) {
      this.rule.textProps[0].editor.nameSpan.click();
    } else {
      this.propertyList.click();
    }
  },
};

module.exports = RuleEditor;
