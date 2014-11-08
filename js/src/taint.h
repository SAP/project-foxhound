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

//special allocators builder (using js_malloc)
TaintNode* taint_str_add_source_node(const char *fn);
TaintStringRef *taint_str_taintref_build();
TaintStringRef *taint_str_taintref_build(const TaintStringRef &ref);
TaintStringRef *taint_str_taintref_build(uint32_t begin, uint32_t end, TaintNode *node);

//wipe out the taint completely (this can free TaintNodes, too)
void taint_remove_all(TaintStringRef **start, TaintStringRef **end);

//set a (new) source, this includes resetting all previous taint
// use for all sources
template <typename TaintedT>
void taint_tag_source(TaintedT * str, const char* name, 
    uint32_t begin = 0, uint32_t end = 0)
{
    if(str->Length() == 0)
        return;

    if(end == 0)
        end = str->Length();

    if(str->isTainted()) {
        str->removeAllTaint();
    }
    
    TaintNode *taint_node = taint_str_add_source_node(name);
    TaintStringRef *newtsr = taint_str_taintref_build(begin, end, taint_node);
    str->addTaintRef(newtsr);
}

TaintStringRef *taint_duplicate_range(TaintStringRef *src, TaintStringRef **taint_end = NULL,
    uint32_t frombegin = 0, int32_t offset = 0, uint32_t fromend = 0);


//partial taint copy
// - copy taint from source from frombegin until fromend
// - insert at offset into dst
// fromend = 0 -> copy all
template <typename TaintedT>
TaintedT *taint_copy_range(TaintedT *dst, TaintStringRef *src,
    uint32_t frombegin, int32_t offset, uint32_t fromend);


//create "space" at an offset
//e.g. move all taints behind that offset
//and split up crossing taints
//returns the last TaintStringRef /before/ the insertion point
TaintStringRef* taint_insert_offset(TaintStringRef *start, uint32_t position, uint32_t offset);

//remove a range of taint
void taint_remove_range(TaintStringRef **start, TaintStringRef **end, uint32_t begin, uint32_t end_offset);

//find the TaintStringRef after which tsr is to append
//TaintStringRef* taint_find_insert_position(TaintStringRef *start, TaintStringRef *tsr);

#define TAINT_COPY_TAINT(dst, src)  \
({                                  \
    auto taint_r = (dst);           \
    if(src) {                       \
        taint_r.addTaintRef(taint_duplicate_range(src));      \
    }                               \
    taint_r;                        \
})

//this are helper functions for gecko code, because
//direct JSString calls are not yet available (JSString is only
//a forward declaration)
void taint_str_addref(JSString *str, TaintStringRef* ref);
TaintStringRef *taint_get_top(JSString *str);

#define TAINT_ITER_TAINTREF(str) \
    for(TaintStringRef *tsr = str->getTopTaintRef(); tsr != nullptr; tsr = tsr->next)

#define TAINT_STRING_HOOKS(startTaint, endTaint)        \
    MOZ_ALWAYS_INLINE                                   \
    bool isTainted() const {                            \
        MOZ_ASSERT(!!startTaint == !!endTaint);         \
        return startTaint;                              \
    }                                                   \
                                                        \
    MOZ_ALWAYS_INLINE                                   \
    TaintStringRef *getTopTaintRef() const {            \
        return startTaint;                              \
    }                                                   \
                                                        \
    MOZ_ALWAYS_INLINE                                   \
    TaintStringRef *getBottomTaintRef() const {         \
        return endTaint;                                \
    }                                                   \
                                                        \
    MOZ_ALWAYS_INLINE                                   \
    void addTaintRef(TaintStringRef *tsr)  {            \
        if(isTainted()) {                               \
            if(!tsr) {                                  \
                removeAllTaint();                       \
                return;                                 \
            }                                           \
                                                        \
            endTaint->next = tsr;                       \
            endTaint = tsr;                             \
        } else                                          \
            startTaint = endTaint = tsr;                \
                                                        \
        ffTaint();                                      \
    }                                                   \
                                                        \
    MOZ_ALWAYS_INLINE                                   \
    void removeRangeTaint(uint32_t start, uint32_t end) { \
        taint_remove_range(&startTaint, &endTaint,      \
            start, end);                                \
    }                                                   \
                                                        \
    MOZ_ALWAYS_INLINE                                   \
    void ffTaint() {                                    \
        if(endTaint)                                    \
            for(; endTaint->next != nullptr; endTaint = endTaint->next); \
    }                                                   \
                                                        \
    MOZ_ALWAYS_INLINE                                   \
    void removeAllTaint() {                             \
        if(isTainted())                                 \
            taint_remove_all(&startTaint, &endTaint);   \
    }

#else

#define TAINT_COPY_TAINT(dst, src)  (dst)

#endif

#endif