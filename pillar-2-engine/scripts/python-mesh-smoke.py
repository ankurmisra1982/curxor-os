#!/usr/bin/env python3
"""
Optional Python mesh bridge for integration tests.

Uses curxor_broker.client (Pillar 3) to verify wire compatibility with the Node engine.
Run from the appliance with Pillar 3 installed:

  /opt/curxor/pillar-3-telemetry/.venv/bin/python scripts/python-mesh-smoke.py
"""

from __future__ import annotations

import os
import sys
import time

# Allow importing curxor_broker when pillar-3 is installed
sys.path.insert(0, "/opt/curxor/pillar-3-telemetry/src")

import zmq  # noqa: E402

from curxor_broker.client import MotorSubscriber, VisionPublisher  # noqa: E402
from curxor_broker.protocol import motor_now, pack_vision_header, ENCODING_JPEG  # noqa: E402


def main() -> None:
    ip = os.environ.get("CURXOR_MESH_BROKER_IP", "10.77.0.1")
    ctx = zmq.Context.instance()

    vision = VisionPublisher(ctx, ip, 9100)
    motor = MotorSubscriber(ctx, ip, 9201, conflate=True)

    header = pack_vision_header(
        timestamp_ns=time.time_ns(),
        seq=1,
        width=640,
        height=480,
        encoding=ENCODING_JPEG,
    )
    vision.send_frame(header, b"\xff\xd8\xff fake-jpeg-payload")

    pub = __import__("curxor_broker.client", fromlist=["MotorPublisher"]).MotorPublisher
    motor_pub = pub(ctx, ip, 9200)
    motor_pub.send_command(motor_now(claw_id=1, x=0.1, y=0.2, z=0.3, seq=99))

    time.sleep(0.2)
    cmd = motor.recv_command()
    print(f"[python-bridge] motor seq={cmd.seq} xyz=({cmd.x},{cmd.y},{cmd.z})")

    vision.close()
    motor.close()
    motor_pub.close()


if __name__ == "__main__":
    main()
