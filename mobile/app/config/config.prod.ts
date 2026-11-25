/**
 * These are configuration settings for the production environment.
 *
 * Do not include API secrets in this file or anywhere in your JS.
 *
 * https://reactnative.dev/docs/security#storing-sensitive-info
 */
export default {
  API_URL: "https://api.rss2json.com/v1/",
  HERE_API_URL: process.env.EXPO_PUBLIC_HERE_API_URL ?? "https://api.example.invalid/api/v1",
}
