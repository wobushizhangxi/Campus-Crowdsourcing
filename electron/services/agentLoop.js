const MAX_STEPS = 30

async function runTurn({ messages, signal, onEvent, requestApproval }, deps = {}) {
  const deepseek = deps.deepseek || require('./deepseek')
  const tools = deps.tools || require('../tools')
  const policy = deps.policy || require('../security/toolPolicy')
  const history = [...messages]
  const inFlight = new Set()

  signal?.addEventListener('abort', () => {
    for (const c of inFlight) c.abort()
  })

  for (let step = 0; step < MAX_STEPS; step++) {
    if (signal?.aborted) {
      return { finalText: '操作已取消', history }
    }

    const response = await deepseek.chat({
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

      const decision = policy.evaluateToolCall(call.name, call.args)
      if (decision.risk === 'blocked') {
        history.push({ role: 'tool', tool_call_id: call.id, content: `POLICY_BLOCKED: ${decision.reason}` })
        onEvent?.('tool_blocked', { call, reason: decision.reason })
        continue
      }

      if (decision.requiresApproval && requestApproval) {
        onEvent?.('approval_request', { call, decision })
        const ok = await requestApproval({ call, decision })
        if (!ok) {
          history.push({ role: 'tool', tool_call_id: call.id, content: 'USER_DENIED' })
          continue
        }
      }

      const ctl = new AbortController()
      inFlight.add(ctl)
      try {
        const result = await tools.execute(call.name, call.args, { signal: ctl.signal, skipInternalConfirm: true })
        const content = typeof result === 'string' ? result : JSON.stringify(result)
        history.push({ role: 'tool', tool_call_id: call.id, content })
        onEvent?.('tool_result', { call, result })
      } catch (err) {
        if (err.name === 'AbortError') {
          history.push({ role: 'tool', tool_call_id: call.id, content: 'CANCELLED' })
          return { finalText: '操作已取消', history }
        }
        history.push({ role: 'tool', tool_call_id: call.id, content: `ERROR: ${err.message}` })
      } finally {
        inFlight.delete(ctl)
      }
    }
  }

  return { finalText: '已达 30 步上限', history }
}

module.exports = { runTurn, MAX_STEPS }
