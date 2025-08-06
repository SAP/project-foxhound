/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

add_setup(async () => {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["sidebar.verticalTabs", true],
      ["browser.ml.chat.enabled", true],
      ["browser.shopping.experience2023.integratedSidebar", true],
      ["sidebar.main.tools", "aichat,reviewchecker,syncedtabs,history"],
    ],
  });
});
registerCleanupFunction(async () => {
  await SpecialPowers.popPrefEnv();
  while (gBrowser.tabs.length > 1) {
    BrowserTestUtils.removeTab(gBrowser.tabs.at(-1));
  }
});

add_task(async function test_tools_overflow() {
  const sidebar = document.querySelector("sidebar-main");
  ok(sidebar, "Sidebar is shown.");
  sidebar.expanded = true;
  await sidebar.updateComplete;

  let toolsAndExtensionsButtonGroup = sidebar.shadowRoot.querySelector(
    ".tools-and-extensions"
  );
  Assert.strictEqual(
    toolsAndExtensionsButtonGroup.getAttribute("orientation"),
    "vertical",
    "Tools are displaying vertically"
  );
  for (const toolMozButton of toolsAndExtensionsButtonGroup.children) {
    Assert.greater(
      toolMozButton.innerText.length,
      0,
      `Tool button is displaying label ${toolMozButton.innerText}`
    );
  }

  await SpecialPowers.pushPrefEnv({
    set: [
      [
        "sidebar.main.tools",
        "aichat,reviewchecker,syncedtabs,history,bookmarks",
      ],
    ],
  });
  await sidebar.updateComplete;
  Assert.strictEqual(
    toolsAndExtensionsButtonGroup.getAttribute("orientation"),
    "horizontal",
    "Tools are displaying horizontally"
  );
  for (const toolMozButton of toolsAndExtensionsButtonGroup.children) {
    ok(
      !toolMozButton.innerText.length,
      `Tool button is not displaying label text`
    );
  }
});
