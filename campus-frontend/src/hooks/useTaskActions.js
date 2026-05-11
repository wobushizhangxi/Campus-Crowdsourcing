import { useState } from 'react';
import { apiDelete, apiPost } from '../services/api';
import { toggleFavoriteTaskId, writeFavoriteTaskIds } from '../utils/taskFavorites';

export default function useTaskActions({
  currentUser,
  refreshWorkspaceState,
  withAuthHandling,
}) {
  const [selectedTask, setSelectedTask] = useState(null);
  const [favoriteTaskIds, setFavoriteTaskIds] = useState([]);
  const [postFormData, setPostFormData] = useState({
    title: '',
    desc: '',
    reward: '',
    category: '快递代取',
    campus: '主校区',
    location: '',
    deadlineAt: '',
  });
  const [isPostingTask, setIsPostingTask] = useState(false);

  const isTaskOwnedByCurrentUser = (task) =>
    task?.authorUsername === currentUser.studentId || task?.author === currentUser.name;

  const handleAcceptTask = async (taskId, event) => {
    event?.stopPropagation();
    if (!window.confirm('确认接取该任务吗？')) return;

    try {
      const response = await apiPost(`/api/tasks/${taskId}/accept`);
      if (response.data.code !== 200) {
        throw new Error(response.data.message || '接单失败。');
      }
      window.alert('接单成功。');
      await refreshWorkspaceState({ successMessage: '任务列表已更新。' });
    } catch (error) {
      window.alert(withAuthHandling(error, '接单失败。'));
    }
  };

  const handleToggleFavoriteTask = (taskId, event) => {
    event?.stopPropagation();
    if (!currentUser.studentId) return;

    setFavoriteTaskIds((prev) =>
      writeFavoriteTaskIds(currentUser.studentId, toggleFavoriteTaskId(prev, taskId)),
    );
  };

  const handleCompleteTask = async (taskId, event) => {
    event?.stopPropagation();
    if (!window.confirm('确认验收通过并结算该任务吗？')) return;

    try {
      const response = await apiPost(`/api/tasks/${taskId}/approve`);
      if (response.data.code !== 200) {
        throw new Error(response.data.message || '完成任务失败。');
      }
      window.alert('任务已验收完成。');
      await refreshWorkspaceState({ includeWallet: true, successMessage: '任务状态已更新。' });
    } catch (error) {
      window.alert(withAuthHandling(error, '完成任务失败。'));
    }
  };

  const handleSubmitTaskCompletion = async (taskId, event) => {
    event?.stopPropagation();
    const note = window.prompt('请输入完成说明：') || '';
    if (!note.trim()) return;

    try {
      const response = await apiPost(`/api/tasks/${taskId}/submit`, { note: note.trim() });
      if (response.data.code !== 200) {
        throw new Error(response.data.message || '提交完成失败。');
      }
      window.alert('任务已提交，等待发布者验收。');
      await refreshWorkspaceState({ successMessage: '任务状态已更新。' });
    } catch (error) {
      window.alert(withAuthHandling(error, '提交完成失败。'));
    }
  };

  const handleRejectTask = async (taskId, event) => {
    event?.stopPropagation();
    const reason = window.prompt('请输入驳回原因：') || '';
    if (!reason.trim()) return;

    try {
      const response = await apiPost(`/api/tasks/${taskId}/reject`, { reason: reason.trim() });
      if (response.data.code !== 200) {
        throw new Error(response.data.message || '驳回任务失败。');
      }
      window.alert('任务已驳回，接单人可重新处理。');
      await refreshWorkspaceState({ successMessage: '任务状态已更新。' });
    } catch (error) {
      window.alert(withAuthHandling(error, '驳回任务失败。'));
    }
  };

  const handleCancelTask = async (taskId, event) => {
    event?.stopPropagation();
    const reason = window.prompt('请输入取消原因：') || '';
    if (!reason.trim()) return;

    try {
      const response = await apiPost(`/api/tasks/${taskId}/cancel`, { reason: reason.trim() });
      if (response.data.code !== 200) {
        throw new Error(response.data.message || '取消任务失败。');
      }
      window.alert('任务已取消，赏金已退回。');
      await refreshWorkspaceState({ includeWallet: true, successMessage: '任务状态已更新。' });
    } catch (error) {
      window.alert(withAuthHandling(error, '取消任务失败。'));
    }
  };

  const handleDisputeTask = async (taskId, event) => {
    event?.stopPropagation();
    const reason = window.prompt('请输入纠纷原因：') || '';
    if (!reason.trim()) return;

    try {
      const response = await apiPost(`/api/tasks/${taskId}/dispute`, { reason: reason.trim() });
      if (response.data.code !== 200) {
        throw new Error(response.data.message || '发起纠纷失败。');
      }
      window.alert('任务已进入纠纷，等待管理员处理。');
      await refreshWorkspaceState({ successMessage: '任务状态已更新。' });
    } catch (error) {
      window.alert(withAuthHandling(error, '发起纠纷失败。'));
    }
  };

  const handleReviewTask = async (taskId, event) => {
    event?.stopPropagation();
    const ratingInput = window.prompt('请输入评分（1-5）：') || '';
    const rating = Number(ratingInput);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      window.alert('评分必须是 1 到 5 的整数。');
      return;
    }
    const content = window.prompt('请输入评价内容：') || '';

    try {
      const response = await apiPost(`/api/tasks/${taskId}/reviews`, { rating, content: content.trim() });
      if (response.data.code !== 201) {
        throw new Error(response.data.message || '提交评价失败。');
      }
      window.alert('评价已提交。');
      await refreshWorkspaceState({ successMessage: '评价已提交。' });
    } catch (error) {
      window.alert(withAuthHandling(error, '提交评价失败。'));
    }
  };

  const submitTask = async (newTask) => {
    try {
      setIsPostingTask(true);
      const response = await apiPost('/api/tasks', newTask);
      if (response.data.code !== 201) {
        throw new Error(response.data.message || '发布任务失败。');
      }
      return true;
    } catch (error) {
      window.alert(withAuthHandling(error, '发布任务失败。'));
      return false;
    } finally {
      setIsPostingTask(false);
    }
  };

  const handleAdminDeleteTask = async (taskId) => {
    if (!window.confirm('确定永久删除该帖子吗？此操作不可撤销。')) return;
    try {
      await apiDelete(`/api/admin/tasks/${taskId}`);
      await refreshWorkspaceState({ includeWallet: false, silent: true });
    } catch (error) {
      window.alert(withAuthHandling(error, '删除帖子失败。'));
    }
  };

  const handleReportTask = async (taskId) => {
    const reason = window.prompt('请输入举报原因：') || '';
    if (!reason.trim()) return;
    try {
      await apiPost('/api/reports', { taskId, reason: reason.trim() });
      window.alert('举报已提交，管理员将进行审核。');
    } catch (error) {
      window.alert(withAuthHandling(error, '举报提交失败。'));
    }
  };

  return {
    favoriteTaskIds,
    handleAcceptTask,
    handleAdminDeleteTask,
    handleCancelTask,
    handleCompleteTask,
    handleDisputeTask,
    handleRejectTask,
    handleReportTask,
    handleReviewTask,
    handleSubmitTaskCompletion,
    handleToggleFavoriteTask,
    isPostingTask,
    isTaskOwnedByCurrentUser,
    postFormData,
    selectedTask,
    setFavoriteTaskIds,
    setPostFormData,
    setSelectedTask,
    submitTask,
  };
}
