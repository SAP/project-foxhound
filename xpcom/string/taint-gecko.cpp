#include "jsapi.h"
#include "nsString.h"
#include "mozilla/dom/ToJSValue.h"
#include "taint-gecko.h"

void
taint_report_sink_gecko(JSContext *cx, const nsAString &str, const char* name)
{
	JS::RootedValue jsval(cx);
	mozilla::dom::ToJSValue(cx, str, &jsval);
    taint_report_sink_internal(cx, jsval, const_cast<nsAString&>(str).getTopTaintRef(), name);
}