// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import Foundation
import GeckoView
import UIKit

// We unfortunately need to start Gecko and XPCOM before UIApplicationMain at the moment,
// so call GeckoRuntime.main instead of UIApplicationMain here.
GeckoRuntime.main(argc: CommandLine.argc, argv: CommandLine.unsafeArgv)
