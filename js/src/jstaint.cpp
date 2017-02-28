#include "jsapi.h"
#include "jstaint.h"

#include <codecvt>
#include <iostream>
#include <string>

using namespace js;

std::u16string js::taintarg(ExclusiveContext* cx, HandleString str)
{
    if (!str)
        return std::u16string();

    JSLinearString* linear = str->ensureLinear(cx);
    if (!linear)
        return std::u16string();

    ScopedJSFreePtr<char16_t> buf(cx->pod_malloc<char16_t>(linear->length()));
    CopyChars(buf.get(), *linear);
    std::u16string result(buf, linear->length());
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
                std::wstring_convert<std::codecvt_utf8_utf16<char16_t, 0x10ffff, std::little_endian>, char16_t> conv;
                sourceinfo = conv.from_bytes(filename) + u":" + conv.from_bytes(std::to_string(lineno));
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
