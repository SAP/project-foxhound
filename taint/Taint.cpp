#include "Taint.h"

#include <algorithm>
#include <iostream>

#define DEBUG_LINE() std::cout << __PRETTY_FUNCTION__ << std::endl;

TaintLocation::TaintLocation(std::u16string filename, int32_t line, int32_t pos, std::u16string function)
  : filename_(filename), line_(line), pos_(pos), function_(function) {}

TaintLocation::TaintLocation()
  : filename_(), line_(0), pos_(0), function_() {}

TaintLocation::TaintLocation(TaintLocation&& other)
  : filename_(std::move(other.filename_)),
    line_(std::move(other.line_)),
    pos_(std::move(other.pos_)),
    function_(std::move(other.function_)) {}

TaintLocation& TaintLocation::operator=(TaintLocation&& other)
{
    filename_ = std::move(other.filename_);
    line_ = std::move(other.line_);
    pos_ = std::move(other.pos_);
    function_ = std::move(other.function_);
    return *this;
}

TaintOperation::TaintOperation(const char* name, TaintLocation location, std::initializer_list<std::u16string> args)
  : name_(name), arguments_(args), location_(location) {}

TaintOperation::TaintOperation(const char* name, TaintLocation location, std::vector<std::u16string> args)
  : name_(name), arguments_(args), location_(location) {}

TaintOperation::TaintOperation(const char* name, std::initializer_list<std::u16string> args)
  : name_(name), arguments_(args), location_() {}

TaintOperation::TaintOperation(const char* name, std::vector<std::u16string> args)
  : name_(name), arguments_(args), location_() {}

TaintOperation::TaintOperation(const char* name)
  : name_(name), arguments_(), location_() {}

TaintOperation::TaintOperation(const char* name, TaintLocation location)
  : name_(name), arguments_(), location_(location) {}

TaintOperation::TaintOperation(TaintOperation&& other)
  : name_(std::move(other.name_)),
    arguments_(std::move(other.arguments_)),
    location_(std::move(other.location_)) {}

TaintOperation& TaintOperation::operator=(TaintOperation&& other)
{
    name_ = std::move(other.name_);
    arguments_ = std::move(other.arguments_);
    location_ = std::move(other.location_);
    return *this;
}

TaintNode::TaintNode(TaintNode* parent, TaintOperation operation) : parent_(parent), refcount_(1), operation_(operation)
{
    if (parent_)
        parent_->addref();
}

TaintNode::TaintNode(TaintOperation operation) : parent_(nullptr), refcount_(1), operation_(operation) { }

void TaintNode::addref()
{
    if (refcount_ == 0xffffffff)
        MOZ_CRASH("TaintNode refcount overflow");

    refcount_++;
}

void TaintNode::release()
{
    MOZ_ASSERT(refcount_ > 0);

    refcount_--;
    if (refcount_ == 0)
        delete this;
}

TaintNode::~TaintNode()
{
    if (parent_)
        parent_->release();
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

TaintFlow::TaintFlow() : head_(nullptr) { }

TaintFlow::TaintFlow(TaintNode* head) : head_(head) { }

TaintFlow::TaintFlow(TaintSource source) : head_(new TaintNode(source)) { }

TaintFlow::TaintFlow(const TaintFlow& other) : head_(other.head_)
{
    if (head_)
        head_->addref();
}

TaintFlow::TaintFlow(TaintFlow&& other) : head_(other.head_)
{
    other.head_ = nullptr;
}


TaintFlow::~TaintFlow()
{
    if (head_)
        head_->release();
}

TaintFlow& TaintFlow::operator=(const TaintFlow& other)
{
    if (head_)
        head_->release();

    head_ = other.head_;
    if (head_)
        head_->addref();

    return *this;
}

const TaintSource& TaintFlow::source() const
{
    TaintNode* source = head_;
    while (source->parent() != nullptr)
        source = source->parent();

    return source->operation();
}

TaintFlow& TaintFlow::extend(TaintOperation operation)
{
    TaintNode* newhead = new TaintNode(head_, operation);
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

TaintFlow TaintFlow::extend(const TaintFlow& flow, TaintOperation operation)
{
    return TaintFlow(new TaintNode(flow.head_, operation));
}


TaintRange::TaintRange() : begin_(0), end_(0), flow_() { }
TaintRange::TaintRange(uint32_t begin, uint32_t end, TaintFlow flow) : begin_(begin), end_(end), flow_(flow)
{
    MOZ_ASSERT(begin <= end);
}
TaintRange::TaintRange(const TaintRange& other) : begin_(other.begin_), end_(other.end_), flow_(other.flow_) { }

TaintRange& TaintRange::operator=(const TaintRange& other)
{
    begin_ = other.begin_;
    end_ = other.end_;
    flow_ = other.flow_;

    return *this;
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

StringTaint::StringTaint() : ranges_(nullptr) { }

StringTaint::StringTaint(TaintRange range)
{
    ranges_ = new std::vector<TaintRange>;
    ranges_->push_back(range);
}

StringTaint::StringTaint(uint32_t begin, uint32_t end, TaintOperation operation)
{
    ranges_ = new std::vector<TaintRange>;
    TaintRange range(begin, end, TaintFlow(new TaintNode(operation)));
    ranges_->push_back(range);
}

StringTaint::StringTaint(TaintFlow taint, uint32_t length)
{
    ranges_ = new std::vector<TaintRange>;
    ranges_->push_back(TaintRange(0, length, taint));
}

StringTaint::StringTaint(const StringTaint& other) : ranges_(nullptr)
{
    if (other.ranges_)
        ranges_ = new std::vector<TaintRange>(*other.ranges_);
}

StringTaint::StringTaint(StringTaint&& other) : ranges_(nullptr)
{
    ranges_ = other.ranges_;
    other.ranges_ = nullptr;
}


StringTaint::~StringTaint()
{
    clear();
}

StringTaint& StringTaint::operator=(const StringTaint& other)
{
    if (this == &other)
        return *this;

    clear();

    if (other.ranges_)
        ranges_ = new std::vector<TaintRange>(*other.ranges_);
    else
        ranges_ = nullptr;

    return *this;
}

StringTaint& StringTaint::operator=(StringTaint&& other)
{
    if (this == &other)
      return *this;

    clear();

    ranges_ = other.ranges_;
    other.ranges_ = nullptr;

    return *this;
}

void StringTaint::clear()
{
  delete ranges_;
  ranges_ = nullptr;
}

void StringTaint::clearBetween(uint32_t begin, uint32_t end)
{
    MOZ_ASSERT(begin <= end);

    auto ranges = new std::vector<TaintRange>();
    for (auto& range : *this) {
        if (range.end() <= begin || range.begin() >= end) {
            ranges->emplace_back(range.begin(), range.end(), range.flow());
        } else {
            if (range.begin() < begin)
                ranges->emplace_back(range.begin(), begin, range.flow());
            if (range.end() > end)
                ranges->emplace_back(end, range.end(), range.flow());
        }
    }

    assign(ranges);
}

void StringTaint::shift(uint32_t index, int amount)
{
    MOZ_ASSERT(index + amount >= 0);        // amount can be negative

    auto ranges = new std::vector<TaintRange>();
    StringTaint newtaint;
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
    auto ranges = new std::vector<TaintRange>();
    auto it = begin();

    while (it != end() && it->begin() < index) {
        auto& range = *it;
        MOZ_ASSERT(range.end() <= index);
        ranges->emplace_back(range.begin(), range.end(), range.flow());
        it++;
    }

    uint32_t last = index;
    for (auto& range : taint) {
        ranges->emplace_back(range.begin() + index, range.end() + index, range.flow());
        last = range.end() + index;
    }

    while (it != end()) {
        auto& range = *it;
        MOZ_ASSERT(range.begin() >= last);
        ranges->emplace_back(range.begin(), range.end(), range.flow());
        it++;
    }

    assign(ranges);
}

const TaintFlow* StringTaint::at(uint32_t index) const
{
    // TODO make this a binary search
    for (auto& range : *this) {
        if (range.begin() <= index && range.end() > index)
            return &range.flow();
    }
    return nullptr;
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
}

StringTaint StringTaint::subtaint(uint32_t begin, uint32_t end) const
{
    MOZ_ASSERT(begin <= end);

    StringTaint newtaint;
    for (auto& range : *this) {
        if (range.begin() < end && range.end() > begin)
	  newtaint.append(TaintRange(std::max(range.begin(), begin) - begin,
				     std::min(range.end(), end) - begin,
				     range.flow()));
    }

    return newtaint;
}

StringTaint& StringTaint::extend(TaintOperation operation)
{
    for (auto& range : *this)
        range.flow().extend(operation);

    return *this;
}

StringTaint& StringTaint::append(TaintRange range)
{
    MOZ_ASSERT_IF(ranges_, ranges_->back().end() <= range.begin());

    if (!ranges_)
        ranges_ = new std::vector<TaintRange>;

    // See if we can merge the two taint ranges.
    if (ranges_->size() > 0) {
        TaintRange& last = ranges_->back();
        if (last.end() == range.begin() && last.flow() == range.flow()) {
            last.resize(last.begin(), range.end());
            return *this;
        }
    }

    ranges_->push_back(range);

    return *this;
}

StringTaint& StringTaint::concat(const StringTaint& other, uint32_t offset)
{
    MOZ_ASSERT_IF(ranges_, ranges_->back().end() <= offset);

    for (auto& range : other)
        append(TaintRange(range.begin() + offset, range.end() + offset, range.flow()));

    return *this;
}

// Slight hack, see below.
static std::vector<TaintRange> empty_taint_range_vector;

std::vector<TaintRange>::iterator StringTaint::begin()
{
    // We still need to return an iterator even if there are no ranges stored in this instance.
    // In that case we don't have a std::vector though. Solution: use a static std::vector.
    if (!ranges_)
        return empty_taint_range_vector.begin();
    return ranges_->begin();
}

std::vector<TaintRange>::iterator StringTaint::end()
{
    if (!ranges_)
        return empty_taint_range_vector.end();
    return ranges_->end();
}

std::vector<TaintRange>::const_iterator StringTaint::begin() const
{
    if (!ranges_)
        return empty_taint_range_vector.begin();
    return ranges_->begin();
}

std::vector<TaintRange>::const_iterator StringTaint::end() const
{
    if (!ranges_)
        return empty_taint_range_vector.end();
    return ranges_->end();
}

StringTaint StringTaint::concat(const StringTaint& left, uint32_t leftlen, const StringTaint& right)
{
    StringTaint newtaint = left;
    return newtaint.concat(right, leftlen);
}

StringTaint StringTaint::substr(const StringTaint& taint, uint32_t begin, uint32_t end)
{
    return taint.subtaint(begin, end);
}

StringTaint StringTaint::extend(const StringTaint& taint, const TaintOperation& operation)
{
    StringTaint newtaint;
    for (auto& range : taint)
        newtaint.append(TaintRange(range.begin(), range.end(), TaintFlow::extend(range.flow(), operation)));

    return newtaint;
}

void StringTaint::assign(std::vector<TaintRange>* ranges)
{
    clear();
    if (ranges->size() > 0) {
        ranges_ = ranges;
    } else {
        ranges_ = nullptr;
	// XXX is this really correct?
        delete ranges;
    }
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

StringTaint StringTaint::toBase64(const StringTaint& taint)
{
    StringTaint newTaint = taint;
    return newTaint.toBase64();
}

StringTaint StringTaint::fromBase64(const StringTaint& taint)
{
    StringTaint newTaint = taint;
    return newTaint.fromBase64();
}
