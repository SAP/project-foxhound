/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

async function newTabWithPiP(requestOptions = {}) {
  // Create a tab that can use the API (secure context)
  const tab = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    opening: "https://example.com",
    waitForLoad: true,
  });
  const browser = tab.linkedBrowser;

  // Open a document PiP window
  const chromePiPPromise = BrowserTestUtils.waitForNewWindow();
  await SpecialPowers.spawn(browser, [requestOptions], async options => {
    content.document.notifyUserGestureActivation();
    await content.documentPictureInPicture.requestWindow(options);
  });
  const chromePiP = await chromePiPPromise;

  return [tab, chromePiP];
}

// Move pip and wait till content was notified
async function movePiP(chromePiP, { x, y }) {
  const browser = chromePiP.gBrowser.selectedBrowser;

  // Store a promise in content for when it was notified of this move
  await SpecialPowers.spawn(browser, [x, y], async (_x, _y) => {
    const obs = SpecialPowers.Services.obs;
    const topic = "docshell-position-size-changed";
    content.__observerPromise = new Promise(resolve => {
      function notify() {
        if (content.screenX == _x && content.screenY == _y) {
          obs.removeObserver(notify, topic);
          resolve();
        }
      }
      obs.addObserver(notify, topic);
    });
  });

  chromePiP.moveTo(x, y);

  // Wait for the previously created promise
  await SpecialPowers.spawn(browser, [], async () => {
    await content.__observerPromise;
    delete content.__observerPromise;
  });
}
