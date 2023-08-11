# Project "Foxhound"

This is the repository for project "Foxhound", a Firefox fork capable of tracking taint flows through the browser.

Taint tracking makes it possible to automatically detect client-side cross-site-scripting flaws in websites by marking certain attacker-controlled strings (e.g. `location.hash`) as tainted and notifying the user when tainted data reaches a set of predefined sinks (e.g. `eval()`, `.innerHTML()`, ...).

## Usage

If an insecure data flow is discovered by the browser, it will output a warning message to the JavaScript console and trigger the ```__taintreport``` event.
To get more information about the discovered data flow, you can add an event listener like this:
```JavaScript
function handleTaintReport(report) {
  console.log(report.detail);
}

window.addEventListener("__taintreport", handleTaintReport);
```
This functionality can be expanded in a web extension in order to alert the user or to export findings for reporting.

More information on the sources and sinks which are instrumented as part of the code can be found [here](taint).

## Building
The "Foxhound" browser can be built mostly by following instructions on how to build [Firefox](https://firefox-source-docs.mozilla.org/setup/), for either [Linux](https://firefox-source-docs.mozilla.org/setup/linux_build.html) or [Windows](https://firefox-source-docs.mozilla.org/setup/windows_build.html). In theory [Mac](https://firefox-source-docs.mozilla.org/setup/macos_build.html) builds are also possible, but this has not been tested!

### Bootstrapping
First, you need to install the toolchains (compilers etc.) required to build project "Foxhound". Luckily, these are provided by Mozilla, so there is no need to install them by hand.
If you are feeling lucky, just install the toolchains via the bootstrap command:

```
./mach  --no-interactive bootstrap --application-choice=browser
```

Unfortunately, the toolchains are only available for certain versions of Firefox, computed via a hash over various files in the source tree.
The above command might fail with a message about toolschains not being found. If this is the case, try checking out the release branch first:

```
git checkout firefox-release
./mach  --no-interactive bootstrap --application-choice=browser
```

There are also sometimes issues that the rust compiler version downloaded by bootstrap is too new and causes compiler errors or crashes.
If you need to downgrade rust, try this:

```
${HOME}/.cargo/bin/rustup install 1.66
${HOME}/.cargo/bin/rustup default 1.66
${HOME}/.cargo/bin/rustup override set 1.66
```

To install version ```1.66``` of the rust compiler. You need to start a new shell for the changes to take effect.

## Compiling


Choose the appropriate mozconfig by copying "taintfox_mozconfig\_[mac|win|ubuntu]" to ".mozconfig".
```bash
cp taintfox_mozconfig .mozconfig
```

And start the build like this:
```bash
./mach build
```
If you need an windows installer follow up with
```bash
./mach build installer
```
The installer can then be found under "obj-tf-release\dist\install\sea\".

If you need an ubuntu zip package follow up with
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

## Citations

If you would like to use project Foxhound in your own research, please cite our EuroS&P paper where we describe the browser:

```bibtex
@inproceedings{KleBarBen+22,
  author = {David Klein and Thomas Barber and Souphiane Bensalim and Ben Stock and Martin Johns},
  title = {Hand Sanitizers in the Wild: A Large-scale Study of Custom JavaScript Sanitizer Functions},
  booktitle = {Proc. of the IEEE European Symposium on Security and Privacy},
  year = {2022},
  month = jun,
}
```

If you think your work would also be useful for the wider research community, feel free to open a Pull Request with your changes!