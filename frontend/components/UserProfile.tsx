import { useState } from 'react';
import { User as UserIcon, Mail, MapPin, Edit } from 'lucide-react';

interface Props {
  user: {
    username: string;
    email?: string;
    avatar?: string;
    bio?: string;
    country?: string;
    status?: string;
  };
  isOwnProfile: boolean;
  onUpdate?: (updates: any) => void;
}

export default function UserProfile({ user, isOwnProfile, onUpdate }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState(user.bio || '');
  const [status, setStatus] = useState(user.status || 'online');

  const handleSave = () => {
    onUpdate?.({ bio, status });
    setIsEditing(false);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md">
      <div className="flex items-center gap-4 mb-4">
        {user.avatar ? (
          <img src={user.avatar} className="w-20 h-20 rounded-full" />
        ) : (
          <div className="w-20 h-20 rounded-full bg-blue-500 flex items-center justify-center text-white text-2xl">
            {user.username.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <h2 className="text-xl font-bold dark:text-white">{user.username}</h2>
          <p className="text-sm text-gray-500">{user.email}</p>
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder="Bio"
            className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
            rows={3}
          />
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
          >
            <option value="online">🟢 Online</option>
            <option value="away">🟡 Away</option>
            <option value="busy">🔴 Busy</option>
            <option value="offline">⚫ Offline</option>
          </select>
          <div className="flex gap-2">
            <button onClick={handleSave} className="px-4 py-2 bg-blue-500 text-white rounded">
              Save
            </button>
            <button onClick={() => setIsEditing(false)} className="px-4 py-2 bg-gray-300 rounded">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-gray-700 dark:text-gray-300 mb-2">{bio || 'No bio yet'}</p>
          <p className="text-sm text-gray-500">Status: {status}</p>
          {isOwnProfile && (
            <button
              onClick={() => setIsEditing(true)}
              className="mt-3 px-4 py-2 bg-blue-500 text-white rounded flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Edit Profile
            </button>
          )}
        </div>
      )}
    </div>
  );
}