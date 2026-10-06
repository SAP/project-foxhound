# Updating List of Devices for RDM

## Where to locate the list

The devices list is a [RemoteSettings](https://firefox-source-docs.mozilla.org/services/settings/index.html) collection named `devtools-devices`.
A dump of the list can be found in [services/settings/dumps/main/devtools-devices.json](https://searchfox.org/firefox-main/source/services/settings/dumps/main/devtools-devices.json).

## Adding and removing devices

### When to add devices

Add devices that represent current and recent hardware with **distinct viewport sizes**. Focus on:

**Apple (iPhone/iPad):**
- Current generation flagships (e.g., iPhone 17 series, iPad M4)
- Previous generation (N-1) if still widely used (e.g., iPhone 14/15/16)
- Older models that remain relevant (e.g., iPhone SE, iPhone XR/11)
- Only add devices with unique viewport dimensions - don't add multiple models with identical screen sizes

**Android Phones:**
- Current flagship from major manufacturers: Samsung Galaxy S-series, Google Pixel
- Previous generation (N-1) from same manufacturers if viewport differs
- Include both Chrome and Firefox Mobile user agents for at least one popular device (e.g., Pixel)
- Slightly older but still relevant devices (e.g., Pixel 4/5, Galaxy S10) to cover common viewports

**Android Tablets:**
- Current flagship tablets: Samsung Galaxy Tab S-series, Google Pixel Tablet if available
- Focus on distinct screen sizes (regular, plus, ultra variants only if viewports differ significantly)

**Reference sources:**
- Check Google Chrome DevTools device list: [EmulatedDevices.ts](https://github.com/ChromeDevTools/devtools-frontend/blob/main/front_end/models/emulation/EmulatedDevices.ts)
- Review viewport size collections: [iOS Resolution](https://www.ios-resolution.com/), [WebMobileFirst](https://www.webmobilefirst.com/)
- Check current device specs at [GSMArena](https://www.gsmarena.com/)

### When to remove devices

Remove devices that are:
- **Obsolete**: 5+ years old with minimal market share (e.g., iPhone 6/7/8, Nexus devices, Galaxy S5)
- **Duplicate viewports**: Multiple devices with identical dimensions - consolidate into one entry with multiple model names (e.g., "iPhone 14 / 15 / 16")
- **Niche/discontinued**: Devices that were never mainstream (e.g., Microsoft Lumia, BlackBerry, Nokia feature phones)
- **Superseded**: Older models replaced by devices with the same viewport (e.g., Pixel 2 replaced by newer Pixel devices)

### When to update devices

**User Agent Strings** (update annually or when major browser versions release):
- **iOS Safari**: Update to current iOS version and Safari version (Note: As of iOS 26, user agents are frozen at iOS 18_6)
- **Chrome Android**: Update to current Chrome stable version (check [Chrome Releases](https://chromereleases.googleblog.com/))
- **Firefox Mobile**: Update to current Firefox release version
- **Legacy Android**: For devices running Android 7.0 or older, use the last supported Chrome version (e.g., Chrome 109 for Android 7.0)

**Featured Status**:
- **Featured = true**: Current mainstream devices developers are most likely to test (keep list focused, ~15-20 mobile/tablet devices)
- **Featured = false**: Niche devices, older models, "Plus"/"Ultra" variants that are less popular than base models
- Review sales data and popularity when deciding featured status (e.g., Galaxy S25 Ultra was 46% of S25 sales, S25+ only 19%)

### Featured device guidelines

The featured list should prioritize:
- Base model flagships over Plus/Pro/Max/Ultra variants (unless the larger variant is significantly more popular)
- Current generation devices over older ones
- Devices with unique viewport sizes that represent common breakpoints
- A mix of small (≤400px), medium (400-420px), and large (≥430px) phone screens
- Representative tablet sizes from both iOS and Android

Aim for ~3-4 iPhones, ~3-4 Android phones, ~3-4 iPads, ~2-3 Android tablets as featured.

## Data format

An important field is `featured`, which is a boolean. When set to `true`, the device will appear in the RDM dropdown. If it's set to `false`, the device will not appear in the dropdown, but can be enabled in the `Edit list` modal.
Each device has a user agent specified. We can get this value by:

- At `https://developers.whatismybrowser.com/useragents/explore/`
- With a real device, open its default browser, and google "my user agent" will display a Google widget with the user agent string.
- Looking at Google's own list of devices (they also specify the user agent)

## Releasing the changes

First, make sure you can have access to RemoteSettings (see https://remote-settings.readthedocs.io/en/latest/getting-started.html#getting-started).

You should then be able to add the device to the [RemoteSettings Stage instance](https://remote-settings.allizom.org/v1/admin/#/buckets/main-workspace/collections/devtools-devices/) using the interface.
Then use the RemoteSettings DevTools to make Firefox pull the devices list from the Stage instance (see https://remote-settings.readthedocs.io/en/latest/support.html?highlight=devtools#how-do-i-setup-firefox-to-pull-data-from-stage)
Once that is done, open RDM and make sure you can see the new addition in the Devices modal.

If everything is good, you can then ask for review on the data change. Once this get approved, you can replicate the same changes to the [RemoteSettings Prod instance](https://remote-settings.mozilla.org/v1/admin/#/buckets/main-workspace/collections/devtools-devices/), reset the RemoteSettings DevTools settings, check RDM again just to be sure and finally ask for review on the data change.

## Things to consider in the future

- Galaxy Fold has two screens, how do we handle that?
