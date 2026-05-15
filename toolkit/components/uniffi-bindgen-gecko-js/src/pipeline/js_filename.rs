/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

use super::*;
use heck::ToUpperCamelCase;

pub fn pass(namespace: &mut Namespace) -> Result<()> {
    namespace.js_filename = format!("Rust{}.sys.mjs", namespace.name.to_upper_camel_case());
    Ok(())
}
