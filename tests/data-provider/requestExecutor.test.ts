/**
 * Request-executor contract tests (DEC-007 — "timeouts/cancellation/retries
 * have one implementation, one test surface"; addbeforerelease.txt §14).
 *
 * Covered: per-attempt timeout budget -> 'timeout'; AbortSignal -> 'cancelled'
 * (promptly, and never retried); bounded retries with deterministic backoff
 * (injected randomness — nothing random in results); every rejection is a
 * ProviderError regardless of what the operation threw.
 */

import {
  DEFAULT_READ_RETRY_POLICY,
  NO_AUTO_RETRY_POLICY,
  type RetryPolicy,
} from '../../src/services/common/RequestOptions';
import {
  createProviderError,
  isProviderError,
  toProviderError,
} from '../../src/services/api/providerErrors';
import { abortableDelay, computeBackoffDelayMs } from '../../src/services/api/timing';
import { executeRead } from '../../src/services/api/requestExecutor';

const FAST_RETRY: RetryPolicy = {
  maxAttempts: 3,
  baseDelayMs: 1,
  maxDelayMs: 2,
  jitter: 'none',
  retryOn: ['timeout', 'network', 'upstream_error', 'rate_limited'],
};

const FIXED_NOW = () => new Date('2026-05-05T05:05:05.000Z');

function failingOperation(
  code: Parameters<typeof createProviderError>[0],
  counter?: number[],
) {
  return async (): Promise<never> => {
    counter?.push(1);
    throw createProviderError(code, `simulated ${code}`);
  };
}

describe('executeRead — success and normalisation', () => {
  it('resolves with the operation result', async () => {
    await expect(
      executeRead(async () => 'ok', { retry: NO_AUTO_RETRY_POLICY }),
    ).resolves.toBe('ok');
  });

  it('returns an existing ProviderError unchanged', async () => {
    const original = createProviderError('not_found', 'missing');
    await expect(
      executeRead(async () => {
        throw original;
      }),
    ).rejects.toBe(original);
  });

  it('normalises arbitrary thrown values to ProviderError', async () => {
    const cases: [unknown, string][] = [
      [new Error('boom'), 'unknown'],
      [new TypeError('fetch failed'), 'network'],
      [Object.assign(new Error('aborted'), { name: 'AbortError' }), 'cancelled'],
      [Object.assign(new Error('slow'), { name: 'TimeoutError' }), 'timeout'],
      ['a bare string', 'unknown'],
      [undefined, 'unknown'],
    ];
    for (const [thrown, expectedCode] of cases) {
      const rejection = await executeRead(
        async () => {
          throw thrown;
        },
        { retry: NO_AUTO_RETRY_POLICY },
      ).catch((error: unknown) => error);
      expect(isProviderError(rejection)).toBe(true);
      expect((rejection as { code: string }).code).toBe(expectedCode);
    }
  });

  it('classifies thrown values the same way as toProviderError', () => {
    expect(toProviderError(new Error('x')).code).toBe('unknown');
    expect(toProviderError(new TypeError('x')).code).toBe('network');
    expect(toProviderError(createProviderError('conflict', 'x')).code).toBe('conflict');
  });

  it('stamps occurredAt from the injected clock (deterministic)', async () => {
    const rejection = (await executeRead(
      async () => {
        throw new Error('boom');
      },
      { retry: NO_AUTO_RETRY_POLICY },
      { now: FIXED_NOW },
    ).catch((error: unknown) => error)) as { code: string; occurredAt: string };
    expect(rejection.code).toBe('unknown');
    expect(rejection.occurredAt).toBe('2026-05-05T05:05:05.000Z');
  });
});

describe('executeRead — timeout budget', () => {
  it("rejects with 'timeout' when the attempt exceeds the budget", async () => {
    const rejection = (await executeRead(
      (attemptSignal) => abortableDelay(5_000, attemptSignal),
      { timeoutMs: 20, retry: NO_AUTO_RETRY_POLICY },
    ).catch((error: unknown) => error)) as { code: string };
    expect(rejection.code).toBe('timeout');
  });

  it('aborts the attempt signal so the operation can tear down', async () => {
    let sawAbort = false;
    await executeRead(
      (attemptSignal) =>
        new Promise<never>((_resolve, reject) => {
          attemptSignal.addEventListener('abort', () => {
            sawAbort = true;
            reject(createProviderError('cancelled', 'aborted'));
          });
        }),
      { timeoutMs: 20, retry: NO_AUTO_RETRY_POLICY },
    ).catch(() => undefined);
    expect(sawAbort).toBe(true);
  });
});

describe('executeRead — cancellation', () => {
  it('rejects immediately when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const operation = jest.fn(async () => 'never');
    const rejection = (await executeRead(operation, {
      signal: controller.signal,
      retry: NO_AUTO_RETRY_POLICY,
    }).catch((error: unknown) => error)) as { code: string };
    expect(rejection.code).toBe('cancelled');
    expect(operation).not.toHaveBeenCalled();
  });

  it('rejects promptly when the signal aborts mid-flight', async () => {
    const controller = new AbortController();
    const startedAt = Date.now();
    setTimeout(() => controller.abort(), 20);
    const rejection = (await executeRead(
      (attemptSignal) => abortableDelay(5_000, attemptSignal),
      { signal: controller.signal, retry: NO_AUTO_RETRY_POLICY },
    ).catch((error: unknown) => error)) as { code: string };
    expect(rejection.code).toBe('cancelled');
    expect(Date.now() - startedAt).toBeLessThan(2_000);
  });

  it('never retries a cancellation, even when the policy lists it', async () => {
    const controller = new AbortController();
    controller.abort();
    const counter: number[] = [];
    const rejection = (await executeRead(failingOperation('cancelled', counter), {
      signal: controller.signal,
      retry: { ...FAST_RETRY, retryOn: ['cancelled'] },
    }).catch((error: unknown) => error)) as { code: string };
    expect(rejection.code).toBe('cancelled');
    expect(counter).toHaveLength(0);
  });
});

describe('executeRead — bounded retries with jitter', () => {
  it('retries retryable codes up to maxAttempts and then gives up', async () => {
    const counter: number[] = [];
    const rejection = (await executeRead(failingOperation('upstream_error', counter), {
      retry: FAST_RETRY,
    }).catch((error: unknown) => error)) as { code: string };
    expect(rejection.code).toBe('upstream_error');
    expect(counter).toHaveLength(3);
  });

  it('stops retrying as soon as an attempt succeeds', async () => {
    const counter: number[] = [];
    const operation = async (): Promise<string> => {
      counter.push(1);
      if (counter.length < 3) throw createProviderError('upstream_error', 'simulated');
      return 'recovered';
    };
    await expect(executeRead(operation, { retry: FAST_RETRY })).resolves.toBe(
      'recovered',
    );
    expect(counter).toHaveLength(3);
  });

  it('does not retry non-retryable codes', async () => {
    const counter: number[] = [];
    const rejection = (await executeRead(failingOperation('invalid_response', counter), {
      retry: FAST_RETRY,
    }).catch((error: unknown) => error)) as { code: string };
    expect(rejection.code).toBe('invalid_response');
    expect(counter).toHaveLength(1);
  });

  it('NO_AUTO_RETRY_POLICY performs exactly one attempt', async () => {
    const counter: number[] = [];
    await executeRead(failingOperation('upstream_error', counter), {
      retry: NO_AUTO_RETRY_POLICY,
    }).catch(() => undefined);
    expect(counter).toHaveLength(1);
    expect(NO_AUTO_RETRY_POLICY.maxAttempts).toBe(1);
  });

  it('applies exponential backoff with the configured jitter', () => {
    const policy: RetryPolicy = {
      maxAttempts: 5,
      baseDelayMs: 100,
      maxDelayMs: 1_000,
      jitter: 'none',
      retryOn: [],
    };
    expect(computeBackoffDelayMs(policy, 1, () => 0.5)).toBe(100);
    expect(computeBackoffDelayMs(policy, 2, () => 0.5)).toBe(200);
    expect(computeBackoffDelayMs(policy, 3, () => 0.5)).toBe(400);
    expect(computeBackoffDelayMs(policy, 5, () => 0.5)).toBe(1_000); // capped
    // Deterministic injected randomness for the jittered modes:
    expect(computeBackoffDelayMs({ ...policy, jitter: 'full' }, 2, () => 0.5)).toBe(100);
    expect(computeBackoffDelayMs({ ...policy, jitter: 'equal' }, 2, () => 0)).toBe(100);
  });

  it('keeps the DEC-007 default read policy as specified', () => {
    expect(DEFAULT_READ_RETRY_POLICY).toEqual({
      maxAttempts: 3,
      baseDelayMs: 300,
      maxDelayMs: 5_000,
      jitter: 'full',
      retryOn: ['timeout', 'network', 'upstream_error', 'rate_limited'],
    });
  });
});

describe('abortableDelay', () => {
  it('resolves after the delay when not aborted', async () => {
    await expect(abortableDelay(1)).resolves.toBeUndefined();
  });

  it('rejects with cancelled when aborted before/while waiting', async () => {
    const controller = new AbortController();
    const pending = abortableDelay(5_000, controller.signal).catch(
      (error: unknown) => error,
    );
    controller.abort();
    const rejection = (await pending) as { code: string };
    expect(rejection.code).toBe('cancelled');
  });
});
