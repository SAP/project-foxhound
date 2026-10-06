// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

class RuntimeImpl : NSObject, SwiftGeckoViewRuntime {
    func runtimeDispatcher() -> any SwiftEventDispatcher {
        return EventDispatcher.runtimeInstance
    }
    func dispatcher(byName name: UnsafePointer<CChar>!) -> any SwiftEventDispatcher {
        return EventDispatcher.lookup(byName: String(cString: name))
    }
}

public class GeckoRuntime {
    static var runtime = RuntimeImpl()

    public static func main(
        argc: Int32,
        argv: UnsafeMutablePointer<UnsafeMutablePointer<Int8>?>
    ) {
        MainProcessInit(argc, argv, runtime)
    }

    public static func childMain(xpcConnection: xpc_connection_t, process: GeckoProcessExtension) {
        ChildProcessInit(xpcConnection, process, runtime)
    }
}
