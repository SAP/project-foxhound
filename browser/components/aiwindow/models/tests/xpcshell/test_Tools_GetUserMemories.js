/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

do_get_profile();

const { getUserMemories } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/models/Tools.sys.mjs"
);

add_task(async function test_getUserMemories_sets_security_flags() {
  const conversation = makeConversation();
  await getUserMemories(conversation);
  conversation.securityProperties.commit();
  Assert.equal(
    conversation.securityProperties.privateData,
    true,
    "private_data set"
  );
  Assert.equal(
    conversation.securityProperties.untrustedInput,
    false,
    "untrusted_input not set"
  );
});

add_task(async function test_getUserMemories_allowed_when_flags_set() {
  const conversation = makeConversation({
    privateData: true,
    untrustedInput: true,
  });
  const result = await getUserMemories(conversation);

  Assert.ok(Array.isArray(result), "returns array, not a refusal");
});
