import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
} from "node:crypto";
function key(clientId: string, secret: string) {
  return Buffer.from(
    hkdfSync("sha256", secret, clientId, "diazen-strava-cookies-v1", 32),
  );
}
export function sealStrava(
  data: unknown,
  purpose: "state" | "session",
  clientId: string,
  secret: string,
) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", key(clientId, secret), iv);
  cipher.setAAD(Buffer.from(`diazen-strava:${purpose}`));
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(data), "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString(
    "base64url",
  );
}
export function openStrava(
  value: string | undefined,
  purpose: "state" | "session",
  clientId: string,
  secret: string,
): unknown {
  if (!value || value.length > 4000) return null;
  try {
    const bytes = Buffer.from(value, "base64url"),
      decipher = createDecipheriv(
        "aes-256-gcm",
        key(clientId, secret),
        bytes.subarray(0, 12),
      );
    decipher.setAAD(Buffer.from(`diazen-strava:${purpose}`));
    decipher.setAuthTag(bytes.subarray(12, 28));
    return JSON.parse(
      Buffer.concat([
        decipher.update(bytes.subarray(28)),
        decipher.final(),
      ]).toString("utf8"),
    );
  } catch {
    return null;
  }
}
