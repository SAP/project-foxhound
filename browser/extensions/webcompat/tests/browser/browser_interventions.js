"use strict";

const { WebExtensionPolicy } = SpecialPowers.Cu.getGlobalForObject(
  SpecialPowers.Services
);

const ValidIssueList = [
  "blocked-content",
  "broken-audio",
  "broken-captcha",
  "broken-comments",
  "broken-cookie-banner",
  "broken-editor",
  "broken-font",
  "broken-images",
  "broken-interactive-elements",
  "broken-layout",
  "broken-login",
  "broken-map",
  "broken-meetings",
  "broken-printing",
  "broken-redirect",
  "broken-scrolling",
  "broken-videos",
  "broken-zooming",
  "desktop-layout-not-mobile",
  "extra-scrollbars",
  "firefox-blocked-completely",
  "frozen-tab",
  "incorrect-viewport-dimensions",
  "page-fails-to-load",
  "redirect-loop",
  "slow-performance",
  "unsupported-warning",
  "user-interface-frustration",
];

const ValidResourceTypes = [
  "main_frame",
  "sub_frame",
  "stylesheet",
  "script",
  "image",
  "object",
  "xmlhttprequest",
  "xslt",
  "ping",
  "beacon",
  "xml_dtd",
  "font",
  "media",
  "websocket",
  "csp_report",
  "imageset",
  "web_manifest",
  "speculative",
  "json",
  "other",
];

function addon_url(path) {
  const uuid = WebExtensionPolicy.getByID(
    "webcompat@mozilla.org"
  ).mozExtensionHostname;
  return `moz-extension://${uuid}/${path}`;
}

async function check_path_exists(path) {
  try {
    await (await fetch(addon_url(path))).text();
  } catch (e) {
    return false;
  }
  return true;
}

function check_valid_array(a, key, id) {
  if (a === undefined) {
    return false;
  }
  const valid = Array.isArray(a);
  ok(valid, `if defined, ${key} is an array for id ${id}`);
  return valid;
}

function validate_match_info(id, key, matches) {
  ok(
    Array.isArray(matches) && matches.length,
    `${key} key exists and is an array with items for id ${id}`
  );

  for (const match of matches) {
    try {
      new MatchPattern(match.url ?? match);
    } catch (e) {
      ok(false, `invalid match-pattern for id ${id}: ${match.url ?? match}`);
    }

    if (match.url) {
      ok(
        Array.isArray(match.types) && match.types.length,
        `types sub-key missing for match.url ${match.url} for id ${id}`
      );
      for (const type of match.types) {
        ok(
          ValidResourceTypes.includes(type),
          `invalid type "${type}" for match.url ${match.url} for id ${id}`
        );
      }
    }
  }
}

// eslint-disable-next-line complexity
add_task(async function test_json_data() {
  const addon = await AddonManager.getAddonByID("webcompat@mozilla.org");
  const addonURI = addon.getResourceURI();
  const checkableGlobalPrefs =
    await WebCompatExtension.getCheckableGlobalPrefs();

  const exports = {};
  Services.scriptloader.loadSubScript(
    addonURI.resolve("lib/intervention_helpers.js"),
    exports
  );
  Services.scriptloader.loadSubScript(
    addonURI.resolve("lib/custom_functions.js"),
    exports
  );
  const helpers = exports.InterventionHelpers;
  const custom_fns = exports.CUSTOM_FUNCTIONS;

  for (const [name, fn] of Object.entries(helpers.skip_if_functions)) {
    Assert.strictEqual(typeof fn, "function", `Skip-if ${name} is a function`);
  }

  for (const [name, { disable, enable }] of Object.entries(custom_fns)) {
    Assert.strictEqual(
      typeof enable,
      "function",
      `Custom function ${name} has enable function`
    );
    Assert.strictEqual(
      typeof disable,
      "function",
      `Custom function ${name} has disable function`
    );
  }

  const json = await (await fetch(addon_url("data/interventions.json"))).json();
  const ids = new Set();
  for (const [id, config] of Object.entries(json)) {
    const { bugs, hidden, interventions, label } = config;
    ok(!!id, `id key exists for intervention ${JSON.stringify(config)}`);
    if (id) {
      ok(!ids.has(id), `id ${id} is defined more than once`);
      ids.add(id);
    }

    if (hidden) {
      ok(
        hidden === false || hidden === true,
        `hidden key is true or false for id ${id}`
      );
    }

    ok(
      typeof label === "string" && !!label,
      `label key exists and is set for id ${id}`
    );

    ok(
      typeof bugs === "object" && Object.keys(bugs).length,
      `bugs key exists and has entries for id ${id}`
    );
    let hasBlocks = false;
    for (const [bug, { issue, blocks, matches }] of Object.entries(bugs)) {
      ok(
        typeof bug === "string" && bug == String(parseInt(bug)),
        `bug number is set properly for all bugs in id ${id}`
      );

      ok(
        ValidIssueList.includes(issue),
        `issue key exists and is set for all bugs in id ${id}`
      );

      ok(
        !interventions.find(i => i.content_scripts || i.ua_string) ||
          (!!matches && Array.isArray(matches) && matches.length),
        `matches key exists and is an array with items for id ${id}`
      );

      if (!matches && !blocks) {
        ok(false, `no matches or blocks entries for id ${id}`);
      }

      if (matches) {
        validate_match_info(id, "matches", matches);
      }
      if (blocks) {
        hasBlocks = true;
        validate_match_info(id, "blocks", blocks);
      }
    }

    const non_custom_names = [
      "content_scripts",
      "max_version",
      "min_version",
      "not_platforms",
      "platforms",
      "not_channels",
      "only_channels",
      "pref_check",
      "skip_if",
      "ua_string",
    ];
    let custom_found = false;
    for (let intervention of interventions) {
      for (const name in intervention) {
        const is_custom = name in custom_fns;
        const is_non_custom = non_custom_names.includes(name);
        ok(
          is_custom || is_non_custom,
          `key '${name}' is actually expected for id ${id}`
        );
        if (is_custom) {
          custom_found = true;
          const { details, optionalDetails } = custom_fns[name];
          for (const customArgs of intervention[name]) {
            for (const detailName in customArgs) {
              ok(
                details.includes(detailName) ||
                  optionalDetails.includes(detailName),
                `detail '${detailName}' is actually expected for custom function ${name} in id ${id}`
              );
            }
            for (const detailName of details) {
              ok(
                detailName in customArgs,
                `expected detail '${detailName}' is being passed to custom function ${name} in id ${id}`
              );
            }
          }
        }
      }
      for (const version_type of ["min_version", "max_version"]) {
        if (version_type in intervention) {
          const val = intervention[version_type];
          ok(
            typeof val == "number" && val > 0,
            `Invalid ${version_type} value ${JSON.stringify(val)}, should be a positive number`
          );
        }
      }
      let {
        content_scripts,
        not_platforms,
        not_channels,
        only_channels,
        platforms,
        pref_check,
        skip_if,
        ua_string,
      } = intervention;
      ok(
        !!platforms || !!not_platforms,
        `platforms or not_platforms key exists for id ${id} intervention ${JSON.stringify(intervention)}`
      );
      if (check_valid_array(not_platforms, "not_platforms", id)) {
        let skipped = 0;
        let possible = helpers.valid_platforms.length - 2; // without "all" and "desktop"
        for (const platform of not_platforms) {
          ok(
            helpers.valid_platforms.includes(platform),
            `Not-platform ${platform} is valid in id ${id}`
          );
          if (platform == "desktop") {
            skipped += possible - 1;
          } else if (platform == "all") {
            skipped = possible;
          } else {
            ++skipped;
          }
        }
        Assert.less(
          skipped,
          possible,
          `Not skipping all platforms for id ${id} intervention ${JSON.stringify(intervention)}`
        );
      }
      if (check_valid_array(platforms, "platforms", id)) {
        for (const platform of platforms) {
          ok(
            helpers.valid_platforms.includes(platform),
            `Platform ${platform} is valid in id ${id}`
          );
        }
      }
      if (check_valid_array(not_channels, "not_channels", id)) {
        let skipped = 0;
        let possible = helpers.valid_channels.length;
        for (const channel of not_channels) {
          ok(
            helpers.valid_channels.includes(channel),
            `Not-channel ${channel} is valid in id ${id}`
          );
          ++skipped;
        }
        Assert.less(
          skipped,
          possible,
          `Not skipping all channels for id ${id} intervention ${JSON.stringify(intervention)}`
        );
      }
      if (check_valid_array(only_channels, "only_channels", id)) {
        for (const channel of only_channels) {
          ok(
            helpers.valid_channels.includes(channel),
            `Channel ${channel} is valid in id ${id}`
          );
        }
      }
      ok(
        content_scripts || ua_string || custom_found || hasBlocks,
        `Interventions or blocks are defined for id ${id}`
      );
      ok(
        pref_check === undefined || typeof pref_check === "object",
        `pref_check is not given or is an object ${id}`
      );
      if (pref_check) {
        for (const [pref, value] of Object.entries(pref_check)) {
          ok(
            checkableGlobalPrefs.includes(pref),
            `'${pref}' is allow-listed in AboutConfigPrefsAPI.ALLOWED_GLOBAL_PREFS`
          );
          const type = typeof value;
          const expectedType = Services.prefs.getPrefType(pref);
          if (expectedType !== 0) {
            // will be 0 if not defined/available on the given platform
            ok(
              (type === "boolean" &&
                expectedType === Ci.nsIPrefBranch.PREF_BOOL) ||
                (type === "number" &&
                  expectedType === Ci.nsIPrefBranch.PREF_INT) ||
                (type === "string" &&
                  expectedType === Ci.nsIPrefBranch.PREF_STRING),
              `Given value (${JSON.stringify(value)}) for '${pref}' matches the pref's type`
            );
          }
        }
      }
      if (check_valid_array(skip_if, "skip_if", id)) {
        for (const fn of skip_if) {
          ok(
            fn in helpers.skip_if_functions,
            `'${fn}' is not in the skip_if_functions`
          );
        }
      }
      if (content_scripts) {
        if ("all_frames" in content_scripts) {
          const all = content_scripts.all_frames;
          ok(
            all === false || all === true,
            `all_frames key is true or false for content_scripts for id ${id}`
          );
        }
        if ("isolated" in content_scripts) {
          const isolated = content_scripts.isolated;
          ok(
            isolated === false || isolated === true,
            `isolated key is true or false for content_scripts for id ${id}`
          );
        }
        for (const type of ["css", "js"]) {
          if (!(type in content_scripts)) {
            continue;
          }
          const paths = content_scripts[type];
          const check = Array.isArray(paths) && paths.length;
          ok(
            check,
            `${type} content_scripts should be an array with at least one string for id ${id}`
          );
          if (!check) {
            continue;
          }
          for (let path of paths) {
            if (!path.includes("/")) {
              path = `injections/${type}/${path}`;
            }
            ok(
              path.endsWith(`.${type}`),
              `${path} should be a ${type.toUpperCase()} file`
            );
            ok(await check_path_exists(path), `${path} exists for id ${id}`);
          }
        }
      }
      if (check_valid_array(ua_string, "ua_string", id)) {
        for (let change of ua_string) {
          if (typeof change !== "string") {
            change = change.change;
          }
          ok(
            change in helpers.ua_change_functions,
            `'${change}' is not in the ua_change_functions`
          );
        }
      }
    }
  }
});
