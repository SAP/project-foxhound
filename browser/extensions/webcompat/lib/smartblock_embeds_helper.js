/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* globals browser exportFunction Sanitizer */

"use strict";

const SMARTBLOCK_EMBED_OBSERVER_TIMEOUT_MS = 10000;

/**
 * Helper library to create shims for Smartblock Embeds
 *
 */
const embedHelperLib = (() => {
  let prevRanShims = new Set();
  let originalEmbedContainers = [];
  let embedPlaceholders = [];
  let modifiedContainers = [];
  let observerTimeout;
  let newEmbedObserver;

  function sendMessageToAddon(message, shimId) {
    return browser.runtime.sendMessage({ message, shimId });
  }

  function addonMessageHandler(message, SHIM_INFO) {
    const { topic, shimId: sendingShimId } = message;
    const { shimId: handlingShimId, scriptURL } = SHIM_INFO;

    // Only react to messages which are targeting this shim.
    if (sendingShimId != handlingShimId) {
      return;
    }

    if (topic === "smartblock:unblock-embed") {
      if (newEmbedObserver) {
        newEmbedObserver.disconnect();
        newEmbedObserver = null;
      }

      if (observerTimeout) {
        clearTimeout(observerTimeout);
        observerTimeout = null;
      }

      // Remove placeholder and restore original containers
      embedPlaceholders.forEach((placeholder, idx) => {
        const modifiedContainer = modifiedContainers[idx];
        const originalContainer = originalEmbedContainers[idx];

        // Replace the modified container with the original
        modifiedContainer.replaceWith(originalContainer);
      });

      // Clear the arrays
      embedPlaceholders = [];
      modifiedContainers = [];
      originalEmbedContainers = [];

      // recreate scripts
      let scriptElement = document.createElement("script");

      // Set the script element's src with the website's principal instead of
      // the content script principal to ensure the tracker script is not loaded
      // via the content script's expanded principal.
      scriptElement.wrappedJSObject.src = scriptURL;
      document.body.appendChild(scriptElement);
    }
  }

  /**
   * Replaces embeds with a SmartBlock Embed placeholder. Optionally takes a list
   * of embeds to replace, otherwise will search for all embeds on the page.
   *
   * @param {HTMLElement[]} embedContainers - Array of elements to replace with placeholders.
   *                                  If the array is empty, this function will search
   *                                  for and replace all embeds on the page.
   *
   * @param {object} SHIM_INFO - Information about the shim wrapped in an object.
   */
  async function createShimPlaceholders(embedContainers, SHIM_INFO) {
    const { shimId, embedSelector, embedLogoURL, isTestShim } = SHIM_INFO;

    // Check if we should show embed content in placeholders.
    // This requires the Sanitizer API (setHTML), available in Firefox 148+.
    const shouldShowEmbedContent = await sendMessageToAddon(
      "shouldShowEmbedContentInPlaceholders",
      shimId
    );

    const [titleString, descriptionString, buttonString] =
      await sendMessageToAddon("smartblockGetFluentString", shimId);

    if (!embedContainers.length) {
      // No containers were passed in, do own search for containers
      embedContainers = document.querySelectorAll(embedSelector);
    }

    embedContainers.forEach(originalContainer => {
      // this string has to be defined within this function to avoid linting errors
      // see: https://github.com/mozilla/eslint-plugin-no-unsanitized/issues/259
      const SMARTBLOCK_PLACEHOLDER_HTML_STRING = `
        <style>
          #smartblock-placeholder-wrapper {
            min-height: 137px;
            min-width: 150px;
            max-height: 225px;
            max-width: 400px;
            padding: 32px 24px;
  
            display: block;
            align-content: center;
            text-align: center;
  
            background-color: light-dark(rgb(255, 255, 255), rgb(28, 27, 34));
            color: light-dark(rgb(43, 42, 51), rgb(251, 251, 254));
  
            border-radius: 8px;
            border: 2px dashed #0250bb;
  
            font-size: 14px;
            line-height: 1.2;
            font-family: system-ui;
          }
  
          #smartblock-placeholder-button {
            min-height: 32px;
            padding: 8px 14px;
  
            border-radius: 4px;
            font-weight: 600;
            border: 0;
  
            /* Colours match light/dark theme from
              https://searchfox.org/mozilla-central/source/browser/themes/addons/light/manifest.json
              https://searchfox.org/mozilla-central/source/browser/themes/addons/dark/manifest.json */
            background-color: light-dark(rgb(0, 97, 224), rgb(0, 221, 255));
            color: light-dark(rgb(251, 251, 254), rgb(43, 42, 51));
          }
  
          #smartblock-placeholder-button:hover {
            /* Colours match light/dark theme from
              https://searchfox.org/mozilla-central/source/browser/themes/addons/light/manifest.json
              https://searchfox.org/mozilla-central/source/browser/themes/addons/dark/manifest.json */
            background-color: light-dark(rgb(2, 80, 187), rgb(128, 235, 255));
          }

          #smartblock-placeholder-button:hover:active {
            /* Colours match light/dark theme from
              https://searchfox.org/mozilla-central/source/browser/themes/addons/light/manifest.json
              https://searchfox.org/mozilla-central/source/browser/themes/addons/dark/manifest.json */
            background-color: light-dark(rgb(5, 62, 148), rgb(170, 242, 255));
          }
  
          #smartblock-placeholder-title {
            margin-block: 14px;
            font-size: 16px;
            font-weight: bold;
          }
  
          #smartblock-placeholder-desc {
            margin-block: 14px;
          }
        </style>
        <div id="smartblock-placeholder-wrapper">
          <img id="smartblock-placeholder-image" width="24" height="24" />
          <p id="smartblock-placeholder-title"></p>
          <p id="smartblock-placeholder-desc"></p>
          <button id="smartblock-placeholder-button"></button>
        </div>`;

      // Create the placeholder inside a shadow dom
      const placeholderDiv = document.createElement("div");

      // Workaround to make sure clicks reach our placeholder button if the site
      // uses pointer capture. See Bug 1966696 for an example.
      disableSetPointerCaptureFor(placeholderDiv);

      if (isTestShim) {
        // Tag the div with a class to make it easily detectable FOR THE TEST SHIM ONLY
        placeholderDiv.classList.add("shimmed-embedded-content");
      }

      const shadowRoot = placeholderDiv.attachShadow({ mode: "closed" });

      shadowRoot.innerHTML = SMARTBLOCK_PLACEHOLDER_HTML_STRING;
      shadowRoot.getElementById("smartblock-placeholder-image").src =
        embedLogoURL;
      shadowRoot.getElementById("smartblock-placeholder-title").textContent =
        titleString;
      shadowRoot.getElementById("smartblock-placeholder-desc").textContent =
        descriptionString;
      shadowRoot.getElementById("smartblock-placeholder-button").textContent =
        buttonString;

      // Wait for user to opt-in.
      shadowRoot
        .getElementById("smartblock-placeholder-button")
        .addEventListener("click", ({ isTrusted }) => {
          if (!isTrusted) {
            return;
          }
          // Send a message to the addon to allow loading tracking resources
          // needed by the embed.
          sendMessageToAddon("embedClicked", shimId);
        });

      // Determine what element to use for replacement
      let replacementElement;

      if (shouldShowEmbedContent) {
        // Extract safe content from the original container
        // Only copy text content and links to avoid any dynamic code
        const safeContentContainer = document.createElement("div");

        // Style the safe content container for better readability
        safeContentContainer.style.cssText = `
          margin-top: 12px;
          padding: 12px;
          background-color: light-dark(rgb(248, 248, 248), rgb(42, 42, 46));
          border-radius: 4px;
          font-size: 14px;
          line-height: 1.5;
          color: light-dark(rgb(43, 42, 51), rgb(251, 251, 254));
          font-family: system-ui, -apple-system, sans-serif;
        `;

        // Use Sanitizer API to safely extract content
        // List all default safe HTML elements EXCEPT <a> and <br> which we want to keep
        // Source: dom/security/sanitizer/SanitizerDefaultConfig.h kDefaultHTMLElements
        // Sanitizer unwraps these elements (replaces them with their children)
        const sanitizer = new Sanitizer({
          replaceWithChildrenElements: [
            "abbr",
            "address",
            "article",
            "aside",
            "b",
            "bdi",
            "bdo",
            "blockquote",
            "body",
            "caption",
            "cite",
            "code",
            "col",
            "colgroup",
            "data",
            "dd",
            "del",
            "dfn",
            "div",
            "dl",
            "dt",
            "em",
            "figcaption",
            "figure",
            "footer",
            "h1",
            "h2",
            "h3",
            "h4",
            "h5",
            "h6",
            "head",
            "header",
            "hgroup",
            "hr",
            "html",
            "i",
            "ins",
            "kbd",
            "li",
            "main",
            "mark",
            "menu",
            "nav",
            "ol",
            "p",
            "pre",
            "q",
            "rp",
            "rt",
            "ruby",
            "s",
            "samp",
            "search",
            "section",
            "small",
            "span",
            "strong",
            "sub",
            "sup",
            "table",
            "tbody",
            "td",
            "tfoot",
            "th",
            "thead",
            "time",
            "title",
            "tr",
            "u",
            "ul",
            "var",
            "wbr",
          ],
        });

        // Create container for sanitized content
        const contentDiv = document.createElement("div");
        contentDiv.setHTML(originalContainer.innerHTML, { sanitizer });

        // Manually filter out non-https URLs from links (prevents data:, blob:, etc.)
        // Sanitizer API handles javascript: URLs, but not data: or blob:
        contentDiv.querySelectorAll("a[href]").forEach(link => {
          try {
            const url = new URL(link.href, document.baseURI);
            if (url.protocol !== "https:") {
              link.removeAttribute("href");
            }
          } catch {
            link.removeAttribute("href");
          }
        });

        // Style remaining links for visibility and add security attributes
        contentDiv.querySelectorAll("a[href]").forEach(link => {
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          link.style.cssText = `
            color: light-dark(rgb(0, 97, 224), rgb(0, 221, 255));
            text-decoration: underline;
            cursor: pointer;
          `;
        });

        // Add explanatory header
        const explanationDiv = document.createElement("div");
        explanationDiv.textContent = "Content from blocked embed:";
        explanationDiv.style.cssText = `
          font-size: 12px;
          font-weight: 600;
          color: light-dark(rgb(91, 91, 102), rgb(191, 191, 201));
          margin-bottom: 8px;
        `;
        safeContentContainer.appendChild(explanationDiv);
        safeContentContainer.appendChild(contentDiv);

        // Create a wrapper to hold both the placeholder and safe content
        const wrapperDiv = document.createElement("div");
        wrapperDiv.appendChild(placeholderDiv);
        wrapperDiv.appendChild(safeContentContainer);

        replacementElement = wrapperDiv;
      } else {
        // Sanitizer API not available, just use the placeholder without embed content
        replacementElement = placeholderDiv;
      }

      // Save references for later restoration
      embedPlaceholders.push(replacementElement);
      modifiedContainers.push(replacementElement);
      originalEmbedContainers.push(originalContainer);

      // Replace the original container with our replacement element
      originalContainer.replaceWith(replacementElement);

      sendMessageToAddon("smartblockEmbedReplaced", shimId);
    });

    if (isTestShim) {
      // Dispatch event to signal that the script is done replacing FOR TEST SHIM ONLY
      const finishedEvent = new CustomEvent("smartblockEmbedScriptFinished", {
        bubbles: true,
        composed: true,
      });
      window.dispatchEvent(finishedEvent);
    }
  }

  /**
   * Creates a mutation observer to observe new changes after page load to monitor for
   * new embeds.
   *
   * @param {object} SHIM_INFO - Information about the shim wrapped in an object.
   */
  function createEmbedMutationObserver(SHIM_INFO) {
    const { embedSelector } = SHIM_INFO;

    // Monitor for new embeds being added after page load so we can replace them
    // with placeholders.
    newEmbedObserver = new MutationObserver(mutations => {
      for (let { addedNodes, target, type } of mutations) {
        const nodes = type === "attributes" ? [target] : addedNodes;
        for (const node of nodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) {
            // node is not an element, skip
            continue;
          }
          if (node.matches(embedSelector)) {
            // If element is an embed, replace with placeholder
            createShimPlaceholders([node], SHIM_INFO);
          } else {
            // If element is not an embed, check if any children are
            // and replace if needed
            let maybeEmbedNodeList = node.querySelectorAll?.(embedSelector);
            if (maybeEmbedNodeList) {
              createShimPlaceholders(maybeEmbedNodeList, SHIM_INFO);
            }
          }
        }
      }
    });

    newEmbedObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["id", "class"],
    });

    // Disconnect the mutation observer after a fixed (long) timeout to conserve resources.
    observerTimeout = setTimeout(() => {
      if (newEmbedObserver) {
        newEmbedObserver.disconnect();
      }
    }, SMARTBLOCK_EMBED_OBSERVER_TIMEOUT_MS);
  }

  /**
   * Disables the setPointerCapture method for a given element to prevent
   * pointer capture issues.
   *
   * @param {HTMLElement} el - The element to disable setPointerCapture for.
   */
  function disableSetPointerCaptureFor(el) {
    const pageEl = el.wrappedJSObject;

    Object.defineProperty(pageEl, "setPointerCapture", {
      configurable: true,
      writable: true,
      enumerable: false,
      // no-op ONLY for this element
      value: exportFunction(function (_pointerId) {
        console.warn(
          "Blocked setPointerCapture on SmartBlock embed placeholder.",
          this,
          _pointerId
        );
        // swallow
      }, window),
    });
  }

  /**
   * Initializes a smartblock embeds shim on the page.
   *
   * @param {object} SHIM_INFO - Information about the shim wrapped in an object.
   */
  function initEmbedShim(SHIM_INFO) {
    let { shimId } = SHIM_INFO;

    if (prevRanShims.has(shimId)) {
      // we should not init shims twice
      return;
    }

    prevRanShims.add(shimId);

    // Listen for messages from the background script.
    browser.runtime.onMessage.addListener(request => {
      addonMessageHandler(request, SHIM_INFO);
    });

    // Listen for page changes in case of new embeds
    createEmbedMutationObserver(SHIM_INFO);

    // Run placeholder creation
    createShimPlaceholders([], SHIM_INFO);
  }

  return {
    initEmbedShim,
  };
})();
