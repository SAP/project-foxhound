/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

if (navigator.plugins.length) {
  const pluginsArray = [];
  Object.setPrototypeOf(pluginsArray, PluginArray.prototype);
  const navProto = Object.getPrototypeOf(navigator);
  const pluginsDesc = Object.getOwnPropertyDescriptor(navProto, "plugins");
  pluginsDesc.get = () => pluginsArray;
  Object.defineProperty(navProto, "plugins", pluginsDesc);

  window.__webcompat = (window.__webcompat ?? new Set()).add("PluginArray");
}
