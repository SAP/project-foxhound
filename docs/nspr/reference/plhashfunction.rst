PLHashFunction
==============

.. _plhashfunction-syntax:

Syntax
------

.. code::

   #include <plhash.h>

   typedef PLHashNumber (PR_CALLBACK *PLHashFunction)(const void *key);


.. _plhashfunction-description:

Description
-----------

``PLHashNumber`` is a function type that maps the key of a hash table
entry to a hash number.


.. _plhashfunction-see-also:

See Also
--------

`PL_HashString <PL_HashString>`__
