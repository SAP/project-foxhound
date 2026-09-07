/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/* global ExtensionAPI, ExtensionCommon */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  RemoteSettings: "resource://services-settings/remote-settings.sys.mjs",
  ServiceRequest: "resource://gre/modules/ServiceRequest.sys.mjs",
});

this.remoteSettings = class RemoteSettingsAPI extends ExtensionAPI {
  static COLLECTION = "webcompat-interventions";

  getAPI(context) {
    const EventManager = ExtensionCommon.EventManager;
    const { uuid } = context.extension;
    const missingFilesCache = {};

    async function missingFiles(obj, basePath) {
      if (!obj) {
        return false;
      }
      for (let path of Array.isArray(obj) ? obj : [obj]) {
        path = path.includes("/") ? path : `${basePath}/${path}`;
        if (path in missingFilesCache) {
          if (missingFilesCache[path]) {
            return true;
          }
          continue;
        }
        const url = `moz-extension://${uuid}/${path}`;
        missingFilesCache[path] = await new Promise(done => {
          const req = new lazy.ServiceRequest();
          req.responseType = "text";
          req.onload = () => done(false);
          req.onerror = () => done(true);
          req.open("GET", url);
          req.send();
        });
        if (missingFilesCache[path]) {
          return true;
        }
      }
      return false;
    }

    async function missingFilesInIntervention(desc) {
      for (let intervention of desc.interventions) {
        const { content_scripts } = intervention;
        if (
          (await missingFiles(content_scripts?.js, "injections/js")) ||
          (await missingFiles(content_scripts?.css, "injections/css"))
        ) {
          return true;
        }
      }
      return false;
    }

    async function missingFilesInShim(desc) {
      if (desc.file) {
        if (await missingFiles([desc.file], "shims")) {
          return true;
        }
      }
      if (desc.logos) {
        if (await missingFiles(desc.logos, "shims")) {
          return true;
        }
      }
      const { contentScripts } = desc;
      if (contentScripts) {
        for (let { css, js } of contentScripts) {
          if (await missingFiles(css, "shims")) {
            return true;
          }
          if (await missingFiles(js, "shims")) {
            return true;
          }
        }
      }
      return false;
    }

    async function markMissingFiles(update) {
      if (update?.interventions) {
        for (let desc of Object.values(update.interventions)) {
          desc.isMissingFiles = await missingFilesInIntervention(desc);
        }
      }
      if (update?.shims) {
        for (let desc of Object.values(update.shims)) {
          desc.isMissingFiles = await missingFilesInShim(desc);
        }
      }
      return update;
    }

    return {
      remoteSettings: {
        onRemoteSettingsUpdate: new EventManager({
          context,
          name: "remoteSettings.onRemoteSettingsUpdate",
          register: fire => {
            const callback = ({ data: { current } }) => {
              return markMissingFiles(current[0]).then(update => {
                fire.async(update).catch(() => {}); // ignore Message Manager disconnects
              });
            };
            lazy
              .RemoteSettings(RemoteSettingsAPI.COLLECTION)
              .on("sync", callback);
            return () => {
              lazy
                .RemoteSettings(RemoteSettingsAPI.COLLECTION)
                .off("sync", callback);
            };
          },
        }).api(),
        async get() {
          const current = await lazy
            .RemoteSettings(RemoteSettingsAPI.COLLECTION)
            .get();
          return await markMissingFiles(current[0]);
        },
      },
    };
  }
};
