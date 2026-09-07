/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "gtest/gtest.h"

#include "Taint.h"

#include <string>
#include <vector>

namespace {

// Taint.h requires the ranges of a StringTaint to be sorted, non-empty and
// disjoint; DEBUG builds assert it via check_ranges. The in place range
// mutations rely on it, so every test asserts it after mutating.
void ExpectWellFormed(const StringTaint& aTaint) {
  uint32_t lastEnd = 0;
  bool first = true;
  for (const auto& range : aTaint) {
    EXPECT_LT(range.begin(), range.end())
        << "range [" << range.begin() << "," << range.end() << ") is empty";
    if (!first) {
      EXPECT_LE(lastEnd, range.begin())
          << "range [" << range.begin() << "," << range.end()
          << ") overlaps or precedes the previous range ending at " << lastEnd;
    }
    lastEnd = range.end();
    first = false;
  }
}

// [begin, end) pairs of a taint, for concise comparisons.
std::vector<std::pair<uint32_t, uint32_t>> RangesOf(const StringTaint& aTaint) {
  std::vector<std::pair<uint32_t, uint32_t>> ranges;
  for (const auto& range : aTaint) {
    ranges.emplace_back(range.begin(), range.end());
  }
  return ranges;
}

TaintOperation Source(const char* aName) {
  TaintOperation op(aName);
  op.setSource();
  return op;
}

SafeStringTaint Tainted(const char* aSource, uint32_t aBegin, uint32_t aEnd) {
  return SafeStringTaint(aBegin, aEnd, Source(aSource));
}

// n disjoint ranges of width w, spaced 2 * w apart: [0,w) [2w,3w) ...
SafeStringTaint MultiRange(uint32_t aCount, uint32_t aWidth) {
  SafeStringTaint taint;
  for (uint32_t i = 0; i < aCount; i++) {
    taint.append(TaintRange(i * 2 * aWidth, i * 2 * aWidth + aWidth,
                            TaintFlow(Source("source"))));
  }
  return taint;
}

using Ranges = std::vector<std::pair<uint32_t, uint32_t>>;

}  // namespace

TEST(StringTaint, EmptyByDefault)
{
  SafeStringTaint taint;
  EXPECT_FALSE(taint.hasTaint());
  EXPECT_EQ(taint.begin(), taint.end());
  EXPECT_EQ(nullptr, taint.at(0));
  EXPECT_FALSE(taint.atRef(0).isNotEmpty());
}

TEST(StringTaint, AppendMergesAdjacentRangesSharingAFlow)
{
  TaintFlow flow(Source("location.hash"));
  SafeStringTaint taint;
  taint.append(TaintRange(0, 4, flow));
  taint.append(TaintRange(4, 8, flow));
  EXPECT_EQ(Ranges({{0, 8}}), RangesOf(taint));

  // A different flow must not be merged into the previous range.
  taint.append(TaintRange(8, 12, TaintFlow(Source("document.cookie"))));
  EXPECT_EQ(Ranges({{0, 8}, {8, 12}}), RangesOf(taint));
  ExpectWellFormed(taint);
}

TEST(StringTaint, AppendIgnoresEmptyFlows)
{
  SafeStringTaint taint;
  taint.append(TaintRange(0, 4, TaintFlow()));
  EXPECT_FALSE(taint.hasTaint());
}

TEST(StringTaint, SubTaintSelectsAndRebasesRanges)
{
  SafeStringTaint taint = MultiRange(3, 4);  // [0,4) [8,12) [16,20)

  // Fully inside one range.
  EXPECT_EQ(Ranges({{0, 2}}), RangesOf(taint.safeSubTaint(1, 3)));
  // Spanning a gap picks up both sides, clipped and rebased to zero.
  EXPECT_EQ(Ranges({{0, 2}, {6, 10}}), RangesOf(taint.safeSubTaint(2, 12)));
  // A window that lands entirely in a gap selects nothing.
  EXPECT_FALSE(taint.safeSubTaint(4, 8).hasTaint());
  // Past the end selects nothing.
  EXPECT_FALSE(taint.safeSubTaint(100, 200).hasTaint());
  // An inverted or empty window selects nothing.
  EXPECT_FALSE(taint.safeSubTaint(5, 5).hasTaint());
}

TEST(StringTaint, ClearBetweenHandlesEveryOverlapShape)
{
  // No intersection leaves the taint untouched.
  {
    SafeStringTaint taint = MultiRange(2, 4);  // [0,4) [8,12)
    taint.clearBetween(4, 8);
    EXPECT_EQ(Ranges({{0, 4}, {8, 12}}), RangesOf(taint));
    ExpectWellFormed(taint);
  }
  // Trimming the tail of a range.
  {
    SafeStringTaint taint = MultiRange(2, 4);
    taint.clearBetween(2, 6);
    EXPECT_EQ(Ranges({{0, 2}, {8, 12}}), RangesOf(taint));
    ExpectWellFormed(taint);
  }
  // Trimming the head of a range.
  {
    SafeStringTaint taint = MultiRange(2, 4);
    taint.clearBetween(6, 10);
    EXPECT_EQ(Ranges({{0, 4}, {10, 12}}), RangesOf(taint));
    ExpectWellFormed(taint);
  }
  // A span strictly inside a range splits it in two.
  {
    SafeStringTaint taint = Tainted("src", 0, 10);
    taint.clearBetween(4, 6);
    EXPECT_EQ(Ranges({{0, 4}, {6, 10}}), RangesOf(taint));
    ExpectWellFormed(taint);
  }
  // Covering everything clears the taint entirely.
  {
    SafeStringTaint taint = MultiRange(2, 4);
    taint.clearBetween(0, 100);
    EXPECT_FALSE(taint.hasTaint());
  }
  // An empty span is a no-op.
  {
    SafeStringTaint taint = MultiRange(2, 4);
    taint.clearBetween(5, 5);
    EXPECT_EQ(Ranges({{0, 4}, {8, 12}}), RangesOf(taint));
  }
  // Mutating an untainted instance stays untainted.
  {
    SafeStringTaint taint;
    taint.clearBetween(0, 10);
    taint.clearAt(3);
    taint.clearAfter(2);
    EXPECT_FALSE(taint.hasTaint());
  }
}

TEST(StringTaint, ShiftMovesAndSplitsRanges)
{
  // Everything at or after the index moves.
  {
    SafeStringTaint taint = MultiRange(2, 4);  // [0,4) [8,12)
    taint.shift(8, 3);
    EXPECT_EQ(Ranges({{0, 4}, {11, 15}}), RangesOf(taint));
    ExpectWellFormed(taint);
  }
  // A range straddling the index is split around the insertion point.
  {
    SafeStringTaint taint = Tainted("src", 0, 10);
    taint.shift(4, 3);
    EXPECT_EQ(Ranges({{0, 4}, {7, 13}}), RangesOf(taint));
    ExpectWellFormed(taint);
  }
  // Negative shifts move ranges back.
  {
    SafeStringTaint taint = MultiRange(2, 4);
    taint.shift(8, -2);
    EXPECT_EQ(Ranges({{0, 4}, {6, 10}}), RangesOf(taint));
    ExpectWellFormed(taint);
  }
  // A zero shift and a shift past the end are no-ops.
  {
    SafeStringTaint taint = MultiRange(2, 4);
    taint.shift(2, 0);
    taint.shift(100, 5);
    EXPECT_EQ(Ranges({{0, 4}, {8, 12}}), RangesOf(taint));
  }
  // Shifting an untainted instance stays untainted.
  {
    SafeStringTaint taint;
    taint.shift(2, 4);
    EXPECT_FALSE(taint.hasTaint());
  }
}

TEST(StringTaint, InsertPlacesRangesAtTheOffset)
{
  SafeStringTaint inserted = Tainted("window.name", 0, 3);

  // Into an empty instance.
  {
    SafeStringTaint taint;
    taint.insert(5, inserted);
    EXPECT_EQ(Ranges({{5, 8}}), RangesOf(taint));
    ExpectWellFormed(taint);
  }
  // Before, between and after existing ranges. insert() requires the target
  // span to be free of taint, so make room with shift() first as documented.
  {
    SafeStringTaint taint = MultiRange(2, 4);  // [0,4) [8,12)
    taint.shift(4, 3);                         // [0,4) [11,15)
    taint.insert(4, inserted);
    EXPECT_EQ(Ranges({{0, 4}, {4, 7}, {11, 15}}), RangesOf(taint));
    ExpectWellFormed(taint);
  }
  // Inserting an empty taint is a no-op.
  {
    SafeStringTaint taint = MultiRange(2, 4);
    taint.insert(4, SafeStringTaint());
    EXPECT_EQ(Ranges({{0, 4}, {8, 12}}), RangesOf(taint));
  }
}

TEST(StringTaint, ReplaceClearsShiftsAndInserts)
{
  SafeStringTaint replacement = Tainted("replacement", 0, 5);
  SafeStringTaint taint = Tainted("src", 0, 20);

  // Replace [4,8) with something 5 characters long.
  taint.replace(4, 8, 5, replacement);
  ExpectWellFormed(taint);
  EXPECT_EQ(Ranges({{0, 4}, {4, 9}, {9, 21}}), RangesOf(taint));
}

TEST(StringTaint, AtFindsTheFlowCoveringAnIndex)
{
  SafeStringTaint taint = MultiRange(2, 4);  // [0,4) [8,12)
  EXPECT_NE(nullptr, taint.at(0));
  EXPECT_NE(nullptr, taint.at(3));
  EXPECT_EQ(nullptr, taint.at(4));  // first index of the gap
  EXPECT_EQ(nullptr, taint.at(7));
  EXPECT_NE(nullptr, taint.at(8));
  EXPECT_NE(nullptr, taint.at(11));
  EXPECT_EQ(nullptr, taint.at(12));  // one past the last range
  EXPECT_EQ(nullptr, taint.at(1000));

  // atRef mirrors at, returning the empty flow where at returns null.
  EXPECT_TRUE(taint.atRef(0).isNotEmpty());
  EXPECT_FALSE(taint.atRef(5).isNotEmpty());
}

// Regression test: TaintRange::operator<(uint32_t) used a strict comparison,
// so lower_bound stopped on the range ending exactly at the index and at()
// reported no taint on every boundary between two adjacent ranges. Adjacent
// ranges occur whenever neighbouring characters carry different flows, which
// append() cannot merge.
TEST(StringTaint, AtFindsTaintOnAdjacentRangeBoundaries)
{
  SafeStringTaint taint;
  taint.append(TaintRange(0, 3, TaintFlow(Source("A"))));
  taint.append(TaintRange(3, 4, TaintFlow(Source("B"))));
  taint.append(TaintRange(4, 8, TaintFlow(Source("A"))));
  ASSERT_EQ(Ranges({{0, 3}, {3, 4}, {4, 8}}), RangesOf(taint));

  const char* expected[] = {"A", "A", "A", "B", "A", "A", "A", "A"};
  for (uint32_t i = 0; i < 8; i++) {
    const TaintFlow* flow = taint.at(i);
    ASSERT_NE(nullptr, flow) << "no taint reported at index " << i;
    EXPECT_STREQ(expected[i], flow->source().name()) << "at index " << i;
    EXPECT_STREQ(expected[i], taint.atRef(i).source().name())
        << "atRef disagrees with at at index " << i;
  }
  // One past the last range is genuinely untainted.
  EXPECT_EQ(nullptr, taint.at(8));
}

TEST(StringTaint, CopyAndMovePreserveRanges)
{
  SafeStringTaint taint = MultiRange(3, 4);
  const Ranges expected = RangesOf(taint);

  SafeStringTaint copied(taint);
  EXPECT_EQ(expected, RangesOf(copied));
  // The copy is independent of the original.
  copied.clearBetween(0, 100);
  EXPECT_FALSE(copied.hasTaint());
  EXPECT_EQ(expected, RangesOf(taint));

  SafeStringTaint assigned;
  assigned = taint;
  EXPECT_EQ(expected, RangesOf(assigned));

  SafeStringTaint moved(std::move(assigned));
  EXPECT_EQ(expected, RangesOf(moved));
}

TEST(StringTaint, ConcatOffsetsTheAppendedRanges)
{
  SafeStringTaint piece = Tainted("document.cookie", 0, 4);
  SafeStringTaint out;
  out.concat(piece, 0);
  out.concat(piece, 10);
  EXPECT_EQ(Ranges({{0, 4}, {10, 14}}), RangesOf(out));
  ExpectWellFormed(out);
}

TEST(StringTaint, Base64ResizesRangesBothWays)
{
  SafeStringTaint taint = Tainted("src", 0, 9);
  taint.toBase64();
  ExpectWellFormed(taint);
  taint.fromBase64();
  ExpectWellFormed(taint);
  // Conversion over-approximates, so the range may only grow.
  EXPECT_LE(taint.begin()->begin(), 0u);
  EXPECT_GE(taint.begin()->end(), 9u);
}

TEST(StringTaint, ExtendAddsAnOperationToEveryRange)
{
  SafeStringTaint taint = MultiRange(2, 4);
  taint.extend(TaintOperation("String.prototype.toLowerCase"));
  for (const auto& range : taint) {
    EXPECT_STREQ("String.prototype.toLowerCase",
                 range.flow().head()->operation().name());
    // The source is still reachable underneath the new operation.
    EXPECT_STREQ("source", range.flow().source().name());
  }

  // Extending an untainted instance stays untainted.
  SafeStringTaint empty;
  empty.extend(TaintOperation("String.prototype.trim"));
  EXPECT_FALSE(empty.hasTaint());
}

// Regression test: overlay() used to build the trailing non-overlapping part
// of a range as [current->end(), end) instead of [end, current->end()), which
// produced a range whose begin was greater than its end.
TEST(StringTaint, OverlayEndingInsideARangeKeepsRangesWellFormed)
{
  for (uint32_t begin = 0; begin < 24; begin += 3) {
    for (uint32_t end = begin + 1; end < begin + 20; end += 3) {
      SafeStringTaint taint = MultiRange(3, 5);
      taint.overlay(begin, end, TaintOperation("String.prototype.replace"));
      ExpectWellFormed(taint);
    }
  }

  // The specific shape that used to invert: overlay ending inside a range.
  SafeStringTaint taint = Tainted("src", 0, 20);
  taint.overlay(4, 10, TaintOperation("String.prototype.replace"));
  ExpectWellFormed(taint);
  EXPECT_EQ(Ranges({{0, 4}, {4, 10}, {10, 20}}), RangesOf(taint));
}

// Regression test: set() used to hand insert() a range already positioned at
// [index, index + 1). insert() offsets the ranges it is given by index, so the
// taint landed at [2 * index, 2 * index + 1) and left the ranges unsorted.
TEST(StringTaint, SetPlacesTaintAtTheGivenIndex)
{
  // Appending past the end of the last range.
  {
    SafeStringTaint taint = MultiRange(1, 4);  // [0,4)
    taint.set(9, TaintFlow(Source("set")));
    EXPECT_EQ(Ranges({{0, 4}, {9, 10}}), RangesOf(taint));
    ExpectWellFormed(taint);
  }
  // Overwriting a character inside an existing range.
  {
    SafeStringTaint taint = Tainted("src", 0, 8);
    taint.set(3, TaintFlow(Source("set")));
    ExpectWellFormed(taint);
    // The character really carries the new flow.
    const TaintFlow* flow = taint.at(3);
    ASSERT_NE(nullptr, flow);
    EXPECT_STREQ("set", flow->source().name());
    // Its neighbours still carry the original one.
    ASSERT_NE(nullptr, taint.at(2));
    EXPECT_STREQ("src", taint.at(2)->source().name());
    ASSERT_NE(nullptr, taint.at(4));
    EXPECT_STREQ("src", taint.at(4)->source().name());
  }
}

TEST(TaintFlow, ExtendAndAppendBuildTheExpectedChain)
{
  TaintFlow flow(Source("location.hash"));
  flow.extend(TaintOperation("first"));
  flow.extend(TaintOperation("second"));

  EXPECT_STREQ("second", flow.head()->operation().name());
  EXPECT_STREQ("location.hash", flow.source().name());
  EXPECT_TRUE(flow.source().isSource());

  size_t depth = 0;
  for (const TaintNode& node : flow) {
    (void)node;
    depth++;
  }
  EXPECT_EQ(3u, depth);

  // append() replays the second flow onto the first, oldest operation first.
  TaintFlow other(Source("document.cookie"));
  other.extend(TaintOperation("third"));
  TaintFlow joined = TaintFlow::append(flow, other);
  EXPECT_STREQ("third", joined.head()->operation().name());
  EXPECT_STREQ("location.hash", joined.source().name());
}

TEST(TaintFlow, EmptyFlowIsFalsy)
{
  TaintFlow flow;
  EXPECT_FALSE(flow.isNotEmpty());
  EXPECT_FALSE(TaintFlow::getEmptyTaintFlow().isNotEmpty());
}

// The end to end tests feed taint in through an X-Taint header. The payload
// has to be strict JSON; unquoted keys are silently discarded, which once left
// the header to DOM path with no working coverage at all.
TEST(TaintSerialization, ParsesStrictJsonAndRejectsMalformedPayloads)
{
  SafeStringTaint parsed(
      ParseStringTaintForE2E("[{\"begin\": 1, \"end\": 5, \"source\": \"e2e\"}]"));
  ASSERT_TRUE(parsed.hasTaint());
  EXPECT_EQ(Ranges({{1, 5}}), RangesOf(parsed));
  EXPECT_STREQ("e2e", parsed.begin()->flow().source().name());

  // Unquoted keys are not JSON.
  EXPECT_FALSE(
      SafeStringTaint(ParseStringTaintForE2E("[{begin: 1, end: 5, source: \"e2e\"}]"))
          .hasTaint());
  // Neither is garbage, a non-array, or a range missing a field.
  EXPECT_FALSE(SafeStringTaint(ParseStringTaintForE2E("not json")).hasTaint());
  EXPECT_FALSE(SafeStringTaint(ParseStringTaintForE2E("{}")).hasTaint());
  EXPECT_FALSE(
      SafeStringTaint(ParseStringTaintForE2E("[{\"begin\": 1, \"end\": 5}]"))
          .hasTaint());
}

TEST(TaintSerialization, E2ERoundTrip)
{
  SafeStringTaint taint = MultiRange(2, 4);
  SafeStringTaint parsed(
      ParseStringTaintForE2E(SerializeStringTaintForE2E(taint)));
  EXPECT_EQ(RangesOf(taint), RangesOf(parsed));
}

TEST(TaintSerialization, FullRoundTripKeepsFlowsAndLocations)
{
  SafeStringTaint taint = Tainted("location.href", 0, 12);
  taint.extend(TaintOperation(
      "String.prototype.substring",
      TaintLocation(u"https://example.com/app.js", 42, 7, 43, 1, 1,
                    TaintMd5{0xab, 0xcd}, u"handleInput"),
      {u"0", u"12"}));

  SafeStringTaint back(ParseStringTaint(SerializeStringTaint(taint)));
  ASSERT_TRUE(back.hasTaint());
  EXPECT_EQ(RangesOf(taint), RangesOf(back));

  const TaintOperation& op = back.begin()->flow().head()->operation();
  EXPECT_STREQ("String.prototype.substring", op.name());
  EXPECT_EQ(42u, op.location().line());
  EXPECT_EQ(7u, op.location().pos());
  EXPECT_EQ(std::u16string(u"https://example.com/app.js"),
            op.location().filename());
  EXPECT_EQ(std::u16string(u"handleInput"), op.location().function());
  ASSERT_EQ(2u, op.arguments().size());
  EXPECT_EQ(std::u16string(u"0"), op.arguments()[0]);
  EXPECT_STREQ("location.href", back.begin()->flow().source().name());
}

TEST(TaintList, AppendsNonEmptyFlowsOnly)
{
  TaintList list;
  EXPECT_FALSE(list.hasTaint());
  list.append(TaintFlow(Source("a")));
  list.append(TaintFlow());  // empty flows are dropped
  list.append(TaintFlow(Source("b")));

  size_t count = 0;
  for (const auto& flow : list) {
    EXPECT_TRUE(flow.isNotEmpty());
    count++;
  }
  EXPECT_EQ(2u, count);
}
