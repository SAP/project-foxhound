/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import org.gradle.api.tasks.testing.Test

plugins {
    id("com.gradle.plugin-publish") version "1.3.1"
    `java-gradle-plugin`
    kotlin("jvm") version "2.3.10"
    `maven-publish`
}

sourceSets {
    main {
        java {
            srcDir("../buildSrc")
        }
        resources {
            output.dir(mapOf("builtBy" to "copyDocletJar"), layout.buildDirectory.dir("docletJar"))
        }
    }
}

gradlePlugin {
    website = "https://github.com/mozilla-mobile/gradle-apilint"
    vcsUrl = "https://github.com/mozilla-mobile/gradle-apilint"

    plugins.register("apilintPlugin") {
        id = "org.mozilla.apilint"
        displayName = "API Lint plugin"
        description = "Tracks the API of an Android library and helps maintain backward compatibility."
        tags.set(listOf("api", "lint", "mozilla", "compatibility"))
        implementationClass = "org.mozilla.apilint.ApiLintPlugin"
    }
}

tasks.register<Exec>("testApiLint") {
    workingDir(".")
    commandLine("python3", "src/test/resources/apilint_test.py",
        "--build-dir", layout.buildDirectory.get().asFile)
}

tasks.register<Exec>("unittestApiLint") {
    workingDir(".")
    commandLine("python3", "src/test/resources/apilint_unittest.py")
}

tasks.register<Exec>("testChangelogCheck") {
    workingDir(".")
    commandLine("python3", "src/test/resources/changelog-check_test.py")
}

// Tests that the expected doclet result is understood by apilint.py
tasks.register<Exec>("integrationTestApiLint") {
    workingDir(".")
    commandLine("python3", "src/main/resources/apilint.py",
         "../apidoc-plugin/src/test/resources/expected-doclet-output.txt",
         "../apidoc-plugin/src/test/resources/expected-doclet-output.txt")
}

tasks.named<Test>("test") {
    dependsOn("unittestApiLint")
    dependsOn("testApiLint")
    dependsOn("testChangelogCheck")
    dependsOn("integrationTestApiLint")
}

tasks.withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile>().configureEach {
    compilerOptions {
        allWarningsAsErrors.set(true)
    }
}

dependencies {
    implementation(gradleApi())
    compileOnly(libs.android.gradle.plugin)
}

// Arrange for the doclet jar to be included in Java resources, to be consumed
// at runtime.
val docletJar by configurations.creating

dependencies {
    docletJar(project(path = ":apidoc-plugin", configuration = "docletJar"))
}

// It's probably possible to avoid this `Copy` task, but this approach is
// standard.
tasks.register<Sync>("copyDocletJar") {
    from(configurations.named("docletJar"))
    into(layout.buildDirectory.dir("docletJar"))
}
