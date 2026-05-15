/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const {
  l10n,
  l10nFormatStr,
} = require("resource://devtools/shared/inspector/css-logic.js");
const {
  InplaceEditor,
  editableField,
} = require("resource://devtools/client/shared/inplace-editor.js");
const {
  createChild,
  appendText,
  advanceValidate,
  blurOnMultipleProperties,
} = require("resource://devtools/client/inspector/shared/utils.js");
const { throttle } = require("resource://devtools/shared/throttle.js");
const {
  style: { ELEMENT_STYLE },
} = require("resource://devtools/shared/constants.js");
const {
  canPointerEventDrag,
} = require("resource://devtools/client/shared/events.js");

loader.lazyRequireGetter(
  this,
  ["parseDeclarations", "parseSingleValue"],
  "resource://devtools/shared/css/parsing-utils.js",
  true
);
loader.lazyRequireGetter(
  this,
  "findCssSelector",
  "resource://devtools/shared/inspector/css-logic.js",
  true
);
loader.lazyGetter(this, "PROPERTY_NAME_INPUT_LABEL", function () {
  return l10n("rule.propertyName.label");
});
loader.lazyGetter(this, "SHORTHAND_EXPANDER_TOOLTIP", function () {
  return l10n("rule.shorthandExpander.tooltip");
});

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  AppConstants: "resource://gre/modules/AppConstants.sys.mjs",
});

const HTML_NS = "http://www.w3.org/1999/xhtml";

const SHARED_SWATCH_CLASS = "inspector-swatch";
const COLOR_SWATCH_CLASS = "inspector-colorswatch";
const BEZIER_SWATCH_CLASS = "inspector-bezierswatch";
const LINEAR_EASING_SWATCH_CLASS = "inspector-lineareasingswatch";
const FILTER_SWATCH_CLASS = "inspector-filterswatch";
const ANGLE_SWATCH_CLASS = "inspector-angleswatch";
const FONT_FAMILY_CLASS = "ruleview-font-family";
const SHAPE_SWATCH_CLASS = "inspector-shapeswatch";

/*
 * An actionable element is an element which on click triggers a specific action
 * (e.g. shows a color tooltip, opens a link, …).
 */
const ACTIONABLE_ELEMENTS_SELECTORS = [
  `.${COLOR_SWATCH_CLASS}`,
  `.${BEZIER_SWATCH_CLASS}`,
  `.${LINEAR_EASING_SWATCH_CLASS}`,
  `.${FILTER_SWATCH_CLASS}`,
  `.${ANGLE_SWATCH_CLASS}`,
  "a",
];

/*
 * Speeds at which we update the value when the user is dragging its mouse
 * over a value.
 */
const SLOW_DRAGGING_SPEED = 0.1;
const DEFAULT_DRAGGING_SPEED = 1;
const FAST_DRAGGING_SPEED = 10;

// Deadzone in pixels where dragging should not update the value.
const DRAGGING_DEADZONE_DISTANCE = 5;

const DRAGGABLE_VALUE_CLASSNAME = "ruleview-propertyvalue-draggable";
const IS_DRAGGING_CLASSNAME = "ruleview-propertyvalue-dragging";

/**
 * TextPropertyEditor is responsible for the following:
 *   Owns a TextProperty object.
 *   Manages changes to the TextProperty.
 *   Can be expanded to display computed properties.
 *   Can mark a property disabled or enabled.
 *
 * @param {RuleEditor} ruleEditor
 *        The rule editor that owns this TextPropertyEditor.
 * @param {TextProperty} property
 *        The text property to edit.
 * @param {object} options
 * @param {Set} options.elementsWithPendingClicks
 */
class TextPropertyEditor {
  constructor(ruleEditor, property, options) {
    this.ruleEditor = ruleEditor;
    this.ruleView = this.ruleEditor.ruleView;
    this.cssProperties = this.ruleView.cssProperties;
    this.doc = this.ruleEditor.doc;
    this.popup = this.ruleView.popup;
    this.prop = property;
    this.prop.editor = this;
    this.browserWindow = this.doc.defaultView.top;
    this.#elementsWithPendingClicks = options.elementsWithPendingClicks;

    this.toolbox = this.ruleView.inspector.toolbox;
    this.telemetry = this.toolbox.telemetry;

    this.#onValidate = this.ruleView.debounce(this.#previewValue, 10, this);

    this.#createUI();
    this.update();
  }

  #populatedComputed = false;
  #hasPendingClick = false;
  #clickedElementOptions = null;
  #populatedShorthandOverridden;
  #elementsWithPendingClicks;

  #colorSwatchSpans;
  #bezierSwatchSpans;
  #linearEasingSwatchSpans;

  #onValidate;
  #isDragging = false;
  #capturingPointerId = null;
  #hasDragged = false;
  #draggingController = null;
  #draggingValueCache = null;

  /**
   * Boolean indicating if the name or value is being currently edited.
   */
  get editing() {
    return (
      !!(
        this.nameSpan.inplaceEditor ||
        this.valueSpan.inplaceEditor ||
        this.ruleView.tooltips.isEditing
      ) || this.popup.isOpen
    );
  }

  /**
   * Get the rule to the current text property
   */
  get rule() {
    return this.prop.rule;
  }

  // Exposed for tests.
  get _DRAGGING_DEADZONE_DISTANCE() {
    return DRAGGING_DEADZONE_DISTANCE;
  }

  /**
   * Create the property editor's DOM.
   */
  #createUI() {
    const win = this.doc.defaultView;
    this.abortController = new win.AbortController();

    this.element = this.doc.createElementNS(HTML_NS, "div");
    this.element.setAttribute("role", "listitem");
    this.element.classList.add("ruleview-property");
    this.element.dataset.declarationId = this.prop.id;
    this.element._textPropertyEditor = this;

    this.container = createChild(this.element, "div", {
      class: "ruleview-propertycontainer",
    });

    const indent =
      ((this.ruleEditor.rule.domRule.ancestorData.length || 0) + 1) * 2;
    createChild(this.container, "span", {
      class: "ruleview-rule-indent clipboard-only",
      textContent: " ".repeat(indent),
    });

    // The enable checkbox will disable or enable the rule.
    this.enable = createChild(this.container, "input", {
      type: "checkbox",
      class: "ruleview-enableproperty",
      title: l10nFormatStr("rule.propertyToggle.label", this.prop.name),
    });

    this.nameContainer = createChild(this.container, "span", {
      class: "ruleview-namecontainer",
    });

    // Property name, editable when focused.  Property name
    // is committed when the editor is unfocused.
    this.nameSpan = createChild(this.nameContainer, "span", {
      class: "ruleview-propertyname theme-fg-color3",
      tabindex: this.ruleEditor.isEditable ? "0" : "-1",
      id: this.prop.id,
    });

    appendText(this.nameContainer, ": ");

    // Create a span that will hold the property and semicolon.
    // Use this span to create a slightly larger click target
    // for the value.
    this.valueContainer = createChild(this.container, "span", {
      class: "ruleview-propertyvaluecontainer",
    });

    // Property value, editable when focused.  Changes to the
    // property value are applied as they are typed, and reverted
    // if the user presses escape.
    this.valueSpan = createChild(this.valueContainer, "span", {
      class: "ruleview-propertyvalue theme-fg-color1",
      tabindex: this.ruleEditor.isEditable ? "0" : "-1",
    });

    // Storing the TextProperty on the elements for easy access
    // (for instance by the tooltip)
    this.valueSpan.textProperty = this.prop;
    this.nameSpan.textProperty = this.prop;

    appendText(this.valueContainer, ";");

    // This needs to be called after valueContainer, nameSpan and valueSpan are created.
    if (this.#shouldShowComputedExpander) {
      this.#createComputedExpander();
    }

    if (this.#shouldShowWarning) {
      this.#createWarningIcon();
    }

    if (this.#isInvalidAtComputedValueTime()) {
      this.#createInvalidAtComputedValueTimeIcon();
    }

    if (this.#shouldShowInactiveCssState) {
      this.#createInactiveCssWarningIcon();
    }

    if (this.#shouldShowFilterProperty) {
      this.#createFilterPropertyButton();
    }

    // Only bind event handlers if the rule is editable.
    if (this.ruleEditor.isEditable) {
      this.enable.addEventListener("click", this.#onEnableClicked, {
        signal: this.abortController.signal,
        capture: true,
      });
      this.enable.addEventListener("change", this.#onEnableChanged, {
        signal: this.abortController.signal,
        capture: true,
      });

      this.nameContainer.addEventListener(
        "click",
        event => {
          // Clicks within the name shouldn't propagate any further.
          event.stopPropagation();

          // Forward clicks on nameContainer to the editable nameSpan
          if (event.target === this.nameContainer) {
            this.nameSpan.click();
          }
        },
        { signal: this.abortController.signal }
      );

      const getCssVariables = () =>
        this.rule.elementStyle.getAllCustomProperties(this.rule.pseudoElement);

      editableField({
        start: this.#onStartEditing,
        element: this.nameSpan,
        done: this.#onNameDone,
        destroy: this.updateUI,
        advanceChars: ":",
        contentType: InplaceEditor.CONTENT_TYPES.CSS_PROPERTY,
        popup: this.popup,
        cssProperties: this.cssProperties,
        getCssVariables,
        // (Shift+)Tab will move the focus to the previous/next editable field (so property value
        // or new selector).
        focusEditableFieldAfterApply: true,
        focusEditableFieldContainerSelector: ".ruleview-rule",
        // We don't want Enter to trigger the next editable field, just to validate
        // what the user entered, close the editor, and focus the span so the user can
        // navigate with the keyboard as expected, unless the user has
        // devtools.inspector.rule-view.focusNextOnEnter set to true
        stopOnReturn: this.ruleView.inplaceEditorFocusNextOnEnter !== true,
        inputAriaLabel: PROPERTY_NAME_INPUT_LABEL,
      });

      // Auto blur name field on multiple CSS rules get pasted in.
      this.nameContainer.addEventListener(
        "paste",
        blurOnMultipleProperties(this.cssProperties),
        { signal: this.abortController.signal }
      );

      this.valueContainer.addEventListener(
        "click",
        async event => {
          // Clicks within the value shouldn't propagate any further.
          event.stopPropagation();

          // Forward clicks on valueContainer to the editable valueSpan
          if (event.target === this.valueContainer) {
            this.valueSpan.click();
          }

          if (event.target.classList.contains("ruleview-variable-link")) {
            const isRuleInStartingStyle =
              this.ruleEditor.rule.isInStartingStyle();
            const rulePseudoElement = this.ruleEditor.rule.pseudoElement;
            await this.ruleView.highlightProperty(
              event.target.dataset.variableName,
              {
                ruleValidator: rule => {
                  // If the associated rule is not in starting style, the variable
                  // definition can't be in a starting style rule.
                  // Note that if the rule is in starting style, then the variable
                  // definition might be in a starting style rule, or in a regular one.
                  if (!isRuleInStartingStyle && rule.isInStartingStyle()) {
                    return false;
                  }

                  if (
                    rule.pseudoElement &&
                    rulePseudoElement !== rule.pseudoElement
                  ) {
                    return false;
                  }

                  return true;
                },
              }
            );
          }
        },
        { signal: this.abortController.signal }
      );

      // The mousedown event could trigger a blur event on nameContainer, which
      // will trigger a call to the update function. The update function clears
      // valueSpan's markup. Thus the regular click event does not bubble up, and
      // listener's callbacks are not called.
      // So we need to remember where the user clicks in order to re-trigger the click
      // after the valueSpan's markup is re-populated. We only need to track this for
      // valueSpan's child elements, because direct click on valueSpan will always
      // trigger a click event.
      this.valueSpan.addEventListener(
        "mousedown",
        event => {
          const clickedEl = event.target;
          if (clickedEl === this.valueSpan) {
            return;
          }
          this.#hasPendingClick = true;
          this.#elementsWithPendingClicks.add(this.valueSpan);

          const matchedSelector = ACTIONABLE_ELEMENTS_SELECTORS.find(selector =>
            clickedEl.matches(selector)
          );
          if (matchedSelector) {
            const similarElements = [
              ...this.valueSpan.querySelectorAll(matchedSelector),
            ];
            this.#clickedElementOptions = {
              selector: matchedSelector,
              index: similarElements.indexOf(clickedEl),
            };
          }
        },
        { signal: this.abortController.signal }
      );

      this.valueSpan.addEventListener(
        "pointerup",
        () => {
          // if we have dragged, we will handle the pending click in #draggingOnPointerUp instead
          if (this.#hasDragged) {
            return;
          }
          this.#clickedElementOptions = null;
          this.#hasPendingClick = false;
          this.#elementsWithPendingClicks.delete(this.valueSpan);
        },
        { signal: this.abortController.signal }
      );

      this.ruleView.on(
        "draggable-preference-updated",
        this.#onDraggablePreferenceChanged,
        { signal: this.abortController.signal }
      );
      if (this.#isDraggableProperty(this.prop)) {
        this.#addDraggingCapability();
      }

      editableField({
        start: this.#onStartEditing,
        element: this.valueSpan,
        done: this.#onValueDone,
        destroy: async onValueDonePromise => {
          const cb = this.update;
          // The `done` callback is called before this `destroy` callback is.
          // In #onValueDone, we might preview/set the property and we want to wait for
          // that to be resolved before updating the view so all data are up to date (see Bug 1325145).
          //
          // Note that it is important to only await if a promise is passed,
          // otherwise browser_rules_grid-template-areas.js starts failing because of a race condition.
          if (typeof onValueDonePromise?.then == "function") {
            await onValueDonePromise;
          }
          return cb();
        },
        validate: this.#onValidate,
        advanceChars: advanceValidate,
        contentType: InplaceEditor.CONTENT_TYPES.CSS_VALUE,
        property: this.prop,
        defaultIncrement: this.prop.name === "opacity" ? 0.1 : 1,
        popup: this.popup,
        multiline: true,
        maxWidth: () => this.container.getBoundingClientRect().width,
        cssProperties: this.cssProperties,
        getCssVariables,
        getGridLineNames: this.#getGridlineNames,
        showSuggestCompletionOnEmpty: true,
        // (Shift+)Tab will move the focus to the previous/next editable field (so property name,
        // or new property).
        focusEditableFieldAfterApply: true,
        focusEditableFieldContainerSelector: ".ruleview-rule",
        // We don't want Enter to trigger the next editable field, just to validate
        // what the user entered, close the editor, and focus the span so the user can
        // navigate with the keyboard as expected, unless the user has
        // devtools.inspector.rule-view.focusNextOnEnter set to true
        stopOnReturn: this.ruleView.inplaceEditorFocusNextOnEnter !== true,
        // Label the value input with the name span so screenreader users know what this
        // applies to.
        inputAriaLabelledBy: this.nameSpan.id,
      });
    }
  }

  /**
   * Get the grid line names of the grid that the currently selected element is
   * contained in.
   *
   * @return {object} Contains the names of the cols and rows as arrays
   * {cols: [], rows: []}.
   */
  #getGridlineNames = async () => {
    const gridLineNames = { cols: [], rows: [] };
    const layoutInspector =
      await this.ruleView.inspector.walker.getLayoutInspector();
    const gridFront = await layoutInspector.getCurrentGrid(
      this.ruleView.inspector.selection.nodeFront
    );

    if (gridFront) {
      const gridFragments = gridFront.gridFragments;

      for (const gridFragment of gridFragments) {
        for (const rowLine of gridFragment.rows.lines) {
          // We specifically ignore implicit line names created from implicitly named
          // areas. This is because showing implicit line names can be confusing for
          // designers who may have used a line name with "-start" or "-end" and created
          // an implicitly named grid area without meaning to.
          let gridArea;

          for (const name of rowLine.names) {
            const rowLineName =
              name.substring(0, name.lastIndexOf("-start")) ||
              name.substring(0, name.lastIndexOf("-end"));
            gridArea = gridFragment.areas.find(
              area => area.name === rowLineName
            );

            if (
              rowLine.type === "implicit" &&
              gridArea &&
              gridArea.type === "implicit"
            ) {
              continue;
            }
            gridLineNames.rows.push(name);
          }
        }

        for (const colLine of gridFragment.cols.lines) {
          let gridArea;

          for (const name of colLine.names) {
            const colLineName =
              name.substring(0, name.lastIndexOf("-start")) ||
              name.substring(0, name.lastIndexOf("-end"));
            gridArea = gridFragment.areas.find(
              area => area.name === colLineName
            );

            if (
              colLine.type === "implicit" &&
              gridArea &&
              gridArea.type === "implicit"
            ) {
              continue;
            }
            gridLineNames.cols.push(name);
          }
        }
      }
    }

    // Emit message for test files
    this.ruleView.inspector.emit("grid-line-names-updated");
    return gridLineNames;
  };

  /**
   * Get the path from which to resolve requests for this
   * rule's stylesheet.
   *
   * @return {string} the stylesheet's href.
   */
  get #sheetHref() {
    const domRule = this.rule.domRule;
    if (domRule) {
      return domRule.href || domRule.nodeHref;
    }
    return undefined;
  }

  /**
   * Populate the span based on changes to the TextProperty.
   */
  // eslint-disable-next-line complexity
  update = () => {
    if (this.ruleView.isDestroyed) {
      return;
    }

    this.updateUI();

    const name = this.prop.name;
    this.nameSpan.textContent = name;
    this.enable.setAttribute(
      "title",
      l10nFormatStr("rule.propertyToggle.label", name)
    );

    // Combine the property's value and priority into one string for
    // the value.
    const store = this.rule.elementStyle.store;
    let val = store.userProperties.getProperty(
      this.rule.domRule,
      name,
      this.prop.value
    );
    if (this.prop.priority) {
      val += " !" + this.prop.priority;
    }

    const propDirty = this.prop.isPropertyChanged;

    if (propDirty) {
      this.element.setAttribute("dirty", "");
    } else {
      this.element.removeAttribute("dirty");
    }

    const { outputParser } = this.ruleView;
    this.outputParserOptions = {
      angleClass: "ruleview-angle",
      angleSwatchClass: SHARED_SWATCH_CLASS + " " + ANGLE_SWATCH_CLASS,
      bezierClass: "ruleview-bezier",
      bezierSwatchClass: SHARED_SWATCH_CLASS + " " + BEZIER_SWATCH_CLASS,
      colorClass: "ruleview-color",
      colorSwatchClass: SHARED_SWATCH_CLASS + " " + COLOR_SWATCH_CLASS,
      filterClass: "ruleview-filter",
      filterSwatchClass: SHARED_SWATCH_CLASS + " " + FILTER_SWATCH_CLASS,
      flexClass: "inspector-flex js-toggle-flexbox-highlighter",
      gridClass: "inspector-grid js-toggle-grid-highlighter",
      linearEasingClass: "ruleview-lineareasing",
      linearEasingSwatchClass:
        SHARED_SWATCH_CLASS + " " + LINEAR_EASING_SWATCH_CLASS,
      shapeClass: "inspector-shape",
      shapeSwatchClass: SHAPE_SWATCH_CLASS,
      // Only ask the parser to convert colors to the default color type specified by the
      // user if the property hasn't been changed yet.
      useDefaultColorUnit: !propDirty,
      defaultColorUnit: this.ruleView.inspector.defaultColorUnit,
      urlClass: "theme-link",
      fontFamilyClass: FONT_FAMILY_CLASS,
      baseURI: this.#sheetHref,
      unmatchedClass: "inspector-unmatched",
      matchedVariableClass: "inspector-variable",
      getVariableData: varName =>
        this.rule.elementStyle.getVariableData(
          varName,
          this.rule.pseudoElement
        ),
      getAttributeValue: attrName => {
        const nodeFront = this.rule.elementStyle.element.isPseudoElement
          ? // get the closest non pseudo element
            this.rule.elementStyle.element.getUltimateOriginatingElement()
          : this.rule.elementStyle.element;

        const attribute = nodeFront.attributes.find(
          attr => attr.name === attrName
        );
        if (!attribute) {
          return null;
        }

        return attribute.value;
      },
      inStartingStyleRule: this.rule.isInStartingStyle(),
      isValid: this.isValid(),
    };

    if (this.rule.darkColorScheme !== undefined) {
      this.outputParserOptions.isDarkColorScheme = this.rule.darkColorScheme;
    }
    const frag = outputParser.parseCssProperty(
      name,
      val,
      this.outputParserOptions
    );

    // Save the initial value as the last committed value,
    // for restoring after pressing escape.
    if (!this.committed) {
      this.committed = {
        name,
        value: frag.textContent,
        priority: this.prop.priority,
      };
    }

    // Save focused element inside value span if one exists before wiping the innerHTML
    let focusedElSelector = null;
    if (this.valueSpan.contains(this.doc.activeElement)) {
      focusedElSelector = findCssSelector(this.doc.activeElement);
    }

    this.valueSpan.innerHTML = "";
    this.valueSpan.appendChild(frag);
    if (
      this.valueSpan.textProperty?.name === "grid-template-areas" &&
      (this.valueSpan.innerText.includes(`"`) ||
        this.valueSpan.innerText.includes(`'`))
    ) {
      this.#formatGridTemplateAreasValue();
    }

    this.ruleView.emit("property-value-updated", {
      rule: this.prop.rule,
      property: name,
      value: val,
    });

    // Highlight the currently used font in font-family properties.
    // If we cannot find a match, highlight the first generic family instead.
    const fontFamilySpans = this.valueSpan.querySelectorAll(
      "." + FONT_FAMILY_CLASS
    );
    if (fontFamilySpans.length && this.prop.enabled && !this.prop.overridden) {
      // This code branch was historically spawn in a distinct async task
      // but it may not be strictly required.
      (async () => {
        try {
          const families = await this.rule.elementStyle.getUsedFontFamilies();
          for (const span of fontFamilySpans) {
            const authoredFont = span.textContent.toLowerCase();
            if (families.has(authoredFont)) {
              span.classList.add("used-font");
              // In case a font-family appears multiple time in the value, we only want
              // to highlight the first occurence.
              families.delete(authoredFont);
            }
          }

          this.ruleView.emit("font-highlighted", this.valueSpan);
        } catch (e) {
          console.error("Could not get the list of font families", e);
        }
      })();
    }

    // Attach the color picker tooltip to the color swatches
    this.#colorSwatchSpans = this.valueSpan.querySelectorAll(
      "." + COLOR_SWATCH_CLASS
    );
    if (this.ruleEditor.isEditable) {
      for (const span of this.#colorSwatchSpans) {
        // Adding this swatch to the list of swatches our colorpicker
        // knows about
        this.ruleView.tooltips.getTooltip("colorPicker").addSwatch(span, {
          onShow: this.#onStartEditing,
          onPreview: this.#onSwatchPreview,
          onCommit: this.#onSwatchCommit,
          onRevert: this.#onSwatchRevert,
        });
        const title = l10n("rule.colorSwatch.tooltip");
        span.setAttribute("title", title);
        span.dataset.propertyName = this.nameSpan.textContent;
      }
    }

    // Attach the cubic-bezier tooltip to the bezier swatches
    this.#bezierSwatchSpans = this.valueSpan.querySelectorAll(
      "." + BEZIER_SWATCH_CLASS
    );
    if (this.ruleEditor.isEditable) {
      for (const span of this.#bezierSwatchSpans) {
        // Adding this swatch to the list of swatches our colorpicker
        // knows about
        this.ruleView.tooltips.getTooltip("cubicBezier").addSwatch(span, {
          onShow: this.#onStartEditing,
          onPreview: this.#onSwatchPreview,
          onCommit: this.#onSwatchCommit,
          onRevert: this.#onSwatchRevert,
        });
        const title = l10n("rule.bezierSwatch.tooltip");
        span.setAttribute("title", title);
      }
    }

    // Attach the linear easing tooltip to the linear easing swatches
    this.#linearEasingSwatchSpans = this.valueSpan.querySelectorAll(
      "." + LINEAR_EASING_SWATCH_CLASS
    );
    if (this.ruleEditor.isEditable) {
      for (const span of this.#linearEasingSwatchSpans) {
        // Adding this swatch to the list of swatches our colorpicker
        // knows about
        this.ruleView.tooltips
          .getTooltip("linearEaseFunction")
          .addSwatch(span, {
            onShow: this.#onStartEditing,
            onPreview: this.#onSwatchPreview,
            onCommit: this.#onSwatchCommit,
            onRevert: this.#onSwatchRevert,
          });
        span.setAttribute("title", l10n("rule.bezierSwatch.tooltip"));
      }
    }

    // Attach the filter editor tooltip to the filter swatch
    const span = this.valueSpan.querySelector("." + FILTER_SWATCH_CLASS);
    if (this.ruleEditor.isEditable) {
      if (span) {
        this.outputParserOptions.filterSwatch = true;

        this.ruleView.tooltips.getTooltip("filterEditor").addSwatch(
          span,
          {
            onShow: this.#onStartEditing,
            onPreview: this.#onSwatchPreview,
            onCommit: this.#onSwatchCommit,
            onRevert: this.#onSwatchRevert,
          },
          outputParser,
          this.outputParserOptions
        );
        const title = l10n("rule.filterSwatch.tooltip");
        span.setAttribute("title", title);
      }
    }

    this.angleSwatchSpans = this.valueSpan.querySelectorAll(
      "." + ANGLE_SWATCH_CLASS
    );
    if (this.ruleEditor.isEditable) {
      for (const angleSpan of this.angleSwatchSpans) {
        angleSpan.addEventListener("unit-change", this.#onSwatchCommit);
        const title = l10n("rule.angleSwatch.tooltip");
        angleSpan.setAttribute("title", title);
      }
    }

    const nodeFront = this.ruleView.inspector.selection.nodeFront;

    const flexToggle = this.valueSpan.querySelector(".inspector-flex");
    if (flexToggle) {
      flexToggle.setAttribute("title", l10n("rule.flexToggle.tooltip"));
      flexToggle.setAttribute(
        "aria-pressed",
        this.ruleView.inspector.highlighters.getNodeForActiveHighlighter(
          this.ruleView.inspector.highlighters.TYPES.FLEXBOX
        ) === nodeFront
      );
    }

    const gridToggle = this.valueSpan.querySelector(".inspector-grid");
    if (gridToggle) {
      gridToggle.setAttribute("title", l10n("rule.gridToggle.tooltip"));
      gridToggle.setAttribute(
        "aria-pressed",
        this.ruleView.highlighters.gridHighlighters.has(nodeFront)
      );
      gridToggle.toggleAttribute(
        "disabled",
        !this.ruleView.highlighters.canGridHighlighterToggle(nodeFront)
      );
    }

    const shapeToggle = this.valueSpan.querySelector(".inspector-shapeswatch");
    if (shapeToggle) {
      const mode =
        "css" +
        name
          .split("-")
          .map(s => {
            return s[0].toUpperCase() + s.slice(1);
          })
          .join("");
      shapeToggle.setAttribute("data-mode", mode);
      shapeToggle.setAttribute("aria-pressed", false);
      shapeToggle.setAttribute("title", l10n("rule.shapeToggle.tooltip"));
    }

    // Now that we have updated the property's value, we might have a pending
    // click on the value container. If we do, we have to trigger a click event
    // on the right element.
    // If we are dragging, we don't need to handle the pending click
    if (this.#hasPendingClick && !this.#isDragging) {
      this.#hasPendingClick = false;
      this.#elementsWithPendingClicks.delete(this.valueSpan);
      let elToClick;

      if (this.#clickedElementOptions !== null) {
        const { selector, index } = this.#clickedElementOptions;
        elToClick = this.valueSpan.querySelectorAll(selector)[index];

        this.#clickedElementOptions = null;
      }

      if (!elToClick) {
        elToClick = this.valueSpan;
      }
      elToClick.click();
    }

    // Populate the computed styles and shorthand overridden styles.
    this.#updateComputed();
    this.#updateShorthandOverridden();

    // Update the rule property highlight.
    this.ruleView.updatePropertyHighlight(this);

    // Restore focus back to the element whose markup was recreated above, if
    // the focus is still in the current document (avoid stealing the focus, see
    // Bug 1911627).
    if (this.doc.hasFocus() && focusedElSelector) {
      const elementToFocus = this.doc.querySelector(focusedElSelector);
      if (elementToFocus) {
        elementToFocus.focus();
      }
    }
  };

  #onStartEditing = () => {
    this.element.classList.remove("ruleview-overridden", "ruleview-invalid");
    this.enable.style.visibility = "hidden";
    if (this.filterProperty) {
      this.filterProperty.hidden = true;
    }
    if (this.expander) {
      this.expander.hidden = true;
    }
  };

  get #shouldShowComputedExpander() {
    if (this.prop.name.startsWith("--") || this.editing) {
      return false;
    }

    // Only show the expander to reveal computed properties if:
    // - the computed properties are actually different from the current property (i.e
    //   these are longhands while the current property is the shorthand)
    // - all of the computed properties have defined values. In case the current property
    //   value contains CSS variables, then the computed properties will be missing and we
    //   want to avoid showing them.
    return (
      this.prop.computed.some(c => c.name !== this.prop.name) &&
      !this.prop.computed.every(c => !c.value)
    );
  }

  get #shouldShowWarning() {
    if (this.prop.name.startsWith("--")) {
      return false;
    }

    return !this.editing && !this.isValid();
  }

  get #shouldShowInactiveCssState() {
    return (
      !this.editing &&
      !this.prop.overridden &&
      this.prop.enabled &&
      !!this.prop.getInactiveCssData()
    );
  }

  get #shouldShowFilterProperty() {
    return (
      !this.editing &&
      this.isValid() &&
      this.prop.overridden &&
      !this.ruleEditor.rule.isUnmatched
    );
  }

  #createComputedExpander() {
    if (this.expander) {
      return;
    }

    // Click to expand the computed properties of the text property.
    this.expander = this.doc.createElementNS(HTML_NS, "button");
    this.expander.ariaExpanded = false;
    this.expander.classList.add("ruleview-expander", "theme-twisty");
    this.expander.title = SHORTHAND_EXPANDER_TOOLTIP;

    this.expander.addEventListener("click", this.#onExpandClicked, {
      capture: true,
      signal: this.abortController.signal,
    });

    this.container.insertBefore(this.expander, this.valueContainer);
  }

  #createComputedList() {
    if (this.computed) {
      return;
    }
    this.computed = this.doc.createElementNS(HTML_NS, "ul");
    this.computed.classList.add("ruleview-computedlist");
    this.element.insertBefore(this.computed, this.shorthandOverridden);
  }

  #createWarningIcon() {
    if (this.warning) {
      return;
    }

    this.warning = this.doc.createElementNS(HTML_NS, "div");
    this.warning.classList.add("ruleview-warning");
    this.warning.title = l10n("rule.warning.title");
    this.container.insertBefore(
      this.warning,
      this.invalidAtComputedValueTimeWarning ||
        this.inactiveCssState ||
        this.compatibilityState ||
        this.filterProperty
    );
  }

  #createInvalidAtComputedValueTimeIcon() {
    if (this.invalidAtComputedValueTimeWarning) {
      return;
    }

    this.invalidAtComputedValueTimeWarning = this.doc.createElementNS(
      HTML_NS,
      "div"
    );
    this.invalidAtComputedValueTimeWarning.classList.add(
      "ruleview-invalid-at-computed-value-time-warning"
    );
    this.container.insertBefore(
      this.invalidAtComputedValueTimeWarning,
      this.inactiveCssState || this.compatibilityState || this.filterProperty
    );
  }

  #createInactiveCssWarningIcon() {
    if (this.inactiveCssState) {
      return;
    }

    this.inactiveCssState = this.doc.createElementNS(HTML_NS, "div");
    this.inactiveCssState.classList.add("ruleview-inactive-css-warning");
    this.container.insertBefore(
      this.inactiveCssState,
      this.compatibilityState || this.filterProperty
    );
  }

  #createCompatibilityWarningIcon() {
    if (this.compatibilityState) {
      return;
    }

    this.compatibilityState = this.doc.createElementNS(HTML_NS, "div");
    this.compatibilityState.classList.add("ruleview-compatibility-warning");
    this.container.insertBefore(this.compatibilityState, this.filterProperty);
  }

  #createFilterPropertyButton() {
    if (this.filterProperty) {
      return;
    }

    // Filter button that filters for the current property name and is
    // displayed when the property is overridden by another rule.
    this.filterProperty = this.doc.createElementNS(HTML_NS, "button");
    this.filterProperty.classList.add("ruleview-overridden-rule-filter");
    this.filterProperty.title = l10n("rule.filterProperty.title");
    this.container.append(this.filterProperty);

    this.filterProperty.addEventListener(
      "click",
      event => {
        this.ruleEditor.ruleView.setFilterStyles("`" + this.prop.name + "`");
        event.stopPropagation();
      },
      { signal: this.abortController.signal }
    );
  }

  /**
   * Update the visibility of the enable checkbox, the warning indicator, the used
   * indicator and the filter property, as well as the overridden state of the property.
   */
  updateUI = () => {
    if (this.prop.enabled) {
      this.enable.style.removeProperty("visibility");
    } else {
      this.enable.style.visibility = "visible";
    }

    this.enable.checked = this.prop.enabled;

    if (this.#shouldShowWarning) {
      this.element.classList.add("ruleview-invalid");

      if (!this.warning) {
        this.#createWarningIcon();
      } else {
        this.warning.hidden = false;
      }
      this.warning.title = !this.#isNameValid()
        ? l10n("rule.warningName.title")
        : l10n("rule.warning.title");
    } else {
      this.element.classList.remove("ruleview-invalid");
      if (this.warning) {
        this.warning.hidden = true;
      }
    }

    if (!this.editing && this.#isInvalidAtComputedValueTime()) {
      if (!this.invalidAtComputedValueTimeWarning) {
        this.#createInvalidAtComputedValueTimeIcon();
      }
      this.invalidAtComputedValueTimeWarning.title = l10nFormatStr(
        "rule.warningInvalidAtComputedValueTime.title",
        `"${this.prop.getExpectedSyntax()}"`
      );
      this.invalidAtComputedValueTimeWarning.hidden = false;
    } else if (this.invalidAtComputedValueTimeWarning) {
      this.invalidAtComputedValueTimeWarning.hidden = true;
    }

    if (this.#shouldShowFilterProperty) {
      if (!this.filterProperty) {
        this.#createFilterPropertyButton();
      }
      this.filterProperty.hidden = false;
    } else if (this.filterProperty) {
      this.filterProperty.hidden = true;
    }

    if (this.#shouldShowComputedExpander) {
      if (!this.expander) {
        this.#createComputedExpander();
      }
      this.expander.hidden = false;
    } else if (this.expander) {
      this.expander.hidden = true;
    }

    if (
      !this.editing &&
      (this.prop.overridden || !this.prop.enabled || !this.prop.isKnownProperty)
    ) {
      this.element.classList.add("ruleview-overridden");
    } else {
      this.element.classList.remove("ruleview-overridden");
    }

    this.#updateInactiveCssIndicator();
    this.#updatePropertyCompatibilityIndicator();
  };

  #updateInactiveCssIndicator() {
    const inactiveCssData = this.prop.getInactiveCssData();

    if (
      this.editing ||
      this.prop.overridden ||
      !this.prop.enabled ||
      !inactiveCssData
    ) {
      this.element.classList.remove("inactive-css");
      if (this.inactiveCssState) {
        this.inactiveCssState.hidden = true;
      }
    } else {
      this.element.classList.add("inactive-css");
      if (!this.inactiveCssState) {
        this.#createInactiveCssWarningIcon();
      } else {
        this.inactiveCssState.hidden = false;
      }
    }
  }

  async #updatePropertyCompatibilityIndicator() {
    const { isCompatible } = await this.prop.isCompatible();

    if (this.editing || isCompatible) {
      if (this.compatibilityState) {
        this.compatibilityState.hidden = true;
      }
    } else {
      if (!this.compatibilityState) {
        this.#createCompatibilityWarningIcon();
      }
      this.compatibilityState.hidden = false;
    }
  }

  /**
   * Update the indicator for computed styles. The computed styles themselves
   * are populated on demand, when they become visible.
   */
  #updateComputed() {
    if (this.computed) {
      this.computed.replaceChildren();
    }

    if (this.#shouldShowComputedExpander) {
      if (!this.expander) {
        this.#createComputedExpander();
      }
      this.expander.hidden = false;
    } else if (this.expander) {
      this.expander.hidden = true;
    }

    this.#populatedComputed = false;
    if (
      this.expander &&
      this.expander.getAttribute("aria-expanded" === "true")
    ) {
      this.populateComputed();
    }
  }

  /**
   * Populate the list of computed styles.
   */
  populateComputed() {
    if (this.#populatedComputed) {
      return;
    }
    this.#populatedComputed = true;

    for (const computed of this.prop.computed) {
      // Don't bother to duplicate information already
      // shown in the text property.
      if (computed.name === this.prop.name) {
        continue;
      }

      if (!this.computed) {
        this.#createComputedList();
      }

      // Store the computed style element for easy access when highlighting styles
      computed.element = this.#createComputedListItem(
        this.computed,
        computed,
        "ruleview-computed"
      );
    }
  }

  /**
   * Update the indicator for overridden shorthand styles. The shorthand
   * overridden styles themselves are populated on demand, when they
   * become visible.
   */
  #updateShorthandOverridden() {
    if (this.shorthandOverridden) {
      this.shorthandOverridden.replaceChildren();
    }

    this.#populatedShorthandOverridden = false;
    this.#populateShorthandOverridden();
  }

  /**
   * Populate the list of overridden shorthand styles.
   */
  #populateShorthandOverridden() {
    if (
      this.#populatedShorthandOverridden ||
      this.prop.overridden ||
      !this.#shouldShowComputedExpander
    ) {
      return;
    }
    this.#populatedShorthandOverridden = true;

    // Holds the viewers for the overridden shorthand properties.
    // will be populated in |#updateShorthandOverridden|.
    if (!this.shorthandOverridden) {
      this.shorthandOverridden = this.doc.createElementNS(HTML_NS, "ul");
      this.shorthandOverridden.classList.add("ruleview-overridden-items");
      this.element.append(this.shorthandOverridden);
    }

    for (const computed of this.prop.computed) {
      // Don't display duplicate information or show properties
      // that are completely overridden.
      if (computed.name === this.prop.name || !computed.overridden) {
        continue;
      }

      this.#createComputedListItem(
        this.shorthandOverridden,
        computed,
        "ruleview-overridden-item"
      );
    }
  }

  /**
   * Creates and populates a list item with the computed CSS property.
   */
  #createComputedListItem(parentEl, computed, className) {
    const li = createChild(parentEl, "li", {
      class: className,
    });

    if (computed.overridden) {
      li.classList.add("ruleview-overridden");
    }

    const nameContainer = createChild(li, "span", {
      class: "ruleview-namecontainer",
    });

    createChild(nameContainer, "span", {
      class: "ruleview-propertyname theme-fg-color3",
      textContent: computed.name,
    });
    appendText(nameContainer, ": ");

    const { outputParser } = this.ruleView;
    const frag = outputParser.parseCssProperty(computed.name, computed.value, {
      colorSwatchClass: "inspector-swatch inspector-colorswatch",
      urlClass: "theme-link",
      baseURI: this.#sheetHref,
      fontFamilyClass: "ruleview-font-family",
    });

    // Store the computed property value that was parsed for output
    computed.parsedValue = frag.textContent;

    const propertyContainer = createChild(li, "span", {
      class: "ruleview-propertyvaluecontainer",
    });

    createChild(propertyContainer, "span", {
      class: "ruleview-propertyvalue theme-fg-color1",
      child: frag,
    });
    appendText(propertyContainer, ";");

    return li;
  }

  /**
   * Handle updates to the preference which disables/enables the feature to
   * edit size properties on drag.
   */
  #onDraggablePreferenceChanged = () => {
    if (this.#isDraggableProperty(this.prop)) {
      this.#addDraggingCapability();
    } else {
      this.#removeDraggingCapacity();
    }
  };

  /**
   * Stop clicks propogating down the tree from the enable / disable checkbox.
   */
  #onEnableClicked = event => {
    event.stopPropagation();
  };

  /**
   * Handles clicks on the disabled property.
   */
  #onEnableChanged = event => {
    this.prop.setEnabled(this.enable.checked);
    event.stopPropagation();
    this.telemetry.recordEvent("edit_rule", "ruleview");
  };

  /**
   * Handles clicks on the computed property expander. If the computed list is
   * open due to user expanding or style filtering, collapse the computed list
   * and close the expander. Otherwise, add user-open attribute which is used to
   * expand the computed list and tracks whether or not the computed list is
   * expanded by manually by the user.
   */
  #onExpandClicked = event => {
    if (!this.computed) {
      // Holds the viewers for the computed properties.
      // will be populated in |#updateComputed|.
      this.#createComputedList();
    }
    const isOpened =
      this.computed.hasAttribute("filter-open") ||
      this.computed.hasAttribute("user-open");

    this.expander.setAttribute("aria-expanded", !isOpened);
    if (isOpened) {
      this.computed.removeAttribute("filter-open");
      this.computed.removeAttribute("user-open");
      if (this.shorthandOverridden) {
        this.shorthandOverridden.hidden = false;
      }
      this.#populateShorthandOverridden();
    } else {
      this.computed.setAttribute("user-open", "");
      if (this.shorthandOverridden) {
        this.shorthandOverridden.hidden = true;
      }
      this.populateComputed();
    }

    event.stopPropagation();
  };

  /**
   * Expands the computed list when a computed property is matched by the style
   * filtering. The filter-open attribute is used to track whether or not the
   * computed list was toggled opened by the filter.
   */
  expandForFilter() {
    if (!this.computed || !this.computed.hasAttribute("user-open")) {
      if (!this.expander) {
        this.#createComputedExpander();
      }
      this.expander.hidden = false;
      this.expander.setAttribute("aria-expanded", "true");

      if (!this.computed) {
        this.#createComputedList();
      }
      this.computed.setAttribute("filter-open", "");
      this.populateComputed();
    }
  }

  /**
   * Collapses the computed list that was expanded by style filtering.
   */
  collapseForFilter() {
    this.computed.removeAttribute("filter-open");

    if (!this.computed.hasAttribute("user-open") && this.expander) {
      this.expander.setAttribute("aria-expanded", "false");
    }
  }

  /**
   * Called when the property name's inplace editor is closed.
   * Ignores the change if the user pressed escape, otherwise
   * commits it.
   *
   * @param {string} value
   *        The value contained in the editor.
   * @param {boolean} commit
   *        True if the change should be applied.
   * @param {number} direction
   *        The move focus direction number.
   */
  #onNameDone = (value, commit, direction) => {
    const isNameUnchanged =
      (!commit && !this.ruleEditor.isEditing) || this.committed.name === value;
    if (this.prop.value && isNameUnchanged) {
      return;
    }

    this.telemetry.recordEvent("edit_rule", "ruleview");

    // Remove a property if the name is empty
    if (!value.trim()) {
      this.remove(direction);
      return;
    }

    const isVariable = value.startsWith("--");

    // Remove a property if:
    // - the property value is empty and is not a variable (empty variables are valid)
    // - and the property value is not about to be focused
    if (
      !this.prop.value &&
      !isVariable &&
      direction !== Services.focus.MOVEFOCUS_FORWARD
    ) {
      this.remove(direction);
      return;
    }

    // Adding multiple rules inside of name field overwrites the current
    // property with the first, then adds any more onto the property list.
    const properties = parseDeclarations(this.cssProperties.isKnown, value);

    if (properties.length) {
      this.prop.setName(properties[0].name);
      this.committed.name = this.prop.name;

      if (!this.prop.enabled) {
        this.prop.setEnabled(true);
      }

      if (properties.length > 1) {
        this.prop.setValue(properties[0].value, properties[0].priority);
        this.ruleEditor.addProperties(properties.slice(1), this.prop);
      }
    }
  };

  /**
   * Remove property from style and the editors from DOM.
   * Begin editing next or previous available property given the focus
   * direction.
   *
   * @param {number} direction
   *        The move focus direction number.
   */
  remove(direction) {
    this.ruleEditor.rule.editClosestTextProperty(this.prop, direction);

    this.prop.remove();
    this.nameSpan.textProperty = null;
    this.valueSpan.textProperty = null;
    this.element.remove();

    this.destroy();
  }

  /**
   * Called when a value editor closes.  If the user pressed escape,
   * revert to the value this property had before editing.
   *
   * @param {string} value
   *        The value contained in the editor.
   * @param {boolean} commit
   *        True if the change should be applied.
   * @param {number} direction
   *        The move focus direction number.
   */
  #onValueDone = (value = "", commit, direction) => {
    const parsedProperties = this.#getValueAndExtraProperties(value);
    const val = parseSingleValue(
      this.cssProperties.isKnown,
      parsedProperties.firstValue
    );
    const isValueUnchanged =
      (!commit && !this.ruleEditor.isEditing) ||
      (!parsedProperties.propertiesToAdd.length &&
        this.committed.value === val.value &&
        this.committed.priority === val.priority);

    const isVariable = this.prop.name.startsWith("--");

    // If the value is not empty (or is an empty variable) and unchanged,
    // revert the property back to its original value and enabled or disabled state
    if ((value.trim() || isVariable) && isValueUnchanged) {
      const onPropertySet = this.ruleEditor.rule.previewPropertyValue(
        this.prop,
        val.value,
        val.priority
      );
      this.rule.setPropertyEnabled(this.prop, this.prop.enabled);
      return onPropertySet;
    }

    // Check if unit of value changed to add dragging feature
    if (this.#isDraggableProperty(val)) {
      this.#addDraggingCapability();
    } else {
      this.#removeDraggingCapacity();
    }

    this.telemetry.recordEvent("edit_rule", "ruleview");

    // First, set this property value (common case, only modified a property)
    const onPropertySet = this.prop.setValue(val.value, val.priority);

    if (!this.prop.enabled) {
      this.prop.setEnabled(true);
    }

    this.committed.value = this.prop.value;
    this.committed.priority = this.prop.priority;

    // If needed, add any new properties after this.prop.
    this.ruleEditor.addProperties(parsedProperties.propertiesToAdd, this.prop);

    // If the input value is empty and is not a variable (empty variables are valid),
    // and the focus is moving forward to the next editable field,
    // then remove the whole property.
    // A timeout is used here to accurately check the state, since the inplace
    // editor `done` and `destroy` events fire before the next editor
    // is focused.
    if (
      !value.trim() &&
      !isVariable &&
      direction !== Services.focus.MOVEFOCUS_BACKWARD
    ) {
      setTimeout(() => {
        if (!this.editing) {
          this.remove(direction);
        }
      }, 0);
    }

    return onPropertySet;
  };

  /**
   * Called when the swatch editor wants to commit a value change.
   */
  #onSwatchCommit = () => {
    this.#onValueDone(this.valueSpan.textContent, true);
    this.update();
  };

  /**
   * Called when the swatch editor wants to preview a value change.
   */
  #onSwatchPreview = () => {
    this.#previewValue(this.valueSpan.textContent);
  };

  /**
   * Called when the swatch editor closes from an ESC. Revert to the original
   * value of this property before editing.
   */
  #onSwatchRevert = () => {
    this.#previewValue(this.prop.value, true);
    this.update();
  };

  /**
   * Parse a value string and break it into pieces, starting with the
   * first value, and into an array of additional properties (if any).
   *
   * Example: Calling with "red; width: 100px" would return
   * { firstValue: "red", propertiesToAdd: [{ name: "width", value: "100px" }] }
   *
   * @param {string} value
   *        The string to parse
   * @return {object} An object with the following properties:
   *        firstValue: A string containing a simple value, like
   *                    "red" or "100px!important"
   *        propertiesToAdd: An array with additional properties, following the
   *                         parseDeclarations format of {name,value,priority}
   */
  #getValueAndExtraProperties(value) {
    // The inplace editor will prevent manual typing of multiple properties,
    // but we need to deal with the case during a paste event.
    // Adding multiple properties inside of value editor sets value with the
    // first, then adds any more onto the property list (below this property).
    let firstValue = value;
    let propertiesToAdd = [];

    const properties = parseDeclarations(this.cssProperties.isKnown, value);

    // Check to see if the input string can be parsed as multiple properties
    if (properties.length) {
      // Get the first property value (if any), and any remaining
      // properties (if any)
      if (!properties[0].name && properties[0].value) {
        firstValue = properties[0].value;
        propertiesToAdd = properties.slice(1);
      } else if (properties[0].name && properties[0].value) {
        // In some cases, the value could be a property:value pair
        // itself.  Join them as one value string and append
        // potentially following properties
        firstValue = properties[0].name + ": " + properties[0].value;
        propertiesToAdd = properties.slice(1);
      }
    }

    return {
      propertiesToAdd,
      firstValue,
    };
  }

  /**
   * Live preview this property, without committing changes.
   *
   * @param {string} value
   *        The value to set the current property to.
   * @param {boolean} reverting
   *        True if we're reverting the previously previewed value
   */
  #previewValue = (value, reverting = false) => {
    // Since function call is debounced, we need to make sure we are still
    // editing, and any selector modifications have been completed
    if (!reverting && (!this.editing || this.ruleEditor.isEditing)) {
      return;
    }

    const val = parseSingleValue(this.cssProperties.isKnown, value);
    this.ruleEditor.rule.previewPropertyValue(
      this.prop,
      val.value,
      val.priority
    );
  };

  /**
   * Check if the event passed has a "small increment" modifier
   * Alt on macosx and ctrl on other OSs
   *
   * @param  {KeyboardEvent} event
   * @returns {boolean}
   */
  #hasSmallIncrementModifier(event) {
    const modifier =
      lazy.AppConstants.platform === "macosx" ? "altKey" : "ctrlKey";
    return event[modifier] === true;
  }

  /**
   * Parses the value to check if it is a dimension
   * e.g. if the input is "128px" it will return an object like
   * { groups: { value: "128", unit: "px"}}
   *
   * @param  {string} value
   * @returns {object | null}
   */
  #parseDimension(value) {
    // The regex handles values like +1, -1, 1e4, .4, 1.3e-4, 1.567
    const cssDimensionRegex =
      /^(?<value>[+-]?(\d*\.)?\d+(e[+-]?\d+)?)(?<unit>(%|[a-zA-Z]+))$/;
    return value.match(cssDimensionRegex);
  }

  /**
   * Check if a textProperty value is supported to add the dragging feature
   *
   * @param  {TextProperty} textProperty
   * @returns {boolean}
   */
  #isDraggableProperty(textProperty) {
    // Check if the feature is explicitly disabled.
    if (!this.ruleView.draggablePropertiesEnabled) {
      return false;
    }
    // temporary way of fixing the bug when editing inline styles
    // otherwise the textPropertyEditor object is destroyed on each value edit
    // See Bug 1755024
    if (this.rule.domRule.type == ELEMENT_STYLE) {
      return false;
    }

    const nbValues = textProperty.value.split(" ").length;
    if (nbValues > 1) {
      // we do not support values like "1px solid red" yet
      // See 1755025
      return false;
    }

    const dimensionMatchObj = this.#parseDimension(textProperty.value);
    return !!dimensionMatchObj;
  }

  #draggingOnPointerDown = event => {
    if (!canPointerEventDrag(event)) {
      return;
    }

    this.#isDragging = true;
    this.valueSpan.setPointerCapture(event.pointerId);
    this.#capturingPointerId = event.pointerId;
    this.#draggingController = new AbortController();
    const { signal } = this.#draggingController;

    // turn off user-select in CSS when we drag
    this.valueSpan.classList.add(IS_DRAGGING_CLASSNAME);

    const dimensionObj = this.#parseDimension(this.prop.value);
    const { value, unit } = dimensionObj.groups;
    // `pointerdown.screenX` may be fractional value and we will compare it
    // with `mousemove.screenX` which is always integer value and the difference
    // will be used to compute the new value.  For making the difference always
    // integer, we need to convert it to integer value with the same as
    // MouseEvent does.
    // https://searchfox.org/mozilla-central/rev/7857ea04d142f2abc0d777085f9e54526c7cedf9/dom/events/MouseEvent.cpp#314
    // https://searchfox.org/mozilla-central/rev/7857ea04d142f2abc0d777085f9e54526c7cedf9/gfx/2d/Point.h#85-86
    const intScreenX = Math.floor(event.screenX + 0.5);
    this.#draggingValueCache = {
      isInDeadzone: true,
      previousScreenX: intScreenX,
      value: parseFloat(value),
      unit,
    };

    // "pointermove" is fired when the button state is changed too.  Therefore,
    // we should listen to "mousemove" to handle the pointer position changes.
    this.valueSpan.addEventListener("mousemove", this.#draggingOnMouseMove, {
      signal,
    });
    this.valueSpan.addEventListener("pointerup", this.#draggingOnPointerUp, {
      signal,
    });
    this.valueSpan.addEventListener("keydown", this.#draggingOnKeydown, {
      signal,
    });
  };

  #draggingOnMouseMove = throttle(async event => {
    if (!this.#isDragging) {
      return;
    }

    const { isInDeadzone, previousScreenX } = this.#draggingValueCache;
    let deltaX = event.screenX - previousScreenX;

    // If `isInDeadzone` is still true, the user has not previously left the deadzone.
    if (isInDeadzone) {
      // If the mouse is still in the deadzone, bail out immediately.
      if (Math.abs(deltaX) < DRAGGING_DEADZONE_DISTANCE) {
        return;
      }

      // Otherwise, remove the DRAGGING_DEADZONE_DISTANCE from the current deltaX, so that
      // the value does not update too abruptly.
      deltaX =
        Math.sign(deltaX) * (Math.abs(deltaX) - DRAGGING_DEADZONE_DISTANCE);

      // Update the state to remember the user is out of the deadzone.
      this.#draggingValueCache.isInDeadzone = false;
    }

    let draggingSpeed = DEFAULT_DRAGGING_SPEED;
    if (event.shiftKey) {
      draggingSpeed = FAST_DRAGGING_SPEED;
    } else if (this.#hasSmallIncrementModifier(event)) {
      draggingSpeed = SLOW_DRAGGING_SPEED;
    }

    const delta = deltaX * draggingSpeed;
    this.#draggingValueCache.previousScreenX = event.screenX;
    this.#draggingValueCache.value += delta;

    if (delta == 0) {
      return;
    }

    const { value, unit } = this.#draggingValueCache;
    // We use toFixed to avoid the case where value is too long, 9.00001px for example
    const roundedValue = Number.isInteger(value) ? value : value.toFixed(1);
    const onValueSet = this.prop.setValue(
      roundedValue + unit,
      this.prop.priority
    );
    this.#hasDragged = true;
    await onValueSet;
    this.ruleView.emitForTests("property-updated-by-dragging");
  }, 30);

  #draggingOnPointerUp = () => {
    if (!this.#isDragging) {
      return;
    }
    if (this.#hasDragged) {
      this.committed.value = this.prop.value;
      this.prop.setEnabled(true);
    }
    this.#onStopDragging();
  };

  #draggingOnKeydown = event => {
    if (event.key == "Escape") {
      this.prop.setValue(this.committed.value, this.committed.priority);
      this.#onStopDragging();
      event.preventDefault();
    }
  };

  #onStopDragging() {
    // childHasDragged is used to stop the propagation of a click event when we
    // release the mouse in the ruleview.
    // The click event is not emitted when we have a pending click on the text property.
    if (this.#hasDragged && !this.#hasPendingClick) {
      this.ruleView.childHasDragged = true;
    }
    this.#isDragging = false;
    this.#hasDragged = false;
    this.#draggingValueCache = null;
    if (this.#capturingPointerId !== null) {
      this.#capturingPointerId = null;
      try {
        this.valueSpan.releasePointerCapture(this.#capturingPointerId);
      } catch (e) {
        // Ignore exception even if the pointerId has already been invalidated
        // before the capture has already been released implicitly.
      }
    }
    this.valueSpan.classList.remove(IS_DRAGGING_CLASSNAME);
    this.#draggingController.abort();
  }

  /**
   * add event listeners to add the ability to modify any size value
   * by dragging the mouse horizontally
   */
  #addDraggingCapability() {
    if (this.valueSpan.classList.contains(DRAGGABLE_VALUE_CLASSNAME)) {
      return;
    }
    this.valueSpan.classList.add(DRAGGABLE_VALUE_CLASSNAME);
    this.valueSpan.addEventListener(
      "pointerdown",
      this.#draggingOnPointerDown,
      { passive: true }
    );
  }

  #removeDraggingCapacity() {
    if (!this.valueSpan.classList.contains(DRAGGABLE_VALUE_CLASSNAME)) {
      return;
    }
    this.#draggingController = null;
    this.valueSpan.classList.remove(DRAGGABLE_VALUE_CLASSNAME);
    this.valueSpan.removeEventListener(
      "pointerdown",
      this.#draggingOnPointerDown,
      { passive: true }
    );
  }

  /**
   * Validate this property. Does it make sense for this value to be assigned
   * to this property name? This does not apply the property value
   *
   * @return {boolean} true if the property name + value pair is valid, false otherwise.
   */
  isValid() {
    return this.prop.isValid();
  }

  /**
   * Validate the name of this property.
   *
   * @return {boolean} true if the property name is valid, false otherwise.
   */
  #isNameValid() {
    return this.prop.isNameValid();
  }

  #isInvalidAtComputedValueTime() {
    return this.prop.isInvalidAtComputedValueTime();
  }

  /**
   * Display grid-template-area value strings each on their own line
   * to display it in an ascii-art style matrix
   */
  #formatGridTemplateAreasValue() {
    this.valueSpan.classList.add("ruleview-propertyvalue-break-spaces");

    let quoteSymbolsUsed = [];

    const getQuoteSymbolsUsed = cssValue => {
      const regex = /\"|\'/g;
      const found = cssValue.match(regex);
      quoteSymbolsUsed = found.filter((_, i) => i % 2 === 0);
    };

    getQuoteSymbolsUsed(this.valueSpan.innerText);

    this.valueSpan.innerText = this.valueSpan.innerText
      .split('"')
      .filter(s => s !== "")
      .map(s => s.split("'"))
      .flat()
      .map(s => s.trim().replace(/\s+/g, " "))
      .filter(s => s.length)
      .map(line => line.split(" "))
      .map((line, i, lines) =>
        line.map((col, j) =>
          col.padEnd(Math.max(...lines.map(l => l[j]?.length || 0)), " ")
        )
      )
      .map(
        (line, i) =>
          `\n${quoteSymbolsUsed[i]}` + line.join(" ") + quoteSymbolsUsed[i]
      )
      .join(" ");
  }

  destroy() {
    if (this.#colorSwatchSpans && this.#colorSwatchSpans.length) {
      for (const span of this.#colorSwatchSpans) {
        this.ruleView.tooltips.getTooltip("colorPicker").removeSwatch(span);
      }
    }

    if (this.angleSwatchSpans && this.angleSwatchSpans.length) {
      for (const span of this.angleSwatchSpans) {
        span.removeEventListener("unit-change", this.#onSwatchCommit);
        this.ruleView.tooltips.getTooltip("filterEditor").removeSwatch(span);
      }
    }

    if (this.#bezierSwatchSpans && this.#bezierSwatchSpans.length) {
      for (const span of this.#bezierSwatchSpans) {
        this.ruleView.tooltips.getTooltip("cubicBezier").removeSwatch(span);
      }
    }

    if (this.#linearEasingSwatchSpans && this.#linearEasingSwatchSpans.length) {
      for (const span of this.#linearEasingSwatchSpans) {
        this.ruleView.tooltips
          .getTooltip("linearEaseFunction")
          .removeSwatch(span);
      }
    }

    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    this.#elementsWithPendingClicks.delete(this.valueSpan);
  }
}

module.exports = TextPropertyEditor;
