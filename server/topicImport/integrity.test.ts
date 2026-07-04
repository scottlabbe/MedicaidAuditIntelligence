import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import test from "node:test";
import { canonicalize } from "json-canonicalize";

import { verifyBundleIntegrity } from "./integrity";

function signedBundle() {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const unsigned = {
    schemaVersion: "topic-evidence-bundle/1",
    bundleId: "d2ad013a-d518-47db-a9cc-cd6479df2415",
    bundleKind: "reviewed-report-snapshot-delta",
    createdAt: "2026-07-03T12:00:00Z",
    producer: {
      sourceSystem: "medicaid-report-ai-miner",
      codeRevision: "test",
      classificationRunId: "4e581241-6650-4b0d-b07b-d348de061a0d",
    },
    taxonomy: { version: "test", sha256: "a".repeat(64) },
    classifier: {
      provider: "openai",
      model: "test",
      modelRevision: null,
      promptVersion: "topic-prompt/1",
      outputSchemaVersion: "topic-proposal/1",
    },
    reports: [],
  };
  const payload = Buffer.from(canonicalize(unsigned), "utf8");
  return {
    publicKeyPem: publicKey.export({ type: "spki", format: "pem" }).toString(),
    bundle: {
      ...unsigned,
      integrity: {
        canonicalization: "RFC8785-JCS",
        payloadSha256: createHash("sha256").update(payload).digest("hex"),
        signatureAlgorithm: "Ed25519",
        keyId: "test-key",
        detachedSignature: sign(null, payload, privateKey).toString("base64"),
      },
    },
  };
}

test("verifies a canonical Ed25519 bundle", () => {
  const { bundle, publicKeyPem } = signedBundle();
  const parsed = verifyBundleIntegrity(bundle, publicKeyPem, "test-key");
  assert.equal(parsed.bundleId, bundle.bundleId);
});

test("rejects a modified signed payload", () => {
  const { bundle, publicKeyPem } = signedBundle();
  const modified = {
    ...bundle,
    producer: { ...bundle.producer, codeRevision: "modified" },
  };
  assert.throws(
    () => verifyBundleIntegrity(modified, publicKeyPem, "test-key"),
    /SHA-256/,
  );
});

