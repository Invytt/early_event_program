import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Invytt — Enterprise",
    short_name: "Invytt",
    description:
      "Join the Invytt Enterprise program — host events with us, get exclusive host features, and help build the future of event hosting.",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    lang: "en-IN",
    categories: ["lifestyle", "productivity", "events"],
    icons: [
      {
        src: "/logo.png",
        sizes: "any",
        type: "image/png",
      },
    ],
  };
}
