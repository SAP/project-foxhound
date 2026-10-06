/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.urlbar.contextMenu.featureGate", true]],
  });

  // Add visits so that it can be autofilled.
  await PlacesTestUtils.addVisits([
    {
      uri: "https://example.com/",
      transition: PlacesUtils.history.TRANSITION_TYPED,
    },
  ]);
  await PlacesFrecencyRecalculator.recalculateAnyOutdatedFrecencies();

  registerCleanupFunction(async () => {
    await PlacesUtils.history.clear();
  });
});

add_task(async function basic() {
  const TEST_CASES = [
    {
      preferences: [["browser.tabs.loadInBackground", true]],
      menuItemLabel: "Open in New Tab",
      expectedTarget: "tab",
      expectedOption: { background: true },
    },
    {
      preferences: [["browser.tabs.loadInBackground", false]],
      menuItemLabel: "Open in New Tab",
      expectedTarget: "tab",
    },
    {
      preferences: [["browser.tabs.loadInBackground", true]],
      menuItemLabel: "Open in New Container Tab",
      subMenuItemLabel: "Personal",
      expectedTarget: "tab",
      expectedOption: { background: true, userContextId: 1 },
    },
    {
      preferences: [["browser.tabs.loadInBackground", false]],
      menuItemLabel: "Open in New Container Tab",
      subMenuItemLabel: "Banking",
      expectedTarget: "tab",
      expectedOption: { userContextId: 3 },
    },
    {
      menuItemLabel: "Open in New Window",
      expectedTarget: "window",
    },
    {
      menuItemLabel: "Open in New Private Window",
      expectedTarget: "window",
      expectedOption: { private: true },
    },
  ];

  for (let {
    preferences = [],
    menuItemLabel,
    subMenuItemLabel,
    expectedTarget,
    expectedOption = {},
  } of TEST_CASES) {
    info(`Test for %{JSON.stringify({ preferences, menuItem, subMenuItem })}`);

    info("Set preferences");
    await SpecialPowers.pushPrefEnv({ set: preferences });

    info("Open urlbar results");
    await UrlbarTestUtils.promiseAutocompleteResultPopup({
      value: "exa",
      window,
      fireInputEvent: true,
    });
    let { element } = await UrlbarTestUtils.getDetailsOfResultAt(window, 0);

    let onSuggestionOpen =
      expectedTarget == "tab"
        ? BrowserTestUtils.waitForNewTab(gBrowser, "https://example.com/")
        : BrowserTestUtils.waitForNewWindow({ url: "https://example.com/" });

    info("Open context menu");
    let row = element.row;
    let contextMenu = document.getElementById("urlbarView-context-menu");
    let onMenuShown = BrowserTestUtils.waitForEvent(document, "popupshown");
    EventUtils.synthesizeMouseAtCenter(row, {
      button: 2,
      type: "mousedown",
    });
    EventUtils.synthesizeMouseAtCenter(row, {
      button: 2,
      type: "contextmenu",
    });
    await onMenuShown;

    info(`Select menu item '${menuItemLabel}'`);
    let menuItem = [...contextMenu.children].find(
      i => i.label == menuItemLabel
    );
    if (subMenuItemLabel) {
      info(`Select sub menu item '${subMenuItemLabel}'`);
      let onSubMenuShown = new Promise(resolve => {
        menuItem.addEventListener("popupshown", resolve);
      });
      menuItem.openMenu(true);
      await onSubMenuShown;

      info(`Select sub menu item '${subMenuItemLabel}'`);
      await BrowserTestUtils.waitForCondition(() =>
        [...menuItem.menupopup.children].find(i => i.label == subMenuItemLabel)
      );
      let subMenuItem = [...menuItem.menupopup.children].find(
        i => i.label == subMenuItemLabel
      );
      menuItem.menupopup.activateItem(subMenuItem, {});
    } else {
      contextMenu.activateItem(menuItem, {});
    }

    let target = await onSuggestionOpen;
    switch (expectedTarget) {
      case "tab": {
        Assert.equal(Cu.getClassName(target, true), "XULElement");
        Assert.equal(target.localName, "tab");
        if (expectedOption.background) {
          Assert.notEqual(target, gBrowser.selectedTab);
        } else {
          await BrowserTestUtils.waitForCondition(
            () => target == gBrowser.selectedTab
          );
          Assert.equal(target, gBrowser.selectedTab);
        }

        if (expectedOption.userContextId) {
          Assert.equal(
            target.getAttribute("usercontextid"),
            expectedOption.userContextId
          );
        } else {
          Assert.ok(!target.hasAttribute("usercontextid"));
        }
        BrowserTestUtils.removeTab(target);
        break;
      }
      case "window": {
        Assert.equal(Cu.getClassName(target, true), "Window");
        Assert.equal(
          PrivateBrowsingUtils.isWindowPrivate(target),
          !!expectedOption.private
        );
        target.close();
        break;
      }
    }
  }

  await PlacesUtils.history.clear();
});

add_task(async function toolbar_context_menu() {
  let TEST_TARGETS = [
    ".searchmode-switcher",
    "#trust-icon-container",
    "#identity-box",
  ];

  await BrowserTestUtils.withNewTab("https://example.com/", async () => {
    for (let target of TEST_TARGETS) {
      info(`Test for ${target}`);
      let element = document.querySelector(target);
      let onPopupShown = BrowserTestUtils.waitForEvent(document, "popupshown");
      EventUtils.synthesizeMouseAtCenter(element, {
        type: "contextmenu",
        button: 2,
      });
      let { target: popup } = await onPopupShown;
      Assert.equal(popup.id, "toolbar-context-menu");
      popup.hidePopup();
    }
  });
});

add_task(async function no_context_menu() {
  let TEST_DATA = [
    {
      featureGate: false,
      target: ".urlbarView-row",
    },
    {
      featureGate: false,
      target: ".urlbar-background",
    },
    {
      featureGate: true,
      target: ".urlbar-background",
    },
  ];

  for (let { featureGate, target } of TEST_DATA) {
    info(`Test for ${JSON.stringify({ featureGate, target })}`);
    await SpecialPowers.pushPrefEnv({
      set: [["browser.urlbar.contextMenu.featureGate", featureGate]],
    });

    await UrlbarTestUtils.promiseAutocompleteResultPopup({
      value: "exa",
      window,
      fireInputEvent: true,
    });

    let onContextMenu = BrowserTestUtils.waitForEvent(window, "contextmenu");
    let popupShown = false;
    let popupListener = () => {
      popupShown = true;
    };
    window.addEventListener("popupshowing", popupListener, true);

    document.querySelector(target).dispatchEvent(
      new PointerEvent("contextmenu", {
        bubbles: true,
        cancelable: true,
        button: 2,
        view: window,
      })
    );

    info("Waiting for context menu");
    let event = await onContextMenu;
    Assert.ok(event.defaultPrevented);

    Assert.ok(!popupShown);
    window.removeEventListener("popupshowing", popupListener, true);

    await SpecialPowers.popPrefEnv();
  }
});
