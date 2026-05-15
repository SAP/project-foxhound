/* -*- Mode: IDL; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * The origin of this IDL file is
 * https://wicg.github.io/document-picture-in-picture/#api
 */

[Exposed=(Window), SecureContext, Pref="dom.documentpip.enabled"]
interface DocumentPictureInPicture : EventTarget {
  [NewObject] Promise<Window> requestWindow(
    optional DocumentPictureInPictureOptions options = {});
  readonly attribute Window? window;
  attribute EventHandler onenter;
};

dictionary DocumentPictureInPictureOptions {
  [EnforceRange] unsigned long long width = 0;
  [EnforceRange] unsigned long long height = 0;
  boolean disallowReturnToOpener = false;
  boolean preferInitialWindowPlacement = false;
};
