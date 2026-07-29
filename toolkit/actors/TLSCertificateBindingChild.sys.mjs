/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

export class TLSCertificateBindingChild extends JSWindowActorChild {
  #tlsCertificateBindingPromise = undefined;

  constructor() {
    super();
  }

  async receiveMessage(message) {
    if (message.name == "TLSCertificateBinding::Get") {
      this.maybeFetchTLSCertificateBinding();
      return this.#tlsCertificateBindingPromise;
    }
    return undefined;
  }

  maybeFetchTLSCertificateBinding() {
    // `#tlsCertificateBindingPromise` will be undefined if we haven't yet
    // attempted fetching for this document.
    if (this.#tlsCertificateBindingPromise === undefined) {
      this.#tlsCertificateBindingPromise = this.#fetchTLSCertificateBinding();
    }
  }

  async #fetchTLSCertificateBinding() {
    if (this.document.tlsCertificateBindingURI) {
      try {
        let response = await this.contentWindow.fetch(
          this.document.tlsCertificateBindingURI.spec
        );
        if (response.ok) {
          return response.text();
        }
      } catch (e) {
        console.error("Fetching TLS certificate binding failed:", e);
      }
    }
    // If there is no TLS certificate binding URI, or if fetching it failed,
    // return null to indicate that an attempt to fetch it was made.
    return null;
  }
}
