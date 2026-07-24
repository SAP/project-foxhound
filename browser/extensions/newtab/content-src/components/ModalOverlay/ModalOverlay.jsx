/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import React, { useEffect, useRef } from "react";

function ModalOverlayWrapper({
  unstyled,
  innerClassName,
  onClose,
  children,
  headerId,
  id,
}) {
  const dialogRef = useRef(null);

  let className = unstyled ? "" : "modalOverlayInner";
  if (innerClassName) {
    className += ` ${innerClassName}`;
  }

  useEffect(() => {
    const dialogElement = dialogRef.current;
    if (dialogElement && !dialogElement.open) {
      dialogElement.showModal();
    }

    const handleCancel = e => {
      e.preventDefault();
      onClose(e);
    };

    dialogElement?.addEventListener("cancel", handleCancel);

    return () => {
      dialogElement?.removeEventListener("cancel", handleCancel);
      if (dialogElement && dialogElement.open) {
        dialogElement.close();
      }
    };
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      className="modalOverlayOuter"
      onClick={e => {
        if (e.target === dialogRef.current) {
          onClose(e);
        }
      }}
    >
      <div className={className} aria-labelledby={headerId} id={id}>
        {children}
      </div>
    </dialog>
  );
}

export { ModalOverlayWrapper };
