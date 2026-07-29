/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/* import-globals-from /toolkit/components/workerloader/require.js */
importScripts("resource://gre/modules/workers/require.js");
const { createTask } = require("resource://devtools/shared/worker/helper.js");

createTask(self, "square", function (x) {
  return x * x;
});

createTask(self, "squarePromise", function (x) {
  return new Promise(resolve => resolve(x * x));
});

createTask(self, "squareError", function () {
  return new Error("Nope");
});

createTask(self, "squarePromiseReject", function () {
  return new Promise((_, reject) => reject("Nope"));
});
