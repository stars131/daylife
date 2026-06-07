import "@testing-library/jest-dom/vitest";

Object.assign(process.env, {
  NODE_ENV: "test",
  APP_TIMEZONE: "Australia/Perth",
  APP_URL: "http://localhost:3000",
  SESSION_SECRET: "test-session-secret-with-at-least-32-bytes",
  ADMIN_PASSWORD_HASH: "$2a$10$K8sGbWa8TZ.Kh0gWm8c0e.Ak2P5v4uCjG50UnkPGmBb2QvS8GAmDe",
  LLM_BASE_URL: "https://x666.me",
  LLM_MODEL: "gemini-2.5-flash",
  LLM_API_KEY: "test-placeholder",
  LLM_CHAT_COMPLETIONS_PATH: "/v1/chat/completions",
  LLM_TIMEOUT_MS: "30000",
  DATABASE_URL: "file:./test.db"
});
