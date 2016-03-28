# HTML Parser

Yes, we're modifying auto-generated code here. Yes, that's bad.
But really there isn't much of an alternative if we don't want to patch
the Java source code and the Java to C++ translator.
Also the C++ code is part of the repository so that should be ok..


## Internals

Essentially, here are the steps to make the HTML parser taint aware:

### Basic text data taint support

* Make nsHtml5UTF16Buffer taint aware
* Extend nsHtml5Tokenizer::stateLoop to accept a const StringTaint& taint
* Extend all methods that forward character data to the tree builder:
    - flushChars
    - emitCarriageReturn
    - emitReplacementCharacter
    - emitPlaintextReplacementCharacter
  A simple 's/flushChars(buf/flushChars(buf, taint/g' will work for the call sites.
* Add a StringTaint instance for all character buffers in nsHtml5Tokenizer and propagate taint correctly. These are
    - TODO
* Extend nsHtml5TreeBuilder::characters to accept taint information and modify all call sites
    - All call sites that pass constant strings (incorrectly) pass EmptyTaint now and could potentially loose taint that way. TODO
* Add a property 'StringTaint charTaint' to nsHtml5TreeBuilder to store the taint information for charBuffer
* Extend nsHtml5TreeBuilder::accumulateCharacters to accept taint information and append them to charTaint
* Propagate taint in nsHtml5TreeBuilder::flushCharacters and extend nsHtml5TreeBuilder::appendCharacters to accept taint information
* Extend nsHtml5TreeOperation::AppendText to accept taint information and pass it on to SetText

### Taint support for character references

* Add a StringTaint instance "charRefTaint" to the tokenizer class
* Modify clearCharRefBufAndAppend and appendCharRefBuf to accept a const TaintFlow* (which is just taint[pos] at the call site)
* Modify emitOrAppendOne and emitOrAppendTwo to accept and forward taint information
* At the end of the reference lookup, take the taint information from charRefTaint and pass it to emitOrAppendOne/emitOrAppendTwo
* When bailing out, forward the taint information from charRefTaint to the appropriate handler
