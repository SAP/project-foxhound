# [android-components](../../../README.md) > Feature > Example

A sample feature component demonstrating the structure and conventions for creating Android Components modules.

## Usage

### Setting up the dependency

Use Gradle to download the library from maven.mozilla.org:

```Groovy
implementation "org.mozilla.components:feature-example:{latest-version}"
```

### ExampleFeature

`ExampleFeature` demonstrates a lifecycle-aware feature component that can be integrated with Android Activities or Fragments.

```kotlin
val feature = ExampleFeature { message ->
    Log.d("Example", message)
}

// Bind to lifecycle
lifecycle.addObserver(feature)

// Or manually control
feature.start()
feature.stop()

// Process data
val result = feature.processData("input")
```

## License

This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at http://mozilla.org/MPL/2.0/
