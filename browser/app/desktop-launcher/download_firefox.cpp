/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "download_firefox.h"
#include <iostream>
#include <optional>
#include <string>
#include <wchar.h>
#include <windows.h>
#include <winhttp.h>
#include "data_sink.h"

static const wchar_t* user_agent = L"FirefoxDesktopLauncher/0.1.0";

// This is how long we allow users to wait before giving up on the download.
static const DWORD timeout_ms = 5000;
static const int BUFFER_SIZE = 1 << 16;
static char buffer[BUFFER_SIZE];

struct DownloadContext {
  HINTERNET hsession;
  HINTERNET hconnection;
  HINTERNET hrequest;
  DataSink* dataSink;
  std::wstring contentType;
  HANDLE eventHandle;
  ErrCode asyncStatus;
};

std::optional<std::wstring> get_architecture() {
  SYSTEM_INFO sysinfo;
  GetSystemInfo(&sysinfo);
  switch (sysinfo.wProcessorArchitecture) {
    case PROCESSOR_ARCHITECTURE_AMD64:
      return L"win64";
    case PROCESSOR_ARCHITECTURE_INTEL:
      return L"win";
    case PROCESSOR_ARCHITECTURE_ARM64:
      return L"win64-aarch64";
    default:
      return std::nullopt;
  }
}

/**
 * Generate the path and query parameters needed for the request
 * to download the Firefox stub installer. The object name
 * includes the user's locale, which indicates which language/locale
 * version of Firefox to download.
 * @return The path and query params for including in the HTTP request
 */
std::optional<std::wstring> get_object_name() {
  wchar_t locale_name[LOCALE_NAME_MAX_LENGTH]{};
  int ct = GetUserDefaultLocaleName(locale_name, sizeof locale_name);
  if (ct == 0) {
    return std::nullopt;
  }
  std::wstring lang = locale_name;
  std::optional<std::wstring> arch = get_architecture();
  if (!arch.has_value()) {
    return std::nullopt;
  }

#if defined(MOZ_BRANDING_IS_OFFICIAL)
  // Common case: download stub installer for release. Note that ESR releases
  // will (eventually) also go this route, and the stub installer is responsible
  // for installing the supported release for the new machine.
  std::wstring product = L"firefox-stub";
#elif defined(MOZ_BRANDING_IS_NIGHTLY)
  // Nightly build: download the latest Firefox Nightly installer
  std::wstring product = L"firefox-nightly-stub";
#elif defined(MOZ_BRANDING_IS_BETA)
  // Beta edition build: download the latest Firefox Beta installer
  std::wstring product = L"firefox-beta-stub";
#elif defined(MOZ_BRANDING_IS_DEVEDITION)
  // Dev edition build: download the latest Firefox Devevloper Edition installer
  std::wstring product = L"firefox-devedition-stub";
#elif defined(MOZ_BRANDING_IS_UNOFFICIAL)
  // For unofficial/local builds, download the nightly version. The advantage of
  // this, over the release version, is that it uses the full installer, which
  // gives the user the chance to cancel installation.
  std::wstring product = L"firefox-nightly-stub";
#else
  // Unexpected case. Fail the build here so we can figure out the missing case.
  static_assert(false);
#endif

  return L"?os=" + arch.value() + L"&lang=" + lang + L"&product=" + product;
}

/**
 * To exit from the WinHttp callback, you remove the callback from the
 * request object. Additionally, since the download_firefox function is
 * blocked waiting for completion, we need to signal the event that it is
 * waiting on.
 */
static void exitCallback(DownloadContext* context, ErrCode exitStatus) {
  context->asyncStatus = exitStatus;
  WinHttpSetStatusCallback(context->hrequest, nullptr,
                           WINHTTP_CALLBACK_FLAG_ALL_NOTIFICATIONS, NULL);
  SetEvent(context->eventHandle);
}

/**
 * Async event handler for the WinHttp request, satisfying type
 * WINHTTP_STATUS_CALLBACK
 */
static void CALLBACK AsyncHttpStatusCallback(HINTERNET hInternet,
                                             DWORD_PTR dwContext,
                                             DWORD dwInternetStatus,
                                             void* lpvStatusInformation,
                                             DWORD dwStatusInformationLength) {
  DownloadContext* context = (DownloadContext*)dwContext;
  DWORD dwCount = 0;
  DWORD dwResponseStatus;
  wchar_t contentTypeBuf[256]{};
  switch (dwInternetStatus) {
    case WINHTTP_CALLBACK_STATUS_SENDREQUEST_COMPLETE:
      // We have completed sending the request. Now tell the API to receive a
      // response.
      if (!WinHttpReceiveResponse(context->hrequest, nullptr)) {
        exitCallback(context, ErrCode::ERR_RECEIVE);
      }
      break;
    case WINHTTP_CALLBACK_STATUS_HEADERS_AVAILABLE: {
      dwCount = sizeof(DWORD);
      if (!WinHttpQueryHeaders(
              context->hrequest,
              WINHTTP_QUERY_STATUS_CODE | WINHTTP_QUERY_FLAG_NUMBER,
              WINHTTP_HEADER_NAME_BY_INDEX, &dwResponseStatus, &dwCount,
              WINHTTP_NO_HEADER_INDEX)) {
        exitCallback(context, ErrCode::ERR_HEADER);
        return;
      }
      if (dwResponseStatus != 200) {
        if (dwResponseStatus == 404) {
          exitCallback(context, ErrCode::ERR_FILE_NOT_FOUND);
        } else if (dwResponseStatus >= 400 && dwResponseStatus < 500) {
          exitCallback(context, ErrCode::ERR_CLIENT_REQUEST);
        } else {
          exitCallback(context, ErrCode::ERR_SERVER);
        }
        return;
      }
      dwCount = sizeof contentTypeBuf;
      if (!WinHttpQueryHeaders(context->hrequest, WINHTTP_QUERY_CONTENT_TYPE,
                               WINHTTP_HEADER_NAME_BY_INDEX, contentTypeBuf,
                               &dwCount, WINHTTP_NO_HEADER_INDEX)) {
        exitCallback(context, ErrCode::ERR_HEADER);
        return;
      }
      // We have received the headers. Call query data to start the reading loop
      if (!WinHttpQueryDataAvailable(context->hrequest, nullptr)) {
        exitCallback(context, ErrCode::ERR_QUERY_DATA);
      }
    } break;
    case WINHTTP_CALLBACK_STATUS_DATA_AVAILABLE:
      // We have data available. Tell the API to put it in our buffer
      dwCount = *((DWORD*)lpvStatusInformation);
      if (dwCount == 0) {
        // nothing available. We must be done.
        exitCallback(context, ErrCode::OK);
        return;
      }
      if (dwCount > sizeof buffer) {
        dwCount = sizeof buffer;
      }
      ZeroMemory(buffer, sizeof buffer);
      if (!WinHttpReadData(context->hrequest, buffer, dwCount, nullptr)) {
        exitCallback(context, ErrCode::ERR_READ_DATA);
      }
      break;

    case WINHTTP_CALLBACK_STATUS_READ_COMPLETE:
      dwCount = dwStatusInformationLength;
      if (!context->dataSink->accept((char*)lpvStatusInformation, dwCount)) {
        exitCallback(context, ErrCode::ERR_FILE);
      }
      // Is there more?
      else if (!WinHttpQueryDataAvailable(context->hrequest, nullptr)) {
        exitCallback(context, ErrCode::ERR_QUERY_DATA);
      }
      break;

    case WINHTTP_CALLBACK_STATUS_REQUEST_ERROR:
      exitCallback(context, ErrCode::ERR_REQUEST_INVALID);
      break;
  }
}

/**
 * Attempt to download a file from an HTTP service, sinking its data to the
 * specified DataSink object
 * @param dataSink A DataSink object that will accept downloaded data
 * @param server_name The DNS name of the HTTP server
 * @param server_port The port number for the HTTP service
 * @param is_https Whether this is a secure HTTPS service or not
 * @param object_name the file path and query parameters to include in the HTTP
 * request
 * @return An ErrCode enum that indicates the success or failure of the download
 * attempt
 */
ErrCode download_file(DataSink* dataSink, std::wstring server_name,
                      int server_port, bool is_https, std::wstring object_name,
                      std::wstring contentType) {
  DownloadContext context{};
  context.asyncStatus = ErrCode::UNKNOWN;
  context.dataSink = dataSink;
  context.contentType = contentType;
  const wchar_t* accept_types[] = {contentType.c_str(), nullptr};
  // Create an event to be used in signaling between our WinHttp callback, which
  // runs asynchronously, and this function.
  context.eventHandle = CreateEventW(nullptr, false, false, nullptr);
  if (!context.eventHandle) {
    return ErrCode::ERR_EVENT;
  }
  // Initiate a WinHttp session.
  // Note: The WINHTTP_FLAG_SECURE_DEFAULTS flag instructs WinHttp to use secure
  // settings, such as disabling fallback to old versions of TLS, but it has the
  // side-effect of also forcing the session to be in async mode.
  context.hsession =
      WinHttpOpen(user_agent, WINHTTP_ACCESS_TYPE_AUTOMATIC_PROXY,
                  WINHTTP_NO_PROXY_NAME, WINHTTP_NO_PROXY_BYPASS,
                  is_https ? WINHTTP_FLAG_SECURE_DEFAULTS : WINHTTP_FLAG_ASYNC);
  if (context.hsession == nullptr) {
    return ErrCode::ERR_OPEN;
  }
  // Create a (disconnected) connection by specifying the server and port
  context.hconnection =
      WinHttpConnect(context.hsession, server_name.c_str(), server_port, 0);
  if (!context.hconnection) {
    return ErrCode::ERR_CONNECT;
  }
  // Create an HTTP request object by specifying the verb (GET) and name
  // (path/params) for the URL, as well as some other properties.
  context.hrequest = WinHttpOpenRequest(
      context.hconnection, L"GET", object_name.c_str(), nullptr,
      WINHTTP_NO_REFERER, accept_types, is_https ? WINHTTP_FLAG_SECURE : 0);
  if (!context.hrequest) {
    return ErrCode::ERR_OPEN_REQ;
  }
  WINHTTP_STATUS_CALLBACK statusCallback = AsyncHttpStatusCallback;
  // Register the async callback to be used in handling the request
  if (WinHttpSetStatusCallback(context.hrequest, statusCallback,
                               WINHTTP_CALLBACK_FLAG_ALL_NOTIFICATIONS,
                               NULL) == WINHTTP_INVALID_STATUS_CALLBACK) {
    return ErrCode::ERR_SET_CALLBACK;
  }
  // Actually send the request
  if (!WinHttpSendRequest(context.hrequest, WINHTTP_NO_ADDITIONAL_HEADERS, 0,
                          WINHTTP_NO_REQUEST_DATA, 0, 0, (DWORD_PTR)&context)) {
    return ErrCode::ERR_SEND;
  }

  // Wait for the async request to complete
  ErrCode result;
  if (WaitForSingleObject(context.eventHandle, timeout_ms) == WAIT_OBJECT_0) {
    // async request completed
    result = context.asyncStatus;
  } else {
    // Timed out waiting for the async request to complete
    result = ErrCode::ERR_TIMEOUT;
  }
  return result;
}

static const wchar_t* server_name = L"download.mozilla.org";
static const wchar_t* installer_content_type = L"application/x-msdos-program";
static const int standard_server_port = INTERNET_DEFAULT_HTTPS_PORT;
static const bool standard_is_https = true;

/**
 * Attempt to download the Firefox stub installer, sinking its data to the
 * specified DataSink object
 * @param dataSink A DataSink object that will accept downloaded data
 * @return An ErrCode enum that indicates the success or failure of the download
 * attempt
 */
ErrCode download_firefox(DataSink* dataSink) {
  std::optional<std::wstring> object_name_opt = get_object_name();
  std::wstring object_name;
  if (object_name_opt.has_value()) {
    object_name = object_name_opt.value();
  } else {
    return ErrCode::ERR_ENVIRON;
  }

  return download_file(dataSink, server_name, standard_server_port,
                       standard_is_https, object_name, installer_content_type);
}
