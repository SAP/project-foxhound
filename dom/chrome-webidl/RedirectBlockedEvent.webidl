/* -*- Mode: IDL; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

interface URI;

[ChromeOnly, Exposed=Window]
interface RedirectBlockedEvent : Event
{
  constructor(DOMString type,
              optional RedirectBlockedEventInit eventInitDict = {});

  readonly attribute Window? requestingWindow;
  readonly attribute URI? redirectURI;
};

dictionary RedirectBlockedEventInit : EventInit
{
  Window? requestingWindow = null;
  URI? redirectURI = null;
};
