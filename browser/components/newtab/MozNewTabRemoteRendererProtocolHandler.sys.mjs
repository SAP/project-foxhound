/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  E10SUtils: "resource://gre/modules/E10SUtils.sys.mjs",
});

const MOZ_NEWTAB_REMOTE_RENDERER_SCHEME = "moz-newtab-remote-renderer";

export class MozNewTabRemoteRendererProtocolHandler {
  #getActor(loadInfo) {
    try {
      const browsingContext = loadInfo.browsingContext;
      const globalChild = browsingContext.window.windowGlobalChild;
      return globalChild.getActor("MozNewTabRemoteRendererProtocol");
    } catch (e) {
      return null;
    }
  }

  /**
   * The protocol scheme handled by this handler.
   */
  scheme = MOZ_NEWTAB_REMOTE_RENDERER_SCHEME;

  /**
   * Determines whether a given port is allowed for this protocol.
   *
   * @param {number} _port
   *   The port number to check.
   * @param {string} _scheme
   *   The protocol scheme.
   * @returns {boolean}
   *   Always false as this protocol doesn't use ports.
   */
  allowPort(_port, _scheme) {
    return false;
  }

  /**
   * Creates a new channel for handling moz-newtab-remote-renderer:// URLs.
   *
   * @param {nsIURI} uri
   *   The URI to create a channel for.
   * @param {nsILoadInfo} loadInfo
   *   Load information containing security context.
   * @returns {MozCachedOHTTPChannel}
   *   A new channel instance.
   * @throws {Components.Exception}
   *   If the request is not from a valid context
   */
  newChannel(uri, loadInfo) {
    // Check if we're in a privileged about content process
    if (
      Services.appinfo.remoteType === lazy.E10SUtils.PRIVILEGEDABOUT_REMOTE_TYPE
    ) {
      const innerChannel = Cc["@mozilla.org/network/input-stream-channel;1"]
        .createInstance(Ci.nsIInputStreamChannel)
        .QueryInterface(Ci.nsIChannel);
      innerChannel.loadInfo = loadInfo;
      innerChannel.setURI(uri);

      let suspendedChannel =
        Services.io.newSuspendableChannelWrapper(innerChannel);
      suspendedChannel.suspend();

      Promise.resolve()
        .then(() => {
          const actor = this.#getActor(loadInfo);
          if (!actor) {
            throw Components.Exception(
              `${MOZ_NEWTAB_REMOTE_RENDERER_SCHEME} protocol window actor pair not registered`,
              Cr.NS_ERROR_NOT_AVAILABLE
            );
          }

          return actor.sendQuery("GetInputStream", {
            uriString: uri.spec,
          });
        })
        .then(result => {
          if (result.success) {
            innerChannel.contentStream = result.inputStream;
            innerChannel.contentType = result.contentType;
            suspendedChannel.resume();
          } else {
            innerChannel.cancel(Cr.NS_ERROR_FAILURE);
            suspendedChannel.resume();
          }
        })
        .catch(error => {
          console.error("Failed to get input stream:", error);
          innerChannel.cancel(Cr.NS_ERROR_FAILURE);
          suspendedChannel.resume();
        });
      return suspendedChannel;
    }

    throw Components.Exception(
      `${MOZ_NEWTAB_REMOTE_RENDERER_SCHEME} protocol only accessible from privileged about content`,
      Cr.NS_ERROR_INVALID_ARG
    );
  }

  QueryInterface = ChromeUtils.generateQI(["nsIProtocolHandler"]);
}
