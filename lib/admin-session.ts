export const ADMIN_SESSION_COOKIE = "jinko_admin_session";
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 12;

const encoder = new TextEncoder();

function toBase64Url(value: ArrayBuffer) {
  const base64 = btoa(String.fromCharCode(...new Uint8Array(value)));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sign(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign"],
  );

  return toBase64Url(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

export function constantTimeEqual(left: string, right: string) {
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;

  for (let index = 0; index < length; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }

  return difference === 0;
}

export async function createAdminSession(secret: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + ADMIN_SESSION_MAX_AGE;
  const signature = await sign(`jinko-admin:${expiresAt}`, secret);
  return `${expiresAt}.${signature}`;
}

export async function isAdminSessionValid(token: string | undefined, secret: string) {
  if (!token) {
    return false;
  }

  const [expiresAt, signature, extra] = token.split(".");
  const expiry = Number(expiresAt);

  if (
    !expiresAt ||
    !signature ||
    extra ||
    !Number.isSafeInteger(expiry) ||
    expiry <= Math.floor(Date.now() / 1000)
  ) {
    return false;
  }

  const expectedSignature = await sign(`jinko-admin:${expiry}`, secret);
  return constantTimeEqual(signature, expectedSignature);
}
