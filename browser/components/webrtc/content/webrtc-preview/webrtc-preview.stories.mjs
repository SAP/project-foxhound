/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// eslint-disable-next-line import/no-unresolved
import { html } from "lit.all.mjs";
import "chrome://global/content/elements/moz-card.mjs";
import "./webrtc-preview.mjs";

window.MozXULElement.insertFTLIfNeeded("browser/webrtc-preview.ftl");

export default {
  title: "Domain-specific UI Widgets/WebRTC/Preview",
  component: "webrtc-preview",
  argTypes: {
    deviceId: {
      control: "text",
    },
    mediaSource: {
      control: "select",
      options: ["camera", "screen", "window", "browser"],
    },
    showPreviewControlButtons: {
      control: {
        type: "boolean",
      },
    },
  },
};

const Template = (args, context) => {
  // Get deviceId from loaded data if available
  const deviceId = context?.loaded?.deviceId || args.deviceId;

  // If deviceId is not available show an error message.
  if (!deviceId) {
    return html`
      <moz-card style="position: relative; width: 25rem;">
        <div style="padding: 1rem; text-align: center;">
          No device or no permission granted.
        </div>
      </moz-card>
    `;
  }

  const element = html`
    <div style="position: relative; width: 25rem;">
      <webrtc-preview
        .deviceId=${deviceId}
        .mediaSource=${args.mediaSource}
        .showPreviewControlButtons=${args.showPreviewControlButtons}
      ></webrtc-preview>
    </div>
  `;

  return element;
};

const getDeviceId = async () => {
  try {
    // Request device access - this will show the permission prompt / device
    // picker to the user
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      mediaSource: "camera",
    });

    // Get the video track to extract the device ID
    const videoTrack = stream.getVideoTracks()[0];
    const deviceId = videoTrack.getSettings().deviceId;

    // Stop the stream since we only needed it to get the device ID
    stream.getTracks().forEach(track => track.stop());

    return deviceId || "";
  } catch (error) {
    console.warn("Could not get device:", error);
    return "";
  }
};

export const Camera = Template.bind({});
Camera.args = {
  deviceId: "",
  mediaSource: "camera",
  showPreviewControlButtons: true,
};
Camera.loaders = [
  async () => {
    const deviceId = await getDeviceId();
    return { deviceId };
  },
];
Camera.play = async ({ args, loaded }) => {
  args.deviceId = loaded.deviceId;
};
