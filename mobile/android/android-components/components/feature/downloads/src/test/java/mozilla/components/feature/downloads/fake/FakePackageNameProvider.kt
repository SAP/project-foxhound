/*
 *  This Source Code Form is subject to the terms of the Mozilla Public
 *  * License, v. 2.0. If a copy of the MPL was not distributed with this
 *  * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 */

package mozilla.components.feature.downloads.fake

import mozilla.components.feature.downloads.PackageNameProvider

/**
 * A fake implementation of [PackageNameProvider] for testing purposes.
 *
 * @param packageName The package name to return.
 */
class FakePackageNameProvider(override val packageName: String) : PackageNameProvider
