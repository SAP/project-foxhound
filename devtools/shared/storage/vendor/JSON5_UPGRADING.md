[//]: # (
  This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
)

# Upgrading json5

JSON5 source is at https://github.com/json5/json5 but without builds.
Published builds are available at https://www.npmjs.com/package/json5

The latest tarball can be found at https://registry.npmjs.org/json5/latest

Note: the tarball includes index.js (a classic UMD JS file including polyfills)
and index.mjs. Use the latter instead to avoid unnecessary bloat.

## Instructions

```bash
$ cd devtools/shared/storage/vendor/
$ wget https://registry.npmjs.org/json5/-/json5-2.2.3.tgz
$ tar xzvf json5-2.2.3.tgz --strip-components 2 package/dist/index.mjs
$ mv index.mjs json5.mjs
$ rm json5-2.2.3.tgz
```

## Update the version:

The current version is 2.2.3. Update this version number everywhere in this file.
