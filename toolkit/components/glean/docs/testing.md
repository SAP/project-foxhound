# Testing

Given the multiple API languages, processes, and dependencies,
testing FOG is a matter of choosing the right tool for the situation.

## Logging

An often-overlooked first line of testing is "what do the logs say?".
To turn on logging for FOG, use any of the following:
* Run Firefox with `RUST_LOG="fog_control,fog,glean_core"`.
    * On some platforms this will use terminal colours to indicate log level.
* Run Firefox with `MOZ_LOG="timestamp,glean::*:5,fog::*:5,fog_control::*:5,glean_core::*:5"`.
* Set the following prefs:
    * `logging.config.timestamp` to `true`
    * `logging.fog_control::*` to `5`
    * `logging.fog::*` to `5`
    * `logging.glean_core::*` to `5`

For more information on logging in Firefox Desktop, see the
[Gecko Logging docs](https://developer.mozilla.org/docs/Mozilla/Developer_guide/Gecko_Logging).

## `about:glean`

`about:glean` is a page in a running Firefox that allows you to
[debug the Glean SDK](https://mozilla.github.io/glean/book/user/debugging/index.html)
in Firefox Desktop.
It does this through the displayed user interface (just follow the instructions).

## Rust

Not all of our Rust code can be tested in a single fashion, unfortunately.

### Using `rusttests`

If the crate you're testing has no Gecko symbols you can write standard
[Rust tests](https://doc.rust-lang.org/book/ch11-01-writing-tests.html).

This supports both unit tests
(inline in the file under test) and integration tests
(in the `tests/` folder in the crate root).
Metric type tests are currently written as unit tests inline in the file,
as they require access to the metric ID, which should only be exposed in tests.

To run FOG's `rusttests` suite use `mach rusttests`

If the crate uses only a few Gecko symbols, they may use the
`with_gecko` feature to conditionally use them.
This allows the crate to test its non-Gecko-adjacent code using Rust tests.
(You will need to cover the Gecko-adjacent code via another means.)

### Using `gtest`

Because Gecko symbols aren't built for the
`rusttests` build,
any test that is written for code that uses Gecko symbols should be written as a
[`gtest`](https://github.com/google/googletest)
in `toolkit/components/glean/gtest/`.
You can write the actual test code in Rust.
It needs to be accompanied by a C++ GTest that calls a C FFI-exported Rust function.
See [Testing & Debugging Rust Code](/testing-rust-code/) for more.
See [`toolkit/components/glean/gtest/TestFog.cpp`](https://searchfox.org/mozilla-central/source/toolkit/components/glean/gtest/TestFog.cpp)
and [`toolkit/components/glean/gtest/test.rs`](https://searchfox.org/mozilla-central/source/toolkit/components/glean/gtest/test.rs)
for an example.

By necessity these can only be integration tests against the compiled crate.

**Note:** When adding a new test file, don't forget to add it to
`toolkit/components/glean/gtest/moz.build` and use the
`FOG` prefix in your test names
(e.g. `TEST(FOG, YourTestName) { ... }`).

To run FOG's Rust `gtest` suite use `mach gtest FOG.*`

## Python

The [Glean Parser](https://github.com/mozilla/glean_parser/)
has been augmented to generate FOG-specific APIs for Glean metrics.
This augmentation is tested by running:

`mach test toolkit/components/glean/pytest`

These tests require Python 3+.
If your default Python is Python 2, you may need to instead run:

`mach python-test --python 3 toolkit/components/glean/pytest`

## C++

To test the C++ parts of FOG's implementation
(like metric types)
you should use `gtest`.
FOG's `gtest` tests are in
[`gtest/`](https://hg.mozilla.org/mozilla-central/file/tip/toolkit/components/glean/gtest/).

You can either add a test case to an existing file or add a new file.
If you add a new file, remember to add it to the
[`moz.build`](https://hg.mozilla.org/mozilla-central/file/tip/toolkit/components/glean/gtest/moz.build))
or the test runner won't be able to find it.

All tests should start with `FOG` so that all tests are run with
`./mach gtest FOG*`.

## JS

To test the JS parts of FOG's implementation
(like metric types)
you should use `xpcshell`.
FOG's `xpcshell` tests are in
[`xpcshell/`](https://hg.mozilla.org/mozilla-central/file/tip/toolkit/components/glean/xpcshell).

You can either add a test case to an existing file or add a new file.
If you add a new file, remember to add it to the
[`xpcshell.ini`](https://hg.mozilla.org/mozilla-central/file/tip/toolkit/components/glean/xpcshell/xpcshell.ini)
or the test runner will not be able to find it.
