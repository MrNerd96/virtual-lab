import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.biosim.lab',
  appName: 'Frog Muscle Lab',
  webDir: 'dist', // React build output directory (Vite uses 'dist', Create-React-App uses 'build')
  server: {
    androidScheme: 'https'
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;