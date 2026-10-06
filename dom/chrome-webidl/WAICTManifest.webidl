/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

[GenerateInitFromJSON]
dictionary WAICTManifest {
  UTF8String bt-server;
  record<UTF8String, UTF8String> hashes;
  sequence<UTF8String> any_hashes;
  UTF8String resource_delimiter;
  UTF8String transparency_proof;
};
