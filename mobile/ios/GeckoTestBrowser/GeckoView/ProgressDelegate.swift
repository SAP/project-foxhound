// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

public protocol ProgressDelegate {
    /// A View has started loading content from the network.
    func onPageStart(session: GeckoSession, url: String)

    /// A View has finished loading content from the network.
    func onPageStop(session: GeckoSession, success: Bool)

    /// Page loading has progressed.
    func onProgressChange(session: GeckoSession, progress: Int)

    /// The security status has been updated.
    // FIXME: Implement onSecurityChange & SecurityInformation
    // func onSecurityChange(session: GeckoSession, securityInfo: SecurityInformation)

    /// The browser session state has changed. This can happen in response to navigation, scrolling,
    /// or form data changes; the session state passed includes the most up to date information on
    /// all of these.
    // FIXME: Implement onSessionStateChange & SessionState
    // func onSessionStateChange(session: GeckoSession, sessionState: SessionState)
}

// All methods on ProgressDelegate are optional, provide default implementations.
extension ProgressDelegate {
    public func onPageStart(session: GeckoSession, url: String) {}
    public func onPageStop(session: GeckoSession, success: Bool) {}
    public func onProgressChange(session: GeckoSession, progress: Int) {}
    // func onSecurityChange(session: GeckoSession, securityInfo: SecurityInformation) {}
    // func onSessionStateChange(session: GeckoSession, sessionState: SessionState) {}
}

enum ProgressEvents: String, CaseIterable {
    case pageStart = "GeckoView:PageStart"
    case pageStop = "GeckoView:PageStop"
    case progressChanged = "GeckoView:ProgressChanged"
    case securityChanged = "GeckoView:SecurityChanged"
    case stateUpdated = "GeckoView:StateUpdated"
}

func newProgressHandler(_ session: GeckoSession) -> GeckoSessionHandler<
    ProgressDelegate, ProgressEvents
> {
    GeckoSessionHandler(moduleName: "GeckoViewProgress", session: session) {
        @MainActor session, delegate, event, message in
        switch event {
        case .pageStart:
            delegate?.onPageStart(session: session, url: message!["uri"] as! String)
            return nil
        case .pageStop:
            delegate?.onPageStop(session: session, success: message!["success"] as! Bool)
            return nil
        case .progressChanged:
            delegate?.onProgressChange(session: session, progress: message!["progress"] as! Int)
            return nil
        case .securityChanged:
            // TODO: Implement
            return nil
        case .stateUpdated:
            // TODO: Implement
            return nil
        }
    }
}
