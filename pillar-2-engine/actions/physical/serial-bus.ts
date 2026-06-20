/**
 * Stub for future serial/USB actuator paths.
 * Digital I/O removed — physical bus only.
 */

export interface SerialPortConfig {
  path: string;
  baudRate: number;
}

export async function openSerial(_config: SerialPortConfig): Promise<void> {
  throw new Error("Serial actuator bridge not yet implemented — use telemetry/motor_out mesh");
}
