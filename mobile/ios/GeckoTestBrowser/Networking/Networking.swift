
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import BrowserEngineKit
import GeckoView

@main
class Networking : NSObject, GeckoProcessExtension, NetworkingExtension {
    override required init() {}

    func handle(xpcConnection: xpc_connection_t) {
        GeckoRuntime.childMain(xpcConnection: xpcConnection, process: self)
    }

    func lockdownSandbox(_ version: String!) {
        if version == "1.0" {
            self.applyRestrictedSandbox(revision: .revision1)
        }
    }
}
