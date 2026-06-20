"""
Binary wire formats for mesh messages.

Motor commands use a fixed 40-byte little-endian struct for zero-parse overhead.
Vision frames use multipart [topic, header, payload] — payload is zero-copy at libzmq layer.
"""

from __future__ import annotations

import struct
import time
from dataclasses import dataclass

# 40-byte fixed frame: ts(8) seq(4) claw(1) pad(1) torque(12) xyz(12) flags(2)
MOTOR_STRUCT = struct.Struct("<QIBB3f3fH")

VISION_HEADER_STRUCT = struct.Struct("<QIIHH")
# timestamp_ns(u64) seq(u32) width(u32) height(u32) encoding(u16) flags(u16)

ENCODING_JPEG = 1
ENCODING_RAW_RGB8 = 2
ENCODING_DEPTH16 = 3


@dataclass(frozen=True, slots=True)
class MotorCommand:
    timestamp_ns: int
    seq: int
    claw_id: int
    torque_x: float
    torque_y: float
    torque_z: float
    x: float
    y: float
    z: float
    flags: int = 0

    def pack(self) -> bytes:
        return MOTOR_STRUCT.pack(
            self.timestamp_ns,
            self.seq,
            self.claw_id,
            0,  # reserved pad byte
            self.torque_x,
            self.torque_y,
            self.torque_z,
            self.x,
            self.y,
            self.z,
            self.flags,
        )

    @classmethod
    def unpack(cls, payload: bytes | memoryview) -> MotorCommand:
        fields = MOTOR_STRUCT.unpack_from(payload)
        return cls(
            timestamp_ns=fields[0],
            seq=fields[1],
            claw_id=fields[2],
            torque_x=fields[4],
            torque_y=fields[5],
            torque_z=fields[6],
            x=fields[7],
            y=fields[8],
            z=fields[9],
            flags=fields[10],
        )


def motor_now(claw_id: int, x: float, y: float, z: float, **kwargs) -> MotorCommand:
    return MotorCommand(
        timestamp_ns=time.time_ns(),
        seq=kwargs.get("seq", 0),
        claw_id=claw_id,
        torque_x=kwargs.get("torque_x", 0.0),
        torque_y=kwargs.get("torque_y", 0.0),
        torque_z=kwargs.get("torque_z", 0.0),
        x=x,
        y=y,
        z=z,
        flags=kwargs.get("flags", 0),
    )


def pack_vision_header(
    *,
    timestamp_ns: int,
    seq: int,
    width: int,
    height: int,
    encoding: int,
    flags: int = 0,
) -> bytes:
    return VISION_HEADER_STRUCT.pack(timestamp_ns, seq, width, height, encoding, flags)
