/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * nsPropertyTable allows a set of arbitrary key/value pairs to be stored
 * for any number of nodes, in a global hashtable rather than on the nodes
 * themselves.  Nodes can be any type of object; the hashtable keys are
 * nsAtom pointers, and the values are void pointers.
 */

#include "nsPropertyTable.h"

#include "mozilla/MemoryReporting.h"
#include "nsAtom.h"
#include "nsError.h"
#include "nsTHashMap.h"

//----------------------------------------------------------------------

class nsPropertyTable::PropertyList {
 public:
  PropertyList(nsAtom* aName, NSPropertyDtorFunc aDtorFunc, void* aDtorData,
               bool aTransfer);
  ~PropertyList();

  // Removes the property associated with the given object, and destroys
  // the property value
  bool RemovePropertyFor(nsPropertyOwner aObject);

  // Destroy all remaining properties (without removing them)
  void Destroy();

  bool Equals(const nsAtom* aPropertyName) { return mName == aPropertyName; }

  size_t SizeOfIncludingThis(mozilla::MallocSizeOf aMallocSizeOf);

  RefPtr<nsAtom> mName;                            // property name
  nsTHashMap<const void*, void*> mObjectValueMap;  // map of object/value pairs
  NSPropertyDtorFunc mDtorFunc;  // property specific value dtor function
  void* mDtorData;               // pointer to pass to dtor
  bool mTransfer;                // whether to transfer in
                                 // TransferOrRemoveAllPropertiesFor

  PropertyList* mNext;
};

void nsPropertyTable::RemoveAllProperties() {
  while (mPropertyList) {
    PropertyList* tmp = mPropertyList;

    mPropertyList = mPropertyList->mNext;
    tmp->Destroy();
    delete tmp;
  }
}

void nsPropertyTable::RemoveAllPropertiesFor(nsPropertyOwner aObject) {
  for (PropertyList* prop = mPropertyList; prop; prop = prop->mNext) {
    prop->RemovePropertyFor(aObject);
  }
}

nsresult nsPropertyTable::TransferOrRemoveAllPropertiesFor(
    nsPropertyOwner aObject, nsPropertyTable& aOtherTable) {
  nsresult rv = NS_OK;
  for (PropertyList* prop = mPropertyList; prop; prop = prop->mNext) {
    if (prop->mTransfer) {
      auto entry = prop->mObjectValueMap.Lookup(aObject);
      if (entry) {
        rv = aOtherTable.SetProperty(aObject, prop->mName, entry.Data(),
                                     prop->mDtorFunc, prop->mDtorData,
                                     prop->mTransfer);
        if (NS_FAILED(rv)) {
          RemoveAllPropertiesFor(aObject);
          aOtherTable.RemoveAllPropertiesFor(aObject);
          break;
        }

        entry.Remove();
      }
    } else {
      prop->RemovePropertyFor(aObject);
    }
  }

  return rv;
}

void nsPropertyTable::Enumerate(nsPropertyOwner aObject,
                                NSPropertyFunc aCallback, void* aData) {
  PropertyList* prop;
  for (prop = mPropertyList; prop; prop = prop->mNext) {
    auto entry = prop->mObjectValueMap.Lookup(aObject);
    if (entry) {
      aCallback(const_cast<void*>(aObject.get()), prop->mName, entry.Data(),
                aData);
    }
  }
}

void nsPropertyTable::EnumerateAll(NSPropertyFunc aCallBack, void* aData) {
  for (PropertyList* prop = mPropertyList; prop; prop = prop->mNext) {
    for (const auto& entry : prop->mObjectValueMap) {
      aCallBack(const_cast<void*>(entry.GetKey()), prop->mName, entry.GetData(),
                aData);
    }
  }
}

void* nsPropertyTable::GetPropertyInternal(nsPropertyOwner aObject,
                                           const nsAtom* aPropertyName,
                                           bool aRemove, nsresult* aResult) {
  MOZ_ASSERT(aPropertyName && aObject, "unexpected null param");
  nsresult rv = NS_PROPTABLE_PROP_NOT_THERE;
  void* propValue = nullptr;

  PropertyList* propertyList = GetPropertyListFor(aPropertyName);
  if (propertyList) {
    auto entry = propertyList->mObjectValueMap.Lookup(aObject);
    if (entry) {
      propValue = entry.Data();
      if (aRemove) {
        // don't call propertyList->mDtorFunc.  That's the caller's job now.
        entry.Remove();
      }
      rv = NS_OK;
    }
  }

  if (aResult) *aResult = rv;

  return propValue;
}

nsresult nsPropertyTable::SetPropertyInternal(
    nsPropertyOwner aObject, nsAtom* aPropertyName, void* aPropertyValue,
    NSPropertyDtorFunc aPropDtorFunc, void* aPropDtorData, bool aTransfer) {
  MOZ_ASSERT(aPropertyName && aObject, "unexpected null param");

  PropertyList* propertyList = GetPropertyListFor(aPropertyName);

  if (propertyList) {
    // Make sure the dtor function and data and the transfer flag match
    if (aPropDtorFunc != propertyList->mDtorFunc ||
        aPropDtorData != propertyList->mDtorData ||
        aTransfer != propertyList->mTransfer) {
      NS_WARNING("Destructor/data mismatch while setting property");
      return NS_ERROR_INVALID_ARG;
    }

  } else {
    propertyList = new PropertyList(aPropertyName, aPropDtorFunc, aPropDtorData,
                                    aTransfer);
    propertyList->mNext = mPropertyList;
    mPropertyList = propertyList;
  }

  // The current property value (if there is one) is replaced and the current
  // value is destroyed
  nsresult result = NS_OK;
  propertyList->mObjectValueMap.WithEntryHandle(aObject, [&](auto&& entry) {
    // If we already have an entry, call `mDtorFunc` on it.
    if (entry) {
      if (propertyList->mDtorFunc) {
        propertyList->mDtorFunc(const_cast<void*>(entry.Entry()->GetKey()),
                                aPropertyName, entry.Entry()->GetData(),
                                propertyList->mDtorData);
      }
      result = NS_PROPTABLE_PROP_OVERWRITTEN;
    }
    entry.InsertOrUpdate(aPropertyValue);
  });

  return result;
}

nsresult nsPropertyTable::RemoveProperty(nsPropertyOwner aObject,
                                         const nsAtom* aPropertyName) {
  MOZ_ASSERT(aPropertyName && aObject, "unexpected null param");

  PropertyList* propertyList = GetPropertyListFor(aPropertyName);
  if (propertyList) {
    if (propertyList->RemovePropertyFor(aObject)) {
      return NS_OK;
    }
  }

  return NS_PROPTABLE_PROP_NOT_THERE;
}

nsPropertyTable::PropertyList* nsPropertyTable::GetPropertyListFor(
    const nsAtom* aPropertyName) const {
  PropertyList* result;

  for (result = mPropertyList; result; result = result->mNext) {
    if (result->Equals(aPropertyName)) {
      break;
    }
  }

  return result;
}

//----------------------------------------------------------------------

nsPropertyTable::PropertyList::PropertyList(nsAtom* aName,
                                            NSPropertyDtorFunc aDtorFunc,
                                            void* aDtorData, bool aTransfer)
    : mName(aName),
      mDtorFunc(aDtorFunc),
      mDtorData(aDtorData),
      mTransfer(aTransfer),
      mNext(nullptr) {}

nsPropertyTable::PropertyList::~PropertyList() = default;

void nsPropertyTable::PropertyList::Destroy() {
  // Enumerate any remaining object/value pairs and destroy the value object.
  if (mDtorFunc) {
    for (const auto& entry : mObjectValueMap) {
      mDtorFunc(const_cast<void*>(entry.GetKey()), mName, entry.GetData(),
                mDtorData);
    }
  }
}

bool nsPropertyTable::PropertyList::RemovePropertyFor(nsPropertyOwner aObject) {
  void* oldValue = nullptr;
  if (mObjectValueMap.Remove(aObject, &oldValue)) {
    if (mDtorFunc) {
      mDtorFunc(const_cast<void*>(aObject.get()), mName, oldValue, mDtorData);
    }
    return false;
  }

  return true;
}

size_t nsPropertyTable::PropertyList::SizeOfIncludingThis(
    mozilla::MallocSizeOf aMallocSizeOf) {
  size_t n = aMallocSizeOf(this);
  n += mObjectValueMap.ShallowSizeOfExcludingThis(aMallocSizeOf);
  return n;
}

size_t nsPropertyTable::SizeOfExcludingThis(
    mozilla::MallocSizeOf aMallocSizeOf) const {
  size_t n = 0;

  for (PropertyList* prop = mPropertyList; prop; prop = prop->mNext) {
    n += prop->SizeOfIncludingThis(aMallocSizeOf);
  }

  return n;
}

size_t nsPropertyTable::SizeOfIncludingThis(
    mozilla::MallocSizeOf aMallocSizeOf) const {
  return aMallocSizeOf(this) + SizeOfExcludingThis(aMallocSizeOf);
}

/* static */
void nsPropertyTable::SupportsDtorFunc(void* aObject, nsAtom* aPropertyName,
                                       void* aPropertyValue, void* aData) {
  nsISupports* propertyValue = static_cast<nsISupports*>(aPropertyValue);
  NS_IF_RELEASE(propertyValue);
}
