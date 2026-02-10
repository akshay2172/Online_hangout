import { useState } from 'react';
import { Lock, Globe, Plus } from 'lucide-react';

export default function RoomManager({ onCreateRoom }: any) {
  const [showCreate, setShowCreate] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  const handleCreate = () => {
    onCreateRoom({ name: roomName, isPrivate });
    setShowCreate(false);
    setRoomName('');
  };

  return (
    <div className="p-4">
      <button
        onClick={() => setShowCreate(true)}
        className="w-full py-2 bg-blue-500 text-white rounded flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Create Room
      </button>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full">
            <h3 className="text-xl font-bold mb-4 dark:text-white">Create New Room</h3>
            <input
              value={roomName}
              onChange={e => setRoomName(e.target.value)}
              placeholder="Room name"
              className="w-full p-2 border rounded mb-3 dark:bg-gray-700 dark:text-white"
            />
            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={e => setIsPrivate(e.target.checked)}
                className="w-4 h-4"
              />
              <Lock className="w-4 h-4" />
              <span className="text-sm dark:text-white">Private Room</span>
            </div>
            <div className="flex gap-2">
              <button onClick={handleCreate} className="flex-1 py-2 bg-blue-500 text-white rounded">
                Create
              </button>
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2 bg-gray-300 rounded">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}