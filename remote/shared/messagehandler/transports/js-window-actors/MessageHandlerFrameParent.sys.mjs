/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  error: "chrome://remote/content/shared/messagehandler/Errors.sys.mjs",
  RootMessageHandlerRegistry:
    "chrome://remote/content/shared/messagehandler/RootMessageHandlerRegistry.sys.mjs",
  WindowGlobalMessageHandler:
    "chrome://remote/content/shared/messagehandler/WindowGlobalMessageHandler.sys.mjs",
});

XPCOMUtils.defineLazyGetter(lazy, "WebDriverError", () => {
  return ChromeUtils.importESModule(
    "chrome://remote/content/shared/webdriver/Errors.sys.mjs"
  ).error.WebDriverError;
});

/**
 * Parent actor for the MessageHandlerFrame JSWindowActor. The
 * MessageHandlerFrame actor is used by FrameTransport to communicate between
 * ROOT MessageHandlers and WINDOW_GLOBAL MessageHandlers.
 */
export class MessageHandlerFrameParent extends JSWindowActorParent {
  async receiveMessage(message) {
    switch (message.name) {
      case "MessageHandlerFrameChild:messageHandlerEvent":
        const { name, contextInfo, data, sessionId } = message.data;
        const [moduleName] = name.split(".");

        // Re-emit the event on the RootMessageHandler.
        const messageHandler = lazy.RootMessageHandlerRegistry.getExistingMessageHandler(
          sessionId
        );
        // TODO: getModuleInstance expects a CommandDestination in theory,
        // but only uses the MessageHandler type in practice, see Bug 1776389.
        const module = messageHandler.moduleCache.getModuleInstance(
          moduleName,
          { type: lazy.WindowGlobalMessageHandler.type }
        );
        let eventPayload = data;

        // Modify an event payload if there is a special method in the targeted module.
        // If present it can be found in windowglobal-in-root module.
        if (module?.interceptEvent) {
          eventPayload = await module.interceptEvent(name, data);

          // Make sure that an event payload is returned.
          if (!eventPayload) {
            throw new Error(
              `${moduleName}.interceptEvent doesn't return the event payload`
            );
          }
        }
        messageHandler.emitEvent(name, eventPayload, contextInfo);

        break;
      default:
        throw new Error("Unsupported message:" + message.name);
    }
  }

  /**
   * Send a command to the corresponding MessageHandlerFrameChild actor via a
   * JSWindowActor query.
   *
   * @param {Command} command
   *     The command to forward. See type definition in MessageHandler.js
   * @param {String} sessionId
   *     ID of the session that sent the command.
   * @return {Promise}
   *     Promise that will resolve with the result of query sent to the
   *     MessageHandlerFrameChild actor.
   */
  async sendCommand(command, sessionId) {
    const result = await this.sendQuery(
      "MessageHandlerFrameParent:sendCommand",
      {
        command,
        sessionId,
      }
    );

    if (result?.error) {
      if (result.isMessageHandlerError) {
        throw lazy.error.MessageHandlerError.fromJSON(result.error);
      }

      // TODO: Do not assume WebDriver is the session protocol, see Bug 1779026.
      throw lazy.WebDriverError.fromJSON(result.error);
    }

    return result;
  }
}
