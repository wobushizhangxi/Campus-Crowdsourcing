const favoriteStoragePrefix = 'campus-task-favorites';

const normalizeTaskId = (taskId) => {
  const numericId = Number(taskId);
  return Number.isFinite(numericId) ? numericId : null;
};

const uniqueTaskIds = (taskIds) => {
  const seen = new Set();
  const result = [];

  for (const taskId of Array.isArray(taskIds) ? taskIds : []) {
    const normalizedId = normalizeTaskId(taskId);
    if (normalizedId === null || seen.has(normalizedId)) {
      continue;
    }
    seen.add(normalizedId);
    result.push(normalizedId);
  }

  return result;
};

export const getTaskFavoriteStorageKey = (username) =>
  `${favoriteStoragePrefix}:${String(username || 'guest').trim() || 'guest'}`;

export const toggleFavoriteTaskId = (taskIds, taskId) => {
  const normalizedIds = uniqueTaskIds(taskIds);
  const normalizedId = normalizeTaskId(taskId);
  if (normalizedId === null) {
    return normalizedIds;
  }

  if (normalizedIds.includes(normalizedId)) {
    return normalizedIds.filter((id) => id !== normalizedId);
  }

  return [...normalizedIds, normalizedId];
};

export const getFavoriteTasks = (tasks, taskIds) => {
  const taskMap = new Map((Array.isArray(tasks) ? tasks : []).map((task) => [normalizeTaskId(task?.id), task]));
  return uniqueTaskIds(taskIds)
    .map((taskId) => taskMap.get(taskId))
    .filter(Boolean);
};

export const readFavoriteTaskIds = (username, storage = window.localStorage) => {
  try {
    const rawValue = storage.getItem(getTaskFavoriteStorageKey(username));
    return uniqueTaskIds(JSON.parse(rawValue || '[]'));
  } catch {
    return [];
  }
};

export const writeFavoriteTaskIds = (username, taskIds, storage = window.localStorage) => {
  const normalizedIds = uniqueTaskIds(taskIds);
  storage.setItem(getTaskFavoriteStorageKey(username), JSON.stringify(normalizedIds));
  return normalizedIds;
};
