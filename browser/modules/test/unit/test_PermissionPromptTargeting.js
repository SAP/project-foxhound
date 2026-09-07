/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */
"use strict";

const {
  PERMISSION_UI_FEATURE_ID,
  isValidLogoUrl,
  evalPermissionPromptTargeting,
} = ChromeUtils.importESModule(
  "resource:///modules/PermissionPromptTargeting.sys.mjs"
);

add_task(function test_feature_id_constant() {
  Assert.equal(
    PERMISSION_UI_FEATURE_ID,
    "webNotificationsPermissionUi",
    "Feature ID matches the FeatureManifest.yaml entry"
  );
});

add_task(function test_isValidLogoUrl_accepts_allowed_schemes() {
  Assert.ok(
    isValidLogoUrl("chrome://browser/skin/notification-icons/foo.svg"),
    "chrome:// is allowed"
  );
  Assert.ok(isValidLogoUrl("resource://gre/foo.svg"), "resource:// is allowed");
  Assert.ok(
    isValidLogoUrl("https://example.com/logo.png"),
    "https:// is allowed"
  );
});

add_task(function test_isValidLogoUrl_rejects_unsafe_schemes() {
  Assert.ok(!isValidLogoUrl("javascript:alert(1)"), "javascript: is rejected");
  Assert.ok(
    !isValidLogoUrl("data:image/png;base64,iVBORw0KGgo="),
    "data: is rejected"
  );
  Assert.ok(!isValidLogoUrl("file:///etc/passwd"), "file:// is rejected");
  Assert.ok(
    !isValidLogoUrl("http://example.com/logo.png"),
    "http:// is rejected"
  );
  Assert.ok(
    !isValidLogoUrl("ftp://example.com/logo.png"),
    "ftp:// is rejected"
  );
});

add_task(function test_isValidLogoUrl_rejects_invalid_input() {
  Assert.ok(!isValidLogoUrl(""), "empty string is rejected");
  Assert.ok(!isValidLogoUrl(null), "null is rejected");
  Assert.ok(!isValidLogoUrl(undefined), "undefined is rejected");
  Assert.ok(!isValidLogoUrl(42), "non-string is rejected");
  Assert.ok(
    !isValidLogoUrl("not a valid uri at all"),
    "malformed URI is rejected"
  );
});

add_task(async function test_targeting_returns_true_when_no_expression() {
  Assert.equal(
    await evalPermissionPromptTargeting("", "email"),
    true,
    "Empty jexl string applies to every prompt"
  );
  Assert.equal(
    await evalPermissionPromptTargeting(null, "email"),
    true,
    "Null jexl string applies to every prompt"
  );
  Assert.equal(
    await evalPermissionPromptTargeting(undefined, "email"),
    true,
    "Undefined jexl string applies to every prompt"
  );
});

add_task(async function test_targeting_evaluates_site_category() {
  Assert.equal(
    await evalPermissionPromptTargeting(
      "webNotificationSiteCategory == 'email'",
      "email"
    ),
    true,
    "Matching site category evaluates truthy"
  );
  Assert.equal(
    await evalPermissionPromptTargeting(
      "webNotificationSiteCategory == 'email'",
      "social"
    ),
    false,
    "Non-matching site category evaluates falsy"
  );
});

add_task(async function test_targeting_supports_in_operator() {
  let jexl =
    "webNotificationSiteCategory in " +
    "['email','chat_communication','calendar','productivity_collaboration']";
  Assert.equal(
    await evalPermissionPromptTargeting(jexl, "calendar"),
    true,
    "Category present in launch-criteria set evaluates truthy"
  );
  Assert.equal(
    await evalPermissionPromptTargeting(jexl, "social"),
    false,
    "Category absent from launch-criteria set evaluates falsy"
  );
});

add_task(async function test_targeting_returns_false_on_malformed_jexl() {
  Assert.equal(
    await evalPermissionPromptTargeting("!!!not valid jexl!!!", "email"),
    false,
    "Malformed JEXL fails closed (returns false)"
  );
});

add_task(async function test_targeting_unresolved_identifier_is_falsy() {
  Assert.equal(
    await evalPermissionPromptTargeting(
      "someUnknownIdentifier == 'x'",
      "email"
    ),
    false,
    "Unresolved identifier evaluates to null which coerces to false"
  );
});

add_task(async function test_targeting_does_not_leak_attribute() {
  // The webNotificationSiteCategory attribute should only be resolvable
  // inside calls that explicitly pass it through evalPermissionPromptTargeting.
  // A generic TargetingContext built without our helper must not see it.
  const { TargetingContext } = ChromeUtils.importESModule(
    "resource://messaging-system/targeting/Targeting.sys.mjs"
  );
  let ctx = new TargetingContext({}, { source: "test-leak-check" });
  let value;
  try {
    value = await ctx.evalWithDefault("webNotificationSiteCategory");
  } catch (e) {
    value = null;
  }
  Assert.ok(
    value === undefined || value === null,
    `webNotificationSiteCategory must not be globally resolvable; got ${value}`
  );
});
