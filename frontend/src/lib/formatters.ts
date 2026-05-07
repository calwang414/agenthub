export function formatDownloads(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + "w";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

export function renderStarsElement(rating: number): { stars: string; ratingText: string } {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const stars: string[] = [];
  for (let i = 0; i < full; i++) stars.push("★");
  if (half) stars.push("⭑");
  while (stars.length < 5) stars.push("☆");
  return { stars: stars.join(""), ratingText: rating.toFixed(1) };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}
