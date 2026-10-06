// Better Auth on D1. Email one-time code login for now; Apple and Google sign in are added
// when their keys exist (Apple requires Sign in with Apple once any social login is offered).
import { betterAuth } from "better-auth";
import { emailOTP } from "better-auth/plugins";
import { expo } from "@better-auth/expo";

export const TRUSTED_ORIGINS = ["https://promovote.com", "promovote://", "exp://"];

export function authOptions(env, database, sendCode) {
  return {
    appName: "PromoVote",
    baseURL: env?.API_URL || "https://api.promovote.com",
    basePath: "/api/auth",
    secret: env?.BETTER_AUTH_SECRET,
    database,
    trustedOrigins: TRUSTED_ORIGINS,
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
