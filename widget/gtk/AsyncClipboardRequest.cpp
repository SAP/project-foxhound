/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "AsyncClipboardRequest.h"

#ifdef MOZ_WAYLAND
#  include <sys/mman.h>
#  include <fcntl.h>
#  include <gio/gunixinputstream.h>
#  include <glib.h>
#  include <glib-unix.h>
#  include "RetrievalContextWayland.h"
#endif

namespace mozilla::widget {

ClipboardData AsyncClipboardRequest::TakeResult() {
  if (!HasCompleted() || HasFailed()) {
    MOZ_CLIPBOARD_LOG(
        "AsyncClipboardRequest::TakeResult() [%p] failed HasCompleted [%d] "
        "HasFailed [%d]",
        this, HasCompleted(), HasFailed());
    return {};
  }
  auto request = std::move(mDataRequest);
  return request->mData.extract();
}

AsyncClipboardRequest::~AsyncClipboardRequest() {
  MOZ_CLIPBOARD_LOG(
      "AsyncClipboardRequest::~AsyncClipboardRequest [%p] mDataRequest [%p]",
      this, mDataRequest.get());
  // X11 leaves mDataRequest live and gets the data from gtk callback.
  // Wayland calls TakeResult() which clears mDataRequest.
  if (mDataRequest && mDataRequest->mData.isNothing()) {
    mDataRequest->mFailed = true;
    (void)mDataRequest.release();
  }
}

struct DataRequestGtk : public DataRequest {
  explicit DataRequestGtk(ClipboardDataType aDataType)
      : DataRequest(aDataType) {
    MOZ_CLIPBOARD_LOG("DataRequestGtk::DataRequestGtk() [%p]", this);
  }
  virtual ~DataRequestGtk() {
    MOZ_CLIPBOARD_LOG("DataRequestGtk::~DataRequestGtk() [%p]", this);
  }
  void Complete(const void*);
};

AsyncGtkClipboardRequest::AsyncGtkClipboardRequest(ClipboardDataType aDataType,
                                                   int32_t aWhichClipboard,
                                                   const char* aMimeType) {
  GtkClipboard* clipboard =
      gtk_clipboard_get(GetSelectionAtom(aWhichClipboard));
  mDataRequest = MakeUnique<DataRequestGtk>(aDataType);

  MOZ_CLIPBOARD_LOG(
      "AsyncGtkClipboardRequest::AsyncGtkClipboardRequest [%p] mDataRequest "
      "[%p]",
      this, mDataRequest.get());

  switch (aDataType) {
    case ClipboardDataType::Data:
      MOZ_CLIPBOARD_LOG("  getting DATA MIME %s\n", aMimeType);
      gtk_clipboard_request_contents(clipboard,
                                     gdk_atom_intern(aMimeType, FALSE),
                                     OnDataReceived, mDataRequest.get());
      break;
    case ClipboardDataType::Text:
      MOZ_CLIPBOARD_LOG("  getting TEXT\n");
      gtk_clipboard_request_text(clipboard, OnTextReceived, mDataRequest.get());
      break;
    case ClipboardDataType::Targets:
      MOZ_CLIPBOARD_LOG("  getting TARGETS\n");
      gtk_clipboard_request_contents(clipboard,
                                     gdk_atom_intern("TARGETS", FALSE),
                                     OnDataReceived, mDataRequest.get());
      break;
  }
}

void AsyncGtkClipboardRequest::OnDataReceived(GtkClipboard* clipboard,
                                              GtkSelectionData* selection_data,
                                              gpointer data) {
  auto whichClipboard = GetGeckoClipboardType(clipboard);
  MOZ_CLIPBOARD_LOG("OnDataReceived(%s) callback\n",
                    whichClipboard == Some(nsClipboard::kSelectionClipboard)
                        ? "primary"
                        : "clipboard");
  static_cast<DataRequestGtk*>(data)->Complete(selection_data);
}

void AsyncGtkClipboardRequest::OnTextReceived(GtkClipboard* clipboard,
                                              const gchar* text,
                                              gpointer data) {
  auto whichClipboard = GetGeckoClipboardType(clipboard);
  MOZ_CLIPBOARD_LOG("OnTextReceived(%s) callback\n",
                    whichClipboard == Some(nsClipboard::kSelectionClipboard)
                        ? "primary"
                        : "clipboard");
  static_cast<DataRequestGtk*>(data)->Complete(text);
}

void DataRequestGtk::Complete(const void* aData) {
  MOZ_CLIPBOARD_LOG("Request::Complete(), aData = %p, failed = %d\n", aData,
                    mFailed);
  if (mFailed) {
    delete this;
    return;
  }

  mData.emplace();

  gint dataLength = 0;
  if (mDataType == ClipboardDataType::Targets ||
      mDataType == ClipboardDataType::Data) {
    dataLength = gtk_selection_data_get_length((GtkSelectionData*)aData);
  } else {
    dataLength = aData ? strlen((const char*)aData) : 0;
  }

  // Negative size means no data or data error.
  if (dataLength <= 0) {
    MOZ_CLIPBOARD_LOG("    zero dataLength, quit.\n");
    return;
  }

  switch (mDataType) {
    case ClipboardDataType::Targets: {
      MOZ_CLIPBOARD_LOG("    getting %d bytes of clipboard targets.\n",
                        dataLength);
      gint n_targets = 0;
      GdkAtom* targets = nullptr;
      if (!gtk_selection_data_get_targets((GtkSelectionData*)aData, &targets,
                                          &n_targets) ||
          !n_targets) {
        // We failed to get targets
        return;
      }

      // targets is owned by us
      mData->SetTargets(GUniquePtr<GdkAtom>(targets), n_targets);
      break;
    }
    case ClipboardDataType::Text: {
      MOZ_CLIPBOARD_LOG("    getting %d bytes of text.\n", dataLength);
      mData->SetText(Span(static_cast<const char*>(aData), dataLength));
      MOZ_CLIPBOARD_LOG("    done, mClipboardData = %p\n",
                        mData->AsSpan().data());
      break;
    }
    case ClipboardDataType::Data: {
      MOZ_CLIPBOARD_LOG("    getting %d bytes of data.\n", dataLength);
      mData->SetData(Span(gtk_selection_data_get_data((GtkSelectionData*)aData),
                          dataLength));
      MOZ_CLIPBOARD_LOG("    done, mClipboardData = %p\n",
                        mData->AsSpan().data());
      break;
    }
  }
}

#ifdef MOZ_WAYLAND
struct DataRequestWayland : public DataRequest {
  explicit DataRequestWayland(ClipboardDataType aDataType,
                              RefPtr<DataOffer> aOffer, const char* aMimeType)
      : DataRequest(aDataType),
        mOffer(aOffer),
        mOfferData(g_byte_array_new()),
        mCancellable(g_cancellable_new()) {
    RequestData(aMimeType);
    MOZ_CLIPBOARD_LOG("DataRequestWayland::DataRequestWayland() [%p] mime %s",
                      this, aMimeType);
  };
  virtual ~DataRequestWayland() {
    MOZ_CLIPBOARD_LOG("DataRequestWayland::~DataRequestWayland() [%p]", this);
  }

  void RequestData(const char* aMimeType);
  void ReadData();

  RefPtr<DataOffer> mOffer;
  GUniquePtr<GByteArray> mOfferData;
  GUniquePtr<GInputStream> mStream;
  GUniquePtr<GCancellable> mCancellable;
};

void DataRequestWayland::RequestData(const char* aMimeType) {
  MOZ_CLIPBOARD_LOG("DataRequestWayland::RequestData() mime %s\n", aMimeType);

  int pipe_fd[2];
  if (!g_unix_open_pipe(pipe_fd, FD_CLOEXEC, NULL)) {
    NS_WARNING("DataRequestWayland::RequestData() g_unix_open_pipe() failed!");
    mFailed = true;
    return;
  }

  if (!mOffer->RequestDataTransfer(aMimeType, pipe_fd[1])) {
    NS_WARNING("DataRequestWayland::RequestData() failed!");
    close(pipe_fd[0]);
    close(pipe_fd[1]);
    mFailed = true;
    return;
  }
  close(pipe_fd[1]);

  mStream = GUniquePtr<GInputStream>(
      g_unix_input_stream_new(pipe_fd[0], /* close_fd */ true));
  if (!mStream) {
    NS_WARNING(
        "DataRequestWayland::RequestData() g_unix_input_stream_new failed!");
    mFailed = true;
    return;
  }
  ReadData();
}

void DataRequestWayland::ReadData() {
  MOZ_CLIPBOARD_LOG("RequestWayland::ReadData()");
  MOZ_DIAGNOSTIC_ASSERT(mStream);
  MOZ_DIAGNOSTIC_ASSERT(mCancellable);

  g_input_stream_read_bytes_async(
      mStream.get(), sysconf(_SC_PAGESIZE), G_PRIORITY_DEFAULT,
      mCancellable.get(),
      [](GObject* object, GAsyncResult* result, gpointer data) {
        MOZ_CLIPBOARD_LOG("DataRequestWayland::ReadData() data callback");
        DataRequestWayland* request = static_cast<DataRequestWayland*>(data);

        GUniquePtr<GError> error;
        MOZ_DIAGNOSTIC_ASSERT(request->mStream);
        GUniquePtr<GBytes> ret(g_input_stream_read_bytes_finish(
            request->mStream.get(), result, getter_Transfers(error)));
        if (!ret) {
          g_warning(
              "DataRequestWayland::GetData(): error reading selection buffer: "
              "%s",
              error ? error->message : " unknown");
          request->mFailed = true;
          return;
        }

        // continue reading...
        if (g_bytes_get_size(ret.get())) {
          MOZ_CLIPBOARD_LOG("    getting %d bytes of data.",
                            (int)g_bytes_get_size(ret.get()));
          g_byte_array_append(
              request->mOfferData.get(),
              static_cast<const guint8*>(g_bytes_get_data(ret.get(), nullptr)),
              g_bytes_get_size(ret.get()));
          request->ReadData();
          return;
        }

        // There's nothing to read, finish.
        MOZ_CLIPBOARD_LOG("    finished, moving [%d] of data",
                          (int)request->mOfferData->len);
        request->mData.emplace();
        switch (request->mDataType) {
          case ClipboardDataType::Targets: {
            MOZ_CRASH("ClipboardDataType::Targets is not expected here!");
            break;
          }
          case ClipboardDataType::Text: {
            request->mData->SetText(
                Span(reinterpret_cast<char*>(request->mOfferData->data),
                     request->mOfferData->len));
            break;
          }
          case ClipboardDataType::Data: {
            request->mData->SetData(
                Span(request->mOfferData->data, request->mOfferData->len));
            break;
          }
        }
      },
      this);
}

AsyncWaylandClipboardRequest::AsyncWaylandClipboardRequest(
    ClipboardDataType aDataType, RefPtr<DataOffer> aDataOffer,
    const char* aMimeType) {
  MOZ_CLIPBOARD_LOG(
      "AsyncWaylandClipboardRequest::AsyncWaylandClipboardRequest()");
  mDataRequest =
      MakeUnique<DataRequestWayland>(aDataType, aDataOffer, aMimeType);
}
#endif

}  // namespace mozilla::widget
