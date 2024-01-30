/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/*
 * Modifications Copyright SAP SE. 2019-2021.  All rights reserved.
 */

#ifndef nsTaintingUtils_h__
#define nsTaintingUtils_h__

#include "mozilla/dom/DOMString.h"
#include "mozilla/dom/Element.h"
#include "nsINode.h"
#include "nsString.h"

#include "jsapi.h"


// Get a taint operation
TaintOperation GetTaintOperation(const char* name);

// Extend the taintflow
nsresult MarkTaintOperation(nsAString &str, const char* name);
nsresult MarkTaintOperation(nsACString &str, const char* name);
nsresult MarkTaintOperation(nsAString &str, const char* name, const nsTArray<nsString> &arg);
nsresult MarkTaintOperation(StringTaint& aTaint, const char* name);

// TaintFox: Add taint source information to a string
nsresult MarkTaintSource(nsAString &str, const char* name);

// TaintFox: Add taint source information to a string
nsresult MarkTaintSource(nsAString &str, const char* name, const nsAString &arg);

nsresult MarkTaintSource(nsAString &str, const char* name, const nsTArray<nsString> &arg);

nsresult MarkTaintSourceElement(nsAString &str, const char* name, const nsINode* node);

// TaintFox: Add taint source information to a string
nsresult MarkTaintSource(mozilla::dom::DOMString &str, const char* name);

// TaintFox: Add taint source information to a string
nsresult MarkTaintSource(mozilla::dom::DOMString &str, const char* name, const nsAString &arg);

nsresult MarkTaintSource(mozilla::dom::DOMString &str, const char* name, const nsTArray<nsString> &arg);

nsresult MarkTaintSourceElement(mozilla::dom::DOMString &str, const char* name, const nsINode* node);

// TaintFox: Add taint source information to a string
nsresult MarkTaintSourceAttribute(nsAString &str, const char* name, const mozilla::dom::Element* node,
                                  const nsAString &attr);

nsresult MarkTaintSourceAttribute(mozilla::dom::DOMString &str, const char* name, const mozilla::dom::Element* node,
                                  const nsAString &attr);

nsresult MarkTaintSource(JSContext* aCx, JS::MutableHandle<JS::Value> aValue, const char* name);

nsresult MarkTaintSource(JSContext* aCx, JS::MutableHandle<JS::Value> aValue, const char* name, const nsAString &arg);

nsresult MarkTaintSource(JSContext* aCx, JSString* str, const char* name);

nsresult MarkTaintSource(TaintFlow &flow, const char* name, const nsAString &arg);

// TaintFox: Report taint flows into DOM related sinks.
nsresult ReportTaintSink(JSContext *cx, const nsAString &str, const char* name);

// TaintFox: Report taint flows into DOM related sinks.
nsresult ReportTaintSink(const nsAString &str, const char* name);

nsresult ReportTaintSink(const nsAString &str, const char* name, const nsINode* node);

nsresult ReportTaintSink(const nsACString &str, const char* name);

nsresult ReportTaintSink(JSContext *cx, const nsAString &str, const char* name, const nsAString &arg);

nsresult ReportTaintSink(const nsAString &str, const char* name, const nsAString &arg);

nsresult ReportTaintSink(JSContext* cx, JS::Handle<JS::Value> aValue, const char* name);

#endif /* nsTaintingUtils_h__ */
