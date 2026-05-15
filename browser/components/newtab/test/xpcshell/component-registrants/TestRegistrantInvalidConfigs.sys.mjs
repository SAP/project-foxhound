/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

import { BaseAboutNewTabComponentRegistrant } from "moz-src:///browser/components/newtab/AboutNewTabComponents.sys.mjs";

export class TestRegistrantInvalidConfigs extends BaseAboutNewTabComponentRegistrant {
  getComponents() {
    return [{}, { type: "" }, { type: null }];
  }
}
