export interface RatingProps {
  value?: number;
  maxValue?: number;
  isDisabled?: boolean;
  ariaLabel?: string;
  size?: 'sm' | 'md';
  className?: string;
  onValueChange?: (value: number) => void;
}
