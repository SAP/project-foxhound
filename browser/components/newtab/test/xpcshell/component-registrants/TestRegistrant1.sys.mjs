/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

import { BaseAboutNewTabComponentRegistrant } from "moz-src:///browser/components/newtab/AboutNewTabComponents.sys.mjs";

export class TestRegistrant1 extends BaseAboutNewTabComponentRegistrant {
  getComponents() {
    return [
      {
        type: "SEARCH",
        componentURL: "chrome://test/content/component.mjs",
        tagName: "test-component",
        l10nURLs: [],
      },
    ];
  }
}
