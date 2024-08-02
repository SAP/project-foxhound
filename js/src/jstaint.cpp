/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * vim: set ts=8 sts=2 et sw=2 tw=80:
 */
#include "jstaint.h"

#include <algorithm>
#include <iomanip>
#include <iostream>
#include <locale>
#include <sstream>
#include <string>
#include <utility>


#include "jsapi.h"
#include "NamespaceImports.h"
#include "js/Array.h"
#include "js/CharacterEncoding.h"
#include "js/ErrorReport.h"
#include "js/PropertyAndElement.h"  // JS_DefineFunctions
#include "js/UniquePtr.h"
#include "vm/FrameIter.h"
#include "vm/JSContext.h"
#include "vm/JSFunction.h"
#include "vm/NumberObject.h"
#include "vm/StringType.h"

using namespace JS;

const size_t max_length = 128;
const size_t copy_length = (max_length/2)-2;

static std::u16string ascii2utf16(const std::string& str) {
  std::u16string res;
  for (auto c : str)
    res.push_back(static_cast<char16_t>(c));
  return res;
}

std::u16string JS::taintarg_char(JSContext* cx, const char16_t ch)
{
  return std::u16string(1, ch);
}

std::u16string JS::taintarg(JSContext* cx, const char16_t* str)
{
  return std::u16string(str);
}

std::u16string JS::taintarg_full(JSContext* cx, HandleString str)
{
  if (!str) {
    return std::u16string();
  }
  JSLinearString* linear = str->ensureLinear(cx);
  if (!linear)
    return std::u16string();

  js::UniquePtr<char16_t, JS::FreePolicy> buf(cx->pod_malloc<char16_t>(linear->length()));
  js::CopyChars(buf.get(), *linear);
  return std::u16string(buf.get(), linear->length());
}

std::u16string JS::taintarg(JSContext* cx, HandleString str)
{
  if (!str) {
    return std::u16string();
  }

  size_t len = str->length();
  JSLinearString* linear = str->ensureLinear(cx);
  if (!linear)
    return std::u16string();

  js::UniquePtr<char16_t, JS::FreePolicy> buf(cx->pod_malloc<char16_t>(len));
  js::CopyChars(buf.get(), *linear);
  if(len > max_length) {
    // Taintfox was crashing after startup after copying start and end
    // of the long strings, so disable copying here
    // TODO: work out why windows doesn't like this...
    // Update: this also caused issues with some URLs causing crashes
    // I have a feeling there are some encoding/length issues
#  if 1 //defined(_WIN32)
    return std::u16string(buf.get(), max_length);
#  else
    std::u16string result(buf.get(), copy_length);
    result.append(u"....");
    result.append(std::u16string(buf.get(), len - copy_length, copy_length));
    return result;
#  endif
  }
  return std::u16string(buf.get(), len);
}

std::u16string JS::taintarg_jsstring(JSContext* cx, JSString* const& str)
{
  if (!str) {
    return std::u16string();
  }

  size_t len = str->length();
  JSLinearString* linear = str->ensureLinear(cx);
  if (!linear)
    return std::u16string();

  js::UniquePtr<char16_t, JS::FreePolicy> buf(cx->pod_malloc<char16_t>(len));
  js::CopyChars(buf.get(), *linear);
  if(len > max_length) {
    // Taintfox was crashing after startup after copying start and end
    // of the long strings, so disable copying here
    // TODO: work out why windows doesn't like this...
    // Update: this also caused issues with some URLs causing crashes
    // I have a feeling there are some encoding/length issues
#  if 1 //defined(_WIN32)
    return std::u16string(buf.get(), max_length);
#  else
    std::u16string result(buf.get(), copy_length);
    result.append(u"....");
    result.append(std::u16string(buf.get(), len - copy_length, copy_length));
    return result;
#  endif
  }
  return std::u16string(buf.get(), len);
}

std::u16string JS::taintarg_jsstring_full(JSContext* cx, JSString* const& str)
{
  if (!str) {
    return std::u16string();
  }
  JSLinearString* linear = str->ensureLinear(cx);
  if (!linear)
    return std::u16string();

  js::UniquePtr<char16_t, JS::FreePolicy> buf(cx->pod_malloc<char16_t>(linear->length()));
  js::CopyChars(buf.get(), *linear);
  return std::u16string(buf.get(), linear->length());
}

std::u16string JS::taintarg(JSContext* cx, HandleObject obj)
{
  RootedValue val(cx, ObjectValue(*obj));
  RootedString str(cx, ToString(cx, val));
  if (!str)
    return std::u16string();
  return taintarg(cx, str);
}

std::u16string JS::taintarg(JSContext* cx, HandleValue val, bool fullArgs)
{
  RootedString str(cx, ToString(cx, val));
  if (!str)
    return std::u16string();
  return fullArgs ? taintarg_full(cx, str) : taintarg(cx, str);
}

std::u16string JS::taintarg(JSContext* cx, int32_t num)
{
  RootedValue val(cx, Int32Value(num));
  return taintarg(cx, val);
}

std::vector<std::u16string> JS::taintargs(JSContext* cx, HandleValue val, bool fullArgs)
{
  std::vector<std::u16string> args;
  bool isArray;

  if (!IsArrayObject(cx, val, &isArray)) {
    return args;
  }

  if (isArray) {
    RootedObject array(cx, &val.toObject());
    uint32_t length;
    if (!GetArrayLength(cx, array, &length)) {
      return args;
    }
    for (uint32_t i = 0; i < length; ++i) {
      RootedValue v(cx);
      if (!JS_GetElement(cx, array, i, &v)) {
        continue;
      }
      args.push_back(taintarg(cx, v, fullArgs));
    }
  } else {
    args.push_back(taintarg(cx, val));
  }
  return args;
}

std::vector<std::u16string> JS::taintargs(JSContext* cx, HandleString str1, HandleString str2)
{
  std::vector<std::u16string> args;
  args.push_back(taintarg(cx, str1));
  args.push_back(taintarg(cx, str2));
  return args;
}

std::vector<std::u16string> JS::taintargs(JSContext* cx, HandleString arg)
{
  std::vector<std::u16string> args;
  args.push_back(taintarg(cx, arg));
  return args;
}

std::vector<std::u16string> JS::taintargs_jsstring(JSContext* cx, JSString* const& arg) 
{
  std::vector<std::u16string> args;
  args.push_back(taintarg_jsstring(cx, arg));
  return args;
}

std::vector<std::u16string> JS::taintargs_jsstring(JSContext* cx, JSString* const& str1, JSString* const& str2)
{
  std::vector<std::u16string> args;
  args.push_back(taintarg_jsstring(cx, str1));
  args.push_back(taintarg_jsstring(cx, str2));
  return args;
}

std::string JS::convertDigestToHexString(const TaintMd5& digest)
{
  std::stringstream ss;
  ss << std::hex;
  for (const auto& byte : digest) {
    ss << std::setw(2) << std::setfill('0') << static_cast<unsigned int>(byte);
  }
  return ss.str();
}

TaintLocation JS::TaintLocationFromContext(JSContext* cx)
{
  if (!cx) {
    return TaintLocation();
  }

  const char* filename = NULL;
  uint32_t line = 0;
  uint32_t pos = 0;
  uint32_t scriptStartline = 0;
  TaintMd5 hash;

  RootedString function(cx);

  for (js::AllFramesIter i(cx); !i.done(); ++i) {
    if (i.hasScript()) {
      // Get source
      JSScript* script = i.script();
      js::ScriptSource* ss = script->scriptSource();
      if (ss) {
        scriptStartline = ss->startLine();
        hash = ss->md5Checksum(cx);
      }
      filename = JS_GetScriptFilename(i.script());
      JS::LimitedColumnNumberOneOrigin column;
      line = PCToLineNumber(i.script(), i.pc(), &column);
      pos = column.oneOriginValue();
    } else {
      JS::TaggedColumnNumberOneOrigin column;
      filename = i.filename();
      line = i.computeLine(&column);
      pos = column.oneOriginValue();
    }

    if (i.maybeFunctionDisplayAtom()) {
      function = i.maybeFunctionDisplayAtom();
    } else {
      function = cx->emptyString();
    }

    // Keep going down the stack if the function is self hosted
    if (strcmp(filename, "self-hosted") != 0) {
      break;
    }
  }

  if (filename == NULL) {
    return TaintLocation();
  }

  return TaintLocation(ascii2utf16(std::string(filename)), line, pos, scriptStartline, hash, taintarg(cx, function));
}

TaintOperation JS::TaintOperationFromContext(JSContext* cx, const char* name, bool is_native, JS::HandleValue args, bool fullArgs) {
  return TaintOperation(name, is_native, TaintLocationFromContext(cx), taintargs(cx, args, fullArgs));
}

TaintOperation JS::TaintOperationFromContext(JSContext* cx, const char* name, bool is_native, JS::HandleString arg ) {
  return TaintOperation(name, is_native, TaintLocationFromContext(cx), taintargs(cx, arg));
}

TaintOperation JS::TaintOperationFromContext(JSContext* cx, const char* name, bool is_native, JS::HandleString arg1, JS::HandleString arg2 ) {
  return TaintOperation(name, is_native, TaintLocationFromContext(cx), taintargs(cx, arg1, arg2));
}

TaintOperation JS::TaintOperationFromContextJSString(JSContext* cx, const char* name, bool is_native, JSString* const& arg ) {
  return TaintOperation(name, is_native, TaintLocationFromContext(cx), taintargs_jsstring(cx, arg));
}

TaintOperation JS::TaintOperationFromContextJSString(JSContext* cx, const char* name, bool is_native, JSString* const& arg1, JSString* const& arg2) { 
  return TaintOperation(name, is_native, TaintLocationFromContext(cx), taintargs_jsstring(cx, arg1, arg2));
}


TaintOperation JS::TaintOperationConcat(JSContext* cx, const char* name, bool is_native,
                                             JS::HandleString arg1, JS::HandleString arg2) {
  std::vector<std::u16string> args = taintargs(cx, arg1, arg2);
  std::u16string whichStringsAreTainted = u"tainted:";
  if (arg1->isTainted()) {
    whichStringsAreTainted.append(u"L");
  }
  if (arg2->isTainted()) {
    whichStringsAreTainted.append(u"R");
  }
  args.push_back(whichStringsAreTainted);
  return TaintOperation(name, is_native, TaintLocationFromContext(cx), args);
}

TaintOperation JS::TaintOperationConcat(JSContext* cx, const char* name, bool is_native,
                                             JSString* const& arg1, JSString* const & arg2) {
  std::vector<std::u16string> args = taintargs_jsstring(cx, arg1, arg2);
  std::u16string whichStringsAreTainted = u"tainted:";
  if (arg1->isTainted()) {
    whichStringsAreTainted.append(u"L");
  }
  if (arg2->isTainted()) {
    whichStringsAreTainted.append(u"R");
  }
  args.push_back(whichStringsAreTainted);
  return TaintOperation(name, is_native, TaintLocationFromContext(cx), args);
}

TaintOperation JS::TaintOperationFromContext(JSContext* cx, const char* name, bool is_native) {
  return TaintOperation(name, is_native, TaintLocationFromContext(cx));
}


void JS::MarkTaintedFunctionArguments(JSContext* cx, JSFunction* function, const CallArgs& args)
{
  if (!function)
    return;

  RootedValue name(cx);

  JS::Rooted<JSAtom*> atom(cx);
  if (function->getDisplayAtom(cx, &atom)) {
    name = StringValue(atom);
  }

  RootedFunction fun(cx, function);

  std::u16string sourceinfo(u"unknown");
  if (fun->isInterpreted() && fun->hasBaseScript()) {
    RootedScript script(cx, JSFunction::getOrCreateScript(cx, fun));
    if (script) {
      int lineno = script->lineno();
      js::ScriptSource* source = script->scriptSource();
      if (source && source->filename()) {
        std::string filename(source->filename());
        sourceinfo = ascii2utf16(filename) + u":" + ascii2utf16(std::to_string(lineno));
      }
    }
  }

  TaintLocation location = TaintLocationFromContext(cx);
  for (unsigned i = 0; i < args.length(); i++) {
    if (args[i].isString()) {
      RootedString arg(cx, args[i].toString());
    }
  }
}

bool JS::isTaintedNumber(const Value& val)
{
    if (val.isObject() && val.toObject().is<NumberObject>()) {
        NumberObject& number = val.toObject().as<NumberObject>();
        return number.isTainted();
    }
    return false;
}

bool JS::isTaintedValue(const Value& val)
{
    if (val.isObject() && val.toObject().is<NumberObject>()) {
        NumberObject& number = val.toObject().as<NumberObject>();
        return number.isTainted();
    } else if (val.isString()) {
        return val.toString()->isTainted();
    }
    return false;
}

const TaintFlow& JS::getValueTaint(const Value& val)
{
    if (val.isObject() && val.toObject().is<NumberObject>()) {
        NumberObject& number = val.toObject().as<NumberObject>();
        return number.taint();
    } else if (val.isString()) {
        for (auto& range: val.toString()->Taint()) {
          // Just return first taint range
          return range.flow();
        }
    }
    return TaintFlow::getEmptyTaintFlow();
}

const TaintFlow& JS::getNumberTaint(const Value& val)
{
    if (val.isObject() && val.toObject().is<NumberObject>()) {
        NumberObject& number = val.toObject().as<NumberObject>();
        return number.taint();
    }
    return TaintFlow::getEmptyTaintFlow();
}

bool JS::isAnyTaintedNumber(const Value& val1, const Value& val2)
{
    return isTaintedNumber(val1) || isTaintedNumber(val2);
}

bool JS::isAnyTaintedValue(const Value& val1, const Value& val2)
{
    return isTaintedValue(val1) || isTaintedValue(val2);
}

TaintFlow JS::getAnyNumberTaint(const Value& val1, const Value& val2, const char* name)
{
  // add info for operation
  // add getting combined taint flow
  if (isTaintedNumber(val1) && isTaintedNumber(val2) && (val1 != val2)) {
    // Use a very simple taint operation here to keep things fast
    return TaintFlow::append(getNumberTaint(val1), getNumberTaint(val2), TaintOperation(name));
  } else if (isTaintedNumber(val1)) {
    return getNumberTaint(val1);
  } else {
    return getNumberTaint(val2);
  }
}

TaintFlow JS::getAnyValueTaint(const Value& val1, const Value& val2, const char* name)
{
  // add info for operation
  // add getting combined taint flow 
  if (isTaintedValue(val1) && isTaintedValue(val2) && (val1 != val2)) {
    // Use a very simple taint operation here to keep things fast
    return TaintFlow::append(getValueTaint(val1), getValueTaint(val2), TaintOperation(name));
  } else if (isTaintedValue(val1)) {
    return getValueTaint(val1);
  } else {
    return getValueTaint(val2);
  }
}

bool JS::getTaintOperationObject(JSContext* cx, const TaintOperation& op, JS::Handle<JSObject*> node)
{
  if (!node)
    return false;

  RootedString operation(cx, JS_NewStringCopyZ(cx, op.name()));
  if (!operation)
    return false;

  if (!JS_DefineProperty(cx, node, "operation", operation, JSPROP_READONLY | JSPROP_ENUMERATE | JSPROP_PERMANENT))
    return false;

  RootedValue isBuiltIn(cx);
  isBuiltIn.setBoolean(op.is_native());

  if (!JS_DefineProperty(cx, node, "builtin", isBuiltIn, JSPROP_READONLY | JSPROP_ENUMERATE | JSPROP_PERMANENT))
    return false;

  RootedValue isSource(cx);
  isSource.setBoolean(op.isSource());

  if (!JS_DefineProperty(cx, node, "source", isSource, JSPROP_READONLY | JSPROP_ENUMERATE | JSPROP_PERMANENT))
    return false;

  // Wrap the location
  RootedObject location(cx, JS_NewObject(cx, nullptr));
  if (!location)
    return false;
  RootedString filename(cx, JS_NewUCStringCopyZ(cx, op.location().filename().c_str()));
  if (!filename)
    return false;
  RootedString function(cx, JS_NewUCStringCopyZ(cx, op.location().function().c_str()));
  if (!function)
    return false;
  // Also add the MD5 hash of the containing function
  RootedString hash(cx, JS_NewStringCopyZ(cx, JS::convertDigestToHexString(op.location().scriptHash()).c_str()));
  if (!hash)
    return false;

  if (!JS_DefineProperty(cx, location, "filename", filename, JSPROP_READONLY | JSPROP_ENUMERATE | JSPROP_PERMANENT) ||
      !JS_DefineProperty(cx, location, "function", function, JSPROP_READONLY | JSPROP_ENUMERATE | JSPROP_PERMANENT) ||
      !JS_DefineProperty(cx, location, "line", op.location().line(), JSPROP_READONLY | JSPROP_ENUMERATE | JSPROP_PERMANENT) ||
      !JS_DefineProperty(cx, location, "pos", op.location().pos(), JSPROP_READONLY | JSPROP_ENUMERATE | JSPROP_PERMANENT) ||
      !JS_DefineProperty(cx, location, "scriptline", op.location().scriptStartLine(), JSPROP_READONLY | JSPROP_ENUMERATE | JSPROP_PERMANENT) ||
      !JS_DefineProperty(cx, location, "scripthash", hash, JSPROP_READONLY | JSPROP_ENUMERATE | JSPROP_PERMANENT))
    return false;

  if (!JS_DefineProperty(cx, node, "location", location, JSPROP_READONLY | JSPROP_ENUMERATE | JSPROP_PERMANENT))
    return false;

  // Wrap the arguments
  RootedValueVector taint_arguments(cx);
  for (auto& taint_argument : op.arguments()) {
    RootedString argument(cx, JS_NewUCStringCopyZ(cx, taint_argument.c_str()));
    if (!argument)
      return false;

    if (!taint_arguments.append(StringValue(argument)))
      return false;
  }

  RootedObject arguments(cx, NewDenseCopiedArray(cx, taint_arguments.length(), taint_arguments.begin()));
  if (!JS_DefineProperty(cx, node, "arguments", arguments, JSPROP_READONLY | JSPROP_ENUMERATE | JSPROP_PERMANENT))
    return false;

  return true;
}

bool JS::getTaintFlowObject(JSContext* cx, const TaintFlow& flow, JS::Handle<JSObject*> obj)
{
  if(!obj)
    return false;

  // Wrap the taint flow for the current range.
  RootedValueVector taint_flow(cx);
  for (TaintNodeBase& taint_node : flow) {
    RootedObject node(cx, JS_NewObject(cx, nullptr));
    if (!node)
      return false;
    if (!getTaintOperationObject(cx, taint_node.operation(), node)) {
      return false;
    }
    if (!taint_flow.append(ObjectValue(*node))) {
      return false;
    }
  }

  RootedObject flow_obj(cx, NewDenseCopiedArray(cx, taint_flow.length(), taint_flow.begin()));
  if (!flow_obj)
    return false;
  if (!JS_DefineProperty(cx, obj, "flow", flow_obj, JSPROP_READONLY | JSPROP_ENUMERATE | JSPROP_PERMANENT))
    return false;

  // Also output the sources
  RootedValueVector sources(cx);
  for (TaintOperation op: flow.getSources()) {
    RootedObject node(cx, JS_NewObject(cx, nullptr));
    if (!node)
      return false;
    if (!getTaintOperationObject(cx, op, node)) {
      return false;
    }
    if (!sources.append(ObjectValue(*node))) {
      return false;
    }
  }

  RootedObject sources_obj(cx, NewDenseCopiedArray(cx, sources.length(), sources.begin()));
  if (!sources_obj) {
    return false;
  }
  if (!JS_DefineProperty(cx, obj, "sources", sources_obj, JSPROP_READONLY | JSPROP_ENUMERATE | JSPROP_PERMANENT))
    return false;

  return true;
}

bool JS::getStringTaintObject(JSContext* cx, const StringTaint& taint, JS::Handle<JSObject*> result)
{
  // Wrap all taint ranges of the string.
  RootedValueVector ranges(cx);
  for (const TaintRange& taint_range : taint) {
    RootedObject range(cx, JS_NewObject(cx, nullptr));
    if(!range)
      return false;

    if (!JS_DefineProperty(cx, range, "begin", taint_range.begin(), JSPROP_READONLY | JSPROP_ENUMERATE | JSPROP_PERMANENT) ||
        !JS_DefineProperty(cx, range, "end", taint_range.end(), JSPROP_READONLY | JSPROP_ENUMERATE | JSPROP_PERMANENT))
      return false;

    if (!getTaintFlowObject(cx, taint_range.flow(), range)) {
      return false;
    }

    if (!ranges.append(ObjectValue(*range)))
      return false;
  }

  RootedObject ranges_obj(cx, NewDenseCopiedArray(cx, ranges.length(), ranges.begin()));
  if (!ranges_obj)
    return false;
  if (!JS_DefineProperty(cx, result, "ranges", ranges_obj, JSPROP_READONLY | JSPROP_ENUMERATE | JSPROP_PERMANENT))
    return false;
  
  return true;
}

// Print a message to stdout.
void JS::TaintFoxReport(JSContext* cx, const char* msg)
{
  JS_ReportWarningUTF8(cx, "%s", msg);
}
