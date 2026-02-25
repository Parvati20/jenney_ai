"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function Home() {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/tool");
      return;
    }
    if (status === "unauthenticated") {
      router.replace("/api/auth/signin");
    }
  }, [router, status]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-pink-50 via-purple-50 to-pink-100">
      <div className="text-center text-purple-deep text-xl font-semibold">
        Loading your fun space...
      </div>
    </div>
  );
}
