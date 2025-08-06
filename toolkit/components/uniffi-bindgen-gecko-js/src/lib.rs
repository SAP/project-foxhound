/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

use anyhow::{Context, Result};
use askama::Template;
use camino::{Utf8Path, Utf8PathBuf};
use clap::Parser;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs::File;
use std::io::Write;

mod ci_list;
mod docs;
mod render;

use ci_list::{CallbackIds, ComponentUniverse, FunctionIds, ObjectIds};
use render::cpp::CPPScaffoldingTemplate;
use render::js::JSBindingsTemplate;

#[derive(Debug, Parser)]
#[clap(name = "uniffi-bindgen-gecko-js")]
#[clap(version = clap::crate_version!())]
#[clap(about = "JS bindings generator for Rust")]
#[clap(propagate_version = true)]
struct CliArgs {
    // This is a really convoluted set of arguments, but we're only expecting to be called by
    // `mach_commands.py`
    #[clap(long, value_name = "FILE")]
    library_path: Utf8PathBuf,

    #[clap(long, value_name = "FILE")]
    fixtures_library_path: Utf8PathBuf,

    #[clap(long, value_name = "FILE")]
    js_dir: Utf8PathBuf,

    #[clap(long, value_name = "FILE")]
    fixture_js_dir: Utf8PathBuf,

    #[clap(long, value_name = "FILE")]
    cpp_path: Utf8PathBuf,

    #[clap(long, value_name = "FILE")]
    docs_path: Utf8PathBuf,
}

type Component = uniffi_bindgen::Component<Config>;

/// Configuration for a single Component
#[derive(Clone, Debug, Default, Deserialize, Serialize)]
pub struct Config {
    #[serde(default)]
    async_wrappers: AsyncWrappersConfig,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize)]
struct AsyncWrappersConfig {
    /// This converts synchronous Rust functions into async JS functions, by wrapping them at the
    /// C++ layer.
    #[serde(default)]
    enable: bool,
    /// Functions that should be run on the main thread and not be wrapped
    #[serde(default)]
    main_thread: HashSet<String>,
}

fn render(out_path: Utf8PathBuf, template: impl Template) -> Result<()> {
    println!("rendering {}", out_path);
    let contents = template.render()?;
    let mut f =
        File::create(&out_path).context(format!("Failed to create {:?}", out_path.file_name()))?;
    write!(f, "{}\n", contents).context(format!("Failed to write to {}", out_path))
}

fn render_cpp(
    path: Utf8PathBuf,
    components: &[Component],
    fixture_components: &[Component],
    function_ids: &FunctionIds,
    object_ids: &ObjectIds,
    callback_ids: &CallbackIds,
) -> Result<()> {
    render(
        path,
        CPPScaffoldingTemplate::new(
            components,
            fixture_components,
            function_ids,
            object_ids,
            callback_ids,
        ),
    )
}

fn render_js(
    out_dir: &Utf8Path,
    components: &[Component],
    function_ids: &FunctionIds,
    object_ids: &ObjectIds,
    callback_ids: &CallbackIds,
) -> Result<()> {
    for c in components {
        let template = JSBindingsTemplate {
            ci: &c.ci,
            config: &c.config,
            function_ids,
            object_ids,
            callback_ids,
        };
        let path = out_dir.join(template.js_module_name());
        render(path, template)?;
    }
    Ok(())
}

pub fn run_main() -> Result<()> {
    let args = CliArgs::parse();
    let components = ComponentUniverse::new(args.library_path, args.fixtures_library_path)?;
    let function_ids = FunctionIds::new(&components);
    let object_ids = ObjectIds::new(&components);
    let callback_ids = CallbackIds::new(&components);

    render_cpp(
        args.cpp_path,
        &components.components,
        &components.fixture_components,
        &function_ids,
        &object_ids,
        &callback_ids,
    )?;
    render_js(
        &args.js_dir,
        &components.components,
        &function_ids,
        &object_ids,
        &callback_ids,
    )?;
    render_js(
        &args.fixture_js_dir,
        &components.fixture_components,
        &function_ids,
        &object_ids,
        &callback_ids,
    )?;
    docs::render_docs(&args.docs_path, &components.components)?;

    Ok(())
}
