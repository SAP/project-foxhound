# HTML Parser

Yes, we're modifying auto-generated code here. Yes, that's bad.
But really there isn't much of an alternative if we don't want to patch
the Java source code and the Java to C++ translator.
Also the C++ code is part of the repository so that should be ok..


Essentially, here are the steps to make the HTML parser taint aware:

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
