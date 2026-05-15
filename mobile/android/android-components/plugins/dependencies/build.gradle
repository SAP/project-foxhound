/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

plugins {
    alias(libs.plugins.dependency.analysis)
    alias(libs.plugins.kotlin.dsl)
}

layout.buildDirectory.set(file("${gradle.mozconfig.topobjdir}/gradle/build/mobile/android/android-components/plugins/dependencies"))

gradlePlugin {
    plugins.register("mozac.DependenciesPlugin") {
        id = "mozac.DependenciesPlugin"
        implementationClass = "DependenciesPlugin"
    }
}

dependencies {
  testImplementation platform(libs.junit.bom)
  testImplementation libs.junit.jupiter
  testImplementation libs.mockito
  testRuntimeOnly libs.junit.platform.launcher
}

test {
  useJUnitPlatform {}
}
