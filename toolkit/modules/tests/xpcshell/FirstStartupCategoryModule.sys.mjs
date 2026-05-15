export let FirstStartupCategoryModule = {
  async firstStartupNewProfile() {
    Services.obs.notifyObservers(
      null,
      "first-startup-category-task-called",
      "executed"
    );
  },
};
