import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { fetch as expoFetch } from 'expo/fetch';

/**
 * Streams the Ember advisor's reply over SSE.
 *
 * React Native's built-in fetch cannot stream response bodies, so on native
 * we use `expo/fetch` (WinterCG-compliant, supports ReadableStream). On web
 * the platform fetch already streams.
 *
 * Events arrive as `data: {json}\n\n` frames:
 *   {"content":"delta"} — append to the live reply
 *   {"done":true}       — stream finished
 *   {"error":"..."}     — server-side failure
 */

type MinimalResponse = {
  ok: boolean;
  status: number;
  body: ReadableStream<Uint8Array> | null;
  json(): Promise<unknown>;
  text(): Promise<string>;
};

type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<MinimalResponse>;

function getBaseUrl(): string {
  return process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
    : '';
}

// Hermes has not always shipped TextDecoder; decode UTF-8 manually so we
// never depend on it. Events are split on byte boundaries (0x0A 0x0A) first,
// which is safe in UTF-8 (continuation bytes are always >= 0x80), so each
// decoded slice is a complete event and multibyte chars never straddle cuts.
function utf8Decode(bytes: Uint8Array): string {
  let out = '';
  let i = 0;
  while (i < bytes.length) {
    const b0 = bytes[i];
    let cp: number;
    if (b0 < 0x80) {
      cp = b0;
      i += 1;
    } else if (b0 < 0xe0) {
      cp = ((b0 & 0x1f) << 6) | (bytes[i + 1] & 0x3f);
      i += 2;
    } else if (b0 < 0xf0) {
      cp = ((b0 & 0x0f) << 12) | ((bytes[i + 1] & 0x3f) << 6) | (bytes[i + 2] & 0x3f);
      i += 3;
    } else {
      cp =
        ((b0 & 0x07) << 18) |
        ((bytes[i + 1] & 0x3f) << 12) |
        ((bytes[i + 2] & 0x3f) << 6) |
        (bytes[i + 3] & 0x3f);
      i += 4;
    }
    if (cp > 0xffff) {
      cp -= 0x10000;
      out += String.fromCharCode(0xd800 + (cp >> 10), 0xdc00 + (cp & 0x3ff));
    } else {
      out += String.fromCharCode(cp);
    }
  }
  return out;
}

export async function streamAdvisorReply(opts: {
  conversationId: number;
  content: string;
  onDelta: (text: string) => void;
}): Promise<{ error?: string }> {
  const token = await SecureStore.getItemAsync('auth_session_token');
  const doFetch: FetchLike =
    Platform.OS === 'web'
      ? (globalThis.fetch.bind(globalThis) as unknown as FetchLike)
      : (expoFetch as unknown as FetchLike);

  let res: MinimalResponse;
  try {
    res = await doFetch(
      `${getBaseUrl()}/api/anthropic/conversations/${opts.conversationId}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ content: opts.content }),
      },
    );
  } catch {
    return { error: "Couldn't reach Ember — check your connection and try again." };
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = (await res.json()) as { error?: string } | null;
      if (data?.error) message = data.error;
    } catch {
      // non-JSON error body
    }
    return { error: message };
  }

  let streamError: string | undefined;
  const handleFrame = (frame: string) => {
    for (const line of frame.split('\n')) {
      if (!line.startsWith('data:')) continue;
      const raw = line.slice(5).trim();
      if (!raw) continue;
      try {
        const evt = JSON.parse(raw) as {
          content?: string;
          error?: string;
          done?: boolean;
        };
        if (typeof evt.content === 'string') opts.onDelta(evt.content);
        else if (evt.error) streamError = evt.error;
      } catch {
        // ignore malformed frames
      }
    }
  };

  if (!res.body) {
    // Streaming unavailable in this runtime — fall back to the full payload.
    handleFrame(await res.text());
    return { error: streamError };
  }

  const reader = res.body.getReader();
  let buf: number[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (value) {
      for (let i = 0; i < value.length; i++) buf.push(value[i]);
      // Split complete frames on \n\n byte boundaries
      for (;;) {
        let cut = -1;
        for (let i = 0; i < buf.length - 1; i++) {
          if (buf[i] === 0x0a && buf[i + 1] === 0x0a) {
            cut = i;
            break;
          }
        }
        if (cut === -1) break;
        const frame = utf8Decode(Uint8Array.from(buf.slice(0, cut)));
        buf = buf.slice(cut + 2);
        handleFrame(frame);
      }
    }
    if (done) break;
  }
  if (buf.length > 0) handleFrame(utf8Decode(Uint8Array.from(buf)));

  return { error: streamError };
}
