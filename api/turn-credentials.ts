import type { VercelRequest, VercelResponse } from "@vercel/node";

// Returns short-lived ICE servers (STUN + Cloudflare TURN) for the WebRTC P2P layer.
// Cloudflare TURN credentials are generated server-side via the Calls API and rotated
// per request so the long-lived TURN key never reaches the browser.
//
// Required Vercel env vars:
//   CF_TURN_KEY_ID     — the Turn Key ID from Cloudflare dashboard
//   CF_TURN_KEY_TOKEN  — the API token for that key (Bearer secret)
//
// If env vars are unset, falls back to STUN-only. Callers should still try to connect.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const stunFallback = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ];

  const keyId = process.env.CF_TURN_KEY_ID;
  const keyToken = process.env.CF_TURN_KEY_TOKEN;

  if (!keyId || !keyToken) {
    return res.status(200).json({ iceServers: stunFallback, turn: false });
  }

  try {
    const response = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${keyToken}`,
          "Content-Type": "application/json",
        },
        // 24h credential lifetime — well over any single session.
        body: JSON.stringify({ ttl: 86400 }),
      }
    );

    if (!response.ok) {
      console.error("Cloudflare TURN credential request failed", response.status, await response.text());
      return res.status(200).json({ iceServers: stunFallback, turn: false });
    }

    const data = await response.json();
    // Cloudflare returns { iceServers: { urls: string[], username, credential } }
    const cf = data?.iceServers;
    if (!cf || !cf.urls) {
      return res.status(200).json({ iceServers: stunFallback, turn: false });
    }

    const iceServers = [
      ...stunFallback,
      {
        urls: cf.urls,
        username: cf.username,
        credential: cf.credential,
      },
    ];

    // Short cache: credentials are valid for 24h but we want clients to pick up rotations.
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.status(200).json({ iceServers, turn: true });
  } catch (e: any) {
    console.error("TURN credential exception", e?.message || e);
    return res.status(200).json({ iceServers: stunFallback, turn: false });
  }
}
