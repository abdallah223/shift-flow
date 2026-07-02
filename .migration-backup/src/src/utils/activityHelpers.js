// Shared logic for classifying an activity's category as "non-work" time
// (breaks, lunch, leave, vacation, sick days, etc). Every view that computes
// productive/focus/work hours should use this so the numbers agree with each
// other instead of each screen inventing its own matching rule.
const NON_WORK_CATEGORY_PATTERN =
  /break|lunch|leave|vacation|vacay|holiday|sick|off/i;

export const isNonWorkCategory = (categoryName = "") =>
  NON_WORK_CATEGORY_PATTERN.test(categoryName || "");
