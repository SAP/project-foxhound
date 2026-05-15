/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const { ColorPickerCommon } = ChromeUtils.importESModule(
  "chrome://global/content/bindings/colorpicker-common.mjs"
);

const EventEmitter = require("resource://devtools/shared/event-emitter.js");
const {
  MultiLocalizationHelper,
} = require("resource://devtools/shared/l10n.js");

loader.lazyRequireGetter(
  this,
  ["getTextProperties", "getContrastRatioAgainstBackground"],
  "resource://devtools/shared/accessibility.js",
  true
);
loader.lazyGetter(this, "ColorPickerBundle", () => {
  return new Localization(["devtools/client/inspector.ftl"], true);
});

const L10N = new MultiLocalizationHelper(
  "devtools/client/locales/accessibility.properties",
  "devtools/client/locales/inspector.properties"
);
const XHTML_NS = "http://www.w3.org/1999/xhtml";

/**
 * Spectrum creates a color picker widget in any container you give it.
 *
 * Simple usage example:
 *
 * const {Spectrum} = require("devtools/client/shared/widgets/Spectrum");
 * let s = new Spectrum(containerElement, [255, 126, 255, 1]);
 * s.on("changed", (rgba, color) => {
 *   console.log("rgba(" + rgba[0] + ", " + rgba[1] + ", " + rgba[2] + ", " +
 *     rgba[3] + ")");
 * });
 * s.show();
 * s.destroy();
 *
 * Note that the color picker is hidden by default and you need to call show to
 * make it appear. This 2 stages initialization helps in cases you are creating
 * the color picker in a parent element that hasn't been appended anywhere yet
 * or that is hidden. Calling show() when the parent element is appended and
 * visible will allow spectrum to correctly initialize its various parts.
 *
 * Fires the following events:
 * - changed : When the user changes the current color
 */
class Spectrum extends ColorPickerCommon {
  constructor(parentEl, rgb) {
    const element = parentEl.ownerDocument.createElement("div");
    // eslint-disable-next-line no-unsanitized/property
    element.innerHTML = `
    <section class="spectrum-color-picker">
      <div class="spectrum-color spectrum-box"
           tabindex="0"
           role="slider"
           aria-describedby="spectrum-dragger">
        <div class="spectrum-sat">
          <div class="spectrum-val">
            <div class="spectrum-dragger" id="spectrum-dragger"></div>
          </div>
        </div>
      </div>
    </section>
    <section class="spectrum-controls">
      <div class="spectrum-color-preview"></div>
      <div class="spectrum-slider-container">
        <div class="spectrum-hue spectrum-box"></div>
        <div class="spectrum-alpha spectrum-checker spectrum-box"></div>
      </div>
    </section>
    <section class="spectrum-color-contrast accessibility-color-contrast">
      <div class="contrast-ratio-header-and-single-ratio">
        <span class="contrast-ratio-label" role="presentation"></span>
        <span class="contrast-value-and-swatch contrast-ratio-single" role="presentation">
          <span class="accessibility-contrast-value"></span>
        </span>
      </div>
      <div class="contrast-ratio-range">
        <span class="contrast-value-and-swatch contrast-ratio-min" role="presentation">
          <span class="accessibility-contrast-value"></span>
        </span>
        <span class="accessibility-color-contrast-separator"></span>
        <span class="contrast-value-and-swatch contrast-ratio-max" role="presentation">
          <span class="accessibility-contrast-value"></span>
        </span>
      </div>
    </section>
  `;
    super(element);
    EventEmitter.decorate(this);

    parentEl.appendChild(this.element);

    // Create the eyedropper.
    const eyedropper = this.document.createElementNS(XHTML_NS, "button");
    eyedropper.id = "eyedropper-button";
    eyedropper.className = "devtools-button";
    eyedropper.style.pointerEvents = "auto";
    eyedropper.setAttribute(
      "aria-label",
      ColorPickerBundle.formatValueSync("colorpicker-tooltip-eyedropper-title")
    );
    this.controls.insertBefore(eyedropper, this.colorPreview);

    // Color contrast
    this.spectrumContrast = this.element.querySelector(
      ".spectrum-color-contrast"
    );
    this.contrastLabel = this.element.querySelector(".contrast-ratio-label");
    [this.contrastValue, this.contrastValueMin, this.contrastValueMax] =
      this.element.querySelectorAll(".accessibility-contrast-value");

    // Create the learn more info button
    const learnMore = this.document.createElementNS(XHTML_NS, "button");
    learnMore.id = "learn-more-button";
    learnMore.className = "learn-more";
    learnMore.title = L10N.getStr("accessibility.learnMore");
    this.element
      .querySelector(".contrast-ratio-header-and-single-ratio")
      .appendChild(learnMore);

    if (rgb) {
      this.rgb = rgb;
      this.updateUI();
    }
  }

  set textProps(style) {
    this._textProps = style
      ? {
          fontSize: style["font-size"].value,
          fontWeight: style["font-weight"].value,
          opacity: style.opacity.value,
        }
      : null;
  }

  set backgroundColorData(colorData) {
    this._backgroundColorData = colorData;
  }

  get backgroundColorData() {
    return this._backgroundColorData;
  }

  get textProps() {
    return this._textProps;
  }

  onChange() {
    this.emit("changed", this.rgb, this.rgbCssString);
  }

  /**
   * Updates the contrast label with appropriate content (i.e. large text indicator
   * if the contrast is calculated for large text, or a base label otherwise)
   *
   * @param  {boolean} isLargeText
   *         True if contrast is calculated for large text.
   */
  updateContrastLabel(isLargeText) {
    if (!isLargeText) {
      this.contrastLabel.textContent = L10N.getStr(
        "accessibility.contrast.ratio.label"
      );
      return;
    }

    const largeTextStr = L10N.getStr("accessibility.contrast.large.text");
    const contrastLabelStr = L10N.getFormatStr(
      "colorPickerTooltip.contrast.large.title",
      largeTextStr
    );

    // Build an array of children nodes for the contrast label element
    const contents = contrastLabelStr
      .split(new RegExp(largeTextStr), 2)
      .map(content => this.document.createTextNode(content));
    const largeTextIndicator = this.document.createElementNS(XHTML_NS, "span");
    largeTextIndicator.className = "accessibility-color-contrast-large-text";
    largeTextIndicator.textContent = largeTextStr;
    largeTextIndicator.title = L10N.getStr(
      "accessibility.contrast.large.title"
    );
    contents.splice(1, 0, largeTextIndicator);

    // Update contrast label
    this.contrastLabel.replaceChildren(...contents);
  }

  /**
   * Updates a contrast value element with the given score, value and swatches.
   *
   * @param  {DOMNode} el
   *         Contrast value element to update.
   * @param  {string} score
   *         Contrast ratio score.
   * @param  {number} value
   *         Contrast ratio value.
   * @param  {Array} backgroundColor
   *         RGBA color array for the background color to show in the swatch.
   */
  updateContrastValueEl(el, score, value, backgroundColor) {
    el.classList.toggle(score, true);
    el.textContent = value.toFixed(2);
    el.title = L10N.getFormatStr(
      `accessibility.contrast.annotation.${score}`,
      L10N.getFormatStr(
        "colorPickerTooltip.contrastAgainstBgTitle",
        `rgba(${backgroundColor})`
      )
    );
    el.parentElement.style.setProperty(
      "--accessibility-contrast-color",
      this.rgbCssString
    );
    el.parentElement.style.setProperty(
      "--accessibility-contrast-bg",
      `rgba(${backgroundColor})`
    );
  }

  /* Calculates the contrast ratio for the currently selected
   * color against a single or range of background colors and displays contrast ratio section
   * components depending on the contrast ratio calculated.
   *
   * Contrast ratio components include:
   *    - contrastLargeTextIndicator: Hidden by default, shown when text has large font
   *                                  size if there is no error in calculation.
   *    - contrastValue(s):           Set to calculated value(s), score(s) and text color on
   *                                  background swatches. Set to error text
   *                                  if there is an error in calculation.
   */
  updateContrast() {
    // Remove additional classes on spectrum contrast, leaving behind only base classes
    this.spectrumContrast.classList.toggle("visible", false);
    this.spectrumContrast.classList.toggle("range", false);
    this.spectrumContrast.classList.toggle("error", false);
    // Assign only base class to all contrastValues, removing any score class
    this.contrastValue.className =
      this.contrastValueMin.className =
      this.contrastValueMax.className =
        "accessibility-contrast-value";

    if (!this.contrastEnabled) {
      return;
    }

    const isRange = this.backgroundColorData.min !== undefined;
    this.spectrumContrast.classList.toggle("visible", true);
    this.spectrumContrast.classList.toggle("range", isRange);

    const colorContrast = getContrastRatio(
      {
        ...this.textProps,
        color: this.rgbCssString,
      },
      this.backgroundColorData
    );

    const {
      value,
      min,
      max,
      score,
      scoreMin,
      scoreMax,
      backgroundColor,
      backgroundColorMin,
      backgroundColorMax,
      isLargeText,
      error,
    } = colorContrast;

    if (error) {
      this.updateContrastLabel(false);
      this.spectrumContrast.classList.toggle("error", true);

      // If current background color is a range, show the error text in the contrast range
      // span. Otherwise, show it in the single contrast span.
      const contrastValEl = isRange
        ? this.contrastValueMin
        : this.contrastValue;
      contrastValEl.textContent = L10N.getStr("accessibility.contrast.error");
      contrastValEl.title = L10N.getStr(
        "accessibility.contrast.annotation.transparent.error"
      );

      return;
    }

    this.updateContrastLabel(isLargeText);
    if (!isRange) {
      this.updateContrastValueEl(
        this.contrastValue,
        score,
        value,
        backgroundColor
      );

      return;
    }

    this.updateContrastValueEl(
      this.contrastValueMin,
      scoreMin,
      min,
      backgroundColorMin
    );
    this.updateContrastValueEl(
      this.contrastValueMax,
      scoreMax,
      max,
      backgroundColorMax
    );
  }

  updateUI() {
    super.updateUI();
    this.updateContrast();
  }

  destroy() {
    super.destroy();
    this.spectrumContrast = null;
    this.contrastValue = this.contrastValueMin = this.contrastValueMax = null;
    this.contrastLabel = null;
  }
}

/**
 * Calculates the contrast ratio for a DOM node's computed style against
 * a given background.
 *
 * @param  {object} computedStyle
 *         The computed style for which we want to calculate the contrast ratio.
 * @param  {object} backgroundColor
 *         Object with one or more of the following properties: value, min, max
 * @return {object}
 *         An object that may contain one or more of the following fields: error,
 *         isLargeText, value, score for contrast.
 */
function getContrastRatio(computedStyle, backgroundColor) {
  const props = getTextProperties(computedStyle);

  if (!props) {
    return {
      error: true,
    };
  }

  return getContrastRatioAgainstBackground(backgroundColor, props);
}

module.exports = Spectrum;
