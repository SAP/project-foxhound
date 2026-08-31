// Largely just here to fix SearchUIUtils errors. This should be removed once
// searchbar becomes a exportable module.
interface MozSearchbar extends MozXULElement {
  select(): void;
  get inputField(): HTMLInputElement;
}
