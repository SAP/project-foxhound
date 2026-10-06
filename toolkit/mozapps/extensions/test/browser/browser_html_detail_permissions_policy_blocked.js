/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { AddonTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/AddonTestUtils.sys.mjs"
);
const { EnterprisePolicyTesting } = ChromeUtils.importESModule(
  "resource://testing-common/EnterprisePolicyTesting.sys.mjs"
);

AddonTestUtils.initMochitest(this);

async function loadPolicyExtension(id, policy) {
  await EnterprisePolicyTesting.setupPolicyEngineWithJson(policy);

  let extension = ExtensionTestUtils.loadExtension({
    manifest: {
      browser_specific_settings: { gecko: { id } },
      name: "Policy toggle test",
      optional_permissions: ["history", "tabs"],
    },
    useAddonManager: "permanent",
  });
  await extension.startup();
  return extension;
}

// Opens the add-on's permissions view and returns its optional-permission
// toggles keyed by permission name, plus the view and permissions section.
async function openOptionalPermissionToggles(id) {
  let view = await loadInitialView("extension");
  let card = getAddonCard(view, id);

  if (!card.querySelector("addon-permissions-list")) {
    let loaded = waitForViewLoad(view);
    card.querySelector('[action="expand"]').click();
    await loaded;
    card = getAddonCard(view, id);
  }

  let { deck, tabGroup } = card.details;
  let permsBtn = tabGroup.querySelector('[name="permissions"]');
  let permsShown = BrowserTestUtils.waitForEvent(deck, "view-changed");
  permsBtn.click();
  await permsShown;

  let permsSection = card.querySelector("addon-permissions-list");
  let toggles = {};
  for (let toggle of permsSection.querySelectorAll(
    '.addon-permissions-optional moz-toggle[permission-type="permission"]'
  )) {
    toggles[toggle.getAttribute("permission-key")] = toggle;
  }
  return { view, permsSection, toggles };
}

async function cleanup(view, extension) {
  await closeView(view);
  await extension.unload();
  await EnterprisePolicyTesting.setupPolicyEngineWithJson("");
}

async function verifyBlockedToggleUI(id, policy) {
  let extension = await loadPolicyExtension(id, policy);
  let { view, permsSection, toggles } = await openOptionalPermissionToggles(id);

  ok(toggles.history, "history toggle exists");
  ok(toggles.tabs, "tabs toggle exists");
  ok(
    toggles.history.disabled,
    "Blocked permission toggle should be disabled by policy"
  );
  ok(
    !toggles.tabs.disabled,
    "Non-blocked permission toggle should remain enabled"
  );

  let banner = permsSection.querySelector(".addon-permissions-policy-banner");
  ok(banner, "Policy banner is rendered when any optional perm is blocked");
  is(
    banner.supportLinkEls[0]?.getAttribute("support-page"),
    "managed-browser-firefox#w_why-some-features-may-be-disabled",
    "Banner link points to the managed-browser SUMO page"
  );

  await cleanup(view, extension);
}

add_task(async function test_blocked_permission_toggle_global() {
  await verifyBlockedToggleUI("policy-blocked-toggle-global@mochi.test", {
    policies: {
      ExtensionSettings: { "*": { blocked_permissions: ["history"] } },
    },
  });
});

add_task(async function test_blocked_permission_toggle_per_id() {
  const id = "policy-blocked-toggle-per-id@mochi.test";
  await verifyBlockedToggleUI(id, {
    policies: {
      ExtensionSettings: { [id]: { blocked_permissions: ["history"] } },
    },
  });
});

add_task(async function test_allowed_permission_toggle_is_not_disabled() {
  const id = "policy-allowed-toggle@mochi.test";

  // Per-id carve-out: blocked_permissions minus allowed_permissions leaves tabs
  // blocked and history un-blocked. ("*"-level allowed_permissions is inert, so
  // this must be a per-id entry.)
  let extension = await loadPolicyExtension(id, {
    policies: {
      ExtensionSettings: {
        [id]: {
          blocked_permissions: ["history", "tabs"],
          allowed_permissions: ["history"],
        },
      },
    },
  });
  let { view, permsSection, toggles } = await openOptionalPermissionToggles(id);

  ok(toggles.history, "history toggle exists");
  ok(toggles.tabs, "tabs toggle exists");
  ok(
    !toggles.history.disabled,
    "Allowed permission toggle should NOT be disabled"
  );
  ok(
    toggles.tabs.disabled,
    "Blocked-but-not-allowed permission toggle should be disabled"
  );

  // tabs is still blocked, so the policy banner should still render.
  ok(
    permsSection.querySelector(".addon-permissions-policy-banner"),
    "Policy banner still renders for the remaining blocked permission"
  );

  await cleanup(view, extension);
});
