"use strict";

const EnableAllPref = "extensions.webcompat.enable_interventions";

add_task(async function test_about_compat_loads_properly() {
  // wait for all interventions to load before testing (can be quite slow on tsan builds).
  await WebCompatExtension.interventionsSettled();

  // toggle the global pref so we can check the disabled text is present.
  Services.prefs.setBoolPref(EnableAllPref, false);
  await WebCompatExtension.interventionsSettled();

  const tab = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    opening: "about:compat",
    waitForLoad: true,
  });

  await SpecialPowers.spawn(tab.linkedBrowser, [], async function () {
    is(
      content.origin,
      "moz-extension://9a310967-e580-48bf-b3e8-4eafebbc122d",
      "Expected origin of about:compat"
    );

    const disabledMsg = "[data-l10n-id=text-disabled-in-about-config]";

    content.verifyAllInterventionsOff = async function () {
      await ContentTaskUtils.waitForCondition(
        () => content.document.querySelector(disabledMsg),
        "interventions disabled by global pref message is shown"
      );
      ok(true, "interventions disabled by global pref message is shown");
    };

    content.verifyAllInterventionsOn = async function () {
      await ContentTaskUtils.waitForCondition(
        () => content.document.querySelector("#interventions tr[data-id]"),
        "interventions are listed"
      );
      await ContentTaskUtils.waitForCondition(
        () => content.document.querySelector("#smartblock tr[data-id]"),
        "SmartBlock shims are listed"
      );
      ok(true, "Interventions and shims are listed");
      ok(
        !content.document.querySelector(disabledMsg),
        "interventions disabled in about:config message is gone"
      );
    };

    await content.verifyAllInterventionsOff();
  });

  // now enable the global pref, and check the rest of the UI.
  Services.prefs.setBoolPref(EnableAllPref, true);

  await SpecialPowers.spawn(tab.linkedBrowser, [], async function () {
    await content.verifyAllInterventionsOn();

    // also choose an intervention and a shim with content-scripts, and confirm that toggling them
    // on and off works (by checking that their content-scripts are de-registered and re-registered).
    const bgWin = content.wrappedJSObject.browser.extension.getBackgroundPage();
    const interventionWithContentScripts = bgWin.interventions
      .getAvailableInterventions()
      .find(i => i.active && i.interventions?.find(v => v.content_scripts));
    const shimWithContentScripts = [...bgWin.shims.shims.values()].find(
      s => s._contentScriptRegistrations.length
    );

    async function findRegisteredScript(id) {
      return (
        await content.wrappedJSObject.browser.scripting.getRegisteredContentScripts(
          { ids: [id] }
        )
      )[0];
    }

    // both should have their content scripts registered at startup

    const interventionRCSId =
      bgWin.interventions.buildContentScriptRegistrations(
        interventionWithContentScripts.label,
        interventionWithContentScripts.interventions[0],
        bgWin.interventions.getBlocksAndMatchesFor(
          interventionWithContentScripts
        ).matches
      )[0].id;
    const shimRCSId = `SmartBlock shim for ${shimWithContentScripts.id}: ${JSON.stringify(shimWithContentScripts.contentScripts[0])}`;
    ok(
      await findRegisteredScript(interventionRCSId),
      `Found registered script for intervention: '${interventionRCSId}'`
    );
    ok(
      await findRegisteredScript(shimRCSId),
      `Found registered script for shim: '${shimRCSId}'`
    );

    async function testToggling(
      buttonEnabled,
      buttonDisabled,
      interventionOrShim,
      rcsId,
      type
    ) {
      // click to disable the intervention/shim
      content.document.querySelector(buttonEnabled).click();
      await ContentTaskUtils.waitForCondition(
        () => content.document.querySelector(buttonDisabled),
        `toggle button for ${type} now says 'enable'`
      );

      await ContentTaskUtils.waitForCondition(
        () => !interventionOrShim.active && !interventionOrShim.enabled,
        `${type} is inactive`
      );

      // verify that its content scripts have been de-registered
      ok(
        !(await findRegisteredScript(rcsId)),
        `Found no registered script for ${type}: '${rcsId}'`
      );

      // click to re-enable the intervention/shim
      content.document.querySelector(buttonDisabled).click();
      await ContentTaskUtils.waitForCondition(
        () => content.document.querySelector(buttonEnabled),
        `toggle button for ${type} again says 'disable'`
      );

      await ContentTaskUtils.waitForCondition(
        () => interventionOrShim.active || interventionOrShim.enabled,
        `${type} is active`
      );

      // verify that its content scripts have been re-registered
      ok(
        await findRegisteredScript(rcsId),
        `Found registered script for ${type}: '${rcsId}'`
      );
    }

    // toggle the intervention
    await testToggling(
      `tr[data-id='${interventionWithContentScripts.id}'] button[data-l10n-id=label-disable]`,
      `tr[data-id='${interventionWithContentScripts.id}'] button[data-l10n-id=label-enable]`,
      interventionWithContentScripts,
      interventionRCSId,
      "intervention"
    );

    // toggle the shim
    await testToggling(
      `tr[data-id='${shimWithContentScripts.id}'] button[data-l10n-id=label-disable]`,
      `tr[data-id='${shimWithContentScripts.id}'] button[data-l10n-id=label-enable]`,
      shimWithContentScripts,
      shimRCSId,
      "shim"
    );
  });

  // now try toggling the global pref again, to confirm things still work.
  Services.prefs.setBoolPref(EnableAllPref, false);

  await SpecialPowers.spawn(tab.linkedBrowser, [], async function () {
    await content.verifyAllInterventionsOff();
  });

  Services.prefs.setBoolPref(EnableAllPref, true);

  await SpecialPowers.spawn(tab.linkedBrowser, [], async function () {
    await content.verifyAllInterventionsOn();
  });

  await BrowserTestUtils.removeTab(tab);
});
