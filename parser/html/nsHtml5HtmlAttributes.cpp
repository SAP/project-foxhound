/*
 * Copyright (c) 2007 Henri Sivonen
 * Copyright (c) 2008-2017 Mozilla Foundation
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */

#define nsHtml5HtmlAttributes_cpp__

#include "jArray.h"
#include "nsAHtml5TreeBuilderState.h"
#include "nsAtom.h"
#include "nsHtml5ArrayCopy.h"
#include "nsHtml5AtomTable.h"
#include "nsHtml5ByteReadable.h"
#include "nsHtml5Macros.h"
#include "nsHtml5String.h"
#include "nsIContent.h"
#include "nsIContentHandle.h"
#include "nsNameSpaceManager.h"
#include "nsTraceRefcnt.h"

#include "nsHtml5AttributeName.h"
#include "nsHtml5ElementName.h"
#include "nsHtml5Portability.h"
#include "nsHtml5StackNode.h"
#include "nsHtml5StateSnapshot.h"
#include "nsHtml5Tokenizer.h"
#include "nsHtml5TreeBuilder.h"
#include "nsHtml5UTF16Buffer.h"

#include "nsHtml5HtmlAttributes.h"

nsHtml5HtmlAttributes* nsHtml5HtmlAttributes::EMPTY_ATTRIBUTES = nullptr;

nsHtml5HtmlAttributes::nsHtml5HtmlAttributes(int32_t aMode) {
  MOZ_COUNT_CTOR(nsHtml5HtmlAttributes);
}

nsHtml5HtmlAttributes::~nsHtml5HtmlAttributes() {
  MOZ_COUNT_DTOR(nsHtml5HtmlAttributes);
}

nsHtml5String nsHtml5HtmlAttributes::getValue(nsHtml5AttributeName* aName) {
  MOZ_ASSERT(!mMovedFrom);
  uintptr_t nameBits = nsHtml5AttributeEntry::BitsFromKnownName(aName);
  for (nsHtml5AttributeEntry& entry : *this) {
    if (entry.NameBitsMatch(nameBits)) {
      return entry.Value();
    }
  }
  return nullptr;
}

int32_t nsHtml5HtmlAttributes::getLength() { return mStorage.Length(); }

void nsHtml5HtmlAttributes::addAttribute(nsHtml5AttributeName* aName,
                                         nsHtml5String aValue, int32_t aLine) {
  MOZ_ASSERT(!mMovedFrom);
  mStorage.AppendElement(nsHtml5AttributeEntry(aName, aValue));
  MOZ_RELEASE_ASSERT(mStorage.Length() <= INT32_MAX,
                     "Can't handle this many attributes.");
}

void nsHtml5HtmlAttributes::clear(int32_t aMode) {
  mStorage.ClearAndRetainStorage();
  mDuplicateAttributeError = false;
#ifdef DEBUG
  mMovedFrom = false;
#endif
}

bool nsHtml5HtmlAttributes::contains(nsHtml5AttributeName* aName) {
  MOZ_ASSERT(!mMovedFrom);
  uintptr_t nameBits = nsHtml5AttributeEntry::BitsFromName(aName);
  for (nsHtml5AttributeEntry& entry : *this) {
    if (entry.NameBitsMatch(nameBits)) {
      return true;
    }
  }
  return false;
}

nsHtml5HtmlAttributes* nsHtml5HtmlAttributes::cloneAttributes() {
  MOZ_ASSERT(!mMovedFrom);
  nsHtml5HtmlAttributes* clone =
      new nsHtml5HtmlAttributes(nsHtml5AttributeName::HTML);
  clone->mStorage.SetCapacity(mStorage.Length());
  for (nsHtml5AttributeEntry& entry : *this) {
    clone->mStorage.AppendElement(entry.Clone());
  }
  return clone;
}

bool nsHtml5HtmlAttributes::equalsAnother(nsHtml5HtmlAttributes* aOther) {
  MOZ_ASSERT(!mMovedFrom);
  if (mStorage.Length() != aOther->mStorage.Length()) {
    return false;
  }
  for (nsHtml5AttributeEntry& entry : *this) {
    // Need a flag, since C++ can't `continue` outer
    // iterator loop from within an inner loop.
    bool found = false;
    for (nsHtml5AttributeEntry& otherEntry : *aOther) {
      if (entry.NameMatches(otherEntry)) {
        found = true;
        if (!entry.ValueMatches(otherEntry)) {
          return false;
        }
        break;
      }
    }
    if (!found) {
      return false;
    }
  }
  return true;
}

void nsHtml5HtmlAttributes::initializeStatics() {
  EMPTY_ATTRIBUTES = new nsHtml5HtmlAttributes(nsHtml5AttributeName::HTML);
}

void nsHtml5HtmlAttributes::releaseStatics() { delete EMPTY_ATTRIBUTES; }
