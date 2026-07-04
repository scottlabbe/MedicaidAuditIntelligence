import {
  createHash,
  createPublicKey,
  verify as verifySignature,
} from "node:crypto";
import { canonicalize } from "json-canonicalize";

import {
  parseTopicEvidenceBundle,
  type TopicEvidenceBundle,
} from "./bundleSchema";

export function canonicalUnsignedPayload(
  bundle: TopicEvidenceBundle,
): Buffer {
  const { integrity: _integrity, ...unsigned } = bundle;
  return Buffer.from(canonicalize(unsigned), "utf8");
}

export function verifyBundleIntegrity(
  value: unknown,
  publicKeyPem: string,
  expectedKeyId?: string,
): TopicEvidenceBundle {
  const bundle = parseTopicEvidenceBundle(value);
  if (expectedKeyId && bundle.integrity.keyId !== expectedKeyId) {
    throw new Error(
      `Unexpected signing key ${bundle.integrity.keyId}; expected ${expectedKeyId}`,
    );
  }

  const payload = canonicalUnsignedPayload(bundle);
  const digest = createHash("sha256").update(payload).digest("hex");
  if (digest !== bundle.integrity.payloadSha256) {
    throw new Error("Bundle payload SHA-256 does not match canonical content");
  }

  if (
    !/^[A-Za-z0-9+/]{86}==$/.test(bundle.integrity.detachedSignature)
  ) {
    throw new Error("Bundle signature is not valid base64");
  }
  const signature = Buffer.from(
    bundle.integrity.detachedSignature,
    "base64",
  );
  if (signature.length !== 64) {
    throw new Error("Bundle Ed25519 signature must be 64 bytes");
  }
  const valid = verifySignature(
    null,
    payload,
    createPublicKey(publicKeyPem),
    signature,
  );
  if (!valid) {
    throw new Error("Bundle Ed25519 signature verification failed");
  }
  return bundle;
}
