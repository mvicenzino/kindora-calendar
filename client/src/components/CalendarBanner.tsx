export default function CalendarBanner() {
  return (
    <div className="w-full">
      {/* Ring binding */}
      <div className="flex justify-center gap-12 py-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="relative">
            {/* Outer ring */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-b from-gray-700 to-gray-800 border-2 border-gray-600 shadow-lg">
              {/* Inner ring hole */}
              <div className="absolute inset-2 rounded-full bg-gradient-to-br from-[#4A5A6A] via-[#5A6A7A] to-[#6A7A8A]" />
              {/* Highlight */}
              <div className="absolute top-1 left-1 w-2 h-2 rounded-full bg-gray-500/40" />
            </div>
          </div>
        ))}
      </div>
      
      {/* Top edge of calendar page */}
      <div className="w-full h-3 bg-gradient-to-b from-gray-700 to-gray-800 border-t-2 border-gray-600 shadow-md" />
    </div>
  );
}
