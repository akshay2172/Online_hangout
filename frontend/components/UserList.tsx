// frontend/components/UserList.tsx
import React from 'react';

interface User {
  name: string;
  gender: 'male' | 'female' | 'other';
  country: string;
  isActive?: boolean;
}

interface Props {
  users: User[];
  currentUser?: string;
}

// Country code to flag emoji mapping
const countryToFlag = (countryCode: string): string => {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

// Country name to flag (simplified for common countries)
const getCountryFlag = (countryName: string): string => {
  const countryMap: Record<string, string> = {
    'usa': '🇺🇸',
    'us': '🇺🇸',
    'united states': '🇺🇸',
    'united kingdom': '🇬🇧',
    'uk': '🇬🇧',
    'canada': '🇨🇦',
    'india': '🇮🇳',
    'australia': '🇦🇺',
    'germany': '🇩🇪',
    'france': '🇫🇷',
    'japan': '🇯🇵',
    'china': '🇨🇳',
    'brazil': '🇧🇷',
    'mexico': '🇲🇽',
    'spain': '🇪🇸',
    'italy': '🇮🇹',
    'russia': '🇷🇺',
    'south korea': '🇰🇷',
    'singapore': '🇸🇬',
    'uae': '🇦🇪',
    'saudi arabia': '🇸🇦',
    'pakistan': '🇵🇰',
    'bangladesh': '🇧🇩',
    'sri lanka': '🇱🇰',
  };

  const lowerName = countryName ? countryName.toLowerCase() : '';
  return countryMap[lowerName] || '🌍'; // Default globe emoji
};

const getGenderSymbol = (gender: string): string => {
  if (!gender) return '⚧';
  switch (gender.toLowerCase()) {
    case 'male':
      return '♂️';
    case 'female':
      return '♀️';
    default:
      return '⚧';
  }
};

const getGenderColor = (gender: string): string => {
  if (!gender) return 'bg-purple-100 text-purple-800 border-purple-200';
  switch (gender.toLowerCase()) {
    case 'male':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'female':
      return 'bg-pink-100 text-pink-800 border-pink-200';
    default:
      return 'bg-purple-100 text-purple-800 border-purple-200';
  }
};

const UserList: React.FC<Props> = ({ users, currentUser }) => {
  return (
    <div className="bg-gradient-to-b from-white to-gray-50 border border-gray-200 rounded-xl shadow-sm p-6 w-full max-w-xs h-fit">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-800">Active Users</h3>
          <p className="text-xs text-gray-500 mt-1">
            {users.length} user{users.length !== 1 ? 's' : ''} online
          </p>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-green-600 font-medium">Live</span>
        </div>
      </div>

      {/* Users List */}
      <div className="space-y-3">
        {users.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <div className="text-4xl mb-2">👤</div>
            <p className="text-sm">No users online yet</p>
          </div>
        ) : (
          users.map((user, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-lg border transition-all duration-200 hover:shadow-sm ${
                user.name === currentUser
                  ? 'bg-blue-50 border-blue-300'
                  : 'bg-white border-gray-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {/* User Avatar with Gender */}
                  <div className="relative">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
                      user.gender === 'female'
                        ? 'bg-gradient-to-r from-pink-100 to-pink-50 text-pink-600'
                        : user.gender === 'male'
                        ? 'bg-gradient-to-r from-blue-100 to-blue-50 text-blue-600'
                        : 'bg-gradient-to-r from-purple-100 to-purple-50 text-purple-600'
                    }`}>
                      {user.name ? user.name.charAt(0).toUpperCase() : '?'}
                    </div>
                    {/* Active Status Dot */}
                    {user.isActive !== false && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                  </div>

                  {/* User Info */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className={`font-medium text-gray-800 ${user.name === currentUser ? 'text-blue-700' : ''}`}>
                        {user.name || 'Unknown'}
                        {user.name === currentUser && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            You
                          </span>
                        )}
                      </span>
                    </div>
                    
                    {/* Country and Gender */}
                    <div className="flex items-center space-x-3 mt-1">
                      <div className="flex items-center space-x-1">
                        <span className="text-lg">{getCountryFlag(user.country)}</span>
                        <span className="text-xs text-gray-600">{user.country || 'Unknown'}</span>
                      </div>
                      <div className={`flex items-center space-x-1 text-xs px-2 py-0.5 rounded-full border ${getGenderColor(user.gender)}`}>
                        <span className="text-xs">{getGenderSymbol(user.gender)}</span>
                        <span>{user.gender ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1) : 'Other'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Stats */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <div className="flex justify-between text-sm">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <span className="text-blue-500">♂️</span>
              <span className="text-gray-600">
                {users.filter(u => u.gender && u.gender.toLowerCase() === 'male').length} male
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-pink-500">♀️</span>
              <span className="text-gray-600">
                {users.filter(u => u.gender && u.gender.toLowerCase() === 'female').length} female
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserList;