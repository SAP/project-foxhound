#include "gtest/gtest.h"

#include "SFV.h"
#include "nsString.h"

using mozilla::net::SFV::ByteSeq;
using mozilla::net::SFV::Decimal;
using mozilla::net::SFV::Integer;
using mozilla::net::SFV::ParseDict;
using mozilla::net::SFV::ParseItem;
using mozilla::net::SFV::ParseItemWithParams;
using mozilla::net::SFV::ParseList;
using mozilla::net::SFV::SFVBool;
using mozilla::net::SFV::SFVString;
using mozilla::net::SFV::Token;

TEST(TestSFV, ParseItemToken)
{
  nsAutoCString token;
  nsresult rv = ParseItem<Token>("sometoken"_ns, token);
  ASSERT_EQ(rv, NS_OK);
  ASSERT_EQ(token, "sometoken"_ns);
}

TEST(TestSFV, ParseItemString)
{
  nsAutoCString string;
  nsresult rv = ParseItem<SFVString>("\"hello world\""_ns, string);
  ASSERT_EQ(rv, NS_OK);
  ASSERT_EQ(string, "hello world"_ns);
}

TEST(TestSFV, ParseItemInteger)
{
  int64_t value;
  nsresult rv = ParseItem<Integer>("42"_ns, value);
  ASSERT_EQ(rv, NS_OK);
  ASSERT_EQ(value, 42);
}

TEST(TestSFV, ParseItemDecimal)
{
  double value;
  nsresult rv = ParseItem<Decimal>("3.14"_ns, value);
  ASSERT_EQ(rv, NS_OK);
  ASSERT_DOUBLE_EQ(value, 3.14);
}

TEST(TestSFV, ParseItemBool)
{
  bool value;
  nsresult rv = ParseItem<SFVBool>("?1"_ns, value);
  ASSERT_EQ(rv, NS_OK);
  ASSERT_TRUE(value);

  rv = ParseItem<SFVBool>("?0"_ns, value);
  ASSERT_EQ(rv, NS_OK);
  ASSERT_FALSE(value);
}

TEST(TestSFV, ParseDictGetToken)
{
  auto dict = ParseDict("key=sometoken"_ns);
  ASSERT_TRUE(dict.IsValid());

  nsAutoCString value;
  nsresult rv = dict.GetItem<Token>("key"_ns, value);
  ASSERT_EQ(rv, NS_OK);
  ASSERT_EQ(value, "sometoken"_ns);
}

TEST(TestSFV, ParseDictGetString)
{
  auto dict = ParseDict("key=\"hello world\""_ns);
  ASSERT_TRUE(dict.IsValid());

  nsAutoCString value;
  nsresult rv = dict.GetItem<SFVString>("key"_ns, value);
  ASSERT_EQ(rv, NS_OK);
  ASSERT_EQ(value, "hello world"_ns);
}

TEST(TestSFV, ParseDictGetInteger)
{
  auto dict = ParseDict("key=42"_ns);
  ASSERT_TRUE(dict.IsValid());

  int64_t value;
  nsresult rv = dict.GetItem<Integer>("key"_ns, value);
  ASSERT_EQ(rv, NS_OK);
  ASSERT_EQ(value, 42);
}

TEST(TestSFV, ParseDictGetDecimal)
{
  auto dict = ParseDict("key=3.14"_ns);
  ASSERT_TRUE(dict.IsValid());

  double value;
  nsresult rv = dict.GetItem<Decimal>("key"_ns, value);
  ASSERT_EQ(rv, NS_OK);
  ASSERT_DOUBLE_EQ(value, 3.14);
}

TEST(TestSFV, ParseDictGetBool)
{
  auto dict = ParseDict("key=?1"_ns);
  ASSERT_TRUE(dict.IsValid());

  bool value;
  nsresult rv = dict.GetItem<SFVBool>("key"_ns, value);
  ASSERT_EQ(rv, NS_OK);
  ASSERT_TRUE(value);
}

TEST(TestSFV, ParseDictMultipleKeys)
{
  auto dict = ParseDict("foo=bar, baz=42, qux=\"hello\""_ns);
  ASSERT_TRUE(dict.IsValid());

  nsAutoCString token;
  nsresult rv = dict.GetItem<Token>("foo"_ns, token);
  ASSERT_EQ(rv, NS_OK);
  ASSERT_EQ(token, "bar"_ns);

  int64_t num;
  rv = dict.GetItem<Integer>("baz"_ns, num);
  ASSERT_EQ(rv, NS_OK);
  ASSERT_EQ(num, 42);

  nsAutoCString string;
  rv = dict.GetItem<SFVString>("qux"_ns, string);
  ASSERT_EQ(rv, NS_OK);
  ASSERT_EQ(string, "hello"_ns);
}

TEST(TestSFV, ParseDictKeyNotFound)
{
  auto dict = ParseDict("key=value"_ns);
  ASSERT_TRUE(dict.IsValid());

  nsAutoCString value;
  nsresult rv = dict.GetItem<Token>("nonexistent"_ns, value);
  ASSERT_EQ(rv, NS_ERROR_UNEXPECTED);
}

TEST(TestSFV, ParseItemInvalid)
{
  nsAutoCString token;
  nsresult rv = ParseItem<Token>("invalid token with spaces"_ns, token);
  ASSERT_EQ(rv, NS_ERROR_FAILURE);
}

TEST(TestSFV, ParseItemWithParamsToken)
{
  auto item = ParseItemWithParams("sometoken;key1=value1;key2=\"value2\""_ns);
  ASSERT_TRUE(item.IsValid());

  nsAutoCString value;
  nsresult rv = item.GetValue<Token>(value);
  ASSERT_EQ(rv, NS_OK);
  ASSERT_EQ(value, "sometoken"_ns);

  nsAutoCString param1;
  rv = item.GetParam<Token>("key1"_ns, param1);
  ASSERT_EQ(rv, NS_OK);
  ASSERT_EQ(param1, "value1"_ns);

  nsAutoCString param2;
  rv = item.GetParam<SFVString>("key2"_ns, param2);
  ASSERT_EQ(rv, NS_OK);
  ASSERT_EQ(param2, "value2"_ns);
}

TEST(TestSFV, ParseItemWithParamsInteger)
{
  auto item = ParseItemWithParams("42;unit=kg"_ns);
  ASSERT_TRUE(item.IsValid());

  int64_t value;
  nsresult rv = item.GetValue<Integer>(value);
  ASSERT_EQ(rv, NS_OK);
  ASSERT_EQ(value, 42);

  nsAutoCString unit;
  rv = item.GetParam<Token>("unit"_ns, unit);
  ASSERT_EQ(rv, NS_OK);
  ASSERT_EQ(unit, "kg"_ns);
}

TEST(TestSFV, ParseItemWithParamsBool)
{
  auto item = ParseItemWithParams("?1;enabled=?1"_ns);
  ASSERT_TRUE(item.IsValid());

  bool value;
  nsresult rv = item.GetValue<SFVBool>(value);
  ASSERT_EQ(rv, NS_OK);
  ASSERT_TRUE(value);

  bool enabled;
  rv = item.GetParam<SFVBool>("enabled"_ns, enabled);
  ASSERT_EQ(rv, NS_OK);
  ASSERT_TRUE(enabled);
}

TEST(TestSFV, ItemResultGetParamKeys)
{
  auto item = ParseItemWithParams("token;a=1;b=2;c=3"_ns);
  ASSERT_TRUE(item.IsValid());

  nsTArray<nsCString> keys;
  nsresult rv = item.GetParamKeys(keys);
  ASSERT_EQ(rv, NS_OK);
  ASSERT_EQ(keys.Length(), 3u);
  ASSERT_EQ(keys[0], "a"_ns);
  ASSERT_EQ(keys[1], "b"_ns);
  ASSERT_EQ(keys[2], "c"_ns);
}

TEST(TestSFV, DictResultGetKeys)
{
  auto dict = ParseDict("foo=1, bar=2, baz=3"_ns);
  ASSERT_TRUE(dict.IsValid());

  nsTArray<nsCString> keys;
  nsresult rv = dict.GetKeys(keys);
  ASSERT_EQ(rv, NS_OK);
  ASSERT_EQ(keys.Length(), 3u);
  ASSERT_EQ(keys[0], "foo"_ns);
  ASSERT_EQ(keys[1], "bar"_ns);
  ASSERT_EQ(keys[2], "baz"_ns);
}

TEST(TestSFV, ParseListLength)
{
  auto list = ParseList("token1, token2, token3"_ns);
  ASSERT_TRUE(list.IsValid());
  ASSERT_EQ(list.Length(), 3u);
}

TEST(TestSFV, ParseListGetItem)
{
  auto list = ParseList("token1, token2, token3"_ns);
  ASSERT_TRUE(list.IsValid());

  auto item0 = list.GetItemAt(0);
  ASSERT_TRUE(item0.IsValid());
  nsAutoCString value0;
  nsresult rv = item0.GetValue<Token>(value0);
  ASSERT_EQ(rv, NS_OK);
  ASSERT_EQ(value0, "token1"_ns);

  auto item1 = list.GetItemAt(1);
  ASSERT_TRUE(item1.IsValid());
  nsAutoCString value1;
  rv = item1.GetValue<Token>(value1);
  ASSERT_EQ(rv, NS_OK);
  ASSERT_EQ(value1, "token2"_ns);

  auto item2 = list.GetItemAt(2);
  ASSERT_TRUE(item2.IsValid());
  nsAutoCString value2;
  rv = item2.GetValue<Token>(value2);
  ASSERT_EQ(rv, NS_OK);
  ASSERT_EQ(value2, "token3"_ns);
}

TEST(TestSFV, ParseListWithParams)
{
  auto list = ParseList("token1;param1=value1, token2;param2=42"_ns);
  ASSERT_TRUE(list.IsValid());
  ASSERT_EQ(list.Length(), 2u);

  auto item0 = list.GetItemAt(0);
  ASSERT_TRUE(item0.IsValid());
  nsAutoCString value0;
  nsresult rv = item0.GetValue<Token>(value0);
  ASSERT_EQ(rv, NS_OK);
  ASSERT_EQ(value0, "token1"_ns);

  nsAutoCString param0;
  rv = item0.GetParam<Token>("param1"_ns, param0);
  ASSERT_EQ(rv, NS_OK);
  ASSERT_EQ(param0, "value1"_ns);

  auto item1 = list.GetItemAt(1);
  ASSERT_TRUE(item1.IsValid());
  nsAutoCString value1;
  rv = item1.GetValue<Token>(value1);
  ASSERT_EQ(rv, NS_OK);
  ASSERT_EQ(value1, "token2"_ns);

  int64_t param1;
  rv = item1.GetParam<Integer>("param2"_ns, param1);
  ASSERT_EQ(rv, NS_OK);
  ASSERT_EQ(param1, 42);
}

TEST(TestSFV, ParseListOutOfBounds)
{
  auto list = ParseList("token1, token2"_ns);
  ASSERT_TRUE(list.IsValid());
  ASSERT_EQ(list.Length(), 2u);

  auto item = list.GetItemAt(5);
  ASSERT_FALSE(item.IsValid());
}

TEST(TestSFV, ItemResultGetValueDecimal)
{
  auto item = ParseItemWithParams("3.14"_ns);
  ASSERT_TRUE(item.IsValid());

  double value;
  nsresult rv = item.GetValue<Decimal>(value);
  ASSERT_EQ(rv, NS_OK);
  ASSERT_DOUBLE_EQ(value, 3.14);
}

TEST(TestSFV, ItemResultGetValueByteSeq)
{
  auto item = ParseItemWithParams(":aGVsbG8=:"_ns);
  ASSERT_TRUE(item.IsValid());

  nsAutoCString value;
  nsresult rv = item.GetValue<ByteSeq>(value);
  ASSERT_EQ(rv, NS_OK);
  ASSERT_EQ(value, "hello"_ns);
}

TEST(TestSFV, ItemResultGetParamDecimal)
{
  auto item = ParseItemWithParams("token;ratio=3.14"_ns);
  ASSERT_TRUE(item.IsValid());

  double value;
  nsresult rv = item.GetParam<Decimal>("ratio"_ns, value);
  ASSERT_EQ(rv, NS_OK);
  ASSERT_DOUBLE_EQ(value, 3.14);
}

TEST(TestSFV, ItemResultGetParamByteSeq)
{
  auto item = ParseItemWithParams("token;payload=:aGVsbG8=:"_ns);
  ASSERT_TRUE(item.IsValid());

  nsAutoCString value;
  nsresult rv = item.GetParam<ByteSeq>("payload"_ns, value);
  ASSERT_EQ(rv, NS_OK);
  ASSERT_EQ(value, "hello"_ns);
}

TEST(TestSFV, ItemResultGetValueWrongType)
{
  auto item = ParseItemWithParams("42"_ns);
  ASSERT_TRUE(item.IsValid());

  double dec;
  ASSERT_EQ(item.GetValue<Decimal>(dec), NS_ERROR_UNEXPECTED);

  nsAutoCString bytes;
  ASSERT_EQ(item.GetValue<ByteSeq>(bytes), NS_ERROR_UNEXPECTED);
}

TEST(TestSFV, ParseListGetInnerList)
{
  auto list = ParseList("(tok1 tok2 tok3), token4"_ns);
  ASSERT_TRUE(list.IsValid());
  ASSERT_EQ(list.Length(), 2u);

  auto inner = list.GetInnerListAt(0);
  ASSERT_TRUE(inner.IsValid());
  ASSERT_EQ(inner.Length(), 3u);

  nsAutoCString v;
  ASSERT_EQ(inner.GetItemAt(0).GetValue<Token>(v), NS_OK);
  ASSERT_EQ(v, "tok1"_ns);
  ASSERT_EQ(inner.GetItemAt(1).GetValue<Token>(v), NS_OK);
  ASSERT_EQ(v, "tok2"_ns);
  ASSERT_EQ(inner.GetItemAt(2).GetValue<Token>(v), NS_OK);
  ASSERT_EQ(v, "tok3"_ns);

  auto item1 = list.GetItemAt(1);
  ASSERT_TRUE(item1.IsValid());
  ASSERT_EQ(item1.GetValue<Token>(v), NS_OK);
  ASSERT_EQ(v, "token4"_ns);
}

TEST(TestSFV, ParseListGetInnerListMismatch)
{
  auto list = ParseList("(tok1 tok2), token3"_ns);
  ASSERT_TRUE(list.IsValid());

  // Entry 0 is an inner list, so GetItemAt should return invalid.
  ASSERT_FALSE(list.GetItemAt(0).IsValid());

  // Entry 1 is an item, so GetInnerListAt should return invalid.
  ASSERT_FALSE(list.GetInnerListAt(1).IsValid());
}

TEST(TestSFV, ParseListGetInnerListOutOfBounds)
{
  auto list = ParseList("(tok1 tok2)"_ns);
  ASSERT_TRUE(list.IsValid());

  ASSERT_FALSE(list.GetInnerListAt(5).IsValid());
}
