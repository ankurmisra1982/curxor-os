"""
Thin client helpers for claw publishers and actuators.

Socket tuning mirrors broker-side settings. Payloads use memoryview-friendly sends.
"""

from __future__ import annotations

from typing import Iterable

import zmq

from curxor_broker.protocol import MotorCommand


def _mesh_connect(sock: zmq.Socket, bind_ip: str, port: int) -> None:
    sock.connect(f"tcp://{bind_ip}:{port}")


def _tune_pub(sock: zmq.Socket, sndhwm: int) -> None:
    sock.setsockopt(zmq.SNDHWM, sndhwm)
    sock.setsockopt(zmq.LINGER, 0)
    sock.setsockopt(zmq.IMMEDIATE, 1)


def _tune_sub(sock: zmq.Socket, rcvhwm: int, *, conflate: bool = False) -> None:
    sock.setsockopt(zmq.RCVHWM, rcvhwm)
    sock.setsockopt(zmq.LINGER, 0)
    sock.setsockopt(zmq.IMMEDIATE, 1)
    if conflate:
        sock.setsockopt(zmq.CONFLATE, 1)


class VisionPublisher:
    """Claw camera publisher -> telemetry/vision_in mesh."""

    def __init__(
        self,
        ctx: zmq.Context,
        broker_ip: str,
        xsub_port: int,
        topic: str = "telemetry/vision_in",
        sndhwm: int = 256,
    ) -> None:
        self._topic = topic.encode()
        self._pub = ctx.socket(zmq.PUB)
        _tune_pub(self._pub, sndhwm)
        _mesh_connect(self._pub, broker_ip, xsub_port)

    def send_frame(self, header: bytes, payload: bytes | memoryview) -> None:
        """Send [topic, header, payload] — payload is zero-copy when using memoryview."""
        self._pub.send_multipart([self._topic, header, payload], copy=False)

    def close(self) -> None:
        self._pub.close(linger=0)


class VisionSubscriber:
    """Engine/UI subscriber for telemetry/vision_in."""

    def __init__(
        self,
        ctx: zmq.Context,
        broker_ip: str,
        xpub_port: int,
        topic: str = "telemetry/vision_in",
        rcvhwm: int = 64,
    ) -> None:
        self._sub = ctx.socket(zmq.SUB)
        _tune_sub(self._sub, rcvhwm)
        self._sub.setsockopt(zmq.SUBSCRIBE, topic.encode())
        _mesh_connect(self._sub, broker_ip, xpub_port)

    def recv_frame(self, flags: int = 0) -> tuple[memoryview, memoryview]:
        """Return (header, payload) views — no copy until Python materializes bytes."""
        parts = self._sub.recv_multipart(copy=False, flags=flags)
        if len(parts) != 3:
            raise ValueError(f"expected 3 frames [topic, header, payload], got {len(parts)}")
        return parts[1], parts[2]

    def close(self) -> None:
        self._sub.close(linger=0)


class MotorPublisher:
    """Engine publisher -> telemetry/motor_out mesh."""

    def __init__(
        self,
        ctx: zmq.Context,
        broker_ip: str,
        xsub_port: int,
        topic: str = "telemetry/motor_out",
        sndhwm: int = 8,
    ) -> None:
        self._topic = topic.encode()
        self._pub = ctx.socket(zmq.PUB)
        _tune_pub(self._pub, sndhwm)
        _mesh_connect(self._pub, broker_ip, xsub_port)

    def send_command(self, cmd: MotorCommand) -> None:
        payload = cmd.pack()
        self._pub.send_multipart([self._topic, payload], copy=False)

    def send_raw(self, payload: bytes | memoryview) -> None:
        self._pub.send_multipart([self._topic, payload], copy=False)

    def close(self) -> None:
        self._pub.close(linger=0)


class MotorSubscriber:
    """Claw actuator subscriber for telemetry/motor_out."""

    def __init__(
        self,
        ctx: zmq.Context,
        broker_ip: str,
        xpub_port: int,
        topic: str = "telemetry/motor_out",
        rcvhwm: int = 4,
        conflate: bool = True,
    ) -> None:
        self._sub = ctx.socket(zmq.SUB)
        _tune_sub(self._sub, rcvhwm, conflate=conflate)
        self._sub.setsockopt(zmq.SUBSCRIBE, topic.encode())
        _mesh_connect(self._sub, broker_ip, xpub_port)

    def recv_command(self, flags: int = 0) -> MotorCommand:
        parts = self._sub.recv_multipart(copy=False, flags=flags)
        if len(parts) != 2:
            raise ValueError(f"expected 2 frames [topic, payload], got {len(parts)}")
        return MotorCommand.unpack(parts[1])

    def recv_raw(self, flags: int = 0) -> memoryview:
        parts = self._sub.recv_multipart(copy=False, flags=flags)
        return parts[1]

    def close(self) -> None:
        self._sub.close(linger=0)


def drain_socket(sock: zmq.Socket, max_messages: int = 1024) -> Iterable[list[bytes]]:
    for _ in range(max_messages):
        try:
            yield sock.recv_multipart(zmq.NOBLOCK)
        except zmq.Again:
            break
