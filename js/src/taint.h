#ifndef taint_h
#define taint_h

#ifdef _TAINT_ON_

#include "jsapi.h"

typedef struct TaintNode
{
    const char *op;
    uint32_t refCount;
    JS::Heap<JS::Value> param;
    struct TaintNode *prev;

    TaintNode(const char* opname) :
    	op(opname),
    	refCount(0),
    	param(),
    	prev(nullptr)
    {}

    void decrease();
    inline void increase() {
    	this->refCount++;
    }
} TaintNode;

typedef struct TaintStringRef
{
	uint32_t begin;
	uint32_t end;
	TaintNode *thisTaint;
	struct TaintStringRef *next;

	TaintStringRef(uint32_t s, uint32_t e, TaintNode* node = nullptr);
	const TaintStringRef(TaintStringRef *ref);
	~TaintStringRef();

	void attachTo(TaintNode *node);
} TaintStringRef;


//-------
// augmentation defs and functions

//basic creator
//this is not meant to be used throughout the codebase
#define TAINT_ADD_NODE(str, name, begin, end) \
TaintNode *taint_node=taint_str_add_source_node(name);\
str->addNewTaintRef(begin, end, taint_node);

//set a source, this includes resetting all previous taint
#define TAINT_SET_SOURCE(str, name, begin, end) \
{\
	str->removeAllTaint();\
	TAINT_ADD_NODE(str, name, begin, end)\
}

//add a propagator/function call
//TODO: maybe check/assert that indices do not overlap
#define TAINT_ADD_STEP(str, name, begin, end) \
{\
	TAINT_ADD_NODE(str, name, begin, end)\
}
#define TAINT_ADD_STEP_PARAM(str, name, begin, end, param) \
{\
	TAINT_ADD_NODE(str, name, begin, end)\
	taint_node->param=param;\
}

//duplicate all References but keep the old Nodes and add a new one to all Refs
//this is to be used on manipulators which create a new string
#define TAINT_APPLY_ALL_ADD(dststr, srcstr, name) \
{\
	taint_str_apply(dststr, srcstr);\
	taint_str_add_all_node(dstr, name);\
}
#define TAINT_APPLY_ALL_ADD_PARAM(dststr, srcstr, name, param) \
{\
	taint_str_apply_all(dststr, srcstr);\
	taint_str_add_all_node(dstr, name, param);\
}

inline TaintNode*
taint_str_add_source_node(const char *fn)
{
	void *p = js_malloc(sizeof(TaintNode));
	TaintNode *node = new (p) TaintNode(fn);
	return node;
}

//----------
//"backend" defs and functions

#define TAINT_ADD_JSSTR_METHODS \
JS_FN("untaint",        		taint_str_untaint,          	0,JSFUN_GENERIC_NATIVE),\
JS_FN("propagateTaint",        	taint_str_testpropagate,        0,JSFUN_GENERIC_NATIVE),

#define TAINT_ADD_JSSTR_STATIC_METHODS \
JS_FN("newAllTainted",			taint_str_newalltaint,			1,0),

#define TAINT_ADD_JSSTR_PROPS \
JS_PSG("taint",					taint_str_prop, 				JSPROP_PERMANENT),


bool taint_str_newalltaint(JSContext *cx, unsigned argc, JS::Value *vp);
bool taint_str_prop(JSContext *cx, unsigned argc, JS::Value *vp);
bool taint_str_untaint(JSContext *cx, unsigned argc, JS::Value *vp);
bool taint_str_testpropagate(JSContext *cx, unsigned argc, JS::Value *vp);
void taint_str_apply_all(JS::HandleString dststr, JS::HandleString srcstr);
void taint_str_add_all_node(JS::HandleString dstr, JS::HandleString name, JS::HandleValue param);\

#endif

#endif