// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

use anyhow::{Context, Result};

pub struct TaskCluster {
    root_url: url::Url,
    client: reqwest::blocking::Client,
}

impl TaskCluster {
    pub fn from_env() -> Result<Self> {
        let root_url = if let Ok(proxy_url) = std::env::var("TASKCLUSTER_PROXY_URL") {
            proxy_url
                .parse()
                .context("Couldn't parse TASKCLUSTER_PROXY_URL.")?
        } else {
            std::env::var("TASKCLUSTER_ROOT_URL")
                .context("TASKCLUSTER_ROOT_URL not set.")
                .and_then(|var| var.parse().context("Couldn't parse TASKCLUSTER_ROOT_URL."))?
        };

        Ok(TaskCluster {
            root_url,
            client: reqwest::blocking::Client::new(),
        })
    }

    /// Return the root URL as suitable for passing to other processes.
    ///
    /// In particular, any trailing slashes are removed.
    pub fn root_url(&self) -> String {
        self.root_url.as_str().trim_end_matches("/").to_string()
    }

    pub fn task_artifact_url(&self, task_id: &str, path: &str) -> url::Url {
        let mut url = self.root_url.clone();
        url.set_path(&format!("api/queue/v1/task/{}/artifacts/{}", task_id, path));
        url
    }

    pub fn stream_artifact(&self, task_id: &str, path: &str) -> Result<impl std::io::Read> {
        let url = self.task_artifact_url(task_id, path);
        Ok(self.client.get(url).send()?.error_for_status()?)
    }
}

#[cfg(test)]
mod test {
    use std::env;

    #[test]
    fn test_url() {
        let cluster = super::TaskCluster {
            root_url: url::Url::parse("http://taskcluster.example").unwrap(),
            client: reqwest::blocking::Client::new(),
        };
        assert_eq!(
            cluster.task_artifact_url("QzDLgP4YRwanIvgPt6ClfA","public/docker-contexts/decision.tar.gz"),
            url::Url::parse("http://taskcluster.example/api/queue/v1/task/QzDLgP4YRwanIvgPt6ClfA/artifacts/public/docker-contexts/decision.tar.gz").unwrap(),
        );
    }

    #[test]
    fn test_from_env_proxy_url() {
        env::set_var("TASKCLUSTER_PROXY_URL", "http://taskcluster");
        env::set_var(
            "TASKCLUSTER_ROOT_URL",
            "https://firefox-ci-tc.services.mozilla.com",
        );

        let cluster = super::TaskCluster::from_env().unwrap();
        assert_eq!(cluster.root_url.as_str(), "http://taskcluster/");

        env::remove_var("TASKCLUSTER_PROXY_URL");
        env::remove_var("TASKCLUSTER_ROOT_URL");
    }

    #[test]
    fn test_from_env_fallback_to_root_url() {
        env::remove_var("TASKCLUSTER_PROXY_URL");
        env::set_var(
            "TASKCLUSTER_ROOT_URL",
            "https://firefox-ci-tc.services.mozilla.com",
        );

        let cluster = super::TaskCluster::from_env().unwrap();
        assert_eq!(
            cluster.root_url.as_str(),
            "https://firefox-ci-tc.services.mozilla.com/"
        );

        env::remove_var("TASKCLUSTER_ROOT_URL");
    }
}
