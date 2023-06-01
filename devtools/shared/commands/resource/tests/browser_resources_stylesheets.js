/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Test the ResourceCommand API around STYLESHEET.

const ResourceCommand = require("resource://devtools/shared/commands/resource/resource-command.js");

const STYLE_TEST_URL = URL_ROOT_SSL + "style_document.html";

const EXISTING_RESOURCES = [
  {
    styleText: "body { color: lime; }",
    href: null,
    nodeHref:
      "https://example.com/browser/devtools/shared/commands/resource/tests/style_document.html",
    isNew: false,
    disabled: false,
    constructed: false,
    ruleCount: 1,
    atRules: [],
  },
  {
    styleText: "body { margin: 1px; }",
    href:
      "https://example.com/browser/devtools/shared/commands/resource/tests/style_document.css",
    nodeHref:
      "https://example.com/browser/devtools/shared/commands/resource/tests/style_document.html",
    isNew: false,
    disabled: false,
    constructed: false,
    ruleCount: 1,
    atRules: [],
  },
  {
    styleText: "",
    href: null,
    nodeHref: null,
    isNew: false,
    disabled: false,
    constructed: true,
    ruleCount: 1,
    atRules: [],
  },
  {
    styleText: "body { background-color: pink; }",
    href: null,
    nodeHref:
      "https://example.org/browser/devtools/shared/commands/resource/tests/style_iframe.html",
    isNew: false,
    disabled: false,
    constructed: false,
    ruleCount: 1,
    atRules: [],
  },
  {
    styleText: "body { padding: 1px; }",
    href:
      "https://example.org/browser/devtools/shared/commands/resource/tests/style_iframe.css",
    nodeHref:
      "https://example.org/browser/devtools/shared/commands/resource/tests/style_iframe.html",
    isNew: false,
    disabled: false,
    constructed: false,
    ruleCount: 1,
    atRules: [],
  },
];

const ADDITIONAL_INLINE_RESOURCE = {
  styleText:
    "@media all { body { color: red; } } @media print { body { color: cyan; } } body { font-size: 10px; }",
  href: null,
  nodeHref:
    "https://example.com/browser/devtools/shared/commands/resource/tests/style_document.html",
  isNew: false,
  disabled: false,
  constructed: false,
  ruleCount: 3,
  atRules: [
    {
      conditionText: "all",
      mediaText: "all",
      matches: true,
      line: 1,
      column: 1,
    },
    {
      conditionText: "print",
      mediaText: "print",
      matches: false,
      line: 1,
      column: 37,
    },
  ],
};

const ADDITIONAL_CONSTRUCTED_RESOURCE = {
  styleText: "",
  href: null,
  nodeHref: null,
  isNew: false,
  disabled: false,
  constructed: true,
  ruleCount: 2,
  atRules: [],
};

const ADDITIONAL_FROM_ACTOR_RESOURCE = {
  styleText: "body { font-size: 10px; }",
  href: null,
  nodeHref:
    "https://example.com/browser/devtools/shared/commands/resource/tests/style_document.html",
  isNew: true,
  disabled: false,
  constructed: false,
  ruleCount: 1,
  atRules: [],
};

add_task(async function() {
  await testResourceAvailableFeature();
  await testResourceUpdateFeature();
  await testNestedResourceUpdateFeature();
});

async function testResourceAvailableFeature() {
  info("Check resource available feature of the ResourceCommand");

  const tab = await addTab(STYLE_TEST_URL);
  let resourceTimingEntryCounts = await getResourceTimingCount(tab);
  is(
    resourceTimingEntryCounts,
    2,
    "Should have two entires for resource timing"
  );

  const { client, resourceCommand, targetCommand } = await initResourceCommand(
    tab
  );

  info("Check whether ResourceCommand gets existing stylesheet");
  const availableResources = [];
  await resourceCommand.watchResources([resourceCommand.TYPES.STYLESHEET], {
    onAvailable: resources => availableResources.push(...resources),
  });

  is(
    availableResources.length,
    EXISTING_RESOURCES.length,
    "Length of existing resources is correct"
  );
  for (let i = 0; i < availableResources.length; i++) {
    const availableResource = availableResources[i];
    // We can not expect the resources to always be forwarded in the same order.
    // See intermittent Bug 1655016.
    const expectedResource = findMatchingExpectedResource(availableResource);
    ok(expectedResource, "Found a matching expected resource for the resource");
    await assertResource(availableResource, expectedResource);
  }

  resourceTimingEntryCounts = await getResourceTimingCount(tab);
  is(
    resourceTimingEntryCounts,
    2,
    "Should still have two entires for resource timing after devtools APIs have been triggered"
  );

  info("Check whether ResourceCommand gets additonal stylesheet");
  await ContentTask.spawn(
    tab.linkedBrowser,
    ADDITIONAL_INLINE_RESOURCE.styleText,
    text => {
      const document = content.document;
      const stylesheet = document.createElement("style");
      stylesheet.textContent = text;
      document.body.appendChild(stylesheet);
    }
  );
  await waitUntil(
    () => availableResources.length === EXISTING_RESOURCES.length + 1
  );
  await assertResource(
    availableResources[availableResources.length - 1],
    ADDITIONAL_INLINE_RESOURCE
  );

  info("Check whether ResourceCommand gets additonal constructed stylesheet");
  await ContentTask.spawn(tab.linkedBrowser, null, () => {
    const document = content.document;
    const s = new content.CSSStyleSheet();
    // We use the different number of rules to meaningfully differentiate
    // between constructed stylesheets.
    s.replaceSync("foo { color: red } bar { color: blue }");
    // TODO(bug 1751346): wrappedJSObject should be unnecessary.
    document.wrappedJSObject.adoptedStyleSheets.push(s);
  });
  await waitUntil(
    () => availableResources.length === EXISTING_RESOURCES.length + 2
  );
  await assertResource(
    availableResources[availableResources.length - 1],
    ADDITIONAL_CONSTRUCTED_RESOURCE
  );

  info(
    "Check whether ResourceCommand gets additonal stylesheet which is added by DevTools"
  );
  const styleSheetsFront = await targetCommand.targetFront.getFront(
    "stylesheets"
  );
  await styleSheetsFront.addStyleSheet(
    ADDITIONAL_FROM_ACTOR_RESOURCE.styleText
  );
  await waitUntil(
    () => availableResources.length === EXISTING_RESOURCES.length + 3
  );
  await assertResource(
    availableResources[availableResources.length - 1],
    ADDITIONAL_FROM_ACTOR_RESOURCE
  );

  targetCommand.destroy();
  await client.close();
}

async function testResourceUpdateFeature() {
  info("Check resource update feature of the ResourceCommand");

  const tab = await addTab(STYLE_TEST_URL);

  const { client, resourceCommand, targetCommand } = await initResourceCommand(
    tab
  );

  info("Setup the watcher");
  const availableResources = [];
  const updates = [];
  await resourceCommand.watchResources([resourceCommand.TYPES.STYLESHEET], {
    onAvailable: resources => availableResources.push(...resources),
    onUpdated: newUpdates => updates.push(...newUpdates),
  });
  is(
    availableResources.length,
    EXISTING_RESOURCES.length,
    "Length of existing resources is correct"
  );
  is(updates.length, 0, "there's no update yet");

  info("Check toggleDisabled function");
  // Retrieve the stylesheet of the top-level target
  const resource = availableResources.find(
    innerResource => innerResource.targetFront.isTopLevel
  );
  const styleSheetsFront = await resource.targetFront.getFront("stylesheets");
  await styleSheetsFront.toggleDisabled(resource.resourceId);
  await waitUntil(() => updates.length === 1);

  // Check the content of the update object.
  assertUpdate(updates[0].update, {
    resourceId: resource.resourceId,
    updateType: "property-change",
  });
  is(
    updates[0].update.resourceUpdates.disabled,
    true,
    "resourceUpdates is correct"
  );

  // Check whether the cached resource is updated correctly.
  is(
    updates[0].resource.disabled,
    true,
    "cached resource is updated correctly"
  );

  // Check whether the actual stylesheet is updated correctly.
  const styleSheetDisabled = await ContentTask.spawn(
    tab.linkedBrowser,
    null,
    () => {
      const document = content.document;
      const stylesheet = document.styleSheets[0];
      return stylesheet.disabled;
    }
  );
  is(styleSheetDisabled, true, "actual stylesheet was updated correctly");

  info("Check update function");
  const expectedAtRules = [
    {
      conditionText: "screen",
      mediaText: "screen",
      matches: true,
    },
    {
      conditionText: "print",
      mediaText: "print",
      matches: false,
    },
  ];

  const updateCause = "updated-by-test";
  await styleSheetsFront.update(
    resource.resourceId,
    "@media screen { color: red; } @media print { color: green; } body { color: cyan; }",
    false,
    updateCause
  );
  await waitUntil(() => updates.length === 4);

  assertUpdate(updates[1].update, {
    resourceId: resource.resourceId,
    updateType: "property-change",
  });
  is(
    updates[1].update.resourceUpdates.ruleCount,
    3,
    "resourceUpdates is correct"
  );
  is(updates[1].resource.ruleCount, 3, "cached resource is updated correctly");

  assertUpdate(updates[2].update, {
    resourceId: resource.resourceId,
    updateType: "style-applied",
    event: {
      cause: updateCause,
    },
  });
  is(
    updates[2].update.resourceUpdates,
    undefined,
    "resourceUpdates is correct"
  );

  assertUpdate(updates[3].update, {
    resourceId: resource.resourceId,
    updateType: "at-rules-changed",
  });
  assertAtRules(updates[3].update.resourceUpdates.atRules, expectedAtRules);

  // Check the actual page.
  const styleSheetResult = await getStyleSheetResult(tab);

  is(
    styleSheetResult.ruleCount,
    3,
    "ruleCount of actual stylesheet is updated correctly"
  );
  assertAtRules(styleSheetResult.atRules, expectedAtRules);

  targetCommand.destroy();
  await client.close();
}

async function testNestedResourceUpdateFeature() {
  info("Check nested resource update feature of the ResourceCommand");

  const tab = await addTab(STYLE_TEST_URL);

  const {
    outerWidth: originalWindowWidth,
    outerHeight: originalWindowHeight,
  } = tab.ownerGlobal;

  registerCleanupFunction(() => {
    tab.ownerGlobal.resizeTo(originalWindowWidth, originalWindowHeight);
  });

  const { client, resourceCommand, targetCommand } = await initResourceCommand(
    tab
  );

  info("Setup the watcher");
  const availableResources = [];
  const updates = [];
  await resourceCommand.watchResources([resourceCommand.TYPES.STYLESHEET], {
    onAvailable: resources => availableResources.push(...resources),
    onUpdated: newUpdates => updates.push(...newUpdates),
  });
  is(
    availableResources.length,
    EXISTING_RESOURCES.length,
    "Length of existing resources is correct"
  );

  info("Apply new media query");
  // In order to avoid applying the media query (min-height: 400px).
  if (originalWindowHeight !== 300) {
    await new Promise(resolve => {
      tab.ownerGlobal.addEventListener("resize", resolve, { once: true });
      tab.ownerGlobal.resizeTo(originalWindowWidth, 300);
    });
  }

  // Retrieve the stylesheet of the top-level target
  const resource = availableResources.find(
    innerResource => innerResource.targetFront.isTopLevel
  );
  const styleSheetsFront = await resource.targetFront.getFront("stylesheets");
  await styleSheetsFront.update(
    resource.resourceId,
    "@media (min-height: 400px) { color: red; }",
    false
  );
  await waitUntil(() => updates.length === 3);
  is(resource.atRules[0].matches, false, "Media query is not matched yet");

  info("Change window size to fire matches-change event");
  tab.ownerGlobal.resizeTo(originalWindowWidth, 500);
  await waitUntil(() => updates.length === 4);

  // Check the update content.
  const targetUpdate = updates[3];
  assertUpdate(targetUpdate.update, {
    resourceId: resource.resourceId,
    updateType: "matches-change",
  });
  ok(resource === targetUpdate.resource, "Update object has the same resource");

  is(
    JSON.stringify(targetUpdate.update.nestedResourceUpdates[0].path),
    JSON.stringify(["atRules", 0, "matches"]),
    "path of nestedResourceUpdates is correct"
  );
  is(
    targetUpdate.update.nestedResourceUpdates[0].value,
    true,
    "value of nestedResourceUpdates is correct"
  );

  // Check the resource.
  const expectedAtRules = [
    {
      conditionText: "(min-height: 400px)",
      mediaText: "(min-height: 400px)",
      matches: true,
    },
  ];

  assertAtRules(targetUpdate.resource.atRules, expectedAtRules);

  // Check the actual page.
  const styleSheetResult = await getStyleSheetResult(tab);
  is(
    styleSheetResult.ruleCount,
    1,
    "ruleCount of actual stylesheet is updated correctly"
  );
  assertAtRules(styleSheetResult.atRules, expectedAtRules);

  tab.ownerGlobal.resizeTo(originalWindowWidth, originalWindowHeight);

  targetCommand.destroy();
  await client.close();
}

function findMatchingExpectedResource(resource) {
  return EXISTING_RESOURCES.find(
    expected =>
      resource.href === expected.href &&
      resource.nodeHref === expected.nodeHref &&
      resource.ruleCount === expected.ruleCount &&
      resource.constructed == expected.constructed
  );
}

async function getStyleSheetResult(tab) {
  const result = await ContentTask.spawn(tab.linkedBrowser, null, () => {
    const document = content.document;
    const stylesheet = document.styleSheets[0];
    const ruleCount = stylesheet.cssRules.length;

    const atRules = [];
    for (const rule of stylesheet.cssRules) {
      if (!rule.media) {
        continue;
      }

      let matches = false;
      try {
        const mql = content.matchMedia(rule.media.mediaText);
        matches = mql.matches;
      } catch (e) {
        // Ignored
      }

      atRules.push({
        mediaText: rule.media.mediaText,
        conditionText: rule.conditionText,
        matches,
      });
    }

    return { ruleCount, atRules };
  });

  return result;
}

function assertAtRules(atRules, expected) {
  is(atRules.length, expected.length, "Length of the atRules is correct");

  for (let i = 0; i < atRules.length; i++) {
    is(
      atRules[i].conditionText,
      expected[i].conditionText,
      "conditionText is correct"
    );
    is(atRules[i].mediaText, expected[i].mediaText, "mediaText is correct");
    is(atRules[i].matches, expected[i].matches, "matches is correct");

    if (expected[i].line !== undefined) {
      is(atRules[i].line, expected[i].line, "line is correct");
    }

    if (expected[i].column !== undefined) {
      is(atRules[i].column, expected[i].column, "column is correct");
    }
  }
}

async function assertResource(resource, expected) {
  is(
    resource.resourceType,
    ResourceCommand.TYPES.STYLESHEET,
    "Resource type is correct"
  );
  const styleSheetsFront = await resource.targetFront.getFront("stylesheets");
  const styleText = (
    await styleSheetsFront.getText(resource.resourceId)
  ).str.trim();
  is(styleText, expected.styleText, "Style text is correct");
  is(resource.href, expected.href, "href is correct");
  is(resource.nodeHref, expected.nodeHref, "nodeHref is correct");
  is(resource.isNew, expected.isNew, "isNew is correct");
  is(resource.disabled, expected.disabled, "disabled is correct");
  is(resource.constructed, expected.constructed, "constructed is correct");
  is(resource.ruleCount, expected.ruleCount, "ruleCount is correct");
  assertAtRules(resource.atRules, expected.atRules);
}

function assertUpdate(update, expected) {
  is(
    update.resourceType,
    ResourceCommand.TYPES.STYLESHEET,
    "Resource type is correct"
  );
  is(update.resourceId, expected.resourceId, "resourceId is correct");
  is(update.updateType, expected.updateType, "updateType is correct");
  if (expected.event?.cause) {
    is(update.event?.cause, expected.event.cause, "cause is correct");
  }
}

function getResourceTimingCount(tab) {
  return ContentTask.spawn(tab.linkedBrowser, [], () => {
    return content.performance.getEntriesByType("resource").length;
  });
}
