import { Button, Dropdown } from '@heroui/react';
import { ChevronDown, GitBranch } from 'lucide-react';

import type { SkillVersionDropdownProps } from './index.type';

function SkillVersionDropdown({
  items,
  disabledKeys,
  formatVersion,
  onSelect,
}: SkillVersionDropdownProps) {
  const currentItem = items.find((item) => item.current) ?? items[0];

  return (
    <Dropdown>
      <Dropdown.Trigger>
        <Button variant="secondary">
          <GitBranch size={16} />
          <span>{currentItem ? formatVersion(currentItem.version) : '-'}</span>
          <ChevronDown size={10} />
        </Button>
      </Dropdown.Trigger>
      <Dropdown.Popover>
        <Dropdown.Menu
          disabledKeys={disabledKeys}
          onAction={(key) => {
            const item = items.find((versionItem) => versionItem.key === key);
            if (item) onSelect?.(item.version);
          }}
        >
          {items.map((item) => (
            <Dropdown.Item key={item.key}>
              {formatVersion(item.version)}
              {item.current ? ' (当前)' : ''}
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}

export default SkillVersionDropdown;
