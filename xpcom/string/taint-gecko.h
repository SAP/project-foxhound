#ifndef taint_gecko_h
#define taint_gecko_h

#if _TAINT_ON_

#include "mozilla/TaintCommon.h"
#include "jstaint.h"

class nsAString;

nsresult
taint_report_sink_gecko(JSContext *cx, const nsAString &str, const char* name);

#endif

#endif
