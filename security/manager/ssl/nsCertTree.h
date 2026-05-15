/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef NS_CERTTREE_H_
#define NS_CERTTREE_H_

#include "nsCOMPtr.h"
#include "nsICertTree.h"
#include "nsITreeSelection.h"
#include "nsIMutableArray.h"
#include "nsNSSComponent.h"
#include "nsTArray.h"
#include "PLDHashTable.h"

/* Disable the "base class XXX should be explicitly initialized
   in the copy constructor" warning. */
#if defined(__clang__)
#  pragma clang diagnostic push
#  pragma clang diagnostic ignored "-Wextra"
#elif defined(__GNUC__)
#  pragma GCC diagnostic push
#  pragma GCC diagnostic ignored "-Wextra"
#endif  // __clang__ || __GNUC__

#include "mozilla/dom/XULTreeElement.h"

#if defined(__clang__)
#  pragma clang diagnostic pop
#elif defined(__GNUC__)
#  pragma GCC diagnostic pop
#endif  // __clang__ || __GNUC__

typedef struct treeArrayElStr treeArrayEl;

struct CompareCacheEntry {
  enum { max_criterions = 3 };
  CompareCacheEntry();

  bool mCritInit[max_criterions];
  nsString mCrit[max_criterions];
};

class nsCertTreeDispInfo : public nsICertTreeItem {
 protected:
  virtual ~nsCertTreeDispInfo();

 public:
  explicit nsCertTreeDispInfo(nsIX509Cert* aCert) : mCert(aCert) {}

  NS_DECL_ISUPPORTS
  NS_DECL_NSICERTTREEITEM

  nsCOMPtr<nsIX509Cert> mCert;
};

class nsCertTree final : public nsICertTree {
 public:
  NS_DECL_ISUPPORTS
  NS_DECL_NSICERTTREE
  NS_DECL_NSITREEVIEW

  nsCertTree();

  enum sortCriterion {
    sort_IssuerOrg,
    sort_Org,
    sort_Token,
    sort_CommonName,
    sort_IssuedDateDescending,
    sort_Email,
    sort_None
  };

 private:
  virtual ~nsCertTree();

  void ClearCompareHash();
  void RemoveCacheEntry(nsIX509Cert* key);

  using CompareCache =
      nsTHashMap<nsIX509Cert*, std::unique_ptr<CompareCacheEntry>>;

  using nsCertCompareFunc = int (*)(CompareCache*, nsIX509Cert* a,
                                    nsIX509Cert* b);

  static CompareCacheEntry* getCacheEntry(CompareCache* cache,
                                          nsIX509Cert* aCert);
  static void CmpInitCriterion(nsIX509Cert* cert, CompareCacheEntry* entry,
                               sortCriterion crit, int32_t level);
  static int32_t CmpByCrit(nsIX509Cert* a, CompareCacheEntry* ace,
                           nsIX509Cert* b, CompareCacheEntry* bce,
                           sortCriterion crit, int32_t level);
  static int32_t CmpBy(CompareCache* cache, nsIX509Cert* a, nsIX509Cert* b,
                       sortCriterion c0, sortCriterion c1, sortCriterion c2);
  static int32_t CmpCACert(CompareCache* cache, nsIX509Cert* a, nsIX509Cert* b);
  static int32_t CmpUserCert(CompareCache* cache, nsIX509Cert* a,
                             nsIX509Cert* b);
  static int32_t CmpEmailCert(CompareCache* cache, nsIX509Cert* a,
                              nsIX509Cert* b);
  nsCertCompareFunc GetCompareFuncFromCertType(uint32_t aType);
  int32_t CountOrganizations();

  static const uint32_t kInitialCacheLength = 64;

  nsTArray<RefPtr<nsCertTreeDispInfo>> mDispInfo;
  RefPtr<mozilla::dom::XULTreeElement> mTree;
  nsCOMPtr<nsITreeSelection> mSelection;
  treeArrayEl* mTreeArray;
  int32_t mNumOrgs;
  int32_t mNumRows;
  CompareCache mCompareCache;

  treeArrayEl* GetThreadDescAtIndex(int32_t _index);
  already_AddRefed<nsIX509Cert> GetCertAtIndex(
      int32_t _index, int32_t* outAbsoluteCertOffset = nullptr);
  already_AddRefed<nsCertTreeDispInfo> GetDispInfoAtIndex(
      int32_t index, int32_t* outAbsoluteCertOffset = nullptr);
  void FreeCertArray();
  nsresult UpdateUIContents();

  nsresult GetCertsByTypeFromCertList(
      const nsTArray<RefPtr<nsIX509Cert>>& aCertList, uint32_t aWantedType,
      nsCertCompareFunc aCertCmpFn, CompareCache* aCertCmpFnArg);

  nsCOMPtr<nsIMutableArray> mCellText;
};

#endif /* NS_CERTTREE_H_ */
