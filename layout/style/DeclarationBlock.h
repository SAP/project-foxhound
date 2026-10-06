/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * representation of a declaration block in a CSS stylesheet, or of
 * a style attribute
 */

#ifndef mozilla_DeclarationBlock_h
#define mozilla_DeclarationBlock_h

#include "NonCustomCSSPropertyId.h"
#include "mozilla/ServoBindings.h"
#include "nsString.h"

namespace mozilla {

class AttributeStyles;
struct CSSPropertyId;

namespace css {
class Declaration;
class Rule;
}  // namespace css

class DeclarationBlock final {
  DeclarationBlock(const DeclarationBlock& aCopy)
      : mRaw(Servo_DeclarationBlock_Clone(aCopy.mRaw).Consume()) {}

 public:
  explicit DeclarationBlock(already_AddRefed<StyleLockedDeclarationBlock> aRaw)
      : mRaw(aRaw) {}

  DeclarationBlock()
      : DeclarationBlock(Servo_DeclarationBlock_CreateEmpty().Consume()) {}

  NS_INLINE_DECL_THREADSAFE_REFCOUNTING(DeclarationBlock)

  already_AddRefed<DeclarationBlock> Clone() const {
    return do_AddRef(new DeclarationBlock(*this));
  }

  /**
   * Return whether |this| may be modified.
   */
  bool IsMutable() const { return !IsImmutable(); }

  /**
   * Crash in debug builds if |this| cannot be modified.
   */
  void AssertMutable() const {
    MOZ_ASSERT(IsMutable(), "someone forgot to call EnsureMutable");
  }

  /**
   * Mark this declaration as unmodifiable.
   */
  void SetImmutable() { Servo_DeclarationBlock_SetImmutable(mRaw.get()); }

  /**
   * Copy |this|, if necessary to ensure that it can be modified.
   */
  already_AddRefed<DeclarationBlock> EnsureMutable() {
    if (IsImmutable()) {
      return Clone();
    }
    return do_AddRef(this);
  }

  // Returns whether our raw block might be referenced from an existing style.
  // FIXME(emilio): Some of this is needed so that animation-only traversals and
  // ::first-line reparenting don't get the wrong style by reusing a mutated
  // rule node, but ideally should go away, see bug 1606413.
  bool IsImmutable() const {
    return Servo_DeclarationBlock_IsImmutable(mRaw.get());
  }

  void SetAttributeStyles(AttributeStyles* aAttributeStyles) {
    MOZ_ASSERT(!mAttributeStyles || !aAttributeStyles,
               "should never overwrite one sheet with another");
    mAttributeStyles = aAttributeStyles;
  }

  AttributeStyles* GetAttributeStyles() const { return mAttributeStyles; }

  bool IsReadOnly() const;

  size_t SizeofIncludingThis(MallocSizeOf);

  static already_AddRefed<DeclarationBlock> FromCssText(
      const nsACString& aCssText, URLExtraData* aExtraData,
      nsCompatibility aMode, css::Loader* aLoader, StyleCssRuleType aRuleType) {
    RefPtr<StyleLockedDeclarationBlock> raw =
        Servo_ParseStyleAttribute(&aCssText, aExtraData, aMode, aLoader,
                                  aRuleType)
            .Consume();
    return MakeAndAddRef<DeclarationBlock>(raw.forget());
  }

  static already_AddRefed<DeclarationBlock> FromCssText(
      const nsAString& aCssText, URLExtraData* aExtraData,
      nsCompatibility aMode, css::Loader* aLoader, StyleCssRuleType aRuleType) {
    NS_ConvertUTF16toUTF8 value(aCssText);
    return FromCssText(value, aExtraData, aMode, aLoader, aRuleType);
  }

  StyleLockedDeclarationBlock* Raw() const { return mRaw; }

  void ToString(nsACString& aResult) const {
    Servo_DeclarationBlock_GetCssText(mRaw, &aResult);
  }

  uint32_t Count() const { return Servo_DeclarationBlock_Count(mRaw); }

  bool GetNthProperty(uint32_t aIndex, nsACString& aReturn) const {
    aReturn.Truncate();
    return Servo_DeclarationBlock_GetNthProperty(mRaw, aIndex, &aReturn);
  }

  void GetPropertyValue(const nsACString& aProperty, nsACString& aValue) const {
    Servo_DeclarationBlock_GetPropertyValue(mRaw, &aProperty, &aValue);
  }

  void GetPropertyValueById(NonCustomCSSPropertyId aPropId,
                            nsACString& aValue) const {
    Servo_DeclarationBlock_GetPropertyValueByNonCustomId(mRaw, aPropId,
                                                         &aValue);
  }

  void GetPropertyValueById(const CSSPropertyId& aPropId,
                            nsACString& aValue) const {
    Servo_DeclarationBlock_GetPropertyValueById(mRaw, &aPropId, &aValue);
  }

  bool GetPropertyIsImportant(const nsACString& aProperty) const {
    return Servo_DeclarationBlock_GetPropertyIsImportant(mRaw, &aProperty);
  }

  bool GetPropertyTypedValueList(const CSSPropertyId& aPropId,
                                 StylePropertyTypedValueList& aValue) const {
    return Servo_DeclarationBlock_GetPropertyTypedValueList(mRaw, &aPropId,
                                                            &aValue);
  }

  // Returns whether the property was removed.
  bool RemoveProperty(const nsACString& aProperty,
                      DeclarationBlockMutationClosure aClosure = {}) {
    AssertMutable();
    return Servo_DeclarationBlock_RemoveProperty(mRaw, &aProperty, aClosure);
  }

  // Returns whether the property was removed.
  bool RemovePropertyById(NonCustomCSSPropertyId aProperty,
                          DeclarationBlockMutationClosure aClosure = {}) {
    AssertMutable();
    return Servo_DeclarationBlock_RemovePropertyById(mRaw, aProperty, aClosure);
  }

 private:
  ~DeclarationBlock() = default;

  // The AttributeStyles that is responsible for this declaration. Only
  // non-null for style attributes.
  AttributeStyles* mAttributeStyles = nullptr;

  RefPtr<StyleLockedDeclarationBlock> mRaw;
};

}  // namespace mozilla

#endif  // mozilla_DeclarationBlock_h
