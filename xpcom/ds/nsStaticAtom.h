/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/*
 * Modifications Copyright SAP SE. 2019-2021.  All rights reserved.
 */

#ifndef nsStaticAtom_h__
#define nsStaticAtom_h__

#include "nsIAtom.h"
#include "nsStringBuffer.h"

#define NS_STATIC_ATOM(buffer_name, atom_ptr) \
  { (nsStringBuffer*) &buffer_name, atom_ptr }

#define NS_STATIC_ATOM_BUFFER(buffer_name, str_data) \
  static nsFakeStringBuffer<sizeof(str_data)> buffer_name = \
    { EmptyTaint, 1, sizeof(str_data) * sizeof(char16_t), (u"" str_data) };

/**
 * Holds data used to initialize large number of atoms during startup. Use
 * the above macros to initialize these structs. They should never be accessed
 * directly other than from AtomTable.cpp
 */
struct nsStaticAtom
{
  // mStringBuffer points to the string buffer for a permanent atom, and is
  // therefore safe as a non-owning reference.
  nsStringBuffer* MOZ_NON_OWNING_REF mStringBuffer;
  nsIAtom** mAtom;
};

/**
 * This is a struct with the same binary layout as a nsStringBuffer.
 */
template<uint32_t size>
struct nsFakeStringBuffer
{
  // Foxhound: taint information.
  SafeStringTaint mTaint;
  int32_t mRefCnt;
  uint32_t mSize;
  char16_t mStringData[size];
};

// Register an array of static atoms with the atom table
template<uint32_t N>
void
NS_RegisterStaticAtoms(const nsStaticAtom (&aAtoms)[N])
{
  extern void RegisterStaticAtoms(const nsStaticAtom*, uint32_t aAtomCount);
  RegisterStaticAtoms(aAtoms, N);
}

#endif
