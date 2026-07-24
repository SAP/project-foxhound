/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef nsCSSVisitedDependentPropList_h_
#define nsCSSVisitedDependentPropList_h_

/* a list of style struct's member variables which can be visited-dependent */

/* High-order macro that applies MACRO to all visited-dependent style structs
 * and their fields. Each invocation passes:
 * - 'name_' the name of the style struct
 * - 'fields_' the list of member variables in the style struct that can
 *   be visited-dependent
 *
 * Usage:
 *   #define MY_MACRO(name_, fields_) ...
 *   FOR_EACH_VISITED_DEPENDENT_STYLE_STRUCT(MY_MACRO)
 *   #undef MY_MACRO
 *
 * Note that, currently, there is a restriction that all fields in a
 * each entry must have the same type, otherwise you need two entries.
 */

#define FOR_EACH_VISITED_DEPENDENT_STYLE_STRUCT(MACRO) \
  MACRO(Background, (mBackgroundColor)) \
  MACRO(Border, (mBorderTopColor, \
                 mBorderRightColor, \
                 mBorderBottomColor, \
                 mBorderLeftColor)) \
  MACRO(Outline, (mOutlineColor)) \
  MACRO(Column, (mColumnRuleColor)) \
  MACRO(Text, (mColor)) \
  MACRO(Text, (mTextEmphasisColor, \
               mWebkitTextFillColor, \
               mWebkitTextStrokeColor)) \
  MACRO(TextReset, (mTextDecorationColor)) \
  MACRO(SVG, (mFill, mStroke)) \
  MACRO(UI, (mCaretColor))

#endif // nsCSSVisitedDependentPropList_h_
