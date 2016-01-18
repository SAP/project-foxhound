#ifdef _TAINT_ON_

#include <algorithm>
#include <string>

#include "mozilla/TaintCommon.h"

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
    // TODO(samuel) use AllocPolicy or just new + delete.
    tsr->~TaintStringRef();
    free(tsr);
}

inline void*
taint_new_tainref_mem()
{
    return malloc(sizeof(TaintStringRef));
}

TaintNode*
taint_str_add_source_node(const char *fn)
{
    void *p = malloc(sizeof(TaintNode));
    TaintNode *node = new (p) TaintNode(fn);
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


TaintNode::TaintNode(const char* opname) :
    op(opname),
    refCount(0),
    prev(nullptr),
    param1(nullptr),
    param1len(0),
    param2(nullptr),
    param2len(0)
{
}

TaintNode::~TaintNode()
{
    if(param1) {
        free(param1);
        param1 = nullptr;
        param1len = 0;
    }

    if(param2) {
        free(param2);
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
        free(old);

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


//----------------------------------
// Taint output

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

    MOZ_ASSERT(!end || !(*end) || found_end);
    *start = nullptr;
    if(end)
        *end = nullptr;
}


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
            //new TSR from the new source now
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

static TaintStringRef *taint_split_ref(TaintStringRef* tsr, uint32_t idx)
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

#endif
