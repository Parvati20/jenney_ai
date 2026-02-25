// "use client";

// import { useEffect, useMemo } from "react";
// import { useRouter, useSearchParams } from "next/navigation";
// import { signIn, useSession } from "next-auth/react";

// export default function LoginPage() {
//   const router = useRouter();
//   const { status } = useSession();
//   const searchParams = useSearchParams();
//   const error = searchParams.get("error");

//   useEffect(() => {
//     if (status === "authenticated") {
//       router.replace("/tool");
//     }
//   }, [router, status]);

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-200 via-pink-200 to-indigo-300 px-4 relative overflow-hidden">
//       <div className="w-full max-w-2xl bg-gradient-to-br from-white/70 via-white/60 to-white/50 backdrop-blur-3xl rounded-[40px] shadow-2xl hover:shadow-3xl p-16 text-center relative z-10 animate-float-in border-2 border-white/90 transition-all duration-500">
//         <h1 className="text-8xl font-extrabold bg-gradient-to-r from-purple-700 via-pink-600 to-blue-700 bg-clip-text text-transparent mb-2 animate-gradient drop-shadow-2xl" style={{ backgroundSize: '200% 200%', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
//           JENNY
//         </h1>
//         <div className="mb-10">
//           <p className="text-3xl font-bold bg-gradient-to-r from-purple-800 via-pink-700 to-blue-800 bg-clip-text text-transparent drop-shadow-md mb-3">
//             Fun Learning Adventure with AI
//           </p>
//           <div className="text-4xl animate-bounce inline-block" style={{ animationDuration: '1.5s' }}>✨</div>
//         </div>
//         <p className="text-lg text-gray-800 mb-12 font-semibold drop-shadow-sm">
//           Sign in to start your magical journey! 🚀
//         </p>
//         {error && (
//           <div className="mb-8 p-5 bg-red-50/80 backdrop-blur-md border-2 border-red-300/50 rounded-3xl text-base text-red-700 font-medium shadow-lg">
//             Oops! Sign-in didn't work. Try again! 😊
//           </div>
//         )}
//         <button
//           type="button"
//           onClick={() => signIn("google", { callbackUrl: "/tool" })}
//           className="group w-full rounded-full bg-gradient-to-r from-purple-700 via-pink-600 to-blue-700 text-white text-2xl font-extrabold py-5 px-10 hover:scale-110 active:scale-100 transition-all duration-300 flex items-center justify-center gap-4 shadow-2xl hover:shadow-4xl relative overflow-hidden border-2 border-white/50"
//           style={{ boxShadow: '0 20px 60px rgba(168, 85, 247, 0.8)' }}
//         >
//           <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center p-1.5 group-hover:scale-125 transition-transform">
//             <img src="/google.png" alt="Google" className="w-6 h-6" />
//           </div>
//           <span>Continue with Google</span>
//         </button>
//       </div>
//     </div>
//   );
// }


"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";

export default function LoginPage() {
  const router = useRouter();
  const { status } = useSession();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/tool");
    }
  }, [router, status]);

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center bg-gradient-to-br from-purple-200 via-pink-200 to-indigo-300 animate-bg-gradient">
      
      {/* Animated Bubbles */}
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className={`absolute rounded-full bg-white/40`}
          style={{
            width: `${Math.random() * 60 + 20}px`,
            height: `${Math.random() * 60 + 20}px`,
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            animation: `float-${i} ${Math.random() * 10 + 5}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 5}s`,
            opacity: Math.random() * 0.5 + 0.2,
          }}
        />
      ))}

     {/* Center Circular Cartoon */}
<div className="absolute top-4 flex justify-center w-full pointer-events-none">
  <div className="w-40 h-40 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 p-[4px] shadow-2xl">
    <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
      <img
        src="/cartton.png"
        alt="Jenny"
        className="w-28 h-28 object-contain"
      />
    </div>
  </div>
</div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-2xl bg-white/70 backdrop-blur-3xl rounded-[40px] shadow-2xl hover:shadow-3xl p-16 text-center animate-float-in border-2 border-white/90 transition-all duration-500">
        
        <h1 className="text-8xl font-extrabold bg-gradient-to-r from-purple-700 via-pink-600 to-blue-700 bg-clip-text text-transparent mb-2 animate-gradient drop-shadow-2xl">
          JENNY
        </h1>

        <div className="mb-10">
          <p className="text-3xl font-bold bg-gradient-to-r from-purple-800 via-pink-700 to-blue-800 bg-clip-text text-transparent drop-shadow-md mb-3">
            Fun Learning Adventure with AI
          </p>
          <div className="text-4xl animate-bounce inline-block" style={{ animationDuration: '1.5s' }}>✨</div>
        </div>

        <p className="text-lg text-gray-800 mb-12 font-semibold drop-shadow-sm">
          Sign in to start your magical journey! 🚀
        </p>

        {error && (
          <div className="mb-8 p-5 bg-red-50/80 backdrop-blur-md border-2 border-red-300/50 rounded-3xl text-base text-red-700 font-medium shadow-lg">
            Oops! Sign-in didn't work. Try again! 😊
          </div>
        )}

        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl: "/tool" })}
          className="group w-full rounded-full bg-gradient-to-r from-purple-700 via-pink-600 to-blue-700 text-white text-2xl font-extrabold py-5 px-10 hover:scale-110 active:scale-100 transition-all duration-300 flex items-center justify-center gap-4 shadow-2xl hover:shadow-4xl relative overflow-hidden border-2 border-white/50"
        >
          <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center p-1.5 group-hover:scale-125 transition-transform">
            <img src="/google.png" alt="Google" className="w-6 h-6" />
          </div>
          <span>Continue with Google</span>
        </button>
      </div>

      {/* Background Animation Keyframes */}
      <style jsx>{`
        @keyframes float-0 { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-60px); } }
        @keyframes float-1 { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-80px); } }
        @keyframes float-2 { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-50px); } }
        /* Add more float animations for other bubbles */
        @keyframes float-3 { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-70px); } }

        @keyframes animate-bg-gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .animate-bg-gradient {
          background-size: 200% 200%;
          animation: animate-bg-gradient 10s ease infinite;
        }

        .animate-bounce-slow {
          animation: bounce 3s infinite ease-in-out;
        }

        .animate-float-in {
          animation: floatIn 1s ease forwards;
        }

        @keyframes floatIn {
          0% { opacity: 0; transform: translateY(50px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}