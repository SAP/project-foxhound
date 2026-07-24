/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** @import { PropertyConfig, PropertyTypeConfig } from "../config.mjs" */

import stylelint from "stylelint";
import valueParser from "postcss-value-parser";
import { namespace, getLocalCustomProperties } from "../helpers.mjs";
import { propertyConfig } from "../config.mjs";
import { PropertyValidator } from "../property-validator.mjs";

const {
  utils: { report, ruleMessages, validateOptions },
} = stylelint;

const ruleName = namespace("use-design-tokens");

const formatPropertyNames = property =>
  property.match(/^[aeiou]/i) ? `an ${property}` : `a ${property}`;

const formatTokenCategory = categories => {
  const firstCategories = categories.slice(0, -1).join(", ");
  const lastCategory = categories[categories.length - 1];
  const formattedCategories = [firstCategories, lastCategory]
    .filter(Boolean)
    .join(" or ");
  return `${formatPropertyNames(formattedCategories)} `;
};

const messages = ruleMessages(ruleName, {
  rejected: (value, tokenCategories, suggestedValue) => {
    let message = `${value} should use ${formatTokenCategory(tokenCategories)}design token.`;
    if (suggestedValue) {
      message += ` Suggested value: ${suggestedValue}. This may be fixable by running the same command again with --fix.`;
    }
    return message;
  },
  warning: (value, suggestedValue) => {
    let message = `${value} is allowed, but discouraged.`;
    if (suggestedValue) {
      message += ` Consider using ${suggestedValue} instead.`;
    }
    return message;
  },
});

const meta = {
  url: "https://firefox-source-docs.mozilla.org/code-quality/lint/linters/stylelint-plugin-mozilla/rules/use-design-tokens.html",
  fixable: true,
};

const ruleFunction = primaryOption => {
  return (root, result) => {
    const validOptions = validateOptions(result, ruleName, {
      actual: primaryOption,
      possible: [true, null],
    });

    if (!validOptions || primaryOption === null) {
      return;
    }

    const cssCustomProperties = getLocalCustomProperties(root);

    root.walkDecls(decl => {
      const { prop, value } = decl;

      const config = propertyConfig[prop];
      if (!config) {
        return;
      }

      if (!config.validator) {
        config.validator = new PropertyValidator(config);
      }

      const parsedValue = valueParser(value);
      const isValid = config.validator.isValidPropertyValue(
        parsedValue,
        cssCustomProperties
      );

      if (!isValid) {
        const fixedValue = config.validator.getFixedValue(
          value,
          config.validator.customFixes
        );
        const tokenCategories = config.validator.getTokenCategories();
        const fix =
          fixedValue !== null ? () => (decl.value = fixedValue) : undefined;

        // Replace CSS variable usage with their locally defined values, if applicable.
        // This allows us to check if suggestions work on the local variables, so we can set the severity to warning.
        const resolvedValue = config.validator.getResolvedValue(value);
        const suggestedValue = config.validator.getFixedValue(
          resolvedValue,
          config.validator.customSuggestions
        );
        const isSuggestedValueValid =
          suggestedValue &&
          config.validator.isValidPropertyValue(
            valueParser(suggestedValue),
            cssCustomProperties
          );

        let warningPropertyValue = value;
        if (isSuggestedValueValid && resolvedValue !== value) {
          warningPropertyValue = `${value}, which resolves to ${resolvedValue},`;
        }

        report({
          message: isSuggestedValueValid
            ? messages.warning(warningPropertyValue, suggestedValue)
            : messages.rejected(value, tokenCategories, fixedValue),
          severity: isSuggestedValueValid ? "warning" : "error",
          node: decl,
          result,
          ruleName,
          fix,
        });
      }
    });
  };
};

ruleFunction.ruleName = ruleName;
ruleFunction.messages = messages;
ruleFunction.meta = meta;

export default ruleFunction;
