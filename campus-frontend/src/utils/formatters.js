export const formatRmb = (value) => {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) {
    return '¥0.00';
  }

  return `¥${amount.toFixed(2)}`;
};

export const formatSignedRmb = (value) => {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) {
    return formatRmb(0);
  }

  return `${amount >= 0 ? '+' : '-'}${formatRmb(Math.abs(amount))}`;
};

export const getBalanceRecordMeta = (type) => {
  if (type === 'admin_adjustment') {
    return {
      label: '管理员调整',
      className: 'bg-amber-100 text-amber-700',
    };
  }

  if (type === 'task_publish' || type === 'legacy_publish_reconcile') {
    return {
      label: '任务预扣',
      className: 'bg-rose-100 text-rose-700',
    };
  }

  if (type === 'task_income' || type === 'legacy_income_reconcile') {
    return {
      label: '任务收入',
      className: 'bg-emerald-100 text-emerald-700',
    };
  }

  return {
    label: '余额变动',
    className: 'bg-slate-100 text-slate-600',
  };
};

export const formatDateTime = (value) => {
  if (!value) {
    return '暂无时间';
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};
