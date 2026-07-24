/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef nsMaybeWeakPtr_h_
#define nsMaybeWeakPtr_h_

#include "mozilla/Try.h"
#include "mozilla/Variant.h"
#include "nsCOMPtr.h"
#include "nsIWeakReferenceUtils.h"
#include "nsTArray.h"
#include "nsCycleCollectionNoteChild.h"
#include "xpcpublic.h"

// nsMaybeWeakPtr is a helper object to hold a strong-or-weak reference
// to the template class.  It's pretty minimal, but sufficient.

template <class T>
class nsMaybeWeakPtr {
 public:
  nsMaybeWeakPtr() : mPtr(mozilla::VariantType<nsCOMPtr<T>>{}, nullptr) {}
  explicit nsMaybeWeakPtr(std::nullptr_t)
      : mPtr(mozilla::VariantType<nsCOMPtr<T>>{}, nullptr) {}
  explicit nsMaybeWeakPtr(T* aRef)
      : mPtr(mozilla::VariantType<nsCOMPtr<T>>{}, aRef) {}
  explicit nsMaybeWeakPtr(const nsWeakPtr& aRef)
      : mPtr(mozilla::VariantType<nsWeakPtr>{}, aRef) {
    MOZ_ASSERT(AsWeak(), "null nsWeakPtr pointer passed to nsMaybeWeakPtr");
  }

  bool IsStrong() const { return mPtr.template is<nsCOMPtr<T>>(); }

  bool IsWeak() const { return mPtr.template is<nsWeakPtr>(); }

  nsMaybeWeakPtr& operator=(std::nullptr_t) {
    mPtr.template emplace<nsCOMPtr<T>>(nullptr);
    return *this;
  }

  nsMaybeWeakPtr<T>& operator=(T* aRef) {
    mPtr.template emplace<nsCOMPtr<T>>(aRef);
    return *this;
  }

  nsMaybeWeakPtr<T>& operator=(const nsWeakPtr& aRef) {
    mPtr.template emplace<nsWeakPtr>(aRef);
    return *this;
  }

  bool operator==(const nsMaybeWeakPtr<T>& aOther) const {
    return mPtr == aOther.mPtr;
  }

  bool operator==(T* const& aStrong) const {
    return IsStrong() && AsStrong() == aStrong;
  }

  bool operator==(const nsWeakPtr& aWeak) const {
    return IsWeak() && AsWeak() == aWeak;
  }

  already_AddRefed<T> GetValue() const {
    return IsWeak() ? GetWeakReferent() : nsCOMPtr<T>{AsStrong()}.forget();
  }

  friend inline void ImplCycleCollectionTraverse(
      nsCycleCollectionTraversalCallback& aCallback,
      const nsMaybeWeakPtr& aField, const char* aName, uint32_t aFlags = 0) {
    if (aField.IsStrong()) {
      CycleCollectionNoteChild(aCallback, aField.AsStrong().get(), aName,
                               aFlags);
    }
  }

 protected:
  const nsCOMPtr<T>& AsStrong() const {
    return mPtr.template as<nsCOMPtr<T>>();
  }

  const nsWeakPtr& AsWeak() const { return mPtr.template as<nsWeakPtr>(); }

 private:
  already_AddRefed<T> GetWeakReferent() const {
    MOZ_ASSERT(AsWeak());
    nsresult rv;
    nsCOMPtr<T> ref = do_QueryReferent(AsWeak(), &rv);
    NS_WARNING_ASSERTION(NS_SUCCEEDED(rv) || rv == NS_ERROR_NULL_POINTER,
                         "QueryReferent failed with non-null pointer");
    return ref.forget();
  }

  mozilla::Variant<nsCOMPtr<T>, nsWeakPtr> mPtr;
};

// nsMaybeWeakPtrArray is an array of MaybeWeakPtr objects, that knows how to
// grab a weak reference to a given object if requested.  It only allows a
// given object to appear in the array once.

template <class T>
class nsMaybeWeakPtrArray : public CopyableTArray<nsMaybeWeakPtr<T>> {
  using MaybeWeakArray = nsTArray<nsMaybeWeakPtr<T>>;

  nsresult SetMaybeWeakPtr(nsMaybeWeakPtr<T>& aRef, T* aElement,
                           bool aOwnsWeak) {
    nsresult rv = NS_OK;

    if (aOwnsWeak) {
      aRef = do_GetWeakReference(aElement, &rv);
    } else {
      aRef = aElement;
    }

    return rv;
  }

 public:
  nsresult AppendWeakElement(T* aElement, bool aOwnsWeak) {
    nsMaybeWeakPtr<T> ref;
    MOZ_TRY(SetMaybeWeakPtr(ref, aElement, aOwnsWeak));

#if (defined(MOZ_DIAGNOSTIC_ASSERT_ENABLED) && !defined(MOZ_THUNDERBIRD))
    // Checking for duplicates is expensive, so we enforce callers to avoid
    // this with a diagnostic assertion. See bug 2000788 for Thunderbird.
    if (IsAssertOnDoubleAdd()) {
      if (MaybeWeakArray::Contains(aElement)) {
        xpc_DumpJSStack(true, true, false);
        MOZ_DIAGNOSTIC_ASSERT(false, "Element already in array.");
      }
    }
#endif

    MaybeWeakArray::AppendElement(ref);
    return NS_OK;
  }

  nsresult AppendWeakElementUnlessExists(T* aElement, bool aOwnsWeak) {
    nsMaybeWeakPtr<T> ref;
    MOZ_TRY(SetMaybeWeakPtr(ref, aElement, aOwnsWeak));

    if (MaybeWeakArray::Contains(ref)) {
      return NS_ERROR_INVALID_ARG;
    }

    MaybeWeakArray::AppendElement(ref);
    return NS_OK;
  }

  nsresult RemoveWeakElement(T* aElement) {
    if (MaybeWeakArray::RemoveElement(aElement)) {
      return NS_OK;
    }

    // Don't use do_GetWeakReference; it should only be called if we know
    // the object supports weak references.
    nsCOMPtr<nsISupportsWeakReference> supWeakRef = do_QueryInterface(aElement);
    if (!supWeakRef) {
      return NS_ERROR_INVALID_ARG;
    }

    nsCOMPtr<nsIWeakReference> weakRef;
    nsresult rv = supWeakRef->GetWeakReference(getter_AddRefs(weakRef));
    NS_ENSURE_SUCCESS(rv, rv);

    if (MaybeWeakArray::RemoveElement(weakRef)) {
      return NS_OK;
    }

    return NS_ERROR_INVALID_ARG;
  }

  friend inline void ImplCycleCollectionUnlink(nsMaybeWeakPtrArray& aField) {
    aField.Clear();
  }

  friend inline void ImplCycleCollectionTraverse(
      nsCycleCollectionTraversalCallback& aCallback,
      nsMaybeWeakPtrArray& aField, const char* aName, uint32_t aFlags = 0) {
    aFlags |= CycleCollectionEdgeNameArrayFlag;
    for (auto& e : aField) {
      ImplCycleCollectionTraverse(aCallback, e, aName, aFlags);
    }
  }

 private:
#if (defined(MOZ_DIAGNOSTIC_ASSERT_ENABLED) && !defined(MOZ_THUNDERBIRD))
  // Until we have bug 2005466, a plain diagnostic assert would only yield us
  // unactionable crash reports from official Nightly builds in case JS was
  // adding an observer (which is common enough). But we want developers using
  // non-DEBUG builds to catch this locally and on CI when testing.
  static inline bool IsAssertOnDoubleAdd() {
#  if defined(DEBUG) || defined(FUZZING)
    return true;
#  else
    return xpc::IsInAutomation();
#  endif
  }
#endif
};

// Call a method on each element in the array, but only if the element is
// non-null.

#define ENUMERATE_WEAKARRAY(array, type, method)                            \
  for (uint32_t array_idx = 0; array_idx < (array).Length(); ++array_idx) { \
    const nsCOMPtr<type>& e = (array).ElementAt(array_idx).GetValue();      \
    if (e) e->method;                                                       \
  }

#endif
