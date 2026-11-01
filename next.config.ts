import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  headers() {
    return [
      {
        // 공유 토큰이 외부 사이트의 Referer나 검색 결과로 새지 않게 한다
        source: "/share/:path*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
