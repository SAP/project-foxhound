/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

function computedVar(className, varName) {
  let el = document.createElement("box");
  el.className = className;
  document.documentElement.appendChild(el);
  let value = window.getComputedStyle(el).getPropertyValue(varName).trim();
  el.remove();
  return value;
}

// `gray` is only excluded when nova is off: the CSS then uses `currentColor` to
// follow the theme, while the API exposes a fixed hex code for extensions. When
// nova is on, gray uses the `--color-gray-30` token like every other color and
// is compared normally.
add_task(async function container_color_codes_match_css() {
  const novaEnabled = Services.prefs.getBoolPref("browser.nova.enabled", false);
  for (const color of ContextualIdentityService.containerColors) {
    if (color === "gray" && !novaEnabled) {
      continue;
    }
    let cssColor = computedVar(
      `identity-color-${color}`,
      "--identity-icon-color"
    );
    let apiColor = ContextualIdentityService.getContainerColorCode(color);
    is(
      cssColor.toLowerCase(),
      apiColor.toLowerCase(),
      `Color "${color}": usercontext.css and getContainerColorCode() must match`
    );
  }
});

add_task(async function container_icons_have_assets() {
  for (const icon of ContextualIdentityService.containerIcons) {
    let iconUrl = ContextualIdentityService.getContainerIconURL(icon);
    ok(iconUrl, `Icon "${icon}" resolves to a URL`);

    let cssIcon = computedVar(`identity-icon-${icon}`, "--identity-icon");
    ok(
      cssIcon.includes(`${icon}.svg`),
      `Icon "${icon}" has a usercontext.css rule (got "${cssIcon}")`
    );

    let res = await fetch(iconUrl);
    ok(res.ok, `Icon "${icon}" SVG loads from ${iconUrl}`);
  }
});

add_task(function container_definitions_have_labels() {
  for (const color of ContextualIdentityService.containerColors) {
    ok(
      ContextualIdentityService.getContainerColorLabel(color),
      `Color "${color}" has a label`
    );
  }
  for (const icon of ContextualIdentityService.containerIcons) {
    ok(
      ContextualIdentityService.getContainerIconLabel(icon),
      `Icon "${icon}" has a label`
    );
  }
});

add_task(function container_definitions_match_enterprise_policy_schema() {
  let { schema } = ChromeUtils.importESModule(
    "resource:///modules/policies/schema.sys.mjs"
  );
  let containerSchema = schema.properties.Containers.properties.Default.items;

  Assert.deepEqual(
    containerSchema.properties.color.enum.toSorted(),
    ContextualIdentityService.containerColors.toSorted(),
    "Containers policy color enum must match the canonical color list"
  );
  Assert.deepEqual(
    containerSchema.properties.icon.enum.toSorted(),
    ContextualIdentityService.containerIcons.toSorted(),
    "Containers policy icon enum must match the canonical icon list"
  );
});
