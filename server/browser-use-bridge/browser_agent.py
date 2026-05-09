"""browser-use Agent wrapper — single concurrency, configurable LLM backend."""
import asyncio
import os
import traceback
from dataclasses import dataclass
from typing import Optional

from browser_use import Agent, Browser, ChatOpenAI


@dataclass
class BrowserTask:
    goal: str
    max_steps: int = 15
    start_url: Optional[str] = None
    headless: bool = True


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

    def _build_llm(self):
        endpoint = os.environ.get("BROWSER_USE_MODEL_ENDPOINT", "")
        api_key = os.environ.get("BROWSER_USE_MODEL_API_KEY", "")
        model_name = os.environ.get("BROWSER_USE_MODEL_NAME", "doubao-seed-1-6-vision-250815")

        if endpoint and api_key:
            return ChatOpenAI(
                model=model_name,
                base_url=endpoint,
                api_key=api_key,
            )
        # Fallback: try standard OpenAI env vars
        return ChatOpenAI(model="gpt-4o")

    async def _ensure_browser(self, headless: bool) -> Browser:
        if self._browser is None:
            self._browser = Browser(headless=headless)
        elif getattr(self._browser, 'headless', None) != headless:
            import warnings
            warnings.warn(f"Browser headless={self._browser.headless} but task requested headless={headless}. Reusing existing browser.")
        return self._browser

    async def run_task(self, task: BrowserTask):
        import time
        started = time.time()

        async def _run():
            llm = self._build_llm()
            browser = await self._ensure_browser(task.headless)

            agent = Agent(
                task=task.goal,
                llm=llm,
                browser=browser,
                use_vision=True,
            )

            result = await agent.run(max_steps=task.max_steps)

            return BrowserResult(
                success=result.is_successful(),
                summary=str(result.final_result()),
                final_url=result.urls[-1] if result.urls else "",
                steps_completed=result.number_of_steps(),
                duration_ms=int(result.total_duration_seconds() * 1000),
            )

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
                await self._browser.close()
            except Exception:
                pass
            self._browser = None


# Module-level singleton
_pool: Optional[BrowserAgentPool] = None


def get_pool() -> BrowserAgentPool:
    global _pool
    if _pool is None:
        _pool = BrowserAgentPool()
    return _pool
