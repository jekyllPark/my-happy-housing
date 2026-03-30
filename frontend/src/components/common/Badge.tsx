import type { HousingType, RecruitmentStatus } from '@/types/housing';

interface BadgeProps {
  type: HousingType | RecruitmentStatus;
  children: React.ReactNode;
  variant?: 'solid' | 'outline';
}

const colorMap: Record<string, { bg: string; text: string; border?: string }> = {
  // Housing Types
  happy: { bg: 'bg-housing-happy/10', text: 'text-housing-happy', border: 'border-housing-happy' },
  national: { bg: 'bg-housing-national/10', text: 'text-housing-national', border: 'border-housing-national' },
  permanent: { bg: 'bg-housing-permanent/10', text: 'text-housing-permanent', border: 'border-housing-permanent' },
  purchase: { bg: 'bg-housing-purchase/10', text: 'text-housing-purchase', border: 'border-housing-purchase' },
  jeonse: { bg: 'bg-housing-jeonse/10', text: 'text-housing-jeonse', border: 'border-housing-jeonse' },
  public_support: { bg: 'bg-housing-public-support/10', text: 'text-housing-public-support', border: 'border-housing-public-support' },
  // Status
  recruiting: { bg: 'bg-green-100', text: 'text-green-800' },
  scheduled: { bg: 'bg-blue-100', text: 'text-blue-800' },
  completed: { bg: 'bg-gray-100', text: 'text-gray-800' },
  canceled: { bg: 'bg-red-100', text: 'text-red-800' },
};

export function Badge({ type, children, variant = 'solid' }: BadgeProps) {
  const colors = colorMap[type] || colorMap['happy'];

  if (variant === 'outline') {
    return (
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border ${colors.text} ${colors.border} border`}
      >
        {children}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${colors.bg} ${colors.text}`}
    >
      {children}
    </span>
  );
}
