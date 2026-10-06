/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function test_breakage_l10n_ids_smoketest() {
  const response = await fetch(
    "resource://builtin-addons/ipp-activator/breakages/tab.json"
  );
  const breakages = await response.json();

  const uniqueIds = [
    ...new Set(breakages.map(entry => entry.l10nId).filter(Boolean)),
  ];
  Assert.greater(
    uniqueIds.length,
    0,
    "ipp-activator/breakages/tab.json contains at least one l10nId"
  );

  const l10n = new Localization(["browser/ipProtection.ftl"], true);
  const messages = l10n.formatMessagesSync(uniqueIds.map(id => ({ id })));

  for (let i = 0; i < uniqueIds.length; i++) {
    const id = uniqueIds[i];
    const msg = messages[i];
    Assert.notEqual(msg, null, `Message for "${id}" was found`);
    Assert.ok(
      typeof msg.value === "string" && !!msg.value.length,
      `Expect message for "${id}" to be a non-empty string`
    );
  }
});
