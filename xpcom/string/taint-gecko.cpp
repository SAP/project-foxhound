#include "nsString.h"
#include "taint-gecko.h"

void
taint_report_sink_gecko(JSContext *cx, const nsAString* str, const char* name)
{
    const char16_t *start = str->BeginReading();
    taint_report_sink_internal(cx, start, str->Length(), const_cast<nsAString*>(str)->getTopTaintRef(), name);
}