/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:expandtab:shiftwidth=2:tabstop=2:
 */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

MARKUPMAP(math, New_HyperText, roles::MATHML_MATH)

MARKUPMAP(mi_, New_HyperText, roles::MATHML_IDENTIFIER)

MARKUPMAP(mn_, New_HyperText, roles::MATHML_NUMBER)

MARKUPMAP(mo_, New_HyperText, roles::MATHML_OPERATOR,
          AttrFromDOM(accent_, accent_), AttrFromDOM(fence_, fence_),
          AttrFromDOM(separator_, separator_), AttrFromDOM(largeop_, largeop_))

MARKUPMAP(mtext_, New_HyperText, roles::MATHML_TEXT)

MARKUPMAP(ms_, New_HyperText, roles::MATHML_STRING_LITERAL)

MARKUPMAP(mglyph_, New_HyperText, roles::MATHML_GLYPH)

MARKUPMAP(mrow_, New_HyperText, roles::MATHML_ROW)

MARKUPMAP(mfrac_, New_HyperText, roles::MATHML_FRACTION,
          AttrFromDOM(bevelled_, bevelled_),
          AttrFromDOM(linethickness_, linethickness_))

MARKUPMAP(msqrt_, New_HyperText, roles::MATHML_SQUARE_ROOT)

MARKUPMAP(mroot_, New_HyperText, roles::MATHML_ROOT)

MARKUPMAP(mfenced_, New_HyperText, roles::MATHML_ROW)

MARKUPMAP(menclose_, New_HyperText, roles::MATHML_ENCLOSED,
          AttrFromDOM(notation_, notation_))

MARKUPMAP(mstyle_, New_HyperText, roles::MATHML_STYLE)

MARKUPMAP(msub_, New_HyperText, roles::MATHML_SUB)

MARKUPMAP(msup_, New_HyperText, roles::MATHML_SUP)

MARKUPMAP(msubsup_, New_HyperText, roles::MATHML_SUB_SUP)

MARKUPMAP(munder_, New_HyperText, roles::MATHML_UNDER,
          AttrFromDOM(accentunder_, accentunder_), AttrFromDOM(align, align))

MARKUPMAP(mover_, New_HyperText, roles::MATHML_OVER,
          AttrFromDOM(accent_, accent_), AttrFromDOM(align, align))

MARKUPMAP(munderover_, New_HyperText, roles::MATHML_UNDER_OVER,
          AttrFromDOM(accent_, accent_),
          AttrFromDOM(accentunder_, accentunder_), AttrFromDOM(align, align))

MARKUPMAP(mmultiscripts_, New_HyperText, roles::MATHML_MULTISCRIPTS)

MARKUPMAP(
    mtable_,
    [](Element* aElement, LocalAccessible* aContext) -> LocalAccessible* {
      // If we're not a table according to layout, use a generic accessible.
      if (!aElement->GetPrimaryFrame() ||
          aElement->GetPrimaryFrame()->AccessibleType() != eHTMLTableType) {
        return new ARIAGridAccessible(aElement, aContext->Document());
      }

      return new HTMLTableAccessible(aElement, aContext->Document());
    },
    roles::MATHML_TABLE, AttrFromDOM(align, align),
    AttrFromDOM(columnlines_, columnlines_), AttrFromDOM(rowlines_, rowlines_))

MARKUPMAP(
    mlabeledtr_,
    [](Element* aElement, LocalAccessible* aContext) -> LocalAccessible* {
      return new HTMLTableRowAccessible(aElement, aContext->Document());
    },
    roles::MATHML_LABELED_ROW)

MARKUPMAP(
    mtr_,
    [](Element* aElement, LocalAccessible* aContext) -> LocalAccessible* {
      if (aContext->IsHTMLTable() && aElement->GetPrimaryFrame() &&
          aElement->GetPrimaryFrame()->AccessibleType() == eHTMLTableRowType) {
        return new HTMLTableRowAccessible(aElement, aContext->Document());
      }

      // If the mtr element in a MathML table has a display style other than
      // 'table', create a generic table row accessible, since there's no
      // underlying table layout.
      if (aContext->IsTable()) {
        return new ARIARowAccessible(aElement, aContext->Document());
      }

      return nullptr;
    },
    roles::MATHML_TABLE_ROW)

MARKUPMAP(
    mtd_,
    [](Element* aElement, LocalAccessible* aContext) -> LocalAccessible* {
      if (aContext->IsHTMLTableRow() && aElement->GetPrimaryFrame() &&
          aElement->GetPrimaryFrame()->AccessibleType() == eHTMLTableCellType) {
        return new HTMLTableCellAccessible(aElement, aContext->Document());
      }

      // If the mtd element in a MathML table has a display style other than
      // 'table', create a generic table cell accessible, since there's no
      // underlying table layout.
      if (aContext->IsTableRow()) {
        return new ARIAGridCellAccessible(aElement, aContext->Document());
      }

      return nullptr;
    },
    roles::MATHML_CELL)

MARKUPMAP(maction_, New_HyperText, roles::MATHML_ACTION,
          AttrFromDOM(actiontype_, actiontype_),
          AttrFromDOM(selection_, selection_))

MARKUPMAP(merror_, New_HyperText, roles::MATHML_ERROR)

MARKUPMAP(mstack_, New_HyperText, roles::MATHML_STACK,
          AttrFromDOM(align, align), AttrFromDOM(position, position))

MARKUPMAP(mlongdiv_, New_HyperText, roles::MATHML_LONG_DIVISION,
          AttrFromDOM(longdivstyle_, longdivstyle_))

MARKUPMAP(msgroup_, New_HyperText, roles::MATHML_STACK_GROUP,
          AttrFromDOM(position, position), AttrFromDOM(shift_, shift_))

MARKUPMAP(msrow_, New_HyperText, roles::MATHML_STACK_ROW,
          AttrFromDOM(position, position))

MARKUPMAP(mscarries_, New_HyperText, roles::MATHML_STACK_CARRIES,
          AttrFromDOM(location_, location_), AttrFromDOM(position, position))

MARKUPMAP(mscarry_, New_HyperText, roles::MATHML_STACK_CARRY,
          AttrFromDOM(crossout_, crossout_))

MARKUPMAP(msline_, New_HyperText, roles::MATHML_STACK_LINE,
          AttrFromDOM(position, position))
