EventUtils documentation
========================

``EventUtils``' methods are available in all browser mochitests on the ``EventUtils``
object.

In mochitest-plain and mochitest-chrome, you can load
``"chrome://mochikit/content/tests/SimpleTest/EventUtils.js"`` using a regular
HTML script tag to gain access to this set of utilities. In this case, all the
documented methods here are **not** on a separate object, but available as global
functions.

Mouse input
-----------

.. js:autofunction:: EventUtils.sendMouseEvent
.. js:autofunction:: EventUtils.synthesizeMouse
.. js:autofunction:: EventUtils.synthesizeMouseAtCenter
.. js:autofunction:: EventUtils.synthesizeNativeMouseEvent
.. js:autofunction:: EventUtils.synthesizeMouseExpectEvent

.. js:autofunction:: EventUtils.synthesizeWheel
.. js:autofunction:: EventUtils.synthesizeWheelAtPoint
.. js:autofunction:: EventUtils.sendWheelAndPaint
.. js:autofunction:: EventUtils.sendWheelAndPaintNoFlush

Keyboard input
--------------

.. js:autofunction:: EventUtils.sendKey
.. js:autofunction:: EventUtils.sendChar
.. js:autofunction:: EventUtils.sendString
.. js:autofunction:: EventUtils.synthesizeKey
.. js:autofunction:: EventUtils.synthesizeNativeKey
.. js:autofunction:: EventUtils.synthesizeKeyExpectEvent

Drag and drop
-------------

.. js:autofunction:: EventUtils.synthesizeDragOver
.. js:autofunction:: EventUtils.synthesizeDrop
.. js:autofunction:: EventUtils.synthesizeDropAfterDragOver
.. js:autofunction:: EventUtils.synthesizePlainDragAndDrop
.. js:autofunction:: EventUtils.synthesizePlainDragAndCancel
.. js:autofunction:: EventUtils.sendDragEvent
