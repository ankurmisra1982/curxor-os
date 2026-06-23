/**
 * Shared QA HTTP helpers with transient-failure retries (Next dev compile races, cold routes).
 */

const RETRY_STATUSES = new Set([404, 408, 429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 4;

function isTransientApiFailure(status, text) {
  if (RETRY_STATUSES.has(status)) {
    const trimmed = text.trimStart();
    if (trimmed.startsWith("<!") || trimmed.startsWith("<html") || trimmed.length === 0) {
      return true;
    }
    if (status === 404 || status === 502 || status === 503 || status === 504) {
      return true;
    }
  }
  return false;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchTextWithRetry(url, init = {}, attempts = MAX_ATTEMPTS) {
  let last = { status: 0, text: "" };
  for (let i = 0; i < attempts; i++) {
    const res = await fetch(url, { ...init, cache: "no-store" });
    const text = await res.text();
    last = { status: res.status, text, res };
    if (!isTransientApiFailure(res.status, text) || i === attempts - 1) {
      return last;
    }
    await sleep(350 * (i + 1));
  }
  return last;
}

export function createQaHttp(base) {
  const baseUrl = base.replace(/\/$/, "");

  async function getJson(path) {
    const { status, text } = await fetchTextWithRetry(`${baseUrl}${path}`);
    if (status < 200 || status >= 300) {
      throw new Error(`HTTP ${status}`);
    }
    return JSON.parse(text);
  }

  async function postJson(path, body) {
    const { status, text } = await fetchTextWithRetry(`${baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    let json;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { raw: text };
    }
    return { ok: status >= 200 && status < 300, status, json, text };
  }

  return { getJson, postJson };
}
