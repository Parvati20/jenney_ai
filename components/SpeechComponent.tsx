"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import type { TTSLogic, STTLogic } from "speech-to-speech";
import { JENNY_SYSTEM_PROMPT } from "@/lib/systemPrompt";

interface SpeechComponentProps {
  onReady?: (isReady: boolean) => void;
  isAuthorized?: boolean;
  onLogout?: () => void;
}

export default function SpeechComponent({ onReady, isAuthorized, onLogout }: SpeechComponentProps) {
  const { data: session } = useSession();
  const [isReady, setIsReady] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [currentResponse, setCurrentResponse] = useState<string>("");
  const [showHistory, setShowHistory] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [showThinking, setShowThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isGreeting, setIsGreeting] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const resolvedAuthorized = isAuthorized ?? true;
  const hasShownWelcomeRef = useRef(false);
  const isDisplayingWelcomeRef = useRef(false);
  const [displayName, setDisplayName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [userImage, setUserImage] = useState<string>("");
  const [hasStartedLetterMode, setHasStartedLetterMode] = useState(false);
  const [isWordChainMode, setIsWordChainMode] = useState(false);
  const [isStoryMode, setIsStoryMode] = useState(false);
  const [displayedText, setDisplayedText] = useState<string>("");
  const textTimersRef = useRef<number[]>([]);
  const speechStateTimersRef = useRef<number[]>([]);
  const speechQueueEndTimeRef = useRef<number>(0);
  const speakingCountRef = useRef<number>(0);
  const thinkingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const usedWordsRef = useRef<Set<string>>(new Set());
  const lastAiWordRef = useRef<string>("");
  
  const ttsRef = useRef<TTSLogic | null>(null);
  const sttRef = useRef<STTLogic | null>(null);
  const lastTranscriptRef = useRef<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<Array<{ role: string; content: string }>>([]);
  const requestQueueRef = useRef(Promise.resolve());
  const speechQueueRef = useRef(Promise.resolve());
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingVideoRef = useRef<boolean>(false);
  const sharedAudioPlayerRef = useRef<any>(null);

  // Initialize TTS

  
  useEffect(() => {
    async function initTTS() {
      try {
        const { TTSLogic, sharedAudioPlayer } = await import("speech-to-speech");

        sharedAudioPlayer.configure({ autoPlay: true });
        sharedAudioPlayerRef.current = sharedAudioPlayer;

        ttsRef.current = new TTSLogic({ voiceId: "en_US-hfc_female-medium" });
        await ttsRef.current.initialize();
        
        setIsReady(true);
        if (onReady) onReady(true);
      } catch (error) {
        console.error("TTS initialization failed:", error);
      }
    }

    initTTS();
    return () => {
      ttsRef.current?.dispose();
    };
  }, [onReady]);

  // Load user data from session
  useEffect(() => {
    if (!resolvedAuthorized) return;
    const name = session?.user?.name || "";
    const email = session?.user?.email || "";
    const image = session?.user?.image || "";

    if (name) setDisplayName(name);
    if (email) setUserEmail(email);
    if (image) setUserImage(image);

    if (!hasShownWelcomeRef.current && name) {
      const welcomeMsg = `Welcome, ${name}! Ready to learn today?`;
      setDisplayedText(welcomeMsg);
      hasShownWelcomeRef.current = true;
      isDisplayingWelcomeRef.current = true;
      setIsGreeting(true);
      setTimeout(() => setIsGreeting(false), 3000);
      setTimeout(async () => {
        await waitForNextPaint();
        speak(welcomeMsg);
      }, 0);
    }
  }, [resolvedAuthorized, session?.user?.name]);

  // Reset welcome flag when user logs out
  useEffect(() => {
    if (!session) {
      hasShownWelcomeRef.current = false;
    }
  }, [session]);

  // Initialize Speech-to-Text
  useEffect(() => {
    let isMounted = true;

    async function initSTT() {
      try {
        const { STTLogic } = await import("speech-to-speech");
        if (!isMounted) return;

        const stt = new STTLogic(
          (msg, level) => console.log(`[STT ${level ?? "info"}] ${msg}`),
          (transcript) => {
            lastTranscriptRef.current = transcript;
          },
          {
            sessionDurationMs: 4000,
            interimSaveIntervalMs: 1000,
          }
        );

        stt.setVadCallbacks(
          () => {
            setIsListening(true);
            if (videoRef.current) {
              videoRef.current.pause();
            }
          },
          async () => {
            const transcript =
              lastTranscriptRef.current.trim() || stt.getFullTranscript().trim();
            lastTranscriptRef.current = "";
            stt.clearTranscript();
            setIsListening(false);
            if (transcript.length > 0) {
              await handleUserMessage(transcript);
            }
          }
        );

        sttRef.current = stt;
      } catch (error) {
        console.error("STT initialization failed:", error);
      }
    }

    initSTT();
    return () => {
      isMounted = false;
      sttRef.current?.destroy();
    };
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (showHistory) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, showHistory]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const clearTextTimers = () => {
    if (textTimersRef.current.length > 0) {
      textTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
      textTimersRef.current = [];
    }
  };

  const waitForNextPaint = () => new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });

  const beginSpeaking = () => {
    speakingCountRef.current += 1;
    if (speakingCountRef.current === 1) {
      setIsSpeaking(true);
    }
  };

  const endSpeaking = () => {
    speakingCountRef.current = Math.max(0, speakingCountRef.current - 1);
    if (speakingCountRef.current === 0) {
      setIsSpeaking(false);
      // IMPORTANT: Keep text visible until user action
      // Only reset welcome display flag when speech ends
      if (isDisplayingWelcomeRef.current) {
        isDisplayingWelcomeRef.current = false;
      }
    }
  };

  // Control video playback - sync with speech
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.loop = true;
    video.playbackRate = 1;

    if (isSpeaking) {
      if (video.paused) {
        // Reset to start and play immediately (no delay)
        video.currentTime = 0;
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            isPlayingVideoRef.current = true;
            console.log("Video playing with AI");
          }).catch((err) => {
            console.error("Video play failed:", err);
          });
        }
      }
    } else {
      if (!video.paused) {
        video.pause();
        video.currentTime = 0;
      }
      isPlayingVideoRef.current = false;
    }
  }, [isSpeaking]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    // Preload entire video for instant playback
    video.preload = "auto";
    video.load();
    
    // Wait for video to be ready
    const handleCanPlay = () => {
      console.log("✅ Video ready to play instantly");
    };
    
    video.addEventListener("canplay", handleCanPlay);
    return () => video.removeEventListener("canplay", handleCanPlay);
  }, []);
  const speak = async (text: string) => {
    if (!resolvedAuthorized) return;
    
    if (!ttsRef.current) return;
    
    const sharedAudioPlayer = sharedAudioPlayerRef.current;
    if (!sharedAudioPlayer) return;
    
    try {
      // Aggressively clean text for faster TTS synthesis
      const textForSpeech = text
        .replace(/\p{Extended_Pictographic}/gu, "") // Remove emojis
        .replace(/[^\w\s]/g, " ") // Remove all punctuation
        .replace(/\s+/g, " ") // Normalize whitespace
        .trim();
      
      if (!textForSpeech) return; // Skip if nothing to speak
      
      // Synthesize FIRST - this is the bottleneck
      const result = await ttsRef.current.synthesize(textForSpeech);
      
      const durationSeconds =
        typeof result.duration === "number"
          ? result.duration
          : Math.max(0.7, textForSpeech.split(/\s+/).length * 0.25);
      const durationMs = durationSeconds * 1000;

      // NOW - start speaking EXACTLY when audio is about to play (perfect sync)
      beginSpeaking();
      
      // Queue audio to play right now
      sharedAudioPlayer.addAudioIntoQueue(result.audio, result.sampleRate);

      // End speaking right after audio finishes (no extra delay)
      const endTimerId = window.setTimeout(() => {
        endSpeaking();
      }, durationMs);
      speechStateTimersRef.current.push(endTimerId);
    } catch (error) {
      console.error("Speech synthesis failed:", error);
      endSpeaking();
    }
  };

  const enqueueSpeech = (text: string) => {
    if (!text.trim()) return speechQueueRef.current;
    speechQueueRef.current = speechQueueRef.current.then(() => speak(text)).catch((error) => {
      console.error("Speech queue failed:", error);
    });
    return speechQueueRef.current;
  };

  const startListening = () => {
    if (!resolvedAuthorized) return;
    if (sttRef.current && !isListening) {
      setIsListening(true);
      if (videoRef.current) {
        videoRef.current.pause();
      }
      sttRef.current.start();
      setTimeout(() => {
        sttRef.current?.stop();
        setIsListening(false);
        setTimeout(async () => {
          const transcript = lastTranscriptRef.current.trim();
          if (transcript.length > 0) {
            lastTranscriptRef.current = "";
            await handleUserMessage(transcript);
          }
        }, 200);
      }, 4000);
    }
  };

  const stopListening = () => {
    if (sttRef.current && isListening) {
      sttRef.current.stop();
      setIsListening(false);
    }
  };

  const enqueueRequest = (task: () => Promise<void>) => {
    requestQueueRef.current = requestQueueRef.current.then(task).catch((error) => {
      console.error("Queued request failed:", error);
    });
    return requestQueueRef.current;
  };

  const normalizeWord = (word: string) => word.toLowerCase().replace(/[^a-z]/g, "");

  const extractFirstWord = (text: string) => {
    const match = text.match(/[A-Za-z]+/);
    return match ? match[0] : "";
  };


  const handleUserMessage = async (text: string) => {
    return enqueueRequest(async () => {
      if (!resolvedAuthorized) return;
      const isWordChainSelected = /\bword\s*chain\b/i.test(text);
      const isOtherGameSelected = /\b(rapid\s*fire|riddle\s*game|act\s*and\s*guess|memory\s*game)\b/i.test(text);
      const isStoryChoice = /\b(magic\s*story|jungle\s*adventure|choose\s*your\s*story|finish\s*the\s*story|bedtime\s*story)\b/i.test(text);
      if (isWordChainSelected) {
        setIsWordChainMode(true);
        setShowHistory(false);
        usedWordsRef.current = new Set();
        lastAiWordRef.current = "";
      } else if (isOtherGameSelected) {
        setIsWordChainMode(false);
      }
      if (isStoryChoice) {
        setIsStoryMode(true);
        setShowHistory(false);
      }
      const isGreetingText = /^(hi|hello|hey)\b/i.test(text.trim());
      if (isGreetingText) {
        setIsGreeting(true);
        setTimeout(() => setIsGreeting(false), 1500);
      }
      const baseMessages = messagesRef.current;
      const newMessages = [...baseMessages, { role: "user", content: text }];
      setMessages(newMessages);
      if (thinkingTimerRef.current) {
        clearTimeout(thinkingTimerRef.current);
        thinkingTimerRef.current = null;
      }
      setIsThinking(true);
      setShowThinking(false);
      thinkingTimerRef.current = setTimeout(() => {
        setShowThinking(true);
      }, 1000);
      clearTextTimers();
      setDisplayedText("");

      try {
        const isWordChainActive = isWordChainSelected || (isWordChainMode && !isOtherGameSelected && !isStoryChoice);
        const userWord = normalizeWord(extractFirstWord(text));
        if (isWordChainActive && userWord) {
          usedWordsRef.current.add(userWord);
        }

        const wordChainLetter = isWordChainActive
          ? (userWord ? userWord.slice(-1) : lastAiWordRef.current.slice(-1))
          : "";
        const usedWords = isWordChainActive ? Array.from(usedWordsRef.current).slice(0, 80) : [];

        const wordChainSystem = isWordChainActive
          ? `WORD CHAIN MODE. Output exactly ONE word only. No extra text, no punctuation, no emoji. The word must start with letter: "${wordChainLetter || "any"}". Do NOT repeat any used words: ${usedWords.join(", ") || "(none)"}. If starting the game, output a single easy word.`
          : null;

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [
              { role: "system", content: JENNY_SYSTEM_PROMPT },
              ...(wordChainSystem ? [{ role: "system", content: wordChainSystem }] : []),
              ...newMessages
            ],
            temperature: 0.7,
            top_p: 0.9,
            max_tokens: 45,
            presence_penalty: 0.1,
            frequency_penalty: 0.1,
            stream: true
          })
        });

        if (!response.ok || !response.body) {
          const data = await response.json().catch(() => ({}));
          const errorText = data?.details || data?.error || "API error";
          throw new Error(errorText);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let assistantMessage = "";
        let done = false;

        // Step 1: Stream the entire response SILENTLY (collect text only, no UI updates)
        while (!done) {
          const { value, done: streamDone } = await reader.read();
          done = streamDone;
          if (value) {
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data:")) continue;
              const dataStr = trimmed.replace("data:", "").trim();
              if (dataStr === "[DONE]") {
                done = true;
                break;
              }
              try {
                const json = JSON.parse(dataStr);
                const delta = json?.choices?.[0]?.delta?.content || json?.choices?.[0]?.message?.content || "";
                if (delta) {
                  // Silently collect text - NO UI updates yet
                  assistantMessage += delta;
                }
              } catch {
                // ignore malformed chunks
              }
            }
          }
        }

        // Step 2: Streaming complete - validate we have a complete response
        if (!assistantMessage) {
          throw new Error("No response from model");
        }

        // Clear thinking state
        if (thinkingTimerRef.current) {
          clearTimeout(thinkingTimerRef.current);
          thinkingTimerRef.current = null;
        }
        setShowThinking(false);
        
        // Step 3: Display the COMPLETE text FIRST (all at once)
        // User must see full text before video and speech start
        setMessages([...newMessages, { role: "assistant", content: assistantMessage }]);
        setCurrentResponse(assistantMessage);
        setDisplayedText(assistantMessage);

        // Step 4: Start speech IMMEDIATELY with NO DELAY
        // This triggers video to play at same time
        if (assistantMessage.trim().length > 0) {
          enqueueSpeech(assistantMessage.trim());
        }

        // Update word chain tracking if active
        if (isWordChainSelected || (isWordChainMode && !isOtherGameSelected && !isStoryChoice)) {
          const aiWord = normalizeWord(extractFirstWord(assistantMessage));
          if (aiWord) {
            usedWordsRef.current.add(aiWord);
            lastAiWordRef.current = aiWord;
          }
        }
        setIsThinking(false);

        await speechQueueRef.current;
      } catch (error) {
        console.error("API call failed:", error);
        if (thinkingTimerRef.current) {
          clearTimeout(thinkingTimerRef.current);
          thinkingTimerRef.current = null;
        }
        setShowThinking(false);
        setIsThinking(false);
        const errorMsg = error instanceof Error ? `Sorry, I couldn't process that. (${error.message})` : "Sorry, I couldn't process that. Please try again!";
        setMessages([...newMessages, { role: "assistant", content: errorMsg }]);
        setCurrentResponse(errorMsg);
        clearTextTimers();
        setDisplayedText(errorMsg);
        await speak(errorMsg);
      }
    });
  };

  const handleBoxClick = async (label: string) => {
    if (!resolvedAuthorized) return;
    if (isThinking) return;
    if (label === "MODE: Letter Fun" && !hasStartedLetterMode) {
      setIsWordChainMode(false);
      setIsStoryMode(false);
      setIsGreeting(true);
      setTimeout(() => setIsGreeting(false), 1500);
      clearTextTimers();
      const firstMessage =
        "Yay! Welcome to Letter Fun 🎉\nWhat do you want to learn today?\nSay one option:\nMagic Letter ✨\nAnimal Calls the Letter 🐶\nSing and Stop Alphabet 🎵\nMystery Box Letter 🎁";
      setHasStartedLetterMode(true);
      setMessages([...messages, { role: "assistant", content: firstMessage }]);
      setCurrentResponse(firstMessage);
      setDisplayedText(firstMessage);
      await waitForNextPaint();
      speak(firstMessage);
      return;
    }
    if (label === "MODE: GAME") {
      setIsWordChainMode(false);
      setIsStoryMode(false);
      clearTextTimers();
      const gameOptions =
        "Awesome! Time to play games 🎮😄\nWhich game do you want to play?\n\nSay one option:\nWord Chain\nRapid Fire\nRiddle Game\nAct and Guess\nMemory Game 🧠✨";
      setMessages([...messages, { role: "assistant", content: gameOptions }]);
      setCurrentResponse(gameOptions);
      setDisplayedText(gameOptions);
      await waitForNextPaint();
      speak(gameOptions);
      return;
    }
    if (label === "MODE: STORY") {
      setIsWordChainMode(false);
      setIsStoryMode(true);
      setShowHistory(false);
      clearTextTimers();
      const storyOptions =
        "Yay! Story time 📖✨\nWhat kind of story do you want to hear?\n\nSay one option:\nMagic Story 🪄\nJungle Adventure 🌿\nChoose Your Story 🤔\nFinish the Story 🎤\nBedtime Story 🌙";
      setMessages([...messages, { role: "assistant", content: storyOptions }]);
      setCurrentResponse(storyOptions);
      setDisplayedText(storyOptions);
      await waitForNextPaint();
      speak(storyOptions);
      return;
    }
    handleUserMessage(label);
  };

  const getWordChainDisplay = (text: string) => {
    const words = text.match(/[A-Za-z]+/g);
    if (!words || words.length === 0) return text.trim();
    return words[words.length - 1];
  };

  const displayResponse = isWordChainMode
    ? getWordChainDisplay(currentResponse || "")
    : currentResponse;

  return (
    <div className={`flex min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' : 'bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100'} relative overflow-hidden`}>
      {/* Floating Background Elements */}
      {[...Array(12)].map((_, i) => (
        <div
          key={`cloud-${i}`}
          className="floating-cloud"
          style={{
            width: `${60 + Math.random() * 80}px`,
            height: `${30 + Math.random() * 40}px`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDuration: `${15 + Math.random() * 10}s`,
            animationDelay: `${Math.random() * 5}s`,
          }}
        >
          ☁️
        </div>
      ))}
      {[...Array(20)].map((_, i) => (
        <div
          key={`star-${i}`}
          className="floating-star"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDuration: `${3 + Math.random() * 3}s`,
            animationDelay: `${Math.random() * 2}s`,
          }}
        >
          ⭐
        </div>
      ))}
      
      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-screen w-24 ${isDarkMode ? 'bg-gradient-to-b from-slate-800/60 to-slate-900/60' : 'bg-gradient-to-b from-rose-100/40 via-pink-50/30 to-blue-100/40'} backdrop-blur-2xl shadow-2xl flex flex-col items-center py-8 z-50 border-r ${isDarkMode ? 'border-slate-700/30' : 'border-white/40'} transition-all duration-500 animate-slide-in`}>
        
        {/* App Name */}
        <div className="mb-10 text-center group hover:scale-110 transition-transform duration-300 cursor-pointer">
          <div className="text-2xl font-black bg-gradient-to-br from-purple-600 via-pink-500 to-blue-500 bg-clip-text text-transparent drop-shadow-lg tracking-tight">
            JENNY
          </div>
          <div className="h-1 w-10 mx-auto mt-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </div>

        <div className="flex-1 flex flex-col items-center gap-5 w-full px-2">
          {/* Chat Icon */}
          <div className="group relative">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 ${showHistory ? 'bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/50 scale-105' : isDarkMode ? 'bg-slate-700/40 hover:bg-slate-600/60 hover:shadow-lg hover:shadow-pink-300/40' : 'bg-gradient-to-br from-pink-200/50 to-rose-100/50 hover:from-pink-300/60 hover:to-rose-200/60 hover:shadow-xl hover:shadow-pink-300/50'} backdrop-blur-sm border ${isDarkMode ? 'border-slate-600/30' : 'border-pink-200/40'}`}
            >
              <span className="text-2xl">💬</span>
            </button>
            <div className={`absolute left-full ml-3 px-3 py-2 ${isDarkMode ? 'bg-slate-800' : 'bg-white'} text-sm font-semibold rounded-xl shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              Chat
            </div>
          </div>

          {/* Profile Icon */}
          <div className="group relative">
            <button
              onClick={() => setShowProfile(!showProfile)}
              className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 ${showProfile ? 'bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/50 scale-105' : isDarkMode ? 'bg-slate-700/40 hover:bg-slate-600/60 hover:shadow-lg hover:shadow-blue-300/40' : 'bg-gradient-to-br from-blue-200/50 to-cyan-100/50 hover:from-blue-300/60 hover:to-cyan-200/60 hover:shadow-xl hover:shadow-blue-300/50'} backdrop-blur-sm border ${isDarkMode ? 'border-slate-600/30' : 'border-blue-200/40'}`}
            >
              <span className="text-2xl">👤</span>
            </button>
            <div className={`absolute left-full ml-3 px-3 py-2 ${isDarkMode ? 'bg-slate-800' : 'bg-white'} text-sm font-semibold rounded-xl shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              Profile
            </div>
          </div>

          {/* Theme Toggle */}
          <div className="group relative">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 ${isDarkMode ? 'bg-gradient-to-br from-yellow-500 to-orange-500 shadow-lg shadow-yellow-500/50' : 'bg-gradient-to-br from-yellow-200/50 to-amber-100/50 hover:from-yellow-300/60 hover:to-amber-200/60 hover:shadow-xl hover:shadow-yellow-300/50'} backdrop-blur-sm border ${isDarkMode ? 'border-yellow-400/30' : 'border-yellow-200/40'}`}
            >
              <span className="text-2xl transition-transform duration-300 group-hover:rotate-180">{isDarkMode ? '🌙' : '☀️'}</span>
            </button>
            <div className={`absolute left-full ml-3 px-3 py-2 ${isDarkMode ? 'bg-slate-800' : 'bg-white'} text-sm font-semibold rounded-xl shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              Theme
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <div className="group relative">
          <button
            onClick={onLogout}
            className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 mb-4 ${isDarkMode ? 'bg-gradient-to-br from-red-500/80 to-pink-600/80 hover:from-red-500 hover:to-pink-600 shadow-lg shadow-red-500/50' : 'bg-gradient-to-br from-red-300/60 to-pink-300/50 hover:from-red-400/70 hover:to-pink-400/60 hover:shadow-xl hover:shadow-red-300/60'} backdrop-blur-sm border ${isDarkMode ? 'border-white/30' : 'border-red-200/40'}`}
          >
            <span className="text-2xl">🚪</span>
          </button>
          <div className={`absolute left-full ml-3 px-3 py-2 ${isDarkMode ? 'bg-slate-800' : 'bg-white'} text-sm font-semibold rounded-xl shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            Logout
          </div>
        </div>
      </aside>

      {resolvedAuthorized === false && (
        <div className="bg-yellow-100 text-yellow-800 text-center py-2 text-sm relative z-10 ml-20">
          Please log in to use Jenny.
        </div>
      )}
      
      {/* Main Content Area */}
      <main className={`flex-1 ${isDarkMode ? 'ml-24' : 'ml-24'} flex flex-col transition-all duration-300 relative ${isDarkMode ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900' : 'bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100'}`}>
        {/* Layered Animated Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="stars-layer opacity-40"></div>
          <div className="absolute top-10 left-0 w-32 h-16 bg-white/10 rounded-full blur-2xl cloud-slow"></div>
          <div className="absolute top-40 left-20 w-40 h-20 bg-purple-300/10 rounded-full blur-3xl cloud-medium"></div>
          <div className="absolute top-60 right-10 w-36 h-18 bg-pink-300/10 rounded-full blur-2xl cloud-fast" style={{ animationDelay: '-20s' }}></div>
          <div className="absolute bottom-32 left-1/4 w-48 h-24 bg-blue-300/10 rounded-full blur-3xl cloud-slow" style={{ animationDelay: '-40s' }}></div>
          <div className="absolute top-20 right-20 w-96 h-96 bg-purple-400/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 left-20 w-80 h-80 bg-pink-400/5 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-400/5 rounded-full blur-3xl"></div>
        </div>
        
        {/* Title Section */}
        <div className={`text-center pt-8 pb-6 relative z-10 ${isDarkMode ? 'text-white' : ''}`}>
          <h1 className="text-7xl font-extrabold bg-gradient-to-r from-purple-600 via-pink-500 to-blue-500 bg-clip-text text-transparent mb-3 drop-shadow-2xl tracking-wide relative inline-block" style={{ backgroundSize: '200% 200%', animation: 'gradient 5s ease infinite' }}>
            JENNY
            <div className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-pink-500 to-transparent opacity-60 animate-shimmer-line"></div>
          </h1>
          <p className={`text-xl font-semibold drop-shadow-md opacity-80 ${isDarkMode ? 'text-purple-300' : 'text-purple-600'}`}>✨ Your AI Learning Buddy ✨</p>
        </div>

        {/* Character Section */}
        <div className="flex-1 flex items-center justify-center px-4 py-4 relative z-10">
          <div className="relative flex items-center justify-center w-full max-w-5xl">
            {/* Jenny Video */}
            {(() => {
              const action = isGreeting
                ? "greeting"
                : isListening
                ? "listening"
                : showThinking
                ? "thinking"
                : isSpeaking
                ? "speaking"
                : "idle";

              const actionClass =
                action === "greeting"
                  ? "animate-wave"
                  : action === "listening"
                  ? "animate-listen"
                  : action === "thinking"
                  ? "animate-think"
                  : action === "speaking"
                  ? "animate-speak"
                  : "";

              const actionEmoji =
                action === "greeting"
                  ? "👋"
                  : action === "listening"
                  ? "🎤"
                  : action === "thinking"
                  ? "🤔"
                  : action === "speaking"
                  ? "🗣️"
                  : "";

              return (
                <div className="relative flex items-center justify-center">
                  {/* Animated Rotating Gradient Ring Border */}
                  <div className="absolute w-[400px] h-[400px] rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 animate-spin-slow opacity-30 blur-2xl"></div>
                  
                  {/* Sparkle Particles */}
                  {[...Array(12)].map((_, i) => (
                    <div
                      key={`particle-${i}`}
                      className="absolute w-2 h-2 bg-yellow-300 rounded-full animate-twinkle"
                      style={{
                        top: `${50 + 48 * Math.cos((i / 12) * Math.PI * 2)}%`,
                        left: `${50 + 48 * Math.sin((i / 12) * Math.PI * 2)}%`,
                        animationDelay: `${i * 0.15}s`,
                        animationDuration: `${2 + Math.random()}s`
                      }}
                    ></div>
                  ))}
                  
                  {/* White Glass Circular Container */}
                  <div className={`relative ${isDarkMode ? 'bg-white/10' : 'bg-gradient-to-br from-blue-100/80 via-pink-100/70 to-blue-50/80'} w-64 md:w-72 lg:w-80 h-64 md:h-72 lg:h-80 rounded-full flex items-center justify-center backdrop-blur-2xl border-4 ${isDarkMode ? 'border-white/20' : 'border-white/80'} overflow-hidden animate-float`}
                    style={{
                      boxShadow: isDarkMode 
                        ? '0 0 150px rgba(168, 85, 247, 0.6), inset 0 0 80px rgba(255, 255, 255, 0.15), 0 0 220px rgba(168, 85, 247, 0.4)'
                        : '0 0 200px rgba(147, 197, 253, 0.5) inset, 0 0 100px rgba(219, 187, 255, 0.4), inset 0 0 60px rgba(255, 200, 221, 0.3)'
                    }}>
                    
                    {/* Status Emoji Badge */}
                    {actionEmoji && (
                      <div className={`absolute -top-4 -right-4 rounded-full shadow-2xl w-14 h-14 flex items-center justify-center text-2xl animate-bounce z-20 ${isDarkMode ? 'bg-gradient-to-br from-purple-500 to-pink-500' : 'bg-gradient-to-br from-purple-400 to-pink-400 border-4 border-white'}`}>
                        {actionEmoji}
                      </div>
                    )}
                    
                    {/* Video */}
                    <video
                      ref={videoRef}
                      src="/jenney_video.mp4"
                      muted
                      autoPlay={false}
                      playsInline
                      preload="auto"
                      onLoadedData={() => console.log("✅ Video loaded successfully")}
                      onError={(e) => console.error("❌ Video load error:", e)}
                      style={{ 
                        filter: 'contrast(1.1) saturate(1.15) brightness(1.0)',
                        objectFit: 'contain',
                        objectPosition: 'center',
                        width: '100%',
                        height: '100%'
                      }}
                      className="drop-shadow-lg transition-all duration-500"
                    />
                  </div>
                </div>
              );
            })()}

            {/* Speech Bubble */}
            <div className="absolute left-1/2 ml-52 max-w-md hidden lg:block">
              <div className="relative bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 text-gray-800 shadow-2xl rounded-[32px] px-8 py-6 min-h-[120px] text-lg leading-relaxed border-4 border-white/50 overflow-hidden"
                style={{ animation: 'fade-in-up 0.6s ease-out' }}>
                {/* Speech bubble tail */}
                <div className="absolute left-0 top-10 -translate-x-4 w-0 h-0 border-t-[20px] border-t-transparent border-b-[20px] border-b-transparent border-r-[24px] border-r-purple-50"></div>
                <div style={{ 
                  animation: isSpeaking || displayedText ? 'fade-in-up 0.5s ease-out' : 'none',
                  minHeight: '1.5rem'
                }}>
                  {showThinking ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="animate-bounce">🤔</span> Thinking...
                    </span>
                  ) : (
                    displayedText || ""
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Learning Boxes */}
        <div className="px-6 pb-6 relative z-10">
          <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              { label: "Letter Fun", emoji: "🅰️", color: "from-pink-400 to-pink-500", payload: "MODE: Letter Fun" },
              { label: "Play Games", emoji: "🎮", color: "from-green-400 to-emerald-500", payload: "MODE: GAME" },
              { label: "Story", emoji: "📖", color: "from-blue-400 to-sky-500", payload: "MODE: STORY" },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => handleBoxClick(item.payload)}
                disabled={!resolvedAuthorized}
                className={`group rounded-[40px] p-10 bg-gradient-to-br ${item.color} text-white transition-all duration-500 hover:scale-105 hover:-translate-y-3 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transform relative overflow-hidden backdrop-blur-sm border-2 border-white/30`}
                style={{
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 10px 30px rgba(0, 0, 0, 0.3), inset 0 2px 10px rgba(255, 255, 255, 0.3)'
                }}
              >
                {/* Shine Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                
                <div className="text-6xl mb-5 transition-transform duration-500 group-hover:scale-125 group-hover:rotate-12 drop-shadow-2xl relative z-10 animate-bounce">{item.emoji}</div>
                <div className="font-bold text-3xl drop-shadow-lg relative z-10 tracking-wide">{item.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Premium Floating Mic Button */}
        <div className="pb-10 flex justify-center relative z-10">
          <button
            onClick={isListening ? stopListening : startListening}
            disabled={!isReady || isThinking || !resolvedAuthorized}
            className={`relative w-24 h-24 rounded-full flex items-center justify-center text-5xl transition-all duration-500 ${
              isListening
                ? 'bg-gradient-to-br from-red-400 via-pink-500 to-red-600 animate-pulse scale-125'
                : 'bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 hover:scale-110 hover:rotate-12'
            } disabled:bg-gray-400 disabled:cursor-not-allowed disabled:opacity-50 shadow-2xl border-4 border-white/40`}
            style={{
              boxShadow: isListening 
                ? '0 0 60px rgba(236, 72, 153, 0.9), 0 0 100px rgba(236, 72, 153, 0.5), 0 15px 40px rgba(0,0,0,0.4)' 
                : '0 0 40px rgba(168, 85, 247, 0.6), 0 15px 40px rgba(168, 85, 247, 0.3), 0 5px 20px rgba(0,0,0,0.3)'
            }}
          >
            {/* Pulse Glow Ring */}
            {!isListening && isReady && (
              <>
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 animate-ping opacity-75"></div>
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 opacity-50 blur-xl"></div>
              </>
            )}
            <span className="relative z-10 drop-shadow-2xl">
              {!isReady ? '⏳' : isListening ? '🔴' : '🎤'}
            </span>
          </button>
        </div>
      </main>

      {/* Floating Blue & Pink Bubbles */}
      <div className="fixed inset-0 w-full h-screen pointer-events-none z-40 overflow-visible">
        {[...Array(15)].map((_, i) => {
          const colors = [
            'rgba(100, 150, 255, 0.8)',
            'rgba(150, 100, 220, 0.8)',
            'rgba(200, 150, 255, 0.8)',
            'rgba(100, 200, 255, 0.8)',
            'rgba(150, 200, 255, 0.8)',
            'rgba(220, 100, 180, 0.8)',
          ];
          const sizes = [60, 80, 100, 120, 140, 160, 180, 200, 220, 240, 260, 280, 300, 320, 340];
          const duration = 16 + i * 1.8;
          const delay = i * 0.4;
          
          return (
            <div
              key={`float-bubble-${i}`}
              className="pointer-events-none absolute rounded-full"
              style={{
                width: `${sizes[i]}px`,
                height: `${sizes[i]}px`,
                background: `radial-gradient(circle at 40% 40%, ${colors[i % 6]}, transparent)`,
                left: `${(i * 7) % 110}%`,
                top: `${(i * 11) % 100}%`,
                filter: 'blur(40px)',
                animation: `float-blob ${duration}s ease-in-out infinite`,
                animationDelay: `${delay}s`,
              }}
            />
          );
        })}
      </div>

      {/* Profile Modal */}
      {showProfile && (
        <div className={`fixed inset-0 flex items-center justify-center z-50 ${isDarkMode ? 'ml-24' : 'ml-24'}`} onClick={() => setShowProfile(false)}>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm"></div>
          <div className={`${isDarkMode ? 'bg-slate-800/95' : 'bg-white/95'} backdrop-blur-md rounded-3xl shadow-2xl p-8 m-4 max-w-sm w-full relative z-10 border ${isDarkMode ? 'border-slate-700/30' : 'border-purple-200/30'}`} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className={`font-bold text-2xl ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>👤 My Profile</h2>
              <button
                onClick={() => setShowProfile(false)}
                className={`w-10 h-10 rounded-full ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'} hover:${isDarkMode ? 'bg-slate-600' : 'bg-gray-300'} flex items-center justify-center text-xl transition-all`}
              >
                ✕
              </button>
            </div>
            
            {/* Profile Content */}
            <div className={`space-y-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              
              {/* Profile Image */}
              <div className="flex justify-center mb-4">
                {userImage && userImage.trim() ? (
                  <img
                    src={userImage}
                    alt={displayName}
                    className="w-28 h-28 rounded-full border-4 border-purple-500 object-cover shadow-xl"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-28 h-28 rounded-full border-4 border-purple-500 bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-5xl shadow-xl font-bold text-white">
                    {displayName ? displayName.charAt(0).toUpperCase() : 'P'}
                  </div>
                )}
              </div>
              
              {/* Name */}
              <div className="text-center">
                <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {displayName || 'Friend'}
                </p>
              </div>
              
              {/* Email */}
              {userEmail && (
                <div className={`p-3 rounded-xl ${isDarkMode ? 'bg-slate-700/50' : 'bg-gray-100'}`}>
                  <p className="text-xs opacity-70 mb-1">Email</p>
                  <p className={`text-sm font-medium break-all ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                    {userEmail}
                  </p>
                </div>
              )}
              
              {/* Google Badge */}
              <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-gradient-to-r from-blue-500/20 to-blue-600/20 border border-blue-400/30">
                <img src="/google.png" alt="Google" className="w-4 h-4" />
                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  Signed in with Google
                </span>
              </div>
              
              {/* Welcome Message */}
              <div className="text-center pt-2">
                <p className="text-sm opacity-75">Welcome to JENNY! 🎉</p>
                <p className="text-xs opacity-60 mt-1">Your AI Learning Buddy is here to help you learn and have fun!</p>
              </div>
              
              {/* Logout Button */}
              <button
                onClick={() => {
                  setShowProfile(false);
                  onLogout?.();
                }}
                className="w-full px-4 py-2 rounded-full bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-all"
              >
                🚪 Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat History Modal */}
      {showHistory && !isWordChainMode && !isStoryMode && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 ml-20" onClick={() => setShowHistory(false)}>
          <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl p-8 m-4 max-w-2xl w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-bold text-purple-600 text-2xl">Chat History 💬</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to delete all chat history?')) {
                      setMessages([]);
                    }
                  }}
                  className="px-4 py-2 rounded-full bg-red-500 hover:bg-red-600 text-white text-sm font-medium flex items-center gap-2 transition-all"
                >
                  🗑️ Delete
                </button>
                <button
                  onClick={() => setShowHistory(false)}
                  className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-xl transition-all"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {messages.length === 0 ? (
                <div className="text-center text-gray-400 py-8">No messages yet</div>
              ) : (
                messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-3xl px-6 py-4 text-base leading-relaxed shadow-lg ${
                        msg.role === "user"
                          ? "bg-gradient-to-br from-purple-500 to-pink-500 text-white"
                          : "bg-gradient-to-br from-blue-50 to-purple-50 text-gray-800 border-2 border-purple-100"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
