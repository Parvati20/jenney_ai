"use client";

import { useEffect, useState, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { JENNY_SYSTEM_PROMPT } from "@/lib/systemPrompt";

export default function SpeechComponent({ onReady, isAuthorized, onLogout }: any) {
  const { data: session } = useSession();
  
  // --- States ---
  const [isReady, setIsReady] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [displayedText, setDisplayedText] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);

  // --- Refs ---
  const sttRef = useRef<any>(null);
  const ttsRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const messagesRef = useRef(messages);
  const hasShownWelcomeRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Keep ref in sync for STT callback
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // Scroll history to bottom when it opens
  useEffect(() => {
    if (showHistory && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [showHistory, messages]);

  // --- Initialization (STT & TTS) ---
  useEffect(() => {
    async function initSpeech() {
      try {
        const { STTLogic, TTSLogic, sharedAudioPlayer } = await import("speech-to-speech");
        
        sharedAudioPlayer.configure({ autoPlay: true });
        ttsRef.current = new TTSLogic({ voiceId: "en_US-hfc_female-medium" });
        await ttsRef.current.initialize();

        sttRef.current = new STTLogic(
          () => {}, 
          (transcript: string) => {
            if (transcript.trim()) handleUserMessage(transcript.trim());
          },
          { sessionDurationMs: 10000, interimSaveIntervalMs: 250 }
        );

        sttRef.current.setVadCallbacks(
          () => setIsListening(true),
          () => setIsListening(false)
        );

        setIsReady(true);
        onReady?.(true);
      } catch (err) { console.error("Mic Init Error:", err); }
    }
    initSpeech();
    return () => {
      sttRef.current?.destroy();
      ttsRef.current?.dispose();
    };
  }, []);

  // --- Core Functions ---
  const speak = async (text: string) => {
    if (!ttsRef.current || !text.trim()) return;
    try {
      setIsSpeaking(true);
      const { audio, sampleRate } = await ttsRef.current.synthesize(text);
      const { sharedAudioPlayer } = await import("speech-to-speech");
      sharedAudioPlayer.addAudioIntoQueue(audio, sampleRate);
      
      const duration = text.split(" ").length * 280 + 1200;
      setTimeout(() => setIsSpeaking(false), duration);
    } catch (err) { setIsSpeaking(false); }
  };

  const handleUserMessage = async (text: string) => {
    const updatedMessages = [...messagesRef.current, { role: "user", content: text }];
    setMessages(updatedMessages);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: [{ role: "system", content: JENNY_SYSTEM_PROMPT }, ...updatedMessages] 
        })
      });

      const data = await response.json();
      const reply = data?.choices?.[0]?.message?.content || "Wow! You're so smart!";
      
      const finalChat = [...updatedMessages, { role: "assistant", content: reply }];
      setMessages(finalChat);
      setDisplayedText(reply);
      await speak(reply);
    } catch (err) { console.error("Chat Error:", err); }
  };

  const toggleMic = () => {
    if (!sttRef.current) return;
    if (isListening) {
      sttRef.current.stop();
      setIsListening(false);
    } else {
      setIsSpeaking(false); 
      sttRef.current.start();
      setIsListening(true);
    }
  };

  useEffect(() => {
    if (videoRef.current) {
      isSpeaking ? videoRef.current.play().catch(() => {}) : videoRef.current.pause();
    }
  }, [isSpeaking]);

  // --- Welcome Logic ---
  useEffect(() => {
    if (session?.user?.name && isReady && !hasShownWelcomeRef.current) {
      const userName = session.user.name.split(' ')[0];
      const welcomeMsg = `Hi ${userName}! I'm Jenny. What do you want to learn today?`;
      setDisplayedText(welcomeMsg);
      setTimeout(() => speak(welcomeMsg), 1500);
      hasShownWelcomeRef.current = true;
    }
  }, [session, isReady]);

  const userImage = session?.user?.image;
  const userName = session?.user?.name || "Friend";

  return (
    <div className={`flex h-screen w-full transition-all duration-500 ${isDarkMode ? 'bg-slate-900' : 'bg-gradient-to-br from-purple-100 to-pink-100'}`}>
      
      {/* Sidebar: Profile at Bottom */}
      <aside className={`w-20 ${isDarkMode ? 'bg-slate-800' : 'bg-white/40'} backdrop-blur-xl flex flex-col items-center py-10 border-r border-white/20 z-50`}>
        <div className="flex-1 flex flex-col gap-12">
          <button onClick={() => setShowHistory(true)} className="text-3xl hover:scale-125 transition">💬</button>
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="text-3xl hover:scale-125 transition">{isDarkMode ? '🌙' : '☀️'}</button>
        </div>
        
        {/* Profile Circle with User Letter (Exactly like your image) */}
        <button onClick={() => setShowProfile(true)} className="mt-auto group">
          <div className="w-12 h-12 rounded-full bg-purple-600 border-2 border-white flex items-center justify-center text-white font-bold shadow-md group-hover:scale-110 transition overflow-hidden">
            {userImage ? (
              <img src={userImage} referrerPolicy="no-referrer" alt="DP" className="w-full h-full object-cover" />
            ) : (
              userName.charAt(0).toUpperCase()
            )}
          </div>
        </button>
      </aside>

      {/* Main UI */}
      <main className="flex-1 flex flex-col items-center justify-center relative px-10">
        <header className="absolute top-10 left-10">
          <h1 className="text-5xl font-black text-purple-700 tracking-tighter drop-shadow-lg">JENNY</h1>
          <h2 className="text-2xl font-extrabold text-pink-600 mt-2 uppercase">WELCOME, {userName}! ✨</h2>
        </header>

        {/* Character */}
        <div className="relative mb-8">
          <div className={`absolute inset-0 rounded-full blur-[60px] opacity-40 transition-all ${isListening ? 'bg-red-400' : 'bg-blue-400'}`}></div>
          <div className="relative w-64 h-64 md:w-80 md:h-80 rounded-full border-[10px] border-white shadow-2xl overflow-hidden bg-white">
            <video ref={videoRef} src="/jenney_video.mp4" muted loop playsInline className="w-full h-full object-cover" />
          </div>
        </div>

        {/* Status & Message */}
        <div className="flex flex-col items-center gap-6">
          <div className={`text-xl font-black px-8 py-3 rounded-full shadow-lg ${isListening ? 'bg-red-500 text-white animate-bounce' : 'bg-purple-600 text-white'}`}>
            {isListening ? "👂 I'M LISTENING..." : isSpeaking ? "🗣️ JENNY IS TALKING..." : "READY TO LEARN?"}
          </div>

          <div className="bg-white/90 p-8 rounded-[40px] shadow-xl border-4 border-purple-100 max-w-xl text-center mb-4 min-h-[100px] flex items-center justify-center">
            <p className="text-2xl font-bold text-purple-900 italic">
              {displayedText}
            </p>
          </div>

          <button onClick={toggleMic} className={`w-32 h-32 rounded-full flex items-center justify-center text-6xl shadow-2xl transition-all border-4 border-white ${isListening ? 'bg-red-500 scale-110' : 'bg-gradient-to-br from-purple-500 to-pink-500 hover:scale-110'}`}>
            {isListening ? '🛑' : '🎤'}
          </button>
        </div>
      </main>

      {/* Profile Modal - Layout exactly like image 2 */}
      {showProfile && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center" onClick={() => setShowProfile(false)}>
          <div className="bg-white rounded-[40px] p-12 w-[400px] text-center border-8 border-purple-50" onClick={e => e.stopPropagation()}>
            <div className="w-32 h-32 rounded-full border-4 border-pink-400 mx-auto mb-6 flex items-center justify-center text-white text-5xl font-black bg-purple-600 overflow-hidden shadow-xl">
               {userImage ? (
                <img src={userImage} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
               ) : (
                userName.charAt(0).toUpperCase()
               )}
            </div>
            <h2 className="text-3xl font-black text-purple-700 mb-2">{userName}</h2>
            <p className="text-gray-500 mb-10 font-medium">{session?.user?.email}</p>
            <button onClick={() => signOut({ callbackUrl: "/" })} className="w-full py-5 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-[30px] font-black text-xl shadow-xl hover:brightness-110 transition-all">LOGOUT 🚪</button>
          </div>
        </div>
      )}

      {/* Chat History Modal - Fixed history view */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center" onClick={() => setShowHistory(false)}>
          <div className="bg-white rounded-[40px] p-8 w-full max-w-2xl h-[75vh] flex flex-col border-8 border-blue-50" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-2xl font-black text-purple-600">My Fun Chats 💬</h2>
              <button onClick={() => setMessages([])} className="text-red-500 font-bold hover:underline">Clear History</button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <span className="text-6xl mb-4">🎈</span>
                  <p className="text-xl font-medium">No chats yet. Let's talk!</p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-4 rounded-3xl font-bold shadow-sm ${msg.role === 'user' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                      {msg.content}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
            <button onClick={() => setShowHistory(false)} className="mt-6 w-full py-3 bg-gray-200 rounded-2xl font-bold">Back to Play</button>
          </div>
        </div>
      )}
      
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #d8b4fe; border-radius: 10px; }
      `}</style>
    </div>
  );
}