import { useState } from 'react';
import { ApiError } from '../api/client';

interface LoginProps {
  onLogin: (params: { email: string; password: string }) => void;
  onRegister: (params: { email: string; password: string }) => void;
  loginError: Error | null;
  registerError: Error | null;
  isLoginPending: boolean;
  isRegisterPending: boolean;
}

export function Login({
  onLogin,
  onRegister,
  loginError,
  registerError,
  isLoginPending,
  isRegisterPending,
}: LoginProps) {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegisterMode) {
      onRegister({ email, password });
    } else {
      onLogin({ email, password });
    }
  };

  const error = isRegisterMode ? registerError : loginError;
  const isPending = isRegisterMode ? isRegisterPending : isLoginPending;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isRegisterMode ? 'Create your account' : 'Sign in to your account'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {isRegisterMode ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={() => setIsRegisterMode(!isRegisterMode)}
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              {isRegisterMode ? 'Sign in' : 'Register'}
            </button>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-700">
                {error instanceof ApiError ? error.message : 'An error occurred'}
              </p>
            </div>
          )}

          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isPending}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isPending ? 'Loading...' : isRegisterMode ? 'Register' : 'Sign in'}
            </button>
          </div>

          {!isRegisterMode && (
            <div className="text-center text-sm text-gray-500">
              <p>Demo account: demo@example.com / password123</p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
