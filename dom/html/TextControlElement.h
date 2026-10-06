/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_TextControlElement_h
#define mozilla_TextControlElement_h

#include "mozilla/Attributes.h"
#include "mozilla/dom/FromParser.h"
#include "mozilla/dom/NodeInfo.h"
#include "nsGenericHTMLElement.h"

class nsIContent;
class nsISelectionController;
class nsFrameSelection;
class nsTextControlFrame;

namespace mozilla {

class ErrorResult;
class TextControlState;
class TextEditor;

/**
 * This abstract class is used for the text control frame to get the editor and
 * selection controller objects, and some helper properties.
 */
class TextControlElement : public nsGenericHTMLFormControlElementWithState {
 public:
  TextControlElement(already_AddRefed<dom::NodeInfo> aNodeInfo,
                     dom::FromParser aFromParser, FormControlType aType)
      : nsGenericHTMLFormControlElementWithState(std::move(aNodeInfo),
                                                 aFromParser, aType) {};

  NS_DECL_ISUPPORTS_INHERITED
  NS_DECL_CYCLE_COLLECTION_CLASS_INHERITED(
      TextControlElement, nsGenericHTMLFormControlElementWithState)

  /**
   * Return true always, i.e., even if this is an <input> but the type is not
   * for a single line text control, this returns true.  Use
   * IsSingleLineTextControlOrTextArea() if you want to know whether this may
   * work with a TextEditor.
   */
  bool IsTextControlElement() const final { return true; }

  bool IsSingleLineTextControlOrTextArea() const {
    return IsSingleLineTextControl() || IsTextArea();
  }

  /**
   * Find out whether this is a single line text control.  (text or password)
   * @return whether this is a single line text control
   */
  bool IsSingleLineTextControl() const {
    return nsGenericHTMLFormControlElement::IsSingleLineTextControl(false);
  }

  NS_IMPL_FROMNODE_HELPER(TextControlElement, IsTextControlElement())

  /**
   * Tell the control that value has been deliberately changed (or not).
   */
  virtual void SetValueChanged(bool) = 0;

  /**
   * Called when this is a single line text control or a <textarea> and will get
   * focus (before dispatching eFocus to the DOM).
   */
  MOZ_CAN_RUN_SCRIPT void WillFocus(const WidgetEvent&);

  /**
   * Called when this is a single line text control or a <textarea> and will
   * blur (before dispatching eBlur to the DOM).
   */
  MOZ_CAN_RUN_SCRIPT void WillBlur(const WidgetEvent&);

  /**
   * Find out whether this control is a textarea.
   * @return whether this is a textarea text control
   */
  bool IsTextArea() const { return mType == FormControlType::Textarea; }

  /**
   * Find out whether this is a password control (input type=password)
   * @return whether this is a password ontrol
   */
  bool IsPasswordTextControl() const {
    return mType == FormControlType::InputPassword;
  }

  /**
   * Get the cols attribute (if textarea) or a default
   * @return the number of columns to use
   */
  virtual Maybe<int32_t> GetCols() = 0;
  int32_t GetColsOrDefault() { return GetCols().valueOr(DEFAULT_COLS); }

  /**
   * Get the column index to wrap at, or -1 if we shouldn't wrap
   */
  virtual int32_t GetWrapCols() = 0;

  /**
   * Get the rows attribute (if textarea) or a default
   * @return the number of rows to use
   */
  virtual int32_t GetRows() = 0;

  /**
   * Get the default value of the text control
   */
  virtual void GetDefaultValueFromContent(nsAString& aValue,
                                          bool aForDisplay) = 0;

  /**
   * Return true if the value of the control has been changed.
   */
  virtual bool ValueChanged() const = 0;

  /**
   * Returns the used maxlength attribute value.
   */
  virtual int32_t UsedMaxLength() const = 0;

  /**
   * Get the current value of the text editor.
   *
   * @param aValue the buffer to retrieve the value in
   */
  virtual void GetTextEditorValue(nsAString& aValue) const = 0;

  /**
   * Get the editor object associated with the text editor.
   * The return value is null if the control does not support an editor
   * (for example, if it is a checkbox.)
   * Note that GetTextEditor() creates editor if it hasn't been created yet.
   * If you need editor only when the editor is there, you should use
   * GetExtantTextEditor().
   */
  MOZ_CAN_RUN_SCRIPT virtual TextEditor* GetTextEditor() = 0;
  virtual TextEditor* GetExtantTextEditor() const = 0;

  /**
   * Get the selection controller object associated with the text editor.
   * The return value is null if the control does not support an editor
   * (for example, if it is a checkbox.)
   */
  virtual nsISelectionController* GetSelectionController() = 0;

  virtual nsFrameSelection* GetIndependentFrameSelection() const = 0;

  virtual TextControlState* GetTextControlState() const = 0;

  /**
   * Update preview value for the text control.
   */
  void SetPreviewValue(const nsAString& aValue);

  /**
   * Get the current preview value for text control.
   */
  void GetPreviewValue(nsAString& aValue);

  /**
   * Enable preview or autofilled state for the text control.
   */
  virtual void SetAutofillState(const nsAString& aState) = 0;

  /**
   * Get the current preview or autofilled state for the text control.
   */
  virtual void GetAutofillState(nsAString& aState) = 0;

  enum class ValueChangeKind {
    Internal,
    Script,
    UserInteraction,
  };

  /**
   * Callback called whenever the value is changed.
   *
   * aKnownNewValue can be used to avoid value lookups if present (might be
   * null, if the caller doesn't know the specific value that got set).
   */
  virtual void OnValueChanged(ValueChangeKind, bool aNewValueEmpty,
                              const nsAString* aKnownNewValue) = 0;

  void OnValueChanged(ValueChangeKind aKind, const nsAString& aNewValue) {
    return OnValueChanged(aKind, aNewValue.IsEmpty(), &aNewValue);
  }

  /**
   * Helpers for value manipulation from SetRangeText.
   */
  virtual void GetValueFromSetRangeText(nsAString& aValue) = 0;
  MOZ_CAN_RUN_SCRIPT virtual nsresult SetValueFromSetRangeText(
      const nsAString& aValue) = 0;

  inline static constexpr int32_t DEFAULT_COLS = 20;
  inline static constexpr int32_t DEFAULT_ROWS = 1;
  inline static constexpr int32_t DEFAULT_ROWS_TEXTAREA = 2;
  inline static constexpr int32_t DEFAULT_UNDO_CAP = 1000;

  /**
   * Does the editor have a selection cache?
   *
   * Note that this function has the side effect of making the editor for input
   * elements be initialized eagerly.
   */
  virtual bool HasCachedSelection() = 0;

  static already_AddRefed<TextControlElement>
  GetTextControlElementFromEditingHost(nsIContent* aHost);

  // Returns the ::-moz-text-control-editing-root pseudo-element if it exists.
  // It always has one text node child.
  Element* GetTextEditorRoot() const;
  // Returns the ::placeholder pseudo-element if it exists.
  // It always has one text node child.
  Element* GetTextEditorPlaceholder() const;
  // Returns the ::-moz-text-control-preview pseudo-element if it exists.
  // It always has one non-empty text node child if it does.
  Element* GetTextEditorPreview() const;
  // Returns the auxiliary button pseudo-element like ::-moz-reveal /
  // ::-moz-search-clear-button / ::-moz-number-spin-box.
  Element* GetTextEditorButton() const;
  // Creates the appropriate button element for this control type, or returns
  // nullptr if none is needed.
  already_AddRefed<Element> CreateButton() const;
  // Returns whether the given PseudoStyleType is one of the button pseudos we
  // create for buttons.
  static bool IsButtonPseudoElement(PseudoStyleType);

  // Updates the text node when not managed by editor.
  void UpdateValueDisplay(bool aNotify);

  enum class ScrollAncestors : bool { No, Yes };
  void ScrollSelectionIntoViewAsync(ScrollAncestors = ScrollAncestors::No);

 protected:
  MOZ_CAN_RUN_SCRIPT void SelectAll();
  MOZ_CAN_RUN_SCRIPT void ShowSelection();
  bool NeedToInitializeEditorForEvent(EventChainPreVisitor&) const;

  void SetupShadowTree(dom::ShadowRoot&, bool aNotify);
  Element* FindShadowPseudo(PseudoStyleType) const;
  void UpdatePlaceholder(const nsAttrValue* aOldValue,
                         const nsAttrValue* aNewValue);
  void UpdateTextEditorShadowTree();

  virtual ~TextControlElement() = default;

  // The focusability state of this form control.  eUnfocusable means that it
  // shouldn't be focused at all, eInactiveWindow means it's in an inactive
  // window, eActiveWindow means it's in an active window.
  enum class FocusTristate { eUnfocusable, eInactiveWindow, eActiveWindow };

  // Get our focus state.
  FocusTristate FocusState();
};

}  // namespace mozilla

#endif  // mozilla_TextControlElement_h
