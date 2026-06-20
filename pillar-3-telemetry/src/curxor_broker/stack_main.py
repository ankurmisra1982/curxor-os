"""CurXor broker + digital bridges — single systemd service entrypoint."""

from __future__ import annotations

import asyncio
import sys
import threading

from curxor_broker.broker import TelemetryBroker, install_signal_handlers
from curxor_broker.config import BrokerConfig
from curxor_broker.digital_bridges import run_digital_bridges


def main() -> None:
    try:
        config = BrokerConfig.from_env()
        broker = TelemetryBroker(config)
        install_signal_handlers(broker)
        broker.start()

        bridge_loop = asyncio.new_event_loop()

        def _bridge_thread() -> None:
            asyncio.set_event_loop(bridge_loop)
            bridge_loop.run_until_complete(run_digital_bridges(config))

        thread = threading.Thread(
            target=_bridge_thread,
            name="curxor-digital-bridges",
            daemon=True,
        )
        thread.start()

        print("[curxor-broker] digital bridges thread started", file=sys.stderr)
        broker.wait()
    except KeyboardInterrupt:
        sys.exit(0)
    except Exception as exc:
        print(f"[curxor-broker-stack] fatal: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
