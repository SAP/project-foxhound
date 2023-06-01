<!-- markdownlint-disable blanks-around-headings blanks-around-lists no-duplicate-heading -->

# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

<!-- next-header -->
## [Unreleased] - ReleaseDate
## [0.7.0] - 2022-11-17
### Changed
- [PR#65](https://github.com/rust-minidump/minidump-writer/pull/65) updated `crash-context` to 0.5, which has support for a custom `capture_context` to replace `RtlCaptureContext` on Windows, due to improper bindings and deficiencies, resolving [#63](https://github.com/rust-minidump/minidump-writer/issues/63).
- [PR#65](https://github.com/rust-minidump/minidump-writer/pull/65) replaced _most_ of the custom bindings from [PR#60](https://github.com/rust-minidump/minidump-writer/pull/60) with bindings from either `crash-context` or `winapi`.

## [0.6.0] - 2022-11-15
### Changed
- [PR#60](https://github.com/rust-minidump/minidump-writer/pull/60) removed the dependency on `windows-sys` due the massive version churn, resolving [#58](https://github.com/rust-minidump/minidump-writer/issues/58). This should allow projects to more easily integrate this crate into their project without introducing multiple versions of transitive dependencies.
- [PR#62](https://github.com/rust-minidump/minidump-writer/pull/62) replaced `MDExceptionCodeLinux` with `minidump_common::ExceptionCodeLinux`.
- [PR#64](https://github.com/rust-minidump/minidump-writer/pull/64) updated dependencies.

## [0.5.0] - 2022-10-21
### Changed
- [PR#53](https://github.com/rust-minidump/minidump-writer/pull/53) made the `mem_writer` and `dir_section` modules public. Thanks [@sage-msft](https://github.com/sage-msft)!
- [PR#55](https://github.com/rust-minidump/minidump-writer/pull/55) bumped `nix`, `minidump-common`, `minidump`, `minidump-processor` and `dump_syms`. Thanks
[@sfackler](https://github.com/sfackler)!
- [PR#57](https://github.com/rust-minidump/minidump-writer/pull/57) bumped `windows-sys` to 0.42.

### Removed
- [PR#56](https://github.com/rust-minidump/minidump-writer/pull/56) removed the writing of the [HandleOperationListStream](https://learn.microsoft.com/en-us/windows/win32/api/minidumpapiset/ns-minidumpapiset-minidump_handle_operation_list) stream, as it was essentially untested and was of dubious usefulness.

## [0.4.0] - 2022-07-21
### Changed
- [PR#50](https://github.com/rust-minidump/minidump-writer/pull/50) updated `minidump-common` and `crash-context`.

### Fixed
- [PR#50](https://github.com/rust-minidump/minidump-writer/pull/50) resolved [#33](https://github.com/rust-minidump/minidump-writer/issues/33) by encoding the full exception info in the `exception_information` field of the exception stream.
- [PR#50](https://github.com/rust-minidump/minidump-writer/pull/50) resolved [#34](https://github.com/rust-minidump/minidump-writer/issues/34) by unwrapping `EXC_CRASH` exceptions to retrieve the wrapped exception.

## [0.3.1] - 2022-07-18
### Fixed
- [PR#47](https://github.com/rust-minidump/minidump-writer/pull/47) resolved [#46](https://github.com/rust-minidump/minidump-writer/issues/46) by handling the special case of `dyld`.

## [0.3.0] - 2022-07-15
### Fixed
- [PR#42](https://github.com/rust-minidump/minidump-writer/pull/42) resolved [#41](https://github.com/rust-minidump/minidump-writer/issues/41) by capping the VM read of task memory to avoid a syscall failure, as well as made it so that if an error does occur when reading the module's file path, the module is still written to the minidump, as the file path is less important than the UUID in terms of module identification.
- [PR#44](https://github.com/rust-minidump/minidump-writer/pull/44) resolved [#43](https://github.com/rust-minidump/minidump-writer/issues/43) by correctly calculating the base address of each loaded module. The bug was inherited from Breakpad.
- [PR#44](https://github.com/rust-minidump/minidump-writer/pull/44) and [PR#45](https://github.com/rust-minidump/minidump-writer/pull/45) resolved [#37](https://github.com/rust-minidump/minidump-writer/issues/37) by making the `crash_context::CrashContext` optional on MacOS and Windows, to make creating a minidump without necessarily having an actual crash more convenient for users.

## [0.2.1] - 2022-05-25
### Added
- [PR#32](https://github.com/rust-minidump/minidump-writer/pull/32) resolved [#23](https://github.com/rust-minidump/minidump-writer/issues/23) by adding support for the thread names stream on MacOS.

## [0.2.0] - 2022-05-23
### Added
- [PR#21](https://github.com/rust-minidump/minidump-writer/pull/21) added an initial implementation for `x86_64-apple-darwin` and `aarch64-apple-darwin`

## [0.1.0] - 2022-04-26
### Added
- Initial release, including basic support for `x86_64-unknown-linux-gnu/musl` and `x86_64-pc-windows-msvc`

<!-- next-url -->
[Unreleased]: https://github.com/rust-minidump/minidump-writer/compare/0.7.0...HEAD
[0.7.0]: https://github.com/rust-minidump/minidump-writer/compare/0.6.0...0.7.0
[0.6.0]: https://github.com/rust-minidump/minidump-writer/compare/0.5.0...0.6.0
[0.5.0]: https://github.com/rust-minidump/minidump-writer/compare/0.4.0...0.5.0
[0.4.0]: https://github.com/rust-minidump/minidump-writer/compare/0.3.1...0.4.0
[0.3.1]: https://github.com/rust-minidump/minidump-writer/compare/0.3.0...0.3.1
[0.3.0]: https://github.com/rust-minidump/minidump-writer/compare/0.2.1...0.3.0
[0.2.1]: https://github.com/rust-minidump/minidump-writer/compare/0.2.0...0.2.1
[0.2.0]: https://github.com/rust-minidump/minidump-writer/compare/0.1.0...0.2.0
[0.1.0]: https://github.com/rust-minidump/minidump-writer/releases/tag/0.1.0
