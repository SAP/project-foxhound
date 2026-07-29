use-documentGlobal
==================

Require ``.documentGlobal`` instead of ``.ownerDocument.defaultView``.

Examples of incorrect code for this rule:
-----------------------------------------

.. code-block:: js

    aEvent.target.ownerDocument.defaultView;
    this.DOMPointNode.ownerDocument.defaultView.getSelection();

Examples of correct code for this rule:
---------------------------------------

.. code-block:: js

    aEvent.target.documentGlobal;
    this.DOMPointNode.documentGlobal.getSelection();
