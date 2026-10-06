/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

function isSandboxFrozen(sandbox) {
  return Cu.evalInSandbox("Object.isFrozen(Object)", sandbox);
}

add_task(function test_invalid_option() {
  Assert.throws(
    () => Cu.Sandbox(null, { freezeBuiltins: 1 }),
    /Expected a boolean value for property freezeBuiltins/,
    "freezeBuiltins must be a boolean"
  );
});

add_task(function test_null_principal_sandbox() {
  let sand1 = Cu.Sandbox(null);
  ok(!isSandboxFrozen(sand1), "Null sandbox not frozen by default");

  let sand2 = Cu.Sandbox(null, { freezeBuiltins: true });
  ok(isSandboxFrozen(sand2), "Null sandbox can be frozen");
});

add_task(function test_system_sandbox() {
  let sand1 = Cu.Sandbox(Services.scriptSecurityManager.getSystemPrincipal());
  ok(isSandboxFrozen(sand1), "System sandbox frozen by default");

  let sand2 = Cu.Sandbox(
    Services.scriptSecurityManager.getSystemPrincipal(),
    { freezeBuiltins: false }
  );
  ok(!isSandboxFrozen(sand2), "System sandbox can opt out of being frozen");
});
