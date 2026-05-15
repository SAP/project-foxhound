/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

import { BaseAboutNewTabComponentRegistrant } from "moz-src:///browser/components/newtab/AboutNewTabComponents.sys.mjs";

export class TestRegistrantDuplicateTypes extends BaseAboutNewTabComponentRegistrant {
  getComponents() {
    return [
      {
        type: "SEARCH",
        componentURL: "chrome://test/content/component1.mjs",
        tagName: "test-component-1",
        l10nURLs: [],
      },
      {
        type: "SEARCH",
        componentURL: "chrome://test/content/component2.mjs",
        tagName: "test-component-2",
        l10nURLs: [],
      },
    ];
  }
}
