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

    for (unsigned i = 0; i < args.length(); i++) {
        if (args[i].isString()) {
            RootedString arg(cx, args[i].toString());
            if (arg->isTainted())
                arg->taint().extend(TaintOperation("function call argument", { taintarg(cx, name), sourceinfo, taintarg(cx, i) } ));
        }
    }
}

// Print a message to stdout.
void js::TaintFoxReport(const char* msg)
{
    std::cerr << msg << std::endl;
}
