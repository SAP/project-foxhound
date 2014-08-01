#ifdef _TAINT_ON_

#include "jsapi.h"
#include "jsstr.h"

#include "jsarray.h"
#include "taint.h"

using namespace js;

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
        return;
    }
}


TaintStringRef::TaintStringRef(uint32_t s, uint32_t e, TaintNode* node) :
    begin(s),
    end(e),
    thisTaint(nullptr),
    next(nullptr)
{
    if(node)
        this->attachTo(node);
    
}

TaintStringRef::TaintStringRef(const TaintStringRef &ref) :
    begin(ref.begin),
    end(ref.end),
    thisTaint(nullptr),
    next(nullptr)
{
    if(ref.thisTaint)
        this->attachTo(ref.thisTaint);
}

TaintStringRef::~TaintStringRef()
{
    if(this->thisTaint) {
        this->thisTaint->decrease();
        this->thisTaint = nullptr;
    }
}
//-------

bool
taint_str_testmutator(JSContext *cx, unsigned argc, JS::Value *vp)
{
    CallArgs args = CallArgsFromVp(argc, vp);
    RootedString str(cx, ToString<CanGC>(cx, args.thisv()));
    if(!str)
        return false;

    RootedValue param(cx, StringValue(NewStringCopyZ<CanGC>(cx, "String parameter incoming!")));

    TAINT_MUTATOR_ADD_ALL_PARAM(str, "Mutation activated!", param);

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

    TAINT_SET_SOURCE(taintedStr, "Manual Taint", 0, taintedStr->length());

    args.rval().setString(taintedStr);
    return true;
}

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

void
taint_str_apply_all(JS::HandleString dststr, JS::HandleString srcstr)
{
    //duplicate all refs (keep references to Nodes)
    TaintStringRef *newchainlast = nullptr;
    for(TaintStringRef *tsr = srcstr->getTopTaintRef(); tsr != nullptr; tsr = tsr->next)
    {
        void *p = taint_new_taintref_mem();
        TaintStringRef *newtsr = new (p) TaintStringRef(*tsr);

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
        taint_node->setPrev(tsr->thisTaint);
        taint_node->param = param;
        tsr->attachTo(taint_node);
    }
}

#endif