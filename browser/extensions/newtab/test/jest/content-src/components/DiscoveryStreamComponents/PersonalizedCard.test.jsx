import { render } from "@testing-library/react";
import { PersonalizedCard } from "content-src/components/DiscoveryStreamComponents/PersonalizedCard/PersonalizedCard";

describe("<PersonalizedCard>", () => {
  it("should render", () => {
    const { container } = render(
      <PersonalizedCard
        dispatch={jest.fn()}
        handleDismiss={jest.fn()}
        handleClick={jest.fn()}
        handleBlock={jest.fn()}
        messageData={{
          content: {
            cardTitle: "",
            cardMessage: "",
            ctaText: "",
            linkUrl: "",
            linkText: "",
          },
        }}
      />
    );
    expect(
      container.querySelector(".personalized-card-wrapper")
    ).toBeInTheDocument();
  });
});
