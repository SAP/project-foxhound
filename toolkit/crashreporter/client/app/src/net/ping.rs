/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

//! Crash pings sent using Glean.

use crate::std;
use crate::std::mock;
use crate::std::path::Path;
use anyhow::Context;
use uuid::Uuid;

mod legacy_telemetry;

pub struct CrashPing<'a> {
    pub extra: &'a serde_json::Value,
    pub reason: Option<&'a str>,
    pub legacy_telemetry: Option<LegacyTelemetryCrashPing<'a>>,
}

pub struct LegacyTelemetryCrashPing<'a> {
    pub crash_id: &'a str,
    pub ping_dir: Option<&'a Path>,
    pub minidump_hash: Option<&'a str>,
    pub pingsender_path: &'a Path,
}

impl CrashPing<'_> {
    /// Send the crash ping.
    ///
    /// Returns the crash ping id if the ping could be sent. Any errors are logged.
    pub fn send(&self) -> Option<Uuid> {
        let id = new_id();

        // Glean ping tests have to be run serially (because the glean interface is a global), but
        // we can run tests that are uninterested in glean pings in parallel by disabling the pings
        // here.
        if mock::hook(true, "enable_glean_pings") {
            if let Err(e) = self.send_glean() {
                log::error!("failed to send glean ping: {e:#}");
            }
        }

        match self.send_legacy(&id) {
            Err(e) => {
                log::error!("failed to send legacy ping: {e:#}");
                None
            }
            Ok(sent) => sent.then_some(id),
        }
    }

    fn send_glean(&self) -> anyhow::Result<()> {
        crashping::send(&self.extra, self.reason)
    }

    fn send_legacy(&self, id: &Uuid) -> anyhow::Result<bool> {
        let Some(LegacyTelemetryCrashPing {
            crash_id,
            ping_dir,
            minidump_hash,
            pingsender_path,
        }) = self.legacy_telemetry
        else {
            return Ok(false);
        };

        let Some(ping_dir) = ping_dir else {
            log::warn!("not sending legacy crash ping because no ping directory configured");
            return Ok(false);
        };

        let ping = legacy_telemetry::Ping::crash(id, self.extra, crash_id, minidump_hash)
            .context("failed to create telemetry crash ping")?;

        let submission_url = ping
            .submission_url(self.extra)
            .context("failed to generate ping submission URL")?;

        let target_file = ping_dir.join(format!("{}.json", id));

        let file = std::fs::File::create(&target_file).with_context(|| {
            format!(
                "failed to open ping file {} for writing",
                target_file.display()
            )
        })?;

        serde_json::to_writer(file, &ping).context("failed to serialize telemetry crash ping")?;

        crate::process::background_command(pingsender_path)
            .arg(submission_url)
            .arg(target_file)
            .spawn()
            .with_context(|| {
                format!(
                    "failed to launch pingsender process at {}",
                    pingsender_path.display()
                )
            })?;

        // TODO asynchronously get pingsender result and log it?

        Ok(true)
    }
}

fn new_id() -> Uuid {
    crate::std::mock::hook(Uuid::new_v4(), "ping_uuid")
}
