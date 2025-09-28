import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@stores/authStore';
import toast from 'react-hot-toast';

const STRAVA_CLIENT_ID = import.meta.env.VITE_STRAVA_CLIENT_ID;
const STRAVA_REDIRECT_URI = `${window.location.origin}/auth/strava/callback`;

export const LoginPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginWithStrava, isLoading, isAuthenticated } = useAuthStore();
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'not-connected' | 'connecting'>('not-connected');

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      handleStravaCallback(code);
    }
  }, [searchParams]);

  const handleStravaCallback = async (code: string) => {
    setConnectionStatus('connecting');
    try {
      await loginWithStrava(code);
      toast.success('Successfully connected to Strava!');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Failed to connect to Strava. Please try again.');
      setConnectionStatus('not-connected');
    }
  };

  const handleStravaLogin = () => {
    if (!STRAVA_CLIENT_ID) {
      toast.error('Strava configuration is missing');
      return;
    }

    const stravaAuthUrl = `https://www.strava.com/oauth/authorize?client_id=${STRAVA_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(STRAVA_REDIRECT_URI)}&approval_prompt=force&scope=read,activity:read_all`;
    
    window.location.href = stravaAuthUrl;
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'bg-success';
      case 'connecting':
        return 'bg-warning animate-pulse';
      default:
        return 'bg-warning';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Status: Connected';
      case 'connecting':
        return 'Status: Connecting...';
      default:
        return 'Status: Not Connected';
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background-light dark:bg-background-dark font-display text-foreground-light dark:text-foreground-dark">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-background-light dark:border-primary/20">
        <div className="w-8" />
        <h1 className="text-lg font-bold text-foreground-light dark:text-foreground-dark">Endurance Tracker</h1>
        <button className="text-foreground-light dark:text-foreground-dark">
          <svg fill="currentColor" height="24" viewBox="0 0 256 256" width="24" xmlns="http://www.w3.org/2000/svg">
            <path d="M128,80a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Zm88-29.84q.06-2.16,0-4.32l14.92-18.64a8,8,0,0,0,1.48-7.06,107.21,107.21,0,0,0-10.88-26.25,8,8,0,0,0-6-3.93l-23.72-2.64q-1.48-1.56-3-3L186,40.54a8,8,0,0,0-3.94-6,107.71,107.71,0,0,0-26.25-10.87,8,8,0,0,0-7.06,1.49L130.16,40Q128,40,125.84,40L107.2,25.11a8,8,0,0,0-7.06-1.48A107.6,107.6,0,0,0,73.89,34.51a8,8,0,0,0-3.93,6L67.32,64.27q-1.56,1.49-3,3L40.54,70a8,8,0,0,0-6,3.94,107.71,107.71,0,0,0-10.87,26.25,8,8,0,0,0,1.49,7.06L40,125.84Q40,128,40,130.16L25.11,148.8a8,8,0,0,0-1.48,7.06,107.21,107.21,0,0,0,10.88,26.25,8,8,0,0,0,6,3.93l23.72,2.64q1.49,1.56,3,3L70,215.46a8,8,0,0,0,3.94,6,107.71,107.71,0,0,0,26.25,10.87,8,8,0,0,0,7.06-1.49L125.84,216q2.16.06,4.32,0l18.64,14.92a8,8,0,0,0,7.06,1.48,107.21,107.21,0,0,0,26.25-10.88,8,8,0,0,0,3.93-6l2.64-23.72q1.56-1.48,3-3L215.46,186a8,8,0,0,0,6-3.94,107.71,107.71,0,0,0,10.87-26.25,8,8,0,0,0-1.49-7.06Zm-16.1-6.5a73.93,73.93,0,0,1,0,8.68,8,8,0,0,0,1.74,5.48l14.19,17.73a91.57,91.57,0,0,1-6.23,15L187,173.11a8,8,0,0,0-5.1,2.64,74.11,74.11,0,0,1-6.14,6.14,8,8,0,0,0-2.64,5.1l-2.51,22.58a91.32,91.32,0,0,1-15,6.23l-17.74-14.19a8,8,0,0,0-5-1.75h-.48a73.93,73.93,0,0,1-8.68,0,8,8,0,0,0-5.48,1.74L100.45,215.8a91.57,91.57,0,0,1-15-6.23L82.89,187a8,8,0,0,0-2.64-5.1,74.11,74.11,0,0,1-6.14-6.14,8,8,0,0,0-5.1-2.64L46.43,170.6a91.32,91.32,0,0,1-6.23-15l14.19-17.74a8,8,0,0,0,1.74-5.48,73.93,73.93,0,0,1,0-8.68,8,8,0,0,0-1.74-5.48L40.2,100.45a91.57,91.57,0,0,1,6.23-15L69,82.89a8,8,0,0,0,5.1-2.64,74.11,74.11,0,0,1,6.14-6.14A8,8,0,0,0,82.89,69L85.4,46.43a91.32,91.32,0,0,1,15-6.23l17.74,14.19a8,8,0,0,0,5.48,1.74,73.93,73.93,0,0,1,8.68,0,8,8,0,0,0,5.48-1.74L155.55,40.2a91.57,91.57,0,0,1,15,6.23L173.11,69a8,8,0,0,0,2.64,5.1,74.11,74.11,0,0,1,6.14,6.14,8,8,0,0,0,5.1,2.64l22.58,2.51a91.32,91.32,0,0,1,6.23,15l-14.19,17.74A8,8,0,0,0,199.87,123.66Z" />
          </svg>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center text-center p-6">
        {/* Activity Icon */}
        <div className="w-24 h-24 mb-6">
          <svg className="text-primary w-full h-full" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        </div>

        {/* Title and Description */}
        <h2 className="text-2xl font-bold text-foreground-light dark:text-foreground-dark mb-2">Connect with Strava</h2>
        <p className="text-subtle-light dark:text-subtle-dark mb-8 max-w-xs">
          To begin tracking your workouts and supplement intake, please connect your Strava account.
        </p>

        {/* Strava Connect Button */}
        <button 
          className="w-full max-w-sm h-12 px-6 bg-primary text-white font-bold rounded-lg flex items-center justify-center gap-3 transition-colors hover:bg-primary/90"
          onClick={handleStravaLogin}
          disabled={isLoading || connectionStatus === 'connecting'}
        >
          <svg className="strava-logo" fill="currentColor" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
            <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.062-5.599l2.834 5.599h3.468L11.725 0 7.79 7.773h3.934z" />
          </svg>
          <span>{connectionStatus === 'connecting' ? 'Connecting...' : 'Connect with Strava'}</span>
        </button>

        {/* Status Indicator */}
        <div className="mt-6 flex items-center space-x-2">
          <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor()}`} />
          <p className="text-sm text-subtle-light dark:text-subtle-dark">{getStatusText()}</p>
        </div>
      </main>

      {/* Bottom Navigation */}
      <footer className="bg-background-light dark:bg-background-dark border-t border-primary/20 dark:border-primary/20">
        <nav className="flex justify-around items-center px-4 py-2">
          <a className="flex flex-col items-center justify-center gap-1 text-primary w-16 h-14 rounded-lg" href="#">
            <svg fill="currentColor" height="24" viewBox="0 0 256 256" width="24" xmlns="http://www.w3.org/2000/svg">
              <path d="M224,115.55V208a16,16,0,0,1-16,16H168a16,16,0,0,1-16-16V168a8,8,0,0,0-8-8H112a8,8,0,0,0-8,8v40a16,16,0,0,1-16,16H48a16,16,0,0,1-16-16V115.55a16,16,0,0,1,5.17-11.78l80-75.48.11-.11a16,16,0,0,1,21.53,0,1.14,1.14,0,0,0,.11.11l80,75.48A16,16,0,0,1,224,115.55Z" />
            </svg>
            <span className="text-xs font-bold">Home</span>
          </a>
          <a className="flex flex-col items-center justify-center gap-1 text-subtle-light dark:text-subtle-dark w-16 h-14 rounded-lg hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors" href="#">
            <svg fill="currentColor" height="24" viewBox="0 0 256 256" width="24" xmlns="http://www.w3.org/2000/svg">
              <path d="M240,128a112.12,112.12,0,0,1-24.11,69.66l-42-42A48,48,0,1,0,96,173.65v42.24A112,112,0,1,1,240,128ZM128,88a8,8,0,0,0-8,8v32h32a8,8,0,0,0,0-16h-24V96A8,8,0,0,0,128,88Z" />
            </svg>
            <span className="text-xs">History</span>
          </a>
          <a className="flex flex-col items-center justify-center gap-1 text-subtle-light dark:text-subtle-dark w-16 h-14 rounded-lg hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors" href="#">
            <svg fill="currentColor" height="24" viewBox="0 0 256 256" width="24" xmlns="http://www.w3.org/2000/svg">
              <path d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z" />
            </svg>
            <span className="text-xs">Add</span>
          </a>
          <a className="flex flex-col items-center justify-center gap-1 text-subtle-light dark:text-subtle-dark w-16 h-14 rounded-lg hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors" href="#">
            <svg fill="currentColor" height="24" viewBox="0 0 256 256" width="24" xmlns="http://www.w3.org/2000/svg">
              <path d="M232,208a8,8,0,0,1-8,8H32a8,8,0,0,1-8-8V48a8,8,0,0,1,16,0v94.37L90.73,98a8,8,0,0,1,10.07-.38l58.81,44.11L218.73,90a8,8,0,1,1,10.54,12l-64,56a8,8,0,0,1-10.07.38L96.39,114.29,40,163.63V200H224A8,8,0,0,1,232,208Z" />
            </svg>
            <span className="text-xs">Stats</span>
          </a>
          <a className="flex flex-col items-center justify-center gap-1 text-subtle-light dark:text-subtle-dark w-16 h-14 rounded-lg hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors" href="#">
            <svg fill="currentColor" height="24" viewBox="0 0 256 256" width="24" xmlns="http://www.w3.org/2000/svg">
              <path d="M230.92,212c-15.23-26.33-38.7-45.21-66.09-54.16a72,72,0,1,0-73.66,0C63.78,166.78,40.31,185.66,25.08,212a8,8,0,1,0,13.85,8c18.84-32.56,52.14-52,89.07-52s70.23,19.44,89.07,52a8,8,0,1,0,13.85-8ZM72,96a56,56,0,1,1,56,56A56.06,56.06,0,0,1,72,96Z" />
            </svg>
            <span className="text-xs">Profile</span>
          </a>
        </nav>
      </footer>
    </div>
  );
};