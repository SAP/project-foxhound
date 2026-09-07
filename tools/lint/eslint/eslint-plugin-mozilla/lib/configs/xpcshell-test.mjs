/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import privileged from "../environments/privileged.mjs";
import xpcshell from "../environments/xpcshell.mjs";
import sdlPlugin from "@microsoft/eslint-plugin-sdl";

// Parent config file for all xpcshell files.

export default {
  languageOptions: {
    globals: {
      ...privileged.globals,
      ...xpcshell.globals,
    },
  },

  name: "mozilla/xpcshell-test",

  plugins: {
    "@microsoft/sdl": sdlPlugin,
  },

  rules: {
    // Turn off no-insecure-url as it is not considered necessary for xpcshell
    // level tests.
    "@microsoft/sdl/no-insecure-url": "off",

    "mozilla/no-comparison-or-assignment-inside-ok": "error",
    "mozilla/no-useless-run-test": "error",
  },
};
