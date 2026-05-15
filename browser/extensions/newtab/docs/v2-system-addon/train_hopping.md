# Train-hopping for New Tab

Train-hopping is a maneuver that the New Tab team can use to package the code under `browser/extensions/newtab` up and deploy it to users on the Beta or Release channels without requiring a dot release. This kind of deployment supplements the existing train release model, which New Tab still uses by default.

New Tab runs inside of Firefox as a "built-in addon". This is different from a traditional WebExtension, in that the New Tab addon has the same levels of privilege as the rest of the browser front-end. It does mean, however, that the New Tab code can be updated by installing a Mozilla-signed XPI file with the same addon ID (`newtab@mozilla.org`).

When Nightly's New Tab is packaged up as an XPI and deployed to Beta or Release clients, we call this a "train-hop". The moniker is an attempt to reflect the fact that the maneuver is a bit of a "stunt" and should be performed with care by trained professionals in order to avoid disaster.

# Maintaining train-hop compatibility

Train-hopped New Tab XPI's are always built from a revision from the main repository branch (as opposed to the Beta or Release branches). This means that everything that is train-hopped must still go through the same code review and landing procedures as code that normally "rides the trains".

It also means that for train-hopping to remain a viable maneuver, extra effort must be applied in order to maintain train-hop compatibility between the New Tab code in main, and the rest of the browser code in Beta and Release.

Breaking train-hop compatibility will not necessarily cause the product to malfunction as a whole, but may subtly break individual features under certain conditions. That breakage may rule out train-hopping as a maneuver to affected channels of Firefox until the changes on `main` reach those channels using the normal train cycle.

## The difference between `browser/extensions/newtab` and `browser/components/newtab`

The New Tab XPI is constructed using only the code under `browser/extensions/newtab`. The code under `browser/components/newtab` is supplemental code that always rides the trains and cannot train-hop. For example, the `AboutNewTabResourceMapping.sys.mjs` module is responsible for actually downloading and initializing the XPI when a train-hop rollout is detected.

The `browser/components/newtab` folder also contains the main entry points that call into the New Tab addon via the special `resource://newtab` and `chrome://newtab` protocols that map to the addon resources. To help maintain train-hop compatibility, we have added [a linting rule](https://bugzilla.mozilla.org/show_bug.cgi?id=1949522) to discourage other parts of the underlying application from importing anything via those protocols.

## Things that tend to break compatibility

From observation as we've developed the train-hop capability, we've noticed that there are some common things that tend to break train-hop compatibility.

### External dependencies

New Tab has been engineered to be fairly isolated from the rest of the Firefox codebase, but there will always be external dependencies on the underlying codebase that prevent New Tab from being completely independent. These external dependencies are what must be considered when evaluating train-hop compatibility.

Some categories and examples of external dependencies are:

#### Scripts / modules / components

While it's extremely rare these days for external components to rely on the New Tab code under `resource://newtab` and `chrome://newtab` (especially since we landed [the linting rule to discourage this](https://bugzilla.mozilla.org/show_bug.cgi?id=1949522)), the inverse is still allowed, where New Tab code will import modules from the underlying application, and rely on them. Changes in how those modules work, or how they're imported, can certainly cause train-hop incompatibility.

An example of a platform change that broke train-hop compatibility (but was eventually caught and backed out) is [here](https://bugzilla.mozilla.org/show_bug.cgi?id=1966464#c3), where a patch landed that changed the URI for importing various URLBar modules.

There isn't a one-size-fits-all solution to these kinds of compatibility breakages, but ideally we can "shim" the difference, so that if the code under `browser/extensions/newtab` is running on a channel without the breaking change, it behaves as expected, and if it is running on a channel with the breaking change, it can adapt to it. This can occur either with feature detection, or in the worst-case scenario, with major-version number checks.

Once the breaking change eventually rides the trains to the release channel, any shims can then be removed from Nightly. This means that if a shim landed in the New Tab code in Nightly 144 to maintain train-hop compatibility with Firefox 143 Beta and Firefox 142 Release, then those shims can be removed in Nightly 146 once Firefox 144 reaches the Release channel.

We've converged on a convention with the DevTools team to highlight a shim using a block comment in this form:

```
/**
 * @backward-compat { version 143 }
 *
 * Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas venenatis.
 * interdum dapibus. Proin bibendum in neque non porta. Nulla semper nisi elit,
 * a molestie sem pellentesque eget.
 */
```

Where the `version 143` section indicates which version must be on the Release channel before the shim can be removed. The text below should add context for the shim, and if possible, instructions on how the shim can be completely removed once the appropriate version has reached the Release channel.

#### Stylesheets

New Tab relies on our suite of shared design tokens and reusable components, all of which build upon a series of stylesheets that exist outside of the New Tab codebase. This kind of encapsulation is actually a good thing \- a change in one of the design tokens (say, for example, the `--button-background-color` token) in the underlying platform would be completely transparent to New Tab.

This means that such changes do not require New Tab to adapt, which also means that backwards compatibility is preserved. If `--button-background-color` changes in the stylesheets of Firefox 145, New Tab would immediately inherit those changes \- and would simply use the old values if train-hopped to Firefox 144 and 143\.

Stylesheet changes in the application layer that New Tab relies upon that are not encapsulated by our design tokens or design system may result in unexpected visual glitches when train-hopping. At this time, the strategy to detect these is with manual testing.

#### DOM APIs or platform support

The web evolves, and the features that Firefox supports grows over time. We must be careful on the New Tab team to only adopt new DOM, CSS or JavaScript capabilities such that they're backwards compatible to Beta and Release \- or we must wait until those capabilities reach the Release channel before New Tab can adopt them.

For example, at the time of this writing, [CSS Module Scripts are still under development](https://bugzilla.mozilla.org/show_bug.cgi?id=1720570). Supposing this capability were to land in Firefox 144, New Tab would be restricted from using that web feature until Firefox 144 reached the Release channel.

### New experiment features

The Nimbus Features listed in `FeatureManifest.yaml` are registered into the client at build-time. There is currently no mechanism with which we can register new Nimbus Features at runtime dynamically.

This means that the traditional model letting feature definitions ride the trains via `FeatureManifest.yaml` is incompatible with train-hopping. For example, if a new `newtabStockTicker` feature were to be added to `FeatureManifest.yaml`, and its variables checked at runtime by the New Tab code to determine whether to display a stock ticker widget, those runtime checks will need to grapple with the possibility that `NimbusFeatures.newtabStockTicker` is not actually defined on the underlying build, and use some sensible default (in this example, that default would probably be to *not* show the stock ticker widget).

This would almost seem to defeat the purpose of train-hopping. How are we to experiment more quickly if we still must wait for our feature definitions to ride the trains?

The answer lies in a special type of feature definition that has been made available to New Tab: `newtabTrainhop`.

This feature has two variables: `type (string)` and `payload (JSON)`. Notably, this feature also has `allowCoenrollment` set to `true`.

The `newtabTrainhop` feature supports two payload formats:

**Single Payload Format:**
A single feature configuration with a `type` and `payload`:
```json
{
  "type": "stockWidget",
  "payload": {
    "enabled": true
  }
}
```

**Multi-Payload Format:**
Multiple feature configurations bundled together using `type: "multi-payload"`:
```json
{
  "type": "multi-payload",
  "payload": [
    {
      "type": "stockWidget",
      "payload": {
        "enabled": true
      }
    },
    {
      "type": "otherWidget",
      "payload": {
        "enabled": false
      }
    }
  ]
}
```

What this means is that this feature may actually have an *array* of matching features for the client to implement. Additionally, the multi-payload format allows a single enrollment to specify multiple feature configurations. It is up to the New Tab code to process all enrollments and extract the feature `type`s that it cares about, interpreting each `payload` appropriately. This means we only need to monitor this one `newtabTrainhop` feature for changes to determine if we need to recompute what features are enabled and with which settings.

In practice, this is done for you via the `PrefsFeed`, which converts the payload into something that can be consulted at runtime. For example, the single payload example could have its value checked with:

```js
 // This presumes we're executing in the context of a feed, although the
 // `values` property can also be retrieved off of the Prefs property
 // in content.

 const prefs = this.store.getState().Prefs.values;
 const {
   enabled = false,
 } = prefs?.trainhopConfig?.stockWidget ?? {};

 if (enabled) {
   // ...
 }

```

and the multi-payload example could be similarly checked with:

```js
 const prefs = this.store.getState().Prefs.values;
 const {
   enabled = false, // Default value if undefined
 } = prefs?.trainhopConfig?.stockWidget ?? {};

 if (enabled) {
   // ...
 }

 // ... Elsewhere

 const {
   enabled = false, // Default value if undefined
 } = prefs?.trainhopConfig?.otherWidget ?? {};

 if (clickOnly) {
   // ...
 }
```

This monitoring and parsing of `newtabTrainhop` has already landed in the New Tab source code as of [this bug](https://bugzilla.mozilla.org/show_bug.cgi?id=1982731).

Effectively, New Tab parent process modules can access the `PrefsFeed` state, and examine the `values` object for a property matching the `type` that they care about.

Going back to our stock ticker widget example, a `StockWidgetFeed` module could access:

```
const stockWidgetConfig = state.Prefs.values?.trainhopConfig?.stockWidget || { enabled: false }
const stockWidgetEnabled = stockWidgetConfig.enabled;
```

In this example, if an enrollment exists such that the `newtabTrainhop` feature has been assigned a `type` of `stockWidget` and a `payload` of `{"enabled": true }`, then our `StockWidgetFeed` would determine that `stockWidgetEnabled` is `true`. It defaults to `false` if the feature is not configured with `stockWidget`.

`allowCoenrollment` means that multiple experiments or rollouts can set `newtabTrainhop`, so multiple features can be set this way.

### Glean metrics and pings

New Tab has its own `metrics.yaml` and `pings.yaml` files that live not within the `browser/extensions/newtab` folder, but within `browser/components/newtab`.

Similar to `FeatureManifest.yaml`, these metric and ping definitions are often parsed at build time. Unlike `FeatureManifest`, the Glean library knows how to have metrics and pings registered at runtime.

This means it is possible to land new metrics and pings for New Tab, but to maintain backwards compatibility, and use those metrics and pings on the Beta and Release channel before the `metrics.yaml` or `pings.yaml` files have reached those channels.

This is done via:

```
$ ./mach newtab channel-metrics-diff --channel beta
$ ./mach newtab channel-metrics-diff --channel release
```

What this does is produce two JSON files that describe any difference between the `metrics.yaml` and `pings.yaml` files from Nightly, and those same files from the Beta and Release channels. Those JSON files are named something like `runtime-metrics-142.json` where `142` refers to the major version number of the Firefox instance that the difference applies to.

Those JSON files are written to `browser/extensions/newtab/webext-glue/metrics`. In advance of a train-hop, a New Tab developer should:

1. Run the two `channel-metrics-diff` commands to produce those JSON files.
2. Delete any pre-existing `runtime-metrics-N.json` files for major versions that are no longer supported on the release channel for train-hopping.
3. Post for review and land those changes in the Nightly repository in advance of the train-hop.

## Region compatibility

As of this writing, Firefox is translated into 129 different locales. Many of these localizations are provided by our vibrant and dedicated volunteer contributor community of localizers. Part of the social contract that we have with this community is that we give them at least 3 weeks of "string stability" on the Beta channel for each region to have an honest chance to get their strings translated. Any strings that don't happen to be translated after that 3 week window will fall back to other languages that *did* get translated, or in the worst-case scenario, will fallback to *en-US* strings which always exist.

Typically, strings ride the trains \- they land in Nightly, and once the code in Nightly merges to the Beta channel, localizers have those 3 weeks to complete the localization. After that, a release candidate is built and tested \- and then a week later, the release goes to the Release channel.

Similar to the `FeatureManifest.yaml` problem, this process would seem to go against the goals of New Tab train-hopping. How do we move faster, without upending or violating the social contract that we have with our localization community?

The solution comes in two parts:

1. When train-hopping, package the most recent New Tab translations from the Beta channel in the XPI, and use those.
2. When developing new features that require strings, attempt to land the strings early in the process to maximize the opportunity for them to be translated on the Beta channel.

The New Tab (currently) works on an offset model, where work targeting a particular version of Firefox will begin half-way through the version prior. For example, work that can fit into a release cycle may target Firefox 145, but if so, the work will begin half-way through Firefox 144 being on Nightly. That way, when the work completes, there is theoretically a bit of buffer on the Nightly channel for additional testing.

This offset also gives us the opportunity to land strings sooner. If the strings are known in advance, they can land during the prior release cycle. Then, when the feature work is complete, those strings will have already existed on the Beta channel for some weeks, and have a good chance of having been localized by the community.

The caveat to landing strings early is that localizers *must have the right context* to supply their localizations. We cannot supply English strings and just assume that our localizers will be able to understand the context in which the translations must appear. Therefore, it is important to provide comments in the Fluent files that describe what the strings are for \- and to *provide URLs to publicly available screenshots or Figma documents* that show the strings being used in context. This is documented [here](https://mozilla-l10n.github.io/documentation/localization/dev_best_practices.html#add-localization-notes).

Packaging the localized strings into the XPI is a manual process, and actually involves pulling in the Fluent files for all supported locales and landing them in the source tree. This can be done with a `mach` command:

`./mach newtab update-locales`

This will update the English `newtab.ftl` that is included with the XPI, and grab the most recent `newtab.ftl` files that have been translated and pushed to the `firefox-l10n` repository. It will also produce a report that will display how many strings per locale are "pending" or "missing". A "pending" string is one that hasn't been localized yet, and has not had its' 3 week opportunity on the Beta channel to be localized. A string that is "missing" is one that hasn't been localized, but has been on the Beta channel for more than 3 weeks, and therefore can safely fallback.

You can see the most recent report for the current snapshot of the locales by running:

`./mach newtab locales-report`

and then see details on which strings are missing or pending for a particular locale by supplying it to the optional `--detail` argument. For example:

`./mach newtab locales-report --detail pl`

would show the pending and missing Fluent string IDs for the Polish locale, as well as the date that those strings were first introduced to the source tree.

It is the responsibility of the New Tab team to ensure that a train-hop that aims to enable a feature for a particular region has the necessary strings translated for that feature.

For example, if there was a new `StockTicketWidget` UI component that happened to use some Fluent strings, and we aimed to enable UI component for English, Italian and German locales, we'd want to:

1. Ensure that the strings had either been localized in those regions, or had their 3 week opportunity.
2. Run `./mach newtab update-locales` and post the resulting Fluent string and report changes to Phabricator for review.
3. Land the reviewed changes in the Nightly code.

The train-hopped XPI should then be built off of that revision that landed in the Nightly code (or a later revision, presuming no new strings have landed in the interim). Notably, it's only necessary to run `./mach newtab update-locales` in advance of a train-hop. It is not strictly necessary to run it on a regular cadence.

# Train-hop compatibility automated testing

As of [bug 1983857](https://bugzilla.mozilla.org/show_bug.cgi?id=1983857), we have jobs running on most pushes to `autoland` and `main` that do the following:

1. Builds the `newtab.xpi` from the source
2. Packages up the mochitest-browser tests and test running framework from that source
3. Downloads the most recent versions of Beta and Release
4. Installs the `newtab.xpi` in those instances of the browser
5. Runs the `mochitest-browser` tests from the source under `browser/extensions/newtab/test/browser` on those downloaded instances of Beta and Release.

This means that if we add a new feature to New Tab that is solely contained within the `browser/extensions/newtab` code (or is backwards compatible), and we write tests for that feature under `browser/extensions/newtab/test/browser`, then these test jobs will check if those tests pass on Beta and Release when the XPI is installed on them.

This also means we can potentially catch train-hop compatibility failures with these jobs. Anything that causes New Tab to fail to initialize or pass any of its `mochitest-browser` tests will naturally cause the job to fail, which can be an early signal that train-hop compatibility has been broken.

These tests are currently `Tier 2`, so failures do not automatically result in a backout - however, we should strive to fix failures as soon as they occur in order to unblock train-hopping. The jobs run on all Tier 1 desktop platforms.

[This link](https://treeherder.mozilla.org/jobs?repo=mozilla-central&searchStr=trainhop) should show the most recent `trainhop` jobs occurring on `main`.

The Treeherder "group name" for those jobs is `M-trainhop-rel` and `M-trainhop-beta`, and the symbol is `bc` for the tests running on the most recent Beta and Release versions, respectively.

As these are `mochitest-browser` tests, they suffer some of the same issues with intermittency that plague all `mochitest-browser` tests. The jobs can be retriggered in the event that a given failure appears to be intermittent, but we should all continue to strive to write more resilient and less non-deterministic tests when possible. It is righteous and useful to attempt to fix intermittent test failures for these jobs.

## Debugging automated tests

If it comes to pass that the automated train-hop compatibility tests report a permanent failure on Beta and/or Release via the `M-trainhop-*(bc)` jobs, train-hop compatibility should be considered broken for that channel, and an investigation should begin immediately to determine what needs to be done to restore train-hop compatibility. No train-hops should be performed on the channel for which train-hop compatibility is broken.

The first step is to examine the failure logs from automation to determine if anything immediately obvious jumps out as a “smoking gun”. Look for relevant error messages near the point where the test job failed. If a specific test failed, look for clues around when that test started and concluded. If no tests managed to run correctly, then the issue is likely to do with initializing the XPI (or in rare cases, [might be related to the test framework itself](https://bugzilla.mozilla.org/show_bug.cgi?id=1971180)).

If no useful data is gleaned from the log, the next step is to attempt to reproduce the failure locally. Part of the challenge here is that unsigned XPI files (XPI’s that have not gone through the ship-it process) are not easily manually tested on branded Beta and Release builds. There are, however, strategies that we can use to do this testing, even without a signed XPI.

1. Create a local build of the XPI by running `./mach build` in the revision that failed. The resulting unsigned XPI will be located in the objdir as `dist/xpi-stage/newtab@mozilla.org.xpi`
2. Download a copy of Firefox Developer Edition (or update your existing copy to the latest version). This will act as our stand-in for Beta, since Developer Edition and Beta are both built off of the `beta` branch (just with slightly different build configurations).
3. In `about:config`
   1. Set `xpinstall.signatures.required` to `false`
   2. Set `browser.newtabpage.resource-mapping.log` to `true` (this is optional, but may emit some useful debugging information)
   3. Create a new string pref with key `browser.newtabpage.trainhopAddon.version` and set the value to `any`
4. Visit `about:addons`
5. Click on the gear icon, and choose “Install Add-on From File”
6. Choose the `newtab@mozilla.org.xpi` file from the first step in the native file picker
7. Restart the browser
8. Visit about:support and verify that the expected addon version number is listed for “New Tab” under “Add-ons”

At this point, you’re effectively running the XPI in an instance of Beta. Try to manually run the steps that the failing test performed to see if you can get it to fail manually. Check the Browser Console and / or use the Browser Toolbox debugger / inspector to investigate.

To use the above steps for the Release channel, it is necessary to use an “unbranded” release build. These must be downloaded as Treeherder artifacts, and the links to those builds are found [here](https://wiki.mozilla.org/Add-ons/Extension_Signing#Unbranded_Builds).

When attempting to fix the issue, it may be useful to push those changes to `try` in order to test whether or not your fixes have indeed solved the train-hop compatibility issue. There is a try preset that you can use:

`./mach try --preset desktop-newtab-trainhop --artifact`

# Performing a train-hop

This procedure involves using internal tooling for signing releases, and is [documented on Confluence.](https://mozilla-hub.atlassian.net/wiki/spaces/FPS/pages/1785135275/Performing+a+train-hop)

# Train-hop implementation details

## Resource mapping

New Tab is packaged as a built-in privileged extension. The `AboutNewTabResourceMapping` module (which is not part of the extension, but exists under `browser/components/newtab`) is responsible for mapping URLs like `chrome://newtab` and `resource://newtab` to the appropriate paths supplied by the extension.

Alongside loading the extension and mapping those URLs, the `AboutNewTabResourceMapping` module is responsible for:

1. Checking for new versions of the extension being provided from rollouts, and if any exist, downloading / installing them
2. If the extension is a train-hopped XPI:
   1. Loading the included Fluent files from the XPI
   2. Registering any runtime metrics or pings included with the XPI
3. Uninstalling an XPI if the built-in version has a greater version number, or a train-hop rollout has ended

This module was built alongside our teammates on the WebExtensions team. Debugging it can be aided by setting `browser.newtabpage.resource-mapping.log` to `true` in `about:config`, as this will add useful logging to the browser console related to the loading of the XPI.

## Mach commands

Use `./mach newtab --help` to learn more about the various utilities available to you. Some are train-hop related, and some are not. Let them help you\!

Those nifty `./mach newtab` commands are defined in `browser/extensions/newtab/mach_commands.py`. That Python script is ours to add utilities to. If any part of this process can be aided by more command-line utilities, consider adding them here.
