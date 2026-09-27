import { i18n } from "@better-auth/i18n";
import * as schema from "@mana/db/schema";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, bearer, lastLoginMethod, openAPI, twoFactor } from "better-auth/plugins";
import { db } from "@api/db";
import { env } from "@api/env";
import { logUserChangedPassword, logUserSignedIn } from "@api/lib/activity";
import { ac, adminRole, userRole } from "@api/lib/access-control";
import { trustedWebOrigins } from "@api/lib/cors-origins";
import { seedDefaultRemarkTemplates } from "@api/modules/business/service";
import { sendVerificationEmail } from "@api/utils/email/resend";
import { renderCatalogEmail } from "@api/utils/email/catalog";
import { sendEmailBatch } from "@api/utils/email";

const googleProvider =
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
    ? {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        accessType: "offline" as const,
        prompt: "select_account consent" as const,
      }
    : undefined;

const discordProvider =
  env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET
    ? {
        clientId: env.DISCORD_CLIENT_ID,
        clientSecret: env.DISCORD_CLIENT_SECRET,
      }
    : undefined;

const facebookProvider =
  env.FACEBOOK_CLIENT_ID && env.FACEBOOK_CLIENT_SECRET
    ? {
        clientId: env.FACEBOOK_CLIENT_ID,
        clientSecret: env.FACEBOOK_CLIENT_SECRET,
      }
    : undefined;

const socialProviders = {
  ...(googleProvider ? { google: googleProvider } : {}),
  ...(discordProvider ? { discord: discordProvider } : {}),
  ...(facebookProvider ? { facebook: facebookProvider } : {}),
};

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
      twoFactor: schema.twoFactors,
    },
  }),
  plugins: [
    openAPI(),
    // control panel authenticates via Authorization header instead of the shared
    // session cookie, so app sign-out/sign-in never touches the admin session (C-417)
    bearer(),
    lastLoginMethod(),
    admin({
      ac,
      roles: { admin: adminRole, user: userRole },
      defaultRole: "user",
      impersonationSessionDuration: 60 * 60,
    }),
    twoFactor({ issuer: "MANA" }),
    i18n({
      defaultLocale: "th",
      detection: ["header"],
      translations: {
        en: {},
        th: {
          USER_NOT_FOUND: "ไม่พบผู้ใช้",
          FAILED_TO_CREATE_USER: "สร้างผู้ใช้ไม่สำเร็จ",
          FAILED_TO_CREATE_SESSION: "สร้างเซสชันไม่สำเร็จ",
          FAILED_TO_UPDATE_USER: "อัปเดตผู้ใช้ไม่สำเร็จ",
          FAILED_TO_GET_SESSION: "โหลดเซสชันไม่สำเร็จ",
          INVALID_PASSWORD: "รหัสผ่านไม่ถูกต้อง",
          INVALID_EMAIL: "อีเมลไม่ถูกต้อง",
          INVALID_EMAIL_OR_PASSWORD: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
          INVALID_USER: "ผู้ใช้ไม่ถูกต้อง",
          SOCIAL_ACCOUNT_ALREADY_LINKED: "บัญชีโซเชียลนี้ถูกเชื่อมไว้แล้ว",
          PROVIDER_NOT_FOUND: "ไม่พบผู้ให้บริการเข้าสู่ระบบ",
          INVALID_TOKEN: "โทเค็นไม่ถูกต้อง",
          TOKEN_EXPIRED: "โทเค็นหมดอายุ",
          FAILED_TO_GET_USER_INFO: "โหลดข้อมูลผู้ใช้ไม่สำเร็จ",
          USER_EMAIL_NOT_FOUND: "ไม่พบอีเมลผู้ใช้",
          EMAIL_NOT_VERIFIED: "ยังไม่ได้ยืนยันอีเมล",
          PASSWORD_TOO_SHORT: "รหัสผ่านสั้นเกินไป",
          PASSWORD_TOO_LONG: "รหัสผ่านยาวเกินไป",
          USER_ALREADY_EXISTS: "มีผู้ใช้นี้อยู่แล้ว",
          USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
            "มีผู้ใช้นี้อยู่แล้ว กรุณาใช้อีเมลอื่น",
          CREDENTIAL_ACCOUNT_NOT_FOUND: "ไม่พบบัญชีที่ใช้รหัสผ่าน",
          ACCOUNT_NOT_FOUND: "ไม่พบบัญชี",
          SESSION_EXPIRED: "เซสชันหมดอายุ",
          INVALID_ORIGIN: "ต้นทางคำขอไม่ถูกต้อง",
          INVALID_CALLBACK_URL: "URL สำหรับกลับหลังเข้าสู่ระบบไม่ถูกต้อง",
        },
      },
    }),
  ],
  account: {
    // sign-in re-grants only default scopes; without this, every plain Google
    // login overwrites (narrows) tokens/scope obtained via calendar linkSocial
    updateAccountOnSignIn: false,
    accountLinking: {
      enabled: true,
      // multi-account Google Calendar sync links additional Google identities
      // (other emails) to the same MANA user (C-438)
      allowDifferentEmails: true,
    },
  },
  socialProviders: Object.keys(socialProviders).length
    ? socialProviders
    : undefined,
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, token }) => {
      await sendVerificationEmail({
        to: user.email,
        name: user.name || user.email.split("@")[0],
        verificationUrl: `${env.WEB_URL}/reset-password?token=${token}`,
      });
    },
    onPasswordReset: async ({ user }) => {
      logUserChangedPassword(user.id);
      const email = await renderCatalogEmail("password-changed", {
        recipientName: user.name || user.email.split("@")[0],
        actionUrl: `${env.WEB_URL}/forgot-password`,
      });
      await sendEmailBatch([{ to: user.email, subject: email.subject, html: email.html }]);
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      // `url` already hits the API's own /verify-email (it must, to mark the token
      // consumed) — we only override where it redirects afterwards, since the
      // request-time callbackURL defaults to a path relative to the API's own
      // origin, not the web app's.
      const redirectUrl = new URL(url);
      redirectUrl.searchParams.set("callbackURL", env.WEB_URL);
      const email = await renderCatalogEmail("verify-email", {
        recipientName: user.name || user.email.split("@")[0],
        actionUrl: redirectUrl.toString(),
      });
      const [result] = await sendEmailBatch([{ to: user.email, subject: email.subject, html: email.html }]);
      if (result.status !== "sent") {
        throw new Error(result.error ?? "Verification email was blocked by the email sandbox");
      }
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await seedDefaultRemarkTemplates(user.id);
        },
      },
    },
    session: {
      create: {
        after: async (session) => {
          logUserSignedIn(session.userId);
        },
      },
    },
  },
  advanced: {
    ipAddress: {
      disableIpTracking: false,
    },
    // prod serves web + api from one origin (apps/web/serve.ts proxies /api/*), so
    // cookies stay first-party — SameSite=None/Partitioned would break the OAuth
    // state cookie on the provider's top-level redirect back to us
    defaultCookieAttributes: {
      httpOnly: true,
      maxAge: 86_400, // 1 day
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  },
  trustedOrigins: trustedWebOrigins(),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
});
