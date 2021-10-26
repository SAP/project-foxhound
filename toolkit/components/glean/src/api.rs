// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

//! The general API to initialize and control Glean.
//!
//! ## Example
//!
//! ```ignore
//! let configuration = Configuration { /* ... */ };
//! let client_info = ClientInfo { /* ... */ };
//!
//! // Initialize Glean once and passing in client information.
//! initialize(configuration, client_info)?;
//!
//! // Toggle the upload enabled preference.
//! set_upload_enabled(false);
//! ```

// FIXME: Remove when code gets actually used eventually (by initializing Glean).
#![allow(dead_code)]

use fog::dispatcher;
use fog::ping_upload::{self, UploadResult};
use glean_core::{global_glean, setup_glean, Configuration, Glean, Result};
use once_cell::sync::OnceCell;
use url::Url;
use viaduct::Request;

use crate::client_info::ClientInfo;
use crate::core_metrics::InternalMetrics;

/// Application state to keep track of.
#[derive(Debug, Clone)]
pub struct AppState {
    /// Client info metrics set by the application.
    client_info: ClientInfo,
}

/// A global singleton storing additional state for Glean.
static STATE: OnceCell<AppState> = OnceCell::new();

/// Get a reference to the global state object.
///
/// Panics if no global state object was set.
fn global_state() -> &'static AppState {
    STATE.get().unwrap()
}

/// Run a closure with a mutable reference to the locked global Glean object,
/// or return None if the global Glean isn't available.
fn with_glean_mut<F, R>(f: F) -> Option<R>
where
    F: Fn(&mut Glean) -> R,
{
    let mut glean = global_glean()?.lock().unwrap();
    Some(f(&mut glean))
}

/// Create and initialize a new Glean object.
///
/// See `glean_core::Glean::new`.
///
/// ## Thread safety
///
/// Many threads may call `initialize` concurrently with different configuration and client info,
/// but it is guaranteed that only one function will be executed.
///
/// Glean will only be initialized exactly once with the configuration and client info obtained
/// from the first call.
/// Subsequent calls have no effect.
pub fn initialize(cfg: Configuration, client_info: ClientInfo) -> Result<()> {
    STATE
        .get_or_try_init(|| {
            let mut glean = Glean::new(cfg)?;

            // First initialize core metrics
            initialize_core_metrics(&glean, &client_info);

            // Then register builtin pings.
            // Borrowed from glean-core's internal_pings.rs.
            let mping = glean_core::metrics::PingType::new(
                "metrics",
                true,
                false,
                vec![
                    "overdue".to_string(),
                    "reschedule".to_string(),
                    "today".to_string(),
                    "tomorrow".to_string(),
                    "upgrade".to_string(),
                ],
            );
            glean.register_ping_type(&mping);
            let bping = glean_core::metrics::PingType::new("baseline", true, false, vec![]);
            glean.register_ping_type(&bping);
            let eping = glean_core::metrics::PingType::new("events", true, false, vec![]);
            glean.register_ping_type(&eping);

            // Now make this the global object available to others.
            setup_glean(glean)?;

            // Register the uploader so we can upload pings.
            register_uploader();

            Ok(AppState { client_info })
        })
        .map(|_| ())
}

/// Set the application's core metrics based on the passed client info.
fn initialize_core_metrics(glean: &Glean, client_info: &ClientInfo) {
    let core_metrics = InternalMetrics::new();

    core_metrics
        .app_build
        .set(glean, &client_info.app_build[..]);
    core_metrics
        .app_display_version
        .set(glean, &client_info.app_display_version[..]);
    if let Some(app_channel) = &client_info.channel {
        core_metrics.app_channel.set(glean, app_channel);
    }
    core_metrics
        .os_version
        .set(glean, &client_info.os_version[..]);
    core_metrics
        .architecture
        .set(glean, &client_info.architecture);
}

/// Set whether upload is enabled or not.
///
/// See `glean_core::Glean.set_upload_enabled`.
pub fn set_upload_enabled(enabled: bool) {
    dispatcher::launch(move || {
        with_glean_mut(|glean| {
            let state = global_state();
            let old_enabled = glean.is_upload_enabled();
            glean.set_upload_enabled(enabled);

            if !old_enabled && enabled {
                // If uploading is being re-enabled, we have to restore the
                // application-lifetime metrics.
                initialize_core_metrics(&glean, &state.client_info);
            } else if old_enabled && !enabled {
                // If upload is being disabled, check for pings to send.
                ping_upload::check_for_uploads();
            }

            enabled
        })
        .expect("Setting upload enabled failed!");
    });
}

fn register_uploader() {
    let result = ping_upload::register_uploader(Box::new(|ping_request| {
        log::trace!(
            "FOG Ping Uploader uploading ping {}",
            ping_request.document_id
        );
        let result: std::result::Result<UploadResult, viaduct::Error> = (move || {
            const SERVER: &str = "https://incoming.telemetry.mozilla.org";
            let mut server = String::from(SERVER);
            let localhost_port = static_prefs::pref!("telemetry.fog.test.localhost_port");
            if localhost_port > 0 {
                server = format!("http://localhost:{}", localhost_port);
            } else if localhost_port < 0 {
                log::info!("FOG Ping uploader faking success");
                return Ok(UploadResult::HttpStatus(200));
            }
            let url = Url::parse(&server)?.join(&ping_request.path)?;
            log::info!("FOG Ping uploader uploading to {:?}", url);

            let mut req = Request::post(url).body(ping_request.body.clone());
            for (header_key, header_value) in &ping_request.headers {
                req = req.header(header_key.to_owned(), header_value)?;
            }

            log::trace!(
                "FOG Ping Uploader sending ping {}",
                ping_request.document_id
            );
            let res = req.send()?;
            Ok(UploadResult::HttpStatus(res.status.into()))
        })();
        log::trace!(
            "FOG Ping Uploader completed uploading ping {} (Result {:?})",
            ping_request.document_id,
            result
        );
        match result {
            Ok(result) => result,
            _ => UploadResult::UnrecoverableFailure,
        }
    }));
    if result.is_err() {
        log::warn!(
            "Couldn't register uploader because one's already in there. {:?}",
            result
        );
    }
}

pub fn set_debug_view_tag(value: &str) -> bool {
    with_glean_mut(|glean| glean.set_debug_view_tag(value)).unwrap_or(false)
}

pub fn submit_ping(ping_name: &str) -> Result<bool> {
    match with_glean_mut(|glean| glean.submit_ping_by_name(ping_name, None)) {
        Some(Ok(true)) => {
            ping_upload::check_for_uploads();
            Ok(true)
        }
        Some(result) => result,
        None => Ok(false),
    }
}

pub fn set_log_pings(value: bool) -> bool {
    with_glean_mut(|glean| glean.set_log_pings(value)).unwrap_or(false)
}
