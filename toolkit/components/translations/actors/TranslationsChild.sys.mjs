/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  TranslationsDocument:
    "chrome://global/content/translations/translations-document.sys.mjs",
  LRUCache:
    "chrome://global/content/translations/translations-document.sys.mjs",
  LanguageDetector:
    "resource://gre/modules/translation/LanguageDetector.sys.mjs",
});

/**
 * This file is extremely sensitive to memory size and performance!
 */
export class TranslationsChild extends JSWindowActorChild {
  /**
   * @type {TranslationsDocument | null}
   */
  #translatedDoc = null;

  /**
   * This cache is shared across TranslationsChild instances. This means
   * that it will be shared across multiple page loads in the same origin.
   * @type {LRUCache | null}
   */
  static #translationsCache = null;

  handleEvent(event) {
    switch (event.type) {
      case "DOMContentLoaded":
        this.sendAsyncMessage("Translations:ReportLangTags", {
          documentElementLang: this.document.documentElement.lang,
        });
        break;
    }
  }

  addProfilerMarker(message) {
    ChromeUtils.addProfilerMarker(
      "TranslationsChild",
      { innerWindowId: this.contentWindow.windowGlobalChild.innerWindowId },
      message
    );
  }

  async receiveMessage({ name, data }) {
    switch (name) {
      case "Translations:TranslatePage": {
        if (this.#translatedDoc?.translator.engineStatus === "error") {
          this.#translatedDoc.destroy();
          this.#translatedDoc = null;
        }

        if (this.#translatedDoc) {
          console.error("This page was already translated.");
          return undefined;
        }

        const { fromLanguage, toLanguage, port, translationsStart } = data;
        if (
          !TranslationsChild.#translationsCache ||
          !TranslationsChild.#translationsCache.matches(
            fromLanguage,
            toLanguage
          )
        ) {
          TranslationsChild.#translationsCache = new lazy.LRUCache(
            fromLanguage,
            toLanguage
          );
        }

        this.#translatedDoc = new lazy.TranslationsDocument(
          this.document,
          fromLanguage,
          toLanguage,
          this.contentWindow.windowGlobalChild.innerWindowId,
          port,
          () => this.sendAsyncMessage("Translations:RequestPort"),
          translationsStart,
          () => this.docShell.now(),
          TranslationsChild.#translationsCache
        );

        return undefined;
      }
      case "Translations:GetDocumentElementLang":
        return this.document.documentElement.lang;
      case "Translations:IdentifyLanguage": {
        // Wait for idle callback as the page will be more settled if it has
        // dynamic content, like on a React app.
        if (this.contentWindow) {
          await new Promise(resolve => {
            this.contentWindow.requestIdleCallback(resolve);
          });
        }

        try {
          return lazy.LanguageDetector.detectLanguageFromDocument(
            this.document
          );
        } catch (error) {
          return null;
        }
      }
      case "Translations:AcquirePort": {
        this.addProfilerMarker("Acquired a port, resuming translations");
        this.#translatedDoc.translator.acquirePort(data.port);
        return undefined;
      }
      default:
        throw new Error("Unknown message.", name);
    }
  }
}
