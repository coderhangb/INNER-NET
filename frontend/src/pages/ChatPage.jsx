import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Brain,
  CheckCircle2,
  Lightbulb,
  LoaderCircle,
  RotateCcw,
  Send,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";
import { Link, useLocation } from "react-router";
import AppHeader from "../components/AppHeader";
import AppFooter from "../components/AppFooter";
import { axiosInstance } from "../libs/axios";
import { useAuthStore } from "../store/useAuthStore";

const suggestions = [
  "I need help with a math problem.",
  "Can you help me understand a science idea?",
  "I want to check if my thinking makes sense.",
];

function makeConversationId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `conversation-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function ChatPage() {
  const location = useLocation();
  const authUser = useAuthStore((state) => state.authUser);

  const firstName = authUser?.fullName?.trim()?.split(/\s+/)[0] || "there";

  const starterPrompt = location.state?.starterPrompt || "";

  const welcomeMessage = useMemo(
    () => ({
      id: "welcome",
      role: "assistant",
      content: `Hi, ${firstName}! 👋 What are you working on today? Tell me the question and what you have tried so far.`,
    }),
    [firstName],
  );

  const [conversationId, setConversationId] = useState(makeConversationId);
  const [messages, setMessages] = useState([welcomeMessage]);
  const [message, setMessage] = useState(starterPrompt);
  const [isSending, setIsSending] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const messageEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, isSending]);

  useEffect(() => {
    if (starterPrompt) {
      textareaRef.current?.focus();
    }
  }, [starterPrompt]);

  const startNewChat = () => {
    setConversationId(makeConversationId());
    setMessages([welcomeMessage]);
    setMessage("");
    setIsComplete(false);
    setErrorMessage("");

    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  };

  const sendMessage = async (event) => {
    event?.preventDefault();

    const cleanMessage = message.trim();

    if (!cleanMessage || isSending) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: cleanMessage,
    };

    setMessages((current) => [...current, userMessage]);
    setMessage("");
    setErrorMessage("");
    setIsSending(true);

    try {
      const response = await axiosInstance.post("/api/llm/chat", {
        conversationId,
        message: cleanMessage,
      });

      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: response.data.reply,
        },
      ]);

      setIsComplete(Boolean(response.data.complete));
    } catch (error) {
      const friendlyMessage =
        error.response?.data?.message ||
        "INNER-NET could not reply just now. Please try again.";

      setErrorMessage(friendlyMessage);
      toast.error(friendlyMessage);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const learnerMessageCount = messages.filter(
    (item) => item.role === "user",
  ).length;

  const coachMessageCount = messages.filter(
    (item) => item.role === "assistant",
  ).length;

  const learningSteps = [
    {
      label: "Share the problem",
      done: learnerMessageCount > 0,
      active: learnerMessageCount === 0,
    },
    {
      label: "Work through the clues",
      done: isComplete,
      active: learnerMessageCount > 0 && !isComplete && coachMessageCount > 1,
    },
    {
      label: "Explain what you learned",
      done: isComplete,
      active: false,
    },
  ];

  return (
    <div className="app-surface min-h-screen text-[#334155]">
      <AppHeader />

      <main className="mx-auto flex h-[calc(100vh-100px)] min-h-145 w-full max-w-7xl flex-col px-3 pt-4 pb-0 mb-6 sm:px-6 sm:pt-6 lg:px-8">
        <div className="mb-4 flex shrink-0 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              to="/"
              className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#E2E8F0] bg-white text-[#64748B] transition hover:border-[#BAE6FD] hover:text-[#0284C7]"
              aria-label="Back to home"
            >
              <ArrowLeft className="size-5" aria-hidden="true" />
            </Link>

            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold text-[#334155] sm:text-2xl">
                Learning chat
              </h1>

              <p className="truncate text-xs text-[#64748B] sm:text-sm">
                Think out loud. Your coach will guide the next step.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={startNewChat}
            className="flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-[#F9A8D4] bg-white px-3 text-sm font-semibold text-[#DB2777] transition hover:bg-[#FCE7F3] sm:px-4"
          >
            <RotateCcw className="size-4" aria-hidden="true" />

            <span className="hidden sm:inline">New chat</span>
          </button>
        </div>

        <div className="grid flex-1 min-h-0 gap-4 lg:grid-cols-[250px_minmax(0,1fr)]">
          <aside className="hidden self-start rounded-3xl border border-[#E2E8F0] bg-white/75 p-5 shadow-[0_12px_35px_rgba(51,65,85,0.07)] backdrop-blur lg:block">
            <div className="flex items-center gap-2 text-sm font-bold text-[#334155]">
              <Brain className="size-5 text-[#0284C7]" aria-hidden="true" />
              Your learning path
            </div>

            <ol className="mt-6 space-y-5">
              {learningSteps.map((step, index) => (
                <li key={step.label} className="relative flex gap-3">
                  {index < learningSteps.length - 1 && (
                    <span
                      className="absolute left-3.5 top-8 h-6 w-px bg-[#E2E8F0]"
                      aria-hidden="true"
                    />
                  )}

                  <span
                    className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                      step.done
                        ? "bg-[#D1FAE5] text-[#059669]"
                        : step.active
                          ? "bg-[#E0F2FE] text-[#0284C7] ring-4 ring-[#E0F2FE]/50"
                          : "bg-[#F1F5F9] text-[#94A3B8]"
                    }`}
                  >
                    {step.done ? (
                      <CheckCircle2 className="size-4" aria-hidden="true" />
                    ) : (
                      index + 1
                    )}
                  </span>

                  <div>
                    <p
                      className={`text-sm font-semibold ${
                        step.active || step.done
                          ? "text-[#334155]"
                          : "text-[#94A3B8]"
                      }`}
                    >
                      {step.label}
                    </p>

                    {step.active && (
                      <p className="mt-1 text-xs leading-5 text-[#64748B]">
                        You are here
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-8 rounded-2xl bg-[#FFF7ED] p-4">
              <div className="flex items-center gap-2 font-semibold text-[#9A3412]">
                <Lightbulb className="size-4" aria-hidden="true" />
                Little reminder
              </div>

              <p className="mt-2 text-xs leading-5 text-[#9A3412]/80">
                It is okay not to know yet. Tell the coach which part feels
                confusing.
              </p>
            </div>
          </aside>

          <section
            className="flex h-full min-w-0 flex-col overflow-hidden rounded-3xl border border-[#E2E8F0] bg-white shadow-[0_18px_50px_rgba(51,65,85,0.09)]"
            aria-label="Chat with INNER-NET"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-[#E2E8F0] px-4 py-3.5 sm:px-5">
              <div className="flex items-center gap-3">
                <div className="relative grid size-10 place-items-center rounded-2xl bg-[#E0F2FE] text-[#0284C7]">
                  <Sparkles className="size-5" aria-hidden="true" />

                  <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-white bg-[#34D399]" />
                </div>

                <div>
                  <p className="text-sm font-bold text-[#334155]">
                    INNER-NET Coach
                  </p>

                  <p className="text-xs text-[#10B981]">Ready to help</p>
                </div>
              </div>

              {isComplete && (
                <span className="flex items-center gap-1.5 rounded-full bg-[#D1FAE5] px-3 py-1.5 text-xs font-semibold text-[#047857]">
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                  You got it!
                </span>
              )}
            </div>

            <div
              className="chat-scroll flex-1 min-h-0 overflow-y-auto bg-[#FFFCFA] px-3 py-5 sm:px-5 sm:py-6"
              aria-live="polite"
            >
              <div className="mx-auto max-w-3xl space-y-5">
                {messages.map((item) => (
                  <div
                    key={item.id}
                    className={`flex gap-2.5 ${
                      item.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {item.role === "assistant" && (
                      <div className="mt-1 grid size-8 shrink-0 place-items-center rounded-xl bg-[#E0F2FE] text-[#0284C7]">
                        <Sparkles className="size-4" aria-hidden="true" />
                      </div>
                    )}

                    <div
                      className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 sm:max-w-[75%] sm:text-[15px] ${
                        item.role === "user"
                          ? "rounded-br-md bg-[#F472B6] text-white shadow-[0_4px_0_#DB2777]"
                          : "rounded-bl-md border border-[#E2E8F0] bg-white text-[#475569] shadow-sm"
                      }`}
                    >
                      {item.content}
                    </div>
                  </div>
                ))}

                {messages.length === 1 && (
                  <div className="grid gap-2 pt-1 sm:grid-cols-3">
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => {
                          setMessage(suggestion);
                          textareaRef.current?.focus();
                        }}
                        className="rounded-2xl border border-[#E2E8F0] bg-white p-3 text-left text-xs font-medium leading-5 text-[#64748B] transition hover:border-[#7DD3FC] hover:bg-[#F0F9FF] hover:text-[#0369A1]"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}

                {isSending && (
                  <div className="flex items-center gap-2.5">
                    <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-[#E0F2FE] text-[#0284C7]">
                      <Sparkles className="size-4" aria-hidden="true" />
                    </div>

                    <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-[#E2E8F0] bg-white px-4 py-3 text-[#94A3B8] shadow-sm">
                      <LoaderCircle
                        className="size-4 animate-spin"
                        aria-hidden="true"
                      />

                      <span className="text-xs font-medium">
                        Thinking about your idea…
                      </span>
                    </div>
                  </div>
                )}

                {errorMessage && (
                  <div className="mx-auto max-w-lg rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-center text-sm text-[#B91C1C]">
                    {errorMessage}
                  </div>
                )}

                <div ref={messageEndRef} />
              </div>
            </div>

            <form
              onSubmit={sendMessage}
              className="shrink-0 border-t border-[#E2E8F0] bg-white p-3 sm:p-4"
            >
              <div className="mx-auto max-w-3xl">
                <div className="flex items-end gap-2 rounded-2xl border-2 border-[#E2E8F0] bg-[#F8FAFC] p-2 transition focus-within:border-[#7DD3FC] focus-within:ring-4 focus-within:ring-[#E0F2FE]">
                  <textarea
                    ref={textareaRef}
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    onKeyDown={handleKeyDown}
                    rows="1"
                    maxLength="2000"
                    placeholder="Tell me the question and what you tried…"
                    className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-2 py-2.5 text-sm leading-6 text-[#334155] outline-none placeholder:text-[#94A3B8] sm:text-[15px]"
                    aria-label="Message to INNER-NET"
                  />

                  <button
                    type="submit"
                    disabled={!message.trim() || isSending}
                    className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#0284C7] text-white shadow-[0_3px_0_#0369A1] transition hover:bg-[#0369A1] active:translate-y-0.5 active:shadow-[0_1px_0_#0369A1] disabled:cursor-not-allowed disabled:bg-[#CBD5E1] disabled:shadow-none"
                    aria-label="Send message"
                  >
                    {isSending ? (
                      <LoaderCircle className="size-5 animate-spin" />
                    ) : (
                      <Send className="size-5" />
                    )}
                  </button>
                </div>

                <p className="mt-2 text-center text-[11px] text-[#94A3B8]">
                  Press Enter to send · Shift + Enter for a new line
                </p>
              </div>
            </form>
          </section>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}

export default ChatPage;
