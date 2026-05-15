/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { isOriginInList } = ChromeUtils.importESModule(
  "resource://gre/modules/FirefoxRelay.sys.mjs"
);

// Helper to construct allow/deny lists like production:
function makeList(arr) {
  return arr.map(domain => ({ domain }));
}

// Table: [listEntry, origin, expected]
const TESTS = [
  ["google.com", "https://google.com", true],
  ["google.com", "https://www.google.com", true],
  ["www.google.com", "https://www.google.com", true],
  ["google.com.ar", "https://accounts.google.com.ar", true],
  ["google.com.ar", "https://google.com", false],
  ["google.com", "https://google.com.ar", false],
  ["mozilla.org", "https://vpn.mozilla.org", true],
  ["vpn.mozilla.org", "https://vpn.mozilla.org", true],
  ["substack.com", "https://hunterharris.substack.com", true],
  ["hunterharris.substack.com", "https://hunterharris.substack.com", true],
  ["hunterharris.substack.com", "https://other.substack.com", false],
  ["example.co.uk", "https://foo.example.co.uk", true],
  ["localhost", "http://localhost", true],
  ["google.com.ar", "https://mail.google.com.br", false],
];

add_task(async function test_isOriginInList() {
  for (let [listEntry, origin, expected] of TESTS) {
    let list = makeList([listEntry]);
    let result = isOriginInList(list, origin);
    Assert.equal(
      result,
      expected,
      `isOriginInList([${listEntry}], ${origin}) === ${expected}`
    );
  }
});
