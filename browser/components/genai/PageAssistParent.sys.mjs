/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * JSWindowActor to pass data between PageAssist singleton and content pages.
 */
export class PageAssistParent extends JSWindowActorParent {
  /**
   * Get page data
   *
   * @returns {Promise<{
   *  url: string,
   *  title: string,
   *  content: string,
   *  textContent: string,
   *  excerpt: string,
   *  isReaderable: boolean
   * } | null>}
   */
  async fetchPageData() {
    return this.sendQuery("PageAssist:FetchPageData");
  }
}
