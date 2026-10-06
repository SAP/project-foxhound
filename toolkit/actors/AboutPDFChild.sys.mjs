/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { RemotePageChild } from "resource://gre/actors/RemotePageChild.sys.mjs";

const PDF_HEADER = "%PDF-";

export class AboutPDFChild extends RemotePageChild {
  actorCreated() {
    super.actorCreated();

    this.exportFunctions([
      "RPMCanSetDefaultPDFHandler",
      "RPMOpenPDFFile",
      "RPMSetDefaultPDFHandler",
    ]);
  }

  RPMCanSetDefaultPDFHandler() {
    return this.wrapPromise(this.sendQuery("AboutPDF:CanSetDefaultPDFHandler"));
  }

  RPMOpenPDFFile(file) {
    return this.wrapPromise(this.#openPDFFile(file));
  }

  RPMSetDefaultPDFHandler() {
    if (!this.contentWindow.navigator.userActivation.isActive) {
      throw new Error("User activation is required");
    }

    return this.wrapPromise(this.sendQuery("AboutPDF:SetDefaultPDFHandler"));
  }

  async #openPDFFile(file) {
    if (
      !file ||
      ChromeUtils.getClassName(file) !== "File" ||
      !file.name?.toLowerCase().endsWith(".pdf") ||
      !file.mozFullPath ||
      !(await this.#looksLikePDF(file))
    ) {
      return false;
    }

    await this.sendQuery("AboutPDF:OpenFile", {
      fileURL: PathUtils.toFileURI(file.mozFullPath),
    });
    return true;
  }

  // Cheap pre-filter so the page can flip to its error state instantly without
  // a round-trip to the parent. The parent re-validates before navigating.
  async #looksLikePDF(file) {
    return (await file.slice(0, PDF_HEADER.length).text()) === PDF_HEADER;
  }
}
