# New-to-Necko Resources - An Aggregation

This doc serves as a hub for resources/technologies a new-to-necko developer
should get familiar with.

## Code Generation and IPC

- [IPC] (Inter-Process Communication) and [IPDL] (Inter-Thread and Inter-Process Message Passing)
- [IDL] (Interface Description Language)
  : - Implementing an interface (C++/JS)
    - XPCONNECT (scriptable/builtin)
    - QueryInterface (QI) - do_QueryInterface/do_QueryObject
    - do_GetService, do_CreateInstance
- [WebIDL]

## Necko interfaces

- {searchfox}`nsISupports <xpcom/base/nsISupports.idl>`
- {searchfox}`nsIRequest <netwerk/base/nsIRequest.idl>` ->
  {searchfox}`nsIChannel <netwerk/base/nsIChannel.idl>` ->
  {searchfox}`nsIHttpChannel <netwerk/protocol/http/nsIHttpChannel.idl>`
- {searchfox}`nsIRequestObserver <netwerk/base/nsIRequestObserver.idl>` (onStart/onStopRequest)
- {searchfox}`nsIStreamListener <netwerk/base/nsIStreamListener.idl>` (onDataAvailable)
- {searchfox}`nsIInputStream <xpcom/io/nsIInputStream.idl>`/
  {searchfox}`nsIOutputStream <xpcom/io/nsIOutputStream.idl>`

## Libraries

- [NSPR]
- [NSS]
- [PSM]

## Preferences

- {searchfox}`all.js <modules/libpref/init/all.js>`
- {searchfox}`firefox.js <browser/app/profile/firefox.js>`
- {searchfox}`StaticPrefList.yaml <modules/libpref/init/StaticPrefList.yaml>`

## Debugging

- [HTTP Logging]

## Testing

- [xpcshell]
- [mochitest]
- [web-platform]
- [gtest]
- [marionette]

## See also

> - [E10S] (Electrolysis) -> Split `HttpChannel` into: `HttpChannelChild` & `HttpChannelParent`
> - [Fission] -> Site isolation

[e10s]: https://wiki.mozilla.org/Electrolysis
[fission]: https://hacks.mozilla.org/2021/05/introducing-firefox-new-site-isolation-security-architecture/
[gtest]: /gtest/index.html
[http logging]: /networking/http/logging.html
[idl]: /xpcom/xpidl.html
[ipc]: /ipc/index.html
[ipdl]: /ipc/ipdl.html
[marionette]: /testing/marionette/index.html
[mochitest]: /testing/mochitest-plain/index.html
[nspr]: https://firefox-source-docs.mozilla.org/nspr/about_nspr.html?highlight=nspr
[nss]: https://firefox-source-docs.mozilla.org/security/nss/legacy/faq/index.html
[psm]: https://firefox-source-docs.mozilla.org/security/nss/legacy/faq/index.html?highlight=psm
[web-platform]: /web-platform/index.html
[webidl]: /toolkit/components/extensions/webextensions/webidl_bindings.html
[xpcshell]: /testing/xpcshell/index.html
