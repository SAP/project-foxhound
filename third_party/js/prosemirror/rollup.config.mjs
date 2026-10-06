/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import terser from "@rollup/plugin-terser";
import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";

export default function (commandLineArgs = {}) {
  const plugins = [
    nodeResolve({
      browser: true,
      dedupe: [
        "prosemirror-commands",
        "prosemirror-history",
        "prosemirror-keymap",
        "prosemirror-markdown",
        "prosemirror-model",
        "prosemirror-schema-basic",
        "prosemirror-state",
        "prosemirror-transform",
        "prosemirror-view",
      ],
    }),
    commonjs(),
    json(),
  ];

  if (commandLineArgs.configMinify) {
    plugins.push(terser());
  }

  return {
    input: "bundle_entry.mjs",
    output: {
      file: "prosemirror.bundle.mjs",
      format: "esm",
      sourcemap: false,
    },
    plugins,
    treeshake: true,
  };
}
