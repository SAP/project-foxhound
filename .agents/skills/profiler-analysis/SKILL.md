---
name: profiler-analysis
description: Analyze Firefox performance profiles using the profiler-cli CLI tool. Trigger when given a profiler.firefox.com or share.firefox.dev link, a local profile path, or when the user wants to investigate an issue in a Firefox profile. Always use this skill instead of WebFetch for Firefox profiler URLs; WebFetch only retrieves the profiler UI's HTML shell and cannot access profile data, whereas profiler-cli downloads and parses the actual profile into a local daemon that supports structured queries over stacks, markers, threads, and samples.
argument-hint: "[profile path or URL]"
allowed-tools:
  - Bash(profiler-cli:*)
  - Bash(searchfox-cli:*)
  - Bash(jq:*)
  - Read
  - Grep
  - Glob
---

You are helping a Mozilla Firefox engineer analyze a Firefox performance profile using the `profiler-cli` CLI tool. The user works on Firefox and has familiarity with the browser's internals, so you can use Firefox-specific terminology freely (e.g. Gecko, SpiderMonkey, Necko, content/parent process split, PBackground, etc.) without explaining it.

# How to Help the User

When invoked:
1. Run `profiler-cli guide` first and read the **entire** output. It is approximately 400 lines. The Bash tool may silently truncate long output, causing you to miss the command reference and analysis patterns that appear later in the guide, so read all of it before proceeding.
2. If `$ARGUMENTS` contains a profile path or URL, load it with `profiler-cli load`.
3. Walk through the analysis interactively. Run commands and interpret the output.
4. Suggest next steps based on what the output reveals.
5. When output is large or complex, highlight the most actionable findings.

If the URL is a `profiler.firefox.com/from-file/...` or `profiler.firefox.com/from-browser/...` link, stop and tell the user it cannot be loaded. These URLs store the profile data locally in the browser tab and are not accessible to anyone else. Ask the user to either upload the profile using the share button in the Firefox Profiler UI (which produces a `share.firefox.dev` or `profiler.firefox.com/public/...` link), or pass a local file path to the profile JSON directly.

Do not print commands for the user to run, execute them and interpret the results.

If `profiler-cli` is not available, stop and tell the user to install it (`npm install -g @firefox-devtools/profiler-cli@latest`) and restart the agent.

Before giving the user a result or summary, always run `profiler-cli stop` to shut down the background daemon process (it persists beyond individual commands and must be explicitly stopped to free the port and memory), then present the findings.

# Case Studies

The `references/` directory in this skill contains real profiling investigations. Each scenario has two files:

- **Narrative file** (e.g. `macos-extensions-hang-infinite-recursion.md`): first-person walkthrough explaining the reasoning and what was found.
- **profiler-cli companion file** (e.g. `macos-extensions-hang-infinite-recursion-cli.md`): step-by-step `profiler-cli` commands with real output and annotations. These are the most useful for calibrating your approach.

Before starting an analysis, use `Glob` to list available case studies, then read the `-cli.md` file that most closely matches the current scenario:

- **Lock contention / mutex blocking during startup**: `firefox-macos-startup-font-initialization-cli.md`
- **Hang or jank (extension JS spinning at 100% CPU)**: `macos-extensions-hang-infinite-recursion-cli.md`
- **Hang or jank getting worse over time, IPC I/O thread blocked, long IPCIn marker durations**: `macos-ipc-blob-url-accumulation-cli.md`
- **Android startup performance**: `simpleperf-non-rooted-firefox-startup-cli.md`
- **Android / simpleperf profiles**: `simpleperf-non-rooted-fenix-sync-history-fetch-cli.md`
- **Resource usage (CPU/memory over time)**: `resource-usage-linux-fat-aar-build-cli.md`
- **Network or I/O issues**: `macos-network-pr-bad-descriptor-error-cli.md`
- **NSS/TLS deadlock freezing networking**: `macos-network-nss-doh-deadlock-cli.md`
- **Broken stack walking**: `windows-broken-stackwalk-jpeg-avx2-cli.md`

If the scenario is unclear, read `firefox-macos-startup-font-initialization-cli.md` as a general-purpose baseline.

The list above is for calibration only. The actual problem may be novel or not covered by any case study. Use the examples to understand the investigation approach, not to constrain what you look for.
