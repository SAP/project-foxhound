# [Android Components](../../../README.md) > Service > Merino Manifest

A library that provides metadata for popular websites using an embedded snapshot of the Merino manifest. The manifest is sourced from Mozilla's Merino service and includes icons, titles, and category information for top sites.
See https://merino.services.mozilla.com/docs#/manifest/get_manifest_api_v1_manifest_get.

## Usage

### Setting up the dependency

Use Gradle to download the library from [maven.mozilla.org](https://maven.mozilla.org/) ([Setup repository](../../../README.md#maven-repository)):

```Groovy
implementation "org.mozilla.components:service-merino-manifest:{latest-version}"
```

## License

    This Source Code Form is subject to the terms of the Mozilla Public
    License, v. 2.0. If a copy of the MPL was not distributed with this
    file, You can obtain one at http://mozilla.org/MPL/2.0/
