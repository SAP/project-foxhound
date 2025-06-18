# JavaScript Parser Taintawareness

The JavaScript parser has been modified to support taint propagation. This is mostly useful
to detect second-order flows (i.e. eval() being called on tainted but sanitized data, but some
resulting string being used insecurely later on), but is also important in an end-to-end tainting
scenario.

## Internals

The main challenge in making the parser taint aware is to deal with JSAtoms which are used extensively in the parser.
For example all string literals and property names are converted to atoms during compilation.
The general idea is thus to replace JSAtom with JSLinearString where required. However, care must be taken since
some locations will perform string comparison through pointer comparison, which only works for atoms. In those
cases the current code will produce a temporary atom.

The main classes for this live in js/src/frontend. Essentially the following has been done:

- Make the SourceBufferHolder class taint aware, this is required to move taint information into the parser
- Make the TokenBuf class taintaware, taint from SourceBufferHolder will be copied into it by the TokenStream class
- Add a StringTaint tokenbufTaint to the TokenStream class which will hold taint information for tokenbuf
- Change the type of Token.u.atom to be JSLinearString* to support taint
- Modify the method signatures accordingly
- Modify TokenStream::atomize() (and maybe rename it to stringify) to only atomize if no taint is available, otherwise produce a JSLinearString
    - A helper funciton "AtomizeCharsIfUntainted" has been added to jsatom.h for this
- Modify TokenStream::getStringOrTemplateToken to propagate taint from the userbuf to tokenbufTaint

At this point we can produce tainted tokens in the lexer (TokenStream).

- Change the newStringLiteral and newTemplateStringLiteral in both TokenHandlers (FullParserHandler and SyntaxParserHandler) to accept JSLinearString*
- This required changing the Node class as well:
    - Add a member ParseNode.pn_u.name.str of type JSLinearString*
    - Change the NullaryNode constructor to set ParseNode.pn_u.name.str instread of the atom
- In parser.cpp, modify stringLiteral and the used methods to produce a StringLiteral Node

We can now produce tainted ParseNodes.

- In BytecodeEmitter.cpp change getConstantValue to return pn_str instead of pn_atom

This seems to be the final step to propagate taint to the produced string literals and back into JavaScript code.

Now try to compile and fix up any resulting issues :)


Note: Source compression has been disabled for now until further investigation.

## Update

For Firefox version > 90 there have been some changes to the JavaScript parsing. Here are the latest notes.

All source files are in js/src/frontend.

### Token Streams

TokenStream operates on the source buffer and creates a list of tokens. The class structure is as follows:

```C++
class TokenStreamCharsShared {
 protected:
  JSContext* cx;

  /**
   * Buffer transiently used to store sequences of identifier or string code
   * points when such can't be directly processed from the original source
   * text (e.g. because it contains escapes).
   */
  CharBuffer charBuffer;

  /** Information for parsing with a lifetime longer than the parser itself. */
  ParserAtomsTable* parserAtoms;

};
```

and 

```C++
class TokenStreamCharsBase : public TokenStreamCharsShared {
 protected:
  using SourceUnits = frontend::SourceUnits<Unit>;

  /** Code units in the source code being tokenized. */
  SourceUnits sourceUnits;

  // End of fields.

 protected:
  TokenStreamCharsBase(JSContext* cx, ParserAtomsTable* parserAtoms,
                       const Unit* units, size_t length, const StringTaint& taint, size_t startOffset);
};
```

and 

```C++
template <typename Unit>
class SourceUnits {
 private:
  /** Base of buffer. */
  const Unit* base_;

  /** Offset of base_[0]. */
  uint32_t startOffset_;

  /** Limit for quick bounds check. */
  const Unit* limit_;

  /** Next char to get. */
  const Unit* ptr;

  const StringTaint& taint_;

};
```
During the parsing, the input code (as a SourceUnits object) is consumed and writted into a tempory buffer (a CharBuffer object). In the case of strings literals in the code, these are added to an AtomsTable defined in ParseAtom.h. see e.g. getStringOrTemplateToken:

```C++
bool TokenStreamSpecific<Unit, AnyCharsAccess>::getStringOrTemplateToken(
    char untilChar, Modifier modifier, TokenKind* out) {
 
 // ... decode the input characters

 // Create a new atom index from the char buffer contents
 TaggedParserAtomIndex atom = drainCharBufferIntoAtom();
  if (!atom) {
    return false;
  }

  noteBadToken.release();

  MOZ_ASSERT_IF(!parsingTemplate, !templateHead);

  TokenKind kind = !parsingTemplate ? TokenKind::String
                   : templateHead   ? TokenKind::TemplateHead
                                    : TokenKind::NoSubsTemplate;
  // Create a new token
  newAtomToken(kind, atom, start, modifier, taintBuffer, out);
  return true;
}
```

To make sure the input is taint-aware, we need to add a taint field to SourceUnits, and helper functions to extract the Taint Flow per character.

### ParseAtoms

The ParserAtoms (in ParserAtom.h) are similar to JSAtoms, but not quite the same. They consist of a header with the following fields:

```C++
class alignas(alignof(uint32_t)) ParserAtom {

private:
  // The JSAtom-compatible hash of the string.
  HashNumber hash_ = 0;

  // The length of the buffer in chars_.
  uint32_t length_ = 0;

  uint32_t flags_ = 0;

  // Sneak a taint field in here too?

  // End of fields.
};
```

With the atom contents stored inline after the header. A new atom is allocated via the

```C++
  static ParserAtom* allocate(JSContext* cx, LifoAlloc& alloc,
                              InflatedChar16Sequence<SeqCharT> seq,
                              uint32_t length, HashNumber hash);
```

method, which takes case of allocating the extra inline buffer. Memory is tracked via the ```LifoAlloc& alloc``` argument. All strings are stored in a table:

```C++
class ParserAtomsTable {
  friend struct CompilationStencil;

 private:
  const WellKnownParserAtoms& wellKnownTable_;

  LifoAlloc* alloc_;

  // The ParserAtom are owned by the LifoAlloc.
  using EntryMap = HashMap<const ParserAtom*, TaggedParserAtomIndex,
                           ParserAtomLookupHasher, js::SystemAllocPolicy>;
  EntryMap entryMap_;
  ParserAtomVector entries_;
};
```

The LifoAlloc is passed to the Table via a constructor, which frees all memory when the LifoAlloc itself is deleted. This makes life difficult for storing taint information, which is shared and allocated all over the place.

Solution to store a serialized Taint string after the string buffer in the a ParserAtom entry.
