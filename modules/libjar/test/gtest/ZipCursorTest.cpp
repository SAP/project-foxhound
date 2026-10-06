/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "gtest/gtest.h"

#include "mozilla/gtest/MozAssertions.h"
#include "nsDirectoryServiceDefs.h"
#include "nsDirectoryServiceUtils.h"
#include "nsXPCOM.h"
#include "nsZipArchive.h"

static void testBug2051664(const nsAString& archiveName, bool shouldSucceed) {
  nsCOMPtr<nsIFile> zipFile;
  ASSERT_NS_SUCCEEDED(NS_GetSpecialDirectory(NS_OS_CURRENT_WORKING_DIR,
                                             getter_AddRefs(zipFile)));
  ASSERT_NS_SUCCEEDED(zipFile->Append(archiveName));
  RefPtr<nsZipArchive> archive = nsZipArchive::OpenArchive(zipFile);
  ASSERT_TRUE(archive);

  nsZipItem* item = archive->GetItem("test.txt"_ns);
  ASSERT_TRUE(item);

  uint32_t bufSize = item->RealSize();
  EXPECT_EQ(bufSize, 14u);
  auto buffer = mozilla::MakeUnique<uint8_t[]>(bufSize);
  ASSERT_TRUE(buffer);

  nsZipCursor cursor(item, archive.get(), buffer.get(), bufSize, true);
  uint32_t bytesRead = 0;
  uint8_t* data = cursor.Copy(&bytesRead);

  if (shouldSucceed) {
    ASSERT_EQ(data, buffer.get());
    ASSERT_EQ(strncmp(reinterpret_cast<const char*>(data), "Hello, world!\n",
                      bufSize),
              0);
  } else {
    ASSERT_EQ(data, nullptr);
  }
  EXPECT_EQ(bytesRead, bufSize);
}

TEST(nsZipCursor, CopyUncompressedEntry)
{
  testBug2051664(u"bug_2051664_happy.zip"_ns, true);
}

TEST(nsZipCursor, CopyUncompressedEntryCorrupted)
{
  testBug2051664(u"bug_2051664_badcrc.zip"_ns, false);
}
