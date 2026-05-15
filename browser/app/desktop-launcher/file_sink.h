/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef FILE_SINK_H
#define FILE_SINK_H

#include <nsWindowsHelpers.h>
#include <string>
#include <windows.h>
#include "data_sink.h"

class FileSink : public DataSink {
 public:
  // Open the download receiver
  bool open(std::wstring& filename);
  // Send data to the download receiver
  bool accept(char* buf, int bytesToWrite) override;
  // Make our handle read-only so we can run the file
  bool freeze();

 private:
  nsAutoHandle fileHandle;
  std::wstring mFilename;
};

#endif
