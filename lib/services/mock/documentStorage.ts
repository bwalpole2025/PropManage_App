import { promises as fs } from "node:fs";
import path from "node:path";
import type { DocumentStorage, PutResult } from "../types";

// Local-filesystem document storage (default for dev/test). Objects live under
// FILE_STORAGE_DIR; signed URLs point at the in-app download route, which streams
// the bytes back (no real presigning). No S3/MinIO/Docker required.
export class MockDocumentStorage implements DocumentStorage {
  readonly driverName = "mock";
  private root: string;

  constructor(root = process.env.FILE_STORAGE_DIR ?? "./storage") {
    this.root = path.resolve(root);
  }

  private full(key: string) {
    // Prevent path traversal outside the storage root.
    const resolved = path.resolve(this.root, key);
    if (!resolved.startsWith(this.root)) {
      throw new Error("Invalid storage key");
    }
    return resolved;
  }

  async put(
    key: string,
    bytes: Uint8Array | Buffer,
    _contentType: string,
  ): Promise<PutResult> {
    const file = this.full(key);
    await fs.mkdir(path.dirname(file), { recursive: true });
    const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
    await fs.writeFile(file, buf);
    return { key, sizeBytes: buf.byteLength };
  }

  async getSignedUrl(key: string, _ttlSeconds: number): Promise<string> {
    // The local download route resolves the FileObject by id, not by raw key;
    // callers build /api/files/[id]. Here we expose a key-addressable form too.
    return `/api/files/by-key?key=${encodeURIComponent(key)}`;
  }

  async getBytes(key: string): Promise<Uint8Array> {
    return new Uint8Array(await fs.readFile(this.full(key)));
  }

  async delete(key: string): Promise<void> {
    await fs.rm(this.full(key), { force: true });
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(this.full(key));
      return true;
    } catch {
      return false;
    }
  }
}
