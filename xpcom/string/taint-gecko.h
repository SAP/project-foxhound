#ifndef taint_gecko_h
#define taint_gecko_h

#ifdef _TAINT_ON_

#include "taint.h"

class nsAString;

void
taint_report_sink_gecko(JSContext *cx, const nsAString* str, const char* name);

#endif

#endif