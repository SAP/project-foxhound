/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_Sanitizer_h
#define mozilla_dom_Sanitizer_h

#include "mozilla/Maybe.h"
#include "mozilla/dom/BindingDeclarations.h"
#include "mozilla/dom/DocumentFragment.h"
#include "mozilla/dom/SanitizerBinding.h"
#include "mozilla/dom/SanitizerTypes.h"
#include "mozilla/dom/StaticAtomSet.h"
#include "nsIGlobalObject.h"
#include "nsIParserUtils.h"
#include "nsString.h"

class nsISupports;

namespace mozilla {

class ErrorResult;

namespace dom {

class GlobalObject;

class Sanitizer final : public nsISupports, public nsWrapperCache {
  explicit Sanitizer(nsIGlobalObject* aGlobal) : mGlobal(aGlobal) {
    MOZ_ASSERT(aGlobal);
  }

 public:
  NS_DECL_CYCLE_COLLECTING_ISUPPORTS
  NS_DECL_CYCLE_COLLECTION_WRAPPERCACHE_CLASS(Sanitizer);

  nsIGlobalObject* GetParentObject() const { return mGlobal; }

  JSObject* WrapObject(JSContext* aCx,
                       JS::Handle<JSObject*> aGivenProto) override;

  static already_AddRefed<Sanitizer> GetInstance(
      nsIGlobalObject* aGlobal,
      const OwningSanitizerOrSanitizerConfigOrSanitizerPresets& aOptions,
      bool aSafe, ErrorResult& aRv);

  // WebIDL
  static already_AddRefed<Sanitizer> Constructor(
      const GlobalObject& aGlobal,
      const SanitizerConfigOrSanitizerPresets& aConfig, ErrorResult& aRv);

  void Get(SanitizerConfig& aConfig);

  bool AllowElement(
      const StringOrSanitizerElementNamespaceWithAttributes& aElement);
  bool RemoveElement(const StringOrSanitizerElementNamespace& aElement);
  bool ReplaceElementWithChildren(
      const StringOrSanitizerElementNamespace& aElement);
  bool AllowAttribute(const StringOrSanitizerAttributeNamespace& aAttribute);
  bool RemoveAttribute(const StringOrSanitizerAttributeNamespace& aAttribute);
  bool SetComments(bool aAllow);
  bool SetDataAttributes(bool aAllow);
  bool RemoveUnsafe();

  /**
   * Sanitizes a node in place. This assumes that the node
   * belongs but an inert document.
   *
   * @param aNode Node to be sanitized in place
   */

  void Sanitize(nsINode* aNode, bool aSafe, ErrorResult& aRv);

 private:
  ~Sanitizer() = default;

  void CanonicalizeConfiguration(const SanitizerConfig& aConfig,
                                 bool aAllowCommentsAndDataAttributes,
                                 ErrorResult& aRv);
  void IsValid(ErrorResult& aRv);

  void SetDefaultConfig();
  void SetConfig(const SanitizerConfig& aConfig,
                 bool aAllowCommentsAndDataAttributes, ErrorResult& aRv);

  void MaybeMaterializeDefaultConfig();

  bool RemoveElementCanonical(sanitizer::CanonicalElement&& aElement);
  bool RemoveAttributeCanonical(sanitizer::CanonicalAttribute&& aAttribute);

  template <bool IsDefaultConfig>
  void SanitizeChildren(nsINode* aNode, bool aSafe);
  void SanitizeAttributes(Element* aChild,
                          const sanitizer::CanonicalElement& aElementName,
                          bool aSafe);
  void SanitizeDefaultConfigAttributes(Element* aChild,
                                       StaticAtomSet* aElementAttributes,
                                       bool aSafe);

  void AssertIsValid();

  void AssertNoLists() {
    MOZ_ASSERT(!mElements);
    MOZ_ASSERT(!mRemoveElements);
    MOZ_ASSERT(!mReplaceWithChildrenElements);
    MOZ_ASSERT(!mAttributes);
    MOZ_ASSERT(!mRemoveAttributes);
  }

  RefPtr<nsIGlobalObject> mGlobal;

  Maybe<sanitizer::CanonicalElementMap> mElements;
  Maybe<sanitizer::CanonicalElementSet> mRemoveElements;
  Maybe<sanitizer::CanonicalElementSet> mReplaceWithChildrenElements;

  Maybe<sanitizer::CanonicalAttributeSet> mAttributes;
  Maybe<sanitizer::CanonicalAttributeSet> mRemoveAttributes;

  bool mComments = false;
  // mDataAttributes always exists when mAttributes exists after
  // canonicalization. It never exists at the same time as mRemoveAttributes.
  Maybe<bool> mDataAttributes;

  // Optimization: This sanitizer has a lazy default config. None
  // of the element lists will be used, however mComments and mDataAttributes
  // continue to be functional.
  bool mIsDefaultConfig = false;
};
}  // namespace dom
}  // namespace mozilla

#endif  // ifndef mozilla_dom_Sanitizer_h
