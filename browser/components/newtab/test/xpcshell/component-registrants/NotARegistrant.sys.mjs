/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

export class NotARegistrant {
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
