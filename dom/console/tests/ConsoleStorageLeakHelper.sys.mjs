/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// System module whose console has mInnerID=0: messages are stored under
// a filename key in ConsoleAPIStorage, not under a numeric window ID.
export function logError(err) {
  console.error(err);
}

export function logSandboxError(win) {
  let sb = Cu.Sandbox(win, { sandboxPrototype: win });
  let err = Cu.evalInSandbox(`new Error("sandbox leak test")`, sb);
  console.error(err);
}
