"use strict";

/* exported checkSitePermissions */

const { Services } = SpecialPowers;
const { NetUtil } = SpecialPowers.ChromeUtils.importESModule(
  "resource://gre/modules/NetUtil.sys.mjs"
);

function checkSitePermissions(uuid, expectedPermAction, assertMessage) {
  if (!uuid) {
    throw new Error(
      "checkSitePermissions should not be called with an undefined uuid"
    );
  }

  const baseURI = NetUtil.newURI(`moz-extension://${uuid}/`);
  const principal = Services.scriptSecurityManager.createContentPrincipal(
    baseURI,
    {}
  );

  const sitePermissions = {
    webextUnlimitedStorage: Services.perms.testPermissionFromPrincipal(
      principal,
      "WebExtensions-unlimitedStorage"
    ),
    persistentStorage: Services.perms.testPermissionFromPrincipal(
      principal,
      "persistent-storage"
    ),
  };

  for (const [sitePermissionName, actualPermAction] of Object.entries(
    sitePermissions
  )) {
    is(
      actualPermAction,
      expectedPermAction,
      `The extension "${sitePermissionName}" SitePermission ${assertMessage} as expected`
    );
  }
}
