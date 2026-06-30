#!/usr/bin/env bash
# CurXor OS — Latency smoke test on robotics mesh (motor path)
set -euo pipefail

ENV_FILE="${ENV_FILE:-/etc/curxor/telemetry-broker.env}"
if [[ -f "${ENV_FILE}" ]]; then
  set -a; source "${ENV_FILE}"; set +a
fi

IFACE="${CURXOR_MESH_IFACE:-enp97s0}"
MESH_IP="${CURXOR_MESH_BIND_IP:-$(ip -4 -o addr show dev "${IFACE}" | awk '{print $4}' | cut -d/ -f1 | head -1)}"
INSTALL_ROOT="${CURXOR_INSTALL_ROOT:-/opt/curxor/pillar-3-telemetry}"
VENV="${INSTALL_ROOT}/.venv/bin/python3"

if [[ -z "${MESH_IP}" ]]; then
  echo "ERROR: no mesh IP on ${IFACE}" >&2
  exit 1
fi

export CURXOR_MESH_BIND_IP="${MESH_IP}"
export PYTHONPATH="${INSTALL_ROOT}/src:${PYTHONPATH:-}"

"${VENV}" - <<'PY'
import os
import time
import zmq
from curxor_broker.protocol import motor_now
from curxor_broker.client import MotorPublisher, MotorSubscriber

ip = os.environ["CURXOR_MESH_BIND_IP"]
xsub = int(os.environ.get("CURXOR_MOTOR_XSUB_PORT", "9200"))
xpub = int(os.environ.get("CURXOR_MOTOR_XPUB_PORT", "9201"))
topic = os.environ.get("CURXOR_TOPIC_MOTOR", "telemetry/motor_out")

ctx = zmq.Context.instance()
sub = MotorSubscriber(ctx, ip, xpub, topic=topic, conflate=True)
pub = MotorPublisher(ctx, ip, xsub, topic=topic)

# ZMQ slow-joiner: allow XPUB/XSUB subscription propagation
time.sleep(0.25)

samples = []
for i in range(200):
    t0 = time.perf_counter_ns()
    pub.send_command(motor_now(claw_id=1, x=0.1 * i, y=0.0, z=0.5, seq=i))
    cmd = sub.recv_command()
    t1 = time.perf_counter_ns()
    assert cmd.seq == i
    samples.append((t1 - t0) / 1e6)

sub.close()
pub.close()

samples.sort()
p50 = samples[len(samples) // 2]
p99 = samples[int(len(samples) * 0.99)]
print(f"motor round-trip ms: p50={p50:.3f} p99={p99:.3f} (n={len(samples)})")
PY
