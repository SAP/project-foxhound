# TaintFox Internals

See Taint.h for a detailed description of the internal taint classes and their usage.

## Sources and Sinks

### Sources

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

#### Input Elements
HTML Input elements are a user-controlled input and could be used to inject
code into the DOM. Not sure if this can be exploited remotely though.

In dom/html/HTMLInputElement.cpp
* input.value for input elements (e.g. text box)

#### Local Storage
The window.localStorage.getItem can be vulnerable to stored DOM XSS attacks.
The implementation is in three different places depending on which type of
storage is being used:

* dom/storage/LocalStorage.cpp
* dom/storage/PartitionedLocalStorage.cpp
* localstorage/LSObject.cpp

The LSObject.cpp is "next generation" storage, and can be switched on by
going to [](about:config) and looking for the ```dom.storage.next_gen``` option.

In all three cases above, the string being retreived is first checked for
taint. If it is already tainted, the localstorage is added as a TaintOperation.
Otherwise, a new taint is added to the string.

TODO: intercept the local storage call and add the taint information to storage
as well (e.g. via JSON?)


### Sinks

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


## References

### Mozilla internal String guide
https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Guide/Internal_strings