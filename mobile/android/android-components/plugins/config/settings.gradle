/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Prevents gradle builds from looking for a root settings.gradle
pluginManagement {
    if (!gradle.root.hasProperty("mozconfig")){
        apply from: file('../../../gradle/mozconfig.gradle')
    } else {
        gradle.ext.mozconfig = gradle.root.mozconfig
        gradle.ext.configureMavenRepositories = gradle.root.ext.configureMavenRepositories
    }

    repositories {
        gradle.configureMavenRepositories(delegate)
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.PREFER_SETTINGS)
    repositories {
        gradle.configureMavenRepositories(delegate)
    }
    versionCatalogs {
        libs {
            from(files("../../../../../gradle/libs.versions.toml"))
        }
    }
}