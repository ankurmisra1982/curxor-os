"""Environment-driven broker configuration."""

from __future__ import annotations

import os
from dataclasses import dataclass


def _env_int(key: str, default: int) -> int:
    raw = os.environ.get(key)
    if raw in (None, ""):
        return default
    try:
        return int(str(raw).strip())
    except ValueError:
        return default


def _env_bool(key: str, default: bool) -> bool:
    raw = os.environ.get(key)
    if raw is None or raw == "":
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True, slots=True)
class BrokerConfig:
    mesh_iface: str
    mesh_bind_ip: str
    topic_vision: str
    topic_motor: str
    vision_xsub_port: int
    vision_xpub_port: int
    vision_rcvhwm: int
    vision_sndhwm: int
    motor_xsub_port: int
    motor_xpub_port: int
    motor_rcvhwm: int
    motor_sndhwm: int
    zmq_io_threads: int
    motor_conflate: bool

    @classmethod
    def from_env(cls) -> BrokerConfig:
        return cls(
            mesh_iface=os.environ.get("CURXOR_MESH_IFACE", "enp97s0"),
            mesh_bind_ip=os.environ.get("CURXOR_MESH_BIND_IP", "").strip(),
            topic_vision=os.environ.get("CURXOR_TOPIC_VISION", "telemetry/vision_in"),
            topic_motor=os.environ.get("CURXOR_TOPIC_MOTOR", "telemetry/motor_out"),
            vision_xsub_port=_env_int("CURXOR_VISION_XSUB_PORT", 9100),
            vision_xpub_port=_env_int("CURXOR_VISION_XPUB_PORT", 9101),
            vision_rcvhwm=_env_int("CURXOR_VISION_RCVHWM", 4096),
            vision_sndhwm=_env_int("CURXOR_VISION_SNDHWM", 4096),
            motor_xsub_port=_env_int("CURXOR_MOTOR_XSUB_PORT", 9200),
            motor_xpub_port=_env_int("CURXOR_MOTOR_XPUB_PORT", 9201),
            motor_rcvhwm=_env_int("CURXOR_MOTOR_RCVHWM", 16),
            motor_sndhwm=_env_int("CURXOR_MOTOR_SNDHWM", 16),
            zmq_io_threads=_env_int("CURXOR_ZMQ_IO_THREADS", 2),
            motor_conflate=_env_bool("CURXOR_MOTOR_CONFLATE", False),
        )
