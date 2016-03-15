# Taintfox -- a taint-aware Firefox

You have found Taintfox, a modified Firefox capable of tracking taint information as data flows through the browser.

Taint-tracking makes it possible to automatically detect DOM XSS bugs in websites by marking certain attacker-controlled
strings (e.g. `location.hash`) as tainted and reporting once tainted data reaches a set of predefined
sinks (e.g. `eval()`, `.innerHTML()`, ...).


## Usage

Browse websites as usual and check stdout for tainted flows. Alternatively install an extension to report flows.


## Building

The default build settings should work fine:

```bash
./mach build
```

For recommended build settings take a look at taintfox_mozconfig:
```bash
cp taintfox_mozconfig .mozconfig
./mach build
```


## Internals

The main classes used to represent taint information are located in taint/. These are used by both Spidermonkey (the JavaScript engine)
and Gecko (the rest of the browser). There is a detailed description of all taint related data structures in taint/Taint.h.

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
