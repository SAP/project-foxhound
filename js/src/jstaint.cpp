#ifdef _TAINT_ON_

#include "jsapi.h"
#include "jsstr.h"
#include "vm/StringBuffer.h"

#include "jsarray.h"
#include "taint-private.h"
#include "vm/SavedStacks.h"
#include "vm/StringObject-inl.h"

#include <algorithm>
#include <map>
#include <set>
#include <string>
#include <sstream>
#include <iostream>

#ifdef XP_WIN
#define snprintf _snprintf
#endif

using namespace js;

#define VALIDATE_NODE(validate_tsr) \
    MOZ_ASSERT((validate_tsr)->end > (validate_tsr)->begin);

#if DEBUG
    #define VALIDATE_CHAIN(validate_tsr) \
        do { \
            TaintStringRef *vl = validate_tsr; \
            if(!vl) \
                break; \
            VALIDATE_NODE(vl); \
            TaintStringRef *ve = vl->next; \
            for(;ve != nullptr; vl = ve, ve = ve->next) \
            { \
                VALIDATE_NODE(ve); \
                MOZ_ASSERT(ve->begin >= vl->end); \
            } \
        } while(false)
#else
    #define VALIDATE_CHAIN(validate_tsr) ;
#endif


//----------------------------------
// Reference Node

static char16_t*
taint_node_stringchars(JSContext *cx, JSString *str, size_t *plength)
{
    MOZ_ASSERT(cx);
    if(plength)
        *plength = 0;

    if(!str)
        return nullptr;

    size_t len = str->length();
    char16_t *charbuf = cx->pod_malloc<char16_t>(len + 1);
    if(!charbuf)
        return nullptr;

    JSLinearString *lin = str->ensureLinear(cx);
    if(!lin)
        return nullptr;

    CopyChars(charbuf, *lin);
    charbuf[len] = 0;
    if(plength)
        *plength = len;
    return charbuf;
}

void taint_tag_source_js(HandleString str, const char* name,
    JSContext *cx, uint32_t begin)
{
    MOZ_ASSERT(!str->isTainted());

    if(str->length() == 0)
        return;

    TaintNode *taint_node = taint_str_add_source_node(name);
    if(cx) {
        taint_node->param1 = taint_node_stringchars(cx, str,
            &taint_node->param1len);
    }
    TaintStringRef *newtsr = taint_str_taintref_build(begin, str->length(), taint_node);

    VALIDATE_NODE(newtsr);

    str->addTaintRef(newtsr);
}

static char16_t*
taint_node_stringify(JSContext *cx, HandleValue value, size_t *plength) {

    MOZ_ASSERT(cx);

    JSString *str = nullptr;

    if(!value.isString()) {
        str = JS::ToString(cx, value);
    } else {
        str = value.toString();
    }
    if(!str)
        return nullptr;

    return taint_node_stringchars(cx, str, plength);


    //JS_Stringify(cx, &val, nullptr, JS::NullHandleValue, taint_node_stringify_callback, strval);
    //value = vp;
}

//------------------------------------------------
// Library Test/Debug functions

bool taint_threadbit_set(uint8_t v)
{
    js::PerThreadData *pt = js::TlsPerThreadData.get();
    return pt && !!(pt->taintStackOptions & v);
}

bool
taint_str_testop(JSContext *cx, unsigned argc, Value *vp)
{
    CallArgs args = CallArgsFromVp(argc, vp);
    RootedString str(cx, ToString<CanGC>(cx, args.thisv()));
    if(!str)
        return false;

    RootedValue param(cx, StringValue(NewStringCopyZ<CanGC>(cx, "String parameter")));
    taint_add_op(str->getTopTaintRef(), "Mutation with params", cx, param, param);
    taint_add_op(str->getTopTaintRef(), "Mutation w/o param", cx);

    args.rval().setUndefined();
    return true;
}

bool taint_str_report(JSContext *cx, unsigned argc, JS::Value *vp)
{
    CallArgs args = CallArgsFromVp(argc, vp);
    RootedString str(cx, ToString<CanGC>(cx, args.thisv()));
    if(!str)
        return false;

    if(str->isTainted())
        taint_report_sink_js(cx, str, "manual sink");

    args.rval().setUndefined();
    return true;
}

bool
taint_str_untaint(JSContext *cx, unsigned argc, Value *vp)
{
    CallArgs args = CallArgsFromVp(argc, vp);
    RootedString str(cx, ToString<CanGC>(cx, args.thisv()));
    if(!str)
        return false;

    str->removeAllTaint();

    args.rval().setString(str);
    return true;
}

#define RETURN_IF(x) { if(x) return true; }

bool
taint_filter_source_tagging(JSContext *cx, const char *name)
{
    if(!cx || !cx->currentlyRunning())
        printf("!!Taint source access from %s, cx: %u, script running: %u\n", name, (unsigned)!!cx, (unsigned)(cx && cx->currentlyRunning()));

    RETURN_IF(cx && cx->runningWithTrustedPrincipals())
    //RETURN_IF(name && strncmp(name, "postMessage", 11) == 0)

    return false;
}

bool
taint_str_newalltaint(JSContext *cx, unsigned argc, Value *vp)
{
    CallArgs args = CallArgsFromVp(argc, vp);
    RootedString str(cx, ToString<CanGC>(cx, args[0]));
    if(!str || str->length() == 0)
        return false;

    RootedString taintedStr(cx);
    {
        JS::AutoCheckCannotGC nogc;
        JSLinearString *linear = str->ensureLinear(cx);
        if(linear->hasLatin1Chars()) {
            taintedStr = NewStringCopyN<NoGC>(cx,
                linear->latin1Chars(nogc), str->length());
        }
        else {
            taintedStr = NewStringCopyN<NoGC>(cx,
                linear->twoByteChars(nogc), str->length());
        }
    }

    taint_tag_source_js(taintedStr, "Manual taint source", cx);

    args.rval().setString(taintedStr);
    return true;
}

//----------------------------------
// Taint output

bool
taint_str_prop(JSContext *cx, unsigned argc, Value *vp)
{
    CallArgs args = CallArgsFromVp(argc, vp);
    args.rval().setNull();

    RootedString str(cx, ToString<CanGC>(cx, args.thisv()));
    if(!str)
        return false;

    AutoValueVector taints(cx);
    for(TaintStringRef *cur = str->getTopTaintRef(); cur != nullptr; cur = cur->next) {
        RootedObject obj(cx, JS_NewObject(cx, nullptr));

        if(!obj)
            return false;

        if(!JS_DefineProperty(cx, obj, "begin", cur->begin, JSPROP_READONLY | JSPROP_ENUMERATE | JSPROP_PERMANENT) ||
           !JS_DefineProperty(cx, obj, "end", cur->end, JSPROP_READONLY | JSPROP_ENUMERATE | JSPROP_PERMANENT))
            return false;

        AutoValueVector taintchain(cx);
        RootedObject taintobj(cx);
        RootedValue opname(cx);
        RootedString param1val(cx);
        RootedString param2val(cx);
        RootedObject stackobj(cx, nullptr);
        for(TaintNode* curnode = cur->thisTaint; curnode != nullptr; curnode = curnode->prev) {
            taintobj = JS_NewObject(cx, nullptr);
            opname = StringValue(NewStringCopyZ<CanGC>(cx, curnode->op));
            param1val = JS_NewUCStringCopyN(cx, curnode->param1, curnode->param1len);
            param2val = JS_NewUCStringCopyN(cx, curnode->param2, curnode->param2len);

            // TODO
            //if(curnode->stack) {
                //curnode->compileFrame(cx, &stackobj);
            //}

            if(stackobj)
                JS_WrapObject(cx, &stackobj);

            if(!taintobj)
                return false;

            if(!JS_DefineProperty(cx, taintobj, "op", opname, JSPROP_READONLY | JSPROP_ENUMERATE | JSPROP_PERMANENT))
                return false;

            //param is optional

            JS_DefineProperty(cx, taintobj, "param1", param1val, JSPROP_READONLY | JSPROP_ENUMERATE | JSPROP_PERMANENT);
            JS_DefineProperty(cx, taintobj, "param2", param2val, JSPROP_READONLY | JSPROP_ENUMERATE | JSPROP_PERMANENT);
            if(stackobj)
                JS_DefineProperty(cx, taintobj, "stack", stackobj, JSPROP_READONLY | JSPROP_ENUMERATE | JSPROP_PERMANENT);

            if(!taintchain.append(ObjectValue(*taintobj)))
                return false;
        }

        RootedObject taintarrobj(cx, NewDenseCopiedArray(cx, taintchain.length(), taintchain.begin()));
        if(!taintarrobj)
            return false;
        RootedValue taintarray(cx, ObjectValue(*taintarrobj));
        if(!JS_DefineProperty(cx, obj, "operators", taintarray, JSPROP_READONLY | JSPROP_ENUMERATE | JSPROP_PERMANENT))
            return false;

        if(!taints.append(ObjectValue(*obj)))
            return false;
    }

    JSObject *retarr = (JSObject*)NewDenseCopiedArray(cx, taints.length(), taints.begin());
    if(retarr) {
        args.rval().setObject(*retarr);
        return true;
    }

    return false;
}

//-----------------------------
// JSString handlers

static void
taint_add_op_single_str(TaintStringRef *dst, const char* name, JSContext *cx, char16_t *param1, char16_t *param2, size_t param1len, size_t param2len)
{
    VALIDATE_CHAIN(dst);

    //attach new node before changing the string ref as this would delete the old node
    TaintNode *taint_node = taint_str_add_source_node(name);

    //we are setting a single op (should have a previous source op)
    MOZ_ASSERT(dst->thisTaint, "should have a source op before adding others");

    taint_node->setPrev(dst->thisTaint);
    taint_node->param1 = param1;
    taint_node->param1len = param1len;
    taint_node->param2 = param2;
    taint_node->param2len = param2len;
    dst->attachTo(taint_node);

    VALIDATE_CHAIN(dst);
}

static char16_t*
taint_add_op_new_int(JSContext *cx, uint32_t v, size_t *l)
{
    MOZ_ASSERT(l);

    char buf[11] = {0};
    int ret = 0;
    ret = snprintf(buf, 11, "%u", v);
    if(ret < 0)
        return nullptr;
    *l = (size_t)ret;
    return InflateString(cx, buf, l);
}

static void
taint_add_op_single(TaintStringRef *dst, const char* name, JSContext *cx, HandleValue param1, HandleValue param2)
{
    size_t param1len = 0;
    size_t param2len = 0;
    char16_t *p1 = param1.isUndefined() ? nullptr : taint_node_stringify(cx, param1, &param1len);
    char16_t *p2 = param2.isUndefined() ? nullptr : taint_node_stringify(cx, param2, &param2len);
    MOZ_ASSERT((param1.isUndefined() || p1) && (param2.isUndefined() || p2));

    taint_add_op_single_str(dst, name, cx,
        p1,
        p2,
        param1len,
        param2len
    );
}

void
taint_inject_substring_op(JSContext *cx, TaintStringRef *last,
    uint32_t offset, uint32_t begin)
{
    MOZ_ASSERT(cx && last);

#if DEBUG
    JS::AutoCheckCannotGC nogc;
#endif

    //add an artificial substring operator, as there is no adequate call.
    //one taint_copy_range call can add multiple TaintRefs, we can find them
    //as they follow the "last" var captured _before_ the call
    for(TaintStringRef *tsr = last; tsr != nullptr; tsr = tsr->next)
    {
        //RootedValue startval(cx, Int32Value(tsr->begin - offset + begin));
        //RootedValue endval(cx, Int32Value(tsr->end - offset + begin));
        size_t param1len = 0;
        size_t param2len = 0;
        char16_t *p1 = taint_add_op_new_int(cx, tsr->begin - offset + begin, &param1len);
        char16_t *p2 = taint_add_op_new_int(cx, tsr->end - offset + begin, &param2len);
        MOZ_ASSERT(p1 && p2);

        taint_add_op_single_str(tsr, "substring", cx,
            p1,
            p2,
            param1len,
            param2len
        );
    }

    VALIDATE_CHAIN(last);
}

//TODO optimize for lhs == rhs
void
taint_str_concat(JSContext *cx, JSString *dst, JSString *lhs, JSString *rhs)
{
    MOZ_ASSERT(dst && lhs && rhs);

#if DEBUG
    JS::AutoCheckCannotGC nogc;
#endif

    if(lhs->isTainted())
        taint_copy_range(dst, lhs->getTopTaintRef(), 0, 0, 0);

    if(rhs->isTainted())
        taint_copy_range(dst, rhs->getTopTaintRef(), 0, lhs->length(), 0);

    //add operator only if possible (we might concat without any JSContext)
    if(cx && dst->isTainted()) {
        RootedValue lhsval(cx, StringValue(lhs));
        RootedValue rhsval(cx, StringValue(rhs));
        taint_add_op(dst->getTopTaintRef(), "concat", cx, lhsval, rhsval);
    }
}

JSString *
taint_str_substr(JSString *str, JSContext *cx, JSString *base,
    uint32_t start, uint32_t length)
{
    if(!str)
        return nullptr;

    if(!base->isTainted() || length == 0)
        return str;

    uint32_t end = start + length;

    RootedValue startval(cx);
    RootedValue endval(cx);

#if DEBUG
    JS::AutoCheckCannotGC nogc;
#endif

    taint_copy_range(str, base->getTopTaintRef(), start, 0, end);
    for(TaintStringRef *tsr = str->getTopTaintRef(); tsr != nullptr; tsr = tsr->next)
    {
        size_t param1len = 0;
        size_t param2len = 0;
        char16_t *p1 = taint_add_op_new_int(cx, tsr->begin + start, &param1len);
        char16_t *p2 = taint_add_op_new_int(cx, tsr->end + start, &param2len);
        MOZ_ASSERT(p1 && p2);

        taint_add_op_single_str(tsr, "substring", cx,
            p1,
            p2,
            param1len,
            param2len
        );
    }

    return str;
}


JSString*
taint_copy_and_op(JSContext *cx, JSString * dststr, JSString * srcstr,
    const char *name, JS::HandleValue param1,
    JS::HandleValue param2)
{
    MOZ_ASSERT(dststr && srcstr && !dststr->isTainted());


    if(!srcstr->isTainted())
        return dststr;

#if DEBUG
    JS::AutoCheckCannotGC nogc;
#endif

    taint_copy_range(dststr, srcstr->getTopTaintRef(), 0, 0, 0);
    taint_add_op(dststr->getTopTaintRef(), name, cx, param1, param2);

    return dststr;
}

// This is used when the full JSString* declaration is not yet
// available but as a mere forward declaration, which prevents
// us from issueing a direct call.
void
taint_str_addref(JSString *str, TaintStringRef *ref)
{
    MOZ_ASSERT(str);
#if DEBUG
    JS::AutoCheckCannotGC nogc;
#endif
    str->addTaintRef(ref);
}

TaintStringRef*
taint_str_get_top_taintref(JSString *str)
{
    MOZ_ASSERT(str);
#if DEBUG
    JS::AutoCheckCannotGC nogc;
#endif
    return str->getTopTaintRef();
}

TaintStringRef*
taint_str_get_top_taintref(JSFlatString *str)
{
    MOZ_ASSERT(str);
#if DEBUG
    JS::AutoCheckCannotGC nogc;
#endif
    return str->getTopTaintRef();
}


//----------------------------------------------
//General taint management operations

//duplicate all taintstringrefs form a string to another
//and point to the same nodes (shallow copy)
template <typename TaintedT>
TaintedT *taint_copy_range(TaintedT *dst, TaintStringRef *src,
    uint32_t frombegin, int32_t offset, uint32_t fromend)
{
    MOZ_ASSERT(dst && src);
    TaintStringRef *tsr = taint_duplicate_range(src, NULL, frombegin, offset, fromend);
    if(tsr) { //do not overwrite
        dst->addTaintRef(tsr);
    }

    return dst;
}
template JSString* taint_copy_range<JSString>(JSString *dst, TaintStringRef *src,
    uint32_t frombegin, int32_t offset, uint32_t fromend);
template JSFlatString* taint_copy_range<JSFlatString>(JSFlatString *dst, TaintStringRef *src,
    uint32_t frombegin, int32_t offset, uint32_t fromend);
template JSAtom* taint_copy_range<JSAtom>(JSAtom *dst, TaintStringRef *src,
    uint32_t frombegin, int32_t offset, uint32_t fromend);
template JSInlineString* taint_copy_range<JSInlineString>(JSInlineString *dst, TaintStringRef *src,
    uint32_t frombegin, int32_t offset, uint32_t fromend);
template StringBuffer* taint_copy_range<StringBuffer>(StringBuffer *dst, TaintStringRef *src,
    uint32_t frombegin, int32_t offset, uint32_t fromend);


void
taint_add_op(TaintStringRef *dst, const char* name, JSContext *cx, HandleValue param1, HandleValue param2)
{
    if(!dst)
        return;

    //TAINT TODO: this might install duplicates if multiple parts of the string derive from the same tree
    for(TaintStringRef *tsr = dst; tsr != nullptr; tsr = tsr->next) {
        taint_add_op_single(tsr, name, cx, param1, param2);
    }
}


//----------------------------------------------
// Reporting

template <typename T>
static void
taint_write_string_buffer(const T *s, size_t n, std::string *writer)
{
    writer->reserve(writer->length()+n);

    if (n == SIZE_MAX) {
        n = 0;
        while (s[n])
            n++;
    }

    char buf[5] = "0000";
    for (size_t i = 0; i < n; i++) {
        char16_t c = s[i];
        if(c == '|')
            writer->append("\\|");
        else if(c == '&')
            writer->append("&amp;");
        else if(c == '"')
            writer->append("&quot;");
        else if(c == '<')
            writer->append("&lt;");
        else if(c == '>')
            writer->append("&gt;");
        else if (c == '\n')
            writer->append("<br/>");
        else if (c == '\t')
            writer->append("\\t");
        else if(c == '\\' && i+1 < n) {
            if((char16_t)s[i+1] == 'n') {
                writer->append("<br/>");
                i++;
            }
        }
        else if (c >= 32 && c < 127)
            writer->push_back((char)s[i]);
        else if (c <= 255) {
            snprintf(buf, 3, "%02x", unsigned(c));
            writer->append("\\x");
            writer->append(buf);
        }
        else {
            snprintf(buf, 5, "%04x", unsigned(c));
            writer->append("\\u");
            writer->append(buf);
        }
    }
}


static bool
taint_jsval_writecallback(const char16_t *buf, uint32_t len, void *data)
{
    std::string *writer = static_cast<std::string*>(data);
    taint_write_string_buffer(buf, len, writer);

    return true;
}

static void
jsvalue_to_stdstring(JSContext *cx, HandleValue value, std::string *strval) {


    MOZ_ASSERT(cx && strval);

    RootedValue val(cx);

    if(!value.isString()) {
        val = StringValue(JS::ToString(cx, value));
    } else {
        val = value;
    }

    JS_Stringify(cx, &val, nullptr, JS::NullHandleValue, taint_jsval_writecallback, strval);
    //value = vp;
}

bool
taint_domlog(JSContext *cx, unsigned argc, Value *vp)
{
    CallArgs args = CallArgsFromVp(argc, vp);

    RootedObject global(cx, cx->global());
    if(!global)
        return false;

    RootedValue  fval(cx, UndefinedValue());
    RootedFunction tofun(cx, nullptr);
    if(JS_GetProperty(cx, global, "__taint_dispatch_domlog", &fval) &&
        IsCallable(fval))
    {
        tofun = &fval.toObject().as<JSFunction>();
    } else {
        printf("Domlog dispatcher not installed. Compiling.");
        const char* funbody =
            "if (CustomEvent && window) {\n"
            "    var e=new window.CustomEvent('__domlog',{detail:[].slice.apply(arguments)});\n"
            "    window.dispatchEvent(e);\n"
            "}";
        JS::CompileOptions options(cx);
        options.setFile("taint.cpp")
               .setCanLazilyParse(false)
               .setForEval(false)
               .setNoScriptRval(false);
        JS::AutoObjectVector emptyScopeChain(cx);
        if(!JS::CompileFunction(cx, emptyScopeChain, options, "__taint_dispatch_domlog",
            0, nullptr, funbody, strlen(funbody), &tofun) || !tofun)
        {
            printf("Could not compile domlog dispatcher\n");
            return false;
        }

        printf("  OK.\n");
        fval = ObjectValue(*tofun);
        if(!JS_SetProperty(cx, global, "__taint_dispatch_domlog", fval))
            return false;

    }
    if(!JS_CallFunction(cx, global, tofun, JS::HandleValueArray(args), args.rval()))
    {
        printf("Could not call domlog dispatcher.\n");
        return false;
    }

    return true;
}


bool
taint_js_report_flow(JSContext *cx, unsigned argc, Value *vp)
{
    MOZ_ASSERT(cx);

    CallArgs args = CallArgsFromVp(argc, vp);
    if(args.length() < 2)
        return true;

    RootedString str(cx, ToString<CanGC>(cx, args.thisv()));
    if(!str)
        return false;

    //silently ignore untainted or zero-length reports
    if(str->length() == 0 || !str->isTainted())
        return true;

    std::string sink_str;
    jsvalue_to_stdstring(cx, args[0], &sink_str);
    printf("[---TAINT---] Flow into %s. Calling event handler.\n", sink_str.c_str());
#if DEBUG
    js::DumpBacktrace(cx);
#endif

    //Try to call window.setTimeout with ourselves in a loop until
    //the "real" reportTaint is placed by the extension
    RootedObject global(cx, cx->global());
    if(!global)
        return false;

    RootedValue  fval(cx, UndefinedValue());
    RootedFunction tofun(cx, nullptr);
    if(JS_GetProperty(cx, global, "__taint_dispatch_report", &fval) &&
        IsCallable(fval))
    {
        tofun = &fval.toObject().as<JSFunction>();
    } else {
        printf("  Event dispatcher not installed. Compiling.\n");

        const char* argnames[3] = {"str", "sink", "stack"};
        const char* funbody =
            "if (window && document) {\n"
            "    var t = window;\n"
            "    if (location.protocol == 'javascript:' || location.protocol == 'data:' || location.protocol == 'about:') {\n"
            "        t = parent.window;\n"
            "    }\n"
            "    var pl;\n"
            "    try {\n"
            "        pl = parent.location.href;\n"
            "    } catch (e) {\n"
            "        pl = 'different origin';\n"
            "    }\n"
            "    var e = document.createEvent('CustomEvent');\n"
            "    e.initCustomEvent('__taintreport', true, false, {\n"
            "        subframe: t !== window,\n"
            "        loc: location.href,\n"
            "        parentloc: pl,\n"
            "        str: str,\n"
            "        sink: sink,\n"
            "        stack: stack\n"
            "    });\n"
            "    t.dispatchEvent(e);\n"
            "}";
        JS::CompileOptions options(cx);
        options.setFile("taint.cpp")
               .setCanLazilyParse(false)
               .setForEval(false)
               .setNoScriptRval(false);
        JS::AutoObjectVector emptyScopeChain(cx);
        if(!JS::CompileFunction(cx, emptyScopeChain, options, "__taint_dispatch_report",
            3, argnames, funbody, strlen(funbody), &tofun) || !tofun)
        {
            printf("  Could not compile.\n");
            return false;
        }

        printf("  OK.\n");
        fval = ObjectValue(*tofun);
        if(!JS_SetProperty(cx, global, "__taint_dispatch_report", fval))
            return false;
    }

    JS::AutoValueArray<3> timeoutparams(cx);
    timeoutparams[0].setString(str);
    timeoutparams[1].set(args[0]);
    timeoutparams[2].set(args[1]);
    if(!JS_CallFunction(cx, global, tofun, timeoutparams, args.rval()))
    {
        printf("  Could not call event dispatcher.\n");
        return false;
    }

    return true;
}

void
taint_report_sink_js(JSContext *cx, HandleString str, const char* name)
{
    MOZ_ASSERT(cx && str && name);
    MOZ_ASSERT(str->isTainted());

    if(cx->isExceptionPending())
        return;

    RootedValue rval(cx);
    RootedObject strobj(cx);
    RootedObject stack(cx);
    JS::AutoValueArray<2> params(cx);

    params[0].setString(NewStringCopyZ<CanGC>(cx, name));

    JS::CaptureCurrentStack(cx, &stack);
    params[1].setObject(*stack);

    strobj = StringObject::create(cx, str);

    JS_CallFunctionName(cx, strobj, "reportTaint", params, &rval);
}

#endif
