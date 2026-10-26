// Generates a VAPID key pair for Web Push. Run once: node scripts/generate-vapid-keys.mjs
// Prints the public key (goes into wrangler.toml and notify.js) and writes the private key to .dev.vars.

import { writeFileSync } from "node:fs";
import { webcrypto as crypto } from "node:crypto";

const keys = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
const publicKey = Buffer.from(await crypto.subtle.exportKey("raw", keys.publicKey)).toString("base64url");
const privateJwk = JSON.stringify(await crypto.subtle.exportKey("jwk", keys.privateKey));

writeFileSync(new URL("../.dev.vars", import.meta.url), `VAPID_PRIVATE_JWK=${privateJwk}\n`);
console.log(`VAPID public key:\n${publicKey}\n\nPrivate key written to worker/.dev.vars (never commit it).`);
