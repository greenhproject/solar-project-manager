export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  auth0Domain: process.env.AUTH0_DOMAIN ?? "",
  auth0Audience: process.env.AUTH0_AUDIENCE ?? "",
  // OpenSolar API credentials
  openSolarEmail: process.env.OPENSOLAR_EMAIL ?? "",
  openSolarPassword: process.env.OPENSOLAR_PASSWORD ?? "",
  openSolarOrgId: process.env.OPENSOLAR_ORG_ID ?? "",
  openSolarWebhookSecret: process.env.OPENSOLAR_WEBHOOK_SECRET ?? "greenhproject-2025",
  // SSO Secret global para firmar tokens entre apps del ecosistema GHP
  ssoSecret: process.env.CRM_SSO_SECRET ?? process.env.SSO_SECRET ?? "",
  // GHP Notification Hub — Centro de Notificaciones centralizado
  ghpHubUrl: process.env.GHP_NOTIFICATION_HUB_URL ?? "",
  ghpHubSourceKey: process.env.GHP_NOTIFICATION_SOURCE_KEY ?? "",
  ghpHubSigningSecret: process.env.GHP_NOTIFICATION_SIGNING_SECRET ?? "",
};
