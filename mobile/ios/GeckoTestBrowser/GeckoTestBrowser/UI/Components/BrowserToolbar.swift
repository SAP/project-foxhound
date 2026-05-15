// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import UIKit

protocol BrowserToolbarDelegate: AnyObject {
    func backButtonClicked()
    func forwardButtonClicked()
    func reloadButtonClicked()
    func stopButtonClicked()
}

class BrowserToolbar: UIToolbar {
    weak var toolbarDelegate: BrowserToolbarDelegate?
    private var reloadStopButton: UIBarButtonItem!
    private var backButton: UIBarButtonItem!
    private var forwardButton: UIBarButtonItem!

    // By default the state is set to reload. We save the state to avoid setting the toolbar
    // button multiple times when a page load is in progress
    private var isReloading: Bool = true

    // MARK: - Init

    override init(frame: CGRect) {
        super.init(frame: frame)

        backButton = UIBarButtonItem(
            image: UIImage(systemName: "arrow.left"),
            style: .plain,
            target: self,
            action: #selector(backButtonClicked))
        forwardButton = UIBarButtonItem(
            image: UIImage(systemName: "arrow.right"),
            style: .plain,
            target: self,
            action: #selector(forwardButtonClicked))
        reloadStopButton = UIBarButtonItem(
            image: UIImage(systemName: "arrow.clockwise"),
            style: .plain,
            target: self,
            action: #selector(reloadButtonClicked))

        var items = [UIBarButtonItem]()
        items.append(
            UIBarButtonItem(barButtonSystemItem: .flexibleSpace, target: self, action: nil))
        items.append(backButton)
        items.append(
            UIBarButtonItem(barButtonSystemItem: .flexibleSpace, target: self, action: nil))
        items.append(forwardButton)
        items.append(
            UIBarButtonItem(barButtonSystemItem: .flexibleSpace, target: self, action: nil))
        items.append(reloadStopButton)
        items.append(
            UIBarButtonItem(barButtonSystemItem: .flexibleSpace, target: self, action: nil))
        setItems(items, animated: false)

        barTintColor = .white
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    // MARK: - Button states

    func updateReloadStopButton(isLoading: Bool) {
        guard isLoading != isReloading else { return }
        reloadStopButton.image = isLoading ? UIImage(systemName: "xmark") : UIImage(systemName: "arrow.clockwise")
        reloadStopButton.action =
            isLoading ? #selector(stopButtonClicked) : #selector(reloadButtonClicked)
        self.isReloading = isLoading
    }

    func updateBackButton(canGoBack: Bool) {
        backButton.isEnabled = canGoBack
    }

    func updateForwardButton(canGoForward: Bool) {
        forwardButton.isEnabled = canGoForward
    }

    // MARK: - Actions

    @objc func backButtonClicked() {
        toolbarDelegate?.backButtonClicked()
    }

    @objc func forwardButtonClicked() {
        toolbarDelegate?.forwardButtonClicked()
    }

    @objc func reloadButtonClicked() {
        toolbarDelegate?.reloadButtonClicked()
    }

    @objc func stopButtonClicked() {
        toolbarDelegate?.stopButtonClicked()
    }
}
