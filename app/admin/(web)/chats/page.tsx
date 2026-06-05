"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { 
  MessageSquare, 
  Search, 
  Send, 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  CheckCircle2, 
  Trash2, 
  Sparkles,
  Bot,
  AlertCircle
} from "lucide-react";

interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  message: string | null;
  created_at: string;
}

interface Message {
  id: string;
  sender: "user" | "admin";
  text: string;
  timestamp: Date;
}

export default function WebChatsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [chatThreads, setChatThreads] = useState<Record<string, Message[]>>({});
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch contacts on mount
  useEffect(() => {
    async function loadContacts() {
      try {
        const { data, error } = await supabase
          .from("contacts")
          .select("id, name, email, phone, message, created_at")
          .order("created_at", { ascending: false });

        if (error) throw error;
        
        if (data) {
          setContacts(data);
          // Initialize chat threads with the contact's initial message
          const initialThreads: Record<string, Message[]> = {};
          data.forEach(c => {
            initialThreads[c.id] = [
              {
                id: `init-${c.id}`,
                sender: "user",
                text: c.message || "Hi, I would like to get in touch with you.",
                timestamp: new Date(c.created_at)
              }
            ];
          });
          setChatThreads(initialThreads);

          // Select first contact by default if available
          if (data.length > 0) {
            setSelectedContact(data[0]);
          }
        }
      } catch (err) {
        console.error("Error loading contacts:", err);
      } finally {
        setLoading(false);
      }
    }

    loadContacts();
  }, []);

  // Scroll to bottom of chat when message is added or contact changed
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedContact, chatThreads, isTyping]);

  const handleSendMessage = (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || !selectedContact) return;

    const newMsg: Message = {
      id: `admin-${Date.now()}`,
      sender: "admin",
      text: text.trim(),
      timestamp: new Date()
    };

    // Update active thread
    setChatThreads(prev => ({
      ...prev,
      [selectedContact.id]: [...(prev[selectedContact.id] || []), newMsg]
    }));

    if (!textToSend) {
      setInputText("");
    }

    // Simulate user reply/agent typing trigger
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      
      // Select a random mock follow-up message from user
      const replies = [
        "Thank you for the quick response! Can you also send me the fees structure?",
        "Okay, I'll visit the campus tomorrow at 11 AM.",
        "Perfect, thanks! I will talk to my parents and register online.",
        "Got it, looking forward to starting the batch."
      ];
      const randomReply = replies[Math.floor(Math.random() * replies.length)];

      const userReplyMsg: Message = {
        id: `user-reply-${Date.now()}`,
        sender: "user",
        text: randomReply,
        timestamp: new Date()
      };

      setChatThreads(prev => ({
        ...prev,
        [selectedContact.id]: [...(prev[selectedContact.id] || []), userReplyMsg]
      }));
    }, 1800);
  };

  const handleQuickAction = (type: "fees" | "call" | "details") => {
    if (!selectedContact) return;
    let message = "";
    if (type === "fees") {
      message = "Hello! Our course fees range from ₹5,000 to ₹15,000 depending on the syllabus and duration. We offer 0% EMI payment options as well. Would you like me to share the detailed PDF list?";
    } else if (type === "call") {
      message = `I have requested our admissions officer to call you on your registered number: ${selectedContact.phone || "provided number"}. You will receive a call within the next 30 minutes!`;
    } else if (type === "details") {
      message = "Here are the batch timings: Morning: 8 AM - 10 AM, Afternoon: 2 PM - 4 PM, and Evening: 6 PM - 8 PM. Practical sessions are held daily with one-on-one mentorship support.";
    }
    handleSendMessage(message);
  };

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (c.phone && c.phone.includes(searchQuery))
  );

  return (
    <div className="h-[calc(100vh-140px)] flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
      {/* Sidebar List */}
      <div className="w-full md:w-80 lg:w-96 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/20">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="font-black text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
              <MessageSquare size={18} className="text-orange-500" /> Web Enquiries Chat
            </h2>
            <span className="text-[10px] bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
              {contacts.length} threads
            </span>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search enquiries..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-900 border border-transparent focus:border-orange-500/50 focus:bg-white dark:focus:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs rounded-xl outline-none transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/50 custom-scrollbar">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400 font-bold">
              <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              Loading enquiry threads...
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 font-bold space-y-1">
              <AlertCircle size={20} className="mx-auto text-slate-300" />
              <p>No enquiries found</p>
            </div>
          ) : (
            filteredContacts.map(c => {
              const messages = chatThreads[c.id] || [];
              const lastMessage = messages[messages.length - 1];
              const isSelected = selectedContact?.id === c.id;
              
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedContact(c)}
                  className={`w-full text-left p-4 transition-all flex items-start gap-3 relative
                    ${isSelected 
                      ? "bg-white dark:bg-slate-850/60 shadow-sm border-l-4 border-l-orange-500" 
                      : "hover:bg-slate-50 dark:hover:bg-slate-900/30 border-l-4 border-l-transparent"}`}
                >
                  <div className="w-10 h-10 bg-orange-100 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 flex items-center justify-center rounded-xl font-bold shrink-0">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate pr-2">{c.name}</h4>
                      <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold whitespace-nowrap">
                        {new Date(c.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate leading-relaxed">
                      {lastMessage ? lastMessage.text : c.message}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Conversation Pane */}
      {selectedContact ? (
        <div className="flex-1 flex flex-col h-full bg-slate-50/10 dark:bg-slate-950/5">
          {/* Chat Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center rounded-xl font-bold">
                {selectedContact.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 leading-tight">{selectedContact.name}</h3>
                <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
                  {selectedContact.email && (
                    <span className="flex items-center gap-1"><Mail size={10} /> {selectedContact.email}</span>
                  )}
                  {selectedContact.phone && (
                    <span className="flex items-center gap-1"><Phone size={10} /> {selectedContact.phone}</span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => handleQuickAction("call")}
                className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-900/50 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-emerald-100 dark:hover:bg-emerald-950/40 transition-all flex items-center gap-1"
              >
                <Phone size={11} /> Request Call
              </button>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {/* Disclaimer of Enquiry */}
            <div className="flex items-center justify-center">
              <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/30 rounded-2xl text-[10px] text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1.5 shadow-inner">
                <Calendar size={12} /> Contact form submitted on {new Date(selectedContact.created_at).toLocaleString()}
              </div>
            </div>

            {/* Render Messages */}
            {(chatThreads[selectedContact.id] || []).map((msg) => {
              const isAdmin = msg.sender === "admin";
              return (
                <div key={msg.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"} group`}>
                  <div className={`max-w-[70%] space-y-1`}>
                    <div 
                      className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-sm
                        ${isAdmin 
                          ? "bg-orange-600 text-white rounded-tr-none" 
                          : "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800/80 rounded-tl-none"}`}
                    >
                      {msg.text}
                    </div>
                    <div className={`flex items-center gap-1 text-[9px] text-slate-400 dark:text-slate-500 font-bold ${isAdmin ? "justify-end" : "justify-start"}`}>
                      <span>
                        {msg.timestamp.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                      </span>
                      {isAdmin && (
                        <CheckCircle2 size={10} className="text-emerald-500" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Typing status */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl rounded-tl-none p-3.5 flex items-center gap-1.5 shadow-sm">
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Quick replies & Actions */}
          <div className="px-4 py-2 bg-slate-50/50 dark:bg-slate-950/10 border-t border-slate-200/50 dark:border-slate-800/50 flex flex-wrap gap-2">
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider flex items-center gap-1 shrink-0 mt-1.5">
              <Bot size={12} className="text-orange-500" /> Quick Replies:
            </span>
            <button 
              onClick={() => handleQuickAction("fees")} 
              className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] text-slate-600 dark:text-slate-400 font-bold hover:border-orange-500/50 hover:bg-orange-50/20 dark:hover:bg-orange-950/10 transition-all"
            >
              Share Fees Structure
            </button>
            <button 
              onClick={() => handleQuickAction("details")} 
              className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] text-slate-600 dark:text-slate-400 font-bold hover:border-orange-500/50 hover:bg-orange-50/20 dark:hover:bg-orange-950/10 transition-all"
            >
              Share Batch Timings
            </button>
          </div>

          {/* Chat Input form */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex gap-3"
          >
            <input 
              type="text" 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type your reply..."
              className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-950 border border-transparent focus:border-orange-500/50 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs rounded-xl outline-none transition-all"
            />
            <button 
              type="submit"
              disabled={!inputText.trim()}
              className="px-4 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-xl transition-all shadow-md shadow-orange-600/10 flex items-center justify-center shrink-0"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-center items-center p-8 bg-slate-50/10 dark:bg-slate-950/5">
          <MessageSquare size={48} className="text-slate-300 dark:text-slate-700 animate-bounce mb-3" />
          <h3 className="font-bold text-slate-850 dark:text-slate-100 text-sm">No Active Conversation</h3>
          <p className="text-xs text-slate-400 mt-1">Select an enquiry thread from the sidebar to view details and start chatting.</p>
        </div>
      )}
    </div>
  );
}
