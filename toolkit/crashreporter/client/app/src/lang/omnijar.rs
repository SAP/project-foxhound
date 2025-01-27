/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

use super::language_info::LanguageInfo;
use crate::std::{
    env::current_exe,
    fs::File,
    io::{BufRead, BufReader, Read},
    path::Path,
};
use anyhow::Context;
use zip::read::ZipArchive;

/// Read the appropriate localization fluent definitions from the omnijar files.
///
/// Returns (locale name, fluent definitions).
pub fn read() -> anyhow::Result<LanguageInfo> {
    let mut path = current_exe().context("failed to get current executable")?;
    path.pop();
    path.push("omni.ja");

    let mut zip = read_omnijar_file(&path)?;
    let locales = {
        let buf = BufReader::new(
            zip.by_name("res/multilocale.txt")
                .context("failed to read multilocale file in zip archive")?,
        );
        let line = buf
            .lines()
            .next()
            .ok_or(anyhow::anyhow!("multilocale file was empty"))?
            .context("failed to read first line of multilocale file")?;
        line.split(",")
            .map(|s| s.trim().to_owned())
            .collect::<Vec<_>>()
    };

    let (locale, ftl_definitions) = 'defs: {
        for locale in &locales {
            match read_strings(locale, &mut zip) {
                Ok(v) => break 'defs (locale.to_string(), v),
                Err(e) => log::warn!("{e:#}"),
            }
        }
        anyhow::bail!("failed to find any usable localized strings in the omnijar")
    };

    // The brand ftl is in the browser omnijar.
    path.pop();
    path.push("browser");
    path.push("omni.ja");

    let ftl_branding = 'branding: {
        for locale in &locales {
            match read_branding(&locale, &mut zip) {
                Ok(v) => break 'branding v,
                Err(e) => log::warn!("failed to read branding from omnijar: {e:#}"),
            }
        }
        log::info!("using fallback branding info");
        LanguageInfo::default().ftl_branding
    };

    Ok(LanguageInfo {
        identifier: locale,
        ftl_definitions,
        ftl_branding,
    })
}

/// Read the localized strings from the given zip archive (omnijar).
fn read_strings(locale: &str, archive: &mut ZipArchive<File>) -> anyhow::Result<String> {
    let mut file = archive
        .by_name(&format!(
            "localization/{locale}/crashreporter/crashreporter.ftl"
        ))
        .with_context(|| format!("failed to locate localization file for {locale}"))?;

    let mut ftl_definitions = String::new();
    file.read_to_string(&mut ftl_definitions)
        .with_context(|| format!("failed to read localization file for {locale}"))?;

    Ok(ftl_definitions)
}

/// Read the branding information from the given zip archive (omnijar).
fn read_branding(locale: &str, archive: &mut ZipArchive<File>) -> anyhow::Result<String> {
    let mut file = archive
        .by_name(&format!("localization/{locale}/branding/brand.ftl"))
        .with_context(|| format!("failed to locate branding localization file for {locale}"))?;
    let mut s = String::new();
    file.read_to_string(&mut s)
        .with_context(|| format!("failed to read branding localization file for {locale}"))?;
    Ok(s)
}

fn read_omnijar_file(path: &Path) -> anyhow::Result<ZipArchive<File>> {
    ZipArchive::new(
        File::open(&path).with_context(|| format!("failed to open {}", path.display()))?,
    )
    .with_context(|| format!("failed to read zip archive in {}", path.display()))
}
