/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef nsStyleStructList_h_
#define nsStyleStructList_h_

/*
 * list of structs that contain the data provided by ComputedStyle, the
 * internal API for computed style data for an element
 */

/*
 * High-order macro that applies INHERITED_MACRO to all inherited style structs
 * and RESET_MACRO to all reset style structs, in the correct order.
 *
 * The inherited structs are listed before the reset structs.
 * nsStyleStructID assumes this is the case.
 *
 * Usage:
 *   #define MY_INHERITED_MACRO(name) ...
 *   #define MY_RESET_MACRO(name) ...
 *   FOR_EACH_STYLE_STRUCT(MY_INHERITED_MACRO, MY_RESET_MACRO)
 *   #undef MY_INHERITED_MACRO
 *   #undef MY_RESET_MACRO
 */

#define FOR_EACH_STYLE_STRUCT(INHERITED_MACRO, RESET_MACRO) \
  INHERITED_MACRO(Font) \
  INHERITED_MACRO(List) \
  INHERITED_MACRO(Text) \
  INHERITED_MACRO(Visibility) \
  INHERITED_MACRO(UI) \
  INHERITED_MACRO(TableBorder) \
  INHERITED_MACRO(SVG) \
  RESET_MACRO(Background) \
  RESET_MACRO(Position) \
  RESET_MACRO(TextReset) \
  RESET_MACRO(Display) \
  RESET_MACRO(Content) \
  RESET_MACRO(UIReset) \
  RESET_MACRO(Table) \
  RESET_MACRO(Margin) \
  RESET_MACRO(Padding) \
  RESET_MACRO(Border) \
  RESET_MACRO(Outline) \
  RESET_MACRO(XUL) \
  RESET_MACRO(SVGReset) \
  RESET_MACRO(Column) \
  RESET_MACRO(Effects) \
  RESET_MACRO(Page)

#endif // nsStyleStructList_h_
