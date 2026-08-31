/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "WidevineFileIO.h"

#include "GMPLog.h"
#include "WidevineUtils.h"
#include "gmp-api/gmp-platform.h"

// Declared in ChromiumCDMAdapter.cpp.
extern const GMPPlatformAPI* sPlatform;

namespace mozilla {

void WidevineFileIO::Open(const char* aFilename, uint32_t aFilenameLength) {
  DestroyRecord();

  mName = std::string(aFilename, aFilename + aFilenameLength);
  GMPErr err = sPlatform->createrecord(aFilename, aFilenameLength, &mRecord,
                                       static_cast<GMPRecordClient*>(this));
  if (GMP_FAILED(err)) {
    GMP_LOG_DEBUG("WidevineFileIO::Open() '{}' GMPCreateRecord failed",
                  mName.c_str());
    DestroyRecord();
    mClient->OnOpenComplete(cdm::FileIOClient::Status::kError);
    return;
  }
  if (GMP_FAILED(mRecord->Open())) {
    GMP_LOG_DEBUG("WidevineFileIO::Open() '{}' record open failed",
                  mName.c_str());
    DestroyRecord();
    mClient->OnOpenComplete(cdm::FileIOClient::Status::kError);
    return;
  }

  GMP_LOG_DEBUG("WidevineFileIO::Open() '{}'", mName.c_str());
}

void WidevineFileIO::Read() {
  if (!mRecord) {
    GMP_LOG_DEBUG("WidevineFileIO::Read() '{}' used uninitialized!",
                  mName.c_str());
    mClient->OnReadComplete(cdm::FileIOClient::Status::kError, nullptr, 0);
    return;
  }
  GMP_LOG_DEBUG("WidevineFileIO::Read() '{}'", mName.c_str());
  mRecord->Read();
}

void WidevineFileIO::Write(const uint8_t* aData, uint32_t aDataSize) {
  if (!mRecord) {
    GMP_LOG_DEBUG("WidevineFileIO::Write() '{}' used uninitialized!",
                  mName.c_str());
    mClient->OnWriteComplete(cdm::FileIOClient::Status::kError);
    return;
  }
  mRecord->Write(aData, aDataSize);
}

void WidevineFileIO::DestroyRecord() {
  if (mRecord) {
    mRecord->Close();
    mRecord = nullptr;
  }
}

void WidevineFileIO::Close() {
  GMP_LOG_DEBUG("WidevineFileIO::Close() '{}'", mName.c_str());
  DestroyRecord();
  delete this;
}

static cdm::FileIOClient::Status GMPToWidevineFileStatus(GMPErr aStatus) {
  switch (aStatus) {
    case GMPRecordInUse:
      return cdm::FileIOClient::Status::kInUse;
    case GMPNoErr:
      return cdm::FileIOClient::Status::kSuccess;
    default:
      return cdm::FileIOClient::Status::kError;
  }
}

void WidevineFileIO::OpenComplete(GMPErr aStatus) {
  GMP_LOG_DEBUG("WidevineFileIO::OpenComplete() '{}' status={}", mName.c_str(),
                static_cast<int>(aStatus));
  mClient->OnOpenComplete(GMPToWidevineFileStatus(aStatus));
}

void WidevineFileIO::ReadComplete(GMPErr aStatus, const uint8_t* aData,
                                  uint32_t aDataSize) {
  GMP_LOG_DEBUG("WidevineFileIO::OnReadComplete() '{}' status={}",
                mName.c_str(), static_cast<int>(aStatus));
  mClient->OnReadComplete(GMPToWidevineFileStatus(aStatus), aData, aDataSize);
}

void WidevineFileIO::WriteComplete(GMPErr aStatus) {
  GMP_LOG_DEBUG("WidevineFileIO::WriteComplete() '{}' status={}", mName.c_str(),
                static_cast<int>(aStatus));
  mClient->OnWriteComplete(GMPToWidevineFileStatus(aStatus));
}

}  // namespace mozilla
