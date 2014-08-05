#ifndef taint_h
#define taint_h

#ifdef _TAINT_ON_

#include "jsapi.h"

typedef struct TaintNode
{
    const char *op;
    uint32_t refCount;
    JS::Heap<JS::Value> param;
    struct TaintNode *prev;

    TaintNode(const char* opname) :
        op(opname),
        refCount(0),
        param(),
        prev(nullptr)
    {}

    void decrease();
    inline void increase() {
        this->refCount++;
    }

    inline void setPrev(TaintNode *other) {
        if(this->prev) {
            this->prev->decrease();
        }
        if(other) {
            other->increase();
        }
        this->prev = other;
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
        if(this->thisTaint) {
            this->thisTaint->decrease();
        }

        if(node) {
            node->increase();
        }
        this->thisTaint = node;
    }
} TaintStringRef;


//-------
// augmentation defs and functions

//basic creator
// this is not meant to be used throughout the codebase
#define TAINT_ADD_NODE(str, name, begin, end) \
TaintNode *taint_node=taint_str_add_source_node(name);\
str->addNewTaintRef(begin, end, taint_node);

//set a (new) source, this includes resetting all previous taint
// use for all sources
//TODO: add this to the public JSAPI exports
#define TAINT_SET_SOURCE(str, name, begin, end) \
{\
    str->removeAllTaint();\
    TAINT_ADD_NODE(str, name, begin, end)\
}
#define TAINT_SET_SOURCE_ALL(str, name) \
{\
    str->removeAllTaint();\
    TAINT_ADD_NODE(str, name, 0, str->length())\
}

//mutator/function call
// use, when same string is used in and out to record a specific mutator
// has been called
// -- apparrently there is no shortcut for default/undefined Value handles...
#define TAINT_MUTATOR_ADD_ALL(str, name) \
{\
    if(str->isTainted()) {\
        taint_str_add_all_node(str, name, JS::UndefinedHandleValue);\
    }\
}
#define TAINT_MUTATOR_ADD_ALL_PARAM(str, name, param) \
{\
    if(str->isTainted()) {\
        taint_str_add_all_node(str, name, param);\
    }\
}

//copy reference to another string (with offset)
/*#define TAINT_MIRROR(dstr, srcstr) \
{\
    taint_str_mirror_offset();
}*/

//
//TODO: maybe check/assert that indices do not overlap
/*
{\
    TAINT_ADD_NODE(str, name, begin, end)\
}
#define TAINT_MUTATOR_ADD_(str, name, begin, end, param) \
{\
    TAINT_ADD_NODE(str, name, begin, end)\
    taint_node->param=param;\
}*/

//duplicate all References but keep the old Nodes and add a new one to all Refs
//this is to be used on manipulators which create a new string
    /*
#define TAINT_APPLY_ALL_ADD(dststr, srcstr, name) \
{\
    taint_str_apply(dststr, srcstr);\
    taint_str_add_all_node(dstr, name);\
}
#define TAINT_APPLY_ALL_ADD_PARAM(dststr, srcstr, name, param) \
{\
    taint_str_apply_all(dststr, srcstr);\
    taint_str_add_all_node(dstr, name, param);\
}*/

inline TaintNode*
taint_str_add_source_node(const char *fn)
{
    void *p = js_malloc(sizeof(TaintNode));
    TaintNode *node = new (p) TaintNode(fn);
    return node;
}

//----------
//"backend" defs and functions

#define TAINT_ADD_JSSTR_METHODS \
JS_FN("untaint",                taint_str_untaint,              0,JSFUN_GENERIC_NATIVE),\
JS_FN("mutateTaint",            taint_str_testmutator,          0,JSFUN_GENERIC_NATIVE),

#define TAINT_ADD_JSSTR_STATIC_METHODS \
JS_FN("newAllTainted",          taint_str_newalltaint,          1,0),

#define TAINT_ADD_JSSTR_PROPS \
JS_PSG("taint",                 taint_str_prop,                 JSPROP_PERMANENT),

inline void *taint_new_taintref_mem() {
    return js_malloc(sizeof(TaintStringRef));
}

bool taint_str_newalltaint(JSContext *cx, unsigned argc, JS::Value *vp);
bool taint_str_prop(JSContext *cx, unsigned argc, JS::Value *vp);
bool taint_str_untaint(JSContext *cx, unsigned argc, JS::Value *vp);
bool taint_str_testmutator(JSContext *cx, unsigned argc, JS::Value *vp);
void taint_str_apply_all(JS::HandleString dststr, JS::HandleString srcstr);
void taint_str_add_all_node(JS::HandleString dststr, const char* name, JS::HandleValue param);

#endif

#endif