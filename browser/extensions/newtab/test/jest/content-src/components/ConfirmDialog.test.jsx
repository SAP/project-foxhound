import { render } from "@testing-library/react";
import { _ConfirmDialog as ConfirmDialog } from "content-src/components/ConfirmDialog/ConfirmDialog";

describe("<ConfirmDialog>", () => {
  it("should render", () => {
    const { container } = render(
      <ConfirmDialog
        dispatch={jest.fn()}
        data={{
          cancel_button_string_id: "cancel",
          confirm_button_string_id: "confirm",
          onConfirm: [],
        }}
      />
    );
    expect(container.querySelector(".confirmation-dialog")).toBeInTheDocument();
  });
});
