/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

//! Crate-internal types for interacting with Remote Settings (`rs`). Types in
//! this module describe records and attachments in the Suggest Remote Settings
//! collection.
//!
//! To add a new suggestion `T` to this component, you'll generally need to:
//!
//!  1. Add a variant named `T` to [`SuggestRecord`]. The variant must have a
//!     `#[serde(rename)]` attribute that matches the suggestion record's
//!     `type` field.
//!  2. Define a `DownloadedTSuggestion` type with the new suggestion's fields,
//!     matching their attachment's schema. Your new type must derive or
//!     implement [`serde::Deserialize`].
//!  3. Update the database schema in the [`schema`] module to store the new
//!     suggestion.
//!  4. Add an `insert_t_suggestions()` method to [`db::SuggestDao`] that
//!     inserts `DownloadedTSuggestion`s into the database.
//!  5. Update [`store::SuggestStoreInner::ingest()`] to download, deserialize,
//!     and store the new suggestion.
//!  6. Add a variant named `T` to [`suggestion::Suggestion`], with the fields
//!     that you'd like to expose to the application. These can be the same
//!     fields as `DownloadedTSuggestion`, or slightly different, depending on
//!     what the application needs to show the suggestion.
//!  7. Update the `Suggestion` enum definition in `suggest.udl` to match your
//!     new [`suggestion::Suggestion`] variant.
//!  8. Update any [`db::SuggestDao`] methods that query the database to include
//!     the new suggestion in their results, and return `Suggestion::T` variants
//!     as needed.

use std::{borrow::Cow, fmt};

use remote_settings::{Attachment, GetItemsOptions, RemoteSettingsRecord, RsJsonObject, SortOrder};
use serde::{Deserialize, Deserializer};

use crate::{error::Error, provider::SuggestionProvider, Result};

/// A list of default record types to download if nothing is specified.
/// This defaults to all record types available as-of Fx128.
/// Consumers should specify provider types in `SuggestIngestionConstraints` if they want a
/// different set.
pub(crate) const DEFAULT_RECORDS_TYPES: [SuggestRecordType; 9] = [
    SuggestRecordType::Icon,
    SuggestRecordType::AmpWikipedia,
    SuggestRecordType::Amo,
    SuggestRecordType::Pocket,
    SuggestRecordType::Yelp,
    SuggestRecordType::Mdn,
    SuggestRecordType::Weather,
    SuggestRecordType::GlobalConfig,
    SuggestRecordType::AmpMobile,
];

/// A trait for a client that downloads suggestions from Remote Settings.
///
/// This trait lets tests use a mock client.
pub(crate) trait Client {
    /// Fetch a list of records and attachment data
    fn get_records(&self, request: RecordRequest) -> Result<Vec<Record>>;
}

/// Implements the [Client] trait using a real remote settings client
pub struct RemoteSettingsClient {
    // Create a separate client for each collection name
    quicksuggest_client: remote_settings::Client,
    fakespot_client: remote_settings::Client,
}

impl RemoteSettingsClient {
    pub fn new(
        server: Option<remote_settings::RemoteSettingsServer>,
        bucket_name: Option<String>,
        server_url: Option<String>,
    ) -> Result<Self> {
        Ok(Self {
            quicksuggest_client: remote_settings::Client::new(
                remote_settings::RemoteSettingsConfig {
                    server: server.clone(),
                    bucket_name: bucket_name.clone(),
                    collection_name: "quicksuggest".to_owned(),
                    server_url: server_url.clone(),
                },
            )?,
            fakespot_client: remote_settings::Client::new(remote_settings::RemoteSettingsConfig {
                server,
                bucket_name,
                collection_name: "fakespot-suggest-products".to_owned(),
                server_url,
            })?,
        })
    }

    fn client_for_record_type(&self, record_type: &str) -> &remote_settings::Client {
        match record_type {
            "fakespot-suggestions" => &self.fakespot_client,
            _ => &self.quicksuggest_client,
        }
    }
}

impl Client for RemoteSettingsClient {
    fn get_records(&self, request: RecordRequest) -> Result<Vec<Record>> {
        let client = self.client_for_record_type(request.record_type.as_str());
        let options = request.into();
        client
            .get_records_with_options(&options)?
            .records
            .into_iter()
            .map(|record| {
                let attachment_data = record
                    .attachment
                    .as_ref()
                    .map(|a| client.get_attachment(&a.location))
                    .transpose()?;
                Ok(Record::new(record, attachment_data))
            })
            .collect()
    }
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Hash)]
pub struct RecordRequest {
    pub record_type: String,
    pub last_modified: Option<u64>,
}

impl From<RecordRequest> for GetItemsOptions {
    fn from(value: RecordRequest) -> Self {
        let mut options = GetItemsOptions::new();

        // Remote Settings returns records in descending modification order
        // (newest first), but we want them in ascending order (oldest first),
        // so that we can eventually resume downloading where we left off.
        options.sort("last_modified", SortOrder::Ascending);

        options.filter_eq("type", value.record_type);

        if let Some(last_modified) = value.last_modified {
            options.filter_gt("last_modified", last_modified.to_string());
        }
        options
    }
}

/// Remote settings record for suggest.
///
/// This is `remote_settings::RemoteSettingsRecord`, plus the downloaded attachment data.
#[derive(Clone, Debug, Default)]
pub struct Record {
    pub id: String,
    pub last_modified: u64,
    pub deleted: bool,
    pub attachment: Option<Attachment>,
    pub fields: RsJsonObject,
    pub attachment_data: Option<Vec<u8>>,
}

impl Record {
    pub fn new(record: RemoteSettingsRecord, attachment_data: Option<Vec<u8>>) -> Self {
        Self {
            id: record.id,
            deleted: record.deleted,
            fields: record.fields,
            last_modified: record.last_modified,
            attachment: record.attachment,
            attachment_data,
        }
    }

    /// Get the attachment data for this record, returning an error if it's not present.
    ///
    /// This is indented to be used in cases where the attachment data is required.
    pub fn require_attachment_data(&self) -> Result<&[u8]> {
        self.attachment_data
            .as_deref()
            .ok_or_else(|| Error::MissingAttachment(self.id.clone()))
    }
}

/// A record in the Suggest Remote Settings collection.
///
/// Except for the type, Suggest records don't carry additional fields. All
/// suggestions are stored in each record's attachment.
#[derive(Clone, Debug, Deserialize)]
#[serde(tag = "type")]
pub(crate) enum SuggestRecord {
    #[serde(rename = "icon")]
    Icon,
    #[serde(rename = "data")]
    AmpWikipedia,
    #[serde(rename = "amo-suggestions")]
    Amo,
    #[serde(rename = "pocket-suggestions")]
    Pocket,
    #[serde(rename = "yelp-suggestions")]
    Yelp,
    #[serde(rename = "mdn-suggestions")]
    Mdn,
    #[serde(rename = "weather")]
    Weather(DownloadedWeatherData),
    #[serde(rename = "configuration")]
    GlobalConfig(DownloadedGlobalConfig),
    #[serde(rename = "amp-mobile-suggestions")]
    AmpMobile,
    #[serde(rename = "fakespot-suggestions")]
    Fakespot,
}

/// Enum for the different record types that can be consumed.
/// Extracting this from the serialization enum so that we can
/// extend it to get type metadata.
#[derive(Copy, Clone, PartialEq, PartialOrd, Eq, Ord)]
pub enum SuggestRecordType {
    Icon,
    AmpWikipedia,
    Amo,
    Pocket,
    Yelp,
    Mdn,
    Weather,
    GlobalConfig,
    AmpMobile,
    Fakespot,
}

impl From<&SuggestRecord> for SuggestRecordType {
    fn from(suggest_record: &SuggestRecord) -> Self {
        match suggest_record {
            SuggestRecord::Amo => Self::Amo,
            SuggestRecord::AmpWikipedia => Self::AmpWikipedia,
            SuggestRecord::Icon => Self::Icon,
            SuggestRecord::Mdn => Self::Mdn,
            SuggestRecord::Pocket => Self::Pocket,
            SuggestRecord::Weather(_) => Self::Weather,
            SuggestRecord::Yelp => Self::Yelp,
            SuggestRecord::GlobalConfig(_) => Self::GlobalConfig,
            SuggestRecord::AmpMobile => Self::AmpMobile,
            SuggestRecord::Fakespot => Self::Fakespot,
        }
    }
}

impl fmt::Display for SuggestRecordType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Icon => write!(f, "icon"),
            Self::AmpWikipedia => write!(f, "data"),
            Self::Amo => write!(f, "amo-suggestions"),
            Self::Pocket => write!(f, "pocket-suggestions"),
            Self::Yelp => write!(f, "yelp-suggestions"),
            Self::Mdn => write!(f, "mdn-suggestions"),
            Self::Weather => write!(f, "weather"),
            Self::GlobalConfig => write!(f, "configuration"),
            Self::AmpMobile => write!(f, "amp-mobile-suggestions"),
            Self::Fakespot => write!(f, "fakespot-suggestions"),
        }
    }
}

impl SuggestRecordType {
    /// Return the meta key for the last ingested record.
    pub fn last_ingest_meta_key(&self) -> String {
        format!("last_quicksuggest_ingest_{}", self)
    }
}

/// Represents either a single value, or a list of values. This is used to
/// deserialize downloaded attachments.
#[derive(Clone, Debug, Deserialize)]
#[serde(untagged)]
enum OneOrMany<T> {
    One(T),
    Many(Vec<T>),
}

/// A downloaded Remote Settings attachment that contains suggestions.
#[derive(Clone, Debug, Deserialize)]
#[serde(transparent)]
pub(crate) struct SuggestAttachment<T>(OneOrMany<T>);

impl<T> SuggestAttachment<T> {
    /// Returns a slice of suggestions to ingest from the downloaded attachment.
    pub fn suggestions(&self) -> &[T] {
        match &self.0 {
            OneOrMany::One(value) => std::slice::from_ref(value),
            OneOrMany::Many(values) => values,
        }
    }
}

/// The ID of a record in the Suggest Remote Settings collection.
#[derive(Clone, Debug, Deserialize, Eq, Hash, Ord, PartialEq, PartialOrd)]
#[serde(transparent)]
pub(crate) struct SuggestRecordId<'a>(Cow<'a, str>);

impl<'a> SuggestRecordId<'a> {
    pub fn as_str(&self) -> &str {
        &self.0
    }

    /// If this ID is for an icon record, extracts and returns the icon ID.
    ///
    /// The icon ID is the primary key for an ingested icon. Downloaded
    /// suggestions also reference these icon IDs, in
    /// [`DownloadedSuggestion::icon_id`].
    pub fn as_icon_id(&self) -> Option<&str> {
        self.0.strip_prefix("icon-")
    }
}

impl<'a, T> From<T> for SuggestRecordId<'a>
where
    T: Into<Cow<'a, str>>,
{
    fn from(value: T) -> Self {
        Self(value.into())
    }
}

/// Fields that are common to all downloaded suggestions.
#[derive(Clone, Debug, Default, Deserialize)]
pub(crate) struct DownloadedSuggestionCommonDetails {
    pub keywords: Vec<String>,
    pub title: String,
    pub url: String,
    pub score: Option<f64>,
    #[serde(default)]
    pub full_keywords: Vec<(String, usize)>,
}

/// An AMP suggestion to ingest from an AMP-Wikipedia attachment.
#[derive(Clone, Debug, Default, Deserialize)]
pub(crate) struct DownloadedAmpSuggestion {
    #[serde(flatten)]
    pub common_details: DownloadedSuggestionCommonDetails,
    pub advertiser: String,
    #[serde(rename = "id")]
    pub block_id: i32,
    pub iab_category: String,
    pub click_url: String,
    pub impression_url: String,
    #[serde(rename = "icon")]
    pub icon_id: String,
}

/// A Wikipedia suggestion to ingest from an AMP-Wikipedia attachment.
#[derive(Clone, Debug, Default, Deserialize)]
pub(crate) struct DownloadedWikipediaSuggestion {
    #[serde(flatten)]
    pub common_details: DownloadedSuggestionCommonDetails,
    #[serde(rename = "icon")]
    pub icon_id: String,
}

/// A suggestion to ingest from an AMP-Wikipedia attachment downloaded from
/// Remote Settings.
#[derive(Clone, Debug)]
pub(crate) enum DownloadedAmpWikipediaSuggestion {
    Amp(DownloadedAmpSuggestion),
    Wikipedia(DownloadedWikipediaSuggestion),
}

impl DownloadedAmpWikipediaSuggestion {
    /// Returns the details that are common to AMP and Wikipedia suggestions.
    pub fn common_details(&self) -> &DownloadedSuggestionCommonDetails {
        match self {
            Self::Amp(DownloadedAmpSuggestion { common_details, .. }) => common_details,
            Self::Wikipedia(DownloadedWikipediaSuggestion { common_details, .. }) => common_details,
        }
    }

    /// Returns the provider of this suggestion.
    pub fn provider(&self) -> SuggestionProvider {
        match self {
            DownloadedAmpWikipediaSuggestion::Amp(_) => SuggestionProvider::Amp,
            DownloadedAmpWikipediaSuggestion::Wikipedia(_) => SuggestionProvider::Wikipedia,
        }
    }
}

impl DownloadedSuggestionCommonDetails {
    /// Iterate over all keywords for this suggestion
    pub fn keywords(&self) -> impl Iterator<Item = AmpKeyword<'_>> {
        let full_keywords = self
            .full_keywords
            .iter()
            .flat_map(|(full_keyword, repeat_for)| {
                std::iter::repeat(Some(full_keyword.as_str())).take(*repeat_for)
            })
            .chain(std::iter::repeat(None)); // In case of insufficient full keywords, just fill in with infinite `None`s
                                             //
        self.keywords.iter().zip(full_keywords).enumerate().map(
            move |(i, (keyword, full_keyword))| AmpKeyword {
                rank: i,
                keyword,
                full_keyword,
            },
        )
    }
}

#[derive(Debug, PartialEq, Eq)]
pub(crate) struct AmpKeyword<'a> {
    pub rank: usize,
    pub keyword: &'a str,
    pub full_keyword: Option<&'a str>,
}

impl<'de> Deserialize<'de> for DownloadedAmpWikipediaSuggestion {
    fn deserialize<D>(
        deserializer: D,
    ) -> std::result::Result<DownloadedAmpWikipediaSuggestion, D::Error>
    where
        D: Deserializer<'de>,
    {
        // AMP and Wikipedia suggestions use the same schema. To separate them,
        // we use a "maybe tagged" outer enum with tagged and untagged variants,
        // and a "tagged" inner enum.
        //
        // Wikipedia suggestions will deserialize successfully into the tagged
        // variant. AMP suggestions will try the tagged variant, fail, and fall
        // back to the untagged variant.
        //
        // This approach works around serde-rs/serde#912.

        #[derive(Deserialize)]
        #[serde(untagged)]
        enum MaybeTagged {
            Tagged(Tagged),
            Untagged(DownloadedAmpSuggestion),
        }

        #[derive(Deserialize)]
        #[serde(tag = "advertiser")]
        enum Tagged {
            #[serde(rename = "Wikipedia")]
            Wikipedia(DownloadedWikipediaSuggestion),
        }

        Ok(match MaybeTagged::deserialize(deserializer)? {
            MaybeTagged::Tagged(Tagged::Wikipedia(wikipedia)) => Self::Wikipedia(wikipedia),
            MaybeTagged::Untagged(amp) => Self::Amp(amp),
        })
    }
}

/// An AMO suggestion to ingest from an attachment
#[derive(Clone, Debug, Deserialize)]
pub(crate) struct DownloadedAmoSuggestion {
    pub description: String,
    pub url: String,
    pub guid: String,
    #[serde(rename = "icon")]
    pub icon_url: String,
    pub rating: Option<String>,
    pub number_of_ratings: i64,
    pub title: String,
    pub keywords: Vec<String>,
    pub score: f64,
}
/// A Pocket suggestion to ingest from a Pocket Suggestion Attachment
#[derive(Clone, Debug, Deserialize)]
pub(crate) struct DownloadedPocketSuggestion {
    pub url: String,
    pub title: String,
    #[serde(rename = "lowConfidenceKeywords")]
    pub low_confidence_keywords: Vec<String>,
    #[serde(rename = "highConfidenceKeywords")]
    pub high_confidence_keywords: Vec<String>,
    pub score: f64,
}
/// A location sign for Yelp to ingest from a Yelp Attachment
#[derive(Clone, Debug, Deserialize)]
pub(crate) struct DownloadedYelpLocationSign {
    pub keyword: String,
    #[serde(rename = "needLocation")]
    pub need_location: bool,
}
/// A Yelp suggestion to ingest from a Yelp Attachment
#[derive(Clone, Debug, Deserialize)]
pub(crate) struct DownloadedYelpSuggestion {
    pub subjects: Vec<String>,
    #[serde(rename = "preModifiers")]
    pub pre_modifiers: Vec<String>,
    #[serde(rename = "postModifiers")]
    pub post_modifiers: Vec<String>,
    #[serde(rename = "locationSigns")]
    pub location_signs: Vec<DownloadedYelpLocationSign>,
    #[serde(rename = "yelpModifiers")]
    pub yelp_modifiers: Vec<String>,
    #[serde(rename = "icon")]
    pub icon_id: String,
    pub score: f64,
}

/// An MDN suggestion to ingest from an attachment
#[derive(Clone, Debug, Deserialize)]
pub(crate) struct DownloadedMdnSuggestion {
    pub url: String,
    pub title: String,
    pub description: String,
    pub keywords: Vec<String>,
    pub score: f64,
}

/// A Fakespot suggestion to ingest from an attachment
#[derive(Clone, Debug, Deserialize)]
pub(crate) struct DownloadedFakespotSuggestion {
    pub fakespot_grade: String,
    pub product_id: String,
    pub keywords: String,
    pub product_type: String,
    pub rating: f64,
    pub score: f64,
    pub title: String,
    pub total_reviews: i64,
    pub url: String,
}

/// Weather data to ingest from a weather record
#[derive(Clone, Debug, Deserialize)]
pub(crate) struct DownloadedWeatherData {
    pub weather: DownloadedWeatherDataInner,
}
#[derive(Clone, Debug, Deserialize)]
pub(crate) struct DownloadedWeatherDataInner {
    pub min_keyword_length: i32,
    pub keywords: Vec<String>,
    // Remote settings doesn't support floats in record JSON so we use a
    // stringified float instead. If a float can't be parsed, this will be None.
    #[serde(default, deserialize_with = "de_stringified_f64")]
    pub score: Option<f64>,
}

/// Global Suggest configuration data to ingest from a configuration record
#[derive(Clone, Debug, Deserialize)]
pub(crate) struct DownloadedGlobalConfig {
    pub configuration: DownloadedGlobalConfigInner,
}
#[derive(Clone, Debug, Deserialize)]
pub(crate) struct DownloadedGlobalConfigInner {
    /// The maximum number of times the user can click "Show less frequently"
    /// for a suggestion in the UI.
    pub show_less_frequently_cap: i32,
}

fn de_stringified_f64<'de, D>(deserializer: D) -> std::result::Result<Option<f64>, D::Error>
where
    D: Deserializer<'de>,
{
    String::deserialize(deserializer).map(|s| s.parse().ok())
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn test_full_keywords() {
        let suggestion = DownloadedAmpWikipediaSuggestion::Amp(DownloadedAmpSuggestion {
            common_details: DownloadedSuggestionCommonDetails {
                keywords: vec![
                    String::from("f"),
                    String::from("fo"),
                    String::from("foo"),
                    String::from("foo b"),
                    String::from("foo ba"),
                    String::from("foo bar"),
                ],
                full_keywords: vec![(String::from("foo"), 3), (String::from("foo bar"), 3)],
                ..DownloadedSuggestionCommonDetails::default()
            },
            ..DownloadedAmpSuggestion::default()
        });

        assert_eq!(
            Vec::from_iter(suggestion.common_details().keywords()),
            vec![
                AmpKeyword {
                    rank: 0,
                    keyword: "f",
                    full_keyword: Some("foo"),
                },
                AmpKeyword {
                    rank: 1,
                    keyword: "fo",
                    full_keyword: Some("foo"),
                },
                AmpKeyword {
                    rank: 2,
                    keyword: "foo",
                    full_keyword: Some("foo"),
                },
                AmpKeyword {
                    rank: 3,
                    keyword: "foo b",
                    full_keyword: Some("foo bar"),
                },
                AmpKeyword {
                    rank: 4,
                    keyword: "foo ba",
                    full_keyword: Some("foo bar"),
                },
                AmpKeyword {
                    rank: 5,
                    keyword: "foo bar",
                    full_keyword: Some("foo bar"),
                },
            ],
        );
    }

    #[test]
    fn test_missing_full_keywords() {
        let suggestion = DownloadedAmpWikipediaSuggestion::Amp(DownloadedAmpSuggestion {
            common_details: DownloadedSuggestionCommonDetails {
                keywords: vec![
                    String::from("f"),
                    String::from("fo"),
                    String::from("foo"),
                    String::from("foo b"),
                    String::from("foo ba"),
                    String::from("foo bar"),
                ],
                // Only the first 3 keywords have full keywords associated with them
                full_keywords: vec![(String::from("foo"), 3)],
                ..DownloadedSuggestionCommonDetails::default()
            },
            ..DownloadedAmpSuggestion::default()
        });

        assert_eq!(
            Vec::from_iter(suggestion.common_details().keywords()),
            vec![
                AmpKeyword {
                    rank: 0,
                    keyword: "f",
                    full_keyword: Some("foo"),
                },
                AmpKeyword {
                    rank: 1,
                    keyword: "fo",
                    full_keyword: Some("foo"),
                },
                AmpKeyword {
                    rank: 2,
                    keyword: "foo",
                    full_keyword: Some("foo"),
                },
                AmpKeyword {
                    rank: 3,
                    keyword: "foo b",
                    full_keyword: None,
                },
                AmpKeyword {
                    rank: 4,
                    keyword: "foo ba",
                    full_keyword: None,
                },
                AmpKeyword {
                    rank: 5,
                    keyword: "foo bar",
                    full_keyword: None,
                },
            ],
        );
    }
}
