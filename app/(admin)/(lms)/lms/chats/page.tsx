"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { 
  MessageSquare, 
  Search, 
  Send, 
  GraduationCap, 
  BookOpen, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Sparkles,
  Bot,
  AlertCircle,
  FileText
} from "lucide-react";

interface Student {
  id: string;
  name: string;
  student_id: string;
  email: string | null;
  phone: string | null;
  batch: string | null;
  status: string | null;
}

interface Message {
  id: string;
  sender: "student" | "admin";
  text: string;
  timestamp: Date;
}

export default function LMSChatsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [chatThreads, setChatThreads] = useState<Record<string, Message[]>>({});
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch students on mount
  useEffect(() => {
    async function loadStudents() {
      try {
        const { data, error } = await supabase
          .from("students")
          .select("id, name, student_id, email, phone, batch, status")
          .order("name", { ascending: true });

        if (error) throw error;

        if (data) {
          setStudents(data);
          
          // Generate realistic initial messages from students
          const initialThreads: Record<string, Message[]> = {};
          const studentQueries = [
            "Hello Sir, I wanted to ask if tomorrow's web dev class is at the regular time?",
            "Sir, I have completed the assignment you uploaded. Can you please check it?",
            "Greetings! I will be absent tomorrow due to family function. Please approve my leave.",
            "Can you please share the notes and PPT for Chapter 4 (Javascript DOM)?",
            "Sir, I have submitted my monthly installment fee online. Please verify my receipt.",
            "Hello, when will the results of the Advanced Python assessment be declared?"
          ];

          data.forEach((s, idx) => {
            const queryText = studentQueries[idx % studentQueries.length];
            initialThreads[s.id] = [
              {
                id: `init-${s.id}`,
                sender: "student",
                text: queryText,
                timestamp: new Date(Date.now() - 3600000 * (idx + 1)) // spaced out hours ago
              }
            ];
          });
          setChatThreads(initialThreads);

          if (data.length > 0) {
            setSelectedStudent(data[0]);
          }
        }
      } catch (err) {
        console.error("Error loading students:", err);
      } finally {
        setLoading(false);
      }
    }

    loadStudents();
  }, []);

  // Scroll to bottom when thread updates
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedStudent, chatThreads, isTyping]);

  const handleSendMessage = (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || !selectedStudent) return;

    const newMsg: Message = {
      id: `admin-${Date.now()}`,
      sender: "admin",
      text: text.trim(),
      timestamp: new Date()
    };

    // Update active thread
    setChatThreads(prev => ({
      ...prev,
      [selectedStudent.id]: [...(prev[selectedStudent.id] || []), newMsg]
    }));

    if (!inputText) {
      setInputText("");
    } else {
      setInputText("");
    }

    // Simulate student response
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      
      const responses = [
        "Sure sir! Thank you so much for the help.",
        "Understood, I will check the syllabus portal now.",
        "Perfect. I will submit the pending tasks before Sunday.",
        "Thank you! Yes, that works for me."
      ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];

      const studentReplyMsg: Message = {
        id: `student-reply-${Date.now()}`,
        sender: "student",
        text: randomResponse,
        timestamp: new Date()
      };

      setChatThreads(prev => ({
        ...prev,
        [selectedStudent.id]: [...(prev[selectedStudent.id] || []), studentReplyMsg]
      }));
    }, 1500);
  };

  const handleQuickAction = (type: "materials" | "attendance" | "fees") => {
    if (!selectedStudent) return;
    let message = "";
    if (type === "materials") {
      message = "Here is the study material resource: https://visionit.co/resources/chapter-4-notes.pdf. Please read through pages 12-25. Let me know if you face any issues in code execution.";
    } else if (type === "attendance") {
      message = "Leave approved. Please go through the recorded lecture in your student portal under Chapter 4. Ensure you mark your self-attendance once complete.";
    } else if (type === "fees") {
      message = "Fees verification complete. Your installment receipt has been updated in the Fees panel. You can download the invoice now from your dashboard.";
    }
    handleSendMessage(message);
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.student_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.batch && s.batch.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="h-[calc(100vh-140px)] flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
      {/* Sidebar List */}
      <div className="w-full md:w-80 lg:w-96 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/20">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="font-black text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
              <MessageSquare size={18} className="text-blue-500" /> Student Support Center
            </h2>
            <span className="text-[10px] bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
              {students.length} students
            </span>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search by name, ID or batch..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-900 border border-transparent focus:border-blue-500/50 focus:bg-white dark:focus:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs rounded-xl outline-none transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/50 custom-scrollbar">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400 font-bold">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              Loading students...
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 font-bold space-y-1">
              <AlertCircle size={20} className="mx-auto text-slate-300" />
              <p>No students found</p>
            </div>
          ) : (
            filteredStudents.map(s => {
              const messages = chatThreads[s.id] || [];
              const lastMessage = messages[messages.length - 1];
              const isSelected = selectedStudent?.id === s.id;
              
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedStudent(s)}
                  className={`w-full text-left p-4 transition-all flex items-start gap-3 relative
                    ${isSelected 
                      ? "bg-white dark:bg-slate-850/60 shadow-sm border-l-4 border-l-blue-600" 
                      : "hover:bg-slate-50 dark:hover:bg-slate-900/30 border-l-4 border-l-transparent"}`}
                >
                  <div className="w-10 h-10 bg-blue-105 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 flex items-center justify-center rounded-xl font-bold shrink-0">
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate pr-2">{s.name}</h4>
                      <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold whitespace-nowrap">
                        {messages[0] ? new Date(messages[0].timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""}
                      </span>
                    </div>
                    <p className="text-xs text-slate-550 dark:text-slate-400 truncate leading-relaxed">
                      {lastMessage ? lastMessage.text : "No messages"}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Conversation Pane */}
      {selectedStudent ? (
        <div className="flex-1 flex flex-col h-full bg-slate-50/10 dark:bg-slate-950/5">
          {/* Chat Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center rounded-xl font-bold">
                {selectedStudent.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 leading-tight flex items-center gap-2">
                  {selectedStudent.name} 
                  <span className="text-[9px] font-mono font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 px-2 py-0.5 rounded border border-blue-100/30 dark:border-blue-900/30 tracking-wider">
                    {selectedStudent.student_id}
                  </span>
                </h3>
                <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-450 dark:text-slate-500 font-semibold">
                  {selectedStudent.batch && (
                    <span className="flex items-center gap-1 font-black uppercase text-indigo-650 dark:text-indigo-400">
                      <GraduationCap size={11} /> Batch: {selectedStudent.batch}
                    </span>
                  )}
                  {selectedStudent.phone && (
                    <span className="flex items-center gap-0.5"><Clock size={10} /> {selectedStudent.phone}</span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border
                ${(selectedStudent.status || "active") === "active" 
                  ? "bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900/40 dark:text-emerald-450" 
                  : "bg-slate-100 border-slate-200 text-slate-600 dark:bg-slate-800/40 dark:border-slate-800 dark:text-slate-400"}`}
              >
                {(selectedStudent.status || "active")}
              </span>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {/* Render Messages */}
            {(chatThreads[selectedStudent.id] || []).map((msg) => {
              const isAdmin = msg.sender === "admin";
              return (
                <div key={msg.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"} group`}>
                  <div className="max-w-[70%] space-y-1">
                    <div 
                      className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-sm
                        ${isAdmin 
                          ? "bg-blue-600 text-white rounded-tr-none" 
                          : "bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-200 border border-slate-200 dark:border-slate-800/80 rounded-tl-none"}`}
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

          {/* Quick responses */}
          <div className="px-4 py-2 bg-slate-50/50 dark:bg-slate-950/10 border-t border-slate-200/50 dark:border-slate-800/50 flex flex-wrap gap-2">
            <span className="text-[10px] text-slate-450 font-black uppercase tracking-wider flex items-center gap-1 shrink-0 mt-1.5">
              <Bot size={12} className="text-blue-500" /> Support Templates:
            </span>
            <button 
              onClick={() => handleQuickAction("materials")} 
              className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] text-slate-655 dark:text-slate-400 font-bold hover:border-blue-500/50 hover:bg-blue-50/20 dark:hover:bg-blue-950/10 transition-all flex items-center gap-1"
            >
              <FileText size={11} /> Share Study Material
            </button>
            <button 
              onClick={() => handleQuickAction("attendance")} 
              className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] text-slate-655 dark:text-slate-400 font-bold hover:border-blue-500/50 hover:bg-blue-50/20 dark:hover:bg-blue-950/10 transition-all flex items-center gap-1"
            >
              <Calendar size={11} /> Approve Absent Leave
            </button>
            <button 
              onClick={() => handleQuickAction("fees")} 
              className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] text-slate-655 dark:text-slate-400 font-bold hover:border-blue-500/50 hover:bg-blue-50/20 dark:hover:bg-blue-950/10 transition-all flex items-center gap-1"
            >
              Verify Fees Payment
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
              placeholder="Type student support reply..."
              className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-950 border border-transparent focus:border-blue-500/50 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs rounded-xl outline-none transition-all"
            />
            <button 
              type="submit"
              disabled={!inputText.trim()}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-550 disabled:opacity-50 text-white rounded-xl transition-all shadow-md shadow-blue-650/10 flex items-center justify-center shrink-0"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-center items-center p-8 bg-slate-50/10 dark:bg-slate-950/5">
          <MessageSquare size={48} className="text-slate-300 dark:text-slate-700 animate-bounce mb-3" />
          <h3 className="font-bold text-slate-850 dark:text-slate-100 text-sm">No Student Selected</h3>
          <p className="text-xs text-slate-400 mt-1">Select a student from the support registry to start chatting.</p>
        </div>
      )}
    </div>
  );
}
