/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @ts-check

/**
 * @import { GetTextOptions, GetDOMOptions, CanvasSnapshot, ExtractionResult } from './PageExtractor.d.ts'
 * @import { PageExtractorParent } from './PageExtractorParent.sys.mjs'
 */

/**
 * We wait for the page to be ready before extracting content headlessly. It's hard
 * to know when a page is "ready", however the strategy here is to wait for
 * DOMContentLoaded, and then a requestIdleCallback. This way the page has time
 * to do an initial amount of work. However, if we wait too long, it will be felt by
 * the user as lag. To mitigate this, wait for at least 2 seconds for the page to settle.
 */
const MAX_REQUEST_IDLE_CALLBACK_DELAY_MS = 2000;

import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";

const lazy = XPCOMUtils.declareLazy({
  console: () =>
    console.createInstance({
      prefix: "PageExtractorChild",
      maxLogLevelPref: "browser.ml.logLevel",
    }),
  ReaderMode: "moz-src:///toolkit/components/reader/ReaderMode.sys.mjs",
  extractTextFromDOM:
    "moz-src:///toolkit/components/pageextractor/DOMExtractor.sys.mjs",
  isProbablyReaderable: "resource://gre/modules/Readerable.sys.mjs",
});

/** @type {ExtractionResult} */
const EMPTY_EXTRACTION_RESULT = { text: "", links: [], canvasSnapshots: [] };

/**
 * Extract a variety of content from pages for use in a smart window.
 */
export class PageExtractorChild extends JSWindowActorChild {
  /**
   * Route the messages coming from the parent process.
   *
   * @param {object} message
   * @param {string} message.name
   * @param {any} message.data
   *
   * @returns {Promise<unknown>}
   */
  async receiveMessage({ name, data }) {
    switch (name) {
      case "PageExtractorParent:GetReaderModeContent":
        if (this.isAboutReader()) {
          const text = this.getAboutReaderContent();
          return { text: text ?? "", links: [], canvasSnapshots: [] };
        }
        return this.getReaderModeContent(data);
      case "PageExtractorParent:GetText":
        if (this.isAboutReader()) {
          const text = this.getAboutReaderContent();
          return {
            text: text ?? "",
            links: [],
            canvasSnapshots: [],
          };
        }
        return this.getText(data);
      case "PageExtractorParent:WaitForPageReady":
        return this.waitForPageReady();
    }
    return Promise.reject(new Error("Unknown message: " + name));
  }

  /**
   * This function resolves once the page is ready after a requestIdleCallback.
   *
   * @returns {Promise<void>}
   */
  async waitForPageReady() {
    return new Promise(resolve => {
      const waitForIdle = () => {
        this.document.ownerGlobal.requestIdleCallback(() => resolve(), {
          timeout: MAX_REQUEST_IDLE_CALLBACK_DELAY_MS,
        });
      };

      if (this.document.readyState == "loading") {
        this.document.addEventListener("DOMContentLoaded", waitForIdle);
      } else {
        lazy.console.log("The page is already interactive");
        waitForIdle();
      }
    });
  }

  /**
   * @see PageExtractorParent#getReaderModeContent for docs
   *
   * @param {boolean} force
   * @returns {Promise<ExtractionResult>}
   */
  async getReaderModeContent(force) {
    const window = this.browsingContext?.window;
    const document = window?.document;

    if (!force && (!document || !lazy.isProbablyReaderable(document))) {
      return EMPTY_EXTRACTION_RESULT;
    }

    if (!document) {
      return EMPTY_EXTRACTION_RESULT;
    }

    const article = await lazy.ReaderMode.parseDocument(document);
    if (!article) {
      return EMPTY_EXTRACTION_RESULT;
    }

    let text = (article?.textContent || "")
      .trim()
      // Replace duplicate whitespace with either a single newline or space
      .replace(/(\s*\n\s*)|\s{2,}/g, (_, newline) => (newline ? "\n" : " "));

    if (article.title) {
      text = article.title + "\n\n" + text;
    }
    lazy.console.log("GetReaderModeContent", { force });
    lazy.console.debug(text);

    return { text, links: [], canvasSnapshots: [] };
  }

  /**
   * @see PageExtractorParent#getText for docs
   *
   * @param {GetTextOptions} options
   * @returns {Promise<ExtractionResult>}
   */
  async getText(options = {}) {
    const window = this.browsingContext?.window;
    const document = window?.document;

    if (!document) {
      return EMPTY_EXTRACTION_RESULT;
    }

    const { text, links, canvases } = lazy.extractTextFromDOM(
      document,
      options
    );

    let canvasSnapshots = [];
    if (options.includeCanvasSnapshots && canvases.length) {
      canvasSnapshots = await this.#captureCanvases(canvases, options);
    }

    lazy.console.log("GetText", options);
    lazy.console.debug({ text, links, canvasSnapshots });

    return { text, links, canvasSnapshots };
  }

  /**
   * Special case extracting text from Reader Mode. The original article content is not
   * retained once reader mode is activated. It is rendered out to the page. Rather
   * than cache an additional copy of the article, just extract the text from the
   * actual reader mode DOM.
   *
   * @returns {string | null}
   */
  getAboutReaderContent() {
    lazy.console.log("Using special text extraction strategy for about:reader");
    const document = this.manager.contentWindow.document;

    if (!document) {
      return null;
    }
    /** @type {HTMLElement?} */
    const titleEl = document.querySelector(".reader-title");
    /** @type {HTMLElement?} */
    const contentEl = document.querySelector(".moz-reader-content");

    const title = titleEl?.innerText;
    const content = contentEl?.innerText;
    if (!title && !content) {
      return null;
    }

    if (title) {
      return `${title}\n\n${content}`.trim();
    }
    return content.trim();
  }

  /**
   * Checks if about:reader is loaded, which requires special handling.
   *
   * @returns {boolean}
   */
  isAboutReader() {
    // Accessing the documentURIObject in this way does not materialize the
    // `window.location.href` and should be a cheaper check here.
    let url = this.manager.contentWindow.document.documentURIObject;
    return url.schemeIs("about") && url.pathQueryRef.startsWith("reader?");
  }

  /**
   * Capture canvas elements as WebP blobs. WebP is chosen for its superior
   * compression-to-quality ratio compared to PNG/JPEG, reducing the data sent
   * to language models while preserving visual fidelity.
   *
   * @param {HTMLCanvasElement[]} canvases
   * @param {GetTextOptions} options
   * @returns {Promise<CanvasSnapshot[]>}
   */
  async #captureCanvases(canvases, options) {
    const maxDimension = options.maxCanvasDimension ?? 1024;
    const quality = options.canvasQuality ?? 0.8;
    const window = this.browsingContext?.window;

    if (!window) {
      return [];
    }

    const results = await Promise.all(
      canvases.map(c => this.#captureCanvas(c, maxDimension, quality, window))
    );
    return results.filter(Boolean);
  }

  /**
   * Capture a canvas element as a WebP blob. Uses OffscreenCanvas to avoid
   * blocking the main thread during scaling and blob conversion. ImageBitmap
   * is used as the source to efficiently transfer pixel data from the
   * original canvas.
   *
   * @param {HTMLCanvasElement} canvas
   * @param {number} maxDimension
   * @param {number} quality
   * @param {Window} window
   * @returns {Promise<CanvasSnapshot | null>}
   */
  async #captureCanvas(canvas, maxDimension, quality, window) {
    const { width: originalWidth, height: originalHeight } = canvas;

    try {
      const bitmap = await window.createImageBitmap(canvas);

      const scale = Math.min(
        1,
        maxDimension / Math.max(originalWidth, originalHeight)
      );
      const targetWidth = Math.floor(originalWidth * scale);
      const targetHeight = Math.floor(originalHeight * scale);

      const offscreen = new window.OffscreenCanvas(targetWidth, targetHeight);
      // Alpha is enabled to preserve transparency in canvases that use it.
      // willReadFrequently is false because we only draw and convert to blob,
      // never reading pixels back, so hardware acceleration is preferred.
      const ctx = offscreen.getContext("2d", {
        alpha: true,
        willReadFrequently: false,
      });

      ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
      bitmap.close();

      let blob;
      try {
        blob = await offscreen.convertToBlob({
          type: "image/webp",
          quality,
        });
      } catch (securityError) {
        // Tainted canvas fall back to original canvas toBlob which works
        blob = await new Promise((resolve, reject) => {
          canvas.toBlob(
            b => (b ? resolve(b) : reject(new Error("toBlob failed"))),
            "image/webp",
            quality
          );
        });

        return {
          blob,
          width: originalWidth,
          height: originalHeight,
        };
      }

      return {
        blob,
        width: targetWidth,
        height: targetHeight,
      };
    } catch (error) {
      lazy.console.debug?.("Canvas capture failed:", error);
      return null;
    }
  }
}
