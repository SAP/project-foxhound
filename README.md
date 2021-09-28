# Project "Foxhound"

This is the repository for project "Foxhound", a Firefox fork capable of tracking taint flows through the browser.

Taint tracking makes it possible to automatically detect client-side cross-site-scripting flaws in websites by marking certain attacker-controlled strings (e.g. `location.hash`) as tainted and notifying the user when tainted data reaches a set of predefined sinks (e.g. `eval()`, `.innerHTML()`, ...).

## Usage

If an insecure data flow is discovered by the browser, it will output a warning message to the JavaScript console and trigger the ```__taintreport``` event.
To get more information about the discovered data flow, you can add an event listener like this:
```JavaScript
function handleTaintReport(report) {
  console.log(report.detail);                                                                                                                        }
}

window.addEventListener("__taintreport", handleTaintReport);
```
This functionality can be expanded in a web extension in order to alert the user or to export findings for reporting.

More information on the sources and sinks which are instrumented as part of the code can be found [here](taint).

## Building
The "Foxhound" browser can be built mostly by following instructions on how to build [Firefox](https://firefox-source-docs.mozilla.org/setup/), for either [Linux](https://firefox-source-docs.mozilla.org/setup/linux_build.html) or [Windows](https://firefox-source-docs.mozilla.org/setup/windows_build.html). In theory [Mac](https://firefox-source-docs.mozilla.org/setup/macos_build.html) builds are also possible, but this has not been tested!

Choose the appropriate mozconfig by copying "taintfox_mozconfig\_[mac|win|ubuntu]" to ".mozconfig".
```bash
cp taintfox_mozconfig .mozconfig
./mach build
```

After installing setting up the build environment, the default build settings should now work fine:

```bash
./mach build
```
If you need an windows installer follow up with
```bash
./mach build installer
```
The installer can then be found under "obj-tf-release\dist\install\sea\".

If you need a OSX DMG package follow up with
```bash
./mach package
```
To run the browser, use:
```
./mach run
```

### Docker Containers
Instructions for building and running project "Foxhound" inside a docker container (useful for getting dependencies right) can be found in the [dockerfiles](dockerfiles) folder.

## Internals

The main classes used to represent taint information are located in [taint](taint). These are used by both Spidermonkey (the JavaScript engine)
and Gecko (the rest of the browser). There is a detailed description of all taint related data structures in [taint/Taint.h](taint/Taint.h).

The StringTaint class represents taint information for string-like objects and is embedded into JavaScript strings (JSString), XPCOM strings
(in xpcom/string) and various helper classes (StringBuffer, etc.). Methods that modify or convert strings in some way are modified to
correctly handle taint information.

The JavaScript public API (jsapi.h) has been extended to support access to taint information for JavaScript strings. The API also provides
JS_ReportTaintSink which takes care of reporting a flow of tainted data into a predefined sink. In this case a message will be written to
stdout and a custom JavaScript Event will be triggered that can then be processed by a Firefox extension.

All code related to taint tracking has been marked with a `// TaintFox` comment, making it easy to search for modifications in the source code.
Finding the `location.hash` taint source becomes as easy as `git grep -n TaintFox | grep location.hash`.

Taint information is available in JavaScript via the `.taint` property of string instances:

```JavaScript
var a = taint("abc");
var b = "def";
var c = a.toUpperCase() + b;
print(JSON.stringify(c.taint));
// [{begin:0, end:3, flow:[{operation:"toUpperCase", arguments:[]}, {operation:"Manual taint source", arguments:["abc"]}]}]
```

## Tests

The test suite can be run as follows, assuming a release build is available:

```bash
cd js/src
./tests/jstests.py ../../obj-tf-release/dist/bin/js taint/
```
