/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

if (window.__REMOTE_RENDERER__) {
  const mount = () => {
    window.AppRenderer.mount(
      document.querySelector("#root"),
      window.__APP_PROPS__
    );
  };

  if (window.__APP_PROPS__) {
    mount();
  }
  addEventListener(
    "NewTab:RendererReady",
    () => {
      mount();
    },
    { once: true }
  );
} else if (window.__FROM_STARTUP_CACHE__ && window.__STARTUP_STATE__) {
  // exported by activity-stream.bundle.js
  window.NewtabRenderUtils.renderCache(window.__STARTUP_STATE__);
} else {
  // exported by activity-stream.bundle.js
  window.NewtabRenderUtils.renderWithoutState();
}
