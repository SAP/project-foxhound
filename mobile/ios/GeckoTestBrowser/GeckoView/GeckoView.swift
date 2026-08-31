// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

import UIKit

public class GeckoView: UIView {
    public var session: GeckoSession? {
        didSet {
            // FIXME: Suspend old view, unsuspend new view, etc.

            // Remove all subviews from this view, to clean up any previous state.
            for view in subviews {
                view.removeFromSuperview()
            }

            // Add the new session's view under this GeckoView, and size it to fill this view.
            guard let sessionView = session?.window?.view() else { return }

            if sessionView.superview != nil {
                fatalError("attempt to assign GeckoSession to multiple GeckoView instances")
            }

            sessionView.translatesAutoresizingMaskIntoConstraints = false
            addSubview(sessionView)

            NSLayoutConstraint.activate([
                sessionView.topAnchor.constraint(equalTo: topAnchor),
                sessionView.leadingAnchor.constraint(equalTo: leadingAnchor),
                sessionView.bottomAnchor.constraint(equalTo: bottomAnchor),
                sessionView.trailingAnchor.constraint(equalTo: trailingAnchor),
            ])
        }
    }
}
