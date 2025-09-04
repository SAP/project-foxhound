const lazy = {};

const { HttpServer } = ChromeUtils.importESModule(
  "resource://testing-common/httpd.sys.mjs"
);
const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);
const { autocompleteUXTreatments } = ChromeUtils.importESModule(
  "resource://gre/modules/FirefoxRelay.sys.mjs"
);
const { getFxAccountsSingleton } = ChromeUtils.importESModule(
  "resource://gre/modules/FxAccounts.sys.mjs"
);
ChromeUtils.defineESModuleGetters(lazy, {
  RemoteSettings: "resource://services-settings/remote-settings.sys.mjs",
});

const allowListRemoteSettingsCollection = Services.prefs.getStringPref(
  "signon.firefoxRelay.allowListRemoteSettingsCollection",
  "fxrelay-allowlist"
);
const gFxAccounts = getFxAccountsSingleton();
let gRelayHttpServer;
let gRelayACOptionsTitles;
let sandbox;

const MOCK_MASKS = [
  {
    full_address: "email1@mozilla.com",
    description: "Email 1 Description",
    enabled: true,
  },
  {
    full_address: "email2@mozilla.com",
    description: "Email 2 Description",
    enabled: false,
  },
  {
    full_address: "email3@mozilla.com",
    description: "Email 3 Description",
    enabled: true,
  },
];

const SERVER_SCENARIOS = {
  free_tier_limit: {
    "/relayaddresses/": {
      POST: (request, response) => {
        response.setStatusLine(request.httpVersion, 403);
        response.write(JSON.stringify({ error_code: "free_tier_limit" }));
      },
      GET: (_, response) => {
        response.write(JSON.stringify(MOCK_MASKS));
      },
    },
  },
  unknown_error: {
    "/relayaddresses/": {
      default: (request, response) => {
        response.setStatusLine(request.httpVersion, 408);
      },
    },
  },

  default: {
    default: (request, response) => {
      response.setStatusLine(request.httpVersion, 200);
      response.write(JSON.stringify({ foo: "bar" }));
    },
  },
};

const simpleRouter = scenarioName => (request, response) => {
  const routeHandler =
    SERVER_SCENARIOS[scenarioName][request._path] ?? SERVER_SCENARIOS.default;
  const methodHandler =
    routeHandler?.[request._method] ??
    routeHandler.default ??
    SERVER_SCENARIOS.default.default;
  methodHandler(request, response);
};
const setupServerScenario = (scenarioName = "default") => {
  gRelayHttpServer.registerPrefixHandler("/", simpleRouter(scenarioName));
};

async function setUpMockRelayServer() {
  gRelayHttpServer = new HttpServer();

  gRelayHttpServer.start(-1);

  const API_ENDPOINT = `http://localhost:${gRelayHttpServer.identity.primaryPort}/`;
  await SpecialPowers.pushPrefEnv({
    set: [
      ["signon.firefoxRelay.feature", "available"],
      ["signon.firefoxRelay.base_url", API_ENDPOINT],
    ],
  });
  registerCleanupFunction(async () => {
    await new Promise(resolve => gRelayHttpServer.stop(resolve));
    SpecialPowers.clearUserPref("signon.firefoxRelay.feature");
    SpecialPowers.clearUserPref("signon.firefoxRelay.base_url");
  });
}

async function stubRemoteSettingsAllowList(
  allowList = [{ domain: "example.org" }]
) {
  const allowListRS = await lazy.RemoteSettings("fxrelay-allowlist");
  const rsSandbox = sinon.createSandbox();
  rsSandbox.stub(allowListRS, "get").returns(allowList);
  allowListRS.emit("sync");
  return rsSandbox;
}

add_setup(async function () {
  const allMessageIds = [];
  for (const key in autocompleteUXTreatments) {
    const treatment = autocompleteUXTreatments[key];
    allMessageIds.push(...treatment.messageIds);
  }
  gRelayACOptionsTitles = await new Localization([
    "browser/firefoxRelay.ftl",
    "toolkit/branding/brandings.ftl",
  ]).formatMessages(allMessageIds);
});

function stubFxAccountsToSimulateSignedIn() {
  const sandbox = sinon.createSandbox();
  sandbox.stub(gFxAccounts, "hasLocalSession").returns(true);
  sandbox
    .stub(gFxAccounts.constructor.config, "isProductionConfig")
    .returns(true);
  sandbox.stub(gFxAccounts, "getOAuthToken").returns("MOCK_TOKEN");
  sandbox.stub(gFxAccounts, "getSignedInUser").returns({
    email: "example@mozilla.com",
  });
  registerCleanupFunction(() => sandbox?.restore());
  return sandbox;
}

function getRelayItemFromACPopup(popup) {
  const relayItem = Array.from(popup.querySelectorAll("richlistitem")).find(
    item =>
      gRelayACOptionsTitles.some(
        title => title.value === item.getAttribute("ac-value")
      )
  );
  return relayItem;
}

async function waitForElementById(elementId) {
  await BrowserTestUtils.waitForMutationCondition(
    document.body,
    { childList: true, subtree: true },
    () => document.getElementById(elementId)
  );
}

async function clickRelayItemAndWaitForPopup(acPopup) {
  const relayItem = getRelayItemFromACPopup(acPopup);
  const notificationPopup = document.getElementById("notification-popup");
  const notificationShownEvent = BrowserTestUtils.waitForPopupEvent(
    notificationPopup,
    "shown"
  );
  relayItem.click();
  await notificationShownEvent;
  return relayItem;
}

async function clickButtonAndWaitForPopupToClose(buttonToClick) {
  const notificationPopup = document.getElementById("notification-popup");
  const notificationHiddenEvent = BrowserTestUtils.waitForPopupEvent(
    notificationPopup,
    "hidden"
  );
  buttonToClick.click();
  await notificationHiddenEvent;
}
