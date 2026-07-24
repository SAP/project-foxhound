#include "gtest/gtest.h"
#include "nsString.h"
#include <cstring>
#include <vector>
#include "nsTArray.h"

struct ParsedHeader {
  nsCString name;
  nsTArray<uint8_t> value;
};

extern "C" {
using HeaderCallback = void (*)(void* user_data, const uint8_t* name_ptr,
                                size_t name_len, const uint8_t* value_ptr,
                                size_t value_len);

bool neqo_glue_test_parse_headers(const nsACString* headers_input,
                                  HeaderCallback callback, void* user_data);

// C callback that collects headers into a vector
void collect_header_callback(void* user_data, const uint8_t* name_ptr,
                             size_t name_len, const uint8_t* value_ptr,
                             size_t value_len) {
  auto* headers = static_cast<std::vector<ParsedHeader>*>(user_data);
  ParsedHeader header;
  header.name.Assign(reinterpret_cast<const char*>(name_ptr), name_len);
  header.value.AppendElements(value_ptr, value_len);
  headers->push_back(std::move(header));
}
}

TEST(TestParseHeaders, ParseHeadersBasic)
{
  nsAutoCString headers;
  headers.AssignLiteral(
      "\r\nContent-Type: text/html\r\nContent-Length: 1234\r\n");

  std::vector<ParsedHeader> parsed_headers;
  bool success = neqo_glue_test_parse_headers(&headers, collect_header_callback,
                                              &parsed_headers);

  EXPECT_TRUE(success);
  ASSERT_EQ(parsed_headers.size(), 2U);

  EXPECT_TRUE(parsed_headers[0].name.EqualsLiteral("content-type"));
  EXPECT_EQ(parsed_headers[0].value.Length(), 9U);
  EXPECT_EQ(0, memcmp(parsed_headers[0].value.Elements(), "text/html", 9));

  EXPECT_TRUE(parsed_headers[1].name.EqualsLiteral("content-length"));
  EXPECT_EQ(parsed_headers[1].value.Length(), 4U);
  EXPECT_EQ(0, memcmp(parsed_headers[1].value.Elements(), "1234", 4));
}

TEST(TestParseHeaders, ParseHeadersWithWhitespace)
{
  nsAutoCString headers;
  headers.AssignLiteral(
      "\r\n  X-Custom  :   test-value   \r\nUser-Agent:  Mozilla/5.0  \r\n");

  std::vector<ParsedHeader> parsed_headers;
  bool success = neqo_glue_test_parse_headers(&headers, collect_header_callback,
                                              &parsed_headers);

  EXPECT_TRUE(success);
  ASSERT_EQ(parsed_headers.size(), 2U);

  EXPECT_TRUE(parsed_headers[0].name.EqualsLiteral("x-custom"));
  EXPECT_EQ(parsed_headers[0].value.Length(), 10U);
  EXPECT_EQ(0, memcmp(parsed_headers[0].value.Elements(), "test-value", 10));

  EXPECT_TRUE(parsed_headers[1].name.EqualsLiteral("user-agent"));
  EXPECT_EQ(parsed_headers[1].value.Length(), 11U);
  EXPECT_EQ(0, memcmp(parsed_headers[1].value.Elements(), "Mozilla/5.0", 11));
}

TEST(TestParseHeaders, ParseHeadersWithColonInValue)
{
  nsAutoCString headers;
  headers.AssignLiteral("\r\nLocation: http://example.com:8080/path\r\n");

  std::vector<ParsedHeader> parsed_headers;
  bool success = neqo_glue_test_parse_headers(&headers, collect_header_callback,
                                              &parsed_headers);

  EXPECT_TRUE(success);
  ASSERT_EQ(parsed_headers.size(), 1U);
  EXPECT_TRUE(parsed_headers[0].name.EqualsLiteral("location"));
  EXPECT_EQ(parsed_headers[0].value.Length(), 28U);
  EXPECT_EQ(0, memcmp(parsed_headers[0].value.Elements(),
                      "http://example.com:8080/path", 28));
}

TEST(TestParseHeaders, ParseHeadersNonUtf8Value)
{
  // Create headers with non-UTF8 bytes in the value
  nsAutoCString headers;
  headers.AssignLiteral("\r\nX-Custom: ");
  headers.Append(char(0xFF));
  headers.Append(char(0xFE));
  headers.Append(char(0xFD));
  headers.AppendLiteral("\r\n");

  std::vector<ParsedHeader> parsed_headers;
  bool success = neqo_glue_test_parse_headers(&headers, collect_header_callback,
                                              &parsed_headers);

  EXPECT_TRUE(success);
  ASSERT_EQ(parsed_headers.size(), 1U);
  EXPECT_TRUE(parsed_headers[0].name.EqualsLiteral("x-custom"));
  EXPECT_EQ(parsed_headers[0].value.Length(), 3U);
  EXPECT_EQ(parsed_headers[0].value[0], 0xFF);
  EXPECT_EQ(parsed_headers[0].value[1], 0xFE);
  EXPECT_EQ(parsed_headers[0].value[2], 0xFD);
}

TEST(TestParseHeaders, ParseHeadersExcludesColonHeaders)
{
  nsAutoCString headers;
  headers.AssignLiteral("\r\n:method: GET\r\nContent-Type: text/html\r\n");

  std::vector<ParsedHeader> parsed_headers;
  bool success = neqo_glue_test_parse_headers(&headers, collect_header_callback,
                                              &parsed_headers);

  EXPECT_TRUE(success);
  ASSERT_EQ(parsed_headers.size(), 1U);  // :method should be excluded
  EXPECT_TRUE(parsed_headers[0].name.EqualsLiteral("content-type"));
}

TEST(TestParseHeaders, ParseHeadersExcludesForbiddenHeaders)
{
  nsAutoCString headers;
  headers.AssignLiteral(
      "\r\nConnection: keep-alive\r\nContent-Type: text/html\r\nHost: "
      "example.com\r\n");

  std::vector<ParsedHeader> parsed_headers;
  bool success = neqo_glue_test_parse_headers(&headers, collect_header_callback,
                                              &parsed_headers);

  EXPECT_TRUE(success);
  ASSERT_EQ(parsed_headers.size(),
            1U);  // Connection and Host should be excluded
  EXPECT_TRUE(parsed_headers[0].name.EqualsLiteral("content-type"));
}

TEST(TestParseHeaders, ParseHeadersEmptyValue)
{
  nsAutoCString headers;
  headers.AssignLiteral("\r\nX-Empty:\r\nX-Spaces:   \r\n");

  std::vector<ParsedHeader> parsed_headers;
  bool success = neqo_glue_test_parse_headers(&headers, collect_header_callback,
                                              &parsed_headers);

  EXPECT_TRUE(success);
  ASSERT_EQ(parsed_headers.size(), 2U);
  EXPECT_TRUE(parsed_headers[0].name.EqualsLiteral("x-empty"));
  EXPECT_EQ(parsed_headers[0].value.Length(), 0U);
  EXPECT_TRUE(parsed_headers[1].name.EqualsLiteral("x-spaces"));
  EXPECT_EQ(parsed_headers[1].value.Length(), 0U);
}

TEST(TestParseHeaders, ParseHeadersInvalidUtf8Name)
{
  // Create headers with non-UTF8 bytes in the name
  nsAutoCString headers;
  headers.AssignLiteral("\r\n");
  headers.Append(char(0xFF));
  headers.Append(char(0xFE));
  headers.AppendLiteral(": value\r\n");

  std::vector<ParsedHeader> parsed_headers;
  bool success = neqo_glue_test_parse_headers(&headers, collect_header_callback,
                                              &parsed_headers);

  EXPECT_FALSE(success);  // Should fail with invalid UTF-8 in name
}
