interface EventThumbnailProps {
  photoUrl?: string;
  className?: string;
}

export default function EventThumbnail({ photoUrl, className = "" }: EventThumbnailProps) {
  if (!photoUrl) return null;

  return (
    <div 
      className={`flex-shrink-0 w-8 h-8 rounded-sm overflow-hidden border-2 border-white/50 shadow-md ${className}`}
      style={{ transform: 'rotate(-3deg)' }}
    >
      <img 
        src={photoUrl} 
        alt="" 
        className="w-full h-full object-cover"
      />
    </div>
  );
}
