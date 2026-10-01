// The docs page's list (SPEC-storybook-microsite.md § 4): every story of the given CSF modules, by group, read from the
// modules themselves, so the list is the stories Storybook shows and cannot drift from them.
const NOT_A_STORY = new Set(["default", "__namedExportsOrder"]);

export function storyList(modules) {
  return modules.map((module) => ({
    group: module.default.title.split("/").at(-1),
    stories: Object.entries(module)
      .filter(([key]) => !NOT_A_STORY.has(key))
      .map(([, story]) => story.name),
  }));
}
