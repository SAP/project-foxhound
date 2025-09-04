use std::{
    collections::{BTreeMap, BTreeSet},
    env::{current_dir, set_current_dir},
    path::{Path, PathBuf},
    process::ExitCode,
};

use clap::Parser;
use itertools::Itertools;
use lets_find_up::{find_up_with, FindUpKind, FindUpOptions};
use miette::{bail, ensure, miette, Context, Diagnostic, IntoDiagnostic, Report, SourceSpan};
use regex::Regex;

use crate::{
    fs::{copy_dir, create_dir_all, remove_file, FileRoot},
    path::join_path,
    process::{which, EasyCommand},
};

mod fs;
mod path;
mod process;

/// Vendor WebGPU CTS tests from a local Git checkout of [our `gpuweb/cts` fork].
///
/// WPT tests are generated into `testing/web-platform/mozilla/tests/webgpu/`. If the set of tests
/// changes upstream, make sure that the generated output still matches up with test expectation
/// metadata in `testing/web-platform/mozilla/meta/webgpu/`.
///
/// [our `gpuweb/cts` fork]: https://github.com/mozilla/gpuweb-cts
#[derive(Debug, Parser)]
struct CliArgs {
    /// A path to the top-level directory of your WebGPU CTS checkout.
    cts_checkout_path: PathBuf,
}

fn main() -> ExitCode {
    env_logger::builder()
        .filter_level(log::LevelFilter::Info)
        .parse_default_env()
        .init();

    let args = CliArgs::parse();

    match run(args) {
        Ok(()) => ExitCode::SUCCESS,
        Err(e) => {
            log::error!("{e:?}");
            ExitCode::FAILURE
        }
    }
}

fn run(args: CliArgs) -> miette::Result<()> {
    let CliArgs { cts_checkout_path } = args;

    let orig_working_dir = current_dir().unwrap();

    let cts_dir = join_path(["dom", "webgpu", "tests", "cts"]);
    let cts_vendor_dir = join_path([&*cts_dir, "vendor".as_ref()]);
    let gecko_ckt = {
        let find_up_opts = || FindUpOptions {
            cwd: Path::new("."),
            kind: FindUpKind::Dir,
        };
        let find_up = |repo_tech_name, root_dir_name| {
            let err = || {
                miette!(
                    concat!(
                        "failed to find a {} repository ({:?}) in any of current ",
                        "working directory and its parent directories",
                    ),
                    repo_tech_name,
                    root_dir_name,
                )
            };
            find_up_with(root_dir_name, find_up_opts())
                .map_err(Report::msg)
                .wrap_err_with(err)
                .and_then(|loc_opt| loc_opt.ok_or_else(err))
                .map(|mut dir| {
                    dir.pop();
                    dir
                })
        };
        let gecko_source_root = find_up("Mercurial", ".hg").or_else(|hg_err| {
            find_up("Git", ".git").or_else(|git_err| match find_up("Jujutsu", ".jj") {
                Ok(path) => {
                    log::debug!("{hg_err:?}");
                    Ok(path)
                }
                Err(jj_err) => {
                    log::warn!("{hg_err:?}");
                    log::warn!("{git_err:?}");
                    log::warn!("{jj_err:?}");
                    bail!("failed to find a Gecko repository root")
                }
            })
        })?;

        let root = FileRoot::new("gecko", &gecko_source_root)?;
        log::info!("detected Gecko repository root at {root}");

        ensure!(
            root.try_child(&orig_working_dir)
                .is_ok_and(|c| c.relative_path() == cts_vendor_dir),
            concat!(
                "It is expected to run this tool from the root of its Cargo project, ",
                "but this does not appear to have been done. Bailing."
            )
        );

        root
    };

    let cts_vendor_dir = gecko_ckt.child(orig_working_dir.parent().unwrap());

    let wpt_tests_dir = {
        let child = gecko_ckt.child(join_path(["testing", "web-platform", "mozilla", "tests"]));
        ensure!(
            child.is_dir(),
            "WPT tests dir ({child}) does not appear to exist"
        );
        child
    };

    let (cts_ckt_git_dir, cts_ckt) = {
        let failed_find_git_err = || {
            miette!(concat!(
                "failed to find a Git repository (`.git` directory) in the provided path ",
                "and all of its parent directories"
            ))
        };
        let git_dir = find_up_with(
            ".git",
            FindUpOptions {
                cwd: &cts_checkout_path,
                kind: FindUpKind::Dir,
            },
        )
        .map_err(Report::msg)
        .wrap_err_with(failed_find_git_err)?
        .ok_or_else(failed_find_git_err)?;

        let ckt = FileRoot::new("cts", git_dir.parent().unwrap())?;
        log::debug!("detected CTS checkout root at {ckt}");
        (git_dir, ckt)
    };

    let git_bin = which("git", "Git binary")?;
    let npm_bin = which("npm", "NPM binary")?;

    // XXX: It'd be nice to expose separate operations for copying in source and generating WPT
    // cases from the vendored copy. Checks like these really only matter when updating source.
    let ensure_no_child = |p1: &FileRoot, p2| {
        ensure!(
            p1.try_child(p2).is_err(),
            "{p1} is a child path of {p2}, which is not supported"
        );
        Ok(())
    };
    ensure_no_child(&cts_ckt, &gecko_ckt)?;
    ensure_no_child(&gecko_ckt, &cts_ckt)?;

    log::info!("making a vendored copy of checked-in files from {cts_ckt}…",);
    gecko_ckt.regen_file(
        join_path([&*cts_dir, "checkout_commit.txt".as_ref()]),
        |checkout_commit_file| {
            let mut git_status_porcelain_cmd = EasyCommand::new(&git_bin, |cmd| {
                cmd.args(["status", "--porcelain"])
                    .envs([("GIT_DIR", &*cts_ckt_git_dir), ("GIT_WORK_TREE", &*cts_ckt)])
            });
            log::info!(
                "  …ensuring the working tree and index are clean with {}…",
                git_status_porcelain_cmd
            );
            let git_status_porcelain_output = git_status_porcelain_cmd.just_stdout_utf8()?;
            ensure!(
                git_status_porcelain_output.is_empty(),
                concat!(
                    "expected a clean CTS working tree and index, ",
                    "but {}'s output was not empty; ",
                    "for reference, it was:\n\n{}",
                ),
                git_status_porcelain_cmd,
                git_status_porcelain_output,
            );

            gecko_ckt.regen_dir(cts_vendor_dir.join("checkout"), |vendored_ckt_dir| {
                log::info!("  …copying files tracked by Git to {vendored_ckt_dir}…");
                let files_to_vendor = {
                    let mut git_ls_files_cmd = EasyCommand::new(&git_bin, |cmd| {
                        cmd.arg("ls-files").env("GIT_DIR", &cts_ckt_git_dir)
                    });
                    log::debug!("  …getting files to vendor from {git_ls_files_cmd}…");
                    let output = git_ls_files_cmd.just_stdout_utf8()?;
                    let mut files = output
                        .split_terminator('\n')
                        .map(PathBuf::from)
                        .collect::<BTreeSet<_>>();
                    log::trace!("  …files from {git_ls_files_cmd}: {files:#?}");

                    log::trace!("  …validating that files from Git repo still exist…");
                    let files_not_found = files
                        .iter()
                        .filter(|p| !cts_ckt.child(p).exists())
                        .collect::<Vec<_>>();
                    ensure!(
                        files_not_found.is_empty(),
                        concat!(
                            "the following files were returned by `git ls-files`, ",
                            "but do not exist on disk: {:#?}",
                        ),
                        files_not_found,
                    );

                    log::trace!("  …stripping files we actually don't want to vendor…");
                    let files_to_actually_not_vendor = [
                        // There's no reason to bring this over, and lots of reasons to not bring in
                        // security-sensitive content unless we have to.
                        "deploy_key.enc",
                    ]
                    .map(Path::new);
                    log::trace!("    …files we don't want: {files_to_actually_not_vendor:?}");
                    for path in files_to_actually_not_vendor {
                        ensure!(
                            files.remove(path),
                            concat!(
                                "failed to remove {} from list of files to vendor; ",
                                "does it still exist?"
                            ),
                            cts_ckt.child(path)
                        );
                    }
                    files
                };

                log::debug!("  …now doing the copying…");
                for path in files_to_vendor {
                    let vendor_from_path = cts_ckt.child(&path);
                    let vendor_to_path = vendored_ckt_dir.child(&path);
                    if let Some(parent) = vendor_to_path.parent() {
                        create_dir_all(vendored_ckt_dir.child(parent))?;
                    }
                    log::trace!("    …copying {vendor_from_path} to {vendor_to_path}…");
                    fs::copy(&vendor_from_path, &vendor_to_path)?;
                }

                Ok(())
            })?;

            log::info!("  …writing commit ref pointed to by `HEAD` to {checkout_commit_file}…");
            let mut git_rev_parse_head_cmd = EasyCommand::new(&git_bin, |cmd| {
                cmd.args(["rev-parse", "HEAD"])
                    .env("GIT_DIR", &cts_ckt_git_dir)
            });
            log::trace!("    …getting output of {git_rev_parse_head_cmd}…");
            fs::write(
                checkout_commit_file,
                git_rev_parse_head_cmd.just_stdout_utf8()?,
            )
            .wrap_err_with(|| format!("failed to write HEAD ref to {checkout_commit_file}"))
        },
    )?;

    set_current_dir(&*cts_ckt)
        .into_diagnostic()
        .wrap_err("failed to change working directory to CTS checkout")?;
    log::debug!("changed CWD to {cts_ckt}");

    let mut npm_ci_cmd = EasyCommand::new(&npm_bin, |cmd| cmd.arg("ci"));
    log::info!(
        "ensuring a clean {} directory with {npm_ci_cmd}…",
        cts_ckt.child("node_modules"),
    );
    npm_ci_cmd.spawn()?;

    let out_wpt_dir = cts_ckt.regen_dir("out-wpt", |out_wpt_dir| {
        let mut npm_run_wpt_cmd = EasyCommand::new(&npm_bin, |cmd| cmd.args(["run", "wpt"]));
        log::info!("generating WPT test cases into {out_wpt_dir} with {npm_run_wpt_cmd}…");
        npm_run_wpt_cmd.spawn()
    })?;

    let cts_https_html_path = out_wpt_dir.child("cts-withsomeworkers.https.html");

    {
        for file_name in ["cts-chunked2sec.https.html", "cts.https.html"] {
            let file_name = out_wpt_dir.child(file_name);
            log::info!("removing extraneous {file_name}…");
            remove_file(&*file_name)?;
        }
    }

    log::info!("analyzing {cts_https_html_path}…");
    let cts_https_html_content = fs::read_to_string(&*cts_https_html_path)?;
    let cts_boilerplate_short_timeout;
    let cts_boilerplate_long_timeout;
    let cts_cases;
    #[derive(Clone, Copy, Debug, Eq, Ord, PartialEq, PartialOrd)]
    enum WorkerType {
        Dedicated,
        Service,
        Shared,
    }

    impl WorkerType {
        const DEDICATED: &str = "dedicated";
        const SERVICE: &str = "service";
        const SHARED: &str = "shared";

        pub(crate) fn new(s: &str) -> Option<Self> {
            match s {
                Self::DEDICATED => Some(WorkerType::Dedicated),
                Self::SERVICE => Some(WorkerType::Service),
                Self::SHARED => Some(WorkerType::Shared),
                _ => None,
            }
        }

        pub(crate) fn as_str(&self) -> &'static str {
            match self {
                Self::Dedicated => Self::DEDICATED,
                Self::Service => Self::SERVICE,
                Self::Shared => Self::SHARED,
            }
        }
    }
    {
        {
            let (boilerplate, cases_start) = {
                let cases_start_idx = cts_https_html_content
                    .find("<meta name=variant")
                    .ok_or_else(|| miette!("no test cases found; this is unexpected!"))?;
                cts_https_html_content.split_at(cases_start_idx)
            };

            {
                if !boilerplate.is_empty() {
                    #[derive(Debug, Diagnostic, thiserror::Error)]
                    #[error("last character before test cases was not a newline; bug, or weird?")]
                    #[diagnostic(severity("warning"))]
                    struct Oops {
                        #[label(
                            "this character ({:?}) was expected to be a newline, so that {}",
                            source_code.chars().last().unwrap(),
                            "the test spec. following it is on its own line"
                        )]
                        span: SourceSpan,
                        #[source_code]
                        source_code: String,
                    }
                    ensure!(
                        boilerplate.ends_with('\n'),
                        Oops {
                            span: SourceSpan::from(0..boilerplate.len()),
                            source_code: cts_https_html_content,
                        }
                    );
                }

                // NOTE: Adding `_mozilla` is necessary because [that's how it's mounted][source].
                //
                // [source]: https://searchfox.org/mozilla-central/rev/cd2121e7d83af1b421c95e8c923db70e692dab5f/testing/web-platform/mozilla/README#1-4]
                log::info!(concat!(
                    "  …fixing `script` paths in WPT boilerplate ",
                    "so they work as Mozilla-private WPT tests…"
                ));
                let expected_wpt_script_tag =
                    "<script type=module src=/webgpu/common/runtime/wpt.js></script>";
                ensure!(
                    boilerplate.contains(expected_wpt_script_tag),
                    concat!(
                        "failed to find expected `script` tag for `wpt.js` ",
                        "({:?}); did something change upstream?",
                    ),
                    expected_wpt_script_tag
                );
                let mut boilerplate = boilerplate.replacen(
                    expected_wpt_script_tag,
                    "<script type=module src=/_mozilla/webgpu/common/runtime/wpt.js></script>",
                    1,
                );

                cts_boilerplate_short_timeout = boilerplate.clone();

                let timeout_insert_idx = {
                    let meta_charset_utf8 = "\n<meta charset=utf-8>\n";
                    let meta_charset_utf8_idx =
                        boilerplate.find(meta_charset_utf8).ok_or_else(|| {
                            miette!(
                                "could not find {:?} in document; did something change upstream?",
                                meta_charset_utf8
                            )
                        })?;
                    meta_charset_utf8_idx + meta_charset_utf8.len()
                };
                boilerplate.insert_str(
                    timeout_insert_idx,
                    concat!(
                        r#"<meta name="timeout" content="long">"#,
                        " <!-- TODO: narrow to only where it's needed, see ",
                        "https://bugzilla.mozilla.org/show_bug.cgi?id=1850537",
                        " -->\n"
                    ),
                );
                cts_boilerplate_long_timeout = boilerplate
            };

            log::info!("  …parsing test variants in {cts_https_html_path}…");
            let mut parsing_failed = false;
            let meta_variant_regex = Regex::new(concat!(
                "^",
                "<meta name=variant content='",
                r"\?",
                r"(:?worker=(?P<worker_type>\w+)&)?",
                r"q=(?P<test_path>[^']*?):\*",
                "'>",
                "$"
            ))
            .unwrap();
            cts_cases = cases_start
                .split_terminator('\n')
                .filter_map(|line| {
                    if line.is_empty() {
                        // Empty separator lines exist between groups of different `worker_type`s.
                        return None;
                    }
                    let captures = meta_variant_regex.captures(line);
                    if captures.is_none() {
                        parsing_failed = true;
                        log::error!("line is not a test case: {line:?}");
                    }
                    let captures = captures?;

                    let test_path = captures["test_path"].to_owned();

                    let worker_type =
                        captures
                            .name("worker_type")
                            .map(|wt| wt.as_str())
                            .and_then(|wt| match WorkerType::new(wt) {
                                Some(wt) => Some(wt),
                                None => {
                                    parsing_failed = true;
                                    log::error!("unrecognized `worker` type {wt:?}");
                                    None
                                }
                            });

                    Some((test_path, worker_type, line))
                })
                .collect::<Vec<_>>();
            ensure!(
                !parsing_failed,
                "one or more test case lines failed to parse, fix it and try again"
            );
        };
        log::trace!("\"original\" HTML boilerplate:\n\n{cts_boilerplate_short_timeout}");

        ensure!(
            !cts_cases.is_empty(),
            "no test cases found; this is unexpected!"
        );
        log::info!("  …found {} test cases", cts_cases.len());
    }

    cts_ckt.regen_dir(out_wpt_dir.join("cts"), |cts_tests_dir| {
        log::info!("re-distributing tests into single file per test path…");
        let mut failed_writing = false;
        let mut cts_cases_by_spec_file_dir = BTreeMap::<_, BTreeMap<_, BTreeSet<_>>>::new();
        for (path, worker_type, meta) in cts_cases {
            let case_dir = {
                // Context: We want to mirror CTS upstream's `src/webgpu/**/*.spec.ts` paths as
                // entire WPT tests, with each subtest being a WPT variant. Here's a diagram of
                // a CTS path to explain why the logic below is correct:
                //
                // ```sh
                // webgpu:this,is,the,spec.ts,file,path:subtest_in_file:…
                // \____/ \___________________________/^\_____________/
                //  test      `*.spec.ts` file path    |       |
                // \__________________________________/|       |
                //                   |                 |       |
                //              We want this…          | …but not this. CTS upstream generates
                //                                     | this too, but we don't want to divide
                //         second ':' character here---/ here (yet).
                // ```
                let subtest_and_later_start_idx =
                    match path.match_indices(':').nth(1).map(|(idx, _s)| idx) {
                        Some(some) => some,
                        None => {
                            failed_writing = true;
                            log::error!(
                                concat!(
                                    "failed to split suite and test path segments ",
                                    "from CTS path `{}`"
                                ),
                                path
                            );
                            continue;
                        }
                    };
                let slashed = path[..subtest_and_later_start_idx].replace([':', ','], "/");
                cts_tests_dir.child(slashed)
            };
            if !cts_cases_by_spec_file_dir
                .entry(case_dir)
                .or_default()
                .entry(worker_type)
                .or_default()
                .insert(meta)
            {
                log::warn!("duplicate entry {meta:?} detected")
            }
        }

        struct WptEntry<'a> {
            cases: BTreeSet<&'a str>,
            timeout_length: TimeoutLength,
        }
        #[derive(Clone, Copy, Debug)]
        enum TimeoutLength {
            Short,
            Long,
        }
        let split_cases = {
            let mut split_cases = BTreeMap::new();
            fn insert_with_default_name<'a>(
                split_cases: &mut BTreeMap<fs::Child<'a>, WptEntry<'a>>,
                spec_file_dir: fs::Child<'a>,
                cases: BTreeMap<Option<WorkerType>, BTreeSet<&'a str>>,
                timeout_length: TimeoutLength,
            ) {
                for (worker_type, cases) in cases {
                    // TODO: https://bugzilla.mozilla.org/show_bug.cgi?id=1938663
                    if worker_type == Some(WorkerType::Service) {
                        continue;
                    }
                    let file_stem = worker_type.map(|wt| wt.as_str()).unwrap_or("cts");
                    let path = spec_file_dir.child(format!("{file_stem}.https.html"));
                    assert!(split_cases
                        .insert(
                            path,
                            WptEntry {
                                cases,
                                timeout_length
                            }
                        )
                        .is_none());
                }
            }
            {
                let dld_path =
                    &cts_tests_dir.child("webgpu/api/validation/state/device_lost/destroy");
                let (spec_file_dir, cases) = cts_cases_by_spec_file_dir
                    .remove_entry(dld_path)
                    .expect("no `device_lost/destroy` tests found; did they move?");
                insert_with_default_name(
                    &mut split_cases,
                    spec_file_dir,
                    cases,
                    TimeoutLength::Short,
                );
            }
            for (spec_file_dir, cases) in cts_cases_by_spec_file_dir {
                insert_with_default_name(
                    &mut split_cases,
                    spec_file_dir,
                    cases,
                    TimeoutLength::Long,
                );
            }
            split_cases
        };

        for (path, entry) in split_cases {
            let dir = path.parent().expect("no parent found for ");
            match create_dir_all(dir) {
                Ok(()) => log::trace!("made directory {}", dir.display()),
                Err(e) => {
                    failed_writing = true;
                    log::error!("{e:#}");
                    continue;
                }
            }
            let file_contents = {
                let WptEntry {
                    cases,
                    timeout_length,
                } = entry;
                let content = match timeout_length {
                    TimeoutLength::Short => &cts_boilerplate_short_timeout,
                    TimeoutLength::Long => &cts_boilerplate_long_timeout,
                };
                let mut content = content.as_bytes().to_vec();
                for meta in cases {
                    content.extend(meta.as_bytes());
                    content.extend(b"\n");
                }
                content
            };
            match fs::write(&path, &file_contents)
                .wrap_err_with(|| miette!("failed to write output to path {path:?}"))
            {
                Ok(()) => log::debug!("  …wrote {path}"),
                Err(e) => {
                    failed_writing = true;
                    log::error!("{e:#}");
                }
            }
        }
        ensure!(
            !failed_writing,
            "failed to write one or more WPT test files; see above output for more details"
        );
        log::debug!("  …finished writing new WPT test files!");

        log::info!("  …removing {cts_https_html_path}, now that it's been divided up…");
        remove_file(&cts_https_html_path)?;

        log::info!("moving ready-to-go WPT test files into `cts`…");

        let webgpu_dir = out_wpt_dir.child("webgpu");
        let ready_to_go_tests = wax::Glob::new("**/*.{html,{any,sub,worker}.js}")
            .unwrap()
            .walk(&webgpu_dir)
            .map_ok(|entry| webgpu_dir.child(entry.into_path()))
            .collect::<Result<Vec<_>, _>>()
            .map_err(Report::msg)
            .wrap_err_with(|| {
                format!("failed to walk {webgpu_dir} for ready-to-go WPT test files")
            })?;

        log::trace!("  …will move the following: {ready_to_go_tests:#?}");

        for file in ready_to_go_tests {
            let path_relative_to_webgpu_dir = file.strip_prefix(&webgpu_dir).unwrap();
            let dst_path = cts_tests_dir.child(path_relative_to_webgpu_dir);
            log::trace!("…moving {file} to {dst_path}…");
            ensure!(
                !fs::try_exists(&dst_path)?,
                "internal error: duplicate path found while moving ready-to-go test {} to {}",
                file,
                dst_path,
            );
            fs::create_dir_all(dst_path.parent().unwrap()).wrap_err_with(|| {
                format!(
                    concat!(
                        "failed to create destination parent dirs. ",
                        "while recursively moving from {} to {}",
                    ),
                    file, dst_path,
                )
            })?;
            fs::rename(&file, &dst_path)
                .wrap_err_with(|| format!("failed to move {file} to {dst_path}"))?;
        }
        log::debug!("  …finished moving ready-to-go WPT test files");

        Ok(())
    })?;

    gecko_ckt.regen_dir(wpt_tests_dir.join("webgpu"), |wpt_webgpu_tests_dir| {
        log::info!("copying contents of {out_wpt_dir} to {wpt_webgpu_tests_dir}…");
        copy_dir(&out_wpt_dir, wpt_webgpu_tests_dir)
    })?;

    log::info!("All done! Now get your CTS _ON_! :)");

    Ok(())
}
