/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "gtest/gtest.h"
#include "mozilla/gtest/MozAssertions.h"

#include "nsINIParser.h"

TEST(INIParser, DeleteString)
{
  bool containedErrors = true;
  nsINIParser* parser = new nsINIParser();
  nsresult rv = parser->InitFromString(
      "[sec]\r\
key1=val1\r\
key2=val2\r\
key3=val3\r\
key4=val4"_ns,
      &containedErrors);
  EXPECT_NS_SUCCEEDED(rv);
  EXPECT_FALSE(containedErrors);

  rv = parser->DeleteString("sec", "key3");
  EXPECT_NS_SUCCEEDED(rv);
  rv = parser->DeleteString("sec", "key4");
  EXPECT_NS_SUCCEEDED(rv);
  rv = parser->DeleteString("sec", "key1");
  EXPECT_NS_SUCCEEDED(rv);
  rv = parser->DeleteString("sec", "key2");
  EXPECT_NS_SUCCEEDED(rv);

  delete parser;
}

TEST(INIParser, DeleteSection)
{
  bool containedErrors = true;
  nsINIParser* parser = new nsINIParser();
  nsresult rv = parser->InitFromString(
      "[sec1]\r\
key=val\r\
\r\
[sec2]\r\
key=val\r\
[sec3]\r\
key=val\r\
[sec4]\r\
key=val"_ns,
      &containedErrors);
  EXPECT_NS_SUCCEEDED(rv);
  EXPECT_FALSE(containedErrors);

  rv = parser->DeleteSection("sec3");
  EXPECT_NS_SUCCEEDED(rv);
  rv = parser->DeleteSection("sec4");
  EXPECT_NS_SUCCEEDED(rv);
  rv = parser->DeleteSection("sec1");
  EXPECT_NS_SUCCEEDED(rv);
  rv = parser->DeleteSection("sec2");
  EXPECT_NS_SUCCEEDED(rv);

  delete parser;
}

TEST(INIParser, InvalidData)
{
  bool containedErrors = false;
  nsINIParser* parser = new nsINIParser();
  nsresult rv = parser->InitFromString("bogus"_ns, &containedErrors);
  EXPECT_NS_SUCCEEDED(rv);
  EXPECT_TRUE(containedErrors);

  delete parser;
}

TEST(INIParser, PartialSection)
{
  bool containedErrors = false;
  nsINIParser* parser = new nsINIParser();
  nsresult rv = parser->InitFromString("[]"_ns, &containedErrors);
  EXPECT_NS_SUCCEEDED(rv);
  EXPECT_TRUE(containedErrors);

  delete parser;
}

TEST(INIParser, InvalidSection)
{
  bool containedErrors = false;
  nsINIParser* parser = new nsINIParser();
  nsresult rv = parser->InitFromString(
      "[sec1[[\r\
key=val\r\
\r\
[sec2]\r\
key=val"_ns,
      &containedErrors);
  EXPECT_NS_SUCCEEDED(rv);
  EXPECT_TRUE(containedErrors);

  nsCString result;
  rv = parser->GetString("sec1", "key", result);
  EXPECT_NS_FAILED(rv);

  rv = parser->GetString("sec2", "key", result);
  EXPECT_NS_SUCCEEDED(rv);

  EXPECT_EQ(result, "val"_ns);

  delete parser;
}

TEST(INIParser, InvalidSection2)
{
  bool containedErrors = false;
  nsINIParser* parser = new nsINIParser();
  nsresult rv = parser->InitFromString(
      "[section]\r\
okey=ovalue\r\
[sect[ion]\r\
key=val\r\
[newsection]\r\
nkey=nvalue"_ns,
      &containedErrors);
  EXPECT_NS_SUCCEEDED(rv);
  EXPECT_TRUE(containedErrors);

  nsCString result;
  rv = parser->GetString("section", "okey", result);
  EXPECT_NS_SUCCEEDED(rv);
  EXPECT_EQ(result, "ovalue"_ns);

  rv = parser->GetString("section", "key", result);
  EXPECT_NS_FAILED(rv);

  rv = parser->GetString("sect[ion", "key", result);
  EXPECT_NS_FAILED(rv);

  rv = parser->GetString("newsection", "nkey", result);
  EXPECT_NS_SUCCEEDED(rv);
  EXPECT_EQ(result, "nvalue"_ns);

  delete parser;
}

TEST(INIParser, SectionBrackets)
{
  bool containedErrors = false;
  nsINIParser* parser = new nsINIParser();
  nsresult rv = parser->InitFromString(
      "[]]]section]\r\
key=val"_ns,
      &containedErrors);
  EXPECT_NS_SUCCEEDED(rv);
  EXPECT_TRUE(containedErrors);

  nsCString result;
  rv = parser->GetString("]]]section", "key", result);
  EXPECT_NS_FAILED(rv);

  rv = parser->GetString("section", "key", result);
  EXPECT_NS_FAILED(rv);

  delete parser;
}

TEST(INIParser, PartialKey)
{
  bool containedErrors = false;
  nsINIParser* parser = new nsINIParser();
  nsresult rv = parser->InitFromString(
      "[sec1]\r\
key"_ns,
      &containedErrors);
  EXPECT_NS_SUCCEEDED(rv);
  EXPECT_TRUE(containedErrors);

  delete parser;
}

// This whitespace handling seems incorrect but changing it might break
// something so this test will let us know if that happens.
TEST(INIParser, KeyValueWhitespace)
{
  bool containedErrors = false;
  nsINIParser* parser = new nsINIParser();
  nsresult rv = parser->InitFromString(
      "[section]\r\
    key  =    value  \r\
"_ns,
      &containedErrors);
  EXPECT_NS_SUCCEEDED(rv);
  EXPECT_FALSE(containedErrors);

  nsCString result;
  rv = parser->GetString("section", "key  ", result);
  EXPECT_NS_SUCCEEDED(rv);
  EXPECT_EQ(result, "    value  "_ns);

  delete parser;
}
