/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

add_task(function test_securityProperties_flags_not_visible_before_commit() {
  const sp = new SecurityProperties();
  sp.setPrivateData();
  sp.setUntrustedInput();
  Assert.strictEqual(sp.privateData, false, "not visible before commit");
  Assert.strictEqual(sp.untrustedInput, false, "not visible before commit");
  sp.commit();
  Assert.strictEqual(sp.privateData, true, "private_data now set");
  Assert.strictEqual(sp.untrustedInput, true, "untrusted_input now set");
});

add_task(function test_securityProperties_sticky() {
  const sp = new SecurityProperties();
  sp.setUntrustedInput();
  sp.commit();
  sp.commit();
  Assert.strictEqual(sp.untrustedInput, true, "flag persists across commits");
});
