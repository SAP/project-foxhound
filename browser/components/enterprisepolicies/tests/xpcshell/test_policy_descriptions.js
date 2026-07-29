/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

async function fetchText(url) {
  let response = await fetch(url);
  return response.text();
}

function parseStringMapping(source) {
  let match = source.match(/let\s+string_mapping\s*=\s*\{([\s\S]*?)\};/);
  if (!match) {
    throw new Error("Can't find string_mapping in aboutPolicies.js");
  }
  let map = {};
  for (let m of match[1].matchAll(/(\w+)\s*:\s*"([^"]+)"/g)) {
    map[m[1]] = m[2];
  }
  return map;
}

function parseDeprecatedPolicies(source) {
  let match = source.match(/let\s+deprecated_policies\s*=\s*\[([\s\S]*?)\];/);
  if (!match) {
    throw new Error("Can't find deprecated_policies in aboutPolicies.js");
  }
  return [...match[1].matchAll(/"([^"]+)"/g)].map(m => m[1]);
}

add_task(async function test_policy_descriptions_present() {
  let { schema } = ChromeUtils.importESModule(
    "resource:///modules/policies/schema.sys.mjs"
  );

  let ftlText = await fetchText(
    "resource://app/localization/en-US/browser/policies/policies-descriptions.ftl"
  );
  let resource = new FluentResource(ftlText);
  let messageIds = new Set();
  for (let item of resource.textElements()) {
    messageIds.add(item.id);
  }

  let aboutPoliciesSource = await fetchText(
    "chrome://browser/content/policies/aboutPolicies.js"
  );
  let stringMapping = parseStringMapping(aboutPoliciesSource);
  let deprecatedPolicies = parseDeprecatedPolicies(aboutPoliciesSource);

  for (let policyName of Object.keys(schema.properties)) {
    if (deprecatedPolicies.includes(policyName)) {
      continue;
    }
    let stringID = stringMapping[policyName] || policyName;
    ok(
      messageIds.has(`policy-${stringID}`),
      `policies-descriptions.ftl contains policy-${stringID} for ${policyName}`
    );
  }
});
