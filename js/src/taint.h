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

TaintStringRef *taint_str_taintref_build(TaintStringRef &ref);
TaintStringRef *taint_str_taintref_build(uint32_t begin, uint32_t end, TaintNode *node);
void taint_str_remove_taint_all(JSString *str);
bool taint_str_newalltaint(JSContext *cx, unsigned argc, JS::Value *vp);
bool taint_str_prop(JSContext *cx, unsigned argc, JS::Value *vp);
bool taint_str_untaint(JSContext *cx, unsigned argc, JS::Value *vp);
bool taint_str_testmutator(JSContext *cx, unsigned argc, JS::Value *vp);
void taint_str_add_all_node(JSString *dststr, const char* name,
    JS::HandleValue param1 = JS::UndefinedHandleValue, JS::HandleValue param2 = JS::UndefinedHandleValue);

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
void taint_str_copy_taint(JSString *dststr, JSString *srcstr,
    uint32_t frombegin = 0, uint32_t offset = 0, uint32_t fromend = 0);
void taint_str_substr(JSString *str, js::ExclusiveContext *cx, JSString *base,
    uint32_t start, uint32_t length);

// use, when same string is used in and out to record a specific mutator
// has been called
inline void taint_tag_mutator(JSString * str, const char *name, 
    JS::HandleValue param1 = JS::UndefinedHandleValue, JS::HandleValue param2 = JS::UndefinedHandleValue)
{
    taint_str_add_all_node(str, name, param1, param2);
}

// use, when a propagator creates a new string with partly tainted contents
// located at an offset
inline void taint_tag_propagator(JSString * dststr, JSString * srcstr,
    const char *name, uint32_t offset = 0, JS::HandleValue param1 = JS::UndefinedHandleValue,
    JS::HandleValue param2 = JS::UndefinedHandleValue)
{
    taint_str_copy_taint(dststr, srcstr, 0, offset);
    taint_str_add_all_node(dststr, name, param1, param2);
}

#endif

#endif