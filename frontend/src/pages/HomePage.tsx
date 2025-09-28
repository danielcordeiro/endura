export const HomePage = () => {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome to Endura</h1>
        <p className="text-lg text-gray-600 mb-8">
          Track your workouts and supplement intake with ease
        </p>
        <a 
          href="/" 
          className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors"
        >
          Get Started
        </a>
      </div>
    </div>
  );
};