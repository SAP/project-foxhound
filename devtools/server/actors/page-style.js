/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const { Actor } = require("resource://devtools/shared/protocol.js");
const {
  pageStyleSpec,
} = require("resource://devtools/shared/specs/page-style.js");

const {
  LongStringActor,
} = require("resource://devtools/server/actors/string.js");

const {
  style: { ELEMENT_STYLE },
} = require("resource://devtools/shared/constants.js");

loader.lazyRequireGetter(
  this,
  "StyleRuleActor",
  "resource://devtools/server/actors/style-rule.js",
  true
);
loader.lazyRequireGetter(
  this,
  "getFontPreviewData",
  "resource://devtools/server/actors/stylesheets/style-utils.js",
  true
);
loader.lazyRequireGetter(
  this,
  "CssLogic",
  "resource://devtools/server/actors/inspector/css-logic.js",
  true
);
loader.lazyRequireGetter(
  this,
  "SharedCssLogic",
  "resource://devtools/shared/inspector/css-logic.js"
);
loader.lazyRequireGetter(
  this,
  "getDefinedGeometryProperties",
  "resource://devtools/server/actors/highlighters/geometry-editor.js",
  true
);
loader.lazyRequireGetter(
  this,
  "UPDATE_GENERAL",
  "resource://devtools/server/actors/stylesheets/stylesheets-manager.js",
  true
);

loader.lazyGetter(this, "PSEUDO_ELEMENTS", () => {
  return InspectorUtils.getCSSPseudoElementNames();
});
loader.lazyGetter(this, "FONT_VARIATIONS_ENABLED", () => {
  return Services.prefs.getBoolPref("layout.css.font-variations.enabled");
});

const NORMAL_FONT_WEIGHT = 400;
const BOLD_FONT_WEIGHT = 700;

/**
 * The PageStyle actor lets the client look at the styles on a page, as
 * they are applied to a given node.
 */
class PageStyleActor extends Actor {
  /**
   * Create a PageStyleActor.
   *
   * @param inspector
   *    The InspectorActor that owns this PageStyleActor.
   *
   * @class
   */
  constructor(inspector) {
    super(inspector.conn, pageStyleSpec);
    this.inspector = inspector;
    if (!this.inspector.walker) {
      throw Error(
        "The inspector's WalkerActor must be created before " +
          "creating a PageStyleActor."
      );
    }
    this.walker = inspector.walker;
    this.cssLogic = new CssLogic();

    // Stores the association of DOM objects -> actors
    this.refMap = new Map();

    // Latest node queried for its applied styles.
    this.selectedElement = null;

    // Maps root node (document|ShadowRoot) to stylesheets, which are used to add new rules.
    this.styleSheetsByRootNode = new WeakMap();

    this.onFrameUnload = this.onFrameUnload.bind(this);

    this.inspector.targetActor.on("will-navigate", this.onFrameUnload);

    this.styleSheetsManager =
      this.inspector.targetActor.getStyleSheetsManager();

    this.styleSheetsManager.on("stylesheet-updated", this.#onStylesheetUpdated);
  }

  #observedRules = new Set();

  destroy() {
    if (!this.walker) {
      return;
    }
    super.destroy();
    this.inspector.targetActor.off("will-navigate", this.onFrameUnload);
    this.inspector = null;
    this.walker = null;
    this.refMap = null;
    this.selectedElement = null;
    this.cssLogic = null;
    this.styleSheetsByRootNode = null;

    this.#observedRules = null;
  }

  get ownerWindow() {
    return this.inspector.targetActor.window;
  }

  form() {
    // We need to use CSS from the inspected window in order to use CSS.supports() and
    // detect the right platform features from there.
    const CSS = this.inspector.targetActor.window.CSS;

    return {
      actor: this.actorID,
      traits: {
        // Whether the page supports values of font-stretch from CSS Fonts Level 4.
        fontStretchLevel4: CSS.supports("font-stretch: 100%"),
        // Whether the page supports values of font-style from CSS Fonts Level 4.
        fontStyleLevel4: CSS.supports("font-style: oblique 20deg"),
        // Whether getAllUsedFontFaces/getUsedFontFaces accepts the includeVariations
        // argument.
        fontVariations: FONT_VARIATIONS_ENABLED,
        // Whether the page supports values of font-weight from CSS Fonts Level 4.
        // font-weight at CSS Fonts Level 4 accepts values in increments of 1 rather
        // than 100. However, CSS.supports() returns false positives, so we guard with the
        // expected support of font-stretch at CSS Fonts Level 4.
        fontWeightLevel4:
          CSS.supports("font-weight: 1") && CSS.supports("font-stretch: 100%"),
      },
    };
  }

  /**
   * Called when a style sheet is updated.
   */
  #styleApplied = kind => {
    // No matter what kind of update is done, we need to invalidate
    // the keyframe cache.
    this.cssLogic.reset();
    if (kind === UPDATE_GENERAL) {
      this.emit("stylesheet-updated");
    }
  };

  /**
   * Return or create a StyleRuleActor for the given item.
   *
   * @param {CSSStyleRule|Element} item
   * @param {string} pseudoElement An optional pseudo-element type in cases when the CSS
   *        rule applies to a pseudo-element.
   * @param {boolean} userAdded: Optional boolean to distinguish rules added by the user.
   * @return {StyleRuleActor} The newly created, or cached, StyleRuleActor for this item.
   */
  styleRef(item, pseudoElement, userAdded = false) {
    if (this.refMap.has(item)) {
      const styleRuleActor = this.refMap.get(item);
      if (pseudoElement) {
        styleRuleActor.addPseudo(pseudoElement);
      }
      return styleRuleActor;
    }
    const actor = new StyleRuleActor({
      pageStyle: this,
      item,
      userAdded,
      pseudoElement,
    });
    this.manage(actor);
    this.refMap.set(item, actor);

    return actor;
  }

  /**
   * Update the association between a StyleRuleActor and its
   * corresponding item.  This is used when a StyleRuleActor updates
   * as style sheet and starts using a new rule.
   *
   * @param oldItem The old association; either a CSSStyleRule or a
   *                DOM element.
   * @param item Either a CSSStyleRule or a DOM element.
   * @param actor a StyleRuleActor
   */
  updateStyleRef(oldItem, item, actor) {
    this.refMap.delete(oldItem);
    this.refMap.set(item, actor);
  }

  /**
   * Get the StyleRuleActor matching the given rule id or null if no match is found.
   *
   * @param  {string} ruleId
   *         Actor ID of the StyleRuleActor
   * @return {StyleRuleActor|null}
   */
  getRule(ruleId) {
    let match = null;

    for (const actor of this.refMap.values()) {
      if (actor.actorID === ruleId) {
        match = actor;
        continue;
      }
    }

    return match;
  }

  /**
   * Get the computed style for a node.
   *
   * @param {NodeActor} node
   * @param {object} options
   * @param {string} options.filter: A string filter that affects the "matched" handling.
   * @param {Array<string>} options.filterProperties: An array of properties names that
   *        you would like returned.
   * @param {boolean} options.markMatched: true if you want the 'matched' property to be
   *        added when a computed property has been modified by a style included by `filter`.
   * @param {boolean} options.onlyMatched: true if unmatched properties shouldn't be included.
   * @param {boolean} options.clearCache: true if the cssLogic cache should be cleared.
   *
   * @returns a JSON blob with the following form:
   *   {
   *     "property-name": {
   *       value: "property-value",
   *       priority: "!important" <optional>
   *       matched: <true if there are matched selectors for this value>
   *     },
   *     ...
   *   }
   */
  getComputed(node, options) {
    const ret = Object.create(null);

    if (options.clearCache) {
      this.cssLogic.reset();
    }
    const filterProperties = Array.isArray(options.filterProperties)
      ? options.filterProperties
      : null;
    this.cssLogic.sourceFilter = options.filter || SharedCssLogic.FILTER.UA;
    this.cssLogic.highlight(node.rawNode);
    const computed = this.cssLogic.computedStyle || [];
    const targetDocument = this.inspector.targetActor.window.document;

    for (const name of computed) {
      if (filterProperties && !filterProperties.includes(name)) {
        continue;
      }
      ret[name] = {
        value: computed.getPropertyValue(name),
        priority: computed.getPropertyPriority(name) || undefined,
      };

      if (name.startsWith("--")) {
        const registeredProperty = InspectorUtils.getCSSRegisteredProperty(
          targetDocument,
          name
        );
        if (registeredProperty) {
          ret[name].registeredPropertyInitialValue =
            registeredProperty.initialValue;
          if (
            !InspectorUtils.valueMatchesSyntax(
              targetDocument,
              ret[name].value,
              registeredProperty.syntax
            )
          ) {
            ret[name].invalidAtComputedValueTime = true;
            ret[name].registeredPropertySyntax = registeredProperty.syntax;
          }
        }
      }
    }

    if (options.markMatched || options.onlyMatched) {
      const matched = this.cssLogic.hasMatchedSelectors(Object.keys(ret));
      for (const key in ret) {
        if (matched.has(key)) {
          ret[key].matched = options.markMatched ? true : undefined;
        } else if (options.onlyMatched) {
          delete ret[key];
        }
      }
    }

    return ret;
  }

  /**
   * Get all the fonts from a page.
   *
   * @param object options
   *   `includePreviews`: Whether to also return image previews of the fonts.
   *   `previewText`: The text to display in the previews.
   *   `previewFontSize`: The font size of the text in the previews.
   *
   * @returns object
   *   object with 'fontFaces', a list of fonts that apply to this node.
   */
  getAllUsedFontFaces(options) {
    const windows = this.inspector.targetActor.windows;
    let fontsList = [];
    for (const win of windows) {
      // Fall back to the documentElement for XUL documents.
      const node = win.document.body
        ? win.document.body
        : win.document.documentElement;
      fontsList = [...fontsList, ...this.getUsedFontFaces(node, options)];
    }

    return fontsList;
  }

  /**
   * Get the font faces used in an element.
   *
   * @param NodeActor node / actual DOM node
   *    The node to get fonts from.
   * @param object options
   *   `includePreviews`: Whether to also return image previews of the fonts.
   *   `previewText`: The text to display in the previews.
   *   `previewFontSize`: The font size of the text in the previews.
   *
   * @returns object
   *   object with 'fontFaces', a list of fonts that apply to this node.
   */
  getUsedFontFaces(node, options) {
    // node.rawNode is defined for NodeActor objects
    const actualNode = node.rawNode || node;
    const contentDocument = actualNode.ownerDocument;
    // We don't get fonts for a node, but for a range
    const rng = contentDocument.createRange();
    const isPseudoElement = Boolean(
      CssLogic.getBindingElementAndPseudo(actualNode).pseudo
    );
    if (isPseudoElement) {
      rng.selectNodeContents(actualNode);
    } else {
      rng.selectNode(actualNode);
    }
    const fonts = InspectorUtils.getUsedFontFaces(rng);
    const fontsArray = [];

    for (let i = 0; i < fonts.length; i++) {
      const font = fonts[i];
      const fontFace = {
        name: font.name,
        CSSFamilyName: font.CSSFamilyName,
        CSSGeneric: font.CSSGeneric || null,
        srcIndex: font.srcIndex,
        URI: font.URI,
        format: font.format,
        localName: font.localName,
        metadata: font.metadata,
        version: font.getNameString(InspectorFontFace.NAME_ID_VERSION),
        description: font.getNameString(InspectorFontFace.NAME_ID_DESCRIPTION),
        manufacturer: font.getNameString(
          InspectorFontFace.NAME_ID_MANUFACTURER
        ),
        vendorUrl: font.getNameString(InspectorFontFace.NAME_ID_VENDOR_URL),
        designer: font.getNameString(InspectorFontFace.NAME_ID_DESIGNER),
        designerUrl: font.getNameString(InspectorFontFace.NAME_ID_DESIGNER_URL),
        license: font.getNameString(InspectorFontFace.NAME_ID_LICENSE),
        licenseUrl: font.getNameString(InspectorFontFace.NAME_ID_LICENSE_URL),
        sampleText: font.getNameString(InspectorFontFace.NAME_ID_SAMPLE_TEXT),
      };

      // If this font comes from a @font-face rule
      if (font.rule) {
        const styleActor = new StyleRuleActor({
          pageStyle: this,
          item: font.rule,
        });
        this.manage(styleActor);
        fontFace.rule = styleActor;
        fontFace.ruleText = font.rule.cssText;
      }

      // Get the weight and style of this font for the preview and sort order
      let weight = NORMAL_FONT_WEIGHT,
        style = "";
      if (font.rule) {
        weight =
          font.rule.style.getPropertyValue("font-weight") || NORMAL_FONT_WEIGHT;
        if (weight == "bold") {
          weight = BOLD_FONT_WEIGHT;
        } else if (weight == "normal") {
          weight = NORMAL_FONT_WEIGHT;
        }
        style = font.rule.style.getPropertyValue("font-style") || "";
      }
      fontFace.weight = weight;
      fontFace.style = style;

      if (options.includePreviews) {
        const opts = {
          previewText: options.previewText,
          previewFontSize: options.previewFontSize,
          fontStyle: style,
          fontWeight: weight,
          fillStyle: options.previewFillStyle,
        };
        const { dataURL, size } = getFontPreviewData(
          font.CSSFamilyName,
          contentDocument,
          opts
        );
        fontFace.preview = {
          data: new LongStringActor(this.conn, dataURL),
          size,
        };
      }

      if (options.includeVariations && FONT_VARIATIONS_ENABLED) {
        fontFace.variationAxes = font.getVariationAxes();
        fontFace.variationInstances = font.getVariationInstances();
      }

      fontsArray.push(fontFace);
    }

    // @font-face fonts at the top, then alphabetically, then by weight
    fontsArray.sort(function (a, b) {
      return a.weight > b.weight ? 1 : -1;
    });
    fontsArray.sort(function (a, b) {
      if (a.CSSFamilyName == b.CSSFamilyName) {
        return 0;
      }
      return a.CSSFamilyName > b.CSSFamilyName ? 1 : -1;
    });
    fontsArray.sort(function (a, b) {
      if ((a.rule && b.rule) || (!a.rule && !b.rule)) {
        return 0;
      }
      return !a.rule && b.rule ? 1 : -1;
    });

    return fontsArray;
  }

  /**
   * Get a list of selectors that match a given property for a node.
   *
   * @param NodeActor node
   * @param string property
   * @param object options
   *   `filter`: A string filter that affects the "matched" handling.
   *     'user': Include properties from user style sheets.
   *     'ua': Include properties from user and user-agent sheets.
   *     Default value is 'ua'
   *
   * @returns a JSON object with the following form:
   *   {
   *     // An ordered list of rules that apply
   *     matched: [{
   *       rule: <rule actorid>,
   *       sourceText: <string>, // The source of the selector, relative
   *                             // to the node in question.
   *       selector: <string>, // the selector ID that matched
   *       value: <string>, // the value of the property
   *       status: <int>,
   *         // The status of the match - high numbers are better placed
   *         // to provide styling information:
   *         // 3: Best match, was used.
   *         // 2: Matched, but was overridden.
   *         // 1: Rule from a parent matched.
   *         // 0: Unmatched (never returned in this API)
   *     }, ...],
   *
   *     // The full form of any domrule referenced.
   *     rules: [ <domrule>, ... ], // The full form of any domrule referenced
   *
   *     // The full form of any sheets referenced.
   *     sheets: [ <domsheet>, ... ]
   *  }
   */
  getMatchedSelectors(node, property, options) {
    this.cssLogic.sourceFilter = options.filter || SharedCssLogic.FILTER.UA;
    this.cssLogic.highlight(node.rawNode);

    const rules = new Set();
    const matched = [];

    const targetDocument = this.inspector.targetActor.window.document;
    let registeredProperty;
    if (property.startsWith("--")) {
      registeredProperty = InspectorUtils.getCSSRegisteredProperty(
        targetDocument,
        property
      );
    }

    const propInfo = this.cssLogic.getPropertyInfo(property);
    for (const selectorInfo of propInfo.matchedSelectors) {
      const cssRule = selectorInfo.selector.cssRule;
      const domRule = cssRule.sourceElement || cssRule.domRule;

      const rule = this.styleRef(domRule);
      rules.add(rule);

      const match = {
        rule,
        sourceText: this.getSelectorSource(selectorInfo, node.rawNode),
        selector: selectorInfo.selector.text,
        name: selectorInfo.property,
        value: selectorInfo.value,
        status: selectorInfo.status,
      };
      if (
        registeredProperty &&
        !InspectorUtils.valueMatchesSyntax(
          targetDocument,
          match.value,
          registeredProperty.syntax
        )
      ) {
        match.invalidAtComputedValueTime = true;
        match.registeredPropertySyntax = registeredProperty.syntax;
      }
      matched.push(match);
    }

    return {
      matched,
      rules: [...rules],
    };
  }

  // Get a selector source for a CssSelectorInfo relative to a given
  // node.
  getSelectorSource(selectorInfo, relativeTo) {
    let result = selectorInfo.selector.text;
    const ruleDeclarationOrigin =
      selectorInfo.selector.cssRule.domRule.declarationOrigin;
    if (
      ruleDeclarationOrigin === "style-attribute" ||
      ruleDeclarationOrigin === "pres-hints"
    ) {
      const source = selectorInfo.sourceElement;
      if (source === relativeTo) {
        result = "element";
      } else {
        result = CssLogic.getShortName(source);
      }

      if (ruleDeclarationOrigin === "pres-hints") {
        result += " attributes style";
      }
    }

    return result;
  }

  /**
   * @typedef {"user" | "ua" } GetAppliedFilterOption
   */

  /**
   * @typedef {object} GetAppliedOptions
   *
   * @property {GetAppliedFilterOption} filter - A string filter that affects the "matched" handling.
   *        Possible values are:
   *        - 'user': Include properties from user style sheets.
   *        - 'ua': Include properties from user and user-agent sheets.
   *        Default value is 'ua'
   * @property {boolean} inherited - Include styles inherited from parent nodes.
   * @property {boolean} matchedSelectors - Include an array of specific selectors that
   *        caused this rule to match its node.
   * @property {boolean} skipPseudo - Exclude styles applied to pseudo elements of the
   *        provided node.
   */

  /**
   * Get the set of styles that apply to a given node.
   *
   * @param {NodeActor} node
   * @param {GetAppliedOptions} options
   */
  async getApplied(node, options) {
    // Clear any previous references to StyleRuleActor instances for CSS rules.
    // Assume the consumer has switched context to a new node and no longer
    // interested in state changes of previous rules.
    this.#observedRules.clear();
    this.selectedElement = node?.rawNode || null;

    if (!node) {
      return { entries: [] };
    }

    this.cssLogic.highlight(node.rawNode);

    const entries = this.getAppliedProps(
      node,
      this.#getAllElementRules(node, {
        skipPseudo: options.skipPseudo,
        filter: options.filter,
      }),
      options
    );

    const promises = [];
    for (const entry of entries) {
      // Reference to instances of StyleRuleActor for CSS rules matching the node.
      // Assume these are used by a consumer which wants to be notified when their
      // state or declarations change either directly or indirectly.
      this.#observedRules.add(entry.rule);
      // We need to be sure that authoredText has been set before StyleRule#form is called.
      // This has to be treated specially, for now, because we cannot synchronously compute
      // the authored text and |form| can't return a promise.
      // See bug 1205868.
      promises.push(entry.rule.getAuthoredCssText());
    }

    await Promise.all(promises);

    return { entries };
  }

  #hasInheritedProps(style) {
    const doc = this.inspector.targetActor.window.document;
    return Array.prototype.some.call(style, prop =>
      InspectorUtils.isInheritedProperty(doc, prop)
    );
  }

  async isPositionEditable(node) {
    if (!node || node.rawNode.nodeType !== node.rawNode.ELEMENT_NODE) {
      return false;
    }

    const props = getDefinedGeometryProperties(node.rawNode);

    // Elements with only `width` and `height` are currently not considered
    // editable.
    return (
      props.has("top") ||
      props.has("right") ||
      props.has("left") ||
      props.has("bottom")
    );
  }

  /**
   * Helper function for getApplied, gets all the rules from a given
   * element. See getApplied for documentation on parameters.
   *
   * @param {NodeActor} node
   * @param {object} options
   * @param {boolean} options.isInherited - Set to true if we want to retrieve inherited rules,
   *        i.e. the passed node actor is an ancestor of the node we want to retrieved the
   *        applied rules for originally.
   * @param {boolean} options.skipPseudo - Exclude styles applied to pseudo elements of the
   *        provided node
   * @param {GetAppliedFilterOption} options.filter - will be passed to #getElementRules
   *
   * @return {Array{AppliedStyle}} The rules for a given element.
   *         See #getRuleItem for definition.
   */
  #getAllElementRules(node, { isInherited, skipPseudo, filter }) {
    const { rawNode } = node;
    const rules = [];

    // First add rule actors for element style defined via the DOM "style" attribute,
    // and/or via the JS "style" attribute (CSSOM API).
    if (rawNode.style) {
      const isPseudoElement = !!rawNode.implementedPseudoElement;
      // We only show element styles if:
      //  - we aren't processing a parent element for inherited rules, and that's not a pseudo element
      //    --or--
      //  - we are processing parent elements for inherited rules and we have at least one inherited rule
      const showElementStyles = !isInherited && !isPseudoElement;
      const showInheritedStyles =
        isInherited && this.#hasInheritedProps(rawNode.style);

      if (showElementStyles || showInheritedStyles) {
        const elementStyleActor = this.styleRef(
          rawNode,
          // We never try to fetch element styles for pseudo elements.
          null
        );

        if (showElementStyles) {
          rules.push(
            this.#getRuleItem(elementStyleActor, rawNode, {
              pseudoElement: null,
              isSystem: false,
              inherited: null,
            })
          );
        } else if (showInheritedStyles) {
          // at this point `isInherited` is true, so we want to put the NodeActor in the
          // `inherited` property so the client can show this information (for example in
          // the "Inherited from X" section in the Rules view).
          rules.push(
            this.#getRuleItem(elementStyleActor, rawNode, {
              pseudoElement: null,
              isSystem: false,
              inherited: node,
            })
          );
        }
      }
    }

    // Add normal rules matching exactly the DOM Element passed in (node).
    //
    // Note that when we are processing the special DOM Elements for pseudo elements
    // like ::before, ::marker, ::details-content,...
    // we pass an empty pseudo string  as we want to build the Rule for that DOM Element
    // and not a pseudo element Rule.
    // Pseudo element rule are build just after in this method and are for pseudo elements
    // created as children of the currently processed DOM Element.
    for (const oneRule of this.#getElementRules(
      rawNode,
      "",
      isInherited ? node : null,
      filter
    )) {
      rules.push(oneRule);
    }

    // If we don't want to check pseudo elements rules, we can stop here.
    if (skipPseudo) {
      return rules;
    }

    // Now retrieve any pseudo element rules.
    // We can have pseudo element that are children of other pseudo elements (e.g. with
    // ::before::marker , ::marker is a child of ::before).
    // In such case, we want to call #getElementRules with the actual pseudo element node,
    // not its binding element.

    const relevantPseudoElements = [];
    for (const readPseudo of PSEUDO_ELEMENTS) {
      if (!this.#pseudoIsRelevant(rawNode, readPseudo, isInherited)) {
        continue;
      }

      // FIXME: Bug 1909173. Need to handle view transitions peudo-elements.
      if (readPseudo === "::highlight") {
        InspectorUtils.getRegisteredCssHighlights(
          this.inspector.targetActor.window.document,
          // only active
          true
        ).forEach(name => {
          relevantPseudoElements.push(`::highlight(${name})`);
        });
      } else {
        relevantPseudoElements.push(readPseudo);
      }
    }

    for (const readPseudo of relevantPseudoElements) {
      const pseudoRules = this.#getElementRules(
        rawNode,
        readPseudo,
        isInherited ? node : null,
        filter
      );
      // inherited element backed pseudo element rules (e.g. `::details-content`) should
      // not be at the same "level" as rules inherited from the binding element (e.g. `<details>`),
      // so we need to put them before the "regular" rules.
      if (
        SharedCssLogic.ELEMENT_BACKED_PSEUDO_ELEMENTS.has(readPseudo) &&
        isInherited
      ) {
        rules.unshift(...pseudoRules);
      } else {
        rules.push(...pseudoRules);
      }
    }

    return rules;
  }

  /**
   * Create a new rule description ultimately returned by PageStyle.getApplied method.
   *
   * @param {StyleRuleActor} rule
   * @param {DOMNode | null} rawNode
   * @param {object} params
   * @param {NodeActor} params.inherited
   * @param {boolean} params.isSystem
   * @param {string | null} params.pseudoElement
   * @param {StyleRuleActor} params.keyframes
   * @returns {appliedstyle}
   */
  #getRuleItem(
    rule,
    rawNode = null,
    { inherited, isSystem, pseudoElement, keyframes } = {}
  ) {
    return {
      // /!\ Keep "appliedstyle" protocol.js type definition in sync with this object
      rule,
      pseudoElement,
      isSystem,
      inherited,
      // We can't compute the value for the whole document as the color scheme
      // can be set at the node level (e.g. with `color-scheme`)
      darkColorScheme: rawNode
        ? InspectorUtils.isUsedColorSchemeDark(rawNode)
        : undefined,
      keyframes,

      // May be later set from getAppliedProps.
      matchedSelectorIndexes: undefined,
    };
  }

  #nodeIsTextfieldLike(node) {
    if (node.nodeName == "TEXTAREA") {
      return true;
    }
    return (
      node.mozIsTextField &&
      (node.mozIsTextField(false) || node.type == "number")
    );
  }

  #nodeIsListItem(node) {
    const computed = CssLogic.getComputedStyle(node);
    if (!computed) {
      return false;
    }

    const display = computed.getPropertyValue("display");
    // This is written this way to handle `inline list-item` and such.
    return display.split(" ").includes("list-item");
  }

  /**
   * Returns whether or node the pseudo element is relevant for the passed node
   *
   * @param {DOMNode} node
   * @param {string} pseudo
   * @param {boolean} isInherited
   * @returns {boolean}
   */
  // eslint-disable-next-line complexity
  #pseudoIsRelevant(node, pseudo, isInherited = false) {
    switch (pseudo) {
      case "::after":
      case "::before":
      case "::first-letter":
      case "::first-line":
      case "::selection":
      case "::highlight":
      case "::target-text":
        return !isInherited;
      case "::marker":
        return !isInherited && this.#nodeIsListItem(node);
      case "::backdrop":
        return !isInherited && node.matches(":modal, :popover-open");
      case "::cue":
        return !isInherited && node.nodeName == "VIDEO";
      case "::file-selector-button":
        return !isInherited && node.nodeName == "INPUT" && node.type == "file";
      case "::details-content": {
        const isDetailsNode = node.nodeName == "DETAILS";
        if (!isDetailsNode) {
          return false;
        }

        if (!isInherited) {
          return true;
        }

        // If we're getting rules on a parent element, we need to check if the selected
        // element is inside the ::details-content of node
        // We traverse the flattened parent tree until we find the <slot> that implements
        // the pseudo element, as it's easier to handle edge cases like nested <details>,
        // multiple <summary>, etc …
        let traversedNode = this.selectedElement;
        while (traversedNode) {
          if (
            // if we found the <slot> implementing the pseudo element
            traversedNode.implementedPseudoElement === "::details-content" &&
            // and its parent <details> element is the element we're evaluating
            traversedNode.flattenedTreeParentNode === node
          ) {
            // then include the ::details-content rules from that element
            return true;
          }
          // otherwise keep looking up the tree
          traversedNode = traversedNode.flattenedTreeParentNode;
        }

        return false;
      }
      case "::placeholder":
      case "::-moz-placeholder":
        return !isInherited && this.#nodeIsTextfieldLike(node);
      case "::-moz-meter-bar":
        return !isInherited && node.nodeName == "METER";
      case "::-moz-progress-bar":
        return !isInherited && node.nodeName == "PROGRESS";
      case "::-moz-color-swatch":
        return !isInherited && node.nodeName == "INPUT" && node.type == "color";
      case "::-moz-range-progress":
      case "::-moz-range-thumb":
      case "::-moz-range-track":
      case "::slider-fill":
      case "::slider-thumb":
      case "::slider-track":
        return !isInherited && node.nodeName == "INPUT" && node.type == "range";
      case "::view-transition":
      case "::view-transition-group":
      case "::view-transition-image-pair":
      case "::view-transition-old":
      case "::view-transition-new":
        // FIXME: Bug 1909173. Need to handle view transitions peudo-elements
        // for DevTools. For now we skip them.
        return false;
      default:
        console.error("Unhandled pseudo-element " + pseudo);
        return false;
    }
  }

  /**
   * Helper function for #getAllElementRules, returns the rules from a given
   * element. See getApplied for documentation on parameters.
   *
   * @param {DOMNode} node
   * @param {string} pseudo
   * @param {NodeActor} inherited
   * @param {GetAppliedFilterOption} filter
   *
   * @returns {Array<appliedstyle>}
   */
  #getElementRules(node, pseudo, inherited, filter) {
    if (!Element.isInstance(node)) {
      return [];
    }

    // we don't need to retrieve inherited starting style rules
    const includeStartingStyleRules = !inherited;
    const domRules = InspectorUtils.getMatchingCSSRules(
      node,
      pseudo,
      CssLogic.hasVisitedState(node),
      includeStartingStyleRules
    );

    if (!domRules) {
      return [];
    }

    const rules = [];

    const doc = this.inspector.targetActor.window.document;

    // getMatchingCSSRules returns ordered from least-specific to
    // most-specific.
    for (let i = domRules.length - 1; i >= 0; i--) {
      const domRule = domRules[i];
      const isSystem =
        domRule.parentStyleSheet &&
        SharedCssLogic.isAgentStylesheet(domRule.parentStyleSheet);

      // For now, when dealing with InspectorDeclaration, we only care about presentational
      // hints style (e.g. <img height=100>).
      if (
        domRule.declarationOrigin &&
        domRule.declarationOrigin !== "pres-hints"
      ) {
        continue;
      }

      if (isSystem && filter != SharedCssLogic.FILTER.UA) {
        continue;
      }

      if (inherited) {
        // Don't include inherited rules if none of its properties
        // are inheritable.
        let hasInherited = false;
        // This can be on a hot path, so let's use a simple for rule instead of turning
        // domRule.style into an Array to use some on it.
        for (let j = 0, len = domRule.style.length; j < len; j++) {
          if (InspectorUtils.isInheritedProperty(doc, domRule.style[j])) {
            hasInherited = true;
            break;
          }
        }

        if (!hasInherited) {
          continue;
        }
      }

      const ruleActor = this.styleRef(domRule, pseudo);

      rules.push(
        this.#getRuleItem(ruleActor, node, {
          inherited,
          isSystem,
          pseudoElement: pseudo,
        })
      );
    }
    return rules;
  }

  /**
   * Given a node and a CSS rule, walk up the DOM looking for a matching element rule.
   *
   * @param {NodeActor} nodeActor the node
   * @param {CSSStyleRule} matchingRule the rule to find the entry for
   * @return {object | null} An entry as returned by #getAllElementRules, or null if no entry
   *                       matching the passed rule was find
   */
  findEntryMatchingRule(nodeActor, matchingRule) {
    let currentNodeActor = nodeActor;
    while (
      currentNodeActor &&
      currentNodeActor.rawNode.nodeType != Node.DOCUMENT_NODE
    ) {
      for (const entry of this.#getAllElementRules(currentNodeActor, {
        isInherited: nodeActor !== currentNodeActor,
      })) {
        if (entry.rule.rawRule === matchingRule) {
          return entry;
        }
      }

      currentNodeActor = this.walker.parentNode(currentNodeActor);
    }

    // If we reached the document node without finding the rule, return null
    return null;
  }

  /**
   * Helper function for getApplied that fetches a set of style properties that
   * apply to the given node and associated rules
   *
   * @param {NodeActor} node
   * @param {Array} entries
   *   List of appliedstyle objects that lists the rules that apply to the
   *   node. If adding a new rule to the stylesheet, only the new rule entry
   *   is provided and only the style properties that apply to the new
   *   rule is fetched.
   * @param {GetAppliedOptions} options
   * @returns {Array<appliedstyle>} of rule entries that applies to the given node and its associated rules.
   */
  getAppliedProps(node, entries, options) {
    if (options.inherited) {
      let parent = this.walker.parentNode(node);
      while (parent && parent.rawNode.nodeType != Node.DOCUMENT_NODE) {
        entries = entries.concat(
          this.#getAllElementRules(parent, {
            isInherited: true,
            skipPseudo: options.skipPseudo,
            filter: options.filter,
          })
        );
        parent = this.walker.parentNode(parent);
      }
    }

    if (options.matchedSelectors) {
      for (const entry of entries) {
        if (entry.rule.type === ELEMENT_STYLE) {
          continue;
        }
        entry.matchedSelectorIndexes = [];

        const domRule = entry.rule.rawRule;
        const element = entry.inherited
          ? entry.inherited.rawNode
          : node.rawNode;

        const pseudos = [];
        const { bindingElement, pseudo } =
          CssLogic.getBindingElementAndPseudo(element);

        // if we couldn't find a binding element, we can't call domRule.selectorMatchesElement,
        // so bail out
        if (!bindingElement) {
          continue;
        }

        if (pseudo) {
          pseudos.push(pseudo);
        } else if (entry.rule.pseudoElements.size) {
          // if `node` is not a pseudo element but the rule applies to some pseudo elements,
          // we need to pass those to CSSStyleRule#selectorMatchesElement
          pseudos.push(...entry.rule.pseudoElements);
        } else {
          // If the rule doesn't apply to any pseudo, set a null item so we'll still do
          // the proper check below
          pseudos.push(null);
        }

        const relevantLinkVisited = CssLogic.hasVisitedState(bindingElement);
        const len = domRule.selectorCount;
        for (let i = 0; i < len; i++) {
          for (const pseudoElementName of pseudos) {
            if (
              domRule.selectorMatchesElement(
                i,
                bindingElement,
                pseudoElementName,
                relevantLinkVisited
              )
            ) {
              entry.matchedSelectorIndexes.push(i);
              // if we matched the selector for one pseudo, no need to check the other ones
              break;
            }
          }
        }
      }
    }

    const computedStyle = this.cssLogic.computedStyle;
    if (computedStyle) {
      // Add all the keyframes rule associated with the element
      let animationNames = computedStyle.animationName.split(",");
      animationNames = animationNames.map(name => name.trim());

      if (animationNames) {
        // Traverse through all the available keyframes rule and add
        // the keyframes rule that matches the computed animation name
        for (const keyframesRule of this.cssLogic.keyframesRules) {
          if (!animationNames.includes(keyframesRule.name)) {
            continue;
          }

          for (const rule of keyframesRule.cssRules) {
            entries.push(
              this.#getRuleItem(this.styleRef(rule), null, {
                keyframes: this.styleRef(keyframesRule),
              })
            );
          }
        }
      }

      // Add all the @position-try associated with the element
      const positionTryIdents = new Set();
      for (const part of computedStyle.positionTryFallbacks.split(",")) {
        const name = part.trim();
        if (name.startsWith("--")) {
          positionTryIdents.add(name);
        }
      }

      for (const positionTryRule of this.cssLogic.positionTryRules) {
        if (!positionTryIdents.has(positionTryRule.name)) {
          continue;
        }

        entries.push(this.#getRuleItem(this.styleRef(positionTryRule)));
      }
    }

    return entries;
  }

  /**
   * Get layout-related information about a node.
   * This method returns an object with properties giving information about
   * the node's margin, border, padding and content region sizes, as well
   * as information about the type of box, its position, z-index, etc...
   *
   * @param {NodeActor} node
   * @param {object} options The only available option is autoMargins.
   * If set to true, the element's margins will receive an extra check to see
   * whether they are set to "auto" (knowing that the computed-style in this
   * case would return "0px").
   * The returned object will contain an extra property (autoMargins) listing
   * all margins that are set to auto, e.g. {top: "auto", left: "auto"}.
   * @return {object}
   */
  getLayout(node, options) {
    this.cssLogic.highlight(node.rawNode);

    const layout = {};

    // First, we update the first part of the box model view, with
    // the size of the element.

    const clientRect = node.rawNode.getBoundingClientRect();
    layout.width = parseFloat(clientRect.width.toPrecision(6));
    layout.height = parseFloat(clientRect.height.toPrecision(6));

    // We compute and update the values of margins & co.
    const style = CssLogic.getComputedStyle(node.rawNode);
    for (const prop of [
      "position",
      "top",
      "right",
      "bottom",
      "left",
      "margin-top",
      "margin-right",
      "margin-bottom",
      "margin-left",
      "padding-top",
      "padding-right",
      "padding-bottom",
      "padding-left",
      "border-top-width",
      "border-right-width",
      "border-bottom-width",
      "border-left-width",
      "z-index",
      "box-sizing",
      "display",
      "float",
      "line-height",
    ]) {
      layout[prop] = style.getPropertyValue(prop);
    }

    if (options.autoMargins) {
      layout.autoMargins = this.processMargins(this.cssLogic);
    }

    for (const i in this.map) {
      const property = this.map[i].property;
      this.map[i].value = parseFloat(style.getPropertyValue(property));
    }

    return layout;
  }

  /**
   * Find 'auto' margin properties.
   */
  processMargins(cssLogic) {
    const margins = {};

    for (const prop of ["top", "bottom", "left", "right"]) {
      const info = cssLogic.getPropertyInfo("margin-" + prop);
      const selectors = info.matchedSelectors;
      if (selectors && !!selectors.length && selectors[0].value == "auto") {
        margins[prop] = "auto";
      }
    }

    return margins;
  }

  /**
   * On page navigation, tidy up remaining objects.
   */
  onFrameUnload() {
    this.styleSheetsByRootNode = new WeakMap();
  }

  #onStylesheetUpdated = ({ resourceId, updateKind, updates = {} }) => {
    if (updateKind != "style-applied") {
      return;
    }
    const kind = updates.event.kind;
    // Duplicate refMap content before looping as onStyleApplied may mutate it
    for (const styleActor of [...this.refMap.values()]) {
      // Ignore StyleRuleActor that don't have a parent stylesheet.
      // i.e. actor whose type is ELEMENT_STYLE.
      if (!styleActor._parentSheet) {
        continue;
      }
      const resId = this.styleSheetsManager.getStyleSheetResourceId(
        styleActor._parentSheet
      );
      if (resId === resourceId) {
        styleActor.onStyleApplied(kind);
      }
    }
    this.#styleApplied(kind);
  };

  /**
   * Helper function for adding a new rule and getting its applied style
   * properties
   *
   * @param NodeActor node
   * @param CSSStyleRule rule
   * @returns Array containing its applied style properties
   */
  getNewAppliedProps(node, rule) {
    const ruleActor = this.styleRef(rule);
    return this.getAppliedProps(node, [this.#getRuleItem(ruleActor)], {
      matchedSelectors: true,
    });
  }

  /**
   * Adds a new rule, and returns the new StyleRuleActor.
   *
   * @param {NodeActor} node
   * @param {string} pseudoClasses The list of pseudo classes to append to the
   *        new selector.
   * @returns {StyleRuleActor} the new rule
   */
  async addNewRule(node, pseudoClasses) {
    let sheet = null;
    const doc = node.rawNode.ownerDocument;
    const rootNode = node.rawNode.getRootNode();

    if (
      this.styleSheetsByRootNode.has(rootNode) &&
      this.styleSheetsByRootNode.get(rootNode).ownerNode?.isConnected
    ) {
      sheet = this.styleSheetsByRootNode.get(rootNode);
    } else {
      sheet = await this.styleSheetsManager.addStyleSheet(
        doc,
        node.rawNode.containingShadowRoot || doc.documentElement
      );
      this.styleSheetsByRootNode.set(rootNode, sheet);
    }

    const cssRules = sheet.cssRules;

    // Get the binding element in case node is a pseudo element, so we can properly
    // build the selector
    const { bindingElement, pseudo } = CssLogic.getBindingElementAndPseudo(
      node.rawNode
    );
    const classes = [...bindingElement.classList];

    let selector;
    if (bindingElement.id) {
      selector = "#" + CSS.escape(bindingElement.id);
    } else if (classes.length) {
      selector = "." + classes.map(c => CSS.escape(c)).join(".");
    } else {
      selector = bindingElement.localName;
    }

    if (pseudo && pseudoClasses?.length) {
      throw new Error(
        `Can't set pseudo classes (${JSON.stringify(pseudoClasses)}) onto a pseudo element (${pseudo})`
      );
    }

    if (pseudo) {
      selector += pseudo;
    }
    if (pseudoClasses && pseudoClasses.length) {
      selector += pseudoClasses.join("");
    }

    const index = sheet.insertRule(selector + " {}", cssRules.length);

    const resourceId = this.styleSheetsManager.getStyleSheetResourceId(sheet);
    let authoredText = await this.styleSheetsManager.getText(resourceId);
    authoredText += "\n" + selector + " {\n" + "}";
    await this.styleSheetsManager.setStyleSheetText(resourceId, authoredText);

    const cssRule = sheet.cssRules.item(index);
    const ruleActor = this.styleRef(cssRule, null, true);

    this.inspector.targetActor.emit("track-css-change", {
      ...ruleActor.metadata,
      type: "rule-add",
      add: null,
      remove: null,
      selector,
    });

    return { entries: this.getNewAppliedProps(node, cssRule) };
  }

  /**
   * Cause all StyleRuleActor instances of observed CSS rules to check whether the
   * states of their declarations have changed.
   *
   * Observed rules are the latest rules returned by a call to PageStyleActor.getApplied()
   *
   * This is necessary because changes in one rule can cause the declarations in another
   * to not be applicable (inactive CSS). The observers of those rules should be notified.
   * Rules will fire a "rule-updated" event if any of their declarations changed state.
   *
   * Call this method whenever a CSS rule is mutated:
   * - a CSS declaration is added/changed/disabled/removed
   * - a selector is added/changed/removed
   *
   * @param {Array<StyleRuleActor>} rulesToForceRefresh: An array of rules that,
   *        if observed, should be refreshed even if the state of their declaration
   *        didn't change.
   */
  refreshObservedRules(rulesToForceRefresh) {
    for (const rule of this.#observedRules) {
      const force = rulesToForceRefresh && rulesToForceRefresh.includes(rule);
      rule.maybeRefresh(force);
    }
  }

  /**
   * Get an array of existing attribute values in a node document.
   *
   * @param {string} search: A string to filter attribute value on.
   * @param {string} attributeType: The type of attribute we want to retrieve the values.
   * @param {Element} node: The element we want to get possible attributes for. This will
   *        be used to get the document where the search is happening.
   * @returns {Array<string>} An array of strings
   */
  getAttributesInOwnerDocument(search, attributeType, node) {
    if (!search) {
      throw new Error("search is mandatory");
    }

    // In a non-fission world, a node from an iframe shares the same `rootNode` as a node
    // in the top-level document. So here we need to retrieve the document from the node
    // in parameter in order to retrieve the right document.
    // This may change once we have a dedicated walker for every target in a tab, as we'll
    // be able to directly talk to the "right" walker actor.
    const targetDocument = node.rawNode.ownerDocument;

    // We store the result in a Set which will contain the attribute value
    const result = new Set();
    const lcSearch = search.toLowerCase();
    this.#collectAttributesFromDocumentDOM(
      result,
      lcSearch,
      attributeType,
      targetDocument,
      node.rawNode
    );
    this.#collectAttributesFromDocumentStyleSheets(
      result,
      lcSearch,
      attributeType,
      targetDocument
    );

    return Array.from(result).sort();
  }

  /**
   * Collect attribute values from the document DOM tree, matching the passed filter and
   * type, to the result Set.
   *
   * @param {Set<string>} result: A Set to which the results will be added.
   * @param {string} search: A string to filter attribute value on.
   * @param {string} attributeType: The type of attribute we want to retrieve the values.
   * @param {Document} targetDocument: The document the search occurs in.
   * @param {Node} currentNode: The current element rawNode
   */
  #collectAttributesFromDocumentDOM(
    result,
    search,
    attributeType,
    targetDocument,
    nodeRawNode
  ) {
    // In order to retrieve attributes from DOM elements in the document, we're going to
    // do a query on the root node using attributes selector, to directly get the elements
    // matching the attributes we're looking for.

    // For classes, we need something a bit different as the className we're looking
    // for might not be the first in the attribute value, meaning we can't use the
    // "attribute starts with X" selector.
    const attributeSelectorPositionChar = attributeType === "class" ? "*" : "^";
    const selector = `[${attributeType}${attributeSelectorPositionChar}=${search} i]`;

    const matchingElements = targetDocument.querySelectorAll(selector);

    for (const element of matchingElements) {
      if (element === nodeRawNode) {
        return;
      }
      // For class attribute, we need to add the elements of the classList that match
      // the filter string.
      if (attributeType === "class") {
        for (const cls of element.classList) {
          if (!result.has(cls) && cls.toLowerCase().startsWith(search)) {
            result.add(cls);
          }
        }
      } else {
        const { value } = element.attributes[attributeType];
        // For other attributes, we can directly use the attribute value.
        result.add(value);
      }
    }
  }

  /**
   * Collect attribute values from the document stylesheets, matching the passed filter
   * and type, to the result Set.
   *
   * @param {Set<string>} result: A Set to which the results will be added.
   * @param {string} search: A string to filter attribute value on.
   * @param {string} attributeType: The type of attribute we want to retrieve the values.
   *                       It only supports "class" and "id" at the moment.
   * @param {Document} targetDocument: The document the search occurs in.
   */
  #collectAttributesFromDocumentStyleSheets(
    result,
    search,
    attributeType,
    targetDocument
  ) {
    if (attributeType !== "class" && attributeType !== "id") {
      return;
    }

    // We loop through all the stylesheets and their rules, recursively so we can go through
    // nested rules, and then use the lexer to only get the attributes we're looking for.
    const traverseRules = ruleList => {
      for (const rule of ruleList) {
        this.#collectAttributesFromRule(result, rule, search, attributeType);
        if (rule.cssRules) {
          traverseRules(rule.cssRules);
        }
      }
    };
    for (const styleSheet of targetDocument.styleSheets) {
      traverseRules(styleSheet.rules);
    }
  }

  /**
   * Collect attribute values from the rule, matching the passed filter and type, to the
   * result Set.
   *
   * @param {Set<string>} result: A Set to which the results will be added.
   * @param {Rule} rule: The rule the search occurs in.
   * @param {string} search: A string to filter attribute value on.
   * @param {string} attributeType: The type of attribute we want to retrieve the values.
   *                       It only supports "class" and "id" at the moment.
   */
  #collectAttributesFromRule(result, rule, search, attributeType) {
    const shouldRetrieveClasses = attributeType === "class";
    const shouldRetrieveIds = attributeType === "id";

    const { selectorText } = rule;
    // If there's no selectorText, or if the selectorText does not include the
    // filter, we can bail out.
    if (!selectorText || !selectorText.toLowerCase().includes(search)) {
      return;
    }

    // Check if we should parse the selectorText (do we need to check for class/id and
    // if so, does the selector contains class/id related chars).
    const parseForClasses =
      shouldRetrieveClasses &&
      selectorText.toLowerCase().includes(`.${search}`);
    const parseForIds =
      shouldRetrieveIds && selectorText.toLowerCase().includes(`#${search}`);

    if (!parseForClasses && !parseForIds) {
      return;
    }

    const lexer = new InspectorCSSParser(selectorText);
    let token;
    while ((token = lexer.nextToken())) {
      if (
        token.tokenType === "Delim" &&
        shouldRetrieveClasses &&
        token.text === "."
      ) {
        token = lexer.nextToken();
        if (
          token.tokenType === "Ident" &&
          token.text.toLowerCase().startsWith(search)
        ) {
          result.add(token.text);
        }
      }
      if (token.tokenType === "IDHash" && shouldRetrieveIds) {
        const idWithoutHash = token.value;
        if (idWithoutHash.startsWith(search)) {
          result.add(idWithoutHash);
        }
      }
    }
  }
}
exports.PageStyleActor = PageStyleActor;
