/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_AtomAttributes_h_
#define mozilla_dom_AtomAttributes_h_

#include "nsGkAtoms.h"

// Note: The Java to C++ translation of the HTML parser reads
// this file, and assumes that all gkAtoms in the whole file want atoms as
// values and wants at most one per line.
// If you change the list of atoms in this file, you need to re-run the
// Java to C++ translation.

// clang-format off

// True if this attribute is stored as a (non-array) atom on all elements.
// Note that `for` is an atom array attribute on the `output` element and
// and a plain atom attribute otherwise.
#define NS_IS_ATOM_ATTRIBUTE(aAtom)             \
  (aAtom == nsGkAtoms::lang ||                  \
   aAtom == nsGkAtoms::form ||                  \
   aAtom == nsGkAtoms::_for ||                  \
   aAtom == nsGkAtoms::aria_activedescendant || \
   aAtom == nsGkAtoms::id)

// True if this attribute is stored as a atom array on all elements.
#define NS_IS_ATOM_ARRAY_ATTRIBUTE(aAtom)       \
  (aAtom == nsGkAtoms::_class ||                \
   aAtom == nsGkAtoms::part ||                  \
   aAtom == nsGkAtoms::aria_actions ||          \
   aAtom == nsGkAtoms::aria_controls ||         \
   aAtom == nsGkAtoms::aria_describedby ||      \
   aAtom == nsGkAtoms::aria_details ||          \
   aAtom == nsGkAtoms::aria_errormessage ||     \
   aAtom == nsGkAtoms::aria_flowto ||           \
   aAtom == nsGkAtoms::aria_labelledby ||       \
   aAtom == nsGkAtoms::aria_owns ||             \
   aAtom == nsGkAtoms::headers)

// True if this attribute is stored as a (non-array) atom on HTML elements.
#define NS_IS_ATOM_ATTRIBUTE_HTML(aAtom)        \
  (aAtom == nsGkAtoms::popovertarget ||         \
   aAtom == nsGkAtoms::name ||                  \
   aAtom == nsGkAtoms::contenteditable ||       \
   aAtom == nsGkAtoms::translate)

// True if this attribute is stored as a atom array on HTML elements.
#define NS_IS_ATOM_ARRAY_ATTRIBUTE_HTML(aAtom)  \
  (aAtom == nsGkAtoms::sandbox ||               \
   aAtom == nsGkAtoms::sizes ||                 \
   aAtom == nsGkAtoms::blocking ||              \
   aAtom == nsGkAtoms::rel)

// clang-format on

// We don't have in-parser atom handling for SVG-specific
// or MathML-specific attributes at this time.

#endif  // mozilla_dom_AtomAttributes_h_
