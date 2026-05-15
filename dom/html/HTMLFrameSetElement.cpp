/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "HTMLFrameSetElement.h"

#include "mozilla/dom/Document.h"
#include "mozilla/dom/EventHandlerBinding.h"
#include "mozilla/dom/HTMLFrameSetElementBinding.h"
#include "nsAttrValueOrString.h"
#include "nsGlobalWindowInner.h"

NS_IMPL_NS_NEW_HTML_ELEMENT(FrameSet)

namespace mozilla::dom {

HTMLFrameSetElement::~HTMLFrameSetElement() = default;

JSObject* HTMLFrameSetElement::WrapNode(JSContext* aCx,
                                        JS::Handle<JSObject*> aGivenProto) {
  return HTMLFrameSetElement_Binding::Wrap(aCx, this, aGivenProto);
}

NS_IMPL_ELEMENT_CLONE(HTMLFrameSetElement)

void HTMLFrameSetElement::BeforeSetAttr(int32_t aNamespaceID, nsAtom* aName,
                                        const nsAttrValue* aValue,
                                        bool aNotify) {
  /* The main goal here is to see whether the _number_ of rows or
   * columns has changed. If it has, we need to reframe; otherwise
   * we want to reflow.
   * Ideally, the style hint would be changed back to reflow after the reframe
   * has been performed. Unfortunately, however, the reframe will be performed
   * by the call to MutationObservers::AttributeChanged, which occurs *after*
   * AfterSetAttr is called, leaving us with no convenient way of changing the
   * value back to reflow afterwards. However,
   * MutationObservers::AttributeChanged is effectively the only consumer of
   * this value, so as long as we always set the value correctly here, we should
   * be fine.
   */
  mCurrentRowColHint = NS_STYLE_HINT_REFLOW;
  if (aNamespaceID == kNameSpaceID_None) {
    if (aName == nsGkAtoms::rows) {
      if (aValue) {
        size_t oldNumRows = mRowSpecs.Length();
        ParseRowCol(*aValue, mRowSpecs);
        if (mRowSpecs.Length() != oldNumRows) {
          mCurrentRowColHint = nsChangeHint_ReconstructFrame;
        }
      }
    } else if (aName == nsGkAtoms::cols) {
      if (aValue) {
        size_t oldNumCols = mColSpecs.Length();
        ParseRowCol(*aValue, mColSpecs);
        if (mColSpecs.Length() != oldNumCols) {
          mCurrentRowColHint = nsChangeHint_ReconstructFrame;
        }
      }
    }
  }

  return nsGenericHTMLElement::BeforeSetAttr(aNamespaceID, aName, aValue,
                                             aNotify);
}

Span<const nsFramesetSpec> HTMLFrameSetElement::GetRowSpec() {
  if (mRowSpecs.IsEmpty()) {
    if (const nsAttrValue* value = GetParsedAttr(nsGkAtoms::rows)) {
      if (NS_FAILED(ParseRowCol(*value, mRowSpecs))) {
        return {};
      }
    }

    if (mRowSpecs.IsEmpty()) {
      // We may not have had an attr or had an empty attr.
      mRowSpecs.SetLength(1);
      mRowSpecs[0].mUnit = eFramesetUnit_Relative;
      mRowSpecs[0].mValue = 1;
    }
  }

  return Span(mRowSpecs);
}

Span<const nsFramesetSpec> HTMLFrameSetElement::GetColSpec() {
  if (mColSpecs.IsEmpty()) {
    if (const nsAttrValue* value = GetParsedAttr(nsGkAtoms::cols)) {
      if (NS_FAILED(ParseRowCol(*value, mColSpecs))) {
        return {};
      }
    }

    if (mColSpecs.IsEmpty()) {
      // We may not have had an attr or had an empty attr.
      mColSpecs.SetLength(1);
      mColSpecs[0].mUnit = eFramesetUnit_Relative;
      mColSpecs[0].mValue = 1;
    }
  }

  return Span(mColSpecs);
}

bool HTMLFrameSetElement::ParseAttribute(int32_t aNamespaceID,
                                         nsAtom* aAttribute,
                                         const nsAString& aValue,
                                         nsIPrincipal* aMaybeScriptedPrincipal,
                                         nsAttrValue& aResult) {
  if (aNamespaceID == kNameSpaceID_None) {
    if (aAttribute == nsGkAtoms::bordercolor) {
      return aResult.ParseColor(aValue);
    }
    if (aAttribute == nsGkAtoms::frameborder) {
      return nsGenericHTMLElement::ParseFrameborderValue(aValue, aResult);
    }
    if (aAttribute == nsGkAtoms::border) {
      return aResult.ParseIntWithBounds(aValue, 0, 100);
    }
  }

  return nsGenericHTMLElement::ParseAttribute(aNamespaceID, aAttribute, aValue,
                                              aMaybeScriptedPrincipal, aResult);
}

nsChangeHint HTMLFrameSetElement::GetAttributeChangeHint(
    const nsAtom* aAttribute, AttrModType aModType) const {
  nsChangeHint retval =
      nsGenericHTMLElement::GetAttributeChangeHint(aAttribute, aModType);
  if (aAttribute == nsGkAtoms::rows || aAttribute == nsGkAtoms::cols) {
    retval |= mCurrentRowColHint;
  }
  return retval;
}

/**
 * Translate a "rows" or "cols" spec into an array of nsFramesetSpecs
 */
nsresult HTMLFrameSetElement::ParseRowCol(const nsAttrValue& aValue,
                                          nsTArray<nsFramesetSpec>& aSpecs) {
  if (aValue.IsEmptyString()) {
    aSpecs.Clear();
    return NS_OK;
  }

  static const char16_t sAster('*');
  static const char16_t sPercent('%');
  static const char16_t sComma(',');

  nsAutoString spec(nsAttrValueOrString(&aValue).String());
  // remove whitespace (Bug 33699) and quotation marks (bug 224598)
  // also remove leading/trailing commas (bug 31482)
  spec.StripChars(u" \n\r\t\"\'");
  spec.Trim(",");

  // Count the commas. Don't count more than X commas (bug 576447).
  static_assert(NS_MAX_FRAMESET_SPEC_COUNT * sizeof(nsFramesetSpec) < (1 << 30),
                "Too many frameset specs allowed to allocate");
  int32_t commaX = spec.FindChar(sComma);
  size_t count = 1;
  while (commaX != kNotFound && count < NS_MAX_FRAMESET_SPEC_COUNT) {
    count++;
    commaX = spec.FindChar(sComma, commaX + 1);
  }

  nsTArray<nsFramesetSpec> specs;
  if (!specs.SetLength(count, fallible)) {
    aSpecs.Clear();
    return NS_ERROR_OUT_OF_MEMORY;
  }

  // Pre-grab the compat mode; we may need it later in the loop.
  bool isInQuirks = InNavQuirksMode(OwnerDoc());

  // Parse each comma separated token

  size_t start = 0;
  size_t specLen = spec.Length();

  for (size_t i = 0; i < count; i++) {
    // Find our comma
    commaX = spec.FindChar(sComma, start);
    MOZ_ASSERT(i == count - 1 || commaX != kNotFound,
               "Failed to find comma, somehow");
    size_t end = (commaX == kNotFound) ? specLen : commaX;

    // Note: If end == start then it means that the token has no
    // data in it other than a terminating comma (or the end of the spec).
    // So default to a fixed width of 0.
    specs[i].mUnit = eFramesetUnit_Fixed;
    specs[i].mValue = 0;
    if (end > start) {
      size_t numberEnd = end;
      char16_t ch = spec.CharAt(numberEnd - 1);
      if (sAster == ch) {
        specs[i].mUnit = eFramesetUnit_Relative;
        numberEnd--;
      } else if (sPercent == ch) {
        specs[i].mUnit = eFramesetUnit_Percent;
        numberEnd--;
        // check for "*%"
        if (numberEnd > start) {
          ch = spec.CharAt(numberEnd - 1);
          if (sAster == ch) {
            specs[i].mUnit = eFramesetUnit_Relative;
            numberEnd--;
          }
        }
      }

      // Translate value to an integer
      nsAutoString token;
      spec.Mid(token, start, numberEnd - start);

      // Treat * as 1*
      if ((eFramesetUnit_Relative == specs[i].mUnit) && (0 == token.Length())) {
        specs[i].mValue = 1;
      } else {
        // Otherwise just convert to integer.
        nsresult err;
        specs[i].mValue = token.ToInteger(&err);
        if (NS_FAILED(err)) {
          specs[i].mValue = 0;
        }
      }

      // Treat 0* as 1* in quirks mode (bug 40383)
      if (isInQuirks) {
        if ((eFramesetUnit_Relative == specs[i].mUnit) &&
            (0 == specs[i].mValue)) {
          specs[i].mValue = 1;
        }
      }

      // In standards mode, just set negative sizes to zero
      if (specs[i].mValue < 0) {
        specs[i].mValue = 0;
      }
      start = end + 1;
    }
  }

  aSpecs = std::move(specs);

  return NS_OK;
}

bool HTMLFrameSetElement::IsEventAttributeNameInternal(nsAtom* aName) {
  return nsContentUtils::IsEventAttributeName(
      aName, EventNameType_HTML | EventNameType_HTMLBodyOrFramesetOnly);
}

#define EVENT(name_, id_, type_, struct_) /* nothing; handled by the shim */
// nsGenericHTMLElement::GetOnError returns
// already_AddRefed<EventHandlerNonNull> while other getters return
// EventHandlerNonNull*, so allow passing in the type to use here.
#define WINDOW_EVENT_HELPER(name_, type_)                              \
  type_* HTMLFrameSetElement::GetOn##name_() {                         \
    if (nsPIDOMWindowInner* win = OwnerDoc()->GetInnerWindow()) {      \
      nsGlobalWindowInner* globalWin = nsGlobalWindowInner::Cast(win); \
      return globalWin->GetOn##name_();                                \
    }                                                                  \
    return nullptr;                                                    \
  }                                                                    \
  void HTMLFrameSetElement::SetOn##name_(type_* handler) {             \
    nsPIDOMWindowInner* win = OwnerDoc()->GetInnerWindow();            \
    if (!win) {                                                        \
      return;                                                          \
    }                                                                  \
                                                                       \
    nsGlobalWindowInner* globalWin = nsGlobalWindowInner::Cast(win);   \
    return globalWin->SetOn##name_(handler);                           \
  }
#define WINDOW_EVENT(name_, id_, type_, struct_) \
  WINDOW_EVENT_HELPER(name_, EventHandlerNonNull)
#define BEFOREUNLOAD_EVENT(name_, id_, type_, struct_) \
  WINDOW_EVENT_HELPER(name_, OnBeforeUnloadEventHandlerNonNull)
#include "mozilla/EventNameList.inc"  // IWYU pragma: keep
#undef BEFOREUNLOAD_EVENT
#undef WINDOW_EVENT
#undef WINDOW_EVENT_HELPER
#undef EVENT

}  // namespace mozilla::dom
