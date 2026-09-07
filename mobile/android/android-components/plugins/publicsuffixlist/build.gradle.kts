/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

plugins {
    alias(libs.plugins.dependency.analysis)
    `kotlin-dsl`
}

val mozconfig = gradle.extra["mozconfig"] as Map<*, *>
val topobjdir = mozconfig["topobjdir"] as String

layout.buildDirectory.set(file("$topobjdir/gradle/build/mobile/android/android-components/plugins/publicsuffixlist"))

dependencies {
    implementation(libs.okhttp)
    implementation(libs.okio)

    compileOnly(libs.android.gradle.plugin)
}

gradlePlugin {
    plugins.register("mozac.PublicSuffixListPlugin") {
        id = "mozac.PublicSuffixListPlugin"
        implementationClass = "mozilla.components.gradle.plugins.PublicSuffixListPlugin"
    }
}
