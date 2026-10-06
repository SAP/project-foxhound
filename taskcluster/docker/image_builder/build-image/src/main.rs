// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

#![forbid(unsafe_code)]

use std::collections::HashMap;
use std::os::unix::fs::chown;
use std::path::Path;
use std::process::Command;

use anyhow::{ensure, Context, Result};
use fs_extra::dir::{move_dir, CopyOptions};
use serde::Deserialize;

mod config;
mod taskcluster;

use config::Config;

fn log_step(msg: &str) {
    println!("[build-image] {}", msg);
}

fn read_image_digest(path: &str) -> Result<String> {
    let output = Command::new("/kaniko/skopeo")
        .arg("inspect")
        .arg(format!("docker-archive:{}", path))
        .stdout(std::process::Stdio::piped())
        .spawn()?
        .wait_with_output()?;
    ensure!(
        output.status.success(),
        format!("Could not inspect parent image: {}", output.status)
    );

    #[derive(Deserialize, Debug)]
    #[serde(rename_all = "PascalCase")]
    struct ImageInfo {
        #[serde(skip_serializing_if = "Option::is_none")]
        name: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        tag: Option<String>,
        digest: String,
        // ...
    }

    let image_info: ImageInfo = serde_json::from_slice(&output.stdout)
        .with_context(|| format!("Could parse image info from {:?}", path))?;
    Ok(image_info.digest)
}

fn download_parent_image(
    cluster: &taskcluster::TaskCluster,
    task_id: &str,
    dest: &str,
) -> Result<String> {
    zstd::stream::copy_decode(
        cluster.stream_artifact(&task_id, "public/image.tar.zst")?,
        std::fs::File::create(dest)?,
    )
    .context("Could not download parent image.")?;

    read_image_digest(dest)
}

fn build_image(
    context_path: &str,
    dest: &str,
    debug: bool,
    build_args: HashMap<String, String>,
) -> Result<()> {
    let mut command = Command::new("/kaniko/executor");
    command
        .stderr(std::process::Stdio::inherit())
        .args(&["--context", &format!("tar://{}", context_path)])
        .args(&["--destination", "image"])
        .args(&["--dockerfile", "Dockerfile"])
        .args(&["--no-push", "--no-push-cache"])
        .args(&[
            "--cache=true",
            "--cache-dir",
            "/workspace/cache",
            "--cache-repo",
            "oci:/workspace/repo",
        ])
        .arg("--single-snapshot")
        // Compressed caching causes OOM with large images
        .arg("--compressed-caching=false")
        // FIXME: Generating reproducible layers currently causes OOM.
        // .arg("--reproducible")
        .arg("--ignore-var-run=false")
        .args(&["--tarPath", dest]);
    if debug {
        command.args(&["-v", "debug"]);
    }
    for (key, value) in build_args {
        command.args(&["--build-arg", &format!("{}={}", key, value)]);
    }
    let status = command.status()?;
    ensure!(
        status.success(),
        format!("Could not build image: {}", status)
    );
    Ok(())
}

fn repack_image(source: &str, dest: &str, image_name: &str) -> Result<()> {
    let status = Command::new("/kaniko/skopeo")
        .arg("copy")
        .arg(format!("docker-archive:{}", source))
        .arg(format!("docker-archive:{}:{}", dest, image_name))
        .stderr(std::process::Stdio::inherit())
        .status()?;
    ensure!(
        status.success(),
        format!("Could not repack image: {}", status)
    );
    Ok(())
}

fn main() -> Result<()> {
    // Kaniko expects everything to be in /kaniko, so if not running from there, move
    // everything there.
    if let Some(path) = std::env::current_exe()?.parent() {
        if path != Path::new("/kaniko") {
            let mut options = CopyOptions::new();
            options.copy_inside = true;
            move_dir(path, "/kaniko", &options)?;
        }
    }

    let config = Config::from_env().context("Could not parse environment variables.")?;

    let cluster = taskcluster::TaskCluster::from_env()?;

    let mut build_args = config.docker_build_args;

    build_args.insert("TASKCLUSTER_ROOT_URL".into(), cluster.root_url());

    let output_dir = Path::new("/workspace/out");
    if !output_dir.is_dir() {
        std::fs::create_dir_all(output_dir)?;
    }

    let context_path = Path::new("/workspace/context.tar.gz");
    if !context_path.is_file() {
        log_step("Downloading context.");

        std::io::copy(
            &mut cluster.stream_artifact(&config.context_task_id, &config.context_path)?,
            &mut std::fs::File::create(context_path)?,
        )
        .context("Could not download image context.")?;
    } else {
        log_step(&format!(
            "Using existing context from {}",
            context_path.display()
        ));
    }

    if let Some(parent_task_id) = config.parent_task_id {
        let parent_path = Path::new("/workspace/parent.tar");
        let digest = if parent_path.is_file() {
            log_step(&format!(
                "Using existing parent image from {}",
                parent_path.display()
            ));
            read_image_digest(parent_path.to_str().unwrap())?
        } else {
            log_step("Downloading image.");
            download_parent_image(&cluster, &parent_task_id, parent_path.to_str().unwrap())?
        };

        log_step(&format!("Parent image digest {}", &digest));
        std::fs::create_dir_all("/workspace/cache")?;
        std::fs::copy(parent_path, format!("/workspace/cache/{}", digest))?;

        build_args.insert(
            "DOCKER_IMAGE_PARENT".into(),
            format!("parent:latest@{}", digest),
        );
    }

    log_step("Building image.");
    build_image(
        context_path.to_str().unwrap(),
        output_dir.join("image-pre.tar").to_str().unwrap(),
        config.debug,
        build_args,
    )?;
    log_step("Repacking image.");
    repack_image(
        output_dir.join("image-pre.tar").to_str().unwrap(),
        output_dir.join("image.tar").to_str().unwrap(),
        &config.image_name,
    )?;

    log_step("Compressing image.");
    compress_file(
        output_dir.join("image.tar"),
        output_dir.join("image.tar.zst"),
        config.docker_image_zstd_level,
    )?;

    if let Some(owner) = config.chown_output {
        log_step(&format!("Changing ownership to {}", owner));
        chown_output_files(&owner, output_dir)?;
    }

    Ok(())
}

fn compress_file(
    source: impl AsRef<std::path::Path>,
    dest: impl AsRef<std::path::Path>,
    zstd_level: i32,
) -> Result<()> {
    Ok(zstd::stream::copy_encode(
        std::fs::File::open(source)?,
        std::fs::File::create(dest)?,
        zstd_level,
    )?)
}

fn chown_output_files(owner: &str, output_dir: &Path) -> Result<()> {
    let parts: Vec<&str> = owner.split(':').collect();
    ensure!(
        parts.len() == 2,
        "Owner must be in format 'uid:gid', got: {}",
        owner
    );

    let uid = parts[0]
        .parse::<u32>()
        .with_context(|| format!("Failed to parse uid: {}", parts[0]))?;
    let gid = parts[1]
        .parse::<u32>()
        .with_context(|| format!("Failed to parse gid: {}", parts[1]))?;

    for entry in std::fs::read_dir(output_dir)? {
        let entry = entry?;
        let path = entry.path();
        chown(&path, Some(uid), Some(gid))
            .with_context(|| format!("Failed to chown {}", path.display()))?;
    }

    Ok(())
}
