/* -*- Mode: IDL; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * The origin of this IDL file is
 * https://html.spec.whatwg.org/multipage/semantics.html#htmlhyperlinkelementutils
 * © Copyright 2004-2011 Apple Computer, Inc., Mozilla Foundation, and
 * Opera Software ASA. You are granted a license to use, reproduce
 * and create derivative works of this document.
 */

interface mixin HTMLHyperlinkElementUtils {
  [CEReactions, SetterThrows]
  stringifier attribute UTF8String href;

  readonly attribute UTF8String origin;
  [CEReactions]
           attribute UTF8String protocol;
  [CEReactions]
           attribute UTF8String username;
  [CEReactions]
           attribute UTF8String password;
  [CEReactions]
           attribute UTF8String host;
  [CEReactions]
           attribute UTF8String hostname;
  [CEReactions]
           attribute UTF8String port;
  [CEReactions]
           attribute UTF8String pathname;
  [CEReactions]
           attribute UTF8String search;
  [CEReactions]
           attribute UTF8String hash;
};
