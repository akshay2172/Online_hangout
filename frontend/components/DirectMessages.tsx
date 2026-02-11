// frontend/components/DirectMessages.tsx - ENHANCED WITH THEME
import { useState } from 'react';
import { MessageCircle, Search, X, User as UserIcon, MoreVertical, Trash2 } from 'lucide-react';
import { useDarkMode } from '../pages/_app';

interface User {
  name: string;
  avatar?: string;
  status?: 'online' | 'away' | 'busy' | 'offline';
  lastMessage?: string;
  unreadCount?: number;
  lastMessageTime?: string;
}

interface Props {
  users: User[];
  onStartDM: (username: string) => void;
  onDeleteDM?: (username: string) => void;
  currentUser?: string;
}

const getStatusColor = (status?: string) => {
  switch (status) {
    case 'online':
      return 'bg-green-500';
    case 'away':
      return 'bg-yellow-500';
    case 'busy':
      return 'bg-red-500';
    default:
      return 'bg-gray-400';
  }
};

export default function DirectMessages({ users, onStartDM, onDeleteDM, currentUser }: Props) {
  const [search, setSearch] = useState('');
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const { darkMode } = useDarkMode();

  const filteredUsers = users.filter((u: User) => 
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  const formatTime = (timeString?: string) => {
    if (!timeString) return '';
    const date = new Date(timeString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    // Less than 24 hours
    if (diff < 24 * 60 * 60 * 1000) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    // Less than 7 days
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div 
      className="rounded-xl overflow-hidden"
      style={{ 
        backgroundColor: 'var(--bg-primary)',
        border: '1px solid var(--border-color)'
      }}
    >
      {/* Header */}
      <div 
        className="p-4 border-b flex items-center justify-between"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <div className="flex items-center space-x-2">
          <MessageCircle className="w-5 h-5" style={{ color: 'var(--accent-color)' }} />
          <h3 
            className="text-lg font-bold"
            style={{ color: 'var(--text-primary)' }}
          >
            Direct Messages
          </h3>
        </div>
        <span 
          className="text-xs px-2 py-1 rounded-full"
          style={{ 
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-secondary)'
          }}
        >
          {users.length}
        </span>
      </div>

      {/* Search */}
      <div className="p-4">
        <div 
          className="flex items-center space-x-2 px-3 py-2 rounded-lg border"
          style={{ 
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border-color)'
          }}
        >
          <Search className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: 'var(--text-primary)' }}
          />
          {search && (
            <button onClick={() => setSearch('')}>
              <X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            </button>
          )}
        </div>
      </div>

      {/* User List */}
      <div className="max-h-80 overflow-y-auto">
        {filteredUsers.length === 0 ? (
          <div 
            className="text-center py-8 px-4"
            style={{ color: 'var(--text-muted)' }}
          >
            <div className="text-4xl mb-2">💬</div>
            <p className="text-sm">No conversations yet</p>
            <p className="text-xs mt-1">Start a conversation from the user list</p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {filteredUsers.map((user: User) => (
              <div
                key={user.name}
                className="relative group"
              >
                <button
                  onClick={() => onStartDM(user.name)}
                  className="w-full p-3 rounded-lg flex items-center gap-3 transition-all"
                  style={{ 
                    backgroundColor: 'transparent',
                    '--hover-bg': 'var(--bg-secondary)'
                  } as React.CSSProperties}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    {user.avatar ? (
                      <img 
                        src={user.avatar} 
                        alt={user.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: 'var(--accent-color)' }}
                      >
                        <span className="text-white font-medium">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    {/* Status Indicator */}
                    <div 
                      className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 rounded-full ${getStatusColor(user.status)}`}
                      style={{ borderColor: 'var(--bg-primary)' }}
                    />
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between">
                      <span 
                        className="font-medium truncate"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {user.name}
                      </span>
                      {user.lastMessageTime && (
                        <span 
                          className="text-xs"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {formatTime(user.lastMessageTime)}
                        </span>
                      )}
                    </div>
                    {user.lastMessage && (
                      <p 
                        className="text-sm truncate"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {user.lastMessage}
                      </p>
                    )}
                  </div>

                  {/* Unread Badge */}
                  {user.unreadCount && user.unreadCount > 0 && (
                    <span 
                      className="px-2 py-0.5 text-xs rounded-full"
                      style={{ 
                        backgroundColor: 'var(--accent-color)',
                        color: 'white'
                      }}
                    >
                      {user.unreadCount}
                    </span>
                  )}

                  {/* Menu Button */}
                  {onDeleteDM && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(showMenu === user.name ? null : user.name);
                      }}
                      className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ '--hover-bg': 'var(--bg-tertiary)' } as React.CSSProperties}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <MoreVertical className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    </button>
                  )}
                </button>

                {/* Context Menu */}
                {showMenu === user.name && onDeleteDM && (
                  <>
                    <div 
                      className="fixed inset-0 z-10"
                      onClick={() => setShowMenu(null)}
                    />
                    <div 
                      className="absolute right-2 top-10 z-20 rounded-lg shadow-lg border py-1 min-w-[120px]"
                      style={{ 
                        backgroundColor: 'var(--menu-bg)',
                        borderColor: 'var(--border-color)'
                      }}
                    >
                      <button
                        onClick={() => {
                          onDeleteDM(user.name);
                          setShowMenu(null);
                        }}
                        className="w-full px-3 py-2 text-sm flex items-center space-x-2 transition-colors text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}