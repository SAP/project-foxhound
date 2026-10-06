# Guidelines for New Contributors

Thank you for your interest in contributing to the Gecko accessibility module.
This document provides some brief, high level guidelines to get you started.

## Local and Remote Accessibility Trees

Accessibility clients communicate with Gecko's parent process, but web content is isolated in its own content processes.
Therefore, in order for accessibility clients to access web content, the accessibility tree from each content process is cached in the parent process.
See the [Architecture](Architecture.md) page for more details.

This means that when writing patches to change what is exposed to accessibility clients, you need to ensure that:

1. The data is included in the cache sent to the parent process.
   This might already be the case if you are modifying an existing property, but it most likely won't be if you are adding something new.
   The cache is built in [`LocalAccessible::BundleFieldsForCache`](https://searchfox.org/firefox-main/rev/dab03896ede1413be148884e054b311767bcf1a0/accessible/generic/LocalAccessible.cpp#3538).
2. An event is fired when the data is changed, if appropriate.
   This is necessary both to update the parent process cache and to notify clients of the change.
   However, not all properties have associated events.
   See [the `EVENT_*` constants in nsIAccessibleEvent](https://searchfox.org/firefox-main/rev/dab03896ede1413be148884e054b311767bcf1a0/accessible/interfaces/nsIAccessibleEvent.idl#31) for the supported events.
3. A cache update is queued when the data is changed, if there is no associated event.
   See [`DocAccessible::QueueCacheUpdate`](https://searchfox.org/firefox-main/rev/dab03896ede1413be148884e054b311767bcf1a0/accessible/generic/DocAccessible.h#114).
4. The data can be queried via both `LocalAccessible` and `RemoteAccessible` methods.

## Tests

Ideally, any change to code in this module should be covered by automated tests.

To run a test directory or file, use the command:

`./mach test accessible/tests/path`

### Browser Tests

Browser tests are located in `accessible/tests/browser`.
This is our preferred test suite, as it supports testing across multiple processes, is supported by our linters, allows for OS specific testing, etc.
Any new tests should be added to this test suite, in the folder which best approximates their behavior.
The one exception is changes related to XUL, as XUL can only run in the parent process.

Test tasks are defined using [`addAccessibleTask`](https://searchfox.org/firefox-main/rev/ad5f057320ecc6b934dfa1e3ec361f87712806cc/accessible/tests/browser/shared-head.js#694).
`addAccessibleTask` can be given a markup snippet (normally HTML) to load.
You also pass it an async test function, which should be named to make debugging easier, though many older tests have unnamed functions.
The same test can then optionally be run in a top level remote document (`{ topLevel: true }`), in the parent process (`{ chrome: true }`), in a remote in-process iframe (`{ iframe: true }`) and an out-of-process iframe (`{ remoteIframe: true }`).
This makes it easy to test both `LocalAccessible` and `RemoteAccessible` using the same code.

Tests in `accessible/tests/browser/atk` and `accessible/tests/browser/windows` exercise OS specific APIs.
Like all browser tests, they are primarily written in JS, but the `runPython` function is used to execute snippets of Python code in a separate process, simulating a real accessibility client.
ATK tests use the pyatspi library to make AT-SPI calls.
Windows tests use the Python ctypes and comtypes libraries to make MSAA, IAccessible2 and UI Automation calls.

Tests in `accessible/tests/browser/telemetry` and `accessible/tests/browser/performance` are non-standard.
Please do not use them as examples for general test writing.
If you believe your work requires a telemetry or performance test, please reach out to :morgan on matrix or bugzilla.

### Mochitests

Mochitests are located in `accessible/tests/mochitest`.
This is an older, legacy test suite which only supports testing `LocalAccessible` in a single process.
However, because of the massive number of tests here, many have not yet been ported to browser tests.
Mochitests are also necessary for testing XUL accessibility.
New tests should not be added in this directory except for those related to XUL.
However, any failures introduced in these tests must still be fixed.

### Crash Tests

There is another suite of tests located in `accessible/tests/crashtests`.
However, this test suite is unreliable and thus legacy.
Because the accessibility module runs asynchronously from DOM, it is difficult to guarantee that any potential crash is hit before the test exits.
New tests should not be added in this directory.

To verify a crash fix, you should instead write a browser test as outlined above.
`addAccessibleTask` explicitly waits until the document's accessibility tree has been built before running the test function.
If the crash was caused by a change to the accessibility tree, you can also wait for a specific accessibility event (or events) to ensure the change has been processed by the accessibility code before the test exits.
