# Internal Taint Implementation

See Taint.h for a detailed description of the internal taint classes and their usage.

## Sources and Sinks

### Sources

    grep -ir --exclude-dir=obj-* MarkTaintSource

In dom/base/nsLocation.cpp
* location.hash
* location.host
* location.hostname
* location.href
* location.origin
* location.pathname
* location.search

In dom/base/nsINode.cpp
* document.baseURI

In dom/base/nsDocument.cpp
* document.referrer
* document.documentURI
* document.cookie

In dom/base/nsGlobalWindow.cpp
* window.name

In dom/html/HTMLScriptElement.cpp
* script.innerHTML

#### Partial taint flows
The following sinks are partial taint flows, which although not exploitable alone,
could be combined with other vulnerabilities. For example, the XHR response can
be exploited as part of a stored XSS attack.

In dom/xhr/XMLHttpRequestMainThread.cpp
* XMLHttpRequest.response

In dom/websocket/WebSocket.cpp
* WebSocket.MessageEvent.data (for a String payload)

In dom/base/PostMessageEvent.cpp
* window.postMessage

#### DOM Elements
HTML Input elements are a user-controlled input and could be used to inject
code into the DOM. Not sure if this can be exploited remotely though.

In dom/html/HTMLInputElement.cpp
* input.value for input elements (e.g. text box)

##### NB: the below elements have been disabled for now. They are only potentially dangerous
if an attacker has controlled the DOM.

In dom/html/nsGenericHTMLElement.cpp
* ~~element.getAttribute~~

In dom/base/Element.h
* ~~element.getAttribute~~

In dom/base/Element.cpp
* ~~element.getAttribute~~
* ~~element.getAttributeNS~~
* ~~element.innerHTML~~
* ~~element.outerHTML~~

#### Local and Sesssion Storage
The window.localStorage.getItem and window.sesssionStorage.getItem can be
vulnerable to stored DOM XSS attacks. The implementation is in three different
places depending on which type of storage is being used:

* dom/storage/SessionStorage.cpp
* dom/storage/LocalStorage.cpp
* dom/storage/PartitionedLocalStorage.cpp
* localstorage/LSObject.cpp

The LSObject.cpp is "next generation" storage, and can be switched on by
going to [](about:config) and looking for the ```dom.storage.next_gen``` option.

TODO: intercept the local storage call and add the taint information to storage
as well (e.g. via JSON?)

#### WebIDL Sources
It is now possible to add taint sources to WebIDL getters by adding the TaintSource attribute.
See dom/webidl/Screen.webidl for an example.

### Sinks

    grep -ir --exclude-dir=obj-* ReportTaintSink

In dom/base/Element.cpp
* Event handler
* outerHTML

In dom/base/FragmentOrElement.cpp
* innerHTML

In dom/base/Location.cpp
* location.hash
* location.host
* location.hostname
* location.href
* location.pathname
* location.port
* location.protocol
* location.search
* location.assign

In dom/html/nsHTMLDocument.cpp
* document.cookie
* document.write

In dom/base/nsGlobalWindow.cpp
* setInterval
* setTimeout

In dom/html/HTMLScriptElement.cpp
* script.innerHTML
* script.text
* script.src

In dom/html/HTMLImageElement.cpp
* img.src
* img.srcset

In dom/html/HTMLIFrameElement.cpp
* iframe.src

In dom/html/HTMLEmbedElement.cpp
* embed.src

In dom/html/HTMLAreaElement.cpp
* area.href

In dom/html/HTMLObjectElement.cpp
* object.data

In dom/html/HTMLTrackElement.cpp
* track.src

In dom/html/HTMLAnchorElement.cpp
* a.href

In js/src/builtin/Eval.cpp
* eval

In js/src/jsfun.cpp
* Function.ctr

#### Partial taint flows
The following sinks are partial taint flows, which although not exploitable alone,
could be combined with other vulnerabilities.

In dom/xhr/XMLHttpRequestMainThread.cpp
* XMLHttpRequest.open(url)
* XMLHttpRequest.open(username)
* XMLHttpRequest.open(password)
* XMLHttpRequest.send
* XMLHttpRequest.setRequestHeader(value)
* XMLHttpRequest.setRequestHeader(name)


In dom/websocket/WebSocket.cpp
* WebSocket.send (for a String payload)

In dom/events/MessageEvent.cpp
* window.MessageEvent

#### Local and Session Storage
The window.localStorage.setItem is a potential sink. As with sources,
the implementation is in three different places depending on which type of
storage is being used:

* dom/storage/LocalStorage.cpp
* dom/storage/PartitionedLocalStorage.cpp
* localstorage/LSObject.cpp
* dom/storage/SessionStorage.cpp

## Modified string classes

This is a hopefully complete list of all the different string classes that where patched throughout the engine.

Spidermonkey

* JSString and all its subclasses (js/src/vm/String.h)
    - Inherit from TaintableString
* StringBuffer (js/src/vm/StringBuffer.h)
    - Inherits from TaintableString
* shadow::String (js/src/jsfriendapi.h)

XPCOM

* nsAString and nsACString (xpcom/string/nsTSubstring.h)
    - Inherits from TaintableString
* nsStringBuffer (xpcom/string/nsStringBuffer.h)
    - Inherits from TaintableString
* nsFakeStringBuffer (xpcom/ds/nsStaticAtom.h)
* nsTSubstringTuple (xpcom/string/nsTSubstringTuple.h)
    - Just added taint() to compute the combined taint information

Note: The frozen string API is not taint aware, only the internal API.

Gecko

* FakeString (dom/bindings/BindingUtils.h)
    - Inherits from TaintableString
* nsTextFragment (dom/base/nsTextFragment.h)
    - Inherits from TaintableString

## More Information
More specific internal documentation can be found in the [docs](docs) folder.

## References

### Mozilla internal String guide
https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Guide/Internal_strings