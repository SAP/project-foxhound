/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

do_get_profile();

const {
  getActionLogConfigForTool,
  getActionLogChipsForTool,
  buildActionLogRow,
} = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/ui/modules/ToolActionLog.sys.mjs"
);

const {
  GET_OPEN_TABS,
  SEARCH_BROWSING_HISTORY,
  GET_USER_MEMORIES,
  GET_NAVIGATION_INFO,
} = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/models/Tools.sys.mjs"
);

add_task(function test_getActionLogConfigForTool_visible_tools() {
  Assert.withSoftAssertions(function (soft) {
    for (const toolName of [
      GET_OPEN_TABS,
      SEARCH_BROWSING_HISTORY,
      GET_USER_MEMORIES,
      GET_NAVIGATION_INFO,
    ]) {
      const cfg = getActionLogConfigForTool(toolName, []);

      soft.strictEqual(cfg.show, true, `${toolName} is visible`);
      soft.equal(typeof cfg.label, "object", `${toolName} label is descriptor`);
      soft.equal(
        typeof cfg.label?.l10nId,
        "string",
        `${toolName} label has an l10nId`
      );
      soft.greater(
        cfg.label?.l10nId?.length ?? 0,
        0,
        `${toolName} label l10nId is not empty`
      );
    }
  });
});

add_task(function test_getActionLogConfigForTool_unknown_tool_suppressed() {
  const cfg = getActionLogConfigForTool("not_a_real_tool");

  Assert.strictEqual(cfg.show, false, "Unknown tool is suppressed");
  Assert.strictEqual(cfg.label, null, "Unknown tool has no label");
  Assert.strictEqual(
    cfg.pendingLabel,
    null,
    "Unknown tool has no pending label"
  );
});

add_task(function test_getActionLogConfigForTool_returns_default() {
  const cfg = getActionLogConfigForTool("not_a_real_tool");

  Assert.equal(typeof cfg, "object", "Returns an object");
  Assert.equal(typeof cfg.show, "boolean", "show is a boolean");
  Assert.strictEqual(cfg.label, null, "label is null by default");
});

add_task(function test_getActionLogChipsForTool_get_open_tabs() {
  const body = [
    { url: "https://example.com/", title: "Example", lastAccessed: 1 },
    { url: "https://firefox.com/", title: "Firefox", lastAccessed: 2 },
  ];

  const chips = getActionLogChipsForTool(GET_OPEN_TABS, body);

  Assert.withSoftAssertions(function (soft) {
    soft.equal(chips.length, 2, "One chip per tab");
    soft.deepEqual(chips[0], {
      url: "https://example.com/",
      label: "Example",
    });
    soft.deepEqual(chips[1], {
      url: "https://firefox.com/",
      label: "Firefox",
    });
  });
});

add_task(function test_getActionLogChipsForTool_get_open_tabs_empty() {
  Assert.deepEqual(
    getActionLogChipsForTool(GET_OPEN_TABS, []),
    [],
    "Empty body yields no chips"
  );
  Assert.deepEqual(
    getActionLogChipsForTool(GET_OPEN_TABS, null),
    [],
    "Null body yields no chips"
  );
});

add_task(function test_getActionLogChipsForTool_search_browsing_history() {
  const body = {
    results: [
      { url: "https://news.example.com/", title: "Today's News" },
      { url: "https://docs.example.com/api", title: "API Docs" },
    ],
  };

  const chips = getActionLogChipsForTool(SEARCH_BROWSING_HISTORY, body);

  Assert.withSoftAssertions(function (soft) {
    soft.equal(chips.length, 2, "One chip per history result");
    soft.deepEqual(chips[0], {
      url: "https://news.example.com/",
      label: "Today's News",
    });
  });
});

add_task(function test_getActionLogChipsForTool_unknown_tool() {
  Assert.deepEqual(
    getActionLogChipsForTool("not_a_real_tool", [{ url: "x", title: "y" }]),
    [],
    "Unknown tool returns no chips"
  );
});

add_task(function test_buildActionLogRow_label_no_args() {
  const row = buildActionLogRow(
    GET_OPEN_TABS,
    { l10nId: "action-log-searched-open-tabs" },
    [{ url: "https://example.com/", title: "Example" }]
  );

  Assert.withSoftAssertions(function (soft) {
    soft.equal(
      row.labelL10nId,
      "action-log-searched-open-tabs",
      "labelL10nId is flattened onto the row"
    );
    soft.strictEqual(
      row.labelL10nArgs,
      undefined,
      "labelL10nArgs is undefined when the actionLogLabel has no args"
    );
    soft.equal(row.items.length, 1, "Items contain the tool's chips");
    soft.deepEqual(row.items[0], {
      url: "https://example.com/",
      label: "Example",
    });
  });
});

add_task(function test_buildActionLogRow_memories_l10n_args_no_chips() {
  const row = buildActionLogRow(GET_USER_MEMORIES, {
    l10nId: "action-log-checked-memories",
  });

  Assert.equal(row.labelL10nId, "action-log-checked-memories");
  Assert.equal(row.items.length, 0, "Memory rows carry no chips");
});

add_task(function test_buildActionLogRow_string_label_fallback() {
  const row = buildActionLogRow(GET_OPEN_TABS, "Raw label", []);
  Assert.equal(row.label, "Raw label");
  Assert.strictEqual(row.labelL10nId, undefined);
  Assert.deepEqual(row.items, []);
});

add_task(function test_buildActionLogRow_unknown_tool_no_chip() {
  const row = buildActionLogRow("not_a_real_tool", { l10nId: "x" }, [
    { url: "https://example.com/", title: "Example" },
  ]);
  Assert.deepEqual(row.items, [], "Unknown tool has no chip adapter");
  Assert.equal(row.labelL10nId, "x");
});
