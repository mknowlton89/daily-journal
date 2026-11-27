import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Daily Journal",
    short_name: "Journal",
    description: "A private daily journal",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0e0e0c",
    theme_color: "#0e0e0c",
    icons: [
      { src: "/icon", sizes: "192x192", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
