/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

const { IPProtectionPanel } = ChromeUtils.importESModule(
  "moz-src:///browser/components/ipprotection/IPProtectionPanel.sys.mjs"
);

const { IPProtection, IPProtectionWidget } = ChromeUtils.importESModule(
  "moz-src:///browser/components/ipprotection/IPProtection.sys.mjs"
);

const { IPProtectionService, IPProtectionStates } = ChromeUtils.importESModule(
  "moz-src:///toolkit/components/ipprotection/IPProtectionService.sys.mjs"
);

const { IPPProxyManager, IPPProxyStates } = ChromeUtils.importESModule(
  "moz-src:///toolkit/components/ipprotection/IPPProxyManager.sys.mjs"
);

const { IPProtectionAlertManager } = ChromeUtils.importESModule(
  "moz-src:///browser/components/ipprotection/IPProtectionAlertManager.sys.mjs"
);

const { IPProtectionActivator } = ChromeUtils.importESModule(
  "moz-src:///toolkit/components/ipprotection/IPProtectionActivator.sys.mjs"
);

const { IPPDummyAuthProvider } = ChromeUtils.importESModule(
  "resource://testing-common/ipprotection/IPPDummyAuthProvider.sys.mjs"
);
IPProtectionActivator.addHelpers(IPPDummyAuthProvider.helpers);
IPProtectionActivator.setupHelpers();
IPProtectionActivator.setAuthProvider(IPPDummyAuthProvider);

const { HttpServer, HTTP_403 } = ChromeUtils.importESModule(
  "resource://testing-common/httpd.sys.mjs"
);

const { NimbusTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/NimbusTestUtils.sys.mjs"
);

const { Server } = ChromeUtils.importESModule(
  "moz-src:///toolkit/components/ipprotection/IPProtectionServerlist.sys.mjs"
);

ChromeUtils.defineESModuleGetters(this, {
  sinon: "resource://testing-common/Sinon.sys.mjs",
  ExperimentAPI: "resource://nimbus/ExperimentAPI.sys.mjs",
  CustomizableUI:
    "moz-src:///browser/components/customizableui/CustomizableUI.sys.mjs",
});

const { ProxyPass, ProxyUsage, Entitlement } = ChromeUtils.importESModule(
  "moz-src:///toolkit/components/ipprotection/GuardianTypes.sys.mjs"
);
const { RemoteSettings } = ChromeUtils.importESModule(
  "resource://services-settings/remote-settings.sys.mjs"
);

const { SpecialMessageActions } = ChromeUtils.importESModule(
  "resource://messaging-system/lib/SpecialMessageActions.sys.mjs"
);

// Adapted from devtools/client/performance-new/test/browser/helpers.js
function waitForPanelEvent(
  document,
  eventName,
  viewId = "PanelUI-ipprotection"
) {
  return BrowserTestUtils.waitForEvent(document, eventName, false, event => {
    if (event.target.getAttribute("viewId") === viewId) {
      return true;
    }
    return false;
  });
}
/* exported waitForPanelEvent */

async function waitForWidgetAdded() {
  let widget = CustomizableUI.getWidget(IPProtectionWidget.WIDGET_ID);
  if (widget) {
    return;
  }
  await new Promise(resolve => {
    let listener = {
      onWidgetAdded: widgetId => {
        if (widgetId == IPProtectionWidget.WIDGET_ID) {
          CustomizableUI.removeListener(listener);
          resolve();
        }
      },
    };
    CustomizableUI.addListener(listener);
  });
}
/* exported waitForWidgetAdded */

const defaultState = new IPProtectionPanel().state;

/**
 * Opens the IP Protection panel with a given state, waits for the content to be ready
 * and returns the content element.
 *
 * @param {object} state - The state to set for the panel.
 * @param {Window} win - The window the panel should be opened in.
 * @returns {Promise<IPProtectionContentElement>} - The <ipprotection-content> element of the panel.
 */
async function openPanel(state, win = window) {
  let panel = IPProtection.getPanel(win);
  if (state) {
    panel.setState({
      isEnrolling: false,
      unauthenticated: false,
      ...state,
    });
  }

  let panelShownPromise = waitForPanelEvent(win.document, "popupshown");
  let panelInitPromise = BrowserTestUtils.waitForEvent(
    win.document,
    "IPProtection:Init"
  );
  await panel.open(win);
  await Promise.all([panelShownPromise, panelInitPromise]);

  let panelView = PanelMultiView.getViewNode(
    win.document,
    IPProtectionWidget.PANEL_ID
  );
  let content = panelView.querySelector(IPProtectionPanel.CONTENT_TAGNAME);

  await content.updateComplete;

  return content;
}
/* exported openPanel */

/**
 * Sets the state of the IP Protection panel and waits for the content to be updated.
 *
 * @param {object} state - The state to set for the panel.
 * @param {Window} win - The window the panel is in.
 * @returns {Promise<void>}
 */
async function setPanelState(state = defaultState, win = window) {
  let panel = IPProtection.getPanel(win);
  panel.setState(state);

  let panelView = PanelMultiView.getViewNode(
    win.document,
    IPProtectionWidget.PANEL_ID
  );
  let content = panelView.querySelector(IPProtectionPanel.CONTENT_TAGNAME);
  if (content) {
    await content.updateComplete;
  }
}

/* exported setPanelState */

/**
 * Closes the IP Protection panel and resets the state to the default.
 *
 * @param {Window} win - The window the panel is in.
 * @param {boolean} resetState - Whether to reset the panel state to default before closing.
 * @returns {Promise<void>}
 */
async function closePanel(win = window, resetState = true) {
  // Reset the state
  let panel = IPProtection.getPanel(win);

  if (resetState) {
    panel.setState(defaultState);
  }
  // Close the panel
  let panelHiddenPromise = waitForPanelEvent(win.document, "popuphidden");
  panel.close();
  await panelHiddenPromise;
}
/* exported closePanel */

/**
 * Creates a fake proxy server for testing.
 * Verifies that the server receives a CONNECT request with the expected headers.
 * Does not proxy anything really.
 * Given it refuses the proxy connection, it will be removed from as proxy-info of the channel.
 *
 * Use with `await using` for automatic cleanup:
 *   await using proxyInfo = withProxyServer();
 *
 * @param {Function} [handler] - A custom path handler for "/" and "CONNECT" requests.
 */
function withProxyServer(handler) {
  const server = new HttpServer();
  let { promise, resolve } = Promise.withResolvers();

  server.registerPathHandler("/", (request, response) => {
    console.log("Received request:", request.method, request.path);
    if (handler) {
      handler(request, response);
      resolve();
      return;
    }
    if (request.host !== "example.com") {
      throw HTTP_403;
    }

    response.setStatusLine(request.httpVersion, 200, "OK");
    response.setHeader("Content-Type", "text/plain");
    response.write("hello world");
    resolve();
  });

  server.registerPathHandler("CONNECT", (request, response) => {
    console.log("Received request:", request.method, request.path);
    if (handler) {
      handler(request, response);
      resolve();
      return;
    }
    let hostHeader = request.getHeader("host");
    Assert.equal(
      hostHeader,
      "example.com:443",
      'Host header should be "example.com:443"'
    );
    Assert.equal(request.method, "CONNECT", "Request method should be CONNECT");

    resolve();
    // Close the connection after verification
    throw HTTP_403;
  });
  // If the Test is Trying to Proxy an http request
  // our server will get a GET request with that host.
  server.identity.add("http", "example.com", "80");
  server.identity.add("http", "example.com", "443");

  server.start(-1);
  return {
    server: new Server({
      hostname: "localhost",
      port: server.identity.primaryPort,
      quarantined: false,
      protocols: [
        {
          name: "connect",
          host: "localhost",
          scheme: "http",
          port: server.identity.primaryPort,
        },
      ],
    }),
    type: "http",
    gotConnection: promise,
    async [Symbol.asyncDispose]() {
      await new Promise(r => server.stop(r));
    },
  };
}
/* exported withProxyServer */

let DEFAULT_EXPERIMENT = {
  enabled: true,
  variant: "alpha",
  isRollout: false,
};
/* exported DEFAULT_EXPERIMENT */

let DEFAULT_SERVICE_STATUS = {
  isReady: false,
  canEnroll: true,
  entitlement: createTestEntitlement(),
  proxyPass: {
    status: 200,
    error: undefined,
    pass: makePass(),
    usage: makeUsage(),
  },
  usageInfo: makeUsage(),
};
/* exported DEFAULT_SERVICE_STATUS */

let STUBS = {};
/* exported STUBS */

async function waitForServiceInitialized() {
  if (IPProtectionService.state !== IPProtectionStates.UNINITIALIZED) {
    return;
  }
  await BrowserTestUtils.waitForEvent(
    IPProtectionService,
    "IPProtectionService:StateChanged",
    false,
    () => IPProtectionService.state !== IPProtectionStates.UNINITIALIZED
  );
}
/* exported waitForServiceInitialized */

async function waitForServiceState(state) {
  if (IPProtectionService.state === state) {
    return;
  }

  await BrowserTestUtils.waitForEvent(
    IPProtectionService,
    "IPProtectionService:StateChanged",
    false,
    () => IPProtectionService.state === state
  );
}
/* exported waitForServiceState */

async function waitForProxyState(state) {
  if (IPPProxyManager.state === state) {
    return;
  }

  await BrowserTestUtils.waitForEvent(
    IPPProxyManager,
    "IPPProxyManager:StateChanged",
    false,
    () => IPPProxyManager.state === state
  );
}
/* exported waitForProxyState */

let setupSandbox = sinon.createSandbox();
add_setup(async function setupVPN() {
  setupStubs();

  setupService();

  await putServerInRemoteSettings();

  await SpecialPowers.pushPrefEnv({
    set: [["browser.ipProtection.enabled", true]],
  });

  await waitForServiceInitialized();

  registerCleanupFunction(async () => {
    cleanupService();

    Services.prefs.clearUserPref("browser.ipProtection.enabled");

    await waitForServiceState(IPProtectionStates.UNINITIALIZED);

    setupSandbox.restore();
    CustomizableUI.reset();
    Services.prefs.clearUserPref(IPProtectionWidget.ADDED_PREF);
    Services.prefs.clearUserPref("browser.ipProtection.everOpenedPanel");
    Services.prefs.clearUserPref("browser.ipProtection.userEnableCount");
    Services.prefs.clearUserPref("browser.ipProtection.stateCache");
    Services.prefs.clearUserPref("browser.ipProtection.entitlementCache");
    Services.prefs.clearUserPref("browser.ipProtection.locationListCache");
    Services.prefs.clearUserPref("browser.ipProtection.usageCache");
    Services.prefs.clearUserPref("browser.ipProtection.onboardingMessageMask");
    Services.prefs.clearUserPref("browser.ipProtection.bandwidthThreshold");
    Services.prefs.clearUserPref(
      "browser.ipProtection.bandwidthWarningDismissedThreshold"
    );
    Services.prefs.clearUserPref("browser.ipProtection.userEnabled");
    Services.prefs.clearUserPref(
      "browser.ipProtection.openedPanelWithLocation"
    );
    Services.prefs.clearUserPref(
      "browser.ipProtection.locationButtonBadgeDismissed"
    );
  });
});

// Default fxaSignInFlow behavior + default getEntitlement response. Used
// by setupStubs at suite startup and re-applied by cleanupService between
// tasks.
function resetDummyDefaults() {
  IPPDummyAuthProvider.setGetEntitlementResponse({
    entitlement: DEFAULT_SERVICE_STATUS.entitlement,
  });
  // In production, a successful FxA flow signs the user in and the auth
  // provider's sign-in watcher picks it up. The dummy has no watcher, so
  // reflect the outcome here.
  STUBS.fxaSignInFlow.callsFake(async () => {
    IPPDummyAuthProvider.simulateSignIn(true);
    return true;
  });
}

function setupStubs() {
  STUBS.fxaSignInFlow = setupSandbox.stub(
    SpecialMessageActions,
    "fxaSignInFlow"
  );
  resetDummyDefaults();

  // Start signed-out so initOnStartupCompleted() is a no-op until a test
  // opts in via setupService({ isReady: true }) (or simulateSignIn directly).
  IPPDummyAuthProvider.simulateSignIn(false);
}
/* exported setupStubs */

function setupService({
  isReady,
  hasUpgraded,
  canEnroll,
  proxyPass,
  usageInfo,
} = DEFAULT_SERVICE_STATUS) {
  // Seed the provider's responses before triggering sign-in, so that the
  // transition into READY (which schedules a usage refresh) reads the seeded
  // usage instead of a stale default.
  if (typeof canEnroll != "undefined") {
    IPPDummyAuthProvider.setEnrollResponse({
      isEnrolledAndEntitled: canEnroll,
      entitlement: canEnroll ? DEFAULT_SERVICE_STATUS.entitlement : undefined,
    });
  }

  if (typeof proxyPass != "undefined") {
    IPPDummyAuthProvider.setProxyPass(proxyPass);
  }

  if (typeof usageInfo != "undefined") {
    IPPDummyAuthProvider.setProxyUsage(usageInfo);
  }

  if (typeof isReady != "undefined") {
    if (isReady) {
      IPPDummyAuthProvider.simulateSignIn(true);
      IPPDummyAuthProvider.setEntitlement(
        createTestEntitlement({ subscribed: !!hasUpgraded })
      );
    } else {
      IPPDummyAuthProvider.simulateSignIn(false);
    }
  }
}
/* exported setupService */

async function cleanupService() {
  setupService();
  // Reset the dummy's response overrides that aren't part of the params
  // accepted by setupService, so they don't leak into the next task.
  IPPDummyAuthProvider.setProxyPassError(null);
  resetDummyDefaults();
}
/* exported cleanupService */

NimbusTestUtils.init(this);
let cleanupExistingExperiment;
async function setupExperiment({
  enabled,
  variant,
  isRollout,
} = DEFAULT_EXPERIMENT) {
  await ExperimentAPI.ready();
  cleanupExistingExperiment = await NimbusTestUtils.enrollWithFeatureConfig(
    {
      featureId: "ipProtection",
      value: {
        enabled,
        variant,
      },
    },
    {
      slug: "vpn-test",
      branchSlug: variant,
      isRollout,
    }
  );
  return cleanupExistingExperiment;
}
/* exported setupExperiment */

async function cleanupExperiment() {
  if (cleanupExistingExperiment) {
    await cleanupExistingExperiment();
  }
}
/* exported cleanupExperiment */

/**
 * Creates a test Entitlement with default values.
 *
 * @param {object} overrides - Optional fields to override
 * @returns {Entitlement}
 */
function createTestEntitlement(overrides = {}) {
  return new Entitlement({
    subscribed: false,
    uid: 42,
    maxBytes: "0",
    ...overrides,
  });
}
/* exported createTestEntitlement */

function makePass(
  from = Temporal.Now.instant(),
  until = from.add({ hours: 24 })
) {
  const header = {
    alg: "HS256",
    typ: "JWT",
  };
  const body = {
    iat: Math.floor(from.add({ seconds: 1 }).epochMilliseconds / 1000),
    nbf: Math.floor(from.epochMilliseconds / 1000),
    exp: Math.floor(until.epochMilliseconds / 1000),
    sub: "proxy-pass-user-42",
    aud: "guardian-proxy",
    iss: "vpn.mozilla.org",
  };
  const encode = obj => btoa(JSON.stringify(obj));
  const token = [encode(header), encode(body), "signature"].join(".");
  return new ProxyPass(token);
}
/* exported makePass */

function makeUsage(
  max = "5368709120",
  remaining = "4294967296",
  reset = Temporal.Now.instant().add({ hours: 24 }).toString()
) {
  return new ProxyUsage(max, remaining, reset);
}
/* exported makeUsage */

async function putServerInRemoteSettings(
  server = {
    hostname: "test1.example.com",
    port: 443,
    quarantined: false,
  }
) {
  const TEST_US_CITY = {
    name: "Test City",
    code: "TC",
    servers: [server],
  };
  const US = {
    name: "United States",
    code: "US",
    cities: [TEST_US_CITY],
  };
  const client = RemoteSettings("vpn-serverlist");
  if (client && client.db) {
    await client.db.clear();
    await client.db.create(US);
    await client.db.importChanges({}, Date.now());
  }
}
/* exported putServerInRemoteSettings */

function checkBandwidth(bandwidthEl, bandwidthUsage) {
  Assert.ok(
    BrowserTestUtils.isVisible(bandwidthEl),
    "bandwidth-usage should be present and visible"
  );

  Assert.equal(
    bandwidthEl.bandwidthPercent,
    bandwidthUsage.percent,
    `Bandwidth should have ${bandwidthUsage.percent} % used`
  );

  Assert.equal(
    bandwidthEl.remainingMB,
    bandwidthUsage.remainingMB,
    `Bandwidth should have ${bandwidthUsage.remainingMB} MB remaining`
  );

  Assert.equal(
    bandwidthEl.remainingGB,
    bandwidthUsage.remainingGB,
    `Bandwidth should have ${bandwidthUsage.remainingGB} GB remaining`
  );

  Assert.equal(
    bandwidthEl.max,
    bandwidthUsage.max,
    `Bandwidth should have max of ${bandwidthUsage.max} bytes`
  );

  Assert.equal(
    bandwidthEl.maxGB,
    bandwidthUsage.maxGB,
    `Bandwidth should have ${bandwidthUsage.maxGB} GB remaining`
  );

  Assert.equal(
    bandwidthEl.bandwidthUsed,
    bandwidthUsage.used,
    `Bandwidth should have ${bandwidthUsage.used} bytes used`
  );

  Assert.equal(
    bandwidthEl.bandwidthUsedGB,
    bandwidthUsage.usedGB,
    `Bandwidth should have ${bandwidthUsage.usedGB} GB used`
  );

  Assert.equal(
    bandwidthEl.remainingRounded,
    bandwidthUsage.remainingRounded,
    `Bandwidth should have ${bandwidthUsage.remainingRounded} remaining`
  );

  let descriptionTextArray = bandwidthEl.description.textContent.split(" ");
  Assert.equal(
    descriptionTextArray.filter(word => word === "GB").length,
    bandwidthUsage.gbCount,
    `GB used ${bandwidthUsage.gbCount} times`
  );
  Assert.equal(
    descriptionTextArray.filter(word => word === "MB").length,
    bandwidthUsage.mbCount,
    `MB used ${bandwidthUsage.mbCount} times`
  );
}

async function checkStatusBoxAriaLabel(statusBox) {
  let titleEl = statusBox.titleEl;
  Assert.ok(titleEl, "Status box title should be present");

  await BrowserTestUtils.waitForMutationCondition(
    titleEl,
    { attributes: true, attributeFilter: ["aria-label"] },
    () => titleEl.hasAttribute("aria-label")
  );

  Assert.equal(
    titleEl.getAttribute("aria-label"),
    titleEl.textContent.trim(),
    "Status box title aria-label should match the displayed text"
  );
}
/* exported checkStatusBoxAriaLabel */

// Borrowed from browser_PanelMultiView_keyboard.js
async function expectFocusAfterKey(aKey, aFocus) {
  let res = aKey.match(/^(Shift\+)?(.+)$/);
  let shift = Boolean(res[1]);
  let key;
  if (res[2].length == 1) {
    key = res[2]; // Character.
  } else {
    key = "KEY_" + res[2]; // Tab, ArrowRight, etc.
  }
  info("Waiting for focus on " + aFocus.id);
  // Attempts to capture a nested button element (ie. inside of a moz-button)
  let focused = BrowserTestUtils.waitForEvent(
    aFocus.buttonEl ?? aFocus,
    "focus"
  );
  EventUtils.synthesizeKey(key, { shiftKey: shift });
  await focused;
  ok(
    true,
    `${aFocus.id || "unidentified element"} focused after [${aKey}] pressed`
  );
}
/* exported expectFocusAfterKey */
