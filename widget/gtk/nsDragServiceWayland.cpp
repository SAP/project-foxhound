/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "nsDragService.h"
#include "nsDragServiceWayland.h"
#include "AsyncClipboardRequest.h"
#ifdef MOZ_ENABLE_DBUS
#  include "FileTransferPortal.h"
#endif

using namespace mozilla;
using namespace mozilla::widget;

#ifdef MOZ_LOGGING
extern mozilla::LazyLogModule gWidgetDragLog;
#  define LOGDRAGSERVICE(str, ...)                                             \
    MOZ_LOG(                                                                   \
        gWidgetDragLog, mozilla::LogLevel::Debug,                              \
        ("[D %d]%s %*s" str, nsDragSession::GetLoopDepth(),                    \
         GetDebugTag().get(),                                                  \
         nsDragSession::GetLoopDepth() > 1 ? nsDragSession::GetLoopDepth() * 2 \
                                           : 0,                                \
         "", ##__VA_ARGS__))
#  define LOGDRAGSERVICESTATIC(str, ...) \
    MOZ_LOG(gWidgetDragLog, mozilla::LogLevel::Debug, (str, ##__VA_ARGS__))
#else
#  define LOGDRAGSERVICE(...)
#endif

nsDragSessionWayland::DragTaskWayland::DragTaskWayland(DragTaskType aType,
                                                       DataOffer* aDataOffer)
    : DragTask(aType, aDataOffer->GetWindow(), aDataOffer->GetWindowPoint(),
               aDataOffer->GetTime()),
      mDataOffer(aDataOffer) {};

nsDragSessionWayland::nsDragSessionWayland() {
  LOGDRAGSERVICE("nsDragSessionWayland::nsDragSessionWayland()");
  mRecentTask = MakeUnique<DragTaskWayland>();
}

NS_IMETHODIMP
nsDragSessionWayland::UpdateDragEffect() {
  LOGDRAGSERVICE(
      "nsDragSessionWayland::UpdateDragEffect() from e10s child process");
  if (mDataOfferForRemote) {
    ReplyToDragMotion(mDataOfferForRemote);
    mDataOfferForRemote = nullptr;
  }
  return NS_OK;
}

void nsDragSessionWayland::UpdateDragAction() {
  DragTaskWayland* task = static_cast<DragTaskWayland*>(mRecentTask.get());
  if (task->mDataOffer) {
    UpdateDragAction(task->mDataOffer);
  }
}

// This will update the drag action based on the information in the
// DataOffer. Wayland gets this from a combination of the key settings
// and what the source is offering.
void nsDragSessionWayland::UpdateDragAction(RefPtr<DataOffer> aDataOffer) {
  // This doesn't look right.  dragSession.dragAction is used by
  // nsContentUtils::SetDataTransferInEvent() to set the initial
  // dataTransfer.dropEffect, so GdkDragContext::suggested_action would be
  // more appropriate.  GdkDragContext::actions should be used to set
  // dataTransfer.effectAllowed, which doesn't currently happen with
  // external sources.
  LOGDRAGSERVICE("nsDragSession::UpdateDragAction() [%p]", aDataOffer.get());
  SetDragActionGtk(aDataOffer->GetAvailableDragActions());
}

void nsDragSessionWayland::ReplyToDragMotion() {
  DragTaskWayland* task = static_cast<DragTaskWayland*>(mRecentTask.get());
  if (task->mDataOffer) {
    ReplyToDragMotion(task->mDataOffer);
  }
}

void nsDragSessionWayland::ReplyToDragMotion(RefPtr<DataOffer> aDataOffer) {
  // SetDragStatus() is a kind of red herring here.
  // It does not control final D&D operation type (copy/move) but controls
  // drop/no-drop D&D state and default cursor type (copy/move).

  // Actual D&D operation is determined by mDragAction which is set by
  // SetDragAction() from UpdateDragAction() or gecko/layout.

  // State passed to gdk_drag_status() sets default D&D cursor type
  // which can be switched by key control (CTRL/SHIFT).
  // If user changes D&D cursor (and D&D operation) we're notified by
  // gdk_drag_context_get_selected_action() and update mDragAction.

  // But if we pass mDragAction back to gdk_drag_status() the D&D operation
  // becames locked and won't be returned when D&D modifiers (CTRL/SHIFT)
  // are released.

  GdkDragAction action = GetDragActionGtk();
  if (action == GDK_ACTION_COPY) {
    LOGDRAGSERVICE("  Wayland: switch copy to move");
    action = GDK_ACTION_MOVE;
  }
  aDataOffer->SetDragStatus(mCanDrop, action);
}

void nsDragSessionWayland::EndDragSessionImplBackend() {
  mDataOfferForRemote = nullptr;
}

void nsDragSessionWayland::SetRemoteContext() {
  DragTaskWayland* task = static_cast<DragTaskWayland*>(mRecentTask.get());
  mDataOfferForRemote = task->mDataOffer;
}

void nsDragSessionWayland::DropFinish(bool aSucceed) {
  DragTaskWayland* task = static_cast<DragTaskWayland*>(mRecentTask.get());
  if (task->mDataOffer) {
    task->mDataOffer->DropFinish(aSucceed);
  }
}

void nsDragSessionWayland::ScheduleMotionEvent(RefPtr<DataOffer> aDataOffer) {
  UniquePtr<DragTaskWayland> task =
      MakeUnique<DragTaskWayland>(eDragTaskMotion, aDataOffer);
  Schedule(std::move(task));
}

void nsDragSessionWayland::ScheduleDropEvent(RefPtr<DataOffer> aDataOffer) {
  UniquePtr<DragTaskWayland> task =
      MakeUnique<DragTaskWayland>(eDragTaskDrop, aDataOffer);
  if (!Schedule(std::move(task))) {
    NS_WARNING("Additional drag drop ignored");
    return;
  }

  auto point = aDataOffer->GetWindowPoint();
  SetDragEndPoint(point.x, point.y);
}

void nsDragSessionWayland::ScheduleLeaveEvent() {
  // We don't know at this stage whether a drop signal will immediately
  // follow.  If the drop signal gets sent it will happen before we return
  // to the main loop and the scheduled leave task will be replaced.
  UniquePtr<DragTaskWayland> task = MakeUnique<DragTaskWayland>(eDragTaskLeave);
  if (!Schedule(std::move(task))) {
    NS_WARNING("Drag leave after drop");
  }
}

static GUniquePtr<char*> GetURIs(const gchar* aData, int aLength) {
  nsCString data(nsDependentCString(aData, aLength));
  return GUniquePtr<char*>(g_uri_list_extract_uris(data.get()));
}

static GUniquePtr<char*> GetURIsFromPortal(const gchar* aData, int aLength) {
#ifdef MOZ_ENABLE_DBUS
  nsCString data(nsDependentCString(aData, aLength));
  if (widget::FileTransferPortal* portal =
          widget::FileTransferPortal::GetPortal()) {
    return GUniquePtr<char*>(portal->RetrieveFilesSync(data.get()));
  }
#endif
  return nullptr;
}

bool nsDragSessionWayland::DragDataReceived(ClipboardData& aData,
                                            GdkAtom aTarget) {
  LOGDRAGSERVICE("nsDragSession::TargetDataReceived() MIME %s ",
                 GUniquePtr<gchar>(gdk_atom_name(aTarget)).get());

  RefPtr<DragData> dragData;
  auto saveData = MakeScopeExit([&] {
    if (dragData && !dragData->IsDataValid()) {
      dragData = nullptr;
    }

    if (!dragData) {
      LOGDRAGSERVICE("  failed to get data, MIME %s",
                     GUniquePtr<gchar>(gdk_atom_name(aTarget)).get());
    }

    // We set cache even for empty received data.
    // It saves time if we're asked for the same data type
    // again.
    mCachedDragData.InsertOrUpdate(aTarget, dragData);
  });

  if (aTarget == sPortalFileAtom || aTarget == sPortalFileTransferAtom) {
    auto span = aData.AsSpan();
    if (!span.data() || span.data()[0] == '\0') {
      LOGDRAGSERVICE(
          "nsDragSessionWayland::DragDataReceived failed to get file portal "
          "data (%s)",
          GUniquePtr<gchar>(gdk_atom_name(aTarget)).get());
      return false;
    }

    // A workaround for https://gitlab.gnome.org/GNOME/gtk/-/issues/6563
    //
    // For the vnd.portal.filetransfer and vnd.portal.files we receive numeric
    // id when it's a local file. The numeric id is then used by
    // gtk_selection_data_get_uris implementation to get the actual file
    // available in the flatpak environment.
    //
    // However due to GTK implementation also for example the uris like https
    // are also provided by the vnd.portal.filetransfer target. In this case
    // the call  gtk_selection_data_get_uris fails. This is a bug in the gtk.
    // To workaround it we try to create the valid uri and only if we fail
    // we try to use the gtk_selection_data_get_uris. We ignore the valid uris
    // for the vnd.portal.file* targets.
    nsCOMPtr<nsIURI> sourceURI;
    nsresult rv = NS_NewURI(getter_AddRefs(sourceURI),
                            (const gchar*)span.data(), nullptr);
    if (NS_SUCCEEDED(rv)) {
      LOGDRAGSERVICE(
          "  TargetDataReceived(): got valid uri for MIME %s - this is bug "
          "in GTK - expected numeric value for portal, got %s\n",
          GUniquePtr<gchar>(gdk_atom_name(aTarget)).get(), span.data());
      return false;
    }
    GUniquePtr<char*> uriList(GetURIsFromPortal(span.data(), span.Length()));
    if (!uriList) {
      LOGDRAGSERVICE("  failed to extract uri-list data!");
      return false;
    }
    dragData = MakeRefPtr<DragData>(aTarget, std::move(uriList));
    LOGDRAGSERVICE("  TargetDataReceived(): FILE PORTAL data, MIME %s",
                   GUniquePtr<gchar>(gdk_atom_name(aTarget)).get());
  } else if (aTarget == sTextUriListTypeAtom) {
    LOGDRAGSERVICE("  TargetDataReceived(): URI data, MIME %s",
                   GUniquePtr<gchar>(gdk_atom_name(aTarget)).get());
    auto span = aData.AsSpan();
    GUniquePtr<char*> uriList = GetURIs(span.data(), span.Length());
    if (!uriList) {
      LOGDRAGSERVICE("  failed to extract uri-list data!");
      return false;
    }
    dragData = MakeRefPtr<DragData>(aTarget, std::move(uriList));
  } else {
    auto span = aData.AsSpan();
    dragData = MakeRefPtr<DragData>(aTarget, span.data(), span.Length());
    LOGDRAGSERVICE("  TargetDataReceived(): plain data, MIME %s len = %d",
                   GUniquePtr<gchar>(gdk_atom_name(aTarget)).get(),
                   (int)span.Length());
  }
#if MOZ_LOGGING
  if (dragData) {
    dragData->Print();
  }
#endif
  return true;
}

bool nsDragSessionWayland::GetDragDataImpl(GdkAtom aRequestedFlavor) {
  DragTaskWayland* task = static_cast<DragTaskWayland*>(mRecentTask.get());
  if (!task->mWindow) {
    LOGDRAGSERVICE(
        "DragTaskWayland::GetDragDataImpl() failed, missing Window!");
    return false;
  }
  GtkWidget* widget = task->mWindow->GetGtkWidget();
  if (!widget) {
    LOGDRAGSERVICE(
        "DragTaskWayland::GetDragDataImpl() failed, missing GtkWidget!");
    return false;
  }

  GUniquePtr<gchar> MIMETypeName(gdk_atom_name(aRequestedFlavor));
  LOGDRAGSERVICE("nsDragSessionWayland::GetDragDataImpl() MIME %s",
                 MIMETypeName.get());

  AsyncWaylandClipboardRequest request(ClipboardDataType::Data,
                                       task->mDataOffer, MIMETypeName.get());
  int iteration = 1;

  PRTime entryTime = PR_Now();
  while (!request.HasCompleted() && !request.HasFailed()) {
    if (iteration++ > kClipboardFastIterationNum) {
      if (PR_Now() - entryTime > kClipboardTimeout) {
        LOGDRAGSERVICE("  failed to get async clipboard data in time limit\n");
        break;
      }
    }
    LOGDRAGSERVICE("doing iteration %d msec %ld ...\n", (iteration - 1),
                   (long)((PR_Now() - entryTime) / 1000));
    gtk_main_iteration();
  }

  ClipboardData data = request.TakeResult();
  if (!data) {
    LOGDRAGSERVICE("  failed to get async D&D data");
    return false;
  }
  return DragDataReceived(data, aRequestedFlavor);
}

bool nsDragSessionWayland::IsTargetContextList(void) {
  // gMimeListType drags only work for drags within a single process.
  // TODO: We may need to add the check when source D&D is implemented
  // on Wayland natively.
  return IsDragFlavorAvailable(sMimeListTypeAtom);
}

bool nsDragSessionWayland::IsDragFlavorAvailable(GdkAtom aRequestedFlavor) {
  if (!mCachedDragFlavors) {
    DragTaskWayland* task = static_cast<DragTaskWayland*>(mRecentTask.get());
    if (!task->mDataOffer) {
      return false;
    }
    mCachedDragFlavors = task->mDataOffer->GetTargets();
  }
  return mCachedDragFlavors.Contains(aRequestedFlavor);
}

nsWindow* nsDragSessionWayland::GetMostRecentDestWindow() {
  return mNextScheduledTask
             ? static_cast<DragTaskWayland*>(mNextScheduledTask.get())->mWindow
             : static_cast<DragTaskWayland*>(mRecentTask.get())->mWindow;
}
