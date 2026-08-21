import { useCallback, useEffect, useState } from 'react';
import {
  getSlowModeStatus,
  useInterval,
  useSharedEventHandler,
} from 'tailchat-shared';
import type { GroupPanelSlowMode, SlowModeStatus } from 'tailchat-shared';

interface UseSlowModeStatusParams {
  groupId?: string;
  converseId: string;
  slowMode?: GroupPanelSlowMode;
}

function createFallbackStatus(slowMode?: GroupPanelSlowMode): SlowModeStatus {
  if (!slowMode) {
    return { enabled: false };
  }

  return {
    enabled: true,
    bypassed: false,
    ...slowMode,
    remaining: slowMode.maxMessages,
  };
}

export function useSlowModeStatus({
  groupId,
  converseId,
  slowMode,
}: UseSlowModeStatusParams) {
  const [status, setStatus] = useState<SlowModeStatus>(() =>
    createFallbackStatus(slowMode)
  );
  const [now, setNow] = useState(Date.now());

  const refresh = useCallback(async () => {
    if (!groupId || !slowMode) {
      setStatus({ enabled: false });
      return;
    }

    try {
      setStatus(await getSlowModeStatus(groupId, converseId));
      setNow(Date.now());
    } catch {
      setStatus((current) =>
        current.enabled ? current : createFallbackStatus(slowMode)
      );
    }
  }, [converseId, groupId, slowMode?.intervalSeconds, slowMode?.maxMessages]);

  useEffect(() => {
    setStatus(createFallbackStatus(slowMode));
    void refresh();
  }, [refresh]);

  useSharedEventHandler('sendMessage', (payload) => {
    if (payload.converseId === converseId) {
      void refresh();
    }
  });

  useSharedEventHandler('slowModeLimited', (payload) => {
    if (payload.converseId !== converseId || !slowMode) {
      return;
    }

    setStatus({
      enabled: true,
      bypassed: false,
      ...slowMode,
      remaining: 0,
      resetAt: payload.resetAt,
    });
    setNow(Date.now());
  });

  const resetAt =
    status.enabled && status.resetAt
      ? new Date(status.resetAt).valueOf()
      : undefined;
  const remainingMs = Math.max((resetAt ?? now) - now, 0);
  const blocked =
    status.enabled &&
    !status.bypassed &&
    status.remaining === 0 &&
    remainingMs > 0;
  const hasPendingReset =
    status.enabled && !status.bypassed && resetAt !== undefined;

  useInterval(() => setNow(Date.now()), hasPendingReset ? 1000 : undefined);

  useEffect(() => {
    if (status.enabled && resetAt !== undefined && now >= resetAt) {
      if (status.remaining === 0) {
        setStatus((current) =>
          current.enabled
            ? {
                ...current,
                remaining: 1,
                resetAt: undefined,
              }
            : current
        );
      }
      void refresh();
    }
  }, [now, refresh, resetAt, status]);

  return {
    status,
    blocked,
    remainingMs,
  };
}
