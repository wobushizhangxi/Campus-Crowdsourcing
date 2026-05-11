const MAX_STEPS = 30

function normalizeToolFailure(result) {
  if (!result || typeof result !== 'object') return null
  const rawError = result.error || (result.ok === false ? { code: 'TOOL_FAILED', message: result.summary || 'Tool returned ok:false.' } : null)
  if (!rawError) return null
  if (typeof rawError === 'string') {
    return { code: rawError.startsWith('BROWSER_TASK_INCOMPLETE') ? 'BROWSER_TASK_INCOMPLETE' : 'TOOL_ERROR', message: rawError }
  }
  return {
    code: rawError.code || (result.ok === false ? 'TOOL_FAILED' : 'TOOL_ERROR'),
    message: rawError.message || result.summary || 'Tool execution failed.',
    ...(rawError.detail ? { detail: rawError.detail } : {})
  }
}

function formatToolContent(result, failure) {
  const content = typeof result === 'string' ? result : JSON.stringify(result)
  if (!failure) return content
  return `ERROR: ${failure.code}: ${failure.message}\n${content}`
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

function toolAttemptKey(call) {
  return `${call.name}:${stableStringify(call.args || {})}`
}

function getProvider(modelId, deps = {}) {
  const deepseek = deps.deepseek || require('./deepseek')
  const doubao = deps.doubao || require('./doubao')

  if (!modelId || modelId.startsWith('deepseek')) {
    return { model: modelId || 'deepseek-chat', chat: deepseek.chat }
  }
  if (modelId.startsWith('doubao') || modelId.startsWith('ep-')) {
    return { model: modelId.startsWith('ep-') ? modelId : undefined, chat: doubao.chat }
  }
  return { model: 'deepseek-chat', chat: deepseek.chat }
}

async function runTurn({ messages, model, signal, onEvent, requestApproval }, deps = {}) {
  const { model: selectedModel, chat } = getProvider(model, deps)
  const tools = deps.tools || require('../tools')
  const policy = deps.policy || require('../security/toolPolicy')
  const history = [...messages]
  const inFlight = new Set()
  const toolAttempts = new Map()

  signal?.addEventListener('abort', () => {
    for (const c of inFlight) c.abort()
  })

  for (let step = 0; step < MAX_STEPS; step++) {
    if (signal?.aborted) {
      return { finalText: '操作已取消', history }
    }

    const response = await chat({
      model: selectedModel,
      messages: history,
      tools: tools.getAgentLoopToolSchemas(),
      signal
    })

    history.push(response.assistant_message)
    onEvent?.('assistant_message', { content: response.content, toolCalls: response.tool_calls })

    if (!response.tool_calls?.length) {
      return { finalText: response.content || '已完成', history }
    }

    for (const call of response.tool_calls) {
      if (signal?.aborted) return { finalText: '操作已取消', history }
      const attemptKey = toolAttemptKey(call)
      const previousAttempt = toolAttempts.get(attemptKey)
      const attempt = (previousAttempt?.count || 0) + 1
      const retry = previousAttempt?.lastError ? { attempt, previousError: previousAttempt.lastError } : undefined

      const decision = policy.evaluateToolCall(call.name, call.args)
      if (decision.risk === 'blocked') {
        history.push({ role: 'tool', tool_call_id: call.id, content: `POLICY_BLOCKED: ${decision.reason}` })
        onEvent?.('tool_blocked', { call, reason: decision.reason })
        toolAttempts.set(attemptKey, { count: attempt, lastError: { code: 'POLICY_BLOCKED', message: decision.reason } })
        continue
      }

      if (decision.requiresApproval) {
        if (!requestApproval) {
          history.push({ role: 'tool', tool_call_id: call.id, content: `POLICY_BLOCKED: 需要用户审批但审批回调未提供 (${decision.reason})` })
          onEvent?.('tool_blocked', { call, reason: '审批回调缺失' })
          toolAttempts.set(attemptKey, { count: attempt, lastError: { code: 'POLICY_BLOCKED', message: decision.reason } })
          continue
        }
        onEvent?.('approval_request', { call, decision, ...(retry ? { retry } : {}) })
        const ok = await requestApproval({ call, decision })
        if (!ok) {
          history.push({ role: 'tool', tool_call_id: call.id, content: 'USER_DENIED' })
          toolAttempts.set(attemptKey, { count: attempt, lastError: { code: 'USER_DENIED', message: 'User denied tool execution.' } })
          continue
        }
      }

      const ctl = new AbortController()
      inFlight.add(ctl)
      try {
        const result = await tools.execute(call.name, call.args, { signal: ctl.signal, skipInternalConfirm: true })
        const failure = normalizeToolFailure(result)
        const content = formatToolContent(result, failure)
        history.push({ role: 'tool', tool_call_id: call.id, content })
        if (failure) {
          toolAttempts.set(attemptKey, { count: attempt, lastError: { code: failure.code, message: failure.message } })
          onEvent?.('tool_error', { call, error: failure, result })
        } else {
          toolAttempts.set(attemptKey, { count: attempt })
          onEvent?.('tool_result', { call, result })
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          history.push({ role: 'tool', tool_call_id: call.id, content: 'CANCELLED' })
          return { finalText: '操作已取消', history }
        }
        history.push({ role: 'tool', tool_call_id: call.id, content: `ERROR: ${err.message}` })
        toolAttempts.set(attemptKey, { count: attempt, lastError: { code: err.code || 'TOOL_ERROR', message: err.message } })
      } finally {
        inFlight.delete(ctl)
      }
    }
  }

  return { finalText: '已达 30 步上限', history }
}

module.exports = { runTurn, MAX_STEPS, getProvider }
