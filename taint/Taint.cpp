/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 4 -*- */
/* vim: set ts=8 sts=4 et sw=4 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/*
 * Modifications Copyright SAP SE. 2019-2021.  All rights reserved.
 */

#include "Taint.h"

#include <locale>    // wstring_convert
#include <codecvt>   // codecvt_utf8
#include <iostream>  // cout
#include <string>    // stoi and u32string
#include <algorithm>
#include <sstream>  // stringstream

#include "mozilla/Assertions.h"

#include "json.hpp"

#ifndef JS_STANDALONE
#  include "nsISupportsImpl.h"
#endif

#ifndef MOZ_COUNT_CTOR
#  define MOZ_COUNT_CTOR(X)
#endif

#ifndef MOZ_COUNT_DTOR
#  define MOZ_COUNT_DTOR(X)
#endif

#define DEBUG_LINE() std::cout << __PRETTY_FUNCTION__ << std::endl;

TaintLocation::TaintLocation(std::u16string filename, uint32_t line,
                             uint32_t pos, uint32_t next_line,
                             uint32_t next_pos, uint32_t scriptStartLine,
                             TaintMd5 scriptHash, std::u16string function)
    : filename_(std::move(filename)),
      line_(line),
      pos_(pos),
      next_line_(next_line),
      next_pos_(next_pos),
      scriptStartLine_(scriptStartLine),
      scriptHash_(scriptHash),
      function_(std::move(function)) {}

TaintLocation::TaintLocation()
    : filename_(),
      line_(0),
      pos_(0),
      next_line_(0),
      next_pos_(0),
      scriptStartLine_(0),
      scriptHash_({0}),
      function_() {}

TaintLocation::TaintLocation(TaintLocation&& other) noexcept
    : filename_(std::move(other.filename_)),
      line_(other.line_),
      pos_(other.pos_),
      next_line_(other.next_line_),
      next_pos_(other.next_pos_),
      scriptStartLine_(other.scriptStartLine_),
      scriptHash_(other.scriptHash_),
      function_(std::move(other.function_)) {}

TaintLocation& TaintLocation::operator=(TaintLocation&& other) noexcept {
  filename_ = std::move(other.filename_);
  line_ = other.line_;
  pos_ = other.pos_;
  next_line_ = other.next_line_;
  next_pos_ = other.next_pos_;
  scriptStartLine_ = other.scriptStartLine_;
  scriptHash_ = other.scriptHash_;
  function_ = std::move(other.function_);
  return *this;
}

TaintOperation::TaintOperation(const char* name, TaintLocation location,
                               std::initializer_list<std::u16string> args)
    : name_(name),
      arguments_(args),
      source_(false),
      location_(std::move(location)) {}

TaintOperation::TaintOperation(const char* name, TaintLocation location,
                               std::vector<std::u16string> args)
    : name_(name),
      arguments_(std::move(args)),
      source_(false),
      location_(std::move(location)) {}

TaintOperation::TaintOperation(const char* name,
                               std::initializer_list<std::u16string> args)
    : name_(name), arguments_(args), source_(false) {}

TaintOperation::TaintOperation(const char* name,
                               std::vector<std::u16string> args)
    : name_(name), arguments_(std::move(args)), source_(false) {}

TaintOperation::TaintOperation(const char* name)
    : name_(name), source_(false) {}

TaintOperation::TaintOperation(const char* name, TaintLocation location)
    : name_(name), source_(false), location_(std::move(location)) {}

TaintOperation::TaintOperation(TaintOperation&& other) noexcept
    : name_(std::move(other.name_)),
      arguments_(std::move(other.arguments_)),
      source_(other.source_),
      location_(std::move(other.location_)) {}

TaintOperation& TaintOperation::operator=(TaintOperation&& other) noexcept {
  name_ = std::move(other.name_);
  arguments_ = std::move(other.arguments_);
  source_ = other.source_;
  location_ = std::move(other.location_);
  return *this;
}

#ifdef DEBUG
void TaintOperation::dump(const TaintOperation& op) {
  // NB - this will not compile under windows due to a bug in VS
  std::wstring_convert<std::codecvt_utf8<char16_t>, char16_t> convert;
  static int n = 0;
  static int totlen = 0;
  static int totsize = 0;
  static int biggest = 0;
  int len = 0;

  std::cout << "************************************************" << std::endl;
  std::cout << "Taint Operation: " << n++ << std::endl;
  std::cout << "************************************************" << std::endl;
  std::cout << "Location: " << convert.to_bytes(op.location().filename()) << ":"
            << op.location().line() << ":" << op.location().pos() << std::endl;
  std::cout << "Function: " << convert.to_bytes(op.location().function())
            << std::endl;
  std::cout << "Args:" << std::endl;
  for (const auto& arg : op.arguments()) {
    len += arg.length();
    std::cout << "  * " << convert.to_bytes(arg) << "(" << arg.length() << ")"
              << std::endl;
  }
  totlen += len;
  biggest = std::max(biggest, len);
  totsize += sizeof(op);
  std::cout << "************************************************" << std::endl;
  std::cout << "Args len: " << len << " total: " << totlen
            << " biggest: " << biggest << std::endl;
  std::cout << "Size: " << sizeof(op) << " total: " << totsize << std::endl;
  std::cout << "************************************************" << std::endl;
}
#else
void TaintOperation::dump(const TaintOperation& op) {}
#endif

TaintNode::TaintNode(TaintNode* parent, const TaintOperation& operation)
    : parent_(parent), refcount_(1), operation_(operation) {
  MOZ_COUNT_CTOR(TaintNode);
  if (parent_) {
    parent_->addref();
  }
}

TaintNode::TaintNode(TaintNode* parent, TaintOperation&& operation) noexcept
    : parent_(parent), refcount_(1), operation_(std::move(operation)) {
  MOZ_COUNT_CTOR(TaintNode);
  if (parent_) {
    parent_->addref();
  }
}

TaintNode::TaintNode(const TaintOperation& operation)
    : parent_(nullptr), refcount_(1), operation_(operation) {
  MOZ_COUNT_CTOR(TaintNode);
}

TaintNode::TaintNode(TaintOperation&& operation) noexcept
    : parent_(nullptr), refcount_(1), operation_(std::move(operation)) {
  MOZ_COUNT_CTOR(TaintNode);
}

void TaintNode::addref() {
  // Relaxed is sufficient: taking a new reference implies the caller already
  // holds one, so no other thread can destroy the node concurrently.
  uint32_t prev = refcount_.fetch_add(1, std::memory_order_relaxed);
  if (prev == 0xffffffff) {
    MOZ_CRASH("TaintNode refcount overflow");
  }
}

void TaintNode::release() {
  MOZ_ASSERT(refcount_ > 0);

  // The decrement and the zero test must be a single atomic operation,
  // otherwise two threads dropping the last two references can both observe
  // zero and double free. Release/acquire pairing ensures all prior writes
  // are visible to the thread that runs the destructor.
  if (refcount_.fetch_sub(1, std::memory_order_release) == 1) {
    std::atomic_thread_fence(std::memory_order_acquire);
    delete this;
  }
}

TaintNode::~TaintNode() {
  MOZ_COUNT_DTOR(TaintNode);
  if (parent_) {
    parent_->release();
  }
}

TaintFlow::Iterator::Iterator(TaintNode* head) : current_(head) {}

TaintFlow::Iterator::Iterator() : current_(nullptr) {}

TaintFlow::Iterator::Iterator(const Iterator& other)
    : current_(other.current_) {}

TaintFlow::Iterator& TaintFlow::Iterator::operator++() {
  current_ = current_->parent();
  return *this;
}

TaintNode& TaintFlow::Iterator::operator*() const { return *current_; }

bool TaintFlow::Iterator::operator==(const Iterator& other) const {
  return current_ == other.current_;
}

bool TaintFlow::Iterator::operator!=(const Iterator& other) const {
  return current_ != other.current_;
}

TaintFlow::TaintFlow() : head_(nullptr) { MOZ_COUNT_CTOR(TaintFlow); }

TaintFlow::TaintFlow(TaintNode* head) : head_(head) {
  MOZ_COUNT_CTOR(TaintFlow);
}

TaintFlow::TaintFlow(const TaintOperation& source)
    : head_(new TaintNode(source)) {
  MOZ_COUNT_CTOR(TaintFlow);
}

TaintFlow::TaintFlow(const TaintFlow& other) : head_(other.head_) {
  MOZ_COUNT_CTOR(TaintFlow);
  if (head_) {
    head_->addref();
  }
}

TaintFlow::TaintFlow(const TaintFlow* other) : head_(nullptr) {
  MOZ_COUNT_CTOR(TaintFlow);
  if (other) {
    head_ = other->head_;
    if (head_) {
      head_->addref();
    }
  }
}

TaintFlow::TaintFlow(TaintFlow&& other) noexcept : head_(other.head_) {
  MOZ_COUNT_CTOR(TaintFlow);
  other.head_ = nullptr;
}

TaintFlow::~TaintFlow() {
  MOZ_COUNT_DTOR(TaintFlow);
  if (head_) {
    head_->release();
  }
}

TaintFlow& TaintFlow::operator=(const TaintFlow& other) {
  if (this == &other) {
    return *this;
  }
  if (head_) {
    head_->release();
  }

  head_ = other.head_;
  if (head_) {
    head_->addref();
  }

  return *this;
}

TaintFlow TaintFlow::empty_flow_ = TaintFlow();

const TaintFlow& TaintFlow::getEmptyTaintFlow() {
  return TaintFlow::empty_flow_;
}

const TaintOperation& TaintFlow::source() const {
  TaintNode* source = head_;
  while (source->parent() != nullptr) {
    source = source->parent();
  }

  return source->operation();
}

TaintFlow& TaintFlow::extend(const TaintOperation& operation) {
  TaintNode* newhead = new TaintNode(head_, operation);
  if (head_) {
    head_->release();
  }
  head_ = newhead;
  return *this;
}

TaintFlow& TaintFlow::extend(const TaintOperation& operation) const {
  TaintFlow flow(*this);
  return flow.extend(operation);
}

TaintFlow& TaintFlow::extend(TaintOperation&& operation) {
  TaintNode* newhead = new TaintNode(head_, std::move(operation));
  if (head_) {
    head_->release();
  }
  head_ = newhead;
  return *this;
}

TaintFlow::Iterator TaintFlow::begin() const { return Iterator(head_); }

TaintFlow::Iterator TaintFlow::end() const { return Iterator(); }

TaintFlow TaintFlow::extend(const TaintFlow& flow,
                            const TaintOperation& operation) {
  return TaintFlow(new TaintNode(flow.head_, operation));
}

TaintFlow TaintFlow::append(const TaintFlow& first, const TaintFlow& second) {
  TaintFlow outFlow(first);

  // A vector rather than a std::stack: the latter is deque backed and
  // allocates a full chunk even for very short flows.
  std::vector<const TaintNode*> nodes;
  for (const TaintNode& node : second) {
    nodes.push_back(&node);
  }
  for (auto it = nodes.rbegin(); it != nodes.rend(); ++it) {
    outFlow.extend((*it)->operation());
  }
  return outFlow;
}

TaintRange::TaintRange() : begin_(0), end_(0), flow_() {
  MOZ_COUNT_CTOR(TaintRange);
}

TaintRange::TaintRange(uint32_t begin, uint32_t end, TaintFlow flow)
    : begin_(begin), end_(end), flow_(std::move(flow)) {
  MOZ_COUNT_CTOR(TaintRange);
  MOZ_ASSERT(begin <= end);
}

TaintRange::TaintRange(const TaintRange& other)
    : begin_(other.begin_), end_(other.end_), flow_(other.flow_) {
  MOZ_COUNT_CTOR(TaintRange);
}

TaintRange::~TaintRange() { MOZ_COUNT_DTOR(TaintRange); }

TaintRange& TaintRange::operator=(const TaintRange& other) {
  begin_ = other.begin_;
  end_ = other.end_;
  flow_ = other.flow_;

  return *this;
}

bool TaintRange::operator<(const TaintRange& other) const {
  return this->end() < other.begin();
}

bool TaintRange::operator<(uint32_t index) const { return this->end() < index; }

bool TaintRange::operator>(uint32_t index) const {
  return this->begin() > index;
}

bool TaintRange::operator==(uint32_t index) const {
  return this->contains(index);
}

bool TaintRange::contains(uint32_t index) const {
  return this->begin() <= index && this->end() > index;
}

void TaintRange::resize(uint32_t begin, uint32_t end) {
  MOZ_ASSERT(begin <= end);

  begin_ = begin;
  end_ = end;
}

/**
 * Some helper functions for converting between ASCII (octets) and base64
 *(sextets)
 *
 * Octet  |0              |1               |2             |
 * --------------------------------------------------------
 * Bit    |           |   |       |        |  |           |
 * --------------------------------------------------------
 * Sextet |0          |1          |2          |3          |
 *
 * In both convertBaseBegin and convertBaseEnd:
 *
 * ntet:   is the index of the input character
 * nwidth: is the bit width of the input (for ASCII = 8)
 * mwidth: is the bit width of the output (for Base64 = 6)
 *
 * In the case of convertBaseBegin, the bit index of the first bit is computed
 * and converted.
 *
 * For convertBaseEnd, the bit index of the last bit in the ntet is computed and
 * converted.
 *
 * Note that this means there will be some slight over-tainting on converting to
 * and from base64
 *
 **/
uint32_t TaintRange::convertBaseBegin(uint32_t ntet, uint32_t nwidth,
                                      uint32_t mwidth) {
  MOZ_ASSERT(ntet >= 0);
  MOZ_ASSERT(nwidth > 0);
  MOZ_ASSERT(mwidth > 0);

  return (ntet * nwidth) / mwidth;
}

uint32_t TaintRange::convertBaseEnd(uint32_t ntet, uint32_t nwidth,
                                    uint32_t mwidth) {
  MOZ_ASSERT(ntet >= 0);
  MOZ_ASSERT(nwidth > 0);
  MOZ_ASSERT(mwidth > 0);

  return (ntet * nwidth + nwidth - 1) / mwidth;
}

void TaintRange::toBase64() {
  resize(convertBaseBegin(begin_, 8, 6), convertBaseEnd(end_, 8, 6));
}

void TaintRange::fromBase64() {
  resize(convertBaseBegin(begin_, 6, 8), convertBaseEnd(end_, 6, 8));
}

#ifdef DEBUG

static void check_ranges(const std::vector<TaintRange>* ranges) {
  uint32_t last_end = 0;

  if (!ranges) {
    return;
  }

  for (auto& range : *ranges) {
    MOZ_ASSERT(range.begin() < range.end());
    MOZ_ASSERT(last_end <= range.begin());
    last_end = range.end();
  }
}

#  define CHECK_RANGES(ranges) check_ranges((ranges))
#else
#  define CHECK_RANGES(ranges)
#endif

StringTaint::StringTaint(const TaintRange& range) {
  MOZ_COUNT_CTOR(StringTaint);
  ranges_ = new std::vector<TaintRange>;
  ranges_->push_back(range);
  CHECK_RANGES(ranges_);
}

StringTaint::StringTaint(uint32_t begin, uint32_t end,
                         const TaintOperation& operation) {
  MOZ_COUNT_CTOR(StringTaint);
  ranges_ = new std::vector<TaintRange>;
  TaintRange range(begin, end, TaintFlow(new TaintNode(operation)));
  ranges_->push_back(range);
  CHECK_RANGES(ranges_);
}

StringTaint::StringTaint(const TaintFlow& flow, uint32_t length)
    : ranges_(nullptr) {
  // Only create the taint if there are entries in the flow
  if (flow) {
    MOZ_COUNT_CTOR(StringTaint);
    ranges_ = new std::vector<TaintRange>;
    ranges_->emplace_back(0, length, flow);
    CHECK_RANGES(ranges_);
  }
}

StringTaint::StringTaint(const StringTaint& other) : ranges_(nullptr) {
  if (other.ranges_) {
    MOZ_COUNT_CTOR(StringTaint);
    ranges_ = new std::vector<TaintRange>(*other.ranges_);
  }
  CHECK_RANGES(ranges_);
}

void StringTaint::assignFromSubTaint(const StringTaint& other, uint32_t begin,
                                     uint32_t end) {
  // Nothing can be selected, so don't allocate a vector just to throw it away.
  if (!other.ranges_ || end <= begin) {
    clear();
    return;
  }

  const auto& source = *other.ranges_;

  // Use binary search to get first range
  auto first = std::lower_bound(source.begin(), source.end(), begin);

  // Allocated lazily so that a selection matching no range costs nothing.
  std::vector<TaintRange>* ranges = nullptr;
  for (auto range = first; range != source.end(); range++) {
    if (range->begin() < end && range->end() > begin) {
      if (!ranges) {
        MOZ_COUNT_CTOR(StringTaint);
        ranges = new std::vector<TaintRange>();
      }
      ranges->emplace_back(std::max(range->begin(), begin) - begin,
                           std::min(range->end(), end) - begin, range->flow());
    }
    // Break out early if possible
    if (range->end() > end) {
      break;
    }
  }

  clear();
  ranges_ = ranges;
  CHECK_RANGES(ranges_);
}

StringTaint::StringTaint(const StringTaint& other, uint32_t begin, uint32_t end)
    : ranges_(nullptr) {
  assignFromSubTaint(other, begin, end);
}

StringTaint::StringTaint(const StringTaint& other, uint32_t index)
    : ranges_(nullptr) {
  assignFromSubTaint(other, index, index + 1);
}

StringTaint::StringTaint(StringTaint&& other) noexcept : ranges_(nullptr) {
  ranges_ = other.ranges_;
  other.ranges_ = nullptr;
  CHECK_RANGES(ranges_);
}

StringTaint& StringTaint::operator=(const StringTaint& other) {
  if (this == &other) {
    return *this;
  }

  clear();

  if (other.ranges_) {
    MOZ_COUNT_CTOR(StringTaint);
    ranges_ = new std::vector<TaintRange>(*other.ranges_);
  } else {
    ranges_ = nullptr;
  }
  CHECK_RANGES(ranges_);
  return *this;
}

StringTaint& StringTaint::operator=(StringTaint&& other) noexcept {
  if (this == &other) {
    return *this;
  }

  clear();

  ranges_ = other.ranges_;
  other.ranges_ = nullptr;

  CHECK_RANGES(ranges_);
  return *this;
}

void StringTaint::clear() {
  if (ranges_ != nullptr) {
    delete ranges_;
    ranges_ = nullptr;
    MOZ_COUNT_DTOR(StringTaint);
  }
}

SafeStringTaint StringTaint::safeCopy() const { return SafeStringTaint(*this); }

SafeStringTaint StringTaint::safeSubTaint(uint32_t begin, uint32_t end) const {
  // Create subtaint directly instead of having to copy entire range vector
  return SafeStringTaint(*this, begin, end);
}

SafeStringTaint StringTaint::safeSubTaint(uint32_t index) const {
  // Create subtaint directly instead of having to copy entire range vector
  return SafeStringTaint(*this, index);
}

void StringTaint::clearBetween(uint32_t begin, uint32_t end) {
  MOZ_ASSERT(begin <= end);

  // Ranges are kept sorted and disjoint, so the affected ones form a
  // contiguous run that can be trimmed in place without reallocating.
  if (!ranges_ || begin == end) {
    return;
  }

  auto& ranges = *ranges_;

  size_t i = 0;
  while (i < ranges.size() && ranges[i].end() <= begin) {
    i++;
  }
  if (i == ranges.size() || ranges[i].begin() >= end) {
    return;
  }

  // A range that strictly contains the cleared span splits in two. No other
  // range can overlap the span in that case.
  if (ranges[i].begin() < begin && ranges[i].end() > end) {
    TaintRange tail(end, ranges[i].end(), ranges[i].flow());
    ranges[i].resize(ranges[i].begin(), begin);
    ranges.insert(ranges.begin() + i + 1, std::move(tail));
    CHECK_RANGES(ranges_);
    return;
  }

  // Trim the range overlapping the start of the span, then the one
  // overlapping its end, and drop everything in between.
  size_t first = i;
  if (ranges[i].begin() < begin) {
    ranges[i].resize(ranges[i].begin(), begin);
    first = ++i;
  }
  while (i < ranges.size() && ranges[i].end() <= end) {
    i++;
  }
  if (i < ranges.size() && ranges[i].begin() < end) {
    ranges[i].resize(end, ranges[i].end());
  }
  ranges.erase(ranges.begin() + first, ranges.begin() + i);

  if (ranges.empty()) {
    clear();
  }
  CHECK_RANGES(ranges_);
}

void StringTaint::shift(uint32_t index, int amount) {
  MOZ_ASSERT(index + amount >= 0);  // amount can be negative

  if (0 == amount || !ranges_) {
    return;
  }

  auto& ranges = *ranges_;

  size_t i = 0;
  while (i < ranges.size() && ranges[i].end() <= index) {
    i++;
  }
  if (i == ranges.size()) {
    return;
  }

  // At most one range straddles the insertion point and has to be split.
  if (ranges[i].begin() < index) {
    MOZ_ASSERT(amount >= 0);
    TaintRange tail(index + amount, ranges[i].end() + amount, ranges[i].flow());
    ranges[i].resize(ranges[i].begin(), index);
    ranges.insert(ranges.begin() + i + 1, std::move(tail));
    i += 2;
  }
  for (; i < ranges.size(); i++) {
    ranges[i].resize(ranges[i].begin() + amount, ranges[i].end() + amount);
  }
  CHECK_RANGES(ranges_);
}

void StringTaint::insert(uint32_t index, const StringTaint& taint) {
  if (!taint.ranges_) {
    return;
  }

  // Inserting a taint into itself would read from the vector while it is
  // being resized, so work from a copy.
  if (&taint == this) {
    SafeStringTaint copy(taint);
    insert(index, copy);
    return;
  }

  const auto& inserted = *taint.ranges_;

  if (!ranges_) {
    MOZ_COUNT_CTOR(StringTaint);
    ranges_ = new std::vector<TaintRange>();
  }

  auto& ranges = *ranges_;

  size_t pos = 0;
  while (pos < ranges.size() && ranges[pos].begin() < index) {
    MOZ_ASSERT(ranges[pos].end() <= index);
    pos++;
  }

  ranges.insert(ranges.begin() + pos, inserted.size(), TaintRange());
  for (const auto& range : inserted) {
    ranges[pos++] =
        TaintRange(range.begin() + index, range.end() + index, range.flow());
  }

  CHECK_RANGES(ranges_);
}

const TaintFlow* StringTaint::at(uint32_t index) const {
  if (!ranges_) {
    return nullptr;
  }
  auto rangeItr = std::lower_bound(ranges_->begin(), ranges_->end(), index);
  if (rangeItr != ranges_->end()) {
    if (rangeItr->contains(index)) {
      return &rangeItr->flow();
    }
  }
  return nullptr;
}

const TaintFlow& StringTaint::atRef(uint32_t index) const {
  if (const TaintFlow* flow = at(index)) {
    return *flow;
  }
  return TaintFlow::getEmptyTaintFlow();
}

void StringTaint::set(uint32_t index, const TaintFlow& flow) {
  // Common case: append a single character to a string.
  if (!ranges_ || index >= ranges_->back().end()) {
    append(TaintRange(index, index + 1, flow));
  } else {
    clearAt(index);
    // insert() offsets the given ranges by |index|, so the range has to start
    // at zero. SafeStringTaint so the temporary releases its range vector;
    // a plain StringTaint has a trivial destructor and would leak it.
    SafeStringTaint single(TaintRange(0, 1, flow));
    insert(index, single);
  }
  CHECK_RANGES(ranges_);
}

StringTaint& StringTaint::subtaint(uint32_t begin, uint32_t end) {
  MOZ_ASSERT(begin <= end);
  StringTaint subtaint(*this, begin, end);
  // Assign will steal the pointer from st
  assign(subtaint.ranges_);
  return *this;
}

StringTaint& StringTaint::subtaint(uint32_t index) {
  return subtaint(index, index + 1);
}

StringTaint& StringTaint::extend(const TaintOperation& operation) {
  if (!ranges_) {
    return *this;
  }
  for (auto& range : *ranges_) {
    range.flow().extend(operation);
  }

  return *this;
}

StringTaint& StringTaint::extend(TaintOperation&& operation) {
  return extend(static_cast<const TaintOperation&>(operation));
}

StringTaint& StringTaint::overlay(uint32_t begin, uint32_t end,
                                  const TaintOperation& operation) {
  return overlay(begin, end, TaintFlow(operation));
}

StringTaint& StringTaint::overlay(uint32_t begin, uint32_t end,
                                  const TaintFlow& flow) {
  MOZ_ASSERT(begin <= end);
  CHECK_RANGES(ranges_);

  if (begin == end) {
    return *this;
  }

  // Check if the flow is empty
  if (!flow) {
    return *this;
  }

  // If there are no ranges, get out quick
  if (!ranges_) {
    MOZ_COUNT_CTOR(StringTaint);
    ranges_ = new std::vector<TaintRange>();
    ranges_->emplace_back(begin, end, flow);
    return *this;
  }

  MOZ_COUNT_CTOR(StringTaint);
  auto* ranges = new std::vector<TaintRange>();
  ranges->reserve(ranges_->size() * 2 + 2);

  auto current = this->begin();
  auto next = this->begin();

  // Move to second range
  next++;

  // Add overlap of overlay with space before first range
  if (begin < current->begin()) {
    ranges->emplace_back(begin, std::min(current->begin(), end), flow);
  }

  while (current != this->end()) {
    // Internal methods should ensure that ranges are self-consistent
    MOZ_ASSERT(current->begin() <= current->end());

    // If this range has *no* overlap with the overlay, just add the range
    if ((end <= current->begin()) || (begin >= current->end())) {
      ranges->emplace_back(current->begin(), current->end(), current->flow());
    } else {
      // Non-overlap at the start of the range
      if (begin > current->begin()) {
        ranges->emplace_back(current->begin(), begin, current->flow());
      }
      // Overlap inside the range
      if ((current->begin() < end) && (current->end() > begin)) {
        ranges->emplace_back(std::max(current->begin(), begin),
                             std::min(current->end(), end),
                             TaintFlow::append(current->flow(), flow));
      }
      // Non-overlap at the end of the range
      if (end < current->end()) {
        ranges->emplace_back(end, current->end(), current->flow());
      }
    }

    // If we are not on the last range, check the gap to the next range
    if (next != this->end()) {
      MOZ_ASSERT(next->begin() <= next->end());
      MOZ_ASSERT(next->begin() >= current->end());

      // Overlap of the overlay with the gap to the next range
      if ((current->end() < end) && (next->begin() > begin) &&
          (next->begin() > current->end())) {
        ranges->emplace_back(std::max(current->end(), begin),
                             std::min(next->begin(), end), flow);
      }
      next++;
    }
    current++;
  }

  // Add overlap of overlay with space after last range
  if (end > ranges_->back().end()) {
    ranges->emplace_back(std::max(ranges_->back().end(), begin), end, flow);
  }

  // Finally assign the ranges
  assign(ranges);
  return *this;
}

StringTaint& StringTaint::append(TaintRange range) {
  MOZ_ASSERT_IF(ranges_, ranges_->back().end() <= range.begin());

  // If the appending taint range has an empty flow, don't add it
  if (!range.flow()) {
    return *this;
  }

  if (!ranges_) {
    MOZ_COUNT_CTOR(StringTaint);
    ranges_ = new std::vector<TaintRange>;
  }
  // See if we can merge the two taint ranges.
  if (ranges_->size() > 0) {
    TaintRange& last = ranges_->back();
    if (last.end() == range.begin() && last.flow() == range.flow()) {
      last.resize(last.begin(), range.end());
      return *this;
    }
  }

  ranges_->push_back(std::move(range));
  CHECK_RANGES(ranges_);
  return *this;
}

void StringTaint::concat(const StringTaint& other, uint32_t offset) {
  MOZ_ASSERT_IF(ranges_ && ranges_->size() > 0,
                ranges_->back().end() <= offset);

  if (!other.ranges_) {
    return;
  }
  // No reserve() here: append() merges adjacent ranges sharing a flow, so
  // growing to an exact size on each call would defeat geometric growth.
  for (const auto& range : *other.ranges_) {
    append(
        TaintRange(range.begin() + offset, range.end() + offset, range.flow()));
  }
}

void StringTaint::concat(const TaintFlow& flow, uint32_t offset) {
  TaintRange range(offset, offset + 1, flow);
  append(range);
}

// Slight hack, see below.
static std::vector<TaintRange> empty_taint_range_vector;

std::vector<TaintRange>::iterator StringTaint::begin() {
  // We still need to return an iterator even if there are no ranges stored in
  // this instance. In that case we don't have a std::vector though. Solution:
  // use a static std::vector.
  if (!ranges_) {
    return empty_taint_range_vector.begin();
  }
  return ranges_->begin();
}

std::vector<TaintRange>::iterator StringTaint::end() {
  if (!ranges_) {
    return empty_taint_range_vector.end();
  }
  return ranges_->end();
}

std::vector<TaintRange>::const_iterator StringTaint::begin() const {
  if (!ranges_) {
    return empty_taint_range_vector.begin();
  }
  return ranges_->begin();
}

std::vector<TaintRange>::const_iterator StringTaint::end() const {
  if (!ranges_) {
    return empty_taint_range_vector.end();
  }
  return ranges_->end();
}

void StringTaint::assign(std::vector<TaintRange>* ranges) {
  clear();
  if (ranges && ranges->size() > 0) {
    ranges_ = ranges;
  } else {
    ranges_ = nullptr;
    // Only count a destruction if a vector was actually allocated, otherwise
    // the ctor/dtor counts get out of balance for a null argument.
    if (ranges) {
      MOZ_COUNT_DTOR(StringTaint);
      delete ranges;
    }
  }
  CHECK_RANGES(ranges_);
}

void StringTaint::removeOverlaps() {
  // Nothing to do if empty or only one range
  if (!ranges_ || ranges_->size() < 2) {
    return;
  }

  auto last = begin();
  auto current = begin();

  // Move to second range
  current++;

  while (current != end()) {
    // Internal methods should ensure that ranges are self-consistent
    MOZ_ASSERT(last->begin() <= last->end());
    MOZ_ASSERT(current->begin() <= current->end());
    MOZ_ASSERT(current->begin() > last->begin());
    // Check if two adjacent ranges overlap
    if (last->end() > current->begin()) {
      // Assign current iterator
      *current = TaintRange(last->end(), current->end(), current->flow());
    }
    // Check we didn't make an invalid range
    if (current->begin() >= current->end()) {
      current = ranges_->erase(current);
      // Don't need to set last it is still the previous range
    } else {
      last = current;
      current++;
    }
  }
  CHECK_RANGES(ranges_);
}

StringTaint& StringTaint::toBase64() {
  for (auto& range : *this) {
    range.toBase64();
  }
  removeOverlaps();

  return *this;
}

StringTaint& StringTaint::fromBase64() {
  for (auto& range : *this) {
    range.fromBase64();
  }
  removeOverlaps();

  return *this;
}

TaintList& TaintList::append(TaintFlow flow) {
  // If the appending taint range has an empty flow, don't add it
  if (!flow) {
    return *this;
  }

  if (!flows_) {
    MOZ_COUNT_CTOR(TaintList);
    flows_ = new std::vector<TaintFlow>;
  }

  flows_->push_back(flow);
  return *this;
}

void TaintList::clear() {
  if (flows_ != nullptr) {
    flows_->clear();
    MOZ_COUNT_DTOR(TaintList);
    delete flows_;
    flows_ = nullptr;
  }
}

// Slight hack, see below.
static std::vector<TaintFlow> empty_taint_flow_vector;

std::vector<TaintFlow>::iterator TaintList::begin() {
  // We still need to return an iterator even if there are no ranges stored in
  // this instance. In that case we don't have a std::vector though. Solution:
  // use a static std::vector.
  if (!flows_) {
    return empty_taint_flow_vector.begin();
  }
  return flows_->begin();
}

std::vector<TaintFlow>::iterator TaintList::end() {
  if (!flows_) {
    return empty_taint_flow_vector.end();
  }
  return flows_->end();
}

std::vector<TaintFlow>::const_iterator TaintList::begin() const {
  if (!flows_) {
    return empty_taint_flow_vector.begin();
  }
  return flows_->begin();
}

std::vector<TaintFlow>::const_iterator TaintList::end() const {
  if (!flows_) {
    return empty_taint_flow_vector.end();
  }
  return flows_->end();
}

#ifdef TAINT_DEBUG
void PrintTaint(const StringTaint& taint) {
  for (auto& range : taint) {
    std::cout << "    " << range.begin() << " - " << range.end() << " : "
              << range.flow().source().name() << std::endl;
  }
}

void DumpTaint(const StringTaint& taint,
               std::experimental::source_location location) {
  TaintDebug("Taint Information", location);
  if (!taint.hasTaint()) {
    std::cout << "EmptyTaint" << std::endl;
  }
  for (auto& range : taint) {
    std::cout << "    " << range.begin() << " - " << range.end() << " : "
              << range.flow().source().name() << ":\n";
    DumpTaintFlow(range.flow());
  }
}

void DumpTaintFlow(const TaintFlow& flow) {
  for (auto& node : flow) {
    DumpTaintOperation(node.operation());
  }
}

void DumpTaintOperation(const TaintOperation& operation) {
  std::wstring_convert<std::codecvt_utf8<char16_t>, char16_t> convert;
  std::cout << "\t\t" << operation.name() << "[";
  for (auto& arg : operation.arguments()) {
    std::cout << convert.to_bytes(arg) << ", ";
  }
  std::cout << "]\n";
}

void TaintDebug(std::string_view message,
                std::experimental::source_location location) {
  std::cout << "Tainting Debug Info:" << location.file_name() << ":"
            << location.line() << ":" << location.function_name() << " "
            << message << std::endl;
}
#else
void DumpTaint(const StringTaint& taint) {}

void PrintTaint(const StringTaint& taint) {}
#endif

bool ParseStringTaintForE2E(const std::string& input, StringTaint& taint) {
#if (DEBUG_E2E_TAINTING)
  std::cout << "ParseStringTaintForE2E: " << input << std::endl;
#endif

  json data = json::parse(input, nullptr, false);
  if (data.is_discarded()) {
#if (DEBUG_E2E_TAINTING)
    std::cout << "Error: invalid JSON for taint information" << std::endl;
#endif
    return false;
  }

  if (!data.is_array()) {
#if (DEBUG_E2E_TAINTING)
    std::cout << "Error: malformed taint information" << std::endl;
#endif
    return false;
  }

  uint32_t lastEnd = 0;

  taint.clear();

  for (const auto& elem : data) {
    if (!elem.is_object() ||
        (!elem.contains("begin") || !elem["begin"].is_number_unsigned()) ||
        (!elem.contains("end") || !elem["end"].is_number_unsigned()) ||
        (!elem.contains("source") || !elem["source"].is_string())) {
#if (DEBUG_E2E_TAINTING)
      std::cout << "Error: malformed taint range" << std::endl;
#endif
      return false;
    }

    uint32_t begin = elem["begin"].get<uint32_t>();
    uint32_t end = elem["end"].get<uint32_t>();
    std::string source = elem["source"].get<std::string>();

    TaintOperation op(source.c_str());
    op.setSource();
    TaintRange range = TaintRange(begin, end, TaintFlow(op));

    if (range.begin() < lastEnd) {
#if (DEBUG_E2E_TAINTING)
      std::cout << "Error: Invalid range, doesn't start after previous region"
                << std::endl;
#endif
      return false;
    }
    taint.append(range);
    lastEnd = range.end();
  }

#if (DEBUG_E2E_TAINTING)
  std::cout << "Done parsing taint. Result: " << std::endl;
  PrintTaint(taint);
#endif

  return true;
}

StringTaint ParseStringTaintForE2E(const std::string& input) {
  StringTaint taint;
  return ParseStringTaintForE2E(input, taint) ? taint : EmptyTaint;
}

std::string SerializeStringTaintForE2E(const StringTaint& taint,
                                       bool addSinks) {
  json data = json::array();

  for (const auto& range : taint) {
    json rangeObj;
    rangeObj["begin"] = range.begin();
    rangeObj["end"] = range.end();
    rangeObj["source"] = range.flow().source().name();

    if (addSinks) {
      rangeObj["sink"] = range.flow().head()->operation().name();
    }

    data.push_back(std::move(rangeObj));
  }

  return data.dump();
}

StringTaint ParseStringTaint(std::string aInput) {
  json data = json::parse(aInput, nullptr, false);
  if (data.is_discarded()) {
    return EmptyTaint;
  }
  return LoadStringTaintFromJSON(data);
}

std::string SerializeStringTaint(const StringTaint& aTaint) {
  return DumpStringTaintAsJSON(aTaint).dump();
}

StringTaint LoadStringTaintFromJSON(const json& aData) {
  StringTaint taint;
  for (const auto& elem : aData) {
    taint.append(LoadTaintRangeFromJSON(elem));
  }
  return taint;
}

json DumpStringTaintAsJSON(const StringTaint& aTaint) {
  json data = json::array();
  for (const auto& range : aTaint) {
    data.push_back(DumpTaintRangeAsJSON(range));
  }
  return data;
}

TaintRange LoadTaintRangeFromJSON(const json& aData) {
  return TaintRange(aData[0].get<uint32_t>(), aData[1].get<uint32_t>(),
                    LoadTaintFlowFromJSON(aData[2]));
}

json DumpTaintRangeAsJSON(const TaintRange& aRange) {
  return json::array(
      {aRange.begin(), aRange.end(), DumpTaintFlowAsJSON(aRange.flow())});
}

TaintFlow LoadTaintFlowFromJSON(const json& aData) {
  TaintFlow flow;
  for (auto it = aData.rbegin(); it != aData.rend(); ++it) {
    flow.extend(LoadTaintOperationFromJSON(it.value()));
  }
  return flow;
}

json DumpTaintFlowAsJSON(const TaintFlow& aFlow) {
  json data = json::array();
  for (const auto& node : aFlow) {
    data.push_back(DumpTaintOperationAsJSON(node.operation()));
  }
  return data;
}

TaintOperation LoadTaintOperationFromJSON(const json& aData) {
  TaintOperation op(aData[0].get<std::string>().c_str(),
                    LoadTaintLocationFromJSON(aData[1]),
                    aData[2].get<std::vector<std::u16string>>());
  if (aData[3].get<bool>()) {
    op.setSource();
  }
  return op;
}

json DumpTaintOperationAsJSON(const TaintOperation& aOperation) {
  return json::array({
      aOperation.name(),
      DumpTaintLocationAsJSON(aOperation.location()),
      aOperation.arguments(),
      aOperation.isSource(),
  });
}

TaintLocation LoadTaintLocationFromJSON(const json& aData) {
  return TaintLocation(
      aData[0].get<std::u16string>(), aData[1].get<uint32_t>(),
      aData[2].get<std::uint32_t>(), aData[3].get<std::uint32_t>(),
      aData[4].get<std::uint32_t>(), aData[5].get<std::uint32_t>(),
      aData[6].get<TaintMd5>(), aData[7].get<std::u16string>());
}

json DumpTaintLocationAsJSON(const TaintLocation& aLocation) {
  return json::array({aLocation.filename(), aLocation.line(), aLocation.pos(),
                      aLocation.next_line(), aLocation.next_pos(),
                      aLocation.scriptStartLine(), aLocation.scriptHash(),
                      aLocation.function()});
}
