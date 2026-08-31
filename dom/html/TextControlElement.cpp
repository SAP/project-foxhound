/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "TextControlElement.h"

#include "mozilla/ContentEvents.h"
#include "mozilla/EventDispatcher.h"
#include "mozilla/IMEContentObserver.h"
#include "mozilla/IMEStateManager.h"
#include "mozilla/LookAndFeel.h"
#include "mozilla/PresShell.h"
#include "mozilla/TextControlState.h"
#include "mozilla/TextEditor.h"
#include "mozilla/dom/Document.h"
#include "mozilla/dom/HTMLBRElement.h"
#include "mozilla/dom/ShadowRoot.h"
#include "nsFocusManager.h"
#include "nsFrameSelection.h"
#include "nsIFormControl.h"
#include "nsTextControlFrame.h"
#include "nsTextNode.h"

using namespace mozilla::dom;

namespace mozilla {

static RefPtr<Element> MakeAnonElement(Document& aDoc,
                                       PseudoStyleType aPseudoType,
                                       nsAtom* aTag = nsGkAtoms::div) {
  MOZ_ASSERT(aPseudoType != PseudoStyleType::NotPseudo);
  RefPtr<Element> element = aDoc.CreateHTMLElement(aTag);
  element->SetPseudoElementType(aPseudoType);
  if (aPseudoType == PseudoStyleType::MozTextControlEditingRoot) {
    // Make our root node editable
    element->SetFlags(NODE_IS_EDITABLE);
  } else {
    // The text control's accessible takes care of the placeholder etc for us,
    // all our pseudo-elements other than the root should not show up in the
    // a11y tree.
    element->SetAttr(kNameSpaceID_None, nsGkAtoms::aria_hidden, u"true"_ns,
                     false);
  }
  return element;
}

RefPtr<Element> MakePlaceholderOrPreview(Document& aDoc,
                                         PseudoStyleType aPseudoType,
                                         const nsAString& aValue) {
  RefPtr el = MakeAnonElement(aDoc, aPseudoType);
  RefPtr text = aDoc.CreateTextNode(aValue);
  el->AppendChildTo(text, false, IgnoreErrors());
  return el;
}

Element* TextControlElement::FindShadowPseudo(PseudoStyleType aType) const {
  auto* sr = GetShadowRoot();
  if (!sr) {
    return nullptr;
  }
  for (auto* child = sr->GetFirstChild(); child;
       child = child->GetNextSibling()) {
    auto* el = Element::FromNode(child);
    if (el->GetPseudoElementType() == aType) {
      return el;
    }
  }
  return nullptr;
}

void TextControlElement::GetPreviewValue(nsAString& aValue) {
  Element* existing = FindShadowPseudo(PseudoStyleType::MozTextControlPreview);
  if (!existing) {
    return;
  }
  auto* text = Text::FromNodeOrNull(existing->GetFirstChild());
  if (NS_WARN_IF(!text)) {
    return;
  }
  text->GetData(aValue);
}

void TextControlElement::SetPreviewValue(const nsAString& aValue) {
  RefPtr sr = GetShadowRoot();
  if (!sr) {
    return;
  }
  RefPtr existing = FindShadowPseudo(PseudoStyleType::MozTextControlPreview);
  if (aValue.IsEmpty()) {
    if (existing) {
      existing->Remove();
    }
    return;
  }
  if (existing) {
    RefPtr text = Text::FromNodeOrNull(existing->GetFirstChild());
    if (NS_WARN_IF(!text)) {
      return;
    }
    text->SetData(aValue, IgnoreErrors());
    return;
  }
  // Preview goes after the root or placeholder.
  RefPtr prevSibling = FindShadowPseudo(PseudoStyleType::Placeholder);
  if (!prevSibling) {
    prevSibling = FindShadowPseudo(PseudoStyleType::MozTextControlEditingRoot);
  }
  if (NS_WARN_IF(!prevSibling)) {
    // This can happen if we get called on e.g. a datetimebox or so.
    return;
  }
  RefPtr preview = MakePlaceholderOrPreview(
      *OwnerDoc(), PseudoStyleType::MozTextControlPreview, aValue);
  sr->InsertChildBefore(preview, prevSibling->GetNextSibling(),
                        /* aNotify = */ true, IgnoreErrors());
}

static void ProcessPlaceholder(nsAString& aValue, bool aTextArea) {
  if (aTextArea) {  //  <textarea>s preserve newlines...
    nsContentUtils::PlatformToDOMLineBreaks(aValue);
  } else {  // ...<input>s don't
    nsContentUtils::RemoveNewlines(aValue);
  }
}

void TextControlElement::UpdatePlaceholder(const nsAttrValue* aOldValue,
                                           const nsAttrValue* aNewValue) {
  RefPtr sr = GetShadowRoot();
  if (!sr) {
    return;
  }
  if (!IsSingleLineTextControlOrTextArea()) {
    // We may still have a shadow tree for other input types like
    // <input type=date>
    return;
  }
  if (aOldValue) {
    RefPtr existing = FindShadowPseudo(PseudoStyleType::Placeholder);
    if (NS_WARN_IF(!existing)) {
      return;
    }
    if (!aNewValue) {
      existing->Remove();
      return;
    }
    RefPtr text = Text::FromNodeOrNull(existing->GetFirstChild());
    if (NS_WARN_IF(!text)) {
      return;
    }
    nsAutoString value;
    aNewValue->ToString(value);
    ProcessPlaceholder(value, IsTextArea());
    text->SetData(value, IgnoreErrors());
    return;
  }
  MOZ_ASSERT(aNewValue, "No need to call this if the attribute didn't change");
  MOZ_ASSERT(!FindShadowPseudo(PseudoStyleType::Placeholder));
  nsAutoString value;
  aNewValue->ToString(value);
  ProcessPlaceholder(value, IsTextArea());
  RefPtr ph = MakePlaceholderOrPreview(*OwnerDoc(),
                                       PseudoStyleType::Placeholder, value);
  // Placeholder goes after editing root.
  RefPtr editingRoot =
      FindShadowPseudo(PseudoStyleType::MozTextControlEditingRoot);
  if (NS_WARN_IF(!editingRoot)) {
    return;
  }
  sr->InsertChildBefore(ph, editingRoot->GetNextSibling(), /* aNotify = */ true,
                        IgnoreErrors());
}

already_AddRefed<Element> TextControlElement::CreateButton() const {
  auto& doc = *OwnerDoc();
  switch (mType) {
    case FormControlType::InputPassword:
      if (StaticPrefs::layout_forms_reveal_password_button_enabled() ||
          doc.ChromeRulesEnabled()) {
        RefPtr button =
            MakeAnonElement(doc, PseudoStyleType::MozReveal, nsGkAtoms::button);
        button->SetAttr(kNameSpaceID_None, nsGkAtoms::tabindex, u"-1"_ns,
                        false);
        return button.forget();
      }
      break;
    case FormControlType::InputSearch: {
      // Bug 1936648: Until we're absolutely sure we've solved the
      // accessibility issues around the clear search button, we're only
      // enabling the clear button in chrome contexts. See also Bug 1655503
      if (StaticPrefs::layout_forms_input_type_search_enabled() ||
          doc.ChromeRulesEnabled()) {
        RefPtr button = MakeAnonElement(
            doc, PseudoStyleType::MozSearchClearButton, nsGkAtoms::button);
        button->SetAttr(kNameSpaceID_None, nsGkAtoms::tabindex, u"-1"_ns,
                        false);
        button->SetAttr(kNameSpaceID_None, nsGkAtoms::title, u""_ns, false);
        return button.forget();
      }
      break;
    }
#ifndef ANDROID
    case FormControlType::InputNumber: {
      RefPtr button = MakeAnonElement(doc, PseudoStyleType::MozNumberSpinBox);
      for (auto pseudo : {PseudoStyleType::MozNumberSpinUp,
                          PseudoStyleType::MozNumberSpinDown}) {
        RefPtr spinner = MakeAnonElement(doc, pseudo);
        button->AppendChildTo(spinner, false, IgnoreErrors());
      }
      return button.forget();
    }
#endif
    default:
      break;
  }
  return nullptr;
}

void TextControlElement::UpdateTextEditorShadowTree() {
  Element* root = GetTextEditorRoot();
  if (!root) {
    // We might not have created the shadow tree yet.
    return;
  }
  auto* text = Text::FromNodeOrNull(root->GetFirstChild());
  if (!text) {
    MOZ_DIAGNOSTIC_ASSERT(false, "There should be editable text");
    return;
  }
  if (IsPasswordTextControl()) {
    text->MarkAsMaybeMasked();
  } else {
    text->UnsetFlags(NS_MAYBE_MASKED);
  }
}

void TextControlElement::SetupShadowTree(ShadowRoot& aShadow, bool aNotify) {
  MOZ_ASSERT(IsSingleLineTextControlOrTextArea());
  auto& doc = *OwnerDoc();
  const bool isPassword = mType == FormControlType::InputPassword;
  RefPtr root =
      MakeAnonElement(doc, PseudoStyleType::MozTextControlEditingRoot);
  {
    RefPtr text = doc.CreateEmptyTextNode();
    text->MarkAsMaybeModifiedFrequently();
    if (isPassword) {
      text->MarkAsMaybeMasked();
    }
    root->AppendChildTo(text, false, IgnoreErrors());
    RefPtr br = doc.CreateHTMLElement(nsGkAtoms::br);
    br->SetFlags(NS_PADDING_FOR_EMPTY_LAST_LINE);
    root->AppendChildTo(br, false, IgnoreErrors());
  }
  aShadow.AppendChildTo(root, aNotify, IgnoreErrors());

  nsAutoString value;
  if (GetAttr(nsGkAtoms::placeholder, value)) {
    ProcessPlaceholder(value, IsTextArea());
    RefPtr ph =
        MakePlaceholderOrPreview(doc, PseudoStyleType::Placeholder, value);
    aShadow.AppendChildTo(ph, aNotify, IgnoreErrors());
  }

  UpdateValueDisplay(aNotify);
}

bool TextControlElement::IsButtonPseudoElement(PseudoStyleType aType) {
  switch (aType) {
    case PseudoStyleType::MozSearchClearButton:
    case PseudoStyleType::MozNumberSpinBox:
    case PseudoStyleType::MozReveal:
      return true;
    default:
      break;
  }
  return false;
}

Element* TextControlElement::GetTextEditorRoot() const {
  return FindShadowPseudo(PseudoStyleType::MozTextControlEditingRoot);
}

Element* TextControlElement::GetTextEditorPlaceholder() const {
  return FindShadowPseudo(PseudoStyleType::Placeholder);
}

Element* TextControlElement::GetTextEditorPreview() const {
  return FindShadowPseudo(PseudoStyleType::MozTextControlPreview);
}

Element* TextControlElement::GetTextEditorButton() const {
  nsTextControlFrame* frame = do_QueryFrame(GetPrimaryFrame());
  return frame ? frame->GetButton() : nullptr;
}

void TextControlElement::UpdateValueDisplay(bool aNotify) {
  auto* root = GetTextEditorRoot();
  if (!root) {
    return;
  }
  auto* textContent = Text::FromNodeOrNull(root->GetFirstChild());
  if (NS_WARN_IF(!textContent)) {
    return;
  }
  // Get the current value of the textfield from the content.
  nsAutoString value;
  GetTextEditorValue(value);
  textContent->SetText(value, aNotify);
}

static bool SelectTextFieldOnFocus() {
  return LookAndFeel::GetInt(LookAndFeel::IntID::SelectTextfieldsOnKeyFocus);
}

void TextControlElement::ScrollSelectionIntoViewAsync(
    ScrollAncestors aScrollAncestors) {
  nsCOMPtr<nsISelectionController> selCon = GetSelectionController();
  if (!selCon) {
    return;
  }

  // Scroll the selection into view (see bug 231389).
  const auto flags = aScrollAncestors == ScrollAncestors::Yes
                         ? ScrollFlags::None
                         : ScrollFlags::ScrollFirstAncestorOnly;
  selCon->ScrollSelectionIntoView(
      SelectionType::eNormal, nsISelectionController::SELECTION_FOCUS_REGION,
      AxisScrollParams(), AxisScrollParams(), flags);
}

void TextControlElement::ShowSelection() {
  nsISelectionController* selCon = GetSelectionController();
  if (!selCon) {
    return;
  }
  RefPtr<Selection> ourSel =
      selCon->GetSelection(nsISelectionController::SELECTION_NORMAL);
  if (!ourSel) {
    return;
  }
  RefPtr<PresShell> ps = OwnerDoc()->GetPresShell();
  if (!ps) {
    return;
  }
  RefPtr<nsCaret> caret = ps->GetOriginalCaret();
  if (!caret) {
    return;
  }

  // Tell the caret to use our selection
  caret->SetSelection(ourSel);

  // mutual-exclusion: the selection is either controlled by the document or by
  // the text input/area. Clear any selection in the document since the focus is
  // now on our independent selection.

  RefPtr<Selection> docSel =
      ps->GetSelection(nsISelectionController::SELECTION_NORMAL);
  if (!docSel) {
    return;
  }

  if (!docSel->IsCollapsed()) {
    docSel->RemoveAllRanges(IgnoreErrors());
  }
  if (ps->IsDestroying()) {
    return;
  }

  // If the focus moved to a text control during text selection by pointer
  // device, stop extending the selection.
  if (RefPtr<nsFrameSelection> frameSelection = ps->FrameSelection()) {
    frameSelection->SetDragState(false);
  }
}

bool TextControlElement::NeedToInitializeEditorForEvent(
    EventChainPreVisitor& aVisitor) const {
  switch (aVisitor.mEvent->mMessage) {
    case eVoidEvent:
    case eMouseMove:
    case eMouseEnterIntoWidget:
    case eMouseExitFromWidget:
    case eMouseOver:
    case eMouseOut:
    case eScrollPortUnderflow:
    case eScrollPortOverflow:
      return false;
    default:
      return true;
  }
}

void TextControlElement::WillFocus(const WidgetEvent& aFocusEvent) {
  MOZ_ASSERT(aFocusEvent.mMessage == eFocus);
  MOZ_ASSERT(aFocusEvent.IsTrusted());

  if (!IsInComposedDoc()) {
    return;
  }

  ShowSelection();

  // See if we should select the contents of the textbox. This happens
  // for text and password fields when the field was focused by the
  // keyboard or a navigation, the platform allows it, and it wasn't
  // just because we raised a window.
  //
  // While it'd usually make sense, we don't do this for JS callers
  // because it causes some compat issues, see bug 1712724 for example.
  const RefPtr<nsFocusManager> fm = nsFocusManager::GetFocusManager();
  if (!IsTextArea() && !aFocusEvent.AsFocusEvent()->mFromRaise &&
      SelectTextFieldOnFocus()) {
    uint32_t lastFocusMethod = fm->GetLastFocusMethod(OwnerDoc()->GetWindow());
    const bool shouldSelectAllOnFocus = [&] {
      if (lastFocusMethod & nsIFocusManager::FLAG_BYMOVEFOCUS) {
        return true;
      }
      if (lastFocusMethod & nsIFocusManager::FLAG_BYJS) {
        return false;
      }
      return bool(lastFocusMethod & nsIFocusManager::FLAG_BYKEY);
    }();
    if (shouldSelectAllOnFocus) {
      SelectAll();
    }
  }
  if (fm && fm->GetFocusedElement() == this && aFocusEvent.IsTrusted())
      [[likely]] {
    const RefPtr<TextEditor> textEditor = GetExtantTextEditor();
    if (textEditor) [[likely]] {
      DebugOnly<nsresult> rv = textEditor->OnFocus(*this);
      NS_WARNING_ASSERTION(NS_SUCCEEDED(rv),
                           "EditorBase::OnFocus() failed, but ignored");
    }
  }
}

void TextControlElement::WillBlur(const WidgetEvent& aBlurEvent) {
  MOZ_ASSERT(aBlurEvent.mMessage == eBlur);

  if (aBlurEvent.IsTrusted()) {
    const RefPtr<TextEditor> textEditor = GetExtantTextEditor();
    if (textEditor) [[likely]] {
      DebugOnly<nsresult> rv = textEditor->OnBlur(this);
      NS_WARNING_ASSERTION(NS_SUCCEEDED(rv),
                           "EditorBase::OnBlur() failed, but ignored");
    }
  }
}

void TextControlElement::SelectAll() {
  if (auto* state = GetTextControlState()) {
    state->SetSelectionRange(0, UINT32_MAX, Optional<nsAString>(),
                             IgnoreErrors(),
                             TextControlState::ScrollAfterSelection::No);
  }
}

}  // namespace mozilla
