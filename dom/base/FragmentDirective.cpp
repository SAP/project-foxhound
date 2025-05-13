/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "FragmentDirective.h"
#include <cstdint>
#include "RangeBoundary.h"
#include "mozilla/Assertions.h"
#include "BasePrincipal.h"
#include "Document.h"
#include "mozilla/dom/BrowsingContext.h"
#include "mozilla/dom/BrowsingContextGroup.h"
#include "mozilla/dom/FragmentDirectiveBinding.h"
#include "mozilla/dom/FragmentOrElement.h"
#include "mozilla/dom/NodeBinding.h"
#include "mozilla/dom/Selection.h"
#include "mozilla/dom/Text.h"
#include "mozilla/intl/WordBreaker.h"
#include "mozilla/PresShell.h"
#include "nsComputedDOMStyle.h"
#include "nsContentUtils.h"
#include "nsDOMAttributeMap.h"
#include "nsDocShell.h"
#include "nsFind.h"
#include "nsGkAtoms.h"
#include "nsICSSDeclaration.h"
#include "nsIFrame.h"
#include "nsINode.h"
#include "nsIURIMutator.h"
#include "nsRange.h"
#include "nsString.h"

namespace mozilla::dom {
static LazyLogModule sFragmentDirectiveLog("FragmentDirective");

#define DBG_FN(msg, func, ...)                    \
  MOZ_LOG(sFragmentDirectiveLog, LogLevel::Debug, \
          ("%s(): " msg, func, ##__VA_ARGS__))

// Shortcut macro for logging, which includes the current function name.
// To customize (eg. if in a lambda), use `DBG_FN`.
#define DBG(msg, ...) DBG_FN(msg, __FUNCTION__, ##__VA_ARGS__)

MOZ_ALWAYS_INLINE static bool ShouldLog() {
  return MOZ_LOG_TEST(sFragmentDirectiveLog, LogLevel::Debug);
}

/** Converts a `TextDirective` into a percent-encoded string. */
static nsCString ToString(const TextDirective& aTextDirective) {
  nsCString str;
  create_text_directive(&aTextDirective, &str);
  return str;
}

/** Utility, used for logging. Converts an nsIURI to string. */
static nsCString ToString(nsIURI* aURI) {
  nsCString url;
  if (!aURI) {
    return url;
  }
  Unused << aURI->GetSpec(url);
  return url;
}

NS_IMPL_CYCLE_COLLECTION_WRAPPERCACHE(FragmentDirective, mDocument)
NS_IMPL_CYCLE_COLLECTING_ADDREF(FragmentDirective)
NS_IMPL_CYCLE_COLLECTING_RELEASE(FragmentDirective)
NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(FragmentDirective)
  NS_WRAPPERCACHE_INTERFACE_MAP_ENTRY
  NS_INTERFACE_MAP_ENTRY(nsISupports)
NS_INTERFACE_MAP_END

FragmentDirective::FragmentDirective(Document* aDocument)
    : mDocument(aDocument) {}

JSObject* FragmentDirective::WrapObject(JSContext* aCx,
                                        JS::Handle<JSObject*> aGivenProto) {
  return FragmentDirective_Binding::Wrap(aCx, this, aGivenProto);
}

bool FragmentDirective::ParseAndRemoveFragmentDirectiveFromFragmentString(
    nsCString& aFragment, nsTArray<TextDirective>* aTextDirectives,
    nsIURI* aURI) {
  if (aFragment.IsEmpty()) {
    DBG("URL '%s' has no fragment.", ToString(aURI).Data());
    return false;
  }
  DBG("Trying to extract a fragment directive from fragment '%s' of URL '%s'.",
      aFragment.Data(), ToString(aURI).Data());
  ParsedFragmentDirectiveResult fragmentDirective;
  const bool hasRemovedFragmentDirective =
      StaticPrefs::dom_text_fragments_enabled() &&
      parse_fragment_directive(&aFragment, &fragmentDirective);
  if (hasRemovedFragmentDirective) {
    DBG("Found a fragment directive '%s', which was removed from the fragment. "
        "New fragment is '%s'.",
        fragmentDirective.fragment_directive.Data(),
        fragmentDirective.hash_without_fragment_directive.Data());
    if (ShouldLog()) {
      if (fragmentDirective.text_directives.IsEmpty()) {
        DBG("Found no valid text directives in fragment directive '%s'.",
            fragmentDirective.fragment_directive.Data());
      } else {
        DBG("Found %zu valid text directives in fragment directive '%s':",
            fragmentDirective.text_directives.Length(),
            fragmentDirective.fragment_directive.Data());
        for (size_t index = 0;
             index < fragmentDirective.text_directives.Length(); ++index) {
          const auto& textDirective = fragmentDirective.text_directives[index];
          DBG(" [%zu]: %s", index, ToString(textDirective).Data());
        }
      }
    }
    aFragment = fragmentDirective.hash_without_fragment_directive;
    if (aTextDirectives) {
      aTextDirectives->SwapElements(fragmentDirective.text_directives);
    }
  } else {
    DBG("Fragment '%s' of URL '%s' did not contain a fragment directive.",
        aFragment.Data(), ToString(aURI).Data());
  }
  return hasRemovedFragmentDirective;
}

void FragmentDirective::ParseAndRemoveFragmentDirectiveFromFragment(
    nsCOMPtr<nsIURI>& aURI, nsTArray<TextDirective>* aTextDirectives) {
  if (!aURI || !StaticPrefs::dom_text_fragments_enabled()) {
    return;
  }
  bool hasRef = false;
  aURI->GetHasRef(&hasRef);

  nsAutoCString hash;
  aURI->GetRef(hash);
  if (!hasRef || hash.IsEmpty()) {
    DBG("URL '%s' has no fragment. Exiting.", ToString(aURI).Data());
  }

  const bool hasRemovedFragmentDirective =
      ParseAndRemoveFragmentDirectiveFromFragmentString(hash, aTextDirectives,
                                                        aURI);
  if (!hasRemovedFragmentDirective) {
    return;
  }
  Unused << NS_MutateURI(aURI).SetRef(hash).Finalize(aURI);
  DBG("Updated hash of the URL. New URL: %s", ToString(aURI).Data());
}

nsTArray<RefPtr<nsRange>> FragmentDirective::FindTextFragmentsInDocument() {
  MOZ_ASSERT(mDocument);
  if (mUninvokedTextDirectives.IsEmpty()) {
    DBG("No uninvoked text directives in document '%s'. Exiting.",
        ToString(mDocument->GetDocumentURI()).Data());
    return {};
  }
  DBG("Trying to find text directives in document '%s'.",
      ToString(mDocument->GetDocumentURI()).Data());
  mDocument->FlushPendingNotifications(FlushType::Frames);
  // https://wicg.github.io/scroll-to-text-fragment/#invoke-text-directives
  // To invoke text directives, given as input a list of text directives text
  // directives and a Document document, run these steps:
  // 1. Let ranges be a list of ranges, initially empty.
  nsTArray<RefPtr<nsRange>> textDirectiveRanges(
      mUninvokedTextDirectives.Length());

  // Additionally (not mentioned in the spec), remove all text directives from
  // the input list to keep only the ones that are not found.
  // This code runs repeatedly during a page load, so it is possible that the
  // match for a text directive has not been parsed yet.
  nsTArray<TextDirective> uninvokedTextDirectives(
      mUninvokedTextDirectives.Length());

  // 2. For each text directive directive of text directives:
  for (TextDirective& textDirective : mUninvokedTextDirectives) {
    // 2.1 If the result of running find a range from a text directive given
    //     directive and document is non-null, then append it to ranges.
    if (RefPtr<nsRange> range = FindRangeForTextDirective(textDirective)) {
      textDirectiveRanges.AppendElement(range);
      DBG("Found text directive '%s'", ToString(textDirective).Data());
    } else {
      uninvokedTextDirectives.AppendElement(std::move(textDirective));
    }
  }
  if (ShouldLog()) {
    if (uninvokedTextDirectives.Length() == mUninvokedTextDirectives.Length()) {
      DBG("Did not find any of the %zu uninvoked text directives.",
          mUninvokedTextDirectives.Length());
    } else {
      DBG("Found %zu of %zu text directives in the document.",
          mUninvokedTextDirectives.Length() - uninvokedTextDirectives.Length(),
          mUninvokedTextDirectives.Length());
    }
    if (uninvokedTextDirectives.IsEmpty()) {
      DBG("No uninvoked text directives left.");
    } else {
      DBG("There are %zu uninvoked text directives left:",
          uninvokedTextDirectives.Length());
      for (size_t index = 0; index < uninvokedTextDirectives.Length();
           ++index) {
        DBG(" [%zu]: %s", index,
            ToString(uninvokedTextDirectives[index]).Data());
      }
    }
  }
  mUninvokedTextDirectives = std::move(uninvokedTextDirectives);

  // 3. Return ranges.
  return textDirectiveRanges;
}

bool FragmentDirective::IsTextDirectiveAllowedToBeScrolledTo() {
  // This method follows
  // https://wicg.github.io/scroll-to-text-fragment/#check-if-a-text-directive-can-be-scrolled
  // However, there are some spec issues
  // (https://github.com/WICG/scroll-to-text-fragment/issues/240).
  // The web-platform tests currently seem more up-to-date. Therefore,
  // this method is adapted slightly to make sure all tests pass.
  // Comments are added to explain changes.

  MOZ_ASSERT(mDocument);
  DBG("Trying to find out if the load of URL '%s' is allowed to scroll to the "
      "text fragment",
      ToString(mDocument->GetDocumentURI()).Data());
  // It seems the spec does not cover same-document navigation in particular,
  // or Gecko needs to deal with this in a different way due to the
  // implementation not following the spec step-by-step.
  // Therefore, the following algorithm needs some adaptions to deal with
  // same-document navigations correctly.

  nsCOMPtr<nsILoadInfo> loadInfo =
      mDocument->GetChannel() ? mDocument->GetChannel()->LoadInfo() : nullptr;
  const bool isSameDocumentNavigation =
      loadInfo && loadInfo->GetIsSameDocumentNavigation();

  DBG("Current load is%s a same-document navigation.",
      isSameDocumentNavigation ? "" : " not");

  // 1. If document's pending text directives field is null or empty, return
  // false.
  // ---
  // we don't store the *pending* text directives in this class, only the
  // *uninvoked* text directives (uninvoked = `TextDirective`, pending =
  // `nsRange`).
  // Uninvoked text directives are typically already processed into pending text
  // directives when this code is called. Pending text directives are handled by
  // the caller when this code runs; therefore, the caller should decide if this
  // method should be called or not.

  // 2. Let is user involved be true if: document's text directive user
  // activation is true, or user involvement is one of "activation" or "browser
  // UI"; false otherwise.
  // 3. Set document's text directive user activation to false.
  const bool textDirectiveUserActivation =
      mDocument->ConsumeTextDirectiveUserActivation();
  DBG("Consumed Document's TextDirectiveUserActivation flag (value=%s)",
      textDirectiveUserActivation ? "true" : "false");

  // 4. If document's content type is not a text directive allowing MIME type,
  // return false.
  const bool isAllowedMIMEType = [doc = this->mDocument, func = __FUNCTION__] {
    nsAutoString contentType;
    doc->GetContentType(contentType);
    DBG_FN("Got document MIME type: %s", func,
           NS_ConvertUTF16toUTF8(contentType).Data());
    return contentType == u"text/html" || contentType == u"text/plain";
  }();

  if (!isAllowedMIMEType) {
    DBG("Invalid document MIME type. Scrolling not allowed.");
    return false;
  }

  // 5. If user involvement is "browser UI", return true.
  //
  // If a navigation originates from browser UI, it's always ok to allow it
  // since it'll be user triggered and the page/script isn't providing the text
  // snippet.
  //
  // Note: The intent in this item is to distinguish cases where the app/page is
  // able to control the URL from those that are fully under the user's
  // control. In the former we want to prevent scrolling of the text fragment
  // unless the destination is loaded in a separate browsing context group (so
  // that the source cannot both control the text snippet and observe
  // side-effects in the navigation). There are some cases where "browser UI"
  // may be a grey area in this regard. E.g. an "open in new window" context
  // menu item when right clicking on a link.
  //
  // See sec-fetch-site [0] for a related discussion on how this applies.
  // [0] https://w3c.github.io/webappsec-fetch-metadata/#directly-user-initiated
  // ---
  // Gecko does not implement user involvement as defined in the spec.
  // However, if the triggering principal is the system principal, the load
  // has been triggered from browser chrome. This should be good enough for now.
  auto* triggeringPrincipal =
      loadInfo ? loadInfo->TriggeringPrincipal() : nullptr;
  const bool isTriggeredFromBrowserUI =
      triggeringPrincipal && triggeringPrincipal->IsSystemPrincipal();

  if (isTriggeredFromBrowserUI) {
    DBG("The load is triggered from browser UI. Scrolling allowed.");
    return true;
  }
  DBG("The load is not triggered from browser UI.");
  // 6. If is user involved is false, return false.
  // ---
  // same-document navigation is not mentioned in the spec. However, we run this
  // code also in same-document navigation cases.
  // Same-document navigation is allowed even without any user interaction.
  if (!textDirectiveUserActivation && !isSameDocumentNavigation) {
    DBG("User involvement is false and not same-document navigation. Scrolling "
        "not allowed.");
    return false;
  }
  // 7. If document's node navigable has a parent, return false.
  // ---
  // this is extended to ignore this rule if this is a same-document navigation
  // in an iframe, which is allowed when the document's origin matches the
  // initiator's origin (which is checked in step 8).
  nsDocShell* docShell = nsDocShell::Cast(mDocument->GetDocShell());
  if (!isSameDocumentNavigation &&
      (!docShell || !docShell->GetIsTopLevelContentDocShell())) {
    DBG("Document's node navigable has a parent and this is not a "
        "same-document navigation. Scrolling not allowed.");
    return false;
  }
  // 8. If initiator origin is non-null and document's origin is same origin
  // with initiator origin, return true.
  const bool isSameOrigin = [doc = this->mDocument, triggeringPrincipal] {
    auto* docPrincipal = doc->GetPrincipal();
    return triggeringPrincipal && docPrincipal &&
           docPrincipal->Equals(triggeringPrincipal);
  }();

  if (isSameOrigin) {
    DBG("Same origin. Scrolling allowed.");
    return true;
  }
  DBG("Not same origin.");

  // 9. If document's browsing context's group's browsing context set has length
  // 1, return true.
  //
  // i.e. Only allow navigation from a cross-origin element/script if the
  // document is loaded in a noopener context. That is, a new top level browsing
  // context group to which the navigator does not have script access and which
  // can be placed into a separate process.
  if (BrowsingContextGroup* group =
          mDocument->GetBrowsingContext()
              ? mDocument->GetBrowsingContext()->Group()
              : nullptr) {
    const bool isNoOpenerContext = group->Toplevels().Length() == 1;
    if (!isNoOpenerContext) {
      DBG("Cross-origin + noopener=false. Scrolling not allowed.");
    }
    return isNoOpenerContext;
  }

  // 10.Otherwise, return false.
  DBG("Scrolling not allowed.");
  return false;
}

void FragmentDirective::HighlightTextDirectives(
    const nsTArray<RefPtr<nsRange>>& aTextDirectiveRanges) {
  MOZ_ASSERT(mDocument);
  if (!StaticPrefs::dom_text_fragments_enabled()) {
    return;
  }
  if (aTextDirectiveRanges.IsEmpty()) {
    DBG("No text directive ranges to highlight for document '%s'. Exiting.",
        ToString(mDocument->GetDocumentURI()).Data());
    return;
  }

  DBG("Highlighting text directives for document '%s' (%zu ranges).",
      ToString(mDocument->GetDocumentURI()).Data(),
      aTextDirectiveRanges.Length());

  const RefPtr<Selection> targetTextSelection =
      [doc = this->mDocument]() -> Selection* {
    if (auto* presShell = doc->GetPresShell()) {
      return presShell->GetCurrentSelection(SelectionType::eTargetText);
    }
    return nullptr;
  }();
  if (!targetTextSelection) {
    return;
  }
  for (const RefPtr<nsRange>& range : aTextDirectiveRanges) {
    // Script won't be able to manipulate `aTextDirectiveRanges`,
    // therefore we can mark `range` as known live.
    targetTextSelection->AddRangeAndSelectFramesAndNotifyListeners(
        MOZ_KnownLive(*range), IgnoreErrors());
  }
}

/**
 * @brief Determine if `aNode` should be considered when traversing the DOM.
 *
 * A node is "search invisible" if it is an element in the HTML namespace and
 *  1. The computed value of its `display` property is `none`
 *  2. It serializes as void
 *  3. It is one of the following types:
 *    - HTMLIFrameElement
 *    - HTMLImageElement
 *    - HTMLMeterElement
 *    - HTMLObjectElement
 *    - HTMLProgressElement
 *    - HTMLStyleElement
 *    - HTMLScriptElement
 *    - HTMLVideoElement
 *    - HTMLAudioElement
 *  4. It is a `select` element whose `multiple` content attribute is absent
 *
 * see https://wicg.github.io/scroll-to-text-fragment/#search-invisible
 */
bool NodeIsSearchInvisible(nsINode& aNode) {
  if (!aNode.IsElement()) {
    return false;
  }
  // 2. If the node serializes as void.
  nsAtom* nodeNameAtom = aNode.NodeInfo()->NameAtom();
  if (FragmentOrElement::IsHTMLVoid(nodeNameAtom)) {
    return true;
  }
  // 3. Is any of the following types: HTMLIFrameElement, HTMLImageElement,
  // HTMLMeterElement, HTMLObjectElement, HTMLProgressElement, HTMLStyleElement,
  // HTMLScriptElement, HTMLVideoElement, HTMLAudioElement
  if (aNode.IsAnyOfHTMLElements(
          nsGkAtoms::iframe, nsGkAtoms::image, nsGkAtoms::meter,
          nsGkAtoms::object, nsGkAtoms::progress, nsGkAtoms::style,
          nsGkAtoms::script, nsGkAtoms::video, nsGkAtoms::audio)) {
    return true;
  }
  // 4. Is a select element whose multiple content attribute is absent.
  if (aNode.IsHTMLElement(nsGkAtoms::select)) {
    return aNode.GetAttributes()->GetNamedItem(u"multiple"_ns) == nullptr;
  }
  // This is tested last because it's the most expensive check.
  // 1. The computed value of its 'display' property is 'none'.
  const Element* nodeAsElement = Element::FromNode(aNode);
  const RefPtr<const ComputedStyle> computedStyle =
      nsComputedDOMStyle::GetComputedStyleNoFlush(nodeAsElement);
  return !computedStyle ||
         computedStyle->StyleDisplay()->mDisplay == StyleDisplay::None;
}

/**
 * @brief Returns true if `aNode` has block-level display.
 * A node has block-level display if it is an element and the computed value
 * of its display property is any of
 *  - block
 *  - table
 *  - flow-root
 *  - grid
 *  - flex
 *  - list-item
 *
 * See https://wicg.github.io/scroll-to-text-fragment/#has-block-level-display
 */
bool NodeHasBlockLevelDisplay(nsINode& aNode) {
  if (!aNode.IsElement()) {
    return false;
  }
  const Element* nodeAsElement = Element::FromNode(aNode);
  const RefPtr<const ComputedStyle> computedStyle =
      nsComputedDOMStyle::GetComputedStyleNoFlush(nodeAsElement);
  if (!computedStyle) {
    return false;
  }
  const StyleDisplay& styleDisplay = computedStyle->StyleDisplay()->mDisplay;
  return styleDisplay == StyleDisplay::Block ||
         styleDisplay == StyleDisplay::Table ||
         styleDisplay == StyleDisplay::FlowRoot ||
         styleDisplay == StyleDisplay::Grid ||
         styleDisplay == StyleDisplay::Flex || styleDisplay.IsListItem();
}

/**
 * @brief Get the Block Ancestor For `aNode`.
 *
 * see https://wicg.github.io/scroll-to-text-fragment/#nearest-block-ancestor
 */
nsINode* GetBlockAncestorForNode(nsINode* aNode) {
  // 1. Let curNode be node.
  RefPtr<nsINode> curNode = aNode;
  // 2. While curNode is non-null
  while (curNode) {
    // 2.1. If curNode is not a Text node and it has block-level display then
    // return curNode.
    if (!curNode->IsText() && NodeHasBlockLevelDisplay(*curNode)) {
      return curNode;
    }
    // 2.2. Otherwise, set curNode to curNode’s parent.
    curNode = curNode->GetParentNode();
  }
  // 3.Return node’s node document's document element.
  return aNode->GetOwnerDocument();
}

/**
 * @brief Returns true if `aNode` is part of a non-searchable subtree.
 *
 * A node is part of a non-searchable subtree if it is or has a shadow-including
 * ancestor that is search invisible.
 *
 * see https://wicg.github.io/scroll-to-text-fragment/#non-searchable-subtree
 */
bool NodeIsPartOfNonSearchableSubTree(nsINode& aNode) {
  nsINode* node = &aNode;
  do {
    if (NodeIsSearchInvisible(*node)) {
      return true;
    }
  } while ((node = node->GetParentOrShadowHostNode()));
  return false;
}

/**
 * @brief Return true if `aNode` is a visible Text node.
 *
 * A node is a visible text node if it is a Text node, the computed value of
 * its parent element's visibility property is visible, and it is being
 * rendered.
 *
 * see https://wicg.github.io/scroll-to-text-fragment/#visible-text-node
 */
bool NodeIsVisibleTextNode(const nsINode& aNode) {
  const Text* text = Text::FromNode(aNode);
  if (!text) {
    return false;
  }
  const nsIFrame* frame = text->GetPrimaryFrame();
  return frame && frame->StyleVisibility()->IsVisible();
}

enum class TextScanDirection { Left = -1, Right = 1 };

/**
 * @brief Tests if there is whitespace at the given position.
 *
 * This algorithm tests for whitespaces and `&nbsp;` at `aPos`.
 * It returns true if whitespace was found.
 *
 * This function assumes the reading direction is "right". If trying to check
 * for whitespace to the left, the caller must adjust the offset.
 *
 */
bool IsWhitespaceAtPosition(const Text* aText, uint32_t aPos) {
  if (!aText || aText->Length() == 0 || aPos >= aText->Length()) {
    return 0;
  }
  const nsTextFragment& frag = aText->TextFragment();
  const char NBSP_CHAR = char(0xA0);
  if (frag.Is2b()) {
    const char16_t* content = frag.Get2b();
    return IsSpaceCharacter(content[aPos]) ||
           content[aPos] == char16_t(NBSP_CHAR);
  }
  const char* content = frag.Get1b();
  return IsSpaceCharacter(content[aPos]) || content[aPos] == NBSP_CHAR;
}

/** Advances the start of `aRange` to the next non-whitespace position.
 * The function follows this section of the spec:
 * https://wicg.github.io/scroll-to-text-fragment/#next-non-whitespace-position
 */
void AdvanceStartToNextNonWhitespacePosition(nsRange& aRange) {
  // 1. While range is not collapsed:
  while (!aRange.Collapsed()) {
    // 1.1. Let node be range's start node.
    RefPtr<nsINode> node = aRange.GetStartContainer();
    MOZ_ASSERT(node);
    // 1.2. Let offset be range's start offset.
    const uint32_t offset = aRange.StartOffset();
    // 1.3. If node is part of a non-searchable subtree or if node is not a
    // visible text node or if offset is equal to node's length then:
    if (NodeIsPartOfNonSearchableSubTree(*node) ||
        !NodeIsVisibleTextNode(*node) || offset == node->Length()) {
      // 1.3.1. Set range's start node to the next node, in shadow-including
      // tree order.
      // 1.3.2. Set range's start offset to 0.
      if (NS_FAILED(aRange.SetStart(node->GetNextNode(), 0))) {
        return;
      }
      // 1.3.3. Continue.
      continue;
    }
    const Text* text = Text::FromNode(node);
    MOZ_ASSERT(text);
    // These steps are moved to `IsWhitespaceAtPosition()`.
    // 1.4. If the substring data of node at offset offset and count 6 is equal
    // to the string "&nbsp;" then:
    // 1.4.1. Add 6 to range’s start offset.
    // 1.5. Otherwise, if the substring data of node at offset offset and count
    // 5 is equal to the string "&nbsp" then:
    // 1.5.1. Add 5 to range’s start offset.
    // 1.6. Otherwise:
    // 1.6.1 Let cp be the code point at the offset index in node’s data.
    // 1.6.2 If cp does not have the White_Space property set, return.
    // 1.6.3 Add 1 to range’s start offset.
    if (!IsWhitespaceAtPosition(text, offset)) {
      return;
    }

    aRange.SetStart(node, offset + 1);
  }
}

/**
 * @brief Moves `aRangeBoundary` one word in `aDirection`.
 *
 * Word boundaries are determined using `intl::WordBreaker::FindWord()`.
 *
 *
 * @param aRangeBoundary[in] The range boundary that should be moved.
 *                           Must be set and valid.
 * @param aDirection[in]     The direction into which to move.
 * @return A new `RangeBoundary` which is moved to the next word.
 */
RangeBoundary MoveRangeBoundaryOneWord(const RangeBoundary& aRangeBoundary,
                                       TextScanDirection aDirection) {
  MOZ_ASSERT(aRangeBoundary.IsSetAndValid());
  RefPtr<nsINode> curNode = aRangeBoundary.Container();
  uint32_t offset = *aRangeBoundary.Offset(
      RangeBoundary::OffsetFilter::kValidOrInvalidOffsets);

  const int offsetIncrement = int(aDirection);
  // Get the text node of the start of the range and the offset.
  // This is the current position of the start of the range.
  nsAutoString textContent;
  if (NodeIsVisibleTextNode(*curNode)) {
    const Text* textNode = Text::FromNode(curNode);

    // Assuming that the current position might not be at a word boundary,
    // advance to the word boundary at word begin/end.
    if (!IsWhitespaceAtPosition(textNode, offset)) {
      textNode->GetData(textContent);
      const intl::WordRange wordRange =
          intl::WordBreaker::FindWord(textContent, offset);
      if (aDirection == TextScanDirection::Right &&
          offset != wordRange.mBegin) {
        offset = wordRange.mEnd;
      } else if (aDirection == TextScanDirection::Left &&
                 offset != wordRange.mEnd) {
        // The additional -1 is necessary to move to offset to *before* the
        // start of the word.
        offset = wordRange.mBegin - 1;
      }
    }
  }
  // Now, skip any whitespace, so that `offset` points to the word boundary of
  // the next word (which is the one this algorithm actually aims to move over).
  while (curNode) {
    if (!NodeIsVisibleTextNode(*curNode) || NodeIsSearchInvisible(*curNode) ||
        offset >= curNode->Length()) {
      curNode = aDirection == TextScanDirection::Left ? curNode->GetPrevNode()
                                                      : curNode->GetNextNode();
      if (!curNode) {
        break;
      }
      offset =
          aDirection == TextScanDirection::Left ? curNode->Length() - 1 : 0;
      continue;
    }
    const Text* textNode = Text::FromNode(curNode);
    if (IsWhitespaceAtPosition(textNode, offset)) {
      offset += offsetIncrement;
      continue;
    }

    // At this point, the caret has been moved to the next non-whitespace
    // position.
    // find word boundaries at the current position
    textNode->GetData(textContent);
    const intl::WordRange wordRange =
        intl::WordBreaker::FindWord(textContent, offset);
    offset = aDirection == TextScanDirection::Left ? wordRange.mBegin
                                                   : wordRange.mEnd;

    return {curNode, offset};
  }
  return {};
}

RefPtr<nsRange> FragmentDirective::FindRangeForTextDirective(
    const TextDirective& aTextDirective) {
  DBG("Find range for text directive '%s'.", ToString(aTextDirective).Data());
  // 1. Let searchRange be a range with start (document, 0) and end (document,
  // document’s length)
  ErrorResult rv;
  RefPtr<nsRange> searchRange =
      nsRange::Create(mDocument, 0, mDocument, mDocument->Length(), rv);
  if (rv.Failed()) {
    return nullptr;
  }
  // 2. While searchRange is not collapsed:
  while (!searchRange->Collapsed()) {
    // 2.1. Let potentialMatch be null.
    RefPtr<nsRange> potentialMatch;
    // 2.2. If parsedValues’s prefix is not null:
    if (!aTextDirective.prefix.IsEmpty()) {
      // 2.2.1. Let prefixMatch be the the result of running the find a string
      // in range steps with query parsedValues’s prefix, searchRange
      // searchRange, wordStartBounded true and wordEndBounded false.
      RefPtr<nsRange> prefixMatch =
          FindStringInRange(searchRange, aTextDirective.prefix, true, false);
      // 2.2.2. If prefixMatch is null, return null.
      if (!prefixMatch) {
        DBG("Did not find prefix '%s'. The text directive does not exist "
            "in the document.",
            NS_ConvertUTF16toUTF8(aTextDirective.prefix).Data());
        return nullptr;
      }
      DBG("Did find prefix '%s'.",
          NS_ConvertUTF16toUTF8(aTextDirective.prefix).Data());

      // 2.2.3. Set searchRange’s start to the first boundary point after
      // prefixMatch’s start
      const RangeBoundary boundaryPoint = MoveRangeBoundaryOneWord(
          {prefixMatch->GetStartContainer(), prefixMatch->StartOffset()},
          TextScanDirection::Right);
      if (!boundaryPoint.IsSetAndValid()) {
        return nullptr;
      }
      searchRange->SetStart(boundaryPoint.AsRaw(), rv);
      if (rv.Failed()) {
        return nullptr;
      }

      // 2.2.4. Let matchRange be a range whose start is prefixMatch’s end and
      // end is searchRange’s end.
      RefPtr<nsRange> matchRange = nsRange::Create(
          prefixMatch->GetEndContainer(), prefixMatch->EndOffset(),
          searchRange->GetEndContainer(), searchRange->EndOffset(), rv);
      if (rv.Failed()) {
        return nullptr;
      }
      // 2.2.5. Advance matchRange’s start to the next non-whitespace position.
      AdvanceStartToNextNonWhitespacePosition(*matchRange);
      // 2.2.6. If matchRange is collapsed return null.
      // (This can happen if prefixMatch’s end or its subsequent non-whitespace
      // position is at the end of the document.)
      if (matchRange->Collapsed()) {
        return nullptr;
      }
      // 2.2.7. Assert: matchRange’s start node is a Text node.
      // (matchRange’s start now points to the next non-whitespace text data
      // following a matched prefix.)
      MOZ_ASSERT(matchRange->GetStartContainer()->IsText());

      // 2.2.8. Let mustEndAtWordBoundary be true if parsedValues’s end is
      // non-null or parsedValues’s suffix is null, false otherwise.
      const bool mustEndAtWordBoundary =
          !aTextDirective.end.IsEmpty() || aTextDirective.suffix.IsEmpty();
      // 2.2.9. Set potentialMatch to the result of running the find a string in
      // range steps with query parsedValues’s start, searchRange matchRange,
      // wordStartBounded false, and wordEndBounded mustEndAtWordBoundary.
      potentialMatch = FindStringInRange(matchRange, aTextDirective.start,
                                         false, mustEndAtWordBoundary);
      // 2.2.10. If potentialMatch is null, return null.
      if (!potentialMatch) {
        DBG("Did not find start '%s'. The text directive does not exist "
            "in the document.",
            NS_ConvertUTF16toUTF8(aTextDirective.start).Data());
        return nullptr;
      }
      DBG("Did find start '%s'.",
          NS_ConvertUTF16toUTF8(aTextDirective.start).Data());
      // 2.2.11. If potentialMatch’s start is not matchRange’s start, then
      // continue.
      // (In this case, we found a prefix but it was followed by something other
      // than a matching text so we’ll continue searching for the next instance
      // of prefix.)
      if (potentialMatch->StartRef() != matchRange->StartRef()) {
        DBG("The prefix is not directly followed by the start element. "
            "Discarding this attempt.");
        continue;
      }
    }
    // 2.3. Otherwise:
    else {
      // 2.3.1. Let mustEndAtWordBoundary be true if parsedValues’s end is
      // non-null or parsedValues’s suffix is null, false otherwise.
      const bool mustEndAtWordBoundary =
          !aTextDirective.end.IsEmpty() || aTextDirective.suffix.IsEmpty();
      // 2.3.2. Set potentialMatch to the result of running the find a string in
      // range steps with query parsedValues’s start, searchRange searchRange,
      // wordStartBounded true, and wordEndBounded mustEndAtWordBoundary.
      potentialMatch = FindStringInRange(searchRange, aTextDirective.start,
                                         true, mustEndAtWordBoundary);
      // 2.3.3. If potentialMatch is null, return null.
      if (!potentialMatch) {
        DBG("Did not find start '%s'. The text directive does not exist "
            "in the document.",
            NS_ConvertUTF16toUTF8(aTextDirective.start).Data());
        return nullptr;
      }
      // 2.3.4. Set searchRange’s start to the first boundary point after
      // potentialMatch’s start
      RangeBoundary newRangeBoundary = MoveRangeBoundaryOneWord(
          {potentialMatch->GetStartContainer(), potentialMatch->StartOffset()},
          TextScanDirection::Right);
      if (!newRangeBoundary.IsSetAndValid()) {
        return nullptr;
      }
      searchRange->SetStart(newRangeBoundary.AsRaw(), rv);
      if (rv.Failed()) {
        return nullptr;
      }
    }
    // 2.4. Let rangeEndSearchRange be a range whose start is potentialMatch’s
    // end and whose end is searchRange’s end.
    RefPtr<nsRange> rangeEndSearchRange = nsRange::Create(
        potentialMatch->GetEndContainer(), potentialMatch->EndOffset(),
        searchRange->GetEndContainer(), searchRange->EndOffset(), rv);
    if (rv.Failed()) {
      return nullptr;
    }
    // 2.5. While rangeEndSearchRange is not collapsed:
    while (!rangeEndSearchRange->Collapsed()) {
      // 2.5.1. If parsedValues’s end item is non-null, then:
      if (!aTextDirective.end.IsEmpty()) {
        // 2.5.1.1. Let mustEndAtWordBoundary be true if parsedValues’s suffix
        // is null, false otherwise.
        const bool mustEndAtWordBoundary = aTextDirective.suffix.IsEmpty();
        // 2.5.1.2. Let endMatch be the result of running the find a string in
        // range steps with query parsedValues’s end, searchRange
        // rangeEndSearchRange, wordStartBounded true, and wordEndBounded
        // mustEndAtWordBoundary.
        RefPtr<nsRange> endMatch =
            FindStringInRange(rangeEndSearchRange, aTextDirective.end, true,
                              mustEndAtWordBoundary);
        // 2.5.1.3. If endMatch is null then return null.
        if (!endMatch) {
          DBG("Did not find end '%s'. The text directive does not exist "
              "in the document.",
              NS_ConvertUTF16toUTF8(aTextDirective.end).Data());
          return nullptr;
        }
        // 2.5.1.4. Set potentialMatch’s end to endMatch’s end.
        potentialMatch->SetEnd(endMatch->GetEndContainer(),
                               endMatch->EndOffset());
      }
      // 2.5.2. Assert: potentialMatch is non-null, not collapsed and represents
      // a range exactly containing an instance of matching text.
      MOZ_ASSERT(potentialMatch && !potentialMatch->Collapsed());

      // 2.5.3. If parsedValues’s suffix is null, return potentialMatch.
      if (aTextDirective.suffix.IsEmpty()) {
        DBG("Did find a match.");
        return potentialMatch;
      }
      // 2.5.4. Let suffixRange be a range with start equal to potentialMatch’s
      // end and end equal to searchRange’s end.
      RefPtr<nsRange> suffixRange = nsRange::Create(
          potentialMatch->GetEndContainer(), potentialMatch->EndOffset(),
          searchRange->GetEndContainer(), searchRange->EndOffset(), rv);
      if (rv.Failed()) {
        return nullptr;
      }
      // 2.5.5. Advance suffixRange's start to the next non-whitespace position.
      AdvanceStartToNextNonWhitespacePosition(*suffixRange);

      // 2.5.6. Let suffixMatch be result of running the find a string in range
      // steps with query parsedValue's suffix, searchRange suffixRange,
      // wordStartBounded false, and wordEndBounded true.
      RefPtr<nsRange> suffixMatch =
          FindStringInRange(suffixRange, aTextDirective.suffix, false, true);

      // 2.5.7. If suffixMatch is null, return null.
      // (If the suffix doesn't appear in the remaining text of the document,
      // there's no possible way to make a match.)
      if (!suffixMatch) {
        DBG("Did not find suffix '%s'. The text directive does not exist "
            "in the document.",
            NS_ConvertUTF16toUTF8(aTextDirective.suffix).Data());
        return nullptr;
      }
      // 2.5.8. If suffixMatch's start is suffixRange's start, return
      // potentialMatch.
      if (suffixMatch->GetStartContainer() ==
              suffixRange->GetStartContainer() &&
          suffixMatch->StartOffset() == suffixRange->StartOffset()) {
        DBG("Did find a match.");
        return potentialMatch;
      }
      // 2.5.9. If parsedValue's end item is null then break;
      // (If this is an exact match and the suffix doesn’t match, start
      // searching for the next range start by breaking out of this loop without
      // rangeEndSearchRange being collapsed. If we’re looking for a range
      // match, we’ll continue iterating this inner loop since the range start
      // will already be correct.)
      if (aTextDirective.end.IsEmpty()) {
        break;
      }
      // 2.5.10. Set rangeEndSearchRange's start to potentialMatch's end.
      // (Otherwise, it is possible that we found the correct range start, but
      // not the correct range end. Continue the inner loop to keep searching
      // for another matching instance of rangeEnd.)
      rangeEndSearchRange->SetStart(potentialMatch->GetEndContainer(),
                                    potentialMatch->EndOffset());
    }
    // 2.6. If rangeEndSearchRange is collapsed then:
    if (rangeEndSearchRange->Collapsed()) {
      // 2.6.1. Assert parsedValue's end item is non-null.
      // (This can only happen for range matches due to the break for exact
      // matches in step 9 of the above loop. If we couldn’t find a valid
      // rangeEnd+suffix pair anywhere in the doc then there’s no possible way
      // to make a match.)
      // ----
      // XXX(:jjaschke): Not too sure about this. If a text directive is only
      // defined by a (prefix +) start element, and the start element happens to
      // be at the end of the document, `rangeEndSearchRange` could be
      // collapsed. Therefore, the loop in section 2.5 does not run. Also,
      // if there would be either an `end` and/or a `suffix`, this would assert
      // instead of returning `nullptr`, indicating that there's no match.
      // Instead, the following would make the algorithm more safe:
      // if there is no end or suffix, the potential match is actually a match,
      // so return it. Otherwise, the text directive can't be in the document,
      // therefore return nullptr.
      if (aTextDirective.end.IsEmpty() && aTextDirective.suffix.IsEmpty()) {
        DBG("rangeEndSearchRange was collapsed, no end or suffix "
            "present. Returning a match");
        return potentialMatch;
      }
      DBG("rangeEndSearchRange was collapsed, there is an end or "
          "suffix. There can't be a match.");
      return nullptr;
    }
  }
  // 3. Return null.
  DBG("Did not find a match.");
  return nullptr;
}

/**
 * @brief Convenience function that returns true if the given position in a
 * string is a word boundary.
 *
 * This is a thin wrapper around the `WordBreaker::FindWord()` function.
 *
 * @param aText The text input.
 * @param aPosition The position to check.
 * @return true if there is a word boundary at `aPosition`.
 * @return false otherwise.
 */
bool IsAtWordBoundary(const nsAString& aText, uint32_t aPosition) {
  const intl::WordRange wordRange =
      intl::WordBreaker::FindWord(aText, aPosition);
  return wordRange.mBegin == aPosition || wordRange.mEnd == aPosition;
}

enum class IsEndIndex : bool { No, Yes };
RangeBoundary GetBoundaryPointAtIndex(
    uint32_t aIndex, const nsTArray<RefPtr<Text>>& aTextNodeList,
    IsEndIndex aIsEndIndex) {
  // 1. Let counted be 0.
  uint32_t counted = 0;
  // 2. For each curNode of nodes:
  for (Text* curNode : aTextNodeList) {
    // 2.1. Let nodeEnd be counted + curNode’s length.
    uint32_t nodeEnd = counted + curNode->Length();
    // 2.2. If isEnd is true, add 1 to nodeEnd.
    if (aIsEndIndex == IsEndIndex::Yes) {
      ++nodeEnd;
    }
    // 2.3. If nodeEnd is greater than index then:
    if (nodeEnd > aIndex) {
      // 2.3.1. Return the boundary point (curNode, index − counted).
      return RangeBoundary(curNode->AsNode(), aIndex - counted);
    }
    // 2.4. Increment counted by curNode’s length.
    counted += curNode->Length();
  }
  return {};
}

RefPtr<nsRange> FindRangeFromNodeList(
    nsRange* aSearchRange, const nsAString& aQuery,
    const nsTArray<RefPtr<Text>>& aTextNodeList, bool aWordStartBounded,
    bool aWordEndBounded) {
  // 1. Let searchBuffer be the concatenation of the data of each item in nodes.
  // XXX(:jjaschke): There's an open issue here that deals with what
  // data is supposed to be (text data vs. rendered text)
  // https://github.com/WICG/scroll-to-text-fragment/issues/98
  uint32_t bufferLength = 0;
  for (const Text* text : aTextNodeList) {
    bufferLength += text->Length();
  }
  // bail out if the search query is longer than the text data.
  if (bufferLength < aQuery.Length()) {
    return nullptr;
  }
  nsAutoString searchBuffer;
  searchBuffer.SetCapacity(bufferLength);
  for (Text* text : aTextNodeList) {
    text->AppendTextTo(searchBuffer);
  }
  // 2. Let searchStart be 0.
  // 3. If the first item in nodes is searchRange’s start node then set
  // searchStart to searchRange’s start offset.
  uint32_t searchStart =
      aTextNodeList.SafeElementAt(0) == aSearchRange->GetStartContainer()
          ? aSearchRange->StartOffset()
          : 0;

  // 4. Let start and end be boundary points, initially null.
  RangeBoundary start, end;
  // 5. Let matchIndex be null.
  // "null" here doesn't mean 0, instead "not set". 0 would be a valid index.
  // Therefore, "null" is represented by the value -1.
  int32_t matchIndex = -1;

  // 6. While matchIndex is null
  // As explained above, "null" == -1 in this algorithm.
  while (matchIndex == -1) {
    // 6.1. Set matchIndex to the index of the first instance of queryString in
    // searchBuffer, starting at searchStart. The string search must be
    // performed using a base character comparison, or the primary level, as
    // defined in [UTS10].
    // [UTS10]
    // Ken Whistler; Markus Scherer.Unicode Collation Algorithm.26 August 2022.
    // Unicode Technical Standard #10.
    // URL : https://www.unicode.org/reports/tr10/tr10-47.html

    // XXX(:jjaschke): For the initial implementation, a standard case-sensitive
    // find-in-string is used.
    // See: https://github.com/WICG/scroll-to-text-fragment/issues/233
    matchIndex = searchBuffer.Find(aQuery, searchStart);
    // 6.2. If matchIndex is null, return null.
    if (matchIndex == -1) {
      return nullptr;
    }

    // 6.3. Let endIx be matchIndex + queryString’s length.
    // endIx is the index of the last character in the match + 1.
    const uint32_t endIx = matchIndex + aQuery.Length();

    // 6.4. Set start to the boundary point result of get boundary point at
    // index matchIndex run over nodes with isEnd false.
    start = GetBoundaryPointAtIndex(matchIndex, aTextNodeList, IsEndIndex::No);
    // 6.5. Set end to the boundary point result of get boundary point at index
    // endIx run over nodes with isEnd true.
    end = GetBoundaryPointAtIndex(endIx, aTextNodeList, IsEndIndex::Yes);

    // 6.6. If wordStartBounded is true and matchIndex is not at a word boundary
    // in searchBuffer, given the language from start’s node as the locale; or
    // wordEndBounded is true and matchIndex + queryString’s length is not at a
    // word boundary in searchBuffer, given the language from end’s node as the
    // locale:
    if ((aWordStartBounded && !IsAtWordBoundary(searchBuffer, matchIndex)) ||
        (aWordEndBounded && !IsAtWordBoundary(searchBuffer, endIx))) {
      // 6.6.1. Set searchStart to matchIndex + 1.
      searchStart = matchIndex + 1;
      // 6.6.2. Set matchIndex to null.
      matchIndex = -1;
    }
  }
  // 7. Let endInset be 0.
  // 8. If the last item in nodes is searchRange’s end node then set endInset
  // to (searchRange’s end node's length − searchRange’s end offset)
  // (endInset is the offset from the last position in the last node in the
  // reverse direction. Alternatively, it is the length of the node that’s not
  // included in the range.)
  uint32_t endInset =
      aTextNodeList.LastElement() == aSearchRange->GetEndContainer()
          ? aSearchRange->GetEndContainer()->Length() -
                aSearchRange->EndOffset()
          : 0;

  // 9. If matchIndex + queryString’s length is greater than searchBuffer’s
  // length − endInset return null.
  // (If the match runs past the end of the search range, return null.)
  if (matchIndex + aQuery.Length() > searchBuffer.Length() - endInset) {
    return nullptr;
  }

  // 10. Assert: start and end are non-null, valid boundary points in
  // searchRange.
  MOZ_ASSERT(start.IsSetAndValid());
  MOZ_ASSERT(end.IsSetAndValid());

  // 11. Return a range with start start and end end.
  ErrorResult rv;
  RefPtr<nsRange> range = nsRange::Create(start, end, rv);
  if (rv.Failed()) {
    return nullptr;
  }

  return range;
}

RefPtr<nsRange> FragmentDirective::FindStringInRange(nsRange* aSearchRange,
                                                     const nsAString& aQuery,
                                                     bool aWordStartBounded,
                                                     bool aWordEndBounded) {
  MOZ_ASSERT(aSearchRange);
  DBG("query='%s', wordStartBounded='%d', wordEndBounded='%d'.\n",
      NS_ConvertUTF16toUTF8(aQuery).Data(), aWordStartBounded, aWordEndBounded);
  RefPtr<nsFind> finder = new nsFind();
  finder->SetWordStartBounded(aWordStartBounded);
  finder->SetWordEndBounded(aWordEndBounded);
  finder->SetCaseSensitive(false);
  RefPtr<nsRange> searchRangeStart = nsRange::Create(
      aSearchRange->StartRef(), aSearchRange->StartRef(), IgnoreErrors());
  RefPtr<nsRange> searchRangeEnd = nsRange::Create(
      aSearchRange->EndRef(), aSearchRange->EndRef(), IgnoreErrors());
  RefPtr<nsRange> result;
  Unused << finder->Find(aQuery, aSearchRange, searchRangeStart, searchRangeEnd,
                         getter_AddRefs(result));
  if (!result || result->Collapsed()) {
    DBG("Did not find query '%s'", NS_ConvertUTF16toUTF8(aQuery).Data());
  } else {
    auto rangeToString = [](nsRange* range) -> nsCString {
      nsString rangeString;
      range->ToString(rangeString, IgnoreErrors());
      return NS_ConvertUTF16toUTF8(rangeString);
    };
    DBG("find returned '%s'", rangeToString(result).Data());
  }
  return result;
}
}  // namespace mozilla::dom
