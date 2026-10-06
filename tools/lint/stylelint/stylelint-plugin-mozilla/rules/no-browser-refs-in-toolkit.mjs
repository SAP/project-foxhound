/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import stylelint from "stylelint";
import valueParser from "postcss-value-parser";
import { namespace, isUrlFunction, isWord } from "../helpers.mjs";

const {
  utils: { report, ruleMessages, validateOptions },
} = stylelint;

const ruleName = namespace("no-browser-refs-in-toolkit");

const messages = ruleMessages(ruleName, {
  rejected: url =>
    `${url} is part of Desktop Firefox and cannot be used by this code (which has to also work elsewhere).`,
});

const meta = {
  url: "https://firefox-source-docs.mozilla.org/code-quality/lint/linters/stylelint-plugin-mozilla/rules/no-browser-refs-in-toolkit.html",
  fixable: false,
};

function extractUrlFromNode(node) {
  if (!node) {
    return null;
  }

  if (node.type === "string") {
    return node.value;
  }

  if (isUrlFunction(node)) {
    const urlContent = node.nodes[0];
    if (urlContent && (urlContent.type === "string" || isWord(urlContent))) {
      return urlContent.value;
    }
  }

  return null;
}

function isBrowserUrl(url) {
  return (
    url.startsWith("chrome://browser") ||
    url.startsWith("resource:///") ||
    url.startsWith("resource://app/") ||
    /moz-src:\/\/\w*\/browser\//.test(url)
  );
}

const ruleFunction = primaryOption => {
  return (root, result) => {
    const validOptions = validateOptions(result, ruleName, {
      actual: primaryOption,
      possible: [true],
    });

    if (!validOptions) {
      return;
    }

    root.walkAtRules("import", atRule => {
      const params = valueParser(atRule.params);
      const firstParam = params.nodes[0];
      const importUrl = extractUrlFromNode(firstParam);

      if (importUrl && isBrowserUrl(importUrl)) {
        report({
          message: messages.rejected(importUrl),
          node: atRule,
          result,
          ruleName,
        });
      }
    });

    root.walkDecls(decl => {
      const parsed = valueParser(decl.value);

      parsed.nodes.forEach(node => {
        const url = extractUrlFromNode(node);

        if (url && isBrowserUrl(url)) {
          report({
            message: messages.rejected(url),
            node: decl,
            result,
            ruleName,
          });
        }
      });
    });
  };
};

ruleFunction.ruleName = ruleName;
ruleFunction.messages = messages;
ruleFunction.meta = meta;

export default ruleFunction;
