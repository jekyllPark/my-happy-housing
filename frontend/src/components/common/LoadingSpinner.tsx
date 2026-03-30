export function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="relative w-12 h-12 mb-4">
        <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
        <div
          className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"
          style={{
            animation: 'spin 1s linear infinite',
          }}
        ></div>
      </div>
      <p className="text-gray-600 font-medium">로딩 중...</p>

      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
