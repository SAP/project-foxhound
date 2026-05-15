/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * A class for handing out nodeinfos and ensuring sharing of them as needed.
 */

#ifndef nsNodeInfoManager_h_
#define nsNodeInfoManager_h_

#include "mozilla/Attributes.h"  // for final
#include "mozilla/MruCache.h"
#include "mozilla/dom/DOMArena.h"
#include "mozilla/dom/NodeInfo.h"
#include "nsCOMPtr.h"                      // for member
#include "nsCycleCollectionParticipant.h"  // for NS_DECL_CYCLE_*
#include "nsStringFwd.h"
#include "nsTHashMap.h"

class nsAtom;
class nsIPrincipal;
class nsWindowSizes;
template <class T>
struct already_AddRefed;

namespace mozilla::dom {
class Document;
}  // namespace mozilla::dom

class nsNodeInfoManager final {
 private:
  using NodeInfo = mozilla::dom::NodeInfo;
  ~nsNodeInfoManager();

 public:
  explicit nsNodeInfoManager(mozilla::dom::Document* aDocument,
                             nsIPrincipal* aPrincipal);

  NS_DECL_CYCLE_COLLECTION_SKIPPABLE_NATIVE_CLASS(nsNodeInfoManager)

  NS_INLINE_DECL_CYCLE_COLLECTING_NATIVE_REFCOUNTING(nsNodeInfoManager)

  /**
   * Release the reference to the document, this will be called when
   * the document is going away.
   */
  void DropDocumentReference();

  /**
   * Methods for creating nodeinfo's from atoms and/or strings.
   */
  already_AddRefed<NodeInfo> GetNodeInfo(nsAtom* aName, nsAtom* aPrefix,
                                         int32_t aNamespaceID,
                                         uint16_t aNodeType,
                                         nsAtom* aExtraName = nullptr);
  nsresult GetNodeInfo(const nsAString& aName, nsAtom* aPrefix,
                       int32_t aNamespaceID, uint16_t aNodeType,
                       NodeInfo** aNodeInfo);
  nsresult GetNodeInfo(const nsAString& aName, nsAtom* aPrefix,
                       const nsAString& aNamespaceURI, uint16_t aNodeType,
                       NodeInfo** aNodeInfo);

  /**
   * Returns the nodeinfo for text nodes. Can return null if OOM.
   */
  already_AddRefed<NodeInfo> GetTextNodeInfo();

  /**
   * Returns the nodeinfo for comment nodes. Can return null if OOM.
   */
  already_AddRefed<NodeInfo> GetCommentNodeInfo();

  /**
   * Returns the nodeinfo for the document node. Can return null if OOM.
   */
  already_AddRefed<NodeInfo> GetDocumentNodeInfo();
  already_AddRefed<NodeInfo> GetDocumentFragmentNodeInfo();

  /**
   * Retrieve a pointer to the document that owns this node info
   * manager.
   */
  mozilla::dom::Document* GetDocument() const { return mDocument; }

  /**
   * Gets the principal of the document this nodeinfo manager belongs to.
   */
  nsIPrincipal* DocumentPrincipal() const {
    NS_ASSERTION(mPrincipal, "How'd that happen?");
    return mPrincipal;
  }

  void RemoveNodeInfo(NodeInfo* aNodeInfo);

  /**
   * Returns true if SVG nodes in this document have real SVG semantics.
   */
  bool SVGEnabled() {
    return mSVGEnabled.valueOrFrom([this] { return InternalSVGEnabled(); });
  }

  /**
   * Returns true if MathML nodes in this document have real MathML semantics.
   */
  bool MathMLEnabled() {
    return mMathMLEnabled.valueOrFrom(
        [this] { return InternalMathMLEnabled(); });
  }

  mozilla::dom::DOMArena* GetArenaAllocator() { return mArena; }
  void SetArenaAllocator(mozilla::dom::DOMArena* aArena);

  void* Allocate(size_t aSize);

  void Free(void* aPtr) { free(aPtr); }

  bool HasAllocated() { return mHasAllocated; }

  void AddSizeOfIncludingThis(nsWindowSizes& aSizes) const;

 protected:
  friend class mozilla::dom::Document;
  friend class nsXULPrototypeDocument;

  /**
   * Sets the principal of the document this nodeinfo manager belongs to.
   */
  void SetDocumentPrincipal(nsIPrincipal* aPrincipal);

 private:
  bool InternalSVGEnabled();
  bool InternalMathMLEnabled();

  class NodeInfoInnerKey : public nsPtrHashKey<NodeInfo::NodeInfoInner> {
   public:
    explicit NodeInfoInnerKey(KeyTypePointer aKey) : nsPtrHashKey(aKey) {}
    NodeInfoInnerKey(NodeInfoInnerKey&&) = default;
    ~NodeInfoInnerKey() = default;
    bool KeyEquals(KeyTypePointer aKey) const { return *mKey == *aKey; }
    static PLDHashNumber HashKey(KeyTypePointer aKey) { return aKey->Hash(); }
  };

  struct NodeInfoCache : public mozilla::MruCache<NodeInfo::NodeInfoInner,
                                                  NodeInfo*, NodeInfoCache> {
    static mozilla::HashNumber Hash(const NodeInfo::NodeInfoInner& aKey) {
      return aKey.Hash();
    }
    static bool Match(const NodeInfo::NodeInfoInner& aKey,
                      const NodeInfo* aVal) {
      return (aKey.Hash() == aVal->mInner.Hash()) && (aKey == aVal->mInner);
    }
  };

  nsTHashMap<NodeInfoInnerKey, NodeInfo*> mNodeInfoHash;
  mozilla::dom::Document* MOZ_NON_OWNING_REF mDocument;  // WEAK
  uint32_t mNonDocumentNodeInfos = 0;

  // Note: it's important that mPrincipal is declared before mDefaultPrincipal,
  // since the latter is initialized to the value of the former in the
  // constructor's init list:
  nsCOMPtr<nsIPrincipal> mPrincipal;         // Never null
  nsCOMPtr<nsIPrincipal> mDefaultPrincipal;  // Never null

  // The following refs are weak to avoid circular ownership.
  NodeInfo* MOZ_NON_OWNING_REF mTextNodeInfo = nullptr;
  NodeInfo* MOZ_NON_OWNING_REF mCommentNodeInfo = nullptr;
  NodeInfo* MOZ_NON_OWNING_REF mDocumentNodeInfo = nullptr;
  NodeInfo* MOZ_NON_OWNING_REF mDocumentFragmentNodeInfo = nullptr;

  NodeInfoCache mRecentlyUsedNodeInfos;
  mozilla::Maybe<bool> mSVGEnabled;     // Lazily initialized.
  mozilla::Maybe<bool> mMathMLEnabled;  // Lazily initialized.

  // For dom_arena_allocator_enabled
  RefPtr<mozilla::dom::DOMArena> mArena;
  bool mHasAllocated = false;
};

#endif /* nsNodeInfoManager_h_ */
