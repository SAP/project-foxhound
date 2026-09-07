/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const Rule = require("resource://devtools/client/inspector/rules/models/rule.js");
const UserProperties = require("resource://devtools/client/inspector/rules/models/user-properties.js");
const {
  style: { ELEMENT_STYLE, PRES_HINTS },
} = require("resource://devtools/shared/constants.js");

loader.lazyRequireGetter(
  this,
  "isCssVariable",
  "resource://devtools/shared/inspector/css-logic.js",
  true
);

/**
 * ElementStyle is responsible for the following:
 *   Keeps track of which properties are overridden.
 *   Maintains a list of Rule objects for a given element.
 */
class ElementStyle {
  /**
   * @param  {Element} element
   *         The element whose style we are viewing.
   * @param  {CssRuleView} ruleView
   *         The instance of the rule-view panel.
   * @param  {object} store
   *         The ElementStyle can use this object to store metadata
   *         that might outlast the rule view, particularly the current
   *         set of disabled properties.
   * @param  {PageStyleFront} pageStyle
   *         Front for the page style actor that will be providing
   *         the style information.
   * @param  {boolean} showUserAgentStyles
   *         Should user agent styles be inspected?
   */
  constructor(element, ruleView, store, pageStyle, showUserAgentStyles) {
    // These attributes are widely used outside of this class
    this.element = element;
    this.ruleView = ruleView;
    this.rules = [];

    // This is used externaly, from TextPropertyEditor
    this.store = store || {};
    // These ares used externally, from RuleEditor
    this.pageStyle = pageStyle;
    this.showUserAgentStyles = showUserAgentStyles;

    // We don't want to overwrite this.store.userProperties so we only create it
    // if it doesn't already exist.
    if (!("userProperties" in this.store)) {
      this.store.userProperties = new UserProperties();
    }

    if (!("disabled" in this.store)) {
      this.store.disabled = new WeakMap();
    }
  }

  #destroyed = false;
  #populated = null;
  #pseudoElementTypes = new Set();
  #variablesMap = new Map();
  #startingStyleVariablesMap = new Map();

  destroy() {
    if (this.#destroyed) {
      return;
    }
    this.#destroyed = true;

    this.#pseudoElementTypes.clear();

    for (const rule of this.rules) {
      if (rule.editor) {
        rule.editor.destroy();
      }

      rule.destroy();
    }
  }

  /**
   * Called by the Rule object when it has been changed through the
   * setProperty* methods.
   */
  notifyChanged() {
    // This listener may be set externally from `CssRuleView.selectElement`
    if (this.onChanged) {
      this.onChanged();
    }
  }

  /**
   * Refresh the list of rules to be displayed for the active element.
   * Upon completion, this.rules[] will hold a list of Rule objects.
   *
   * Returns a promise that will be resolved when the elementStyle is
   * ready.
   */
  async populate() {
    const resultPromise = (async () => {
      try {
        const entries = await this.pageStyle.getApplied(this.element, {
          inherited: true,
          matchedSelectors: true,
          filter: this.showUserAgentStyles ? "ua" : undefined,
        });
        if (this.#destroyed || this.#populated !== resultPromise) {
          return;
        }

        // Store the current list of rules (if any) during the population
        // process. They will be reused if possible.
        const existingRules = this.rules;

        this.rules = [];

        for (const entry of entries) {
          this.#maybeAddRule(entry, existingRules);
        }

        // Store a list of all (non-inherited) pseudo-element types found in the matching rules.
        this.#pseudoElementTypes = new Set();
        for (const rule of this.rules) {
          if (rule.pseudoElement && !rule.inherited) {
            this.#pseudoElementTypes.add(rule.pseudoElement);
          }
        }

        // Mark overridden computed styles.
        this.onRuleUpdated();

        this.#sortRulesForPseudoElement();

        // We're done with the previous list of rules.
        for (const r of existingRules) {
          if (r?.editor) {
            r.editor.destroy();
          }

          r.destroy();
        }
      } catch (e) {
        // populate is often called after a setTimeout,
        // the connection may already be closed.
        if (!this.#destroyed) {
          console.error("Error while updating element rules", e);
          throw e;
        }
      }
    })();

    this.#populated = resultPromise;
    return this.#populated;
  }

  /**
   * Returns the Rule object of the given rule id.
   *
   * @param  {string | null} id
   *         The id of the Rule object.
   * @return {Rule|undefined} of the given rule id or undefined if it cannot be found.
   */
  getRule(id) {
    return id
      ? this.rules.find(rule => rule.domRule.actorID === id)
      : undefined;
  }

  /**
   * Get the font families in use by the element.
   *
   * Returns a promise that will be resolved to a Set of lowercased CSS family names.
   */
  getUsedFontFamilies() {
    return new Promise((resolve, reject) => {
      this.ruleView.styleWindow.requestIdleCallback(async () => {
        if (this.element.isDestroyed()) {
          resolve([]);
          return;
        }
        try {
          const fonts = await this.pageStyle.getUsedFontFaces(this.element, {
            includePreviews: false,
          });
          const familyNames = new Set();
          for (const font of fonts) {
            if (font.CSSFamilyName) {
              familyNames.add(font.CSSFamilyName.toLowerCase());
            }

            // CSSGeneric is the font generic name (e.g. system-ui), which is different
            // from the CSSFamilyName but can also be used as a font-family (e.g. for
            // system-ui, the actual font name is ".SF NS" on OSX 14.6).
            if (font.CSSGeneric) {
              familyNames.add(font.CSSGeneric.toLowerCase());
            }
          }
          resolve(familyNames);
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  /**
   * Put non inherited pseudo elements in front of others rules.
   */
  #sortRulesForPseudoElement() {
    this.rules = this.rules.sort((a, b) => {
      if (
        !a.inherited === !b.inherited &&
        !!a.pseudoElement !== !!b.pseudoElement
      ) {
        return (a.pseudoElement || "z") > (b.pseudoElement || "z") ? 1 : -1;
      }
      return 0;
    });
  }

  /**
   * Add a rule if it's one we care about. Filters out duplicates and
   * inherited styles with no inherited properties.
   *
   * @param  {object} appliedStyle
   *         Options for creating the Rule, see the Rule constructor.
   * @param  {Array} existingRules
   *         Rules to reuse if possible. If a rule is reused, then it
   *         it will be deleted from this array.
   * @return {boolean} true if we added the rule.
   */
  #maybeAddRule(appliedStyle, existingRules) {
    // If we've already included this domRule (for example, when a
    // common selector is inherited), ignore it.
    if (
      appliedStyle.rule &&
      this.rules.some(rule => rule.domRule === appliedStyle.rule)
    ) {
      return false;
    }

    let rule = null;

    // If we're refreshing and the rule previously existed, reuse the
    // Rule object.
    if (existingRules) {
      const ruleIndex = existingRules.findIndex(r => r.matches(appliedStyle));
      if (ruleIndex >= 0) {
        rule = existingRules[ruleIndex];
        rule.refresh(appliedStyle);
        existingRules.splice(ruleIndex, 1);
      }
    }

    // If this is a new rule, create its Rule object.
    if (!rule) {
      rule = new Rule(this, appliedStyle);
    }

    // Ignore inherited rules with no visible properties.
    if (appliedStyle.inherited && !rule.hasAnyVisibleProperties()) {
      return false;
    }

    this.rules.push(rule);
    return true;
  }

  /**
   * Calls updateDeclarations with all supported pseudo elements
   */
  onRuleUpdated() {
    this.#updateDeclarations();

    // Update declarations for matching rules for pseudo-elements.
    for (const pseudo of this.#pseudoElementTypes) {
      this.#updateDeclarations(pseudo);
    }
  }

  /**
   * Go over all CSS rules matching the selected element and mark the CSS declarations
   * (aka TextProperty instances) with an `overridden` Boolean flag if an earlier or
   * higher priority declaration overrides it. Rules are already ordered by specificity.
   *
   * If a pseudo-element type is passed (ex: ::before, ::first-line, etc),
   * restrict the operation only to declarations in rules matching that pseudo-element.
   *
   * At the end, update the declaration's view (TextPropertyEditor instance) so it relects
   * the latest state. Use this opportunity to also trigger checks for the "inactive"
   * state of the declaration (whether it has effect or not).
   *
   * @param  {string} pseudo
   *         Optional pseudo-element for which to restrict marking CSS declarations as
   *         overridden.
   */
  // eslint-disable-next-line complexity
  #updateDeclarations(pseudo = "") {
    // Gather all text properties applicable to the selected element or pseudo-element.
    const textProps = this.#getDeclarations(pseudo);

    // CSS Variables inherits from the normal element in case of pseudo element.
    const variables = new Map(pseudo ? this.#variablesMap.get("") : null);
    const startingStyleVariables = new Map(
      pseudo ? this.#startingStyleVariablesMap.get("") : null
    );

    // Walk over the computed properties. As we see a property name
    // for the first time, mark that property's name as taken by this
    // property.
    //
    // If we come across a property whose name is already taken, check
    // its priority against the property that was found first:
    //
    //   If the new property is a higher priority, mark the old
    //   property overridden and mark the property name as taken by
    //   the new property.
    //
    //   If the new property is a lower or equal priority, mark it as
    //   overridden.
    //
    //   Note that this is different if layers are involved: if both
    //   old and new properties have a high priority, and if the new
    //   property is in a rule belonging to a layer that is different
    //   from the the one the old property rule might be in,
    //   mark the old property overridden and mark the property name as
    //   taken by the new property.
    //
    // _overriddenDirty will be set on each prop, indicating whether its
    // dirty status changed during this pass.
    const taken = new Map();
    const takenInStartingStyle = new Map();
    for (const textProp of textProps) {
      for (const computedProp of textProp.computed) {
        const earlier = taken.get(computedProp.name);
        const earlierInStartingStyle = takenInStartingStyle.get(
          computedProp.name
        );

        // Prevent -webkit-gradient from being selected after unchecking
        // linear-gradient in this case:
        //  -moz-linear-gradient: ...;
        //  -webkit-linear-gradient: ...;
        //  linear-gradient: ...;
        if (!computedProp.textProp.isValid()) {
          continue;
        }

        const isPropInStartingStyle =
          computedProp.textProp.rule?.isInStartingStyle();

        const hasHigherPriority = this.hasHigherPriorityThanEarlierProp(
          computedProp,
          earlier
        );
        const startingStyleHasHigherPriority =
          this.hasHigherPriorityThanEarlierProp(
            computedProp,
            earlierInStartingStyle
          );

        // earlier prop is overridden if the new property has higher priority and is not
        // in a starting style rule.
        if (hasHigherPriority && !isPropInStartingStyle) {
          // New property is higher priority. Mark the earlier property
          // overridden (which will reverse its dirty state).
          earlier._overriddenDirty = !earlier._overriddenDirty;
          earlier.overridden = true;
        }

        // earlier starting-style prop are always going to be overriden if the new property
        // has higher priority
        if (startingStyleHasHigherPriority) {
          earlierInStartingStyle._overriddenDirty =
            !earlierInStartingStyle._overriddenDirty;
          earlierInStartingStyle.overridden = true;
          // which means we also need to remove the variable from startingStyleVariables
          if (isCssVariable(computedProp.name)) {
            startingStyleVariables.delete(computedProp.name);
          }
        }

        // This computed property is overridden if:
        // - there was an earlier prop and this one does not have higher priority
        // - or if this is a starting-style prop, and there was an earlier starting-style
        //   prop, and this one hasn't higher priority.
        const overridden =
          (!!earlier && !hasHigherPriority) ||
          (isPropInStartingStyle &&
            !!earlierInStartingStyle &&
            !startingStyleHasHigherPriority);

        computedProp._overriddenDirty =
          !!computedProp.overridden !== overridden;
        computedProp.overridden = overridden;

        if (!computedProp.overridden && computedProp.textProp.enabled) {
          if (isPropInStartingStyle) {
            takenInStartingStyle.set(computedProp.name, computedProp);
          } else {
            taken.set(computedProp.name, computedProp);
          }

          // At this point, we can get CSS variable from "inherited" rules.
          // When this is a registered custom property with `inherits` set to false,
          // the text prop is "invisible" (i.e. not shown in the rule view).
          // In such case, we don't want to get the value in the Map, and we'll rather
          // get the initial value from the registered property definition.
          if (
            isCssVariable(computedProp.name) &&
            !computedProp.textProp.invisible
          ) {
            if (!isPropInStartingStyle) {
              variables.set(computedProp.name, {
                declarationValue: computedProp.value,
                computedValue: computedProp.textProp.getVariableComputedValue(),
              });
            } else {
              startingStyleVariables.set(computedProp.name, computedProp.value);
            }
          }
        }
      }
    }

    // Find the CSS variables that have been updated.
    const previousVariablesMap = new Map(this.#variablesMap.get(pseudo));
    const changedVariableNamesSet = new Set(
      [...variables.keys(), ...previousVariablesMap.keys()].filter(
        k => variables.get(k) !== previousVariablesMap.get(k)
      )
    );
    const previousStartingStyleVariablesMap = new Map(
      this.#startingStyleVariablesMap.get(pseudo)
    );
    const changedStartingStyleVariableNamesSet = new Set(
      [...variables.keys(), ...previousStartingStyleVariablesMap.keys()].filter(
        k => variables.get(k) !== previousStartingStyleVariablesMap.get(k)
      )
    );

    this.#variablesMap.set(pseudo, variables);
    this.#startingStyleVariablesMap.set(pseudo, startingStyleVariables);

    const rulesEditors = new Set();
    const variableTree = new Map();

    if (!this.usedVariables) {
      this.usedVariables = new Set();
    } else {
      this.usedVariables.clear();
    }

    // For each TextProperty, mark it overridden if all of its computed
    // properties are marked overridden. Update the text property's associated
    // editor, if any. This will clear the _overriddenDirty state on all
    // computed properties. For each editor we also show or hide the inactive
    // CSS icon as needed.
    for (const textProp of textProps) {
      // #updatePropertyOverridden will return true if the
      // overridden state has changed for the text property.
      // #hasUpdatedCSSVariable will return true if the declaration contains any
      // of the updated CSS variable names.
      if (
        this.#updatePropertyOverridden(textProp) ||
        this.#hasUpdatedCSSVariable(textProp, changedVariableNamesSet) ||
        this.#hasUpdatedCSSVariable(
          textProp,
          changedStartingStyleVariableNamesSet
        )
      ) {
        textProp.updateEditor();
      }

      // For each editor show or hide the inactive CSS icon as needed.
      if (textProp.editor) {
        textProp.editor.updateUI();
      }

      // First we need to update used variables from all declarations
      textProp.updateUsedVariables();
      const isCustomProperty = textProp.name.startsWith("--");
      const isNewCustomProperty =
        isCustomProperty && textProp.isPropertyChanged;
      if (isNewCustomProperty) {
        this.usedVariables.add(textProp.name);
      }
      if (textProp.usedVariables) {
        if (!isCustomProperty) {
          for (const variable of textProp.usedVariables) {
            this.usedVariables.add(variable);
          }
        } else {
          variableTree.set(textProp.name, textProp.usedVariables);
        }
      }

      if (textProp.rule.editor) {
        rulesEditors.add(textProp.rule.editor);
      }
    }

    const collectVariableDependencies = variable => {
      if (!variableTree.has(variable)) {
        return;
      }

      for (const dep of variableTree.get(variable)) {
        if (!this.usedVariables.has(dep)) {
          this.usedVariables.add(dep);
          collectVariableDependencies(dep);
        }
      }
    };

    for (const variable of this.usedVariables) {
      collectVariableDependencies(variable);
    }

    for (const textProp of textProps) {
      // Then we need to update the isUnusedCssVariable
      textProp.updateIsUnusedVariable();
    }

    // Then update the UI
    for (const ruleEditor of rulesEditors) {
      ruleEditor.updateUnusedCssVariables();
    }
  }

  /**
   * Return whether or not the passed computed property has a higher priority than
   * a computed property seen "earlier" (e.g. whose rule had higher priority, or that
   * was declared in the same rule, but earlier).
   *
   * @param {object} computedProp: A computed prop object, as stored in TextProp#computed
   * @param {object} earlierProp: The computed prop to compare against
   * @returns Boolean
   */
  hasHigherPriorityThanEarlierProp(computedProp, earlierProp) {
    if (!earlierProp) {
      return false;
    }

    if (computedProp.priority !== "important") {
      return false;
    }

    const rule = computedProp.textProp.rule;
    const earlierRule = earlierProp.textProp.rule;

    // for only consider rules applying to the same node.
    if (rule.inherited !== earlierRule.inherited) {
      return false;
    }

    // only consider rules applying on the same (inherited) pseudo element (e.g. ::details-content),
    // or rules both not applying to pseudo elements
    if (rule.pseudoElement !== earlierRule.pseudoElement) {
      return false;
    }

    // At this point, the computed prop is important, and it applies to the same element
    // (or pseudo element) than the earlier prop.
    return (
      earlierProp.priority !== "important" ||
      // Even if the earlier property was important, if the current rule is in a layer
      // it will take precedence, unless the earlier property rule was in the same layer…
      (rule?.isInLayer() &&
        rule.isInDifferentLayer(earlierRule) &&
        // … or if the earlier declaration is in the style attribute (https://www.w3.org/TR/css-cascade-5/#style-attr).
        earlierRule.domRule.type !== ELEMENT_STYLE)
    );
  }

  /**
   * Update CSS variable tooltip information on textProp editor when registered property
   * are added/modified/removed.
   *
   * @param {Set<string>} registeredPropertyNamesSet: A Set containing the name of the
   *                      registered properties which were added/modified/removed.
   */
  onRegisteredPropertiesChange(registeredPropertyNamesSet) {
    for (const rule of this.rules) {
      for (const textProp of rule.textProps) {
        if (this.#hasUpdatedCSSVariable(textProp, registeredPropertyNamesSet)) {
          textProp.updateEditor();
        }
      }
    }
  }

  /**
   * Returns true if the given declaration's property value contains a CSS variable
   * matching any of the updated CSS variable names.
   *
   * @param {TextProperty} declaration
   *        A TextProperty of a rule.
   * @param {Set<string>} variableNamesSet
   *        A Set of CSS variable names that have been updated.
   */
  #hasUpdatedCSSVariable(declaration, variableNamesSet) {
    if (variableNamesSet.size === 0) {
      return false;
    }

    return !variableNamesSet.isDisjointFrom(declaration.usedVariables);
  }

  /**
   * Helper for |this.updateDeclarations()| to mark CSS declarations as overridden.
   *
   * Returns an array of CSS declarations (aka TextProperty instances) from all rules
   * applicable to the selected element ordered from more- to less-specific.
   *
   * If a pseudo-element type is given, restrict the result only to declarations
   * applicable to that pseudo-element.
   *
   * NOTE: this method skips CSS declarations in @keyframes rules because a number of
   * criteria such as time and animation delay need to be checked in order to determine
   * if the property is overridden at runtime.
   *
   * @param  {string} pseudo
   *         Optional pseudo-element for which to restrict marking CSS declarations as
   *         overridden. If omitted, only declarations for regular style rules are
   *         returned (no pseudo-element style rules).
   *
   * @return {Array}
   *         Array of TextProperty instances.
   */
  #getDeclarations(pseudo = "") {
    const textProps = [];

    for (const rule of this.rules) {
      // Skip @keyframes rules
      if (rule.keyframes) {
        continue;
      }

      const isNestedDeclarations = rule.domRule.isNestedDeclarations;
      const isInherited = !!rule.inherited;

      // Style rules must be considered only when they have selectors that match the node.
      // When renaming a selector, the unmatched rule lingers in the Rule view, but it no
      // longer matches the node. This strict check avoids accidentally causing
      // declarations to be overridden in the remaining matching rules.
      const isStyleRule =
        rule.pseudoElement === "" && rule.matchedSelectorIndexes.length;

      // Style rules for pseudo-elements must always be considered, regardless if their
      // selector matches the node. As a convenience, declarations in rules for
      // pseudo-elements show up in a separate Pseudo-elements accordion when selecting
      // the host node (instead of the pseudo-element node directly, which is sometimes
      // impossible, for example with ::selection or ::first-line).
      // Loosening the strict check on matched selectors ensures these declarations
      // participate in the algorithm below to mark them as overridden.
      const isMatchingPseudoElementRule =
        rule.pseudoElement !== "" &&
        rule.pseudoElement === pseudo &&
        // Inherited pseudo element rules don't appear in the "Pseudo elements" section,
        // so they should be considered style rules.
        !isInherited;
      const isInheritedPseudoElementRule =
        rule.pseudoElement !== "" && isInherited;

      const isElementStyle = rule.domRule.type === ELEMENT_STYLE;
      const isElementAttributesStyle = rule.domRule.type === PRES_HINTS;

      const filterCondition =
        isNestedDeclarations ||
        (pseudo && isMatchingPseudoElementRule) ||
        (pseudo === "" &&
          (isStyleRule ||
            isElementStyle ||
            isElementAttributesStyle ||
            isInheritedPseudoElementRule));

      // Collect all relevant CSS declarations (aka TextProperty instances).
      if (filterCondition) {
        for (const textProp of rule.textProps.toReversed()) {
          if (textProp.enabled) {
            textProps.push(textProp);
          }
        }
      }
    }

    return textProps;
  }

  /**
   * Mark a given TextProperty as overridden or not depending on the
   * state of its computed properties. Clears the _overriddenDirty state
   * on all computed properties.
   *
   * @param  {TextProperty} prop
   *         The text property to update.
   * @return {boolean} true if the TextProperty's overridden state (or any of
   *         its computed properties overridden state) changed.
   */
  #updatePropertyOverridden(prop) {
    if (!prop.isValid() && !prop.computed.length) {
      prop.overridden = false;
      return false;
    }

    let overridden = true;
    let dirty = false;

    for (const computedProp of prop.computed) {
      if (!computedProp.overridden) {
        overridden = false;
      }

      dirty = computedProp._overriddenDirty || dirty;
      delete computedProp._overriddenDirty;
    }

    dirty = !!prop.overridden !== overridden || dirty;
    prop.overridden = overridden;
    return dirty;
  }

  /**
   * Returns data about a CSS variable.
   *
   * @param  {string} name
   *         The name of the variable.
   * @param  {string} pseudo
   *         The pseudo-element name of the rule.
   * @return {object} An object with the following properties:
   *         - {String|undefined} value: The variable's value. Undefined if variable is not set.
   *         - {RegisteredPropertyResource|undefined} registeredProperty: The registered
   *           property data (syntax, initial value, inherits). Undefined if the variable
   *           is not a registered property.
   */
  getVariableData(name, pseudo = "") {
    const variables = this.#variablesMap.get(pseudo);
    const startingStyleVariables = this.#startingStyleVariablesMap.get(pseudo);
    const registeredPropertiesMap =
      this.ruleView.getRegisteredPropertiesForSelectedNodeTarget();

    const data = {};
    if (variables?.has(name)) {
      // XXX Check what to do in case the value doesn't match the registered property syntax.
      // Will be handled in Bug 1866712
      const { declarationValue, computedValue } = variables.get(name);
      data.value = declarationValue;
      data.computedValue = computedValue;
    }
    if (startingStyleVariables?.has(name)) {
      data.startingStyle = startingStyleVariables.get(name);
    }
    if (registeredPropertiesMap?.has(name)) {
      data.registeredProperty = registeredPropertiesMap.get(name);
    }

    return data;
  }

  /**
   * Get all custom properties.
   *
   * @param  {string} pseudo
   *         The pseudo-element name of the rule.
   * @returns Map<String, String> A map whose key is the custom property name and value is
   *                              the custom property value (or registered property initial
   *                              value if the property is not defined)
   */
  getAllCustomProperties(pseudo = "") {
    const customProperties = new Map();
    for (const [
      key,
      { computedValue, declarationValue },
    ] of this.#variablesMap.get(pseudo)) {
      customProperties.set(key, computedValue ?? declarationValue);
    }

    const startingStyleCustomProperties =
      this.#startingStyleVariablesMap.get(pseudo);

    const registeredPropertiesMap =
      this.ruleView.getRegisteredPropertiesForSelectedNodeTarget();

    // If there's no registered properties nor starting style ones, we can return the Map as is
    if (
      (!registeredPropertiesMap || registeredPropertiesMap.size === 0) &&
      (!startingStyleCustomProperties ||
        startingStyleCustomProperties.size === 0)
    ) {
      return customProperties;
    }

    if (startingStyleCustomProperties) {
      for (const [name, value] of startingStyleCustomProperties) {
        // Only set the starting style property if it's not defined (i.e. not in the "main"
        // variable map)
        if (!customProperties.has(name)) {
          customProperties.set(name, value);
        }
      }
    }

    if (registeredPropertiesMap) {
      for (const [name, propertyDefinition] of registeredPropertiesMap) {
        // Only set the registered property if it's not defined (i.e. not in the variable map)
        if (!customProperties.has(name)) {
          customProperties.set(name, propertyDefinition.initialValue);
        }
      }
    }

    return customProperties;
  }
}

module.exports = ElementStyle;
