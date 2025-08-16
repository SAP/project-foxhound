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
#include "js/UniquePtr.h"
#include "util/GetPidProvider.h"  // getpid()
#include "vm/FrameIter.h"
#include "vm/JSAtomUtils.h"
#include "vm/JSContext.h"
#include "vm/JSFunction.h"
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
    // Foxhound was crashing after startup after copying start and end
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

std::u16string JS::taintarg_jsstring(JSContext* cx, const JSLinearString* const& str)
{
  if (!str) {
    return std::u16string();
  }

  size_t len = str->length();

  js::UniquePtr<char16_t, JS::FreePolicy> buf(cx->pod_malloc<char16_t>(len));
  js::CopyChars(buf.get(), *str);
  if(len > max_length) {
    // Foxhound was crashing after startup after copying start and end
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

std::u16string JS::taintarg_jsstring(JSContext* cx, JSString* const& str) {
  if (!str) {
    return std::u16string();
  }
  JSLinearString* linear = str->ensureLinear(cx);
  return taintarg_jsstring(cx, linear);
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

std::vector<std::u16string> JS::taintargs_jsstring(JSContext* cx, const JSLinearString* const& str1, const JSLinearString* const& str2)
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

  const char* filename = nullptr;
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

  if (filename == nullptr) {
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

TaintOperation JS::TaintOperationFromContextJSString(JSContext* cx, const char* name, bool is_native, const JSLinearString* const& arg1, const JSLinearString* const& arg2) { 
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
  JSAtom* ma = function->maybePartialDisplayAtom();
  if (ma != nullptr) {
    atom = ma;
  } else {
    atom = Atomize(cx,"", 0);
  }
  name = StringValue(atom);

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
    JS::Rooted<JSObject*> obj(cx, ToObject(cx, location));
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
