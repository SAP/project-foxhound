/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "SinfParser.h"

#include "AtomType.h"
#include "Box.h"
#include "ByteStream.h"
#include "mozilla/Try.h"

namespace mozilla {

Sinf::Sinf(const Box& aBox) : mDefaultIVSize(0) {
  SinfParser parser(aBox);
  if (parser.GetSinf().IsValid()) {
    *this = parser.GetSinf();
  }
}

SinfParser::SinfParser(const Box& aBox) {
  for (Box box = aBox.FirstChild(); box.IsAvailable(); box = box.Next()) {
    if (box.IsType("schm")) {
      (void)ParseSchm(box);
    } else if (box.IsType("schi")) {
      (void)ParseSchi(box);
    }
  }
}

Result<Ok, nsresult> SinfParser::ParseSchm(const Box& aBox) {
  BoxReader reader(aBox);

  if (reader->Remaining() < 8) {
    return Err(NS_ERROR_FAILURE);
  }

  MOZ_TRY(reader->ReadU32());  // flags -- ignore
  mSinf.mDefaultEncryptionType = MOZ_TRY(reader->ReadU32());
  return Ok();
}

Result<Ok, nsresult> SinfParser::ParseSchi(const Box& aBox) {
  for (Box box = aBox.FirstChild(); box.IsAvailable(); box = box.Next()) {
    if (box.IsType("tenc") && ParseTenc(box).isErr()) {
      return Err(NS_ERROR_FAILURE);
    }
  }
  return Ok();
}

Result<Ok, nsresult> SinfParser::ParseTenc(const Box& aBox) {
  BoxReader reader(aBox);

  if (reader->Remaining() < 24) {
    return Err(NS_ERROR_FAILURE);
  }

  uint32_t flags = MOZ_TRY(reader->ReadU32());
  uint8_t version = flags >> 24;

  // Skip reserved byte
  MOZ_TRY(reader->ReadU8());
  if (version >= 1) {
    uint8_t pattern = MOZ_TRY(reader->ReadU8());
    mSinf.mDefaultCryptByteBlock = pattern >> 4;
    mSinf.mDefaultSkipByteBlock = pattern & 0x0f;
  } else {
    // Reserved if version is less than 1
    MOZ_TRY(reader->ReadU8());
    mSinf.mDefaultCryptByteBlock = 0;
    mSinf.mDefaultSkipByteBlock = 0;
  }

  uint8_t isEncrypted = MOZ_TRY(reader->ReadU8());
  mSinf.mDefaultIVSize = MOZ_TRY(reader->ReadU8());
  memcpy(mSinf.mDefaultKeyID, reader->Read(16), 16);

  if (isEncrypted && mSinf.mDefaultIVSize == 0) {
    uint8_t defaultConstantIVSize = MOZ_TRY(reader->ReadU8());
    if (!mSinf.mDefaultConstantIV.SetLength(defaultConstantIVSize,
                                            mozilla::fallible)) {
      return Err(NS_ERROR_FAILURE);
    }
    for (uint8_t i = 0; i < defaultConstantIVSize; i++) {
      mSinf.mDefaultConstantIV.ElementAt(i) = MOZ_TRY(reader->ReadU8());
    }
  }
  return Ok();
}

}  // namespace mozilla
