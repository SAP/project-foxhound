// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

public enum LoadRequestTarget {
    /// The load is targeted to complete within the current `GeckoSession`.
    case current
    /// The load is targeted to complete within a new `GeckoSession`.
    case new
}

public struct LoadRequest {
    /// The URI to be loaded.
    public let uri: String

    /// The URI of the origin page that triggered the load request.
    ///
    /// `nil` for initial loads, and loads originating from `data:` URIs.
    public let triggerUri: String?

    /// The target where the window has requested to open.
    public let target: LoadRequestTarget

    /// True if and only if the request was triggered by an HTTP redirect.
    ///
    /// If the user loads URI "a", which redirects to URI "b", then
    /// `onLoadRequest` will be called twice, first with uri "a" and `isRedirect
    /// = false`, then with uri "b" and `isRedirect = true`.
    public let isRedirect: Bool

    /// True if there was an active user gesture when the load was requested.
    public let hasUserGesture: Bool

    /// This load request was initiated by a direct navigation from the
    /// application. E.g. when calling `GeckoSession.load`.
    public let isDirectNavigation: Bool
}

public protocol NavigationDelegate {
    /// A view has started loading content from the network.
    func onLocationChange(session: GeckoSession, url: String?, permissions: [ContentPermission])

    /// The view's ability to go back has changed.
    func onCanGoBack(session: GeckoSession, canGoBack: Bool)

    /// The view's ability to go forward has changed.
    func onCanGoForward(session: GeckoSession, canGoForward: Bool)

    /// A request to open an URI. This is called before each top-level page load
    /// to allow custom behavior. For example, this can be used to override the
    /// behavior of TAGET_WINDOW_NEW requests, which defaults to requesting a
    /// new GeckoSession via onNewSession.
    ///
    /// Returns an `AllowOrDeny` which indicates whether or not the load was
    /// handled. If unhandled, Gecko will continue the load as normal. If
    /// handled (a `deny` value), Gecko will abandon the load.
    func onLoadRequest(session: GeckoSession, request: LoadRequest) async -> AllowOrDeny

    /// A request to load a URI in a non-top-level context.
    ///
    /// Returns an `AllowOrDeny` which indicates whether or not the load was
    /// handled. If unhandled, Gecko will continue the load as normal. If
    /// handled (a `deny` value), Gecko will abandon the load.
    func onSubframeLoadRequest(session: GeckoSession, request: LoadRequest) async -> AllowOrDeny

    /// A request has been made to open a new session. The URI is provided only for informational
    /// purposes. Do not call GeckoSession.load here. Additionally, the returned GeckoSession must be
    /// a newly-created one.
    ///
    /// If nil is returned, the request for the request for a new window by web
    /// content will fail. e.g., `window.open()` will return null. The
    /// implementation of onNewSession is responsible for maintaining a
    /// reference to the returned object, to prevent it from being destroyed.
    func onNewSession(session: GeckoSession, uri: String) async -> GeckoSession?

    /// A load error has occurred.
    ///
    /// The returned string is a URI to display as an error. Returning `nil`
    /// will halt the load entirely.
    ///
    /// The following special methods are made available to the URI:
    ///
    /// - document.addCertException(isTemporary), returns Promise
    /// - document.getFailedCertSecurityInfo(), returns FailedCertSecurityInfo
    /// - document.getNetErrorInfo(), returns NetErrorInfo
    /// - document.reloadWithHttpsOnlyException()
    // FIXME: Implement onLoadError & WebRequestError
    // func onLoadError(session: GeckoSession, uri: String?, error: WebRequestError) -> String?
}

enum NavigationEvents: String, CaseIterable {
    case locationChange = "GeckoView:LocationChange"
    case onNewSession = "GeckoView:OnNewSession"
    case onLoadError = "GeckoView:OnLoadError"
    case onLoadRequest = "GeckoView:OnLoadRequest"
}

func newNavigationHandler(_ session: GeckoSession) -> GeckoSessionHandler<
    NavigationDelegate, NavigationEvents
> {
    GeckoSessionHandler(moduleName: "GeckoViewNavigation", session: session) {
        @MainActor session, delegate, event, message in
        switch event {
        case .locationChange:
            if message!["isTopLevel"] as! Bool {
                let permissions = message!["permissions"] as? [[String: Any?]]
                delegate?.onLocationChange(
                    session: session,
                    url: message!["uri"] as? String,
                    permissions: permissions?.map(ContentPermission.fromDictionary) ?? [])
            }
            delegate?.onCanGoBack(session: session, canGoBack: message!["canGoBack"] as! Bool)
            delegate?.onCanGoForward(
                session: session, canGoForward: message!["canGoForward"] as! Bool)
            return nil

        case .onNewSession:
            let newSessionId = message!["newSessionId"] as! String
            if let result = await delegate?.onNewSession(
                session: session, uri: message!["uri"] as! String)
            {
                assert(result.isOpen())
                result.open(windowId: newSessionId)
                return true
            } else {
                return false
            }

        case .onLoadError:
            let uri = message!["uri"] as! String
            let errorCode = message!["error"] as! Int64
            let errorModule = message!["errorModule"] as! Int32
            let errorClass = message!["errorClass"] as! Int32
            return nil

        case .onLoadRequest:
            func convertTarget(_ target: Int32) -> LoadRequestTarget {
                switch target {
                case 0:  // OPEN_DEFAULTWINDOW
                    return .current
                case 1:  // OPEN_CURRENTWINDOW
                    return .current
                default:  // OPEN_NEWWINDOW, OPEN_NEWTAB
                    return .new
                }
            }

            // Match with nsIWebNavigation.idl.
            let LOAD_REQUEST_IS_REDIRECT = 0x800000

            let loadRequest = LoadRequest(
                uri: message!["uri"] as! String,
                triggerUri: message!["triggerUri"] as? String,
                target: convertTarget(message!["where"] as! Int32),
                isRedirect: ((message!["flags"] as! Int) & LOAD_REQUEST_IS_REDIRECT) != 0,
                hasUserGesture: message!["hasUserGesture"] as! Bool,
                isDirectNavigation: true)

            let result = await delegate?.onLoadRequest(session: session, request: loadRequest)
            return result == .allow
        }
    }
}
