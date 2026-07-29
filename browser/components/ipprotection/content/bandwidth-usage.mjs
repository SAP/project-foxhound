/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html } from "chrome://global/content/vendor/lit.all.mjs";
import { MozLitElement } from "chrome://global/content/lit-utils.mjs";
import {
  LINKS,
  BANDWIDTH,
} from "chrome://browser/content/ipprotection/ipprotection-constants.mjs";
import { formatRemainingBandwidth } from "chrome://browser/content/ipprotection/ipprotection-utils.mjs";

/**
 * Element used for displaying VPN bandwidth usage.
 * By default, the element will display a progress bar and numeric text of the
 * available bandwidth. Adding the attribute `numeric` will only display the
 * numeric text of available bandwidth.
 */
export default class BandwidthUsageCustomElement extends MozLitElement {
  static properties = {
    numeric: { type: Boolean, reflect: true },
    remaining: { type: BigInt }, // Remaining bytes available
    max: { type: BigInt }, // Maximum bytes allowed
  };

  static queries = {
    description: "#progress-description",
  };

  get bandwidthPercent() {
    const percent = (100 * this.bandwidthUsed) / this.max;
    if (percent >= 90) {
      return 90;
    } else if (percent >= 75) {
      return 75;
    }
    return Math.floor(percent);
  }

  get remainingMB() {
    return this.remaining / BANDWIDTH.BYTES_IN_MB;
  }

  get remainingGB() {
    return this.remaining / BANDWIDTH.BYTES_IN_GB;
  }

  get maxGB() {
    return this.max / BANDWIDTH.BYTES_IN_GB;
  }

  get bandwidthUsed() {
    return this.max - this.remaining;
  }

  get bandwidthUsedGB() {
    return (this.max - this.remaining) / BANDWIDTH.BYTES_IN_GB;
  }

  get remainingRounded() {
    return formatRemainingBandwidth(this.remaining).value;
  }

  get bandwidthLeftDataL10nId() {
    return formatRemainingBandwidth(this.remaining).useGB
      ? "ip-protection-bandwidth-left-gb"
      : "ip-protection-bandwidth-left-mb";
  }

  get bandwidthLeftThisMonthDataL10nId() {
    return formatRemainingBandwidth(this.remaining).useGB
      ? "ip-protection-bandwidth-left-this-month-gb"
      : "ip-protection-bandwidth-left-this-month-mb";
  }

  constructor() {
    super();
    this.numeric = false;
  }

  progressBarTemplate() {
    if (this.numeric) {
      return null;
    }

    let descriptionText;
    if (this.remaining > 0) {
      descriptionText = html`<span
        id="progress-description"
        data-l10n-id=${this.bandwidthLeftDataL10nId}
        data-l10n-args=${JSON.stringify({
          usageLeft: this.remainingRounded,
          maxUsage: this.maxGB,
        })}
      ></span>`;
    } else {
      descriptionText = html`<span
        id="progress-description"
        data-l10n-id="ip-protection-bandwidth-hit-for-the-month"
        data-l10n-args=${JSON.stringify({
          maxUsage: this.maxGB,
        })}
      ></span>`;
    }

    return html`
      <div class="container">
        <h3
          id="bandwidth-header"
          data-l10n-id="ip-protection-bandwidth-header-1"
        ></h3>
        <div>
          <span
            id="usage-help-text"
            data-l10n-id="ip-protection-bandwidth-help-text"
            data-l10n-args=${JSON.stringify({
              maxUsage: this.maxGB,
            })}
          ></span>
          <a
            is="moz-support-link"
            part="support-link"
            support-page=${LINKS.SUPPORT_SLUG}
          ></a>
        </div>
        <div id="progress-container">
          <progress
            id="progress-bar"
            max=${this.maxGB}
            value=${parseFloat(this.bandwidthUsedGB.toFixed(1))}
            percent=${this.bandwidthPercent}
            aria-labelledby="bandwidth-header"
            aria-describedby="progress-description"
          ></progress>
          <div id="min-progress"></div>
        </div>

        ${descriptionText}
      </div>
    `;
  }

  numericTemplate() {
    if (!this.numeric) {
      return null;
    }

    if (this.remaining > 0) {
      return html`<span
        id="progress-description"
        data-l10n-id=${this.bandwidthLeftThisMonthDataL10nId}
        data-l10n-args=${JSON.stringify({
          usageLeft: this.remainingRounded,
          maxUsage: this.maxGB,
        })}
      ></span>`;
    }

    return html`<span
      id="progress-description"
      data-l10n-id="ip-protection-bandwidth-hit-for-the-month"
      data-l10n-args=${JSON.stringify({
        maxUsage: this.maxGB,
      })}
    ></span>`;
  }

  render() {
    let content = null;
    if (this.numeric) {
      content = this.numericTemplate();
    } else {
      content = this.progressBarTemplate();
    }

    return html`<link
        rel="stylesheet"
        href="chrome://browser/content/ipprotection/bandwidth-usage.css"
      />
      ${content}`;
  }
}
customElements.define("bandwidth-usage", BandwidthUsageCustomElement);
