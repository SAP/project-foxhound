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
    MOZ_ASSERT((validate_tsr)->end > (validate_tsr)->begin); \
    MOZ_ASSERT((validate_tsr)->begin >= 0); \
    MOZ_ASSERT((uintptr_t)(validate_tsr) != (uintptr_t)0x4b4b4b4b4b4b4b4b);

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

//------------------------------------
// Local helpers
inline void
taint_delete_taintref(TaintStringRef *tsr)
{
    tsr->~TaintStringRef();
    js_free(tsr);
}

inline void*
taint_new_tainref_mem()
{
    return js_malloc(sizeof(TaintStringRef));
}

TaintNode*
taint_str_add_source_node(JSContext *cx, const char *fn)
{
    void *p = js_malloc(sizeof(TaintNode));
    TaintNode *node = new (p) TaintNode(cx, fn);
    return node;
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
taint_str_taintref_build(const TaintStringRef &ref)
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

static void
taint_tag_source_internal(HandleString str, const char* name,
    JSContext *cx = nullptr, uint32_t begin = 0, uint32_t end = 0)
{
    if(str->length() == 0)
        return;

    if(end == 0)
        end = str->length();

    if(str->isTainted()) {
        str->removeAllTaint();
    }
    
    TaintNode *taint_node = taint_str_add_source_node(cx, name);
    TaintStringRef *newtsr = taint_str_taintref_build(begin, end, taint_node);

    VALIDATE_NODE(newtsr);

    str->addTaintRef(newtsr);
}

//----------------------------------
// Reference Node

struct TaintNode::FrameStateElement
{
    FrameStateElement(const FrameIter &iter):
        state(iter), frame(nullptr), next(nullptr), prev(nullptr) {}

    //state is compiled into frame on first access
    SavedStacks::FrameState state;
    JS::Heap<JSObject*> frame;
    struct FrameStateElement *next;
    struct FrameStateElement *prev;
};

TaintNode::TaintNode(JSContext *cx, const char* opname) :
    op(opname),
    refCount(0),
    prev(nullptr),
    param1(UndefinedHandleValue),
    param2(UndefinedHandleValue),
    stack(nullptr)
{
    
    if(cx) {
        JS::AutoCheckCannotGC nogc;

        //this is in parts taken from SavedStacks.cpp
        //we need to split up their algorithm to fetch the stack WITHOUT causing GC
        //because we cannot guarantee that all pointer are marked for all calling locations
        //they will be compiled into GCthings later
        FrameIter iter(cx, FrameIter::ALL_CONTEXTS, FrameIter::GO_THROUGH_SAVED);
        FrameStateElement *last = nullptr;
        while(!iter.done()) {
            SavedStacks::AutoLocationValueRooter location(cx);
            {
                AutoCompartment ac(cx, iter.compartment());
                if (!cx->compartment()->savedStacks().getLocation(cx, iter, &location))
                    break;
            }

            FrameStateElement *e;
            {
                void *p = js_malloc(sizeof(FrameStateElement));
                e = new (p) FrameStateElement(iter);
            }
            e->state.location = location.get();

            e->next = last;
            if(last)
                last->prev = e;
            if(!stack)
                stack = e;
            last = e;
            

            ++iter;
        }
    }
}
    
void
TaintNode::compileFrame(JSContext *cx)
{
    //first compiled? all compiled!
    if(!stack || stack->frame)
        return;

    SavedStacks &sstack = cx->compartment()->savedStacks();

    //find last first
    FrameStateElement *last = stack;
    for(;last && last->prev; last = last->prev);
    MOZ_ASSERT(last);

    RootedSavedFrame frame(cx, nullptr);
    for(FrameStateElement *itr = last; itr != nullptr; itr = itr->next) {
        MOZ_ASSERT(!itr->frame);
        sstack.buildSavedFrame(cx, &frame, itr->state);
        MOZ_ASSERT(frame);
        itr->frame = frame;
    }
}

TaintNode::~TaintNode()
{
    if(stack) {
        for(FrameStateElement *itr = stack; itr != nullptr;) {
            FrameStateElement *n = itr->prev;
            //itr->~FrameStateElement();
            //js_free(itr);
            itr = n;
        }
        stack = nullptr;
    }
}

void TaintNode::markRefs(JSTracer *trc)
{
    gc::MarkValueUnbarriered(trc, param1.unsafeGet(), "TaintNode::param1");
    gc::MarkValueUnbarriered(trc, param2.unsafeGet(), "TaintNode::param2");
    if(stack) {
        for(FrameStateElement *itr = stack; itr != nullptr; itr = itr->prev) {
            itr->state.trace(trc);
            gc::MarkObjectUnbarriered(trc, itr->frame.unsafeGet(), "TaintNode::stack");
        }  
    }
}

void
TaintNode::decrease()
{
    //decrease/remove us and our ancestors
    for(TaintNode *old = this; old != nullptr;) {
        TaintNode *prev = old->prev;
        old->refCount--;
        if(old->refCount > 0)
            break;
        
        old->~TaintNode();
        js_free(old);

        old = prev;
    }
}

void
TaintNode::setPrev(TaintNode *other)
{
    MOZ_ASSERT(other != this);
    if(prev) {
        prev->decrease();
        prev = nullptr;
    }
    if(other) {
        other->increase();
    }
    prev = other;
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

void taint_addtaintref(TaintStringRef *tsr, TaintStringRef **start, TaintStringRef **end) {
    MOZ_ASSERT(start && end);

    VALIDATE_CHAIN(tsr);

    if(taint_istainted(start, end)) {
        if(!tsr) {
            taint_remove_all(start, end);
            return;
        }

        (*end)->next = tsr;
        (*end) = tsr;
    } else
        (*start) = (*end) = tsr;

    taint_ff_end(end);

    VALIDATE_CHAIN(*start);
}

void taint_ff_end(TaintStringRef **end) {
    MOZ_ASSERT(end);

    if(*end) {
        for(; (*end)->next != nullptr; (*end) = (*end)->next);
    }
}

void TaintStringRef::markNodeChain(JSTracer *trc)
{
    for(TaintNode *n = thisTaint; n != nullptr; n = n->prev) {
        n->markRefs(trc);
    }
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

    args.rval().setUndefined();
    return true;
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

    taint_tag_source_internal(taintedStr, "Manual taint source", cx);

    args.rval().setString(taintedStr);
    return true;
}

//----------------------------------
// Taint output

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
            RootedValue opname(cx, StringValue(NewStringCopyZ<CanGC>(cx, curnode->op)));
            RootedValue param1val(cx, curnode->param1);
            RootedValue param2val(cx, curnode->param2);
            RootedObject stackobj(cx);
            
            if(curnode->stack) {
                curnode->compileFrame(cx);
                stackobj = curnode->stack->frame;
            }
            
            JS_WrapValue(cx, &param1val);
            JS_WrapValue(cx, &param2val);
            if(!!stackobj)
                JS_WrapObject(cx, &stackobj);

            if(!taintobj)
                return false;

            if(!JS_DefineProperty(cx, taintobj, "op", opname, JSPROP_READONLY | JSPROP_ENUMERATE | JSPROP_PERMANENT))
                return false;

            //param is optional

            JS_DefineProperty(cx, taintobj, "param1", param1val, JSPROP_READONLY | JSPROP_ENUMERATE | JSPROP_PERMANENT);
            JS_DefineProperty(cx, taintobj, "param2", param2val, JSPROP_READONLY | JSPROP_ENUMERATE | JSPROP_PERMANENT);
            if(!!stackobj)
                JS_DefineProperty(cx, taintobj, "stack", stackobj, JSPROP_READONLY | JSPROP_ENUMERATE | JSPROP_PERMANENT);

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
// JSString handlers

static void
taint_add_op_single(TaintStringRef *dst, const char* name, JSContext *cx, HandleValue param1, HandleValue param2)
{
    MOZ_ASSERT((param1.isUndefined() && param2.isUndefined()) || cx,
        "JSContext is required when providing arguments to keep them alive.");

    VALIDATE_CHAIN(dst);

    JS::AutoCheckCannotGC nogc;

    //attach new node before changing the string ref as this would delete the old node
    TaintNode *taint_node = taint_str_add_source_node(cx, name);

    //we are setting a single op (should have a previous source op)
    MOZ_ASSERT(dst->thisTaint, "should have a source op before adding others");

    taint_node->setPrev(dst->thisTaint);
    taint_node->param1 = param1;
    taint_node->param2 = param2;
    dst->attachTo(taint_node);

    VALIDATE_CHAIN(dst);
}

void
taint_inject_substring_op(JSContext *cx, TaintStringRef *last, 
    uint32_t offset, uint32_t begin)
{
    MOZ_ASSERT(cx && last);

    //add an artificial substring operator, as there is no adequate call.
    //one taint_copy_range call can add multiple TaintRefs, we can find them
    //as they follow the "last" var captured _before_ the call
    for(TaintStringRef *tsr = last; tsr != nullptr; tsr = tsr->next)
    {
        RootedValue startval(cx, INT_TO_JSVAL(tsr->begin - offset + begin));
        RootedValue endval(cx, INT_TO_JSVAL(tsr->end - offset + begin));
        taint_add_op_single(tsr, "substring", cx, startval, endval);
    }

    VALIDATE_CHAIN(last);
}

//TODO optimize for lhs == rhs
void
taint_str_concat(JSContext *cx, JSString *dst, JSString *lhs, JSString *rhs)
{
    MOZ_ASSERT(dst && lhs && rhs);

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

    JS::AutoCheckCannotGC nogc;

    taint_copy_range(str, base->getTopTaintRef(), start, 0, end);
    for(TaintStringRef *tsr = str->getTopTaintRef(); tsr != nullptr; tsr = tsr->next)
    {
        startval = INT_TO_JSVAL(tsr->begin + start);
        endval = INT_TO_JSVAL(tsr->end + start);
        taint_add_op_single(tsr, "substring", cx, startval, endval);
    }
        
    return str;
}

//remove all taintref associated to a string
void
taint_remove_all(TaintStringRef **start, TaintStringRef **end)
{
    MOZ_ASSERT(end && start);

    VALIDATE_CHAIN(*start);

#if DEBUG
    bool found_end = false;
#endif

    for(TaintStringRef *tsr = *start; tsr != nullptr; ) {
#if DEBUG
        if(end && tsr == *end)
            found_end = true;
#endif
        TaintStringRef *next = tsr->next;
        tsr->next = nullptr;
        taint_delete_taintref(tsr);
        tsr = next;
    }

#if DEBUG
    MOZ_ASSERT(!end || !(*end) || found_end);
#endif
    *start = nullptr;
    if(end)
        *end = nullptr;
}

JSString*
taint_copy_and_op(JSContext *cx, JSString * dststr, JSString * srcstr,
    const char *name, JS::HandleValue param1,
    JS::HandleValue param2)
{

    if(!srcstr->isTainted())
        return dststr;

    JS::AutoCheckCannotGC nogc;

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
    JS::AutoCheckCannotGC nogc;
    str->addTaintRef(ref);
}

template <typename T>
TaintStringRef *
taint_get_top(T *str)
{
    MOZ_ASSERT(str);
    JS::AutoCheckCannotGC nogc;
    return str->getTopTaintRef();
}

template TaintStringRef * taint_get_top<JSString>(JSString* str);
template TaintStringRef * taint_get_top<JSFlatString>(JSFlatString* str);

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

TaintStringRef *taint_duplicate_range(TaintStringRef *src, TaintStringRef **taint_end,
    uint32_t frombegin, int32_t offset, uint32_t fromend)
{
    MOZ_ASSERT(src);

    VALIDATE_CHAIN(src);

    TaintStringRef *start = nullptr;
    TaintStringRef *last = nullptr;
    
    for(TaintStringRef *tsr = src; tsr; tsr = tsr->next)
    {
        if(tsr->end <= frombegin || (fromend > 0 && tsr->begin >= fromend))
            continue;

        uint32_t begin = std::max(frombegin, tsr->begin);
        uint32_t end   = tsr->end;
        if(fromend > 0 && fromend < end)
            end = fromend;
        
        TaintStringRef *newtsr = taint_str_taintref_build(*tsr);
        newtsr->begin = begin - frombegin + offset;
        newtsr->end   = end - frombegin + offset;

        VALIDATE_NODE(newtsr);

        //add the first element directly to the string
        //all others will be appended to it
        if(!start)
            start = newtsr;
        if(last)
            last->next = newtsr;

        last = newtsr;
    }

    VALIDATE_CHAIN(start);

    if(taint_end)
        *taint_end = last;

    return start;
}

TaintStringRef *
taint_copy_exact(TaintStringRef **target, TaintStringRef *source, 
    size_t sidx, size_t tidx, size_t soff)
{
    MOZ_ASSERT(target);

    if(!source)
        return nullptr;

    VALIDATE_CHAIN(source);
    VALIDATE_CHAIN(*target);

    //skip taint before sidx
    for(;source && sidx > source->end; source = source->next);

    if(!source)
        return nullptr;

    if(sidx > std::max((size_t)source->begin, soff)) {
        //if we were called every idx a new tsr should've been created in *target
        MOZ_ASSERT(sidx <= source->end); //this will trigger len(str) times //<=
        MOZ_ASSERT(*target);
        (*target)->end = tidx;
        VALIDATE_NODE(*target);
        //if we completed the last TSR advance the source pointer
        if(sidx == source->end) {
            source = source->next;
            //do not return here, we may have to create a
            //new TSR from the new soruce now
        } else {
            return source;
        }
    }

    //new TSR currently not in range -> no more taint to copy
    if(!source || sidx < std::max((size_t)source->begin, soff))
        return source;

    //as we are called for every index
    //we can assume sidx is the smallest idx with sidx >= source->begin
    TaintStringRef *tsr = taint_str_taintref_build(*source);
    tsr->begin = tidx;
    tsr->end = tidx + 1;

    VALIDATE_NODE(tsr);

    if(*target) {
        MOZ_ASSERT(!(*target)->next); //memleak
        (*target)->next = tsr;
        VALIDATE_CHAIN(*target);
    }
    *target = tsr;

    //return source so we get this for comparison later
    return source;
}

TaintStringRef *taint_split_ref(TaintStringRef* tsr, uint32_t idx)
{
    MOZ_ASSERT(tsr);
    VALIDATE_CHAIN(tsr);

    TaintStringRef *split = taint_str_taintref_build(
        tsr->begin + idx, tsr->end, tsr->thisTaint);
    //there should be an extra substring operator, but we have no JS context here :-(

    split->next = tsr->next;
    tsr->next = split;
    tsr->end = tsr->begin + idx;

    VALIDATE_CHAIN(tsr);

    return split;
}

void
taint_copy_merge(TaintStringRef **dst_start, TaintStringRef **dst_end,
    TaintStringRef *src_start, uint32_t offset)
{
    MOZ_ASSERT(dst_start && dst_end && src_start);

    VALIDATE_CHAIN(src_start);
    VALIDATE_CHAIN(*dst_start);

    //optimize for non-tainted dst
    if(*dst_start == nullptr) {
        MOZ_ASSERT(*dst_end == nullptr);
        *dst_start = taint_duplicate_range(src_start, dst_end, 0, offset, 0);
        return;
    }

    TaintStringRef *current_src =  src_start;
    TaintStringRef *last_dst = nullptr;
    TaintStringRef *current_dst = *dst_start;    

    for(;current_src != nullptr; ) {
        TaintStringRef *insert = taint_str_taintref_build(*current_src);
        insert->begin += offset;
        insert->end += offset;

        VALIDATE_NODE(insert);

        if(current_dst == nullptr) {
            //finished processing current dst chain
            //-> just append
            last_dst->next = insert;
            insert->next = nullptr;

            last_dst = insert;
            current_src = current_src->next;
            continue;
        }

        //completely before
        if(insert->end <= current_dst->begin) {
            insert->next = current_dst;
            if(last_dst) {
                //insert between two
                last_dst->next = insert;
            } else {
                //we are actually inserting before the first dst taint
                insert->next = current_dst;
                *dst_start = insert;
            }
            last_dst = insert;
            current_src = current_src->next;
            //do not advance current_dst as there may be more to insert before current_dst
        }
        //completely behind
        else if(insert->begin >= current_dst->end) {
            //do not handle this case but advance until we are overlapping/before
            last_dst = current_dst;
            current_dst = current_dst->next;
        } else {
            MOZ_ASSERT(false, "Overlapping refs not allowed.");
        }
    }
    VALIDATE_CHAIN(*dst_start);

    taint_ff_end(dst_end);
}

TaintStringRef*
taint_insert_offset(TaintStringRef *start, uint32_t position, uint32_t offset)
{
    MOZ_ASSERT(start);

    VALIDATE_CHAIN(start);

    TaintStringRef *mod = nullptr;
    TaintStringRef *last_before = nullptr;
    //find the first affected TaintStringRef
    for(TaintStringRef *tsr = start; tsr != nullptr; tsr = tsr->next) {
        if(position >= tsr->end) {
            last_before = mod;
            mod = tsr;
        } else {
            break;
        }
    }

    //nothing affected, end
    if(!mod)
        return last_before;

    //at this point mod can either be behind or overlapping position
    if(position > mod->begin) {
        //so we have to split
        last_before = mod;
        mod = taint_split_ref(mod, position - mod->begin);
    }

    for(TaintStringRef *tsr = mod; tsr != nullptr; tsr = tsr->next) {
        tsr->begin += offset;
        tsr->end   += offset;

        VALIDATE_NODE(tsr);
    }

    VALIDATE_CHAIN(start);

    return last_before;
}

//remove a range of taint
TaintStringRef *
taint_remove_range(TaintStringRef **start, TaintStringRef **end, uint32_t begin, uint32_t end_offset)
{
    //what can happen
    //nothing (no in range of any TSR - before/behind)
    //modify 0-n TSRs (begin OR end in range of any TSR)
    //delete 0-n TSRs (begin <= tsr->begin && end >= tsr->end)
    MOZ_ASSERT(start && end && *start && *end);
    MOZ_ASSERT(end_offset > begin);

    VALIDATE_CHAIN(*start);

    //OPTIMIZE
    if(*start && *end && begin <= (*start)->begin && end_offset >= (*end)->end) {
        taint_remove_all(start, end);
        return nullptr;
    }

    uint32_t del_len = end_offset -begin;
    TaintStringRef *tsr = *start;
    TaintStringRef *before = nullptr;

    //process all affected elements
    for(; tsr != nullptr; before = tsr, tsr = tsr->next) {
        if(begin >= tsr->end)
            continue;

        //check for full deletion
        if(begin <= tsr->begin && end_offset >= tsr->end) {
            if(before) {
                before->next = tsr->next;
            }

            if(*start == tsr) {
                *start = tsr->next;
            }
            if(*end == tsr) {
                *end = before;
            }

            taint_delete_taintref(tsr);
            tsr = before;
        }
        else {
            if(begin < tsr->end)
                tsr->end -= del_len;
            if(end_offset >= tsr->begin)
                tsr->begin -= del_len;

            VALIDATE_NODE(tsr);
        }
    }

    VALIDATE_CHAIN(*start);

    return before;
}

//----------------------------------------------
// Reporting

struct NodeGraph
{
    std::multimap<TaintNode*,TaintNode*> same_map;
    std::set<TaintNode*> nodes;
};

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

/*
template void
taint_write_string_buffer(const Latin1Char *s, size_t n, std::string *writer);

template void
taint_write_string_buffer(const char16_t *s, size_t n, std::string *writer);*/

static bool
taint_jsval_writecallback(const char16_t *buf, uint32_t len, void *data)
{
    std::string *writer = static_cast<std::string*>(data);
    taint_write_string_buffer(buf, len, writer);
    
    return true;
}

static void
jsvalue_to_stdstring(JSContext *cx, HandleValue value, std::string *strval) {
    /*mozilla::Maybe<JSAutoCompartment> ac;
    if (value.isObject()) {
        JS::Rooted<JSObject*> obj(cx, &value.toObject());
        ac.emplace(cx, obj);
    }*/

    MOZ_ASSERT(cx && strval);

    RootedValue val(cx);

    if(!value.isString()) {
        val = StringValue(JS::ToString(cx, value));
    } else {
        val = value;
    }

    JS_Stringify(cx, &val, JS::NullPtr(), JS::NullHandleValue, taint_jsval_writecallback, strval);
    //value = vp;
}

static void
taint_report_sink_internal(JSContext *cx, JS::HandleValue str, TaintStringRef *src, const char* name, const char* stack)
{

    std::set<TaintNode*> visited_nodes;
    std::set<TaintStringRef*> visited_refs;
    std::map<TaintNode*,NodeGraph*> node_graphs;
    for(TaintStringRef *tsr = src; tsr != nullptr; tsr = tsr->next) {
        //process the node
        TaintNode *n = tsr->thisTaint;
        // find the head
        TaintNode *process_stop = nullptr;
        TaintNode *node_head = n;
        for(; node_head->prev != nullptr; node_head = node_head->prev) {
            //do not create a new graph if already found
            if(!process_stop && !visited_nodes.insert(node_head).second) {
                process_stop = node_head;
            }
        }
        //if we found a value which was already inserted
        std::map<TaintNode*,NodeGraph*>::const_iterator finder = node_graphs.find(node_head);
        NodeGraph *head_graph = nullptr;
        if(finder == node_graphs.end()) {
            head_graph = new NodeGraph();
            node_graphs.insert(std::pair<TaintNode*,NodeGraph*>(node_head, head_graph));
        } else {
            head_graph = finder->second;
        }

        for(TaintNode *add_n = n; add_n != nullptr && add_n != process_stop;
              add_n = add_n->prev) {
            head_graph->nodes.insert(add_n);
            if(add_n->prev != nullptr) {
                head_graph->same_map.insert(
                    std::pair<TaintNode*,TaintNode*>(add_n->prev, add_n)
                );
            }
        }
        //------

        visited_refs.insert(tsr);
    }

    printf("[---TAINT---] Found taint flow %p into sink %s.\n", src, name);

    std::ostringstream report_string;
    report_string << "./taint/" << src << ".dot";

    /*char report_name[] = "0xXXXXXXXX.dot";
    snprintf(report_name+11, 11, "%p", src);
    report_name[21]='.';*/
    FILE *h = fopen(report_string.str().c_str(), "w+");
    if(!h) {
        puts("!!!! Could not write taint! Does the path exist?\n");
        return;
    }

    fputs("digraph G {\n", h);
    fprintf(h, "    start [label=<%s<br/>%s>,shape=Mdiamond];\n", name, stack);
    fputs("    content [shape=record, label=<",h);
    {
        size_t last = 0;
        std::string contentstr;
        std::string taintedstr;
        jsvalue_to_stdstring(cx, str, &taintedstr);
        for(TaintStringRef *tsr = src; tsr != nullptr; tsr = tsr->next)
        {
            MOZ_ASSERT(tsr->end <= taintedstr.length());

            size_t part_len = tsr->begin - last;
            if(part_len > 0) {
                contentstr.clear();
                contentstr.append(taintedstr.c_str() + last, part_len);
                fputs(contentstr.c_str(), h);
            }

            contentstr.clear();
            //contentstr.append("<b>");
            contentstr.append(taintedstr.c_str() + tsr->begin, tsr->end - tsr->begin);
            //contentstr.append("</b>");
            fputs(contentstr.c_str(), h);
            last = tsr->end;
        }
        if(last != taintedstr.length()) {
            contentstr.clear();
            contentstr.append(taintedstr.c_str() + last, taintedstr.length() - last);
            fputs(contentstr.c_str(), h);
        }
    }
    fputs(">];\n",h);
    for(std::map<TaintNode*,NodeGraph*>::const_iterator itr=node_graphs.begin();
          itr!=node_graphs.end(); ++itr) {
        NodeGraph *graph = itr->second;
        fprintf(h, "    subgraph nodes%p {\n", itr->first);
        for(std::set<TaintNode*>::const_iterator nitr = graph->nodes.begin();
              nitr != graph->nodes.end(); ++nitr) {
            TaintNode *node = *nitr;
            std::string param1, param2, stack;
            if(!node->param1.isUndefined()) {
                RootedValue convertValue(cx, node->param1);
                param1.append("<br/>");
                JS_WrapValue(cx, &convertValue);
                jsvalue_to_stdstring(cx, convertValue, &param1);
            }
            if(!node->param2.isUndefined()) {
                RootedValue convertValue(cx, node->param2);
                param2.append("<br/>");
                JS_WrapValue(cx, &convertValue);
                jsvalue_to_stdstring(cx, convertValue, &param2);
            }
            if(!!node->stack) {
                node->compileFrame(cx);

                RootedValue stackValue(cx, ObjectValue(*node->stack->frame));
                stack.append("<br/>");
                JS_WrapValue(cx, &stackValue);
                jsvalue_to_stdstring(cx, stackValue, &stack);
            }

            fprintf(h, "        n%p[label=<%s%s%s%s>];\n", node, node->op, param1.c_str(), param2.c_str(), stack.c_str());
            if(node->prev)
                fprintf(h, "        n%p -> n%p;\n", node->prev, node);
        }
        TaintNode* last_target = nullptr;
        for(std::multimap<TaintNode*,TaintNode*>::const_iterator itrn=graph->same_map.begin();
          itrn!=graph->same_map.end(); ++itrn) {
            if(itrn->first != last_target) {
                if(last_target != nullptr) {
                    fputs("; }\n", h);
                }
                fprintf(h, "        {rank=same;");
                last_target = itrn->first;
            }
            fprintf(h, " n%p", itrn->second);
        }
        if(last_target)
            fputs("; }\n", h);
        fputs("    }\n",h);
        delete itr->second;
    }

    fputs("\n    subgraph tsr {\n", h);
    fputs("        node[style=filled];\n", h);
    for(std::set<TaintStringRef*>::const_iterator itr = visited_refs.begin();
              itr != visited_refs.end(); ++itr) {
        fprintf(h, "        ref%p [label=\"%u - %u\"];\n", (*itr), (*itr)->begin, (*itr)->end);
        fprintf(h, "        n%p -> ref%p;\n", (*itr)->thisTaint, (*itr));
        fprintf(h, "        ref%p -> content;\n", (*itr));
        if((*itr)->next) {
            fprintf(h, "        ref%p -> ref%p;\n", (*itr), (*itr)->next);
        } else {
            fprintf(h, "        ref%p -> start;\n", (*itr));
        }
    }
    fprintf(h, "        {rank=same;");
    for(std::set<TaintStringRef*>::const_iterator itr = visited_refs.begin();
              itr != visited_refs.end(); ++itr) {
        fprintf(h, " ref%p", (*itr));
    }
    fputs(" start; }\n", h);
    fputs("    }\n",h);
    fputs("}\n",h);
    fclose(h);
}

bool
taint_js_report_flow(JSContext *cx, unsigned argc, Value *vp)
{
    CallArgs args = CallArgsFromVp(argc, vp);
    args.rval().setUndefined();
    if(args.length() < 2)
        return true;

    RootedString str(cx, ToString<CanGC>(cx, args.thisv()));
    if(!str)
        return false;

    //silently ignore untainted or zero-length reports
    if(str->length() == 0 || !str->isTainted())
        return true;

    std::string sink_str, stack_str;
    jsvalue_to_stdstring(cx, args[0], &sink_str);
    jsvalue_to_stdstring(cx, args[1], &stack_str);

    taint_report_sink_internal(cx, args.thisv(), str->getTopTaintRef(), sink_str.c_str(), stack_str.c_str());

    return true;
}

void
taint_report_sink_js(JSContext *cx, HandleString str, const char* name)
{
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