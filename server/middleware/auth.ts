export default defineEventHandler((event) => {
  const url = getRequestURL(event);

  // Enforce server-side security checks strictly on the webhook intake route
  if (url.pathname === "/api/leads/incoming") {
    const authHeader = getHeader(event, "authorization");
    const EXPECTED_TOKEN =
      process.env.API_INBOUND_TOKEN || "super-secret-admin-token-123";

    if (!authHeader || authHeader !== `Bearer ${EXPECTED_TOKEN}`) {
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized API Token: Access Denied",
      });
    }
  }
});
