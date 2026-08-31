/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */
"use strict";

const gChromeBaseURL = getRootDirectory(gTestPath);
const gBaseURL = gChromeBaseURL.replace(
  "chrome://mochitests/content",
  "https://example.com"
);

async function synthesizeMouseFromParent(
  aBrowser,
  aOffsetX,
  aOffsetY,
  aAsyncEnabled
) {
  info(
    `synthesizeMouse with asyncEnabled=${aAsyncEnabled} from parent process`
  );

  let haveReceiveMouseEvent = false;
  const onMousemove = event => {
    info(
      `Received mouse event: ${event.type} ${event.offsetX} ${event.offsetY} ${event.button} ${event.buttons}`
    );
    haveReceiveMouseEvent = true;
  };
  aBrowser.addEventListener("mousemove", onMousemove, { once: true });
  await new Promise(resolve => {
    EventUtils.synthesizeMouse(
      aBrowser,
      aOffsetX,
      aOffsetY,
      {
        type: "mousemove",
        asyncEnabled: aAsyncEnabled,
      },
      window,
      () => {
        ok(haveReceiveMouseEvent, "Should have received mouse event");
        aBrowser.removeEventListener("mousemove", onMousemove);
        resolve();
      }
    );
  });
}

add_task(async function synthesizeEventFromParent() {
  async function testSynthesizeWheelFromParent(aBrowser, aAsyncEnabled) {
    info(`Testing synthesizeWheel with asyncEnabled=${aAsyncEnabled}`);

    let haveReceiveWheelEvent = false;
    const onWheel = event => {
      info(
        `Received wheel event: ${event.type} ${event.deltaX} ${event.deltaY} ${event.deltaZ} ${event.deltaMode} ${event.detail}`
      );
      haveReceiveWheelEvent = true;
    };
    aBrowser.addEventListener("wheel", onWheel, { once: true });
    await new Promise(resolve => {
      EventUtils.synthesizeWheel(
        aBrowser,
        10,
        10,
        {
          deltaMode: WheelEvent.DOM_DELTA_LINE,
          deltaY: 1.0,
          asyncEnabled: aAsyncEnabled,
        },
        window,
        () => {
          ok(haveReceiveWheelEvent, "Should have received wheel event");
          aBrowser.removeEventListener("wheel", onWheel);
          resolve();
        }
      );
    });
  }

  async function testSynthesizeMouseFromParent(aBrowser, aAsyncEnabled) {
    info(`Testing synthesizeMouse with asyncEnabled=${aAsyncEnabled}`);

    // Should throw error if the synthesized mouse evet might be coaslesced.
    await new Promise(resolve => {
      try {
        EventUtils.synthesizeMouse(
          aBrowser,
          10,
          10,
          {
            type: "mousemove",
            asyncEnabled: aAsyncEnabled,
            isSynthesized: false,
          },
          window,
          () => {
            ok(false, "callback should not be called");
          }
        );
        ok(false, "synthesizeMouse with  should throw");
      } catch (e) {
        ok(true, `synthesizeMouse should throw error: ${e}`);
      }
      // Wait a bit to ensure the callback is not called.
      SimpleTest.executeSoon(resolve);
    });

    await synthesizeMouseFromParent(aBrowser, 10, 10, aAsyncEnabled);
  }

  async function testSynthesizeTouchFromParent(aBrowser, aAsyncEnabled) {
    info(`Testing synthesizeTouch with asyncEnabled=${aAsyncEnabled}`);

    let haveReceiveTouchEvent = false;
    const onTouchEnd = event => {
      info(`Received touchend event: ${event.type} ${event.touches}`);
      haveReceiveTouchEvent = true;
    };
    aBrowser.addEventListener("touchend", onTouchEnd, { once: true });

    await new Promise(resolve => {
      try {
        EventUtils.synthesizeTouch(
          aBrowser,
          10,
          10,
          { asyncEnabled: aAsyncEnabled },
          window,
          () => {
            ok(haveReceiveTouchEvent, "Should have received touchend event");
            aBrowser.removeEventListener("touchend", onTouchEnd);
            resolve();
          }
        );
        ok(aAsyncEnabled, "synthesizeTouch should not throw");
      } catch (e) {
        ok(!aAsyncEnabled, `synthesizeTouch should throw error: ${e}`);
        aBrowser.removeEventListener("touchend", onTouchEnd);
        SimpleTest.executeSoon(resolve);
      }
    });
  }

  await BrowserTestUtils.withNewTab(
    gBaseURL + "dummy.html",
    async function (browser) {
      await testSynthesizeWheelFromParent(browser, false);
      await testSynthesizeWheelFromParent(browser, true);
      await testSynthesizeMouseFromParent(browser, false);
      await testSynthesizeMouseFromParent(browser, true);
      await testSynthesizeTouchFromParent(browser, false);
      await testSynthesizeTouchFromParent(browser, true);
    }
  );
});

add_task(async function synthesizeEventFromContent() {
  async function testSynthesizeWheelFromContent(aBrowser, aAsyncEnabled) {
    info(`Testing synthesizeWheel with asyncEnabled=${aAsyncEnabled}`);

    await SpecialPowers.spawn(
      aBrowser,
      [aAsyncEnabled],
      async aAsyncEnabled => {
        let haveReceiveWheelEvent = false;
        const onWheel = event => {
          info(
            `Received wheel event: ${event.type} ${event.deltaX} ${event.deltaY} ${event.deltaZ} ${event.deltaMode} ${event.detail}`
          );
          haveReceiveWheelEvent = true;
        };
        content.document.addEventListener("wheel", onWheel, { once: true });
        await new Promise(resolve => {
          try {
            EventUtils.synthesizeWheel(
              content.document.body,
              10,
              10,
              {
                deltaMode: content.WheelEvent.DOM_DELTA_LINE,
                deltaY: 1.0,
                asyncEnabled: aAsyncEnabled,
              },
              content.window,
              () => {
                ok(haveReceiveWheelEvent, "Should have received wheel event");
                content.document.removeEventListener("wheel", onWheel);
                resolve();
              }
            );
            ok(!aAsyncEnabled, "synthesizeWheel should not throw");
          } catch (e) {
            ok(aAsyncEnabled, `synthesizeWheel should throw error: ${e}`);
            content.document.removeEventListener("wheel", onWheel);
            resolve();
          }
        });
      }
    );
  }

  async function testSynthesizeMouseFromContent(aBrowser) {
    info(`Testing synthesizeMouse`);

    await SpecialPowers.spawn(aBrowser, [], async () => {
      try {
        EventUtils.synthesizeMouse(
          content.document.body,
          10,
          10,
          {
            type: "mousemove",
          },
          content.window,
          () => {
            ok(false, "callback should not be called");
          }
        );
        ok(false, "synthesizeMouse should not throw");
      } catch (e) {
        ok(true, `synthesizeMouse should throw error: ${e}`);
      }
    });
  }

  async function testSynthesizeTouchFromContent(aBrowser) {
    info(`Testing synthesizeTouch`);

    await SpecialPowers.spawn(aBrowser, [], async () => {
      try {
        EventUtils.synthesizeTouch(
          content.document.body,
          10,
          10,
          {},
          content.window,
          () => {
            ok(false, "callback should not be called");
          }
        );
        ok(false, "synthesizeTouch should throw error");
      } catch (e) {
        ok(true, `synthesizeTouch throws an error: ${e}`);
      }
    });
  }

  await BrowserTestUtils.withNewTab(
    gBaseURL + "dummy.html",
    async function (browser) {
      await testSynthesizeWheelFromContent(browser, false);
      await testSynthesizeWheelFromContent(browser, true);
      await testSynthesizeMouseFromContent(browser);
      await testSynthesizeTouchFromContent(browser);
    }
  );
});

add_task(async function testCallbackForCrossProcressIframe() {
  const iframeBaseURL = gChromeBaseURL.replace(
    "chrome://mochitests/content",
    "https://example.org/"
  );

  async function synthesizeMouseFromParentAndWait(
    aBrowser,
    aOffsetX,
    aOffsetY,
    aBrowsingContext
  ) {
    let eventPromise = SpecialPowers.spawn(aBrowsingContext, [], async () => {
      await new Promise(resolve => {
        content.document.addEventListener(
          "mousemove",
          () => {
            info("Received mousemove event in the target browsing context");
            resolve();
          },
          { once: true }
        );
      });
    });
    // Enuse the event listener is registered on remote target.
    await SpecialPowers.spawn(aBrowsingContext, [], async () => {
      await new Promise(resolve => {
        SpecialPowers.executeSoon(resolve);
      });
    });

    await Promise.all([
      synthesizeMouseFromParent(aBrowser, aOffsetX, aOffsetY, true),
      eventPromise,
    ]);
  }

  await BrowserTestUtils.withNewTab(
    gBaseURL + "empty.html",
    async function (browser) {
      // Synthesize mouse event to the parent document.
      await synthesizeMouseFromParentAndWait(
        browser,
        10,
        5,
        browser.browsingContext
      );

      // Add an iframe.
      await SpecialPowers.spawn(
        browser,
        [iframeBaseURL + "empty.html"],
        async url => {
          content.document.body.appendChild(
            content.document.createElement("br")
          );
          let iframe = content.document.createElement("iframe");
          iframe.src = url;
          let loadPromise = new Promise(resolve => {
            iframe.addEventListener("load", resolve, { once: true });
          });
          content.document.body.appendChild(iframe);
          await loadPromise;
        }
      );

      // Synthesize mouse event to the iframe document.
      await synthesizeMouseFromParentAndWait(
        browser,
        10,
        35,
        browser.browsingContext.children[0]
      );
    }
  );
});
