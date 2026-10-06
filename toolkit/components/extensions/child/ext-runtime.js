/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

ChromeUtils.defineESModuleGetters(this, {
  ExtensionDocumentId: "resource://gre/modules/ExtensionDocumentId.sys.mjs",
  WebNavigationFrames: "resource://gre/modules/WebNavigationFrames.sys.mjs",
});

const EMBEDDER_ELEMENT_TYPES = [
  "HTMLIFrameElement",
  "HTMLFrameElement",
  "HTMLEmbedElement",
  "HTMLObjectElement",
];

// Common helper for runtime.getDocumentId and runtime.getFrameId.
function getBrowsingContextForTarget(target) {
  let bc = WebNavigationFrames.getBrowsingContextFromWindow(target);
  if (bc) {
    return bc;
  }
  if (
    target &&
    typeof target === "object" &&
    EMBEDDER_ELEMENT_TYPES.includes(Cu.getClassName(target, true))
  ) {
    return target.browsingContext;
  }
  throw new ExtensionUtils.ExtensionError(
    "Invalid argument: target is not a valid window or frame element."
  );
}

/* eslint-disable jsdoc/check-param-names */
/**
 * With optional arguments on both ends, this case is ambiguous:
 *     runtime.sendMessage("string", {} or nullish)
 *
 * Sending a message within the extension is more common than sending
 * an empty object to another extension, so we prefer that conclusion.
 *
 * @param {string?}  [extensionId]
 * @param {any}      message
 * @param {object?}  [options]
 * @param {Function} [callback]
 * @returns {{extensionId: string|null, message: any, callback: Function|null}}
 */
/* eslint-enable jsdoc/check-param-names */
function parseBonkersArgs(...args) {
  let Error = ExtensionUtils.ExtensionError;
  let callback = typeof args[args.length - 1] === "function" && args.pop();

  // We don't support any options anymore, so only an empty object is valid.
  function validOptions(v) {
    return v == null || (typeof v === "object" && !Object.keys(v).length);
  }

  if (args.length === 1 || (args.length === 2 && validOptions(args[1]))) {
    // Interpret as passing null for extensionId (message within extension).
    args.unshift(null);
  }
  let [extensionId, message, options] = args;

  if (!args.length) {
    throw new Error("runtime.sendMessage's message argument is missing");
  } else if (!validOptions(options)) {
    throw new Error("runtime.sendMessage's options argument is invalid");
  } else if (args.length === 4 && args[3] && !callback) {
    throw new Error("runtime.sendMessage's last argument is not a function");
  } else if (args[3] != null || args.length > 4) {
    throw new Error("runtime.sendMessage received too many arguments");
  } else if (extensionId && typeof extensionId !== "string") {
    throw new Error("runtime.sendMessage's extensionId argument is invalid");
  }
  return { extensionId, message, callback };
}

this.runtime = class extends ExtensionAPI {
  getAPI(context) {
    let { extension } = context;

    return {
      runtime: {
        onConnect: context.messenger.onConnect.api(),
        onMessage: context.messenger.onMessage.api(),

        onConnectExternal: context.messenger.onConnectEx.api(),
        onMessageExternal: context.messenger.onMessageEx.api(),

        get onUserScriptConnect() {
          return ExtensionCommon.redefineGetter(
            this,
            "onUserScriptConnect",
            context.messenger.onUserScriptConnect.api()
          );
        },
        get onUserScriptMessage() {
          return ExtensionCommon.redefineGetter(
            this,
            "onUserScriptMessage",
            context.messenger.onUserScriptMessage.api()
          );
        },

        connect(extensionId, options) {
          let name = options?.name ?? "";
          return context.messenger.connect({ name, extensionId });
        },

        sendMessage(...args) {
          let arg = parseBonkersArgs(...args);
          return context.messenger.sendRuntimeMessage(arg);
        },

        connectNative(name) {
          return context.messenger.connect({ name, native: true });
        },

        sendNativeMessage(nativeApp, message) {
          return context.messenger.sendNativeMessage(nativeApp, message);
        },

        get lastError() {
          return context.lastError;
        },

        getManifest() {
          return Cu.cloneInto(extension.manifest, context.cloneScope);
        },

        id: extension.id,

        getURL(url) {
          return extension.getURL(url);
        },

        getDocumentId(target) {
          let bc = getBrowsingContextForTarget(target);
          // currentWindowContext is null when a frame is removed, for example.
          let innerWindowId = bc?.currentWindowContext?.innerWindowId;
          if (!innerWindowId) {
            throw new ExtensionUtils.ExtensionError(
              "Could not determine document for target."
            );
          }
          return ExtensionDocumentId.getDocumentId(innerWindowId);
        },

        getFrameId(target) {
          let bc = getBrowsingContextForTarget(target);
          if (!bc) {
            return -1;
          }
          return WebNavigationFrames.getFrameId(bc);
        },
      },
    };
  }

  getAPIObjectForRequest(context, request) {
    if (request.apiObjectType === "Port") {
      const port = context.messenger.getPortById(request.apiObjectId);
      if (!port) {
        throw new Error(`Port API object not found: ${request}`);
      }
      return port.api;
    }

    throw new Error(`Unexpected apiObjectType: ${request}`);
  }
};
