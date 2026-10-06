/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef nsHtml5AttributeEntry_h
#define nsHtml5AttributeEntry_h

#include "nsHtml5AttributeName.h"

struct nsHtml5NameTriple {
  int32_t mNamespace;
  nsAtom* mPrefix;
  nsAtom* mLocal;
};

class nsHtml5AttributeEntry final {
 public:
  nsHtml5AttributeEntry() = delete;

  nsHtml5AttributeEntry(const nsHtml5AttributeEntry&) = delete;

  nsHtml5AttributeEntry(nsHtml5AttributeEntry&& aOther)
      : mNameBits(aOther.mNameBits), mValue(aOther.mValue) {
    aOther.mNameBits = 0;
    aOther.mValue = nullptr;
  }

  nsHtml5AttributeEntry(nsHtml5AttributeName* aName, nsHtml5String aValue)
      : mNameBits(BitsFromNameWithAddRef(aName)), mValue(aValue) {}

 private:
  nsHtml5AttributeEntry(uintptr_t aNameBits, nsHtml5String aValue)
      : mNameBits(aNameBits), mValue(aValue.Clone()) {
    if (IsCustom()) {
      (void)CustomAtom()->AddRef();
    }
  }

 public:
  ~nsHtml5AttributeEntry() {
    if (IsCustom()) {
      (void)CustomAtom()->Release();
    }
    mValue.Release();
  }

 private:
  static uintptr_t BitsFromNameWithAddRef(nsHtml5AttributeName* aName) {
    if (aName->isInterned()) {
      return reinterpret_cast<uintptr_t>(aName);
    }
    // When the attribute name is not interned, the HTML, MathML, and
    // SVG local names are always the same, so let's just take the HTML
    // one with a compile-time constant offset.
    nsAtom* local = aName->getLocal(nsHtml5AttributeName::HTML);
    // TODO: Take the name without AddRef
    local->AddRef();
    return reinterpret_cast<uintptr_t>(local) | uintptr_t(1);
  }

 public:
  static uintptr_t BitsFromName(nsHtml5AttributeName* aName) {
    if (aName->isInterned()) {
      return reinterpret_cast<uintptr_t>(aName);
    }
    // When the attribute name is not interned, the HTML, MathML, and
    // SVG local names are always the same, so let's just take the HTML
    // one with a compile-time constant offset.
    nsAtom* local = aName->getLocal(nsHtml5AttributeName::HTML);
    // No AddRef!
    return reinterpret_cast<uintptr_t>(local) | uintptr_t(1);
  }

  static uintptr_t BitsFromKnownName(nsHtml5AttributeName* aName) {
    MOZ_ASSERT(aName->isInterned());
    return reinterpret_cast<uintptr_t>(aName);
  }

  bool NameBitsMatch(uintptr_t aNameBits) const {
    return mNameBits == aNameBits;
  }

  bool NameMatches(const nsHtml5AttributeEntry& aOther) const {
    return mNameBits == aOther.mNameBits;
  }

  bool ValueMatches(const nsHtml5AttributeEntry& aOther) const {
    return mValue.Equals(aOther.mValue);
  }

  nsHtml5AttributeEntry Clone() const {
    return nsHtml5AttributeEntry(mNameBits, mValue);
  }

  nsHtml5String Value() const { return mValue; }

  nsHtml5String& ValueRef() { return mValue; }

  already_AddRefed<nsAtom> ForgetNameHTML() {
    MOZ_ASSERT(mNameBits);
    nsAtom* ret;
    if (IsKnown()) {
      ret = KnownName()->getLocal(nsHtml5AttributeName::HTML);
    } else {
      ret = CustomAtom();
    }
    mNameBits = 0;
    return already_AddRefed<nsAtom>(ret);
  }

  nsAtom* NameHTML() const {
    MOZ_ASSERT(mNameBits);
    if (IsKnown()) {
      return KnownName()->getLocal(nsHtml5AttributeName::HTML);
    }
    return CustomAtom();
  }

  nsHtml5NameTriple NameSVG() const {
    MOZ_ASSERT(mNameBits);
    if (IsKnown()) {
      nsHtml5AttributeName* known = KnownName();
      return {known->getUri(nsHtml5AttributeName::SVG),
              known->getPrefix(nsHtml5AttributeName::SVG),
              known->getLocal(nsHtml5AttributeName::SVG)};
    }
    return {kNameSpaceID_None, nullptr, CustomAtom()};
  }

  nsHtml5NameTriple NameMathML() const {
    MOZ_ASSERT(mNameBits);
    if (IsKnown()) {
      nsHtml5AttributeName* known = KnownName();
      return {known->getUri(nsHtml5AttributeName::MATHML),
              known->getPrefix(nsHtml5AttributeName::MATHML),
              known->getLocal(nsHtml5AttributeName::MATHML)};
    }
    return {kNameSpaceID_None, nullptr, CustomAtom()};
  }

  bool IsCustom() const { return mNameBits & uintptr_t(1); }

  bool IsKnown() const { return !IsCustom(); }

  nsAtom* CustomAtom() const {
    MOZ_ASSERT(IsCustom());
    return reinterpret_cast<nsAtom*>(mNameBits & ~uintptr_t(1));
  }

  nsHtml5AttributeName* KnownName() const {
    MOZ_ASSERT(!IsCustom());
    return reinterpret_cast<nsHtml5AttributeName*>(mNameBits);
  }

  // Tagged pointer that is either nsHtml5AttributeName* or
  // nsAtom*. The lowest bit is the tag bit and is set to 1 in the
  // latter case.
  uintptr_t mNameBits;
  nsHtml5String mValue;
};

#endif  // nsHtml5AttributeEntry_h
