/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/*
 * Modifications Copyright SAP SE. 2019-2021.  All rights reserved.
 */

#ifndef mozilla_dom_HTMLScriptElement_h
#define mozilla_dom_HTMLScriptElement_h

#include "mozilla/dom/FetchPriority.h"
#include "mozilla/Attributes.h"
#include "mozilla/dom/ScriptElement.h"
#include "nsGenericHTMLElement.h"
#include "nsStringFwd.h"

class nsDOMTokenList;

namespace mozilla::dom {

class OwningTrustedScriptOrNullIsEmptyString;
class OwningTrustedScriptOrString;
class OwningTrustedScriptURLOrString;
class TrustedScriptOrNullIsEmptyString;
class TrustedScriptOrString;
class TrustedScriptURLOrString;

class HTMLScriptElement final : public nsGenericHTMLElement,
                                public ScriptElement {
 public:
  using Element::GetText;

  HTMLScriptElement(already_AddRefed<mozilla::dom::NodeInfo>&& aNodeInfo,
                    FromParser aFromParser);

  // nsISupports
  NS_DECL_ISUPPORTS_INHERITED

  // CC
  NS_DECL_CYCLE_COLLECTION_CLASS_INHERITED(HTMLScriptElement,
                                           nsGenericHTMLElement)

  void GetInnerHTML(nsAString& aInnerHTML, OOMReporter& aError) override;

  void SetInnerHTMLTrusted(const nsAString& aInnerHTML,
                           nsIPrincipal* aSubjectPrincipal,
                           mozilla::ErrorResult& aError) override;

 public:
  // nsIScriptElement
  virtual void GetScriptText(nsAString& text) const override;
  virtual void GetScriptCharset(nsAString& charset) override;
  virtual void FreezeExecutionAttrs(const Document* aOwnerDoc) override;
  virtual CORSMode GetCORSMode() const override;
  virtual FetchPriority GetFetchPriority() const override;
  virtual mozilla::dom::ReferrerPolicy GetReferrerPolicy() override;

  // nsIContent
  virtual nsresult BindToTree(BindContext&, nsINode& aParent) override;
  virtual bool ParseAttribute(int32_t aNamespaceID, nsAtom* aAttribute,
                              const nsAString& aValue,
                              nsIPrincipal* aMaybeScriptedPrincipal,
                              nsAttrValue& aResult) override;

  virtual nsresult Clone(dom::NodeInfo*, nsINode** aResult) const override;

  // Element
  virtual nsresult CheckTaintSinkSetAttr(int32_t aNamespaceID, nsAtom* aName,
                                         const nsAString& aValue) override;

  virtual void AfterSetAttr(int32_t aNamespaceID, nsAtom* aName,
                            const nsAttrValue* aValue,
                            const nsAttrValue* aOldValue,
                            nsIPrincipal* aMaybeScriptedPrincipal,
                            bool aNotify) override;

  // WebIDL
  void GetText(nsAString& aValue, ErrorResult& aRv) const;

  // @param aValue will always be of type `String`.
  MOZ_CAN_RUN_SCRIPT void GetText(OwningTrustedScriptOrString& aValue,
                                  ErrorResult& aRv) const;

  MOZ_CAN_RUN_SCRIPT void SetText(const TrustedScriptOrString& aValue,
                                  ErrorResult& aRv);

  // @param aValue will always be of type `NullIsEmptyString`.
  MOZ_CAN_RUN_SCRIPT void GetInnerText(
      OwningTrustedScriptOrNullIsEmptyString& aValue, ErrorResult& aError);

  MOZ_CAN_RUN_SCRIPT void SetInnerText(
      const TrustedScriptOrNullIsEmptyString& aValue, ErrorResult& aError);

  // @param aTextContent will always be of type `String`.
  MOZ_CAN_RUN_SCRIPT void GetTrustedScriptOrStringTextContent(
      Nullable<OwningTrustedScriptOrString>& aTextContent,
      mozilla::OOMReporter& aError);

  MOZ_CAN_RUN_SCRIPT void SetTrustedScriptOrStringTextContent(
      const Nullable<TrustedScriptOrString>& aTextContent,
      nsIPrincipal* aSubjectPrincipal, mozilla::ErrorResult& aError);

  void GetCharset(nsAString& aCharset) {
    GetHTMLAttr(nsGkAtoms::charset, aCharset);
  }
  void SetCharset(const nsAString& aCharset, ErrorResult& aRv) {
    SetHTMLAttr(nsGkAtoms::charset, aCharset, aRv);
  }

  bool Defer() { return GetBoolAttr(nsGkAtoms::defer); }
  void SetDefer(bool aDefer, ErrorResult& aRv) {
    SetHTMLBoolAttr(nsGkAtoms::defer, aDefer, aRv);
  }

  // @param aSrc will always be of type `String`.
  void GetSrc(OwningTrustedScriptURLOrString& aSrc);

  MOZ_CAN_RUN_SCRIPT void SetSrc(const TrustedScriptURLOrString& aSrc,
                                 nsIPrincipal* aTriggeringPrincipal,
                                 ErrorResult& aRv);

  void GetType(nsAString& aType) { GetHTMLAttr(nsGkAtoms::type, aType); }
  void SetType(const nsAString& aType, ErrorResult& aRv) {
    SetHTMLAttr(nsGkAtoms::type, aType, aRv);
  }

  void GetHtmlFor(nsAString& aHtmlFor) {
    GetHTMLAttr(nsGkAtoms::_for, aHtmlFor);
  }
  void SetHtmlFor(const nsAString& aHtmlFor, ErrorResult& aRv) {
    SetHTMLAttr(nsGkAtoms::_for, aHtmlFor, aRv);
  }

  void GetEvent(nsAString& aEvent) { GetHTMLAttr(nsGkAtoms::event, aEvent); }
  void SetEvent(const nsAString& aEvent, ErrorResult& aRv) {
    SetHTMLAttr(nsGkAtoms::event, aEvent, aRv);
  }

  bool Async() { return mForceAsync || GetBoolAttr(nsGkAtoms::async); }

  void SetAsync(bool aValue, ErrorResult& aRv) {
    mForceAsync = false;
    SetHTMLBoolAttr(nsGkAtoms::async, aValue, aRv);
  }

  bool NoModule() { return GetBoolAttr(nsGkAtoms::nomodule); }

  void SetNoModule(bool aValue, ErrorResult& aRv) {
    SetHTMLBoolAttr(nsGkAtoms::nomodule, aValue, aRv);
  }

  void GetCrossOrigin(nsAString& aResult) {
    // Null for both missing and invalid defaults is ok, since we
    // always parse to an enum value, so we don't need an invalid
    // default, and we _want_ the missing default to be null.
    GetEnumAttr(nsGkAtoms::crossorigin, nullptr, aResult);
  }
  void SetCrossOrigin(const nsAString& aCrossOrigin, ErrorResult& aError) {
    SetOrRemoveNullableStringAttr(nsGkAtoms::crossorigin, aCrossOrigin, aError);
  }
  void GetIntegrity(nsAString& aIntegrity) {
    GetHTMLAttr(nsGkAtoms::integrity, aIntegrity);
  }
  void SetIntegrity(const nsAString& aIntegrity, ErrorResult& aRv) {
    SetHTMLAttr(nsGkAtoms::integrity, aIntegrity, aRv);
  }
  void SetReferrerPolicy(const nsAString& aReferrerPolicy,
                         ErrorResult& aError) {
    SetHTMLAttr(nsGkAtoms::referrerpolicy, aReferrerPolicy, aError);
  }
  void GetReferrerPolicy(nsAString& aReferrerPolicy) {
    GetEnumAttr(nsGkAtoms::referrerpolicy, "", aReferrerPolicy);
  }

  nsDOMTokenList* Blocking();
  bool IsPotentiallyRenderBlocking() override;

  // Required for the webidl-binding because `GetFetchPriority` is overloaded.
  using nsGenericHTMLElement::GetFetchPriority;

  [[nodiscard]] static bool Supports(const GlobalObject& aGlobal,
                                     const nsAString& aType);

  virtual void SetTextContentInternal(const nsAString& aTextContent,
                                      nsIPrincipal* aSubjectPrincipal,
                                      ErrorResult& aError) override;
 protected:
  virtual ~HTMLScriptElement();

  virtual bool GetAsyncState() override { return Async(); }

  virtual JSObject* WrapNode(JSContext* aCx,
                             JS::Handle<JSObject*> aGivenProto) override;

  // nsIScriptElement
  nsIContent* GetAsContent() override { return this; }

  // ScriptElement
  virtual bool HasScriptContent() override;

  RefPtr<nsDOMTokenList> mBlocking;
};

}  // namespace mozilla::dom

#endif  // mozilla_dom_HTMLScriptElement_h
