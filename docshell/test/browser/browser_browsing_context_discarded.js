"use strict";

const TOPIC = "browsing-context-discarded";

async function observeDiscarded(browsingContexts, callback) {
  let discarded = new Map();

  let promise = BrowserUtils.promiseObserved(TOPIC, (subject, why) => {
    ok(BrowsingContext.isInstance(subject), "subject to be a BrowsingContext");
    discarded.set(subject, why);

    return browsingContexts.every(item => discarded.has(item));
  });
  await callback();
  await promise;

  return discarded;
}

function check_reason(discardedContexts, expected) {
  discardedContexts.forEach((why, browsingContext) => {
    if (expected.has(browsingContext)) {
      is(why, expected.get(browsingContext));
    }
  });
}

add_task(async function toplevelForNewWindow() {
  const win = await BrowserTestUtils.openNewBrowserWindow();
  const browsingContext = win.gBrowser.selectedBrowser.browsingContext;

  const expected = new Map([
    [win.browsingContext, "discard"],
    [browsingContext, "discard"],
  ]);

  const discarded = await observeDiscarded([...expected.keys()], async () => {
    await BrowserTestUtils.closeWindow(win);
  });

  check_reason(discarded, expected);
});

add_task(async function toplevelForNewTab() {
  const tab = await BrowserTestUtils.openNewForegroundTab(gBrowser);
  const browsingContext = tab.linkedBrowser.browsingContext;

  const expected = new Map([[browsingContext, "discard"]]);

  const discarded = await observeDiscarded([...expected.keys()], () => {
    BrowserTestUtils.removeTab(tab);
  });

  ok(
    !discarded.has(window.browsingContext),
    "no notification for the current window's chrome browsing context"
  );

  check_reason(discarded, expected);
});

add_task(async function subframe() {
  const tab = await BrowserTestUtils.openNewForegroundTab(gBrowser);
  const frameBrowsingContext = await SpecialPowers.spawn(
    tab.linkedBrowser,
    [],
    () => {
      const iframe = content.document.createElement("iframe");
      iframe.src = "https://example.com/";
      content.document.body.appendChild(iframe);
      return iframe.browsingContext;
    }
  );

  const expected = new Map([[frameBrowsingContext, "discard"]]);

  const discarded = await observeDiscarded([...expected.keys()], async () => {
    await SpecialPowers.spawn(tab.linkedBrowser, [], () => {
      let iframe = content.document.querySelector("iframe");
      iframe.remove();
    });
  });

  ok(
    !discarded.has(tab.linkedBrowser.browsingContext),
    "no notification for toplevel browsing context"
  );
  ok(
    !discarded.has(window.browsingContext),
    "no notification for the current window's chrome browsing context"
  );

  check_reason(discarded, expected);

  BrowserTestUtils.removeTab(tab);
});

add_task(async function replaceToplevel() {
  const tab = await BrowserTestUtils.openNewForegroundTab(gBrowser);

  // Force load about:blank such that BC::HasLoadedNonInitialDocument is true
  // which means it's BFCache eligible and will be replaced
  BrowserTestUtils.startLoadingURIString(tab.linkedBrowser, "about:blank");
  await BrowserTestUtils.browserLoaded(tab.linkedBrowser, {
    wantLoad: "about:blank",
  });

  const browsingContext = tab.linkedBrowser.browsingContext;

  const expected = new Map([[browsingContext, "replace"]]);

  const discarded = await observeDiscarded([...expected.keys()], async () => {
    await SpecialPowers.spawn(tab.linkedBrowser, [], () => {
      content.location = "about:newtab";
    });
  });

  ok(
    !discarded.has(window.browsingContext),
    "no notification for the current window's chrome browsing context"
  );

  check_reason(discarded, expected);

  BrowserTestUtils.removeTab(tab);
});
