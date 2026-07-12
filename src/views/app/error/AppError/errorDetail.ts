import { isRouteErrorResponse } from 'react-router-dom';

import { isWisePenError } from '@/utils/error';

const getStackLocation = (stack: string | undefined): string | undefined => {
  if (!stack) {
    return undefined;
  }

  const frame = stack
    .split('\n')
    .slice(1)
    .map((line) => line.trim())
    .find(Boolean);

  if (!frame) {
    return undefined;
  }

  return frame.replace(/https?:\/\/[^/]+\//g, '').replace(/^at\s+/, '');
};

const serializeValue = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }

  const seen = new WeakSet<object>();

  try {
    const serialized = JSON.stringify(
      value,
      (_key, nestedValue: unknown) => {
        if (nestedValue instanceof Error) {
          return {
            name: nestedValue.name,
            message: nestedValue.message,
            stack: nestedValue.stack,
          };
        }

        if (typeof nestedValue === 'object' && nestedValue !== null) {
          if (seen.has(nestedValue)) {
            return '[Circular]';
          }
          seen.add(nestedValue);
        }

        return nestedValue;
      },
      2
    );
    return serialized ?? String(value);
  } catch {
    return String(value);
  }
};

const appendError = (
  lines: string[],
  error: Error,
  heading?: string,
  seenErrors = new WeakSet<Error>()
) => {
  if (heading) {
    lines.push('', `${heading}:`);
  }

  if (seenErrors.has(error)) {
    lines.push('[Circular Error]');
    return;
  }
  seenErrors.add(error);

  lines.push(`错误类型: ${error.name || 'Error'}`, `错误消息: ${error.message}`);

  const stackLocation = getStackLocation(error.stack);
  if (stackLocation) {
    lines.push(`报错位置: ${stackLocation}`);
  }

  if (isWisePenError(error)) {
    lines.push(`错误代码: ${error.code}`, `错误来源: ${error.source}`);

    if (error.serverMsg && error.serverMsg !== error.message) {
      lines.push(`服务端信息: ${error.serverMsg}`);
    }

    if (error.meta) {
      lines.push(`附加信息: ${serializeValue(error.meta)}`);
    }
  }

  if (error.stack) {
    lines.push('', '调用栈:', error.stack);
  }

  if (error.cause instanceof Error) {
    appendError(lines, error.cause, '原始异常', seenErrors);
  } else if (error.cause !== undefined) {
    lines.push('', '原始异常:', serializeValue(error.cause));
  }
};

export const buildErrorDetail = (error: unknown, pathname: string): string => {
  const lines = [`页面模块: ${pathname}`];

  if (isRouteErrorResponse(error)) {
    lines.push(
      '错误类型: RouteErrorResponse',
      `HTTP 状态: ${error.status}${error.statusText ? ` ${error.statusText}` : ''}`
    );

    if (error.data instanceof Error) {
      appendError(lines, error.data, '响应异常');
    } else if (error.data !== undefined) {
      lines.push(`响应数据: ${serializeValue(error.data)}`);
    }

    return lines.join('\n');
  }

  if (error instanceof Error) {
    appendError(lines, error);
    return lines.join('\n');
  }

  lines.push('错误类型: Unknown', `错误内容: ${serializeValue(error)}`);
  return lines.join('\n');
};
