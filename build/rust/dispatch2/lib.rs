/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Because of <https://github.com/rust-lang/cargo/issues/10801>, the `dispatch2`
// crate appears in our lock file (due to being a weak dependency of the `objc2`
// feature in the `objc2-core-foundation` crate) even though we do not actually
// build or use it.
//
// Rather than vendor unnecessary third-party code into the tree,
// this stub is present as a workaround.

compile_error!("The dispatch2 crate is not available");
