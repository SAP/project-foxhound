/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "RetrievalContextWayland.h"

#include "AsyncClipboardRequest.h"
#include "mozilla/TimeStamp.h"
#include "nsDragService.h"
#include "nsDragServiceWayland.h"
#include "nsWindow.h"
#include "mozwayland/mozwayland.h"
#include "nsWaylandDisplay.h"
#include "mozilla/StaticPrefs_widget.h"
#include "nsThreadUtils.h"
#include "prtime.h"
#include <poll.h>
#include <fcntl.h>
#include <errno.h>
#include <gtk/gtk.h>

using namespace mozilla;
using namespace mozilla::widget;

#ifdef MOZ_LOGGING
extern mozilla::LazyLogModule gWidgetDragLog;
#  define LOGDRAG(...) \
    MOZ_LOG(gWidgetDragLog, mozilla::LogLevel::Debug, (__VA_ARGS__))
#else
#  define LOGDRAG(...)
#endif

const char* RetrievalContextWayland::sTextMimeTypes[kTextMimeTypesNum] = {
    "text/plain;charset=utf-8", "UTF8_STRING", "text/plain", "STRING"};

static inline GdkDragAction wl_to_gdk_actions(uint32_t dnd_actions) {
  GdkDragAction actions = GdkDragAction(0);

  if (dnd_actions & WL_DATA_DEVICE_MANAGER_DND_ACTION_COPY) {
    actions = GdkDragAction(actions | GDK_ACTION_COPY);
  }
  if (dnd_actions & WL_DATA_DEVICE_MANAGER_DND_ACTION_MOVE) {
    actions = GdkDragAction(actions | GDK_ACTION_MOVE);
  }

  return actions;
}

static inline uint32_t gdk_to_wl_actions(GdkDragAction action) {
  uint32_t dnd_actions = WL_DATA_DEVICE_MANAGER_DND_ACTION_NONE;

  if (action & (GDK_ACTION_COPY | GDK_ACTION_LINK | GDK_ACTION_PRIVATE)) {
    dnd_actions |= WL_DATA_DEVICE_MANAGER_DND_ACTION_COPY;
  }
  if (action & GDK_ACTION_MOVE) {
    dnd_actions |= WL_DATA_DEVICE_MANAGER_DND_ACTION_MOVE;
  }

  return dnd_actions;
}

static GtkWidget* get_gtk_widget_for_wl_surface(struct wl_surface* surface) {
  auto* gdkParentWindow =
      static_cast<GdkWindow*>(wl_surface_get_user_data(surface));

  gpointer user_data = nullptr;
  gdk_window_get_user_data(gdkParentWindow, &user_data);

  return GTK_WIDGET(user_data);
}

static void data_offer_offer(void* data, struct wl_data_offer* wl_data_offer,
                             const char* type) {
  auto* offer = static_cast<DataOffer*>(data);
  MOZ_CLIPBOARD_LOG("data_offer_offer() [%p] MIME %s", wl_data_offer, type);
  offer->AddMIMEType(type);
}

/* Advertise all available drag and drop actions from source.
 * We don't use that but follow gdk_wayland_drag_context_commit_status()
 * from gdkdnd-wayland.c here.
 */
static void data_offer_source_actions(void* data,
                                      struct wl_data_offer* wl_data_offer,
                                      uint32_t source_actions) {
  auto* dataOffer = static_cast<DataOffer*>(data);
  dataOffer->SetAvailableDragActions(source_actions);
}

/* Advertise recently selected drag and drop action by compositor, based
 * on source actions and user choice (key modifiers, etc.).
 */
static void data_offer_action(void* data, struct wl_data_offer* wl_data_offer,
                              uint32_t dnd_action) {
  auto* dataOffer = static_cast<DataOffer*>(data);
  dataOffer->SetSelectedDragAction(dnd_action);
}

/* wl_data_offer callback description:
 *
 * data_offer_offer - Is called for each MIME type available at wl_data_offer.
 * data_offer_source_actions - This event indicates the actions offered by
 *                             the data source.
 * data_offer_action - This event indicates the action selected by
 *                     the compositor after matching the source/destination
 *                     side actions.
 */
static const moz_wl_data_offer_listener data_offer_listener = {
    data_offer_offer, data_offer_source_actions, data_offer_action};

DataOffer::DataOffer(wl_data_offer* aDataOffer)
    : mWaylandDataOffer(aDataOffer) {
  if (mWaylandDataOffer) {
    wl_data_offer_add_listener(
        mWaylandDataOffer, (struct wl_data_offer_listener*)&data_offer_listener,
        this);
  }
}

DataOffer::~DataOffer() {
  g_clear_pointer(&mWaylandDataOffer, wl_data_offer_destroy);
}

bool DataOffer::RequestDataTransfer(const char* aMimeType, int fd) {
  MOZ_CLIPBOARD_LOG("DataOffer::RequestDataTransfer MIME %s FD %d offer %p",
                    aMimeType, fd, mWaylandDataOffer);
  if (!mWaylandDataOffer) {
    return false;
  }

  wl_data_offer_receive(mWaylandDataOffer, aMimeType, fd);
  wl_display_flush(WaylandDisplayGet()->GetDisplay());
  return true;
}

void DataOffer::AddMIMEType(const char* aMimeType) {
  GdkAtom atom = gdk_atom_intern(aMimeType, FALSE);
  mTargetMIMETypes.AppendElement(atom);
}

ClipboardTargets DataOffer::GetTargets() {
  return ClipboardTargets(mTargetMIMETypes.Clone());
}

bool DataOffer::HasTarget(const char* aMimeType) {
  int length = mTargetMIMETypes.Length();
  for (int32_t j = 0; j < length; j++) {
    if (mTargetMIMETypes[j] == gdk_atom_intern(aMimeType, FALSE)) {
      MOZ_CLIPBOARD_LOG("DataOffer::HasTarget() [%p] we have mime %s\n", this,
                        aMimeType);
      return true;
    }
  }
  MOZ_CLIPBOARD_LOG("DataOffer::HasTarget() [%p] missing mime %s\n", this,
                    aMimeType);
  return false;
}

bool DataOffer::DragOfferAccept(const char* aMimeType) {
  LOGDRAG("DataOffer::DragOfferAccept() [%p] MIME %s mTime %d offer %p", this,
          aMimeType, mTime, mWaylandDataOffer);
  if (!HasTarget(aMimeType)) {
    MOZ_CLIPBOARD_LOG("  DataOffer: DataOffer does not contain %s MIME!\n",
                      aMimeType);
    return false;
  }
  MOZ_DIAGNOSTIC_ASSERT(mWaylandDataOffer);
  wl_data_offer_accept(mWaylandDataOffer, mTime, aMimeType);
  return true;
}

/* We follow logic of gdk_wayland_drag_context_commit_status()/gdkdnd-wayland.c
 * here.
 */
void DataOffer::SetDragStatus(bool aCanDrop, GdkDragAction aPreferredAction) {
  uint32_t preferredAction = gdk_to_wl_actions(aPreferredAction);
  uint32_t allowedActions = WL_DATA_DEVICE_MANAGER_DND_ACTION_NONE;

  LOGDRAG("DataOffer::SetDragStatus() [%p] aPreferredAction %d", this,
          aPreferredAction);
  if (!mWaylandDataOffer) {
    return;
  }

  if (aCanDrop) {
    allowedActions = WL_DATA_DEVICE_MANAGER_DND_ACTION_COPY |
                     WL_DATA_DEVICE_MANAGER_DND_ACTION_MOVE;
  }

  wl_data_offer_set_actions(mWaylandDataOffer, allowedActions, preferredAction);

  /* Workaround Wayland D&D architecture here. To get the data_device_drop()
     signal (which routes to nsDragService::GetData() call) we need to
     accept at least one mime type before data_device_leave().

     Real wl_data_offer_accept() for actualy requested data mime type is
     called from nsDragService::GetData().
  */
  if (!mTargetMIMETypes.IsEmpty() && mTargetMIMETypes[0]) {
    GUniquePtr<gchar> name(gdk_atom_name(mTargetMIMETypes[0]));
    wl_data_offer_accept(mWaylandDataOffer, mTime, name.get());
  }
}

void DataOffer::SetSelectedDragAction(uint32_t aWaylandAction) {
  LOGDRAG("DataOffer::SetSelectedDragAction() [%p] action %d", this,
          aWaylandAction);
  mSelectedDragAction = aWaylandAction;
}

GdkDragAction DataOffer::GetSelectedDragAction() {
  return wl_to_gdk_actions(mSelectedDragAction);
}

void DataOffer::SetAvailableDragActions(uint32_t aWaylandActions) {
  LOGDRAG("DataOffer::SetAvailableDragActions() [%p] actions %d", this,
          aWaylandActions);
  mAvailableDragActions = aWaylandActions;
}

bool PrimaryDataOffer::RequestDataTransfer(const char* aMimeType, int fd) {
  if (!mPrimaryDataOfferGtk && !mPrimaryDataOfferZwpV1) {
    return false;
  }
  if (mPrimaryDataOfferGtk) {
    gtk_primary_selection_offer_receive(mPrimaryDataOfferGtk, aMimeType, fd);
  }
  if (mPrimaryDataOfferZwpV1) {
    zwp_primary_selection_offer_v1_receive(mPrimaryDataOfferZwpV1, aMimeType,
                                           fd);
  }
  wl_display_flush(WaylandDisplayGet()->GetDisplay());
  return true;
}

static void primary_data_offer(
    void* data, gtk_primary_selection_offer* primary_selection_offer,
    const char* mime_type) {
  MOZ_CLIPBOARD_LOG("Primary data offer [%p] add MIME %s\n",
                    primary_selection_offer, mime_type);
  auto* offer = static_cast<DataOffer*>(data);
  offer->AddMIMEType(mime_type);
}

static void primary_data_offer(
    void* data, zwp_primary_selection_offer_v1* primary_selection_offer,
    const char* mime_type) {
  MOZ_CLIPBOARD_LOG("Primary data offer [%p] add MIME %s\n",
                    primary_selection_offer, mime_type);
  auto* offer = static_cast<DataOffer*>(data);
  offer->AddMIMEType(mime_type);
}

/* gtk_primary_selection_offer_listener callback description:
 *
 * primary_data_offer - Is called for each MIME type available at
 *                      gtk_primary_selection_offer.
 */
static const struct gtk_primary_selection_offer_listener
    primary_selection_offer_listener_gtk = {primary_data_offer};

static const struct zwp_primary_selection_offer_v1_listener
    primary_selection_offer_listener_zwp_v1 = {primary_data_offer};

PrimaryDataOffer::PrimaryDataOffer(
    gtk_primary_selection_offer* aPrimaryDataOffer)
    : DataOffer(nullptr),
      mPrimaryDataOfferGtk(aPrimaryDataOffer),
      mPrimaryDataOfferZwpV1(nullptr) {
  gtk_primary_selection_offer_add_listener(
      aPrimaryDataOffer, &primary_selection_offer_listener_gtk, this);
}

PrimaryDataOffer::PrimaryDataOffer(
    zwp_primary_selection_offer_v1* aPrimaryDataOffer)
    : DataOffer(nullptr),
      mPrimaryDataOfferGtk(nullptr),
      mPrimaryDataOfferZwpV1(aPrimaryDataOffer) {
  zwp_primary_selection_offer_v1_add_listener(
      aPrimaryDataOffer, &primary_selection_offer_listener_zwp_v1, this);
}

PrimaryDataOffer::~PrimaryDataOffer(void) {
  if (mPrimaryDataOfferGtk) {
    gtk_primary_selection_offer_destroy(mPrimaryDataOfferGtk);
  }
  if (mPrimaryDataOfferZwpV1) {
    zwp_primary_selection_offer_v1_destroy(mPrimaryDataOfferZwpV1);
  }
}

void DataOffer::DropDataEnter(GtkWidget* aGtkWidget) {
  mWindow = nsWindow::FromGtkWidget(aGtkWidget);
  LOGDRAG("DataOffer::DropDataEnter() [%p] nsWindow [%p]", this, mWindow.get());
}

void DataOffer::SetDropInfo(uint32_t aTime, DesktopIntPoint aPoint) {
  mTime = aTime;
  if (mWindow) {
    // We're getting aX,aY in mShell coordinates space.
    // mContainer is shifted by CSD decorations so translate the coords
    // to mContainer space where our content lives.
    mPoint = mWindow->ToLayoutDevicePixels(aPoint) - mWindow->GetClientOffset();
  }
  LOGDRAG(
      "DataOffer::SetDropInfo() [%p] nsWindow [%p] time %u point [%d, "
      "%d]",
      this, mWindow.get(), mTime, (int)mPoint.x, (int)mPoint.y);
}

// If aForce = true we create a new session if there isn't any one.
RefPtr<nsDragSessionWayland> DataOffer::GetDragSession(bool aForce) {
  if (!mWindow || !mWindow->GetGdkWindow()) {
    LOGDRAG("DataOffer::GetDragSession(): missing mWindow, quit!");
    return nullptr;
  }
  RefPtr<nsDragService> dragService = nsDragService::GetInstance();
  NS_ENSURE_TRUE(dragService, nullptr);
  RefPtr<nsDragSessionWayland> dragSession = static_cast<nsDragSessionWayland*>(
      dragService->GetCurrentSession(mWindow));
  if (!dragSession && aForce) {
    LOGDRAG(
        "DataOffer::GetDragSession(): missing current session, creating a new "
        "one.");
    // This may be the start of an external drag session.
    nsIWidget* widget = mWindow;
    dragSession = static_cast<nsDragSessionWayland*>(
        dragService->StartDragSession(widget));
  }
  NS_ENSURE_TRUE(dragSession, nullptr);
  dragSession->MarkAsActive();
  return dragSession;
}

void DataOffer::DropMotion() {
  LOGDRAG("DataOffer::DropMotion() [%p]", mWindow.get());
  RefPtr<nsDragSessionWayland> dragSession = GetDragSession(/* aForce */ true);
  if (!dragSession) {
    return;
  }
  nsDragSession::AutoEventLoop loop(dragSession);

  dragSession->UpdateDragAction(this);
  dragSession->ReplyToDragMotion(this);

  dragSession->ScheduleMotionEvent(this);
}

void DataOffer::Drop() {
  LOGDRAG("DataOffer::Drop() [%p]", mWindow.get());
  RefPtr<nsDragSessionWayland> dragSession = GetDragSession(/* aForce */ true);
  if (!dragSession) {
    return;
  }
  nsDragSession::AutoEventLoop loop(dragSession);
  dragSession->ScheduleDropEvent(this);
}

void DataOffer::DropLeave() {
  LOGDRAG("DataOffer::DropLeave() [%p]", mWindow.get());
  RefPtr<nsDragSessionWayland> dragSession = GetDragSession(/* aForce */ false);
  if (!dragSession) {
    return;
  }
  nsDragSession::AutoEventLoop loop(dragSession);
  dragSession->ScheduleLeaveEvent();
}

void DataOffer::DropFinish(bool aCanDrop) {
  LOGDRAG("DataOffer::DropFinish() [%p] can drop %d", mWindow.get(), aCanDrop);
  if (!mWaylandDataOffer) {
    return;
  }
  if (aCanDrop) {
    wl_data_offer_finish(mWaylandDataOffer);
  }
  // wl_data_offer can't be used after wl_data_offer_finish() but we don't
  // want to use it anyway.
  g_clear_pointer(&mWaylandDataOffer, wl_data_offer_destroy);
}

GdkDragAction DataOffer::GetAvailableDragActions() {
  GdkDragAction gdkAction = GetSelectedDragAction();

  // We emulate gdk_drag_context_get_actions() here.
  if (!gdkAction) {
    gdkAction = wl_to_gdk_actions(mAvailableDragActions);
  }

  return gdkAction;
}

RefPtr<DataOffer> RetrievalContextWayland::FindActiveOffer(
    wl_data_offer* aDataOffer, bool aRemove) {
  MOZ_CLIPBOARD_LOG("RetrievalContextWayland::FindActiveOffer() offer num [%d]",
                    int(mActiveOffers.Length()));
  const int len = mActiveOffers.Length();
  for (int i = 0; i < len; i++) {
    if (mActiveOffers[i] && mActiveOffers[i]->MatchesOffer(aDataOffer)) {
      RefPtr<DataOffer> ret = mActiveOffers[i];
      if (aRemove) {
        mActiveOffers[i] = nullptr;
      }
      return ret;
    }
  }
  return nullptr;
}

void RetrievalContextWayland::InsertOffer(RefPtr<DataOffer> aDataOffer) {
  MOZ_CLIPBOARD_LOG("RetrievalContextWayland::InsertOffer() offer num [%d]",
                    int(mActiveOffers.Length()));
  const int len = mActiveOffers.Length();
  for (int i = 0; i < len; i++) {
    if (!mActiveOffers[i]) {
      mActiveOffers[i] = aDataOffer;
      return;
    }
  }
  mActiveOffers.AppendElement(aDataOffer);
}

void RetrievalContextWayland::RegisterNewDataOffer(wl_data_offer* aDataOffer) {
  MOZ_CLIPBOARD_LOG(
      "RetrievalContextWayland::RegisterNewDataOffer (wl_data_offer) [%p]\n",
      aDataOffer);

  if (FindActiveOffer(aDataOffer)) {
    MOZ_CLIPBOARD_LOG("  offer already exists, protocol error?\n");
    return;
  }

  InsertOffer(new DataOffer(aDataOffer));
}

void RetrievalContextWayland::RegisterNewDataOffer(
    gtk_primary_selection_offer* aPrimaryDataOffer) {
  MOZ_CLIPBOARD_LOG(
      "RetrievalContextWayland::RegisterNewDataOffer (primary) %p\n",
      aPrimaryDataOffer);

  if (FindActiveOffer((wl_data_offer*)aPrimaryDataOffer)) {
    MOZ_CLIPBOARD_LOG("  offer already exists, protocol error?\n");
    return;
  }

  InsertOffer(new PrimaryDataOffer(aPrimaryDataOffer));
}

void RetrievalContextWayland::RegisterNewDataOffer(
    zwp_primary_selection_offer_v1* aPrimaryDataOffer) {
  MOZ_CLIPBOARD_LOG(
      "RetrievalContextWayland::RegisterNewDataOffer (primary ZWP) %p\n",
      aPrimaryDataOffer);

  if (FindActiveOffer(reinterpret_cast<wl_data_offer*>(aPrimaryDataOffer))) {
    MOZ_CLIPBOARD_LOG("  offer already exists, protocol error?\n");
    return;
  }

  InsertOffer(new PrimaryDataOffer(aPrimaryDataOffer));
}

void RetrievalContextWayland::SetClipboardDataOffer(wl_data_offer* aDataOffer) {
  MOZ_CLIPBOARD_LOG(
      "RetrievalContextWayland::SetClipboardDataOffer (wl_data_offer) %p",
      aDataOffer);

  // Delete existing clipboard data offer
  mClipboardOffer = nullptr;

  // null aDataOffer indicates that our clipboard content
  // is no longer valid and should be released.
  if (aDataOffer) {
    mClipboardOffer = FindActiveOffer(aDataOffer, /* remove */ true);
  }
}

void RetrievalContextWayland::SetPrimaryDataOffer(
    gtk_primary_selection_offer* aPrimaryDataOffer) {
  MOZ_CLIPBOARD_LOG(
      "RetrievalContextWayland::SetPrimaryDataOffer (primary) [%p]",
      aPrimaryDataOffer);

  // Release any primary offer we have.
  mPrimaryOffer = nullptr;

  // aPrimaryDataOffer can be null which means we lost
  // the mouse selection.
  if (aPrimaryDataOffer) {
    mPrimaryOffer = FindActiveOffer(
        reinterpret_cast<wl_data_offer*>(aPrimaryDataOffer), /* remove */ true);
  }
}

void RetrievalContextWayland::SetPrimaryDataOffer(
    zwp_primary_selection_offer_v1* aPrimaryDataOffer) {
  MOZ_CLIPBOARD_LOG(
      "RetrievalContextWayland::SetPrimaryDataOffer (primary ZWP) [%p]",
      aPrimaryDataOffer);

  // Release any primary offer we have.
  mPrimaryOffer = nullptr;

  // aPrimaryDataOffer can be null which means we lost
  // the mouse selection.
  if (aPrimaryDataOffer) {
    mPrimaryOffer =
        FindActiveOffer((wl_data_offer*)aPrimaryDataOffer, /* remove */ true);
  }
}

void RetrievalContextWayland::AddDragAndDropDataOffer(
    wl_data_offer* aDropDataOffer) {
  LOGDRAG("RetrievalContextWayland::AddDragAndDropDataOffer %p\n",
          aDropDataOffer);
  // Remove any existing D&D contexts.
  mDataOffer = nullptr;
  if (aDropDataOffer) {
    mDataOffer = FindActiveOffer(aDropDataOffer, /* remove */ true);
  }
}

// We have a new fresh data content.
// We should attach listeners to it and save for further use.
static void data_device_data_offer(void* data,
                                   struct wl_data_device* data_device,
                                   struct wl_data_offer* offer) {
  MOZ_CLIPBOARD_LOG("data_device_data_offer(), wl_data_offer %p\n", offer);
  RetrievalContextWayland* context =
      static_cast<RetrievalContextWayland*>(data);
  context->RegisterNewDataOffer(offer);
}

// The new fresh data content is clipboard.
static void data_device_selection(void* data,
                                  struct wl_data_device* wl_data_device,
                                  struct wl_data_offer* offer) {
  MOZ_CLIPBOARD_LOG("data_device_selection(), set wl_data_offer %p\n", offer);
  RetrievalContextWayland* context =
      static_cast<RetrievalContextWayland*>(data);
  context->SetClipboardDataOffer(offer);
}

// The new fresh wayland data content is drag and drop.
static void data_device_enter(void* data, struct wl_data_device* data_device,
                              uint32_t time, struct wl_surface* surface,
                              int32_t x_fixed, int32_t y_fixed,
                              struct wl_data_offer* offer) {
  RetrievalContextWayland* context =
      static_cast<RetrievalContextWayland*>(data);
  MOZ_DIAGNOSTIC_ASSERT(context);
  context->AddDragAndDropDataOffer(offer);

  RefPtr<DataOffer> dataOffer = context->GetDataOffer();
  LOGDRAG("data_device_enter() DataOffer [%p]", dataOffer.get());

  if (dataOffer) {
    GtkWidget* gtkWidget = get_gtk_widget_for_wl_surface(surface);
    if (!gtkWidget) {
      NS_WARNING("DragAndDrop: Unable to get GtkWidget for wl_surface!");
      return;
    }
    LOGDRAG("data_device_enter() GtkWidget [%p]", (void*)gtkWidget);
    dataOffer->DropDataEnter(gtkWidget);
    dataOffer->SetDropInfo(time, DesktopIntPoint(wl_fixed_to_int(x_fixed),
                                                 wl_fixed_to_int(y_fixed)));
  }
}

static void data_device_leave(void* data, struct wl_data_device* data_device) {
  RetrievalContextWayland* context =
      static_cast<RetrievalContextWayland*>(data);
  MOZ_DIAGNOSTIC_ASSERT(context);

  RefPtr<DataOffer> dataOffer = context->GetDataOffer();
  LOGDRAG("data_device_leave() offer [%p]", dataOffer.get());
  if (dataOffer) {
    dataOffer->DropLeave();
  }
}

static void data_device_motion(void* data, struct wl_data_device* data_device,
                               uint32_t time, int32_t x_fixed,
                               int32_t y_fixed) {
  RetrievalContextWayland* context =
      static_cast<RetrievalContextWayland*>(data);
  MOZ_DIAGNOSTIC_ASSERT(context);
  RefPtr<DataOffer> dataOffer = context->GetDataOffer();
  LOGDRAG("data_device_motion() offer [%p]", dataOffer.get());
  if (dataOffer) {
    dataOffer->SetDropInfo(time, DesktopIntPoint(wl_fixed_to_int(x_fixed),
                                                 wl_fixed_to_int(y_fixed)));
    dataOffer->DropMotion();
  }
}

static void data_device_drop(void* data, struct wl_data_device* data_device) {
  RetrievalContextWayland* context =
      static_cast<RetrievalContextWayland*>(data);
  MOZ_DIAGNOSTIC_ASSERT(context);

  RefPtr<DataOffer> dataOffer = context->GetDataOffer();
  LOGDRAG("data_device_drop() offer [%p]", dataOffer.get());
  if (dataOffer) {
    dataOffer->Drop();
  }
}

/* wl_data_device callback description:
 *
 * data_device_data_offer - It's called when there's a new wl_data_offer
 *                          available. We need to attach wl_data_offer_listener
 *                          to it to get available MIME types.
 *
 * data_device_selection - It's called when the new wl_data_offer
 *                         is a clipboard content.
 * data_device_enter - It's called when the new wl_data_offer is a drag & drop
 *                     content and it's tied to actual wl_surface.
 *
 * data_device_leave - It's called when the wl_data_offer (drag & drop) is not
 *                     valid any more.
 * data_device_motion - It's called when the drag and drop selection moves
 *                      across wl_surface.
 * data_device_drop - It's called when D&D operation is sucessfully finished
 *                    and we can read the data from D&D.
 *                    It's generated only if we call wl_data_offer_accept() and
 *                    wl_data_offer_set_actions() from data_device_motion
 *                    callback.
 */
static const struct wl_data_device_listener data_device_listener = {
    data_device_data_offer, data_device_enter, data_device_leave,
    data_device_motion,     data_device_drop,  data_device_selection};

static void primary_selection_data_offer(
    void* data, struct gtk_primary_selection_device* primary_selection_device,
    struct gtk_primary_selection_offer* primary_offer) {
  MOZ_CLIPBOARD_LOG("primary_selection_data_offer()\n");
  // create and add listener
  RetrievalContextWayland* context =
      static_cast<RetrievalContextWayland*>(data);
  context->RegisterNewDataOffer(primary_offer);
}

static void primary_selection_data_offer(
    void* data,
    struct zwp_primary_selection_device_v1* primary_selection_device,
    struct zwp_primary_selection_offer_v1* primary_offer) {
  MOZ_CLIPBOARD_LOG("primary_selection_data_offer()\n");
  // create and add listener
  RetrievalContextWayland* context =
      static_cast<RetrievalContextWayland*>(data);
  context->RegisterNewDataOffer(primary_offer);
}

static void primary_selection_selection(
    void* data, struct gtk_primary_selection_device* primary_selection_device,
    struct gtk_primary_selection_offer* primary_offer) {
  MOZ_CLIPBOARD_LOG("primary_selection_selection()\n");
  RetrievalContextWayland* context =
      static_cast<RetrievalContextWayland*>(data);
  context->SetPrimaryDataOffer(primary_offer);
}

static void primary_selection_selection(
    void* data,
    struct zwp_primary_selection_device_v1* primary_selection_device,
    struct zwp_primary_selection_offer_v1* primary_offer) {
  MOZ_CLIPBOARD_LOG("primary_selection_selection()\n");
  RetrievalContextWayland* context =
      static_cast<RetrievalContextWayland*>(data);
  context->SetPrimaryDataOffer(primary_offer);
}

/* gtk_primary_selection_device callback description:
 *
 * primary_selection_data_offer - It's called when there's a new
 *                          gtk_primary_selection_offer available.  We need to
 *                          attach gtk_primary_selection_offer_listener to it
 *                          to get available MIME types.
 *
 * primary_selection_selection - It's called when the new
 *                          gtk_primary_selection_offer is a primary selection
 *                          content. It can be also called with
 *                          gtk_primary_selection_offer = null which means
 *                          there's no primary selection.
 */
static const struct gtk_primary_selection_device_listener
    primary_selection_device_listener_gtk = {
        primary_selection_data_offer,
        primary_selection_selection,
};

static const struct zwp_primary_selection_device_v1_listener
    primary_selection_device_listener_zwp_v1 = {
        primary_selection_data_offer,
        primary_selection_selection,
};

bool RetrievalContextWayland::HasSelectionSupport(void) {
  return (
      WaylandDisplayGet()->GetPrimarySelectionDeviceManagerZwpV1() != nullptr ||
      WaylandDisplayGet()->GetPrimarySelectionDeviceManagerGtk() != nullptr);
}

void RetrievalContextWayland::ClearDragAndDropDataOffer(void) {
  LOGDRAG("RetrievalContextWayland::ClearDragAndDropDataOffer()\n");
  mDataOffer = nullptr;
}

RetrievalContextWayland::RetrievalContextWayland(bool aIsDragContext) {
  LOGDRAG("RetrievalContextWayland::RetrievalContextWayland()");
  auto* display = WaylandDisplayGet();

  mDataDevice =
      WUniquePtr<wl_data_device>(wl_data_device_manager_get_data_device(
          display->GetDataDeviceManager(), display->GetSeat()));
  wl_data_device_add_listener(mDataDevice.get(), &data_device_listener, this);

  // Don't register middle mouse clipboard for D&D context
  if (aIsDragContext) {
    return;
  }

  if (display->GetPrimarySelectionDeviceManagerZwpV1()) {
    zwp_primary_selection_device_v1* primaryDataDevice =
        zwp_primary_selection_device_manager_v1_get_device(
            display->GetPrimarySelectionDeviceManagerZwpV1(),
            display->GetSeat());
    zwp_primary_selection_device_v1_add_listener(
        primaryDataDevice, &primary_selection_device_listener_zwp_v1, this);
  } else if (display->GetPrimarySelectionDeviceManagerGtk()) {
    gtk_primary_selection_device* primaryDataDevice =
        gtk_primary_selection_device_manager_get_device(
            display->GetPrimarySelectionDeviceManagerGtk(), display->GetSeat());
    gtk_primary_selection_device_add_listener(
        primaryDataDevice, &primary_selection_device_listener_gtk, this);
  }
}

ClipboardTargets RetrievalContextWayland::GetTargets(int32_t aWhichClipboard) {
  RefPtr<DataOffer> dataOffer =
      GetSelectionAtom(aWhichClipboard) == GDK_SELECTION_PRIMARY
          ? mPrimaryOffer
          : mClipboardOffer;
  if (!dataOffer) {
    MOZ_CLIPBOARD_LOG(
        "RetrievalContextWayland::GetTargets(): Failed: DataOffer is missing.");
    return {};
  }

  MOZ_CLIPBOARD_LOG(
      "RetrievalContextWayland::GetTargets() clipboard %s offer [%p]",
      (GetSelectionAtom(aWhichClipboard) == GDK_SELECTION_PRIMARY)
          ? "Primary"
          : "Selection",
      dataOffer.get());
  return dataOffer->GetTargets();
}

ClipboardData RetrievalContextWayland::GetClipboardData(
    const char* aMimeType, int32_t aWhichClipboard) {
  RefPtr<DataOffer> dataOffer =
      (GetSelectionAtom(aWhichClipboard) == GDK_SELECTION_PRIMARY)
          ? mPrimaryOffer
          : mClipboardOffer;
  if (!dataOffer) {
    MOZ_CLIPBOARD_LOG(
        "RetrievalContextWayland::GetClipboardData(): Failed: DataOffer is "
        "missing.");
    return {};
  }

  MOZ_CLIPBOARD_LOG(
      "RetrievalContextWayland::GetClipboardData() clipboard %s offer [%p] "
      "mime %s ",
      (GetSelectionAtom(aWhichClipboard) == GDK_SELECTION_PRIMARY)
          ? "Primary"
          : "Selection",
      dataOffer.get(), aMimeType);
  if (!dataOffer->HasTarget(aMimeType)) {
    MOZ_CLIPBOARD_LOG("  Failed: DataOffer does not contain %s MIME!",
                      aMimeType);
    return {};
  }

  return WaitForClipboardData(ClipboardDataType::Data, dataOffer, aMimeType);
}

GUniquePtr<char> RetrievalContextWayland::GetClipboardText(
    int32_t aWhichClipboard) {
  GdkAtom selection = GetSelectionAtom(aWhichClipboard);

  RefPtr<DataOffer> dataOffer =
      (GetSelectionAtom(aWhichClipboard) == GDK_SELECTION_PRIMARY)
          ? mPrimaryOffer
          : mClipboardOffer;
  if (!dataOffer) {
    MOZ_CLIPBOARD_LOG("  Failed: DataOffer is missing!");
    return {};
  }

  MOZ_CLIPBOARD_LOG(
      "RetrievalContextWayland::GetClipboardText(), clipboard %s offer [%p]",
      (selection == GDK_SELECTION_PRIMARY) ? "Primary" : "Selection",
      dataOffer.get());

  for (const auto* mimeType : sTextMimeTypes) {
    if (dataOffer->HasTarget(mimeType)) {
      MOZ_CLIPBOARD_LOG("  We have %s MIME type in clipboard, ask for it.",
                        mimeType);
      if (auto data = WaitForClipboardData(ClipboardDataType::Text, dataOffer,
                                           mimeType)) {
        return data.ExtractText();
      }
    }
  }
  MOZ_CLIPBOARD_LOG("  Failed: text is missing!");
  return {};
}

ClipboardData RetrievalContextWayland::WaitForClipboardData(
    ClipboardDataType aDataType, RefPtr<DataOffer> aDataOffer,
    const char* aMimeType) {
  MOZ_CLIPBOARD_LOG("RetrievalContextWayland::WaitForClipboardData, MIME %s",
                    aMimeType);

  AsyncWaylandClipboardRequest request(aDataType, aDataOffer, aMimeType);
  int iteration = 1;

  PRTime entryTime = PR_Now();
  while (!request.HasCompleted() && !request.HasFailed()) {
    if (iteration++ > kClipboardFastIterationNum) {
      if (PR_Now() - entryTime > kClipboardTimeout) {
        MOZ_CLIPBOARD_LOG(
            "  failed to get async clipboard data in time limit\n");
        break;
      }
    }
    MOZ_CLIPBOARD_LOG("doing iteration %d msec %ld ...\n", (iteration - 1),
                      (long)((PR_Now() - entryTime) / 1000));
    gtk_main_iteration();
  }

  return request.TakeResult();
}
