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

//remove taint from start to end
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

TaintStringRef *taint_duplicate_range(TaintStringRef *src, TaintStringRef **taint_end,
    uint32_t frombegin, int32_t offset, uint32_t fromend);


//partial taint copy
// - copy taint from source from frombegin until fromend
// - insert at offset into dst
// fromend = 0 -> copy all
template <typename TaintedT>
TaintedT *taint_copy_range(TaintedT *dst, TaintStringRef *src,
    uint32_t frombegin, int32_t offset, uint32_t fromend);

#define TAINT_ITER_TAINTREF(str) \
    for(TaintStringRef *tsr = str->getTopTaintRef(); tsr != nullptr; tsr = tsr->next)

#define TAINT_STRING_HOOKS(startTaint, endTaint)        \
    MOZ_ALWAYS_INLINE                                   \
    bool isTainted() const {                            \
        /*MOZ_ASSERT(!!startTaint == !!endTaint);*/     \
        return startTaint;                              \
    }                                                   \
                                                        \
    MOZ_ALWAYS_INLINE                                   \
    TaintStringRef *getTopTaintRef() const {      \
        return startTaint;                              \
    }                                                   \
                                                        \
    MOZ_ALWAYS_INLINE                                   \
    TaintStringRef *getBottomTaintRef() const {   \
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
    void ffTaint() {                                    \
        /*fastforward endTaint*/                        \
        if(endTaint)                                    \
            for(; endTaint->next != nullptr; endTaint = endTaint->next); \
    }                                                   \
                                                        \
    MOZ_ALWAYS_INLINE                                   \
    void removeAllTaint() {                             \
        taint_remove_all(&startTaint, &endTaint);       \
    }

#endif

#endif