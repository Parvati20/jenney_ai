"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
const SpeechComponent = dynamic(
  () => import("@/components/SpeechComponent").then((mod) => mod.default),
  { ssr: false },
);
import { signOut, useSession } from "next-auth/react";

// Animated Gradient Background
function AnimatedGradientBG() {
  return (
    <div
      className="fixed inset-0 -z-20 animate-gradient-move bg-gradient-to-br from-purple-200 via-pink-200 to-blue-200 transition-colors duration-1000"
      style={{ backgroundSize: "200% 200%" }}
    >
      <style>{`
        @keyframes gradient-move {
          0% { background-position: 0% 50%; }
          25% { background-position: 50% 100%; }
          50% { background-position: 100% 50%; }
          75% { background-position: 50% 0%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient-move {
          animation: gradient-move 18s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

// Magical Floating Bubbles
function FloatingBubbles() {
  // Generate bubbles with random directions, sizes, and opacities
  const bubbles = Array.from({ length: 9 }).map((_, i) => {
    const size = 60 + Math.random() * 90;
    const left = Math.random() * 85;
    const top = Math.random() * 80;
    const duration = 8 + Math.random() * 12;
    const opacity = 0.18 + Math.random() * 0.22;
    const colors = [
      ["from-purple-200", "to-pink-200"],
      ["from-pink-200", "to-blue-200"],
      ["from-blue-200", "to-purple-100"],
      ["from-pink-100", "to-purple-200"],
      ["from-blue-100", "to-pink-100"],
    ];
    const [from, to] = colors[Math.floor(Math.random() * colors.length)];
    const direction = Math.random() > 0.5 ? 1 : -1;
    return { size, left, top, duration, opacity, from, to, direction, i };
  });
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {bubbles.map(
        ({ size, left, top, duration, opacity, from, to, direction, i }) => (
          <div
            key={i}
            className={`absolute rounded-full bg-gradient-to-br ${from} ${to}`}
            style={{
              width: size,
              height: size,
              left: `${left}%`,
              top: `${top}%`,
              opacity,
              filter: "blur(2.5px)",
              animation: `bubbleFloat${i} ${duration}s ease-in-out infinite alternate`,
            }}
          />
        ),
      )}
      <style>{`
        ${bubbles
          .map(
            ({ i, direction }) => `
          @keyframes bubbleFloat${i} {
            0% { transform: translateY(0) translateX(0) scale(1); }
            100% { transform: translateY(${direction * 40}px) translateX(${direction * 30}px) scale(1.08); }
          }
        `,
          )
          .join("")}
      `}</style>
    </div>
  );
}

// Feature Cards + Section Title
function FeatureCards() {
  const cards = [
    {
      icon: "🎤",
      title: "Communication Skills",
      desc: "Learn to speak clearly and confidently",
      colorFrom: "from-purple-200",
      colorTo: "to-pink-100",
    },
    {
      icon: "💪",
      title: "Confidence Boost",
      desc: "Build self-confidence with fun AI talks",
      colorFrom: "from-pink-200",
      colorTo: "to-blue-100",
    },
    {
      icon: "🧠",
      title: "Memory Power",
      desc: "Improve memory with smart games",
      colorFrom: "from-blue-200",
      colorTo: "to-purple-100",
    },
    {
      icon: "⚡",
      title: "Thinking Skills",
      desc: "Grow logical and creative thinking",
      colorFrom: "from-purple-100",
      colorTo: "to-pink-200",
    },
  ];
  return (
    <div className="fixed right-8 top-1/2 -translate-y-1/2 flex flex-col items-end gap-6 z-20 select-none">
      {/* Section Title */}
      <div
        className="mb-4 px-2 text-center animate-title-fade-in"
        style={{ animationDelay: "0.1s", animationFillMode: "both" }}
      >
        <h2
          className="text-2xl md:text-3xl font-extrabold text-purple-700 drop-shadow-md"
          style={{
            fontFamily: "Comic Sans MS, Comic Sans, cursive",
          }}
        >
          What You Will Learn With Jenny
        </h2>
      </div>
      {/* Cards */}
      <div className="flex flex-col gap-6 w-[320px] max-w-[90vw]">
        {cards.map((card, i) => (
          <div
            key={card.title}
            className={`relative flex flex-col items-start px-6 py-4 mb-2 rounded-2xl bg-white/30 backdrop-blur-md border-2 border-transparent bg-clip-padding shadow-xl transition-all duration-400
              ${card.colorFrom} ${card.colorTo}
              animate-card-fade-slide
              sparkle-hover
            `}
            style={{
              animationDelay: `${i * 0.28 + 0.5}s`,
              animationFillMode: "both",
              borderImage: `linear-gradient(120deg, var(--tw-gradient-from), var(--tw-gradient-to)) 1`,
              boxShadow: "0 4px 32px 0 rgba(180, 120, 255, 0.12)",
              willChange: "transform, box-shadow",
              zIndex: 2,
              animationName: "card-fade-slide, card-float",
              animationDuration: "0.8s, 5.5s",
              animationTimingFunction: "cubic-bezier(.4,0,.2,1), ease-in-out",
              animationIterationCount: `1, infinite`,
              animationDirection: "normal, alternate",
            }}
            tabIndex={0}
          >
            <div className="text-3xl mb-1 drop-shadow-sm">{card.icon}</div>
            <div className="font-bold text-lg text-purple-700 mb-0.5">
              {card.title}
            </div>
            <div className="text-sm text-purple-900/80">{card.desc}</div>
            {/* Glow border overlay */}
            <div
              className="absolute inset-0 rounded-2xl pointer-events-none border border-white/30"
              style={{ boxShadow: "0 0 16px 2px rgba(180,120,255,0.10)" }}
            ></div>
            {/* Sparkle effect */}
            <span className="absolute right-4 top-3 w-3 h-3 rounded-full bg-gradient-to-br from-pink-200 to-purple-200 opacity-70 blur-[2px] sparkle"></span>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes title-fade-in {
          0% { opacity: 0; transform: translateY(24px) scale(0.98); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-title-fade-in {
          animation: title-fade-in 1.1s cubic-bezier(.4,0,.2,1) both;
        }
        @keyframes card-fade-slide {
          0% { opacity: 0; transform: translateX(60px) scale(0.97); }
          100% { opacity: 1; transform: translateX(0) scale(1); }
        }
        .animate-card-fade-slide {
          animation-name: card-fade-slide, card-float;
          animation-duration: 0.8s, 5.5s;
          animation-timing-function: cubic-bezier(.4,0,.2,1), ease-in-out;
          animation-iteration-count: 1, infinite;
          animation-direction: normal, alternate;
        }
        @keyframes card-float {
          0% { transform: translateY(0) scale(1); }
          100% { transform: translateY(-8px) scale(1.012); }
        }
        .sparkle-hover:hover, .sparkle-hover:focus {
          transform: scale(1.045) translateY(-2px);
          box-shadow: 0 8px 32px 0 rgba(180, 120, 255, 0.18), 0 0 16px 2px #e0b3ff66;
          transition: box-shadow 0.4s, transform 0.4s;
        }
        .sparkle {
          animation: sparkle-glow 1.8s infinite alternate;
        }
        @keyframes sparkle-glow {
          0% { opacity: 0.7; filter: blur(2px) brightness(1.1); }
          100% { opacity: 1; filter: blur(1px) brightness(1.4); }
        }
      `}</style>
    </div>
  );
}

export default function ToolPage() {
  if (typeof window === "undefined") {
    return null;
  }

  const router = useRouter();
  const { data: session, status } = useSession();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [logoutCount, setLogoutCount] = useState(0);

  useLayoutEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/api/auth/signin");
      setAuthorized(false);
      return;
    }
    if (status === "authenticated") {
      setAuthorized(true);
    }
  }, [router, status]);

  useEffect(() => {
    if (logoutCount === 0) return;
    signOut({ callbackUrl: "/api/auth/signin" });
  }, [logoutCount, router]);

  if (authorized !== true) {
    return null;
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <AnimatedGradientBG />
      <FloatingBubbles />
      <SpeechComponent
        isAuthorized={authorized === true}
        onLogout={() => setLogoutCount((count) => count + 1)}
      />
      <FeatureCards />
    </div>
  );
}
