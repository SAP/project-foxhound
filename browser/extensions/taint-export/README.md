# Taint Export Extension

This extension automatically exports taint flows discovered by Foxhound to an external server.

## Background

### Built-in Extension Architecture

This extension is a **built-in Firefox extension**, meaning it's bundled with the browser itself rather than being installed separately. For a built-in extension to load properly in Firefox, it requires specific build system configuration:

#### Required Files

1. **manifest.json** - Standard WebExtension manifest defining the extension metadata, permissions, and content scripts
2. **taint-export.js** - The content script that listens for `__taintreport` events and exports them
3. **moz.build** - Mozilla build system configuration that specifies which files to package
4. **jar.mn** - JAR manifest that maps extension files into the browser's built-in addons directory

#### Why jar.mn is Critical

The `jar.mn` file is **essential** for the extension to load at runtime. Without it, the extension files are built but never registered with Firefox's extension system. Here's the loading chain:

1. During build, `jar.mn` tells the build system to package the extension files into `browser.jar` under the `builtin-addons/taint-exporter@sap.com/` directory
2. The `gen_built_in_addons.py` script scans `builtin-addons/*/manifest.json` files
3. Found extensions are registered in `built_in_addons.json`
4. At Firefox startup, `XPIProvider.sys.mjs` reads `built_in_addons.json` and loads the registered extensions

**Without jar.mn**: The extension compiles but is never added to `built_in_addons.json`, so Firefox never loads it.

#### Historical Note

This extension was initially missing the `jar.mn` file, which caused it to build successfully but fail to execute at runtime. The issue was identified when:
- The extension appeared in the build output at `obj-tf-release/dist/bin/browser/features/taint-exporter@sap.com/`
- But didn't show up in `about:debugging` or execute its content scripts
- Console logs never appeared despite the extension being configured properly

Adding the `jar.mn` file fixed this by properly registering the extension with Firefox's built-in extension loader.

## Configuration

To activate the extension, set the following preference (in about:config):

```
tainting.export.url
```

to a String containing the URL where your export server is listening. If an empty string is provided (default), then no request will be sent.

For each taint flow detected by Foxhound, a POST request will be sent to the server containing a JSON-formatted version of the taint flow.

## Developer

The extension injects a content script [taint-export.js](./taint-export.js) into each webpage, which adds an Event listener for the ```__taintreport``` event. When the event is fired, the script checks the preference and sends the taint information via a ```fetch``` request.

The preference containing the URL is accessed via the ```browser.tainting.getTaintExportUrl()``` extension API, which can be found under ```toolkit/components/extensions/ext-toolkit.json```. We need a built-in extension API as the experimental APIs for individual extensions (e.g. screenshots) are not available to content scripts.

To debug this extension, navigate to: about:debugging#/runtime/this-firefox in Foxhound, it should show up.

More information on browser extension APIs can be found here: https://firefox-source-docs.mozilla.org/toolkit/components/extensions/webextensions/basics.html