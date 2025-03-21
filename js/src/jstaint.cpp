/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * vim: set ts=8 sts=2 et sw=2 tw=80:
 */
#include "jstaint.h"

#include "mozilla/Sprintf.h"

#include <algorithm>
#include <iomanip>
#include <iostream>
#include <locale>
#include <sstream>
#include <string>
#include <utility>

#include "jsapi.h"
#include "js/Array.h"
#include "js/CharacterEncoding.h"
#include "js/ErrorReport.h"
#include "js/JSON.h"
#include "js/StableStringChars.h"
#include "js/UniquePtr.h"
#include "util/GetPidProvider.h"  // getpid()
#include "vm/FrameIter.h"
#include "vm/JSAtomUtils.h"
#include "vm/JSContext.h"
#include "vm/JSFunction.h"
#include "vm/JSONParser.h"
#include "vm/JSONPrinter.h"
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
      if (arg->isTainted()) {
        arg->taint().extend(
          TaintOperation("function", location,
                         { taintarg(cx, name), sourceinfo, taintarg(cx, i), taintarg(cx, args.length()) } ));
      }
    }
  }
}

bool ReadStringFromObject(JSContext* cx, HandleObject obj, const char* name, js::MutableHandleString str) {
  RootedValue v(cx);
  if(!JS_GetProperty(cx, obj, name, &v)) {
    JS_ReportWarningUTF8(cx, "Can't read property: %s\n", name);
    return false;
  }
  if (!v.isString()) {
    JS_ReportWarningUTF8(cx, "%s is not an string\n", name);
    return false;
  }
  JS::Rooted<JSString*> string(cx, v.toString());
  if (!string) {
    JS_ReportWarningUTF8(cx, "Failed to convert property %s to string\n", name);
    return false;
  }
  str.set(string);
  return true;
}

bool ReadArrayFromObject(JSContext* cx, HandleObject obj, const char* name, uint32_t& length, js::MutableHandleObject array) {
  RootedValue v(cx);
  if(!JS_GetProperty(cx, obj, name, &v)) {
    JS_ReportWarningUTF8(cx, "Can't read property: %s\n", name);
    return false;
  }
  bool isArray;
  if (!IsArrayObject(cx, v, &isArray)) {
    JS_ReportWarningUTF8(cx, "%s is not an array\n", name);
    return false;
  }
  if(!isArray) {
    JS_ReportWarningUTF8(cx, "%s is not an array\n", name);
    return false;
  }
  JS::Rooted<JSObject*> arrayObject(cx, ToObject(cx, v));
  if (!GetArrayLength(cx, arrayObject, &length)) {
    JS_ReportWarningUTF8(cx, "%s\n", "Can't read array length..");
    return false;
  }
  array.set(arrayObject);
  return true;
}

bool ReadIntFromObject(JSContext* cx, HandleObject obj, const char* name, uint32_t& out) {
  RootedValue v(cx);
  if(!JS_GetProperty(cx, obj, name, &v)) {
    JS_ReportWarningUTF8(cx, "Can't read property: %s\n", name);
    return false;
  }
  if(!v.isInt32()) {
    JS_ReportWarningUTF8(cx, "Property is not an int\n");
    return false;
  }
  out = v.toInt32();
  return true;
}

bool ReadBooleanFromObject(JSContext* cx, HandleObject obj, const char* name, bool& out) {
  RootedValue v(cx);
  if(!JS_GetProperty(cx, obj, name, &v)) {
    JS_ReportWarningUTF8(cx, "Can't read property: %s\n", name);
    return false;
  }
  if(!v.isBoolean()) {
    JS_ReportWarningUTF8(cx, "Property is not an boolean\n");
    return false;
  }
  out = v.toBoolean();
  return true;
}

std::vector<std::u16string> JSArrayToArgsVector(JSContext* cx, uint32_t args_length, HandleObject aArgs) {
  std::vector<std::u16string> args;
  for (uint32_t i = 0; i < args_length; ++i) {
    RootedValue v(cx);
    if (!JS_GetElement(cx, aArgs, i, &v)) {
      JS_ReportWarningUTF8(cx, "Can't get operation argument at idx %d\n", i);
      continue;
    }
    if(!v.isString()) {
      JS_ReportWarningUTF8(cx, "Operation argument at idx %d isn't a string\n", i);
      return {};
    }
    JS::Rooted<JSString*> arg(cx, v.toString());
    args.emplace_back(taintarg_jsstring_full( cx, arg));
  }
  return args;
}

TaintMd5 convertHexStringToDigest(const std::string& str)
{
  if (str.length() != 32) {
    std::cerr << str << " has the wrong length, expected 32 but got: " << str.length() << "\n";
    return {};
  }

  TaintMd5 digest;
  for (size_t i = 0; i < 16; ++i) {
    std::stringstream ss;
    ss << std::hex << str.substr(i * 2, 2);
    int byte;
    ss >> byte;
    digest[i] = static_cast<unsigned char>(byte);
  }
  return digest;
}

TaintLocation JSObjectToTaintLocation(JSContext* cx, HandleObject aLocation) {
  js::RootedString rFileName(cx);
  if(!ReadStringFromObject(cx, aLocation, "filename", &rFileName)) {
    JS_ReportWarningUTF8(cx, "Can't get string property %s\n", "filename");
    return {};
  }
  std::u16string filename(taintarg_full(cx, rFileName));
  uint32_t line, pos, scriptline;
  if(!ReadIntFromObject(cx, aLocation, "line", line)) {
    JS_ReportWarningUTF8(cx,"Failed to read %s property of TaintOperation\n", "line");
    return {};
  }
  if(!ReadIntFromObject(cx, aLocation, "pos", pos)) {
    JS_ReportWarningUTF8(cx,"Failed to read %s property of TaintOperation\n", "pos");
    return {};
  }
  if(!ReadIntFromObject(cx, aLocation, "scriptline", scriptline)) {
    JS_ReportWarningUTF8(cx,"Failed to read %s property of TaintOperation\n", "scriptline");
    return {};
  }
  js::RootedString rDigest(cx);
  if(!ReadStringFromObject(cx, aLocation, "scripthash", &rDigest)) {
    JS_ReportWarningUTF8(cx, "Can't get string property %s\n", "scripthash");
    return {};
  }
  UniqueChars digest_chars = JS_EncodeStringToLatin1(cx, rDigest);
  TaintMd5 digest(convertHexStringToDigest(digest_chars.get()));
  js::RootedString rFunction(cx);
  if(!ReadStringFromObject(cx, aLocation, "function", &rFunction)) {
    JS_ReportWarningUTF8(cx, "Can't get string property %s\n", "function");
    return {};
  }
  std::u16string function(taintarg_full(cx, rFunction));
  return {filename, line, pos, scriptline, digest, function};
}

TaintOperation JSObjectToTaintOperation(JSContext* cx, HandleObject aOperation) {
  js::RootedString rName(cx);
  if(!ReadStringFromObject(cx, aOperation, "operation", &rName)) {
    JS_ReportWarningUTF8(cx, "Can't get string property %s\n", "operation");
    return {};
  }
  UniqueChars src = JS_EncodeStringToLatin1(cx, rName);
  std::string name(src.get());

  bool is_source = false;
  if(!ReadBooleanFromObject(cx, aOperation, "source", is_source)) {
    JS_ReportWarningUTF8(cx,"Failed to read %s property of TaintOperation\n", "source");
    return {};
  }

  bool is_native = false;
  if(!ReadBooleanFromObject(cx, aOperation, "builtin", is_native)) {
    JS_ReportWarningUTF8(cx,"Failed to read %s property of TaintOperation\n", "builtin");
    return {};
  }

  uint32_t args_length;
  JS::Rooted<JSObject*> argsObj(cx);
  if(!ReadArrayFromObject(cx, aOperation, "arguments", args_length, &argsObj)) {
    JS_ReportWarningUTF8(cx,"Failed to read %s property of TaintRange\n", "arguments");

    return {};
  }
  std::vector<std::u16string> args(JSArrayToArgsVector(cx, args_length, argsObj));

  RootedValue vLoc(cx);
  if (!JS_GetProperty(cx, aOperation, "location", &vLoc)) {
    JS_ReportWarningUTF8(cx, "Can't get %s from operation at idx\n", "location");
    return {};
  }
  if(!vLoc.isObject()) {
    JS_ReportWarningUTF8(cx, "%s\n", "location property isn't an object\n");
    return {};
  }
  JS::Rooted<JSObject*> loc(cx, ToObject(cx, vLoc));
  TaintLocation location = JSObjectToTaintLocation(cx,loc);

  TaintOperation op(name.c_str(), is_native, location, args);
  if(is_source) {
    op.setSource();
  }
  return op;
}

TaintFlow JSObjectToTaintFlow(JSContext* cx, uint32_t flow_length, HandleObject aFlow) {
  TaintFlow flow;
  uint32_t start_idx = flow_length-1;
  for (uint32_t i = 0; i < flow_length; ++i) {
    RootedValue v(cx);
    if (!JS_GetElement(cx, aFlow, start_idx - i, &v)) {
      JS_ReportWarningUTF8(cx, "Can't get flow operation at idx %d\n", start_idx - i);
      continue;;
    }
    if(!v.isObject()) {
      JS_ReportWarningUTF8(cx, "Taint flow operation at idx %d isn't an object\n", start_idx - i);
      return TaintFlow::getEmptyTaintFlow();
    }
    JS::Rooted<JSObject*> operation(cx, ToObject(cx, v));
    flow = flow.extend(JSObjectToTaintOperation(cx, operation));
  }
  return flow;
}

TaintRange JSObjectToTaintRange(JSContext* cx, HandleObject range) {
  uint32_t begin, end;
  if(!ReadIntFromObject(cx, range, "begin", begin)) {
    JS_ReportWarningUTF8(cx,"Failed to read %s property of TaintRange\n", "begin");
    return {};
  }
  if(!ReadIntFromObject(cx, range, "end", end)) {
    JS_ReportWarningUTF8(cx,"Failed to read %s property of TaintRange\n", "end");
    return {};
  }
  uint32_t flow_length;
  JS::Rooted<JSObject*> flows(cx);
  if(!ReadArrayFromObject(cx, range, "flow", flow_length, &flows)) {
    JS_ReportWarningUTF8(cx,"Failed to read %s property of TaintRange\n", "flow");
    return {};
  }
  return {begin, end, JSObjectToTaintFlow(cx, flow_length, flows)};
}

StringTaint JS::DeserializeTaint(JSContext* cx, Handle<JSString*> string) {
  JS::Rooted<JS::Value> jsonResult(cx);
  if(!JS_ParseJSON(cx, string, &jsonResult)) {
    JS_ReportWarningUTF8(cx,"Failed to parse JSON taint\n");
    return EmptyTaint;
  }
  if(!jsonResult.isObject()) {
    JS_ReportWarningUTF8(cx,"JSON result isn't an object\n");
    return EmptyTaint;
  }
  JS::Rooted<JSObject*> jsonObj(cx, ToObject(cx, jsonResult));

  JS::Rooted<Value> taintObj(cx);
  if(!JS_GetProperty(cx, jsonObj, "taint", &taintObj)) {
    JS_ReportWarningUTF8(cx, "Can't read %s property\n", "taint");
    return EmptyTaint;
  }
  bool isArray;
  if (!IsArrayObject(cx, taintObj, &isArray)) {
    JS_ReportWarningUTF8(cx,"%s\n", "TaintObj is not an array");
    return EmptyTaint;
  }
  if(!isArray) {
    return EmptyTaint;
  }
  RootedObject taints(cx, &taintObj.toObject());
  uint32_t length;
  if (!GetArrayLength(cx, taints, &length)) {
    return EmptyTaint;
  }
  StringTaint taint;
  for (uint32_t i = 0; i < length; ++i) {
    RootedValue v(cx);
    if (!JS_GetElement(cx, taints, i, &v)) {
      JS_ReportWarningUTF8(cx,"Can't read taint range at idx %d\n", i);
      continue;
    }
    if(!v.isObject()) {
      JS_ReportWarningUTF8(cx, "Taint range at index %d isn't an object\n", i);
      continue;
    }
    JS::Rooted<JSObject*> range(cx, ToObject(cx, v));
    taint.append(JSObjectToTaintRange(cx, range));
  }

  return taint;
}


JSString* JS::SerializeTaint(JSContext* cx, const StringTaint& taint) {
  js::JSSprinter printer(cx);
  if(!printer.init()) {
    std::cerr << "Failed to init printer\n";
  }
  js::JSONPrinter jsonPrinter(printer);
  WriteTaintToJSON(taint, jsonPrinter);
  jsonPrinter.flush();
  printer.flush();
  return printer.release(cx);
}

void JS::WriteTaintToJSON(const StringTaint& taint, js::JSONPrinter& json) {
  json.beginObject();
  json.beginListProperty("taint");
  for (const TaintRange& range : taint) {
    json.beginObject();
    json.property("begin", range.begin());
    json.property("end", range.end());

    json.beginListProperty("flow");
    for (TaintNode& node : range.flow()) {
      const TaintOperation& op = node.operation();
      json.beginObject();
      json.property("operation", op.name());
      json.boolProperty("builtin", op.is_native());
      json.boolProperty("source", op.isSource());

      const TaintLocation& loc = op.location();
      json.beginObjectProperty("location");
      json.property("filename", loc.filename().c_str(), loc.filename().size());
      json.property("function", loc.function().c_str(), loc.function().size());

      json.property("line", loc.line());
      json.property("pos", loc.pos());
      json.property("scriptline", loc.scriptStartLine());
      json.property("scripthash", JS::convertDigestToHexString(loc.scriptHash()).c_str());
      json.endObject(); // Location

      json.beginListProperty("arguments");
      for (const auto& arg : op.arguments()) {
        json.string(arg.c_str(), arg.size());
      }
      json.endList();

      json.endObject(); // Operation
    }
    json.endList(); // flow
    json.endObject(); // range
  }
  json.endList();
  json.endObject();
}

#if defined(JS_JITSPEW)
void JS::MaybeSpewStringTaint(JSContext* cx, JSString* str, HandleValue location) {
  // Use the standard spew framework to create a single spew file
  AutoStructuredSpewer spew(cx, SpewChannel::TaintFlowSpewer, cx->currentScript());
  if (spew) {
    // Dump the string and taint flow itself
    PrintJsonTaint(cx, str, location, *spew);
    spew->flush();
  }
}
#endif

#if defined(JS_TAINTSPEW)

// Choose a sensible default directory.
//
// The preference here is to use the current working directory,
// except on Android.
#  ifndef DEFAULT_TAINT_DIRECTORY
#    if defined(_WIN32)
#      define DEFAULT_TAINT_DIRECTORY "."
#    elif defined(__ANDROID__)
#      define DEFAULT_TAINT_DIRECTORY "/sdcard/Download"
#    else
#      define DEFAULT_TAINT_DIRECTORY "."
#    endif
#  endif

void JS::WriteTaintToFile(JSContext* cx, JSString* str, HandleValue location) {
  // Don't use the standard spewer here, as we can't easily set the filename
  static int counter = 0;

  char filename[2048] = {0};
  if (getenv("TAINT_FILE")) {
      SprintfLiteral(filename, "%s", getenv("TAINT_FILE"));
  } else {
      SprintfLiteral(filename, "%s/taint_output", DEFAULT_TAINT_DIRECTORY);
  }

  char suffix_path[2048] = {0};
  SprintfLiteral(suffix_path, "%s.%d.%u.json", filename, getpid(), counter++);
  
  Fprinter output;
  if (!output.init(suffix_path)) {
    SEprinter p;
    p.put("Error opening taint output file: ");
    p.put(suffix_path);
    p.put("\n");
    p.flush();
    return;
  }

  JSONPrinter json(output);
  json.beginObject();
  PrintJsonTaint(cx, str, location, json);
  json.endObject();

  output.flush();
  output.finish();
}
#endif

#if defined(JS_JITSPEW) || defined(JS_TAINTSPEW)
void JS::PrintJsonObject(JSContext* cx, JSObject* obj, js::JSONPrinter& json) {
  // This code is adapted from JSObject::dumpFields, which was too verbose for our needs
  if (obj && obj->is<NativeObject>()) {
    const auto* nobj = &obj->as<NativeObject>();

    if (PropMap* map = nobj->shape()->propMap()) {
      Vector<PropMap*, 8, SystemAllocPolicy> maps;
      while (true) {
        if (!maps.append(map)) {
          json.property("error", "*oom in JSObject::dumpFields*");
          break;
        }
        if (!map->hasPrevious()) {
          break;
        }
        map = map->asLinked()->previous();
      }

      for (size_t i = maps.length(); i > 0; i--) {
        size_t index = i - 1;
        PropMap* map = maps[index];
        uint32_t len = (index == 0) ? obj->shape()->asNative().propMapLength()
                                    : PropMap::Capacity;
        for (uint32_t j = 0; j < len; j++) {
          if (!map->hasKey(j)) {
            MOZ_ASSERT(map->isDictionary());
            continue;
          }

          JS::UniqueChars propChars = map->getPropertyNameAt(j);
          if (!propChars) {
            json.property("error", "*oom in PropMap::getPropertyNameAt*");
            continue;
          }

          PropertyInfoWithKey prop = map->getPropertyInfoWithKey(j);
          if (prop.isDataProperty()) {
            const Value& val = nobj->getSlot(prop.slot());
            if (val.isDouble()) {
              double d = val.toDouble();
              // JSONPrinter::floatProperty appears to ignore the precision argument
              json.floatProperty(propChars.get(), d, 10);
            } else if (val.isString()) {
              JSString *str = val.toString();
              JSLinearString* linear = str->ensureLinear(cx);
              if (linear) {
                json.property(propChars.get(), linear);
              } else {
                json.property(propChars.get(), "Non-linear String!");
              }
            }
          }
        }
      }
    }
  }
}

void JS::PrintJsonTaint(JSContext* cx, JSString* str, HandleValue location, js::JSONPrinter& json) {
  if (!str || !str->taint()) {
    return;
  }

  // Dump additional information from the taintreport
  if (location.isObject()) {
    JSObject* obj = ToObject(cx, location);
    PrintJsonObject(cx, obj, json);
  }

  JSLinearString* linear = str->ensureLinear(cx);
  if (linear) {
    json.property("string", linear);
  } else {
    json.property("string", "Non-linear String!");
  }

  json.beginListProperty("taint");
  for (const TaintRange& range : str->taint()) {
    json.beginObject();
    json.property("begin", range.begin());
    json.property("end", range.end());

    json.beginListProperty("flow");
    for (TaintNode& node : range.flow()) {
      const TaintOperation& op = node.operation();
      json.beginObject();
      json.property("operation", op.name());
      json.boolProperty("builtin", op.is_native());
      json.boolProperty("source", op.isSource());

      const TaintLocation& loc = op.location();
      json.beginObjectProperty("location");
      json.property("filename", loc.filename().c_str(), loc.filename().size());
      json.property("line", loc.line());
      json.property("pos", loc.pos());
      json.property("scriptline", loc.scriptStartLine());
      json.property("scripthash", JS::convertDigestToHexString(loc.scriptHash()).c_str());
      json.endObject(); // Location

      json.beginListProperty("arguments");
      for (auto& arg : op.arguments()) {
        json.string(arg.c_str(), arg.size());
      }
      json.endList();

      json.endObject(); // Operation
    }
    json.endList(); // flow
    json.endObject(); // range
  }
  json.endList();

}
#endif

void JS::MaybeSpewMessage(JSContext* cx, JSString* str) {
  // First print message to stderr
  SEprinter p;
  p.put("!!! foxhound() called with message: ");
  p.putString(cx, str);
  p.put("\n");
  p.flush();

#ifdef JS_STRUCTURED_SPEW
  // Spew to file if enabled
  AutoStructuredSpewer spew(cx, SpewChannel::TaintFlowSpewer, cx->currentScript());
  if (spew) {
    JSLinearString* linear = str->ensureLinear(cx);
    if (linear) {
      spew->property("foxhound", linear);
    } else {
      spew->property("foxhound", "Non-linear String!");
    }
  }
#endif
}

// Print a warning message to stdout and the JS console
void JS::TaintFoxReport(JSContext* cx, const char* msg)
{
  JS_ReportWarningUTF8(cx, "%s", msg);
}
