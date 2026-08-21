import {
  getMessageTextDecorators,
  pluginChatInputButtons,
} from '@/plugin/common';
import { Tooltip } from 'antd';
import { isEnterHotkey } from '@/utils/hot-key';
import React, { useRef, useState } from 'react';
import { ChatInputAddon } from './Addon';
import { ClipboardHelper } from './clipboard-helper';
import { ChatInputActionContext, useChatInputMentionsContext } from './context';
import { uploadMessageImage } from './utils';
import { ChatInputBoxInput } from './input';
import {
  getCachedUserInfo,
  isValidStr,
  t,
  useEvent,
  useSharedEventHandler,
} from 'tailchat-shared';
import type {
  GroupPanelSlowMode,
  SendMessagePayloadMeta,
} from 'tailchat-shared';
import { ChatInputEmotion } from './Emotion';
import _uniq from 'lodash/uniq';
import { ChatDropArea } from './ChatDropArea';
import { Icon } from 'tailchat-design';
import { usePasteHandler } from './usePasteHandler';
import { useSlowModeStatus } from './useSlowModeStatus';

interface ChatInputBoxProps {
  converseId: string;
  groupId?: string;
  slowMode?: GroupPanelSlowMode;
  onSendMsg: (msg: string, meta?: SendMessagePayloadMeta) => Promise<void>;
}

function formatCountdown(durationMs: number): string {
  const totalSeconds = Math.max(Math.ceil(durationMs / 1000), 0);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts = [minutes, seconds].map((part) => String(part).padStart(2, '0'));

  return hours > 0 ? [hours, ...parts].join(':') : parts.join(':');
}

function formatInterval(intervalSeconds: number): string {
  return t('{{minutes}} 分钟', {
    minutes: intervalSeconds / 60,
  });
}
/**
 * 通用聊天输入框
 */
export const ChatInputBox: React.FC<ChatInputBoxProps> = React.memo((props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [mentions, setMentions] = useState<string[]>([]);
  const { disabled } = useChatInputMentionsContext();
  const { runPasteHandlers, pasteHandlerContainer } = usePasteHandler();
  const {
    status: slowModeStatus,
    blocked: slowModeBlocked,
    remainingMs,
  } = useSlowModeStatus({
    converseId: props.converseId,
    groupId: props.groupId,
    slowMode: props.slowMode,
  });
  const sendBlocked = Boolean(disabled) || slowModeBlocked;
  const slowModeCountdownText = t('慢速模式 · 还需等待 {{countdown}}', {
    countdown: formatCountdown(remainingMs),
  });

  const sendMessage = useEvent(
    async (msg: string, meta?: SendMessagePayloadMeta) => {
      if (sendBlocked) {
        return;
      }

      try {
        await props.onSendMsg(msg, meta);
        setMessage('');
      } catch {
        // 保留草稿，让用户可以在限制解除或网络恢复后直接重试
      } finally {
        inputRef.current?.focus();
      }
    }
  );

  const handleSendMsg = useEvent(() => {
    void sendMessage(message, {
      mentions: _uniq(mentions), // 发送前去重
    });
  });

  const appendMsg = useEvent((append: string) => {
    setMessage(message + append);

    inputRef.current?.focus();
  });

  const handleKeyDown = useEvent(
    (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (isEnterHotkey(e.nativeEvent)) {
        e.preventDefault();
        handleSendMsg();
      }
    }
  );

  const handlePaste = useEvent(
    (e: React.ClipboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      const el: HTMLTextAreaElement | HTMLInputElement = e.currentTarget;
      const helper = new ClipboardHelper(e);

      if (!el.value) {
        // 当没有任何输入内容时才会执行handler
        const handlers = helper.matchPasteHandler();
        if (handlers.length > 0) {
          // 弹出选择框
          runPasteHandlers(handlers, e, {
            sendMessage,
            applyMessage: setMessage,
          });
          return;
        }
      }

      // If not match any paste handler or not paste without any input, fallback to image paste checker
      const image = helper.hasImage();
      if (image) {
        if (slowModeBlocked) {
          e.preventDefault();
          return;
        }
        // 上传图片
        e.preventDefault();
        uploadMessageImage(image).then(({ url, width, height }) => {
          void sendMessage(
            getMessageTextDecorators().image(url, { width, height })
          );
        });
      }
    }
  );

  useSharedEventHandler('replyMessage', async (payload) => {
    if (inputRef.current) {
      inputRef.current.focus();
      if (payload && isValidStr(payload?.author)) {
        const userInfo = await getCachedUserInfo(payload.author);
        setMessage(
          `${getMessageTextDecorators().mention(
            payload.author,
            userInfo.nickname
          )} ${message}`
        );
      }
    }
  });

  return (
    <ChatInputActionContext.Provider
      value={{
        message,
        setMessage,
        sendMsg: sendMessage,
        appendMsg,
      }}
    >
      <div className="px-4 py-2">
        {slowModeStatus.enabled && !slowModeStatus.bypassed && (
          <Tooltip title={slowModeBlocked ? slowModeCountdownText : undefined}>
            <span
              className={`mb-1.5 inline-flex items-center gap-1.5 text-xs ${
                slowModeBlocked
                  ? 'cursor-help text-amber-600 dark:text-amber-300'
                  : 'text-gray-500 dark:text-gray-300'
              }`}
              aria-label={slowModeBlocked ? slowModeCountdownText : undefined}
              tabIndex={slowModeBlocked ? 0 : undefined}
            >
              <Icon icon="mdi:timer-sand" className="flex-shrink-0 text-sm" />
              {slowModeBlocked
                ? t('正在限速中')
                : t(
                    '慢速模式 · 每 {{interval}} 最多 {{maxMessages}} 条 · 还可发送 {{remaining}} 条',
                    {
                      interval: formatInterval(slowModeStatus.intervalSeconds),
                      maxMessages: slowModeStatus.maxMessages,
                      remaining: slowModeStatus.remaining,
                    }
                  )}
            </span>
          </Tooltip>
        )}
        <div className="bg-white dark:bg-gray-600 flex rounded-md items-center relative">
          {/* This w-0 is magic to ensure show mention and long text */}
          <div className="flex-1 w-0">
            <ChatInputBoxInput
              inputRef={inputRef}
              value={message}
              onChange={(message, mentions) => {
                setMessage(message);
                setMentions(mentions);
              }}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
            />
          </div>

          {pasteHandlerContainer}

          {!disabled && (
            <div className="px-2 flex space-x-1">
              {!slowModeBlocked &&
                pluginChatInputButtons.map((item, i) =>
                  React.cloneElement(item.render(), {
                    key: `plugin-chatinput-btn#${i}`,
                  })
                )}

              <ChatInputEmotion />

              {message ? (
                <Icon
                  icon="mdi:send-circle-outline"
                  className={`text-2xl ${
                    slowModeBlocked
                      ? 'cursor-not-allowed text-gray-400'
                      : 'cursor-pointer'
                  }`}
                  onClick={slowModeBlocked ? undefined : handleSendMsg}
                />
              ) : slowModeBlocked ? (
                <Icon
                  icon="mdi:timer-sand"
                  className="text-2xl text-gray-400"
                />
              ) : (
                <ChatInputAddon />
              )}
            </div>
          )}
        </div>
      </div>

      {!sendBlocked && <ChatDropArea />}
    </ChatInputActionContext.Provider>
  );
});
ChatInputBox.displayName = 'ChatInputBox';
