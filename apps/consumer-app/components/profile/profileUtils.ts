export function isHttpAvatarUrl(url: string | undefined): url is string {
  if (!url || typeof url !== "string") return false;
  const u = url.trim();
  return /^https?:\/\//i.test(u);
}
