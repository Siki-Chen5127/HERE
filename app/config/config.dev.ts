/**
 * These are configuration settings for the dev environment.
 *
 * Do not include API secrets in this file or anywhere in your JS.
 *
 * https://reactnative.dev/docs/security#storing-sensitive-info
 */
export default {
  API_URL: "https://api.rss2json.com/v1/",
  HERE_API_URL: process.env.EXPO_PUBLIC_HERE_API_URL ?? "http://127.0.0.1:8000/api/v1",
}
