import { useState } from 'react';
import { MessageCircle } from 'lucide-react';

export default function DirectMessages({ users, onStartDM }: any) {
  const [search, setSearch] = useState('');

  const filteredUsers = users.filter((u: any) => 
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-bold mb-3 dark:text-white">Direct Messages</h3>
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search users..."
        className="w-full p-2 border rounded mb-3 dark:bg-gray-700 dark:text-white"
      />
      <div className="space-y-2">
        {filteredUsers.map((user: any) => (
          <button
            key={user.name}
            onClick={() => onStartDM(user.name)}
            className="w-full p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2"
          >
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white">
              {user.name.charAt(0)}
            </div>
            <span className="dark:text-white">{user.name}</span>
            <MessageCircle className="w-4 h-4 ml-auto text-gray-400" />
          </button>
        ))}
      </div>
    </div>
  );
}