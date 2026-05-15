/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Type definitions for translations.js
 */

export interface LanguageInfo {
  langTag: string;
  displayName: string;
}

export interface SupportedLanguages {
  sourceLanguages: LanguageInfo[];
  targetLanguages: LanguageInfo[];
}

export interface TranslationsSettingsElements {
  alwaysTranslateLanguagesGroup: HTMLElement;
  alwaysTranslateLanguagesSelect: HTMLSelectElement;
  alwaysTranslateLanguagesButton: HTMLButtonElement;
  alwaysTranslateLanguagesNoneRow: HTMLElement;
  neverTranslateLanguagesGroup: HTMLElement;
  neverTranslateLanguagesSelect: HTMLSelectElement;
  neverTranslateLanguagesButton: HTMLButtonElement;
  neverTranslateLanguagesNoneRow: HTMLElement;
  neverTranslateSitesGroup: HTMLElement;
  neverTranslateSitesRow: HTMLElement;
  neverTranslateSitesNoneRow: HTMLElement;
  downloadLanguagesGroup: HTMLElement;
  downloadLanguagesSelect: HTMLSelectElement;
  downloadLanguagesButton: HTMLButtonElement;
  downloadLanguagesNoneRow: HTMLElement;
}
