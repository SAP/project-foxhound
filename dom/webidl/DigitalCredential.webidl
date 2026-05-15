/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * The origin of this IDL file is
 * https://w3c-fedid.github.io/digital-credentials/
 */

dictionary DigitalCredentialRequestOptions {
  required sequence<DigitalCredentialGetRequest> requests;
};

dictionary DigitalCredentialGetRequest {
  required DOMString protocol;
  required object data;
};

dictionary DigitalCredentialCreationOptions {
  sequence<DigitalCredentialCreateRequest> requests;
};

dictionary DigitalCredentialCreateRequest {
  required DOMString protocol;
  required object data;
};

[Exposed=Window, SecureContext, Pref="dom.security.credentialmanagement.digital.enabled"]
interface DigitalCredential : Credential {
  [Default] object toJSON();
  readonly attribute DOMString protocol;
  readonly attribute object data;
  static boolean userAgentAllowsProtocol(DOMString protocol);
};
