/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const { IPPExceptionsManager } = ChromeUtils.importESModule(
  "moz-src:///browser/components/ipprotection/IPPExceptionsManager.sys.mjs"
);

/**
 * Tests that confirmation hints aren't shown if required prefs are disabled.
 */
add_task(async function test_confirmation_hint_prefs_disabled() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.ipProtection.siteExceptionsHintsEnabled", false]],
  });

  const sandbox = sinon.createSandbox();
  const PROTECTED_SITE = "https://example.com";
  const EXCLUDED_SITE = "https://example.org";

  sandbox.stub(IPPProxyManager, "state").value(IPPProxyStates.ACTIVE);
  sandbox.stub(IPPExceptionsManager, "hasExclusion").returns(true);

  let protectedTab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    PROTECTED_SITE
  );

  let showConfirmationHintSpy = sandbox.spy(window.ConfirmationHint, "show");

  let excludedTab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    EXCLUDED_SITE
  );

  Assert.ok(
    !showConfirmationHintSpy.called,
    "ConfirmationHint.show() should not be called when prefs are disabled"
  );

  BrowserTestUtils.removeTab(protectedTab);
  BrowserTestUtils.removeTab(excludedTab);
  sandbox.restore();
  await SpecialPowers.popPrefEnv();
});

/**
 * Tests that we don't show confirmation hints on page reloads.
 */
add_task(async function test_confirmation_hint_exclusions_page_reloads() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.ipProtection.siteExceptionsHintsEnabled", true]],
  });

  const sandbox = sinon.createSandbox();
  const EXCLUDED_SITE = "https://example.org";

  sandbox.stub(IPPProxyManager, "state").value(IPPProxyStates.ACTIVE);
  sandbox.stub(IPPExceptionsManager, "hasExclusion").returns(true);

  let tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    EXCLUDED_SITE
  );

  let showConfirmationHintSpy = sandbox.spy(window.ConfirmationHint, "show");

  await BrowserTestUtils.reloadTab(tab);

  Assert.ok(
    !showConfirmationHintSpy.called,
    "ConfirmationHint.show() should not be called on reload"
  );

  BrowserTestUtils.removeTab(tab);
  sandbox.restore();
  await SpecialPowers.popPrefEnv();
});

/**
 * Tests confirmation hint visibility between protected and excluded sites
 * after opening new, different tabs.
 *
 * Test cases:
 * 1. initial protected: do not show
 * 2. protected --> excluded: show (+1)
 * 3. excluded --> excluded: do not show
 * 4. excluded --> protected: do not show
 * 5. protected --> protected: do not show
 * 6. protected --> excluded: show (+2)
 */
add_task(async function test_confirmation_hint_visbility_different_tab() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.ipProtection.siteExceptionsHintsEnabled", true]],
  });

  const sandbox = sinon.createSandbox();

  const PROTECTED_SITE = "https://example.com";
  const EXCLUDED_SITE = "https://example.org";

  sandbox.stub(IPPProxyManager, "state").value(IPPProxyStates.ACTIVE);
  sandbox.stub(IPPExceptionsManager, "hasExclusion").callsFake(principal => {
    return principal?.origin === EXCLUDED_SITE;
  });

  let showConfirmationHintSpy = sandbox.spy(window.ConfirmationHint, "show");

  let protectedTab1 = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    PROTECTED_SITE
  );
  Assert.equal(
    showConfirmationHintSpy.callCount,
    0,
    "ConfirmationHint.show() should have callCount == 0 after initial protected tab"
  );

  let excludedTab1 = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    EXCLUDED_SITE
  );
  Assert.equal(
    showConfirmationHintSpy.callCount,
    1,
    "ConfirmationHint.show() should have callCount == 1 after protected --> excluded new tab navigation"
  );

  let excludedTab2 = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    EXCLUDED_SITE
  );
  Assert.equal(
    showConfirmationHintSpy.callCount,
    1,
    "ConfirmationHint.show() should still have callCount == 1 after excluded --> excluded new tab navigation"
  );

  let protectedTab2 = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    PROTECTED_SITE
  );
  Assert.equal(
    showConfirmationHintSpy.callCount,
    1,
    "ConfirmationHint.show() should still have callCount == 1 after excluded --> protected new tab navigation"
  );

  let protectedTab3 = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    PROTECTED_SITE
  );
  Assert.equal(
    showConfirmationHintSpy.callCount,
    1,
    "ConfirmationHint.show() should still have callCount == 1 after protected --> protected new tab navigation"
  );

  let excludedTab3 = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    EXCLUDED_SITE
  );
  Assert.equal(
    showConfirmationHintSpy.callCount,
    2,
    "ConfirmationHint.show() should still have callCount == 2 after protected --> excluded new tab navigation"
  );

  [
    excludedTab1,
    excludedTab2,
    excludedTab3,
    protectedTab1,
    protectedTab2,
    protectedTab3,
  ].forEach(tab => BrowserTestUtils.removeTab(tab));

  sandbox.restore();
  await SpecialPowers.popPrefEnv();
});

/**
 * Tests confirmation hint visibility between protected and excluded sites
 * within a single tab.
 *
 * Test cases:
 * 1. initial protected: do not show
 * 2. protected --> excluded: show (+1)
 * 3. excluded --> excluded: do not show
 * 4. excluded --> protected: do not show
 * 5. protected --> protected: do not show
 * 6. protected --> excluded: show (+2)
 */
add_task(async function test_confirmation_hint_visbility_same_tab() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.ipProtection.siteExceptionsHintsEnabled", true]],
  });

  const sandbox = sinon.createSandbox();

  const PROTECTED_SITE = "https://example.com";
  const EXCLUDED_SITE = "https://example.org";

  sandbox.stub(IPPProxyManager, "state").value(IPPProxyStates.ACTIVE);
  sandbox.stub(IPPExceptionsManager, "hasExclusion").callsFake(principal => {
    return principal?.origin === EXCLUDED_SITE;
  });

  let showConfirmationHintSpy = sandbox.spy(window.ConfirmationHint, "show");

  let tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    PROTECTED_SITE
  );
  Assert.equal(
    showConfirmationHintSpy.callCount,
    0,
    "ConfirmationHint.show() should have callCount == 0 after initial protected site"
  );

  BrowserTestUtils.startLoadingURIString(tab.linkedBrowser, EXCLUDED_SITE);
  await BrowserTestUtils.browserLoaded(tab.linkedBrowser);
  Assert.equal(
    showConfirmationHintSpy.callCount,
    1,
    "ConfirmationHint.show() should have callCount == 1 after protected --> excluded same tab navigation"
  );

  BrowserTestUtils.startLoadingURIString(tab.linkedBrowser, EXCLUDED_SITE);
  await BrowserTestUtils.browserLoaded(tab.linkedBrowser);
  Assert.equal(
    showConfirmationHintSpy.callCount,
    1,
    "ConfirmationHint.show() should still have callCount == 1 after excluded --> excluded same tab navigation"
  );

  BrowserTestUtils.startLoadingURIString(tab.linkedBrowser, PROTECTED_SITE);
  await BrowserTestUtils.browserLoaded(tab.linkedBrowser);
  Assert.equal(
    showConfirmationHintSpy.callCount,
    1,
    "ConfirmationHint.show() should still have callCount == 1 after excluded --> protected same tab navigation"
  );

  BrowserTestUtils.startLoadingURIString(tab.linkedBrowser, PROTECTED_SITE);
  await BrowserTestUtils.browserLoaded(tab.linkedBrowser);
  Assert.equal(
    showConfirmationHintSpy.callCount,
    1,
    "ConfirmationHint.show() should still have callCount == 1 after protected --> protected same tab navigation"
  );

  BrowserTestUtils.startLoadingURIString(tab.linkedBrowser, EXCLUDED_SITE);
  await BrowserTestUtils.browserLoaded(tab.linkedBrowser);
  Assert.equal(
    showConfirmationHintSpy.callCount,
    2,
    "ConfirmationHint.show() should have callCount == 2 after protected --> excluded same tab navigation"
  );

  BrowserTestUtils.removeTab(tab);

  sandbox.restore();
  await SpecialPowers.popPrefEnv();
});

/**
 * Tests confirmation hint visibility between protected and excluded sites
 * after switching tabs.
 *
 * Test cases:
 * 1. protected tab 2 (active tab) --> protected tab 1: do not show
 * 2. protected tab 1 --> excluded tab 1: show (+1)
 * 3. excluded tab 1 --> excluded tab 2: do not show
 * 4. excluded tab 2 --> protected tab 1: do not show
 * 5. protected tab 2 --> excluded tab 1: show (+2)
 */
add_task(async function test_confirmation_hint_visbility_tab_switch() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.ipProtection.siteExceptionsHintsEnabled", true]],
  });

  const sandbox = sinon.createSandbox();

  const PROTECTED_SITE = "https://example.com";
  const EXCLUDED_SITE = "https://example.org";

  sandbox.stub(IPPProxyManager, "state").value(IPPProxyStates.ACTIVE);
  sandbox.stub(IPPExceptionsManager, "hasExclusion").callsFake(principal => {
    return principal?.origin === EXCLUDED_SITE;
  });

  let showConfirmationHintSpy = sandbox.spy(window.ConfirmationHint, "show");

  // Load all tabs first
  let protectedTab1 = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    PROTECTED_SITE
  );
  let excludedTab1 = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    EXCLUDED_SITE
  );
  let excludedTab2 = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    EXCLUDED_SITE
  );
  let protectedTab2 = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    PROTECTED_SITE
  );

  // Reset spy history before we tab switch
  showConfirmationHintSpy.resetHistory();

  Assert.equal(
    gBrowser.selectedTab,
    protectedTab2,
    "Active tab should be protected tab 2"
  );

  await BrowserTestUtils.switchTab(gBrowser, protectedTab1);
  Assert.equal(
    showConfirmationHintSpy.callCount,
    0,
    "ConfirmationHint.show() should have callCount == 0 after protected tab 2 --> protected tab 1 switch"
  );

  await BrowserTestUtils.switchTab(gBrowser, excludedTab1);
  Assert.equal(
    showConfirmationHintSpy.callCount,
    1,
    "ConfirmationHint.show() should have callCount == 1 after protected tab 1 --> excluded tab 1 switch"
  );

  await BrowserTestUtils.switchTab(gBrowser, excludedTab2);
  Assert.equal(
    showConfirmationHintSpy.callCount,
    1,
    "ConfirmationHint.show() should still have callCount == 1 after excluded tab 1 --> excluded tab 2 switch"
  );

  await BrowserTestUtils.switchTab(gBrowser, protectedTab1);
  Assert.equal(
    showConfirmationHintSpy.callCount,
    1,
    "ConfirmationHint.show() should still have callCount == 1 after excluded tab 1 --> protected tab 1 switch"
  );

  await BrowserTestUtils.switchTab(gBrowser, excludedTab1);
  Assert.equal(
    showConfirmationHintSpy.callCount,
    2,
    "ConfirmationHint.show() should have callCount == 1 after protected tab 1 --> excluded tab 1 switch"
  );

  [excludedTab1, protectedTab1, excludedTab2, protectedTab2].forEach(tab =>
    BrowserTestUtils.removeTab(tab)
  );

  sandbox.restore();
  await SpecialPowers.popPrefEnv();
});

/**
 * Tests that we don't show confirmation hints when we press the exclusion toggle.
 */
add_task(async function test_confirmation_hint_exclusions_toggle() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.ipProtection.siteExceptionsHintsEnabled", true]],
  });

  const sandbox = sinon.createSandbox();
  Services.perms.removeByType("ipp-vpn");

  setupService({
    isSignedIn: true,
    isEnrolledAndEntitled: true,
  });
  await IPPEnrollAndEntitleManager.refetchEntitlement();

  sandbox.stub(IPPProxyManager, "state").value(IPPProxyStates.ACTIVE);

  let tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "https://example.com"
  );

  let content = await openPanel({
    isSignedOut: false,
    isProtectionEnabled: true,
    siteData: { isExclusion: false },
  });

  let showConfirmationHintSpy = sandbox.spy(window.ConfirmationHint, "show");

  let disableVPNEventPromise = BrowserTestUtils.waitForEvent(
    window,
    "IPProtection:UserDisableVPNForSite"
  );
  content.siteExclusionToggleEl.click();

  await disableVPNEventPromise;
  Assert.ok(
    true,
    "IPProtection:UserDisableVPNForSite dispatched after pressing toggle"
  );

  Assert.ok(
    !showConfirmationHintSpy.called,
    "ConfirmationHint.show() should not be called when the exclusion toggle is pressed"
  );

  await closePanel();
  BrowserTestUtils.removeTab(tab);

  Services.perms.removeByType("ipp-vpn");
  cleanupService();
  sandbox.restore();
  await SpecialPowers.popPrefEnv();
});
