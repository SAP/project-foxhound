/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

function getTabsTop(win) {
  return win.gBrowser.tabContainer.getBoundingClientRect().top;
}

async function waitForWindowLayout(win) {
  await new Promise(resolve => win.requestAnimationFrame(resolve));
}

add_task(async function test_tabs_space_consistent_normal_vs_private() {
  let normalWin = await BrowserTestUtils.openNewBrowserWindow();
  let privateWin = await BrowserTestUtils.openNewBrowserWindow({
    private: true,
  });

  let theme = ExtensionTestUtils.loadExtension({
    manifest: {
      theme: {
        colors: {
          frame: "#000000",
          tab_background_text: "#ffffff",
        },
      },
    },
  });

  try {
    await waitForWindowLayout(normalWin);
    await waitForWindowLayout(privateWin);

    let normalTop = getTabsTop(normalWin);
    let privateTop = getTabsTop(privateWin);

    is(
      normalTop,
      privateTop,
      "The top of the tabs should match between normal and private windows"
    );

    normalWin.maximize();
    privateWin.maximize();

    await waitForWindowLayout(normalWin);
    await waitForWindowLayout(privateWin);

    let normalMaxTop = getTabsTop(normalWin);
    let privateMaxTop = getTabsTop(privateWin);

    is(
      normalMaxTop,
      privateMaxTop,
      "The top of the tabs should match between maximized normal and private windows"
    );

    normalWin.restore();
    privateWin.restore();

    await waitForWindowLayout(normalWin);
    await waitForWindowLayout(privateWin);

    await theme.startup();

    await waitForWindowLayout(normalWin);
    await waitForWindowLayout(privateWin);

    let themedNormalTop = getTabsTop(normalWin);
    let themedPrivateTop = getTabsTop(privateWin);

    is(
      themedNormalTop,
      themedPrivateTop,
      "The top of the tabs should match between themed normal and private windows"
    );

    normalWin.maximize();
    privateWin.maximize();

    await waitForWindowLayout(normalWin);
    await waitForWindowLayout(privateWin);

    let themedNormalMaxTop = getTabsTop(normalWin);
    let themedPrivateMaxTop = getTabsTop(privateWin);

    is(
      themedNormalMaxTop,
      themedPrivateMaxTop,
      "The top of the tabs should match between themed maximized normal and private windows"
    );
  } finally {
    await theme.unload();
    await BrowserTestUtils.closeWindow(privateWin);
    await BrowserTestUtils.closeWindow(normalWin);
  }
});
