/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* eslint-disable no-shadow */

/*
 * Fork of stylelint's `media-query-no-invalid` (see bug 2038250) that
 * recognises Gecko's `-moz-pref(...)` query feature as valid without
 * suppressing reports for the rest of the query.
 *
 * Implementation: before parsing each `@media` at-rule, every
 * `-moz-pref(...)` occurrence in the params is rewritten to a
 * length-preserving placeholder feature so source indices reported
 * against the original at-rule remain accurate. The rest of the rule
 * mirrors upstream's logic so genuinely invalid features alongside
 * `-moz-pref(...)` are still flagged.
 */

import { isFunctionNode, sourceIndices } from "@csstools/css-parser-algorithms";
import {
  isGeneralEnclosed,
  isMediaFeatureBoolean,
  isMediaFeaturePlain,
  isMediaFeatureRange,
  isMediaQueryInvalid,
  parse as parseMediaQueryList,
} from "@csstools/media-query-list-parser";
import stylelint from "stylelint";

import { namespace } from "../helpers.mjs";

const {
  utils: { report, ruleMessages, validateOptions },
} = stylelint;

const ruleName = namespace("media-query-no-invalid");

const messages = ruleMessages(ruleName, {
  rejected: (query, reason) => {
    if (!reason) {
      return `Unexpected invalid media query "${query}"`;
    }
    return `Unexpected invalid media query "${query}", ${reason}`;
  },
});

const reasons = {
  custom: "custom media queries can only be used in boolean queries",
  min_max_in_range:
    '"min-" and "max-" prefixes are not needed when using range queries',
  min_max_in_boolean:
    '"min-" and "max-" prefixes are not needed in boolean queries',
  discrete: "discrete features can only be used in plain and boolean queries",
};

const HAS_MIN_MAX_PREFIX = /^(?:min|max)-/i;

// Mirror of stylelint's reference/mediaFeatures.mjs (range-typed names).
const RANGE_TYPE_MEDIA_FEATURE_NAMES = new Set([
  "aspect-ratio",
  "color",
  "color-index",
  "device-aspect-ratio",
  "device-height",
  "device-width",
  "height",
  "horizontal-viewport-segments",
  "monochrome",
  "resolution",
  "vertical-viewport-segments",
  "width",
]);

const isCustomMediaQuery = name => name.startsWith("--");

// Matches `-moz-pref(...)` with any non-parenthesised argument list.
// Pref names and default values never contain unescaped parentheses,
// so this is sufficient.
const MOZ_PREF_REGEXP = /-moz-pref\([^()]*\)/gi;
// Length-preserving placeholder. Must be no longer than the shortest
// possible -moz-pref(...) match (`-moz-pref()`, 11 chars).
const PLACEHOLDER = "(width)";

function rewriteMozPref(params) {
  return params.replace(MOZ_PREF_REGEXP, match => {
    if (match.length < PLACEHOLDER.length) {
      return match;
    }
    return PLACEHOLDER + " ".repeat(match.length - PLACEHOLDER.length);
  });
}

const meta = {
  url: "https://firefox-source-docs.mozilla.org/code-quality/lint/linters/stylelint-plugin-mozilla/rules/media-query-no-invalid.html",
  fixable: false,
};

const ruleFunction = (primary, secondaryOptions) => {
  return (root, result) => {
    const validOptions = validateOptions(
      result,
      ruleName,
      { actual: primary, possible: [true] },
      {
        actual: secondaryOptions,
        possible: {
          ignoreFunctions: [
            val => typeof val === "string",
            val => val instanceof RegExp,
          ],
        },
        optional: true,
      }
    );

    if (!validOptions) {
      return;
    }

    root.walkAtRules(/^media$/i, atRule => {
      const paramIndex =
        1 + atRule.name.length + (atRule.raws.afterName?.length ?? 0);
      // Match stylelint's getAtRuleParams: prefer the raw representation
      // (which preserves SCSS interpolations etc) over the cleaned
      // `params` value.
      const originalParams = atRule.raws.params?.raw ?? atRule.params;
      const rewritten = rewriteMozPref(originalParams);

      const queries = parseMediaQueryList(rewritten, {
        preserveInvalidMediaQueries: true,
      });

      queries.forEach(mediaQuery => {
        if (isMediaQueryInvalid(mediaQuery)) {
          if (shouldIgnoreNode(mediaQuery, secondaryOptions)) {
            return;
          }
          complain(atRule, paramIndex, originalParams, mediaQuery);
          return;
        }

        mediaQuery.walk(({ node, parent }) => {
          if (isGeneralEnclosed(node)) {
            if (shouldIgnoreNode(mediaQuery, secondaryOptions)) {
              return;
            }
            complain(atRule, paramIndex, originalParams, node);
            return;
          }

          if (isMediaFeaturePlain(node)) {
            const name = node.getName();
            if (isCustomMediaQuery(name)) {
              complain(atRule, paramIndex, originalParams, parent, "custom");
            }
            return;
          }

          if (isMediaFeatureRange(node)) {
            const name = node.getName().toLowerCase();
            if (isCustomMediaQuery(name)) {
              complain(atRule, paramIndex, originalParams, parent, "custom");
              return;
            }
            if (HAS_MIN_MAX_PREFIX.test(name)) {
              complain(
                atRule,
                paramIndex,
                originalParams,
                parent,
                "min_max_in_range"
              );
              return;
            }
            if (!RANGE_TYPE_MEDIA_FEATURE_NAMES.has(name)) {
              complain(atRule, paramIndex, originalParams, parent, "discrete");
            }
            return;
          }

          if (isMediaFeatureBoolean(node)) {
            const name = node.getName();
            if (HAS_MIN_MAX_PREFIX.test(name)) {
              complain(
                atRule,
                paramIndex,
                originalParams,
                parent,
                "min_max_in_boolean"
              );
            }
          }
        });
      });
    });

    function complain(atRule, index, originalParams, node, reason) {
      const [start, end] = sourceIndices(node);
      // Use the original (un-rewritten) params so messages quote the
      // user's actual source, including any -moz-pref(...) within the
      // offending region.
      const queryText = originalParams.slice(start, end + 1);

      report({
        message: messages.rejected,
        messageArgs: [queryText, reason ? reasons[reason] : ""],
        index: index + start,
        endIndex: index + end + 1,
        node: atRule,
        ruleName,
        result,
      });
    }
  };
};

function shouldIgnoreNode(node, secondaryOptions) {
  const ignoreFunctions = secondaryOptions?.ignoreFunctions;
  if (!ignoreFunctions) {
    return false;
  }

  let ignored = false;
  node.walk(({ node: childNode }) => {
    if (!isFunctionNode(childNode)) {
      return undefined;
    }
    const fnName = childNode.getName();
    ignored = ignoreFunctions.some(matcher =>
      typeof matcher === "string" ? matcher === fnName : matcher.test(fnName)
    );
    if (ignored) {
      return false;
    }
    return undefined;
  });

  return ignored;
}

ruleFunction.ruleName = ruleName;
ruleFunction.messages = messages;
ruleFunction.meta = meta;

export default ruleFunction;
