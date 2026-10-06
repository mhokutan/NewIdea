// Better Auth on D1. Email one-time code login for now; Apple and Google sign in are added
// when their keys exist (Apple requires Sign in with Apple once any social login is offered).
import { betterAuth } from "better-auth";
import { emailOTP } from "better-auth/plugins";
import { expo } from "@better-auth/expo";

export const TRUSTED_ORIGINS = ["https://promovote.com", "promovote://", "exp://"];

function socialProviders(env) {
  const bundleId = env?.APPLE_BUNDLE_ID || "com.miapera.promovote";
  const providers = {
    apple: { clientId: bundleId, appBundleIdentifier: bundleId, clientSecret: env?.APPLE_CLIENT_SECRET || "native-id-token-only" },
  };
  // Comma separated Google OAuth client ids (iOS, Android and web). Public values, not secrets.
  const googleIds = (env?.GOOGLE_CLIENT_IDS || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (googleIds.length) providers.google = { clientId: googleIds, clientSecret: env?.GOOGLE_CLIENT_SECRET || "native-id-token-only" };
  return providers;
}

export function authOptions(env, database, sendCode) {
  return {
    appName: "PromoVote",
    baseURL: env?.API_URL || "https://api.promovote.com",
    basePath: "/api/auth",
    secret: env?.BETTER_AUTH_SECRET,
    database,
    trustedOrigins: TRUSTED_ORIGINS,
    // Native sign in only: the app gets an ID token from Apple or Google and the server verifies it
    // (signature, issuer, audience). No client secret is needed for that, so none is stored.
    socialProviders: socialProviders(env),
    account: { accountLinking: { enabled: true, trustedProviders: ["apple", "google"] } },
    session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
    rateLimit: { enabled: true, storage: "database", window: 60, max: 30 },
    advanced: { database: { generateId: () => crypto.randomUUID() } },
    plugins: [
      expo(),
      emailOTP({
        otpLength: 6,
        expiresIn: 600,
        allowedAttempts: 5,
        sendVerificationOTP: async ({ email, otp, type }) => sendCode(email, otp, type),
      }),
    ],
  };
}

export const createAuth = (env, sendCode) => betterAuth(authOptions(env, env.DB, sendCode));
