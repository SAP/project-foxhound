/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOWNLOAD_FIREFOX_H
#define DOWNLOAD_FIREFOX_H

#include <optional>
#include <string>

#include "data_sink.h"

enum class ErrCode {
  OK,
  ERR_EVENT,
  ERR_OPEN,
  ERR_SET_CALLBACK,
  ERR_CONNECT,
  ERR_OPEN_REQ,
  ERR_SEND,
  ERR_TIMEOUT,
  ERR_RECEIVE,
  ERR_TIMEOUT_READ,
  ERR_QUERY_DATA,
  ERR_READ_DATA,
  ERR_FILE,
  ERR_WRITE_DATA,
  ERR_HEADER,
  ERR_SERVER,
  ERR_CONTENT,
  ERR_ENVIRON,
  ERR_FILE_NOT_FOUND,   // Response from server was HTTP 404, file not found
  ERR_CLIENT_REQUEST,   // Response from server was in the 4XX range of error
                        // codes, but not 404
  ERR_REQUEST_INVALID,  // Request was invalid for the server
  UNKNOWN
};

ErrCode download_file(DataSink* dataSink, std::wstring server, int server_port,
                      bool is_https, std::wstring object_name,
                      std::wstring contentType);
ErrCode download_firefox(DataSink* dataSink);
std::optional<std::wstring> get_object_name();

#endif
