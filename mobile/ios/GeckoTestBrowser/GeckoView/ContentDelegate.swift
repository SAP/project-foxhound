// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/// Element details for onContextMenu callbacks
public struct ContextElement {
    public enum ElementType {
        case none, image, video, audio
    }

    /// The base URI of the element's document.
    public let baseUri: String?

    /// The absolute link URI (href) of the element.
    public let linkUri: String?

    /// The title text of the element.
    public let title: String?

    /// The alternative text (alt) for the element.
    public let altText: String?

    /// The type of the element. One of the  flags.
    public let type: ElementType

    /// The source URI (src) of the element. Set for (nested) media elements.
    public let srcUri: String?

    /// The text content of the element
    public let textContent: String?
}

public enum SlowScriptResponse {
    case halt, resume
}

public protocol ContentDelegate {
    /// A page title was discovered in the content or updated after the content
    /// loaded.
    func onTitleChange(session: GeckoSession, title: String)

    /// A preview image was discovered in the content after the content loaded.
    func onPreviewImage(session: GeckoSession, previewImageUrl: String)

    /// A page has requested focus. Note that window.focus() in content will not
    /// result in this being called.
    func onFocusRequest(session: GeckoSession)

    /// A page has requested to close
    func onCloseRequest(session: GeckoSession)

    /// A page has entered or exited full screen mode.
    ///
    /// Typically the implementation would set the GeckoView to full screen when
    /// the page is in full screen mode.
    func onFullScreen(session: GeckoSession, fullScreen: Bool)

    /// A viewport-filt was discovered in the content or updated after the
    /// content.
    ///
    /// See https://drafts.csswg.org/css-round-display/#viewport-fit-descriptor
    func onMetaViewportFitChange(session: GeckoSession, viewportFit: String)

    /// Session is on a product url.
    func onProductUrl(session: GeckoSession)

    /// A user has initiated the context menu via long-press.
    ///
    /// This event is fired on links, (nested) images, and (nested) media
    /// elements.
    func onContextMenu(session: GeckoSession, screenX: Int, screenY: Int, element: ContextElement)

    /// This is fired when there is a response that cannot be handled by Gecko
    /// (e.g. a download).
    // FIXME: Implement onExternalResponse & WebResponse
    // func onExternalResponse(session: GeckoSession, response: WebResponse)

    /// The content process hosting this GeckoSession has crashed.
    ///
    /// The GeckoSession is now closed and unusable. You may call `open` to
    /// recover the session, but no state is preserved. Most applications will
    /// want to call `load` or `restoreState` at this point.
    func onCrash(session: GeckoSession)

    /// The content process hosting this GeckoSession has been killed.
    ///
    /// The GeckoSession is now closed and unusable. You may call `open` to
    /// recover the session, but no state is preserved. Most applications will
    /// want to call `load` or `restoreState` at this point.
    func onKill(session: GeckoSession)

    /// Notification that the first content composition has occurred.
    ///
    /// This callback is invoked for the first content composite after either a
    /// start or a restart of the compositor.
    func onFirstComposite(session: GeckoSession)

    /// Notification that the first content paint has occurred.
    ///
    /// This callback is invoked for the first content paint after a page has
    /// been loaded, or after a `onPaintStatusReset` event. The
    /// `onFirstComposite` will be called once the compositor has started
    /// rendering.
    ///
    /// However, it is possible for the compositor to start rendering before
    /// there is any content to render. `onFirstContentfulPaint` is called once
    /// some content has been rendered.  It may be nothing more than the page
    /// background color. It is not an indication that the whole page has been
    /// rendered.
    func onFirstContentfulPaint(session: GeckoSession)

    /// Notification that the paint status has been reset.
    ///
    /// This callback is invoked whenever the painted content is no longer being
    /// displayed.  This can occur in response to the session being paused.
    /// After this has fired the compositor may continue rendering, but may not
    /// render the page content. This callback can therefore be used in
    /// conjunction with `onFirstContentfulPaint` to determine when there is
    /// valid content being rendered.
    func onPaintStatusReset(session: GeckoSession)

    /// This is fired when the loaded document has a valid Web App Manifest
    /// present.
    ///
    /// The various colors (theme_color, background_color, etc.) present in the
    /// manifest have been transformed into #AARRGGBB format.
    ///
    /// See https://www.w3.org/TR/appmanifest/
    func onWebAppManifest(session: GeckoSession, manifest: Any)

    /// A script has exceeded its execution timeout value
    ///
    /// Returning `.halt` will halt the slow script, and `.resume` will pause
    /// notifications for a period of time before resuming.
    func onSlowScript(session: GeckoSession, scriptFileName: String) async -> SlowScriptResponse

    /// The app should display its dynamic toolbar, fully expanded to the height
    /// that was previously specified via
    /// `GeckoView.setDynamicToolbarMaxHeight`.
    func onShowDynamicToolbar(session: GeckoSession)

    /// This method is called when a cookie banner is detected.
    ///
    /// Note: this method is called only if the cookie banner setting is such
    /// that allows to handle the banner. For example, if
    /// `cookiebanners.service.mode=1` (Reject only), but a cookie banner can
    /// only be accepted on the website - the detection in that case won't be
    /// reported.  The exception is `MODE_DETECT_ONLY` mode, when only the
    /// detection event is emitted.
    func onCookieBannerDetected(session: GeckoSession)

    /// This method is called when a cookie banner was handled.
    func onCookieBannerHandled(session: GeckoSession)
}

enum ContentEvents: String, CaseIterable {
    case contentCrash = "GeckoView:ContentCrash"
    case contentKill = "GeckoView:ContentKill"
    case contextMenu = "GeckoView:ContextMenu"
    case domMetaViewportFit = "GeckoView:DOMMetaViewportFit"
    case pageTitleChanged = "GeckoView:PageTitleChanged"
    case domWindowClose = "GeckoView:DOMWindowClose"
    case externalResponse = "GeckoView:ExternalResponse"
    case focusRequest = "GeckoView:FocusRequest"
    case fullscreenEnter = "GeckoView:FullScreenEnter"
    case fullscreenExit = "GeckoView:FullScreenExit"
    case webAppManifest = "GeckoView:WebAppManifest"
    case firstContentfulPaint = "GeckoView:FirstContentfulPaint"
    case paintStatusReset = "GeckoView:PaintStatusReset"
    case previewImage = "GeckoView:PreviewImage"
    case cookieBannerEventDetected = "GeckoView:CookieBannerEvent:Detected"
    case cookieBannerEventHandled = "GeckoView:CookieBannerEvent:Handled"
    case savePdf = "GeckoView:SavePdf"
    case onProductUrl = "GeckoView:OnProductUrl"
}

func newContentHandler(_ session: GeckoSession) -> GeckoSessionHandler<
    ContentDelegate, ContentEvents
> {
    GeckoSessionHandler(moduleName: "GeckoViewContent", session: session) {
        @MainActor session, delegate, event, message in
        switch event {
        case .contentCrash:
            session.close()
            delegate?.onCrash(session: session)
            return nil
        case .contentKill:
            session.close()
            delegate?.onKill(session: session)
            return nil
        case .contextMenu:
            func parseType(type: String) -> ContextElement.ElementType {
                switch type {
                case "HTMLImageElement": return .image
                case "HTMLVideoElement": return .video
                case "HTMLAudioElement": return .audio
                default: return .none
                }
            }

            let contextElement = ContextElement(
                baseUri: message!["baseUri"] as? String,
                linkUri: message!["linkUri"] as? String,
                title: message!["title"] as? String,
                altText: message!["alt"] as? String,
                type: parseType(type: message!["elementType"] as! String),
                srcUri: message!["elementSrc"] as? String,
                textContent: message!["textContent"] as? String)

            delegate?.onContextMenu(
                session: session,
                screenX: message!["screenX"] as! Int,
                screenY: message!["screenY"] as! Int,
                element: contextElement)
            return nil
        case .domMetaViewportFit:
            delegate?.onMetaViewportFitChange(
                session: session, viewportFit: message!["viewportfit"] as! String)
            return nil
        case .pageTitleChanged:
            delegate?.onTitleChange(session: session, title: message!["title"] as! String)
            return nil
        case .domWindowClose:
            delegate?.onCloseRequest(session: session)
            return nil
        case .externalResponse:
            // FIXME: implement
            throw HandlerError("GeckoView:ExternalResponse is unimplemented")
        case .focusRequest:
            delegate?.onFocusRequest(session: session)
            return nil
        case .fullscreenEnter:
            delegate?.onFullScreen(session: session, fullScreen: true)
            return nil
        case .fullscreenExit:
            delegate?.onFullScreen(session: session, fullScreen: false)
            return nil
        case .webAppManifest:
            delegate?.onWebAppManifest(session: session, manifest: message!["manifest"]!!)
            return nil
        case .firstContentfulPaint:
            delegate?.onFirstContentfulPaint(session: session)
            return nil
        case .paintStatusReset:
            delegate?.onPaintStatusReset(session: session)
            return nil
        case .previewImage:
            delegate?.onPreviewImage(
                session: session, previewImageUrl: message!["previewImageUrl"] as! String)
            return nil
        case .cookieBannerEventDetected:
            delegate?.onCookieBannerDetected(session: session)
            return nil
        case .cookieBannerEventHandled:
            delegate?.onCookieBannerHandled(session: session)
            return nil
        case .savePdf:
            // FIXME: implement
            throw HandlerError("GeckoView:SavePdf is unimplemented")
        case .onProductUrl:
            delegate?.onProductUrl(session: session)
            return nil
        }
    }
}

enum ProcessHangEvents: String, CaseIterable {
    case hangReport = "GeckoView:HangReport"
}

func newProcessHangHandler(_ session: GeckoSession) -> GeckoSessionHandler<
    ContentDelegate, ProcessHangEvents
> {
    GeckoSessionHandler(moduleName: "GeckoViewProcessHangMonitor", session: session) {
        @MainActor session, delegate, event, message in
        switch event {
        case .hangReport:
            let reportId = message!["hangId"] as! Int
            let response = await delegate?.onSlowScript(
                session: session, scriptFileName: message!["scriptFileName"] as! String)
            switch response {
            case .resume:
                session.dispatcher.dispatch(
                    type: "GeckoView:HangReportWait", message: ["hangId": reportId])
            default:
                session.dispatcher.dispatch(
                    type: "GeckoView:HangReportStop", message: ["hangId": reportId])
            }
            return nil
        }
    }
}
