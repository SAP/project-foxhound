#ifndef taint_h
#define taint_h

#ifdef _TAINT_ON_

#include "jsapi.h"

typedef struct TaintNode
{
    const char *op;
    uint32_t refCount;
    JS::Heap<JS::Value> param1;
    JS::Heap<JS::Value> param2;
    struct TaintNode *prev;

    TaintNode(const char* opname) :
        op(opname),
        refCount(0),
        param1(),
        param2(),
        prev(nullptr)
    {}

    void decrease();
    inline void increase() {
        refCount++;
    }

    inline void setPrev(TaintNode *other) {
        if(prev) {
            prev->decrease();
        }
        if(other) {
            other->increase();
        }
        prev = other;
    }
} TaintNode;

typedef struct TaintStringRef
{
    uint32_t begin;
    uint32_t end;
    TaintNode *thisTaint;
    struct TaintStringRef *next;

    TaintStringRef() : begin(0), end(0), thisTaint(NULL), next(NULL) {};
    TaintStringRef(uint32_t s, uint32_t e, TaintNode* node = nullptr);
    TaintStringRef(const TaintStringRef &ref);
    ~TaintStringRef();

    inline void attachTo(TaintNode *node) {
        if(thisTaint) {
            thisTaint->decrease();
        }

        if(node) {
            node->increase();
        }
        
        thisTaint = node;
    }
} TaintStringRef;

//------------------------------
//"backend" defs and functions
//use this functionality at own risk and just in special cases
//not handled below

#define TAINT_ADD_JSSTR_METHODS \
JS_FN("untaint",                taint_str_untaint,              0,JSFUN_GENERIC_NATIVE),\
JS_FN("mutateTaint",            taint_str_testmutator,          0,JSFUN_GENERIC_NATIVE),

#define TAINT_ADD_JSSTR_STATIC_METHODS \
JS_FN("newAllTainted",          taint_str_newalltaint,          1,0),

#define TAINT_ADD_JSSTR_PROPS \
JS_PSG("taint",                 taint_str_prop,                 JSPROP_PERMANENT),

#define TAINT_STR_INIT \
    d.u0.startTaint = nullptr;

#define TAINT_ROPE_INIT \
    TAINT_STR_INIT \
    taint_str_concat(this, left, right);

#define TAINT_DEPSTR_INIT \
    TAINT_STR_INIT \
    if(base->isTainted()) \
        taint_str_substr(this, cx->asExclusiveContext(), base, start, length);

#define TAINT_FATINLINE_INIT \
    if(base->isTainted()) \
        taint_str_substr(s, cx, base, start, length);

//skip static string optimizations
#define TAINT_GETELEM_SKIPSTATIC_ASM(target) \
    masm.jump(target);

//merge references after initializing the taint pointer
#define TAINT_STR_ASM_CONCAT(masm, out, lhs, rhs) \
{ \
    RegisterSet taintSaveRegs = RegisterSet::Volatile(); \
    masm.storePtr(ImmPtr(nullptr), Address(out, JSString::offsetOfTaint())); \
    masm.PushRegsInMask(taintSaveRegs); \
    masm.setupUnalignedABICall(3, temp1); \
    masm.passABIArg(out); \
    masm.passABIArg(lhs);\
    masm.passABIArg(rhs); \
    masm.callWithABI(JS_FUNC_TO_DATA_PTR(void *, taint_str_concat)); \
    masm.PopRegsInMask(taintSaveRegs); \
}

//quote special call manipulation
#define TAINT_QUOTE_STRING_CALL(a,b,c) QuoteString(a,b,c,&targetref)
#define TAINT_QUOTE_STRING_CALL_NULL(a,b,c) QuoteString(a,b,c,nullptr)
#define TAINT_QUOTE_STRING_CALL_PASS(a,b,c,d) QuoteString(a,b,c,d,targetref,linear->getTopTaintRef())
#define TAINT_QUOTE_STRING_DEF(a,b,c) QuoteString(a,b,c,TaintStringRef **targetref)
#define TAINT_QUOTE_STRING_DEF_INNER(a,b,c,d) QuoteString(a,b,c,d,TaintStringRef **targetref, TaintStringRef *sourceref)
#define TAINT_QUOTE_STRING_PRE \
    TaintStringRef *current_tsr = sourceref; \
    TaintStringRef *target_last_tsr = nullptr; \
    const CharT *s_start = s; \
    if(targetref) \
        target_last_tsr = *targetref;
#define TAINT_QUOTE_STRING_MATCH \
    current_tsr = taint_copy_until(&target_last_tsr, current_tsr, t - s_start, sp->getOffset() + (t - s)); \
    if(targetref && *targetref == nullptr && target_last_tsr != nullptr) \
        *targetref = target_last_tsr;
#define TAINT_QUOTE_STRING_VAR \
    TaintStringRef *targetref = nullptr;
#define TAINT_QUOTE_STRING_APPLY \
    res->addTaintRef(targetref); \
    taint_str_add_all_node(res, "quote");

#define TAINT_ESCAPE_DEF(a,b,c,d) Escape(a,b,c,d,TaintStringRef **targetref, TaintStringRef *sourceref)
#define TAINT_ESCAPE_CALL(a,b,c,d) Escape(a,b,c,d,&targetref,str->getTopTaintRef())
#define TAINT_ESCAPE_PRE \
    TaintStringRef *current_tsr = sourceref; \
    TaintStringRef *target_last_tsr = nullptr; \
    if(targetref) \
        target_last_tsr = *targetref; //TODO maybe this is wrong? not the last but first tsr?
#define TAINT_ESCAPE_MATCH \
    current_tsr = taint_copy_until(&target_last_tsr, current_tsr, i, ni); \
    if(targetref && *targetref == nullptr && target_last_tsr != nullptr) \
        *targetref = target_last_tsr;
#define TAINT_ESCAPE_VAR TAINT_QUOTE_STRING_VAR
#define TAINT_ESCAPE_APPLY \
    res->addTaintRef(targetref); \
    taint_str_add_all_node(res, "escape");


#define TAINT_MARK_MATCH(str, regex) \
({ \
    bool bres = str; \
    RootedValue patVal(cx, StringValue(g.regExp().getSource())); \
    JSObject *obj = (JSObject*)args.rval().get().toObjectOrNull(); \
    if(!obj) \
        return bres; \
    for(uint32_t ki = 0; ki < obj->getDenseCapacity(); ki++) { \
        RootedValue resultIdx(cx, INT_TO_JSVAL(ki)); \
        taint_str_add_all_node(obj->getDenseElement(ki).toString(), "match", patVal, resultIdx); \
    } \
    bres; \
})

#define TAINT_MARK_REPLACE(str) \
({ \
    bool bres = str; \
    RootedValue regexVal(cx, args[0]); \
    RootedValue replaceVal(cx, args[1]); \
    taint_str_add_all_node(args.rval().get().toString(), "replace", regexVal, replaceVal); \
    bres; \
})

#define TAINT_MARK_REPLACE_RAW(str, re) \
({ \
    bool bres = str; \
    RootedValue regexVal(cx, re); \
    RootedValue replaceVal(cx, StringValue(replacement)); \
    taint_str_add_all_node(rval.get().toString(), "replace", regexVal, replaceVal); \
    bres; \
})

#define TAINT_MARK_SPLIT \
    RootedValue splitVal(cx, args[0]); \
    for(uint32_t ki = 0; ki < aobj->getDenseInitializedLength(); ki++) { \
        RootedValue resultIdx(cx, INT_TO_JSVAL(ki)); \
        taint_str_add_all_node(aobj->getDenseElement(ki).toString(), "split", splitVal, resultIdx); \
    }

#define TAINT_JSON_PARSE_CALL(a,b,c,d, str) ParseJSONWithReviver(a,b,c,d, str->getTopTaintRef())
#define TAINT_JSON_PARSE_CALL_NULL(a,b,c,d) ParseJSONWithReviver(a,b,c,d, nullptr);
#define TAINT_JSON_PARSE_DEF(a,b,c,d) ParseJSONWithReviver(a,b,c,d, TaintStringRef *ref)
#define TAINT_JSON_EVAL_CALL(a,b,c) ParseEvalStringAsJSON(a,b,c, str->getTopTaintRef())
#define TAINT_JSON_EVAL_DEF(a,b,c) ParseEvalStringAsJSON(a,b,c,TaintStringRef *ref)
#define TAINT_JSON_PARSE_PRE \
    TaintStringRef *current_tsr = sourceRef; \
    TaintStringRef *target_first_tsr = nullptr; \
    TaintStringRef *target_last_tsr = nullptr; \
    const CharPtr s_start = current;
#define TAINT_JSON_PARSE_OPT \
    current_tsr = taint_copy_until(&target_last_tsr, current_tsr, current - s_start, current - start); \
    if(target_first_tsr == nullptr && target_last_tsr != nullptr) \
        target_first_tsr = target_last_tsr;
#define TAINT_JSON_PARSE_MATCH \
    current_tsr = taint_copy_until(&target_last_tsr, current_tsr, current - s_start, buffer.length() + (size_t)(current - start)); \
    if(target_first_tsr == nullptr && target_last_tsr != nullptr) \
        target_first_tsr = target_last_tsr;
#define TAINT_JSON_PARSE_APPLY \
    str->addTaintRef(target_first_tsr); \
    taint_str_add_all_node(str, "JSON.parse");
    

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
    TaintStringRef *target_first_tsr = nullptr; \
    TaintStringRef *target_last_tsr = nullptr;
#define TAINT_JSON_QUOTE_MATCH(k, off) \
    current_tsr = taint_copy_until(&target_last_tsr, current_tsr, k, sb.length() + off); \
    if(target_first_tsr == nullptr && target_last_tsr != nullptr) \
        target_first_tsr = target_last_tsr;
#define TAINT_JSON_QUOTE_APPLY \
    sb.addTaintRef(target_first_tsr);



//#define 

/*
#define TAINT_CHAR_SPLIT_MARK \
    RootedValue markEmpty(cx, StringValue(cx->runtime()->emptyString)); \
    taint_str_add_all_node(sub, "split", markEmpty); */


TaintStringRef *taint_str_taintref_build();
TaintStringRef *taint_str_taintref_build(TaintStringRef &ref);
TaintStringRef *taint_str_taintref_build(uint32_t begin, uint32_t end, TaintNode *node);
void taint_str_remove_taint_all(TaintStringRef **start, TaintStringRef **end);
bool taint_str_newalltaint(JSContext *cx, unsigned argc, JS::Value *vp);
bool taint_str_prop(JSContext *cx, unsigned argc, JS::Value *vp);
bool taint_str_untaint(JSContext *cx, unsigned argc, JS::Value *vp);
bool taint_str_testmutator(JSContext *cx, unsigned argc, JS::Value *vp);
JSString* taint_str_add_all_node(JSString *dststr, const char* name,
    JS::HandleValue param1 = JS::UndefinedHandleValue, JS::HandleValue param2 = JS::UndefinedHandleValue);
TaintStringRef *taint_copy_until(TaintStringRef **target, TaintStringRef *source, size_t sidx, size_t tidx);

//special cases
void taint_str_concat(JSString *dst, JSString *lhs, JSString *rhs);

//-----------------------------------
// tag defs and functions

//set a (new) source, this includes resetting all previous taint
// use for all sources
//TODO: add this to the public JSAPI exports
void taint_tag_source(JSString * str, const char* name, 
    uint32_t begin = 0, uint32_t end = 0);

//mutator/function call
template <typename TaintedT>
TaintedT *taint_str_copy_taint(TaintedT *dst, TaintStringRef *src,
    uint32_t frombegin, int32_t offset, uint32_t fromend);

JSString *taint_str_substr(JSString *str, js::ExclusiveContext *cx, JSString *base,
    uint32_t start, uint32_t length);

#define TAINT_STR_COPY(str, base) \
    taint_str_copy_taint((str), base->getTopTaintRef(), 0, 0, 0)
#define TAINT_REF_COPY(str, ref) \
    taint_str_copy_taint((str), ref, 0, 0, 0)
#define TAINT_REF_COPYCLEAR(str, ref) \
({ \
    JSString *res = TAINT_REF_COPY(str, ref); \
    taint_str_remove_taint_all(&ref); \
    res; \
})


#define TAINT_ATOM_CLEARCOPY(str, base) \
({ \
    JSAtom *res = (str); \
    res->removeAllTaint(); \
    taint_str_copy_taint(res, base->getTopTaintRef(), 0, 0, 0); \
    res;\
})


// use, when same string is used in and out to record a specific mutator
// has been called
inline void taint_tag_mutator(JSString * str, const char *name, 
    JS::HandleValue param1 = JS::UndefinedHandleValue, JS::HandleValue param2 = JS::UndefinedHandleValue)
{
    taint_str_add_all_node(str, name, param1, param2);
}

// use, when a propagator creates a new string with partly tainted contents
// located at an offset
JSString* taint_tag_propagator(JSString * dststr, JSString * srcstr,
    const char *name, int32_t offset = 0, JS::HandleValue param1 = JS::UndefinedHandleValue,
    JS::HandleValue param2 = JS::UndefinedHandleValue);
#else

#define TAINT_STR_COPY(str, base) (str)
#define TAINT_REF_COPY(str, ref) (str)
#define TAINT_REF_TAINT_ATOM_CLEARCOPY(str, base) (str)
#define TAINT_REF_COPYCLEAR(str, base) (str)

#define TAINT_JSON_PARSE_CALL(a,b,c,d) ParseJSONWithReviver(a,b,c,d)
#define TAINT_JSON_EVAL_DEF(a,b,c) ParseEvalStringAsJSON(a,b,c)
#define TAINT_SB_APPENDSUBSTRING_DECL(a,b,c) appendSubstring(a,b,c)
#define TAINT_SB_INFAPPENDSUBSTRING_DECL(a,b,c) infallibleAppendSubstring(a,b,c)
#define TAINT_SB_APPENDSUBSTRING_DEF(a,b,c) appendSubstring(a,b,c)
#define TAINT_SB_INFAPPENDSUBSTRING_DEF(a,b,c) infallibleAppendSubstring(a,b,c)
#define TAINT_SB_APPENDSUBSTRING_CALL(a,b,c) appendSubstring(a,b,c)
#define TAINT_SB_APPEND_DECL(a) append(a)
#define TAINT_SB_APPEND_DEF(a) append(a)
#define TAINT_SB_APPEND_CALL(a) append(a)
#define TAINT_SB_APPENDSUBSTRING_ARG(a,b,c) sb.appendSubstring(a,b,c)

#endif


#endif