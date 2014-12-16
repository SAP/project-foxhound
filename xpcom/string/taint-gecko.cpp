#include "jsapi.h"
#include "jsfriendapi.h"
#include "nsString.h"
#include "mozilla/dom/ToJSValue.h"
#include "taint-gecko.h"

nsresult
taint_report_sink_gecko(JSContext *cx, const nsAString &str, const char* name)
{
	JS::RootedObject strobj(cx);
	JS::RootedValue  strval(cx);
    JS::RootedValue  rval(cx);
    //JS::RootedId id(cx);
    //bool ok = false;

    
    mozilla::dom::ToJSValue(cx, str, &strval);

    JS::AutoValueArray<1> params(cx);
    params[0].setString(JS_NewStringCopyZ(cx, name));

    JS_ValueToObject(cx, strval, &strobj);

    if(!JS_CallFunctionName(cx, strobj, "reportTaint", params, &rval)) {
    	return NS_ERROR_FAILURE;
    }
    
    return NS_OK;
}