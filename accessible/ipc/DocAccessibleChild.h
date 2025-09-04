/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_a11y_DocAccessibleChild_h
#define mozilla_a11y_DocAccessibleChild_h

#include "mozilla/a11y/DocAccessible.h"
#include "mozilla/a11y/PDocAccessibleChild.h"
#include "mozilla/Unused.h"
#include "nsISupportsImpl.h"

namespace mozilla {
namespace a11y {

class LocalAccessible;
class AccShowEvent;

/**
 * These objects handle content side communication for an accessible document,
 * and their lifetime is the same as the document they represent.
 */
class DocAccessibleChild : public PDocAccessibleChild {
 public:
  DocAccessibleChild(DocAccessible* aDoc,
                     mozilla::ipc::IRefCountedProtocol* aManager)
      : mDoc(aDoc) {
    MOZ_COUNT_CTOR(DocAccessibleChild);
    SetManager(aManager);
  }

  ~DocAccessibleChild() {
    // Shutdown() should have been called, but maybe it isn't if the process is
    // killed?
    MOZ_ASSERT(!mDoc);
    if (mDoc) {
      mDoc->SetIPCDoc(nullptr);
    }

    MOZ_COUNT_DTOR(DocAccessibleChild);
  }

  virtual void Shutdown() {
    DetachDocument();
    SendShutdown();
  }

  /**
   * Serializes a shown tree and pushes the show event data to the mutation
   * event queue with PushMutationEventData. This function may push multiple
   * show events depending on the size of the flattened tree.
   */
  void InsertIntoIpcTree(LocalAccessible* aChild, bool aSuppressShowEvent);
  void ShowEvent(AccShowEvent* aShowEvent);

  /**
   * Append the mutation event to mutation event queue, potentially creating a
   * new batch of mutation events. This function may send queued mutation events
   * if the number of batches meets or exceeds a set limit.
   */
  void PushMutationEventData(MutationEventData aData, uint32_t aAccCount = 1);
  void SendQueuedMutationEvents();
  size_t MutationEventQueueLength() const;

  bool HasUnackedMutationEvents() const { return mHasUnackedMutationEvents; }

  virtual void ActorDestroy(ActorDestroyReason) override {
    if (!mDoc) {
      return;
    }

    mDoc->SetIPCDoc(nullptr);
    mDoc = nullptr;
  }

  virtual mozilla::ipc::IPCResult RecvTakeFocus(const uint64_t& aID) override;

  MOZ_CAN_RUN_SCRIPT_BOUNDARY
  virtual mozilla::ipc::IPCResult RecvScrollTo(
      const uint64_t& aID, const uint32_t& aScrollType) override;

  virtual mozilla::ipc::IPCResult RecvTakeSelection(
      const uint64_t& aID) override;
  virtual mozilla::ipc::IPCResult RecvSetSelected(const uint64_t& aID,
                                                  const bool& aSelect) override;

  virtual mozilla::ipc::IPCResult RecvVerifyCache(
      const uint64_t& aID, const uint64_t& aCacheDomain,
      AccAttributes* aFields) override;

  virtual mozilla::ipc::IPCResult RecvDoActionAsync(
      const uint64_t& aID, const uint8_t& aIndex) override;

  virtual mozilla::ipc::IPCResult RecvSetCaretOffset(
      const uint64_t& aID, const int32_t& aOffset) override;

  MOZ_CAN_RUN_SCRIPT_BOUNDARY
  virtual mozilla::ipc::IPCResult RecvSetTextSelection(
      const uint64_t& aStartID, const int32_t& aStartOffset,
      const uint64_t& aEndID, const int32_t& aEndOffset,
      const int32_t& aSelectionNum) override;

  MOZ_CAN_RUN_SCRIPT_BOUNDARY
  virtual mozilla::ipc::IPCResult RecvScrollTextLeafRangeIntoView(
      const uint64_t& aStartID, const int32_t& aStartOffset,
      const uint64_t& aEndID, const int32_t& aEndOffset,
      const uint32_t& aScrollType) override;

  virtual mozilla::ipc::IPCResult RecvRemoveTextSelection(
      const uint64_t& aID, const int32_t& aSelectionNum) override;

  virtual mozilla::ipc::IPCResult RecvSetCurValue(
      const uint64_t& aID, const double& aValue) override;

  virtual mozilla::ipc::IPCResult RecvReplaceText(
      const uint64_t& aID, const nsAString& aText) override;

  virtual mozilla::ipc::IPCResult RecvInsertText(
      const uint64_t& aID, const nsAString& aText,
      const int32_t& aPosition) override;

  virtual mozilla::ipc::IPCResult RecvCopyText(const uint64_t& aID,
                                               const int32_t& aStartPos,
                                               const int32_t& aEndPos) override;

  virtual mozilla::ipc::IPCResult RecvCutText(const uint64_t& aID,
                                              const int32_t& aStartPos,
                                              const int32_t& aEndPos) override;

  virtual mozilla::ipc::IPCResult RecvDeleteText(
      const uint64_t& aID, const int32_t& aStartPos,
      const int32_t& aEndPos) override;

  MOZ_CAN_RUN_SCRIPT_BOUNDARY
  virtual mozilla::ipc::IPCResult RecvPasteText(
      const uint64_t& aID, const int32_t& aPosition) override;

  virtual mozilla::ipc::IPCResult RecvRestoreFocus() override;

  virtual mozilla::ipc::IPCResult RecvScrollToPoint(const uint64_t& aID,
                                                    const uint32_t& aScrollType,
                                                    const int32_t& aX,
                                                    const int32_t& aY) override;

  bool SendCaretMoveEvent(const uint64_t& aID, const int32_t& aOffset,
                          const bool& aIsSelectionCollapsed,
                          const bool& aIsAtEndOfLine,
                          const int32_t& aGranularity, bool aFromUser);
  bool SendFocusEvent(const uint64_t& aID);

#if !defined(XP_WIN)
  virtual mozilla::ipc::IPCResult RecvAnnounce(
      const uint64_t& aID, const nsAString& aAnnouncement,
      const uint16_t& aPriority) override;
#endif  // !defined(XP_WIN)

  virtual mozilla::ipc::IPCResult RecvScrollSubstringToPoint(
      const uint64_t& aID, const int32_t& aStartOffset,
      const int32_t& aEndOffset, const uint32_t& aCoordinateType,
      const int32_t& aX, const int32_t& aY) override;

  virtual mozilla::ipc::IPCResult RecvAckMutationEvents() override;

 private:
  LayoutDeviceIntRect GetCaretRectFor(const uint64_t& aID);

  // Set to true if we have sent mutation events that have not yet been
  // acknowledged by the parent process. We only request and receive one ACK per
  // tick, regardless of how many mutation events we send. Additional ticks
  // cannot occur (and thus additional mutation events cannot be sent) before we
  // receive this ACK.
  bool mHasUnackedMutationEvents = false;

 protected:
  static void FlattenTree(LocalAccessible* aRoot,
                          nsTArray<LocalAccessible*>& aTree);

  static AccessibleData SerializeAcc(LocalAccessible* aAcc);

  void DetachDocument() {
    if (mDoc) {
      mDoc->SetIPCDoc(nullptr);
      mDoc = nullptr;
    }
  }

  LocalAccessible* IdToAccessible(const uint64_t& aID) const;
  HyperTextAccessible* IdToHyperTextAccessible(const uint64_t& aID) const;

  DocAccessible* mDoc;

  // Utility structure that encapsulates mutation event batching.
  struct MutationEventBatcher {
    void PushMutationEventData(MutationEventData aData, uint32_t aAccCount,
                               DocAccessibleChild& aDocAcc);
    void SendQueuedMutationEvents(DocAccessibleChild& aDocAcc);
    uint32_t AccCount() const { return mAccCount; }
    size_t EventCount() const { return mMutationEventData.Length(); }

   private:
    // A batch of mutation events to be sent in one IPC message.
    nsTArray<MutationEventData> mMutationEventData;

    // The number of accessibles in the mutation event data batch. A show event
    // may have many accessibles shown, where each accessible in the show event
    // counts separately here. Every other mutation event adds one to this
    // count.
    uint32_t mAccCount = 0;
  };
  MutationEventBatcher mMutationEventBatcher;

  friend void DocAccessible::DoInitialUpdate();
};

}  // namespace a11y
}  // namespace mozilla

#endif  // mozilla_a11y_DocAccessibleChild_h
