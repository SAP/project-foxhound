// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import UIKit

struct BrowserSearchBarViewModel {
    let placeholder: String
}

protocol BrowserSearchBarDelegate: AnyObject {
    func openBrowser(searchTerm: String)
}

class BrowserSearchBar: UIView {
    private weak var browserDelegate: BrowserSearchBarDelegate?

    private lazy var searchBar: UISearchBar = .build { bar in
        bar.searchBarStyle = .minimal
        bar.backgroundColor = .systemBackground
    }

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupSearchBar()
        backgroundColor = searchBar.backgroundColor
    }

    required init?(coder aDecoder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func configure(browserDelegate: BrowserSearchBarDelegate) {
        self.searchBar.delegate = self
        self.browserDelegate = browserDelegate
    }

    func setSearchBarText(_ text: String?) {
        searchBar.text = text?.lowercased()
    }

    func getSearchBarText() -> String? {
        return searchBar.text?.lowercased()
    }

    @discardableResult
    override func becomeFirstResponder() -> Bool {
        searchBar.becomeFirstResponder()
        return super.becomeFirstResponder()
    }

    @discardableResult
    override func resignFirstResponder() -> Bool {
        searchBar.resignFirstResponder()
        return super.resignFirstResponder()
    }

    // MARK: - Private

    private func setupSearchBar() {
        addSubview(searchBar)

        NSLayoutConstraint.activate([
            searchBar.topAnchor.constraint(equalTo: topAnchor),
            searchBar.bottomAnchor.constraint(equalTo: bottomAnchor),
            searchBar.trailingAnchor.constraint(equalTo: trailingAnchor),
            searchBar.leadingAnchor.constraint(equalTo: leadingAnchor),
        ])
    }
}

// MARK: - UISearchBarDelegate
extension BrowserSearchBar: UISearchBarDelegate {
    func searchBarSearchButtonClicked(_ searchBar: UISearchBar) {
        guard let searchText = searchBar.text?.lowercased(), !searchText.isEmpty else { return }

        browserDelegate?.openBrowser(searchTerm: searchText)
    }
}
