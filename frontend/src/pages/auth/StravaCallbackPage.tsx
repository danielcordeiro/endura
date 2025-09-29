import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '@stores/authStore';

export const StravaCallbackPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const hasHandledRef = useRef(false);
  const { loginWithStrava, isLoading, isAuthenticated } = useAuthStore((state) => ({
    loginWithStrava: state.loginWithStrava,
    isLoading: state.isLoading,
    isAuthenticated: state.isAuthenticated,
  }));
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (hasHandledRef.current) {
      return;
    }

    const code = searchParams.get('code');
    if (!code) {
      toast.error('Missing Strava authorization code.');
      setStatus('error');
      setErrorMessage('Unable to finish the Strava connection. Redirecting you back to login...');
      setTimeout(() => navigate('/login', { replace: true }), 2000);
      hasHandledRef.current = true;
      return;
    }

    const handleCallback = async () => {
      try {
        await loginWithStrava(code);
        toast.success('Strava connection completed.');
        navigate('/dashboard', { replace: true });
      } catch (error) {
        console.error('Strava callback failed', error);
        toast.error('Could not finish the Strava connection.');
        setStatus('error');
        setErrorMessage('It was not possible to finish the Strava connection. Redirecting you back to login...');
        setTimeout(() => navigate('/login', { replace: true }), 2000);
      } finally {
        hasHandledRef.current = true;
      }
    };

    handleCallback();
  }, [loginWithStrava, navigate, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background-light text-foreground-light dark:bg-background-dark dark:text-foreground-dark">
      <div className="w-full max-w-sm rounded-xl bg-card-light p-6 text-center shadow-sm dark:bg-card-dark">
        <h1 className="text-lg font-bold">Processing Strava connection</h1>
        {status === 'loading' ? (
          <p className="mt-4 text-sm text-foreground-muted-light dark:text-foreground-muted-dark">
            {isLoading ? 'Hold on while we finish the connection...' : 'Finalizing the connection...'}
          </p>
        ) : (
          <p className="mt-4 text-sm text-warning">{errorMessage}</p>
        )}
      </div>
    </div>
  );
};
