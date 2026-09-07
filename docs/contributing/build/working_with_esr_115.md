# Working with ESR115

Firefox 115 was released in mid-2023 and is going to be supported for some time
for Windows 7 users.

Building it on a modern Linux system (that a lot of Mozilla developer use)
requires working around several toolchain version mismatches. None of the fixes
require patching Firefox source.

Additionally, pushing to try doesn't work out of the box.

This document explains a setup that allows verifying patches locally and pushing
to try, it is Linux only but might work on other OSes.

We'll be working in a separate checkout in this document, since a special
`mozconfig` and `rust-toolchain.toml` files are required.

## Required toolchain versions

| Tool | Required | Reason |
|------|----------|--------|
| Rust | 1.76.0 | Newer versions break bindgen-generated bindings |
| cbindgen | 0.24.3 | 0.29 is too strict: rejects duplicate TOML keys and treats `try` as a reserved keyword |
| libclang | 16 (not 18) | bindgen 0.64 (used by gecko-profiler) generates incomplete bindings with clang 18 |
| Python | <= 3.12 | Python 3.13 removes `cgi`, `pipes` and `pathlib.os` that build tools depend on |

## Setup

If your system Python is 3.13 or later, prefix `./mach` invocations with
`uv run -p 3.12` (or `uv run -p 3.11`).

### 1. Pin the Rust toolchain for the tree

Create `rust-toolchain.toml` at the root of the Firefox 115 checkout:

```toml
[toolchain]
channel = "1.76.0"
```

Install the toolchain if not already present needed:

```sh
rustup toolchain install 1.76.0
```

### 2. mozconfig

```
ac_add_options --enable-bootstrap
```

`--enable-bootstrap` downloads compatible `cbindgen` and `libclang` from the
Taskcluster toolchain index into `~/.mozbuild/` automatically.

## Cross-compiling for Windows (from Linux)

This is useful for backporting patches to Windows 7 without needing a Windows
machine. The build system supports cross-compiling with `clang-cl` (MSVC ABI,
Tier-1).

### 1. Install required tools

```sh
sudo apt install msitools
rustup target add x86_64-pc-windows-msvc
```

`msitools` provides `msiextract`, which is required to unpack the Windows SDK
`.msi` packages during the bootstrap step.

### 2. mozconfig for Windows cross-compile

Use a separate `mozconfig` (e.g. `mozconfig.win64`) or replace the Linux one
when working on a Windows-only issue:

```
ac_add_options --target=x86_64-pc-windows-msvc
ac_add_options --enable-bootstrap
```

`--enable-bootstrap` downloads the Visual Studio sysroot (headers, libs,
Windows SDK) from the Taskcluster toolchain index into `~/.mozbuild/` and
selects `clang-cl` and `lld-link` automatically. No manual SDK installation
is needed.

## Pushing to try

From a regular checkout (from <https://github.com/mozilla-firefox/firefox>),
`esr115` can be checked out like so:

```
git checkout esr115
```

and will track upstream when pulled.

To push to try, it is required to have `git-cinnabar` in path (that `./mach
vcs-setup` can install), and to run:

```
git -c cinnabar.graft=https://github.com/mozilla-firefox/firefox fetch hg::https://hg.mozilla.org/mozilla-unified
```

`./mach try fuzzy` will then produce some warnings, but work (it is expected
that it takes some time). The push go via SSH, so a level 1 account is
necessary.
