# Telemetry Mesh Guide

Pillar 3 runs a **dual-proxy ZeroMQ broker** bound exclusively to the robotics mesh NIC (eno2).

## Architecture

Two isolated XSUB/XPUB proxy pairs prevent head-of-line blocking between high-bandwidth vision and low-latency motor traffic:

```
Publishers --PUB.connect--> XSUB :9100 --proxy--> XPUB :9101 --SUB.connect--> Subscribers
Publishers --PUB.connect--> XSUB :9200 --proxy--> XPUB :9201 --SUB.connect--> Subscribers
```

Implementation uses `zmq.proxy()` in libzmq (zero-copy C forwarding).

## Ports and topics

| Stream | Topic | XSUB (pub in) | XPUB (sub out) |
|--------|-------|---------------|----------------|
| Vision | `telemetry/vision_in` | 9100 | 9101 |
| Motor | `telemetry/motor_out` | 9200 | 9201 |

Bind IP: auto-detected from eno2, or set `CURXOR_MESH_BIND_IP=10.77.0.1` in `/etc/curxor/telemetry-broker.env`.

## Wire formats

### Motor command — 40 bytes (little-endian)

| Offset | Field | Type |
|--------|-------|------|
| 0 | timestamp_ns | u64 |
| 8 | seq | u32 |
| 12 | claw_id | u8 |
| 13 | pad | u8 |
| 14 | torque_x/y/z | f32 ×3 |
| 26 | x/y/z | f32 ×3 |
| 38 | flags | u16 |

Implemented in:

- Python: `curxor_broker.protocol`
- Node: `pillar-2-engine/src/telemetry/motor-protocol.ts`
- Dashboard: `pillar-4-dashboard/lib/wire-protocol.ts`

### Vision header — 24 bytes + payload

| Offset | Field | Type |
|--------|-------|------|
| 0 | timestamp_ns | u64 |
| 8 | seq | u32 |
| 12 | width | u32 |
| 16 | height | u32 |
| 20 | encoding | u16 (1 = JPEG) |
| 22 | flags | u16 |

Multipart message: `[topic, header, payload]`

## Configuration

`/etc/curxor/telemetry-broker.env`:

```bash
CURXOR_MESH_IFACE=eno2
CURXOR_MOTOR_CONFLATE=0          # set 1 for last-value-wins motor frames
CURXOR_VISION_RCVHWM=4096
CURXOR_MOTOR_RCVHWM=16
```

## Install and verify

```bash
sudo /opt/curxor/pillar-3-telemetry/scripts/install.sh
sudo systemctl enable --now curxor-telemetry-broker
/opt/curxor/pillar-3-telemetry/scripts/verify-mesh.sh
/opt/curxor/pillar-3-telemetry/scripts/bench-motor-latency.sh
```

## Client connection pattern

**Subscribers** (engine vision, dashboard vision/motor):

```python
sub.connect("tcp://10.77.0.1:9101")
sub.subscribe("telemetry/vision_in")
```

**Publishers** (cameras, engine motor):

```python
pub.connect("tcp://10.77.0.1:9200")
pub.send_multipart([topic, payload])
```

Apply **250 ms slow-joiner delay** after connect before expecting frames.

## Related guides

- [Networking](03-networking.md)
- [Engine & Claws](05-engine-and-claws.md)
- [Flight Command Dashboard](07-flight-command-dashboard.md)
