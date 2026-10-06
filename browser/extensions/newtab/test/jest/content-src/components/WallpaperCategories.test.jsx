import { render } from "@testing-library/react";
import { _WallpaperCategories as WallpaperCategories } from "content-src/components/WallpaperCategories/WallpaperCategories";

describe("<WallpaperCategories>", () => {
  beforeAll(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: jest.fn(() => ({
        matches: false,
        addListener: jest.fn(),
        removeListener: jest.fn(),
      })),
    });
  });

  it("should render", () => {
    const { container } = render(
      <WallpaperCategories
        Prefs={{ values: { "newtabWallpapers.wallpaper": "" } }}
        Wallpapers={{ wallpaperList: [], categories: [] }}
        activeWallpaper=""
        dispatch={jest.fn()}
        setPref={jest.fn()}
      />
    );
    expect(container.querySelector(".category-header")).toBeInTheDocument();
  });
});
