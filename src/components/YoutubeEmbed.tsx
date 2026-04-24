"use client";

import { getYouTubeEmbedUrl } from "@/lib/youtube";

export default function YoutubeEmbed({ url, title }: { url: string; title?: string }) {
  const embedUrl = getYouTubeEmbedUrl(url);
  if (!embedUrl) return null;

  return (
    <div className="relative w-full rounded-lg overflow-hidden bg-black" style={{ aspectRatio: "16/9" }}>
      <iframe
        src={embedUrl}
        title={title || "YouTube動画"}
        className="absolute inset-0 w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
