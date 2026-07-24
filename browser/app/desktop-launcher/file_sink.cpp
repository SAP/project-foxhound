/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "file_sink.h"
#include <iostream>
#include <string>
#include <windows.h>

// Open the download receiver
bool FileSink::open(std::wstring& filename) {
  mFilename.assign(filename);
  // Note: this only succeeds if the filename does not exist.
  fileHandle.own(CreateFileW(filename.c_str(), GENERIC_WRITE,
                             FILE_SHARE_READ | FILE_SHARE_WRITE, nullptr,
                             CREATE_NEW, FILE_ATTRIBUTE_NORMAL, nullptr));
  if (fileHandle.get() == INVALID_HANDLE_VALUE) {
    return false;
  } else {
    return true;
  }
}

// Send data to the download receiver
bool FileSink::accept(char* buf, int bytesToWrite) {
  while (bytesToWrite > 0) {
    DWORD bytesWritten = 0;
    if (!WriteFile(fileHandle, buf, bytesToWrite, &bytesWritten, nullptr)) {
      std::cout << "Failed to write! " << GetLastError() << std::endl;
      return false;  // Some kind of error happened
    }
    bytesToWrite -= bytesWritten;
  }
  return true;
}

bool FileSink::freeze() {
  // Exchange our write-only handle for a read-only one. This allows us to
  // prevent renaming or deleting the file under our nose, while also being
  // able to actually run it.
  HANDLE readOnlyHandle = CreateFileW(
      mFilename.c_str(), GENERIC_READ, FILE_SHARE_READ | FILE_SHARE_WRITE,
      nullptr, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, nullptr);
  if (readOnlyHandle == INVALID_HANDLE_VALUE) {
    return false;
  }

  fileHandle.own(readOnlyHandle);
  return true;
}
