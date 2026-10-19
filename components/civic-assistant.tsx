"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, GripVertical, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Position = { x: number; y: number };
type ChatMessage = { from: "bot" | "user"; text: string };

const launcherSize = 52;
const edge = 16;
const chatWidth = 368;
const chatHeight = 448;
// Keep this key stable so existing users retain their saved assistant position.
const positionStorageKey = "civicguard-chat-position";

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}

function clampLauncher(position: Position): Position {
  return {
    x: clamp(position.x, edge, window.innerWidth - launcherSize - edge),
    y: clamp(position.y, edge, window.innerHeight - launcherSize - edge),
  };
}

function initialPosition() {
  return { x: window.innerWidth - launcherSize - 20, y: window.innerHeight - launcherSize - 20 };
}

function panelOrigin(position: Position) {
  const width = Math.min(chatWidth, window.innerWidth - edge * 2);
  const height = Math.min(chatHeight, Math.max(260, window.innerHeight - edge * 2));
  const below = position.y + launcherSize + 12;
  const above = position.y - height - 12;
  const preferredTop = above >= edge ? above : below;
  return {
    left: clamp(position.x + launcherSize - width, edge, window.innerWidth - width - edge),
    top: clamp(preferredTop, edge, window.innerHeight - height - edge),
  };
}

export function CivicAssistant() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([{ from: "bot", text: "Hi - ask how to report an issue or about the status of your own complaints." }]);
  const [loading, setLoading] = useState(false);
  const dragOffset = useRef<Position | null>(null);
  const movedDuringDrag = useRef(false);
  const messageList = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let saved: Position | undefined;
    try {
      const stored = JSON.parse(localStorage.getItem(positionStorageKey) || "null");
      if (typeof stored?.x === "number" && typeof stored?.y === "number") saved = stored;
    } catch {
      // A malformed saved position should not prevent the assistant opening.
    }
    setPosition(clampLauncher(saved || initialPosition()));
    setMounted(true);

    function handleResize() {
      setPosition((current) => clampLauncher(current));
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(positionStorageKey, JSON.stringify(position));
    } catch {
      // Position persistence is optional.
    }
  }, [mounted, position]);

  useEffect(() => {
    messageList.current?.scrollTo({ top: messageList.current.scrollHeight, behavior: "smooth" });
  }, [loading, messages]);

  const panel = useMemo(() => mounted ? panelOrigin(position) : { left: 0, top: 0 }, [mounted, position]);

  function beginDrag(event: React.PointerEvent<HTMLButtonElement>) {
    if (!mounted) return;
    dragOffset.current = { x: event.clientX - position.x, y: event.clientY - position.y };
    movedDuringDrag.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: React.PointerEvent<HTMLButtonElement>) {
    if (!dragOffset.current) return;
    const next = clampLauncher({ x: event.clientX - dragOffset.current.x, y: event.clientY - dragOffset.current.y });
    if (Math.abs(next.x - position.x) > 3 || Math.abs(next.y - position.y) > 3) movedDuringDrag.current = true;
    setPosition(next);
  }

  function endDrag(event: React.PointerEvent<HTMLButtonElement>) {
    if (dragOffset.current) event.currentTarget.releasePointerCapture(event.pointerId);
    dragOffset.current = null;
  }

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (!message.trim() || loading) return;
    const question = message.trim();
    setMessage("");
    setMessages((current) => [...current, { from: "user", text: question }]);
    setLoading(true);
    try {
      const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: question }) });
      const payload = await response.json();
      setMessages((current) => [...current, { from: "bot", text: payload.response || payload.error || "I could not answer that just now." }]);
    } catch {
      setMessages((current) => [...current, { from: "bot", text: "I could not connect right now. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  const shellStyle = mounted ? { left: position.x, top: position.y } : { right: 20, bottom: 20 };
  return (
    <div className="fixed z-40" style={shellStyle}>
      <button
        type="button"
        onPointerDown={beginDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClick={() => {
          if (!movedDuringDrag.current) setOpen((current) => !current);
        }}
        className="grid h-[52px] w-[52px] touch-none place-items-center rounded-full bg-civic-600 text-white shadow-lg transition hover:bg-civic-700"
        aria-label={open ? "Close municipal portal assistant" : "Open municipal portal assistant"}
        title="Drag to move the assistant"
      >
        <span className="absolute -left-1 -top-1 rounded-full bg-white/20 p-0.5" aria-hidden="true"><GripVertical size={12} /></span>
        {open ? <X /> : <Bot />}
      </button>
      {open && (
        <section
          className="absolute flex h-[min(28rem,calc(100vh-2rem))] w-[min(23rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          style={{ left: panel.left - position.x, top: panel.top - position.y }}
          aria-label="Municipal portal assistant"
        >
          <header className="flex items-center gap-3 bg-civic-700 px-4 py-3 text-white">
            <Bot size={19} />
            <div>
              <h2 className="font-bold">Municipal portal assistant</h2>
              <p className="text-xs text-white/75">Private, account-aware help</p>
            </div>
            <p className="ml-auto hidden text-[11px] font-medium text-white/70 sm:block">Drag the round button to move</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1 text-white/80 hover:bg-white/15 hover:text-white"
              aria-label="Close municipal portal assistant"
              title="Close chat"
            >
              <X size={20} />
            </button>
          </header>
          <div ref={messageList} className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((item, index) => (
              <p key={index} className={`max-w-[90%] rounded-2xl px-3 py-2.5 text-sm leading-5 ${item.from === "bot" ? "bg-slate-100 text-slate-700" : "ml-auto bg-civic-600 text-white"}`}>
                {item.text}
              </p>
            ))}
            {loading && <p className="rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-500">Thinking...</p>}
          </div>
          <form className="flex gap-2 border-t border-slate-200 p-3" onSubmit={send}>
            <Input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Ask a question..." aria-label="Message the municipal portal assistant" />
            <Button type="submit" className="shrink-0 px-3" disabled={loading} aria-label="Send"><Send size={17} /></Button>
          </form>
        </section>
      )}
    </div>
  );
}
