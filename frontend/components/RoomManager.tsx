// frontend/components/RoomManager.tsx - ENHANCED WITH FULL ROOM MANAGEMENT
import { useState, useEffect } from 'react';
import { 
  Lock, 
  Globe, 
  Plus, 
  X, 
  Users, 
  Settings, 
  Trash2, 
  LogOut, 
  UserPlus,
  Shield,
  Crown,
  UserCheck,
  Search,
  ChevronDown,
  ChevronUp,
  MessageSquare
} from 'lucide-react';
import { useDarkMode } from '../pages/_app';

interface Room {
  id: string;
  name: string;
  description?: string;
  isPrivate: boolean;
  type: 'public' | 'private' | 'direct';
  members: string[];
  moderators: string[];
  owner: string;
  memberCount: number;
  createdAt?: string;
  avatar?: string;
}

interface Props {
  rooms: Room[];
  currentRoom?: string;
  currentUser?: string;
  userRole?: 'owner' | 'admin' | 'moderator' | 'member';
  onCreateRoom: (roomData: { name: string; description: string; isPrivate: boolean; type: 'public' | 'private' }) => void;
  onJoinRoom: (roomId: string) => void;
  onLeaveRoom: (roomId: string) => void;
  onDeleteRoom: (roomId: string) => void;
  onUpdateRoom?: (roomId: string, updates: Partial<Room>) => void;
  onAddMember?: (roomId: string, username: string) => void;
  onRemoveMember?: (roomId: string, username: string) => void;
  onPromoteMember?: (roomId: string, username: string, role: 'moderator' | 'admin') => void;
  onSwitchRoom: (roomId: string) => void;
}

export default function RoomManager({
  rooms,
  currentRoom,
  currentUser,
  userRole = 'member',
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
  onDeleteRoom,
  onUpdateRoom,
  onAddMember,
  onRemoveMember,
  onPromoteMember,
  onSwitchRoom,
}: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [showRoomDetails, setShowRoomDetails] = useState<string | null>(null);
  const [showMembers, setShowMembers] = useState<string | null>(null);
  const [roomName, setRoomName] = useState('');
  const [roomDescription, setRoomDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [roomType, setRoomType] = useState<'public' | 'private'>('public');
  const [searchQuery, setSearchQuery] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());
  const { darkMode } = useDarkMode();

  const handleCreate = () => {
    if (!roomName.trim()) return;
    onCreateRoom({ 
      name: roomName.trim(), 
      description: roomDescription.trim(),
      isPrivate, 
      type: roomType 
    });
    setShowCreate(false);
    setRoomName('');
    setRoomDescription('');
    setIsPrivate(false);
    setRoomType('public');
  };

  const toggleRoomExpand = (roomId: string) => {
    const newExpanded = new Set(expandedRooms);
    if (newExpanded.has(roomId)) {
      newExpanded.delete(roomId);
    } else {
      newExpanded.add(roomId);
    }
    setExpandedRooms(newExpanded);
  };

  const canManageRoom = (room: Room) => {
    if (!currentUser) return false;
    if (room.owner === currentUser) return true;
    if (room.moderators?.includes(currentUser)) return true;
    return false;
  };

  const canDeleteRoom = (room: Room) => {
    return room.owner === currentUser;
  };

  const filteredRooms = rooms.filter(room =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const publicRooms = filteredRooms.filter(r => r.type === 'public');
  const privateRooms = filteredRooms.filter(r => r.type === 'private');
  const myRooms = filteredRooms.filter(r => r.members?.includes(currentUser || ''));

  const getRoleIcon = (role?: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'admin':
        return <Shield className="w-4 h-4 text-red-500" />;
      case 'moderator':
        return <UserCheck className="w-4 h-4 text-blue-500" />;
      default:
        return <Users className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div 
      className="h-full flex flex-col"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Header */}
      <div 
        className="p-4 border-b flex items-center justify-between"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-5 h-5" style={{ color: 'var(--accent-color)' }} />
          <h3 
            className="text-lg font-bold"
            style={{ color: 'var(--text-primary)' }}
          >
            Rooms
          </h3>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="p-2 rounded-lg transition-colors flex items-center space-x-1"
          style={{ 
            backgroundColor: 'var(--accent-color)',
            color: 'white'
          }}
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm hidden sm:inline">Create</span>
        </button>
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
            type="text"
            placeholder="Search rooms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: 'var(--text-primary)' }}
          />
        </div>
      </div>

      {/* Room List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
        {/* My Rooms */}
        {myRooms.length > 0 && (
          <div>
            <h4 
              className="text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: 'var(--text-muted)' }}
            >
              My Rooms — {myRooms.length}
            </h4>
            <div className="space-y-2">
              {myRooms.map(room => (
                <div
                  key={room.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    currentRoom === room.id ? 'ring-2' : ''
                  }`}
                  style={{ 
                    backgroundColor: currentRoom === room.id ? 'var(--accent-color)' : 'var(--bg-secondary)',
                    borderColor: currentRoom === room.id ? 'var(--accent-color)' : 'var(--border-color)',
                    color: currentRoom === room.id ? 'white' : 'var(--text-primary)'
                  }}
                  onClick={() => onSwitchRoom(room.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {room.isPrivate ? (
                        <Lock className="w-4 h-4" style={{ opacity: 0.7 }} />
                      ) : (
                        <Globe className="w-4 h-4" style={{ opacity: 0.7 }} />
                      )}
                      <span className="font-medium">{room.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs opacity-70">{room.memberCount || room.members?.length || 0}</span>
                      <Users className="w-3 h-3 opacity-70" />
                    </div>
                  </div>
                  {room.description && (
                    <p className="text-sm mt-1 opacity-70 line-clamp-1">{room.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Public Rooms */}
        {publicRooms.length > 0 && (
          <div>
            <h4 
              className="text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: 'var(--text-muted)' }}
            >
              Public Rooms — {publicRooms.length}
            </h4>
            <div className="space-y-2">
              {publicRooms.filter(r => !r.members?.includes(currentUser || '')).map(room => (
                <div
                  key={room.id}
                  className="p-3 rounded-lg border transition-all hover:shadow-sm"
                  style={{ 
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border-color)'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Globe className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                      <span 
                        className="font-medium"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {room.name}
                      </span>
                    </div>
                    <button
                      onClick={() => onJoinRoom(room.id)}
                      className="px-3 py-1 text-sm rounded-lg transition-colors"
                      style={{ 
                        backgroundColor: 'var(--accent-color)',
                        color: 'white'
                      }}
                    >
                      Join
                    </button>
                  </div>
                  {room.description && (
                    <p 
                      className="text-sm mt-1 line-clamp-1"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {room.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Private Rooms */}
        {privateRooms.length > 0 && (
          <div>
            <h4 
              className="text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: 'var(--text-muted)' }}
            >
              Private Rooms — {privateRooms.length}
            </h4>
            <div className="space-y-2">
              {privateRooms.filter(r => !r.members?.includes(currentUser || '')).map(room => (
                <div
                  key={room.id}
                  className="p-3 rounded-lg border transition-all"
                  style={{ 
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border-color)',
                    opacity: 0.7
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Lock className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                      <span 
                        className="font-medium"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {room.name}
                      </span>
                    </div>
                    <span 
                      className="text-xs px-2 py-1 rounded"
                      style={{ 
                        backgroundColor: 'var(--bg-tertiary)',
                        color: 'var(--text-muted)'
                      }}
                    >
                      Invite Only
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {filteredRooms.length === 0 && (
          <div 
            className="text-center py-8"
            style={{ color: 'var(--text-muted)' }}
          >
            <div className="text-4xl mb-2">🏠</div>
            <p className="text-sm">No rooms found</p>
            <p className="text-xs mt-1">Create a new room to get started</p>
          </div>
        )}
      </div>

      {/* Create Room Modal */}
      {showCreate && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setShowCreate(false)}
        >
          <div 
            className="rounded-xl shadow-xl p-6 max-w-md w-full"
            style={{ 
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-color)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 
                className="text-xl font-bold"
                style={{ color: 'var(--text-primary)' }}
              >
                Create New Room
              </h3>
              <button
                onClick={() => setShowCreate(false)}
                className="p-1 rounded transition-colors"
                style={{ '--hover-bg': 'var(--bg-secondary)' } as React.CSSProperties}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <X className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label 
                  className="block text-sm font-medium mb-1"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Room Name *
                </label>
                <input
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="e.g., General Chat"
                  className="w-full p-3 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  style={{ 
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              <div>
                <label 
                  className="block text-sm font-medium mb-1"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Description
                </label>
                <textarea
                  value={roomDescription}
                  onChange={(e) => setRoomDescription(e.target.value)}
                  placeholder="What's this room about?"
                  rows={3}
                  className="w-full p-3 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                  style={{ 
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              <div>
                <label 
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Room Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setRoomType('public');
                      setIsPrivate(false);
                    }}
                    className={`p-3 rounded-lg border flex items-center space-x-2 transition-all ${
                      roomType === 'public' ? 'ring-2 ring-blue-500' : ''
                    }`}
                    style={{ 
                      backgroundColor: roomType === 'public' ? 'var(--accent-color)' : 'var(--bg-secondary)',
                      borderColor: roomType === 'public' ? 'var(--accent-color)' : 'var(--border-color)',
                      color: roomType === 'public' ? 'white' : 'var(--text-primary)'
                    }}
                  >
                    <Globe className="w-4 h-4" />
                    <span>Public</span>
                  </button>
                  <button
                    onClick={() => {
                      setRoomType('private');
                      setIsPrivate(true);
                    }}
                    className={`p-3 rounded-lg border flex items-center space-x-2 transition-all ${
                      roomType === 'private' ? 'ring-2 ring-blue-500' : ''
                    }`}
                    style={{ 
                      backgroundColor: roomType === 'private' ? 'var(--accent-color)' : 'var(--bg-secondary)',
                      borderColor: roomType === 'private' ? 'var(--accent-color)' : 'var(--border-color)',
                      color: roomType === 'private' ? 'white' : 'var(--text-primary)'
                    }}
                  >
                    <Lock className="w-4 h-4" />
                    <span>Private</span>
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleCreate}
                  disabled={!roomName.trim()}
                  className="flex-1 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ 
                    backgroundColor: 'var(--accent-color)',
                    color: 'white'
                  }}
                >
                  Create Room
                </button>
                <button
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-2 rounded-lg transition-colors"
                  style={{ 
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}