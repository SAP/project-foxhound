/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */
"use strict";

add_setup(async function () {
  await setupPolicyEngineWithJson({
    policies: {
      DisableRemoteSettingsAndAcceptSecurityConsequences: true,
    },
  });
});

add_task(async function test_remote_settings_disallowed() {
  is(
    Services.policies.isAllowed("remoteSettings"),
    false,
    "remoteSettings should be disallowed by policy."
  );
});
