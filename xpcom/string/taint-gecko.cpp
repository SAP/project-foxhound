#include "jsapi.h"
#include "jsfriendapi.h"
#include "nsString.h"
#include "mozilla/dom/ToJSValue.h"
#include "taint-gecko.h"

#if _TAINT_ON_

nsresult
taint_report_sink_gecko(JSContext *cx, const nsAString &str, const char* name)
{
    MOZ_ASSERT(cx && name);
    MOZ_ASSERT(str.isTainted());

    if(!JS_IsRunning(cx))
        printf("!!Gecko Sink access to %s, script running: %u\n", name, JS_IsRunning(cx));

    if(JS_IsExceptionPending(cx))
        return NS_ERROR_FAILURE;

	JS::RootedObject strobj(cx);
	JS::RootedValue  strval(cx);
    JS::RootedValue  rval(cx);
    JS::RootedObject stack(cx);

    JS::CaptureCurrentStack(cx, &stack);
    mozilla::dom::ToJSValue(cx, str, &strval);
    JS_ValueToObject(cx, strval, &strobj);

    JS::AutoValueArray<2> params(cx);
    params[0].setString(JS_NewStringCopyZ(cx, name));
    params[1].setObject(*stack);

    if(!JS_CallFunctionName(cx, strobj, "reportTaint", params, &rval)) {
    	return NS_ERROR_FAILURE;
    }

    return NS_OK;
}

#endif
