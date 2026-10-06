Storage Warnings
================

Storage sometimes logs warnings to stderr. This page explains the cause and
possible solutions for these warnings.

Sort Operations
---------------

The warning message will say something like::

    Suboptimal indexes for the SQL statement 0x<address>

This happens when you have an ``ORDER BY`` clause that does not use an index.
When no index is used, all results from the query must be fetched first and then
sorted. When an index is used, data can be obtained row by row from the
database, which is much faster.

If you cannot use an index in your ``ORDER BY`` clause, you can suppress this
warning by including a SQL comment in your query that contains the text::

    /* do not warn (bug XXXXXXX) */

The bug number referenced should explain why the query cannot use an index.

Enabling SQL Logging
--------------------

By default the warning only shows the statement's memory address. To include
the actual SQL text and sort operation count in the message, build with the
``MOZ_STORAGE_SORTWARNING_SQL_DUMP`` preprocessor flag defined.
