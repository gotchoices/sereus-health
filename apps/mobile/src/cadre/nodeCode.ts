/**
 * Node codes: the `sereus-join:1.…` text a cadre node shows (as a QR code, a link
 * or plain text) while it waits to be claimed, and what the owner's phone does
 * with it.
 *
 * Reusable by any Sereus RN app — a candidate for `@serfab/cadre-rn`.  It imports
 * only cadre-core, libp2p utils and multiaddr: no React, no React Native, no app
 * code, so it runs under jest/Node as is.  It returns reason CODES, never
 * user-facing text, so each app words them in its own i18n.
 *
 * SECURITY: a code carries the node's one-time claim secret.  Never log the code
 * text, a link containing one, or a decoded payload — log the peer id only.
 *
 * Pattern (see design/specs/mobile/screens/sereus-connections.md → Add Node):
 *   code arrives (scanner | link | paste) → readNodeCode → user approves a prompt
 *   showing nodeReach + the cadre → CadreNode.claimNode(payload) →
 *   on failure classifyClaimFailure picks the message and whether to keep the code.
 *   A code never claims without that approval: a link can be sent by anyone.
 */

import { isPrivateIp } from '@libp2p/utils';
import {
  CODE_DNS,
  CODE_DNS4,
  CODE_DNS6,
  CODE_DNSADDR,
  CODE_IP4,
  CODE_IP6,
  CODE_IP6ZONE,
  multiaddr,
} from '@multiformats/multiaddr';
import {
  ClaimRefusedError,
  NODE_CLAIM_PAYLOAD_PREFIX,
  PeerUnreachableError,
  decodeNodeClaimPayload,
  type NodeClaimPayload,
} from '@serfab/cadre-core';
import { NODE_CODE_SCHEME } from './nodeCodeLink';

export type { NodeClaimPayload };
export { NODE_CODE_SCHEME, isNodeCode, nodeCodeFromUrl } from './nodeCodeLink';

/** A code with a version this build does not read: `sereus-join:<n>.` with n ≠ 1. */
const VERSIONED_NODE_CODE = /^sereus-join:(\d+)\./;

/** Why text is not a usable node code. */
export type NodeCodeProblem =
  /** Does not start with `sereus-join:` — some other QR, link or text. */
  | 'not-node-code'
  /** A node code from a newer node than this app reads: the app needs updating. */
  | 'newer-version'
  /** Right prefix, but cut short or corrupted. */
  | 'damaged';

export type NodeCodeReading =
  | { ok: true; payload: NodeClaimPayload }
  | { ok: false; problem: NodeCodeProblem; /** Decoder's words (never the secret), for logs/bug reports. */ detail?: string };

/** Decode scanned or pasted text, or say which problem it has. */
export function readNodeCode(text: string): NodeCodeReading {
  const trimmed = text.trim();
  if (!trimmed.startsWith(NODE_CODE_SCHEME)) return { ok: false, problem: 'not-node-code' };
  if (!trimmed.startsWith(NODE_CLAIM_PAYLOAD_PREFIX) && VERSIONED_NODE_CODE.test(trimmed)) {
    return { ok: false, problem: 'newer-version' };
  }
  try {
    return { ok: true, payload: decodeNodeClaimPayload(trimmed) };
  } catch (err) {
    // The decoder never echoes the secret, so its message is safe to keep.
    return { ok: false, problem: 'damaged', detail: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Where the phone can reach the node from: `anywhere` when at least one address
 * names a public IP or a DNS name, else `home-network` (same Wi-Fi only).
 */
export type NodeReach = 'anywhere' | 'home-network';

export function nodeReach(multiaddrs: readonly string[]): NodeReach {
  return multiaddrs.some(isPublicAddress) ? 'anywhere' : 'home-network';
}

/**
 * The address's host is a DNS name or a public IP.  The host is the first IP or DNS
 * component, so a relayed address is judged by its relay.  `isPrivateIp` counts
 * loopback, link-local and 100.64.0.0/10 (Tailscale) as private.
 */
function isPublicAddress(addr: string): boolean {
  let components;
  try {
    components = multiaddr(addr).getComponents();
  } catch {
    return false;
  }
  for (const { code, value } of components) {
    switch (code) {
      case CODE_DNS:
      case CODE_DNS4:
      case CODE_DNS6:
      case CODE_DNSADDR:
        return true;
      case CODE_IP4:
      case CODE_IP6:
        return value !== undefined && isPrivateIp(value) === false;
      case CODE_IP6ZONE:
        return false; // a zone names a local interface: link-local only
    }
  }
  return false;
}

/** First 8 characters of an owner key: the fingerprint a claimed node shows as its owner. */
export function ownerFingerprint(publicKeyB64: string): string {
  return publicKeyB64.slice(0, 8);
}

/** A refusal code a node may send.  Open-ended: a newer node may send one this build lacks. */
export type ClaimRefusal = NonNullable<ClaimRefusedError['code']>;

export type ClaimFailure =
  /** No connection formed from any address; nothing was sent.  `reach` picks the advice. */
  | { kind: 'unreachable'; reach: NodeReach; canRetrySameCode: true; detail: string }
  /** The node answered and said no.  `refusal` is absent when it gave no (known) code. */
  | { kind: 'refused'; refusal?: ClaimRefusal; canRetrySameCode: boolean; detail: string }
  /** Reached, then the exchange or a local step failed.  Repeating with the same code is safe. */
  | { kind: 'failed'; canRetrySameCode: true; detail: string };

/** Refusals after which the same code can still succeed. */
const RETRYABLE_REFUSALS: ReadonlySet<string> = new Set<ClaimRefusal>(['claim-rate-limited', 'claim-not-persisted']);

/** Sort an error thrown by `CadreNode.claimNode(payload)` into what the app should say and do. */
export function classifyClaimFailure(error: unknown, payload: NodeClaimPayload): ClaimFailure {
  const detail = error instanceof Error ? error.message : String(error);
  if (error instanceof PeerUnreachableError) {
    return { kind: 'unreachable', reach: nodeReach(payload.multiaddrs), canRetrySameCode: true, detail };
  }
  if (error instanceof ClaimRefusedError) {
    const refusal = error.code;
    return {
      kind: 'refused',
      refusal,
      canRetrySameCode: refusal !== undefined && RETRYABLE_REFUSALS.has(refusal),
      detail: error.reason ?? detail,
    };
  }
  return { kind: 'failed', canRetrySameCode: true, detail };
}

/** `…` + the last 8 characters: enough to match the peer id the node prints. */
export function shortPeerId(peerId: string): string {
  return peerId.length > 12 ? `…${peerId.slice(-8)}` : peerId;
}
