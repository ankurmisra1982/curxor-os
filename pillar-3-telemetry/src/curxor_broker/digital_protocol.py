"""ZeroMQ JSON intents and API receipts for the digital action layer."""

from __future__ import annotations

import json
import time
import uuid
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True, slots=True)
class DigitalIntent:
    """Engine → bridge intent on telemetry/digital_out."""

    id: str
    tool: str
    timestamp: str
    payload: dict[str, Any]

    def to_json_bytes(self) -> bytes:
        return json.dumps(
            {
                "id": self.id,
                "tool": self.tool,
                "timestamp": self.timestamp,
                "payload": self.payload,
            },
            separators=(",", ":"),
        ).encode("utf-8")

    @classmethod
    def from_multipart(cls, parts: list[bytes | memoryview]) -> DigitalIntent:
        if len(parts) < 2:
            raise ValueError(f"expected [topic, payload], got {len(parts)} frames")
        raw = parts[1]
        if isinstance(raw, memoryview):
            raw = raw.tobytes()
        data = json.loads(raw.decode("utf-8"))
        return cls(
            id=str(data.get("id") or uuid.uuid4()),
            tool=str(data["tool"]),
            timestamp=str(data.get("timestamp") or _now_iso()),
            payload=dict(data.get("payload") or {}),
        )


@dataclass(frozen=True, slots=True)
class DigitalReceipt:
    """Bridge → UI/engine receipt on telemetry/digital_in."""

    id: str
    tool: str
    ok: bool
    timestamp: str
    receipt: dict[str, Any]
    error: str | None = None

    def to_json_bytes(self) -> bytes:
        body: dict[str, Any] = {
            "id": self.id,
            "tool": self.tool,
            "ok": self.ok,
            "timestamp": self.timestamp,
            "receipt": self.receipt,
        }
        if self.error:
            body["error"] = self.error
        return json.dumps(body, separators=(",", ":")).encode("utf-8")

    @classmethod
    def success(cls, intent: DigitalIntent, receipt: dict[str, Any]) -> DigitalReceipt:
        return cls(
            id=intent.id,
            tool=intent.tool,
            ok=True,
            timestamp=_now_iso(),
            receipt=receipt,
        )

    @classmethod
    def failure(cls, intent: DigitalIntent, message: str, receipt: dict[str, Any] | None = None) -> DigitalReceipt:
        return cls(
            id=intent.id,
            tool=intent.tool,
            ok=False,
            timestamp=_now_iso(),
            receipt=receipt or {},
            error=message,
        )


def _now_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
