# Taintaware Strings

TODO

## String methods

Various string classes throughout the gecko engine perform some kind of string manipulation.
These need to be modified to handle the taint information as well. We use one of the following approaches to do this:

    1. The function has all information it requires (or is extended so it does)
       to handle taint propagation itself. This is the easiest case and should
       be favourable.

    2. The function does not have all information it requires. This might
       e.g. be an internal function that prepares the char buffer for a
       replacement. In this case, the function should not change the taint
       information in any way but leave that to the caller, as the caller
       likely has more information.

Essentially, this is an all-or-nothing approach: if a method cannot propagate taint correctly, it should not
modify taint information at all.
