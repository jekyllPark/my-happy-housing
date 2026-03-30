'use client';

import type { HousingComplex } from '@/types/housing';

interface HousingMarkerProps {
  complex: HousingComplex;
  isSelected?: boolean;
  onClick?: () => void;
}

const colorMap: Record<string, string> = {
  happy: '#4CAF50',
  national: '#2196F3',
  permanent: '#9C27B0',
  purchase: '#FF9800',
  jeonse: '#00BCD4',
  public_support: '#795548',
};

export function HousingMarker({
  complex,
  isSelected = false,
  onClick,
}: HousingMarkerProps) {
  const color = colorMap[complex.housingType] || '#4CAF50';

  // This component is designed to work with Kakao Maps SDK
  // The actual rendering happens within the map context
  // Here we define the marker properties and styling

  return (
    <div
      onClick={onClick}
      style={{
        width: isSelected ? '40px' : '30px',
        height: isSelected ? '40px' : '30px',
        backgroundColor: color,
        borderRadius: '50%',
        border: isSelected ? '3px solid white' : '2px solid white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        fontSize: '12px',
        fontWeight: 'bold',
        color: 'white',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
        transition: 'all 0.2s ease',
      }}
      title={complex.name}
    >
      {/* Icon or initial letter could go here */}
    </div>
  );
}
