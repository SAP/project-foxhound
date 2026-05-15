/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const { Actor } = require("resource://devtools/shared/protocol.js");
const {
  compatibilitySpec,
} = require("resource://devtools/shared/specs/compatibility.js");

loader.lazyGetter(this, "mdnCompatibility", () => {
  const MDNCompatibility = require("resource://devtools/server/actors/compatibility/lib/MDNCompatibility.js");
  const cssPropertiesCompatData = require("resource://devtools/shared/compatibility/dataset/css-properties.json");
  return new MDNCompatibility(cssPropertiesCompatData);
});

class CompatibilityActor extends Actor {
  /**
   * Create a CompatibilityActor.
   * CompatibilityActor is responsible for providing the compatibility information
   * for the web page using the data from the Inspector and the `MDNCompatibility`
   * and conveys them to the compatibility panel in the DevTool Inspector. Currently,
   * the `CompatibilityActor` only detects compatibility issues in the CSS declarations
   * but plans are in motion to extend it to evaluate compatibility information for
   * HTML and JavaScript.
   * The design below has the InspectorActor own the CompatibilityActor, but it's
   * possible we will want to move it into it's own panel in the future.
   *
   * @param inspector
   *    The InspectorActor that owns this CompatibilityActor.
   *
   * @class
   */
  constructor(inspector) {
    super(inspector.conn, compatibilitySpec);
    this.inspector = inspector;
  }

  destroy() {
    super.destroy();
    this.inspector = null;
  }

  form() {
    return {
      actor: this.actorID,
    };
  }

  getTraits() {
    return {
      traits: {},
    };
  }

  /**
   * Responsible for computing the compatibility issues for a list of CSS declaration blocks
   *
   * @param {Array<Array<object>>} domRulesDeclarations: An array of arrays of CSS declaration object
   * @param {string} domRulesDeclarations[][].name: Declaration name
   * @param {string} domRulesDeclarations[][].value: Declaration value
   * @param {Array<object>} targetBrowsers: Array of target browsers () to be used to check CSS compatibility against
   * @param {string} targetBrowsers[].id: Browser id as specified in `devtools/shared/compatibility/datasets/browser.json`
   * @param {string} targetBrowsers[].name
   * @param {string} targetBrowsers[].version
   * @param {string} targetBrowsers[].status: Browser status - esr, current, beta, nightly
   * @returns {Array<Array<object>>} An Array of arrays of JSON objects with compatibility
   *                                 information in following form:
   *    {
   *      // Type of compatibility issue
   *      type: <string>,
   *      // The CSS declaration that has compatibility issues
   *      property: <string>,
   *      // Alias to the given CSS property
   *      alias: <Array>,
   *      // Link to MDN documentation for the particular CSS rule
   *      url: <string>,
   *      deprecated: <boolean>,
   *      experimental: <boolean>,
   *      // An array of all the browsers that don't support the given CSS rule
   *      unsupportedBrowsers: <Array>,
   *    }
   */
  getCSSDeclarationBlockIssues(domRulesDeclarations, targetBrowsers) {
    return domRulesDeclarations.map(declarationBlock =>
      mdnCompatibility.getCSSDeclarationBlockIssues(
        declarationBlock,
        targetBrowsers
      )
    );
  }

  /**
   * Responsible for computing the compatibility issues in the
   * CSS declaration of the given node.
   *
   * @param NodeActor node
   * @param targetBrowsers Array
   *   An Array of JSON object of target browser to check compatibility against in following form:
   *   {
   *     // Browser id as specified in `devtools/server/actors/compatibility/lib/datasets/browser.json`
   *     id: <string>,
   *     name: <string>,
   *     version: <string>,
   *     // Browser status - esr, current, beta, nightly
   *     status: <string>,
   *   }
   * @returns An Array of JSON objects with compatibility information in following form:
   *    {
   *      // Type of compatibility issue
   *      type: <string>,
   *      // The CSS declaration that has compatibility issues
   *      property: <string>,
   *      // Alias to the given CSS property
   *      alias: <Array>,
   *      // Link to MDN documentation for the particular CSS rule
   *      url: <string>,
   *      deprecated: <boolean>,
   *      experimental: <boolean>,
   *      // An array of all the browsers that don't support the given CSS rule
   *      unsupportedBrowsers: <Array>,
   *    }
   */
  async getNodeCssIssues(node, targetBrowsers) {
    const pageStyle = await this.inspector.getPageStyle();
    const styles = await pageStyle.getApplied(node, {
      skipPseudo: false,
    });

    const declarations = [];
    const propertyNames = new Set();

    for (const { rule } of styles.entries) {
      for (const declaration of rule.parseRuleDeclarations({
        parseComments: false,
      })) {
        // For now (see Bug 1636301), we only check compat issues based on the declaration
        // name, so we can only pass a single declaration for a given property and save
        // some time in getCSSDeclarationBlockIssues.
        if (propertyNames.has(declaration.name)) {
          continue;
        }
        propertyNames.add(declaration.name);
        declarations.push(declaration);
      }
    }

    return mdnCompatibility.getCSSDeclarationBlockIssues(
      declarations,
      targetBrowsers
    );
  }
}

exports.CompatibilityActor = CompatibilityActor;
