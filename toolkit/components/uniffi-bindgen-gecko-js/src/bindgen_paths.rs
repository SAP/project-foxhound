/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

use anyhow::Result;
use uniffi_bindgen::{BindgenPaths, BindgenPathsLayer};

pub fn gecko_js_bindgen_paths() -> Result<BindgenPaths> {
    let mut paths = BindgenPaths::default();
    paths.add_layer(ConfigTomlLayer {});
    paths.add_cargo_metadata_layer(false)?;
    Ok(paths)
}

/// Responsible for identifying our config.toml
struct ConfigTomlLayer {}

impl BindgenPathsLayer for ConfigTomlLayer {
    fn get_config(&self, _crate_name: &str) -> Result<Option<toml::Table>> {
        Ok(Some(toml::from_str(include_str!("../config.toml"))?))
    }
}
