# CurXor OS — Pillar 3: Telemetry Broker

Zero-copy ZeroMQ pub/sub daemon for the **robotics mesh** (secondary 10GbE, `eno2`).

## Architecture

Two isolated **XSUB/XPUB proxy pairs** run in libzmq C code via `zmq.proxy()` — no Python copies on the hot path.

```
Claw cameras ──PUB──► XSUB:9100 ──proxy──► XPUB:9101 ──SUB──► Engine / Dashboard
                         telemetry/vision_in

Engine ──PUB──► XSUB:9200 ──proxy──► XPUB:9201 ──SUB──► Claw actuators
                  telemetry/motor_out
```

Motor traffic uses a **separate proxy** from vision to prevent head-of-line blocking from camera frames — critical for sub-ms mechanical latency.

| Topic | Direction | Publisher connect | Subscriber connect |
|-------|-----------|-------------------|-------------------|
| `telemetry/vision_in` | Claw → Engine | `tcp://<eno2_ip>:9100` | `tcp://<eno2_ip>:9101` |
| `telemetry/motor_out` | Engine → Claw | `tcp://<eno2_ip>:9200` | `tcp://<eno2_ip>:9201` |

All sockets bind **only** to the IPv4 address of `eno2` — never `0.0.0.0`.

## Install (Ubuntu 24.04 appliance)

```bash
sudo cp -r pillar-3-telemetry /opt/curxor/pillar-3-telemetry
cd /opt/curxor/pillar-3-telemetry
chmod +x scripts/*.sh
sudo ./scripts/install.sh

# Configure robotics mesh on Port 2 (example)
sudo ip addr add 10.77.0.1/24 dev eno2
sudo ip link set eno2 up

sudo systemctl enable --now curxor-telemetry-broker
./scripts/verify-mesh.sh
./scripts/bench-motor-latency.sh
```

## Wire Format

**Motor** (`telemetry/motor_out`) — fixed 40-byte struct, little-endian:

```
timestamp_ns(u64) seq(u32) claw_id(u8) torque_xyz(3×f32) xyz(3×f32) flags(u16)
```

**Vision** (`telemetry/vision_in`) — multipart zero-copy:

```
[topic, 20-byte header, frame_payload]
header: timestamp_ns seq width height encoding flags
```

Use `curxor_broker.client` helpers or `curxor_broker.protocol` from Pillars 2 and 4.

## Client Example (Pillar 2 Engine)

```python
import zmq
from curxor_broker.client import MotorPublisher, VisionSubscriber
from curxor_broker.protocol import motor_now

ctx = zmq.Context.instance()
BROKER = "10.77.0.1"  # eno2 mesh IP

vision = VisionSubscriber(ctx, BROKER, 9101)
motor = MotorPublisher(ctx, BROKER, 9200)

header, frame = vision.recv_frame()
motor.send_command(motor_now(claw_id=1, x=0.12, y=-0.03, z=0.41, seq=1))
```

## Latency Tuning

| Setting | Vision | Motor | Why |
|---------|--------|-------|-----|
| `RCVHWM/SNDHWM` | 4096 | 16 | Vision bursts; motor stays shallow |
| `TCP_NODELAY` | ✓ | ✓ | Disable Nagle on 10GbE mesh |
| `CONFLATE` (sub) | ✗ | ✓ | Actuators always take latest command |
| Separate proxy | ✓ | ✓ | No vision frame blocking motor path |

Production: pin broker thread to an isolated CPU core and assign `eno2` IRQ affinity via `/proc/irq/`.

## Configuration

Environment file: `/etc/curxor/telemetry-broker.env` (see `.env.example`).

```bash
CURXOR_MESH_IFACE=eno2
CURXOR_MESH_BIND_IP=          # auto-detect from eno2
CURXOR_TOPIC_VISION=telemetry/vision_in
CURXOR_TOPIC_MOTOR=telemetry/motor_out
```

## Integration

| Pillar | Connection |
|--------|------------|
| **Pillar 1** | Inference on `127.0.0.1` only — never on mesh |
| **Pillar 2** | Engine publishes motor, subscribes vision |
| **Pillar 4** | Dashboard subscribes both topics via XPUB ports |

## Files

```
pillar-3-telemetry/
├── src/curxor_broker/
│   ├── broker.py       # Dual zmq.proxy daemon
│   ├── client.py       # Publisher/subscriber helpers
│   ├── protocol.py     # Binary wire formats
│   ├── network.py      # eno2 bind resolution
│   └── config.py
├── systemd/curxor-telemetry-broker.service
├── scripts/install.sh
├── scripts/verify-mesh.sh
└── scripts/bench-motor-latency.sh
```
