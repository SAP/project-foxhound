/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

// Bug 1948378: remove this exception when the eslint import plugin fully
// supports exports in package.json files
// eslint-disable-next-line import/no-unresolved
import { testRule } from "stylelint-test-rule-node";
import stylelint from "stylelint";
import mediaQueryNoInvalid from "../rules/media-query-no-invalid.mjs";

const plugin = stylelint.createPlugin(
  mediaQueryNoInvalid.ruleName,
  mediaQueryNoInvalid
);
const {
  ruleName,
  rule: { messages },
} = plugin;

testRule({
  plugins: [plugin],
  ruleName,
  config: [true],
  fix: false,
  accept: [
    {
      code: '@media -moz-pref("browser.foo") {}',
      description: "-moz-pref(...) is recognised as a valid media feature.",
    },
    {
      code: '@media not -moz-pref("browser.foo") {}',
      description: "negated -moz-pref(...) is recognised as valid.",
    },
    {
      code: '@media -moz-pref("browser.foo") and (min-width: 500px) {}',
      description: "-moz-pref(...) combined with another valid feature.",
    },
    {
      code: '@media (min-width: 500px) and -moz-pref("browser.foo") {}',
      description: "-moz-pref(...) on the right-hand side of a conjunction.",
    },
    {
      code: '@media -moz-pref("browser.foo", 1) {}',
      description: "-moz-pref(...) with an integer second argument.",
    },
    {
      code: '@media -moz-pref("browser.foo", "bar") {}',
      description: "-moz-pref(...) with a string second argument.",
    },
    {
      code: "@media (min-width: 500px) {}",
      description: "Plain valid media query passes (parity with upstream).",
    },
    {
      code: "@media screen and (min-width: 500px) {}",
      description: "Type + feature passes (parity with upstream).",
    },
  ],
  reject: [
    {
      code: "@media foo bar baz {}",
      message: messages.rejected("foo bar baz", ""),
      description: "Garbage media query is still flagged.",
    },
    {
      code: '@media -moz-prefx("browser.foo") {}',
      message: messages.rejected('-moz-prefx("browser.foo")', ""),
      description: "Typo of -moz-pref is still flagged.",
    },
    {
      code: '@media -moz-prefx("a") or -moz-pref("b") {}',
      message: messages.rejected('-moz-prefx("a") or -moz-pref("b")', ""),
      description:
        "Typo riding alongside a real -moz-pref(...) is still flagged.",
    },
    {
      code: "@media (min-resolution > 100dpi) {}",
      message: messages.rejected(
        "(min-resolution > 100dpi)",
        '"min-" and "max-" prefixes are not needed when using range queries'
      ),
      description: "min-/max- prefix in range query is still flagged.",
    },
    {
      code: '@media -moz-pref("browser.foo") and (min-resolution > 100dpi) {}',
      message: messages.rejected(
        "(min-resolution > 100dpi)",
        '"min-" and "max-" prefixes are not needed when using range queries'
      ),
      description:
        "Genuinely invalid features alongside -moz-pref(...) are still flagged.",
    },
    {
      code: '@media -moz-pref("browser.foo") and (max-width > 770px) {}',
      message: messages.rejected(
        "(max-width > 770px)",
        '"min-" and "max-" prefixes are not needed when using range queries'
      ),
      description:
        "Range query with max- prefix alongside -moz-pref(...) is still flagged.",
    },
  ],
});
