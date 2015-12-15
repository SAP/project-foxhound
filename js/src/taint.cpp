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

    TaintNode *taint_node = taint_str_add_source_node(cx, name);
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

/*struct TaintNode::FrameStateElement*/
//{
    //FrameStateElement(JSContext *cx, const FrameIter &iter, const
        //SavedStacks::LocationValue &loc):
        //name(nullptr),
        //source(nullptr),
        //linesource(nullptr),
        //line(loc.line),
        //column(loc.column),
        //next(nullptr),
        //prev(nullptr)
        //{
            //if(iter.isNonEvalFunctionFrame())
                //name = taint_node_stringchars(cx, iter.functionDisplayAtom(), nullptr);

            //if(loc.source)
                //source = taint_node_stringchars(cx, loc.source, nullptr);

            //if(loc.linesource)
                //linesource = taint_node_stringchars(cx, loc.linesource, nullptr);
        //}

    //~FrameStateElement() {
        //if(name) {
            //js_free(name);
            //name = nullptr;
        //}

        //if(source) {
            //js_free(source);
            //source = nullptr;
        //}

        //if(linesource) {
            //js_free(linesource);
            //linesource = nullptr;
        //}
    //}

    ////state is compiled into frame on every access
    //char16_t *name;
    //char16_t *source;
    //char16_t *linesource;
    //size_t line;
    //uint32_t column;
    //struct FrameStateElement *next;
    //struct FrameStateElement *prev;
//};

TaintNode::TaintNode(JSContext *cx, const char* opname) :
    op(opname),
    refCount(0),
    prev(nullptr),
    param1(nullptr),
    param1len(0),
    param2(nullptr),
    param2len(0),
    stack(nullptr)
{

    // TODO fix
/*    if(cx && cx->runtime()->getTaintParameter(JSTAINT_CAPTURESTACK)) {*/
        //JS::AutoCheckCannotGC nogc;

        ////this is in parts taken from SavedStacks.cpp
        ////we need to split up their algorithm to fetch the stack WITHOUT causing GC
        ////because we cannot guarantee that all pointer are marked for all calling locations
        ////they will be compiled into GCthings later
        //NonBuiltinScriptFrameIter iter(cx, FrameIter::GO_THROUGH_SAVED);
        //FrameStateElement *last = nullptr;
        //while(!iter.done()) {
            //SavedStacks::AutoLocationValueRooter location(cx);
            //{
                //AutoCompartment ac(cx, iter.compartment());
                //if (!cx->compartment()->savedStacks().getLocation(cx, iter, &location, cx->runtime()->getTaintParameter(JSTAINT_CAPTURESTACKSOURCE)))
                    //break;
            //}

            //JS::AutoCheckCannotGC nogc;

            //FrameStateElement *e;
            //{
                //void *p = js_malloc(sizeof(FrameStateElement));
                //e = new (p) FrameStateElement(cx, iter, location.get());
            //}
            ////e->state.location = location.get();

            //e->next = last;
            //if(last)
                //last->prev = e;
            //if(!stack)
                //stack = e;
            //last = e;


            //++iter;
        //}
    /*}*/
}

/*void*/
//TaintNode::compileFrame(JSContext *cx, MutableHandleObject obj)
//{
    ////first compiled? all compiled!
    //if(!stack) {
        //return;
    //}

    //SavedStacks &sstack = cx->compartment()->savedStacks();

    ////find last first
    //FrameStateElement *last = stack;
    //for(;last && last->prev; last = last->prev);
    //MOZ_ASSERT(last);

    //RootedSavedFrame frame(cx, nullptr);
    //for(FrameStateElement *itr = last; itr != nullptr; itr = itr->next) {
        ////build fake FrameState
        //SavedStacks::FrameState fstate;
        //fstate.principals = cx->compartment()->principals;
        //if(itr->name)
            //fstate.name = AtomizeChars(cx, itr->name, std::char_traits<char16_t>::length(itr->name));
        //if(itr->source)
            //fstate.location.source = AtomizeChars(cx, itr->source, std::char_traits<char16_t>::length(itr->source));
        //if(itr->linesource)
            //fstate.location.linesource = AtomizeChars(cx, itr->linesource, std::char_traits<char16_t>::length(itr->linesource));
        //fstate.location.line = itr->line;
        //fstate.location.column = itr->column;
        //sstack.buildSavedFrame(cx, &frame, fstate);
        //MOZ_ASSERT(frame);
    //}

    //obj.set(frame);
//}

TaintNode::~TaintNode()
{
    if(stack) {
        //TODO fix
        /*for(FrameStateElement *itr = stack; itr != nullptr;) {*/
            //FrameStateElement *n = itr->prev;
            //itr->~FrameStateElement();
            //js_free(itr);
            //itr = n;
        /*}*/
        stack = nullptr;
    }

    if(param1) {
        js_free(param1);
        param1 = nullptr;
        param1len = 0;
    }

    if(param2) {
        js_free(param2);
        param2 = nullptr;
        param2len = 0;
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
    MOZ_ASSERT(start && end && tsr);

    VALIDATE_CHAIN(tsr);

    if(taint_istainted(start, end)) {
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

            if(curnode->stack) {
                //curnode->compileFrame(cx, &stackobj);
            }

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
    TaintNode *taint_node = taint_str_add_source_node(cx, name);

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


template <typename T>
TaintStringRef *
taint_get_top(T *str)
{
    MOZ_ASSERT(str);
#if DEBUG
    JS::AutoCheckCannotGC nogc;
#endif
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

        uint32_t begin = (std::max)(frombegin, tsr->begin);
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

    if(sidx > (std::max)((size_t)source->begin, soff)) {
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
    if(!source || sidx < (std::max)((size_t)source->begin, soff))
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
    MOZ_ASSERT(dst_start && *dst_start && dst_end && src_start);

    VALIDATE_CHAIN(src_start);
    VALIDATE_CHAIN(*dst_start);

    /*
    //optimize for non-tainted dst
    if(*dst_start == nullptr) {
        MOZ_ASSERT(*dst_end == nullptr);
        *dst_start = taint_duplicate_range(src_start, dst_end, 0, offset, 0);
        return;
    } */

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
    //find the first TaintStringRef on/behind position
    for(TaintStringRef *tsr = start; tsr != nullptr; tsr = tsr->next) {
        if(position < tsr->end) {
            mod = tsr;
            break;
        }

        last_before = tsr;
    }

    //nothing affected, end
    if(!mod)
        return nullptr;

    //at this point mod can either be completely behind or overlapping position
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
    MOZ_ASSERT(!(begin <= (*start)->begin && end_offset >= (*end)->end),
        "Call removeAllTaint instead.");
    /*if(begin <= (*start)->begin && end_offset >= (*end)->end) {
        taint_remove_all(start, end);
        return nullptr;
    }*/

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

/*

struct NodeGraph
{
    std::multimap<TaintNode*,TaintNode*> same_map;
    std::set<TaintNode*> nodes;
};

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

    FILE *h = fopen(report_string.str().c_str(), "w+");
    if(!h) {
        puts("!!!! Could not write taint! Does the path exist?\n");
        return;
    }

    fputs("digraph G {\n", h);
    fprintf(h, "    start [shape=record, label=<%s>];\n", name);
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
            std::string param1, param2;
            if(node->param1) {
                //RootedValue convertValue(cx, node->param1);
                param1.append("<br/>");
                taint_write_string_buffer(node->param1, node->param1len, &param1);
                //JS_WrapValue(cx, &convertValue);
                //jsvalue_to_stdstring(cx, convertValue, &param1);
            }
            if(node->param2) {
                //RootedValue convertValue(cx, node->param2);
                param2.append("<br/>");
                taint_write_string_buffer(node->param2, node->param2len, &param2);
                //JS_WrapValue(cx, &convertValue);
                //jsvalue_to_stdstring(cx, convertValue, &param2);
            }

            // if(node->stack) {
            //     RootedObject stackObj(cx, nullptr);
            //     node->compileFrame(cx, &stackObj);

            //     RootedValue stackValue(cx, ObjectValue(*stackObj));
            //     stack.append("<br/>");
            //     //JS_WrapValue(cx, &stackValue);
            //     jsvalue_to_stdstring(cx, stackValue, &stack);
            // }

            fprintf(h, "        n%p[label=<%s%s%s>];\n", node, node->op, param1.c_str(), param2.c_str());
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
    MOZ_ASSERT(cx);

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

*/


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
        const char* funbody = "if(CustomEvent && window) {var e=new window.CustomEvent('__domlog',{detail:[].slice.apply(arguments)}); window.dispatchEvent(e);}";
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
    js_DumpBacktrace(cx);
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
        const char* funbody = "if (window && document) { var t = window; if (location.protocol == 'javascript:' || location.protocol == 'data:' || location.protocol == 'about:') { t = parent.window }" \
"var pl; try { pl = parent.location.href; } catch (e) { pl = 'different origin'; } var e = document.createEvent('CustomEvent'); e.initCustomEvent('__taintreport', true, false, {subframe: t !== window, loc: location.href," \
"parentloc: pl, str: str, sink: sink, stack: stack}); t.dispatchEvent(e);}";
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
