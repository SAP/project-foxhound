/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

// Various non-exposed dictionaries that we need for web compatibility
// interventions.

dictionary CkEditorVersion {
  required DOMString version;
};

dictionary ZE_Init {};

[GenerateInit]
dictionary CkEditorProperty {
  CkEditorVersion CKEDITOR;
  CkEditorVersion JEDITOR;
  ZE_Init ZE_Init;
};
