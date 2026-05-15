/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * About the objects defined in this file:
 * - CssLogic contains style information about a view context. It provides
 *   access to 2 sets of objects: Css[Sheet|Rule|Selector] provide access to
 *   information that does not change when the selected element changes while
 *   Css[Property|Selector]Info provide information that is dependent on the
 *   selected element.
 *   Its key methods are highlight(), getPropertyInfo() and forEachSheet(), etc
 *
 * - CssSheet provides a more useful API to a DOM CSSSheet for our purposes,
 *   including shortSource and href.
 * - CssRule a more useful API to a DOM CSSRule including access to the group
 *   of CssSelectors that the rule provides properties for
 * - CssSelector A single selector - i.e. not a selector group. In other words
 *   a CssSelector does not contain ','. This terminology is different from the
 *   standard DOM API, but more inline with the definition in the spec.
 *
 * - CssPropertyInfo contains style information for a single property for the
 *   highlighted element.
 * - CssSelectorInfo is a wrapper around CssSelector, which adds sorting with
 *   reference to the selected element.
 */

"use strict";

const nodeConstants = require("resource://devtools/shared/dom-node-constants.js");
const {
  getBindingElementAndPseudo,
  getMatchingCSSRules,
  hasVisitedState,
  isAgentStylesheet,
  isAuthorStylesheet,
  isUserStylesheet,
  shortSource,
  ELEMENT_BACKED_PSEUDO_ELEMENTS,
  FILTER,
  STATUS,
} = require("resource://devtools/shared/inspector/css-logic.js");

const COMPAREMODE = {
  BOOLEAN: "bool",
  INTEGER: "int",
};

class CssLogic {
  /**
   * If the element has an id, return '#id'. Otherwise return 'tagname[n]' where
   * n is the index of this element in its siblings.
   * <p>A technically more 'correct' output from the no-id case might be:
   * 'tagname:nth-of-type(n)' however this is unlikely to be more understood
   * and it is longer.
   *
   * @param {Element} element the element for which you want the short name.
   * @return {string} the string to be displayed for element.
   */
  static getShortName(element) {
    if (!element) {
      return "null";
    }
    if (element.id) {
      return "#" + element.id;
    }
    let priorSiblings = 0;
    let temp = element;
    while ((temp = temp.previousElementSibling)) {
      priorSiblings++;
    }
    return element.tagName + "[" + priorSiblings + "]";
  }

  /**
   * Get a string list of selectors for a given DOMRule.
   *
   * @param {DOMRule} domRule
   *        The DOMRule to parse.
   * @param {boolean} desugared
   *        Set to true to get the desugared selector (see https://drafts.csswg.org/css-nesting-1/#nest-selector)
   * @return {Array}
   *         An array of string selectors.
   */
  static getSelectors(domRule, desugared = false) {
    const className = ChromeUtils.getClassName(domRule);

    if (className === "CSSNestedDeclarations") {
      // CSSNestedDeclarations don't have selectorText/selectorCount/selectorTextAt.
      // For now, only set `&`, but maybe we could include the ancestor rules' selectors
      return ["&"];
    }

    if (className !== "CSSStyleRule") {
      // Return empty array since CSSRule#selectorCount assumes only STYLE_RULE type.
      return [];
    }

    const selectors = [];

    const len = domRule.selectorCount;
    for (let i = 0; i < len; i++) {
      selectors.push(domRule.selectorTextAt(i, desugared));
    }
    return selectors;
  }

  /**
   * Given a node, check to see if it is a ::before or ::after element.
   * If so, return the node that is accessible from within the document
   * (the parent of the anonymous node), along with which pseudo element
   * it was.  Otherwise, return the node itself.
   *
   * @returns {object}
   *            - {DOMNode} node The non-anonymous node
   *            - {string} pseudo One of ':marker', ':before', ':after', or null.
   */
  static getBindingElementAndPseudo = getBindingElementAndPseudo;

  /**
   * Get the computed style on a node.  Automatically handles reading
   * computed styles on a ::before/::after element by reading on the
   * parent node with the proper pseudo argument.
   *
   * @param {Node}
   * @returns {CSSStyleDeclaration}
   */
  static getComputedStyle(node) {
    if (
      !node ||
      Cu.isDeadWrapper(node) ||
      node.nodeType !== nodeConstants.ELEMENT_NODE ||
      !node.ownerGlobal
    ) {
      return null;
    }

    const { bindingElement, pseudo } =
      CssLogic.getBindingElementAndPseudo(node);

    // For reasons that still escape us, pseudo-elements can sometimes be "unattached" (i.e.
    // not have a parentNode defined). This seems to happen when a page is reloaded while
    // the inspector is open. Bailing out here ensures that the inspector does not fail at
    // presenting DOM nodes and CSS styles when this happens. This is a temporary measure.
    // See bug 1506792.
    if (!bindingElement) {
      return null;
    }

    return node.ownerGlobal.getComputedStyle(bindingElement, pseudo);
  }

  /**
   * Get a source for a stylesheet, taking into account embedded stylesheets
   * for which we need to use document.defaultView.location.href rather than
   * sheet.href
   *
   * @param {CSSStyleSheet} sheet the DOM object for the style sheet.
   * @return {string} the address of the stylesheet.
   */
  static href(sheet) {
    return sheet.href || sheet.associatedDocument.location;
  }

  /**
   * Returns true if the given node has visited state.
   */
  static hasVisitedState = hasVisitedState;

  // Used for tracking matched CssSelector objects.
  matchId = 0;

  // Used for tracking unique CssSheet/CssRule/CssSelector objects, in a run of
  // processMatchedSelectors().
  passId = 0;

  // Both setup by highlight().
  viewedElement = null;
  viewedDocument = null;

  #propertyInfos = {};

  // The cache of the known sheets.
  #sheets = null;

  // Have the sheets been cached?
  #sheetsCached = false;

  #sheetIndex = 0;

  // The total number of rules, in all stylesheets, after filtering.
  #ruleCount = 0;

  // The computed styles for the viewedElement.
  #computedStyle = null;

  // Source filter. Only display properties coming from the given source
  #sourceFilter = FILTER.USER;

  #matchedRules = null;
  #matchedSelectors = null;

  // Cached keyframes rules in all stylesheets
  #keyframesRules = null;

  // Cached @position-try rules in all stylesheets
  #positionTryRules = null;

  /**
   * Reset various properties
   */
  reset() {
    this.#propertyInfos = {};
    this.#ruleCount = 0;
    this.#sheetIndex = 0;
    this.#sheets = {};
    this.#sheetsCached = false;
    this.#matchedRules = null;
    this.#matchedSelectors = null;
    this.#keyframesRules = [];
    this.#positionTryRules = [];
  }

  /**
   * Focus on a new element - remove the style caches.
   *
   * @param {Element} aViewedElement the element the user has highlighted
   * in the Inspector.
   */
  highlight(viewedElement) {
    if (!viewedElement) {
      this.viewedElement = null;
      this.viewedDocument = null;
      this.#computedStyle = null;
      this.reset();
      return;
    }

    if (viewedElement === this.viewedElement) {
      return;
    }

    this.viewedElement = viewedElement;

    const doc = this.viewedElement.ownerDocument;
    if (doc != this.viewedDocument) {
      // New document: clear/rebuild the cache.
      this.viewedDocument = doc;

      // Hunt down top level stylesheets, and cache them.
      this.#cacheSheets();
    } else {
      // Clear cached data in the CssPropertyInfo objects.
      this.#propertyInfos = {};
    }

    this.#matchedRules = null;
    this.#matchedSelectors = null;
    this.#computedStyle = CssLogic.getComputedStyle(this.viewedElement);
  }

  /**
   * Get the values of all the computed CSS properties for the highlighted
   * element.
   *
   * @returns {object} The computed CSS properties for a selected element
   */
  get computedStyle() {
    return this.#computedStyle;
  }

  /**
   * Get the source filter.
   *
   * @returns {string} The source filter being used.
   */
  get sourceFilter() {
    return this.#sourceFilter;
  }

  /**
   * Source filter. Only display properties coming from the given source (web
   * address). Note that in order to avoid information overload we DO NOT show
   * unmatched system rules.
   *
   * @see FILTER.*
   */
  set sourceFilter(value) {
    const oldValue = this.#sourceFilter;
    this.#sourceFilter = value;

    let ruleCount = 0;

    // Update the CssSheet objects.
    this.forEachSheet(function (sheet) {
      if (sheet.authorSheet && sheet.sheetAllowed) {
        ruleCount += sheet.ruleCount;
      }
    }, this);

    this.#ruleCount = ruleCount;

    // Full update is needed because the this.processMatchedSelectors() method
    // skips UA stylesheets if the filter does not allow such sheets.
    const needFullUpdate = oldValue == FILTER.UA || value == FILTER.UA;

    if (needFullUpdate) {
      this.#matchedRules = null;
      this.#matchedSelectors = null;
      this.#propertyInfos = {};
    } else {
      // Update the CssPropertyInfo objects.
      for (const property in this.#propertyInfos) {
        this.#propertyInfos[property].needRefilter = true;
      }
    }
  }

  /**
   * Return a CssPropertyInfo data structure for the currently viewed element
   * and the specified CSS property. If there is no currently viewed element we
   * return an empty object.
   *
   * @param {string} property The CSS property to look for.
   * @return {CssPropertyInfo} a CssPropertyInfo structure for the given
   * property.
   */
  getPropertyInfo(property) {
    if (!this.viewedElement) {
      return {};
    }

    let info = this.#propertyInfos[property];
    if (!info) {
      info = new CssPropertyInfo(this, property);
      this.#propertyInfos[property] = info;
    }

    return info;
  }

  /**
   * Cache all the stylesheets in the inspected document
   *
   * @private
   */
  #cacheSheets() {
    this.passId++;
    this.reset();

    // styleSheets isn't an array, but forEach can work on it anyway
    const styleSheets = InspectorUtils.getAllStyleSheets(
      this.viewedDocument,
      true
    );
    Array.prototype.forEach.call(styleSheets, this.#cacheSheet, this);

    this.#sheetsCached = true;
  }

  /**
   * Cache a stylesheet if it falls within the requirements: if it's enabled,
   * and if the @media is allowed. This method also walks through the stylesheet
   * cssRules to find @imported rules, to cache the stylesheets of those rules
   * as well. In addition, @keyframes and @position-try rules in the stylesheet are cached.
   *
   * @private
   * @param {CSSStyleSheet} domSheet the CSSStyleSheet object to cache.
   */
  #cacheSheet(domSheet) {
    if (domSheet.disabled) {
      return;
    }

    // Only work with stylesheets that have their media allowed.
    if (!this.mediaMatches(domSheet)) {
      return;
    }

    // Cache the sheet.
    const cssSheet = this.getSheet(domSheet, this.#sheetIndex++);
    if (cssSheet.passId != this.passId) {
      cssSheet.passId = this.passId;

      // Find import, keyframes and position-try rules. We loop through all the stylesheet
      // recursively, so we can go through nested rules.
      const traverseRules = ruleList => {
        for (const aDomRule of ruleList) {
          const ruleClassName = ChromeUtils.getClassName(aDomRule);
          if (
            ruleClassName === "CSSImportRule" &&
            aDomRule.styleSheet &&
            this.mediaMatches(aDomRule)
          ) {
            this.#cacheSheet(aDomRule.styleSheet);
          } else if (ruleClassName === "CSSKeyframesRule") {
            this.#keyframesRules.push(aDomRule);
          } else if (ruleClassName === "CSSPositionTryRule") {
            this.#positionTryRules.push(aDomRule);
          }

          if (aDomRule.cssRules) {
            traverseRules(aDomRule.cssRules);
          }
        }
      };

      traverseRules(cssSheet.getCssRules());
    }
  }

  /**
   * Retrieve the list of stylesheets in the document.
   *
   * @return {Array} the list of stylesheets in the document.
   */
  get sheets() {
    if (!this.#sheetsCached) {
      this.#cacheSheets();
    }

    const sheets = [];
    this.forEachSheet(function (sheet) {
      if (sheet.authorSheet) {
        sheets.push(sheet);
      }
    }, this);

    return sheets;
  }

  /**
   * Retrieve the list of keyframes rules in the document.
   *
   * @ return {array} the list of keyframes rules in the document.
   */
  get keyframesRules() {
    if (!this.#sheetsCached) {
      this.#cacheSheets();
    }
    return this.#keyframesRules;
  }

  /**
   * Retrieve the list of @position-try rules in the document.
   *
   * @returns {CSSPositionTryRule[]} the list of @position-try rules in the document.
   */
  get positionTryRules() {
    if (!this.#sheetsCached) {
      this.#cacheSheets();
    }
    return this.#positionTryRules;
  }

  /**
   * Retrieve a CssSheet object for a given a CSSStyleSheet object. If the
   * stylesheet is already cached, you get the existing CssSheet object,
   * otherwise the new CSSStyleSheet object is cached.
   *
   * @param {CSSStyleSheet} domSheet the CSSStyleSheet object you want.
   * @param {number} index the index, within the document, of the stylesheet.
   *
   * @return {CssSheet} the CssSheet object for the given CSSStyleSheet object.
   */
  getSheet(domSheet, index) {
    let cacheId = "";

    if (domSheet.href) {
      cacheId = domSheet.href;
    } else if (domSheet.associatedDocument) {
      cacheId = domSheet.associatedDocument.location;
    }

    let sheet = null;
    let sheetFound = false;

    if (cacheId in this.#sheets) {
      for (sheet of this.#sheets[cacheId]) {
        if (sheet.domSheet === domSheet) {
          if (index != -1) {
            sheet.index = index;
          }
          sheetFound = true;
          break;
        }
      }
    }

    if (!sheetFound) {
      if (!(cacheId in this.#sheets)) {
        this.#sheets[cacheId] = [];
      }

      sheet = new CssSheet(this, domSheet, index);
      if (sheet.sheetAllowed && sheet.authorSheet) {
        this.#ruleCount += sheet.ruleCount;
      }

      this.#sheets[cacheId].push(sheet);
    }

    return sheet;
  }

  /**
   * Process each cached stylesheet in the document using your callback.
   *
   * @param {function} callback the function you want executed for each of the
   * CssSheet objects cached.
   * @param {object} scope the scope you want for the callback function. scope
   * will be the this object when callback executes.
   */
  forEachSheet(callback, scope) {
    for (const cacheId in this.#sheets) {
      const sheets = this.#sheets[cacheId];
      for (let i = 0; i < sheets.length; i++) {
        // We take this as an opportunity to clean dead sheets
        try {
          const sheet = sheets[i];
          // If accessing domSheet raises an exception, then the style
          // sheet is a dead object.
          sheet.domSheet;
          callback.call(scope, sheet, i, sheets);
        } catch (e) {
          sheets.splice(i, 1);
          i--;
        }
      }
    }
  }

  /**

  /**
   * Get the number CSSRule objects in the document, counted from all of
   * the stylesheets. System sheets are excluded. If a filter is active, this
   * tells only the number of CSSRule objects inside the selected
   * CSSStyleSheet.
   *
   * WARNING: This only provides an estimate of the rule count, and the results
   * could change at a later date. Todo remove this
   *
   * @return {number} the number of CSSRule (all rules).
   */
  get ruleCount() {
    if (!this.#sheetsCached) {
      this.#cacheSheets();
    }

    return this.#ruleCount;
  }

  /**
   * Process the CssSelector objects that match the highlighted element and its
   * parent elements.
   *
   * This method also includes all of the element.style properties, for each
   * highlighted element parent and for the highlighted element itself.
   *
   * @returns {Array} An array of arrays with the following items:
   *          - 0: {CssSelector} selector
   *          - 1: {number} status (from STATUS)
   *          - 2: {number} distance
   */
  processMatchedSelectors() {
    if (this.#matchedSelectors) {
      this.passId++;
      for (const [rule] of this.#matchedRules) {
        rule.passId = this.passId;
      }

      return this.#matchedSelectors;
    }

    if (!this.#matchedRules) {
      this.#buildMatchedRules();
    }

    this.#matchedSelectors = [];
    this.passId++;

    for (const matchedRule of this.#matchedRules) {
      const [rule, status, distance] = matchedRule;
      const includeAllSelectors =
        rule.domRule.declarationOrigin === "style-attribute" ||
        rule.domRule.declarationOrigin === "pres-hints" ||
        // If we have a CSSNestedDeclaration at this point, we have a single selector
        // (which should be `&`), and it should be included
        ChromeUtils.getClassName(rule.domRule) === "CSSNestedDeclarations";

      for (const selector of rule.selectors) {
        if (
          selector.matchId !== this.matchId &&
          (includeAllSelectors ||
            this.selectorMatchesElement(rule.domRule, selector.selectorIndex))
        ) {
          selector.matchId = this.matchId;
          this.#matchedSelectors.push([selector, status, distance]);
        }
      }

      rule.passId = this.passId;
    }

    return this.#matchedSelectors;
  }

  /**
   * Check if the given selector matches the highlighted element or any of its
   * parents.
   *
   * @private
   * @param {DOMRule} domRule
   *        The DOM Rule containing the selector.
   * @param {number} idx
   *        The index of the selector within the DOMRule.
   * @return {boolean}
   *         true if the given selector matches the highlighted element or any
   *         of its parents, otherwise false is returned.
   */
  selectorMatchesElement(domRule, idx) {
    let element = this.viewedElement;
    do {
      const { bindingElement, pseudo } =
        CssLogic.getBindingElementAndPseudo(element);
      if (domRule.selectorMatchesElement(idx, bindingElement, pseudo)) {
        return true;
      }

      for (const pseudoElement of ELEMENT_BACKED_PSEUDO_ELEMENTS) {
        if (domRule.selectorMatchesElement(idx, element, pseudoElement)) {
          return true;
        }
      }
    } while (
      // Loop on flattenedTreeParentNode instead of parentNode to reach the
      // shadow host from the shadow dom.
      (element = element.flattenedTreeParentNode) &&
      element.nodeType === nodeConstants.ELEMENT_NODE
    );

    return false;
  }

  /**
   * Check if the highlighted element or its parents have matched selectors.
   *
   * @param {Array<string>} properties: The list of properties you want to check if they
   * have matched selectors or not. For CSS variables, this will check if the variable
   * is set OR used in a matching rule.
   * @return {Set<string>} A Set containing the properties that do have matched selectors.
   */
  hasMatchedSelectors(properties) {
    if (!this.#matchedRules) {
      this.#buildMatchedRules();
    }

    const result = new Set();

    for (const [rule, status] of this.#matchedRules) {
      // Getting the rule cssText can be costly, so cache it
      let cssText;
      const getCssText = () => {
        if (cssText === undefined) {
          cssText = rule.domRule.cssText;
        }
        return cssText;
      };

      // Loop through properties in reverse as we're removing items from it and we don't
      // want to mess with the iteration.
      for (let i = properties.length - 1; i >= 0; i--) {
        const property = properties[i];
        // We just need to find if a rule has this property while it matches
        // the viewedElement (or its parents).
        if (
          // check if the property is assigned
          (rule.isPropertyAssigned(property) ||
            // or if this is a css variable, if it's being used in the rule.
            (property.startsWith("--") &&
              // we may have false positive for dashed ident or the variable being
              // used in comment/string, but the tradeoff seems okay, as we would have
              // to parse the value of each declaration, which could be costly.
              new RegExp(`${property}[^A-Za-z0-9_-]`).test(getCssText()))) &&
          (status == STATUS.MATCHED ||
            (status == STATUS.PARENT_MATCH &&
              InspectorUtils.isInheritedProperty(
                this.viewedDocument,
                property
              )))
        ) {
          result.add(property);
          // Once the property has a matched selector, we can remove it from the array
          properties.splice(i, 1);
        }
      }

      if (!properties.length) {
        return result;
      }
    }

    return result;
  }

  /**
   * Build the array of matched rules for the currently highlighted element.
   * The array will hold rules that match the viewedElement and its parents.
   *
   * @private
   */
  #buildMatchedRules() {
    let domRules;
    let element = this.viewedElement;
    const filter = this.sourceFilter;
    let sheetIndex = 0;

    // distance is used to tell us how close an ancestor is to an element e.g.
    //  0: The rule is directly applied to the current element.
    // -1: The rule is inherited from the current element's first parent.
    // -2: The rule is inherited from the current element's second parent.
    // etc.
    let distance = 0;

    this.matchId++;
    this.passId++;
    this.#matchedRules = [];

    if (!element) {
      return;
    }

    do {
      const status =
        this.viewedElement === element ? STATUS.MATCHED : STATUS.PARENT_MATCH;

      try {
        domRules = getMatchingCSSRules(element);
      } catch (ex) {
        console.log("CL__buildMatchedRules error: " + ex);
        continue;
      }

      // getMatchingCSSRules can return null with a shadow DOM element.
      if (domRules !== null) {
        // getMatchingCSSRules returns ordered from least-specific to most-specific,
        // but we do want them from most-specific to least specific, so we need to loop
        // through the rules backward.
        for (let i = domRules.length - 1; i >= 0; i--) {
          const domRule = domRules[i];
          if (domRule.declarationOrigin) {
            // We only consume element.style and pres hint declarations for now
            if (
              domRule.declarationOrigin !== "style-attribute" &&
              domRule.declarationOrigin !== "pres-hints"
            ) {
              continue;
            }

            const rule = new CssRule(
              null,
              {
                style: domRule.style,
                declarationOrigin: domRule.declarationOrigin,
              },
              element
            );
            rule.matchId = this.matchId;
            rule.passId = this.passId;
            this.#matchedRules.push([rule, status, distance]);

            continue;
          }
          const sheet = this.getSheet(domRule.parentStyleSheet, -1);
          if (sheet.passId !== this.passId) {
            sheet.index = sheetIndex++;
            sheet.passId = this.passId;
          }

          if (filter === FILTER.USER && !sheet.authorSheet) {
            continue;
          }

          const rule = sheet.getRule(domRule);
          if (rule.passId === this.passId) {
            continue;
          }

          rule.matchId = this.matchId;
          rule.passId = this.passId;
          this.#matchedRules.push([rule, status, distance]);
        }
      }

      distance--;
    } while (
      // Loop on flattenedTreeParentNode instead of parentNode to reach the
      // shadow host from the shadow dom.
      (element = element.flattenedTreeParentNode) &&
      element.nodeType === nodeConstants.ELEMENT_NODE
    );
  }

  /**
   * Tells if the given DOM CSS object matches the current view media.
   *
   * @param {object} domObject The DOM CSS object to check.
   * @return {boolean} True if the DOM CSS object matches the current view
   * media, or false otherwise.
   */
  mediaMatches(domObject) {
    const mediaText = domObject.media.mediaText;
    return (
      !mediaText ||
      this.viewedDocument.defaultView.matchMedia(mediaText).matches
    );
  }
}

class CssSheet {
  /**
   * A safe way to access cached bits of information about a stylesheet.
   *
   * @class
   * @param {CssLogic} cssLogic pointer to the CssLogic instance working with
   * this CssSheet object.
   * @param {CSSStyleSheet} domSheet reference to a DOM CSSStyleSheet object.
   * @param {number} index tells the index/position of the stylesheet within the
   * main document.
   */
  constructor(cssLogic, domSheet, index) {
    this.#cssLogic = cssLogic;
    this.domSheet = domSheet;
    this.index = this.authorSheet ? index : -100 * index;
  }

  #cssLogic;
  // Cache of the sheets href. Cached by the getter.
  #href = null;

  // Short version of href for use in select boxes etc. Cached by getter.
  #shortSource = null;

  // Cached CssRules from the given stylesheet.
  #rules = {};

  // null for uncached.
  #sheetAllowed = null;

  #ruleCount = -1;

  passId = null;
  #agentSheet = null;
  #authorSheet = null;
  #userSheet = null;

  /**
   * Check if the stylesheet is an agent stylesheet (provided by the browser).
   *
   * @return {boolean} true if this is an agent stylesheet, false otherwise.
   */
  get agentSheet() {
    if (this.#agentSheet === null) {
      this.#agentSheet = isAgentStylesheet(this.domSheet);
    }
    return this.#agentSheet;
  }

  /**
   * Check if the stylesheet is an author stylesheet (provided by the content page).
   *
   * @return {boolean} true if this is an author stylesheet, false otherwise.
   */
  get authorSheet() {
    if (this.#authorSheet === null) {
      this.#authorSheet = isAuthorStylesheet(this.domSheet);
    }
    return this.#authorSheet;
  }

  /**
   * Check if the stylesheet is a user stylesheet (provided by userChrome.css or
   * userContent.css).
   *
   * @return {boolean} true if this is a user stylesheet, false otherwise.
   */
  get userSheet() {
    if (this.#userSheet === null) {
      this.#userSheet = isUserStylesheet(this.domSheet);
    }
    return this.#userSheet;
  }

  /**
   * Check if the stylesheet is disabled or not.
   *
   * @return {boolean} true if this stylesheet is disabled, or false otherwise.
   */
  get disabled() {
    return this.domSheet.disabled;
  }

  /**
   * Get a source for a stylesheet, using CssLogic.href
   *
   * @return {string} the address of the stylesheet.
   */
  get href() {
    if (this.#href) {
      return this.#href;
    }

    this.#href = CssLogic.href(this.domSheet);
    return this.#href;
  }

  /**
   * Create a shorthand version of the href of a stylesheet.
   *
   * @return {string} the shorthand source of the stylesheet.
   */
  get shortSource() {
    if (this.#shortSource) {
      return this.#shortSource;
    }

    this.#shortSource = shortSource(this.domSheet);
    return this.#shortSource;
  }

  /**
   * Tells if the sheet is allowed or not by the current CssLogic.sourceFilter.
   *
   * @return {boolean} true if the stylesheet is allowed by the sourceFilter, or
   * false otherwise.
   */
  get sheetAllowed() {
    if (this.#sheetAllowed !== null) {
      return this.#sheetAllowed;
    }

    this.#sheetAllowed = true;

    const filter = this.#cssLogic.sourceFilter;
    if (filter === FILTER.USER && !this.authorSheet) {
      this.#sheetAllowed = false;
    }
    if (filter !== FILTER.USER && filter !== FILTER.UA) {
      this.#sheetAllowed = filter === this.href;
    }

    return this.#sheetAllowed;
  }

  /**
   * Retrieve the number of rules in this stylesheet.
   *
   * @return {number} the number of CSSRule objects in this stylesheet.
   */
  get ruleCount() {
    try {
      return this.#ruleCount > -1 ? this.#ruleCount : this.getCssRules().length;
    } catch (e) {
      return 0;
    }
  }

  /**
   * Retrieve the array of css rules for this stylesheet.
   *
   * Accessing cssRules on a stylesheet that is not completely loaded can throw a
   * DOMException (Bug 625013). This wrapper will return an empty array instead.
   *
   * @return {Array} array of css rules.
   */
  getCssRules() {
    try {
      return this.domSheet.cssRules;
    } catch (e) {
      return [];
    }
  }

  /**
   * Retrieve a CssRule object for the given CSSStyleRule. The CssRule object is
   * cached, such that subsequent retrievals return the same CssRule object for
   * the same CSSStyleRule object.
   *
   * @param {CSSStyleRule} aDomRule the CSSStyleRule object for which you want a
   * CssRule object.
   * @return {CssRule} the cached CssRule object for the given CSSStyleRule
   * object.
   */
  getRule(domRule) {
    const cacheId = domRule.type + domRule.selectorText;

    let rule = null;
    let ruleFound = false;

    if (cacheId in this.#rules) {
      for (rule of this.#rules[cacheId]) {
        if (rule.domRule === domRule) {
          ruleFound = true;
          break;
        }
      }
    }

    if (!ruleFound) {
      if (!(cacheId in this.#rules)) {
        this.#rules[cacheId] = [];
      }

      rule = new CssRule(this, domRule);
      this.#rules[cacheId].push(rule);
    }

    return rule;
  }

  toString() {
    return "CssSheet[" + this.shortSource + "]";
  }
}

class CssRule {
  /**
   * Information about a single CSSStyleRule.
   *
   * @param {CSSStyleSheet|null} cssSheet the CssSheet object of the stylesheet that
   * holds the CSSStyleRule. If the rule comes from element.style, set this
   * argument to null.
   * @param {CSSStyleRule|InspectorDeclaration} domRule the DOM CSSStyleRule for which you want
   * to cache data. If the rule comes from element.style or presentational attributes, it
   * will be an InspectorDeclaration (object of the form {style: element.style, declarationOrigin: string}).
   * @param {Element} [element] If the rule comes from element.style, then this
   * argument must point to the element.
   * @class
   */
  constructor(cssSheet, domRule, element) {
    this.#cssSheet = cssSheet;
    this.domRule = domRule;

    if (this.#cssSheet) {
      // parse domRule.selectorText on call to this.selectors
      this.#selectors = null;
      this.line = InspectorUtils.getRelativeRuleLine(this.domRule);
      this.column = InspectorUtils.getRuleColumn(this.domRule);
      this.href = this.#cssSheet.href;
      this.authorRule = this.#cssSheet.authorSheet;
      this.userRule = this.#cssSheet.userSheet;
      this.agentRule = this.#cssSheet.agentSheet;
    } else if (element) {
      let selector = "";
      if (domRule.declarationOrigin === "style-attribute") {
        selector = "@element.style";
      } else if (domRule.declarationOrigin === "pres-hints") {
        selector = "@element.attributesStyle";
      }

      this.#selectors = [new CssSelector(this, selector, 0)];
      this.line = -1;
      this.href = "#";
      this.authorRule = true;
      this.userRule = false;
      this.agentRule = false;
      this.sourceElement = element;
    }
  }

  passId = null;

  #cssSheet;
  #selectors;

  /**
   * Check if the parent stylesheet is allowed by the CssLogic.sourceFilter.
   *
   * @return {boolean} true if the parent stylesheet is allowed by the current
   * sourceFilter, or false otherwise.
   */
  get sheetAllowed() {
    return this.#cssSheet ? this.#cssSheet.sheetAllowed : true;
  }

  /**
   * Retrieve the parent stylesheet index/position in the viewed document.
   *
   * @return {number} the parent stylesheet index/position in the viewed
   * document.
   */
  get sheetIndex() {
    return this.#cssSheet ? this.#cssSheet.index : 0;
  }

  /**
   * Returns the underlying CSSRule style
   *
   * @returns CSS2Properties
   */
  getStyle() {
    // When dealing with a style attribute "rule", this.domRule is a InspectorDeclaration
    // and its style property might not reflect the current declarations, so we need to
    // retrieve the source element style instead.
    return this.domRule.declarationOrigin === "style-attribute"
      ? this.sourceElement.style
      : this.domRule.style;
  }

  /**
   * Retrieve the style property value from the current CSSStyleRule.
   *
   * @param {string} property the CSS property name for which you want the
   * value.
   * @return {string} the property value.
   */
  getPropertyValue(property) {
    return this.getStyle().getPropertyValue(property);
  }

  /**
   * Returns whether or not the given property is set in the current CSSStyleRule.
   *
   * @param {string} property the CSS property name
   * @return {boolean}
   */
  isPropertyAssigned(property) {
    return this.getStyle().hasLonghandProperty(property);
  }

  /**
   * Retrieve the style property priority from the current CSSStyleRule.
   *
   * @param {string} property the CSS property name for which you want the
   * priority.
   * @return {string} the property priority.
   */
  getPropertyPriority(property) {
    return this.getStyle().getPropertyPriority(property);
  }

  /**
   * Retrieve the list of CssSelector objects for each of the parsed selectors
   * of the current CSSStyleRule.
   *
   * @return {Array} the array hold the CssSelector objects.
   */
  get selectors() {
    if (this.#selectors) {
      return this.#selectors;
    }

    this.#selectors = [];

    const selectors = CssLogic.getSelectors(this.domRule);
    for (let i = 0, len = selectors.length; i < len; i++) {
      this.#selectors.push(new CssSelector(this, selectors[i], i));
    }

    return this.#selectors;
  }

  toString() {
    return "[CssRule " + this.domRule.selectorText + "]";
  }
}

class CssSelector {
  /**
   * The CSS selector class allows us to document the ranking of various CSS
   * selectors.
   *
   * @class
   * @param {CssRule} cssRule the CssRule instance from where the selector comes.
   * @param {string} selector The selector that we wish to investigate.
   * @param {number} index The index of the selector within it's rule.
   */
  constructor(cssRule, selector, index) {
    this.cssRule = cssRule;
    this.text = selector;
    this.inlineStyle = cssRule.domRule?.declarationOrigin === "style-attribute";
    this.selectorIndex = index;
  }

  matchId = null;

  #specificity = null;

  /**
   * Retrieve the CssSelector source element, which is the source of the CssRule
   * owning the selector. This is only available when the CssSelector comes from
   * an element.style.
   *
   * @return {string} the source element selector.
   */
  get sourceElement() {
    return this.cssRule.sourceElement;
  }

  /**
   * Retrieve the address of the CssSelector. This points to the address of the
   * CssSheet owning this selector.
   *
   * @return {string} the address of the CssSelector.
   */
  get href() {
    return this.cssRule.href;
  }

  /**
   * Check if the selector comes from an agent stylesheet (provided by the browser).
   *
   * @return {boolean} true if this is an agent stylesheet, false otherwise.
   */
  get agentRule() {
    return this.cssRule.agentRule;
  }

  /**
   * Check if the selector comes from an author stylesheet (provided by the content page).
   *
   * @return {boolean} true if this is an author stylesheet, false otherwise.
   */
  get authorRule() {
    return this.cssRule.authorRule;
  }

  /**
   * Check if the selector comes from a user stylesheet (provided by userChrome.css or
   * userContent.css).
   *
   * @return {boolean} true if this is a user stylesheet, false otherwise.
   */
  get userRule() {
    return this.cssRule.userRule;
  }

  /**
   * Check if the parent stylesheet is allowed by the CssLogic.sourceFilter.
   *
   * @return {boolean} true if the parent stylesheet is allowed by the current
   * sourceFilter, or false otherwise.
   */
  get sheetAllowed() {
    return this.cssRule.sheetAllowed;
  }

  /**
   * Retrieve the parent stylesheet index/position in the viewed document.
   *
   * @return {number} the parent stylesheet index/position in the viewed
   * document.
   */
  get sheetIndex() {
    return this.cssRule.sheetIndex;
  }

  /**
   * Retrieve the line of the parent CSSStyleRule in the parent CSSStyleSheet.
   *
   * @return {number} the line of the parent CSSStyleRule in the parent
   * stylesheet.
   */
  get ruleLine() {
    return this.cssRule.line;
  }

  /**
   * Retrieve the column of the parent CSSStyleRule in the parent CSSStyleSheet.
   *
   * @return {number} the column of the parent CSSStyleRule in the parent
   * stylesheet.
   */
  get ruleColumn() {
    return this.cssRule.column;
  }

  /**
   * Retrieve specificity information for the current selector.
   *
   * @see http://www.w3.org/TR/css3-selectors/#specificity
   * @see http://www.w3.org/TR/CSS2/selector.html
   *
   * @return {number} The selector's specificity.
   */
  get specificity() {
    if (this.inlineStyle) {
      // We don't have an actual rule to call selectorSpecificityAt for element styles.
      // However, specificity of element style is constant, 1,0,0,0 or 0x40000000,
      // so just return the constant directly.
      // @see http://www.w3.org/TR/CSS2/cascade.html#specificity
      return 0x40000000;
    }

    if (this.cssRule.declarationOrigin === "pres-hints") {
      // As for element styles, we don't have an actual rule to call selectorSpecificityAt
      // on for pres-hints styles.
      // However, specificity of such "rule" is constant, 0,0,0,0, just return the constant
      // directly. @see https://www.w3.org/TR/CSS2/cascade.html#preshint
      return 0;
    }

    if (typeof this.#specificity !== "number") {
      this.#specificity = this.cssRule.domRule.selectorSpecificityAt(
        this.selectorIndex
      );
    }

    return this.#specificity;
  }

  toString() {
    return this.text;
  }
}

class CssPropertyInfo {
  /**
   * A cache of information about the matched rules, selectors and values attached
   * to a CSS property, for the highlighted element.
   *
   * The heart of the CssPropertyInfo object is the #findMatchedSelectors()
   * method. This are invoked when the PropertyView tries to access the
   * .matchedSelectors array.
   * Results are cached, for later reuse.
   *
   * @param {CssLogic} cssLogic Reference to the parent CssLogic instance
   * @param {string} property The CSS property we are gathering information for
   * @class
   */
  constructor(cssLogic, property) {
    this.#cssLogic = cssLogic;
    this.property = property;
  }

  // An array holding CssSelectorInfo objects for each of the matched selectors
  // that are inside a CSS rule. Only rules that hold the this.property are
  // counted. This includes rules that come from filtered stylesheets (those
  // that have sheetAllowed = false).
  #matchedSelectors = null;

  #cssLogic;
  #value = "";

  /**
   * Retrieve the computed style value for the current property, for the
   * highlighted element.
   *
   * @return {string} the computed style value for the current property, for the
   * highlighted element.
   */
  get value() {
    if (!this.#value && this.#cssLogic.computedStyle) {
      try {
        this.#value = this.#cssLogic.computedStyle.getPropertyValue(
          this.property
        );
      } catch (ex) {
        console.log("Error reading computed style for " + this.property);
        console.log(ex);
      }
    }
    return this.#value;
  }

  /**
   * Retrieve the array holding CssSelectorInfo objects for each of the matched
   * selectors, from each of the matched rules. Only selectors coming from
   * allowed stylesheets are included in the array.
   *
   * @return {Array} the list of CssSelectorInfo objects of selectors that match
   * the highlighted element and its parents.
   */
  get matchedSelectors() {
    if (!this.#matchedSelectors) {
      this.#findMatchedSelectors();
    } else if (this.needRefilter) {
      this.#refilterSelectors();
    }

    return this.#matchedSelectors;
  }

  /**
   * Find the selectors that match the highlighted element and its parents.
   * Uses CssLogic.processMatchedSelectors() to find the matched selectors,
   * passing in a reference to CssPropertyInfo.#processMatchedSelector() to
   * create CssSelectorInfo objects, which we then sort
   *
   * @private
   */
  #findMatchedSelectors() {
    this.#matchedSelectors = [];
    this.needRefilter = false;

    for (const [
      selector,
      status,
      distance,
    ] of this.#cssLogic.processMatchedSelectors()) {
      this.#processMatchedSelector(selector, status, distance);
    }

    // Sort the selectors by how well they match the given element.
    this.#matchedSelectors.sort((selectorInfo1, selectorInfo2) =>
      selectorInfo1.compareTo(selectorInfo2, this.#matchedSelectors)
    );

    // Now we know which of the matches is best, we can mark it BEST_MATCH.
    if (
      this.#matchedSelectors.length &&
      this.#matchedSelectors[0].status > STATUS.UNMATCHED
    ) {
      this.#matchedSelectors[0].status = STATUS.BEST;
    }
  }

  /**
   * Process a matched CssSelector object.
   *
   * @private
   * @param {CssSelector} selector: the matched CssSelector object.
   * @param {STATUS} status: the CssSelector match status.
   * @param {Int} distance: See CssLogic.#buildMatchedRules for definition.
   */
  #processMatchedSelector(selector, status, distance) {
    const cssRule = selector.cssRule;
    if (
      cssRule.isPropertyAssigned(this.property) &&
      (status == STATUS.MATCHED ||
        (status == STATUS.PARENT_MATCH &&
          InspectorUtils.isInheritedProperty(
            this.#cssLogic.viewedDocument,
            this.property
          )))
    ) {
      const selectorInfo = new CssSelectorInfo(
        selector,
        this.property,
        // FIXME: If this is a property that is coming from a longhand property which is
        // using CSS variables, we would get an empty string at this point.
        // It would be nice to try to display a value that would make sense to the user.
        // See Bug 2003264
        cssRule.getPropertyValue(this.property),
        status,
        distance
      );
      this.#matchedSelectors.push(selectorInfo);
    }
  }

  /**
   * Refilter the matched selectors array when the CssLogic.sourceFilter
   * changes. This allows for quick filter changes.
   *
   * @private
   */
  #refilterSelectors() {
    const passId = ++this.#cssLogic.passId;

    const iterator = function (selectorInfo) {
      const cssRule = selectorInfo.selector.cssRule;
      if (cssRule.passId != passId) {
        cssRule.passId = passId;
      }
    };

    if (this.#matchedSelectors) {
      this.#matchedSelectors.forEach(iterator);
    }

    this.needRefilter = false;
  }

  toString() {
    return "CssPropertyInfo[" + this.property + "]";
  }
}

class CssSelectorInfo {
  /**
   * A class that holds information about a given CssSelector object.
   *
   * Instances of this class are given to CssHtmlTree in the array of matched
   * selectors. Each such object represents a displayable row in the PropertyView
   * objects. The information given by this object blends data coming from the
   * CssSheet, CssRule and from the CssSelector that own this object.
   *
   * @param {CssSelector} selector The CssSelector object for which to
   *        present information.
   * @param {string} property The property for which information should
   *        be retrieved.
   * @param {string} value The property value from the CssRule that owns
   *        the selector.
   * @param {STATUS} status The selector match status.
   * @param {number} distance See CssLogic.#buildMatchedRules for definition.
   */
  constructor(selector, property, value, status, distance) {
    this.selector = selector;
    this.property = property;
    this.status = status;
    this.distance = distance;
    this.value = value;
    const priority = this.selector.cssRule.getPropertyPriority(this.property);
    this.important = priority === "important";

    // Array<string|CSSLayerBlockRule>
    this.parentLayers = [];

    // Go through all parent rules to populate this.parentLayers
    let rule = selector.cssRule.domRule;
    while (rule) {
      const className = ChromeUtils.getClassName(rule);
      if (className == "CSSLayerBlockRule") {
        // If the layer has a name, it's enough to uniquely identify it
        // If the layer does not have a name. We put the actual rule here, so we'll
        // be able to compare actual rule instances in `compareTo`
        this.parentLayers.push(rule.name || rule);
      } else if (className == "CSSImportRule" && rule.layerName !== null) {
        // Same reasoning for @import rule + layer
        this.parentLayers.push(rule.layerName || rule);
      }

      // Get the parent rule (could be the parent stylesheet owner rule
      // for `@import url(path/to/file.css) layer`)
      rule = rule.parentRule || rule.parentStyleSheet?.ownerRule;
    }
  }

  /**
   * Retrieve the CssSelector source element, which is the source of the CssRule
   * owning the selector. This is only available when the CssSelector comes from
   * an element.style.
   *
   * @return {string} the source element selector.
   */
  get sourceElement() {
    return this.selector.sourceElement;
  }

  /**
   * Retrieve the address of the CssSelector. This points to the address of the
   * CssSheet owning this selector.
   *
   * @return {string} the address of the CssSelector.
   */
  get href() {
    return this.selector.href;
  }

  /**
   * Check if the CssSelector comes from element.style or not.
   *
   * @return {boolean} true if the CssSelector comes from element.style, or
   * false otherwise.
   */
  get inlineStyle() {
    return this.selector.inlineStyle;
  }

  /**
   * Retrieve specificity information for the current selector.
   *
   * @return {object} an object holding specificity information for the current
   * selector.
   */
  get specificity() {
    return this.selector.specificity;
  }

  /**
   * Retrieve the parent stylesheet index/position in the viewed document.
   *
   * @return {number} the parent stylesheet index/position in the viewed
   * document.
   */
  get sheetIndex() {
    return this.selector.sheetIndex;
  }

  /**
   * Check if the parent stylesheet is allowed by the CssLogic.sourceFilter.
   *
   * @return {boolean} true if the parent stylesheet is allowed by the current
   * sourceFilter, or false otherwise.
   */
  get sheetAllowed() {
    return this.selector.sheetAllowed;
  }

  /**
   * Retrieve the line of the parent CSSStyleRule in the parent CSSStyleSheet.
   *
   * @return {number} the line of the parent CSSStyleRule in the parent
   * stylesheet.
   */
  get ruleLine() {
    return this.selector.ruleLine;
  }

  /**
   * Retrieve the column of the parent CSSStyleRule in the parent CSSStyleSheet.
   *
   * @return {number} the column of the parent CSSStyleRule in the parent
   * stylesheet.
   */
  get ruleColumn() {
    return this.selector.ruleColumn;
  }

  /**
   * Check if the selector comes from a browser-provided stylesheet.
   *
   * @return {boolean} true if the selector comes from a browser-provided
   * stylesheet, or false otherwise.
   */
  get agentRule() {
    return this.selector.agentRule;
  }

  /**
   * Check if the selector comes from a webpage-provided stylesheet.
   *
   * @return {boolean} true if the selector comes from a webpage-provided
   * stylesheet, or false otherwise.
   */
  get authorRule() {
    return this.selector.authorRule;
  }

  /**
   * Check if the selector comes from a user stylesheet (userChrome.css or
   * userContent.css).
   *
   * @return {boolean} true if the selector comes from a webpage-provided
   * stylesheet, or false otherwise.
   */
  get userRule() {
    return this.selector.userRule;
  }

  /**
   * Compare the current CssSelectorInfo instance to another instance.
   * Since selectorInfos is computed from `InspectorUtils.getMatchingCSSRules`,
   * it's already sorted for regular cases. We only need to handle important values.
   *
   * @param  {CssSelectorInfo} that
   *         The instance to compare ourselves against.
   * @param  {Array<CssSelectorInfo>} selectorInfos
   *         The list of CssSelectorInfo we are currently ordering
   * @return {number}
   *         -1, 0, 1 depending on how that compares with this.
   */
  compareTo(that, selectorInfos) {
    const originalOrder =
      selectorInfos.indexOf(this) < selectorInfos.indexOf(that) ? -1 : 1;

    // If rules are applied to different elements, the element that is the closest to the
    // view element should be displayed before the other
    if (this.distance !== that.distance) {
      // Higher distance means we're closest to the viewed element (0 is when the rule is
      // for the viewed element, -1 when it's for its parent and so on).
      return this.distance > that.distance ? -1 : 1;
    }

    // If both properties are not important, we can keep the original order
    if (!this.important && !that.important) {
      return originalOrder;
    }

    // If one of the property is important and the other is not, the important one wins
    if (this.important !== that.important) {
      return this.important ? -1 : 1;
    }

    // At this point, this and that are both important

    const thisIsInLayer = !!this.parentLayers.length;
    const thatIsInLayer = !!that.parentLayers.length;

    // If they're not in layers, we can keep the original rule order
    if (!thisIsInLayer && !thatIsInLayer) {
      return originalOrder;
    }

    // If one of the rule is the style attribute, it wins
    if (this.selector.inlineStyle || that.selector.inlineStyle) {
      return this.selector.inlineStyle ? -1 : 1;
    }

    // If one of the rule is not in a layer, then the rule in a layer wins.
    if (!thisIsInLayer || !thatIsInLayer) {
      return thisIsInLayer ? -1 : 1;
    }

    const inSameLayers =
      this.parentLayers.length === that.parentLayers.length &&
      this.parentLayers.every((layer, i) => layer === that.parentLayers[i]);
    // If both rules are in the same layer, we keep the original order
    if (inSameLayers) {
      return originalOrder;
    }

    // When comparing declarations that belong to different layers, then for
    // important rules the declaration whose cascade layer is first wins.
    // We get the rules in the most-specific to least-specific order, meaning we'll have
    // rules in layers in the reverse order of the order of declarations of layers.
    // We can reverse that again to get the order of declarations of layers.
    return originalOrder * -1;
  }

  compare(that, propertyName, type) {
    switch (type) {
      case COMPAREMODE.BOOLEAN:
        if (this[propertyName] && !that[propertyName]) {
          return -1;
        }
        if (!this[propertyName] && that[propertyName]) {
          return 1;
        }
        break;
      case COMPAREMODE.INTEGER:
        if (this[propertyName] > that[propertyName]) {
          return -1;
        }
        if (this[propertyName] < that[propertyName]) {
          return 1;
        }
        break;
    }
    return 0;
  }

  toString() {
    return this.selector + " -> " + this.value;
  }
}

exports.CssLogic = CssLogic;
exports.CssSelector = CssSelector;
