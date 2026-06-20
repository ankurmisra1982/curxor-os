"""
Zero-copy XSUB/XPUB proxy broker.

libzmq's zmq.proxy() forwards multipart messages in C without Python copies.
Vision and motor traffic use isolated proxy pairs to prevent head-of-line blocking.
"""

from __future__ import annotations

import signal
import sys
import threading
from dataclasses import dataclass

import zmq

from curxor_broker.config import BrokerConfig
from curxor_broker.network import log_mesh_topology, mesh_endpoint, resolve_mesh_bind_ip


@dataclass(frozen=True, slots=True)
class ProxySpec:
    name: str
    topic: str
    xsub_port: int
    xpub_port: int
    rcvhwm: int
    sndhwm: int
    conflate: bool = False


def _tune_common(sock: zmq.Socket, rcvhwm: int, sndhwm: int, *, conflate: bool) -> None:
    sock.setsockopt(zmq.RCVHWM, rcvhwm)
    sock.setsockopt(zmq.SNDHWM, sndhwm)
    sock.setsockopt(zmq.LINGER, 0)
    sock.setsockopt(zmq.TCP_KEEPALIVE, 1)
    sock.setsockopt(zmq.TCP_KEEPALIVE_IDLE, 30)
    sock.setsockopt(zmq.IMMEDIATE, 1)
    # Disable Nagle — critical for sub-ms motor frames on 10GbE mesh
    sock.setsockopt(zmq.TCP_NODELAY, 1)
    if conflate:
        sock.setsockopt(zmq.CONFLATE, 1)


def _build_proxy_pair(
    ctx: zmq.Context,
    bind_ip: str,
    spec: ProxySpec,
) -> tuple[zmq.Socket, zmq.Socket, str, str]:
    """
    Build XSUB (publisher ingress) and XPUB (subscriber egress) sockets.

    Publishers PUB.connect -> XSUB bind
    Subscribers SUB.connect  -> XPUB bind
    """
    xsub = ctx.socket(zmq.XSUB)
    _tune_common(xsub, spec.rcvhwm, spec.sndhwm, conflate=False)
    xsub_addr = mesh_endpoint(bind_ip, spec.xsub_port)
    xsub.bind(xsub_addr)

    xpub = ctx.socket(zmq.XPUB)
    _tune_common(xpub, spec.rcvhwm, spec.sndhwm, conflate=spec.conflate)
    xpub_addr = mesh_endpoint(bind_ip, spec.xpub_port)
    xpub.bind(xpub_addr)

    return xsub, xpub, xsub_addr, xpub_addr


def _proxy_thread(
    ctx: zmq.Context,
    bind_ip: str,
    spec: ProxySpec,
    stop: threading.Event,
) -> None:
    xsub, xpub, xsub_addr, xpub_addr = _build_proxy_pair(ctx, bind_ip, spec)

    print(
        f"[curxor-broker] {spec.name}: topic={spec.topic!r}",
        file=sys.stderr,
    )
    print(f"[curxor-broker]   publishers -> {xsub_addr}", file=sys.stderr)
    print(f"[curxor-broker]   subscribers -> {xpub_addr}", file=sys.stderr)

    # zmq.proxy blocks in libzmq; run until process signal
    try:
        zmq.proxy(xsub, xpub)
    except zmq.ZMQError as exc:
        if not stop.is_set():
            print(f"[curxor-broker] {spec.name} proxy error: {exc}", file=sys.stderr)
            raise
    finally:
        xsub.close(linger=0)
        xpub.close(linger=0)


class TelemetryBroker:
    """Dual-proxy telemetry broker bound exclusively to the robotics mesh NIC."""

    def __init__(self, config: BrokerConfig) -> None:
        self._config = config
        self._stop = threading.Event()
        self._threads: list[threading.Thread] = []
        self._ctx: zmq.Context | None = None
        self._bind_ip = ""

    @property
    def bind_ip(self) -> str:
        return self._bind_ip

    def start(self) -> None:
        cfg = self._config
        self._bind_ip = resolve_mesh_bind_ip(cfg.mesh_iface, cfg.mesh_bind_ip)
        log_mesh_topology(cfg.mesh_iface, self._bind_ip)

        self._ctx = zmq.Context.instance()
        self._ctx.setsockopt(zmq.IO_THREADS, cfg.zmq_io_threads)
        self._ctx.setsockopt(zmq.MAX_SOCKETS, 512)

        specs = (
            ProxySpec(
                name="vision",
                topic=cfg.topic_vision,
                xsub_port=cfg.vision_xsub_port,
                xpub_port=cfg.vision_xpub_port,
                rcvhwm=cfg.vision_rcvhwm,
                sndhwm=cfg.vision_sndhwm,
            ),
            ProxySpec(
                name="motor",
                topic=cfg.topic_motor,
                xsub_port=cfg.motor_xsub_port,
                xpub_port=cfg.motor_xpub_port,
                rcvhwm=cfg.motor_rcvhwm,
                sndhwm=cfg.motor_sndhwm,
                conflate=cfg.motor_conflate,
            ),
        )

        for spec in specs:
            thread = threading.Thread(
                target=_proxy_thread,
                args=(self._ctx, self._bind_ip, spec, self._stop),
                name=f"curxor-proxy-{spec.name}",
                daemon=True,
            )
            thread.start()
            self._threads.append(thread)

        print("[curxor-broker] online — zero-copy XSUB/XPUB proxies active", file=sys.stderr)

    def stop(self) -> None:
        self._stop.set()
        if self._ctx is not None:
            self._ctx.term()

    def wait(self) -> None:
        for thread in self._threads:
            thread.join()


def install_signal_handlers(broker: TelemetryBroker) -> None:
    def _handler(signum: int, _frame: object) -> None:
        print(f"\n[curxor-broker] signal {signum} — shutting down", file=sys.stderr)
        broker.stop()
        sys.exit(0)

    signal.signal(signal.SIGTERM, _handler)
    signal.signal(signal.SIGINT, _handler)
