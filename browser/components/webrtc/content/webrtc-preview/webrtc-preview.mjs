/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html, classMap } from "chrome://global/content/vendor/lit.all.mjs";
import { MozLitElement } from "chrome://global/content/lit-utils.mjs";

const { XPCOMUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/XPCOMUtils.sys.mjs"
);

const lazy = {};
XPCOMUtils.defineLazyPreferenceGetter(
  lazy,
  "testGumDelayMs",
  "privacy.webrtc.preview.testGumDelayMs",
  0
);

window.MozXULElement?.insertFTLIfNeeded("browser/webrtc-preview.ftl");

/**
 * A class to handle a preview of a WebRTC stream.
 */
export class WebRTCPreview extends MozLitElement {
  static properties = {
    // The ID of the device to preview.
    deviceId: String,
    // The media source type to preview.
    mediaSource: String,
    // Whether to show the preview control buttons.
    showPreviewControlButtons: Boolean,

    // Whether the preview is currently active.
    _previewActive: { type: Boolean, state: true },
    _loading: { type: Boolean, state: true },
  };

  static queries = {
    videoEl: "video",
  };

  // The stream object for the preview. Only set when the preview is active.
  #stream = null;
  // AbortController to cancel pending gUM requests when stopping preview.
  #abortController = null;

  constructor() {
    super();

    // By default hide the start preview button.
    this.showPreviewControlButtons = false;

    this._previewActive = false;
    this._loading = false;
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    this.stopPreview();
  }

  /**
   * Start the preview.
   *
   * @param {object} options - The options for the preview.
   * @param {string} [options.deviceId = null] - The device ID of the camera to
   * use. If null the last used device will be used.
   * @param {string} [options.mediaSource = null] - The media source to use. If
   * null the last used media source will be used.
   * @param {boolean} [options.showPreviewControlButtons = null] - Whether to
   * show the preview control buttons. If null the last used value will be used.
   */
  async startPreview({
    deviceId = null,
    mediaSource = null,
    showPreviewControlButtons = null,
  } = {}) {
    // We can only start preview once the element is connected to the DOM and
    // the video element is available.
    // If you run into this error you're calling the preview method too early,
    // or you forgot to add it to the DOM.
    if (!this.isConnected || !this.videoEl) {
      throw new Error("Can not start preview: Not connected yet.");
    }

    if (deviceId != null) {
      this.deviceId = deviceId;
    }
    if (mediaSource != null) {
      this.mediaSource = mediaSource;
    }
    if (showPreviewControlButtons != null) {
      this.showPreviewControlButtons = showPreviewControlButtons;
    }

    if (this.deviceId == null) {
      throw new Error("Missing deviceId");
    }

    // Stop any existing preview.
    this.stopPreview();

    this.#abortController = new AbortController();
    let { signal } = this.#abortController;

    this._loading = true;
    this._previewActive = true;

    // Use the same constraints for both camera and screen share preview.
    let constraints = {
      video: {
        mediaSource: this.mediaSource,
        deviceId: { exact: this.deviceId },
        frameRate: 30,
        width: 854,
        height: 480,
      },
    };

    let stream;

    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (lazy.testGumDelayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, lazy.testGumDelayMs));
      }
    } catch (error) {
      if (signal.aborted) {
        this.#dispatchTestEvent("aborted");
        return;
      }
      this._loading = false;
      if (
        error.name == "OverconstrainedError" &&
        error.constraint == "deviceId"
      ) {
        // Source has disappeared since enumeration, which can happen.
        // No preview.
        this.stopPreview();
        this.#dispatchTestEvent("error");
        return;
      }
      console.error(`error in preview: ${error.message} ${error.constraint}`);
      this.#dispatchTestEvent("error");
      return;
    }

    if (signal.aborted) {
      stream.getTracks().forEach(t => t.stop());
      this.#dispatchTestEvent("aborted");
      return;
    }

    this.videoEl.srcObject = stream;
    this.#stream = stream;
    this.#dispatchTestEvent("success");
  }

  #dispatchTestEvent(result) {
    if (lazy.testGumDelayMs > 0) {
      this.dispatchEvent(
        new CustomEvent("test-preview-complete", { detail: { result } })
      );
    }
  }

  /**
   * Stop the preview.
   */
  stopPreview() {
    // Abort any pending gUM request.
    this.#abortController?.abort();
    this.#abortController = null;

    this._loading = false;

    // Stop any existing playback.
    this.#stream?.getTracks().forEach(t => t.stop());
    this.#stream = null;
    if (this.videoEl) {
      this.videoEl.srcObject = null;
    }

    this._previewActive = false;
  }

  render() {
    return html`
      <link
        rel="stylesheet"
        href="chrome://browser/content/webrtc/webrtc-preview.css"
      />
      <div id="preview-container">
        <video
          autoplay
          tabindex="-1"
          @play=${() => (this._loading = false)}
          class=${classMap({ active: this._previewActive })}
        ></video>
        <moz-button
          id="show-preview-button"
          class="centered"
          data-l10n-id="webrtc-share-preview-button-show"
          @click=${() => this.startPreview()}
          ?hidden=${this.deviceId == null ||
          !this.showPreviewControlButtons ||
          this._previewActive}
        ></moz-button>
        <img
          id="loading-indicator"
          class="centered"
          src="chrome://global/skin/icons/loading.svg"
          alt="Loading"
          ?hidden=${!this._loading}
        />
      </div>
      <moz-button
        id="stop-preview-button"
        data-l10n-id="webrtc-share-preview-button-hide"
        @click=${() => this.stopPreview()}
        ?hidden=${!this.showPreviewControlButtons || !this._previewActive}
      ></moz-button>
    `;
  }
}

customElements.define("webrtc-preview", WebRTCPreview);
