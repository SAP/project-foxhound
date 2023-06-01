/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

requestLongerTimeout(2);

const permissionError =
  "error: NotAllowedError: The request is not allowed " +
  "by the user agent or the platform in the current context.";

async function requestAudioOutput(options) {
  await Promise.all([
    expectObserverCalled("getUserMedia:request"),
    expectObserverCalled("recording-window-ended"),
    promiseRequestAudioOutput(options),
  ]);
}

async function requestAudioOutputExpectingPrompt(options) {
  await Promise.all([
    promisePopupNotificationShown("webRTC-shareDevices"),
    requestAudioOutput(options),
  ]);

  is(
    PopupNotifications.getNotification("webRTC-shareDevices").anchorID,
    "webRTC-shareSpeaker-notification-icon",
    "anchored to device icon"
  );
  checkDeviceSelectors(["speaker"]);
}

async function requestAudioOutputExpectingDeny(options) {
  await Promise.all([
    requestAudioOutput(options),
    expectObserverCalled("getUserMedia:response:deny"),
    promiseMessage(permissionError),
  ]);
}

async function simulateAudioOutputRequest(options) {
  await SpecialPowers.spawn(
    gBrowser.selectedBrowser,
    [options],
    function simPrompt({ deviceCount, deviceId }) {
      const devices = [...Array(deviceCount).keys()].map(i => ({
        type: "audiooutput",
        rawName: `name ${i}`,
        deviceIndex: i,
        rawId: `rawId ${i}`,
        id: `id ${i}`,
        QueryInterface: ChromeUtils.generateQI([Ci.nsIMediaDevice]),
      }));
      const req = {
        type: "selectaudiooutput",
        windowID: content.windowGlobalChild.outerWindowId,
        devices,
        getConstraints: () => ({}),
        getAudioOutputOptions: () => ({ deviceId }),
        isSecure: true,
        isHandlingUserInput: true,
      };
      const { WebRTCChild } = SpecialPowers.ChromeUtils.import(
        "resource:///actors/WebRTCChild.jsm"
      );
      WebRTCChild.observe(req, "getUserMedia:request");
    }
  );
}

async function allowPrompt() {
  const observerPromise = expectObserverCalled("getUserMedia:response:allow");
  PopupNotifications.panel.firstElementChild.button.click();
  await observerPromise;
}

async function allow() {
  await Promise.all([promiseMessage("ok"), allowPrompt()]);
}

async function denyPrompt() {
  const observerPromise = expectObserverCalled("getUserMedia:response:deny");
  activateSecondaryAction(kActionDeny);
  await observerPromise;
}

async function deny() {
  await Promise.all([promiseMessage(permissionError), denyPrompt()]);
}

async function escapePrompt() {
  const observerPromise = expectObserverCalled("getUserMedia:response:deny");
  EventUtils.synthesizeKey("KEY_Escape");
  await observerPromise;
}

async function escape() {
  await Promise.all([promiseMessage(permissionError), escapePrompt()]);
}

var gTests = [
  {
    desc: 'User clicks "Allow" and revokes',
    run: async function checkAllow() {
      await requestAudioOutputExpectingPrompt();
      await allow();

      info("selectAudioOutput() with no deviceId again should prompt again.");
      await requestAudioOutputExpectingPrompt();
      await allow();

      info("selectAudioOutput() with same deviceId should not prompt again.");
      await Promise.all([
        expectObserverCalled("getUserMedia:response:allow"),
        promiseMessage("ok"),
        requestAudioOutput({ requestSameDevice: true }),
      ]);

      await revokePermission("speaker", true);
      info("Same deviceId should prompt again after revoked permission.");
      await requestAudioOutputExpectingPrompt({ requestSameDevice: true });
      await allow();
      await revokePermission("speaker", true);
    },
  },
  {
    desc: 'User clicks "Not Now"',
    run: async function checkNotNow() {
      await requestAudioOutputExpectingPrompt();
      is(
        PopupNotifications.getNotification("webRTC-shareDevices")
          .secondaryActions[0].label,
        "Not now",
        "first secondary action label"
      );
      await deny();
      info("selectAudioOutput() after Not Now should prompt again.");
      await requestAudioOutputExpectingPrompt();
      await escape();
    },
  },
  {
    desc: 'User presses "Esc"',
    run: async function checkEsc() {
      await requestAudioOutputExpectingPrompt();
      await escape();
      info("selectAudioOutput() after Esc should prompt again.");
      await requestAudioOutputExpectingPrompt();
      await allow();
      await revokePermission("speaker", true);
    },
  },
  {
    desc: 'User clicks "Always Block"',
    run: async function checkAlwaysBlock() {
      await requestAudioOutputExpectingPrompt();
      await Promise.all([
        expectObserverCalled("getUserMedia:response:deny"),
        promiseMessage(permissionError),
        activateSecondaryAction(kActionNever),
      ]);
      info("selectAudioOutput() after Always Block should not prompt again.");
      await requestAudioOutputExpectingDeny();
      await revokePermission("speaker", true);
    },
  },
  {
    desc: "Single Device",
    run: async function checkSingle() {
      await Promise.all([
        promisePopupNotificationShown("webRTC-shareDevices"),
        simulateAudioOutputRequest({ deviceCount: 1 }),
      ]);
      checkDeviceSelectors(["speaker"]);
      await escapePrompt();
    },
  },
  {
    desc: "Multi Device with deviceId",
    run: async function checkMulti() {
      const deviceCount = 4;
      await Promise.all([
        promisePopupNotificationShown("webRTC-shareDevices"),
        simulateAudioOutputRequest({ deviceCount, deviceId: "id 2" }),
      ]);
      const selectorList = document.getElementById(
        `webRTC-selectSpeaker-menulist`
      );
      is(selectorList.selectedIndex, 2, "pre-selected index");
      checkDeviceSelectors(["speaker"]);
      await allowPrompt();

      info("Expect same-device request allowed without prompt");
      await Promise.all([
        expectObserverCalled("getUserMedia:response:allow"),
        simulateAudioOutputRequest({ deviceCount, deviceId: "id 2" }),
      ]);

      info("Expect prompt for different-device request");
      await Promise.all([
        promisePopupNotificationShown("webRTC-shareDevices"),
        simulateAudioOutputRequest({ deviceCount, deviceId: "id 1" }),
      ]);
      await denyPrompt();

      info("Expect prompt again for denied-device request");
      await Promise.all([
        promisePopupNotificationShown("webRTC-shareDevices"),
        simulateAudioOutputRequest({ deviceCount, deviceId: "id 1" }),
      ]);
      await escapePrompt();

      await revokePermission("speaker", true);
    },
  },
  {
    desc: "SitePermissions speaker block",
    run: async function checkPermissionsBlock() {
      SitePermissions.setForPrincipal(
        gBrowser.contentPrincipal,
        "speaker",
        SitePermissions.BLOCK
      );
      await requestAudioOutputExpectingDeny();
      SitePermissions.removeFromPrincipal(gBrowser.contentPrincipal, "speaker");
    },
  },
];

add_task(async function test() {
  await SpecialPowers.pushPrefEnv({ set: [["media.setsinkid.enabled", true]] });
  await runTests(gTests);
});
