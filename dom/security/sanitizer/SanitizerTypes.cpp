/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "SanitizerTypes.h"

namespace mozilla::dom::sanitizer {

template <typename CanonicalName, typename SanitizerName>
static void SetSanitizerName(const CanonicalName& aName,
                             SanitizerName& aSanitizerName) {
  aName->LocalName()->ToString(aSanitizerName.mName);
  if (nsAtom* ns = aName->GetNamespace()) {
    ns->ToString(aSanitizerName.mNamespace);
  } else {
    aSanitizerName.mNamespace.SetIsVoid(true);
  }
}

bool CanonicalAttribute::IsDataAttribute() const {
  return StringBeginsWith(nsDependentAtomString(mLocalName), u"data-"_ns) &&
         !mNamespace;
}

SanitizerAttributeNamespace CanonicalAttribute::ToSanitizerAttributeNamespace()
    const {
  SanitizerAttributeNamespace result;
  SetSanitizerName(this, result);
  return result;
}

SanitizerElementNamespace CanonicalElement::ToSanitizerElementNamespace()
    const {
  SanitizerElementNamespace result;
  SetSanitizerName(this, result);
  return result;
}

SanitizerElementNamespaceWithAttributes
CanonicalElement::ToSanitizerElementNamespaceWithAttributes(
    const CanonicalElementAttributes& aElementAttributes) const {
  SanitizerElementNamespaceWithAttributes result;
  SetSanitizerName(this, result);
  if (aElementAttributes.mAttributes) {
    result.mAttributes.Construct(
        ToSanitizerAttributes(*aElementAttributes.mAttributes));
  }
  if (aElementAttributes.mRemoveAttributes) {
    result.mRemoveAttributes.Construct(
        ToSanitizerAttributes(*aElementAttributes.mRemoveAttributes));
  }
  return result;
}

template <typename CanonicalName>
static std::ostream& Write(std::ostream& aStream, const CanonicalName& aName) {
  nsAutoCString localName;
  aName.LocalName()->ToUTF8String(localName);
  aStream << '"' << localName << '"';
  if (nsAtom* ns = aName.GetNamespace()) {
    nsAutoCString nameSpace;
    ns->ToUTF8String(nameSpace);
    return aStream << " (namespace: \"" << nameSpace << "\")";
  }
  return aStream << " (namespace: null)";
}

std::ostream& operator<<(std::ostream& aStream,
                         const CanonicalAttribute& aName) {
  return Write(aStream, aName);
}

std::ostream& operator<<(std::ostream& aStream, const CanonicalElement& aName) {
  return Write(aStream, aName);
}

bool CanonicalElementAttributes::Equals(
    const CanonicalElementAttributes& aOther) const {
  if (mAttributes.isSome() != aOther.mAttributes.isSome() ||
      mRemoveAttributes.isSome() != aOther.mRemoveAttributes.isSome()) {
    return false;
  }

  if (mAttributes) {
    if (mAttributes->Count() != aOther.mAttributes->Count()) {
      return false;
    }

    for (const CanonicalAttribute& attr : *mAttributes) {
      if (!aOther.mAttributes->Contains(attr)) {
        return false;
      }
    }
  }

  if (mRemoveAttributes) {
    if (mRemoveAttributes->Count() != aOther.mRemoveAttributes->Count()) {
      return false;
    }

    for (const CanonicalAttribute& attr : *mRemoveAttributes) {
      if (!aOther.mRemoveAttributes->Contains(attr)) {
        return false;
      }
    }
  }

  return true;
}

nsTArray<OwningStringOrSanitizerAttributeNamespace> ToSanitizerAttributes(
    const CanonicalAttributeSet& aSet) {
  nsTArray<OwningStringOrSanitizerAttributeNamespace> attributes;
  for (const CanonicalAttribute& canonical : aSet) {
    OwningStringOrSanitizerAttributeNamespace owning;
    owning.SetAsSanitizerAttributeNamespace() =
        canonical.ToSanitizerAttributeNamespace();
    attributes.InsertElementSorted(owning,
                                   SanitizerComparator<decltype(owning)>());
  }
  return attributes;
}

}  // namespace mozilla::dom::sanitizer
