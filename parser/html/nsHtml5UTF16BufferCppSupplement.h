/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/*
 * Modifications Copyright SAP SE. 2019-2021.  All rights reserved.
 */

nsHtml5UTF16Buffer::nsHtml5UTF16Buffer(char16_t* aBuffer, const StringTaint& taint, int32_t aEnd)
    : buffer(aBuffer), taint(taint), start(0), end(aEnd) {
  MOZ_COUNT_CTOR(nsHtml5UTF16Buffer);
}

nsHtml5UTF16Buffer::~nsHtml5UTF16Buffer() {
  MOZ_COUNT_DTOR(nsHtml5UTF16Buffer);
}

void nsHtml5UTF16Buffer::DeleteBuffer() { delete[] buffer; }

void nsHtml5UTF16Buffer::Swap(nsHtml5UTF16Buffer* aOther) {
  char16_t* tempBuffer = buffer;
  SafeStringTaint tempTaint = taint;
  int32_t tempStart = start;
  int32_t tempEnd = end;
  buffer = aOther->buffer;
  taint = aOther->taint;
  start = aOther->start;
  end = aOther->end;
  aOther->buffer = tempBuffer;
  aOther->taint = tempTaint;
  aOther->start = tempStart;
  aOther->end = tempEnd;
}
