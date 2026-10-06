/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * The origin of this IDL file is
 * https://w3c.github.io/IndexedDB/#record-interface
 */

[Exposed=(Window,Worker)]
interface IDBRecord {
  [Pure, Throws, Cached] readonly attribute any key;
  [Pure, Throws, Cached] readonly attribute any primaryKey;
  [Pure, Throws, Cached] readonly attribute any value;
};
