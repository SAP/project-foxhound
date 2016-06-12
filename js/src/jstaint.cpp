#include "jsapi.h"
#include "jstaint.h"

#include "vm/NumberObject.h"

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

void js::MarkTaintedFunctionArguments(JSContext* cx, const JSFunction* function, const CallArgs& args)
{
    if(!function)
        return;

    RootedValue name(cx);
    if (function->displayAtom())
        name = StringValue(function->displayAtom());

    for(unsigned i = 0; i < args.length(); i++) {
        if (args[i].isString()) {
            RootedString arg(cx, args[i].toString());
            if (arg->isTainted())
                arg->taint().extend(TaintOperation("function call argument", { taintarg(cx, name), taintarg(cx, i) } ));
        }
    }

    // Disabled for now as it is mostly redundant information
    // Also this would add operations for the taint getter and setter (str.taint)
    /*
    if (args.thisv().isString()) {
        RootedString thisv(cx, args.thisv().toString());
        if (thisv->isTainted())
            thisv->taint().extend(TaintOperation("function call this value", { taintarg(cx, name) }));
    }
    */
}

bool js::isTaintedNumber(const Value& val)
{
    if (val.isObject() && val.toObject().is<NumberObject>()) {
        NumberObject& number = val.toObject().as<NumberObject>();
        return number.isTainted();
    }
    return false;
}

TaintFlow js::getNumberTaint(const Value& val)
{
    if (val.isObject() && val.toObject().is<NumberObject>()) {
        NumberObject& number = val.toObject().as<NumberObject>();
        return number.taint();
    }
    return TaintFlow(nullptr);
}

bool js::isAnyTaintedNumber(const Value& val1, const Value& val2)
{
    return isTaintedNumber(val1) || isTaintedNumber(val2);
}

TaintFlow js::getAnyNumberTaint(const Value& val1, const Value& val2)
{
    if (isTaintedNumber(val1))
        return getNumberTaint(val1);
    else
        return getNumberTaint(val2);
}

// Print a message to stdout.
void js::TaintFoxReport(const char* msg)
{
    std::cerr << msg << std::endl;
}
