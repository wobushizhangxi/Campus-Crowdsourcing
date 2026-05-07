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

  if (type === 'task_refund' || type === 'task_dispute_refund') {
    return {
      label: '任务退款',
      className: 'bg-sky-100 text-sky-700',
    };
  }

  if (type === 'task_dispute_income') {
    return {
      label: '纠纷结算',
      className: 'bg-emerald-100 text-emerald-700',
    };
  }

  return {
    label: '余额变动',
    className: 'bg-slate-100 text-slate-600',
  };
};

export const getTaskStatusMeta = (status) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'open') {
    return { label: '待接单', className: 'bg-amber-100 text-amber-700' };
  }
  if (normalized === 'accepted') {
    return { label: '进行中', className: 'bg-cyan-100 text-cyan-700' };
  }
  if (normalized === 'submitted') {
    return { label: '待验收', className: 'bg-indigo-100 text-indigo-700' };
  }
  if (normalized === 'completed') {
    return { label: '已完成', className: 'bg-emerald-100 text-emerald-700' };
  }
  if (normalized === 'cancelled') {
    return { label: '已取消', className: 'bg-slate-100 text-slate-600' };
  }
  if (normalized === 'disputed') {
    return { label: '纠纷中', className: 'bg-rose-100 text-rose-700' };
  }
  return { label: status || '未知', className: 'bg-slate-100 text-slate-600' };
};

export const getVerificationMeta = (status) => {
  const normalized = String(status || 'UNVERIFIED').toUpperCase();
  if (normalized === 'VERIFIED') {
    return { label: '已认证', className: 'bg-emerald-100 text-emerald-700' };
  }
  if (normalized === 'PENDING') {
    return { label: '审核中', className: 'bg-amber-100 text-amber-700' };
  }
  if (normalized === 'REJECTED') {
    return { label: '认证驳回', className: 'bg-rose-100 text-rose-700' };
  }
  return { label: '未认证', className: 'bg-slate-100 text-slate-600' };
};

export const formatRating = (value) => {
  const rating = Number(value ?? 0);
  if (!Number.isFinite(rating) || rating <= 0) {
    return '暂无评分';
  }
  return `${rating.toFixed(1)} 分`;
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
