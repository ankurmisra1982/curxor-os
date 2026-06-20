/**
 * Vision wire format — compatible with curxor_broker.protocol.VISION_HEADER_STRUCT
 *
 * Multipart message: [topic, 24-byte header, frame payload]
 * Header: timestamp_ns u64 | seq u32 | width u32 | height u32 | encoding u16 | flags u16
 */

export const VISION_HEADER_SIZE = 24;

export const ENCODING_JPEG = 1;
export const ENCODING_RAW_RGB8 = 2;
export const ENCODING_DEPTH16 = 3;

export interface VisionHeader {
  timestampNs: bigint;
  seq: number;
  width: number;
  height: number;
  encoding: number;
  flags: number;
}

export interface VisionFrame {
  header: VisionHeader;
  payload: Buffer;
}

export function unpackVisionHeader(header: Buffer): VisionHeader {
  if (header.length < VISION_HEADER_SIZE) {
    throw new Error(`vision header must be ${VISION_HEADER_SIZE} bytes, got ${header.length}`);
  }
  return {
    timestampNs: header.readBigUInt64LE(0),
    seq: header.readUInt32LE(8),
    width: header.readUInt32LE(12),
    height: header.readUInt32LE(16),
    encoding: header.readUInt16LE(20),
    flags: header.readUInt16LE(22),
  };
}

export function summarizeVisionFrame(frame: VisionFrame): Record<string, unknown> {
  return {
    timestampNs: frame.header.timestampNs.toString(),
    seq: frame.header.seq,
    width: frame.header.width,
    height: frame.header.height,
    encoding: frame.header.encoding,
    payloadBytes: frame.payload.length,
  };
}
