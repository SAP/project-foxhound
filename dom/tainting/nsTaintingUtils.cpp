/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/*
 * Modifications Copyright SAP SE. 2019-2021.  All rights reserved.
 */

#include "nsTaintingUtils.h"

#include <algorithm>
#include <iterator>
#include <string_view>
#include <utility>
#include "jsfriendapi.h"
#include "mozilla/dom/ToJSValue.h"
#include "XPathGenerator.h"
#include "nsContentUtils.h"
#include "nsString.h"
#include "mozilla/Logging.h"
#include "mozilla/StaticPrefs_tainting.h"

#if !defined(DEBUG) && !defined(MOZ_ENABLE_JS_DUMP)
#  include "mozilla/StaticPrefs_browser.h"
#endif

using namespace mozilla;
using namespace mozilla::dom;

static LazyLogModule gTaintLog("Taint");

namespace {

// Maps a source or sink name, as passed to MarkTaintSource / ReportTaintSink,
// to the static pref that enables it. Tables must be sorted by name.
struct TaintPref {
  std::string_view mName;
  bool (*mIsEnabled)();
};

constexpr TaintPref kSourcePrefs[] = {
    {"MessageEvent", StaticPrefs::tainting_source_MessageEvent},
    {"PushMessageData", StaticPrefs::tainting_source_PushMessageData},
    {"PushSubscription.endpoint", StaticPrefs::tainting_source_PushSubscription_endpoint},
    {"WebSocket.MessageEvent.data", StaticPrefs::tainting_source_WebSocket_MessageEvent_data},
    {"XMLHttpRequest.response", StaticPrefs::tainting_source_XMLHttpRequest_response},
    {"XMLHttpRequest.response(json)", StaticPrefs::tainting_source_XMLHttpRequest_response_json},
    {"document.baseURI", StaticPrefs::tainting_source_document_baseURI},
    {"document.cookie", StaticPrefs::tainting_source_document_cookie},
    {"document.documentURI", StaticPrefs::tainting_source_document_documentURI},
    {"document.elementFromPoint", StaticPrefs::tainting_source_document_elementFromPoint},
    {"document.elementsFromPoint", StaticPrefs::tainting_source_document_elementsFromPoint},
    {"document.getElementById", StaticPrefs::tainting_source_document_getElementById},
    {"document.getElementsByClassName", StaticPrefs::tainting_source_document_getElementsByClassName},
    {"document.getElementsByTagName", StaticPrefs::tainting_source_document_getElementsByTagName},
    {"document.getElementsByTagNameNS", StaticPrefs::tainting_source_document_getElementsByTagNameNS},
    {"document.querySelector", StaticPrefs::tainting_source_document_querySelector},
    {"document.querySelectorAll", StaticPrefs::tainting_source_document_querySelectorAll},
    {"document.referrer", StaticPrefs::tainting_source_document_referrer},
    {"element.attribute", StaticPrefs::tainting_source_element_attribute},
    {"element.closest", StaticPrefs::tainting_source_element_closest},
    {"fetch.json()", StaticPrefs::tainting_source_fetch_json},
    {"fetch.text()", StaticPrefs::tainting_source_fetch_text},
    {"input.value", StaticPrefs::tainting_source_input_value},
    {"localStorage.getItem", StaticPrefs::tainting_source_localStorage_getItem},
    {"location.hash", StaticPrefs::tainting_source_location_hash},
    {"location.host", StaticPrefs::tainting_source_location_host},
    {"location.hostname", StaticPrefs::tainting_source_location_hostname},
    {"location.href", StaticPrefs::tainting_source_location_href},
    {"location.origin", StaticPrefs::tainting_source_location_origin},
    {"location.pathname", StaticPrefs::tainting_source_location_pathname},
    {"location.port", StaticPrefs::tainting_source_location_port},
    {"location.protocol", StaticPrefs::tainting_source_location_protocol},
    {"location.search", StaticPrefs::tainting_source_location_search},
    {"script.innerHTML", StaticPrefs::tainting_source_script_innerHTML},
    {"sessionStorage.getItem", StaticPrefs::tainting_source_sessionStorage_getItem},
    {"textarea.value", StaticPrefs::tainting_source_textarea_value},
    {"window.name", StaticPrefs::tainting_source_window_name},
};

constexpr TaintPref kSinkPrefs[] = {
    {"EventSource", StaticPrefs::tainting_sink_EventSource},
    {"Function.ctor", StaticPrefs::tainting_sink_Function_ctor},
    {"Range.createContextualFragment(fragment)", StaticPrefs::tainting_sink_Range_createContextualFragment_fragment},
    {"WebSocket", StaticPrefs::tainting_sink_WebSocket},
    {"WebSocket.send", StaticPrefs::tainting_sink_WebSocket_send},
    {"XMLHttpRequest.open(password)", StaticPrefs::tainting_sink_XMLHttpRequest_open_password},
    {"XMLHttpRequest.open(url)", StaticPrefs::tainting_sink_XMLHttpRequest_open_url},
    {"XMLHttpRequest.open(username)", StaticPrefs::tainting_sink_XMLHttpRequest_open_username},
    {"XMLHttpRequest.send", StaticPrefs::tainting_sink_XMLHttpRequest_send},
    {"XMLHttpRequest.setRequestHeader(name)", StaticPrefs::tainting_sink_XMLHttpRequest_setRequestHeader_name},
    {"XMLHttpRequest.setRequestHeader(value)", StaticPrefs::tainting_sink_XMLHttpRequest_setRequestHeader_value},
    {"a.href", StaticPrefs::tainting_sink_a_href},
    {"area.href", StaticPrefs::tainting_sink_area_href},
    {"document.cookie", StaticPrefs::tainting_sink_document_cookie},
    {"document.write", StaticPrefs::tainting_sink_document_write},
    {"document.writeln", StaticPrefs::tainting_sink_document_writeln},
    {"element.after", StaticPrefs::tainting_sink_element_after},
    {"element.append", StaticPrefs::tainting_sink_element_append},
    {"element.before", StaticPrefs::tainting_sink_element_before},
    {"element.prepend", StaticPrefs::tainting_sink_element_prepend},
    {"element.style", StaticPrefs::tainting_sink_element_style},
    {"embed.src", StaticPrefs::tainting_sink_embed_src},
    {"eval", StaticPrefs::tainting_sink_eval},
    {"eventHandler", StaticPrefs::tainting_sink_eventHandler},
    {"fetch.body", StaticPrefs::tainting_sink_fetch_body},
    {"fetch.header(key)", StaticPrefs::tainting_sink_fetch_header_key},
    {"fetch.header(value)", StaticPrefs::tainting_sink_fetch_header_value},
    {"fetch.url", StaticPrefs::tainting_sink_fetch_url},
    {"form.action", StaticPrefs::tainting_sink_form_action},
    {"iframe.src", StaticPrefs::tainting_sink_iframe_src},
    {"iframe.srcdoc", StaticPrefs::tainting_sink_iframe_srcdoc},
    {"img.src", StaticPrefs::tainting_sink_img_src},
    {"img.srcset", StaticPrefs::tainting_sink_img_srcset},
    {"innerHTML", StaticPrefs::tainting_sink_innerHTML},
    {"insertAdjacentHTML", StaticPrefs::tainting_sink_insertAdjacentHTML},
    {"insertAdjacentText", StaticPrefs::tainting_sink_insertAdjacentText},
    {"localStorage.setItem", StaticPrefs::tainting_sink_localStorage_setItem},
    {"localStorage.setItem(key)", StaticPrefs::tainting_sink_localStorage_setItem_key},
    {"location.assign", StaticPrefs::tainting_sink_location_assign},
    {"location.hash", StaticPrefs::tainting_sink_location_hash},
    {"location.host", StaticPrefs::tainting_sink_location_host},
    {"location.href", StaticPrefs::tainting_sink_location_href},
    {"location.pathname", StaticPrefs::tainting_sink_location_pathname},
    {"location.port", StaticPrefs::tainting_sink_location_port},
    {"location.protocol", StaticPrefs::tainting_sink_location_protocol},
    {"location.replace", StaticPrefs::tainting_sink_location_replace},
    {"location.search", StaticPrefs::tainting_sink_location_search},
    {"media.src", StaticPrefs::tainting_sink_media_src},
    {"navigator.sendBeacon(body)", StaticPrefs::tainting_sink_navigator_sendBeacon_body},
    {"navigator.sendBeacon(url)", StaticPrefs::tainting_sink_navigator_sendBeacon_url},
    {"object.data", StaticPrefs::tainting_sink_object_data},
    {"outerHTML", StaticPrefs::tainting_sink_outerHTML},
    {"script.innerHTML", StaticPrefs::tainting_sink_script_innerHTML},
    {"script.src", StaticPrefs::tainting_sink_script_src},
    {"script.text", StaticPrefs::tainting_sink_script_text},
    {"script.textContent", StaticPrefs::tainting_sink_script_textContent},
    {"sessionStorage.setItem", StaticPrefs::tainting_sink_sessionStorage_setItem},
    {"sessionStorage.setItem(key)", StaticPrefs::tainting_sink_sessionStorage_setItem_key},
    {"setInterval", StaticPrefs::tainting_sink_setInterval},
    {"setTimeout", StaticPrefs::tainting_sink_setTimeout},
    {"source", StaticPrefs::tainting_sink_source},
    {"srcset", StaticPrefs::tainting_sink_srcset},
    {"track.src", StaticPrefs::tainting_sink_track_src},
    {"window.open", StaticPrefs::tainting_sink_window_open},
    {"window.postMessage", StaticPrefs::tainting_sink_window_postMessage},
};

constexpr bool TaintPrefLess(const TaintPref& aA, const TaintPref& aB) {
  return aA.mName < aB.mName;
}

static_assert(std::is_sorted(std::begin(kSourcePrefs), std::end(kSourcePrefs),
                             TaintPrefLess));
static_assert(std::is_sorted(std::begin(kSinkPrefs), std::end(kSinkPrefs),
                             TaintPrefLess));

// Names without a pref are always enabled.
template <size_t N>
bool IsTaintPrefEnabled(const TaintPref (&aPrefs)[N], std::string_view aName) {
  const TaintPref* it = std::lower_bound(
      std::begin(aPrefs), std::end(aPrefs), aName,
      [](const TaintPref& aPref, std::string_view aKey) {
        return aPref.mName < aKey;
      });
  return it == std::end(aPrefs) || it->mName != aName || it->mIsEnabled();
}

}  // namespace

inline bool isSinkActive(const char* name) {
  return StaticPrefs::tainting_active() && IsTaintPrefEnabled(kSinkPrefs, name);
}

inline bool isSourceActive(const char* name) {
  return StaticPrefs::tainting_active() && IsTaintPrefEnabled(kSourcePrefs, name);
}

static TaintOperation GetTaintOperation(JSContext *cx, const char* name)
{
  if (cx) {
    return JS_GetTaintOperation(cx, name);
  }

  return TaintOperation(name);
}

static TaintOperation GetTaintOperation(JSContext *cx, const char* name, const nsAString& arg)
{
  if (cx && JS::CurrentGlobalOrNull(cx)) {
    JS::Rooted<JS::Value> argval(cx);
    if (mozilla::dom::ToJSValue(cx, arg, &argval)) {
      return JS_GetTaintOperationFullArgs(cx, name, argval);
    }
  }

  return TaintOperation(name);
}

static TaintOperation GetTaintOperation(JSContext *cx, const char* name, const nsACString& arg)
{
  if (cx && JS::CurrentGlobalOrNull(cx)) {
    JS::Rooted<JS::Value> argval(cx);
    if (mozilla::dom::ToJSValue(cx, arg, &argval)) {
      return JS_GetTaintOperationFullArgs(cx, name, argval);
    }
  }

  return TaintOperation(name);
}

static TaintOperation GetTaintOperation(JSContext *cx, const char* name, const nsTArray<nsString> &args)
{
  if (cx && JS::CurrentGlobalOrNull(cx)) {
    JS::Rooted<JS::Value> argval(cx);

    if (mozilla::dom::ToJSValue(cx, args, &argval)) {
      return JS_GetTaintOperationFullArgs(cx, name, argval);
    }
  }

  return TaintOperation(name);
}

static TaintOperation GetTaintOperation(JSContext *cx, const char* name, const nsTArray<nsCString> &args)
{
  if (cx && JS::CurrentGlobalOrNull(cx)) {
    JS::Rooted<JS::Value> argval(cx);

    if (mozilla::dom::ToJSValue(cx, args, &argval)) {
      return JS_GetTaintOperationFullArgs(cx, name, argval);
    }
  }

  return TaintOperation(name);
}

static void DescribeElement(const nsINode* node, nsAString& aInput)
{
  aInput.Truncate();
  if (node) {
    // Disable any taint sources for elements to prevent recursion
    XPathGenerator::Generate(node, aInput, false);
    if (aInput.IsEmpty()) {
      if (node->IsElement()) {
        const mozilla::dom::Element* element = node->AsElement();
        element->Describe(aInput);
      }
    }
  }
}

static TaintOperation GetTaintOperation(JSContext *cx, const char* name, const nsINode* node)
{
  if (node) {
    nsTArray<nsString> args;
    nsAutoString elementDesc;

    DescribeElement(node, elementDesc);
    args.AppendElement(elementDesc);

    return GetTaintOperation(cx, name, args);
  }

  return TaintOperation(name);
}

static TaintOperation GetTaintOperation(JSContext *cx, const char* name, const nsINode* node,
                                        const nsAString &str, const nsAString &attr)
{
  if (node) {
    nsTArray<nsString> args;

    nsAutoString elementDesc;
    DescribeElement(node, elementDesc);
    args.AppendElement(elementDesc);

    nsAutoString attributeName;
    attributeName.Append(attr);
    attributeName.AppendLiteral("=\"");
    nsAutoString value;
    value.Append(str);
    for (uint32_t i = value.Length(); i > 0; --i) {
      if (value[i - 1] == char16_t('"')) value.Insert(char16_t('\\'), i - 1);
    }
    attributeName.Append(value);
    attributeName.Append('"');
    args.AppendElement(attributeName);

    return GetTaintOperation(cx, name, args);
  }

  return TaintOperation(name);
}

TaintOperation GetTaintOperation(const char* name)
{
  return GetTaintOperation(nsContentUtils::GetCurrentJSContext(), name);
}

TaintLocation GetTaintLocation() {
  return JS_GetTaintLocation(nsContentUtils::GetCurrentJSContext());
}

nsresult MarkTaintOperation(StringTaint& aTaint, const char* name) {
  JSContext *cx = nsContentUtils::GetCurrentJSContext();
  auto op = GetTaintOperation(cx, name);
  aTaint.extend(op);
  return NS_OK;
}

static nsresult MarkTaintOperation(JSContext *cx, nsACString &str, const char* name)
{
  if (str.isTainted()) {
    auto op = GetTaintOperation(cx, name);
    str.Taint().extend(op);
  }
  return NS_OK;
}

nsresult MarkTaintOperation(nsACString &str, const char* name)
{
  return MarkTaintOperation(nsContentUtils::GetCurrentJSContext(), str, name);
}

static nsresult MarkTaintOperation(JSContext *cx, nsAString &str, const char* name)
{
  if (str.isTainted()) {
    auto op = GetTaintOperation(cx, name);
    str.Taint().extend(op);
  }
  return NS_OK;
}

nsresult MarkTaintOperation(nsAString &str, const char* name, const nsINode* node)
{
  if (str.isTainted()) {
    TaintOperation op = GetTaintOperation(nsContentUtils::GetCurrentJSContext(), name, node);
    str.Taint().extend(op);
  }
  return NS_OK;
}

nsresult MarkTaintOperation(nsAString &str, const char* name)
{
  return MarkTaintOperation(nsContentUtils::GetCurrentJSContext(), str, name);
}

static nsresult MarkTaintOperation(JSContext *cx, nsAString &str, const char* name, const nsTArray<nsString> &args)
{
  if (str.isTainted()) {
    auto op = GetTaintOperation(cx, name, args);
    str.Taint().extend(op);
  }
  return NS_OK;
}

nsresult MarkTaintOperation(nsAString &str, const char* name, const nsTArray<nsString> &args)
{
  return MarkTaintOperation(nsContentUtils::GetCurrentJSContext(), str, name, args);
}

static nsresult MarkTaintOperation(JSContext *cx, nsACString &str, const char* name, const nsTArray<nsString> &args)
{
  if (str.isTainted()) {
    auto op = GetTaintOperation(cx, name, args);
    str.Taint().extend(op);
  }
  return NS_OK;
}

nsresult MarkTaintOperation(nsACString &str, const char* name, const nsTArray<nsString> &args)
{
  return MarkTaintOperation(nsContentUtils::GetCurrentJSContext(), str, name, args);
}

static nsresult MarkTaintOperation(JSContext *cx, nsCString &str, const char* name, const nsTArray<nsCString> &args)
{
  if (str.isTainted()) {
    auto op = GetTaintOperation(cx, name, args);
    str.Taint().extend(op);
  }
  return NS_OK;
}

nsresult MarkTaintOperation(nsCString &str, const char* name, const nsTArray<nsCString> &args)
{
  return MarkTaintOperation(nsContentUtils::GetCurrentJSContext(), str, name, args);
}

nsresult MarkTaintOperation(nsACString &str, const char* name, const nsACString &arg)
{
  if (str.isTainted()) {
    auto op = GetTaintOperation(nsContentUtils::GetCurrentJSContext(), name, arg);
    str.Taint().extend(op);
  }
  return NS_OK;
}

static nsresult MarkTaintSource(nsAString &str, TaintOperation operation) {
  operation.setSource();
  str.Taint().overlay(0, str.Length(), operation);
  return NS_OK;
}

static nsresult MarkTaintSource(nsACString &str, TaintOperation operation) {
  operation.setSource();
  str.Taint().overlay(0, str.Length(), operation);
  return NS_OK;
}

static nsresult MarkTaintSource(mozilla::dom::DOMString &str, TaintOperation operation) {
  operation.setSource();
  str.Taint().overlay(0, str.Length(), operation);
  return NS_OK;
}

nsresult MarkTaintSource(JSContext* cx, JSString* str, const char* name)
{
  if (isSourceActive(name)) {
    TaintOperation op = GetTaintOperation(cx, name);
    op.setSource();
    JS_MarkTaintSource(cx, str, op);
  }
  return NS_OK;
}

nsresult MarkTaintSource(JSContext* aCx, JSString* str, const char* name, const nsAString &arg) {
  if (isSourceActive(name)) {
    TaintOperation op = GetTaintOperation(aCx, name, arg);
    op.setSource();
    JS_MarkTaintSource(aCx, str, op);
  }
  return NS_OK;
}

nsresult MarkTaintSource(JSContext* cx, JS::MutableHandle<JS::Value> aValue, const char* name) {
  if (isSourceActive(name)) {
    TaintOperation op = GetTaintOperation(cx, name);
    op.setSource();
    JS_MarkTaintSource(cx, aValue, op);
  }
  return NS_OK;
}

nsresult MarkTaintSource(JSContext* cx, JS::MutableHandle<JS::Value> aValue, const char* name, const nsAString &arg)
{
  if (isSourceActive(name)) {
    TaintOperation op = GetTaintOperation(cx, name, arg);
    op.setSource();
    JS_MarkTaintSource(cx, aValue, op);
  }
  return NS_OK;
}

nsresult MarkTaintSource(nsAString &str, const char* name)
{
  if (isSourceActive(name)) {
    return MarkTaintSource(str, GetTaintOperation(nsContentUtils::GetCurrentJSContext(), name));
  }
  return NS_OK;
}

nsresult MarkTaintSource(nsACString &str, const char* name)
{
  if (isSourceActive(name)) {
    return MarkTaintSource(str, GetTaintOperation(nsContentUtils::GetCurrentJSContext(), name));
  }
  return NS_OK;
}

nsresult MarkTaintSource(nsAString &str, const char* name, const nsAString &arg)
{
  if (isSourceActive(name)) {
    return MarkTaintSource(str, GetTaintOperation(nsContentUtils::GetCurrentJSContext(), name, arg));
  }
  return NS_OK;
}

static nsresult MarkTaintSource(TaintFlow &flow, TaintOperation operation) {
  operation.setSource();
  flow.extend(operation);
  return NS_OK;
}

nsresult MarkTaintSource(TaintFlow &flow, const char* name, const nsAString &arg)
{
  if (isSourceActive(name)) {
    flow.extend(GetTaintOperation(nsContentUtils::GetCurrentJSContext(), name, arg));
  }
  return NS_OK;
}

nsresult MarkTaintSource(nsAString &str, const char* name, const nsTArray<nsString> &arg)
{
  if (isSourceActive(name)) {
    return MarkTaintSource(str, GetTaintOperation(nsContentUtils::GetCurrentJSContext(), name, arg));
  }
  return NS_OK;
}

nsresult MarkTaintSourceElement(nsAString &str, const char* name, const nsINode* node)
{
  if (isSourceActive(name)) {
    return MarkTaintSource(str, GetTaintOperation(nsContentUtils::GetCurrentJSContext(), name, node));
  }
  return NS_OK;
}

nsresult MarkTaintSource(mozilla::dom::DOMString &str, const char* name)
{
  if (isSourceActive(name)) {
    return MarkTaintSource(str, GetTaintOperation(nsContentUtils::GetCurrentJSContext(), name));
  }
  return NS_OK;
}

nsresult MarkTaintSource(mozilla::dom::DOMString &str, const char* name, const nsAString &arg)
{
  if (isSourceActive(name)) {
    return MarkTaintSource(str, GetTaintOperation(nsContentUtils::GetCurrentJSContext(), name, arg));
  }
  return NS_OK;
}

nsresult MarkTaintSource(mozilla::dom::DOMString &str, const char* name, const nsTArray<nsString> &arg)
{
  if (isSourceActive(name)) {
    return MarkTaintSource(str, GetTaintOperation(nsContentUtils::GetCurrentJSContext(), name, arg));
  }
  return NS_OK;
}

nsresult MarkTaintSourceElement(mozilla::dom::DOMString &str, const char* name, const nsINode* node)
{
  if (isSourceActive(name)) {
    return MarkTaintSource(str, GetTaintOperation(nsContentUtils::GetCurrentJSContext(), name, node));
  }
  return NS_OK;
}

nsresult MarkTaintSourceAttribute(nsAString &str, const char* name, const mozilla::dom::Element* element,
                                  const nsAString &attr)
{
  // Check if the element has incoming taint flows
  if (element) {
    const TaintList& taintList = element->GetSelectorTaintFlowList();
    if (taintList.hasTaint()) {
      str.Taint().overlay(0, str.Length(),*taintList.begin());
    }
  }
  if (nsContentUtils::IsInitialized() && isSourceActive(name)) {
    return MarkTaintSource(str, GetTaintOperation(nsContentUtils::GetCurrentJSContext(), name, element, str, attr));
  }
  return NS_OK;
}

nsresult MarkTaintSourceAttribute(mozilla::dom::DOMString &str, const char* name,  const mozilla::dom::Element* element,
                                  const nsAString &attr)
{
  // Check if the element has incoming taint flows
  if (element) {
    const TaintList& taintList = element->GetSelectorTaintFlowList();
    if (taintList.hasTaint()) {
      str.Taint().overlay(0, str.Length(),*taintList.begin());
    }
  }
  if (nsContentUtils::IsInitialized() && isSourceActive(name)) {
    return MarkTaintSource(str, GetTaintOperation(nsContentUtils::GetCurrentJSContext(), name, element, str, attr));
  }
  return NS_OK;
}

nsresult ReportTaintSink(JSContext *cx, const nsAString &str, const char* name, const nsAString &arg)
{
  if (!str.isTainted()) {
    return NS_OK;
  }

  if (!cx) {
    return NS_ERROR_FAILURE;
  }

  if (!nsContentUtils::IsSafeToRunScript() || !JS::CurrentGlobalOrNull(cx)) {
    return NS_ERROR_FAILURE;
  }

  if (!isSinkActive(name)) {
    return NS_OK;
  }

  JS::Rooted<JS::Value> argval(cx);
  if (!mozilla::dom::ToJSValue(cx, arg, &argval))
    return NS_ERROR_FAILURE;

  JS::Rooted<JS::Value> strval(cx);
  if (!mozilla::dom::ToJSValue(cx, str, &strval))
    return NS_ERROR_FAILURE;

  JS_ReportTaintSink(cx, strval, name, argval);

  return NS_OK;
}

nsresult ReportTaintSink(JSContext *cx, const nsACString &str, const char* name, const nsAString &arg)
{
  if (!str.isTainted()) {
    return NS_OK;
  }

  if (!cx) {
    return NS_ERROR_FAILURE;
  }

  if (!nsContentUtils::IsSafeToRunScript() || !JS::CurrentGlobalOrNull(cx)) {
    return NS_ERROR_FAILURE;
  }

  if (!isSinkActive(name)) {
    return NS_OK;
  }

  JS::Rooted<JS::Value> argval(cx);
  if (!mozilla::dom::ToJSValue(cx, arg, &argval))
    return NS_ERROR_FAILURE;

  JS::Rooted<JS::Value> strval(cx);
  if (!mozilla::dom::ToJSValue(cx, str, &strval))
    return NS_ERROR_FAILURE;

  JS_ReportTaintSink(cx, strval, name, argval);

  return NS_OK;
}

nsresult ReportTaintSink(JSContext *cx, const nsAString &str, const char* name)
{
  if (!str.isTainted()) {
    return NS_OK;
  }

  if (!cx) {
    return NS_ERROR_FAILURE;
  }

  if (!nsContentUtils::IsSafeToRunScript() || !JS::CurrentGlobalOrNull(cx)) {
    return NS_ERROR_FAILURE;
  }

  if (!isSinkActive(name)) {
    return NS_OK;
  }

  JS::Rooted<JS::Value> strval(cx);
  if (!mozilla::dom::ToJSValue(cx, str, &strval)) {
    return NS_ERROR_FAILURE;
  }

  JS_ReportTaintSink(cx, strval, name);

  return NS_OK;
}

nsresult ReportTaintSink(JSContext *cx, const nsACString &str, const char* name)
{
  if (!str.isTainted()) {
    return NS_OK;
  }

  if (!cx) {
    return NS_ERROR_FAILURE;
  }

  if (!nsContentUtils::IsSafeToRunScript() || !JS::CurrentGlobalOrNull(cx)) {
    return NS_ERROR_FAILURE;
  }

  if (!isSinkActive(name)) {
    return NS_OK;
  }

  JS::Rooted<JS::Value> strval(cx);
  if (!mozilla::dom::ToJSValue(cx, str, &strval)) {
    return NS_ERROR_FAILURE;
  }

  JS_ReportTaintSink(cx, strval, name);

  return NS_OK;
}

nsresult ReportTaintSink(const nsAString &str, const char* name, const nsAString &arg)
{
  return ReportTaintSink(nsContentUtils::GetCurrentJSContext(), str, name, arg);
}

nsresult ReportTaintSink(const nsACString &str, const char* name, const nsAString &arg)
{
  return ReportTaintSink(nsContentUtils::GetCurrentJSContext(), str, name, arg);
}

nsresult ReportTaintSink(const nsAString &str, const char* name, const nsINode* node)
{
  if (!str.isTainted()) {
    return NS_OK;
  }

  nsAutoString elementDesc;
  if (node) {
    DescribeElement(node, elementDesc);
  }

  return ReportTaintSink(str, name, elementDesc);
}

nsresult ReportTaintSink(const nsAString &str, const char* name)
{
  return ReportTaintSink(nsContentUtils::GetCurrentJSContext(), str, name);
}

nsresult ReportTaintSink(const nsACString &str, const char* name)
{
  return ReportTaintSink(nsContentUtils::GetCurrentJSContext(), str, name);
}

nsresult ReportTaintSink(JSContext* cx, JS::Handle<JS::Value> aValue, const char* name)
{
  if (!nsContentUtils::IsSafeToRunScript() || !JS::CurrentGlobalOrNull(cx)) {
    return NS_ERROR_FAILURE;
  }

  if (!isSinkActive(name)) {
    return NS_OK;
  }

  JS_ReportTaintSink(cx, aValue, name);

  return NS_OK;
}

nsresult ReportTaintSink(JSContext* cx, JS::Handle<JS::Value> aValue, const char* name, const nsAString &arg)
{
  if (!nsContentUtils::IsSafeToRunScript() || !JS::CurrentGlobalOrNull(cx)) {
    return NS_ERROR_FAILURE;
  }

  if (!isSinkActive(name)) {
    return NS_OK;
  }

  JS::RootedValue argval(cx);
  if (!mozilla::dom::ToJSValue(cx, arg, &argval)) {
    return nsresult::NS_ERROR_FAILURE;
  }

  JS_ReportTaintSink(cx, aValue, name, argval);

  return NS_OK;
}
