/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* Taint datastructures and function that are used by Spidermonkey and Gecko. */

#ifndef _TaintCommon_h
#define _TaintCommon_h

#include "mozilla/Assertions.h"

#ifdef _TAINT_ON_

typedef struct TaintNode
{
    TaintNode(const char* opname);
    ~TaintNode();

    void decrease();
    inline void increase() {
        refCount++;
    }

    void setPrev(TaintNode *other);

    //struct FrameStateElement;

    const char *op;
    uint32_t refCount;
    struct TaintNode *prev;
    char16_t *param1;
    size_t param1len;
    char16_t *param2;
    size_t param2len;
    //FrameStateElement *stack;
private:
    // No copy/assign
    TaintNode(const TaintNode& other) = delete;
    void operator=(const TaintNode& other) = delete;

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

    /*
        WARNING: If you attach from a TaintStringRef of a JSString
        you should have a barrier call somewhere afterwards.
    */
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

//special allocators builder (using plain malloc)
TaintNode* taint_str_add_source_node(const char *fn);
TaintStringRef *taint_str_taintref_build();
TaintStringRef *taint_str_taintref_build(const TaintStringRef &ref);
TaintStringRef *taint_str_taintref_build(uint32_t begin, uint32_t end, TaintNode *node);

//wipe out the taint completely (this can free TaintNodes, too)
void taint_remove_all(TaintStringRef **start, TaintStringRef **end);

//partial taint copy
// - copy taint from source from frombegin until fromend
// - insert with offset
// - returns the start of the copied chain
// - optionally sets *taint_end to the end of the chain, if provided
// fromend = 0 -> copy all
TaintStringRef *taint_duplicate_range(TaintStringRef *src, TaintStringRef **taint_end = NULL,
    uint32_t frombegin = 0, int32_t offset = 0, uint32_t fromend = 0);

//create "space" at an offset
//e.g. push all taints after position behind by offset and split up crossing taints
//returns the last TaintStringRef /before/ the insertion point
TaintStringRef* taint_insert_offset(TaintStringRef *start, uint32_t position, uint32_t offset);

//copy & merge src in correct order into dst_{start,end}
//we assume no ranges are overlapping
void taint_copy_merge(TaintStringRef **dst_start, TaintStringRef **dst_end,
    TaintStringRef *src_start, uint32_t offset);

//remove a range of taint
TaintStringRef * taint_remove_range(TaintStringRef **start, TaintStringRef **end,
    uint32_t begin, uint32_t end_offset);

//exact taint copy when length of in/out do not match
// - needs to be called for every "token" in source
// - *target starts out with nullptr and continues to hold the
//   last taintref of the new chain
// - soff: offset of sidx to the start of the string (and with that,
//   taint reference indices)
// - return value has to be fed back into source, starts with
//   the top taintref of the source (and has to be ordered!)
TaintStringRef *
taint_copy_exact(TaintStringRef **target,
    TaintStringRef *source, size_t sidx, size_t tidx, size_t soff = 0);

//----------------------------------

inline bool taint_istainted(TaintStringRef *const *start, TaintStringRef *const *end)
{
    MOZ_ASSERT(start && end);
    MOZ_ASSERT(!start == !end);
    return *start;
}

// Fast forward end to the last element in the chain.
void taint_ff_end(TaintStringRef **end);

void taint_addtaintref(TaintStringRef *tsr, TaintStringRef **start, TaintStringRef **end);

//typical functions included to add taint functionality to string-like
//classes. additionally two TaintStringRef members are required.
#define TAINT_STRING_HOOKS(startTaint, endTaint)        \
    MOZ_ALWAYS_INLINE                                   \
    bool isTainted() const {                            \
        return taint_istainted(&startTaint, &endTaint); \
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
        taint_addtaintref(tsr, &startTaint, &endTaint); \
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
        taint_ff_end(&endTaint);                        \
    }                                                   \
                                                        \
    MOZ_ALWAYS_INLINE                                   \
    void removeAllTaint() {                             \
        if(isTainted())                                 \
            taint_remove_all(&startTaint, &endTaint);   \
    }

//--------------------------------------------


#endif


//--------------------------------------------

//in place operations and corresponding NOPs
#if _TAINT_ON_
//evaluate dst and copy taint to it.
#define TAINT_APPEND_TAINT(dst, src)                    \
[](decltype(dst) &taint_r, TaintStringRef* sourceref) -> decltype(dst)& {\
    if(sourceref /*&& taint_r.isTainted()*/) {          \
        taint_r.addTaintRef(taint_duplicate_range(sourceref));      \
    }                                                   \
    return taint_r;                                     \
}(dst, src)

//evaluate dst, clear, and copy taint
#define TAINT_ASSIGN_TAINT(dst, src)                    \
[](decltype(dst) &taint_r, TaintStringRef* sourceref) -> decltype(dst)& {\
    taint_r.removeAllTaint();                           \
    if(sourceref) {                                     \
        taint_r.addTaintRef(taint_duplicate_range(sourceref));      \
    }                                                   \
    return taint_r;                                     \
}(dst, src)

#else
#define TAINT_APPEND_TAINT(dst, src)
#define TAINT_ASSIGN_TAINT(dst, src)
#endif

//--------------------------------------------

#endif
