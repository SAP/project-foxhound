/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

do_get_profile();

const { TOOLS, toolsConfig, RunSearch } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/models/Tools.sys.mjs"
);

const { Chat } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/models/Chat.sys.mjs"
);

add_task(async function test_run_search_registered_in_toolMap() {
  Assert.strictEqual(
    typeof Chat.toolMap.run_search,
    "function",
    "run_search should be registered in Chat.toolMap"
  );
});

add_task(async function test_run_search_in_TOOLS_array() {
  Assert.ok(
    TOOLS.includes("run_search"),
    "run_search should be in the TOOLS array"
  );
});

add_task(async function test_run_search_tool_config_exists() {
  const config = toolsConfig.find(t => t.function?.name === "run_search");
  Assert.ok(config, "run_search tool config should exist in toolsConfig");
  Assert.equal(config.type, "function", "Tool type should be 'function'");

  const params = config.function.parameters;
  Assert.ok(params.properties.query, "Should have a query parameter");
  Assert.equal(
    params.properties.query.type,
    "string",
    "query should be a string"
  );
  Assert.ok(params.required.includes("query"), "query should be required");
});

add_task(async function test_run_search_empty_query_returns_error() {
  const result = await RunSearch.runSearch({ query: "" });
  Assert.ok(
    result.includes("Error"),
    "Empty query should return an error string"
  );
});

add_task(async function test_run_search_null_query_returns_error() {
  const result = await RunSearch.runSearch({ query: null });
  Assert.ok(
    result.includes("Error"),
    "Null query should return an error string"
  );
});

add_task(async function test_run_search_whitespace_query_returns_error() {
  const result = await RunSearch.runSearch({ query: "   " });
  Assert.ok(
    result.includes("Error"),
    "Whitespace-only query should return an error string"
  );
});

add_task(async function test_run_search_no_browsingContext_returns_error() {
  const result = await RunSearch.runSearch({ query: "test query" });
  Assert.ok(
    result.includes("Error"),
    "No browsingContext should return an error string"
  );
  Assert.ok(
    result.includes("no browsingContext provided"),
    "Error should mention no browsingContext provided"
  );
});

add_task(async function test_run_search_closed_window_returns_error() {
  const result = await RunSearch.runSearch(
    { query: "test query" },
    { browsingContext: { topChromeWindow: { closed: true } } }
  );
  Assert.ok(
    result.includes("Error"),
    "Closed window should return an error string"
  );
  Assert.ok(
    result.includes("not available or closed"),
    "Error should mention window not available or closed"
  );
});

add_task(
  async function test_run_search_uses_context_browsingContext_when_provided() {
    const result = await RunSearch.runSearch(
      { query: "test query" },
      { browsingContext: { topChromeWindow: { closed: true } } }
    );
    Assert.ok(
      result.includes("Error"),
      "Closed window from browsingContext should return an error string"
    );
  }
);
