/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * vim: set ts=8 sts=2 et sw=2 tw=80:
 */
#include "jstaint.h"

#include <iostream>
#include <string>
#include <utility>

#include "jsapi.h"

using namespace js;

static std::u16string ascii2utf16(const std::string& str) {
    std::u16string res;
    for (auto c : str)
        res.push_back(static_cast<char16_t>(c));
    return res;
}

std::u16string js::taintarg(JSContext* cx, const char16_t* str)
{
    return std::u16string(str);
}

std::u16string js::taintarg(JSContext* cx, HandleString str)
{
    if (!str)
        return std::u16string();

    JSLinearString* linear = str->ensureLinear(cx);
    if (!linear)
        return std::u16string();

    js::UniquePtr<char16_t, JS::FreePolicy> buf(cx->pod_malloc<char16_t>(linear->length()));
    
    CopyChars(buf.get(), *linear);
    std::u16string result(buf.get(), linear->length());
    return result;
}

std::u16string js::taintarg(JSContext* cx, HandleObject obj)
{
    RootedValue val(cx, ObjectValue(*obj));
    RootedString str(cx, ToString(cx, val));
    if (!str)
        return std::u16string();
    return taintarg(cx, str);
}

std::u16string js::taintarg(JSContext* cx, HandleValue val)
{
    RootedString str(cx, ToString(cx, val));
    if (!str)
        return std::u16string();
    return taintarg(cx, str);
}

std::u16string js::taintarg(JSContext* cx, int32_t num)
{
    RootedValue val(cx, Int32Value(num));
    return taintarg(cx, val);
}

std::vector<std::u16string> js::taintargs(JSContext* cx, HandleValue val)
{
    std::vector<std::u16string> args;
    // Taintfox: TODO: Expand this to check if val is an array
    args.push_back(taintarg(cx, val));
    return args;
}

TaintLocation js::TaintLocationFromContext(JSContext* cx)
{
    if (!cx)
	return TaintLocation();

    AllFramesIter i(cx);

    if (i.done()) {
	return TaintLocation();
    }

    const char* filename;
    uint32_t line;
    uint32_t pos;
    RootedString function(cx);

    if (i.hasScript()) {
	filename = JS_GetScriptFilename(i.script());
	line = PCToLineNumber(i.script(), i.pc(), &pos);
    } else {
	filename = i.filename();
	line = i.computeLine(&pos);
    }

    if (i.maybeFunctionDisplayAtom()) {
	function = i.maybeFunctionDisplayAtom();
    }

    return TaintLocation(ascii2utf16(std::string(filename)), line, pos, taintarg(cx, function));
}

TaintOperation js::TaintOperationFromContext(JSContext* cx, const char* name, JS::HandleValue args) {
    return TaintOperation(name, TaintLocationFromContext(cx), taintargs(cx, args));
}

TaintOperation js::TaintOperationFromContext(JSContext* cx, const char* name) {
    return TaintOperation(name, TaintLocationFromContext(cx));
}

void js::MarkTaintedFunctionArguments(JSContext* cx, JSFunction* function, const CallArgs& args)
{
    if (!function)
        return;

    RootedValue name(cx);
    if (function->displayAtom())
        name = StringValue(function->displayAtom());

    std::u16string sourceinfo(u"unknown");
    if (function->isInterpreted() && function->hasScript()) {
        RootedScript script(cx, function->existingScript());
        if (script) {
            int lineno = script->lineno();
            ScriptSource* source = script->scriptSource();
            if (source && source->filename()) {
                std::string filename(source->filename());
                sourceinfo = ascii2utf16(filename) + u":" + ascii2utf16(std::to_string(lineno));
            }
        }
    }

    TaintLocation location = TaintLocationFromContext(cx);
    for (unsigned i = 0; i < args.length(); i++) {
        if (args[i].isString()) {
            RootedString arg(cx, args[i].toString());
            if (arg->isTainted())
	      arg->taint().extend(TaintOperation("function call argument", location, { taintarg(cx, name), sourceinfo, taintarg(cx, i) } ));
        }
    }
}

// Print a message to stdout.
void js::TaintFoxReport(JSContext* cx, const char* msg)
{
  JS_ReportWarningUTF8(cx, "%s", msg);
}
