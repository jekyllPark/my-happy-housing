import { formatDeposit, formatRent } from '@/lib/format';

interface PriceDisplayProps {
  type: 'deposit' | 'rent';
  amount: number;
  size?: 'sm' | 'md' | 'lg';
}

export function PriceDisplay({ type, amount, size = 'md' }: PriceDisplayProps) {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  const formatted = type === 'deposit' ? formatDeposit(amount) : formatRent(amount);

  return (
    <div className={`font-semibold text-gray-900 ${sizeClasses[size]}`}>
      {formatted}
    </div>
  );
}
