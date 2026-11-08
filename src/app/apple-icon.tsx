import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon: the SoilStack mark on forest green. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#1f3d2b" }}>
        <svg width="132" height="132" viewBox="0 0 32 32">
          <path d="M16 5c5.5 2.2 7.7 6.6 6.6 12.1-4.4 0-7.7-2.2-8.8-6.6 0-2.2.6-3.9 2.2-5.5Z" fill="#8bc34a" />
          <rect x="6.5" y="20" width="19" height="2.6" rx="1.3" fill="#c8a27a" />
          <rect x="8.5" y="24.4" width="15" height="2.6" rx="1.3" fill="#a07a52" />
        </svg>
      </div>
    ),
    size,
  );
}
