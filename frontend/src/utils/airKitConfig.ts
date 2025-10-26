// FIX: Import the module as a namespace, and the other values separately.
// import * as AirKit from '@mocanetwork/airkit'; // <- REMOVE THIS LINE
import {
  BUILD_ENV,
  type AirSessionConfig,
  AirService, // <- ADD THIS
} from '@mocanetwork/airkit';

// 1. Get Partner ID from environment variables
// This comes from '.env.example'
const partnerId = process.env.REACT_APP_AIR_KIT_API_KEY!;
if (!partnerId) {
  console.error('REACT_APP_AIR_KIT_API_KEY is not set in your .env file.');
}

// 2. Determine the build environment
const buildEnv =
  process.env.REACT_APP_NODE_ENV === 'production'
    ? BUILD_ENV.PRODUCTION
    : BUILD_ENV.SANDBOX; // Use SANDBOX for development

// 3. Configure the session
const sessionConfig: Partial<AirSessionConfig> = {
  // sessionTimeout is not a valid property in the new version
};

// 4. Create the single AirService instance
// FIX: Access the 'default' property from the namespace import and cast to 'any'
// This bypasses the faulty type definition and allows 'new' to be called.
// const airService = new (AirKit as any).default({ // <- REMOVE THIS LINE
const airService = new AirService({ // <- REPLACE WITH THIS LINE
  partnerId: partnerId,
});

// 5. Create an async function to initialize the service
// This MUST be called in your App.tsx or index.tsx before you use the service.
export const initializeAirKit = async () => {
  try {
    await airService.init({
      buildEnv: buildEnv,
      enableLogging: process.env.REACT_APP_NODE_ENV !== 'production',
      skipRehydration: false,
      sessionConfig: sessionConfig,
    });
    console.log('AirService initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize AirService:', error);
  }
  return airService;
};

// 6. Export the service instance
export { airService };

// Also export the BUILD_ENV enum for use in init
export { BUILD_ENV };