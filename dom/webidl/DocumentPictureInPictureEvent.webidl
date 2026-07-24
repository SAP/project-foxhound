/* -*- Mode: IDL; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * The origin of this IDL file is
 * https://wicg.github.io/document-picture-in-picture/#api
 */

[Exposed=(Window), SecureContext, Pref="dom.documentpip.enabled"]
interface DocumentPictureInPictureEvent : Event {
  constructor(DOMString type, DocumentPictureInPictureEventInit eventInitDict);
  [SameObject] readonly attribute Window window;
};

dictionary DocumentPictureInPictureEventInit : EventInit {
  required Window window;
};
