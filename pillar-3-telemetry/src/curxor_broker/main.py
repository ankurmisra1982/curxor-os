"""CurXor telemetry broker entrypoint."""

from __future__ import annotations

import sys

from curxor_broker.broker import TelemetryBroker, install_signal_handlers
from curxor_broker.config import BrokerConfig


def main() -> None:
    try:
        config = BrokerConfig.from_env()
        broker = TelemetryBroker(config)
        install_signal_handlers(broker)
        broker.start()
        broker.wait()
    except KeyboardInterrupt:
        sys.exit(0)
    except Exception as exc:
        print(f"[curxor-broker] fatal: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
