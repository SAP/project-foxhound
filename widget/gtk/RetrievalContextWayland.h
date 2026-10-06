/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef RetrievalContextWayland_h
#define RetrievalContextWayland_h

#include "mozilla/Mutex.h"
#include "nsClipboard.h"
#include "nsWaylandDisplay.h"
#include "nsWindow.h"
#include "WUniquePtr.h"

namespace mozilla::widget {

class nsDragSessionWayland;

class DataOffer {
  NS_INLINE_DECL_REFCOUNTING(DataOffer)

 public:
  explicit DataOffer(wl_data_offer* aDataOffer);

  virtual bool MatchesOffer(wl_data_offer* aDataOffer) {
    return aDataOffer == mWaylandDataOffer;
  }

  void AddMIMEType(const char* aMimeType);

  ClipboardTargets GetTargets();
  bool HasTarget(const char* aMimeType);

  bool DragOfferAccept(const char* aMimeType);
  void SetDragStatus(bool aCanDrop, GdkDragAction aPreferredAction);

  GdkDragAction GetSelectedDragAction();
  void SetSelectedDragAction(uint32_t aWaylandAction);

  void SetAvailableDragActions(uint32_t aWaylandActions);
  GdkDragAction GetAvailableDragActions();

  void DropDataEnter(GtkWidget* aGtkWidget);
  void DropMotion();
  void DropLeave();
  void DropFinish(bool aCanDrop);
  void Drop();

  virtual bool RequestDataTransfer(const char* aMimeType, int fd);

  void SetDropInfo(uint32_t aTime, DesktopIntPoint aPoint);
  nsWindow* GetWindow() { return mWindow; }
  uint32_t GetTime() { return mTime; }
  mozilla::LayoutDeviceIntPoint GetWindowPoint() { return mPoint; }

 protected:
  virtual ~DataOffer();

 private:
  RefPtr<nsDragSessionWayland> GetDragSession(bool aForce);

 private:
  wl_data_offer* mWaylandDataOffer = nullptr;
  nsTArray<GdkAtom> mTargetMIMETypes;

  uint32_t mSelectedDragAction = 0;
  uint32_t mAvailableDragActions = 0;
  uint32_t mTime = 0;
  mozilla::LayoutDeviceIntPoint mPoint;
  RefPtr<nsWindow> mWindow;
};

class PrimaryDataOffer : public DataOffer {
 public:
  explicit PrimaryDataOffer(gtk_primary_selection_offer* aPrimaryDataOffer);
  explicit PrimaryDataOffer(zwp_primary_selection_offer_v1* aPrimaryDataOffer);

  ~PrimaryDataOffer() override;

  bool MatchesOffer(wl_data_offer* aDataOffer) override {
    return aDataOffer ==
               reinterpret_cast<wl_data_offer*>(mPrimaryDataOfferGtk) ||
           aDataOffer ==
               reinterpret_cast<wl_data_offer*>(mPrimaryDataOfferZwpV1);
  }

 private:
  bool RequestDataTransfer(const char* aMimeType, int fd) override;

  gtk_primary_selection_offer* mPrimaryDataOfferGtk;
  zwp_primary_selection_offer_v1* mPrimaryDataOfferZwpV1;
};

class RetrievalContextWayland : public RetrievalContext {
 public:
  explicit RetrievalContextWayland(bool aIsDragContext);

  virtual ClipboardData GetClipboardData(const char* aMimeType,
                                         int32_t aWhichClipboard) override;
  virtual mozilla::GUniquePtr<char> GetClipboardText(
      int32_t aWhichClipboard) override;
  ClipboardTargets GetTargets(int32_t aWhichClipboard) override;

  void RegisterNewDataOffer(wl_data_offer* aDataOffer);
  void RegisterNewDataOffer(gtk_primary_selection_offer* aPrimaryDataOffer);
  void RegisterNewDataOffer(zwp_primary_selection_offer_v1* aPrimaryDataOffer);

  void SetClipboardDataOffer(wl_data_offer* aDataOffer);
  void SetPrimaryDataOffer(gtk_primary_selection_offer* aPrimaryDataOffer);
  void SetPrimaryDataOffer(zwp_primary_selection_offer_v1* aPrimaryDataOffer);
  void AddDragAndDropDataOffer(wl_data_offer* aDataOffer);

  RefPtr<DataOffer> GetDataOffer() { return mDataOffer; }

  void ClearDragAndDropDataOffer();

  bool HasSelectionSupport(void);

 private:
  ~RetrievalContextWayland(void) = default;

  ClipboardData WaitForClipboardData(ClipboardDataType aDataType,
                                     RefPtr<DataOffer> aDataOffer,
                                     const char* aMimeType);
  RefPtr<DataOffer> FindActiveOffer(wl_data_offer* aDataOffer,
                                    bool aRemove = false);
  void InsertOffer(RefPtr<DataOffer> aDataOffer);

 private:
  // Data offers provided by Wayland data device
  nsTArray<RefPtr<DataOffer>> mActiveOffers;
  RefPtr<DataOffer> mClipboardOffer;
  RefPtr<DataOffer> mPrimaryOffer;
  RefPtr<DataOffer> mDataOffer;
  WUniquePtr<wl_data_device> mDataDevice;

  // Mime types used for text data at Wayland,
  // see gdk_wayland_selection_source_handles_target().
  static constexpr int kTextMimeTypesNum = 4;
  static const char* sTextMimeTypes[kTextMimeTypesNum];
};

};  // namespace mozilla::widget

#endif /* RetrievalContextWayland_h */
