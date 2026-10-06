/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "nsDragService.h"
#include "nsDragServiceGtk.h"
#include "nsWindow.h"
#include "WidgetUtilsGtk.h"
#include "mozilla/gfx/2D.h"
#include "mozilla/AutoRestore.h"
#include "mozilla/StaticPrefs_widget.h"

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

ClipboardTargets nsDragSessionGtk::DragTaskGtk::GetTargets() {
  return ClipboardTargets(gdk_drag_context_list_targets(mDragContext));
}

nsDragSessionGtk::nsDragSessionGtk() {
  mRecentTask = MakeUnique<DragTaskGtk>();
}

NS_IMETHODIMP
nsDragSessionGtk::UpdateDragEffect() {
  LOGDRAGSERVICE(
      "nsDragSessionGtk::UpdateDragEffect() from e10s child process");
  if (mTargetDragContextForRemote) {
    ReplyToDragMotion(mTargetDragContextForRemote, mRecentTask->mTime);
    mTargetDragContextForRemote = nullptr;
  }
  return NS_OK;
}

void nsDragSessionGtk::UpdateDragAction() {
  DragTaskGtk* task = static_cast<DragTaskGtk*>(mRecentTask.get());
  if (task->mDragContext) {
    UpdateDragAction(task->mDragContext);
  }
}

void nsDragSessionGtk::ReplyToDragMotion() {
  DragTaskGtk* task = static_cast<DragTaskGtk*>(mRecentTask.get());
  if (task->mDragContext) {
    ReplyToDragMotion(task->mDragContext, task->mTime);
  }
}

void nsDragSessionGtk::ReplyToDragMotion(GdkDragContext* aDragContext,
                                         guint aTime) {
  LOGDRAGSERVICE("nsDragSessionGtk::ReplyToDragMotion(%p) can drop %d",
                 aDragContext, mCanDrop);

  // gdk_drag_status() is a kind of red herring here.
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

  // On Wayland, gdk_drag_status() controls the preferred action via
  // wl_data_offer.set_actions(). Passing GDK_ACTION_COPY would lock
  // the action to COPY due to the feedback loop between
  // gdk_drag_status() and gdk_drag_context_get_selected_action().
  // Always prefer MOVE; user modifiers (CTRL) are handled by the
  // compositor and reflected in gdk_drag_context_get_selected_action().
  if (widget::GdkIsWaylandDisplay() && action == GDK_ACTION_COPY) {
    LOGDRAGSERVICE("  Wayland: switch copy to move");
    action = GDK_ACTION_MOVE;
  }

  gdk_drag_status(aDragContext, action, aTime);
}

// This will update the drag action based on the information in the
// drag context.  Gtk gets this from a combination of the key settings
// and what the source is offering.
void nsDragSessionGtk::UpdateDragAction(GdkDragContext* aDragContext) {
  // This doesn't look right.  dragSession.dragAction is used by
  // nsContentUtils::SetDataTransferInEvent() to set the initial
  // dataTransfer.dropEffect, so GdkDragContext::suggested_action would be
  // more appropriate.  GdkDragContext::actions should be used to set
  // dataTransfer.effectAllowed, which doesn't currently happen with
  // external sources.
  LOGDRAGSERVICE("nsDragSession::UpdateDragAction(%p)", aDragContext);

  GdkDragAction gdkAction = GDK_ACTION_DEFAULT;
  if (aDragContext) {
    gdkAction = gdk_drag_context_get_actions(aDragContext);
    LOGDRAGSERVICE("  gdk_drag_context_get_actions() returns 0x%X", gdkAction);

    // When D&D modifiers (CTRL/SHIFT) are involved,
    // gdk_drag_context_get_actions() on X11 returns selected action but
    // Wayland returns all allowed actions.

    // So we need to call gdk_drag_context_get_selected_action() on Wayland
    // to get potential D&D modifier.
    // gdk_drag_context_get_selected_action() is also affected by
    // gdk_drag_status(), see nsDragSession::ReplyToDragMotion().
    if (widget::GdkIsWaylandDisplay()) {
      GdkDragAction gdkActionSelected =
          gdk_drag_context_get_selected_action(aDragContext);
      LOGDRAGSERVICE("  gdk_drag_context_get_selected_action() returns 0x%X",
                     gdkActionSelected);
      if (gdkActionSelected) {
        gdkAction = gdkActionSelected;
      }
    }
  }

  SetDragActionGtk(gdkAction);
}

// The following methods handle responding to GTK drag signals and
// tracking state between these signals.
//
// In general, GTK does not expect us to run the event loop while handling its
// drag signals, however our drag event handlers may run the
// event loop, most often to fetch information about the drag data.
//
// GTK, for example, uses the return value from drag-motion signals to
// determine whether drag-leave signals should be sent.  If an event loop is
// run during drag-motion the XdndLeave message can get processed but when GTK
// receives the message it does not yet know that it needs to send the
// drag-leave signal to our widget.
//
// After a drag-drop signal, we need to reply with gtk_drag_finish().
// However, gtk_drag_finish should happen after the drag-drop signal handler
// returns so that when the Motif drag protocol is used, the
// XmTRANSFER_SUCCESS during gtk_drag_finish is sent after the XmDROP_START
// reply sent on return from the drag-drop signal handler.
//
// Similarly drag-end for a successful drag and drag-failed are not good
// times to run a nested event loop as gtk_drag_drop_finished() and
// gtk_drag_source_info_destroy() don't gtk_drag_clear_source_info() or remove
// drop_timeout until after at least the first of these signals is sent.
// Processing other events (e.g. a slow GDK_DROP_FINISHED reply, or the drop
// timeout) could cause gtk_drag_drop_finished to be called again with the
// same GtkDragSourceInfo, which won't like being destroyed twice.
//
// Therefore we reply to the signals immediately and schedule a task to
// dispatch the Gecko events, which may run the event loop.
//
// Action in response to drag-leave signals is also delayed until the event
// loop runs again so that we find out whether a drag-drop signal follows.
//
// A single task is scheduled to manage responses to all three GTK signals.
// If further signals are received while the task is scheduled, the scheduled
// response is updated, sometimes effectively compressing successive signals.
//
// No Gecko drag events are dispatched (during nested event loops) while other
// Gecko drag events are in flight.  This helps event handlers that may not
// expect nested events, while accessing an event's dataTransfer for example.

gboolean nsDragSessionGtk::ScheduleMotionEvent(
    nsWindow* aWindow, GdkDragContext* aDragContext,
    LayoutDeviceIntPoint aWindowPoint, guint aTime) {
  if (aDragContext && mNextScheduledTask &&
      mNextScheduledTask->mType == eDragTaskMotion) {
    // The drag source has sent another motion message before we've
    // replied to the previous.  That shouldn't happen with Xdnd.  The
    // spec for Motif drags is less clear, but we'll just update the
    // scheduled task with the new position reply only to the most
    // recent message.
    NS_WARNING("Drag Motion message received before previous reply was sent");
  }

  // Returning TRUE means we'll reply with a status message, unless we first
  // get a leave.
  UniquePtr<DragTaskGtk> task = MakeUnique<DragTaskGtk>(
      eDragTaskMotion, aDragContext, aWindow, aWindowPoint, aTime);
  return Schedule(std::move(task));
}

gboolean nsDragSessionGtk::ScheduleDropEvent(nsWindow* aWindow,
                                             GdkDragContext* aDragContext,
                                             LayoutDeviceIntPoint aWindowPoint,
                                             guint aTime) {
  UniquePtr<DragTaskGtk> task = MakeUnique<DragTaskGtk>(
      eDragTaskDrop, aDragContext, aWindow, aWindowPoint, aTime);
  if (!Schedule(std::move(task))) {
    NS_WARNING("Additional drag drop ignored");
    return FALSE;
  }

  SetDragEndPoint(aWindowPoint.x, aWindowPoint.y);

  // We'll reply with gtk_drag_finish().
  return TRUE;
}

void nsDragSessionGtk::ScheduleLeaveEvent() {
  // We don't know at this stage whether a drop signal will immediately
  // follow.  If the drop signal gets sent it will happen before we return
  // to the main loop and the scheduled leave task will be replaced.
  UniquePtr<DragTaskGtk> task = MakeUnique<DragTaskGtk>(eDragTaskLeave);
  if (!Schedule(std::move(task))) {
    NS_WARNING("Drag leave after drop");
  }
}

void nsDragSessionGtk::DragDataReceived(GtkWidget* aWidget,
                                        GdkDragContext* aContext, gint aX,
                                        gint aY,
                                        GtkSelectionData* aSelectionData,
                                        guint aInfo, guint32 aTime) {
  MOZ_ASSERT(mWaitingForDragDataContext);

  GdkAtom target = gtk_selection_data_get_target(aSelectionData);
  LOGDRAGSERVICE("nsDragSession::DragDataReceived(%p) MIME %s ", aContext,
                 GUniquePtr<gchar>(gdk_atom_name(target)).get());

  if (mWaitingForDragDataContext != aContext) {
    LOGDRAGSERVICE("  quit - wrong drag context!");
    return;
  }

  mWaitingForDragDataContext = nullptr;

  RefPtr<DragData> dragData;

  auto saveData = MakeScopeExit([&] {
    if (dragData && !dragData->IsDataValid()) {
      dragData = nullptr;
    }

    if (!dragData) {
      LOGDRAGSERVICE("  failed to get data, MIME %s",
                     GUniquePtr<gchar>(gdk_atom_name(target)).get());
    }

    // We set cache even for empty received data.
    // It saves time if we're asked for the same data type
    // again.
    mCachedDragData.InsertOrUpdate(target, dragData);
  });

  if (target == sPortalFileAtom || target == sPortalFileTransferAtom) {
    const guchar* data = gtk_selection_data_get_data(aSelectionData);
    if (!data || data[0] == '\0') {
      LOGDRAGSERVICE(
          "nsDragSession::DragDataReceived() failed to get file portal data "
          "(%s)",
          GUniquePtr<gchar>(gdk_atom_name(target)).get());
      return;
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
    nsresult rv =
        NS_NewURI(getter_AddRefs(sourceURI), (const gchar*)data, nullptr);
    if (NS_SUCCEEDED(rv)) {
      LOGDRAGSERVICE(
          "  DragDataReceived(): got valid uri for MIME %s - this is bug "
          "in GTK - expected numeric value for portal, got %s\n",
          GUniquePtr<gchar>(gdk_atom_name(target)).get(), data);
      return;
    }
    GUniquePtr<char*> uriList(gtk_selection_data_get_uris(aSelectionData));
    dragData = MakeRefPtr<DragData>(target, std::move(uriList));
    LOGDRAGSERVICE("  DragDataReceived(): FILE PORTAL data, MIME %s",
                   GUniquePtr<gchar>(gdk_atom_name(target)).get());
  } else if (target == sTextUriListTypeAtom) {
    GUniquePtr<char*> uriList(gtk_selection_data_get_uris(aSelectionData));
    dragData = MakeRefPtr<DragData>(target, std::move(uriList));
    LOGDRAGSERVICE("  DragDataReceived(): URI data, MIME %s",
                   GUniquePtr<gchar>(gdk_atom_name(target)).get());
  } else {
    const char* data = reinterpret_cast<const char*>(
        gtk_selection_data_get_data(aSelectionData));
    int len = gtk_selection_data_get_length(aSelectionData);
    if (len < 0 || !data) {
      LOGDRAGSERVICE(" DragDataReceived() failed");
      return;
    }
    dragData = MakeRefPtr<DragData>(target, data, len);
    LOGDRAGSERVICE("  DragDataReceived(): plain data, MIME %s len = %d",
                   GUniquePtr<gchar>(gdk_atom_name(target)).get(), len);
  }
#if MOZ_LOGGING
  if (dragData) {
    dragData->Print();
  }
#endif
}

bool nsDragSessionGtk::GetDragDataImpl(GdkAtom aRequestedFlavor) {
  DragTaskGtk* task = static_cast<DragTaskGtk*>(mRecentTask.get());
  if (!task->mWindow) {
    LOGDRAGSERVICE(
        "nsDragSessionGtk::GetDragDataImpl() failed, missing Window!");
    return false;
  }
  GtkWidget* widget = task->mWindow->GetGtkWidget();
  if (!widget) {
    LOGDRAGSERVICE(
        "nsDragSessionGtk::GetDragDataImpl() failed, missing GtkWidget!");
    return false;
  }

  if (mWaitingForDragDataContext == task->mDragContext) {
    LOGDRAGSERVICE("  %s failed to get as we're already waiting to data",
                   GUniquePtr<gchar>(gdk_atom_name(aRequestedFlavor)).get());
    return false;
  }
  mWaitingForDragDataContext = task->mDragContext;

  // We'll get the data by nsDragSession::DragDataReceived()
  gtk_drag_get_data(widget, mWaitingForDragDataContext, aRequestedFlavor,
                    task->mTime);

  LOGDRAGSERVICE("  about to start inner iteration");
  gtk_main_iteration();

  PRTime entryTime = PR_Now();
  int32_t timeout = StaticPrefs::widget_gtk_clipboard_timeout_ms() * 1000;
  while (mWaitingForDragDataContext && mDoingDrag) {
    // check the number of iterations
    LOGDRAGSERVICE("  doing iteration");
    if (PR_Now() - entryTime > timeout) {
      LOGDRAGSERVICE("  failed to get D&D data in time!\n");
      break;
    }
    gtk_main_iteration();
  }

  // We failed to get all data in time
  if (mWaitingForDragDataContext) {
    LOGDRAGSERVICE("  failed to get all data");
  }

  return !mWaitingForDragDataContext;
}

bool nsDragSessionGtk::IsTargetContextList(void) {
  // gMimeListType drags only work for drags within a single process. The
  // gtk_drag_get_source_widget() function will return nullptr if the source
  // of the drag is another app, so we use it to check if a gMimeListType
  // drop will work or not.
  DragTaskGtk* task = static_cast<DragTaskGtk*>(mRecentTask.get());
  if (task->mDragContext &&
      gtk_drag_get_source_widget(task->mDragContext) == nullptr) {
    return false;
  }

  return IsDragFlavorAvailable(sMimeListTypeAtom);
}

bool nsDragSessionGtk::IsDragFlavorAvailable(GdkAtom aRequestedFlavor) {
  if (!mCachedDragFlavors) {
    mCachedDragFlavors =
        static_cast<DragTaskGtk*>(mRecentTask.get())->GetTargets();
  }
  return mCachedDragFlavors.Contains(aRequestedFlavor);
}

void nsDragSessionGtk::EndDragSessionImplBackend() {
  mTargetDragContextForRemote = nullptr;
}

void nsDragSessionGtk::SetRemoteContext() {
  DragTaskGtk* task = static_cast<DragTaskGtk*>(mRecentTask.get());
  mTargetDragContextForRemote = task->mDragContext;
}

void nsDragSessionGtk::DropFinish(bool aSucceed) {
  // Perhaps we should set the del parameter to TRUE when the drag
  // action is move, but we don't know whether the data was successfully
  // transferred.
  DragTaskGtk* task = static_cast<DragTaskGtk*>(mRecentTask.get());
  if (task->mDragContext) {
    LOGDRAGSERVICE("  drag finished (gtk_drag_finish)");
    gtk_drag_finish(task->mDragContext, aSucceed,
                    /* del = */ FALSE, task->mTime);
  }
}

nsWindow* nsDragSessionGtk::GetMostRecentDestWindow() {
  return mNextScheduledTask
             ? static_cast<DragTaskGtk*>(mNextScheduledTask.get())->mWindow
             : static_cast<DragTaskGtk*>(mRecentTask.get())->mWindow;
}
