/* -*- Mode: rust; rust-indent-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

extern crate nsstring;
use nsstring::nsACString;
use nsstring::nsCString;
use thin_vec::ThinVec;

use std::ptr;
use url::Url;
use urlpattern::parser::RegexSyntax;
use urlpattern::quirks;
use urlpattern::regexp::RegExp;

use crate::base::*;

pub type Component = urlpattern::component::Component<SpiderMonkeyRegexp>;
pub type Matcher = urlpattern::matcher::Matcher<SpiderMonkeyRegexp>;
pub type InnerMatcher = urlpattern::matcher::InnerMatcher<SpiderMonkeyRegexp>;

pub fn init_from_string_and_base_url(
    input: *const nsACString,
    base_url: *const nsACString,
) -> Option<urlpattern::UrlPatternInit> {
    if input.is_null() {
        return None;
    }
    if let Some(tmp) = unsafe { input.as_ref().map(|x| x.to_utf8().into_owned()) } {
        let maybe_base = if !base_url.is_null() {
            let tmp = unsafe { base_url.as_ref() }
                .map(|x| x.to_utf8().into_owned())
                .as_deref()
                .map(Url::parse);
            match tmp {
                Some(Ok(t)) => Some(t),
                _ => None,
            }
        } else {
            None
        };

        if let Ok(init) =
            urlpattern::UrlPatternInit::parse_constructor_string::<regex::Regex>(&tmp, maybe_base)
        {
            return Some(init.clone());
        }
    }
    None
}

pub fn maybe_to_option_string(m_str: &MaybeString) -> Option<String> {
    if !m_str.valid {
        return None;
    }
    Some(m_str.string.to_string().to_owned())
}

pub fn option_to_maybe_string(os: Option<String>) -> MaybeString {
    let s = match os {
        Some(s) => s,
        _ => {
            return MaybeString {
                string: nsCString::from(""),
                valid: false,
            }
        }
    };
    let s = nsCString::from(s.as_str());
    MaybeString {
        string: s,
        valid: true,
    }
}

pub struct SpiderMonkeyRegexp(String, *mut RegExpObjWrapper);

// Implement drop so that when dom::URLPattern goes out of scope
// urlpattern_pattern_free() also triggers urlpattern::URLPattern<R> to drop.
// When the pattern's inner regexp goes with it, this drop will cleanup the
// spidermonkey regexp obj
impl Drop for SpiderMonkeyRegexp {
    fn drop(&mut self) {
        unsafe {
            free_regexp_ffi(self.1);
        }
    }
}

impl RegExp for SpiderMonkeyRegexp {
    fn syntax() -> RegexSyntax {
        RegexSyntax::EcmaScript
    }

    fn parse(pattern: &str, flags: &str, _force_eval: bool) -> Result<Self, ()> {
        spidermonkey_regexp_parse(pattern, flags)
    }

    fn matches<'a>(&self, text: &'a str) -> Option<Vec<Option<&'a str>>> {
        // bit of a hack because protocol_component_matches_special_scheme
        // needs to know if the result of spidermonkey_matches is none or some
        // during pattern construction to check if protocol matches special schemes.
        // as such this method is not used in firefox for actual matching
        // actual URL matching uses matcher_matches
        let matches = spidermonkey_regexp_matches(self, text, false);
        if matches.is_some() {
            let dummy_vec = vec![None];
            return Some(dummy_vec);
        }
        None
    }

    fn pattern_string(&self) -> &str {
        &self.0
    }
}

pub fn spidermonkey_regexp_parse(pattern: &str, flags: &str) -> Result<SpiderMonkeyRegexp, ()> {
    let pattern16: Vec<u16> = pattern.encode_utf16().collect();
    let flags16: Vec<u16> = flags.encode_utf16().collect();
    let mut regexp_wrapper: *mut RegExpObjWrapper = ptr::null_mut();
    let success = unsafe {
        parse_regexp_ffi(
            pattern16.as_ptr(),
            pattern16.len(),
            flags16.as_ptr(),
            flags16.len(),
            &mut regexp_wrapper,
        )
    };

    if !success {
        return Err(());
    }

    Ok(SpiderMonkeyRegexp(pattern.to_string(), regexp_wrapper))
}

pub fn spidermonkey_regexp_matches<'a>(
    regexp: &SpiderMonkeyRegexp,
    text: &'a str,
    match_only: bool,
) -> Option<Vec<Option<String>>> {
    let mut regexp_wrapper = regexp.1;
    let mut match_result = false;
    let mut results: ThinVec<MaybeString> = ThinVec::new();
    let success = unsafe {
        matches_regexp_ffi(
            &mut regexp_wrapper,
            text.as_ptr(),
            text.len(),
            match_only,
            &mut match_result,
            &mut results,
        )
    };

    // early exit if the regex matching failed to run or if it wasn't a match
    if !success || !match_result {
        return None;
    }

    // copy strings to rust-interface type
    let mut rust_results = Vec::new();
    for i in 0..results.len() {
        let maybe_str = &results[i];
        // Check if this capture group matched (valid == true)
        if maybe_str.valid {
            rust_results.push(Some(maybe_str.string.to_owned().to_string()));
        } else {
            rust_results.push(None);
        }
    }
    Some(rust_results)
}

// performs the match on the inner matcher of a component with a given input string
// this function was adapted from
// https://github.com/denoland/rust-urlpattern/blob/main/src/matcher.rs
pub fn matcher_matches<'a>(
    matcher: *mut UrlPatternMatcherPtr,
    mut input: &'a str,
    match_only: bool,
) -> Option<Vec<Option<String>>> {
    let matcher: &Matcher = unsafe { &*(matcher as *const _ as *const Matcher) };
    let prefix_len = matcher.prefix.len();
    let suffix_len = matcher.suffix.len();
    let input_len = input.len();
    let ignore_case = matcher.ignore_case;

    if prefix_len + suffix_len > 0 {
        // The input must be at least as long as the prefix and suffix combined,
        // because these must both be present, and not overlap.
        if input_len < prefix_len + suffix_len {
            return None;
        }
        if !input.starts_with(&matcher.prefix) {
            return None;
        }
        if !input.ends_with(&matcher.suffix) {
            return None;
        }

        input = &input[prefix_len..input_len - suffix_len];
    }

    match &matcher.inner {
        InnerMatcher::Literal { literal } => {
            if ignore_case {
                (input.to_lowercase() == literal.to_lowercase()).then(Vec::new)
            } else {
                (input == literal).then(Vec::new)
            }
        }

        InnerMatcher::SingleCapture {
            filter,
            allow_empty,
        } => {
            if input.is_empty() && !allow_empty {
                return None;
            }
            if let Some(filter) = filter {
                if ignore_case {
                    if input
                        .to_lowercase()
                        .contains(filter.to_lowercase().collect::<Vec<_>>().as_slice())
                    {
                        return None;
                    }
                } else if input.contains(*filter) {
                    return None;
                }
            }
            Some(vec![Some(input.to_string())])
        }
        InnerMatcher::RegExp { regexp, .. } => {
            // regexp can be an error result here if an invalid regexp string
            // was passed to the regexp constructor. This can happen in the crate
            // during parsing of the URLPattern string input into Init because
            // the parser requires knowing if the protocol provided is
            // special, so we compile AND match on the protocol component
            // pre-emptively. Perhaps, we could detect regexp obj error slightly
            // earlier, immediately after component compilation, but both ways
            // the error bubbles up the same to the glue in
            // init_from_string_and_base_url

            // ignore_case not needed here because the regexp was already
            // compiled with the correct flags. spidermonkey_matches uses the
            // pre-compiled regexp which has the flags baked in.
            let matches = spidermonkey_regexp_matches(regexp.as_ref().ok()?, input, match_only)?;
            Some(
                matches
                    .into_iter()
                    .map(|opt| opt.map(|s| s.to_string()))
                    .collect(),
            )
        }
    }
}

impl From<quirks::MatchInput> for UrlPatternMatchInput {
    fn from(match_input: quirks::MatchInput) -> UrlPatternMatchInput {
        UrlPatternMatchInput {
            protocol: nsCString::from(match_input.protocol),
            username: nsCString::from(match_input.username),
            password: nsCString::from(match_input.password),
            hostname: nsCString::from(match_input.hostname),
            port: nsCString::from(match_input.port),
            pathname: nsCString::from(match_input.pathname),
            search: nsCString::from(match_input.search),
            hash: nsCString::from(match_input.hash),
        }
    }
}

// convert from glue::UrlPatternInit to urlpattern::UrlPatternInit, used by:
// * parse_pattern_from_string
// * parse_pattern_from_init
impl From<UrlPatternInit> for urlpattern::UrlPatternInit {
    fn from(wrapper: UrlPatternInit) -> urlpattern::UrlPatternInit {
        let maybe_base = if wrapper.base_url.valid {
            let s = wrapper.base_url.string.to_string().to_owned();
            if s.is_empty() {
                None
            } else {
                Url::parse(s.as_str()).ok()
            }
        } else {
            None
        };
        urlpattern::UrlPatternInit {
            protocol: maybe_to_option_string(&wrapper.protocol),
            username: maybe_to_option_string(&wrapper.username),
            password: maybe_to_option_string(&wrapper.password),
            hostname: maybe_to_option_string(&wrapper.hostname),
            port: maybe_to_option_string(&wrapper.port),
            pathname: maybe_to_option_string(&wrapper.pathname),
            search: maybe_to_option_string(&wrapper.search),
            hash: maybe_to_option_string(&wrapper.hash),
            base_url: maybe_base,
        }
    }
}

impl From<&UrlPatternInit> for urlpattern::UrlPatternInit {
    fn from(wrapper: &UrlPatternInit) -> urlpattern::UrlPatternInit {
        let maybe_base = if wrapper.base_url.valid {
            let s = wrapper.base_url.string.to_string().to_owned();
            if s.is_empty() {
                None
            } else {
                Url::parse(s.as_str()).ok()
            }
        } else {
            None
        };
        urlpattern::UrlPatternInit {
            protocol: maybe_to_option_string(&wrapper.protocol),
            username: maybe_to_option_string(&wrapper.username),
            password: maybe_to_option_string(&wrapper.password),
            hostname: maybe_to_option_string(&wrapper.hostname),
            port: maybe_to_option_string(&wrapper.port),
            pathname: maybe_to_option_string(&wrapper.pathname),
            search: maybe_to_option_string(&wrapper.search),
            hash: maybe_to_option_string(&wrapper.hash),
            base_url: maybe_base,
        }
    }
}

// convert from glue::UrlPatternInit to quirks::UrlPatternInit
// used by parse_pattern into the internal function
// MatchInput `From` conversion also uses
impl From<UrlPatternInit> for quirks::UrlPatternInit {
    fn from(wrapper: UrlPatternInit) -> quirks::UrlPatternInit {
        let maybe_base = if wrapper.base_url.valid {
            Some(wrapper.base_url.string.to_string())
        } else {
            None
        };

        quirks::UrlPatternInit {
            protocol: maybe_to_option_string(&wrapper.protocol),
            username: maybe_to_option_string(&wrapper.username),
            password: maybe_to_option_string(&wrapper.password),
            hostname: maybe_to_option_string(&wrapper.hostname),
            port: maybe_to_option_string(&wrapper.port),
            pathname: maybe_to_option_string(&wrapper.pathname),
            search: maybe_to_option_string(&wrapper.search),
            hash: maybe_to_option_string(&wrapper.hash),
            base_url: maybe_base,
        }
    }
}

// needed for process_match_input_from_init
impl From<&UrlPatternInit> for quirks::UrlPatternInit {
    fn from(wrapper: &UrlPatternInit) -> Self {
        let maybe_base = if wrapper.base_url.valid {
            Some(wrapper.base_url.string.to_string())
        } else {
            None
        };
        quirks::UrlPatternInit {
            protocol: maybe_to_option_string(&wrapper.protocol),
            username: maybe_to_option_string(&wrapper.username),
            password: maybe_to_option_string(&wrapper.password),
            hostname: maybe_to_option_string(&wrapper.hostname),
            port: maybe_to_option_string(&wrapper.port),
            pathname: maybe_to_option_string(&wrapper.pathname),
            search: maybe_to_option_string(&wrapper.search),
            hash: maybe_to_option_string(&wrapper.hash),
            base_url: maybe_base,
        }
    }
}

impl From<quirks::UrlPatternInit> for UrlPatternInit {
    fn from(init: quirks::UrlPatternInit) -> UrlPatternInit {
        let base = match init.base_url.as_ref() {
            Some(s) => MaybeString {
                valid: true,
                string: nsCString::from(s),
            },
            _ => MaybeString {
                valid: false,
                string: nsCString::from(""),
            },
        };

        UrlPatternInit {
            protocol: option_to_maybe_string(init.protocol),
            username: option_to_maybe_string(init.username),
            password: option_to_maybe_string(init.password),
            hostname: option_to_maybe_string(init.hostname),
            port: option_to_maybe_string(init.port),
            pathname: option_to_maybe_string(init.pathname),
            search: option_to_maybe_string(init.search),
            hash: option_to_maybe_string(init.hash),
            base_url: base,
        }
    }
}

// easily convert from glue::options to crate lib options
impl Into<urlpattern::UrlPatternOptions> for UrlPatternOptions {
    fn into(self) -> urlpattern::UrlPatternOptions {
        urlpattern::UrlPatternOptions {
            ignore_case: self.ignore_case,
            regex_syntax: RegexSyntax::Rust,
        }
    }
}

// FFI declarations for calling C++ RegexEval
extern "C" {
    fn parse_regexp_ffi(
        pattern: *const u16,
        pattern_len: usize,
        flags: *const u16,
        flags_len: usize,
        res: *mut *mut RegExpObjWrapper,
    ) -> bool;

    fn matches_regexp_ffi(
        regexp_wrapper: *const *mut RegExpObjWrapper,
        string: *const u8,
        string_len: usize,
        match_only: bool,
        match_result: *mut bool,
        res: &mut ThinVec<MaybeString>,
    ) -> bool;

    fn free_regexp_ffi(regexp_wrapper: *mut RegExpObjWrapper);
}
