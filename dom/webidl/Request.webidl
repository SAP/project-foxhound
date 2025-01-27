/* -*- Mode: IDL; tab-width: 1; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * The origin of this IDL file is
 * https://fetch.spec.whatwg.org/#request-class
 */

typedef (Request or UTF8String) RequestInfo;
typedef unsigned long nsContentPolicyType;

[Exposed=(Window,Worker)]
interface Request {
  /**
   * Note that Requests created from system principal (ie "privileged"/chrome)
   * code will default to omitting credentials. You can override this behaviour
   * using the ``credentials`` member on the ``init`` dictionary.
   */
  [Throws]
  constructor(RequestInfo input, optional RequestInit init = {});

  readonly attribute ByteString method;
  readonly attribute UTF8String url;
  [SameObject, BinaryName="headers_"] readonly attribute Headers headers;

  readonly attribute RequestDestination destination;
  readonly attribute UTF8String referrer;
  [BinaryName="referrerPolicy_"]
  readonly attribute ReferrerPolicy referrerPolicy;
  readonly attribute RequestMode mode;
  readonly attribute RequestCredentials credentials;
  readonly attribute RequestCache cache;
  readonly attribute RequestRedirect redirect;
  readonly attribute DOMString integrity;

  [Pref="dom.fetchKeepalive.enabled"]
  readonly attribute boolean keepalive;

  // If a main-thread fetch() promise rejects, the error passed will be a
  // nsresult code.
  [ChromeOnly]
  readonly attribute boolean mozErrors;

  [BinaryName="getOrCreateSignal"]
  readonly attribute AbortSignal signal;

  [Throws,
   NewObject] Request clone();

  // Bug 1124638 - Allow chrome callers to set the context.
  [ChromeOnly]
  undefined overrideContentPolicyType(nsContentPolicyType context);
};
Request includes Body;

// <https://fetch.spec.whatwg.org/#requestinit>.
dictionary RequestInit {
  ByteString method;
  HeadersInit headers;
  BodyInit? body;
  UTF8String referrer;
  ReferrerPolicy referrerPolicy;
  RequestMode mode;
  /**
   * If not set, defaults to "same-origin", except for system principal (chrome)
   * requests where the default is "omit".
   */
  RequestCredentials credentials;
  RequestCache cache;
  RequestRedirect redirect;
  DOMString integrity;

  [Pref="dom.fetchKeepalive.enabled"]
  boolean keepalive;

  [ChromeOnly]
  boolean mozErrors;

  AbortSignal? signal;

  [Pref="network.fetchpriority.enabled"]
  RequestPriority priority;

  [Pref="dom.fetchObserver.enabled"]
  ObserverCallback observe;
};

enum RequestDestination {
  "",
  "audio", "audioworklet", "document", "embed", "font", "frame", "iframe",
  "image", "manifest", "object", "paintworklet", "report", "script",
  "sharedworker", "style",  "track", "video", "worker", "xslt"
};

enum RequestMode { "same-origin", "no-cors", "cors", "navigate" };
enum RequestCredentials { "omit", "same-origin", "include" };
enum RequestCache { "default", "no-store", "reload", "no-cache", "force-cache", "only-if-cached" };
enum RequestRedirect { "follow", "error", "manual" };
enum RequestPriority { "high" , "low" , "auto" };
