/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DATA_SINK_H
#define DATA_SINK_H

/**
 * Abstract class for any type of implementation that accepts bytes from
 * some kind of data source.
 */
class DataSink {
 public:
  /**
   * Caller passes in a buffer with data and a count of bytes to read from
   * that buffer.
   * @param buf A buffer containing data
   * @param numberOfBytes Number of bytes of usable data available in the buffer
   * @return true if data was successfully accepted or false otherwise
   */
  virtual bool accept(char* buf, int numberOfBytes) = 0;
  virtual ~DataSink() {}
};

#endif
