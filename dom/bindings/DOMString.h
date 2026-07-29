/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/*
 * Modifications Copyright SAP SE. 2019-2021.  All rights reserved.
 */

#ifndef mozilla_dom_DOMString_h
#define mozilla_dom_DOMString_h

#include "nsAtom.h"
#include "nsDOMString.h"
#include "nsString.h"

namespace mozilla::dom {

// DOMString is an AutoTString with a few extra dangerous methods needed for
// performance in some cases, where we want to propagate a "weak" reference to a
// string up. See bug 2023628 for some context.
//
// Some of these methods could actually live in nsTSubString, perhaps, but
// they're hard to get right, and make assumptions about what kind of strings
// they are called with in order to save cycles.
class DOMString final : public nsAutoString {
 public:
  enum NullHandling { eTreatNullAsNull, eTreatNullAsEmpty, eNullNotExpected };

  void SetKnownLiveAtom(nsAtom* aAtom, NullHandling aNullHandling) {
    AssertSetKnownLivePrecondition();
    MOZ_ASSERT(aAtom || aNullHandling != eNullNotExpected);
    if (aNullHandling == eNullNotExpected || aAtom) {
      // Static atoms are backed by literals, and dynamic ones by StringBuffer.
      DataFlags flags = DataFlags::TERMINATED;
      const char_type* data;
      if (aAtom->IsStatic()) {
        data = aAtom->AsStatic()->String();
        flags |= DataFlags::LITERAL;
      } else {
        MOZ_ASSERT(aAtom->AsDynamic()->StringBuffer());
        data = aAtom->AsDynamic()->String();
        flags |= DataFlags::STRINGBUFFER;
      }
      SetData(const_cast<char_type*>(data), aAtom->GetLength(), flags);
      AssertValid();
    } else if (aNullHandling == eTreatNullAsNull) {
      SetNull();
    }
    AssignTaint(EmptyTaint);
  }

  void SetKnownLiveString(const nsAString& aString) {
    AssertSetKnownLivePrecondition();
    MOZ_ASSERT(aString.IsTerminated(),
               "If we are not terminated, then we need copying or so");
    // NOTE: This is a bit subtle, but the data flags we copy are basically "all
    // except OWNED | INLINE", which cause us to copy null-ness,
    // refcounted-ness, etc.
    const char_type* data = aString.Data();
    SetData(
        const_cast<char_type*>(data), aString.Length(),
        aString.GetDataFlags() & (DataFlags::TERMINATED | DataFlags::LITERAL |
                                  DataFlags::STRINGBUFFER | DataFlags::VOIDED));
    AssignTaint(aString.Taint());
    AssertValid();
  }

  void SetKnownLiveStringBuffer(StringBuffer* aBuffer, LengthStorage aLen) {
    AssertSetKnownLivePrecondition();
    MOZ_ASSERT(aBuffer);
    // NOTE: No DataFlags::OWNED.
    SetData(static_cast<char_type*>(aBuffer->Data()), aLen,
            DataFlags::STRINGBUFFER | DataFlags::TERMINATED);
    AssignTaint(aBuffer->Taint().safeSubTaint(0, aLen));
    AssertValid();
  }

  void SetNull() { SetIsVoid(true); }
  bool IsNull() const { return IsVoid(); }

 private:
  void AssertSetKnownLivePrecondition() {
    MOZ_ASSERT(IsEmpty(), "We rely on this being called only on empty strings");
    MOZ_ASSERT(!(mDataFlags & DataFlags::OWNED), "Would leak");
  }
};

}  // namespace mozilla::dom

#endif  // mozilla_dom_DOMString_h
