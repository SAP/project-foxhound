/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { AppConstants } from "resource://gre/modules/AppConstants.sys.mjs";

const PDF_HEADER = "%PDF-";

let ShellService = null;
try {
  ({ ShellService } = ChromeUtils.importESModule(
    // eslint-disable-next-line mozilla/no-browser-refs-in-toolkit
    "moz-src:///browser/components/shell/ShellService.sys.mjs"
  ));
} catch {}

export class AboutPDFParent extends JSWindowActorParent {
  receiveMessage(message) {
    switch (message.name) {
      case "AboutPDF:CanSetDefaultPDFHandler":
        return this.#canSetDefaultPDFHandler();
      case "AboutPDF:OpenFile":
        return this.#openFile(message.data?.fileURL);
      case "AboutPDF:SetDefaultPDFHandler":
        return this.#setDefaultPDFHandler();
    }

    return undefined;
  }

  #canSetDefaultPDFHandler() {
    if (!ShellService || AppConstants.platform != "win") {
      return false;
    }

    try {
      return !ShellService.isDefaultHandlerFor(".pdf");
    } catch {
      return false;
    }
  }

  async #openFile(fileURL) {
    if (typeof fileURL !== "string") {
      throw new Error("Expected a file URL");
    }

    let uri = Services.io.newURI(fileURL);
    if (!uri.schemeIs("file")) {
      throw new Error("Expected a file URL");
    }

    let nsFile = uri.QueryInterface(Ci.nsIFileURL).file;
    if (!nsFile.leafName.toLowerCase().endsWith(".pdf")) {
      throw new Error("Expected a PDF file URL");
    }
    if (!nsFile.exists() || !nsFile.isFile()) {
      throw new Error("Expected an existing PDF file");
    }
    let file = await File.createFromNsIFile(nsFile);
    if (!(await this.#looksLikePDF(file))) {
      throw new Error("Expected PDF content");
    }

    this.browsingContext.top.loadURI(uri, {
      triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal(),
    });
  }

  async #setDefaultPDFHandler() {
    if (!this.#canSetDefaultPDFHandler()) {
      return;
    }

    await ShellService.setAsDefaultPDFHandler();
  }

  async #looksLikePDF(file) {
    return (await file.slice(0, PDF_HEADER.length).text()) === PDF_HEADER;
  }
}
