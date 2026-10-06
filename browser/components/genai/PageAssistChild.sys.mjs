/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  ReaderMode: "moz-src:///toolkit/components/reader/ReaderMode.sys.mjs",
  Readerable: "resource://gre/modules/Readerable.sys.mjs",
});

/**
 * Represents a child actor for getting page data from the browser.
 */
export class PageAssistChild extends JSWindowActorChild {
  async receiveMessage(message) {
    switch (message.name) {
      case "PageAssist:FetchPageData":
        return this.getPageData();
    }

    //expected a return value.  consistent-return (eslint)
    return undefined;
  }

  /**
   * Fetches and returns page data including URL, title, content, text content, excerpt, and reader mode status.
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
  async getPageData() {
    try {
      const doc = this.contentWindow.document;
      if (
        !lazy.Readerable.shouldCheckUri(doc.documentURIObject) ||
        !lazy.Readerable.isProbablyReaderable(doc)
      ) {
        return {
          url: this.contentWindow.location.href,
          title: doc.title || "",
          content: "",
          textContent: "",
          excerpt: "",
          isReaderable: false,
        };
      }

      const article = await lazy.ReaderMode.parseDocument(doc);

      return {
        url: this.contentWindow.location.href,
        title: article?.title || doc.title || "",
        content: article?.content || "",
        textContent: article?.textContent || doc.body?.innerText || "",
        excerpt: article?.excerpt || "",
        isReaderable: !!article,
      };
    } catch (e) {
      console.error("Error fetching page data:", e);
      return null;
    }
  }
}
