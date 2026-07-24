/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_PseudoStyleType_h
#define mozilla_PseudoStyleType_h

#include <cstddef>
#include <cstdint>
#include <iosfwd>

#include "mozilla/CSSEnabledState.h"
#include "mozilla/StaticPrefs_dom.h"
#include "mozilla/StaticPrefs_layout.h"
#include "mozilla/TypedEnumBits.h"

class nsStaticAtom;

namespace mozilla {
namespace dom {
class Element;
}  // namespace dom

enum class PseudoStyleTypeFlags : uint16_t {
  NONE = 0,
  ENABLED_IN_UA = 1 << 0,
  ENABLED_IN_CHROME = 1 << 1,
  ENABLED_BY_PREF = 1 << 2,
  IS_PSEUDO_ELEMENT = 1 << 3,
  IS_CSS2 = 1 << 4,
  IS_EAGER = 1 << 5,
  IS_JS_CREATED_NAC = 1 << 6,
  IS_FLEX_OR_GRID_ITEM = 1 << 7,
  IS_ELEMENT_BACKED = 1 << 8,
  SUPPORTS_USER_ACTION_STATE = 1 << 9,
  IS_INHERITING_ANON_BOX = 1 << 10,
  IS_NON_INHERITING_ANON_BOX = 1 << 11,
  IS_ANON_BOX = IS_INHERITING_ANON_BOX | IS_NON_INHERITING_ANON_BOX,
  IS_WRAPPER_ANON_BOX = 1 << 12,
};

MOZ_MAKE_ENUM_CLASS_BITWISE_OPERATORS(PseudoStyleTypeFlags)

// The kind of pseudo-style that we have. This can be:
//
//  * CSS pseudo-elements (see PseudoStyleType.h).
//  * Anonymous boxes (see nsCSSAnonBoxes.h).
//  * XUL tree pseudo-element stuff.
//
// This roughly corresponds to the `PseudoElement` enum in Rust code.
enum class PseudoStyleType : uint8_t {
// If CSS pseudo-elements stop being first here, change GetPseudoType.
#define CSS_PSEUDO_STYLE_TYPE(_name, _flags) _name,
#include "mozilla/PseudoStyleTypeList.h"
#undef CSS_PSEUDO_STYLE_TYPE
  NotPseudo,
  MAX,
};

enum NonInheritingAnonBox : uint8_t {
#define CSS_NON_INHERITING_ANON_BOX(_name, _flags) _name,
#include "mozilla/PseudoStyleTypeList.h"
#undef CSS_NON_INHERITING_ANON_BOX
  _Count,
};

std::ostream& operator<<(std::ostream&, PseudoStyleType);

class PseudoStyle final {
  static const PseudoStyleTypeFlags kFlags[size_t(PseudoStyleType::MAX)];
  static const nsStaticAtom* kAtoms[size_t(PseudoStyleType::MAX)];

 public:
  static constexpr size_t kEagerPseudoCount = 4;
  using Type = PseudoStyleType;

  static PseudoStyleTypeFlags GetFlags(Type aType) {
    MOZ_ASSERT(aType < Type::MAX);
    return kFlags[size_t(aType)];
  }

  static const nsStaticAtom* GetAtom(Type aType) {
    MOZ_ASSERT(aType < Type::MAX);
    MOZ_ASSERT(aType != Type::NotPseudo);
    return kAtoms[size_t(aType)];
  }

  static bool HasAnyFlag(Type aType, PseudoStyleTypeFlags aFlags) {
    return bool(GetFlags(aType) & aFlags);
  }

  static bool IsPseudoElement(Type aType) {
    return HasAnyFlag(aType, PseudoStyleTypeFlags::IS_PSEUDO_ELEMENT);
  }

  static bool IsAnonBox(Type aType) {
    return HasAnyFlag(aType, PseudoStyleTypeFlags::IS_ANON_BOX);
  }

  static bool IsNonElement(PseudoStyleType aPseudo) {
    return aPseudo == PseudoStyleType::MozText ||
           aPseudo == PseudoStyleType::MozOofPlaceholder ||
           aPseudo == PseudoStyleType::MozFirstLetterContinuation;
  }

  static bool IsInheritingAnonBox(Type aType) {
    return HasAnyFlag(aType, PseudoStyleTypeFlags::IS_INHERITING_ANON_BOX);
  }

  static bool IsNonInheritingAnonBox(Type aType) {
    return HasAnyFlag(aType, PseudoStyleTypeFlags::IS_NON_INHERITING_ANON_BOX);
  }

  static bool IsWrapperAnonBox(Type aType) {
    return HasAnyFlag(aType, PseudoStyleTypeFlags::IS_WRAPPER_ANON_BOX);
  }

  static bool IsElementBackedPseudo(Type aType) {
    return HasAnyFlag(aType, PseudoStyleTypeFlags::IS_ELEMENT_BACKED);
  }

  static bool IsNamedViewTransitionPseudoElement(Type aType) {
    return aType == Type::ViewTransitionGroup ||
           aType == Type::ViewTransitionImagePair ||
           aType == Type::ViewTransitionOld || aType == Type::ViewTransitionNew;
  }

  static bool IsViewTransitionPseudoElement(Type aType) {
    return aType == Type::ViewTransition ||
           IsNamedViewTransitionPseudoElement(aType);
  }

  static bool IsEagerlyCascadedInServo(const Type aType) {
    return HasAnyFlag(aType, PseudoStyleTypeFlags::IS_EAGER);
  }

  // Get the NonInheriting type for a given pseudo tag. The pseudo tag must test
  // true for IsNonInheritingAnonBox.
  static NonInheritingAnonBox NonInheritingTypeForPseudoType(
      PseudoStyleType aType) {
    MOZ_ASSERT(IsNonInheritingAnonBox(aType));
    static_assert(sizeof(PseudoStyleType) == sizeof(uint8_t));
    // We rely on non-inheriting anon boxes going first.
    return NonInheritingAnonBox(static_cast<uint8_t>(aType));
  }

  static bool SupportsUserActionState(const Type aType) {
    return HasAnyFlag(aType, PseudoStyleTypeFlags::SUPPORTS_USER_ACTION_STATE);
  }

  static bool IsJSCreatedNAC(Type aType) {
    return HasAnyFlag(aType, PseudoStyleTypeFlags::IS_JS_CREATED_NAC);
  }

  static bool PseudoElementIsFlexOrGridItem(const Type aType) {
    return HasAnyFlag(aType, PseudoStyleTypeFlags::IS_FLEX_OR_GRID_ITEM);
  }
};

}  // namespace mozilla

#endif
