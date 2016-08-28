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

