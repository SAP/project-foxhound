/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef EditorLineBreak_h
#define EditorLineBreak_h

#include "EditorDOMPoint.h"
#include "EditorForwards.h"
#include "EditorUtils.h"

#include "mozilla/Maybe.h"
#include "mozilla/ToString.h"
#include "mozilla/dom/CharacterDataBuffer.h"
#include "mozilla/dom/Element.h"
#include "mozilla/dom/HTMLBRElement.h"
#include "mozilla/dom/Text.h"

#include "nsCOMPtr.h"
#include "nsDebug.h"
#include "nsGkAtoms.h"
#include "nsIContent.h"

namespace mozilla {

class AutoTrackLineBreak;

enum class PaddingForEmptyBlock {
  // If the line break is padding for empty block, treat it as not
  // significant. This is useful to select unecessary things at deletion.
  Unnecessary,
  // Treat the padding for empty block as significant since it makes the block
  // have one-line height.
  Significant,
};

inline std::string format_as(const PaddingForEmptyBlock& aValue) {
  return aValue == PaddingForEmptyBlock::Significant
             ? "PaddingForEmptyBlock::Significant"
             : "PaddingForEmptyBlock::Unnecessary";
}

inline std::ostream& operator<<(std::ostream& aStream,
                                const PaddingForEmptyBlock& aValue) {
  return aStream << format_as(aValue);
}

/******************************************************************************
 * EditorLineBreakBase stores <br> or a preformatted line break position.
 * This cannot represent no line break.  Therefore, if a method may not return
 * a line break, they need to use Maybe.
 ******************************************************************************/
template <typename ContentType>
class EditorLineBreakBase {
  using SelfType = EditorLineBreakBase<ContentType>;

 public:
  using CharacterDataBuffer = dom::CharacterDataBuffer;
  using HTMLBRElement = dom::HTMLBRElement;
  using Text = dom::Text;

  explicit EditorLineBreakBase(const HTMLBRElement& aBRElement)
      : mContent(const_cast<HTMLBRElement*>(&aBRElement)) {}
  explicit EditorLineBreakBase(RefPtr<HTMLBRElement>&& aBRElement);
  explicit EditorLineBreakBase(RefPtr<dom::Element>&& aBRElement);
  explicit EditorLineBreakBase(nsCOMPtr<nsIContent>&& aBRElement);
  EditorLineBreakBase(const Text& aText, uint32_t aOffset)
      : mContent(const_cast<Text*>(&aText)), mOffsetInText(Some(aOffset)) {}
  EditorLineBreakBase(RefPtr<Text>&& aText, uint32_t aOffset);
  EditorLineBreakBase(nsCOMPtr<nsIContent>&& aText, uint32_t aOffset);

  template <typename EditorDOMPointType>
  [[nodiscard]] static Maybe<EditorLineBreakBase> MaybeFrom(
      const EditorDOMPointType& aPoint) {
    if (HTMLBRElement* const childAsBRElement =
            HTMLBRElement::FromNodeOrNull(aPoint.GetChild())) {
      return Some(EditorLineBreakBase(*childAsBRElement));
    }
    if (Text* const containerAsText =
            Text::FromNodeOrNull(aPoint.GetContainer())) {
      if (EditorUtils::IsNewLinePreformatted(*containerAsText) &&
          aPoint.Offset() < containerAsText->TextDataLength() &&
          aPoint.IsCharNewLine()) {
        return Some(EditorLineBreakBase(*containerAsText, aPoint.Offset()));
      }
    }
    return Nothing{};
  }

  /**
   * Return a preformatted line break if and only if aText contains only one
   * preformatted line break and there is no visible text around it. E.g.,
   * the preformatted line break may be surrounded by collapsible
   * white-spaces.
   */
  [[nodiscard]] static Maybe<EditorLineBreakBase>
  CreateIfTextHasOnlyOneAndNoOtherVisibleCharacters(const Text& aText) {
    if (!aText.TextDataLength() || !EditorUtils::IsNewLinePreformatted(aText)) {
      return Nothing();
    }
    if (aText.TextDataLength() == 1) {
      return aText.DataBuffer().CharAt(0) == '\n'
                 ? Some(EditorLineBreakBase(aText, 0u))
                 : Nothing();
    }
    if (EditorUtils::IsWhiteSpacePreformatted(aText) &&
        aText.TextDataLength() > 1) {
      return Nothing();  // Contains at least 2 visible characters.
    }
    using WhitespaceOption = CharacterDataBuffer::WhitespaceOption;
    const CharacterDataBuffer::WhitespaceOptions whitespaceOptions{
        WhitespaceOption::FormFeedIsSignificant,
        WhitespaceOption::NewLineIsSignificant};
    const uint32_t firstVisibleCharOffset =
        aText.DataBuffer().FindNonWhitespaceChar(whitespaceOptions, 0u);
    if (firstVisibleCharOffset == CharacterDataBuffer::kNotFound) {
      return Nothing();  // No visible characters.
    }
    if (aText.DataBuffer().CharAt(firstVisibleCharOffset) != '\n') {
      return Nothing();  // The first visible character is not a linefeed.
    }
    if (firstVisibleCharOffset + 1 == aText.TextDataLength()) {
      // The first visible character is a preformatted linefeed following some
      // collapsible white-spaces and it's the last character.
      return Some(EditorLineBreakBase(aText, firstVisibleCharOffset));
    }
    const uint32_t secondVisibleCharOffset =
        aText.DataBuffer().FindNonWhitespaceChar(whitespaceOptions,
                                                 firstVisibleCharOffset + 1);
    if (secondVisibleCharOffset != CharacterDataBuffer::kNotFound) {
      // There is another visible character after the preformatted linefeed.
      return Nothing();
    }
    // aText contains only one preformatted linefeed and it's surrounded by
    // collapsible white-spaces.
    return Some(EditorLineBreakBase(aText, firstVisibleCharOffset));
  }

  [[nodiscard]] static SelfType AtLastChar(const Text& aText) {
    MOZ_RELEASE_ASSERT(aText.TextDataLength());
    return SelfType(aText, aText.TextDataLength() - 1u);
  }
  [[nodiscard]] static SelfType AtLastChar(RefPtr<Text>&& aText) {
    MOZ_RELEASE_ASSERT(aText);
    MOZ_RELEASE_ASSERT(aText->TextDataLength());
    const uint32_t lastCharIndex = aText->TextDataLength() - 1u;
    return SelfType(std::forward<RefPtr<Text>>(aText), lastCharIndex);
  }
  [[nodiscard]] static SelfType AtLastChar(nsCOMPtr<nsIContent>&& aText) {
    MOZ_RELEASE_ASSERT(aText);
    MOZ_RELEASE_ASSERT(aText->IsText());
    MOZ_RELEASE_ASSERT(aText->AsText()->TextDataLength());
    const uint32_t lastCharIndex = aText->AsText()->TextDataLength() - 1u;
    return SelfType(std::forward<nsCOMPtr<nsIContent>>(aText), lastCharIndex);
  }

  [[nodiscard]] bool IsInComposedDoc() const {
    return mContent->IsInComposedDoc();
  }

  template <typename EditorDOMPointType>
  [[nodiscard]] EditorDOMPointType To() const {
    if constexpr (std::is_same_v<EditorDOMPointType, EditorDOMPoint> ||
                  std::is_same_v<EditorDOMPointType, EditorRawDOMPoint>) {
      return mOffsetInText ? EditorDOMPointType(mContent, *mOffsetInText)
                           : EditorDOMPointType(mContent);
    } else if constexpr (std::is_same_v<EditorDOMPointType,
                                        EditorDOMPointInText> ||
                         std::is_same_v<EditorDOMPointType,
                                        EditorRawDOMPointInText>) {
      MOZ_ASSERT(IsPreformattedLineBreak());
      return IsPreformattedLineBreak()
                 ? EditorDOMPointType(&TextRef(), *mOffsetInText)
                 : EditorDOMPointType();
    } else {
      MOZ_MAKE_COMPILER_ASSUME_IS_UNREACHABLE(
          "Handle the new EditorDOMPointType!");
      return EditorDOMPointType();
    }
  }
  template <typename EditorDOMPointType>
  [[nodiscard]] EditorDOMPointType After() const {
    if (IsHTMLBRElement()) {
      return EditorDOMPointType::After(BRElementRef());
    }
    if (mOffsetInText.value() + 1 < TextRef().TextDataLength()) {
      return EditorDOMPointType(&TextRef(), mOffsetInText.value() + 1);
    }
    // If the line break is end of a Text node and it's followed by another
    // Text, we should return start of the following Text.
    if (Text* const followingText =
            Text::FromNodeOrNull(TextRef().GetNextSibling())) {
      return EditorDOMPointType(followingText, 0);
    }
    return EditorDOMPointType::After(TextRef());
  }

  template <typename EditorDOMPointType>
  [[nodiscard]] EditorDOMPointType Before() const {
    if (IsHTMLBRElement()) {
      return EditorDOMPointType(&BRElementRef(),
                                dom::Selection::InterlinePosition::EndOfLine);
    }
    return To<EditorDOMPointType>();
  }

  [[nodiscard]] bool IsHTMLBRElement() const {
    MOZ_ASSERT_IF(!mOffsetInText, mContent->IsHTMLElement(nsGkAtoms::br));
    return mOffsetInText.isNothing();
  }
  [[nodiscard]] bool IsPreformattedLineBreak() const {
    MOZ_ASSERT_IF(mOffsetInText, mContent->IsText());
    return mOffsetInText.isSome();
  }
  [[nodiscard]] bool TextIsOnlyPreformattedLineBreak() const {
    return IsPreformattedLineBreak() && !Offset() &&
           TextRef().TextDataLength() == 1u;
  }
  [[nodiscard]] bool IsPreformattedLineBreakAtStartOfText() const {
    MOZ_ASSERT_IF(mOffsetInText, mContent->IsText());
    return mOffsetInText.isSome() && !mOffsetInText.value();
  }

  [[nodiscard]] nsIContent& ContentRef() const { return *mContent; }

  [[nodiscard]] bool IsInclusiveDescendantOf(const nsINode& aNode) const {
    return mContent->IsInclusiveDescendantOf(&aNode);
  }

  [[nodiscard]] HTMLBRElement& BRElementRef() const {
    MOZ_DIAGNOSTIC_ASSERT(IsHTMLBRElement());
    MOZ_DIAGNOSTIC_ASSERT(GetBRElement());
    return *GetBRElement();
  }
  [[nodiscard]] HTMLBRElement* GetBRElement() const {
    return HTMLBRElement::FromNode(mContent);
  }
  [[nodiscard]] Text& TextRef() const {
    MOZ_DIAGNOSTIC_ASSERT(IsPreformattedLineBreak());
    MOZ_DIAGNOSTIC_ASSERT(GetText());
    return *GetText();
  }
  [[nodiscard]] Text* GetText() const { return Text::FromNode(mContent); }
  [[nodiscard]] uint32_t Offset() const {
    MOZ_ASSERT(IsPreformattedLineBreak());
    return mOffsetInText.value();
  }
  [[nodiscard]] bool CharAtOffsetIsLineBreak() const {
    MOZ_DIAGNOSTIC_ASSERT(IsPreformattedLineBreak());
    return *mOffsetInText < TextRef().TextDataLength() &&
           TextRef().DataBuffer().CharAt(*mOffsetInText) == '\n';
  }

  [[nodiscard]] bool IsDeletableFromComposedDoc() const {
    if (IsPreformattedLineBreak()) {
      return TextRef().IsEditable();
    }
    const nsIContent* const parent = BRElementRef().GetParent();
    return parent && parent->IsEditable();
  }

  [[nodiscard]] bool IsFollowedByBlockBoundary(
      const dom::Element* aAncestorLimiter = nullptr) const;
  [[nodiscard]] bool IsFollowedByCurrentBlockBoundary(
      const dom::Element* aAncestorLimiter = nullptr) const;
  [[nodiscard]] bool IsFollowingCurrentBlockBoundary(
      const dom::Element* aAncestorLimiter = nullptr) const;
  [[nodiscard]] bool IsFollowedByLineBoundary(
      const dom::Element* aAncestorLimiter = nullptr) const;
  [[nodiscard]] bool IsFollowingLineBoundary(
      const dom::Element* aAncestorLimiter = nullptr) const;
  [[nodiscard]] bool IsFollowingAnotherLineBreak(
      const dom::Element* aAncestorLimiter = nullptr) const;
  [[nodiscard]] bool IsPaddingForEmptyBlock(
      const dom::Element* aAncestorLimiter = nullptr) const;
  [[nodiscard]] bool IsUnnecessary(
      PaddingForEmptyBlock aPaddingForEmptyBlock,
      const dom::Element* aAncestorLimiter = nullptr) const;
  [[nodiscard]] bool IsSignificant(
      PaddingForEmptyBlock aPaddingForEmptyBlock,
      const dom::Element* aAncestorLimiter = nullptr) const;

  [[nodiscard]] dom::Element* GetBlockElementIfFollowedByBlockBoundary(
      const dom::Element* aAncestorLimiter = nullptr) const;
  [[nodiscard]] dom::Element* GetBlockElementIfFollowedByCurrentBlockBoundary(
      const dom::Element* aAncestorLimiter = nullptr) const;
  [[nodiscard]] dom::Element* GetBlockElementIfFollowedByOtherBlockBoundary(
      const dom::Element* aAncestorLimiter = nullptr) const;

  friend inline std::ostream& operator<<(
      std::ostream& aStream, const EditorLineBreakBase& aLineBreak) {
    return aStream << fmt::format("{{ mContent={}, mOffsetInText={} }}",
                                  nsCOMPtr<nsIContent>(aLineBreak.mContent),
                                  // XXX Oddly, cannot make Maybe<uint32>
                                  // formattable. Maybe a bug of {fmt}.
                                  ToString(aLineBreak.mOffsetInText));
  }

 private:
  ContentType mContent;
  Maybe<uint32_t> mOffsetInText;

  friend class AutoTrackLineBreak;
};

using EditorLineBreak = EditorLineBreakBase<nsCOMPtr<nsIContent>>;
using EditorRawLineBreak = EditorLineBreakBase<nsIContent*>;

#define NS_INSTANTIATE_EDITOR_LINE_BREAK_CONST_METHOD(aResultType,      \
                                                      aMethodName, ...) \
  template aResultType EditorLineBreak::aMethodName(__VA_ARGS__) const; \
  template aResultType EditorRawLineBreak::aMethodName(__VA_ARGS__) const;

template <>
inline EditorLineBreakBase<nsCOMPtr<nsIContent>>::EditorLineBreakBase(
    RefPtr<HTMLBRElement>&& aBRElement)
    : mContent(aBRElement.forget()) {
  MOZ_RELEASE_ASSERT(mContent);
}

template <>
inline EditorLineBreakBase<nsCOMPtr<nsIContent>>::EditorLineBreakBase(
    RefPtr<dom::Element>&& aBRElement)
    : mContent(aBRElement.forget()) {
  MOZ_RELEASE_ASSERT(mContent);
  MOZ_RELEASE_ASSERT(mContent->IsHTMLElement(nsGkAtoms::br));
}

template <>
inline EditorLineBreakBase<nsCOMPtr<nsIContent>>::EditorLineBreakBase(
    nsCOMPtr<nsIContent>&& aBRElement)
    : mContent(aBRElement.forget()) {
  MOZ_RELEASE_ASSERT(mContent);
  MOZ_RELEASE_ASSERT(mContent->IsHTMLElement(nsGkAtoms::br));
}

template <>
inline EditorLineBreakBase<nsCOMPtr<nsIContent>>::EditorLineBreakBase(
    RefPtr<Text>&& aText, uint32_t aOffset)
    : mContent(std::move(aText)), mOffsetInText(Some(aOffset)) {
  MOZ_RELEASE_ASSERT(mContent);
  MOZ_ASSERT(EditorUtils::IsNewLinePreformatted(*mContent));
  MOZ_RELEASE_ASSERT(GetText()->TextDataLength() > aOffset);
  MOZ_RELEASE_ASSERT(CharAtOffsetIsLineBreak());
}

template <>
inline EditorLineBreakBase<nsCOMPtr<nsIContent>>::EditorLineBreakBase(
    nsCOMPtr<nsIContent>&& aText, uint32_t aOffset)
    : mContent(aText.forget()), mOffsetInText(Some(aOffset)) {
  MOZ_RELEASE_ASSERT(mContent);
  MOZ_RELEASE_ASSERT(mContent->IsText());
  MOZ_ASSERT(EditorUtils::IsNewLinePreformatted(*mContent));
  MOZ_RELEASE_ASSERT(TextRef().TextDataLength() > aOffset);
  MOZ_ASSERT(CharAtOffsetIsLineBreak());
}

template <>
inline EditorLineBreakBase<nsIContent*>::EditorLineBreakBase(
    const HTMLBRElement& aBRElement)
    : mContent(const_cast<HTMLBRElement*>(&aBRElement)) {}

template <>
inline EditorLineBreakBase<nsIContent*>::EditorLineBreakBase(
    RefPtr<HTMLBRElement>&& aBRElement)
    : mContent(aBRElement) {
  MOZ_RELEASE_ASSERT(mContent);
  aBRElement = nullptr;
}

template <>
inline EditorLineBreakBase<nsIContent*>::EditorLineBreakBase(
    RefPtr<dom::Element>&& aBRElement)
    : mContent(aBRElement) {
  MOZ_RELEASE_ASSERT(mContent);
  MOZ_RELEASE_ASSERT(mContent->IsHTMLElement(nsGkAtoms::br));
  aBRElement = nullptr;
}

template <>
inline EditorLineBreakBase<nsIContent*>::EditorLineBreakBase(
    nsCOMPtr<nsIContent>&& aBRElement)
    : mContent(aBRElement) {
  MOZ_RELEASE_ASSERT(mContent);
  MOZ_RELEASE_ASSERT(mContent->IsHTMLElement(nsGkAtoms::br));
  aBRElement = nullptr;
}

template <>
inline EditorLineBreakBase<nsIContent*>::EditorLineBreakBase(
    RefPtr<Text>&& aText, uint32_t aOffset)
    : mContent(aText), mOffsetInText(Some(aOffset)) {
  MOZ_RELEASE_ASSERT(mContent);
  MOZ_ASSERT(EditorUtils::IsNewLinePreformatted(*mContent));
  MOZ_RELEASE_ASSERT(GetText()->TextDataLength() > aOffset);
  MOZ_RELEASE_ASSERT(CharAtOffsetIsLineBreak());
  aText = nullptr;
}

template <>
inline EditorLineBreakBase<nsIContent*>::EditorLineBreakBase(
    nsCOMPtr<nsIContent>&& aText, uint32_t aOffset)
    : mContent(aText), mOffsetInText(Some(aOffset)) {
  MOZ_RELEASE_ASSERT(mContent);
  MOZ_RELEASE_ASSERT(mContent->IsText());
  MOZ_ASSERT(EditorUtils::IsNewLinePreformatted(*mContent));
  MOZ_RELEASE_ASSERT(GetText()->TextDataLength() > aOffset);
  MOZ_ASSERT(CharAtOffsetIsLineBreak());
  aText = nullptr;
}

class CreateLineBreakResult final : public CaretPoint {
 public:
  CreateLineBreakResult(const EditorLineBreak& aLineBreak,
                        const EditorDOMPoint& aCaretPoint)
      : CaretPoint(aCaretPoint), mLineBreak(Some(aLineBreak)) {}
  CreateLineBreakResult(EditorLineBreak&& aLineBreak,
                        const EditorDOMPoint& aCaretPoint)
      : CaretPoint(aCaretPoint), mLineBreak(Some(std::move(aLineBreak))) {}
  CreateLineBreakResult(const EditorLineBreak& aLineBreak,
                        EditorDOMPoint&& aCaretPoint)
      : CaretPoint(aCaretPoint), mLineBreak(Some(aLineBreak)) {}
  CreateLineBreakResult(EditorLineBreak&& aLineBreak,
                        EditorDOMPoint&& aCaretPoint)
      : CaretPoint(std::move(aCaretPoint)),
        mLineBreak(Some(std::move(aLineBreak))) {}
  explicit CreateLineBreakResult(CreateElementResult&& aCreateElementResult)
      : CaretPoint(aCreateElementResult.UnwrapCaretPoint()),
        mLineBreak(Some(aCreateElementResult.UnwrapNewNode())) {}
  explicit CreateLineBreakResult(CreateElementResult&& aCreateElementResult,
                                 EditorDOMPoint&& aCaretPoint)
      : CaretPoint(std::forward<EditorDOMPoint>(aCaretPoint)),
        mLineBreak(Some(aCreateElementResult.UnwrapNewNode())) {
    aCreateElementResult.IgnoreCaretPointSuggestion();
  }

  [[nodiscard]] static CreateLineBreakResult NotHandled() {
    return CreateLineBreakResult();
  }

  [[nodiscard]] constexpr bool Handled() const { return mLineBreak.isSome(); }
  [[nodiscard]] constexpr const EditorLineBreak& LineBreakRef() const {
    MOZ_ASSERT(Handled());
    return mLineBreak.ref();
  }
  [[nodiscard]] constexpr const EditorLineBreak* operator->() const {
    return &LineBreakRef();
  }

  // Shortcut for unclear methods of EditorLineBreak if `->` operator is used.

  template <typename EditorDOMPointType>
  [[nodiscard]] EditorDOMPointType AtLineBreak() const {
    return LineBreakRef().To<EditorDOMPointType>();
  }
  template <typename EditorDOMPointType>
  [[nodiscard]] EditorDOMPointType BeforeLineBreak() const {
    return LineBreakRef().Before<EditorDOMPointType>();
  }
  template <typename EditorDOMPointType>
  [[nodiscard]] EditorDOMPointType AfterLineBreak() const {
    return LineBreakRef().After<EditorDOMPointType>();
  }
  [[nodiscard]] nsIContent& LineBreakContentRef() const {
    return LineBreakRef().ContentRef();
  }
  [[nodiscard]] bool LineBreakIsInComposedDoc() const {
    return LineBreakRef().IsInComposedDoc();
  }

 private:
  CreateLineBreakResult() : CaretPoint(EditorDOMPoint()) {}

  Maybe<EditorLineBreak> mLineBreak;
};

}  // namespace mozilla

template <typename CT>
struct fmt::formatter<mozilla::EditorLineBreakBase<CT>>
    : fmt::ostream_formatter {};

#endif  // #ifndef EditorLineBreak_h
