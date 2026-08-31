/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import "@testing-library/jest-dom"; // eslint-disable-line import/no-unassigned-import

globalThis.requestIdleCallback = cb => {
  cb();
  return 0;
};
globalThis.cancelIdleCallback = () => {};

globalThis.IntersectionObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

globalThis.matchMedia = () => ({
  matches: false,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
});

if (globalThis.performance && !globalThis.performance.getEntriesByType) {
  Object.defineProperty(globalThis.performance, "getEntriesByType", {
    writable: true,
    value: () => [],
  });
}
