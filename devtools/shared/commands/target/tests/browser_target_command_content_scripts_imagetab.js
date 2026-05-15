/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Test the TargetCommand API for content scripts targets specifically when
// the target tab is loading an image. Bug 2007846.

const IMAGE_TEST_URL = URL_ROOT_SSL + "test_image.png";

add_task(async function test_contentScript_and_windowGlobal_for_imageTab() {
  info("Test TargetCommand listening to both content script and window global");

  // Disable the preloaded process as it creates processes intermittently
  // which forces the emission of RDP requests we aren't correctly waiting for.
  await pushPref("dom.ipc.processPrelaunch.enabled", false);

  // target-command reads this preference to watch ContentScript targets.
  // Flip it to true in order to watch ContentScript targets.
  await pushPref("devtools.debugger.show-content-scripts", true);

  const extension = ExtensionTestUtils.loadExtension({
    manifest: {
      name: "Addon with content script",
      content_scripts: [
        {
          matches: [`https://example.com/*`],
          js: ["content-script.js"],
        },
      ],
    },
    files: {
      "content-script.js": function () {
        // eslint-disable-next-line no-undef
        browser.test.notifyPass("contentScriptRan");
      },
    },
  });

  await extension.startup();

  info("Test TargetCommand against content scripts via a tab target");
  const tab = await addTab(IMAGE_TEST_URL);

  await extension.awaitFinish("contentScriptRan");

  // Create a TargetCommand for the tab
  const commands = await CommandsFactory.forTab(tab);
  const targetCommand = commands.targetCommand;

  await commands.targetCommand.startListening();

  const { TYPES } = targetCommand;

  info("Retrieve initial targets");
  const contentScripts = await targetCommand.getAllTargets([
    TYPES.CONTENT_SCRIPT,
  ]);
  is(contentScripts.length, 1, "Retrieved the content script");
  const [contentScript] = contentScripts;
  Assert.stringContains(contentScript.title, "Addon with content script");

  const frames = await targetCommand.getAllTargets([TYPES.FRAME]);
  is(frames.length, 1, "Retrieved a frame target");
  const [frame] = frames;
  is(frame.url, IMAGE_TEST_URL, "Window global target has the expected URL");

  const types = [TYPES.CONTENT_SCRIPT, TYPES.FRAME];
  info("Assert that watchTargets works for the existing content script");
  const targets = [];
  const destroyedTargets = [];

  const onAvailable = async ({ targetFront }) => {
    info(
      `onAvailable called for ${targetFront.title} (type: ${targetFront.targetType})`
    );
    ok(
      types.includes(targetFront.targetType),
      "We are only notified about content script and window global targets"
    );
    if (targetFront.targetType === TYPES.FRAME) {
      targets.push(targetFront);
    }
    info(`Handled ${targets.length} targets\n`);
  };

  const onDestroyed = async ({ targetFront }) => {
    info(
      `onDestroyed called for ${targetFront.title} (type: ${targetFront.targetType})`
    );
    ok(
      types.includes(targetFront.targetType),
      "We are only notified about content script and window global targets"
    );
    // Only track creation and destruction of frame targets, because content
    // script targets seem inconsistent against image tabs.
    if (targetFront.targetType === TYPES.FRAME) {
      destroyedTargets.push(targetFront);
    }
  };

  // Note: Listen to both FRAME and CONTENT_SCRIPT types even if we are only
  // actively tracking frames. Bug 2007846 was triggered by the combination of
  // both (via enabling "Show content scripts" in the debugger).
  await targetCommand.watchTargets({
    types,
    onAvailable,
    onDestroyed,
  });

  is(targets.length, 1, "watchTargets notifies about 1 window global target");
  is(
    targets[0],
    frame,
    "watchTargets reports the window global target instance"
  );

  await reloadSelectedTab();
  await waitFor(
    () => destroyedTargets.length == 1,
    "Wait for window global targets to be destroyed on navigation"
  );
  await waitFor(
    () => targets.length == 2,
    "Wait for new targets to be created on navigation"
  );

  is(destroyedTargets[0], frame, "the window global target is destroyed");
  is(targets.length, 2, "Received all new targets");

  await extension.unload();

  info("Reload the tab and wait for window global targets to be destroyed");
  await reloadSelectedTab();
  await waitFor(
    () => destroyedTargets.length == 2,
    "Window global target is destroyed on tab closing"
  );

  targetCommand.unwatchTargets({
    types,
    onAvailable,
    onDestroyed,
  });
  targetCommand.destroy();

  await commands.destroy();
  BrowserTestUtils.removeTab(tab);
});
