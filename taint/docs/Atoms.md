# Atoms

Atoms are special strings used inside the Spidermonkey engine. They enable constant
time string comparisons since there is only one atom for every string. Upon "atomizing"
a string, a lookup in the atom table is performed. If unsuccessful, a new atom is created
and inserted into the table.

Atoms make tainting difficult as tainting an atom would immediately lead to false-positives as other,
unrelated strings would also be tainted.

Our approach for dealing with atoms is essentially twofold:

    1. Each location that creates new strings is patched to avoid creating atoms
       if the base string is tainted. These are mainly the charAt() and [] accessors
       for strings, but also NewDependentString().
       There is also a helper function, AtomizeIfUntainted which will only atomize
       if the argument is not tainted. It is meant as a replacement for AtomizeString,
       but the return type is different now, JSLinearString* vs JSAtom*. As such, code
       that previously used atoms should now be changed to use JSLinearString* instead.

    2. Code that needs to apply taint to some value that might be an Atom (atoms can still
       be created if the base string isn't tainted, or by other means) should use
       NewTaintedDependentString() to create a cheap copy of the string and apply
       taint to it.

This allow us to deal with Atoms while also keeping the Atom mechanism mostly intact.

Calling setTaint() on an Atom will print a warning to stdout. These should be investiaged as
they indicate a bug in the engine.
