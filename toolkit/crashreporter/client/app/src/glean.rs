/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

//! Glean telemetry integration.

use crate::config::{buildid, Config};

const APP_DISPLAY_VERSION: &str = env!("CARGO_PKG_VERSION");

/// Glean initialization options.
pub struct InitOptions {
    pub data_dir: ::std::path::PathBuf,
    pub locale: Option<String>,
}

impl InitOptions {
    /// Initialize glean based on the given configuration.
    pub fn from_config(cfg: &Config) -> Self {
        let locale = cfg.strings.as_ref().map(|s| s.locale());
        let data_dir = cfg.data_dir().to_owned();
        #[cfg(mock)]
        let data_dir = (&data_dir).into();
        InitOptions { data_dir, locale }
    }

    /// Initialize glean.
    ///
    /// When mocking, this should be called on a thread where the mock data is present.
    pub fn init(self) -> std::io::Result<crashping::GleanHandle> {
        self.init_glean().initialize()
    }

    /// Initialize glean for tests.
    #[cfg(test)]
    fn test_init(self) {
        self.init_glean().test_reset_glean(true)
    }

    fn init_glean(self) -> crashping::InitGlean {
        let mut data_dir = if cfg!(mock) {
            // Use a (non-mocked) temp directory since glean won't access our mocked API.
            ::std::env::temp_dir().join("crashreporter-mock")
        } else {
            self.data_dir
        };
        data_dir.push("glean");

        let app_id = format!(
            "{}.crashreporter{}",
            mozbuild::config::MOZ_APP_NAME,
            cfg!(mock).then_some(".mock").unwrap_or_default()
        );

        let mut init_glean = crashping::InitGlean::new(
            data_dir,
            &app_id,
            crashping::ClientInfoMetrics {
                app_build: buildid().unwrap_or(APP_DISPLAY_VERSION).into(),
                app_display_version: APP_DISPLAY_VERSION.into(),
                channel: None,
                locale: self.locale,
            },
        );
        init_glean.configuration.uploader = Some(Box::new(uploader::Uploader::new()));

        if cfg!(mock) {
            init_glean.configuration.server_endpoint =
                Some("https://incoming.glean.example.com".to_owned());
        }

        init_glean
    }
}

mod uploader {
    use crate::net::http;
    use glean::net::{CapablePingUploadRequest, PingUploader, UploadResult};

    #[derive(Debug)]
    pub struct Uploader {
        #[cfg(mock)]
        mock_data: crate::std::mock::SharedMockData,
    }

    impl Uploader {
        pub fn new() -> Self {
            Uploader {
                #[cfg(mock)]
                mock_data: crate::std::mock::SharedMockData::new(),
            }
        }
    }

    impl PingUploader for Uploader {
        fn upload(&self, upload_request: CapablePingUploadRequest) -> UploadResult {
            let upload_request = upload_request.capable(|cap| cap.is_empty()).unwrap();
            let request_builder = http::RequestBuilder::Post {
                body: upload_request.body.as_slice(),
                headers: upload_request.headers.as_slice(),
            };

            let do_send = move || match request_builder.build(upload_request.url.as_ref()) {
                Err(e) => {
                    log::error!("failed to build request for glean ping: {e}");
                    UploadResult::unrecoverable_failure()
                }
                Ok(request) => match request.send() {
                    Err(e) => {
                        log::error!("failed to send glean ping: {e:#}");
                        UploadResult::recoverable_failure()
                    }
                    Ok(_) => UploadResult::http_status(200),
                },
            };

            #[cfg(mock)]
            return self.mock_data.clone().call(do_send);
            #[cfg(not(mock))]
            return do_send();
        }
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use once_cell::sync::Lazy;
    use std::sync::{Mutex, MutexGuard};

    pub fn test_init(cfg: &Config) -> GleanTest {
        GleanTest::new(cfg)
    }

    pub struct GleanTest {
        _guard: MutexGuard<'static, ()>,
    }

    impl GleanTest {
        fn new(cfg: &Config) -> Self {
            // Tests using glean can only run serially as glean is initialized as a global static.
            static GLOBAL_LOCK: Lazy<Mutex<()>> = Lazy::new(|| Mutex::new(()));

            let lock = GLOBAL_LOCK.lock().unwrap();
            InitOptions::from_config(cfg).test_init();
            GleanTest { _guard: lock }
        }
    }

    impl Drop for GleanTest {
        fn drop(&mut self) {
            // `shutdown` ensures any uploads are executed and threads are joined.
            // `test_reset_glean` does not do the same (found by source inspection).
            glean::shutdown();
            glean::test_reset_glean(
                glean::ConfigurationBuilder::new(false, ::std::env::temp_dir(), "none.none")
                    .build(),
                glean::ClientInfoMetrics::unknown(),
                true,
            );
        }
    }
}

#[cfg(test)]
pub use test::test_init;
