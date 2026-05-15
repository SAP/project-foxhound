/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef HTMLEditorNestedClasses_h
#define HTMLEditorNestedClasses_h

#include "EditorDOMPoint.h"
#include "EditorForwards.h"
#include "HTMLEditor.h"       // for HTMLEditor
#include "HTMLEditHelpers.h"  // for EditorInlineStyleAndValue
#include "HTMLEditUtils.h"    // for HTMLEditUtils::IsContainerNode

#include "mozilla/Attributes.h"
#include "mozilla/OwningNonNull.h"
#include "mozilla/Result.h"
#include "mozilla/dom/CharacterDataBuffer.h"
#include "mozilla/dom/Text.h"

namespace mozilla {

struct LimitersAndCaretData;  // Declared in nsFrameSelection.h
namespace dom {
class HTMLBRElement;
};

/*****************************************************************************
 * AutoInlineStyleSetter is a temporary class to set an inline style to
 * specific nodes.
 ****************************************************************************/

class MOZ_STACK_CLASS HTMLEditor::AutoInlineStyleSetter final
    : private EditorInlineStyleAndValue {
  using Element = dom::Element;
  using Text = dom::Text;

 public:
  explicit AutoInlineStyleSetter(
      const EditorInlineStyleAndValue& aStyleAndValue)
      : EditorInlineStyleAndValue(aStyleAndValue) {}

  void Reset() {
    mFirstHandledPoint.Clear();
    mLastHandledPoint.Clear();
  }

  const EditorDOMPoint& FirstHandledPointRef() const {
    return mFirstHandledPoint;
  }
  const EditorDOMPoint& LastHandledPointRef() const {
    return mLastHandledPoint;
  }

  /**
   * Split aText at aStartOffset and aEndOffset (except when they are start or
   * end of its data) and wrap the middle text node in an element to apply the
   * style.
   */
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<SplitRangeOffFromNodeResult, nsresult>
  SplitTextNodeAndApplyStyleToMiddleNode(HTMLEditor& aHTMLEditor, Text& aText,
                                         uint32_t aStartOffset,
                                         uint32_t aEndOffset);

  /**
   * Remove same style from children and apply the style entire (except
   * non-editable nodes) aContent.
   */
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<CaretPoint, nsresult>
  ApplyStyleToNodeOrChildrenAndRemoveNestedSameStyle(HTMLEditor& aHTMLEditor,
                                                     nsIContent& aContent);

  /**
   * Invert the style with creating new element or something.  This should
   * be called only when IsInvertibleWithCSS() returns true.
   */
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT nsresult
  InvertStyleIfApplied(HTMLEditor& aHTMLEditor, Element& aElement);
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<SplitRangeOffFromNodeResult, nsresult>
  InvertStyleIfApplied(HTMLEditor& aHTMLEditor, Text& aTextNode,
                       uint32_t aStartOffset, uint32_t aEndOffset);

  /**
   * Extend or shrink aRange for applying the style to the range.
   * See comments in the definition what this does.
   */
  Result<EditorRawDOMRange, nsresult> ExtendOrShrinkRangeToApplyTheStyle(
      const HTMLEditor& aHTMLEditor, const EditorDOMRange& aRange) const;

  /**
   * Returns next/previous sibling of aContent or an ancestor of it if it's
   * editable and does not cross block boundary.
   */
  [[nodiscard]] static nsIContent* GetNextEditableInlineContent(
      const nsIContent& aContent, const nsINode* aLimiter = nullptr);
  [[nodiscard]] static nsIContent* GetPreviousEditableInlineContent(
      const nsIContent& aContent, const nsINode* aLimiter = nullptr);

  /**
   * GetEmptyTextNodeToApplyNewStyle creates new empty text node to insert
   * a new element which will contain newly inserted text or returns existing
   * empty text node if aCandidatePointToInsert is around it.
   *
   * NOTE: Unfortunately, editor does not want to insert text into empty inline
   * element in some places (e.g., automatically adjusting caret position to
   * nearest text node).  Therefore, we need to create new empty text node to
   * prepare new styles for inserting text.  This method is designed for the
   * preparation.
   *
   * @param aHTMLEditor                 The editor.
   * @param aCandidatePointToInsert     The point where the caller wants to
   *                                    insert new text.
   * @return            If this creates new empty text node returns it.
   *                    If this couldn't create new empty text node due to
   *                    the point or aEditingHost cannot have text node,
   *                    returns nullptr.
   *                    Otherwise, returns error.
   */
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT static Result<RefPtr<Text>, nsresult>
  GetEmptyTextNodeToApplyNewStyle(
      HTMLEditor& aHTMLEditor, const EditorDOMPoint& aCandidatePointToInsert);

 private:
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<CaretPoint, nsresult> ApplyStyle(
      HTMLEditor& aHTMLEditor, nsIContent& aContent);

  [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<CaretPoint, nsresult>
  ApplyCSSTextDecoration(HTMLEditor& aHTMLEditor, nsIContent& aContent);

  /**
   * Returns true if aStyledElement is a good element to set `style` attribute.
   */
  [[nodiscard]] bool ElementIsGoodContainerToSetStyle(
      nsStyledElement& aStyledElement) const;

  /**
   * ElementIsGoodContainerForTheStyle() returns true if aElement is a
   * good container for applying the style to a node.  I.e., if this returns
   * true, moving nodes into aElement is enough to apply the style to them.
   * Otherwise, you need to create new element for the style.
   */
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<bool, nsresult>
  ElementIsGoodContainerForTheStyle(HTMLEditor& aHTMLEditor,
                                    Element& aElement) const;

  /**
   * Return true if the node is an element node and it represents the style or
   * sets the style (including when setting different value) with `style`
   * attribute.
   */
  [[nodiscard]] bool ContentIsElementSettingTheStyle(
      const HTMLEditor& aHTMLEditor, nsIContent& aContent) const;

  /**
   * Helper methods to shrink range to apply the style.
   */
  [[nodiscard]] EditorRawDOMPoint GetShrunkenRangeStart(
      const HTMLEditor& aHTMLEditor, const EditorDOMRange& aRange,
      const nsINode& aCommonAncestorOfRange,
      const nsIContent* aFirstEntirelySelectedContentNodeInRange) const;
  [[nodiscard]] EditorRawDOMPoint GetShrunkenRangeEnd(
      const HTMLEditor& aHTMLEditor, const EditorDOMRange& aRange,
      const nsINode& aCommonAncestorOfRange,
      const nsIContent* aLastEntirelySelectedContentNodeInRange) const;

  /**
   * Helper methods to extend the range to apply the style.
   */
  [[nodiscard]] EditorRawDOMPoint
  GetExtendedRangeStartToWrapAncestorApplyingSameStyle(
      const HTMLEditor& aHTMLEditor,
      const EditorRawDOMPoint& aStartPoint) const;
  [[nodiscard]] EditorRawDOMPoint
  GetExtendedRangeEndToWrapAncestorApplyingSameStyle(
      const HTMLEditor& aHTMLEditor, const EditorRawDOMPoint& aEndPoint) const;
  [[nodiscard]] EditorRawDOMRange
  GetExtendedRangeToMinimizeTheNumberOfNewElements(
      const HTMLEditor& aHTMLEditor, const nsINode& aCommonAncestor,
      EditorRawDOMPoint&& aStartPoint, EditorRawDOMPoint&& aEndPoint) const;

  /**
   * OnHandled() are called when this class creates new element to apply the
   * style, applies new style to existing element or ignores to apply the style
   * due to already set.
   */
  void OnHandled(const EditorDOMPoint& aStartPoint,
                 const EditorDOMPoint& aEndPoint) {
    if (!mFirstHandledPoint.IsSet()) {
      mFirstHandledPoint = aStartPoint;
    }
    mLastHandledPoint = aEndPoint;
  }
  void OnHandled(nsIContent& aContent) {
    if (aContent.IsElement() && !HTMLEditUtils::IsContainerNode(aContent)) {
      if (!mFirstHandledPoint.IsSet()) {
        mFirstHandledPoint.Set(&aContent);
      }
      mLastHandledPoint.SetAfter(&aContent);
      return;
    }
    if (!mFirstHandledPoint.IsSet()) {
      mFirstHandledPoint.Set(&aContent, 0u);
    }
    mLastHandledPoint = EditorDOMPoint::AtEndOf(aContent);
  }

  // mFirstHandledPoint and mLastHandledPoint store the first and last points
  // which are newly created or apply the new style, or just ignored at trying
  // to split a text node.
  EditorDOMPoint mFirstHandledPoint;
  EditorDOMPoint mLastHandledPoint;
};

/**
 * AutoMoveOneLineHandler moves the content in a line (between line breaks/block
 * boundaries) to specific point or end of a container element.
 */
class MOZ_STACK_CLASS HTMLEditor::AutoMoveOneLineHandler final {
 public:
  /**
   * Use this constructor when you want a line to move specific point.
   */
  explicit AutoMoveOneLineHandler(const EditorDOMPoint& aPointToInsert)
      : mPointToInsert(aPointToInsert),
        mMoveToEndOfContainer(MoveToEndOfContainer::No) {
    MOZ_ASSERT(mPointToInsert.IsSetAndValid());
    MOZ_ASSERT(mPointToInsert.IsInContentNode());
  }
  /**
   * Use this constructor when you want a line to move end of
   * aNewContainerElement.
   */
  explicit AutoMoveOneLineHandler(Element& aNewContainerElement)
      : mPointToInsert(&aNewContainerElement, 0),
        mMoveToEndOfContainer(MoveToEndOfContainer::Yes) {
    MOZ_ASSERT(mPointToInsert.IsSetAndValid());
  }

  /**
   * Must be called before calling Run().
   *
   * @param aHTMLEditor         The HTML editor.
   * @param aPointInHardLine    A point in a line which you want to move.
   * @param aEditingHost        The editing host.
   */
  [[nodiscard]] nsresult Prepare(HTMLEditor& aHTMLEditor,
                                 const EditorDOMPoint& aPointInHardLine,
                                 const Element& aEditingHost);
  /**
   * Must be called if Prepare() returned NS_OK.
   *
   * @param aHTMLEditor         The HTML editor.
   * @param aEditingHost        The editing host.
   */
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<MoveNodeResult, nsresult> Run(
      HTMLEditor& aHTMLEditor, const Element& aEditingHost);

  /**
   * Returns true if there are some content nodes which can be moved to another
   * place or deleted in the line containing aPointInHardLine.  Note that if
   * there is only a padding <br> element in an empty block element, this
   * returns false even though it may be deleted.
   */
  static Result<bool, nsresult> CanMoveOrDeleteSomethingInLine(
      const EditorDOMPoint& aPointInHardLine, const Element& aEditingHost);

  AutoMoveOneLineHandler(const AutoMoveOneLineHandler& aOther) = delete;
  AutoMoveOneLineHandler(AutoMoveOneLineHandler&& aOther) = delete;

 private:
  [[nodiscard]] bool ForceMoveToEndOfContainer() const {
    return mMoveToEndOfContainer == MoveToEndOfContainer::Yes;
  }
  [[nodiscard]] EditorDOMPoint& NextInsertionPointRef() {
    if (ForceMoveToEndOfContainer()) {
      mPointToInsert.SetToEndOf(mPointToInsert.GetContainer());
    }
    return mPointToInsert;
  }

  /**
   * Consider whether Run() should preserve or does not preserve white-space
   * style of moving content.
   *
   * @param aContentInLine      Specify a content node in the moving line.
   *                            Typically, container of aPointInHardLine of
   *                            Prepare().
   * @param aInclusiveAncestorBlockOfInsertionPoint
   *                            Inclusive ancestor block element of insertion
   *                            point.  Typically, computed
   *                            mDestInclusiveAncestorBlock.
   */
  [[nodiscard]] static PreserveWhiteSpaceStyle
  ConsiderWhetherPreserveWhiteSpaceStyle(
      const nsIContent* aContentInLine,
      const Element* aInclusiveAncestorBlockOfInsertionPoint);

  /**
   * Look for inclusive ancestor block element of aBlockElement and a descendant
   * of aAncestorElement.  If aBlockElement and aAncestorElement are same one,
   * this returns nullptr.
   *
   * @param aBlockElement       A block element which is a descendant of
   *                            aAncestorElement.
   * @param aAncestorElement    An inclusive ancestor block element of
   *                            aBlockElement.
   */
  [[nodiscard]] static Element*
  GetMostDistantInclusiveAncestorBlockInSpecificAncestorElement(
      Element& aBlockElement, const Element& aAncestorElement);

  /**
   * Split ancestors at the line range boundaries and collect array of contents
   * in the line to aOutArrayOfContents.  Specify aNewContainer to the container
   * of insertion point to avoid splitting the destination.
   */
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<CaretPoint, nsresult>
  SplitToMakeTheLineIsolated(
      HTMLEditor& aHTMLEditor, const nsIContent& aNewContainer,
      const Element& aEditingHost,
      nsTArray<OwningNonNull<nsIContent>>& aOutArrayOfContents) const;

  /**
   * Delete unnecessary trailing line break in aMovedContentRange if there is.
   */
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT nsresult
  DeleteUnnecessaryTrailingLineBreakInMovedLineEnd(
      HTMLEditor& aHTMLEditor, const EditorDOMRange& aMovedContentRange,
      const Element& aEditingHost) const;

  // Range of selected line.
  EditorDOMRange mLineRange;
  // Next insertion point.  If mMoveToEndOfContainer is `Yes`, this is
  // recomputed with its container in NextInsertionPointRef.  Therefore, this
  // should not be referred directly.
  EditorDOMPoint mPointToInsert;
  // An inclusive ancestor block element of the moving line.
  RefPtr<Element> mSrcInclusiveAncestorBlock;
  // An inclusive ancestor block element of the insertion point.
  RefPtr<Element> mDestInclusiveAncestorBlock;
  // nullptr if mMovingToParentBlock is false.
  // Must be non-nullptr if mMovingToParentBlock is true.  The topmost ancestor
  // block element which contains mSrcInclusiveAncestorBlock and a descendant of
  // mDestInclusiveAncestorBlock.  I.e., this may be same as
  // mSrcInclusiveAncestorBlock, but never same as mDestInclusiveAncestorBlock.
  RefPtr<Element> mTopmostSrcAncestorBlockInDestBlock;
  enum class MoveToEndOfContainer { No, Yes };
  MoveToEndOfContainer mMoveToEndOfContainer;
  PreserveWhiteSpaceStyle mPreserveWhiteSpaceStyle =
      PreserveWhiteSpaceStyle::No;
  // true if mDestInclusiveAncestorBlock is an ancestor of
  // mSrcInclusiveAncestorBlock.
  bool mMovingToParentBlock = false;
};

/**
 * Convert contents around aRanges of Run() to specified list element.  If there
 * are some different type of list elements, this method converts them to
 * specified list items too.  Basically, each line will be wrapped in a list
 * item element.  However, only when <p> element is selected, its child <br>
 * elements won't be treated as line separators.  Perhaps, this is a bug.
 */
class MOZ_STACK_CLASS HTMLEditor::AutoListElementCreator final {
 public:
  /**
   * @param aListElementTagName         The new list element tag name.
   * @param aListItemElementTagName     The new list item element tag name.
   * @param aBulletType                 If this is not empty string, it's set
   *                                    to `type` attribute of new list item
   *                                    elements.  Otherwise, existing `type`
   *                                    attributes will be removed.
   */
  AutoListElementCreator(const nsStaticAtom& aListElementTagName,
                         const nsStaticAtom& aListItemElementTagName,
                         const nsAString& aBulletType)
      // Needs const_cast hack here because the struct users may want
      // non-const nsStaticAtom pointer due to bug 1794954
      : mListTagName(const_cast<nsStaticAtom&>(aListElementTagName)),
        mListItemTagName(const_cast<nsStaticAtom&>(aListItemElementTagName)),
        mBulletType(aBulletType) {
    MOZ_ASSERT(&mListTagName == nsGkAtoms::ul ||
               &mListTagName == nsGkAtoms::ol ||
               &mListTagName == nsGkAtoms::dl);
    MOZ_ASSERT_IF(
        &mListTagName == nsGkAtoms::ul || &mListTagName == nsGkAtoms::ol,
        &mListItemTagName == nsGkAtoms::li);
    MOZ_ASSERT_IF(&mListTagName == nsGkAtoms::dl,
                  &mListItemTagName == nsGkAtoms::dt ||
                      &mListItemTagName == nsGkAtoms::dd);
  }

  /**
   * @param aHTMLEditor The HTML editor.
   * @param aRanges     [in/out] The ranges which will be converted to list.
   *                    The instance must not have saved ranges because it'll
   *                    be used in this method.
   *                    If succeeded, this will have selection ranges which
   *                    should be applied to `Selection`.
   *                    If failed, this keeps storing original selection
   *                    ranges.
   * @param aSelectAllOfCurrentList     Yes if this should treat all of
   *                                    ancestor list element at selection.
   * @param aEditingHost                The editing host.
   */
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<EditActionResult, nsresult> Run(
      HTMLEditor& aHTMLEditor, AutoClonedSelectionRangeArray& aRanges,
      HTMLEditor::SelectAllOfCurrentList aSelectAllOfCurrentList,
      const Element& aEditingHost) const;

 private:
  using ContentNodeArray = nsTArray<OwningNonNull<nsIContent>>;
  using AutoContentNodeArray = AutoTArray<OwningNonNull<nsIContent>, 64>;

  /**
   * If aSelectAllOfCurrentList is "Yes" and aRanges is in a list element,
   * returns the list element.
   * Otherwise, extend aRanges to select start and end lines selected by it and
   * correct all topmost content nodes in the extended ranges with splitting
   * ancestors at range edges.
   */
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT nsresult
  SplitAtRangeEdgesAndCollectContentNodesToMoveIntoList(
      HTMLEditor& aHTMLEditor, AutoClonedRangeArray& aRanges,
      SelectAllOfCurrentList aSelectAllOfCurrentList,
      const Element& aEditingHost, ContentNodeArray& aOutArrayOfContents) const;

  /**
   * Return true if aArrayOfContents has only <br> elements or empty inline
   * container elements.  I.e., it means that aArrayOfContents represents
   * only empty line(s) if this returns true.
   */
  [[nodiscard]] static bool
  IsEmptyOrContainsOnlyBRElementsOrEmptyInlineElements(
      const ContentNodeArray& aArrayOfContents);

  /**
   * Delete all content nodes ina ArrayOfContents, and if we can put new list
   * element at start of the first range of aRanges, insert new list element
   * there.
   *
   * @return            The empty list item element in new list element.
   */
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<RefPtr<Element>, nsresult>
  ReplaceContentNodesWithEmptyNewList(
      HTMLEditor& aHTMLEditor, const AutoClonedRangeArray& aRanges,
      const AutoContentNodeArray& aArrayOfContents,
      const Element& aEditingHost) const;

  /**
   * Creat new list elements or use existing list elements and move
   * aArrayOfContents into list item elements.
   *
   * @return            A list or list item element which should have caret.
   */
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<RefPtr<Element>, nsresult>
  WrapContentNodesIntoNewListElements(HTMLEditor& aHTMLEditor,
                                      AutoClonedRangeArray& aRanges,
                                      AutoContentNodeArray& aArrayOfContents,
                                      const Element& aEditingHost) const;

  struct MOZ_STACK_CLASS AutoHandlingState final {
    // Current list element which is a good container to create new list item
    // element.
    RefPtr<Element> mCurrentListElement;
    // Previously handled list item element.
    RefPtr<Element> mPreviousListItemElement;
    // List or list item element which should have caret after handling all
    // contents.
    RefPtr<Element> mListOrListItemElementToPutCaret;
    // Replacing block element.  This is typically already removed from the DOM
    // tree.
    RefPtr<Element> mReplacingBlockElement;
    // Once id attribute of mReplacingBlockElement copied, the id attribute
    // shouldn't be copied again.
    bool mMaybeCopiedReplacingBlockElementId = false;
  };

  /**
   * Helper methods of WrapContentNodesIntoNewListElements.  They are called for
   * handling one content node of aArrayOfContents.  It's set to aHandling*.
   */
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT nsresult HandleChildContent(
      HTMLEditor& aHTMLEditor, nsIContent& aHandlingContent,
      AutoHandlingState& aState, const Element& aEditingHost) const;
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT nsresult
  HandleChildListElement(HTMLEditor& aHTMLEditor, Element& aHandlingListElement,
                         AutoHandlingState& aState) const;
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT nsresult HandleChildListItemElement(
      HTMLEditor& aHTMLEditor, Element& aHandlingListItemElement,
      AutoHandlingState& aState) const;
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT nsresult
  HandleChildListItemInDifferentTypeList(HTMLEditor& aHTMLEditor,
                                         Element& aHandlingListItemElement,
                                         AutoHandlingState& aState) const;
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT nsresult HandleChildListItemInSameTypeList(
      HTMLEditor& aHTMLEditor, Element& aHandlingListItemElement,
      AutoHandlingState& aState) const;
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT nsresult HandleChildDivOrParagraphElement(
      HTMLEditor& aHTMLEditor, Element& aHandlingDivOrParagraphElement,
      AutoHandlingState& aState, const Element& aEditingHost) const;
  enum class EmptyListItem { NotCreate, Create };
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT nsresult CreateAndUpdateCurrentListElement(
      HTMLEditor& aHTMLEditor, const EditorDOMPoint& aPointToInsert,
      EmptyListItem aEmptyListItem, AutoHandlingState& aState,
      const Element& aEditingHost) const;
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<CreateElementResult, nsresult>
  AppendListItemElement(HTMLEditor& aHTMLEditor, const Element& aListElement,
                        AutoHandlingState& aState) const;
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT static nsresult
  MaybeCloneAttributesToNewListItem(HTMLEditor& aHTMLEditor,
                                    Element& aListItemElement,
                                    AutoHandlingState& aState);
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT nsresult HandleChildInlineContent(
      HTMLEditor& aHTMLEditor, nsIContent& aHandlingInlineContent,
      AutoHandlingState& aState) const;
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT nsresult WrapContentIntoNewListItemElement(
      HTMLEditor& aHTMLEditor, nsIContent& aHandlingContent,
      AutoHandlingState& aState) const;

  /**
   * If aRanges is collapsed outside aListItemOrListToPutCaret, this collapse
   * aRanges in aListItemOrListToPutCaret again.
   */
  nsresult EnsureCollapsedRangeIsInListItemOrListElement(
      Element& aListItemOrListToPutCaret, AutoClonedRangeArray& aRanges) const;

  MOZ_KNOWN_LIVE nsStaticAtom& mListTagName;
  MOZ_KNOWN_LIVE nsStaticAtom& mListItemTagName;
  const nsAutoString mBulletType;
};

/**
 * Handle "insertParagraph" command.
 */
class MOZ_STACK_CLASS HTMLEditor::AutoInsertParagraphHandler final {
 public:
  AutoInsertParagraphHandler() = delete;
  AutoInsertParagraphHandler(const AutoInsertParagraphHandler&) = delete;
  AutoInsertParagraphHandler(AutoInsertParagraphHandler&&) = delete;

  MOZ_CAN_RUN_SCRIPT explicit AutoInsertParagraphHandler(
      HTMLEditor& aHTMLEditor, const Element& aEditingHost)
      : mHTMLEditor(aHTMLEditor),
        mEditingHost(aEditingHost),
        mDefaultParagraphSeparatorTagName(
            aHTMLEditor.DefaultParagraphSeparatorTagName()),
        mDefaultParagraphSeparator(aHTMLEditor.GetDefaultParagraphSeparator()) {
  }

  [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<EditActionResult, nsresult> Run();

 private:
  /**
   * Insert <br> element.
   *
   * @param aPointToInsert      The position where the new <br> should be
   *                            inserted.
   * @param aBlockElementWhichShouldHaveCaret
   *                            [optional] If set, this collapse selection into
   *                            the element with
   *                            CollapseSelectionToPointOrIntoBlockWhichShouldHaveCaret().
   */
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<EditActionResult, nsresult>
  HandleInsertBRElement(
      const EditorDOMPoint& aPointToInsert,
      const Element* aBlockElementWhichShouldHaveCaret = nullptr);

  /**
   * Insert a linefeed.
   */
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<EditActionResult, nsresult>
  HandleInsertLinefeed(const EditorDOMPoint& aPointToInsert);

  /**
   * SplitParagraphWithTransaction() splits the parent block, aParentDivOrP, at
   * aPointToSplit.
   *
   * @param aBlockElementToSplit    The current paragraph which should be split.
   * @param aPointToSplit           The point to split aBlockElementToSplit.
   */
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<SplitNodeResult, nsresult>
  SplitParagraphWithTransaction(Element& aBlockElementToSplit,
                                const EditorDOMPoint& aPointToSplit);

  /**
   * Delete preceding invisible line break before aPointToSplit if and only if
   * there is.
   *
   * @return New point to split aBlockElementToSplit
   */
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<EditorDOMPoint, nsresult>
  EnsureNoInvisibleLineBreakBeforePointToSplit(
      const Element& aBlockElementToSplit, const EditorDOMPoint& aPointToSplit);

  /**
   * Maybe insert a <br> element if it's required to keep the inline container
   * visible after splitting aBlockElementToSplit at aPointToSplit.
   *
   * @return New point to split aBlockElementToSplit
   */
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<EditorDOMPoint, nsresult>
  MaybeInsertFollowingBRElementToPreserveRightBlock(
      const Element& aBlockElementToSplit, const EditorDOMPoint& aPointToSplit);

  /**
   * Return true if the HTMLEditor is in the mode which `insertParagraph` should
   * always create a new paragraph or in the cases that we create a new
   * paragraph in the legacy mode.
   */
  [[nodiscard]] bool ShouldCreateNewParagraph(
      Element& aParentDivOrP, const EditorDOMPoint& aPointToSplit) const;

  /**
   * Return true if aBRElement is nullptr or an invisible <br> or a padding <br>
   * for making the last empty line visible.
   */
  [[nodiscard]] static bool
  IsNullOrInvisibleBRElementOrPaddingOneForEmptyLastLine(
      const dom::HTMLBRElement* aBRElement);

  /**
   * Handle insertParagraph command (i.e., handling Enter key press) in a
   * heading element.  This splits aHeadingElement element at aPointToSplit.
   * Then, if right heading element is empty, it'll be removed and new paragraph
   * is created (its type is decided with default paragraph separator).
   *
   * @param aHeadingElement     The heading element to be split.
   * @param aPointToSplit       The point to split aHeadingElement.
   * @return                    New paragraph element, meaning right heading
   *                            element if aHeadingElement is split, or newly
   *                            created or existing paragraph element.
   */
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<InsertParagraphResult, nsresult>
  HandleInHeadingElement(Element& aHeadingElement,
                         const EditorDOMPoint& aPointToSplit);

  /**
   * Handle insertParagraph command at end of a heading element.
   */
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<InsertParagraphResult, nsresult>
  HandleAtEndOfHeadingElement(Element& aHeadingElement);

  /**
   * Handle insertParagraph command (i.e., handling Enter key press) in a list
   * item element.
   *
   * @param aListItemElement    The list item which has the following point.
   * @param aPointToSplit       The point to split aListItemElement.
   * @return                    New paragraph element, meaning right list item
   *                            element if aListItemElement is split, or newly
   *                            created paragraph element.
   */
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<InsertParagraphResult, nsresult>
  HandleInListItemElement(Element& aListItemElement,
                          const EditorDOMPoint& aPointToSplit);

  /**
   * Split aMailCiteElement at aPointToSplit.
   *
   * @param aMailCiteElement    The mail-cite element which should be split.
   * @param aPointToSplit       The point to split.
   * @return                    Candidate caret position where is at inserted
   *                            <br> element into the split point.
   */
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<CaretPoint, nsresult>
  HandleInMailCiteElement(Element& aMailCiteElement,
                          const EditorDOMPoint& aPointToSplit);

  /**
   * Insert a <br> element into aPointToBreak.
   * This may split container elements at the point and/or may move following
   * <br> element to immediately after the new <br> element if necessary.
   *
   * @param aPointToBreak       The point where new <br> element will be
   *                            inserted before.
   * @return                    If succeeded, returns new <br> element and
   *                            candidate caret point.
   */
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<CreateElementResult, nsresult>
  InsertBRElement(const EditorDOMPoint& aPointToBreak);

  /**
   * Return true if we should insert a line break instead of a paragraph.
   */
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT bool ShouldInsertLineBreakInstead(
      const Element* aEditableBlockElement,
      const EditorDOMPoint& aCandidatePointToSplit);

  enum class InsertBRElementIntoEmptyBlock : bool { Start, End };

  /**
   * Make sure that aMaybeBlockElement is visible with putting a <br> element if
   * and only if it's an empty block element.
   */
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<CreateLineBreakResult, nsresult>
  InsertBRElementIfEmptyBlockElement(
      Element& aMaybeBlockElement,
      InsertBRElementIntoEmptyBlock aInsertBRElementIntoEmptyBlock,
      BlockInlineCheck aBlockInlineCheck);

  /**
   * Split aMailCiteElement at aPointToSplit.  This deletes all inclusive
   * ancestors of aPointToSplit in aMailCiteElement too.
   */
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<SplitNodeResult, nsresult>
  SplitMailCiteElement(const EditorDOMPoint& aPointToSplit,
                       Element& aMailCiteElement);

  /**
   * aMailCiteElement may be a <span> element which is styled as block.  If it's
   * followed by a block boundary, it requires a padding <br> element when it's
   * serialized.  This method may insert a <br> element if it's required.
   */
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT nsresult
  MaybeInsertPaddingBRElementToInlineMailCiteElement(
      const EditorDOMPoint& aPointToInsertBRElement, Element& aMailCiteElement);

  /**
   * Return the deepest inline container element which is the first leaf or the
   * first leaf container of aBlockElement.
   */
  [[nodiscard]] static Element* GetDeepestFirstChildInlineContainerElement(
      Element& aBlockElement);

  /**
   * Collapse `Selection` to aCandidatePointToPutCaret or into
   * aBlockElementShouldHaveCaret.  If aBlockElementShouldHaveCaret is specified
   * and aCandidatePointToPutCaret is outside it, this ignores
   * aCandidatePointToPutCaret and collapse `Selection` into
   * aBlockElementShouldHaveCaret.
   */
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT nsresult
  CollapseSelectionToPointOrIntoBlockWhichShouldHaveCaret(
      const EditorDOMPoint& aCandidatePointToPutCaret,
      const Element* aBlockElementShouldHaveCaret,
      const SuggestCaretOptions& aOptions);

  /**
   * Return a better point to split the paragraph to avoid to keep a typing in a
   * link or a paragraph in list item in the new paragraph.
   */
  [[nodiscard]] EditorDOMPoint GetBetterPointToSplitParagraph(
      const Element& aBlockElementToSplit,
      const EditorDOMPoint& aCandidatePointToSplit);

  enum class IgnoreBlockBoundaries : bool { No, Yes };

  /**
   * Return true if splitting aBlockElementToSplit at aPointToSplit will create
   * empty left element.
   *
   * @param aBlockElementToSplit    The paragraph element which we want to
   *                                split.
   * @param aPointToSplit           The split position in aBlockElementToSplit.
   * @param aIgnoreBlockBoundaries  If No, return true only when aPointToSplit
   *                                is immediately after a block boundary of
   *                                aBlockElementToSplit.  In other words,
   *                                may return true only when aPointToSplit
   *                                is not in a child block of
   *                                aBlockElementToSplit.
   *                                If Yes, return true even when aPointToSplit
   *                                is immediately after any current block
   *                                boundary which is followed by the block
   *                                boundary of aBlockElementToSplit.  In other
   *                                words, return true when aPointToSplit is in
   *                                a child block which is start of any ancestor
   *                                block elements.
   */
  [[nodiscard]] static bool SplitPointIsStartOfSplittingBlock(
      const Element& aBlockElementToSplit, const EditorDOMPoint& aPointToSplit,
      IgnoreBlockBoundaries aIgnoreBlockBoundaries);

  /**
   * Return true if splitting aBlockElementToSplit at aPointToSplit will create
   * empty right element.
   *
   * @param aBlockElementToSplit    The paragraph element which we want to
   *                                split.
   * @param aPointToSplit           The split position in aBlockElementToSplit.
   * @param aIgnoreBlockBoundaries  If No, return true only when aPointToSplit
   *                                is immediately before a block boundary of
   *                                aBlockElementToSplit.  In other words,
   *                                may return true only when aPointToSplit
   *                                is not in a child block of
   *                                aBlockElementToSplit.
   *                                If Yes, return true even when aPointToSplit
   *                                is immediately before any current block
   *                                boundary which is followed by the block
   *                                boundary of aBlockElementToSplit.  In other
   *                                words, return true when aPointToSplit is in
   *                                a child block which is end of any ancestor
   *                                block elements.
   */
  [[nodiscard]] static bool SplitPointIsEndOfSplittingBlock(
      const Element& aBlockElementToSplit, const EditorDOMPoint& aPointToSplit,
      IgnoreBlockBoundaries aIgnoreBlockBoundaries);

  MOZ_KNOWN_LIVE HTMLEditor& mHTMLEditor;
  MOZ_KNOWN_LIVE const Element& mEditingHost;
  MOZ_KNOWN_LIVE nsStaticAtom& mDefaultParagraphSeparatorTagName;
  const ParagraphSeparator mDefaultParagraphSeparator;
};

/**
 * Handle "insertLineBreak" command.
 */
class MOZ_STACK_CLASS HTMLEditor::AutoInsertLineBreakHandler final {
 public:
  AutoInsertLineBreakHandler() = delete;
  AutoInsertLineBreakHandler(const AutoInsertLineBreakHandler&) = delete;
  AutoInsertLineBreakHandler(AutoInsertLineBreakHandler&&) = delete;

  MOZ_CAN_RUN_SCRIPT explicit AutoInsertLineBreakHandler(
      HTMLEditor& aHTMLEditor, const Element& aEditingHost)
      : mHTMLEditor(aHTMLEditor), mEditingHost(aEditingHost) {}

  [[nodiscard]] MOZ_CAN_RUN_SCRIPT nsresult Run();

 private:
  /**
   * Insert a linefeed character into aPointToBreak.
   *
   * @param aPointToBreak       The point where new linefeed character will be
   *                            inserted before.
   * @param aEditingHost        Current active editing host.
   * @return                    A suggest point to put caret.
   */
  [[nodiscard]] static MOZ_CAN_RUN_SCRIPT Result<EditorDOMPoint, nsresult>
  InsertLinefeed(HTMLEditor& aHTMLEditor, const EditorDOMPoint& aPointToBreak,
                 const Element& aEditingHost);

  /**
   * Insert <br> element at `Selection`.
   */
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT nsresult HandleInsertBRElement();

  /**
   * Insert a linefeed at `Selection`.
   */
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT nsresult HandleInsertLinefeed();

  friend class AutoInsertParagraphHandler;

  MOZ_KNOWN_LIVE HTMLEditor& mHTMLEditor;
  MOZ_KNOWN_LIVE const Element& mEditingHost;
};

/**
 * Handle delete multiple ranges, typically they are the selection ranges.
 */
class MOZ_STACK_CLASS HTMLEditor::AutoDeleteRangesHandler final {
 public:
  explicit AutoDeleteRangesHandler(
      const AutoDeleteRangesHandler* aParent = nullptr)
      : mParent(aParent),
        mOriginalDirectionAndAmount(nsIEditor::eNone),
        mOriginalStripWrappers(nsIEditor::eNoStrip) {}

  /**
   * ComputeRangesToDelete() computes actual deletion ranges.
   */
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT nsresult ComputeRangesToDelete(
      const HTMLEditor& aHTMLEditor, nsIEditor::EDirection aDirectionAndAmount,
      AutoClonedSelectionRangeArray& aRangesToDelete,
      const Element& aEditingHost);

  /**
   * Deletes content in or around aRangesToDelete.
   * NOTE: This method creates SelectionBatcher.  Therefore, each caller
   *       needs to check if the editor is still available even if this returns
   *       NS_OK.
   */
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<EditActionResult, nsresult> Run(
      HTMLEditor& aHTMLEditor, nsIEditor::EDirection aDirectionAndAmount,
      nsIEditor::EStripWrappers aStripWrappers,
      AutoClonedSelectionRangeArray& aRangesToDelete,
      const Element& aEditingHost);

 private:
  [[nodiscard]] bool IsHandlingRecursively() const {
    return mParent != nullptr;
  }

  [[nodiscard]] bool CanFallbackToDeleteRangeWithTransaction(
      const nsRange& aRangeToDelete) const;

  [[nodiscard]] bool CanFallbackToDeleteRangesWithTransaction(
      const AutoClonedSelectionRangeArray& aRangesToDelete) const;

  /**
   * HandleDeleteAroundCollapsedRanges() handles deletion with collapsed
   * ranges.  Callers must guarantee that this is called only when
   * aRangesToDelete.IsCollapsed() returns true.
   *
   * @param aDirectionAndAmount Direction of the deletion.
   * @param aStripWrappers      Must be eStrip or eNoStrip.
   * @param aRangesToDelete     Ranges to delete.  This `IsCollapsed()` must
   *                            return true.
   * @param aWSRunScannerAtCaret        Scanner instance which scanned from
   *                                    caret point.
   * @param aScanFromCaretPointResult   Scan result of aWSRunScannerAtCaret
   *                                    toward aDirectionAndAmount.
   * @param aEditingHost        The editing host.
   */
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<EditActionResult, nsresult>
  HandleDeleteAroundCollapsedRanges(
      HTMLEditor& aHTMLEditor, nsIEditor::EDirection aDirectionAndAmount,
      nsIEditor::EStripWrappers aStripWrappers,
      AutoClonedSelectionRangeArray& aRangesToDelete,
      const WSRunScanner& aWSRunScannerAtCaret,
      const WSScanResult& aScanFromCaretPointResult,
      const Element& aEditingHost);
  nsresult ComputeRangesToDeleteAroundCollapsedRanges(
      const HTMLEditor& aHTMLEditor, nsIEditor::EDirection aDirectionAndAmount,
      AutoClonedSelectionRangeArray& aRangesToDelete,
      const WSRunScanner& aWSRunScannerAtCaret,
      const WSScanResult& aScanFromCaretPointResult,
      const Element& aEditingHost) const;

  /**
   * HandleDeleteNonCollapsedRanges() handles deletion with non-collapsed
   * ranges.  Callers must guarantee that this is called only when
   * aRangesToDelete.IsCollapsed() returns false.
   *
   * @param aDirectionAndAmount         Direction of the deletion.
   * @param aStripWrappers              Must be eStrip or eNoStrip.
   * @param aRangesToDelete             The ranges to delete.
   * @param aSelectionWasCollapsed      If the caller extended `Selection`
   *                                    from collapsed, set this to `Yes`.
   *                                    Otherwise, i.e., `Selection` is not
   *                                    collapsed from the beginning, set
   *                                    this to `No`.
   * @param aEditingHost                The editing host.
   */
  enum class SelectionWasCollapsed { Yes, No };
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<EditActionResult, nsresult>
  HandleDeleteNonCollapsedRanges(HTMLEditor& aHTMLEditor,
                                 nsIEditor::EDirection aDirectionAndAmount,
                                 nsIEditor::EStripWrappers aStripWrappers,
                                 AutoClonedSelectionRangeArray& aRangesToDelete,
                                 SelectionWasCollapsed aSelectionWasCollapsed,
                                 const Element& aEditingHost);
  nsresult ComputeRangesToDeleteNonCollapsedRanges(
      const HTMLEditor& aHTMLEditor, nsIEditor::EDirection aDirectionAndAmount,
      AutoClonedSelectionRangeArray& aRangesToDelete,
      SelectionWasCollapsed aSelectionWasCollapsed,
      const Element& aEditingHost) const;

  /**
   * Handle deletion of collapsed ranges in a text node.
   *
   * @param aDirectionAndAmount Must be eNext or ePrevious.
   * @param aCaretPosition      The position where caret is.  This container
   *                            must be a text node.
   * @param aEditingHost        The editing host.
   */
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<CaretPoint, nsresult>
  HandleDeleteTextAroundCollapsedRanges(
      HTMLEditor& aHTMLEditor, nsIEditor::EDirection aDirectionAndAmount,
      AutoClonedSelectionRangeArray& aRangesToDelete,
      const Element& aEditingHost);
  nsresult ComputeRangesToDeleteTextAroundCollapsedRanges(
      nsIEditor::EDirection aDirectionAndAmount,
      AutoClonedSelectionRangeArray& aRangesToDelete) const;

  /**
   * Handle deletion of atomic elements like <br>, <hr>, <img>, <input>, etc and
   * data nodes except text node (e.g., comment node). Note that don't call this
   * directly with `<hr>` element.
   *
   * @param aAtomicContent      The atomic content to be deleted.
   * @param aCaretPoint         The caret point (i.e., selection start or
   *                            end).
   * @param aWSRunScannerAtCaret WSRunScanner instance which was initialized
   *                             with the caret point.
   * @param aEditingHost        The editing host.
   */
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<CaretPoint, nsresult>
  HandleDeleteAtomicContent(HTMLEditor& aHTMLEditor, nsIContent& aAtomicContent,
                            const EditorDOMPoint& aCaretPoint,
                            const WSRunScanner& aWSRunScannerAtCaret,
                            const Element& aEditingHost);
  nsresult ComputeRangesToDeleteAtomicContent(
      const nsIContent& aAtomicContent,
      AutoClonedSelectionRangeArray& aRangesToDelete) const;

  /**
   * GetAtomicContnetToDelete() returns better content that is deletion of
   * atomic element.  If aScanFromCaretPointResult is special, since this
   * point may not be editable, we look for better point to remove atomic
   * content.
   *
   * @param aDirectionAndAmount       Direction of the deletion.
   * @param aWSRunScannerAtCaret      WSRunScanner instance which was
   *                                  initialized with the caret point.
   * @param aScanFromCaretPointResult Scan result of aWSRunScannerAtCaret
   *                                  toward aDirectionAndAmount.
   */
  [[nodiscard]] static nsIContent* GetAtomicContentToDelete(
      nsIEditor::EDirection aDirectionAndAmount,
      const WSRunScanner& aWSRunScannerAtCaret,
      const WSScanResult& aScanFromCaretPointResult) MOZ_NONNULL_RETURN;

  /**
   * HandleDeleteAtOtherBlockBoundary() handles deletion at other block boundary
   * (i.e., immediately before or after a block). If this does not join blocks,
   * `Run()` may be called recursively with creating another instance.
   *
   * @param aDirectionAndAmount Direction of the deletion.
   * @param aStripWrappers      Must be eStrip or eNoStrip.
   * @param aOtherBlockElement  The block element which follows the caret or
   *                            is followed by caret.
   * @param aCaretPoint         The caret point (i.e., selection start or
   *                            end).
   * @param aWSRunScannerAtCaret WSRunScanner instance which was initialized
   *                             with the caret point.
   * @param aRangesToDelete     Ranges to delete of the caller.  This should
   *                            be collapsed and the point should match with
   *                            aCaretPoint.
   * @param aEditingHost        The editing host.
   */
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<EditActionResult, nsresult>
  HandleDeleteAtOtherBlockBoundary(
      HTMLEditor& aHTMLEditor, nsIEditor::EDirection aDirectionAndAmount,
      nsIEditor::EStripWrappers aStripWrappers, Element& aOtherBlockElement,
      const EditorDOMPoint& aCaretPoint, WSRunScanner& aWSRunScannerAtCaret,
      AutoClonedSelectionRangeArray& aRangesToDelete,
      const Element& aEditingHost);

  /**
   * ExtendOrShrinkRangeToDelete() extends aRangeToDelete if there are
   * an invisible <br> element and/or some parent empty elements.
   *
   * @param aLimitersAndCaretData The frame selection data.
   * @param aRangeToDelete       The range to be extended for deletion.  This
   *                            must not be collapsed, must be positioned.
   */
  template <typename EditorDOMRangeType>
  [[nodiscard]] Result<EditorRawDOMRange, nsresult> ExtendOrShrinkRangeToDelete(
      const HTMLEditor& aHTMLEditor,
      const LimitersAndCaretData& aLimitersAndCaretData,
      const EditorDOMRangeType& aRangeToDelete) const;

  /**
   * Extend the start boundary of aRangeToDelete to contain ancestor inline
   * elements which will be empty once the content in aRangeToDelete is removed
   * from the tree.
   *
   * NOTE: This is designed for deleting inline elements which become empty if
   * aRangeToDelete which crosses a block boundary of right block child.
   * Therefore, you may need to improve this method if you want to use this in
   * the other cases.
   *
   * @param aRangeToDelete      [in/out] The range to delete.  This start
   *                            boundary may be modified.
   * @param aEditingHost        The editing host.
   * @return                    true if aRangeToDelete is modified.
   *                            false if aRangeToDelete is not modified.
   *                            error if aRangeToDelete gets unexpected
   *                            situation.
   */
  [[nodiscard]] static Result<bool, nsresult>
  ExtendRangeToContainAncestorInlineElementsAtStart(
      nsRange& aRangeToDelete, const Element& aEditingHost);

  /**
   * A helper method for ExtendOrShrinkRangeToDelete().  This returns shrunken
   * range if aRangeToDelete selects all over list elements which have some list
   * item elements to avoid to delete all list items from the list element.
   */
  [[nodiscard]] static EditorRawDOMRange
  GetRangeToAvoidDeletingAllListItemsIfSelectingAllOverListElements(
      const EditorRawDOMRange& aRangeToDelete);

  /**
   * DeleteUnnecessaryNodes() removes unnecessary nodes around aRange.
   */
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT nsresult
  DeleteUnnecessaryNodes(HTMLEditor& aHTMLEditor, const EditorDOMRange& aRange,
                         const Element& aEditingHost);

  /**
   * If aContent is a text node that contains only collapsed white-space or
   * empty and editable.
   */
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT nsresult
  DeleteNodeIfInvisibleAndEditableTextNode(HTMLEditor& aHTMLEditor,
                                           nsIContent& aContent);

  /**
   * DeleteParentBlocksIfEmpty() removes parent block elements if they
   * don't have visible contents.  Note that due performance issue of
   * WhiteSpaceVisibilityKeeper, this call may be expensive.  And also note that
   * this removes a empty block with a transaction.  So, please make sure that
   * you've already created `AutoPlaceholderBatch`.
   *
   * @param aPoint      The point whether this method climbing up the DOM
   *                    tree to remove empty parent blocks.
   * @return            NS_OK if one or more empty block parents are deleted.
   *                    NS_SUCCESS_EDITOR_ELEMENT_NOT_FOUND if the point is
   *                    not in empty block.
   *                    Or NS_ERROR_* if something unexpected occurs.
   */
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT nsresult
  DeleteParentBlocksWithTransactionIfEmpty(HTMLEditor& aHTMLEditor,
                                           const EditorDOMPoint& aPoint,
                                           const Element& aEditingHost);

  [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<CaretPoint, nsresult>
  FallbackToDeleteRangeWithTransaction(HTMLEditor& aHTMLEditor,
                                       nsRange& aRangeToDelete) const {
    MOZ_ASSERT(aHTMLEditor.IsEditActionDataAvailable());
    MOZ_ASSERT(CanFallbackToDeleteRangeWithTransaction(aRangeToDelete));
    Result<CaretPoint, nsresult> caretPointOrError =
        aHTMLEditor.DeleteRangeWithTransaction(mOriginalDirectionAndAmount,
                                               mOriginalStripWrappers,
                                               aRangeToDelete);
    NS_WARNING_ASSERTION(caretPointOrError.isOk(),
                         "EditorBase::DeleteRangeWithTransaction() failed");
    return caretPointOrError;
  }

  [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<CaretPoint, nsresult>
  FallbackToDeleteRangesWithTransaction(
      HTMLEditor& aHTMLEditor, AutoClonedSelectionRangeArray& aRangesToDelete,
      const Element& aEditingHost) const;

  /**
   * Compute target range(s) which will be called by
   * `EditorBase::DeleteRangeWithTransaction()` or
   * `HTMLEditor::DeleteRangesWithTransaction()`.
   * TODO: We should not use it for consistency with each deletion handler
   *       in this and nested classes.
   */
  nsresult ComputeRangeToDeleteRangeWithTransaction(
      const HTMLEditor& aHTMLEditor, nsIEditor::EDirection aDirectionAndAmount,
      nsRange& aRange, const Element& aEditingHost) const;
  nsresult ComputeRangesToDeleteRangesWithTransaction(
      const HTMLEditor& aHTMLEditor, nsIEditor::EDirection aDirectionAndAmount,
      AutoClonedSelectionRangeArray& aRangesToDelete,
      const Element& aEditingHost) const;

  nsresult FallbackToComputeRangeToDeleteRangeWithTransaction(
      const HTMLEditor& aHTMLEditor, nsRange& aRangeToDelete,
      const Element& aEditingHost) const {
    MOZ_ASSERT(aHTMLEditor.IsEditActionDataAvailable());
    MOZ_ASSERT(CanFallbackToDeleteRangeWithTransaction(aRangeToDelete));
    nsresult rv = ComputeRangeToDeleteRangeWithTransaction(
        aHTMLEditor, mOriginalDirectionAndAmount, aRangeToDelete, aEditingHost);
    NS_WARNING_ASSERTION(NS_SUCCEEDED(rv),
                         "AutoDeleteRangesHandler::"
                         "ComputeRangeToDeleteRangeWithTransaction() failed");
    return rv;
  }
  nsresult FallbackToComputeRangesToDeleteRangesWithTransaction(
      const HTMLEditor& aHTMLEditor,
      AutoClonedSelectionRangeArray& aRangesToDelete,
      const Element& aEditingHost) const {
    MOZ_ASSERT(aHTMLEditor.IsEditActionDataAvailable());
    MOZ_ASSERT(CanFallbackToDeleteRangesWithTransaction(aRangesToDelete));
    nsresult rv = ComputeRangesToDeleteRangesWithTransaction(
        aHTMLEditor, mOriginalDirectionAndAmount, aRangesToDelete,
        aEditingHost);
    NS_WARNING_ASSERTION(NS_SUCCEEDED(rv),
                         "AutoDeleteRangesHandler::"
                         "ComputeRangesToDeleteRangesWithTransaction() failed");
    return rv;
  }

  class MOZ_STACK_CLASS AutoBlockElementsJoiner;
  class MOZ_STACK_CLASS AutoEmptyBlockAncestorDeleter;

  const AutoDeleteRangesHandler* const mParent;
  nsIEditor::EDirection mOriginalDirectionAndAmount;
  nsIEditor::EStripWrappers mOriginalStripWrappers;
};

/**
 * Handle join block elements.  Despite the name, this may just move first line
 * of a block into another block or just deleted the range with keeping table
 * structure.
 */
class MOZ_STACK_CLASS
HTMLEditor::AutoDeleteRangesHandler::AutoBlockElementsJoiner final {
 public:
  AutoBlockElementsJoiner() = delete;
  explicit AutoBlockElementsJoiner(
      AutoDeleteRangesHandler& aDeleteRangesHandler)
      : mDeleteRangesHandler(&aDeleteRangesHandler),
        mDeleteRangesHandlerConst(aDeleteRangesHandler) {}
  explicit AutoBlockElementsJoiner(
      const AutoDeleteRangesHandler& aDeleteRangesHandler)
      : mDeleteRangesHandler(nullptr),
        mDeleteRangesHandlerConst(aDeleteRangesHandler) {}

  /**
   * PrepareToDeleteAtCurrentBlockBoundary() considers left content and right
   * content which are joined for handling deletion at current block boundary
   * (i.e., at start or end of the current block).
   *
   * @param aHTMLEditor               The HTML editor.
   * @param aDirectionAndAmount       Direction of the deletion.
   * @param aCurrentBlockElement      The current block element.
   * @param aCaretPoint               The caret point (i.e., selection start
   *                                  or end).
   * @param aEditingHost              The editing host.
   * @return                          true if can continue to handle the
   *                                  deletion.
   */
  [[nodiscard]] bool PrepareToDeleteAtCurrentBlockBoundary(
      const HTMLEditor& aHTMLEditor, nsIEditor::EDirection aDirectionAndAmount,
      Element& aCurrentBlockElement, const EditorDOMPoint& aCaretPoint,
      const Element& aEditingHost);

  /**
   * PrepareToDeleteAtOtherBlockBoundary() considers left content and right
   * content which are joined for handling deletion at other block boundary
   * (i.e., immediately before or after a block).
   *
   * @param aHTMLEditor               The HTML editor.
   * @param aDirectionAndAmount       Direction of the deletion.
   * @param aOtherBlockElement        The block element which follows the
   *                                  caret or is followed by caret.
   * @param aCaretPoint               The caret point (i.e., selection start
   *                                  or end).
   * @param aWSRunScannerAtCaret      WSRunScanner instance which was
   *                                  initialized with the caret point.
   * @return                          true if can continue to handle the
   *                                  deletion.
   */
  [[nodiscard]] bool PrepareToDeleteAtOtherBlockBoundary(
      const HTMLEditor& aHTMLEditor, nsIEditor::EDirection aDirectionAndAmount,
      Element& aOtherBlockElement, const EditorDOMPoint& aCaretPoint,
      const WSRunScanner& aWSRunScannerAtCaret);

  /**
   * PrepareToDeleteNonCollapsedRange() considers left block element and
   * right block element which are inclusive ancestor block element of
   * start and end container of aRangeToDelete
   *
   * @param aHTMLEditor               The HTML editor.
   * @param aRangeToDelete            The range to delete.  Must not be
   *                                  collapsed.
   * @param aEditingHost              The editing host.
   * @return                          true if can continue to handle the
   *                                  deletion.
   */
  [[nodiscard]] bool PrepareToDeleteNonCollapsedRange(
      const HTMLEditor& aHTMLEditor, const nsRange& aRangeToDelete,
      const Element& aEditingHost);

  /**
   * Run() executes the joining.
   *
   * @param aHTMLEditor               The HTML editor.
   * @param aDirectionAndAmount       Direction of the deletion.
   * @param aStripWrappers            Must be eStrip or eNoStrip.
   * @param aCaretPoint               The caret point (i.e., selection start
   *                                  or end).
   * @param aRangeToDelete            The range to delete.  This should be
   *                                  collapsed and match with aCaretPoint.
   */
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<EditActionResult, nsresult> Run(
      HTMLEditor& aHTMLEditor, nsIEditor::EDirection aDirectionAndAmount,
      nsIEditor::EStripWrappers aStripWrappers,
      const EditorDOMPoint& aCaretPoint, nsRange& aRangeToDelete,
      const Element& aEditingHost);

  nsresult ComputeRangeToDelete(const HTMLEditor& aHTMLEditor,
                                nsIEditor::EDirection aDirectionAndAmount,
                                const EditorDOMPoint& aCaretPoint,
                                nsRange& aRangeToDelete,
                                const Element& aEditingHost) const;

  /**
   * Run() executes the joining.
   *
   * @param aHTMLEditor               The HTML editor.
   * @param aLimitersAndCaretData     The data copied from nsFrameSelection.
   * @param aDirectionAndAmount       Direction of the deletion.
   * @param aStripWrappers            Whether delete or keep new empty
   *                                  ancestor elements.
   * @param aRangeToDelete            The range to delete.  Must not be
   *                                  collapsed.
   * @param aSelectionWasCollapsed    Whether selection was or was not
   *                                  collapsed when starting to handle
   *                                  deletion.
   */
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<EditActionResult, nsresult> Run(
      HTMLEditor& aHTMLEditor,
      const LimitersAndCaretData& aLimitersAndCaretData,
      nsIEditor::EDirection aDirectionAndAmount,
      nsIEditor::EStripWrappers aStripWrappers, nsRange& aRangeToDelete,
      AutoDeleteRangesHandler::SelectionWasCollapsed aSelectionWasCollapsed,
      const Element& aEditingHost);

  nsresult ComputeRangeToDelete(
      const HTMLEditor& aHTMLEditor,
      const AutoClonedSelectionRangeArray& aRangesToDelete,
      nsIEditor::EDirection aDirectionAndAmount, nsRange& aRangeToDelete,
      AutoDeleteRangesHandler::SelectionWasCollapsed aSelectionWasCollapsed,
      const Element& aEditingHost) const;

  [[nodiscard]] nsIContent* GetLeafContentInOtherBlockElement() const {
    MOZ_ASSERT(mMode == Mode::JoinOtherBlock);
    return mLeafContentInOtherBlock;
  }

 private:
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<EditActionResult, nsresult>
  HandleDeleteAtCurrentBlockBoundary(HTMLEditor& aHTMLEditor,
                                     nsIEditor::EDirection aDirectionAndAmount,
                                     const EditorDOMPoint& aCaretPoint,
                                     const Element& aEditingHost);
  nsresult ComputeRangeToDeleteAtCurrentBlockBoundary(
      const HTMLEditor& aHTMLEditor, const EditorDOMPoint& aCaretPoint,
      nsRange& aRangeToDelete, const Element& aEditingHost) const;
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<EditActionResult, nsresult>
  HandleDeleteAtOtherBlockBoundary(HTMLEditor& aHTMLEditor,
                                   nsIEditor::EDirection aDirectionAndAmount,
                                   nsIEditor::EStripWrappers aStripWrappers,
                                   const EditorDOMPoint& aCaretPoint,
                                   nsRange& aRangeToDelete,
                                   const Element& aEditingHost);
  // FYI: This method may modify selection, but it won't cause running
  //      script because of `AutoHideSelectionChanges` which blocks
  //      selection change listeners and the selection change event
  //      dispatcher.
  MOZ_CAN_RUN_SCRIPT_BOUNDARY nsresult ComputeRangeToDeleteAtOtherBlockBoundary(
      const HTMLEditor& aHTMLEditor, nsIEditor::EDirection aDirectionAndAmount,
      const EditorDOMPoint& aCaretPoint, nsRange& aRangeToDelete,
      const Element& aEditingHost) const;
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<EditActionResult, nsresult>
  JoinBlockElementsInSameParent(
      HTMLEditor& aHTMLEditor,
      const LimitersAndCaretData& aLimitersAndCaretData,
      nsIEditor::EDirection aDirectionAndAmount,
      nsIEditor::EStripWrappers aStripWrappers, nsRange& aRangeToDelete,
      AutoDeleteRangesHandler::SelectionWasCollapsed aSelectionWasCollapsed,
      const Element& aEditingHost);
  nsresult ComputeRangeToJoinBlockElementsInSameParent(
      const HTMLEditor& aHTMLEditor, nsIEditor::EDirection aDirectionAndAmount,
      nsRange& aRangeToDelete, const Element& aEditingHost) const;
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<EditActionResult, nsresult>
  HandleDeleteLineBreak(HTMLEditor& aHTMLEditor,
                        nsIEditor::EDirection aDirectionAndAmount,
                        const EditorDOMPoint& aCaretPoint,
                        const Element& aEditingHost);
  enum class ComputeRangeFor : bool { GetTargetRanges, ToDeleteTheRange };
  nsresult ComputeRangeToDeleteLineBreak(
      const HTMLEditor& aHTMLEditor, nsRange& aRangeToDelete,
      const Element& aEditingHost, ComputeRangeFor aComputeRangeFor) const;
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<EditActionResult, nsresult>
  DeleteContentInRange(HTMLEditor& aHTMLEditor,
                       const LimitersAndCaretData& aLimitersAndCaretData,
                       nsIEditor::EDirection aDirectionAndAmount,
                       nsIEditor::EStripWrappers aStripWrappers,
                       nsRange& aRangeToDelete, const Element& aEditingHost);
  nsresult ComputeRangeToDeleteContentInRange(
      const HTMLEditor& aHTMLEditor, nsIEditor::EDirection aDirectionAndAmount,
      nsRange& aRange, const Element& aEditingHost) const;
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<EditActionResult, nsresult>
  HandleDeleteNonCollapsedRange(
      HTMLEditor& aHTMLEditor, nsIEditor::EDirection aDirectionAndAmount,
      nsIEditor::EStripWrappers aStripWrappers, nsRange& aRangeToDelete,
      AutoDeleteRangesHandler::SelectionWasCollapsed aSelectionWasCollapsed,
      const Element& aEditingHost);
  nsresult ComputeRangeToDeleteNonCollapsedRange(
      const HTMLEditor& aHTMLEditor, nsIEditor::EDirection aDirectionAndAmount,
      nsRange& aRangeToDelete,
      AutoDeleteRangesHandler::SelectionWasCollapsed aSelectionWasCollapsed,
      const Element& aEditingHost) const;

  /**
   * JoinNodesDeepWithTransaction() joins aLeftNode and aRightNode "deeply".
   * First, they are joined simply, then, new right node is assumed as the
   * child at length of the left node before joined and new left node is
   * assumed as its previous sibling.  Then, they will be joined again.
   * And then, these steps are repeated.
   *
   * @param aLeftContent    The node which will be removed form the tree.
   * @param aRightContent   The node which will be inserted the contents of
   *                        aRightContent.
   * @return                The point of the first child of the last right
   * node. The result is always set if this succeeded.
   */
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<EditorDOMPoint, nsresult>
  JoinNodesDeepWithTransaction(HTMLEditor& aHTMLEditor,
                               nsIContent& aLeftContent,
                               nsIContent& aRightContent);

  enum class PutCaretTo : bool { StartOfRange, EndOfRange };

  /**
   * DeleteNodesEntirelyInRangeButKeepTableStructure() removes each node in
   * aArrayOfContent.  However, if some nodes are part of a table, removes all
   * children of them instead.  I.e., this does not make damage to table
   * structure at the range, but may remove table entirely if it's in the
   * range.
   */
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<DeleteRangeResult, nsresult>
  DeleteNodesEntirelyInRangeButKeepTableStructure(
      HTMLEditor& aHTMLEditor,
      const nsTArray<OwningNonNull<nsIContent>>& aArrayOfContent,
      PutCaretTo aPutCaretTo);
  [[nodiscard]] bool
  NeedsToJoinNodesAfterDeleteNodesEntirelyInRangeButKeepTableStructure(
      const HTMLEditor& aHTMLEditor,
      const nsTArray<OwningNonNull<nsIContent>>& aArrayOfContents,
      AutoDeleteRangesHandler::SelectionWasCollapsed aSelectionWasCollapsed)
      const;
  Result<bool, nsresult>
  ComputeRangeToDeleteNodesEntirelyInRangeButKeepTableStructure(
      const HTMLEditor& aHTMLEditor, nsRange& aRange,
      AutoDeleteRangesHandler::SelectionWasCollapsed aSelectionWasCollapsed)
      const;

  /**
   * DeleteContentButKeepTableStructure() removes aContent if it's an element
   * which is part of a table structure.  If it's a part of table structure,
   * removes its all children recursively.  I.e., this may delete all of a
   * table, but won't break table structure partially.
   *
   * @param aContent            The content which or whose all children should
   *                            be removed.
   */
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<DeleteRangeResult, nsresult>
  DeleteContentButKeepTableStructure(HTMLEditor& aHTMLEditor,
                                     nsIContent& aContent);

  /**
   * DeleteTextAtStartAndEndOfRange() removes text if start and/or end of
   * aRange is in a text node.
   */
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<DeleteRangeResult, nsresult>
  DeleteTextAtStartAndEndOfRange(HTMLEditor& aHTMLEditor, nsRange& aRange,
                                 PutCaretTo aPutCaretTo);

  /**
   * Return a block element which is an inclusive ancestor of the container of
   * aPoint if aPoint is start of ancestor blocks.  For example, if `<div
   * id=div1>abc<div id=div2><div id=div3>[]def</div></div></div>`, return
   * #div2.
   */
  template <typename EditorDOMPointType>
  [[nodiscard]] static Result<Element*, nsresult>
  GetMostDistantBlockAncestorIfPointIsStartAtBlock(
      const EditorDOMPointType& aPoint, const Element& aEditingHost,
      const Element* aAncestorLimiter = nullptr);

  /**
   * Extend aRangeToDelete to contain new empty inline ancestors and contain
   * an invisible <br> element before right child block which causes an empty
   * line but the range starts after it.
   */
  void ExtendRangeToDeleteNonCollapsedRange(
      const HTMLEditor& aHTMLEditor, nsRange& aRangeToDelete,
      const Element& aEditingHost, ComputeRangeFor aComputeRangeFor) const;

  /**
   * Compute mLeafContentInOtherBlock from the DOM.
   */
  [[nodiscard]] nsIContent* ComputeLeafContentInOtherBlockElement(
      nsIEditor::EDirection aDirectionAndAmount) const;

  class MOZ_STACK_CLASS AutoInclusiveAncestorBlockElementsJoiner;

  enum class Mode {
    NotInitialized,
    JoinCurrentBlock,
    JoinOtherBlock,
    JoinBlocksInSameParent,
    DeleteBRElement,
    // The instance will handle only the <br> element immediately before a
    // block.
    DeletePrecedingBRElementOfBlock,
    // The instance will handle only the preceding preformatted line break
    // before a block.
    DeletePrecedingPreformattedLineBreak,
    DeleteContentInRange,
    DeleteNonCollapsedRange,
    // The instance will handle preceding lines of the right block and content
    // in the range in the right block.
    DeletePrecedingLinesAndContentInRange,
  };
  AutoDeleteRangesHandler* mDeleteRangesHandler;
  const AutoDeleteRangesHandler& mDeleteRangesHandlerConst;
  nsCOMPtr<nsIContent> mLeftContent;
  nsCOMPtr<nsIContent> mRightContent;
  nsCOMPtr<nsIContent> mLeafContentInOtherBlock;
  RefPtr<Element> mOtherBlockElement;
  // mSkippedInvisibleContents stores all content nodes which are skipped at
  // scanning mLeftContent and mRightContent.  The content nodes should be
  // removed at deletion.
  AutoTArray<OwningNonNull<nsIContent>, 8> mSkippedInvisibleContents;
  RefPtr<dom::HTMLBRElement> mBRElement;
  EditorDOMPointInText mPreformattedLineBreak;
  Mode mMode = Mode::NotInitialized;
};

/**
 * Actually handle joining inclusive ancestor block elements.
 */
class MOZ_STACK_CLASS HTMLEditor::AutoDeleteRangesHandler::
    AutoBlockElementsJoiner::AutoInclusiveAncestorBlockElementsJoiner final {
 public:
  AutoInclusiveAncestorBlockElementsJoiner() = delete;
  AutoInclusiveAncestorBlockElementsJoiner(
      nsIContent& aInclusiveDescendantOfLeftBlockElement,
      nsIContent& aInclusiveDescendantOfRightBlockElement)
      : mInclusiveDescendantOfLeftBlockElement(
            aInclusiveDescendantOfLeftBlockElement),
        mInclusiveDescendantOfRightBlockElement(
            aInclusiveDescendantOfRightBlockElement),
        mCanJoinBlocks(false),
        mFallbackToDeleteLeafContent(false) {}

  [[nodiscard]] bool IsSet() const {
    return mLeftBlockElement && mRightBlockElement;
  }
  [[nodiscard]] bool IsSameBlockElement() const {
    return mLeftBlockElement && mLeftBlockElement == mRightBlockElement;
  }

  /**
   * Prepare for joining inclusive ancestor block elements.  When this
   * returns false, the deletion should be canceled.
   */
  [[nodiscard]] Result<bool, nsresult> Prepare(const HTMLEditor& aHTMLEditor,
                                               const Element& aEditingHost);

  /**
   * When this returns true, this can join the blocks with `Run()`.
   */
  [[nodiscard]] bool CanJoinBlocks() const { return mCanJoinBlocks; }

  /**
   * When this returns true, `Run()` must return "ignored" so that
   * caller can skip calling `Run()`.  This is available only when
   * `CanJoinBlocks()` returns `true`.
   * TODO: This should be merged into `CanJoinBlocks()` in the future.
   */
  [[nodiscard]] bool ShouldDeleteLeafContentInstead() const {
    MOZ_ASSERT(CanJoinBlocks());
    return mFallbackToDeleteLeafContent;
  }

  /**
   * ComputeRangesToDelete() extends aRangeToDelete includes the element
   * boundaries between joining blocks.  If they won't be joined, this
   * collapses the range to aCaretPoint.
   */
  [[nodiscard]] nsresult ComputeRangeToDelete(const HTMLEditor& aHTMLEditor,
                                              const EditorDOMPoint& aCaretPoint,
                                              nsRange& aRangeToDelete) const;

  /**
   * Join inclusive ancestor block elements which are found by preceding
   * Prepare() call.
   * The right element is always joined to the left element.
   * If the elements are the same type and not nested within each other,
   * JoinEditableNodesWithTransaction() is called (example, joining two
   * list items together into one).
   * If the elements are not the same type, or one is a descendant of the
   * other, we instead destroy the right block placing its children into
   * left block.
   */
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<DeleteRangeResult, nsresult> Run(
      HTMLEditor& aHTMLEditor, const Element& aEditingHost);

 private:
  /**
   * This method returns true when
   * `MergeFirstLineOfRightBlockElementIntoDescendantLeftBlockElement()`,
   * `MergeFirstLineOfRightBlockElementIntoAncestorLeftBlockElement()` and
   * `MergeFirstLineOfRightBlockElementIntoLeftBlockElement()` handle it
   * with the `if` block of the main lambda of them.
   */
  [[nodiscard]] bool CanMergeLeftAndRightBlockElements() const {
    if (!IsSet()) {
      return false;
    }
    // `MergeFirstLineOfRightBlockElementIntoDescendantLeftBlockElement()`
    if (mPointContainingTheOtherBlockElement.GetContainer() ==
        mRightBlockElement) {
      return mNewListElementTagNameOfRightListElement.isSome();
    }
    // `MergeFirstLineOfRightBlockElementIntoAncestorLeftBlockElement()`
    if (mPointContainingTheOtherBlockElement.GetContainer() ==
        mLeftBlockElement) {
      return mNewListElementTagNameOfRightListElement.isSome() &&
             mRightBlockElement->GetChildCount();
    }
    MOZ_ASSERT(!mPointContainingTheOtherBlockElement.IsSet());
    // `MergeFirstLineOfRightBlockElementIntoLeftBlockElement()`
    return mNewListElementTagNameOfRightListElement.isSome() ||
           (mLeftBlockElement->NodeInfo()->NameAtom() ==
                mRightBlockElement->NodeInfo()->NameAtom() &&
            EditorUtils::GetComputedWhiteSpaceStyles(*mLeftBlockElement) ==
                EditorUtils::GetComputedWhiteSpaceStyles(*mRightBlockElement));
  }

  OwningNonNull<nsIContent> mInclusiveDescendantOfLeftBlockElement;
  OwningNonNull<nsIContent> mInclusiveDescendantOfRightBlockElement;
  RefPtr<Element> mLeftBlockElement;
  RefPtr<Element> mRightBlockElement;
  Maybe<nsAtom*> mNewListElementTagNameOfRightListElement;
  EditorDOMPoint mPointContainingTheOtherBlockElement;
  RefPtr<dom::HTMLBRElement> mPrecedingInvisibleBRElement;
  bool mCanJoinBlocks;
  bool mFallbackToDeleteLeafContent;
};

/**
 * Handle deleting empty block ancestors.
 */
class MOZ_STACK_CLASS
HTMLEditor::AutoDeleteRangesHandler::AutoEmptyBlockAncestorDeleter final {
 public:
  /**
   * ScanEmptyBlockInclusiveAncestor() scans an inclusive ancestor element
   * which is empty and a block element.  Then, stores the result and
   * returns the found empty block element.
   *
   * @param aHTMLEditor         The HTMLEditor.
   * @param aStartContent       Start content to look for empty ancestors.
   */
  [[nodiscard]] Element* ScanEmptyBlockInclusiveAncestor(
      const HTMLEditor& aHTMLEditor, nsIContent& aStartContent);

  /**
   * ComputeTargetRanges() computes "target ranges" for deleting
   * `mEmptyInclusiveAncestorBlockElement`.
   */
  nsresult ComputeTargetRanges(
      const HTMLEditor& aHTMLEditor, nsIEditor::EDirection aDirectionAndAmount,
      const Element& aEditingHost,
      AutoClonedSelectionRangeArray& aRangesToDelete) const;

  /**
   * Deletes found empty block element by `ScanEmptyBlockInclusiveAncestor()`.
   * If found one is a list item element, calls
   * `MaybeInsertBRElementBeforeEmptyListItemElement()` before deleting
   * the list item element.
   * If found empty ancestor is not a list item element,
   * `GetNewCaretPosition()` will be called to determine new caret position.
   * Finally, removes the empty block ancestor.
   *
   * @param aHTMLEditor         The HTMLEditor.
   * @param aDirectionAndAmount If found empty ancestor block is a list item
   *                            element, this is ignored.  Otherwise:
   *                            - If eNext, eNextWord or eToEndOfLine,
   *                              collapse Selection to after found empty
   *                              ancestor.
   *                            - If ePrevious, ePreviousWord or
   *                              eToBeginningOfLine, collapse Selection to
   *                              end of previous editable node.
   *                            - Otherwise, eNone is allowed but does
   *                              nothing.
   * @param aEditingHost        The editing host.
   */
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<DeleteRangeResult, nsresult> Run(
      HTMLEditor& aHTMLEditor, nsIEditor::EDirection aDirectionAndAmount,
      const Element& aEditingHost);

 private:
  /**
   * MaybeReplaceSubListWithNewListItem() replaces
   * mEmptyInclusiveAncestorBlockElement with new list item element
   * (containing <br>) if:
   * - mEmptyInclusiveAncestorBlockElement is a list element
   * - The parent of mEmptyInclusiveAncestorBlockElement is a list element
   * - The parent becomes empty after deletion
   * If this does not perform the replacement, returns "ignored".
   */
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<DeleteRangeResult, nsresult>
  MaybeReplaceSubListWithNewListItem(HTMLEditor& aHTMLEditor);

  /**
   * MaybeInsertBRElementBeforeEmptyListItemElement() inserts a `<br>` element
   * if `mEmptyInclusiveAncestorBlockElement` is a list item element which
   * is first editable element in its parent, and its grand parent is not a
   * list element, inserts a `<br>` element before the empty list item.
   */
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<CreateLineBreakResult, nsresult>
  MaybeInsertBRElementBeforeEmptyListItemElement(HTMLEditor& aHTMLEditor);

  /**
   * GetNewCaretPosition() returns new caret position after deleting
   * `mEmptyInclusiveAncestorBlockElement`.
   */
  [[nodiscard]] Result<CaretPoint, nsresult> GetNewCaretPosition(
      const HTMLEditor& aHTMLEditor, nsIEditor::EDirection aDirectionAndAmount,
      const Element& aEditingHost) const;

  RefPtr<Element> mEmptyInclusiveAncestorBlockElement;
};

/******************************************************************************
 * NormalizedStringToInsertText stores normalized insertion string with
 * normalized surrounding white-spaces if the insertion point is surrounded by
 * collapsible white-spaces.  For deleting invisible (collapsed) white-spaces,
 * this also stores the replace range and new white-space length before and
 * after the inserting text.
 ******************************************************************************/

struct MOZ_STACK_CLASS HTMLEditor::NormalizedStringToInsertText final {
  NormalizedStringToInsertText(
      const nsAString& aStringToInsertWithoutSurroundingWhiteSpaces,
      const EditorDOMPoint& aPointToInsert)
      : mNormalizedString(aStringToInsertWithoutSurroundingWhiteSpaces),
        mReplaceStartOffset(
            aPointToInsert.IsInTextNode() ? aPointToInsert.Offset() : 0u),
        mReplaceEndOffset(mReplaceStartOffset) {
    MOZ_ASSERT(aStringToInsertWithoutSurroundingWhiteSpaces.Length() ==
               InsertingTextLength());
  }

  NormalizedStringToInsertText(
      const nsAString& aStringToInsertWithSurroundingWhiteSpaces,
      uint32_t aInsertOffset, uint32_t aReplaceStartOffset,
      uint32_t aReplaceLength,
      uint32_t aNewPrecedingWhiteSpaceLengthBeforeInsertionString,
      uint32_t aNewFollowingWhiteSpaceLengthAfterInsertionString)
      : mNormalizedString(aStringToInsertWithSurroundingWhiteSpaces),
        mReplaceStartOffset(aReplaceStartOffset),
        mReplaceEndOffset(mReplaceStartOffset + aReplaceLength),
        mReplaceLengthBefore(aInsertOffset - mReplaceStartOffset),
        mReplaceLengthAfter(aReplaceLength - mReplaceLengthBefore),
        mNewLengthBefore(aNewPrecedingWhiteSpaceLengthBeforeInsertionString),
        mNewLengthAfter(aNewFollowingWhiteSpaceLengthAfterInsertionString) {
    MOZ_ASSERT(aReplaceStartOffset <= aInsertOffset);
    MOZ_ASSERT(aReplaceStartOffset + aReplaceLength >= aInsertOffset);
    MOZ_ASSERT(aNewPrecedingWhiteSpaceLengthBeforeInsertionString +
                   aNewFollowingWhiteSpaceLengthAfterInsertionString <
               mNormalizedString.Length());
    MOZ_ASSERT(mReplaceLengthBefore + mReplaceLengthAfter == ReplaceLength());
    MOZ_ASSERT(mReplaceLengthBefore >= mNewLengthBefore);
    MOZ_ASSERT(mReplaceLengthAfter >= mNewLengthAfter);
  }

  NormalizedStringToInsertText GetMinimizedData(const Text& aText) const {
    if (mNormalizedString.IsEmpty() || !ReplaceLength()) {
      return *this;
    }
    const dom::CharacterDataBuffer& characterDataBuffer = aText.DataBuffer();
    const uint32_t minimizedReplaceStart = [&]() {
      const auto firstDiffCharOffset =
          mNewLengthBefore ? characterDataBuffer.FindFirstDifferentCharOffset(
                                 PrecedingWhiteSpaces(), mReplaceStartOffset)
                           : dom::CharacterDataBuffer::kNotFound;
      if (firstDiffCharOffset == dom::CharacterDataBuffer::kNotFound) {
        return
            // We don't need to insert new normalized white-spaces before the
            // inserting string,
            (mReplaceStartOffset + mReplaceLengthBefore)
            // but keep extending the replacing range for deleting invisible
            // white-spaces.
            - DeletingPrecedingInvisibleWhiteSpaces();
      }
      return firstDiffCharOffset;
    }();
    const uint32_t minimizedReplaceEnd = [&]() {
      const auto lastDiffCharOffset =
          mNewLengthAfter ? characterDataBuffer.RFindFirstDifferentCharOffset(
                                FollowingWhiteSpaces(), mReplaceEndOffset)
                          : dom::CharacterDataBuffer::kNotFound;
      if (lastDiffCharOffset == dom::CharacterDataBuffer::kNotFound) {
        return
            // We don't need to insert new normalized white-spaces after the
            // inserting string,
            (mReplaceEndOffset - mReplaceLengthAfter)
            // but keep extending the replacing range for deleting invisible
            // white-spaces.
            + DeletingFollowingInvisibleWhiteSpaces();
      }
      return lastDiffCharOffset + 1u;
    }();
    if (minimizedReplaceStart == mReplaceStartOffset &&
        minimizedReplaceEnd == mReplaceEndOffset) {
      return *this;
    }
    const uint32_t newPrecedingWhiteSpaceLength =
        mNewLengthBefore - (minimizedReplaceStart - mReplaceStartOffset);
    const uint32_t newFollowingWhiteSpaceLength =
        mNewLengthAfter - (mReplaceEndOffset - minimizedReplaceEnd);
    return NormalizedStringToInsertText(
        Substring(mNormalizedString,
                  mNewLengthBefore - newPrecedingWhiteSpaceLength,
                  mNormalizedString.Length() -
                      (mNewLengthBefore - newPrecedingWhiteSpaceLength) -
                      (mNewLengthAfter - newFollowingWhiteSpaceLength)),
        OffsetToInsertText(), minimizedReplaceStart,
        minimizedReplaceEnd - minimizedReplaceStart,
        newPrecedingWhiteSpaceLength, newFollowingWhiteSpaceLength);
  }

  /**
   * Return offset to insert the given text.
   */
  [[nodiscard]] uint32_t OffsetToInsertText() const {
    return mReplaceStartOffset + mReplaceLengthBefore;
  }

  /**
   * Return inserting text length not containing the surrounding white-spaces.
   */
  [[nodiscard]] uint32_t InsertingTextLength() const {
    return mNormalizedString.Length() - mNewLengthBefore - mNewLengthAfter;
  }

  /**
   * Return end offset of inserted string after replacing the text with
   * mNormalizedString.
   */
  [[nodiscard]] uint32_t EndOffsetOfInsertedText() const {
    return OffsetToInsertText() + InsertingTextLength();
  }

  /**
   * Return the length to replace with mNormalizedString.  The result means that
   * it's the length of surrounding white-spaces at the insertion point.
   */
  [[nodiscard]] uint32_t ReplaceLength() const {
    return mReplaceEndOffset - mReplaceStartOffset;
  }

  [[nodiscard]] uint32_t DeletingPrecedingInvisibleWhiteSpaces() const {
    return mReplaceLengthBefore - mNewLengthBefore;
  }
  [[nodiscard]] uint32_t DeletingFollowingInvisibleWhiteSpaces() const {
    return mReplaceLengthAfter - mNewLengthAfter;
  }

  [[nodiscard]] nsDependentSubstring PrecedingWhiteSpaces() const {
    return Substring(mNormalizedString, 0u, mNewLengthBefore);
  }
  [[nodiscard]] nsDependentSubstring FollowingWhiteSpaces() const {
    return Substring(mNormalizedString,
                     mNormalizedString.Length() - mNewLengthAfter);
  }

  // Normalizes string which should be inserted.
  nsAutoString mNormalizedString;
  // Start offset in the `Text` to replace.
  const uint32_t mReplaceStartOffset;
  // End offset in the `Text` to replace.
  const uint32_t mReplaceEndOffset;
  // If it needs to replace preceding and/or following white-spaces, these
  // members store the length of white-spaces which should be replaced
  // before/after the insertion point.
  const uint32_t mReplaceLengthBefore = 0u;
  const uint32_t mReplaceLengthAfter = 0u;
  // If it needs to replace preceding and/or following white-spaces, these
  // members store the new length of white-spaces before/after the insertion
  // string.
  const uint32_t mNewLengthBefore = 0u;
  const uint32_t mNewLengthAfter = 0u;
};

/******************************************************************************
 * ReplaceWhiteSpacesData stores normalized string to replace white-spaces in
 * a `Text`.  If ReplaceLength() returns 0, this user needs to do nothing.
 ******************************************************************************/

struct MOZ_STACK_CLASS HTMLEditor::ReplaceWhiteSpacesData final {
  ReplaceWhiteSpacesData() = default;

  /**
   * @param aWhiteSpaces        The new white-spaces which we will replace the
   *                            range with.
   * @param aStartOffset        Replace start offset in the text node.
   * @param aReplaceLength      Replace length in the text node.
   * @param aOffsetAfterReplacing
   *                            [optional] If the caller may want to put caret
   *                            middle of the white-spaces, the offset may be
   *                            changed by deleting some invisible white-spaces.
   *                            Therefore, this may be set for the purpose.
   */
  ReplaceWhiteSpacesData(const nsAString& aWhiteSpaces, uint32_t aStartOffset,
                         uint32_t aReplaceLength,
                         uint32_t aOffsetAfterReplacing = UINT32_MAX)
      : mNormalizedString(aWhiteSpaces),
        mReplaceStartOffset(aStartOffset),
        mReplaceEndOffset(aStartOffset + aReplaceLength),
        mNewOffsetAfterReplace(aOffsetAfterReplacing) {
    MOZ_ASSERT(ReplaceLength() >= mNormalizedString.Length());
    MOZ_ASSERT_IF(mNewOffsetAfterReplace != UINT32_MAX,
                  mNewOffsetAfterReplace <=
                      mReplaceStartOffset + mNormalizedString.Length());
  }

  /**
   * @param aWhiteSpaces        The new white-spaces which we will replace the
   *                            range with.
   * @param aStartOffset        Replace start offset in the text node.
   * @param aReplaceLength      Replace length in the text node.
   * @param aOffsetAfterReplacing
   *                            [optional] If the caller may want to put caret
   *                            middle of the white-spaces, the offset may be
   *                            changed by deleting some invisible white-spaces.
   *                            Therefore, this may be set for the purpose.
   */
  ReplaceWhiteSpacesData(nsAutoString&& aWhiteSpaces, uint32_t aStartOffset,
                         uint32_t aReplaceLength,
                         uint32_t aOffsetAfterReplacing = UINT32_MAX)
      : mNormalizedString(std::forward<nsAutoString>(aWhiteSpaces)),
        mReplaceStartOffset(aStartOffset),
        mReplaceEndOffset(aStartOffset + aReplaceLength),
        mNewOffsetAfterReplace(aOffsetAfterReplacing) {
    MOZ_ASSERT(ReplaceLength() >= mNormalizedString.Length());
    MOZ_ASSERT_IF(mNewOffsetAfterReplace != UINT32_MAX,
                  mNewOffsetAfterReplace <=
                      mReplaceStartOffset + mNormalizedString.Length());
  }

  ReplaceWhiteSpacesData GetMinimizedData(const Text& aText) const {
    if (!ReplaceLength()) {
      return *this;
    }
    const dom::CharacterDataBuffer& characterDataBuffer = aText.DataBuffer();
    const auto minimizedReplaceStart = [&]() -> uint32_t {
      if (mNormalizedString.IsEmpty()) {
        return mReplaceStartOffset;
      }
      const uint32_t firstDiffCharOffset =
          characterDataBuffer.FindFirstDifferentCharOffset(mNormalizedString,
                                                           mReplaceStartOffset);
      if (firstDiffCharOffset == dom::CharacterDataBuffer::kNotFound) {
        // We don't need to insert new white-spaces,
        return mReplaceStartOffset + mNormalizedString.Length();
      }
      return firstDiffCharOffset;
    }();
    const auto minimizedReplaceEnd = [&]() -> uint32_t {
      if (mNormalizedString.IsEmpty()) {
        return mReplaceEndOffset;
      }
      if (minimizedReplaceStart ==
          mReplaceStartOffset + mNormalizedString.Length()) {
        // Note that here may be invisible white-spaces before
        // mReplaceEndOffset.  Then, this value may be larger than
        // minimizedReplaceStart.
        MOZ_ASSERT(mReplaceEndOffset >= minimizedReplaceStart);
        return mReplaceEndOffset;
      }
      if (ReplaceLength() != mNormalizedString.Length()) {
        // If we're deleting some invisible white-spaces, don't shrink the end
        // of the replacing range because it may shrink mNormalizedString too
        // much.
        return mReplaceEndOffset;
      }
      const auto lastDiffCharOffset =
          characterDataBuffer.RFindFirstDifferentCharOffset(mNormalizedString,
                                                            mReplaceEndOffset);
      MOZ_ASSERT(lastDiffCharOffset != dom::CharacterDataBuffer::kNotFound);
      return lastDiffCharOffset == dom::CharacterDataBuffer::kNotFound
                 ? mReplaceEndOffset
                 : lastDiffCharOffset + 1u;
    }();
    if (minimizedReplaceStart == mReplaceStartOffset &&
        minimizedReplaceEnd == mReplaceEndOffset) {
      return *this;
    }
    const uint32_t precedingUnnecessaryLength =
        minimizedReplaceStart - mReplaceStartOffset;
    const uint32_t followingUnnecessaryLength =
        mReplaceEndOffset - minimizedReplaceEnd;
    return ReplaceWhiteSpacesData(
        Substring(mNormalizedString, precedingUnnecessaryLength,
                  mNormalizedString.Length() - (precedingUnnecessaryLength +
                                                followingUnnecessaryLength)),
        minimizedReplaceStart, minimizedReplaceEnd - minimizedReplaceStart,
        mNewOffsetAfterReplace);
  }

  /**
   * Return the normalized string before mNewOffsetAfterReplace.  So,
   * mNewOffsetAfterReplace must not be UINT32_MAX and in the replaced range
   * when this is called.
   *
   * @param aReplaceEndOffset   Specify the offset in the Text node of
   *                            mNewOffsetAfterReplace before replacing with the
   *                            data.
   * @return The substring before mNewOffsetAfterReplace which is typically set
   * for new caret position in the Text node or collapsed deleting range
   * surrounded by the white-spaces.
   */
  [[nodiscard]] ReplaceWhiteSpacesData PreviousDataOfNewOffset(
      uint32_t aReplaceEndOffset) const {
    MOZ_ASSERT(mNewOffsetAfterReplace != UINT32_MAX);
    MOZ_ASSERT(mReplaceStartOffset <= mNewOffsetAfterReplace);
    MOZ_ASSERT(mReplaceEndOffset >= mNewOffsetAfterReplace);
    MOZ_ASSERT(mReplaceStartOffset <= aReplaceEndOffset);
    MOZ_ASSERT(mReplaceEndOffset >= aReplaceEndOffset);
    if (!ReplaceLength() || aReplaceEndOffset == mReplaceStartOffset) {
      return ReplaceWhiteSpacesData();
    }
    return ReplaceWhiteSpacesData(
        Substring(mNormalizedString, 0u,
                  mNewOffsetAfterReplace - mReplaceStartOffset),
        mReplaceStartOffset, aReplaceEndOffset - mReplaceStartOffset);
  }

  /**
   * Return the normalized string after mNewOffsetAfterReplace.  So,
   * mNewOffsetAfterReplace must not be UINT32_MAX and in the replaced range
   * when this is called.
   *
   * @param aReplaceStartOffset Specify the replace start offset with the
   *                            normalized white-spaces.
   * @return The substring after mNewOffsetAfterReplace which is typically set
   * for new caret position in the Text node or collapsed deleting range
   * surrounded by the white-spaces.
   */
  [[nodiscard]] ReplaceWhiteSpacesData NextDataOfNewOffset(
      uint32_t aReplaceStartOffset) const {
    MOZ_ASSERT(mNewOffsetAfterReplace != UINT32_MAX);
    MOZ_ASSERT(mReplaceStartOffset <= mNewOffsetAfterReplace);
    MOZ_ASSERT(mReplaceEndOffset >= mNewOffsetAfterReplace);
    MOZ_ASSERT(mReplaceStartOffset <= aReplaceStartOffset);
    MOZ_ASSERT(mReplaceEndOffset >= aReplaceStartOffset);
    if (!ReplaceLength() || aReplaceStartOffset == mReplaceEndOffset) {
      return ReplaceWhiteSpacesData();
    }
    return ReplaceWhiteSpacesData(
        Substring(mNormalizedString,
                  mNewOffsetAfterReplace - mReplaceStartOffset),
        aReplaceStartOffset, mReplaceEndOffset - aReplaceStartOffset);
  }

  [[nodiscard]] uint32_t ReplaceLength() const {
    return mReplaceEndOffset - mReplaceStartOffset;
  }
  [[nodiscard]] uint32_t DeletingInvisibleWhiteSpaces() const {
    return ReplaceLength() - mNormalizedString.Length();
  }

  [[nodiscard]] ReplaceWhiteSpacesData operator+(
      const ReplaceWhiteSpacesData& aOther) const {
    if (!ReplaceLength()) {
      return aOther;
    }
    if (!aOther.ReplaceLength()) {
      return *this;
    }
    MOZ_ASSERT(mReplaceEndOffset == aOther.mReplaceStartOffset);
    MOZ_ASSERT_IF(
        aOther.mNewOffsetAfterReplace != UINT32_MAX,
        aOther.mNewOffsetAfterReplace >= DeletingInvisibleWhiteSpaces());
    return ReplaceWhiteSpacesData(
        nsAutoString(mNormalizedString + aOther.mNormalizedString),
        mReplaceStartOffset, aOther.mReplaceEndOffset,
        aOther.mNewOffsetAfterReplace != UINT32_MAX
            ? aOther.mNewOffsetAfterReplace - DeletingInvisibleWhiteSpaces()
            : mNewOffsetAfterReplace);
  }

  nsAutoString mNormalizedString;
  const uint32_t mReplaceStartOffset = 0u;
  const uint32_t mReplaceEndOffset = 0u;
  // If the caller specifies a point in a white-space sequence, some invisible
  // white-spaces will be deleted with replacing them with normalized string.
  // Then, they may want to keep the position for putting caret or something.
  // So, this may store a specific offset in the text node after replacing.
  const uint32_t mNewOffsetAfterReplace = UINT32_MAX;
};

/******************************************************************************
 * A runnable to run HTMLEditor::OnModifiedDocument when it's safe.
 ******************************************************************************/

class HTMLEditor::DocumentModifiedEvent final : public Runnable {
 public:
  explicit DocumentModifiedEvent(HTMLEditor& aHTMLEditor)
      : Runnable("DocumentModifiedEvent"), mHTMLEditor(aHTMLEditor) {}

  MOZ_CAN_RUN_SCRIPT_BOUNDARY NS_IMETHOD Run() {
    (void)MOZ_KnownLive(mHTMLEditor)->OnModifyDocument(*this);
    return NS_OK;
  }

  const nsTArray<EditorDOMPointInText>& NewInvisibleWhiteSpacesRef() const {
    return mNewInvisibleWhiteSpaces;
  }

 private:
  ~DocumentModifiedEvent() = default;

  const OwningNonNull<HTMLEditor> mHTMLEditor;
  nsTArray<EditorDOMPointInText> mNewInvisibleWhiteSpaces;
};

}  // namespace mozilla

#endif  // #ifndef HTMLEditorNestedClasses_h
