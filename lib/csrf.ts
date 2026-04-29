export function validateOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) return false;
  const requestOrigin = origin ?? new URL(request.url).origin;
  return (
    requestOrigin === appUrl ||
    requestOrigin === "https://surveyconnect.vercel.app"
  );
}
