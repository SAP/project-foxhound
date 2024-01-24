/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 4 -*- */
/* vim: set ts=8 sts=4 et sw=4 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/*
 * Modifications Copyright SAP SE. 2019-2021.  All rights reserved.
 */

#include "Taint.h"

#include <locale>   // wstring_convert
#include <codecvt>  // codecvt_utf8
#include <iostream> // cout
#include <string>   // stoi and u32string
#include <algorithm>

#include "mozilla/Assertions.h"

#ifndef JS_STANDALONE
#include "nsISupportsImpl.h"
#endif

#ifndef MOZ_COUNT_CTOR
#define MOZ_COUNT_CTOR(X)
#endif

#ifndef MOZ_COUNT_DTOR
#define MOZ_COUNT_DTOR(X)
#endif

#define DEBUG_LINE() std::cout << __PRETTY_FUNCTION__ << std::endl;

TaintLocation::TaintLocation(std::u16string filename, uint32_t line, uint32_t pos, uint32_t scriptStartLine, TaintMd5 scriptHash, std::u16string function)
    : filename_(std::move(filename)), line_(line), pos_(pos), scriptStartLine_(scriptStartLine), scriptHash_(scriptHash), function_(std::move(function)) {}

TaintLocation::TaintLocation()
    : filename_(), line_(0), pos_(0), scriptStartLine_(0), scriptHash_({0}), function_() {}

TaintLocation::TaintLocation(TaintLocation&& other) noexcept
    : filename_(std::move(other.filename_)),
      line_(other.line_),
      pos_(other.pos_),
      scriptStartLine_(other.scriptStartLine_),
      scriptHash_(other.scriptHash_),
      function_(std::move(other.function_)) {}

TaintLocation& TaintLocation::operator=(TaintLocation&& other) noexcept
{
    filename_ = std::move(other.filename_);
    line_ = other.line_;
    pos_ = other.pos_;
    scriptStartLine_ = other.scriptStartLine_;
    scriptHash_ = other.scriptHash_;
    function_ = std::move(other.function_);
    return *this;
}

TaintOperation::TaintOperation(const char* name, TaintLocation location, std::initializer_list<std::u16string> args)
    : name_(name), arguments_(args), source_(0), is_native_(false), location_(std::move(location)) {}

TaintOperation::TaintOperation(const char* name, bool is_native, TaintLocation location, std::initializer_list<std::u16string> args)
    : name_(name), arguments_(args), source_(0), is_native_(is_native), location_(std::move(location)) {}

TaintOperation::TaintOperation(const char* name, TaintLocation location, std::vector<std::u16string> args)
    : name_(name), arguments_(std::move(args)), source_(0), is_native_(false), location_(std::move(location)) {}

TaintOperation::TaintOperation(const char* name, bool is_native, TaintLocation location, std::vector<std::u16string> args)
    : name_(name), arguments_(std::move(args)), source_(0), is_native_(is_native), location_(std::move(location)) {}

TaintOperation::TaintOperation(const char* name, std::initializer_list<std::u16string> args)
    : name_(name), arguments_(args), source_(0), is_native_(false), location_() {}

TaintOperation::TaintOperation(const char* name, bool is_native, std::initializer_list<std::u16string> args)
    : name_(name), arguments_(args), source_(0), is_native_(is_native), location_() {}

TaintOperation::TaintOperation(const char* name, std::vector<std::u16string> args)
    : name_(name), arguments_(std::move(args)), source_(0), is_native_(false), location_() {}

TaintOperation::TaintOperation(const char* name, bool is_native, std::vector<std::u16string> args)
    : name_(name), arguments_(std::move(args)), source_(0), is_native_(is_native), location_() {}

TaintOperation::TaintOperation(const char* name)
    : name_(name), arguments_(), source_(0), is_native_(false), location_() {}

TaintOperation::TaintOperation(const char* name, bool is_native)
    : name_(name), arguments_(), source_(0), is_native_(is_native), location_() {}

TaintOperation::TaintOperation(const char* name, TaintLocation location)
    : name_(name), arguments_(), source_(0), is_native_(false), location_(std::move(location)) {}

TaintOperation::TaintOperation(const char* name, bool is_native, TaintLocation location)
    : name_(name), arguments_(), source_(0), is_native_(is_native), location_(std::move(location)) {}

TaintOperation::TaintOperation(TaintOperation&& other) noexcept
    : name_(std::move(other.name_)),
      arguments_(std::move(other.arguments_)),
      source_(other.source_),
      is_native_(other.is_native_),
      location_(std::move(other.location_)) {}

TaintOperation& TaintOperation::operator=(TaintOperation&& other) noexcept
{
    name_ = std::move(other.name_);
    arguments_ = std::move(other.arguments_);
    source_ = other.source_;
    is_native_ = other.is_native_;
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
    std::cout << "Location: " << convert.to_bytes(op.location().filename()) << ":" << op.location().line() << ":" << op.location().pos() << std::endl;
    std::cout << "Function: " << convert.to_bytes(op.location().function()) << " native[" << op.is_native() << "]" << std::endl;
    std::cout << "Args:" << std::endl;
    for (const auto& arg : op.arguments()) {
        len += arg.length();
        std::cout << "  * " << convert.to_bytes(arg) << "(" << arg.length() << ")" << std::endl;
    }
    totlen += len;
    biggest = std::max(biggest, len);
    totsize += sizeof(op);
    std::cout << "************************************************" << std::endl;
    std::cout << "Args len: " << len << " total: " << totlen << " biggest: " << biggest << std::endl;
    std::cout << "Size: " << sizeof(op) << " total: " << totsize << std::endl;
    std::cout << "************************************************" << std::endl;
}
#else
void TaintOperation::dump(const TaintOperation& op) {}
#endif

TaintNode::TaintNode(TaintNode* parent, const TaintOperation& operation)
    : parent_(parent), refcount_(1), operation_(operation)
{
    MOZ_COUNT_CTOR(TaintNode);
    if (parent_) {
        parent_->addref();
    }
}

TaintNode::TaintNode(TaintNode* parent, TaintOperation&& operation) noexcept
    : parent_(parent), refcount_(1), operation_(std::move(operation))
{
    MOZ_COUNT_CTOR(TaintNode);
    if (parent_) {
        parent_->addref();
    }
}

TaintNode::TaintNode(const TaintOperation& operation)
    : parent_(nullptr), refcount_(1), operation_(operation)
{
    MOZ_COUNT_CTOR(TaintNode);
}

TaintNode::TaintNode(TaintOperation&& operation) noexcept
    : parent_(nullptr), refcount_(1), operation_(std::move(operation))
{
    MOZ_COUNT_CTOR(TaintNode);
}

void TaintNode::addref()
{
    if (refcount_ == 0xffffffff) {
        MOZ_CRASH("TaintNode refcount overflow");
    }

    refcount_++;
}

void TaintNode::release()
{
    MOZ_ASSERT(refcount_ > 0);

    refcount_--;
    if (refcount_ == 0) {
        delete this;
    }
}

TaintNode::~TaintNode()
{
    MOZ_COUNT_DTOR(TaintNode);
    if (parent_) {
        parent_->release();
    }
}


TaintFlow::Iterator::Iterator(TaintNode* head) : current_(head) { }

TaintFlow::Iterator::Iterator() : current_(nullptr) { }

TaintFlow::Iterator::Iterator(const Iterator& other) : current_(other.current_) { }

TaintFlow::Iterator& TaintFlow::Iterator::operator++()
{
    current_ = current_->parent();
    return *this;
}

TaintNode& TaintFlow::Iterator::operator*() const
{
    return *current_;
}

bool TaintFlow::Iterator::operator==(const Iterator& other) const
{
    return current_ == other.current_;
}

bool TaintFlow::Iterator::operator!=(const Iterator& other) const
{
    return current_ != other.current_;
}

TaintFlow::TaintFlow()
    : head_(nullptr)
{
    MOZ_COUNT_CTOR(TaintFlow);
}

TaintFlow::TaintFlow(TaintNode* head)
    : head_(head)
{
    MOZ_COUNT_CTOR(TaintFlow);
}

TaintFlow::TaintFlow(const TaintOperation& source)
    : head_(new TaintNode(source))
{
    MOZ_COUNT_CTOR(TaintFlow);
}

TaintFlow::TaintFlow(const TaintFlow& other)
    : head_(other.head_)
{
    MOZ_COUNT_CTOR(TaintFlow);
    if (head_) {
        head_->addref();
    }
}

TaintFlow::TaintFlow(const TaintFlow* other)
    : head_(nullptr)
{
    MOZ_COUNT_CTOR(TaintFlow);
    if (other) {
        head_ = other->head_;
        if (head_) {
            head_->addref();
        }
    }
}

TaintFlow::TaintFlow(TaintFlow&& other) noexcept
    : head_(other.head_)
{
    MOZ_COUNT_CTOR(TaintFlow);
    other.head_ = nullptr;
}


TaintFlow::~TaintFlow()
{
    MOZ_COUNT_DTOR(TaintFlow);
    if (head_) {
        head_->release();
    }
}

TaintFlow& TaintFlow::operator=(const TaintFlow& other)
{
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

const TaintOperation& TaintFlow::source() const
{
    TaintNode* source = head_;
    while (source->parent() != nullptr) {
        source = source->parent();
    }

    return source->operation();
}

TaintFlow& TaintFlow::extend(const TaintOperation& operation)
{
    TaintNode* newhead = new TaintNode(head_, operation);
    head_->release();
    head_ = newhead;
    return *this;
}

TaintFlow& TaintFlow::extend(const TaintOperation& operation) const
{
    TaintFlow flow(*this);
    return flow.extend(operation);
}


TaintFlow& TaintFlow::extend(TaintOperation&& operation)
{
    TaintNode* newhead = new TaintNode(head_, std::move(operation));
    head_->release();
    head_ = newhead;
    return *this;
}

TaintFlow::Iterator TaintFlow::begin() const
{
    return Iterator(head_);
}

TaintFlow::Iterator TaintFlow::end() const
{
    return Iterator();
}

TaintFlow TaintFlow::extend(const TaintFlow& flow, const TaintOperation& operation)
{
    return TaintFlow(new TaintNode(flow.head_, operation));
}


TaintRange::TaintRange()
    : begin_(0), end_(0), flow_()
{
    MOZ_COUNT_CTOR(TaintRange);
}

TaintRange::TaintRange(uint32_t begin, uint32_t end, TaintFlow flow)
    : begin_(begin), end_(end), flow_(std::move(flow))
{
    MOZ_COUNT_CTOR(TaintRange);
    MOZ_ASSERT(begin <= end);
}

TaintRange::TaintRange(const TaintRange& other)
    : begin_(other.begin_), end_(other.end_), flow_(other.flow_)
{
    MOZ_COUNT_CTOR(TaintRange);
}

TaintRange::~TaintRange()
{
    MOZ_COUNT_DTOR(TaintRange);
}

TaintRange& TaintRange::operator=(const TaintRange& other)
{
    begin_ = other.begin_;
    end_ = other.end_;
    flow_ = other.flow_;

    return *this;
}

bool TaintRange::operator<(const TaintRange& other) const
{
    return this->end() < other.begin();
}

bool TaintRange::operator<(uint32_t index) const
{
    return this->end() < index;
}

bool TaintRange::operator>(uint32_t index) const
{
    return this->begin() > index;
}

bool TaintRange::operator==(uint32_t index) const
{
    return this->contains(index);
}

bool TaintRange::contains(uint32_t index) const
{
    return this->begin() <= index && this->end() > index;
}

void TaintRange::resize(uint32_t begin, uint32_t end)
{
    MOZ_ASSERT(begin <= end);

    begin_ = begin;
    end_ = end;
}

/**
 * Some helper functions for converting between ASCII (octets) and base64 (sextets)
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
uint32_t TaintRange::convertBaseBegin(uint32_t ntet, uint32_t nwidth, uint32_t mwidth)
{
    MOZ_ASSERT(ntet >= 0);
    MOZ_ASSERT(nwidth > 0);
    MOZ_ASSERT(mwidth > 0);

    return (ntet * nwidth) / mwidth;
}

uint32_t TaintRange::convertBaseEnd(uint32_t ntet, uint32_t nwidth, uint32_t mwidth)
{
    MOZ_ASSERT(ntet >= 0);
    MOZ_ASSERT(nwidth > 0);
    MOZ_ASSERT(mwidth > 0);

    return (ntet * nwidth + nwidth - 1) / mwidth;
}

void TaintRange::toBase64()
{
    resize(convertBaseBegin(begin_, 8, 6), convertBaseEnd(end_, 8, 6));
}

void TaintRange::fromBase64()
{
    resize(convertBaseBegin(begin_, 6, 8), convertBaseEnd(end_, 6, 8));
}

#ifdef DEBUG

static void check_ranges(const std::vector<TaintRange>* ranges)
{
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

#define CHECK_RANGES(ranges) check_ranges((ranges))
#else
#define CHECK_RANGES(ranges)
#endif


StringTaint::StringTaint(const TaintRange& range)
{
    MOZ_COUNT_CTOR(StringTaint);
    ranges_ = new std::vector<TaintRange>;
    ranges_->push_back(range);
    CHECK_RANGES(ranges_);
}

StringTaint::StringTaint(uint32_t begin, uint32_t end, const TaintOperation& operation)
{
    MOZ_COUNT_CTOR(StringTaint);
    ranges_ = new std::vector<TaintRange>;
    TaintRange range(begin, end, TaintFlow(new TaintNode(operation)));
    ranges_->push_back(range);
    CHECK_RANGES(ranges_);
}

StringTaint::StringTaint(const TaintFlow& flow, uint32_t length) : ranges_(nullptr)
{
    // Only create the taint if there are entries in the flow
    if (flow) {
        MOZ_COUNT_CTOR(StringTaint);
        ranges_ = new std::vector<TaintRange>;
        ranges_->emplace_back(0, length, flow);
        CHECK_RANGES(ranges_);
    }
}

StringTaint::StringTaint(const StringTaint& other) : ranges_(nullptr)
{
    if (other.ranges_) {
        MOZ_COUNT_CTOR(StringTaint);
        ranges_ = new std::vector<TaintRange>(*other.ranges_);
    }
    CHECK_RANGES(ranges_);
}

void StringTaint::assignFromSubTaint(const StringTaint& other, uint32_t begin, uint32_t end)
{
    MOZ_COUNT_CTOR(StringTaint);
    auto* ranges = new std::vector<TaintRange>();
    if (other.ranges_) {
        // Use binary search to get first range
        auto range = std::lower_bound(other.begin(), other.end(), begin);
        for (; range != other.end(); range++) {
            if (range->begin() < end && range->end() > begin && end > begin) {
                ranges->push_back(TaintRange(std::max(range->begin(), begin) - begin,
                                             std::min(range->end(), end) - begin,
                                             range->flow()));
            }
            // Break out early if possible
            if (range->end() > end) {
                break;
            }
        }
    }
    assign(ranges);
    CHECK_RANGES(ranges_);
}

StringTaint::StringTaint(const StringTaint& other, uint32_t begin, uint32_t end) : ranges_(nullptr)
{
    assignFromSubTaint(other, begin, end);
}

StringTaint::StringTaint(const StringTaint& other, uint32_t index) : ranges_(nullptr)
{
    assignFromSubTaint(other, index, index + 1);
}

StringTaint::StringTaint(StringTaint&& other) noexcept : ranges_(nullptr) 
{

    ranges_ = other.ranges_;
    other.ranges_ = nullptr;
    CHECK_RANGES(ranges_);
}

StringTaint& StringTaint::operator=(const StringTaint& other)
{
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

StringTaint& StringTaint::operator=(StringTaint&& other) noexcept
{
    if (this == &other) {
	return *this;
    }

    clear();

    ranges_ = other.ranges_;
    other.ranges_ = nullptr;

    CHECK_RANGES(ranges_);
    return *this;
}

void StringTaint::clear()
{
    if (ranges_ != nullptr) {
        MOZ_COUNT_DTOR(StringTaint);
        delete ranges_;
        ranges_ = nullptr;
    }
}

SafeStringTaint StringTaint::safeCopy() const
{
    return SafeStringTaint(*this);
}

SafeStringTaint StringTaint::safeSubTaint(uint32_t begin, uint32_t end) const
{
    // Create subtaint directly instead of having to copy entire range vector
    return SafeStringTaint(*this, begin, end);
}

SafeStringTaint StringTaint::safeSubTaint(uint32_t index) const
{
    // Create subtaint directly instead of having to copy entire range vector
    return SafeStringTaint(*this, index);
}

void StringTaint::clearBetween(uint32_t begin, uint32_t end)
{
    MOZ_ASSERT(begin <= end);

    if (begin == end) {
        return;
    }

    MOZ_COUNT_CTOR(StringTaint);
    auto* ranges = new std::vector<TaintRange>();
    for (auto& range : *this) {
        if (range.end() <= begin || range.begin() >= end) {
            ranges->emplace_back(range.begin(), range.end(), range.flow());
        } else {
            if (range.begin() < begin) {
                ranges->emplace_back(range.begin(), begin, range.flow());
            }
            if (range.end() > end) {
                ranges->emplace_back(end, range.end(), range.flow());
            }
        }
    }

    assign(ranges);
}

void StringTaint::shift(uint32_t index, int amount)
{
    MOZ_ASSERT(index + amount >= 0);        // amount can be negative

    if (0 == amount) {
        return;
    }

    MOZ_COUNT_CTOR(StringTaint);
    auto* ranges = new std::vector<TaintRange>();
    for (auto& range : *this) {
        if (range.begin() >= index) {
            ranges->emplace_back(range.begin() + amount, range.end() + amount, range.flow());
        } else if (range.end() > index) {
            MOZ_ASSERT(amount >= 0);
            ranges->emplace_back(range.begin(), index, range.flow());
            ranges->emplace_back(index + amount, range.end() + amount, range.flow());
        } else {
            ranges->emplace_back(range.begin(), range.end(), range.flow());
        }
    }

    assign(ranges);
}

void StringTaint::insert(uint32_t index, const StringTaint& taint)
{
    if (!taint.ranges_) {
        return;
    }

    MOZ_COUNT_CTOR(StringTaint);
    auto* ranges = new std::vector<TaintRange>();
    auto it = begin();

    while (it != end() && it->begin() < index) {
        auto& range = *it;
        MOZ_ASSERT(range.end() <= index);
        ranges->emplace_back(range.begin(), range.end(), range.flow());
        it++;
    }

    for (auto& range : taint) {
        ranges->emplace_back(range.begin() + index, range.end() + index, range.flow());
    }

    while (it != end()) {
        auto& range = *it;
        ranges->emplace_back(range.begin(), range.end(), range.flow());
        it++;
    }

    assign(ranges);
}

const TaintFlow* StringTaint::at(uint32_t index) const
{
    auto rangeItr = std::lower_bound(begin(), end(), index);
    if (rangeItr != end()) {
        if (rangeItr->contains(index)) {
            return &rangeItr->flow();
        }
    }
    return nullptr;
}

const TaintFlow& StringTaint::atRef(uint32_t index) const
{
    auto rangeItr = std::lower_bound(begin(), end(), index);
    if (rangeItr != end()) {
        if (rangeItr->contains(index)) {
            return rangeItr->flow();
        }
    }
    return TaintFlow::getEmptyTaintFlow();
}

void StringTaint::set(uint32_t index, const TaintFlow& flow)
{
    // Common case: append a single character to a string.
    if (!ranges_ || index >= ranges_->back().end()) {
        append(TaintRange(index, index+1, flow));
    } else {
        clearAt(index);
        insert(index, StringTaint(TaintRange(index, index+1, flow)));
    }
    CHECK_RANGES(ranges_);
}

StringTaint& StringTaint::subtaint(uint32_t begin, uint32_t end)
{
    MOZ_ASSERT(begin <= end);
    StringTaint subtaint(*this, begin, end);
    // Assign will steal the pointer from st
    assign(subtaint.ranges_);
    return *this;
}

StringTaint& StringTaint::subtaint(uint32_t index)
{
    return subtaint(index, index + 1);
}

StringTaint& StringTaint::extend(const TaintOperation& operation)
{
    for (auto& range : *this) {
        range.flow().extend(operation);
    }

    return *this;
}

StringTaint& StringTaint::extend(TaintOperation&& operation)
{
    for (auto& range : *this) {
        range.flow().extend(operation);
    }

    return *this;
}

StringTaint& StringTaint::overlay(uint32_t begin, uint32_t end, const TaintOperation& operation)
{
    MOZ_ASSERT(begin <= end);
    CHECK_RANGES(ranges_);

    if (begin == end) {
        return *this;
    }

    // If there are no ranges, get out quick
    if (!ranges_) {
        MOZ_COUNT_CTOR(StringTaint);
        ranges_ = new std::vector<TaintRange>();
        ranges_->emplace_back(begin, end, TaintFlow(operation));
        return *this;
    }

    MOZ_COUNT_CTOR(StringTaint);
    auto* ranges = new std::vector<TaintRange>();

    auto current = this->begin();
    auto next = this->begin();

    // Move to second range
    next++;

    // Add overlap of overlay with space before first range
    if (begin < current->begin()) {
        ranges->emplace_back(begin, std::min(current->begin(), end), TaintFlow(operation));
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
                                     TaintFlow::extend(current->flow(), operation));
	    }
	    // Non-overlap at the end of the range
            if (end < current->end()) {
                ranges->emplace_back(current->end(), end, current->flow());
            }
        }

	// If we are not on the last range, check the gap to the next range
	if (next != this->end()) {
            MOZ_ASSERT(next->begin() <= next->end());
            MOZ_ASSERT(next->begin() >= current->end());

            // Overlap of the overlay with the gap to the next range
            if ((current->end() < end) && (next->begin() > begin) && (next->begin() > current->end())) {
                ranges->emplace_back(std::max(current->end(), begin),
                                     std::min(next->begin(), end),
                                     TaintFlow(operation));
            }
            next++;
        }
        current++;
    }

    // Add overlap of overlay with space after last range
    if (end > ranges_->back().end()) {
        ranges->emplace_back(std::max(ranges_->back().end(), begin), end, TaintFlow(operation));
    }

    // Finally assign the ranges
    assign(ranges);
    return *this;
}

StringTaint& StringTaint::append(TaintRange range)
{
    MOZ_ASSERT_IF(ranges_, ranges_->back().end() <= range.begin());

    // If the appending taint range has an empty flow, don't add it
    if (!range.flow().isEmpty()) {
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

    ranges_->push_back(range);
    CHECK_RANGES(ranges_);
    return *this;
}

void StringTaint::concat(const StringTaint& other, uint32_t offset)
{
    MOZ_ASSERT_IF(ranges_ && ranges_->size() > 0, ranges_->back().end() <= offset);

    for (auto& range : other) {
        append(TaintRange(range.begin() + offset, range.end() + offset, range.flow()));
    }
}

// Slight hack, see below.
static std::vector<TaintRange> empty_taint_range_vector;

std::vector<TaintRange>::iterator StringTaint::begin()
{
    // We still need to return an iterator even if there are no ranges stored in this instance.
    // In that case we don't have a std::vector though. Solution: use a static std::vector.
    if (!ranges_) {
        return empty_taint_range_vector.begin();
    }
    return ranges_->begin();
}

std::vector<TaintRange>::iterator StringTaint::end()
{
    if (!ranges_) {
        return empty_taint_range_vector.end();
    }
    return ranges_->end();
}

std::vector<TaintRange>::const_iterator StringTaint::begin() const
{
    if (!ranges_) {
        return empty_taint_range_vector.begin();
    }
    return ranges_->begin();
}

std::vector<TaintRange>::const_iterator StringTaint::end() const
{
    if (!ranges_) {
        return empty_taint_range_vector.end();
    }
    return ranges_->end();
}

void StringTaint::assign(std::vector<TaintRange>* ranges)
{
    clear();
    if (ranges && ranges->size() > 0) {
        ranges_ = ranges;
    } else {
        ranges_ = nullptr;
        // XXX is this really correct?
        MOZ_COUNT_DTOR(StringTaint);
        delete ranges;
    }
    CHECK_RANGES(ranges_);
}

void StringTaint::removeOverlaps()
{
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

StringTaint& StringTaint::toBase64()
{
    for (auto& range : *this) {
        range.toBase64();
    }
    removeOverlaps();

    return *this;
}

StringTaint& StringTaint::fromBase64()
{
    for (auto& range : *this) {
        range.fromBase64();
    }
    removeOverlaps();

    return *this;
}

// Simple parser for a JSON like representation of taint information.
//
// Example:
//      [{begin: 10, end: 20, source: 'src1'}, {begin: 80, end: 90, source: 'src2'}]
//
// The ParseXXX methods always adjust |i| to point to the character directly after the end of the parsed object.

std::string ParseString(const std::string& str, size_t& i, size_t length, bool& valid)
{
#if (DEBUG_E2E_TAINTING)
    std::cout << "ParseKeyValuePair, i = " << i << std::endl;
#endif

    char c = str[i];

    // TODO support \' and \"
    size_t pos = str.find(c, i+1);
    if (pos == std::string::npos) {
#if (DEBUG_E2E_TAINTING)
        std::cout << "Errr: unterminated string literal" << std::endl;
#endif
        valid = false;
        return "";
    }

    valid = true;
    std::string res = str.substr(i + 1, pos - i - 1);
    i = pos + 1;
    return res;
}

std::pair<std::string, std::string> ParseKeyValuePair(const std::string& str, size_t& i, size_t length, bool& valid)
{
#if (DEBUG_E2E_TAINTING)
    std::cout << "ParseKeyValuePair, i = " << i << std::endl;
#endif

    std::string key, value;

    bool expecting_value = false, parsing_value = false;

    while (i < length) {
        char c = str[i];
        if (isalnum(c)) {
            if (expecting_value) {
                parsing_value = true;
            }
            if (!parsing_value) {
                key.push_back(c);
            }
            else {
                value.push_back(c);
            }
        } else if (c == ':') {
            if (expecting_value == true) {
                break;
            }
            expecting_value = true;
        } else if (c == '\'' || c == '"') {
            if (!expecting_value) {
                break;
            }
            parsing_value = true;
            value = ParseString(str, i, length, valid);
            break;
        } else if (parsing_value) {
            // done
            break;
        }
        i++;
    }

    if (!parsing_value) {
#if (DEBUG_E2E_TAINTING)
        std::cout << "Error: invalid key,value pair" << std::endl;
#endif
        valid = false;
    }

    valid = true;
#if (DEBUG_E2E_TAINTING)
    std::cout << "  Key: " << key << ", value: " << value << std::endl;
#endif
    return std::make_pair(key, value);
}

TaintRange ParseRange(const std::string& str, size_t& i, size_t length, bool& valid)
{
#if (DEBUG_E2E_TAINTING)
    std::cout << "ParseRange, i = " << i << std::endl;
#endif

    i++;

    size_t begin, end;
    std::string source;

    bool have_begin = false, have_end = false, have_source = false;

    while (i < length) {
        if (isalnum(str[i])) {
            std::pair<std::string, std::string> kv = ParseKeyValuePair(str, i, length, valid);
            if (!valid) {
                break;
            } else if (kv.first == "begin") {
                have_begin = true;
                begin = strtol(kv.second.c_str(), nullptr, 10);
            } else if (kv.first == "end") {
                have_end = true;
                end = strtol(kv.second.c_str(), nullptr, 10);
            } else if (kv.first == "source") {
                have_source = true;
                source = kv.second;
            } else {
#if (DEBUG_E2E_TAINTING)
                std::cout << "Warning: unknown key '" << kv.first << "'" << std::endl;
#endif
            }
        } else if (str[i] == '}') {
            i++;
            break;
        } else {
            i++;
        }
    }

    if (!valid || !have_begin || !have_end || !have_source) {
#if (DEBUG_E2E_TAINTING)
        std::cout << "Error: invalid taint range" << std::endl;
#endif
        valid = false;
        return TaintRange(0, 0, TaintOperation(""));
    }

    valid = true;
#if (DEBUG_E2E_TAINTING)
    std::cout << "  ParseTaintRange done: " << begin << " - " << end << " : " << source << std::endl;
#endif
    return TaintRange(begin, end, TaintOperation(source.c_str()));
}

StringTaint ParseTaint(const std::string& str)
{
#if (DEBUG_E2E_TAINTING)
    std::cout << "ParseTaint: " << str << std::endl;
#endif
    if (str.length() <= 2 || str.front() != '[' || str.back() != ']') {
#if (DEBUG_E2E_TAINTING)
        std::cout << "Error: malformed taint information" << std::endl;
#endif
        return EmptyTaint;
    }

    StringTaint taint;

    size_t i = 1, last_end = 0;
    size_t end = str.length() - 1;
    while (i < end) {
        if (str[i] == '{') {
            bool valid = false;
            TaintRange range = ParseRange(str, i, end, valid);
            if (!valid) {
#if (DEBUG_E2E_TAINTING)
                std::cout << "Error: malformed taint range" << std::endl;
#endif
                return EmptyTaint;
            }
            if (range.begin() < last_end) {
#if (DEBUG_E2E_TAINTING)
                std::cout << "Error: Invalid range, doesn't start after previous region" << std::endl;
#endif
                return EmptyTaint;
            }
            taint.append(range);
            last_end = range.end();
        }

        i++;
    }

#if (DEBUG_E2E_TAINTING)
    std::cout << "Done parsing taint. Result: " << std::endl;
    PrintTaint(taint);
#endif

    return taint;
}

void PrintTaint(const StringTaint& taint)
{
    for (auto& range : taint) {
        std::cout << "    " << range.begin() << " - " << range.end() << " : " << range.flow().source().name() << std::endl;
    }
}

void DumpTaint(const StringTaint& taint, std::experimental::source_location location)
{
    TaintDebug("Taint Information", location);
    for (auto& range : taint) {
        std::cout << "    " << range.begin() << " - " << range.end() << " : " << range.flow().source().name() << ":\n";
        auto& flow = range.flow();

        for(auto& node : flow) {
            auto& op = node.operation();
            DumpTaintOperation(op);

        }
    }
}

void DumpTaintOperation(const TaintOperation& operation) {
    std::wstring_convert<std::codecvt_utf8<char16_t>, char16_t> convert;
    std::cout << "\t\t" << operation.name() << "[";
    for(auto& arg : operation.arguments()) {
        std::cout << convert.to_bytes(arg) << ", ";
    }
    std::cout << "]\n";

}

void TaintDebug(std::string_view message,
                std::experimental::source_location location)
{
    std::cout << "Tainting Debug Info:"
              << location.file_name() << ":"
              << location.line() << ":"
              << location.function_name() << " "
              << message << std::endl;
}
