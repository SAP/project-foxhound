#ifdef _TAINT_ON_

#include "jsapi.h"
#include "jsstr.h"
#include "vm/StringBuffer.h"

#include "jsarray.h"
#include "taint-private.h"

using namespace js;

//------------------------------------
// Local helpers

#define MAX(x,y) ((x) >= (y) ? x : y)
#define MIN(x,y) ((x) <= (y) ? x : y)

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
        if(old->refCount > 0)
            break;
        
        js_free(old);
        old = prev;
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
taint_str_testop(JSContext *cx, unsigned argc, Value *vp)
{
    CallArgs args = CallArgsFromVp(argc, vp);
    RootedString str(cx, ToString<CanGC>(cx, args.thisv()));
    if(!str)
        return false;

    RootedValue param(cx, StringValue(NewStringCopyZ<CanGC>(cx, "String parameter")));
    taint_add_op(str->getTopTaintRef(), "Mutation with params", param, param);
    taint_add_op(str->getTopTaintRef(), "Mutation w/o param");

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
            RootedValue param1val(cx, curnode->param1);
            RootedValue param2val(cx, curnode->param2);

            if(!taintobj)
                return false;

            if(!JS_DefineProperty(cx, taintobj, "op", opname, JSPROP_READONLY | JSPROP_ENUMERATE | JSPROP_PERMANENT))
                return false;

            //param is optional
            JS_DefineProperty(cx, taintobj, "param1", param1val, JSPROP_READONLY | JSPROP_ENUMERATE | JSPROP_PERMANENT);
            JS_DefineProperty(cx, taintobj, "param2", param2val, JSPROP_READONLY | JSPROP_ENUMERATE | JSPROP_PERMANENT);

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

//reset the taint of a string and a new taintstringref with a source
void
taint_tag_source(JSString *str, const char* name, uint32_t begin, uint32_t end)
{
    if(end == 0)
        end = str->length();

    if(str->isTainted()) {
        str->removeAllTaint();
    }
    
    TaintNode *taint_node = taint_str_add_source_node(name);
    TaintStringRef *newtsr = taint_str_taintref_build(begin, end, taint_node);
    str->addTaintRef(newtsr);
}

//duplicate all taintstringrefs form a string to another
//and point to the same nodes (shallow copy)
template <typename TaintedT>
TaintedT *taint_copy_range(TaintedT *dst, TaintStringRef *src,
    uint32_t frombegin, int32_t offset, uint32_t fromend)
{
    JS_ASSERT(dst && src);

    TaintStringRef *newchainlast = nullptr;
/*
    //look for the currect insertion point in dst
    for(TaintStringRef *itr = dst->getTopTaintRef(); 
        itr != nullptr && itr->end <= offset;
        itr = itr->next) {

        newchainlast = itr;
    } */
    
    for(TaintStringRef *tsr = src; tsr; tsr = tsr->next)
    {
        if(tsr->end <= frombegin || (fromend > 0 && tsr->begin >= fromend))
            continue;

        uint32_t begin = MAX(frombegin, tsr->begin);
        uint32_t end   = (fromend > 0 ? MIN(tsr->end, fromend) : tsr->end);
        
        TaintStringRef *newtsr = taint_str_taintref_build(*tsr);
        newtsr->begin = begin - frombegin + offset;
        newtsr->end   = end - frombegin + offset;

        //add the first element directly to the string
        //all others will be appended to it
        if(!newchainlast)
            dst->addTaintRef(newtsr);
        else
            newchainlast->next = newtsr;

        newchainlast = newtsr;
    }

    return dst;
}
template JSFlatString* taint_copy_range<JSFlatString>(JSFlatString *dst, TaintStringRef *src,
    uint32_t frombegin, int32_t offset, uint32_t fromend);
template JSAtom* taint_copy_range<JSAtom>(JSAtom *dst, TaintStringRef *src,
    uint32_t frombegin, int32_t offset, uint32_t fromend);
template JSInlineString* taint_copy_range<JSInlineString>(JSInlineString *dst, TaintStringRef *src,
    uint32_t frombegin, int32_t offset, uint32_t fromend);
template StringBuffer* taint_copy_range<StringBuffer>(StringBuffer *dst, TaintStringRef *src,
    uint32_t frombegin, int32_t offset, uint32_t fromend);

void taint_add_op_single(TaintStringRef *dst, const char* name, HandleValue param1, HandleValue param2)
{
    TaintNode *taint_node = taint_str_add_source_node(name);
    //attach new node before changing the string ref as this would delete the old node
    taint_node->setPrev(dst->thisTaint);
    taint_node->param1 = param1;
    taint_node->param2 = param2;
    dst->attachTo(taint_node);
}

//add a new node to all taintstringrefs on a string
void
taint_add_op(TaintStringRef *dst, const char* name, HandleValue param1, HandleValue param2)
{
    if(!dst)
        return;

    //TODO: this might install duplicates if multiple parts of the string derive from the same tree
    for(TaintStringRef *tsr = dst; tsr != nullptr; tsr = tsr->next)
    {
        taint_add_op_single(tsr, name, param1, param2);
    }
}

TaintStringRef *
taint_copy_exact(TaintStringRef **target, TaintStringRef *source, size_t sidx, size_t tidx)
{
    if(!source || !target)
        return nullptr;

    //we are in the same TSR, still
    if(*target) {
        if(sidx <= source->end) { //this will trigger len(str) times
            (*target)->end = tidx;
            if(sidx < source->end)
                return source;
        }

        //if we completed the last TSR advance the source pointer
        source = source->next;
    }

    //no new TSR currently pending or end of tsr chain -> no more taint to copy
    if(!source || sidx < source->begin)
        return source;

    //as we are called for every index
    //we can assume sidx is the smallest idx with sidx >= source->begin
    TaintStringRef *tsr = taint_str_taintref_build(*source);
    tsr->begin = tidx;
    tsr->end = tidx;

    if(*target) {
        (*target)->next = tsr;
    }
    *target = tsr;

    //return source so we get this for comparison later
    return source;
}

JSString *
taint_str_substr(JSString *str, js::ExclusiveContext *cx, JSString *base,
    uint32_t start, uint32_t length)
{
    if(!str)
        return nullptr;

    if(!base->isTainted())
        return str;

    uint32_t end = start + length;

    taint_copy_range(str, base->getTopTaintRef(), start, 0, end);
    TAINT_ITER_TAINTREF(str)
    {
        js::RootedValue startval(cx, INT_TO_JSVAL(tsr->begin + start));
        js::RootedValue endval(cx, INT_TO_JSVAL(tsr->end + start));
        taint_add_op_single(tsr, "substring", startval, endval);
    }
        
    return str;
}


//create a new taintstringref
TaintStringRef*
taint_str_taintref_build(uint32_t begin, uint32_t end, TaintNode *node)
{
    void *p = taint_new_tainref_mem();
    return new (p) TaintStringRef(begin, end, node);
}

//create (copy) a new taintstringref
TaintStringRef*
taint_str_taintref_build(TaintStringRef &ref)
{
    void *p = taint_new_tainref_mem();
    return new (p) TaintStringRef(ref);
}

TaintStringRef*
taint_str_taintref_build()
{
    void *p = taint_new_tainref_mem();
    return new (p) TaintStringRef();
}


//remove all taintref associated to a string
void
taint_remove_all(TaintStringRef **start, TaintStringRef **end)
{
    JS_ASSERT(end && start);

#if DEBUG
    bool found_end = false;
#endif

    for(TaintStringRef *tsr = *start; tsr != nullptr; ) {
#if DEBUG
        if(end && tsr == *end)
            found_end = true;
#endif
        TaintStringRef *next = tsr->next;
        tsr->~TaintStringRef();
        js_free(tsr);
        tsr = next;
    }

#if DEBUG
    JS_ASSERT(!(*end) || found_end);
#endif
    *start = nullptr;
    if(end)
        *end = nullptr;
}

JSString*
taint_copy_and_op(JSString * dststr, JSString * srcstr,
    const char *name, JS::HandleValue param1,
    JS::HandleValue param2)
{

    if(!srcstr->isTainted())
        return dststr;

    taint_copy_range(dststr, srcstr->getTopTaintRef(), 0, 0, 0);
    taint_add_op(dststr->getTopTaintRef(), name, param1, param2);

    return dststr;
}

//handle taint propagation for tainted strings
//TODO optimize for lhs == rhs
void
taint_str_concat(JSString *dst, JSString *lhs, JSString *rhs)
{
    if(lhs->isTainted())
        taint_copy_range(dst, lhs->getTopTaintRef(), 0, 0, 0);

    if(rhs->isTainted())
        taint_copy_range(dst, rhs->getTopTaintRef(), 0, lhs->length(), 0);

    //no need to add a taint node for concat as this does not
    //add any valuable information
    //taint_str_add_all_node(dstroot, "concat");
}

#endif