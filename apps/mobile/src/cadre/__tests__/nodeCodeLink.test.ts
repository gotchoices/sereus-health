import { isNodeCode, nodeCodeFromUrl } from '../nodeCodeLink';
import { NodeCodeInbox, type LinkSource } from '../nodeCodeInbox';

const CODE = 'sereus-join:1.eyJtdWx0aWFkZHJzIjpbXX0';

describe('nodeCodeFromUrl', () => {
  it('takes a bare code URI as is', () => {
    expect(nodeCodeFromUrl(CODE)).toBe(CODE);
    expect(nodeCodeFromUrl(`  ${CODE}\n`)).toBe(CODE);
  });

  it('finds a code in a fragment or an encoded query parameter', () => {
    expect(nodeCodeFromUrl(`https://sereus.org/join#${CODE}`)).toBe(CODE);
    expect(nodeCodeFromUrl(`health://claim?code=${encodeURIComponent(CODE)}&x=1`)).toBe(CODE);
  });

  it('ignores links without a code', () => {
    expect(nodeCodeFromUrl(null)).toBeNull();
    expect(nodeCodeFromUrl('health://screen/LogHistory?variant=empty')).toBeNull();
    expect(nodeCodeFromUrl('https://sereus.org/health/invite/abc')).toBeNull();
    expect(nodeCodeFromUrl('health://x?code=sereus-join:')).toBeNull();
  });

  it('isNodeCode tests the prefix only', () => {
    expect(isNodeCode(CODE)).toBe(true);
    expect(isNodeCode('sereus-join:9.whatever')).toBe(true);
    expect(isNodeCode('/dns4/a/tcp/1/wss/p2p/x')).toBe(false);
  });
});

function fakeLinking(initial: string | null) {
  let handler: ((e: { url: string }) => void) | null = null;
  const source: LinkSource = {
    getInitialURL: () => Promise.resolve(initial),
    addEventListener: (_type, h) => {
      handler = h;
      return { remove: () => { handler = null; } };
    },
  };
  return { source, open: (url: string) => handler?.({ url }), isListening: () => handler !== null };
}

describe('NodeCodeInbox', () => {
  it('holds a cold-start code until taken, then empties', async () => {
    const inbox = new NodeCodeInbox();
    const linking = fakeLinking(CODE);
    inbox.start(linking.source);
    await Promise.resolve();
    await Promise.resolve();
    expect(inbox.hasPending()).toBe(true);
    expect(inbox.take()).toBe(CODE);
    expect(inbox.take()).toBeNull();
  });

  it('notifies subscribers for code links only, newest code wins', () => {
    const inbox = new NodeCodeInbox();
    const linking = fakeLinking(null);
    inbox.start(linking.source);
    const listener = jest.fn();
    const unsubscribe = inbox.subscribe(listener);
    linking.open('health://screen/Settings');
    expect(listener).not.toHaveBeenCalled();
    linking.open(CODE);
    linking.open(`${CODE}x`);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(inbox.take()).toBe(`${CODE}x`);
    unsubscribe();
    linking.open(CODE);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('start is idempotent and stoppable', () => {
    const inbox = new NodeCodeInbox();
    const linking = fakeLinking(null);
    const stop = inbox.start(linking.source);
    expect(inbox.start(linking.source)).toBe(stop);
    stop();
    expect(linking.isListening()).toBe(false);
  });
});
