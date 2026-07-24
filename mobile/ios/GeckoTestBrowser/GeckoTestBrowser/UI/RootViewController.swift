// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import GeckoView
import UIKit

// Holds toolbar, search bar, search and browser VCs
class RootViewController: UIViewController {
    private lazy var toolbar: BrowserToolbar = .build { _ in }
    private lazy var searchBar: BrowserSearchBar = .build { _ in }
    private lazy var statusBarFiller: UIView = .build { view in
        view.backgroundColor = .white
    }
    private lazy var progress: UIProgressView = .build { _ in }
    private lazy var geckoview: GeckoView = .build { _ in }

    // Be lenient about what is classified as potentially a URL.
    // (\w+-+)*[\w\[]+(://[/]*|:|\.)(\w+-+)*[\w\[:]+([\S&&[^\w-]]\S*)?
    // --------                     --------
    // 0 or more pairs of consecutive word letters or dashes
    //         -------                      --------
    // followed by at least a single word letter or [ipv6::] character.
    // ---------------              ----------------
    // Combined, that means "w", "w-w", "w-w-w", etc match, but "w-", "w-w-", "w-w-w-" do not.
    //                --------------
    // That surrounds :, :// or .
    //                                                               -
    // At the end, there may be an optional
    //                                               ------------
    // non-word, non-- but still non-space character (e.g., ':', '/', '.', '?' but not 'a', '-', '\t')
    //                                                           ---
    // and 0 or more non-space characters.
    //
    // These are some (odd) examples of valid urls according to this pattern:
    // c-c.com
    // c-c-c-c.c-c-c
    // c-http://c.com
    // about-mozilla:mozilla
    // c-http.d-x
    // www.c-
    // 3-3.3
    // www.c-c.-
    //
    // There are some examples of non-URLs according to this pattern:
    // -://x.com
    // -x.com
    // http://www-.com
    // www.c-c-
    // 3-3
    private lazy var isURLLenient =
        try! Regex("^\\s*(\\w+-+)*[\\w\\[]+(://[/]*|:|\\.)(\\w+-+)*[\\w\\[:]+([\\S&&[^\\w-]]\\S*)?\\s*$")

    // Note: For easier debugging, we might need to load
    // same URL again and for this use the following homepage url
    private var homepage = ""

    // MARK: - Init

    init() {
        super.init(nibName: nil, bundle: nil)
        view.backgroundColor = .black
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    // MARK: - Life cycle

    override func viewDidLoad() {
        super.viewDidLoad()

        configureProgress()
        configureBrowserView()
        configureSearchbar()
        configureToolbar()

        let session = GeckoSession()
        session.contentDelegate = self
        session.progressDelegate = self
        session.navigationDelegate = self
        session.open()

        geckoview.session = session

        if let testUrl = ProcessInfo.processInfo.environment["MOZ_TEST_URL"] {
            browse(to: testUrl)
        } else if !homepage.isEmpty {
            browse(to: homepage)
        }
    }

    private func configureBrowserView() {
        view.addSubview(geckoview)

        NSLayoutConstraint.activate([
            geckoview.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            geckoview.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            geckoview.topAnchor.constraint(equalTo: progress.bottomAnchor),
        ])
    }

    private func configureProgress() {
        view.addSubview(progress)

        NSLayoutConstraint.activate([
            progress.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            progress.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            progress.heightAnchor.constraint(equalToConstant: 3),
        ])

        progress.progressTintColor = .orange
    }

    private func configureSearchbar() {
        view.addSubview(statusBarFiller)
        view.addSubview(searchBar)

        NSLayoutConstraint.activate([
            statusBarFiller.topAnchor.constraint(equalTo: view.topAnchor),
            statusBarFiller.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            statusBarFiller.bottomAnchor.constraint(equalTo: searchBar.topAnchor),
            statusBarFiller.trailingAnchor.constraint(equalTo: view.trailingAnchor),

            searchBar.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            searchBar.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            searchBar.bottomAnchor.constraint(equalTo: progress.topAnchor),
            searchBar.trailingAnchor.constraint(equalTo: view.trailingAnchor),
        ])

        searchBar.configure(browserDelegate: self)
        searchBar.becomeFirstResponder()
    }

    private func configureToolbar() {
        view.addSubview(toolbar)

        NSLayoutConstraint.activate([
            toolbar.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            toolbar.bottomAnchor.constraint(equalTo: view.bottomAnchor, constant: -20),
            toolbar.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            toolbar.topAnchor.constraint(equalTo: geckoview.bottomAnchor),
        ])

        toolbar.toolbarDelegate = self
    }

    private func browse(to term: String) {
        searchBar.resignFirstResponder()

        let trimmedValue = term.trimmingCharacters(in: .whitespacesAndNewlines)

        guard !trimmedValue.isEmpty else { return }

        if (try? isURLLenient.wholeMatch(in: term)) != nil {
            geckoview.session?.load(term)
        } else {
            // If not a valid URL, create a search URL
            let encodedValue =
                trimmedValue.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
            geckoview.session?.load("https://www.google.com/search?q=\(encodedValue)")
        }
    }
}

// MARK: - BrowserToolbarDelegate
extension RootViewController: BrowserToolbarDelegate {
    func backButtonClicked() {
        geckoview.session?.goBack()
    }

    func forwardButtonClicked() {
        geckoview.session?.goForward()
    }

    func reloadButtonClicked() {
        geckoview.session?.reload()
    }

    func stopButtonClicked() {
        geckoview.session?.stop()
    }
}

// MARK: - BrowserSearchBarDelegate
extension RootViewController: BrowserSearchBarDelegate {
    func openBrowser(searchTerm: String) {
        guard let searchText = searchBar.getSearchBarText(), !searchText.isEmpty else { return }
        browse(to: searchText)
    }
}

// MARK: - ContentDelegate
extension RootViewController: ContentDelegate {
    func onTitleChange(session: GeckoSession, title: String) {}

    func onPreviewImage(session: GeckoSession, previewImageUrl: String) {}

    func onFocusRequest(session: GeckoSession) {}

    func onCloseRequest(session: GeckoSession) {
        session.close()
        geckoview.session = nil
    }

    func onFullScreen(session: GeckoSession, fullScreen: Bool) {}

    func onMetaViewportFitChange(session: GeckoSession, viewportFit: String) {}

    func onProductUrl(session: GeckoSession) {}

    func onContextMenu(
        session: GeckoSession, screenX: Int, screenY: Int, element: ContextElement
    ) {}

    func onCrash(session: GeckoSession) {}

    func onKill(session: GeckoSession) {}

    func onFirstComposite(session: GeckoSession) {}

    func onFirstContentfulPaint(session: GeckoSession) {}

    func onPaintStatusReset(session: GeckoSession) {}

    func onWebAppManifest(session: GeckoSession, manifest: Any) {}

    func onSlowScript(session: GeckoSession, scriptFileName: String) async
        -> SlowScriptResponse
    { .halt }

    func onShowDynamicToolbar(session: GeckoSession) {}

    func onCookieBannerDetected(session: GeckoSession) {}

    func onCookieBannerHandled(session: GeckoSession) {}
}

// MARK: - NavigationDelegate
extension RootViewController: NavigationDelegate {
    func onLocationChange(
        session: GeckoSession, url: String?, permissions: [ContentPermission]
    ) {}

    func onCanGoBack(session: GeckoSession, canGoBack: Bool) {
        self.toolbar.updateBackButton(canGoBack: canGoBack)
    }

    func onCanGoForward(session: GeckoSession, canGoForward: Bool) {
        self.toolbar.updateForwardButton(canGoForward: canGoForward)
    }

    func onLoadRequest(session: GeckoSession, request: LoadRequest) -> AllowOrDeny { .allow }

    func onSubframeLoadRequest(session: GeckoSession, request: LoadRequest) -> AllowOrDeny {
        .allow
    }

    func onNewSession(session: GeckoSession, uri: String) -> GeckoSession? { nil }
}

// MARK: - ProgressDelegate
extension RootViewController: ProgressDelegate {
    func onPageStart(session: GeckoSession, url: String) {
        self.progress.isHidden = false
        toolbar.updateReloadStopButton(isLoading: true)
    }

    func onPageStop(session: GeckoSession, success: Bool) {
        toolbar.updateReloadStopButton(isLoading: false)
        self.progress.isHidden = true
    }

    func onProgressChange(session: GeckoSession, progress: Int) {
        self.progress.progress = Float(progress) / 100
    }
}
