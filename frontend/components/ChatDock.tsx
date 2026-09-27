"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { sendChatMessage, uploadSkill } from "@/lib/api";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

// Minimal ambient type for the non-standard Web Speech API.
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: any) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

export function ChatDock({ onTaskChange }: { onTaskChange: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: 'Tell me what to track, e.g. "Add Kaggle Sprint due 30 September 6pm". You can also click the mic and speak.',
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    const w = window as any;
    const SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition: SpeechRecognitionLike = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Voice input isn't supported in this browser. Try Chrome.");
      return;
    }
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      recognitionRef.current.start();
      setListening(true);
    }
  };

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");
    setSending(true);
    try {
      const res = await sendChatMessage(text);
      setMessages((prev) => [...prev, { role: "assistant", text: res.reply }]);
      onTaskChange();
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Something went wrong reaching the assistant. Is the backend running?" },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleSkillUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await uploadSkill(file);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: `Skill uploaded as ${res.saved_as}. It'll be available on the next message.` },
      ]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "Skill upload failed." }]);
    }
    e.target.value = "";
  };

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-700 bg-slate-900/60">
      <div className="flex items-center justify-between border-b border-slate-700 px-4 py-2">
        <span className="text-sm font-semibold text-slate-200">HourGlass Assistant</span>
        <label className="cursor-pointer text-xs text-slate-400 hover:text-slate-200">
          + Upload skill
          <input type="file" accept=".py" className="hidden" onChange={handleSkillUpload} />
        </label>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
              m.role === "user"
                ? "ml-auto bg-blue-600 text-white"
                : "bg-slate-800 text-slate-100"
            }`}
          >
            {m.text}
          </div>
        ))}
      </div>

      <form onSubmit={send} className="flex items-center gap-2 border-t border-slate-700 p-3">
        <button
          type="button"
          onClick={toggleListening}
          className={`shrink-0 rounded-full p-2 text-lg ${
            listening ? "bg-red-600" : "bg-slate-700"
          }`}
          title="Voice input"
        >
          🎤
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type an instruction…"
          className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={sending}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
