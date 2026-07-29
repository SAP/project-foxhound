/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef js_loader_ScriptKind_h
#define js_loader_ScriptKind_h

namespace JS::loader {

// A kind of script, used by LoadedScript and its subclasses, and
// ScriptFetchInfo.
enum class ScriptKind : uint8_t {
  // This is a classic script loaded by <script>.
  eClassic,

  // This is a module imported by <script type="module">, import declarations,
  // dynamic import, etc.
  //
  // This does not include JSON modules, CSS modules, and text modules, given
  // they're not represented by LoadedScript, and they don't have
  // ScriptFetchInfo.
  eModule,

  // An event handler script specified as a string.
  //
  // This is only for ScriptFetchInfo, to represent the fetch info associated
  // with the event handler script.
  // LoadedScript instance is not created for this.
  eEvent,

  // This is a import map JSON loaded by <script type="importmap">.
  eImportMap,
};

}  // namespace JS::loader

#endif
