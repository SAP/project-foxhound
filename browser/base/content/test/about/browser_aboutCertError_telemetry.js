/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

requestLongerTimeout(4);

const BAD_CERT = "https://expired.example.com/";
const BAD_STS_CERT =
  "https://badchain.include-subdomains.pinning.example.com:443";

async function checkTelemetryClickEvents(useFelt) {
  info("Loading a bad cert page and verifying telemetry click events arrive.");
  await SpecialPowers.pushPrefEnv({
    set: [["security.certerrors.felt-privacy-v1", useFelt]],
  });

  let oldCanRecord = Services.telemetry.canRecordExtended;
  Services.telemetry.canRecordExtended = true;

  registerCleanupFunction(() => {
    Services.telemetry.canRecordExtended = oldCanRecord;
  });

  // For obvious reasons event telemetry in the content processes updates with
  // the main processs asynchronously, so we need to wait for the main process
  // to catch up through the entire test.

  // There's an arbitrary interval of 2 seconds in which the content
  // processes sync their event data with the parent process, we wait
  // this out to ensure that we clear everything that is left over from
  // previous tests and don't receive random events in the middle of our tests.
  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  await new Promise(c => setTimeout(c, 2000));

  // Clear everything.
  Services.telemetry.clearEvents();
  await TestUtils.waitForCondition(() => {
    let events = Services.telemetry.snapshotEvents(
      Ci.nsITelemetry.DATASET_PRERELEASE_CHANNELS,
      true
    ).content;
    return !events || !events.length;
  });

  for (let useFrame of [false, true]) {
    let recordedObjects = [
      "advanced_button",
      "learn_more_link",
      "error_code_link",
      "clipboard_button_top",
      "clipboard_button_bot",
    ];

    const mapRecordObjectsFelt = {
      advanced_button: "advancedButton",
      learn_more_link: "learnMoreLink",
      error_code_link: "errorCode",
      clipboard_button_top: "copyButtonTop",
      clipboard_button_bot: "copyButtonBot",
      return_button_adv: "returnButton",
      exception_button: "exceptionButton",
    };

    recordedObjects.push("return_button_adv");
    if (!useFrame) {
      recordedObjects.push("exception_button");
    }
    if (!useFelt) {
      recordedObjects.push("return_button_top");
    }

    for (let object of recordedObjects) {
      let tab = await openErrorPage(BAD_CERT, useFrame);
      let browser = tab.linkedBrowser;

      let loadEvents = await TestUtils.waitForCondition(() => {
        let events = Services.telemetry.snapshotEvents(
          Ci.nsITelemetry.DATASET_PRERELEASE_CHANNELS,
          true
        ).content;
        if (events && events.length) {
          events = events.filter(
            e => e[1] == "security.ui.certerror" && e[2] == "load"
          );
          if (
            events.length == 1 &&
            events[0][5].is_frame == useFrame.toString()
          ) {
            return events;
          }
        }
        return null;
      }, "recorded telemetry for the load");

      is(
        loadEvents.length,
        1,
        `recorded telemetry for the load testing ${object}, useFrame: ${useFrame}`
      );

      let bc = browser.browsingContext;
      if (useFrame) {
        bc = bc.children[0];
      }

      await SpecialPowers.spawn(
        bc,
        [object, useFelt, mapRecordObjectsFelt],
        async function (objectId, use_felt, mapFelt) {
          let doc = content.document;

          if (use_felt) {
            const netErrorCard =
              doc.querySelector("net-error-card").wrappedJSObject;
            const advancedButton = netErrorCard.advancedButton;
            if (
              !netErrorCard.advancedContainer &&
              objectId !== "advanced_button"
            ) {
              advancedButton.scrollIntoView(true);
              EventUtils.synthesizeMouseAtCenter(advancedButton, {}, content);

              await ContentTaskUtils.waitForCondition(
                () => netErrorCard.advancedContainer,
                "Advanced section should be rendered for revoked certificate"
              );
            }
            if (
              ["clipboard_button_top", "clipboard_button_bot"].includes(
                objectId
              )
            ) {
              netErrorCard.errorCode.click();
              await ContentTaskUtils.waitForCondition(
                () => netErrorCard[mapFelt[objectId]],
                "Wait for component to render."
              );
            }
            if (objectId === "exception_button") {
              await ContentTaskUtils.waitForCondition(
                () =>
                  netErrorCard.exceptionButton &&
                  !netErrorCard.exceptionButton.disabled,
                "Wait for the exception button to be created."
              );
            }
            const el = netErrorCard[mapFelt[objectId]];
            el.scrollIntoView(true);
            EventUtils.synthesizeMouse(el, 2, 2, {}, content);
          } else {
            await ContentTaskUtils.waitForCondition(
              () => doc.body.classList.contains("certerror"),
              "Wait for certerror to be loaded"
            );
            let domElement = doc.querySelector(
              `[data-telemetry-id='${objectId}']`
            );
            domElement.click();
          }
        }
      );

      let clickEvents = await TestUtils.waitForCondition(() => {
        let events = Services.telemetry.snapshotEvents(
          Ci.nsITelemetry.DATASET_PRERELEASE_CHANNELS,
          true
        ).content;
        if (events && events.length) {
          events = events.filter(
            e =>
              e[1] == "security.ui.certerror" &&
              e[2] == "click" &&
              e[3] == object
          );
          if (
            events.length == 1 &&
            events[0][5].is_frame == useFrame.toString()
          ) {
            return events;
          }
        }
        return null;
      }, "Has captured telemetry events.");

      is(
        clickEvents.length,
        1,
        `recorded telemetry for the click on ${object}, useFrame: ${useFrame}`
      );

      // We opened an extra tab for the SUMO page, need to close it.
      if (object == "learn_more_link") {
        BrowserTestUtils.removeTab(gBrowser.selectedTab);
      }

      if (object == "exception_button") {
        let certOverrideService = Cc[
          "@mozilla.org/security/certoverride;1"
        ].getService(Ci.nsICertOverrideService);
        certOverrideService.clearValidityOverride(
          "expired.example.com",
          -1,
          {}
        );
      }

      BrowserTestUtils.removeTab(gBrowser.selectedTab);
    }
  }
}

add_task(async function runCheckTelemetryClickEvents() {
  for (const useFelt of [true, false]) {
    await checkTelemetryClickEvents(useFelt);
  }
});
