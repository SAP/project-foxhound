/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* DOM object holding utility CSS functions */

#ifndef mozilla_dom_CSS_h_
#define mozilla_dom_CSS_h_

#include "mozilla/dom/CSSUnitValueBindingFwd.h"
#include "nsStringFwd.h"

template <class T>
struct already_AddRefed;

namespace mozilla {

class ErrorResult;

namespace dom {

class GlobalObject;
class HighlightRegistry;
struct PropertyDefinition;

class CSS {
 public:
  CSS() = delete;

  static bool Supports(const GlobalObject&, const nsACString& aProperty,
                       const nsACString& aValue);

  static bool Supports(const GlobalObject&, const nsACString& aDeclaration);

  static void Escape(const GlobalObject&, const nsAString& aIdent,
                     nsAString& aReturn);

  static HighlightRegistry* GetHighlights(const GlobalObject& aGlobal,
                                          ErrorResult& aRv);

  static void RegisterProperty(const GlobalObject&, const PropertyDefinition&,
                               ErrorResult&);

  // start of CSS Typed OM Web IDL declarations

  static already_AddRefed<CSSUnitValue> Number(const GlobalObject& aGlobal,
                                               double aValue);

  static already_AddRefed<CSSUnitValue> Percent(const GlobalObject& aGlobal,
                                                double aValue);

  // <length>
  static already_AddRefed<CSSUnitValue> Cap(const GlobalObject& aGlobal,
                                            double aValue);
  static already_AddRefed<CSSUnitValue> Ch(const GlobalObject& aGlobal,
                                           double aValue);
  static already_AddRefed<CSSUnitValue> Em(const GlobalObject& aGlobal,
                                           double aValue);
  static already_AddRefed<CSSUnitValue> Ex(const GlobalObject& aGlobal,
                                           double aValue);
  static already_AddRefed<CSSUnitValue> Ic(const GlobalObject& aGlobal,
                                           double aValue);
  static already_AddRefed<CSSUnitValue> Lh(const GlobalObject& aGlobal,
                                           double aValue);
  static already_AddRefed<CSSUnitValue> Rcap(const GlobalObject& aGlobal,
                                             double aValue);
  static already_AddRefed<CSSUnitValue> Rch(const GlobalObject& aGlobal,
                                            double aValue);
  static already_AddRefed<CSSUnitValue> Rem(const GlobalObject& aGlobal,
                                            double aValue);
  static already_AddRefed<CSSUnitValue> Rex(const GlobalObject& aGlobal,
                                            double aValue);
  static already_AddRefed<CSSUnitValue> Ric(const GlobalObject& aGlobal,
                                            double aValue);
  static already_AddRefed<CSSUnitValue> Rlh(const GlobalObject& aGlobal,
                                            double aValue);
  static already_AddRefed<CSSUnitValue> Vw(const GlobalObject& aGlobal,
                                           double aValue);
  static already_AddRefed<CSSUnitValue> Vh(const GlobalObject& aGlobal,
                                           double aValue);
  static already_AddRefed<CSSUnitValue> Vi(const GlobalObject& aGlobal,
                                           double aValue);
  static already_AddRefed<CSSUnitValue> Vb(const GlobalObject& aGlobal,
                                           double aValue);
  static already_AddRefed<CSSUnitValue> Vmin(const GlobalObject& aGlobal,
                                             double aValue);
  static already_AddRefed<CSSUnitValue> Vmax(const GlobalObject& aGlobal,
                                             double aValue);
  static already_AddRefed<CSSUnitValue> Svw(const GlobalObject& aGlobal,
                                            double aValue);
  static already_AddRefed<CSSUnitValue> Svh(const GlobalObject& aGlobal,
                                            double aValue);
  static already_AddRefed<CSSUnitValue> Svi(const GlobalObject& aGlobal,
                                            double aValue);
  static already_AddRefed<CSSUnitValue> Svb(const GlobalObject& aGlobal,
                                            double aValue);
  static already_AddRefed<CSSUnitValue> Svmin(const GlobalObject& aGlobal,
                                              double aValue);
  static already_AddRefed<CSSUnitValue> Svmax(const GlobalObject& aGlobal,
                                              double aValue);
  static already_AddRefed<CSSUnitValue> Lvw(const GlobalObject& aGlobal,
                                            double aValue);
  static already_AddRefed<CSSUnitValue> Lvh(const GlobalObject& aGlobal,
                                            double aValue);
  static already_AddRefed<CSSUnitValue> Lvi(const GlobalObject& aGlobal,
                                            double aValue);
  static already_AddRefed<CSSUnitValue> Lvb(const GlobalObject& aGlobal,
                                            double aValue);
  static already_AddRefed<CSSUnitValue> Lvmin(const GlobalObject& aGlobal,
                                              double aValue);
  static already_AddRefed<CSSUnitValue> Lvmax(const GlobalObject& aGlobal,
                                              double aValue);
  static already_AddRefed<CSSUnitValue> Dvw(const GlobalObject& aGlobal,
                                            double aValue);
  static already_AddRefed<CSSUnitValue> Dvh(const GlobalObject& aGlobal,
                                            double aValue);
  static already_AddRefed<CSSUnitValue> Dvi(const GlobalObject& aGlobal,
                                            double aValue);
  static already_AddRefed<CSSUnitValue> Dvb(const GlobalObject& aGlobal,
                                            double aValue);
  static already_AddRefed<CSSUnitValue> Dvmin(const GlobalObject& aGlobal,
                                              double aValue);
  static already_AddRefed<CSSUnitValue> Dvmax(const GlobalObject& aGlobal,
                                              double aValue);
  static already_AddRefed<CSSUnitValue> Cqw(const GlobalObject& aGlobal,
                                            double aValue);
  static already_AddRefed<CSSUnitValue> Cqh(const GlobalObject& aGlobal,
                                            double aValue);
  static already_AddRefed<CSSUnitValue> Cqi(const GlobalObject& aGlobal,
                                            double aValue);
  static already_AddRefed<CSSUnitValue> Cqb(const GlobalObject& aGlobal,
                                            double aValue);
  static already_AddRefed<CSSUnitValue> Cqmin(const GlobalObject& aGlobal,
                                              double aValue);
  static already_AddRefed<CSSUnitValue> Cqmax(const GlobalObject& aGlobal,
                                              double aValue);
  static already_AddRefed<CSSUnitValue> Cm(const GlobalObject& aGlobal,
                                           double aValue);
  static already_AddRefed<CSSUnitValue> Mm(const GlobalObject& aGlobal,
                                           double aValue);
  static already_AddRefed<CSSUnitValue> Q(const GlobalObject& aGlobal,
                                          double aValue);
  static already_AddRefed<CSSUnitValue> In(const GlobalObject& aGlobal,
                                           double aValue);
  static already_AddRefed<CSSUnitValue> Pt(const GlobalObject& aGlobal,
                                           double aValue);
  static already_AddRefed<CSSUnitValue> Pc(const GlobalObject& aGlobal,
                                           double aValue);
  static already_AddRefed<CSSUnitValue> Px(const GlobalObject& aGlobal,
                                           double aValue);

  // <angle>
  static already_AddRefed<CSSUnitValue> Deg(const GlobalObject& aGlobal,
                                            double aValue);
  static already_AddRefed<CSSUnitValue> Grad(const GlobalObject& aGlobal,
                                             double aValue);
  static already_AddRefed<CSSUnitValue> Rad(const GlobalObject& aGlobal,
                                            double aValue);
  static already_AddRefed<CSSUnitValue> Turn(const GlobalObject& aGlobal,
                                             double aValue);

  // <time>
  static already_AddRefed<CSSUnitValue> S(const GlobalObject& aGlobal,
                                          double aValue);
  static already_AddRefed<CSSUnitValue> Ms(const GlobalObject& aGlobal,
                                           double aValue);

  // <frequency>
  static already_AddRefed<CSSUnitValue> Hz(const GlobalObject& aGlobal,
                                           double aValue);
  static already_AddRefed<CSSUnitValue> KHz(const GlobalObject& aGlobal,
                                            double aValue);

  // <resolution>
  static already_AddRefed<CSSUnitValue> Dpi(const GlobalObject& aGlobal,
                                            double aValue);
  static already_AddRefed<CSSUnitValue> Dpcm(const GlobalObject& aGlobal,
                                             double aValue);
  static already_AddRefed<CSSUnitValue> Dppx(const GlobalObject& aGlobal,
                                             double aValue);

  // <flex>
  static already_AddRefed<CSSUnitValue> Fr(const GlobalObject& aGlobal,
                                           double aValue);

  // end of CSS Typed OM Web IDL declarations
};

}  // namespace dom
}  // namespace mozilla

#endif  // mozilla_dom_CSS_h_
