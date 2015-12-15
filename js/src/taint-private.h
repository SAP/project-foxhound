#ifndef taint_priv_h
#define taint_priv_h

#ifdef _TAINT_ON_

#include "jsapi.h"
#include "taint.h"

//------------------------------
//taint handling for the JSString class
//
#define TAINT_ADD_JSSTR_METHODS \
JS_FN("untaint",                taint_str_untaint,              0,JSFUN_GENERIC_NATIVE),\
JS_FN("taintTestMutate",        taint_str_testop,               0,JSFUN_GENERIC_NATIVE),\
JS_FN("taintTestReport",        taint_str_report,               0,JSFUN_GENERIC_NATIVE),\
JS_FN("reportTaint",            taint_js_report_flow,           1,JSFUN_GENERIC_NATIVE),

#define TAINT_ADD_JSSTR_STATIC_METHODS \
JS_FN("newAllTainted",          taint_str_newalltaint,          1,0),

#define TAINT_ADD_JSSTR_PROPS \
JS_PSG("taint",                 taint_str_prop,                 JSPROP_PERMANENT),

//initialize new string instances
#define TAINT_STR_INIT \
    do { \
        d.u0.startTaint = nullptr; \
        d.u0.endTaint = nullptr; \
    } while(false)

//merge references after initializing the taint pointer
#define TAINT_STR_ASM_INIT(dst) \
{ \
    masm.storePtr(ImmPtr(nullptr), Address(dst, JSString::offsetOfStartTaint())); \
    masm.storePtr(ImmPtr(nullptr), Address(dst, JSString::offsetOfEndTaint())); \
}

//init global namespace
bool taint_domlog(JSContext *cx, unsigned argc, JS::Value *vp);

//JavaScript functions
//JavaScript copy constructor for new all-tainted strings
bool taint_str_newalltaint(JSContext *cx, unsigned argc, JS::Value *vp);
//JavaScript taint info
bool taint_str_prop(JSContext *cx, unsigned argc, JS::Value *vp);
//JavaScript function to forcefully untaint a string
bool taint_str_untaint(JSContext *cx, unsigned argc, JS::Value *vp);
//JavaScript mutator for testing purposes
bool taint_str_testop(JSContext *cx, unsigned argc, JS::Value *vp);
//JavaScript taint reporter for testing
bool taint_str_report(JSContext *cx, unsigned argc, JS::Value *vp);

bool taint_js_report_flow(JSContext *cx, unsigned argc, JS::Value *vp);

//concat taint of two strings into a third
void
taint_str_concat(JSContext *cx, JSString *dst, JSString *lhs, JSString *rhs);
//range copy for a substring operation
JSString *
taint_str_substr(JSString *str, JSContext *cx, JSString *base,
    uint32_t start, uint32_t length);

//------------------------------
//common core taint tracking logic
//

void
taint_report_sink_js(JSContext *cx, JS::HandleString str, const char* name);

//add a new operator to all TaintStringRefs following dst
void
taint_add_op(TaintStringRef *dst, const char* name,
    JSContext *cx = nullptr,
    JS::HandleValue param1 = JS::UndefinedHandleValue,
    JS::HandleValue param2 = JS::UndefinedHandleValue);

//defs for in place use of primitives
#define TAINT_STR_COPY(str, base) \
    base->isTainted() ? taint_copy_range((str), base->getTopTaintRef(), 0, 0, 0) : (str)
#define TAINT_REF_COPY(str, ref) \
    ref ? taint_copy_range((str), ref, 0, 0, 0) : (str)

//do not copy taint for atoms for now
//until we figured out how to handle this problem
//!!! GC
/*
#define TAINT_ATOM_CLEARCOPY(scope_str, scope_base) \
[](decltype(scope_str) res, decltype(scope_base) base) -> decltype(scope_str) {\
    res->removeAllTaint(); \
    if(base->isTainted()) \
        taint_copy_range(res, base->getTopTaintRef(), 0, 0, 0); \
    return res; \
}(scope_str, scope_base) */

//partial taint copy
// - copy taint from source from frombegin until fromend
// - insert at offset into dst
// fromend = 0 -> copy all
template <typename TaintedT>
TaintedT *taint_copy_range(TaintedT *dst, TaintStringRef *src,
    uint32_t frombegin, int32_t offset, uint32_t fromend);

//other shortcuts
JSString*
taint_copy_and_op(JSContext *cx, JSString * dststr, JSString * srcstr,
    const char *name, JS::HandleValue param1 = JS::UndefinedHandleValue,
    JS::HandleValue param2 = JS::UndefinedHandleValue);

//injects substrings after taint_copy
//last is the last TaintRef before taint was copied
//offset/begin are the values passed into taint_copy_range
void
taint_inject_substring_op(JSContext *cx, TaintStringRef *last,
    uint32_t offset, uint32_t begin);

bool taint_threadbit_set(uint8_t v);

void taint_tag_source_js(JS::HandleString str, const char* name,
    JSContext *cx = nullptr, uint32_t begin = 0);

//-----------------------------------
//call manipulation and augmentation

#define TAINT_CALL_MARK_ARG(v, argn, funname) \
    do { \
        Value checktaint(v); \
        JSString *strtaint = nullptr; \
        if(checktaint.isString() && \
            (strtaint = checktaint.toString()) && \
            strtaint->isTainted()) \
        { \
            taint_add_op(strtaint->getTopTaintRef(), "function call", cx, funname, argn); \
        } \
    } while(false)

#define TAINT_CALL_MARK_ALL(fun, args) \
    do { \
        if(!fun) \
            break; \
        RootedValue funnamearg(cx); \
        if(fun->displayAtom()) \
            funnamearg = StringValue(fun->displayAtom()); \
        for(unsigned i = 0; i < args.length(); i++) { \
            RootedValue argn(cx, JS::Int32Value(i)); \
            TAINT_CALL_MARK_ARG(args.get(i), argn, funnamearg); \
        } \
        RootedValue thisn(cx, JS::Int32Value(-1)); \
        TAINT_CALL_MARK_ARG(args.thisv(), thisn, funnamearg); \
    } while(false)


//quote special call manipulation
#define TAINT_MARK_MATCH(scope_str) \
[&](decltype(scope_str) bres) -> decltype(scope_str) {\
    NativeObject* obj = js::MaybeNativeObject(args.rval().get().toObjectOrNull()); \
    if(obj) { \
        RootedValue patVal(cx, StringValue(g.regExp().getSource())); \
        for(uint32_t ki = 0; ki < obj->getDenseInitializedLength(); ki++) { \
            RootedValue resultIdx(cx, JS::Int32Value(ki)); \
            Value vstr = obj->getDenseElement(ki); \
            if(vstr.isString()) {\
                taint_add_op(vstr.toString()->getTopTaintRef(), "match", cx, patVal, resultIdx); \
            } \
        } \
    } \
    return bres; \
}(scope_str)
#define TAINT_MARK_SPLIT \
    NativeObject * nobj = js::MaybeNativeObject(aobj); \
    if(nobj) { \
        RootedValue splitVal(cx, args[0]); \
        for(uint32_t ki = 0; ki < nobj->getDenseInitializedLength(); ki++) { \
            RootedValue resultIdx(cx, JS::Int32Value(ki)); \
            Value vstr = nobj->getDenseElement(ki); \
            if(vstr.isString()) { \
                taint_add_op(vstr.toString()->getTopTaintRef(), "split", cx, splitVal, resultIdx); \
            } \
        } \
    }


#define TAINT_JSON_PARSE_CALL(a,b,c,d, str) ParseJSONWithReviver(a,b,c,d, str->getTopTaintRef())
#define TAINT_JSON_PARSE_CALL_NULL(a,b,c,d) ParseJSONWithReviver(a,b,c,d, nullptr);
#define TAINT_JSON_PARSE_DEF(a,b,c,d) ParseJSONWithReviver(a,b,c,d,TaintStringRef *ref)
#define TAINT_JSON_EVAL_CALL(a,b,c) ParseEvalStringAsJSON(a,b,c, str->getTopTaintRef())


#define TAINT_JSON_QUOTE_PRE \
    TaintStringRef *current_tsr = str->getTopTaintRef(); \
    TaintStringRef *target_last_tsr = nullptr;
#define TAINT_JSON_QUOTE_MATCH(k, off) \
    if(current_tsr) { \
        current_tsr = taint_copy_exact(&target_last_tsr, current_tsr, k, sb.length() + off); \
        if(sb.getTopTaintRef() == nullptr && target_last_tsr != nullptr) \
            sb.addTaintRef(target_last_tsr); \
    }

#define TAINT_UNESCAPE_DEF(a,b) Unescape(a,b,TaintStringRef *source)
#define TAINT_UNESCAPE_CALL(a,b) Unescape(a,b,str->getTopTaintRef())
#define TAINT_UNESCAPE_MATCH(k) \
    if(building && current_tsr) { \
        current_tsr = taint_copy_exact(&target_last_tsr, current_tsr, k, sb.length()); \
        if(sb.getTopTaintRef() == nullptr && target_last_tsr != nullptr) \
            sb.addTaintRef(target_last_tsr); \
    }

#define TAINT_ENCODE_CALL(a,b,c,d,e) Encode(a,b,c,d,e,str->getTopTaintRef())
#define TAINT_ENCODE_DEF(a,b,c,d,e) Encode(a,b,c,d,e,TaintStringRef *source)
#define TAINT_ENCODE_PRE \
    TaintStringRef *current_tsr = source; \
    TaintStringRef *target_last_tsr = nullptr;
#define TAINT_ENCODE_MATCH(k) \
    if(current_tsr) { \
        current_tsr = taint_copy_exact(&target_last_tsr, current_tsr, k, sb.length()); \
        if(sb.getTopTaintRef() == nullptr && target_last_tsr != nullptr) \
            sb.addTaintRef(target_last_tsr); \
    }

#define TAINT_DECODE_CALL(a,b,c,d) Decode(a,b,c,d,str->getTopTaintRef())
#define TAINT_DECODE_DEF(a,b,c,d) Decode(a,b,c,d,TaintStringRef *source)
#define TAINT_DECODE_PRE \
    TaintStringRef *current_tsr = source; \
    TaintStringRef *target_last_tsr = nullptr;
#define TAINT_DECODE_MATCH(k) \
    if(current_tsr) { \
        current_tsr = taint_copy_exact(&target_last_tsr, current_tsr, k, sb.length()); \
        if(sb.getTopTaintRef() == nullptr && target_last_tsr != nullptr) \
            sb.addTaintRef(target_last_tsr); \
    }

#else

#define TAINT_STR_COPY(str, base) (str)
#define TAINT_REF_COPY(str, ref) (str)
#define TAINT_REF_COPYCLEAR(str, base) (str)
//#define TAINT_ATOM_CLEARCOPY(str, base) (str)

#define TAINT_JSON_PARSE_CALL(a,b,c,d,str) ParseJSONWithReviver(a,b,c,d)
#define TAINT_JSON_PARSE_CALL_NULL(a,b,c,d) ParseJSONWithReviver(a,b,c,d);
#define TAINT_JSON_EVAL_CALL(a,b,c) ParseEvalStringAsJSON(a,b,c)
#define TAINT_JSON_PARSE_DEF(a,b,c,d) ParseJSONWithReviver(a,b,c,d)

#define TAINT_MARK_MATCH(str, regex) (str)
#define TAINT_MARK_REPLACE_RAW(str, re) (str)
#define TAINT_MARK_REPLACE(str) (str)

#define TAINT_UNESCAPE_DEF(a,b) Unescape(a,b)
#define TAINT_UNESCAPE_CALL(a,b) Unescape(a,b)
#define TAINT_UNESCAPE_MATCH(k) (void)0;

#define TAINT_ENCODE_CALL(a,b,c,d,e) Encode(a,b,c,d,e)
#define TAINT_ENCODE_DEF(a,b,c,d,e) Encode(a,b,c,d,e)

#define TAINT_DECODE_CALL(a,b,c,d) Decode(a,b,c,d)
#define TAINT_DECODE_DEF(a,b,c,d) Decode(a,b,c,d)

#endif


#endif
