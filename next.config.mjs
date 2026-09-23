import withPWA from "next-pwa";

const isProduction = process.env.NODE_ENV === "production";

const withPWAConfig = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: !isProduction,
  cacheOnFrontEndNav: true,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*$/i,
      handler: "NetworkFirst",
      options: { cacheName: "supabase-data", expiration: { maxEntries: 100, maxAgeSeconds: 86400 } }
    },
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/realtime\/.*$/i,
      handler: "NetworkOnly"
    }
  ]
});

export default withPWAConfig({
  reactStrictMode: true,
  experimental: { typedRoutes: true }
});
