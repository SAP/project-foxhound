# TaintFox Internals

See Taint.h for a detailed description of the internal taint classes and their usage.

## Sources and Sinks

#### Sources

    git grep TaintFox | grep -i source

In dom/base/nsLocation.cpp
* location.hash
* location.host
* location.hostname
* location.href
* location.origin
* location.pathname
* location.username
* location.password
* location.search

In dom/base/nsINode.cpp
* document.baseURI

In dom/base/nsHTMLDocument.cpp
* document.cookie

In dom/base/nsDocument.cpp
* document.referrer
* document.documentURI

In dom/base/nsGlobalWindow.cpp
* window.name


#### Sinks

    git grep TaintFox | grep -i sink

In dom/base/Element.cpp
* Event handler
* .outerHTML

In dom/base/FragmentOrElement.cpp
* .innerHTML

In dom/base/nsLocation.cpp
* location.hash
* location.hostname
* location.href
* location.pathname
* location.port
* location.protocol
* location.username
* location.password
* location.search

In dom/html/nsHTMLDocument.cpp
* document.cookie
* document.write

In dom/base/nsGlobalWindow.cpp
* setInterval
* setTimeout

In js/src/builtin/Eval.cpp
* eval()

In js/src/jsfun.cpp
* new Function


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

