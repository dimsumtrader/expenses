import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Easy Split",
    short_name: "Easy Split",
    description: "Minimalist expense tracking and splitting",
    start_url: "/",
    display: "standalone",
    theme_color: "#FF4F00",
    background_color: "#FFFFFF",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
