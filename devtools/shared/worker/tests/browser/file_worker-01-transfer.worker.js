/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/* import-globals-from /toolkit/components/workerloader/require.js */
importScripts("resource://gre/modules/workers/require.js");
const { createTask } = require("resource://devtools/shared/worker/helper.js");

createTask(self, "transfer", function ({ buf }) {
  return buf.byteLength;
});
