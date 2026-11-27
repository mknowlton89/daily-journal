import { ImageResponse } from "next/og";

export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0e0e0c",
          color: "#f3efe6",
          fontSize: 84,
          fontFamily: "Georgia",
        }}
      >
        Aa
      </div>
    ),
    { ...size }
  );
}
