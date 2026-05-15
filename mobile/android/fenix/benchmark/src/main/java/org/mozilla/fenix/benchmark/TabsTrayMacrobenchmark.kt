/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
package org.mozilla.fenix.benchmark

/**
 * A custom annotation used to identify Macrobenchmark tests for measuring TabsTrayMacrobenchmark performance
 * All Macrobenchmark tests can be run in a flank configuration with:
 *   test-targets:
 *     - annotation org.mozilla.fenix.benchmark.TabsTrayMacrobenchmark
 *
 * Please remember to update [arm64-v8a-tabstray-macrobenchmark.yml](https://searchfox.org/mozilla-central/source/mobile/android/test_infra/flank-configs/fenix/arm64-v8a-macrobenchmark.yml)
 * and any other use of this annotation if its name or package is changed.
 */
annotation class TabsTrayMacrobenchmark
