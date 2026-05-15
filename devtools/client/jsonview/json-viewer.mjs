/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* eslint no-shadow: ["error", { "allow": ["dispatchEvent"] }] */

import ReactDOM from "resource://devtools/client/shared/vendor/react-dom.mjs";
import { createFactories } from "resource://devtools/client/shared/react-utils.mjs";

import MainTabbedAreaClass from "resource://devtools/client/jsonview/components/MainTabbedArea.mjs";
import TreeViewClass from "resource://devtools/client/shared/components/tree/TreeView.mjs";
import { ObjectProvider } from "resource://devtools/client/shared/components/tree/ObjectProvider.mjs";
import { JSON_NUMBER } from "resource://devtools/client/shared/components/reps/reps/constants.mjs";
import { parseJsonLossless } from "resource://devtools/client/shared/components/reps/reps/rep-utils.mjs";
import { createSizeProfile } from "resource://devtools/client/jsonview/json-size-profiler.mjs";

const { MainTabbedArea } = createFactories(MainTabbedAreaClass);

// Send readyState change notification event to the window. It's useful for tests.
JSONView.readyState = "loading";
window.dispatchEvent(new CustomEvent("AppReadyStateChange"));

const AUTO_EXPAND_MAX_SIZE = 100 * 1024;
const AUTO_EXPAND_MAX_LEVEL = 7;
const EXPAND_ALL_MAX_NODES = 100000;
const TABS = {
  JSON: 0,
  RAW_DATA: 1,
  HEADERS: 2,
};

let prettyURL;
let theApp;

// Application state object.
const input = {
  jsonText: JSONView.json,
  jsonPretty: null,
  headers: JSONView.headers,
  activeTab: 0,
  prettified: false,
  expandedNodes: new Set(),
};

/**
 * Recursively walk the tree and expand all nodes including buckets.
 * Similar to TreeViewClass.getExpandedNodes but includes buckets.
 */
function expandAllNodes(data, { maxNodes = Infinity } = {}) {
  const expandedNodes = new Set();

  function walkTree(object, path = "") {
    const children = ObjectProvider.getChildren(object, {
      bucketLargeArrays: true,
    });

    // Check if adding these children would exceed the limit
    if (expandedNodes.size + children.length > maxNodes) {
      // Avoid having children half expanded
      return;
    }

    for (const child of children) {
      const key = ObjectProvider.getKey(child);
      const childPath = TreeViewClass.subPath(path, key);

      // Expand this node
      expandedNodes.add(childPath);

      // Recursively walk children
      if (ObjectProvider.hasChildren(child)) {
        walkTree(child, childPath);
      }
    }
  }

  // Start walking from the root if it's not a primitive
  if (
    data &&
    typeof data === "object" &&
    !(data instanceof Error) &&
    data.type !== JSON_NUMBER
  ) {
    walkTree(data);
  }

  return expandedNodes;
}

/**
 * Recursively walk the tree and expand buckets that contain matches.
 */
function expandBucketsWithMatches(data, searchFilter) {
  const expandedNodes = new Set(input.expandedNodes);

  function walkTree(object, path = "") {
    const children = ObjectProvider.getChildren(object, {
      bucketLargeArrays: true,
    });

    for (const child of children) {
      const key = ObjectProvider.getKey(child);
      const childPath = TreeViewClass.subPath(path, key);

      // Check if this is a bucket
      if (ObjectProvider.getType(child) === "bucket") {
        // Check if any children in the bucket match the filter
        const { object: array, startIndex, endIndex } = child;
        let hasMatch = false;

        for (let i = startIndex; i <= endIndex; i++) {
          const childJson = JSON.stringify(array[i]);
          if (childJson.toLowerCase().includes(searchFilter)) {
            hasMatch = true;
            break;
          }
        }

        if (hasMatch) {
          expandedNodes.add(childPath);
        }
      } else if (ObjectProvider.hasChildren(child)) {
        // Recursively walk non-bucket nodes
        walkTree(child, childPath);
      }
    }
  }

  // Start walking from the root if it's not a primitive
  if (
    data &&
    typeof data === "object" &&
    !(data instanceof Error) &&
    data.type !== JSON_NUMBER
  ) {
    walkTree(data);
  }

  return expandedNodes;
}

/**
 * Application actions/commands. This list implements all commands
 * available for the JSON viewer.
 */
input.actions = {
  onCopyJson() {
    const text = input.prettified ? input.jsonPretty : input.jsonText;
    copyString(text.textContent);
  },

  onSaveJson() {
    if (input.prettified && !prettyURL) {
      prettyURL = URL.createObjectURL(
        new window.Blob([input.jsonPretty.textContent])
      );
    }
    dispatchEvent("save", input.prettified ? prettyURL : null);
  },

  onCopyHeaders() {
    let value = "";
    const isWinNT = document.documentElement.getAttribute("platform") === "win";
    const eol = isWinNT ? "\r\n" : "\n";

    const responseHeaders = input.headers.response;
    for (let i = 0; i < responseHeaders.length; i++) {
      const header = responseHeaders[i];
      value += header.name + ": " + header.value + eol;
    }

    value += eol;

    const requestHeaders = input.headers.request;
    for (let i = 0; i < requestHeaders.length; i++) {
      const header = requestHeaders[i];
      value += header.name + ": " + header.value + eol;
    }

    copyString(value);
  },

  onSearch(value) {
    const expandedNodes = value
      ? expandBucketsWithMatches(input.json, value.toLowerCase())
      : input.expandedNodes;
    theApp.setState({ searchFilter: value, expandedNodes });
  },

  onPrettify() {
    if (input.json instanceof Error) {
      // Cannot prettify invalid JSON
      return;
    }
    if (input.prettified) {
      theApp.setState({ jsonText: input.jsonText });
    } else {
      if (!input.jsonPretty) {
        input.jsonPretty = new Text(
          JSON.stringify(
            input.json,
            (key, value) => {
              if (value?.type === JSON_NUMBER) {
                return JSON.rawJSON(value.source);
              }

              // By default, -0 will be stringified as `0`, so we need to handle it
              if (Object.is(value, -0)) {
                return JSON.rawJSON("-0");
              }

              return value;
            },
            "  "
          )
        );
      }
      theApp.setState({ jsonText: input.jsonPretty });
    }

    input.prettified = !input.prettified;
  },

  onCollapse() {
    input.expandedNodes.clear();
    theApp.forceUpdate();
  },

  onExpand() {
    input.expandedNodes = expandAllNodes(input.json, {
      maxNodes: EXPAND_ALL_MAX_NODES,
    });
    theApp.setState({ expandedNodes: input.expandedNodes });
  },

  async onProfileSize() {
    // Get the raw JSON string
    const jsonString = input.jsonText.textContent;

    // Get profiler URL from preferences and open window immediately
    // to avoid popup blocker (profile creation may take several seconds)
    const origin = JSONView.profilerUrl;
    const profilerURL = origin + "/from-post-message/";
    const profilerWindow = window.open(profilerURL, "_blank");

    if (!profilerWindow) {
      console.error("Failed to open profiler window");
      return;
    }

    // Extract filename from URL
    let filename;
    try {
      const pathname = window.location.pathname;
      const lastSlash = pathname.lastIndexOf("/");
      if (lastSlash !== -1 && lastSlash < pathname.length - 1) {
        filename = decodeURIComponent(pathname.substring(lastSlash + 1));
      }
    } catch (e) {
      // Invalid URL encoding, leave filename undefined
    }

    const profile = createSizeProfile(jsonString, filename);

    // Wait for profiler to be ready and send the profile
    let isReady = false;
    const messageHandler = function (event) {
      if (event.origin !== origin) {
        return;
      }
      if (event.data && event.data.name === "ready:response") {
        window.removeEventListener("message", messageHandler);
        isReady = true;
      }
    };
    window.addEventListener("message", messageHandler);

    // Poll until the profiler window is ready. We need to poll because the
    // postMessage will not be received if we send it before the profiler
    // tab has finished loading.
    while (!isReady) {
      await new Promise(resolve => setTimeout(resolve, 100));
      profilerWindow.postMessage({ name: "ready:request" }, origin);
    }

    profilerWindow.postMessage(
      {
        name: "inject-profile",
        profile,
      },
      origin
    );
  },
};

/**
 * Helper for copying a string to the clipboard.
 *
 * @param {string} string The text to be copied.
 */
function copyString(string) {
  document.addEventListener(
    "copy",
    event => {
      event.clipboardData.setData("text/plain", string);
      event.preventDefault();
    },
    { once: true }
  );

  document.execCommand("copy", false, null);
}

/**
 * Helper for dispatching an event. It's handled in chrome scope.
 *
 * @param {string} type Event detail type
 * @param {object} value Event detail value
 */
function dispatchEvent(type, value) {
  const data = {
    detail: {
      type,
      value,
    },
  };

  const contentMessageEvent = new CustomEvent("contentMessage", data);
  window.dispatchEvent(contentMessageEvent);
}

/**
 * Render the main application component. It's the main tab bar displayed
 * at the top of the window. This component also represents ReacJS root.
 */
const content = document.getElementById("content");
const promise = (async function parseJSON() {
  if (document.readyState == "loading") {
    // If the JSON has not been loaded yet, render the Raw Data tab first.
    input.json = {};
    input.activeTab = TABS.RAW_DATA;
    return new Promise(resolve => {
      document.addEventListener("DOMContentLoaded", resolve, { once: true });
    })
      .then(parseJSON)
      .then(async () => {
        // Now update the state and switch to the JSON tab.
        await appIsReady;
        theApp.setState({
          activeTab: TABS.JSON,
          json: input.json,
          expandedNodes: input.expandedNodes,
        });
      });
  }

  // If the JSON has been loaded, parse it immediately before loading the app.
  const jsonString = input.jsonText.textContent;
  try {
    input.json = parseJsonLossless(jsonString);

    // Expose a clean public API for accessing JSON data from the console
    // This is not tied to internal implementation details
    window.$json = {
      // The parsed JSON data
      get data() {
        return input.json;
      },
      // The original JSON text
      get text() {
        return jsonString;
      },
      // HTTP headers
      get headers() {
        return JSONView.headers;
      },
    };

    // Log a welcome message to the console
    const intro = "font-size: 130%;";
    const bold = "font-family: monospace; font-weight: bold;";
    const reset = "";
    console.log(
      "%cData available from the console:%c\n\n" +
        "%c$json.data%c - The parsed JSON object\n" +
        "%c$json.text%c - The original JSON text\n" +
        "%c$json.headers%c - HTTP request and response headers\n\n" +
        "The JSON Viewer is documented here:\n" +
        "https://firefox-source-docs.mozilla.org/devtools-user/json_viewer/",
      intro,
      reset,
      bold,
      reset,
      bold,
      reset,
      bold,
      reset
    );
  } catch (err) {
    input.json = err;
    // Display the raw data tab for invalid json
    input.activeTab = TABS.RAW_DATA;
  }

  // Expand the document by default if its size isn't bigger than 100KB.
  if (
    !(input.json instanceof Error) &&
    jsonString.length <= AUTO_EXPAND_MAX_SIZE
  ) {
    input.expandedNodes = TreeViewClass.getExpandedNodes(input.json, {
      maxLevel: AUTO_EXPAND_MAX_LEVEL,
    });
  }
  return undefined;
})();

const appIsReady = new Promise(resolve => {
  ReactDOM.render(MainTabbedArea(input), content, function () {
    theApp = this;
    resolve();

    // Send readyState change notification event to the window. Can be useful for
    // tests as well as extensions.
    JSONView.readyState = "interactive";
    window.dispatchEvent(new CustomEvent("AppReadyStateChange"));

    promise.then(() => {
      // Another readyState change notification event.
      JSONView.readyState = "complete";
      window.dispatchEvent(new CustomEvent("AppReadyStateChange"));
    });
  });
});
