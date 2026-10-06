/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

#include "EditContext.h"

#include "mozilla/ClearOnShutdown.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/EventDispatcher.h"
#include "mozilla/TextEvents.h"
#include "mozilla/dom/AnonymousContent.h"
#include "mozilla/dom/Document.h"
#include "mozilla/dom/DocumentInlines.h"
#include "mozilla/dom/Element.h"
#include "mozilla/dom/Text.h"
#include "mozilla/dom/TextUpdateEvent.h"
#include "nsDOMCSSDeclaration.h"
#include "nsGenericHTMLElement.h"
#include "nsTextNode.h"

namespace mozilla::dom {

NS_IMPL_ADDREF_INHERITED(EditContext, DOMEventTargetHelper)
NS_IMPL_RELEASE_INHERITED(EditContext, DOMEventTargetHelper)
NS_IMPL_CYCLE_COLLECTION_INHERITED(EditContext, DOMEventTargetHelper,
                                   mAssociatedElement, mText, mTextContainer)

NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(EditContext)
NS_INTERFACE_MAP_END_INHERITING(DOMEventTargetHelper)

already_AddRefed<EditContext> EditContext::Constructor(
    const GlobalObject& aGlobal, const EditContextInit& aInit,
    ErrorResult& aRv) {
  nsCOMPtr<nsIGlobalObject> global = do_QueryInterface(aGlobal.GetAsSupports());
  if (!global) {
    aRv.Throw(NS_ERROR_FAILURE);
    return nullptr;
  }
  RefPtr<EditContext> context = new EditContext(global, aInit, aRv);
  if (aRv.Failed()) {
    return nullptr;
  }
  return context.forget();
}

JSObject* EditContext::WrapObject(JSContext* aCx,
                                  JS::Handle<JSObject*> aGivenProto) {
  return EditContext_Binding::Wrap(aCx, this, aGivenProto);
}

static StaticAutoPtr<nsTHashMap<const Element*, RefPtr<EditContext>>>
    sEditContextHashMap;

// static
EditContext* EditContext::GetForElement(const Element& aElement) {
  MOZ_ASSERT(NS_IsMainThread());
  if (!sEditContextHashMap || !aElement.HasFlag(ELEMENT_HAS_EDIT_CONTEXT)) {
    return nullptr;
  }
  auto entry = sEditContextHashMap->Lookup(&aElement);
  MOZ_ASSERT(entry,
             "Should be in hash map if ELEMENT_HAS_EDIT_CONTEXT is set.");
  return entry.Data();
}

// static
void EditContext::SetForElement(const Element& aElement,
                                mozilla::dom::EditContext* aEditContext) {
  MOZ_ASSERT(NS_IsMainThread());
  if (!sEditContextHashMap) {
    if (!aEditContext) {
      return;
    }
    sEditContextHashMap = new nsTHashMap<const Element*, RefPtr<EditContext>>;
    ClearOnShutdown(&sEditContextHashMap);
  }
  if (aEditContext) {
    sEditContextHashMap->InsertOrUpdate(&aElement, aEditContext);
  } else {
    sEditContextHashMap->Remove(&aElement);
  }
}

void EditContext::Deactivate() {
  // https://w3c.github.io/edit-context/#dfn-deactivate-an-editcontext

  // https://github.com/w3c/edit-context/pull/123
  if (!mIsComposing) {
    return;
  }

  // 1. Set editContext's is composing to false.
  mIsComposing = false;
  // 2. Fire an event named compositionend at editContext using
  //    CompositionEvent.
  // TODO
}

// static
bool EditContext::IsAnyAttached() {
  MOZ_ASSERT(NS_IsMainThread());
  return sEditContextHashMap && !sEditContextHashMap->IsEmpty();
}

EditContext::EditContext(nsIGlobalObject* aGlobalObject,
                         const EditContextInit& aInit, ErrorResult& aRv)
    : DOMEventTargetHelper(aGlobalObject) {
  auto window = aGlobalObject->GetAsInnerWindow();
  MOZ_ASSERT(window);
  auto* document = window->GetDoc();
  MOZ_ASSERT(document);
  RefPtr<AnonymousContent> anonymousContent =
      document->InsertAnonymousContent(aRv);
  if (NS_WARN_IF(!anonymousContent)) {
    return;
  }
  RefPtr<Element> textContainer =
      document->CreateElem(u"div"_ns, nullptr, kNameSpaceID_XHTML);
  if (NS_WARN_IF(!textContainer)) {
    aRv.Throw(NS_ERROR_FAILURE);
    return;
  }
  mTextContainer = nsGenericHTMLElement::FromNode(textContainer);
  MOZ_ASSERT(mTextContainer);
  mText = document->CreateTextNode(u""_ns);
  mText->MarkAsMaybeModifiedFrequently();
  mTextContainer->AppendChild(*mText, IgnoreErrors());
  anonymousContent->Root()->AppendChild(*mTextContainer, IgnoreErrors());
  mText->SetEditableFlag(true);
  mTextContainer->SetEditableFlag(true);
  mTextContainer->Style()->SetProperty("visibility"_ns, "hidden"_ns, ""_ns,
                                       IgnoreErrors());
  UpdateSelection(aInit.mSelectionStart, aInit.mSelectionEnd);
  UpdateText(0, 0, aInit.mText, aRv);
}

void EditContext::GetText(nsAString& aText) const { mText->GetData(aText); }

RefPtr<DOMRect> EditContext::ToDOMRect(const Rect& copy) const {
  return MakeRefPtr<DOMRect>(GetRelevantGlobal(), copy.x, copy.y, copy.width,
                             copy.height);
}

auto EditContext::ToRect(const DOMRect& rect) const -> Rect {
  return Rect(rect.X(), rect.Y(), rect.Width(), rect.Height());
}

void EditContext::UpdateCharacterBounds(
    uint32_t aRangeStart,
    const Sequence<OwningNonNull<DOMRect>>& aCharacterBounds) {
  mCodepointRectsStartIndex = aRangeStart;
  mCodepointRects.Clear();
  mCodepointRects.SetCapacity(aCharacterBounds.Length());
  for (const auto& rect : aCharacterBounds) {
    mCodepointRects.AppendElement(ToRect(rect));
  }
}

void EditContext::CharacterBounds(nsTArray<RefPtr<DOMRect>>& aRetVal) const {
  aRetVal.SetCapacity(mCodepointRects.Length());
  for (const Rect& rect : mCodepointRects) {
    aRetVal.AppendElement(ToDOMRect(rect));
  }
}

uint32_t EditContext::TextLength() const { return mText->TextLength(); }

void EditContext::UpdateText(uint32_t aRangeStart, uint32_t aRangeEnd,
                             const nsAString& aText, ErrorResult& aRv) {
  if (NS_WARN_IF(!mText->DataBuffer().CanGrowBy(aText.Length()))) {
    aRv.Throw(NS_ERROR_OUT_OF_MEMORY);
    return;
  }
  uint32_t start = std::min(aRangeStart, aRangeEnd);
  start = std::min(start, TextLength());
  uint32_t end = std::max(aRangeStart, aRangeEnd);
  end = std::min(end, TextLength());
  mText->ReplaceData(start, end - start, aText, IgnoreErrors());
  // XXX: Perhaps mSelectionStart/End should be clamped to new length
  //      of text? See https://github.com/w3c/edit-context/issues/88
}

void EditContext::UpdateControlBounds(DOMRect& aControlBounds) {
  mControlBounds = ToRect(aControlBounds);
}

void EditContext::UpdateSelectionBounds(DOMRect& aSelectionBounds) {
  mSelectionBounds = ToRect(aSelectionBounds);
}

void EditContext::UpdateTextAndFireEvent(uint32_t aStart, uint32_t aEnd,
                                         const nsAString& aString) {
  aStart = std::min(aStart, TextLength());
  aEnd = std::min(aEnd, TextLength());
  if (aStart == aEnd && aString.IsEmpty()) {
    // Edit doesn't change anything
    return;
  }
  if (aStart > aEnd) {
    std::swap(aStart, aEnd);
  }
  IgnoredErrorResult rv;
  UpdateText(aStart, aEnd, aString, rv);
  if (rv.Failed()) {
    return;
  }
  mSelectionStart = mSelectionEnd = aStart + aString.Length();
  TextUpdateEventInit options;
  options.mText = aString;
  options.mSelectionStart = mSelectionStart;
  options.mSelectionEnd = mSelectionEnd;
  options.mUpdateRangeStart = aStart;
  options.mUpdateRangeEnd = aEnd;
  options.mBubbles = false;
  options.mCancelable = true;
  RefPtr<TextUpdateEvent> e =
      TextUpdateEvent::Constructor(this, u"textupdate"_ns, options);
  e->SetTrusted(true);
  DispatchEvent(*e);
}

void EditContext::StartComposition(const WidgetCompositionEvent& aEvent) {
  MOZ_ASSERT(!mIsComposing);
  WidgetCompositionEvent event(aEvent);
  RefPtr presContext = mText->OwnerDoc()->GetPresContext();
  EventDispatcher::Dispatch(this, presContext, &event);
  mIsComposing = true;
}

void EditContext::EndComposition(const WidgetCompositionEvent& aEvent) {
  MOZ_ASSERT(mIsComposing);
  WidgetCompositionEvent event(aEvent);
  RefPtr presContext = mText->OwnerDoc()->GetPresContext();
  EventDispatcher::Dispatch(this, presContext, &event);
  mIsComposing = false;
}

}  // namespace mozilla::dom
