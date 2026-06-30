"""Robotics mesh network binding — Egress Port NIC only (MS-S1: enp97s0)."""

from __future__ import annotations

import fcntl
import socket
import struct
import subprocess
import sys


def get_iface_ipv4(iface: str) -> str:
    """Return IPv4 address for a Linux network interface (stdlib only)."""
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        ifreq = struct.pack("256s", iface.encode()[:15])
        result = fcntl.ioctl(sock.fileno(), 0x8915, ifreq)  # SIOCGIFADDR
        return socket.inet_ntoa(result[20:24])
    except OSError as exc:
        raise RuntimeError(f"Cannot read IPv4 for interface '{iface}': {exc}") from exc
    finally:
        sock.close()


def iface_is_up(iface: str) -> bool:
    """Check whether interface exists and is UP."""
    try:
        with open(f"/sys/class/net/{iface}/operstate", encoding="utf-8") as fh:
            state = fh.read().strip()
        return state in {"up", "unknown"}
    except OSError:
        return False


def resolve_mesh_bind_ip(iface: str, override: str) -> str:
    """
    Resolve the mesh bind address.

    Never falls back to 0.0.0.0 — broker must bind strictly to the robotics NIC.
    """
    if override:
        socket.inet_aton(override)
        return override

    if not iface_is_up(iface):
        raise RuntimeError(
            f"Robotics mesh interface '{iface}' is not up. "
            f"Bring it up before starting the broker: "
            f"ip link set {iface} up"
        )

    return get_iface_ipv4(iface)


def mesh_endpoint(bind_ip: str, port: int) -> str:
    return f"tcp://{bind_ip}:{port}"


def log_mesh_topology(iface: str, bind_ip: str) -> None:
    """Print mesh NIC details for operator verification."""
    print(f"[curxor-broker] mesh interface : {iface}", file=sys.stderr)
    print(f"[curxor-broker] mesh bind IP   : {bind_ip}", file=sys.stderr)
    try:
        out = subprocess.run(
            ["ip", "-4", "-br", "addr", "show", iface],
            check=False,
            capture_output=True,
            text=True,
        )
        if out.stdout.strip():
            print(f"[curxor-broker] ip addr        : {out.stdout.strip()}", file=sys.stderr)
    except FileNotFoundError:
        pass
