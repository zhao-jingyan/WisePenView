import { RESOURCE_TYPE } from '@/domains/Resource/enum';
import { RiFileTextLine, RiPenNibFill } from 'react-icons/ri';
import type { FileTypeIconProps } from './index.type';

/** 按资源类型展示图标：NOTE 为笔，FILE/MD 等为文件 */
function FileTypeIcon({
  resourceType,
  size = 18,
  color = 'var(--ant-color-text-secondary)',
}: FileTypeIconProps) {
  if (resourceType === RESOURCE_TYPE.NOTE) {
    return <RiPenNibFill size={size} color={color} />;
  }
  return <RiFileTextLine size={size} color={color} />;
}

export default FileTypeIcon;
