import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';

export default function AiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "👋 **Hello! I am your NagarSeva Civic AI Assistant.**\n\nHow can I help you today? You can ask me to draft a complaint, check safety routes, or explain municipal services."
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  const quickPrompts = [
    "📝 Help me draft a pothole complaint",
    "💡 Streetlight not working on my street",
    "🗑️ Report illegal garbage dumping",
    "🛡️ How does the Safety Map work?",
    "⏳ How does auto-escalation work?"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend) => {
    const query = textToSend || input.trim();
    if (!query || loading) return;

    const userMessage = { role: 'user', content: query };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const historyPayload = updatedMessages
        .slice(-6)
        .map(m => ({ role: m.role, content: m.content }));

      const response = await apiClient.post('/api/ai/chat', {
        message: query,
        history: historyPayload
      });

      const replyText = response.data?.reply || "I'm here to help. Could you please rephrase that?";
      setMessages(prev => [...prev, { role: 'assistant', content: replyText }]);
    } catch (err) {
      console.error('AI chat error:', err);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: "⚠️ I'm currently having trouble connecting to the civic knowledge service. You can still report issues directly on the [Report Issue](/report) page!"
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickPrompt = (prompt) => {
    handleSend(prompt);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Trigger Button - High Contrast & Glowing Violet */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-3 px-5 py-3.5 bg-gradient-to-r from-[#7c5cff] via-[#6d4df5] to-[#4f46e5] hover:from-[#6d4df5] hover:to-[#4338ca] text-white rounded-full shadow-[0_10px_30px_rgba(124,92,255,0.45)] ring-2 ring-white/30 hover:scale-105 transform transition-all duration-200 cursor-pointer"
          aria-label="Open Civic AI Assistant"
        >
          <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-sm font-black text-white shadow-inner">
            ✨
          </div>
          <span className="font-extrabold text-sm tracking-wide text-white drop-shadow-xs">
            Civic AI Assistant
          </span>
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
          </span>
        </button>
      )}

      {/* Expanded Chat Drawer */}
      {isOpen && (
        <div className="w-[360px] sm:w-[420px] h-[580px] max-h-[85vh] bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.35)] border border-gray-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200 ring-1 ring-black/5">
          {/* Header */}
          <div className="px-5 py-4 bg-gradient-to-r from-[#7c5cff] via-[#6d4df5] to-[#4f46e5] text-white flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-lg shadow-inner text-white">
                ✨
              </div>
              <div>
                <h3 className="font-extrabold text-base text-white leading-tight">
                  NagarSeva AI
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span className="text-xs text-white/90 font-medium">Gemini 1.5 Flash • Civic Intelligence</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/30 flex items-center justify-center text-white transition text-xs font-bold"
              aria-label="Close Assistant"
            >
              ✕
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#f4f4f6]">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-[#7c5cff] text-white rounded-br-xs font-medium'
                      : 'bg-white text-gray-900 border border-gray-200/80 rounded-bl-xs'
                  }`}
                >
                  <div className="whitespace-pre-line">
                    {msg.content}
                  </div>
                </div>
                <span className="text-[10px] text-gray-400 mt-1 px-1 font-semibold">
                  {msg.role === 'user' ? 'You' : 'NagarSeva AI'}
                </span>
              </div>
            ))}

            {loading && (
              <div className="flex items-start gap-2">
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-xs px-4 py-3 shadow-xs flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#7c5cff] animate-bounce"></div>
                  <div className="w-2 h-2 rounded-full bg-[#7c5cff] animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-2 h-2 rounded-full bg-[#7c5cff] animate-bounce [animation-delay:0.4s]"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          <div className="px-3 py-2.5 bg-white border-t border-gray-100 overflow-x-auto whitespace-nowrap scrollbar-none flex gap-1.5">
            {quickPrompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleQuickPrompt(prompt)}
                className="px-3.5 py-1.5 bg-[#f0ecff] hover:bg-[#e4dcff] text-[#7c5cff] border border-[#ddd6fe] rounded-full text-xs font-bold transition shrink-0"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div className="p-3.5 bg-white border-t border-gray-100 flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about municipal issues, routes, rules..."
              className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-full text-xs sm:text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7c5cff] focus:border-[#7c5cff]"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className="p-2.5 rounded-full bg-[#7c5cff] hover:bg-[#6d4df5] text-white disabled:opacity-40 transition shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
