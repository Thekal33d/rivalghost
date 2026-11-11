export interface SettlementCertificatePayload {
  certificateVersion: 1;
  challengeId: string;
  crownId: string;
  playerId: string;
  rulesVersion: number;
  seed: number;
  loadoutHash: string;
  replayHash: string;
  finalStateHash: string;
  score: number;
  issuedAtMs: number;
  expiresAtMs: number;
  verifierKeyVersion: number;
}

export interface SettlementCertificate extends SettlementCertificatePayload {
  /** Raw Ed25519 bytes, represented as JSON-safe octets for NEAR arguments. */
  signature: number[];
}

/**
 * The verifier and contract sign this exact UTF-8 string. Every field is
 * positional so JavaScript object order, JSON formatting, and RPC formatting
 * cannot alter a valid certificate.
 */
export function certificateMessage(payload: SettlementCertificatePayload): ArrayBuffer {
  const bytes = new TextEncoder().encode([
    "RIVALGHOST-CERT-v1",
    payload.challengeId,
    payload.crownId,
    payload.playerId,
    payload.rulesVersion,
    payload.seed,
    payload.loadoutHash,
    payload.replayHash,
    payload.finalStateHash,
    payload.score,
    payload.issuedAtMs,
    payload.expiresAtMs,
    payload.verifierKeyVersion,
  ].join("|"));
  return bytes.buffer as ArrayBuffer;
}

export async function signSettlementCertificate(
  payload: SettlementCertificatePayload,
  signingKey: CryptoKey,
): Promise<SettlementCertificate> {
  const signature = await globalThis.crypto.subtle.sign(
    { name: "Ed25519" },
    signingKey,
    certificateMessage(payload),
  );

  return { ...payload, signature: Array.from(new Uint8Array(signature)) };
}
