#ifdef _TAINT_ON_

#include "jsapi.h"
#include "jsstr.h"

#include "jsarray.h"
#include "taint.h"

using namespace js;

//------------------------------------
// Local helpers

inline void*
taint_new_tainref_mem()
{
    return js_malloc(sizeof(TaintStringRef));
}

inline TaintNode*
taint_str_add_source_node(const char *fn)
{
    void *p = js_malloc(sizeof(TaintNode));
    TaintNode *node = new (p) TaintNode(fn);
    return node;
}

//----------------------------------
// Reference Node

void
TaintNode::decrease()
{
    //decrease/remove us and our ancestors
    for(TaintNode *old = this; old != nullptr;) {
        TaintNode *prev = old->prev;
        old->refCount--;
        if(old->refCount == 0) {
            js_free(old);
            old = prev;
            continue;
        }
        else
            break;
    }
}


//--------------------------------------
// String Taint Reference

TaintStringRef::TaintStringRef(uint32_t s, uint32_t e, TaintNode* node) :
    begin(s),
    end(e),
    thisTaint(nullptr),
    next(nullptr)
{

/*
#ifdef DEBUG
    JS_SetGCZeal(cx, 2, 1);
#endif*/

    if(node)
        attachTo(node);
    
}

TaintStringRef::TaintStringRef(const TaintStringRef &ref) :
    begin(ref.begin),
    end(ref.end),
    thisTaint(nullptr),
    next(nullptr)
{
    if(ref.thisTaint)
        attachTo(ref.thisTaint);
}

TaintStringRef::~TaintStringRef()
{
    if(thisTaint) {
        thisTaint->decrease();
        thisTaint = nullptr;
    }
}

//------------------------------------------------
// Library Test/Debug functions

bool
taint_str_testmutator(JSContext *cx, unsigned argc, JS::Value *vp)
{
    CallArgs args = CallArgsFromVp(argc, vp);
    RootedString str(cx, ToString<CanGC>(cx, args.thisv()));
    if(!str)
        return false;

    RootedValue param(cx, StringValue(NewStringCopyZ<CanGC>(cx, "String parameter")));
    taint_tag_mutator_const(str, "Mutation with param", param);
    taint_tag_mutator_const(str, "Mutation w/o param");

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

    args.rval().setUndefined();
    return true;
}

bool
taint_str_newalltaint(JSContext *cx, unsigned argc, Value *vp)
{
    CallArgs args = CallArgsFromVp(argc, vp);
    RootedString str(cx, ToString<CanGC>(cx, args[0]));
    if(!str)
        return false;

    RootedString taintedStr(cx);
    {
        AutoCheckCannotGC nogc;
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

    taint_tag_source(taintedStr, "Manual taint source");

    args.rval().setString(taintedStr);
    return true;
}

//----------------------------------
// Taint reporter

bool
taint_str_prop(JSContext *cx, unsigned argc, Value *vp)
{
    CallArgs args = CallArgsFromVp(argc, vp);
    RootedString str(cx, ToString<CanGC>(cx, args.thisv()));
    if(!str)
        return false;

    AutoValueVector taints(cx);
    for(TaintStringRef *cur = str->getTopTaintRef(); cur != nullptr; cur = cur->next) {
        RootedObject obj(cx, JS_NewObject(cx, nullptr, JS::NullPtr(), JS::NullPtr()));

        if(!obj)
            return false;

        if(!JS_DefineProperty(cx, obj, "begin", cur->begin, JSPROP_READONLY | JSPROP_ENUMERATE | JSPROP_PERMANENT) ||
           !JS_DefineProperty(cx, obj, "end", cur->end, JSPROP_READONLY | JSPROP_ENUMERATE | JSPROP_PERMANENT))
            return false;

        AutoValueVector taintchain(cx);
        for(TaintNode* curnode = cur->thisTaint; curnode != nullptr; curnode = curnode->prev) {
            RootedObject taintobj(cx, JS_NewObject(cx, nullptr, JS::NullPtr(), JS::NullPtr()));
            RootedString opnamestr(cx, NewStringCopyZ<CanGC>(cx, curnode->op));
            RootedValue opname(cx, StringValue(opnamestr));
            RootedValue paramval(cx, curnode->param);

            if(!taintobj)
                return false;

            if(!JS_DefineProperty(cx, taintobj, "op", opname, JSPROP_READONLY | JSPROP_ENUMERATE | JSPROP_PERMANENT))
                return false;

            //param is optional
            JS_DefineProperty(cx, taintobj, "param", paramval, JSPROP_READONLY | JSPROP_ENUMERATE | JSPROP_PERMANENT);

            if(!taintchain.append(ObjectValue(*taintobj)))
                return false;
        }

        RootedObject taintarray(cx, (JSObject*)NewDenseCopiedArray(cx, taintchain.length(), taintchain.begin()));
        RootedValue taintarrvalue(cx, ObjectValue(*taintarray));
        if(!JS_DefineProperty(cx, obj, "operators", taintarrvalue, JSPROP_READONLY | JSPROP_ENUMERATE | JSPROP_PERMANENT))
            return false;

        if(!taints.append(ObjectValue(*obj)))
            return false;
    }

    JSObject *retarr = (JSObject*)NewDenseCopiedArray(cx, taints.length(), taints.begin());
    args.rval().setObject(*retarr);
    return true;
}

//-----------------------------
// Tagging functions

void taint_tag_mutator_const(HandleString str, const char *name, HandleValue param)
{
    if(str->isTainted()) {
        taint_str_add_all_node(str, name, param);
    }
}

void taint_tag_source(JS::HandleString str, const char* name, uint32_t begin, uint32_t end)
{
    if(end == 0)
        end = str->length();

    if(str->isTainted()) {
        str->removeAllTaint();
    }
    
    TaintNode *taint_node = taint_str_add_source_node(name);
    str->addNewTaintRef(begin, end, taint_node);
}

void
taint_str_apply_all(JS::HandleString dststr, JS::HandleString srcstr)
{
    //duplicate all refs (keep references to Nodes)
    TaintStringRef *newchainlast = nullptr;
    for(TaintStringRef *tsr = srcstr->getTopTaintRef(); tsr != nullptr; tsr = tsr->next)
    {
        TaintStringRef *newtsr = taint_str_taintref_build(*tsr);

        //add the first element directly to the string
        //all others will be appended to it
        if(!newchainlast) {
            dststr->addTaintRef(newtsr);
            newchainlast = newtsr;
        } else {
            newchainlast->next = newtsr;
        }
    }
}

void
taint_str_add_all_node(JS::HandleString dststr, const char* name, JS::HandleValue param)
{
    //add a new node to all references
    //TODO: this might install duplicates if multiple parts of the string derive from the same tree
    for(TaintStringRef *tsr = dststr->getTopTaintRef(); tsr != nullptr; tsr = tsr->next)
    {
        TaintNode *taint_node = taint_str_add_source_node(name);
        //attach new node before changing the string ref as this would delete the old node
        taint_node->setPrev(tsr->thisTaint);
        taint_node->param = param;
        tsr->attachTo(taint_node);
    }
}


TaintStringRef*
taint_str_taintref_build(uint32_t begin, uint32_t end, TaintNode *node)
{
    void *p = taint_new_tainref_mem();
    return new (p) TaintStringRef(begin, end, node);
}

TaintStringRef*
taint_str_taintref_build(TaintStringRef &ref)
{
    void *p = taint_new_tainref_mem();
    return new (p) TaintStringRef(ref);
}


void
taint_str_remove_taint_all(JSString *str)
{
    for(TaintStringRef *tsr = str->getTopTaintRef(); tsr != nullptr; ) {
        TaintStringRef *next = tsr->next;
        tsr->~TaintStringRef();
        js_free(tsr);
        tsr = next;
    }

    str->addTaintRef(nullptr, false);
}

#endif