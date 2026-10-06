/* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/. */
use percent_encoding::{percent_decode, percent_encode, NON_ALPHANUMERIC};
use std::str;

/// The `FragmentDirectiveParameter` represents one of
/// `[prefix-,]start[,end][,-suffix]` without any surrounding `-` or `,`.
///
/// The token is stored as percent-decoded string.
/// Therefore, interfaces exist to
///   - create a `FragmentDirectiveParameter` from a percent-encoded string.
///     This function will determine from occurrence and position of a dash
///     if the token represents a `prefix`, `suffix` or either `start` or `end`.
///   - create a percent-encoded string from the value the token holds.
pub enum TextDirectiveParameter {
    Prefix(String),
    StartOrEnd(String),
    Suffix(String),
}

impl TextDirectiveParameter {
    /// Creates a token from a percent-encoded string.
    /// Based on position of a dash the correct token type is determined.
    /// Returns `None` in case of an ill-formed token:
    ///   - starts and ends with a dash (i.e. `-token-`)
    ///   - only consists of a dash (i.e. `-`) or is empty
    ///   - conversion from percent-encoded string to utf8 fails.
    pub fn from_percent_encoded(token: &[u8]) -> Option<Self> {
        if token.is_empty() {
            return None;
        }
        let starts_with_dash = *token.first().unwrap() == b'-';
        let ends_with_dash = *token.last().unwrap() == b'-';
        if starts_with_dash && ends_with_dash {
            // `-token-` is not valid.
            return None;
        }
        if token.len() == 1 && starts_with_dash {
            // `-` is not valid.
            return None;
        }
        // Note: Trimming of the raw strings is currently not mentioned in the spec.
        // However, it looks as it is implicitly expected.
        if starts_with_dash {
            if let Ok(decoded_suffix) = percent_decode(&token[1..]).decode_utf8() {
                return Some(TextDirectiveParameter::Suffix(String::from(
                    decoded_suffix.trim(),
                )));
            }
            return None;
        }
        if ends_with_dash {
            if let Ok(decoded_prefix) = percent_decode(&token[..token.len() - 1]).decode_utf8() {
                return Some(TextDirectiveParameter::Prefix(String::from(
                    decoded_prefix.trim(),
                )));
            }
            return None;
        }
        if let Ok(decoded_text) = percent_decode(&token).decode_utf8() {
            return Some(TextDirectiveParameter::StartOrEnd(String::from(
                decoded_text.trim(),
            )));
        }
        None
    }

    /// Returns the value of the token as percent-decoded `String`.
    pub fn value(&self) -> &String {
        match self {
            TextDirectiveParameter::Prefix(value) => &value,
            TextDirectiveParameter::StartOrEnd(value) => &value,
            TextDirectiveParameter::Suffix(value) => &value,
        }
    }

    /// Creates a percent-encoded string of the token's value.
    /// This includes placing a dash appropriately
    /// to indicate whether this token is prefix, suffix or start/end.
    ///
    /// This method always returns a new object.
    pub fn to_percent_encoded_string(&self) -> String {
        let encode = |text: &String| percent_encode(text.as_bytes(), NON_ALPHANUMERIC).to_string();
        match self {
            Self::Prefix(text) => encode(text) + "-",
            Self::StartOrEnd(text) => encode(text),
            Self::Suffix(text) => {
                let encoded = encode(text);
                let mut result = String::with_capacity(encoded.len() + 1);
                result.push_str("-");
                result.push_str(&encoded);
                result
            }
        }
    }
}

/// This struct represents one parsed text directive using Rust types.
///
/// A text fragment is encoded into a URL fragment like this:
/// `text=[prefix-,]start[,end][,-suffix]`
///
/// The text directive is considered valid if at least `start` is not None.
/// (see `Self::is_valid()`).
#[derive(Default)]
pub struct TextDirective {
    prefix: Option<TextDirectiveParameter>,
    start: Option<TextDirectiveParameter>,
    end: Option<TextDirectiveParameter>,
    suffix: Option<TextDirectiveParameter>,
}
impl TextDirective {
    /// Creates an instance from string parts.
    /// This function is intended to be used when a fragment directive string should be created.
    /// Returns `None` if `start` is empty.
    pub fn from_parts(prefix: String, start: String, end: String, suffix: String) -> Option<Self> {
        if !start.is_empty() {
            Some(Self {
                prefix: if !prefix.is_empty() {
                    Some(TextDirectiveParameter::Prefix(prefix.trim().into()))
                } else {
                    None
                },
                start: Some(TextDirectiveParameter::StartOrEnd(start.trim().into())),
                end: if !end.is_empty() {
                    Some(TextDirectiveParameter::StartOrEnd(end.trim().into()))
                } else {
                    None
                },
                suffix: if !suffix.is_empty() {
                    Some(TextDirectiveParameter::Suffix(suffix.trim().into()))
                } else {
                    None
                },
            })
        } else {
            None
        }
    }

    /// Creates an instance from a percent-encoded string
    /// that originates from a fragment directive.
    ///
    /// `text_fragment` is supposed to have this format:
    /// ```ignore
    /// text=[prefix-,]start[,end][,-suffix]
    /// ```
    /// This function returns `None` if `text_fragment`
    /// does not start with `text=`, it contains 0 or more
    /// than 4 elements or prefix/suffix/start or end
    /// occur too many times.
    /// It also returns `None` if any of the tokens parses to fail.
    pub fn from_percent_encoded_string(text_directive: &str) -> Option<Self> {
        // first check if the string starts with `text=`
        if text_directive.len() < 6 {
            return None;
        }
        if !text_directive.starts_with("text=") {
            return None;
        }

        let mut parsed_text_directive = Self::default();
        let valid = text_directive[5..]
            .split(",")
            // Parse the substrings into `TextDirectiveParameter`s. This will determine
            // for each substring if it is a Prefix, Suffix or Start/End,
            // or if it is invalid.
            .map(|token| TextDirectiveParameter::from_percent_encoded(token.as_bytes()))
            // populate `parsed_text_directive` and check its validity by inserting the parameters
            // one by one. Given that the parameters are sorted by their position in the source,
            // the validity of the text directive can be determined while adding the parameters.
            .map(|token| match token {
                Some(TextDirectiveParameter::Prefix(..)) => {
                    if !parsed_text_directive.is_empty() {
                        // `prefix-` must be the first result.
                        return false;
                    }
                    parsed_text_directive.prefix = token;
                    return true;
                }
                Some(TextDirectiveParameter::StartOrEnd(..)) => {
                    if parsed_text_directive.suffix.is_some() {
                        // start or end must come before `-suffix`.
                        return false;
                    }
                    if parsed_text_directive.start.is_none() {
                        parsed_text_directive.start = token;
                        return true;
                    }
                    if parsed_text_directive.end.is_none() {
                        parsed_text_directive.end = token;
                        return true;
                    }
                    // if `start` and `end` is already filled,
                    // this is invalid as well.
                    return false;
                }
                Some(TextDirectiveParameter::Suffix(..)) => {
                    if parsed_text_directive.start.is_some()
                        && parsed_text_directive.suffix.is_none()
                    {
                        // `start` must be present and `-suffix` must not be present.
                        // `end` may be present.
                        parsed_text_directive.suffix = token;
                        return true;
                    }
                    return false;
                }
                // empty or invalid token renders the whole text directive invalid.
                None => false,
            })
            .all(|valid| valid);
        if valid {
            return Some(parsed_text_directive);
        }
        None
    }

    /// Creates a percent-encoded string for the current `TextDirective`.
    /// In the unlikely case that the `TextDirective` is invalid (i.e. `start` is None),
    /// which should have been caught earlier,this method returns an empty string.
    pub fn to_percent_encoded_string(&self) -> String {
        if !self.is_valid() {
            return String::default();
        }
        String::from("text=")
            + &[&self.prefix, &self.start, &self.end, &self.suffix]
                .iter()
                .filter_map(|&token| token.as_ref())
                .map(|token| token.to_percent_encoded_string())
                .collect::<Vec<_>>()
                .join(",")
    }

    pub fn start(&self) -> &Option<TextDirectiveParameter> {
        &self.start
    }

    pub fn end(&self) -> &Option<TextDirectiveParameter> {
        &self.end
    }

    pub fn prefix(&self) -> &Option<TextDirectiveParameter> {
        &self.prefix
    }

    pub fn suffix(&self) -> &Option<TextDirectiveParameter> {
        &self.suffix
    }

    fn is_empty(&self) -> bool {
        self.prefix.is_none() && self.start.is_none() && self.end.is_none() && self.suffix.is_none()
    }

    /// A `TextDirective` object is valid if it contains the `start` token.
    /// All other tokens are optional.
    fn is_valid(&self) -> bool {
        self.start.is_some()
    }
}
/// Parses a fragment directive into a list of `TextDirective` objects and removes
/// the fragment directive from the input url.
///
/// If the hash does not contain a fragment directive, `hash` is not modified
/// and this function returns `None`.
/// Otherwise, the fragment directive is removed from `hash` and parsed.
/// The function returns a tuple of three elements:
///   - The input url hash without the fragment directive. Trailing `#`s are removed as well.
///   - The unparsed fragment directive.
///   - All parsed valid text directives. Invalid text directives are silently ignored.
pub fn parse_fragment_directive_and_remove_it_from_hash(
    hash: &str,
) -> Option<(&str, &str, Vec<TextDirective>)> {
    // The Fragment Directive is preceded by a `:~:`,
    // which is only allowed to appear in the hash once.
    let mut fragment_directive_iter = hash.split(":~:");
    let hash_without_fragment_directive =
        &hash[..fragment_directive_iter.next().unwrap_or_default().len()];

    if let Some(fragment_directive) = fragment_directive_iter.next() {
        if fragment_directive_iter.next().is_some() {
            // There are multiple occurrences of `:~:`, which is not allowed.
            return Some((hash_without_fragment_directive, fragment_directive, vec![]));
        }
        // - fragments are separated by `&`.
        // - if a fragment does not start with `text=`, it is not a text directive and will be ignored.
        // - if parsing of the text fragment fails (for whatever reason), it will be ignored.
        let text_directives: Vec<_> = fragment_directive
            .split("&")
            .map(|maybe_text_fragment| {
                TextDirective::from_percent_encoded_string(&maybe_text_fragment)
            })
            .filter_map(|maybe_text_directive| maybe_text_directive)
            .collect();

        return Some((
            hash_without_fragment_directive,
            fragment_directive,
            text_directives,
        ));
    }
    None
}

/// Creates a percent-encoded text fragment string.
///
/// The returned string starts with `:~:`, so that it can be appended
/// to a normal fragment.
/// Text directives which are not valid (ie., they are missing the `start` parameter),
/// are skipped.
///
/// Returns `None` if `fragment_directives` is empty.
pub fn create_fragment_directive_string(text_directives: &Vec<TextDirective>) -> Option<String> {
    if text_directives.is_empty() {
        return None;
    }
    let encoded_fragment_directives: Vec<_> = text_directives
        .iter()
        .filter(|&fragment_directive| fragment_directive.is_valid())
        .map(|fragment_directive| fragment_directive.to_percent_encoded_string())
        .filter(|text_directive| !text_directive.is_empty())
        .collect();
    if encoded_fragment_directives.is_empty() {
        return None;
    }
    Some(String::from(":~:") + &encoded_fragment_directives.join("&"))
}

/// Creates the percent-encoded text directive string for a single text directive.
pub fn create_text_directive_string(text_directive: &TextDirective) -> Option<String> {
    if text_directive.is_valid() {
        Some(text_directive.to_percent_encoded_string())
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::{
        create_fragment_directive_string, parse_fragment_directive_and_remove_it_from_hash,
        TextDirective,
    };

    /// This test verifies that valid combinations of [prefix-,]start[,end][,-suffix] are parsed correctly.
    #[test]
    fn test_parse_fragment_directive_with_one_text_directive() {
        // U+2705 WHITE HEAVY CHECK MARK - UTF-8 percent encoding: %E2%9C%85
        let checkmark = String::from_utf8(vec![0xE2, 0x9C, 0x85]).unwrap();
        let test_cases = vec![
            (":~:text=start", (None, Some("start"), None, None)),
            (
                ":~:text=start,end",
                (None, Some("start"), Some("end"), None),
            ),
            (
                ":~:text=prefix-,start",
                (Some("prefix"), Some("start"), None, None),
            ),
            (
                ":~:text=prefix-,start,end",
                (Some("prefix"), Some("start"), Some("end"), None),
            ),
            (
                ":~:text=prefix-,start,end,-suffix",
                (Some("prefix"), Some("start"), Some("end"), Some("suffix")),
            ),
            (
                ":~:text=start,-suffix",
                (None, Some("start"), None, Some("suffix")),
            ),
            (
                ":~:text=start,end,-suffix",
                (None, Some("start"), Some("end"), Some("suffix")),
            ),
            (":~:text=text=", (None, Some("text="), None, None)),
            (":~:text=%25", (None, Some("%"), None, None)),
            (":~:text=%", (None, Some("%"), None, None)),
            (":~:text=%%", (None, Some("%%"), None, None)),
            (":~:text=%25%25F", (None, Some("%%F"), None, None)),
            (
                ":~:text=%E2%9C%85",
                (None, Some(checkmark.as_str()), None, None),
            ),
            (":~:text=#", (None, Some("#"), None, None)),
            (":~:text=:", (None, Some(":"), None, None)),
            (
                ":~:text=prefix--,start",
                (Some("prefix-"), Some("start"), None, None),
            ),
            (
                ":~:text=p-refix-,start",
                (Some("p-refix"), Some("start"), None, None),
            ),
        ];
        for (url, (prefix, start, end, suffix)) in test_cases {
            let (stripped_url, fragment_directive, result) =
                parse_fragment_directive_and_remove_it_from_hash(&url)
                    .expect("The parser must find a result.");
            assert_eq!(
                fragment_directive,
                &url[3..],
                "The extracted fragment directive string
                should be unsanitized and therefore match the input string."
            );
            assert_eq!(result.len(), 1, "There must be one parsed text fragment.");
            assert_eq!(
                stripped_url, "",
                "The fragment directive must be removed from the url hash."
            );
            let text_directive = result.first().unwrap();
            if prefix.is_none() {
                assert!(
                    text_directive.prefix().is_none(),
                    "There must be no `prefix` token (test case `{}`).",
                    url
                );
            } else {
                assert!(
                    text_directive
                        .prefix()
                        .as_ref()
                        .expect("There must be a `prefix` token.")
                        .value()
                        == prefix.unwrap(),
                    "Wrong value for `prefix` (test case `{}`).",
                    url
                );
            }
            if start.is_none() {
                assert!(
                    text_directive.start().is_none(),
                    "There must be no `start` token (test case `{}`).",
                    url
                );
            } else {
                assert!(
                    text_directive
                        .start()
                        .as_ref()
                        .expect("There must be a `start` token.")
                        .value()
                        == start.unwrap(),
                    "Wrong value for `start` (test case `{}`).",
                    url
                );
            }
            if end.is_none() {
                assert!(
                    text_directive.end().is_none(),
                    "There must be no `end` token (test case `{}`).",
                    url
                );
            } else {
                assert!(
                    text_directive
                        .end()
                        .as_ref()
                        .expect("There must be a `end` token.")
                        .value()
                        == end.unwrap(),
                    "Wrong value for `end` (test case `{}`).",
                    url
                );
            }
            if suffix.is_none() {
                assert!(
                    text_directive.suffix().is_none(),
                    "There must be no `suffix` token (test case `{}`).",
                    url
                );
            } else {
                assert!(
                    text_directive
                        .suffix()
                        .as_ref()
                        .expect("There must be a `suffix` token.")
                        .value()
                        == suffix.unwrap(),
                    "Wrong value for `suffix` (test case `{}`).",
                    url
                );
            }
        }
    }

    /// This test verifies that a text fragment is parsed correctly if it is preceded
    /// or followed by a fragment (i.e. `#foo:~:text=bar`).
    #[test]
    fn test_parse_text_fragment_after_fragments() {
        let url = "foo:~:text=start";
        let (stripped_url, fragment_directive, result) =
            parse_fragment_directive_and_remove_it_from_hash(&url)
                .expect("The parser must find a result.");
        assert_eq!(
            result.len(),
            1,
            "There must be exactly one parsed text fragment."
        );
        assert_eq!(
            stripped_url, "foo",
            "The fragment directive was not removed correctly."
        );
        assert_eq!(
            fragment_directive, "text=start",
            "The fragment directive was not extracted correctly."
        );
        let fragment = result.first().unwrap();
        assert!(fragment.prefix().is_none(), "There is no `prefix` token.");
        assert_eq!(
            fragment
                .start()
                .as_ref()
                .expect("There must be a `start` token.")
                .value(),
            "start"
        );
        assert!(fragment.end().is_none(), "There is no `end` token.");
        assert!(fragment.suffix().is_none(), "There is no `suffix` token.");
    }

    /// Ensure that multiple text fragments are parsed correctly.
    #[test]
    fn test_parse_multiple_text_fragments() {
        let url = ":~:text=prefix-,start,-suffix&text=foo&text=bar,-suffix";
        let (_, _, text_directives) = parse_fragment_directive_and_remove_it_from_hash(&url)
            .expect("The parser must find a result.");
        assert_eq!(
            text_directives.len(),
            3,
            "There must be exactly two parsed text fragments."
        );
        let first_text_directive = &text_directives[0];
        assert_eq!(
            first_text_directive
                .prefix()
                .as_ref()
                .expect("There must be a `prefix` token.")
                .value(),
            "prefix"
        );
        assert_eq!(
            first_text_directive
                .start()
                .as_ref()
                .expect("There must be a `start` token.")
                .value(),
            "start"
        );
        assert!(
            first_text_directive.end().is_none(),
            "There is no `end` token."
        );
        assert_eq!(
            first_text_directive
                .suffix()
                .as_ref()
                .expect("There must be a `suffix` token.")
                .value(),
            "suffix"
        );

        let second_text_directive = &text_directives[1];
        assert!(
            second_text_directive.prefix().is_none(),
            "There is no `prefix` token."
        );
        assert_eq!(
            second_text_directive
                .start()
                .as_ref()
                .expect("There must be a `start` token.")
                .value(),
            "foo"
        );
        assert!(
            second_text_directive.end().is_none(),
            "There is no `end` token."
        );
        assert!(
            second_text_directive.suffix().is_none(),
            "There is no `suffix` token."
        );
        let third_text_directive = &text_directives[2];
        assert!(
            third_text_directive.prefix().is_none(),
            "There is no `prefix` token."
        );
        assert_eq!(
            third_text_directive
                .start()
                .as_ref()
                .expect("There must be a `start` token.")
                .value(),
            "bar"
        );
        assert!(
            third_text_directive.end().is_none(),
            "There is no `end` token."
        );
        assert_eq!(
            third_text_directive
                .suffix()
                .as_ref()
                .expect("There must be a `suffix` token.")
                .value(),
            "suffix"
        );
    }

    /// Multiple text directives should be parsed correctly
    /// if they are surrounded or separated by unknown directives.
    #[test]
    fn test_parse_multiple_text_directives_with_unknown_directive_in_between() {
        for url in [
            ":~:foo&text=start1&text=start2",
            ":~:text=start1&foo&text=start2",
            ":~:text=start1&text=start2&foo",
        ] {
            let (_, fragment_directive, text_directives) =
                parse_fragment_directive_and_remove_it_from_hash(&url)
                    .expect("The parser must find a result.");
            assert_eq!(
                fragment_directive,
                &url[3..],
                "The extracted fragment directive string is unsanitized
                and should contain the unknown directive."
            );
            assert_eq!(
                text_directives.len(),
                2,
                "There must be exactly two parsed text fragments."
            );
            let first_text_directive = &text_directives[0];
            assert_eq!(
                first_text_directive
                    .start()
                    .as_ref()
                    .expect("There must be a `start` token.")
                    .value(),
                "start1"
            );
            let second_text_directive = &text_directives[1];
            assert_eq!(
                second_text_directive
                    .start()
                    .as_ref()
                    .expect("There must be a `start` token.")
                    .value(),
                "start2"
            );
        }
    }

    /// Ensures that input that doesn't contain a text fragment does not produce a result.
    /// This includes the use of partial identifying tokens necessary for a text fragment
    /// (e.g. `:~:` without `text=`, `text=foo` without the `:~:` or multiple occurrences of `:~:`)
    /// In these cases, the parser must return `None` to indicate that there are no valid text fragments.
    #[test]
    fn test_parse_invalid_or_unknown_fragment_directive() {
        // there is no fragment directive here, hence the original url should not be updated.
        for url in ["foo", "foo:", "text=prefix-,start"] {
            let text_directives = parse_fragment_directive_and_remove_it_from_hash(&url);
            assert!(
                text_directives.is_none(),
                "The fragment `{}` does not contain a valid or known fragment directive.",
                url
            );
        }
        // there is an (invalid) fragment directive present. It needs to be removed from the url.
        for (url, url_without_fragment_directive_ref) in [
            ("foo:~:", "foo"),
            ("foo:~:bar", "foo"),
            (":~:text=foo-,bar,-baz:~:text=foo", ""),
        ] {
            let (url_without_fragment_directive, _, _) =
                parse_fragment_directive_and_remove_it_from_hash(&url)
                    .expect("There is a fragment directive which should have been removed.");
            assert_eq!(
                url_without_fragment_directive, url_without_fragment_directive_ref,
                "The fragment directive has not been removed correctly from  fragment `{}`.",
                url
            );
        }
    }

    /// Ensures that ill-formed text directives (but valid fragment directives)
    /// (starting correctly with `:~:text=`) are not parsed.
    /// Instead `None` must be returned.
    /// Test cases include invalid combinations of `prefix`/`suffix`es,
    /// additional `,`s, too many `start`/`end` tokens, or empty text fragments.
    #[test]
    fn test_parse_invalid_text_fragments() {
        for url in [
            ":~:text=start,start,start",
            ":~:text=prefix-,prefix-",
            ":~:text=prefix-,-suffix",
            ":~:text=prefix-,start,start,start",
            ":~:text=prefix-,start,start,start,-suffix",
            ":~:text=start,start,start,-suffix",
            ":~:text=prefix-,start,end,-suffix,foo",
            ":~:text=foo,prefix-,start",
            ":~:text=prefix-,,start,",
            ":~:text=,prefix,start",
            ":~:text=",
            ":~:text=&",
            ":~:text=,",
        ] {
            let (url_without_fragment_directive, _, _) =
                parse_fragment_directive_and_remove_it_from_hash(&url).expect("");
            assert!(
                url_without_fragment_directive.is_empty(),
                "The fragment directive `{}` does not contain a valid fragment directive. \
                 It must be removed from the original url anyway.",
                url
            );
        }
    }

    /// Ensure that out of multiple text fragments only the invalid ones are ignored
    /// while valid text fragments are still returned.
    /// Since correct parsing of multiple text fragments as well as
    /// several forms of invalid text fragments are already tested in
    /// `test_parse_multiple_text_fragments` and `test_parse_invalid_text_fragments()`,
    /// it should be enough to test this with only one fragment directive
    /// that contains two text fragments, one of them being invalid.
    #[test]
    fn test_valid_and_invalid_text_directives() {
        for url in [":~:text=start&text=,foo,", ":~:text=foo,foo,foo&text=start"] {
            let (_, fragment_directive, text_directives) =
                parse_fragment_directive_and_remove_it_from_hash(&url)
                    .expect("The parser must find a result.");
            assert_eq!(
                fragment_directive,
                &url[3..],
                "The extracted fragment directive string is unsanitized
                and should contain invalid text directives."
            );
            assert_eq!(
                text_directives.len(),
                1,
                "There must be exactly one parsed text fragment."
            );
            let text_directive = text_directives.first().unwrap();
            assert_eq!(
                text_directive
                    .start()
                    .as_ref()
                    .expect("There must be a `start` value.")
                    .value(),
                "start",
                "The `start` value of the text directive has the wrong value."
            );
        }
    }

    /// Ensures that a fragment directive that contains percent-encoded characters
    /// is decoded correctly. This explicitly includes characters which are used
    /// for identifying text fragments, i.e. `#`, `, `, `&`, `:`, `~` and `-`.
    #[test]
    fn test_parse_percent_encoding_tokens() {
        let url = ":~:text=prefix%26-,start%20and%2C,end%23,-%26suffix%2D";
        let (_, fragment_directive, text_directives) =
            parse_fragment_directive_and_remove_it_from_hash(&url)
                .expect("The parser must find a result.");
        assert_eq!(
            fragment_directive,
            &url[3..],
            "The extracted fragment directive string is unsanitized
                and should contain the original and percent-decoded string."
        );
        let text_directive = text_directives.first().unwrap();
        assert_eq!(
            text_directive
                .prefix()
                .as_ref()
                .expect("There must be a prefix.")
                .value(),
            "prefix&",
            ""
        );
        assert_eq!(
            text_directive
                .start()
                .as_ref()
                .expect("There must be a prefix.")
                .value(),
            "start and,",
            ""
        );
        assert_eq!(
            text_directive
                .end()
                .as_ref()
                .expect("There must be a prefix.")
                .value(),
            "end#",
            ""
        );
        assert_eq!(
            text_directive
                .suffix()
                .as_ref()
                .expect("There must be a prefix.")
                .value(),
            "&suffix-",
            ""
        );
    }

    /// Ensures that a text fragment is created correctly,
    /// based on a given combination of tokens.
    /// This includes all sorts of combinations of
    /// `prefix`, `suffix`, `start` and `end`,
    /// als well as values for these tokens which contain
    /// characters that need to be encoded because they are
    /// identifiers for text fragments
    /// (#`, `, `, `&`, `:`, `~` and `-`).
    #[test]
    fn test_create_fragment_directive() {
        for (text_directive, expected_fragment_directive) in [
            (
                TextDirective::from_parts(
                    String::new(),
                    String::from("start"),
                    String::new(),
                    String::new(),
                )
                .unwrap(),
                ":~:text=start",
            ),
            (
                TextDirective::from_parts(
                    String::new(),
                    String::from("start"),
                    String::from("end"),
                    String::new(),
                )
                .unwrap(),
                ":~:text=start,end",
            ),
            (
                TextDirective::from_parts(
                    String::from("prefix"),
                    String::from("start"),
                    String::from("end"),
                    String::new(),
                )
                .unwrap(),
                ":~:text=prefix-,start,end",
            ),
            (
                TextDirective::from_parts(
                    String::from("prefix"),
                    String::from("start"),
                    String::from("end"),
                    String::from("suffix"),
                )
                .unwrap(),
                ":~:text=prefix-,start,end,-suffix",
            ),
            (
                TextDirective::from_parts(
                    String::new(),
                    String::from("start"),
                    String::from("end"),
                    String::from("suffix"),
                )
                .unwrap(),
                ":~:text=start,end,-suffix",
            ),
            (
                TextDirective::from_parts(
                    String::from("prefix"),
                    String::from("start"),
                    String::new(),
                    String::from("suffix"),
                )
                .unwrap(),
                ":~:text=prefix-,start,-suffix",
            ),
            (
                TextDirective::from_parts(
                    String::from("prefix-"),
                    String::from("start and,"),
                    String::from("&end"),
                    String::from("#:~:suffix"),
                )
                .unwrap(),
                ":~:text=prefix%2D-,start%20and%2C,%26end,-%23%3A%7E%3Asuffix",
            ),
        ] {
            let fragment_directive = create_fragment_directive_string(&vec![text_directive])
                .expect("The given input must produce a valid fragment directive.");
            assert_eq!(fragment_directive, expected_fragment_directive);
        }
    }

    /// Ensures that a fragment directive is created correctly if multiple text fragments are given.
    /// The resulting fragment must start with `:~:`
    /// and each text fragment must be separated using `&text=`.
    #[test]
    fn test_create_fragment_directive_from_multiple_text_directives() {
        let text_directives = vec![
            TextDirective::from_parts(
                String::new(),
                String::from("start1"),
                String::new(),
                String::new(),
            )
            .unwrap(),
            TextDirective::from_parts(
                String::new(),
                String::from("start2"),
                String::new(),
                String::new(),
            )
            .unwrap(),
            TextDirective::from_parts(
                String::new(),
                String::from("start3"),
                String::new(),
                String::new(),
            )
            .unwrap(),
        ];
        let fragment_directive = create_fragment_directive_string(&text_directives)
            .expect("The given input must produce a valid fragment directive.");
        assert_eq!(
            fragment_directive, ":~:text=start1&text=start2&text=start3",
            "The created fragment directive is wrong for multiple fragments."
        );
    }
}
