/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

const path = require("path");
const config = require("./webpack.base.config.js");
const absolute = relPath => path.join(__dirname, relPath);

module.exports = Object.assign({}, config(), {
  entry: absolute("content-src/asrouter-newtab-multistage.jsx"),
  output: {
    path: absolute("content/components/asrouter-newtab-multistage"),
    filename: "asrouter-newtab-multistage.bundle.js",
  },
  externals: {
    react: "React",
    "react-dom": "ReactDOM",
    "react-dom/client": "ReactDOM",
  },
});
