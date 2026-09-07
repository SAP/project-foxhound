/**
 * Test LoginManagerParent.getGeneratedPassword()
 */

"use strict";

const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);
const { LoginManagerParent } = ChromeUtils.importESModule(
  "resource://gre/modules/LoginManagerParent.sys.mjs"
);

function simulateNavigationInTheFrame(newOrigin) {
  LoginManagerParent._browsingContextGlobal.get.restore();
  sinon
    .stub(LoginManagerParent._browsingContextGlobal, "get")
    .withArgs(99)
    .callsFake(() => {
      return {
        currentWindowGlobal: {
          documentPrincipal:
            Services.scriptSecurityManager.createContentPrincipalFromOrigin(
              `https://${newOrigin}^userContextId=2`
            ),
          documentURI: Services.io.newURI("https://www.example.com"),
        },
      };
    });
}

add_task(async function test_getGeneratedPassword() {
  // Force the feature to be enabled.
  Services.prefs.setBoolPref("signon.generation.available", true);
  Services.prefs.setBoolPref("signon.generation.enabled", true);

  // Setup the improved rules collection since the improved password rules
  // pref is on by default. Otherwise any interaciton with LMP.getGeneratedPassword()
  // will take a long time to complete
  if (LoginHelper.improvedPasswordRulesEnabled) {
    await LoginTestUtils.remoteSettings.setupImprovedPasswordRules();
  }

  let LMP = new LoginManagerParent();
  LMP.useBrowsingContext(99);

  Assert.ok(LMP.getGeneratedPassword, "LMP.getGeneratedPassword exists");
  equal(
    LoginManagerParent.getGeneratedPasswordsByPrincipalOrigin().size,
    0,
    "Empty cache to start"
  );

  equal(await LMP.getGeneratedPassword(), null, "Null with no BrowsingContext");

  Assert.ok(
    LoginManagerParent._browsingContextGlobal,
    "Check _browsingContextGlobal exists"
  );
  Assert.ok(
    !LoginManagerParent._browsingContextGlobal.get(99),
    "BrowsingContext 99 shouldn't exist yet"
  );
  info("Stubbing BrowsingContext.get(99)");
  sinon
    .stub(LoginManagerParent._browsingContextGlobal, "get")
    .withArgs(99)
    .callsFake(() => {
      return {
        currentWindowGlobal: {
          documentPrincipal:
            Services.scriptSecurityManager.createContentPrincipalFromOrigin(
              "https://www.example.com^userContextId=6"
            ),
          documentURI: Services.io.newURI("https://www.example.com"),
        },
      };
    });
  Assert.ok(
    LoginManagerParent._browsingContextGlobal.get(99),
    "Checking BrowsingContext.get(99) stub"
  );
  let password1 = await LMP.getGeneratedPassword();
  notEqual(password1, null, "Check password was returned");
  equal(
    password1.length,
    LoginTestUtils.generation.LENGTH,
    "Check password length"
  );
  equal(
    LoginManagerParent.getGeneratedPasswordsByPrincipalOrigin().size,
    1,
    "1 added to cache"
  );
  equal(
    LoginManagerParent.getGeneratedPasswordsByPrincipalOrigin().get(
      "https://www.example.com^userContextId=6"
    ).value,
    password1,
    "Cache key and value"
  );
  let password2 = await LMP.getGeneratedPassword();
  equal(
    password1,
    password2,
    "Same password should be returned for the same origin"
  );

  // Updating autosaved login to have username will reset generated password.
  // The stored login uses the page origin, not the principal origin —
  // ^userContextId is only used as the in-memory cache key.
  const autoSavedLogin = await LoginTestUtils.addLogin({
    origin: "https://www.example.com",
    username: "",
    password: password1,
  });
  // Link the cache entry to the stored login's GUID, as the auto-save
  // flow does in `LoginManagerParent._onPasswordEditedOrGenerated`
  LoginManagerParent.getGeneratedPasswordsByPrincipalOrigin().get(
    "https://www.example.com^userContextId=6"
  ).storageGUID = autoSavedLogin.QueryInterface(Ci.nsILoginMetaInfo).guid;
  const updatedLogin = autoSavedLogin.clone();
  updatedLogin.username = "anyone";
  await LoginTestUtils.modifyLogin(autoSavedLogin, updatedLogin);
  password2 = await LMP.getGeneratedPassword();
  notEqual(
    password1,
    password2,
    "New password should be returned for the same origin after login saved"
  );

  simulateNavigationInTheFrame("www.mozilla.org");
  let password3 = await LMP.getGeneratedPassword();
  notEqual(
    password2,
    password3,
    "Different password for a different origin for the same BC"
  );
  equal(
    password3.length,
    LoginTestUtils.generation.LENGTH,
    "Check password3 length"
  );

  simulateNavigationInTheFrame("bank.biz");
  let password4 = await LMP.getGeneratedPassword({ inputMaxLength: 5 });
  notEqual(
    password4,
    password2,
    "Different password for a different origin for the same BC"
  );
  notEqual(
    password4,
    password3,
    "Different password for a different origin for the same BC"
  );
  equal(password4.length, 5, "password4 length is limited by input.maxLength");

  info("Now checks cases where null should be returned");

  Services.prefs.setBoolPref("signon.rememberSignons", false);
  equal(
    await LMP.getGeneratedPassword(),
    null,
    "Prevented when pwmgr disabled"
  );
  Services.prefs.setBoolPref("signon.rememberSignons", true);

  Services.prefs.setBoolPref("signon.generation.available", false);
  equal(await LMP.getGeneratedPassword(), null, "Prevented when unavailable");
  Services.prefs.setBoolPref("signon.generation.available", true);

  Services.prefs.setBoolPref("signon.generation.enabled", false);
  equal(await LMP.getGeneratedPassword(), null, "Prevented when disabled");
  Services.prefs.setBoolPref("signon.generation.enabled", true);

  LMP.useBrowsingContext(123);
  equal(
    await LMP.getGeneratedPassword(),
    null,
    "Prevented when browsingContext is missing"
  );
});

/**
 * The generated password cache should be cleared when the autosaved login is
 * updated with a username.
 * When using container tabs, where the cache key includes ^userContextId
 * (coming from the principal origin) while the stored login uses the base page
 * origin.
 * In this case, the observer must find the cache entry via GUID, not by origin.
 */
add_task(
  async function test_getGeneratedPassword_containerTab_cacheCleared_on_username_added() {
    Services.prefs.setBoolPref("signon.generation.available", true);
    Services.prefs.setBoolPref("signon.generation.enabled", true);

    if (LoginHelper.improvedPasswordRulesEnabled) {
      await LoginTestUtils.remoteSettings.setupImprovedPasswordRules();
    }

    let LMP = new LoginManagerParent();
    LMP.useBrowsingContext(99);

    // Restore any leftover stub from previous tests before creating a new one.
    if (LoginManagerParent._browsingContextGlobal.get.restore) {
      LoginManagerParent._browsingContextGlobal.get.restore();
    }
    sinon
      .stub(LoginManagerParent._browsingContextGlobal, "get")
      .withArgs(99)
      .callsFake(() => ({
        currentWindowGlobal: {
          documentPrincipal:
            Services.scriptSecurityManager.createContentPrincipalFromOrigin(
              "https://www.example.com^userContextId=42"
            ),
          documentURI: Services.io.newURI("https://www.example.com"),
        },
      }));

    const generatedPassword = await LMP.getGeneratedPassword();
    notEqual(generatedPassword, null, "Generated password exists");

    // Autosaved login is stored with the page origin, not the principal origin.
    // The cache key has ^userContextId, the login does not.
    const autoSavedLogin = await LoginTestUtils.addLogin({
      origin: "https://www.example.com",
      username: "",
      password: generatedPassword,
    });

    // Link cache entry to stored login's GUID
    LoginManagerParent.getGeneratedPasswordsByPrincipalOrigin().get(
      "https://www.example.com^userContextId=42"
    ).storageGUID = autoSavedLogin.QueryInterface(Ci.nsILoginMetaInfo).guid;

    // Update the autosaved login to add a username. This should clear the cache.
    const updatedLogin = autoSavedLogin.clone();
    updatedLogin.username = "user@example.com";
    await LoginTestUtils.modifyLogin(autoSavedLogin, updatedLogin);

    // A new password should be generated, so we infer the cache has been cleared.
    const newPassword = await LMP.getGeneratedPassword();
    notEqual(
      generatedPassword,
      newPassword,
      "New password generated after cache cleared for containers user"
    );

    LoginManagerParent._browsingContextGlobal.get.restore();
    LoginManagerParent.getGeneratedPasswordsByPrincipalOrigin().clear();
    await Services.logins.removeAllUserFacingLoginsAsync();
  }
);
