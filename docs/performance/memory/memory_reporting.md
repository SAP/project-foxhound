tl;dr: You should read this document before writing a memory reporter. And please ask Andrew McCreight (mccr8) to co-review any memory reporter patch.

Mozilla code has infrastructure that lets different parts of the code report on their memory usage. This is most obviously used in about:memory and telemetry. This document describes things that you should know when writing a memory reporter.

Memory Reporters
================

A memory reporter makes one or more memory measurements (a.k.a. reports).

Each reporter implements a `collectReports` function which takes a `nsIMemoryReporterCallback` argument; for each measurement the reporter must pass in several values, including:

*   a path (which identifies the report);
*   an amount (the most important thing);
*   a unit (most commonly bytes, but sometimes a unitless count or percentage);
*   a description of what is measured.

See the [nsIMemoryReporter documentation](/en/XPCOM_Interface_Reference/nsIMemoryReporter) and [nsIMemoryReporter.idl](http://dxr.mozilla.org/mozilla-central/source/xpcom/base/nsIMemoryReporter.idl) for full details.

Making Measurements
-------------------

`nsIMemoryReporter` provides the high-level interface for a memory reporter, but the heart of a memory reporter is the measurement of the "amount".

### Two Ways to Measure

Memory reporters can be divided into the two following kinds.

*   _Traversal-based_ reporters traverse one or more data structures and measure the size of all the allocated blocks in the data structure.
*   _Counter-based_ reporters maintain a counter that is incremented on each relevant allocation and decremented on each relevant deallocation.

Traversal-based reporters are preferable, for the following reasons.

*   They are less error-prone. We've had multiple bugs in the past with counter-based reporters.
*   The cost of reporting isn't incurred unless the memory reporter is queried.
*   They provide more information to DMD, which is a tool that helps keep about:memory's "heap-unclassified" number low. See below for more details.

Sometimes counter-based reporters are unavoidable, particularly when writing memory reporters for third-party code that cannot be modified.

### A Simple Example

Imagine a simple string class with the following data fields:

```c++
class MyString
{
  private:
    char *mBuffer;    // heap-allocated
    size_t mLen;

  // ... methods ...
}
```

Here are what the measurement functions (yes, functions) should look like for this class.

```c++
size_t MyString::SizeOfExcludingThis(mozilla::MallocSizeOf aMallocSizeOf) const
{
  return aMallocSizeOf(mBuffer);
}
size_t MyString::SizeOfIncludingThis(mozilla::MallocSizeOf aMallocSizeOf) const
{
  return aMallocSizeOf(this) + SizeOfExcludingThis(aMallocSizeOf);
}
```

(Note that `SizeOfExcludingThis` and `SizeOfIncludingThis` aren't overrides of methods on a global base class that is common to all reporters. These names are just a convention that is commonly followed. That said, note that for some classes these methods may be virtual.)
[mfbt/MemoryReporting.h](http://dxr.mozilla.org/mozilla-central/source/mfbt/MemoryReporting.h) defines `mozilla::MallocSizeOf` as follows:

```c++
typedef size_t (*MallocSizeOf)(const void* p);
```

Functions with this signature measure the size of `p` by asking the heap allocator how big it is (via `moz_malloc_usable_size`).
All this is probably not what you'd expect, but the above functions have the following crucial features.

*   They let you measure the `MyString` object itself or not as necessary. This is important because sometimes an object might be embedded in another object that is measured separately. And the names make it clear exactly what is being measured.
*   On platforms that allow it, they count the actual memory in use, including "slop" bytes caused by the heap allocator rounding up request sizes (a.k.a. internal fragmentation). If slop bytes aren't measured they'll end up in about:memory's heap-unclassified entry, which is bad.
*   The size is not computed analytically. For example, `sizeof` doesn't appear anywhere. This is a good thing, because computing sizes analytically doesn't count slop, and it is much more error-prone than using `moz_malloc_usable_size`.
*   They are flexible and integrate well with DMD. The `aMallocSizeOf` parameter allows `mozilla::MallocSizeOf` functions with DMD-specific hooks to be passed in when they are used by memory reporters, but functions without such hooks (such as `moz_malloc_size_of`) can also be passed in when they are used in other circumstances.

Some other things to note.

*   Please use `size_t` for the sizes in functions like this. Although `nsIMemoryReporter` uses `int64_t`, this is because (a) you can't use `size_t` in IDL, and (b) not every "amount" is a bytes measurement. So it's best to mostly use `size_t` and convert to `int64_t` as late as possible.
*   You don't always need both `SizeOfExcludingThis` and `SizeOfIncludingThis`. Implement one or both as needed. If you have both, `SizeOfExcludingThis` is the interesting one; `SizeOfIncludingThis` always has the same basic form.

And here's how you'd write a memory reporter if there was a single global `MyString` object.

```c++
MyString *gMyString;

class MyStringReporter MOZ_FINAL : public nsIMemoryReporter
{
  MOZ_DEFINE_MALLOC_SIZE_OF(MallocSizeOf)

public:
  NS_DECL_ISUPPORTS

  NS_METHOD
  CollectReports(nsIHandleReportCallback* aHandleReport, nsISupports* aData)
  {
    // BTW: If gMyString wasn't a pointer, you'd use
    // |gMyString.SizeOfExcludingThis(MallocSizeOf)| instead.
    return MOZ_COLLECT_REPORT(
      "explicit/mystring", KIND_HEAP, UNITS_BYTES,
      gMyString-&gt;SizeOfIncludingThis(MallocSizeOf),
      "Memory used for MyString.");
  }
};

NS_IMPL_ISUPPORTS1(MyStringReporter, nsIMemoryReporter)
```

Note that `MOZ_DEFINE_MALLOC_SIZE_OF` defines a function of type `mozilla::MallocSizeOf` that is specific to this memory reporter (and will be identified as such in DMD's output). And `MOZ_COLLECT_REPORT` is a macro that makes things a bit shorter.

### An Example Involving Inheritance

Things are a little trickier when inheritance is involved. An example:

```c++
class B
{
  virtual foo() { ... }

  virtual size_t SizeOfExcludingThis(nsMallocSizeOfFun aMallocSizeOf) const
  {
    return ... // measure things pointed to by B-specific fields
  }

  virtual size_t SizeOfIncludingThis(nsMallocSizeOfFun aMallocSizeOf) const
  {
    return aMallocSizeOf(this) + SizeOfExcludingThis(aMallocSizeOf);
  }

  // data members
};

class D : public B
{
  virtual foo() { ... }

  virtual size_t SizeOfExcludingThis(nsMallocSizeOfFun aMallocSizeOf) const override
  {
    size_t n = B::SizeOfExcludingThis(aMallocSizeOf);
    n += ...  // measure things pointed to by D-specific fields
    return n;
  }

  virtual size_t SizeOfIncludingThis(nsMallocSizeOfFun aMallocSizeOf) const override
  {
    return aMallocSizeOf(this) + SizeOfExcludingThis(aMallocSizeOf);
  }

  // data members
};
```

Things to note about `SizeOfExcludingThis` when it is virtual.

*   If `D` has data members that point to other objects, then `D::SizeOfExcludingThis` must override `B::SizeOfExcludingThis`. Otherwise, if we have a `B*` pointer that actually points to a `D` object, we'll end up calling `B::SizeOfExcludingThis` instead of `D::SizeOfExcludingThis`, and thus we'll fail to measure any objects that `D`'s fields point to. `D::SizeOfExcludingThis` must also call `B::SizeOfExcludingThis`, to ensure that any objects pointed to by fields inherited from `B` are measured.
*   However, if `D` does not have any of its own fields that point to other objects, then `D::SizeOfExcludingThis` is not necessary.
*   Alternatively, if `D` does have fields that point to other objects but you don't want to measure them because they're insignificant, then `D::SizeOfExcludingThis` is again not necessary. But it's a good idea to add a comment indicating this decision not to measure, and the names of the unmeasured fields. The obvious place for this comment is within `D`, but if `B` has many sub-classes like that, it might be easier to put the comment above `B::SizeOfIncludingThis`.

Things to note about `SizeOfIncludingThis` when it is virtual.

*   `D::SizeOfIncludingThis` is identical to `B::SizeOfIncludingThis`. You might think that `D` could just inherit `SizeOfIncludingThis` from `B`. In some cases this works, but there's a lot of C++ subtlety involving the `aMallocSizeOf(this)` and whether this actually points to the start of the allocated object or somewhere in its middle. This is doubly true if `D` features multiple inheritance. And if `aMallocSizeOf` is passed a pointer that doesn't point to the start of an object it will give bogus results or even crash. So, if in doubt, define `D::SizeOfIncludingThis` and you should be safe.
*   The `override` annotations say that `D`'s methods override the corresponding methods in `B`. On supporting compilers it gets expanded to the override keyword. It helps prevent accidentally having small differences in the function signatures (e.g. forgetting a `const`) that prevent the overriding from happening.

### Other Considerations

A number of the existing basic data structures already have `SizeOf{In,Ex}cludingThis` functions, e.g. `nsTArray` and `nsTHashtable`. `nsTHashtable`'s functions take an extra argument which is a pointer to a function that measures the memory usage of any structures pointed to by entries in the hash table.

Sometimes you may need variations on the above forms. For example, if you have a function that just measures one member `mFoo` of an object, it might be called `SizeOfFoo`. Try to make the names descriptive enough that it's clear what's being measured.

Sometimes you might want to split the measurements of an object into two or more numbers, e.g. because you want to show them separately in about:memory. In this case it's often clearer to _increment_ the numbers rather than _assigning_ to them, especially if you're measuring multiple entities and summing their measurements. For example:

```c++
void FooBar::AddSizeOfExcludingThis(nsMallocSizeOfFun aMallocSizeOf,
                                    size_t *aFooSizeOut, size_t* aBarSizeOut) const
 {
     *aFooSizeOut += ...;
     *aBarSizeOut += ...;
 }
```

Alternatively, you could create a struct:

```c++
struct FooBarSizes
{
  size_t mFoo;
  size_t mBar;
  FooBarSizes() { mozilla::PodZero(this); }
}

void FooBar::AddSizeOfExcludingThis(nsMallocSizeOfFun aMallocSizeOf,
                                    FooBarSizes* aSizes) const
{
  aSizes->mFoo += ...;
  aSizes->mBar += ...;
}
```

Note the `Add` prefix that makes this incrementing behaviour clear. Obviously, if you increment you have to zero the values at some point. When using a struct, its constructor is the obvious place for this.

You could even put the `nsMallocSizeOfFun` in `FooBarSizes` to reduce the number of arguments.

Sometimes it's difficult and/or not worth measuring every member of an object of in a `Foo::SizeOfExcludingThis` method. This is ok, but it's worth adding a comment explaining this to the method.

Occasionally you do want to compute sizes analytically instead of using `moz_malloc_size_of`. In that case, use `ComputedSizeOf` as the prefix for the function name.

It's important that no memory is measured twice; this can lead to strange results in about:memory. Avoiding double measurement is easy in tree-like structures. In graph-like structures (where an object might be pointed to by more than one other object) it gets more difficult, and might even require some way to mark objects that have been counted (and then a way to unmark them once the measurement is complete).

It's easy to get confused as to whether you should use `SizeOfIncludingThis` or `SizeOfExcludingThis`. A good rule of thumb: if you're calling the method via a pointer, you usually want the former, otherwise you want the latter. For example:

```c++
foo->SizeOfIncludingThis()  // yes
foo.SizeOfExcludingThis()   // yes

foo.SizeOfIncludingThis()   // no
foo->SizeOfExcludingThis()  // no
```

Sometimes memory reporters are stand-alone objects, like the `MyStringReporter` example above. But often you'll have a singleton object that needs measuring, in which case it is usually better not to have a separate reporter object, but instead for the singleton object to implement `nsIMemoryReporter`, and thus measure and report its own memory consumption. There are many such examples in the code, such as `nsCategoryManager`.

If you write a memory reporter, please get two people to review it: (a) someone who knows the data structures being measured, and (b) nnethercote, who can check for all the things covered by this document. Thanks!

DMD
---

DMD is a tool that detects two deficiencies with memory reporters.

*   It identifies places in the code that allocate memory but do not have memory reporters for that memory. This helps drive about:memory's heap-unclassified number down.
*   It detects certain defects in existing heap memory reporters: if non-heap memory is reported, or if a heap block is partially reported or double-reported.

DMD is absolutely crucial; these things cannot be done without it. That's why the integration of DMD and memory reporters is so important and thus mentioned multiple times above.

See [the instructions](/en-US/docs/Mozilla/Performance/DMD) on how to run DMD.
