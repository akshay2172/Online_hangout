import { useState } from 'react';
import { useRouter } from 'next/router';
import { LogIn, UserPlus, Users } from 'lucide-react';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup' | null>(null);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [gender, setGender] = useState('');
  const [country, setCountry] = useState('');
  const router = useRouter();

  const handleGuestLogin = () => {
    // Generate random guest username
    const guestUsername = `Guest${Math.floor(Math.random() * 10000)}`;
    router.push({
      pathname: '/',
      query: { guest: 'true', username: guestUsername }
    });
  };

  const handleLogin = async () => {
    // TODO: Implement actual login logic
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('username', data.username);
        router.push('/');
      } else {
        alert('Login failed: ' + data.message);
      }
    } catch (error) {
      alert('Login error');
    }
  };

  const handleSignup = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          email,
          password,
          gender,
          country,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        alert('Signup successful! Please login.');
        setMode('login');
      } else {
        alert('Signup failed: ' + data.message);
      }
    } catch (error) {
      alert('Signup error');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900">
      <div className="relative max-w-md w-full">
        <div className="absolute -inset-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl blur-xl opacity-30"></div>
        
        <div className="relative bg-gray-900 bg-opacity-90 backdrop-blur-sm p-10 rounded-2xl shadow-2xl border border-gray-800">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-block p-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mb-4">
              <span className="text-3xl">💬</span>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Welcome to Global Chat
            </h1>
          </div>

          {!mode ? (
            <div className="space-y-4">
              <button
                onClick={() => setMode('login')}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-all"
              >
                <LogIn className="w-5 h-5" />
                Login with Account
              </button>

              <button
                onClick={() => setMode('signup')}
                className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-all"
              >
                <UserPlus className="w-5 h-5" />
                Create Account
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-gray-900 text-gray-400">or</span>
                </div>
              </div>

              <button
                onClick={handleGuestLogin}
                className="w-full py-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-all"
              >
                <Users className="w-5 h-5" />
                Continue as Guest
              </button>
            </div>
          ) : mode === 'login' ? (
            <div className="space-y-4">
              <input
                type="email"
                placeholder="Email"
                className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 text-white"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
              <input
                type="password"
                placeholder="Password"
                className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 text-white"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <button
                onClick={handleLogin}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
              >
                Login
              </button>
              <button
                onClick={() => setMode(null)}
                className="w-full py-2 text-gray-400 hover:text-white"
              >
                Back
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Username"
                className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 text-white"
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
              <input
                type="email"
                placeholder="Email"
                className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 text-white"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
              <input
                type="password"
                placeholder="Password"
                className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 text-white"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <select
                className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 text-white"
                value={gender}
                onChange={e => setGender(e.target.value)}
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
              <input
                type="text"
                placeholder="Country"
                className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 text-white"
                value={country}
                onChange={e => setCountry(e.target.value)}
              />
              <button
                onClick={handleSignup}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium"
              >
                Sign Up
              </button>
              <button
                onClick={() => setMode(null)}
                className="w-full py-2 text-gray-400 hover:text-white"
              >
                Back
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}