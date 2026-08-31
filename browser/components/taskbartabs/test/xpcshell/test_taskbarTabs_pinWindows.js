/* Any copyright is dedicated to the Public Domain.
http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  FileTestUtils: "resource://testing-common/FileTestUtils.sys.mjs",
  sinon: "resource://testing-common/Sinon.sys.mjs",
  ShellService: "moz-src:///browser/components/shell/ShellService.sys.mjs",
  TaskbarTabsPin: "resource:///modules/taskbartabs/TaskbarTabsPin.sys.mjs",
  TaskbarTabsRegistry:
    "resource:///modules/taskbartabs/TaskbarTabsRegistry.sys.mjs",
  TaskbarTabsUtils: "resource:///modules/taskbartabs/TaskbarTabsUtils.sys.mjs",
  XPCOMUtils: "resource://gre/modules/XPCOMUtils.sys.mjs",
});

XPCOMUtils.defineLazyServiceGetters(this, {
  imgTools: ["@mozilla.org/image/tools;1", Ci.imgITools],
});

// We want to mock the native XPCOM interfaces of the initialized
// `ShellService.shellService`, but those interfaces are frozen. Instead we
// proxy `ShellService.shellService` and mock it.
const kMockNativeShellService = {
  ...ShellService.shellService,
  createShortcut: sinon.stub().resolves("dummy_path"),
  deleteShortcut: sinon.stub().resolves("dummy_path"),
  pinShortcutToTaskbar: sinon.stub().resolves(),
  unpinShortcutFromTaskbar: sinon.stub(),
};

sinon.stub(ShellService, "shellService").value(kMockNativeShellService);
sinon.stub(ShellService, "writeShortcutIcon");

sinon.stub(TaskbarTabsPin, "_getLocalization").returns({
  formatValue(msg) {
    // Slash must also be sanitized, so it should appear as '_' in paths.
    return `[formatValue/${msg}]`;
  },
});

registerCleanupFunction(() => {
  sinon.restore();
});

// Favicons are written to the profile directory, ensure it exists.
do_get_profile();

function shellPinCalled(aTaskbarTab, destFolder, shortcutRelativePath) {
  ok(
    ShellService.writeShortcutIcon.calledOnce,
    `Icon creation should have been called.`
  );
  ok(
    kMockNativeShellService.createShortcut.calledOnce,
    `Shortcut creation should have been called.`
  );
  Assert.equal(
    kMockNativeShellService.createShortcut.firstCall.args[6],
    destFolder,
    "The shortcut should go into the expected destination."
  );
  Assert.equal(
    kMockNativeShellService.createShortcut.firstCall.args[7],
    shortcutRelativePath,
    "The shortcut path should match the expected result."
  );
  ok(
    kMockNativeShellService.pinShortcutToTaskbar.calledOnce,
    `Pin to taskbar should have been called.`
  );
  Assert.equal(
    kMockNativeShellService.pinShortcutToTaskbar.firstCall.args[1],
    kMockNativeShellService.createShortcut.firstCall.args[6],
    `The created and pinned shortcuts should be in the same folder.`
  );
  Assert.equal(
    kMockNativeShellService.pinShortcutToTaskbar.firstCall.args[2],
    kMockNativeShellService.createShortcut.firstCall.args[7],
    `The created and pinned shortcuts should be the same file.`
  );
  Assert.equal(
    kMockNativeShellService.pinShortcutToTaskbar.firstCall.args[2],
    aTaskbarTab.shortcutRelativePath,
    `The pinned shortcut should be the saved shortcut.`
  );
  Assert.equal(patchedSpy.callCount, 1, "A single patched event was emitted");
}

function shellUnpinCalled(aShortcutRelativePath) {
  ok(
    kMockNativeShellService.deleteShortcut.calledOnce,
    `Unpin from taskbar should have been called.`
  );
  Assert.equal(
    kMockNativeShellService.deleteShortcut.firstCall.args[1],
    aShortcutRelativePath,
    "shortcutRelativePath was deleted."
  );
  ok(
    kMockNativeShellService.unpinShortcutFromTaskbar.calledOnce,
    `Unpin from taskbar should have been called.`
  );
  Assert.equal(
    kMockNativeShellService.unpinShortcutFromTaskbar.firstCall.args[1],
    aShortcutRelativePath,
    "shortcutRelativePath was deleted."
  );
}

async function pinTaskbarTabDefaultIcon(aTaskbarTab, aRegistry) {
  return TaskbarTabsPin.pinTaskbarTab(
    aTaskbarTab,
    aRegistry,
    await TaskbarTabsUtils.getDefaultIcon()
  );
}

const registry = new TaskbarTabsRegistry();

const patchedSpy = sinon.stub();
registry.on(TaskbarTabsRegistry.events.patched, patchedSpy);

add_task(async function test_pin_location() {
  const parsedURI = Services.io.newURI("https://www.example.com");
  const taskbarTab = createTaskbarTab(registry, parsedURI, 0);
  sinon.resetHistory();

  await pinTaskbarTabDefaultIcon(taskbarTab, registry);
  shellPinCalled(
    taskbarTab,
    "Programs",
    `[formatValue_taskbar-tab-shortcut-folder]\\${taskbarTab.name}.lnk`
  );
});

add_task(async function test_pin_location_dos_name() {
  const parsedURI = Services.io.newURI("https://aux.test");
  const invalidTaskbarTab = createTaskbarTab(registry, parsedURI, 0);
  sinon.resetHistory();

  await pinTaskbarTabDefaultIcon(invalidTaskbarTab, registry);
  shellPinCalled(
    invalidTaskbarTab,
    "Programs",
    // 'Untitled' is the default selected by the MIME code, since
    // AUX is a reserved name on Windows.
    "[formatValue_taskbar-tab-shortcut-folder]\\Untitled.lnk"
  );

  registry.removeTaskbarTab(invalidTaskbarTab.id);
});

add_task(async function test_pin_location_bad_characters() {
  const parsedURI = Services.io.newURI("https://another.test");
  const invalidTaskbarTab = createTaskbarTab(registry, parsedURI, 0, {
    manifest: {
      name: "** :\t\r\n \\\\ >> Not a valid. filename??! << // |||: **.",
    },
  });
  sinon.resetHistory();

  await pinTaskbarTabDefaultIcon(invalidTaskbarTab, registry);
  shellPinCalled(
    invalidTaskbarTab,
    "Programs",
    "[formatValue_taskbar-tab-shortcut-folder]\\__ ____ __ __ Not a valid. filename__! __ __ ____ __..lnk"
  );

  registry.removeTaskbarTab(invalidTaskbarTab.id);
});

add_task(async function test_pin_location_lnk_extension() {
  const parsedURI = Services.io.newURI("https://another.test");
  const invalidTaskbarTab = createTaskbarTab(registry, parsedURI, 0, {
    manifest: {
      name: "coolstartup.lnk",
    },
  });
  sinon.resetHistory();

  await pinTaskbarTabDefaultIcon(invalidTaskbarTab, registry);
  shellPinCalled(
    invalidTaskbarTab,
    "Programs",
    "[formatValue_taskbar-tab-shortcut-folder]\\coolstartup.lnk.lnk"
  );

  registry.removeTaskbarTab(invalidTaskbarTab.id);
});

add_task(async function test_unpin() {
  const exampleUrl = Services.io.newURI("https://example.com");
  const tt = createTaskbarTab(registry, exampleUrl, 0);
  registry.patchTaskbarTab(tt, {
    shortcutRelativePath: "somewhere else\\shortcut name.lnk",
  });

  sinon.resetHistory();
  await TaskbarTabsPin.unpinTaskbarTab(tt, registry);

  shellUnpinCalled("somewhere else\\shortcut name.lnk");
  Assert.equal(
    tt.shortcutRelativePath,
    null,
    "Shortcut relative path was removed from the taskbar tab"
  );
  Assert.equal(patchedSpy.callCount, 1, "A single patched event was emitted");
});
