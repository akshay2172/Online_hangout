import { useEffect } from "react";

interface Props {
  text: string;
  onClose: () => void;
}

export default function UserToast({ text, onClose }: Props) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg animate-slide-in-right flex items-center gap-2 max-w-sm">
      <span className="text-lg">{text.includes('🟢') ? '👋' : '👋'}</span>
      <span className="flex-1">{text}</span>
      <button 
        onClick={onClose}
        className="ml-2 text-gray-400 hover:text-white transition-colors"
      >
        ✕
      </button>
    </div>
  );
}
