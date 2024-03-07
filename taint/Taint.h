/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 4 -*- */
/* vim: set ts=8 sts=4 et sw=4 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/*
 * Modifications Copyright SAP SE. 2019-2021.  All rights reserved.
 */

/* Taint datastructures and function that are used by Spidermonkey and Gecko. */

#ifndef _Taint_h
#define _Taint_h

#include <initializer_list>
#include <string>
#include <vector>
#include <array>
#include <atomic>
#include <string_view>

// It appears that source_location is not supported as standard and
// breaks windows builds. Keep it behind a debug macro for now.
#ifdef TAINT_DEBUG
#include <experimental/source_location>
#endif

/*
 * How to taint:
 *
 * In essence, the browser is made taint aware by extending each string class
 * with some object to store taint information. Next, various pieces of code are
 * modified to propagate this taint information correctly.
 * The final step is to generate taint informatin at a set of predefined
 * sources and monitoring sink accesses for tainted arguments.
 * For a list of sources and sinks the taint/README.md.
 *
 * There are a couple of central data structures (classes) that are used to
 * manage taint information. These are:
 *
 *   TaintLocation      Information about where a taint operation took place
 *
 *   TaintOperation     An operation performed on tainted data. These could be
 *                      operations like substr(), replace(), concat(), ...
 *
 *   TaintFlow          Represent a flow of tainted data through the engine.
 *                      A flow is comprised of a source (e.g. location.hash)
 *                      as well as a set of operations that were performed on
 *                      the original data.
 *
 *   TaintNode          A node in a taint flow. These represent either a taint
 *                      source or an operation.
 *
 *   TaintRange         A range of tainted bytes within a string that all share
 *                      the same taint flow.
 *
 *   StringTaint        Taint information for string objects. Contain a set of
 *                      TaintRange instances.
 *
 * See the comments for each class for more details.
 *
 * Moreover, this file also provide the TaintableString base class which
 * implements some of the basic APIs for dealing with taint aware string.
 *
 * To keep this code portable we try to avoid using any Firefox specific
 * features (except assertions).
 */

using TaintMd5 = std::array<unsigned char, 16>;

/*
 * Information on the location of a taint operation/source/sink
 *
 * Used to track exact operation locations in a taint flow.
 */
class TaintLocation
{
  public:

    TaintLocation(std::u16string filename, uint32_t line, uint32_t pos, uint32_t scriptStartLine, TaintMd5 scriptHash, std::u16string function);

    TaintLocation();

    // These work fine as long as we are using stl classes.
    TaintLocation(const TaintLocation& other) = default;
    TaintLocation& operator=(const TaintLocation& other) = default;

    // MSVC doesn't let us = default these :(
    TaintLocation(TaintLocation&& other) noexcept;
    TaintLocation& operator=(TaintLocation&& other) noexcept;

    const std::u16string& filename() const { return filename_; }
    uint32_t line() const { return line_; }
    uint32_t pos() const { return pos_; }
    uint32_t scriptStartLine() const { return scriptStartLine_; }
    const TaintMd5& scriptHash() const { return scriptHash_; }
    const std::u16string& function() const { return function_; }

  private:
    std::u16string filename_;
    uint32_t line_;
    uint32_t pos_;
    uint32_t scriptStartLine_;
    TaintMd5 scriptHash_;
    std::u16string function_;
};

/*
 * An operation performed on tainted data.
 *
 * These could also be shared between taint nodes, but it's most likely not worth
 * the effort.
 */
class TaintOperation
{
  public:

    TaintOperation(const char* name, std::initializer_list<std::u16string> args);
    TaintOperation(const char* name, bool is_native, std::initializer_list<std::u16string> args);

    TaintOperation(const char* name, std::vector<std::u16string> args);
    TaintOperation(const char* name, bool is_native, std::vector<std::u16string> args);

    TaintOperation(const char* name, TaintLocation location, std::initializer_list<std::u16string> args);
    TaintOperation(const char* name, bool is_native, TaintLocation location, std::initializer_list<std::u16string> args);

    TaintOperation(const char* name, TaintLocation location, std::vector<std::u16string> args);
    TaintOperation(const char* name, bool is_native, TaintLocation location, std::vector<std::u16string> args);

    // Constructs a taint operation with no arguments.
    TaintOperation(const char* name);
    TaintOperation(const char* name, bool is_native);

    // Constructs a taint operation with location information
    TaintOperation(const char* name, TaintLocation location);
    TaintOperation(const char* name, bool is_native, TaintLocation location);

    // These work fine as long as we are using stl classes.
    TaintOperation(const TaintOperation& other) = default;
    TaintOperation& operator=(const TaintOperation& other) = default;

    // MSVC doesn't let us = default these :(
    TaintOperation(TaintOperation&& other) noexcept;
    TaintOperation& operator=(TaintOperation&& other) noexcept;

    const char* name() const { return name_.c_str(); }
    const std::vector<std::u16string>& arguments() const { return arguments_; }
    const TaintLocation& location() const { return location_; }

    // Getter and setter to mark a taint source
    bool isSource() const { return source_ != 0; }
    void setSource() { source_ = 1; }
    bool is_native() const { return is_native_; }
    void set_native() { is_native_ = 1; }

    static void dump(const TaintOperation& op);
    
  private:
    // The operation name is owned by this instance. It will be copied from the
    // argument string during construction.
    std::string name_;

    // The argument strings are owned by node instances as well.
    std::vector<std::u16string> arguments_;

    // Is this Operation a Source
    uint8_t source_;

    // Is this function an internal function?
    bool is_native_;

    TaintLocation location_;
};


/*
 * The nodes of the taint flow graph.
 *
 * Each node stores its parent in the graph as well as the operation
 * and its arguments that led to the creation of this node.
 * The operation name and the arguments are stored as plain C strings
 * since this is basically the only common denominator between SpiderMonkey
 * and Gecko.
 *
 * Since we want this code to have a minimum of dependencies (so it can be
 * integrated into other engines) we are implementing our own reference counting
 * here.
 */
class TaintNode
{
  public:
    // Constructing a taint node sets the initial reference count to 1.
    // Constructs an intermediate node.
    TaintNode(TaintNode* parent, const TaintOperation& operation);
    // Constructs a root node.
    TaintNode(const TaintOperation& operation);

    // Constructing a taint node sets the initial reference count to 1.
    // Constructs an intermediate node.
    TaintNode(TaintNode* parent, TaintOperation&& operation) noexcept;
    // Constructs a root node.
    TaintNode(TaintOperation&& operation) noexcept;
    
    // Increments the reference count of this object by one.
    void addref();

    // Decrement the reference count of this object by one. If the reference
    // count drops to zero then this instance will be destroyed.
    void release();

    // Returns the parent node of this node or nullptr if this is a root node.
    TaintNode* parent() { return parent_; }

    // Returns the operation associated with this taint node.
    const TaintOperation& operation() const { return operation_; }

  private:
    // Prevent clients from deleting us. TaintNodes can only be destroyed
    // through release().
    ~TaintNode();

    // A node takes care of correctly addref()ing and release()ing its parent node.
    TaintNode* parent_;

    std::atomic_uint32_t refcount_;

    // The operation that led to the creation of this node.
    TaintOperation operation_;

    // TaintNodes aren't supposed to be copied or assigned to (that's why we
    // refcount them), so these operations are unavailable.
    TaintNode(const TaintNode& other) = delete;
    TaintNode& operator=(const TaintNode& other) = delete;
};

/*
 * Taint flows.
 *
 * An instance of this class represents a flow of tainted data.
 * A flow incorporates all operations that were performed on the object
 * as well as the source of the tainted data.
 *
 * For example, the following piece of JavaScript code:
 *     var a = location.hash;
 *     var b = a.split('|')[0];
 *     var c = b.substring(0, 5);
 *     var d = c.toUpperCase();
 *
 * will result in the following taint flow for |d|:
 *     1. Taint source: location.hash
 *     2. String.prototype.split('|')
 *     3. String.prototype.substring(0, 5)
 *     3. String.prototype.toUpperCase()
 *
 *
 * Internals:
 * ----------
 * In the above example, |a|, |b|, |c| and |d| all have some parts of their
 * taint flows in common. To avoid data duplication, taint flow nodes are shared
 * between different taint flows: there is just one taint node instance for each
 * of the operations in the above example.
 *
 * With this, the taint flows essentially build up a DAG with multiple root
 * nodes, one for each taint source.
 * In this DAG a taint flow represents a path from a root node to any other
 * reachable node (including the root itself).
 *
 * Right now the taint flow DAG is also a set of trees: two different nodes are
 * never merged into a new one, or, said differently, a node always has at most one
 * incoming edge. This might change in the future though and would be required
 * to correctly track the outcome of binary operations on primitive types.
 */
class TaintFlow
{
  private:
    // Iterate over the nodes in this flow.
    //
    // Note: The iterator does not increment the reference count. Instead, the
    // caller must ensure that the TaintFlow instance is alive during the
    // lifetime of any iterator instance.
    class Iterator {
      public:
        Iterator(TaintNode* head);
        Iterator();

        Iterator(const Iterator& other);

        Iterator& operator++();
        TaintNode& operator*() const;
        bool operator==(const Iterator& other) const;
        bool operator!=(const Iterator& other) const;

      private:
        TaintNode* current_;
    };

  public:
   
    // Creates an empty taint flow.
    TaintFlow();

    // This constructor takes ownership of the provided taint node, i.e. does
    // *not* increment its refcount.
    // This is usually what the caller wants:
    //    TaintFlow flow(new TaintNode(...));
    explicit TaintFlow(TaintNode* head);

    // Construct a new taint flow from the provided taint source.
    TaintFlow(const TaintOperation& source);

    // Copying taint flows is an O(1) operation since it only requires
    // incrementing the reference count on the head node of the flow.
    TaintFlow(const TaintFlow& other);
    // Moving is even faster..
    TaintFlow(TaintFlow&& other) noexcept;

    TaintFlow(const TaintFlow* other);
 
    ~TaintFlow();

    // Similar to copying, this is an O(1) operation.
    TaintFlow& operator=(const TaintFlow& other);

    // Returns the head of this flow, i.e. the newest node in the path.
    TaintNode* head() const { return head_; }

    // Returns the source of this taint flow.
    const TaintOperation& source() const;

    // Constructs a new taint node as child of the current head node and sets
    // the newly constructed node as head of this taint flow.
    TaintFlow& extend(const TaintOperation& operation);

    // Constructs a new taint node as child of the current head node
    // does NOT set the newly constructed node as head of this taint flow.
    TaintFlow& extend(const TaintOperation& operation) const;

    // Constructs a new taint node as child of the current head node and sets
    // the newly constructed node as head of this taint flow.
    TaintFlow& extend(TaintOperation&& operation);

    // Iterator support
    //
    // Makes it possible to conveniently iterate over all taint nodes of a flow,
    // starting at the newest node.
    // Since TaintNodes are inherently immutable, we can safely return non-const
    // pointers here.
    TaintFlow::Iterator begin() const;
    TaintFlow::Iterator end() const;

    // Constructs a new taint node as child of the head node in this flow and
    // returns a new taint flow starting at that node.
    static TaintFlow extend(const TaintFlow& flow, const TaintOperation& operation);

    // Append two taint flows together
    static TaintFlow append(const TaintFlow& first, const TaintFlow& second);

    // Two TaintFlows are equal if they point to the same taint node.
    bool operator==(const TaintFlow& other) const { return head_ == other.head_; }
    bool operator!=(const TaintFlow& other) const { return head_ != other.head_; }

    bool isNotEmpty() const { return !!head_; }

    // Boolean operator, indicates whether this taint flow is empty or not.
    operator bool() const { return isNotEmpty(); }

    static const TaintFlow& getEmptyTaintFlow();

  private:
    // Last (newest) node of this flow.
    TaintNode* head_;

    static TaintFlow empty_flow_;
};


/*
 * This class represents a range of tainted bytes that share the same taint flow.
 *
 * Ranges are stored with an inclusive begin index and exclusive end index, i.e.
 * [begin, end).
 *
 * Since strings can be concatenated, each string contains a set of taint
 * ranges.
 */
class TaintRange {
  public:
    // Creates an empty range, i.e. begin = end = 0.
    TaintRange();

    // Standard range constructor.
    // |end| must be larger than or equal to |begin|.
    TaintRange(uint32_t begin, uint32_t end, TaintFlow flow);

    TaintRange(const TaintRange& other);

    ~TaintRange();

    TaintRange& operator=(const TaintRange& other);

    // Comparison Operators for searches
    bool operator<(const TaintRange& other) const;
    bool operator<(uint32_t index) const;
    bool operator>(uint32_t index) const;
    bool operator==(uint32_t index) const;

    bool contains(uint32_t index) const;

    // Returns a reference to the taint flow associated with this range.
    // All bytes in a taint range share the same taint flow.
    TaintFlow& flow() { return flow_; }
    const TaintFlow& flow() const { return flow_; }

    // Returns the start index of this range.
    uint32_t begin() const { return begin_; }

    // Returns the end index of this range.
    // This is the index of the element after the last element inside the range.
    uint32_t end() const { return end_; }

    // Resizes this range.
    void resize(uint32_t begin, uint32_t end);

    // Re-sizes the range to convert from ASCII to base64
    void toBase64();
    // Re-sizes the range to convert from base64 to ASCII
    void fromBase64();

  private:

    static uint32_t convertBaseBegin(uint32_t ntet, uint32_t nwidth, uint32_t m_tet);
    static uint32_t convertBaseEnd(uint32_t ntet, uint32_t nwidth, uint32_t m_tet);

    uint32_t begin_, end_;

    TaintFlow flow_;
};

class SafeStringTaint;

/*
 * String taint information.
 *
 * This is the main data structure to describe taint information for string types.
 * It holds a set of taint ranges, each with a different taint flow.
 * A string is tainted if its StringTaint instance contains a least one
 * taint range.
 *
 * For example, the following piece of JavaScript code:
 *    var a = taint('abc');
 *    var b = 'def';
 *    var c = taint('ghi');
 *    var x = a + b + c;
 *
 * will result in |x|'s StringTaint instance to contain two taint ranges: one from
 * [0, 3) and one from [6, 9). Both will have different taint flows associated
 * with them.
 *
 * This class stores no information about the length of the associated string
 * (to avoid data duplication). Thus, most methods require an index.
 *
 * WARNING:
 *
 * This class stores taint ranges as a pointer, but does not delete that
 * pointer during destruction. The reason is that to appear in constexpr
 * statements (as needed by nsString), the destructor must be default.
 *
 * The creator of StringTaint needs to ensure that the clear() method is
 * called before the object is destroyed.
 *
 * For a more convenient version which deletes its own ranges, use SafeStringTaint.
 */
class StringTaint
{
  public:

    // Constructs an empty instance without any taint flows.
    explicit constexpr StringTaint() : ranges_(nullptr) { }

    // Constructs a new instance containing a single taint range.
    explicit StringTaint(const TaintRange& range);

    // As above, but also constructs the taint range.
    // TODO make StringTaint(operaton, length) instead.
    StringTaint(uint32_t begin, uint32_t end, const TaintOperation& operation);

    // Construct taint information for a uniformly tainted string.
    explicit StringTaint(const TaintFlow& flow, uint32_t length);

    // Default destructor needed to allow the StringTaint class to
    // act as a literal and appear in constexpr's, e.g. EmptyTaint
    // This means that any instance of StringTaint needs to call
    // clear() before the object goes out of scope to prevent memory leaks
    ~StringTaint() = default;

    StringTaint(const StringTaint& other);
    StringTaint(StringTaint&& other) noexcept;
    StringTaint& operator=(const StringTaint& other);
    StringTaint& operator=(StringTaint&& other) noexcept;

    // Create subtaint
    StringTaint(const StringTaint& other, uint32_t begin, uint32_t end);
    StringTaint(const StringTaint& other, uint32_t index);

    // Returns true if any characters are tainted.
    bool hasTaint() const {
        return !!ranges_;
    }

    // Boolean operator, indicates whether this taint flow is empty or not.
    operator bool() const { return hasTaint(); }

    // Removes all taint information.
    void clear();

    // Removes all taint information for the characters in the provided range.
    // TODO rename to clearRange
    void clearBetween(uint32_t begin, uint32_t end);

    // Removes all taint information starting at the given index.
    void clearAfter(uint32_t index) {
        clearBetween(index, -1);
    }

    // Removes any taint information for the character at the given index.
    void clearAt(uint32_t index) {
        clearBetween(index, index+1);
    }

    // Shifts all taint information after the given index by the given amount
    // to the right.
    void shift(uint32_t index, int amount);

    // Inserts new taint information at the given offset.
    //
    // The ranges must not overlap, i.e. the range [index, length of given taint)
    // must be empty before inserting. Use shift() to achieve this if required.
    void insert(uint32_t index, const StringTaint& taint);

    // Replaces taint in the provided range.
    //
    // The provided taint information must not cover a range larger than
    // begin - end.
    void replace(uint32_t begin, uint32_t end, const StringTaint& taint) {
        clearBetween(begin, end);
        insert(begin, taint);
    }

    // Replaces taint in the provided range.
    //
    // This is the equivalent of replacing the range [begin, end) with a string
    // of the given length.
    //
    // The provided taint information must not cover a range larger than the
    // provided length.
    void replace(uint32_t begin, uint32_t end, uint32_t length, const StringTaint& taint) {
        clearBetween(begin, end);
        shift(begin, length - (end - begin));
        insert(begin, taint);
    }

    // Returns the taint flow associated with the character at the given index
    // or nullptr if the character is not tainted.
    const TaintFlow* at(uint32_t index) const;
    const TaintFlow* operator[](uint32_t index) const {
        return at(index);
    }
    const TaintFlow& atRef(uint32_t index) const;

    // Sets the taint flow for the character at the given index.
    // This will override any previous taint information for that character.
    void set(uint32_t index, const TaintFlow& flow);

    // Transforms the string taint instance holding the taint information of
    // a part of the current string, and thus of a substring of the associated
    // string.
    // Taint ranges in the returned instance will be offsetted by -begin to
    // start at zero.
    StringTaint& subtaint(uint32_t begin, uint32_t end);

    // Transforms the taint to hold a part of the current taint, and thus
    // of a substring of the associated string.
    // Taint ranges in the returned instance will be offsetted by -begin to
    // start at zero.
    StringTaint& subtaint(uint32_t index);

    // Adds a taint operation to the taint flows of all ranges in this instance.
    StringTaint& extend(const TaintOperation& operation);

    // Adds a taint operation to the taint flows of all ranges in this instance.
    // from a taint operation constructor
    StringTaint& extend(TaintOperation&& operation);

    // Adds a taint operation to the taint flows of all ranges in this instance.
    StringTaint& overlay(uint32_t begin, uint32_t end, const TaintOperation& operation);

    // Adds a taint operation to the taint flows of all ranges in this instance.
    StringTaint& overlay(uint32_t begin, uint32_t end, const TaintFlow& flow);

    // Appends a taint range.
    //
    // It is only possible to insert ranges at the end, so the start index of
    // the given range must be equal to or larger than the end index of the
    // last range of this instance.
    StringTaint& append(TaintRange range);

    // Appends all taint ranges from the provided string taint instance.
    //
    // All new ranges will be offsetted by the given factor, which must be
    // larger or equal to the end of the current last range.
    // TODO rename to append
    void concat(const StringTaint& other, uint32_t offset);

    // Creates a new taint range for a single character and appends it at offset
    void concat(const TaintFlow& other, uint32_t offset);

    // Re-sizes all taint ranges to convert from ASCII to base64
    StringTaint& toBase64();
    // Re-sizes all taint ranges to convert from base64 to ASCII
    StringTaint& fromBase64();

    // Iterate over the taint ranges.
    std::vector<TaintRange>::iterator begin();
    std::vector<TaintRange>::iterator end();
    std::vector<TaintRange>::const_iterator begin() const;
    std::vector<TaintRange>::const_iterator end() const;

    SafeStringTaint safeCopy() const;
    SafeStringTaint safeSubTaint(uint32_t begin, uint32_t end) const;
    SafeStringTaint safeSubTaint(uint32_t index) const;

  private:
    // Assign a new range vector and delete the old one.
    void assign(std::vector<TaintRange>* ranges);

    // Resize any overlapping ranges
    void removeOverlaps();

    // Set the contents to subtaint of another taint
    void assignFromSubTaint(const StringTaint& other, uint32_t begin, uint32_t end);

    // Here we optimize for the (common) case of untainted strings by only
    // storing a single pointer per instance. This keeps untainted strings
    // small while causing a slight overhead (one additional pointer) for
    // tainted strings.
    // This property is also needed by the JavaScript JIT compilers, see below.
    // The size of this vector can never be zero. If there's no taint stored in
    // this instance then the pointer will be null instead.
    std::vector<TaintRange>* ranges_;
};

// For the JIT we need to guarantee that a StringTaint instance is really only
// a pointer to the taint data, which is null if there is no taint information
// associated with a string.
static_assert(sizeof(StringTaint) == sizeof(void*), "Class StringTaint must be compatible with a raw pointer.");

// Empty taint instance for convenience.
// Using a macro here (instead of an exported instance) should be slightly
// faster since no memory accesses are required.
// TODO: in c++17 it should be possible to use something like
// inline constexpr const StringTaint& EmptyTaint = StringTaint();
#define EmptyTaint (StringTaint())

/*
 * A version of StringTaint which deletes the taint range pointer when destroyed.
 */
class SafeStringTaint : public StringTaint
{
  public:
    // Constructs an empty instance without any taint flows.
    explicit constexpr SafeStringTaint() : StringTaint() { }

    // Constructs a new instance containing a single taint range.
    explicit SafeStringTaint(TaintRange range) : StringTaint(range) {}

    // As above, but also constructs the taint range.
    // TODO make StringTaint(operaton, length) instead.
    SafeStringTaint(uint32_t begin, uint32_t end, const TaintOperation& operation) : StringTaint(begin, end, operation) {}

    // Construct taint information for a uniformly tainted string.
    explicit SafeStringTaint(TaintFlow flow, uint32_t length) : StringTaint(flow, length) {}

    // Default destructor needed to allow the StringTaint class to
    // act as a literal and appear in constexpr's, e.g. EmptyTaint
    // This means that any instance of StringTaint needs to call
    // clear() before the object goes out of scope.
    ~SafeStringTaint() { clear(); }

    SafeStringTaint(const SafeStringTaint& other) : StringTaint(other) {}
    SafeStringTaint(SafeStringTaint&& other) noexcept : StringTaint(std::move(other)) {}
    SafeStringTaint& operator=(const SafeStringTaint& other) { StringTaint::operator=(other); return *this; }
    SafeStringTaint& operator=(SafeStringTaint&& other) noexcept { StringTaint::operator=(other); return *this; }

    // Create subtaint
    SafeStringTaint(const StringTaint& other, uint32_t begin, uint32_t end) : StringTaint(other, begin, end) {}
    SafeStringTaint(const StringTaint& other, uint32_t index) : StringTaint(other, index) {}

    SafeStringTaint(const StringTaint& other) : StringTaint(other) {}
    SafeStringTaint(StringTaint&& other) noexcept : StringTaint(other) {}
    SafeStringTaint& operator=(const StringTaint& other) { StringTaint::operator=(other); return *this; }
    SafeStringTaint& operator=(StringTaint&& other) noexcept { StringTaint::operator=(other); return *this; }

};

/*
 * Base class for taint aware string-like objects.
 *
 * This class provides common operations for strings that carry taint
 * information.
 * Since most string classes provide direct access to their underlying character
 * buffer, this class also provides direct (writable) access to the internal
 * taint information.
 *
 * Since we don't want to modify every piece of code that deals with strings
 * anywhere in the browser, we only do the minimum amount of changes to the
 * string classes, i.e. don't modify the signature of every method that changes
 * the string to also accept a StringTaint instance. Taint aware string classes
 * will propagate taint on a "best-effort" basis instead.
 *
 * The general rule of thumbs here is that taint aware string classes will
 * propagate taint if they can (e.g. if given another taint aware string as
 * argument). If that's not possible they will at least remove any taint
 * information where appropriate (e.g. during replacement), which is usually
 * enough. In cases where the string class cannot propagate taint correctly it's
 * the callers responsibility to do so.
 *
 * Methods are provided for different coding styles to "fit into" the different
 * subsystems (mainly Gecko and Spidermonkey).
 */
class TaintableString {
  public:
    TaintableString() : taint_() { }

    ~TaintableString() { taint_.clear(); }

    //TODO: Copy constructor

    // A string is tainted if at least one of its characters is tainted.
    bool isTainted() const { return taint_.hasTaint(); }
    bool IsTainted() const { return taint_.hasTaint(); }

    // Direct access to the associated taint information.
    const StringTaint& taint() const { return taint_; }
    const StringTaint& Taint() const { return taint_; }
    StringTaint& taint() { return taint_; }
    StringTaint& Taint() { return taint_; }

    // Set the taint information directly.
    void setTaint(const StringTaint& new_taint) { taint_ = new_taint; }
    void AssignTaint(const StringTaint& new_taint) { taint_ = new_taint; }
    void setTaint(StringTaint&& new_taint) { taint_ = new_taint; }
    void AssignTaint(StringTaint&& new_taint) { taint_ = new_taint; }

    // Remove all taint information associated with this string.
    void clearTaint() { taint_.clear(); }
    void ClearTaint() { taint_.clear(); }

    // Remove all taint information after an index
    void clearTaintAfter(uint32_t index) { taint_.clearAfter(index); }
    void ClearTaintAfter(uint32_t index) { taint_.clearAfter(index); }

    // Remove taint information at an index
    void clearTaintAt(uint32_t index) { taint_.clearAt(index); }
    void ClearTaintAt(uint32_t index) { taint_.clearAt(index); }
        
    // Replace taint information from a range
    void ReplaceTaint(uint32_t begin, uint32_t end, uint32_t length, const StringTaint& taint) {
        taint_.replace(begin, end, length, taint); 
    }
    
    // Since we don't have access to the string length of our child class (TODO
    // possible using CRTP somehow?), this API is the best we can offer.
    void appendTaintAt(uint32_t offset, const StringTaint& taint) { taint_.concat(taint, offset); }
    void AppendTaintAt(uint32_t offset, const StringTaint& taint) { taint_.concat(taint, offset); }

    void insertTaintAt(uint32_t offset, const StringTaint& taint) { taint_.insert(offset, taint); }
    void InsertTaintAt(uint32_t offset, const StringTaint& taint) { taint_.insert(offset, taint); }

    // Initialize the taint information.
    //
    // This can be used instead of the public constructor, as done by JSString
    // and its derived classes.
    void initTaint() { new (&taint_) SafeStringTaint(); }
    void InitTaint() { initTaint(); }

    // Finalize this instance.
    //
    // Same as above, this can be used instead of the destructor. It guarantees
    // that all owned resources of this instance are released.
    void finalize() { taint_.clear(); }

  protected:
    // Protected so child classes can do offset assertions (see js/src/vm/String.h).
    SafeStringTaint taint_;
};

// Make sure the TaintableString class is no larger than its StringTaint member.
static_assert(sizeof(TaintableString) == sizeof(StringTaint), "Class TaintableString must be binary compatible with a StringTaint instance.");

/*
 * An iterable list of TaintFlows
 *
 * Simpler than the StringTaint, for cases where a vector of TaintFlows is sufficient
 *
 */
class TaintList
{
  public:

    // Constructs an empty instance without any taint flows.
    explicit constexpr TaintList() : flows_(nullptr) { }

    ~TaintList() { clear(); }

    // Returns true if any characters are tainted.
    bool hasTaint() const {
        return !!flows_;
    }

    // Removes all taint information.
    void clear();

    // Appends a taint flow
    TaintList& append(TaintFlow range);

    // Iterate over the taint ranges.
    std::vector<TaintFlow>::iterator begin();
    std::vector<TaintFlow>::iterator end();
    std::vector<TaintFlow>::const_iterator begin() const;
    std::vector<TaintFlow>::const_iterator end() const;

  private:
    // As with StringTaint, just keep a pointer to a vector to save overhead
    std::vector<TaintFlow>* flows_;
};


// Set to true to enable various debug outputs regarding end2end tainting
// throughout the engine.
#define DEBUG_E2E_TAINTING (DEBUG)

/*
 * Deserialize taint information from its string representation. Required for
 * incoming taint information in an end2end tainting scenario.
 */
StringTaint ParseTaint(const std::string& str);

/*
 * Print a string representation of the given StringTaint instance to stdout.
 */

#ifdef TAINT_DEBUG

void PrintTaint(const StringTaint& taint);

void DumpTaint(const StringTaint& taint, std::experimental::source_location location = std::experimental::source_location::current());

void DumpTaintFlow(const TaintFlow& flow);

void DumpTaintOperation(const TaintOperation& operation);

void TaintDebug(std::string_view message,
                std::experimental::source_location location = std::experimental::source_location::current());

#endif

#endif
