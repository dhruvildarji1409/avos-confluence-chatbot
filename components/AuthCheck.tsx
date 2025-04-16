'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type User = {
  id: string;
  username: string;
  email: string;
};

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('Fetching user data...');
        
        const res = await fetch('/api/auth/user', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        
        console.log('API response status:', res.status);
        const contentType = res.headers.get('content-type');
        console.log('Content-Type:', contentType);
        
        if (!contentType || !contentType.includes('application/json')) {
          console.error('Non-JSON response received');
          const text = await res.text();
          console.error('Response text:', text.substring(0, 200) + '...');
          setUser(null);
          setLoading(false);
          return;
        }
        
        if (res.ok) {
          const data = await res.json();
          console.log('User data received:', data);
          setUser(data.user);
        } else {
          const errorData = await res.json();
          console.error('Auth error:', errorData);
          setUser(null);
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const logout = async () => {
    try {
      const res = await fetch('/api/auth/logout', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Logout: Non-JSON response received');
        return;
      }
      
      if (res.ok) {
        const data = await res.json();
        console.log('Logout successful:', data);
        setUser(null);
        router.push('/login');
      }
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return { user, loading, logout };
};

interface AuthCheckProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAuth?: boolean;
}

export default function AuthCheck({ children, fallback, requireAuth = false }: AuthCheckProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex justify-center items-center p-4">Loading...</div>;
  }

  if (requireAuth && !user) {
    return fallback || <div className="text-center p-4">Please log in to access this page.</div>;
  }

  return <>{children}</>;
} 