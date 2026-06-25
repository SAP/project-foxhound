/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * vim: sw=2 ts=2 et lcs=trail\:.,tab\:>~ :
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "Persist.h"

#include "KeyStorage.h"
#include "Profile.h"

#include "mozilla/Base64.h"

#include "nsAppDirectoryServiceDefs.h"
#include "nsCOMPtr.h"
#include "nsIFile.h"
#include "nsNetUtil.h"
#include "nsStreamUtils.h"

#define KEYSTORE_MAGIC "# mozilla secure key storage\n"
#define KEYSTORE_PATH FILE_PATH_SEPARATOR "keystore.db"

namespace mozilla::storage::key {

/// Create path directory for keystore file
nsresult GetKeyStorePath(nsAString& aPath) {
  sKeyMutex.AssertCurrentThreadOwns();
  nsresult rv = GetCurrentProfilePath(aPath);
  NS_ENSURE_SUCCESS(rv, rv);

  aPath.Append(NS_LITERAL_STRING_FROM_CSTRING(KEYSTORE_PATH));

  return NS_OK;
}

/// Load file contents into string
nsresult LoadFileToString(const nsCOMPtr<nsIFile>& aFile,
                          nsACString& aContents) {
  nsCOMPtr<nsIInputStream> stream;
  nsresult rv = NS_NewLocalFileInputStream(getter_AddRefs(stream), aFile.get());
  // Manually return for fnf error, to avoid having a misleading error message
  // in the logs. This is an expected case, that is handled elsewhere
  if (rv == NS_ERROR_FILE_NOT_FOUND) return NS_ERROR_FILE_NOT_FOUND;
  NS_ENSURE_SUCCESS(rv, rv);

  return NS_ConsumeStream(stream, UINT32_MAX, aContents);
}

/// Open file for appending and write string to it
nsresult AppendStringToFile(const nsCOMPtr<nsIFile>& aFile,
                            nsACString& aContents) {
  nsCOMPtr<nsIOutputStream> stream;
  nsresult rv = NS_NewLocalFileOutputStream(
      getter_AddRefs(stream), aFile.get(),
      PR_WRONLY | PR_CREATE_FILE | PR_APPEND, PR_IRUSR | PR_IWUSR);
  NS_ENSURE_SUCCESS(rv, rv);

  uint32_t count;
  rv = stream->Write(aContents.Data(), aContents.Length(), &count);
  NS_ENSURE_SUCCESS(rv, rv);
  if (count != aContents.Length()) return NS_ERROR_FAILURE;

  return NS_OK;
}

/// Load keys from keystore file to memory
nsresult LoadKeysFromDisk() {
  sKeyMutex.AssertCurrentThreadOwns();

  // Get the file to the key store in the profile and turn it into a file ref
  nsAutoString filePath;
  nsresult rv = GetKeyStorePath(filePath);
  NS_ENSURE_SUCCESS(rv, rv);

  nsCOMPtr<nsIFile> file;
  rv = NS_NewLocalFile(filePath, getter_AddRefs(file));
  NS_ENSURE_SUCCESS(rv, rv);

  // Load all the file contents into one string
  nsCString fileContents;
  rv = LoadFileToString(file, fileContents);
  if (rv == NS_ERROR_FILE_NOT_FOUND) {
    // Non existent keystore is OK and will be handled outside of this
    // function
    return NS_OK;
  }
  NS_ENSURE_SUCCESS(rv, rv);

  // Verify keystore file
  if (!StringBeginsWith(fileContents, nsLiteralCString(KEYSTORE_MAGIC))) {
    MOZ_LOG(GetKeyStorageLog(), mozilla::LogLevel::Error,
            ("Keystore magic mismatch; rejecting file"));
    return NS_ERROR_INVALID_SIGNATURE;
  }

  // Go through each line
  for (const auto& line : fileContents.Split('\n')) {
    int32_t delimiter1 = line.Find(":"_ns);
    int32_t delimiter2 = line.RFind(":"_ns);
    // Ignore invalid or incomplete lines
    if (delimiter1 == kNotFound || delimiter1 == delimiter2) continue;

    // Each line holds a path/identifier, a key and an IV
    nsCString path, encodedKey, encodedIV;
    path.Assign(line.Data(), delimiter1);

    encodedKey.Assign(line.Data() + delimiter1 + 1,
                      delimiter2 - delimiter1 - 1);

    encodedIV.Assign(line.Data() + delimiter2 + 1,
                     line.Length() - delimiter2 - 1);

    if (path.EqualsLiteral(SYSTEM_KEY_NAME)) {
      rv = ImportSystemKey(encodedKey);
      NS_ENSURE_SUCCESS(rv, rv);
    } else {
      rv = ImportDatabaseKey(path, encodedKey, encodedIV);
      NS_ENSURE_SUCCESS(rv, rv);
    }
  }
  return NS_OK;
}

// Append key to key store file, creating it if needed
nsresult WriteKeyToDisk(const nsACString& aIdentifier, Key& aKey) {
  sKeyMutex.AssertCurrentThreadOwns();

  // Key and IV need Base64 encoding for disk storage
  nsCString encodedKey, encodedIV;
  nsresult rv = mozilla::Base64Encode((const char*)aKey.key->data,
                                      aKey.key->len, encodedKey);
  NS_ENSURE_SUCCESS(rv, rv);

  rv = mozilla::Base64Encode((const char*)aKey.iv->data, aKey.iv->len,
                             encodedIV);
  NS_ENSURE_SUCCESS(rv, rv);

  // Get the file to the key store in the profile and turn it into a file ref
  nsAutoString filePath;
  rv = GetKeyStorePath(filePath);
  NS_ENSURE_SUCCESS(rv, rv);

  nsCOMPtr<nsIFile> file;
  rv = NS_NewLocalFile(filePath, getter_AddRefs(file));
  NS_ENSURE_SUCCESS(rv, rv);

  // If the file doesn't exist, we need to write the magic before anything
  // else
  bool fileExists;
  rv = file->Exists(&fileExists);
  NS_ENSURE_SUCCESS(rv, rv);

  nsCString fileString;
  if (!fileExists) {
    fileString.Append(KEYSTORE_MAGIC);
  }

  nsAutoCString keyEntry =
      aIdentifier + ":"_ns + encodedKey + ":"_ns + encodedIV + "\n"_ns;
  fileString.Append(keyEntry);

  return AppendStringToFile(file, fileString);
}
}  // namespace mozilla::storage::key
