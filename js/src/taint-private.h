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
#define TAINT_ATOM_CLEARCOPY(scope_str, scope_base) \
[](decltype(scope_str) res, decltype(scope_base) base) -> decltype(scope_str) {\
    res->removeAllTaint(); \
    if(base->isTainted()) \
        taint_copy_range(res, base->getTopTaintRef(), 0, 0, 0); \
    return res; \
}(scope_str, scope_base)

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

//-----------------------------------
//call manipulation and augmentation

//quote special call manipulation
#define TAINT_QUOTE_STRING_CALL(a,b,c) QuoteString(a,b,c,&targetref)
#define TAINT_QUOTE_STRING_CALL_NULL(a,b,c) QuoteString(a,b,c,nullptr)
#define TAINT_QUOTE_STRING_CALL_PASS(a,b,c,d) QuoteString(a,b,c,d,targetref,linear->getTopTaintRef())
#define TAINT_QUOTE_STRING_PRE \
    TaintStringRef *current_tsr = sourceref; \
    TaintStringRef *target_last_tsr = nullptr; \
    const CharT *s_start = s; \
    if(targetref) \
        target_last_tsr = *targetref;
#define TAINT_QUOTE_STRING_MATCH \
    if(current_tsr) {               \
        current_tsr = taint_copy_exact(&target_last_tsr, current_tsr, t - s_start, sp->getOffset() + (t - s)); \
        if(targetref && *targetref == nullptr && target_last_tsr != nullptr) \
            *targetref = target_last_tsr; \
    }
#define TAINT_QUOTE_STRING_VAR \
    TaintStringRef *targetref = nullptr;
#define TAINT_QUOTE_STRING_APPLY \
    if(targetref) { \
        res->addTaintRef(targetref); \
        taint_add_op(res->getTopTaintRef(), "quote", cx->asJSContext()); \
    }


#define TAINT_ESCAPE_CALL(a,b,c,d) Escape(a,b,c,d,&targetref,str->getTopTaintRef())
#define TAINT_ESCAPE_PRE \
    TaintStringRef *current_tsr = sourceref; \
    TaintStringRef *target_last_tsr = nullptr; \
    if(targetref) \
        target_last_tsr = *targetref; //TODO maybe this is wrong? not the last but first tsr?
#define TAINT_ESCAPE_MATCH \
    if(current_tsr) { \
        current_tsr = taint_copy_exact(&target_last_tsr, current_tsr, i, ni); \
        if(targetref && *targetref == nullptr && target_last_tsr != nullptr) \
            *targetref = target_last_tsr; \
    }
#define TAINT_ESCAPE_VAR TAINT_QUOTE_STRING_VAR
#define TAINT_ESCAPE_APPLY \
    if(targetref) { \
        res->addTaintRef(targetref); \
        taint_add_op(res->getTopTaintRef(), "escape", cx); \
    }


#define TAINT_MARK_MATCH(scope_str) \
[&](decltype(scope_str) bres) -> decltype(scope_str) {\
    NativeObject* obj = js::MaybeNativeObject(args.rval().get().toObjectOrNull()); \
    if(obj) { \
        RootedValue patVal(cx, StringValue(g.regExp().getSource())); \
        for(uint32_t ki = 0; ki < obj->getDenseInitializedLength(); ki++) { \
            RootedValue resultIdx(cx, INT_TO_JSVAL(ki)); \
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
            RootedValue resultIdx(cx, INT_TO_JSVAL(ki)); \
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

#define TAINT_SB_APPEND_DECL(a) append(a,bool taint = true)
#define TAINT_SB_APPEND_DEF(a) append(a,bool taint)
#define TAINT_SB_APPEND_CALL(a) append(a,taint)
#define TAINT_SB_INFAPPENDSUBSTRING_DECL(a,b,c) infallibleAppendSubstring(a,b,c, bool taint = true)
#define TAINT_SB_INFAPPENDSUBSTRING_DEF(a,b,c) infallibleAppendSubstring(a,b,c, bool taint)
#define TAINT_SB_APPENDSUBSTRING_DECL(a,b,c) appendSubstring(a,b,c, bool taint = true)
#define TAINT_SB_APPENDSUBSTRING_DEF(a,b,c) appendSubstring(a,b,c, bool taint)
#define TAINT_SB_APPENDSUBSTRING_CALL(a,b,c) appendSubstring(a,b,c,taint)
#define TAINT_SB_APPENDSUBSTRING_ARG(a,b,c) sb.appendSubstring(a,b,c,false)



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
#define TAINT_REF_TAINT_ATOM_CLEARCOPY(str, base) (str)
#define TAINT_REF_COPYCLEAR(str, base) (str)
#define TAINT_ATOM_CLEARCOPY(str, base) (str)

#define TAINT_QUOTE_STRING_CALL(a,b,c) QuoteString(a,b,c)
#define TAINT_QUOTE_STRING_CALL_NULL(a,b,c) QuoteString(a,b,c)
#define TAINT_QUOTE_STRING_CALL_PASS(a,b,c,d) QuoteString(a,b,c,d)

#define TAINT_ESCAPE_CALL(a,b,c,d) Escape(a,b,c,d)

#define TAINT_JSON_PARSE_CALL(a,b,c,d,str) ParseJSONWithReviver(a,b,c,d)
#define TAINT_JSON_PARSE_CALL_NULL(a,b,c,d) ParseJSONWithReviver(a,b,c,d);
#define TAINT_JSON_EVAL_CALL(a,b,c) ParseEvalStringAsJSON(a,b,c)
#define TAINT_JSON_PARSE_DEF(a,b,c,d) ParseJSONWithReviver(a,b,c,d)

#define TAINT_MARK_MATCH(str, regex) (str)
#define TAINT_MARK_REPLACE_RAW(str, re) (str)
#define TAINT_MARK_REPLACE(str) (str)

#define TAINT_SB_APPENDSUBSTRING_DECL(a,b,c) appendSubstring(a,b,c)
#define TAINT_SB_INFAPPENDSUBSTRING_DECL(a,b,c) infallibleAppendSubstring(a,b,c)
#define TAINT_SB_APPENDSUBSTRING_DEF(a,b,c) appendSubstring(a,b,c)
#define TAINT_SB_INFAPPENDSUBSTRING_DEF(a,b,c) infallibleAppendSubstring(a,b,c)
#define TAINT_SB_APPENDSUBSTRING_CALL(a,b,c) appendSubstring(a,b,c)
#define TAINT_SB_APPEND_DECL(a) append(a)
#define TAINT_SB_APPEND_DEF(a) append(a)
#define TAINT_SB_APPEND_CALL(a) append(a)
#define TAINT_SB_APPENDSUBSTRING_ARG(a,b,c) sb.appendSubstring(a,b,c)

#define TAINT_UNESCAPE_DEF(a,b) Unescape(a,b)
#define TAINT_UNESCAPE_CALL(a,b) Unescape(a,b)
#define TAINT_UNESCAPE_MATCH(k) (void)0;

#define TAINT_ENCODE_CALL(a,b,c,d,e) Encode(a,b,c,d,e)
#define TAINT_ENCODE_DEF(a,b,c,d,e) Encode(a,b,c,d,e)

#define TAINT_DECODE_CALL(a,b,c,d) Decode(a,b,c,d)
#define TAINT_DECODE_DEF(a,b,c,d) Decode(a,b,c,d)

#endif


#endif
