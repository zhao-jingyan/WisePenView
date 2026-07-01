import clsx from 'clsx';
import type { CSSProperties } from 'react';

import type { IconTextProps } from './index.type';
import styles from './style.module.less';

const toCssSize = (value: CSSProperties['width']) =>
  typeof value === 'number' ? `${value}px` : value;

/**
 * IconText 统一承载“图标 + 文本”的 inline 组合。
 *
 * 关键约束：
 * - 根节点默认 span，避免嵌入 button、menu、breadcrumb 时产生非法块级嵌套。
 * - icon 使用不可收缩的等宽槽，防止窄容器内 SVG 被 flex 压扁。
 * - text 使用 min-width: 0，配合 ellipsis/block 可在受限宽度内正确省略。
 */
function IconText({
  as,
  icon,
  children,
  iconPosition = 'start',
  iconSize = '1em',
  gap = '0.5em',
  lineHeight = 1,
  iconOffsetY = 0,
  textOffsetY = 0,
  align = 'center',
  wrap = false,
  ellipsis = false,
  block = false,
  className,
  style,
  iconClassName,
  textClassName,
  ref,
  ...restProps
}: IconTextProps) {
  const Component = as ?? 'span';
  const cssVars = {
    '--icon-text-gap': toCssSize(gap),
    '--icon-text-icon-size': toCssSize(iconSize),
    '--icon-text-line-height': lineHeight,
    '--icon-text-icon-offset-y': toCssSize(iconOffsetY),
    '--icon-text-text-offset-y': toCssSize(textOffsetY),
  } as CSSProperties;

  return (
    <Component
      ref={ref}
      className={clsx(
        styles.root,
        block && styles.block,
        align === 'baseline' && styles.baseline,
        wrap ? styles.wrap : styles.nowrap,
        ellipsis && styles.ellipsis,
        iconPosition === 'end' && styles.end,
        className
      )}
      style={{ ...cssVars, ...style }}
      {...restProps}
    >
      {icon ? (
        <span className={clsx(styles.icon, iconClassName)} aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {children ? <span className={clsx(styles.text, textClassName)}>{children}</span> : null}
    </Component>
  );
}

export default IconText;
