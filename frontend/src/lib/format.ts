/**
 * Format price in won to display in 만원 (10,000 won)
 * @param won Price in won
 * @returns Formatted string like "2,800만원"
 */
export function formatDeposit(won: number): string {
  if (!won || isNaN(won)) return '0원';
  const manWon = Math.floor(won / 10000);
  return `${manWon.toLocaleString('ko-KR')}만원`;
}

/**
 * Format rent price in won
 * @param won Price in won
 * @returns Formatted string like "15만원" or "150,000원"
 */
export function formatRent(won: number): string {
  if (!won || isNaN(won)) return '0원';

  // If it's a multiple of 10,000 (만원), display in 만원
  if (won % 10000 === 0) {
    const manWon = won / 10000;
    return `${manWon.toLocaleString('ko-KR')}만원`;
  }

  // Otherwise display in won
  return `${won.toLocaleString('ko-KR')}원`;
}

/**
 * Format area in square meters
 * @param m2 Area in square meters
 * @returns Formatted string like "84m²"
 */
export function formatArea(m2: number): string {
  if (!m2 || isNaN(m2)) return '0m²';
  return `${m2.toLocaleString('ko-KR')}m²`;
}

/**
 * Format date string to Korean format
 * @param dateString ISO date string
 * @returns Formatted string like "2024년 3월 15일"
 */
export function formatDate(dateString: string): string {
  if (!dateString) return '';

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  return `${year}년 ${month}월 ${day}일`;
}

/**
 * Format date to show time as well
 * @param dateString ISO date string
 * @returns Formatted string like "2024년 3월 15일 14:30"
 */
export function formatDateTime(dateString: string): string {
  if (!dateString) return '';

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}년 ${month}월 ${day}일 ${hours}:${minutes}`;
}

/**
 * Get label for housing type
 */
export function getHousingTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    happy: '행복주택',
    national: '국민임대',
    permanent: '영구임대',
    purchase: '매입임대',
    jeonse: '전세임대',
    public_support: '공공지원민간임대',
    public_sale: '공공분양',
    private_sale: '민간분양',
  };
  return labels[type] || '유형없음';
}

/**
 * Get label for target group
 */
export function getTargetGroupLabel(group: string): string {
  const labels: Record<string, string> = {
    all: '전체',
    youth: '청년',
    newlywed: '신혼부부',
    general: '일반',
    student: '대학생',
    elderly: '고령자',
    beneficiary: '수급자',
  };
  return labels[group] || group;
}

/**
 * Get label for recruitment status
 */
export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    recruiting: '모집 중',
    scheduled: '예정',
    completed: '완료',
    canceled: '취소',
  };
  return labels[status] || status;
}

/**
 * Get label for sort option
 */
export function getSortLabel(sort: string): string {
  const labels: Record<string, string> = {
    distance: '거리 가까운 순',
    'deposit-asc': '보증금 낮은 순',
    'deposit-desc': '보증금 높은 순',
    'rent-asc': '월임대료 낮은 순',
    'rent-desc': '월임대료 높은 순',
    'area-asc': '면적 작은 순',
    'area-desc': '면적 큰 순',
    recent: '최신 순',
    'min-conversion-asc': '최소전환 낮은 순',
    'min-conversion-desc': '최소전환 높은 순',
    'max-conversion-asc': '최대전환 낮은 순',
    'max-conversion-desc': '최대전환 높은 순',
  };
  return labels[sort] || sort;
}
