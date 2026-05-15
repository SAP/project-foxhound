/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

const { IPProtectionPanel } = ChromeUtils.importESModule(
  "moz-src:///browser/components/ipprotection/IPProtectionPanel.sys.mjs"
);

const { IPProtection, IPProtectionWidget } = ChromeUtils.importESModule(
  "moz-src:///browser/components/ipprotection/IPProtection.sys.mjs"
);

const { IPProtectionService, IPProtectionStates } = ChromeUtils.importESModule(
  "moz-src:///browser/components/ipprotection/IPProtectionService.sys.mjs"
);

const { IPPProxyManager, IPPProxyStates } = ChromeUtils.importESModule(
  "moz-src:///browser/components/ipprotection/IPPProxyManager.sys.mjs"
);

const { IPProtectionAlertManager } = ChromeUtils.importESModule(
  "moz-src:///browser/components/ipprotection/IPProtectionAlertManager.sys.mjs"
);

const { IPPSignInWatcher } = ChromeUtils.importESModule(
  "moz-src:///browser/components/ipprotection/IPPSignInWatcher.sys.mjs"
);

const { IPPEnrollAndEntitleManager } = ChromeUtils.importESModule(
  "moz-src:///browser/components/ipprotection/IPPEnrollAndEntitleManager.sys.mjs"
);

const { HttpServer, HTTP_403 } = ChromeUtils.importESModule(
  "resource://testing-common/httpd.sys.mjs"
);

const { NimbusTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/NimbusTestUtils.sys.mjs"
);

const { Server } = ChromeUtils.importESModule(
  "moz-src:///browser/components/ipprotection/IPProtectionServerlist.sys.mjs"
);

ChromeUtils.defineESModuleGetters(this, {
  sinon: "resource://testing-common/Sinon.sys.mjs",
  ExperimentAPI: "resource://nimbus/ExperimentAPI.sys.mjs",
  CustomizableUI:
    "moz-src:///browser/components/customizableui/CustomizableUI.sys.mjs",
});

const { ProxyPass, ProxyUsage, Entitlement } = ChromeUtils.importESModule(
  "moz-src:///browser/components/ipprotection/GuardianClient.sys.mjs"
);
const { RemoteSettings } = ChromeUtils.importESModule(
  "resource://services-settings/remote-settings.sys.mjs"
);

const { SpecialMessageActions } = ChromeUtils.importESModule(
  "resource://messaging-system/lib/SpecialMessageActions.sys.mjs"
);

// Adapted from devtools/client/performance-new/test/browser/helpers.js
function waitForPanelEvent(document, eventName) {
  return BrowserTestUtils.waitForEvent(document, eventName, false, event => {
    if (event.target.getAttribute("viewId") === "PanelUI-ipprotection") {
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
    panel.setState(state);
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
/* exported SETUP_EXPERIMENT */

let DEFAULT_SERVICE_STATUS = {
  isSignedIn: false,
  isEnrolledAndEntitled: undefined,
  canEnroll: true,
  isLinkedToGuardian: false,
  entitlement: {
    status: 200,
    error: undefined,
    entitlement: createTestEntitlement(),
  },
  proxyPass: {
    status: 200,
    error: undefined,
    pass: makePass(),
    usage: makeUsage(),
  },
  usageInfo: makeUsage(),
  signInFlow: true,
};
/* exported DEFAULT_SERVICE_STATUS */

let STUBS = {
  isEnrolledAndEntitled: undefined,
  hasUpgraded: undefined,
  enroll: undefined,
  fetchUserInfo: undefined,
  fetchProxyPass: undefined,
  fetchProxyUsage: undefined,
  isLinkedToGuardian: undefined,
  fxaSignInFlow: undefined,
};
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

  await putServerInRemoteSettings(DEFAULT_SERVICE_STATUS.serverList);

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
    Services.prefs.clearUserPref("browser.ipProtection.egressLocationEnabled");
    Services.prefs.clearUserPref("browser.ipProtection.bandwidthThreshold");
    Services.prefs.clearUserPref("browser.ipProtection.userEnabled");
  });
});

function setupStubs(stubs = STUBS) {
  stubs.isSignedIn = setupSandbox.stub(IPPSignInWatcher, "isSignedIn");
  stubs.isEnrolledAndEntitled = setupSandbox.stub(
    IPPEnrollAndEntitleManager,
    "isEnrolledAndEntitled"
  );
  stubs.hasUpgraded = setupSandbox.stub(
    IPPEnrollAndEntitleManager,
    "hasUpgraded"
  );

  const guardianStub = {
    enroll: setupSandbox.stub(),
    fetchUserInfo: setupSandbox.stub(),
    fetchProxyPass: setupSandbox.stub(),
    fetchProxyUsage: setupSandbox.stub(),
    isLinkedToGuardian: setupSandbox.stub(),
  };
  stubs.enroll = guardianStub.enroll;
  stubs.fetchUserInfo = guardianStub.fetchUserInfo;
  stubs.fetchProxyPass = guardianStub.fetchProxyPass;
  stubs.fetchProxyUsage = guardianStub.fetchProxyUsage;
  stubs.isLinkedToGuardian = guardianStub.isLinkedToGuardian;
  stubs.fxaSignInFlow = setupSandbox.stub(
    SpecialMessageActions,
    "fxaSignInFlow"
  );

  setupSandbox.stub(IPProtectionService, "guardian").get(() => guardianStub);
}
/* exported setupStubs */

function setupService(
  {
    isSignedIn,
    isEnrolledAndEntitled,
    hasUpgraded,
    canEnroll,
    entitlement,
    proxyPass,
    usageInfo,
    isLinkedToGuardian,
    signInFlow,
  } = DEFAULT_SERVICE_STATUS,
  stubs = STUBS
) {
  if (typeof isSignedIn != "undefined") {
    stubs.isSignedIn.get(() => isSignedIn);
  }

  if (typeof isEnrolledAndEntitled != "undefined") {
    stubs.isEnrolledAndEntitled.get(() => isEnrolledAndEntitled);
  }

  if (typeof hasUpgraded != "undefined") {
    stubs.hasUpgraded.get(() => hasUpgraded);
  }

  if (typeof canEnroll != "undefined") {
    stubs.enroll.resolves({
      ok: canEnroll,
    });
  }

  if (typeof entitlement != "undefined") {
    stubs.fetchUserInfo.resolves(entitlement);
  } else {
    stubs.fetchUserInfo.resolves(DEFAULT_SERVICE_STATUS.entitlement);
  }

  if (typeof proxyPass != "undefined") {
    stubs.fetchProxyPass.resolves(proxyPass);
  }

  if (typeof usageInfo != "undefined") {
    stubs.fetchProxyUsage.resolves(usageInfo);
  }

  if (typeof isLinkedToGuardian != "undefined") {
    stubs.isLinkedToGuardian.resolves(isLinkedToGuardian);
  }

  if (typeof signInFlow != "undefined") {
    stubs.fxaSignInFlow.resolves(signInFlow);
  }
}
/* exported setupService */

async function cleanupService() {
  setupService(DEFAULT_SERVICE_STATUS);
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
    autostart: false,
    created_at: "2023-01-01T12:00:00.000Z",
    limited_bandwidth: false,
    location_controls: false,
    subscribed: false,
    uid: 42,
    website_inclusion: false,
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
