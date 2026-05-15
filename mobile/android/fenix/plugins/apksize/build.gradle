/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

plugins {
    alias(libs.plugins.kotlin.dsl)
}

layout.buildDirectory.set(file("${gradle.mozconfig.topobjdir}/gradle/build/mobile/android/fenix/plugins/apksize"))

dependencies {
    implementation libs.android.gradle.plugin
    implementation libs.json
}

gradlePlugin {
    plugins.register("ApkSizePlugin") {
        id = "ApkSizePlugin"
        implementationClass = "ApkSizePlugin"
    }
}
