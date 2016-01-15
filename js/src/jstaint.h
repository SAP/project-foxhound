#ifndef jstaint_h
#define jstaint_h

#ifdef _TAINT_ON_

#include "jsapi.h"
#include "mozilla/TaintCommon.h"

class JSAtom;


bool taint_filter_source_tagging(JSContext *cx, const char *name);

//set a (new) source
//str is assumed to not be tainted
namespace js {
    mozilla::UniquePtr<char16_t[], JS::FreePolicy> DuplicateString(js::ExclusiveContext* cx, const char16_t* s);
}


template <typename TaintedT>
inline bool taint_filter_addref(TaintedT *str)
{
    return false;
}

template <>
inline bool taint_filter_addref(JSAtom *str)
{
    printf("---!!!--- in taint_filter_addref(JSAtom*) ---!!!---\n");
    return true;
}

template <typename TaintedT>
void taint_tag_source(TaintedT& str, const char* name, JSContext *cx = nullptr, uint32_t begin = 0)
{
    MOZ_ASSERT(!str.isTainted());
    if(taint_filter_source_tagging(cx, name)) {
        return;
    }

    //we cannot taint atoms or we pick up false positives and invalid taint
    if(str.Length() == 0) {
        return;
    }

    TaintNode *taint_node = taint_str_add_source_node(name);
    if(cx) {
        taint_node->param1 = js::DuplicateString((js::ExclusiveContext*)cx, str.Data()).release();
        taint_node->param1len = str.Length();
    }


    TaintStringRef *newtsr = taint_str_taintref_build(begin, str.Length(), taint_node);
    str.addTaintRef(newtsr);
}

//---------------------------------
//these are helper functions for gecko code, because
//direct JSString calls are not yet available sometimes
//(JSString is only a forward declaration)

void taint_str_addref(JSString *str, TaintStringRef* ref);
TaintStringRef* taint_str_get_top_taintref(JSString *str);
TaintStringRef* taint_str_get_top_taintref(JSFlatString *str);

//----------------------------------

//typical functions included to add taint functionality to string-like
//classes. additionally two TaintStringRef members are required.
#define TAINT_JSSTRING_HOOKS(startTaint, endTaint)        \
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
        if(!taint_filter_addref(this)) {                \
            taint_addtaintref(tsr, &startTaint, &endTaint); \
        } else if(tsr) {                                \
            taint_remove_all(&tsr, nullptr);            \
        }                                               \
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
