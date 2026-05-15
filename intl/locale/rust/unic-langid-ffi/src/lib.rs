/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

use nsstring::nsACString;
pub use unic_langid::{subtags, CharacterDirection, LanguageIdentifier, LanguageIdentifierError};

pub fn new_langid_for_mozilla(
    name: &nsACString,
) -> Result<LanguageIdentifier, LanguageIdentifierError> {
    if name.eq_ignore_ascii_case(b"ja-jp-mac") {
        "ja-JP-macos".parse()
    } else {
        // Cut out any `.FOO` like `en-US.POSIX`.
        let mut name: &[u8] = name.as_ref();
        if let Some(ptr) = name.iter().position(|b| b == &b'.') {
            name = &name[..ptr];
        }
        LanguageIdentifier::from_bytes(name)
    }
}

#[no_mangle]
pub extern "C" fn unic_langid_canonicalize(name: &mut nsACString) -> bool {
    let langid = new_langid_for_mozilla(name);

    let result = langid.is_ok();

    name.assign(&langid.unwrap_or_default().to_string());

    result
}

#[no_mangle]
pub unsafe extern "C" fn unic_langid_destroy(langid: *mut LanguageIdentifier) {
    let _ = Box::from_raw(langid);
}

#[no_mangle]
pub extern "C" fn unic_langid_is_rtl(name: &nsACString) -> bool {
    match new_langid_for_mozilla(name) {
        Ok(langid) => langid.character_direction() == CharacterDirection::RTL,
        Err(_) => false,
    }
}
