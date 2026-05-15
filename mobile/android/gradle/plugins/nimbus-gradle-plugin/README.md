This directory contains a Gradle plugin for that wraps Nimbus FML. It knows how to process feature manifest definitions and generate Kotlin bindings for the configured features.

It has been forked into mozilla-firefox from the [A-S Repo](https://github.com/mozilla/application-services/tree/main/tools/nimbus-gradle-plugin)

This is mostly a thin wrapper around the actual code generator whose implementation lives in either:

* hopefully in services/app-services/components/support/nimbus-fml and built by mach.
* otherwise from [the application-services repo](https://github.com/mozilla/application-services/tree/main/components/support/nimbus-fml) and published as a taskcluster artifact, then downloaded locally.
