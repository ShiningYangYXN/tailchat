import React from 'react';
import { Select, Switch } from 'antd';
import {
  GROUP_PANEL_SLOW_MODE_INTERVALS,
  GROUP_PANEL_SLOW_MODE_MAX_MESSAGES,
  isGroupPanelSlowMode,
  t,
} from 'tailchat-shared';
import type { GroupPanelSlowMode } from 'tailchat-shared';
import { Icon } from 'tailchat-design';
import type { FastifyFormFieldProps } from 'tailchat-design';

const DEFAULT_SLOW_MODE: GroupPanelSlowMode = {
  intervalSeconds: 60,
  maxMessages: 1,
};

function formatInterval(intervalSeconds: number): string {
  return t('{{minutes}} 分钟', {
    minutes: intervalSeconds / 60,
  });
}

export const SlowModeSettings: React.FC<FastifyFormFieldProps> = React.memo(
  (props) => {
    const value = isGroupPanelSlowMode(props.value)
      ? props.value
      : DEFAULT_SLOW_MODE;
    const enabled = isGroupPanelSlowMode(props.value);

    const updateValue = (patch: Partial<GroupPanelSlowMode>) => {
      props.onChange({
        ...value,
        ...patch,
      });
    };

    return (
      <div className="rounded-lg border border-gray-200 px-4 py-3 dark:border-gray-600">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 gap-3">
            <Icon
              icon="mdi:timer-sand"
              className="mt-0.5 flex-shrink-0 text-xl text-gray-500 dark:text-gray-300"
            />
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {t('限制成员的发送频率')}
              </div>
              <div className="mt-0.5 text-xs leading-5 text-gray-500 dark:text-gray-300">
                {t('每位成员独立计数，系统消息和机器人不受限制')}
              </div>
            </div>
          </div>

          <Switch
            checked={enabled}
            aria-label={t('开启慢速模式')}
            onChange={(checked) =>
              props.onChange(checked ? DEFAULT_SLOW_MODE : undefined)
            }
          />
        </div>

        {enabled && (
          <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-600">
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
              <span>{t('每')}</span>
              <Select<number>
                value={value.intervalSeconds}
                style={{ width: 116 }}
                options={GROUP_PANEL_SLOW_MODE_INTERVALS.map((seconds) => ({
                  label: formatInterval(seconds),
                  value: seconds,
                }))}
                onChange={(intervalSeconds) => updateValue({ intervalSeconds })}
              />
              <span>{t('内最多发送')}</span>
              <Select<number>
                value={value.maxMessages}
                style={{ width: 88 }}
                options={GROUP_PANEL_SLOW_MODE_MAX_MESSAGES.map((count) => ({
                  label: count,
                  value: count,
                }))}
                onChange={(maxMessages) => updateValue({ maxMessages })}
              />
              <span>{t('条消息')}</span>
            </div>
            <div className="mt-2 text-xs leading-5 text-gray-500 dark:text-gray-300">
              {t('达到上限后，将从最早一条消息的发送时间开始倒计时')}
            </div>
          </div>
        )}
      </div>
    );
  }
);
SlowModeSettings.displayName = 'SlowModeSettings';
