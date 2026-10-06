/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_a11y_DocAccessibleParent_h
#define mozilla_a11y_DocAccessibleParent_h

#include "nsAccessibilityService.h"
#include "mozilla/a11y/PDocAccessibleParent.h"
#include "mozilla/a11y/RemoteAccessible.h"
#include "mozilla/dom/BrowserBridgeParent.h"
#include "nsClassHashtable.h"
#include "nsHashKeys.h"
#include "nsIMemoryReporter.h"
#include "nsISupportsImpl.h"

namespace mozilla {
namespace dom {
class CanonicalBrowsingContext;
}

namespace a11y {

class TextRange;
class xpcAccessibleGeneric;

/*
 * These objects live in the main process and comunicate with and represent
 * an accessible document in a content process.
 */
class DocAccessibleParent : public RemoteAccessible,
                            public PDocAccessibleParent,
                            public nsIMemoryReporter {
 public:
  NS_DECL_ISUPPORTS
  NS_DECL_NSIMEMORYREPORTER

 private:
  DocAccessibleParent();

 public:
  static already_AddRefed<DocAccessibleParent> New();

  /**
   * Set this as a top level document; i.e. it is not embedded by another remote
   * document. This also means it is a top level document in its content
   * process.
   * Tab documents are top level documents.
   */
  void SetTopLevel() {
    mTopLevel = true;
    mTopLevelInContentProcess = true;
  }
  bool IsTopLevel() const { return mTopLevel; }

  /**
   * Set this as a top level document in its content process.
   * Note that this could be an out-of-process iframe embedded by a remote
   * embedder document. In that case, IsToplevel() will return false, but
   * IsTopLevelInContentProcess() will return true.
   */
  void SetTopLevelInContentProcess() { mTopLevelInContentProcess = true; }
  bool IsTopLevelInContentProcess() const { return mTopLevelInContentProcess; }

  /**
   * Determine whether this is an out-of-process iframe document, embedded by a
   * remote embedder document.
   */
  bool IsOOPIframeDoc() const {
    return !mTopLevel && mTopLevelInContentProcess;
  }

  bool IsShutdown() const { return mShutdown; }

  /**
   * Mark this actor as shutdown without doing any cleanup.  This should only
   * be called on actors that have just been initialized, so probably only from
   * RecvPDocAccessibleConstructor.
   */
  void MarkAsShutdown() {
    MOZ_ASSERT(mChildDocs.IsEmpty());
    MOZ_ASSERT(mAccessibles.Count() == 0);
    MOZ_ASSERT(!mBrowsingContext);
    mShutdown = true;
  }

  void SetBrowsingContext(dom::CanonicalBrowsingContext* aBrowsingContext);

  dom::CanonicalBrowsingContext* GetBrowsingContext() const {
    return mBrowsingContext;
  }

  /*
   * Called when a message from a document in a child process notifies the main
   * process it is firing an event.
   */
  mozilla::ipc::IPCResult RecvEvent(const uint64_t& aID, const uint32_t& aType);

  mozilla::ipc::IPCResult RecvStateChangeEvent(const uint64_t& aID,
                                               const uint64_t& aState,
                                               const bool& aEnabled);

  mozilla::ipc::IPCResult RecvCaretMoveEvent(
      const uint64_t& aID, const LayoutDeviceIntRect& aCaretRect,
      const int32_t& aOffset, const bool& aIsSelectionCollapsed,
      const bool& aIsAtEndOfLine, const int32_t& aGranularity,
      const bool& aFromUser, const bool& aSuppressEvent);

  mozilla::ipc::IPCResult RecvMutationEvents(
      nsTArray<MutationEventData>&& aData);

  mozilla::ipc::IPCResult RecvRequestAckMutationEvents();

  mozilla::ipc::IPCResult RecvFocusEvent(const uint64_t& aID,
                                         const LayoutDeviceIntRect& aCaretRect);

  mozilla::ipc::IPCResult RecvSelectionEvent(const uint64_t& aID,
                                             const uint64_t& aWidgetID,
                                             const uint32_t& aType);

  mozilla::ipc::IPCResult RecvScrollingEvent(const uint64_t& aID,
                                             const uint64_t& aType,
                                             const uint32_t& aScrollX,
                                             const uint32_t& aScrollY,
                                             const uint32_t& aMaxScrollX,
                                             const uint32_t& aMaxScrollY);

  mozilla::ipc::IPCResult RecvCache(
      const mozilla::a11y::CacheUpdateType& aUpdateType,
      nsTArray<CacheData>&& aData);

  mozilla::ipc::IPCResult RecvSelectedAccessiblesChanged(
      nsTArray<uint64_t>&& aSelectedIDs, nsTArray<uint64_t>&& aUnselectedIDs);

  mozilla::ipc::IPCResult RecvAccessiblesWillMove(nsTArray<uint64_t>&& aIDs);

  mozilla::ipc::IPCResult RecvAnnouncementEvent(const uint64_t& aID,
                                                const nsAString& aAnnouncement,
                                                const uint16_t& aPriority);

  mozilla::ipc::IPCResult RecvTextSelectionChangeEvent(
      const uint64_t& aID, nsTArray<TextRangeData>&& aSelection);

  mozilla::ipc::IPCResult RecvRoleChangedEvent(
      const a11y::role& aRole, const uint8_t& aRoleMapEntryIndex);

  mozilla::ipc::IPCResult RecvBindChildDoc(
      NotNull<PDocAccessibleParent*> aChildDoc, const uint64_t& aID);

  void Unbind() {
    if (RemoteAccessible* parent = RemoteParent()) {
      DocAccessibleParent* parentDoc = parent->Document();
      parent->ClearChildDoc(this);
      DebugOnly<bool> result = parentDoc->mChildDocs.RemoveElement(mActorID);
      MOZ_ASSERT(result);
    }

    SetParent(nullptr);
  }

  mozilla::ipc::IPCResult RecvShutdown();
  void Destroy();
  virtual void ActorDestroy(ActorDestroyReason aWhy) override;

  /*
   * Return the main processes representation of the parent document (if any)
   * of the document this object represents.
   */
  DocAccessibleParent* ParentDoc() const;

  /**
   * Called when a document in a content process notifies the main process of a
   * new child document.
   * Although this is called internally for OOP child documents, these should be
   * added via the BrowserBridgeParent version of this method, as the parent id
   * might not exist yet in that case.
   */
  ipc::IPCResult AddChildDoc(DocAccessibleParent* aChildDoc, uint64_t aParentID,
                             bool aCreating = true);

  /**
   * Called when a document in a content process notifies the main process of a
   * new OOP child document.
   */
  ipc::IPCResult AddChildDoc(dom::BrowserBridgeParent* aBridge);

  void RemovePendingOOPChildDoc(dom::BrowserBridgeParent* aBridge) {
    mPendingOOPChildDocs.Remove(aBridge);
  }

  void RemoveAccessible(RemoteAccessible* aAccessible) {
    MOZ_DIAGNOSTIC_ASSERT(mAccessibles.GetEntry(aAccessible->ID()));
    mAccessibles.RemoveEntry(aAccessible->ID());
  }

  /**
   * Return the accessible for given id.
   */
  RemoteAccessible* GetAccessible(uintptr_t aID) {
    if (!aID) return this;

    ProxyEntry* e = mAccessibles.GetEntry(aID);
    return e ? e->mProxy : nullptr;
  }

  const RemoteAccessible* GetAccessible(uintptr_t aID) const {
    return const_cast<DocAccessibleParent*>(this)->GetAccessible(aID);
  }

  size_t ChildDocCount() const { return mChildDocs.Length(); }
  const DocAccessibleParent* ChildDocAt(size_t aIdx) const {
    return const_cast<DocAccessibleParent*>(this)->ChildDocAt(aIdx);
  }
  DocAccessibleParent* ChildDocAt(size_t aIdx) {
    return LiveDocs().Get(mChildDocs[aIdx]);
  }

#if defined(XP_WIN)
  void MaybeInitWindowEmulation();

  /**
   * Set emulated native window handle for a document.
   * @param aWindowHandle emulated native window handle
   */
  void SetEmulatedWindowHandle(HWND aWindowHandle);
  HWND GetEmulatedWindowHandle() const { return mEmulatedWindowHandle; }
#endif

  // Accessible
  virtual Accessible* Parent() const override {
    if (IsTopLevel()) {
      return OuterDocOfRemoteBrowser();
    }
    return RemoteParent();
  }

  virtual int32_t IndexInParent() const override {
    if (IsTopLevel() && OuterDocOfRemoteBrowser()) {
      // An OuterDoc can only have 1 child.
      return 0;
    }
    return RemoteAccessible::IndexInParent();
  }

  /**
   * Get the focused Accessible in this document, if any.
   */
  RemoteAccessible* GetFocusedAcc() const {
    return const_cast<DocAccessibleParent*>(this)->GetAccessible(mFocus);
  }

  /**
   * Get the HyperText Accessible containing the caret and the offset of the
   * caret within. If there is no caret in this document, returns
   * {nullptr, -1}.
   */
  std::pair<RemoteAccessible*, int32_t> GetCaret() const {
    if (mCaretOffset == -1) {
      return {nullptr, -1};
    }
    RemoteAccessible* acc =
        const_cast<DocAccessibleParent*>(this)->GetAccessible(mCaretId);
    if (!acc) {
      return {nullptr, -1};
    }
    return {acc, mCaretOffset};
  }

  bool IsCaretAtEndOfLine() const { return mIsCaretAtEndOfLine; }

  mozilla::LayoutDeviceIntRect GetCachedCaretRect();

  virtual void SelectionRanges(nsTArray<TextRange>* aRanges) const override;

  virtual Accessible* FocusedChild() override;

  void URL(nsAString& aURL) const;
  void URL(nsACString& aURL) const;

  void MimeType(nsAString& aURL) const;

  virtual Relation RelationByType(RelationType aType) const override;

  // Tracks cached reverse relations (ie. those not set explicitly by an
  // attribute like aria-labelledby) for accessibles in this doc. This map is of
  // the form: {accID, {pointerToRelationDataAddress, [targetAccID, ...]}}
  nsTHashMap<uint64_t, nsTHashMap<const RelationData*, nsTArray<uint64_t>>>
      mReverseRelations;

  // Computed from the viewport cache, the accs referenced by these ids
  // are currently on screen (making any acc not in this list offscreen).
  nsTHashSet<uint64_t> mOnScreenAccessibles;

#ifdef MOZ_WIDGET_COCOA
  // Bounds (in screen-relative Gecko device pixels) of the focused accessible.
  // This is used to suppress redundant notifications on viewport cache updates.
  // This field is updated:
  // - When a focus event is fired, changing the focused accessible
  // - When a viewport cache update is recieved, and the computed bounds for
  //   the focused accessible differ from the last-cached bounds in this field.
  // Nothing() indicates we have not yet computed bounds for the focused acc.
  Maybe<LayoutDeviceIntRect> mFocusedAccBounds;
#endif

  static DocAccessibleParent* GetFrom(dom::BrowsingContext* aBrowsingContext);

  size_t SizeOfExcludingThis(MallocSizeOf aMallocSizeOf) override;

  /**
   * Return the cache domain set that should be used for accessibles in this
   * document.
   */
  uint64_t EffectiveCacheDomains() const;

  /**
   * Return true if every domain in aRequiredCacheDomains is active for
   * accessibles in this document.
   */
  bool DomainsAreActive(uint64_t aRequiredCacheDomains) const {
    return (aRequiredCacheDomains & ~EffectiveCacheDomains()) == 0;
  }

  /**
   * If any domain in aRequiredCacheDomains is not currently active for this
   * document, request that it become active and return true. If all required
   * domains are already active, return false. The caller should treat true as
   * "can't proceed right now": the fields aren't in the cache yet.
   */
  bool RequestDomainsIfInactive(uint64_t aRequiredCacheDomains);

#ifdef MOZ_ENABLE_SKIA_PDF
  mozilla::ipc::IPCResult RecvPrinting();
#endif

 private:
  ~DocAccessibleParent();

  class ProxyEntry : public PLDHashEntryHdr {
   public:
    explicit ProxyEntry(const void*) : mProxy(nullptr) {}
    ProxyEntry(ProxyEntry&& aOther) : mProxy(aOther.mProxy) {
      aOther.mProxy = nullptr;
    }
    ~ProxyEntry() { delete mProxy; }

    typedef uint64_t KeyType;
    typedef const void* KeyTypePointer;

    bool KeyEquals(const void* aKey) const {
      return mProxy->ID() == (uint64_t)aKey;
    }

    static const void* KeyToPointer(uint64_t aKey) { return (void*)aKey; }

    static PLDHashNumber HashKey(const void* aKey) { return (uint64_t)aKey; }

    enum { ALLOW_MEMMOVE = true };

    RemoteAccessible* mProxy;
  };

  RemoteAccessible* CreateAcc(const AccessibleData& aAccData);
  bool AttachChild(RemoteAccessible* aParent, uint32_t aIndex,
                   RemoteAccessible* aChild);
  [[nodiscard]] bool CheckDocTree() const;
  xpcAccessibleGeneric* GetXPCAccessible(RemoteAccessible* aProxy);

  /**
   * Fire an event to both OS and XPCOM consumers.
   */
  void FireEvent(RemoteAccessible* aAcc, const uint32_t& aType);

  /**
   * If this Accessible is being moved, prepare it for reuse. Otherwise, it is
   * being removed, so shut it down.
   */
  void ShutdownOrPrepareForMove(RemoteAccessible* aAcc);

  mozilla::ipc::IPCResult ProcessShowEvent(nsTArray<AccessibleData>&& aNewTree,
                                           const bool& aEventSuppressed,
                                           const bool& aComplete,
                                           const bool& aFromUser);
  mozilla::ipc::IPCResult ProcessHideEvent(const uint64_t& aRootID,
                                           const bool& aFromUser);
  mozilla::ipc::IPCResult ProcessTextChangeEvent(
      const uint64_t& aID, const nsAString& aStr, const int32_t& aStart,
      const uint32_t& aLen, const bool& aIsInsert, const bool& aFromUser);

  nsTArray<uint64_t> mChildDocs;

#if defined(XP_WIN)
  // The handle associated with the emulated window that contains this document
  HWND mEmulatedWindowHandle;
#endif  // defined(XP_WIN)

  /*
   * Conceptually this is a map from IDs to proxies, but we store the ID in the
   * proxy object so we can't use a real map.
   */
  nsTHashtable<ProxyEntry> mAccessibles;
  uint64_t mPendingShowChild = 0;
  uint64_t mPendingShowParent = 0;
  uint32_t mPendingShowIndex = 0;
  nsTHashSet<uint64_t> mMovingIDs;
  uint64_t mActorID;
  bool mTopLevel : 1;
  bool mTopLevelInContentProcess : 1;
  bool mShutdown : 1;
  bool mIsInitialTreeDone : 1 = false;
  RefPtr<dom::CanonicalBrowsingContext> mBrowsingContext;

  nsTHashSet<RefPtr<dom::BrowserBridgeParent>> mPendingOOPChildDocs;

  uint64_t mFocus;
  uint64_t mCaretId;
  int32_t mCaretOffset;
  bool mIsCaretAtEndOfLine;
  LayoutDeviceIntRect mCaretRect;
  nsTArray<TextRangeData> mTextSelections;

  static uint64_t sMaxDocID;
  static nsTHashMap<nsUint64HashKey, DocAccessibleParent*>& LiveDocs() {
    static nsTHashMap<nsUint64HashKey, DocAccessibleParent*> sLiveDocs;
    return sLiveDocs;
  }
};

}  // namespace a11y
}  // namespace mozilla

#endif
