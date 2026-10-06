/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

do_get_profile();

const { MANAGE_TABS, toolsConfig, TOOLS, manageTabs } =
  ChromeUtils.importESModule(
    "moz-src:///browser/components/aiwindow/models/Tools.sys.mjs"
  );

const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);

const { BrowserWindowTracker } = ChromeUtils.importESModule(
  "resource:///modules/BrowserWindowTracker.sys.mjs"
);

function createFakeTab(url, label) {
  return {
    linkedBrowser: { currentURI: { spec: url } },
    label,
    linkedPanel: `panel-${url}`,
    image: "",
    pinned: false,
  };
}

function createFakeWindow(tabs, { selectedTab = null } = {}) {
  return {
    closed: false,
    gBrowser: { tabs, selectedTab },
    document: {
      documentElement: {
        hasAttribute: attr => attr === "ai-window",
      },
    },
  };
}

function setupBrowserWindowTracker(sandbox, windows) {
  const list = Array.isArray(windows) ? windows : [windows];
  sandbox.stub(BrowserWindowTracker, "orderedWindows").get(() => list);
}

/**
 * Schema / registration tests
 */

add_task(function test_manageTabs_isRegistered() {
  Assert.ok(
    TOOLS.includes(MANAGE_TABS),
    "MANAGE_TABS is listed in the TOOLS catalog"
  );
  Assert.ok(
    toolsConfig.some(t => t.function?.name === MANAGE_TABS),
    "Schema is present in toolsConfig"
  );
});

add_task(function test_manageTabs_schema_is_well_formed() {
  const tool = toolsConfig.find(t => t.function?.name === MANAGE_TABS);

  const params = tool.function.parameters;
  Assert.deepEqual(
    params.required.sort(),
    ["action", "ask_confirmation", "url_tokens"].sort(),
    "All required fields are listed"
  );

  for (const key of params.required) {
    Assert.ok(params.properties[key], `${key} is defined in properties`);
  }

  Assert.equal(
    params.properties.ask_confirmation.type,
    "boolean",
    "ask_confirmation is boolean (not bool)"
  );
  Assert.deepEqual(
    params.properties.action.enum,
    ["close_tabs"],
    "Only close_tabs action is currently exposed"
  );
  Assert.equal(
    params.properties.url_tokens.type,
    "array",
    "url_tokens is an array"
  );
  Assert.equal(
    params.properties.url_tokens.items.type,
    "string",
    "url_tokens items are strings"
  );
  Assert.equal(
    params.properties.url_tokens.minItems,
    1,
    "url_tokens requires at least one item"
  );
});

add_task(async function test_manageTabs_dedupes_repeated_urls() {
  const sb = sinon.createSandbox();
  try {
    const url = "https://example.com/dup";
    const targetTab = createFakeTab(url, "Dup");
    const otherTab = createFakeTab("https://example.com/keep", "Keep");
    setupBrowserWindowTracker(
      sb,
      createFakeWindow([targetTab, otherTab], { selectedTab: otherTab })
    );

    const { toolResult: result } = await manageTabs(
      {
        action: "close_tabs",
        ask_confirmation: true,
        url_tokens: [url, url, url],
      },
      makeConversation()
    );

    Assert.equal(
      result.selectedTabs.length,
      1,
      "Repeated entries collapse to a single tab"
    );
    Assert.equal(
      result.selectedTabs[0].url,
      url,
      "Remaining tab is the one matching the requested URL"
    );
  } finally {
    sb.restore();
  }
});

add_task(async function test_manageTabs_rejects_unknown_action() {
  const { toolResult: result, uiData } = await manageTabs(
    {
      action: "delete_history",
      ask_confirmation: true,
      url_tokens: ["https://example.com/"],
    },
    makeConversation()
  );

  Assert.ok(
    typeof result === "string" && result.startsWith("Error"),
    "Returns an error result for unknown action"
  );
  Assert.ok(result.includes("delete_history"), "Echoes the offending action");
  Assert.equal(uiData, null, "No UI data is returned for an unknown action");
});

add_task(async function test_manageTabs_rejects_non_array_entries() {
  const { toolResult: result, uiData } = await manageTabs(
    {
      action: "close_tabs",
      ask_confirmation: true,
      url_tokens: "https://example.com/",
    },
    makeConversation()
  );

  Assert.ok(
    typeof result === "string" && result.includes("must be an array"),
    "Returns an error result when url_tokens is not an array"
  );
  Assert.equal(uiData, null, "No UI data is returned when validation fails");
});

/**
 * Wrapper robustness tests: tolerates missing or invalid tool arguments.
 */

add_task(async function test_manageTabs_wrapper_no_args() {
  const { toolResult: result, uiData } = await manageTabs(
    undefined,
    makeConversation()
  );
  Assert.ok(
    typeof result === "string" && result.startsWith("Error"),
    "Returns an error result"
  );
  Assert.equal(uiData, null, "No UI data is returned");
});

add_task(async function test_manageTabs_wrapper_null_args() {
  const { toolResult: result, uiData } = await manageTabs(
    null,
    makeConversation()
  );
  Assert.ok(
    typeof result === "string" && result.startsWith("Error"),
    "Returns an error result"
  );
  Assert.equal(uiData, null, "No UI data is returned");
});

add_task(async function test_manageTabs_wrapper_string_args() {
  const { toolResult: result, uiData } = await manageTabs(
    "close_tabs",
    makeConversation()
  );
  Assert.ok(
    typeof result === "string" && result.startsWith("Error"),
    "Returns an error result"
  );
  Assert.equal(uiData, null, "No UI data is returned");
});

add_task(async function test_manageTabs_wrapper_number_args() {
  const { toolResult: result, uiData } = await manageTabs(
    123,
    makeConversation()
  );
  Assert.ok(
    typeof result === "string" && result.startsWith("Error"),
    "Returns an error result"
  );
  Assert.equal(uiData, null, "No UI data is returned");
});

add_task(async function test_manageTabs_wrapper_boolean_args() {
  const { toolResult: result, uiData } = await manageTabs(
    true,
    makeConversation()
  );
  Assert.ok(
    typeof result === "string" && result.startsWith("Error"),
    "Returns an error result"
  );
  Assert.equal(uiData, null, "No UI data is returned");
});
