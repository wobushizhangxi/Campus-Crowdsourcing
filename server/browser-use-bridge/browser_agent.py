"""browser-use Agent wrapper — single concurrency, configurable LLM backend."""
import asyncio
import os
import traceback
from dataclasses import dataclass
from typing import Optional

from browser_use import Agent, Browser, ChatOpenAI


DEFAULT_BROWSER_USE_ENDPOINT = "https://zenmux.ai/api/v1"
DEFAULT_BROWSER_USE_MODEL = "openai/gpt-5.5"


def env_bool(name: str, default: bool = True) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() not in {"0", "false", "no", "off"}


def extract_single_start_url(goal: str) -> Optional[str]:
    import re

    text = re.sub(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b", "", goal or "")
    patterns = [
        r"https?://[^\s<>\"']+",
        r"(?:www\.)?[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}(?:/[^\s<>\"']*)?",
    ]
    excluded_extensions = {
        "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
        "txt", "md", "csv", "json", "xml", "yaml", "yml",
        "zip", "rar", "7z", "jpg", "jpeg", "png", "gif", "webp",
        "mp3", "mp4", "avi", "mkv", "mov", "py", "js", "css",
    }

    found = []
    for pattern in patterns:
        for match in re.finditer(pattern, text):
            url = re.sub(r"[.,;:!?()\[\]]+$", "", match.group(0))
            url_lower = url.lower()
            if any(f".{ext}" in url_lower for ext in excluded_extensions):
                continue
            context_start = max(0, match.start() - 20)
            context = text[context_start:match.start()].lower()
            if any(word in context for word in ("never", "dont", "don't", "not")):
                continue
            if not url.startswith(("http://", "https://")):
                url = "https://" + url
            found.append(url)

    unique = list(dict.fromkeys(found))
    return unique[0] if len(unique) == 1 else None


@dataclass
class BrowserTask:
    goal: str
    max_steps: int = 15
    start_url: Optional[str] = None
    headless: bool = True
    keep_alive: Optional[bool] = None


@dataclass
class BrowserResult:
    success: bool
    summary: str
    final_url: str = ""
    screenshot_base64: Optional[str] = None
    error: Optional[str] = None
    steps_completed: int = 0
    duration_ms: int = 0


class BrowserAgentPool:
    """Single-concurrency browser agent pool.

    Only one task runs at a time. An in-flight task can be cancelled
    via cancel_current().
    """

    def __init__(self):
        self._current_task: Optional[asyncio.Task] = None
        self._browser: Optional[Browser] = None
        self._browser_headless: Optional[bool] = None
        self._browser_keep_alive: Optional[bool] = None

    def _build_llm(self):
        endpoint = os.environ.get("BROWSER_USE_MODEL_ENDPOINT", DEFAULT_BROWSER_USE_ENDPOINT)
        api_key = os.environ.get("BROWSER_USE_MODEL_API_KEY", "")
        model_name = os.environ.get("BROWSER_USE_MODEL_NAME", DEFAULT_BROWSER_USE_MODEL)

        if endpoint and api_key:
            return ChatOpenAI(
                model=model_name,
                base_url=endpoint,
                api_key=api_key,
            )
        # Fallback: try standard OpenAI env vars
        return ChatOpenAI(model="gpt-4o")

    def _use_vision(self) -> bool:
        return env_bool("BROWSER_USE_VISION_ENABLED", True)

    def _keep_alive(self, task: BrowserTask) -> bool:
        if task.keep_alive is not None:
            return task.keep_alive
        return env_bool("BROWSER_USE_KEEP_ALIVE", not task.headless)

    def _initial_actions_for_task(self, task: BrowserTask):
        start_url = task.start_url or extract_single_start_url(task.goal)
        return [{"navigate": {"url": start_url or "about:blank", "new_tab": True}}]

    async def _close_browser(self):
        if not self._browser:
            return
        for method_name in ("kill", "close", "stop", "reset"):
            method = getattr(self._browser, method_name, None)
            if not callable(method):
                continue
            result = method()
            if hasattr(result, "__await__"):
                await result
            return

    async def _ensure_browser(self, headless: bool, keep_alive: bool) -> Browser:
        if self._browser is None:
            self._browser = Browser(headless=headless, keep_alive=keep_alive)
            self._browser_headless = headless
            self._browser_keep_alive = keep_alive
        elif self._browser_headless != headless or self._browser_keep_alive != keep_alive:
            try:
                await self._close_browser()
            except Exception:
                pass
            self._browser = Browser(headless=headless, keep_alive=keep_alive)
            self._browser_headless = headless
            self._browser_keep_alive = keep_alive
        return self._browser

    def _read_result_value(self, result, name, fallback=None):
        value = getattr(result, name, fallback)
        return value() if callable(value) else value

    def _normalize_run_result(self, result, task: BrowserTask) -> BrowserResult:
        urls = self._read_result_value(result, "urls", []) or []
        final = self._read_result_value(result, "final_result", None)
        steps = self._read_result_value(result, "number_of_steps", 0) or 0
        dur = self._read_result_value(result, "total_duration_seconds", 0) or 0
        raw_success = bool(self._read_result_value(result, "is_successful", False))

        summary = "" if final is None else str(final).strip()
        if summary.lower() in {"none", "null"}:
            summary = ""

        final_url = urls[-1] if urls else ""
        reasons = []
        if not summary:
            reasons.append("summary_missing")
        if task.start_url and final_url.lower() in {"", "about:blank"}:
            reasons.append("final_url_about_blank")

        return BrowserResult(
            success=raw_success and not reasons,
            summary=summary or "browser-use did not return a usable page result.",
            final_url=final_url,
            error=f"BROWSER_TASK_INCOMPLETE: {', '.join(reasons)}" if reasons else None,
            steps_completed=steps,
            duration_ms=int(dur * 1000) if dur else 0,
        )

    async def run_task(self, task: BrowserTask):
        import time
        started = time.time()

        async def _run():
            llm = self._build_llm()
            browser = await self._ensure_browser(task.headless, self._keep_alive(task))

            agent = Agent(
                task=task.goal,
                llm=llm,
                browser=browser,
                use_vision=self._use_vision(),
                initial_actions=self._initial_actions_for_task(task),
                directly_open_url=False,
            )

            result = await agent.run(max_steps=task.max_steps)

            return self._normalize_run_result(result, task)

        self._current_task = asyncio.ensure_future(_run())
        try:
            return await self._current_task
        except asyncio.CancelledError:
            return BrowserResult(
                success=False,
                summary="任务已被取消。",
                error="CANCELLED",
                duration_ms=int((time.time() - started) * 1000),
            )
        except Exception as exc:
            return BrowserResult(
                success=False,
                summary=f"browser-use 执行失败：{exc}",
                error=traceback.format_exc(),
                duration_ms=int((time.time() - started) * 1000),
            )
        finally:
            self._current_task = None

    async def cancel_current(self):
        if self._current_task and not self._current_task.done():
            self._current_task.cancel()
            try:
                await self._current_task
            except asyncio.CancelledError:
                pass

    async def close(self):
        await self.cancel_current()
        if self._browser:
            try:
                await self._close_browser()
            except Exception:
                pass
            self._browser = None
            self._browser_headless = None
            self._browser_keep_alive = None

    def browser_alive(self) -> bool:
        return self._browser is not None


# Module-level singleton
_pool: Optional[BrowserAgentPool] = None


def get_pool() -> BrowserAgentPool:
    global _pool
    if _pool is None:
        _pool = BrowserAgentPool()
    return _pool
