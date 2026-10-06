/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

if (new WheelEvent("test", { deltaY: 30 }).deltaY == 30) {
  window.__webcompat ??= new Set();

  const proto = WheelEvent.prototype;

  {
    const desc = Object.getOwnPropertyDescriptor(proto, "deltaY");
    const { get } = desc;
    desc.get = function () {
      return get.call(this) / 30;
    };
    Object.defineProperty(proto, "deltaY", desc);
    window.__webcompat.add("WheelEvent.deltaY");
  }

  {
    const desc = Object.getOwnPropertyDescriptor(proto, "wheelDeltaY");
    const { get } = desc;
    desc.get = function () {
      return get.call(this) / -40;
    };
    Object.defineProperty(proto, "wheelDeltaY", desc);
    window.__webcompat.add("WheelEvent.wheelDeltaY");
  }
}
