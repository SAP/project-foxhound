/* Copyright 2026 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { AIFeature } from "chrome://global/content/ml/AIFeature.sys.mjs";
import { FEATURES } from "chrome://global/content/ml/EngineProcess.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  MLUninstallService: "chrome://global/content/ml/Utils.sys.mjs",
});

export class PdfJsGuessAltTextFeature extends AIFeature {
  static get engineId() {
    return FEATURES[this.id].engineId;
  }

  /** @inheritdoc */
  static get id() {
    return "pdfjs-alt-text";
  }

  /** @inheritdoc */
  static async enable() {
    // Enable alt-text feature (regardless of method)
    Services.prefs.setBoolPref("pdfjs.enableAltText", true);
    // and enable guessing (ML-based) alt-text feature.
    Services.prefs.setBoolPref("pdfjs.enableGuessAltText", true);
    // Also allow model download.
    Services.prefs.setBoolPref("pdfjs.enableAltTextModelDownload", true);
  }

  /** @inheritdoc */
  static async disable() {
    Services.prefs.setBoolPref("pdfjs.enableGuessAltText", false);
    Services.prefs.setBoolPref("pdfjs.enableAltTextModelDownload", false);
    Services.prefs.setBoolPref("pdfjs.enableAltText", false);
    await this.uninstall();
  }

  static async reset() {
    Services.prefs.clearUserPref("pdfjs.enableGuessAltText");
    Services.prefs.clearUserPref("pdfjs.enableAltTextModelDownload");
    Services.prefs.clearUserPref("pdfjs.enableAltText");
    await this.uninstall();
  }

  static async uninstall() {
    const { engineId } = this;
    await lazy.MLUninstallService.uninstall({
      engineIds: [engineId],
      actor: engineId,
    });
  }

  /** @inheritdoc */
  static get isEnabled() {
    return (
      Services.prefs.getBoolPref("browser.ml.enable", false) &&
      Services.prefs.getBoolPref("pdfjs.enableAltText", false) &&
      Services.prefs.getBoolPref("pdfjs.enableGuessAltText", false) &&
      Services.prefs.getBoolPref("pdfjs.enableAltTextModelDownload", false)
    );
  }

  /** @inheritdoc */
  static get isAllowed() {
    return Services.locale.appLocaleAsBCP47.substring(0, 2) === "en";
  }

  static get isBlocked() {
    return (
      !this.isAllowed ||
      !Services.prefs.getBoolPref("browser.ml.enable", false) ||
      !Services.prefs.getBoolPref("pdfjs.enableAltText", false)
    );
  }

  static get isManagedByPolicy() {
    return Services.prefs.prefIsLocked("pdfjs.enableAltText");
  }
}
