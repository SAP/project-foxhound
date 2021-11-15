/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const { generateActorSpec, RetVal, Arg } = require("devtools/shared/protocol");

const stackTracesSpec = generateActorSpec({
  typeName: "stacktraces",
  methods: {
    getStackTrace: {
      request: { resourceId: Arg(0) },
      // stacktrace is an "array:string", but not always.
      response: RetVal("json"),
    },
  },
});

exports.stackTracesSpec = stackTracesSpec;
