/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include <fstream>

#include "gtest/gtest.h"
#include "gtest/MozGTestBench.h"  // For MOZ_GTEST_BENCH
#include "mozilla/intl/LineBreaker.h"
#include "mozilla/intl/Segmenter.h"
#include "nsAtom.h"
#include "nsLineBreaker.h"
#include "nsString.h"
#include "nsTArray.h"

namespace mozilla::intl {

using mozilla::intl::LineBreakRule;
using mozilla::intl::WordBreakRule;

constexpr size_t kIterations = 100;

static std::string ReadFileIntoString(const char* aPath) {
  std::ifstream file(aPath);
  std::stringstream sstr;
  sstr << file.rdbuf();
  return sstr.str();
}

class SegmenterPerf : public ::testing::Test {
 protected:
  void SetUp() override {
    // Test files are into xpcom/tests/gtest/wikipedia
    mArUtf8 = ReadFileIntoString("ar.txt");
    mDeUtf8 = ReadFileIntoString("de.txt");
    mJaUtf8 = ReadFileIntoString("ja.txt");
    mRuUtf8 = ReadFileIntoString("ru.txt");
    mThUtf8 = ReadFileIntoString("th.txt");
    mTrUtf8 = ReadFileIntoString("tr.txt");
    mViUtf8 = ReadFileIntoString("vi.txt");

    CopyUTF8toUTF16(mArUtf8, mArUtf16);
    CopyUTF8toUTF16(mDeUtf8, mDeUtf16);
    CopyUTF8toUTF16(mJaUtf8, mJaUtf16);
    CopyUTF8toUTF16(mRuUtf8, mRuUtf16);
    CopyUTF8toUTF16(mThUtf8, mThUtf16);
    CopyUTF8toUTF16(mTrUtf8, mTrUtf16);
    CopyUTF8toUTF16(mViUtf8, mViUtf16);

    mAr = NS_Atomize(u"ar");
    mDe = NS_Atomize(u"de");
    mJa = NS_Atomize(u"ja");
    mRu = NS_Atomize(u"ru");
    mTh = NS_Atomize(u"th");
    mTr = NS_Atomize(u"tr");
    mVi = NS_Atomize(u"vi");
  }

 public:
  std::string mArUtf8;
  std::string mDeUtf8;
  std::string mJaUtf8;
  std::string mRuUtf8;
  std::string mThUtf8;
  std::string mTrUtf8;
  std::string mViUtf8;

  nsString mArUtf16;
  nsString mDeUtf16;
  nsString mJaUtf16;
  nsString mRuUtf16;
  nsString mThUtf16;
  nsString mTrUtf16;
  nsString mViUtf16;

  RefPtr<nsAtom> mAr;
  RefPtr<nsAtom> mDe;
  RefPtr<nsAtom> mJa;
  RefPtr<nsAtom> mRu;
  RefPtr<nsAtom> mTh;
  RefPtr<nsAtom> mTr;
  RefPtr<nsAtom> mVi;
};

static void TestSegmenterBench(const nsString& aStr, bool aIsJaOrZh,
                               size_t aCount = kIterations) {
  nsTArray<uint8_t> breakState;
  breakState.SetLength(aStr.Length());

  for (size_t i = 0; i < aCount; i++) {
    LineBreaker::ComputeBreakPositions(
        aStr.get(), aStr.Length(), WordBreakRule::Normal, LineBreakRule::Strict,
        aIsJaOrZh, breakState.Elements());
  }
}

MOZ_GTEST_BENCH_F(SegmenterPerf, PerfLineBreakAR,
                  [this] { TestSegmenterBench(mArUtf16, false); });

MOZ_GTEST_BENCH_F(SegmenterPerf, PerfLineBreakDE,
                  [this] { TestSegmenterBench(mDeUtf16, false); });

MOZ_GTEST_BENCH_F(SegmenterPerf, PerfLineBreakJA,
                  [this] { TestSegmenterBench(mJaUtf16, true); });

MOZ_GTEST_BENCH_F(SegmenterPerf, PerfLineBreakRU,
                  [this] { TestSegmenterBench(mRuUtf16, false); });

MOZ_GTEST_BENCH_F(SegmenterPerf, PerfLineBreakTH, [this] {
  // LSTM segmenter is too slow
  TestSegmenterBench(mThUtf16, false, 3);
});

MOZ_GTEST_BENCH_F(SegmenterPerf, PerfLineBreakTR,
                  [this] { TestSegmenterBench(mTrUtf16, false); });

MOZ_GTEST_BENCH_F(SegmenterPerf, PerfLineBreakVI,
                  [this] { TestSegmenterBench(mViUtf16, false); });

class LBSink final : public nsILineBreakSink {
 public:
  LBSink() = default;
  ~LBSink() = default;

  virtual void SetBreaks(uint32_t, uint32_t, uint8_t*) override {}
  virtual void SetCapitalization(uint32_t, uint32_t, bool*) override {}
};

static void TestDOMSegmenterBench(const nsString& aStr, nsAtom* aLang,
                                  size_t aCount = kIterations) {
  LBSink sink;
  bool trailingBreak;

  for (size_t i = 0; i < aCount; i++) {
    nsLineBreaker breaker;
    breaker.AppendText(aLang, aStr.get(), aStr.Length(), 0, &sink);
    breaker.Reset(&trailingBreak);
  }
}

MOZ_GTEST_BENCH_F(SegmenterPerf, PerfDOMLineBreakAR,
                  [this] { TestDOMSegmenterBench(mArUtf16, mAr); });

MOZ_GTEST_BENCH_F(SegmenterPerf, PerfDOMLineBreakDE,
                  [this] { TestDOMSegmenterBench(mDeUtf16, mDe); });

MOZ_GTEST_BENCH_F(SegmenterPerf, PerfDOMLineBreakJA,
                  [this] { TestDOMSegmenterBench(mJaUtf16, mJa); });

MOZ_GTEST_BENCH_F(SegmenterPerf, PerfDOMLineBreakRU,
                  [this] { TestDOMSegmenterBench(mRuUtf16, mRu); });

MOZ_GTEST_BENCH_F(SegmenterPerf, PerfDOMLineBreakTH, [this] {
  // LSTM segmenter is too slow
  TestDOMSegmenterBench(mThUtf16, mTh, 3);
});

MOZ_GTEST_BENCH_F(SegmenterPerf, PerfDOMLineBreakTR,
                  [this] { TestDOMSegmenterBench(mTrUtf16, mTr); });

MOZ_GTEST_BENCH_F(SegmenterPerf, PerfDOMLineBreakVI,
                  [this] { TestDOMSegmenterBench(mViUtf16, mVi); });

}  // namespace mozilla::intl
