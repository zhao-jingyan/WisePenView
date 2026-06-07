import type { Group } from '@/domains/Group';

export interface GroupCardProps {
  group: Group;
  onClick?: (group: Group) => void;
}
