/* -*- Mode: rust; rust-indent-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

extern crate urlpattern;
use urlpattern::parser::RegexSyntax;
use urlpattern::quirks;
use urlpattern::regexp::RegExp;

type SpiderMonkeyUrlPattern = urlpattern::UrlPattern<SpiderMonkeyRegexp>;

extern crate nsstring;
use nsstring::nsACString;
use nsstring::nsCString;
use thin_vec::ThinVec;

mod helpers;
use helpers::*;

pub mod base;
use base::*;

use log::debug;

#[no_mangle]
pub extern "C" fn urlpattern_parse_pattern_from_string(
    input: *const nsACString,
    base_url: *const nsACString,
    options: UrlPatternOptions,
    res: *mut UrlPatternGlue,
) -> bool {
    debug!("urlpattern_parse_pattern_from_string()");
    let init = if let Some(init) = init_from_string_and_base_url(input, base_url) {
        init
    } else {
        return false;
    };

    let options = urlpattern::UrlPatternOptions {
        regex_syntax: RegexSyntax::EcmaScript,
        ignore_case: options.ignore_case,
    };
    if let Ok(pattern) = quirks::parse_pattern_as_lib::<SpiderMonkeyRegexp>(init, options) {
        unsafe {
            *res = UrlPatternGlue(Box::into_raw(Box::new(pattern)) as *mut _);
        }
        return true;
    }
    false
}

#[no_mangle]
pub unsafe extern "C" fn urlpattern_parse_pattern_from_init(
    init: &UrlPatternInit,
    options: UrlPatternOptions,
    res: *mut UrlPatternGlue,
) -> bool {
    debug!("urlpattern_parse_pattern_from_init()");

    let options = urlpattern::UrlPatternOptions {
        regex_syntax: RegexSyntax::EcmaScript,
        ignore_case: options.ignore_case,
    };
    if let Ok(pattern) = quirks::parse_pattern_as_lib::<SpiderMonkeyRegexp>(init.into(), options) {
        *res = UrlPatternGlue(Box::into_raw(Box::new(pattern)) as *mut _);
        return true;
    }
    false
}

// When dom::URLPattern goes out of scope destructor will drop the underlying
// urlpattern::UrlPattern<R> (lib.rs)
#[no_mangle]
pub unsafe extern "C" fn urlpattern_pattern_free(pattern: UrlPatternGlue) {
    drop(Box::from_raw(pattern.0 as *mut SpiderMonkeyUrlPattern));
}

#[no_mangle]
pub unsafe extern "C" fn urlpattern_get_has_regexp_groups(pattern: UrlPatternGlue) -> bool {
    let q_pattern = &*(pattern.0 as *const SpiderMonkeyUrlPattern);
    q_pattern.has_regexp_groups()
}

#[no_mangle]
pub unsafe extern "C" fn urlpattern_get_protocol_component(
    pattern: UrlPatternGlue,
) -> *mut UrlPatternComponentPtr {
    let q_pattern = &*(pattern.0 as *const SpiderMonkeyUrlPattern);
    &q_pattern.protocol as *const _ as *mut UrlPatternComponentPtr
}

#[no_mangle]
pub unsafe extern "C" fn urlpattern_get_username_component(
    pattern: UrlPatternGlue,
) -> *mut UrlPatternComponentPtr {
    let q_pattern = &*(pattern.0 as *const SpiderMonkeyUrlPattern);
    &q_pattern.username as *const _ as *mut UrlPatternComponentPtr
}

#[no_mangle]
pub unsafe extern "C" fn urlpattern_get_password_component(
    pattern: UrlPatternGlue,
) -> *mut UrlPatternComponentPtr {
    let q_pattern = &*(pattern.0 as *const SpiderMonkeyUrlPattern);
    &q_pattern.password as *const _ as *mut UrlPatternComponentPtr
}

#[no_mangle]
pub unsafe extern "C" fn urlpattern_get_hostname_component(
    pattern: UrlPatternGlue,
) -> *mut UrlPatternComponentPtr {
    let q_pattern = &*(pattern.0 as *const SpiderMonkeyUrlPattern);
    &q_pattern.hostname as *const _ as *mut UrlPatternComponentPtr
}

#[no_mangle]
pub unsafe extern "C" fn urlpattern_get_port_component(
    pattern: UrlPatternGlue,
) -> *mut UrlPatternComponentPtr {
    let q_pattern = &*(pattern.0 as *const SpiderMonkeyUrlPattern);
    &q_pattern.port as *const _ as *mut UrlPatternComponentPtr
}

#[no_mangle]
pub unsafe extern "C" fn urlpattern_get_pathname_component(
    pattern: UrlPatternGlue,
) -> *mut UrlPatternComponentPtr {
    let q_pattern = &*(pattern.0 as *const SpiderMonkeyUrlPattern);
    &q_pattern.pathname as *const _ as *mut UrlPatternComponentPtr
}

#[no_mangle]
pub unsafe extern "C" fn urlpattern_get_search_component(
    pattern: UrlPatternGlue,
) -> *mut UrlPatternComponentPtr {
    let q_pattern = &*(pattern.0 as *const SpiderMonkeyUrlPattern);
    &q_pattern.search as *const _ as *mut UrlPatternComponentPtr
}

#[no_mangle]
pub unsafe extern "C" fn urlpattern_get_hash_component(
    pattern: UrlPatternGlue,
) -> *mut UrlPatternComponentPtr {
    let q_pattern = &*(pattern.0 as *const SpiderMonkeyUrlPattern);
    &q_pattern.hash as *const _ as *mut UrlPatternComponentPtr
}

#[no_mangle]
pub unsafe extern "C" fn urlpattern_component_get_pattern_string(
    component_ptr: *mut UrlPatternComponentPtr,
    res: &mut nsCString,
) {
    let component = &*(component_ptr as *const Component);
    res.assign(&nsCString::from(&component.pattern_string));
}

#[no_mangle]
pub unsafe extern "C" fn urlpattern_component_is_regexp_string_empty(
    component_ptr: *mut UrlPatternComponentPtr,
) -> bool {
    let component = &*(component_ptr as *const Component);
    match &component.regexp {
        Ok(regexp) => return regexp.pattern_string() == "^$",
        Err(_) => return false,
    }
}

#[no_mangle]
pub unsafe extern "C" fn urlpattern_component_get_group_name_list(
    component_ptr: *mut UrlPatternComponentPtr,
    res: &mut ThinVec<nsCString>,
) {
    let component = &*(component_ptr as *const Component);
    for name in &component.group_name_list {
        res.push(nsCString::from(name.as_str()));
    }
}

// note: the ThinVec<MaybeString> is being returned as an out-param
// because if you attempt to return the vector in the normal way
// we end up with an incongruent ABI layout between C++ and rust
// which re-orders the input parameter pointers such that we cannot reference them
// by address reliably.
// Ie. ThinVec/nsTArray is a non-trivial for the purpose of calls
// so we use an out-param instead. We see similar patterns elsewhere in this file
// for return values on the C++/rust ffi boundary
#[no_mangle]
pub unsafe extern "C" fn urlpattern_component_matches(
    component_ptr: *mut UrlPatternComponentPtr,
    input: &nsACString,
    match_only: bool,
    res: &mut ThinVec<MaybeString>,
) -> bool {
    let component = &*(component_ptr as *const Component);
    let input_str = input.to_utf8();

    let matcher_ptr = &component.matcher as *const _ as *mut UrlPatternMatcherPtr;
    let matches = matcher_matches(matcher_ptr, input_str.as_ref(), match_only);

    if let Some(inner_vec) = matches {
        // urlpattern::test() does not need to populate matcher results
        // it just needs to know if we got a match.
        // So only iterate across results if it was Exec() that called
        if !match_only {
            for item in inner_vec {
                match item {
                    Some(s) => {
                        res.push(MaybeString {
                            string: nsCString::from(s),
                            valid: true,
                        });
                    }
                    None => {
                        res.push(MaybeString {
                            string: nsCString::new(),
                            valid: false,
                        });
                    }
                }
            }
        }
        true
    } else {
        false
    }
}

// note: can't return Result<Option<...>> since cbindgen doesn't handle well
// so we need to return a type that can be used in C++ and rust
#[no_mangle]
pub extern "C" fn urlpattern_process_match_input_from_string(
    url_str: *const nsACString,
    base_url: *const nsACString,
    res: *mut UrlPatternMatchInputAndInputs,
) -> bool {
    debug!("urlpattern_process_match_input_from_string()");
    if let Some(url) = unsafe { url_str.as_ref().map(|x| x.to_utf8()) } {
        let str_or_init = quirks::StringOrInit::String(url);
        let maybe_base_url = if base_url.is_null() {
            None
        } else {
            let x = unsafe { (*base_url).as_str_unchecked() };
            Some(x)
        };

        let match_input_and_inputs = quirks::process_match_input(str_or_init, maybe_base_url);
        if let Ok(Some(tuple_struct)) = match_input_and_inputs {
            // parse "input"
            let match_input = tuple_struct.0;
            let maybe_match_input = quirks::parse_match_input(match_input);

            if maybe_match_input.is_none() {
                return false;
            }

            // convert "inputs"
            let tuple_soi_and_string = tuple_struct.1;
            let string = match tuple_soi_and_string.0 {
                quirks::StringOrInit::String(x) => x,
                _ => {
                    assert!(
                        false,
                        "Pulling init out of StringOrInit shouldn't happen in _from_string"
                    );
                    return false;
                }
            };
            let base = match tuple_soi_and_string.1 {
                Some(x) => MaybeString::new(&nsCString::from(x)),
                _ => MaybeString::none(),
            };
            let tmp = UrlPatternMatchInputAndInputs {
                input: maybe_match_input.unwrap().into(),
                inputs: UrlPatternInput {
                    string_or_init_type: UrlPatternStringOrInitType::String,
                    str: nsCString::from(string.as_ref()),
                    init: UrlPatternInit::none(),
                    base,
                },
            };
            unsafe { *res = tmp };
            return true;
        } else {
            return false;
        }
    }
    false
}

#[no_mangle]
pub extern "C" fn urlpattern_process_match_input_from_init(
    init: &UrlPatternInit,
    base_url: *const nsACString,
    res: *mut UrlPatternMatchInputAndInputs,
) -> bool {
    debug!("urlpattern_process_match_input_from_init()");
    let q_init = init.into();
    let str_or_init = quirks::StringOrInit::Init(q_init);

    let maybe_base_url = if base_url.is_null() {
        None
    } else {
        Some(unsafe { (*base_url).as_str_unchecked() })
    };
    let match_input_and_inputs = quirks::process_match_input(str_or_init, maybe_base_url);
    // an empty string passed to base_url will cause url-parsing failure
    // in process_match_input, which we handle here
    if let Ok(Some(tuple_struct)) = match_input_and_inputs {
        let match_input = tuple_struct.0;
        let maybe_match_input = quirks::parse_match_input(match_input);
        if maybe_match_input.is_none() {
            return false;
        }
        let tuple_soi_and_string = tuple_struct.1;
        let init = match tuple_soi_and_string.0 {
            quirks::StringOrInit::Init(x) => x,
            _ => {
                assert!(
                    false,
                    "Pulling string out of StringOrInit shouldn't happen in _from_init"
                );
                return false;
            }
        };

        let base = match tuple_soi_and_string.1 {
            Some(x) => MaybeString::new(&nsCString::from(x)),
            _ => MaybeString::none(),
        };

        let tmp = UrlPatternMatchInputAndInputs {
            input: maybe_match_input.unwrap().into(),
            inputs: UrlPatternInput {
                string_or_init_type: UrlPatternStringOrInitType::Init,
                str: nsCString::new(),
                init: init.into(),
                base,
            },
        };
        unsafe { *res = tmp };
        return true;
    } else {
        return false;
    }
}
