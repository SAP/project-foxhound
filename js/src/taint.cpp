#ifdef _TAINT_ON_

#include "jsapi.h"
#include "jsstr.h"
#include "vm/StringBuffer.h"

#include "jsarray.h"
#include "taint-private.h"

#include <algorithm>
#include <map>
#include <set>
#include <string>
#include <sstream>
#include <iostream>

using namespace js;

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

void taint_tag_source_internal(JSString * str, const char* name, JSContext *cx = nullptr,
    uint32_t begin = 0, uint32_t end = 0)
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
    str->addTaintRef(newtsr);
}

//----------------------------------
// Reference Node

static void
TraceTaintNode(JSTracer *trc, void* data)
{
    reinterpret_cast<TaintNode*>(data)->traceMember(trc);
}

TaintNode::TaintNode(JSContext *cx, const char* opname) :
    op(opname),
    refCount(0),
    param1(),
    param2(),
    prev(nullptr),
    mRt(nullptr)
{
    if(cx) {
        mRt = js::GetRuntime(cx);
        JS_AddExtraGCRootsTracer(mRt, TraceTaintNode, this);
    }
}

void
TaintNode::traceMember(JSTracer *trc)
{
    JS_CallValueTracer(trc, &param1, "param1");
    JS_CallValueTracer(trc, &param2, "param1");
}

TaintNode::~TaintNode()
{
    if(mRt) {
        JS_RemoveExtraGCRootsTracer(mRt, TraceTaintNode, this);
        mRt = nullptr;
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
    taint_add_op(str->getTopTaintRef(), "Mutation with params", cx, param, param);
    taint_add_op(str->getTopTaintRef(), "Mutation w/o param");

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
    if(!str)
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

    taint_tag_source_internal(taintedStr, "Manual taint source");

    args.rval().setString(taintedStr);
    return true;
}

TaintStringRef *taint_duplicate_range(TaintStringRef *src, TaintStringRef **taint_end,
    uint32_t frombegin, int32_t offset, uint32_t fromend)
{
    if(!src)
        return nullptr;

    TaintStringRef *start = nullptr;
    TaintStringRef *last = nullptr;
    
    for(TaintStringRef *tsr = src; tsr; tsr = tsr->next)
    {
        if(tsr->end <= frombegin || (fromend > 0 && tsr->begin >= fromend))
            continue;

        uint32_t begin = std::max(frombegin, tsr->begin);
        uint32_t end   = (fromend > 0 ? std::min(tsr->end, fromend) : tsr->end);
        
        TaintStringRef *newtsr = taint_str_taintref_build(*tsr);
        newtsr->begin = begin - frombegin + offset;
        newtsr->end   = end - frombegin + offset;

        //add the first element directly to the string
        //all others will be appended to it
        if(!start)
            start = newtsr;
        if(last)
            last->next = newtsr;

        last = newtsr;
    }

    if(taint_end)
        *taint_end = last;

    return start;
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
            RootedValue opname(cx, StringValue(NewStringCopyZ<CanGC>(cx, curnode->op)));
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
        taint_add_op_single(tsr, "substring", cx->asJSContext(), startval, endval);
    }
}

// This looks outright stupid. Maybe it even is...
// It is used when the full JSString* declaration is not yet
// available but as a mere forward declaration, which prevents
// us from issueing a direct call.
void
taint_str_addref(JSString *str, TaintStringRef *ref)
{
    str->addTaintRef(ref);
}

TaintStringRef *
taint_get_top(JSString *str)
{
    return str->getTopTaintRef();
}

//duplicate all taintstringrefs form a string to another
//and point to the same nodes (shallow copy)
template <typename TaintedT>
TaintedT *taint_copy_range(TaintedT *dst, TaintStringRef *src,
    uint32_t frombegin, int32_t offset, uint32_t fromend)
{
    MOZ_ASSERT(dst && src);
    TaintStringRef *tsr = taint_duplicate_range(src, NULL, frombegin, offset, fromend);
    if(tsr) //do not overwrite
        dst->addTaintRef(tsr);

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

void taint_add_op_single(TaintStringRef *dst, const char* name, JSContext *cx, HandleValue param1, HandleValue param2)
{
    MOZ_ASSERT(!(!param1.isUndefined() || !param2.isUndefined()) || cx);

    TaintNode *taint_node = taint_str_add_source_node(cx, name);
    //attach new node before changing the string ref as this would delete the old node
    taint_node->setPrev(dst->thisTaint);
    taint_node->param1 = param1;
    taint_node->param2 = param2;
    dst->attachTo(taint_node);
}

//add a new node to all taintstringrefs on a string
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

TaintStringRef *
taint_copy_exact(TaintStringRef **target, TaintStringRef *source, 
    size_t sidx, size_t tidx, size_t soff)
{
    if(!source || !target)
        return nullptr;

    //we are in the same TSR, still
    if(sidx > (source->begin + soff)) {
        MOZ_ASSERT(*target);
        //if we were called ever idx a new tsr should be created in *target
        
        if(sidx <= (source->end + soff)) { //this will trigger len(str) times //<=
            
            (*target)->end = tidx;
            //if(sidx < source->end)
            //drop out if we updated the end, there is no new source ref for sure
            return source;
        }

        //if we completed the last TSR advance the source pointer
        source = source->next;
    }

    //no new TSR currently pending or end of tsr chain -> no more taint to copy
    if(!source || sidx < (source->begin + soff))
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

TaintStringRef *taint_split_ref(TaintStringRef* tsr, uint32_t idx)
{
    TaintStringRef *split = taint_str_taintref_build(
        tsr->begin + idx, tsr->end, tsr->thisTaint);
    //there should be an extra substring operator, but we have no JS context here :-(

    split->next = tsr->next;
    tsr->next = split;
    tsr->end = tsr->begin + idx;
    return split;
}

TaintStringRef* taint_insert_offset(TaintStringRef *start, uint32_t position, uint32_t offset)
{
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

    //nothing affected, alright then
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
    }

    return last_before;
}

//remove a range of taint
void taint_remove_range(TaintStringRef **start, TaintStringRef **end, uint32_t begin, uint32_t end_offset)
{
    //what can happen
    //nothing (no in range of any TSR - before/behind)
    //modify 0-n TSRs (begin OR end in range of any TSR)
    //delete 0-n TSRs (begin <= tsr->begin && end >= tsr->end)
    MOZ_ASSERT(start && end && *start && *end);
    MOZ_ASSERT(end_offset > begin);


    //OPTIMIZE
    if(*start && *end && begin <= (*start)->begin && end_offset >= (*end)->end) {
        taint_remove_all(start, end);
        return;
    }

    uint32_t del_len = end_offset -begin;

    //process all affected elements
    for(TaintStringRef *tsr = *start, *before = nullptr; tsr != nullptr; before = tsr, tsr = tsr->next) {
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
        }
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

    taint_copy_range(str, base->getTopTaintRef(), start, 0, end);
    for(TaintStringRef *tsr = str->getTopTaintRef(); tsr != nullptr; tsr = tsr->next)
    {
        js::RootedValue startval(cx, INT_TO_JSVAL(tsr->begin + start));
        js::RootedValue endval(cx, INT_TO_JSVAL(tsr->end + start));
        taint_add_op_single(tsr, "substring", cx->asJSContext(), startval, endval);
    }
        
    return str;
}

struct NodeGraph
{
    std::multimap<TaintNode*,TaintNode*> same_map;
    std::set<TaintNode*> nodes;
};

template <typename T>
void
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
            writer->append("\\n");
        else if (c == '\t')
            writer->append("\\t");
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

template void
taint_write_string_buffer(const Latin1Char *s, size_t n, std::string *writer);

template void
taint_write_string_buffer(const char16_t *s, size_t n, std::string *writer);

static bool
taint_jsval_writecallback(const char16_t *buf, uint32_t len, void *data)
{
    std::string *writer = static_cast<std::string*>(data);
    taint_write_string_buffer(buf, len, writer);
    
    return true;
}

void
taint_report_sink_js(JSContext *cx, HandleString str, const char* name)
{
    JSLinearString *linear = str->ensureLinear(nullptr);
    if(!linear)
        return;
    
    JS::AutoCheckCannotGC nogc;
    if(str->hasLatin1Chars())
        taint_report_sink_internal(cx, linear->latin1Chars(nogc), linear->length(), linear->getTopTaintRef(), name);
    else
        taint_report_sink_internal(cx, linear->twoByteChars(nogc), linear->length(), linear->getTopTaintRef(), name);
} 

void
jsvalue_to_string(JSContext *cx, HandleValue value, std::string *strval) {
    /*mozilla::Maybe<JSAutoCompartment> ac;
    if (value.isObject()) {
        JS::Rooted<JSObject*> obj(cx, &value.toObject());
        ac.emplace(cx, obj);
    }*/
    RootedValue val(cx);

    if(value.isObject()) {
        val = StringValue(JS::ToString(cx, value));
    } else {
        val = value;
    }

    JS_Stringify(cx, &val, JS::NullPtr(), JS::NullHandleValue, taint_jsval_writecallback, strval);
    //value = vp;
}

template <typename T>
void
taint_report_sink_internal(JSContext *cx, const T* str, size_t len, TaintStringRef *src, const char* name)
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
    report_string << "/tmp/taint/" << src << ".dot";

    /*char report_name[] = "0xXXXXXXXX.dot";
    snprintf(report_name+11, 11, "%p", src);
    report_name[21]='.';*/
    FILE *h = fopen(report_string.str().c_str(), "w+");
    fputs("digraph G {\n", h);
    fprintf(h, "    start [label=\"%s\",shape=Mdiamond];\n", name);
    fputs("    content [shape=record, label=<",h);
    size_t last = 0;
    for(TaintStringRef *tsr = src; tsr != nullptr; tsr = tsr->next)
    {
        size_t part_len = tsr->begin - last;
        std::string contentstr;
        if(part_len > 0) {
            taint_write_string_buffer(str + last, part_len, &contentstr);
            fputs(contentstr.c_str(), h);
        }

        contentstr.clear();
        taint_write_string_buffer(str + tsr->begin, tsr->end - tsr->begin, &contentstr);
        fputs("<b>",h);
        fputs(contentstr.c_str(), h);
        fputs("</b>",h);
        last = tsr->end;
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
            if(!node->param1.isUndefined()) {
                RootedValue convertValue(cx, node->param1);
                param1.append("\\n");
                jsvalue_to_string(cx, convertValue, &param1);
            }
            if(!node->param2.isUndefined()) {
                RootedValue convertValue(cx, node->param2);
                param2.append("\\n");
                jsvalue_to_string(cx, convertValue, &param2);
            }

            fprintf(h, "        n%p[label=\"%s%s%s\"];\n", node, node->op, param1.c_str(), param2.c_str());
            if(node->prev)
                fprintf(h, "        n%p -> n%p;\n", node->prev, node);
        }
        TaintNode* last_target = nullptr;
        for(std::multimap<TaintNode*,TaintNode*>::const_iterator itr=graph->same_map.begin();
          itr!=graph->same_map.end(); ++itr) {
            if(itr->first != last_target) {
                if(last_target != nullptr) {
                    fputs("; }\n", h);
                }
                fprintf(h, "        {rank=same;");
                last_target = itr->first;
            }
            fprintf(h, " n%p", itr->second);
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

template void
taint_report_sink_internal(JSContext *cx, const char16_t* str, size_t len, TaintStringRef *src, const char* name);

template void
taint_report_sink_internal(JSContext *cx, const Latin1Char* str, size_t len, TaintStringRef *src, const char* name);


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


//remove all taintref associated to a string
void
taint_remove_all(TaintStringRef **start, TaintStringRef **end)
{
    MOZ_ASSERT(end && start);

#if DEBUG
    bool found_end = false;
#endif

    for(TaintStringRef *tsr = *start; tsr != nullptr; ) {
#if DEBUG
        if(end && tsr == *end)
            found_end = true;
#endif
        TaintStringRef *next = tsr->next;
        taint_delete_taintref(tsr);
        tsr = next;
    }

#if DEBUG
    MOZ_ASSERT(!(*end) || found_end);
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

    taint_copy_range(dststr, srcstr->getTopTaintRef(), 0, 0, 0);
    taint_add_op(dststr->getTopTaintRef(), name, cx, param1, param2);

    return dststr;
}

//handle taint propagation for tainted strings
//TODO optimize for lhs == rhs
void
taint_str_concat(JSContext *cx, JSString *dst, JSString *lhs, JSString *rhs)
{
    if(lhs->isTainted())
        taint_copy_range(dst, lhs->getTopTaintRef(), 0, 0, 0);

    if(rhs->isTainted())
        taint_copy_range(dst, rhs->getTopTaintRef(), 0, lhs->length(), 0);

    //no need to add a taint node for concat as this does not
    //add any valuable information
    if(cx) {
        RootedValue lhsval(cx, StringValue(lhs));
        RootedValue rhsval(cx, StringValue(rhs));
        taint_add_op(dst->getTopTaintRef(), "concat", cx, lhsval, rhsval);
    }
}

#endif