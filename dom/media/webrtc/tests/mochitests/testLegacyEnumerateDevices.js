/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/*
  This is a modified copy of test_enumerateDevices.html testing the
  enumerateDevices() legacy version and deviceId constraint.
*/

async function mustSucceedWithStream(msg, f) {
  try {
    const stream = await f();
    for (const track of stream.getTracks()) {
      track.stop();
    }
    ok(true, msg + " must succeed");
  } catch (e) {
    is(e.name, null, msg + " must succeed: " + e.message);
  }
}

async function mustFailWith(msg, reason, constraint, f) {
  try {
    await f();
    ok(false, msg + " must fail");
  } catch (e) {
    is(e.name, reason, msg + " must fail: " + e.message);
    if (constraint) {
      is(e.constraint, constraint, msg + " must fail w/correct constraint.");
    }
  }
}

const gUM = c => navigator.mediaDevices.getUserMedia(c);

const kinds = ["videoinput", "audioinput", "audiooutput"];

function validateDevice({ kind, label, deviceId, groupId }) {
  ok(kinds.includes(kind), "Known device kind");
  is(deviceId.length, 44, "deviceId length id as expected for Firefox");
  ok(label.length !== undefined, "Device label: " + label);
  isnot(groupId, "", "groupId must be present.");
}

// Validate enumerated devices before gUM (legacy).

async function testLegacyEnumerateDevices() {
  let devices = await navigator.mediaDevices.enumerateDevices();
  ok(devices.length, "At least one device found");
  const jsoned = JSON.parse(JSON.stringify(devices));
  is(jsoned[0].kind, devices[0].kind, "kind survived serializer");
  is(jsoned[0].deviceId, devices[0].deviceId, "deviceId survived serializer");
  for (const device of devices) {
    validateDevice(device);
    if (device.kind == "audiooutput") {
      continue;
    }
    is(device.label, "", "Device label is empty");
    // Test deviceId constraint
    let deviceId = device.deviceId;
    let constraints =
      device.kind == "videoinput"
        ? { video: { deviceId } }
        : { audio: { deviceId } };
    let namedDevices;
    for (const track of (await gUM(constraints)).getTracks()) {
      is(typeof track.label, "string", "Track label is a string");
      isnot(track.label.length, 0, "Track label is not empty");
      if (!namedDevices) {
        namedDevices = await navigator.mediaDevices.enumerateDevices();
      }
      const namedDevice = namedDevices.find(d => d.deviceId == device.deviceId);
      is(track.label, namedDevice.label, "Track label is the device label");
      track.stop();
    }
  }

  const unknownId = "unknown9qHr8B0JIbcHlbl9xR+jMbZZ8WyoPfpCXPfc=";

  // Check deviceId failure paths for video.

  await mustSucceedWithStream("unknown plain deviceId on video", () =>
    gUM({ video: { deviceId: unknownId } })
  );
  await mustSucceedWithStream("unknown plain deviceId on audio", () =>
    gUM({ audio: { deviceId: unknownId } })
  );
  await mustFailWith(
    "unknown exact deviceId on video",
    "OverconstrainedError",
    "deviceId",
    () => gUM({ video: { deviceId: { exact: unknownId } } })
  );
  await mustFailWith(
    "unknown exact deviceId on audio",
    "OverconstrainedError",
    "deviceId",
    () => gUM({ audio: { deviceId: { exact: unknownId } } })
  );

  // Check that deviceIds are stable for same origin and differ across origins.

  const path =
    "/tests/dom/media/webrtc/tests/mochitests/test_enumerateDevices_iframe_pre_gum.html";
  const origins = ["https://example.com", "https://test1.example.com"];
  info(window.location);

  const haveDevicesMap = new Promise(resolve => {
    const map = new Map();
    window.addEventListener("message", ({ origin, data }) => {
      ok(origins.includes(origin), "Got message from expected origin");
      map.set(origin, JSON.parse(data));
      if (map.size < origins.length) {
        return;
      }
      resolve(map);
    });
  });

  await Promise.all(
    origins.map(origin => {
      const iframe = document.createElement("iframe");
      iframe.src = origin + path;
      iframe.allow = "camera;microphone;speaker-selection";
      info(iframe.src);
      document.documentElement.appendChild(iframe);
      return new Promise(resolve => (iframe.onload = resolve));
    })
  );
  let devicesMap = await haveDevicesMap;
  let [sameOriginDevices, differentOriginDevices] = origins.map(o =>
    devicesMap.get(o)
  );

  is(sameOriginDevices.length, devices.length, "same origin same devices");
  is(
    differentOriginDevices.length,
    devices.length,
    "cross origin same devices"
  );
  [...sameOriginDevices, ...differentOriginDevices].forEach(d =>
    validateDevice(d)
  );

  for (const device of sameOriginDevices) {
    ok(
      devices.find(d => d.deviceId == device.deviceId),
      "Same origin deviceId for " + device.label + " must match"
    );
  }
  for (const device of differentOriginDevices) {
    ok(
      !devices.find(d => d.deviceId == device.deviceId),
      "Different origin deviceId for " + device.label + " must be different"
    );
  }

  // Check the special case of no devices found.
  await pushPrefs(
    ["media.navigator.streams.fake", false],
    ["media.audio_loopback_dev", "none"],
    ["media.video_loopback_dev", "none"]
  );
  devices = await navigator.mediaDevices.enumerateDevices();
  is(devices.length, 0, "No devices");
}
