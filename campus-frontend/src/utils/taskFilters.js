const normalizeText = (value) => String(value ?? '').trim().toLowerCase();

const allCategoriesLabel = '全部';

const isOpenTask = (task) => normalizeText(task?.status) === 'open';

const matchesKeyword = (task, keyword) => {
  const normalizedKeyword = normalizeText(keyword);
  if (!normalizedKeyword) {
    return true;
  }

  return [task?.title, task?.description, task?.category, task?.location, task?.campus]
    .some((value) => normalizeText(value).includes(normalizedKeyword));
};

const matchesCategory = (task, category) => {
  if (!category || category === allCategoriesLabel || category === '鍏ㄩ儴') {
    return true;
  }

  return task?.category === category;
};

const getLatestSortValue = (task) => {
  if (task?.createdAt) {
    return new Date(task.createdAt).getTime();
  }
  if (task?.deadlineAt) {
    return new Date(task.deadlineAt).getTime();
  }
  return Number(task?.id ?? 0);
};

export const filterAndSortOpenTasks = (tasks, { keyword = '', category = allCategoriesLabel, sortBy = 'latest' } = {}) => {
  const filteredTasks = (Array.isArray(tasks) ? tasks : [])
    .filter(isOpenTask)
    .filter((task) => matchesKeyword(task, keyword))
    .filter((task) => matchesCategory(task, category));

  return [...filteredTasks].sort((firstTask, secondTask) => {
    if (sortBy === 'reward') {
      return Number(secondTask.reward ?? 0) - Number(firstTask.reward ?? 0);
    }

    return getLatestSortValue(secondTask) - getLatestSortValue(firstTask);
  });
};

export const getTaskCategories = (tasks, configuredCategories = []) => {
  const configured = (Array.isArray(configuredCategories) ? configuredCategories : [])
    .map((category) => String(category ?? '').trim())
    .filter(Boolean);
  const categories = (Array.isArray(tasks) ? tasks : [])
    .filter(isOpenTask)
    .map((task) => task.category)
    .filter(Boolean);

  return [allCategoriesLabel, ...Array.from(new Set([...configured, ...categories]))];
};
