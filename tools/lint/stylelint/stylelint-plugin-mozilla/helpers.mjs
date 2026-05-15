/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import valueParser from "postcss-value-parser";
import { tokensTable } from "../../../../toolkit/themes/shared/design-system/dist/tokens-table.mjs";
import {
  DEPRECATED_SYSTEM_COLORS,
  NAMED_COLORS,
  PREFIXED_SYSTEM_COLORS,
  SYSTEM_COLORS,
} from "./referenceColors.mjs";

/**
 * Allows rules to access the tokens table without hard-coding the import path in multiple files.
 *
 * @returns {object}
 */
export const getTokensTable = () => tokensTable;

/**
 * Our namespace used to prefix Mozilla stylelint rules.
 */
const MOZILLA_NAMESPACE = "stylelint-plugin-mozilla";

/**
 * Namespaces Mozilla's stylelint rules.
 *
 * @param {string} ruleName the name of the stylelint rule.
 * @returns {string}
 */
export function namespace(ruleName) {
  return `${MOZILLA_NAMESPACE}/${ruleName}`;
}

/**
 * The base list of allowed CSS values.
 */
export const ALLOW_LIST = [
  "inherit",
  "initial",
  "revert",
  "revert-layer",
  "unset",
];

/**
 * Regex capturing numeric values, em values, ch values, and percentage values
 */
export const FIXED_UNITS = /^\d*\.?\d*(em|ch|%)?$/;

/**
 * Extends our base ALLOW_LIST with additional allowed values.
 *
 * @param {string[]} additionalAllows to be appended to our list
 * @returns {string[]}
 */
export const createAllowList = (additionalAllows = []) => {
  return [...ALLOW_LIST, ...additionalAllows];
};

/**
 * Return token names for the given categories.
 *
 * @param {string[]} tokenCategoriesArray
 * @returns {string[]}
 */
export const createTokenNamesArray = tokenCategoriesArray =>
  tokenCategoriesArray
    .flatMap(category => tokensTable[category])
    .reduce((acc, token) => {
      if (token?.name) {
        return [...acc, `var(${token.name})`];
      }
      return acc;
    }, []);

/**
 * Return raw values of tokens for the given categories.
 *
 * @param {string[]} tokenCategoriesArray
 * @returns {object}
 */
export const createRawValuesObject = tokenCategoriesArray =>
  tokenCategoriesArray
    .flatMap(category => tokensTable[category])
    .reduce((acc, token) => {
      const val = String(token.value || "").trim();
      if (token.name && !val.startsWith("var(")) {
        // some tokens refer to tokens in the table,
        // let's move those out so our auto-fixes work
        return { ...acc, [val]: `var(${token.name})` };
      }
      return acc;
    }, {});

/**
 * Collects local (in the same file) CSS properties from a
 * PostCSS object and returns those in object syntax.
 *
 * @param {Record<string, string>} root - A PostCSS value parser root
 * @returns {Record<string, string>}
 */
export const getLocalCustomProperties = root => {
  const cssCustomProperties = {};

  root.walkDecls(decl => {
    if (decl.prop && decl.prop.startsWith("--")) {
      cssCustomProperties[decl.prop] = decl.value;
    }
  });

  return cssCustomProperties;
};

/**
 * Make breaks in CSS declaration to account for spaces.
 *
 * @param {string} value  some CSS declaration
 * @returns {string[]}
 */
const breakBySpace = value => {
  const parsedValue = valueParser(String(value));

  // parts becomes our return
  const parts = [];

  // but we need a placeholder to work with
  let currentPart = "";

  // ValueParser sees space characters as nodes, so we can split without Regex
  parsedValue.nodes.forEach(node => {
    // this walks the node and when it finds a space, pushes the part
    // to parts, then trims off that space because we don't want it
    if (node.type === "space") {
      if (currentPart.trim()) {
        parts.push(currentPart.trim());
        currentPart = "";
      }
      return;
    }

    // but if no space, just add it
    currentPart += valueParser.stringify(node);
  });

  // grab anything after the last space too
  if (currentPart.trim()) {
    parts.push(currentPart.trim());
  }

  return parts;
};

/**
 * Various checks for common design token and CSS content.
 *
 * @param {object} node object from PostCSS value-parser
 * @returns {boolean}
 */

// checks if a node is a word
export const isWord = node => node.type === "word";

// checks if a node is a function
export const isFunction = node => node.type === "function";

// checks if a node is a `var()` function
export const isVariableFunction = node =>
  isFunction(node) && node.value === "var";

// checks if a node is a `calc()` function
export const isCalcFunction = node => isFunction(node) && node.value === "calc";

// checks if a node is a url() function
export const isUrlFunction = node => isFunction(node) && node.value === "url";

/**
 * Checks if CSS includes a named color, e.g. 'white' or 'rebeccapurple'
 *
 * @param {string} value some CSS declaration to match
 * @returns {boolean}
 */
export const containsNamedColor = value =>
  valueParser(String(value)).nodes.some(
    node =>
      node.type === "word" && NAMED_COLORS.includes(node.value.toLowerCase())
  );

/**
 * Checks if CSS includes a named color, e.g. 'white' or 'rebeccapurple'
 *
 * @param {string} value some CSS declaration to match
 * @returns {boolean}
 */
export const containsSystemColor = value =>
  valueParser(String(value)).nodes.some(
    node =>
      node.type === "word" &&
      [
        ...PREFIXED_SYSTEM_COLORS,
        ...DEPRECATED_SYSTEM_COLORS,
        ...SYSTEM_COLORS,
      ].includes(node.value.toLowerCase())
  );

/**
 * Checks if CSS includes a hex value, e.g. `#00000`.
 *
 * @param {string} value some CSS declaration to match
 * @returns {boolean}
 */
export const containsHexColor = value =>
  valueParser(String(value)).nodes.some(
    node => node.type === "word" && node.value.startsWith("#")
  );

/**
 * Checks if CSS is a valid color function
 * e.g., `rgb(10 10 10)`.
 *
 * @param {string} value some CSS declaration to match
 * @returns {boolean}
 */
export const containsColorFunction = value => {
  const COLOR_FUNCTIONS = ["rgb", "rgba", "hsl", "hsla", "oklch", "color-mix"];

  return valueParser(String(value)).nodes.some(
    node =>
      node.type === "function" && COLOR_FUNCTIONS.includes(String(node.value))
  );
};

/**
 * Checks if a node contains a value using vw/vh units
 * e.g., `100vh`.
 *
 * @param {string} value some CSS declaration to match
 * @returns {boolean}
 */
export const containsViewportUnit = value => {
  return valueParser(String(value)).nodes.some(
    node => node.type === "word" && /^(0|[\d.]+)(vh|vw)$/.test(node.value)
  );
};

/**
 * Returns only the properties in the declaration that are colors, or at least likely to be colors.
 * This allows for ignoring properties in shorthand that are not relevant to color rules.
 *
 * @param {string} value some CSS declaration to match
 * @returns {string[]}
 */
export const getColorProperties = value => {
  const relevantProperties = [];
  const parsed = valueParser(value);
  parsed.nodes.forEach(node => {
    const property = value.substring(node.sourceIndex, node.sourceEndIndex);
    if (
      ALLOW_LIST.includes(property) ||
      containsHexColor(property) ||
      containsNamedColor(property) ||
      containsSystemColor(property) ||
      containsColorFunction(property) ||
      isVariableFunction(node)
    ) {
      relevantProperties.push(property);
    }
  });

  return relevantProperties;
};

/**
 * Looks to see if a value is included in our token var() array.
 *
 * @param {string} value some CSS declaration to match
 * @param {string} tokenCSS the token to match against
 * @returns {boolean}
 */
export const isToken = (value, tokenCSS) => tokenCSS.includes(value);

/**
 * Checks if a CSS value is allowed, given exact strings or a
 * regex pattern in an allowList.
 *
 * @param {string} value some CSS declaration to match
 * @param {string[]} allowList
 * @returns {boolean}
 */
export const isAllowed = (value, allowList) => {
  const allowListPattern = pattern => {
    pattern instanceof RegExp ? pattern.test(value) : pattern === value;
  };

  // If the value is in the allowList
  if (allowList.some(allowListPattern)) {
    return true;
  }

  // Words inside var() should use tokens
  if (valueParser(value).nodes.some(node => isVariableFunction(node))) {
    return false;
  }

  // If the value is in the allowList but the string is CSS shorthand, e.g. `border` properties
  return valueParser(value).nodes.some(
    node =>
      isWord(node) &&
      allowList.some(pattern =>
        pattern instanceof RegExp
          ? pattern.test(node.value)
          : pattern === node.value
      )
  );
};

/**
 * Checks if CSS value is a valid fallback expression,
 * where we allow non-token fallbacks.
 * e.g., `var(--design-token, #000000);`
 *
 * @param {string} value some CSS declaration to match
 * @param {string[]} tokenCSS
 * @returns {boolean}
 */
export const isValidFallback = (value, tokenCSS) => {
  const parsed = valueParser(String(value));

  return parsed.nodes.some(node => {
    // ignore this if we're not looking at a var()
    if (!isVariableFunction(node)) {
      return false;
    }

    // isolate the first word from the declaration and see if it is a token
    const firstWord = node.nodes.find(isWord);
    if (firstWord && isToken(`var(${firstWord.value})`, tokenCSS)) {
      return true;
    }

    // isolate the fallback and see if it is a custom property
    const fallbackProperty = node.nodes.find(isVariableFunction);
    if (fallbackProperty) {
      const fallbackWord = fallbackProperty.nodes.find(isWord);
      if (fallbackWord && isToken(`var(${fallbackWord.value})`, tokenCSS)) {
        return true;
      }
    }

    return false;
  });
};

/**
 * Checks if CSS custom property defined in the same file is a valid design token
 *
 * @param {string} value some CSS declaration to match
 * @param {object} cssCustomProperties
 * @param {string[]} tokenCSS
 * @param {string[]} allowList
 * @returns {boolean}
 */
export const isValidLocalProperty = (
  value,
  cssCustomProperties,
  tokenCSS,
  allowList = ALLOW_LIST
) => {
  const parsed = valueParser(String(value));
  let customProperty = null;

  parsed.walk(node => {
    if (isVariableFunction(node)) {
      const args = node.nodes.filter(isWord);
      if (args.length) {
        customProperty = args[0].value;
      }
    }
  });

  if (customProperty && cssCustomProperties[customProperty]) {
    return isValidTokenUsage(
      cssCustomProperties[customProperty],
      tokenCSS,
      cssCustomProperties,
      allowList
    );
  }
  return false;
};

/**
 * Trims a value for easier checking.
 *
 * @param {string} value some CSS declaration to match
 * @returns {string}
 */
export const trimValue = value => String(value).trim();

/**
 * Checks if CSS value uses tokens correctly (individually).
 *
 * @param {string} value some CSS declaration to match
 * @param {string[]} tokenCSS
 * @param {object} cssCustomProperties
 * @param {string[]} allowList
 * @returns {boolean}
 */
export const isValidValue = (
  value,
  tokenCSS,
  cssCustomProperties,
  allowList
) => {
  // assumes we've removed white space
  return (
    isToken(value, tokenCSS) ||
    isAllowed(value, allowList) ||
    isValidLocalProperty(value, cssCustomProperties, tokenCSS) ||
    isValidFallback(value, tokenCSS)
  );
};

/**
 * Checks if CSS value uses tokens correctly (as a group).
 *
 * @param {string | import('postcss').Node} value some CSS declaration to match
 * @param {string[]} tokenCSS
 * @param {object} cssCustomProperties
 * @param {string[]} allowList defaults to the base list in this file
 * @returns {boolean}
 */
export const isValidTokenUsage = (
  value,
  tokenCSS,
  cssCustomProperties,
  allowList = ALLOW_LIST
) => {
  // TODO: this handles both string and postcss node values to support the old rule implementation
  // once all design token rules are consolidated, we can remove this and use only postcss nodes
  const parsed = typeof value === "string" ? valueParser(value) : value;
  let isValid = false;

  parsed.walk(node => {
    switch (node.type) {
      case "word": {
        // if the node is a word, check if it's an allowed word
        isValid = isAllowed(node.value, allowList);
        break;
      }
      case "function": {
        // if the node is a function, check if it's a token
        if (node.value == "var") {
          let variableNode = `var(${node.nodes[0].value})`;
          isValid =
            isToken(variableNode, tokenCSS) ||
            isValidLocalProperty(
              variableNode,
              cssCustomProperties,
              tokenCSS,
              allowList
            );
        }
        break;
      }
      default: {
        break;
      }
    }
    return !isValid;
  });

  return isValid;
};

/**
 * Checks if a calc() function contains valid token usage.
 *
 * @param {string} value - CSS declaration to match
 * @param {string[]} tokenCSS
 * @param {object} cssCustomProperties
 * @param {string[]} allowList
 * @returns {boolean}
 */
export const isValidTokenUsageInCalc = (
  value,
  tokenCSS,
  cssCustomProperties,
  allowList = ALLOW_LIST
) => {
  const parsed = valueParser(String(value));
  let isEveryChildValid = true;

  parsed.walk(node => {
    if (!isEveryChildValid || !isCalcFunction(node)) {
      return;
    }

    isEveryChildValid = node.nodes.every(child => {
      if (
        child.type === "space" ||
        (child.type === "word" && /^[+\-*/]$/.test(child.value))
      ) {
        return true;
      }

      if (child.type === "word") {
        if (
          isAllowed(child.value, allowList) ||
          /^\d*\.?\d*(vh|vw|em|%)?$/.test(child.value)
        ) {
          return true;
        }
      }

      if (isVariableFunction(child)) {
        const variableNode = `var(${child.nodes[0].value})`;
        if (
          isToken(variableNode, tokenCSS) ||
          isValidLocalProperty(variableNode, cssCustomProperties, tokenCSS)
        ) {
          return true;
        }
      }

      return false;
    });
  });

  return isEveryChildValid;
};

/**
 * Checks if CSS value uses color tokens correctly.
 *
 * @param {string} value some CSS declaration to match
 * @returns {boolean}
 */
export const usesRawColors = value => {
  const trimmedValue = trimValue(value);

  return containsHexColor(trimmedValue) || containsColorFunction(trimmedValue);
};

/**
 * Checks if CSS value is a valid fallback expression,
 * where we allow disallow token fallbacks.
 * e.g., `var(--design-token, --local-token);`
 *
 * @param {string} value some CSS declaration to match
 * @param {string[]} rawValueToTokenValue an object of values to check
 * @returns {boolean}
 */
export const usesRawFallbackValues = (value, rawValueToTokenValue) => {
  if (value.includes("var(") && value.includes(",")) {
    for (const token of Object.keys(rawValueToTokenValue)) {
      if (value.includes(token)) {
        return true;
      }
    }
  }
  return false;
};

/**
 * Checks if all values in a shorthand declaration should be tokens.
 * Stricter than isTokenPart, for logical CSS properties that allow
 * mixed shorthand values.
 * e.g., `border-radius: 1px 0 2px;`
 *
 * @param {string} value some CSS declaration to check
 * @param {string[]} tokenCSS
 * @param {object} cssCustomProperties
 * @param {string[]} allowList
 * @returns {boolean}
 */
export const usesRawShorthandValues = (
  value,
  tokenCSS,
  cssCustomProperties,
  allowList = ALLOW_LIST
) => {
  const parts = breakBySpace(String(value));

  // only check shorthand, not single values
  if (parts.length <= 1) {
    return false;
  }

  // look at each part and see if it is a valid value
  // all parts must be valid
  return !parts.every(part => {
    return isValidValue(
      trimValue(part),
      tokenCSS,
      cssCustomProperties,
      allowList
    );
  });
};
