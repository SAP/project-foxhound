// |reftest| fails -- eval not implemented
load("taint/taint-setup.js");

//normalize

var taint = _MultiTaint();

eval("var ev = \""+ escape(taint) +"\"");
//ev should be tainted here
assertEq(ev.taint.length, 2);

/*
 * getting eval to work is quite some work:
 * - starting point is SourceBufferHolder from jsapi.h which needs
 *   to carry the taint into the compiler
 * - frontend::CompileScript in BytecodeCompiler.cpp does the work
 *   and does all relevant calls. the sourcebuffer is used to build the
 *   FullParseHandler
 * - FullParseHandler in FullParseHandler.h has a function named "newStringLiteral"
 *   which creates the final NullaryNode cotaining the string when encountering a
 *   PNK_STRING. At this point, pn_atom contains the final string and no
 *   more work on this part is needed.
 * - TokenStream::getStringOrTemplateToken in TokenStream.cpp contains the
 *   relevant code for creating a token (pn_atom) out of the TokenBuf (userbuf)
 * - userbuf is populated via the constructor being called in the constructor of
 *   TokenStream in TokenStream.cpp via a provided char array.
 * - The Parser Constructor called from the CompileScript creates the TokenStream
 */


reportCompare(true, true);