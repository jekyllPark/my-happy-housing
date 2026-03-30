import { SearchX } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
}

export function EmptyState({ title, description, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      {icon || <SearchX className="w-16 h-16 text-gray-300 mb-4" />}
      <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">
        {title}
      </h3>
      <p className="text-gray-600 text-center max-w-sm">{description}</p>
    </div>
  );
}
