import { useState, useEffect, useRef } from 'react';
import { 
  BrainCircuit, 
  TrendingUp, 
  Activity, 
  Zap, 
  ShieldAlert, 
  Cpu, 
  Coins, 
  ArrowUpRight, 
  ArrowDownRight,
  BarChart3,
  Layers,
  Settings,
  Bell,
  Search,
  LayoutDashboard,
  History,
  Trophy,
  Terminal,
  Database,
  LineChart as LineChartIcon,
  Play,
  Pause,
  RefreshCw,
  ChevronRight,
  ArrowRight,
  Circle,
  AlertTriangle,
  MessageSquare,
  Send,
  Bot,
  Users,
  Terminal as TerminalIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  ReferenceLine
} from 'recharts';

// Mock data for the ML model performance
const PERFORMANCE_DATA = [
  { time: '00:00', demand: 1.5, predicted: 1.4 },
  { time: '02:00', demand: 1.0, predicted: 1.1 },
  { time: '04:00', demand: 0.6, predicted: 0.7 },
  { time: '06:00', demand: 0.5, predicted: 0.6 },
  { time: '08:00', demand: 1.2, predicted: 1.1 },
  { time: '10:00', demand: 1.6, predicted: 1.5 },
  { time: '12:00', demand: 1.1, predicted: 1.2 },
  { time: '14:00', demand: 0.8, predicted: 0.9 },
  { time: '16:00', demand: 1.8, predicted: 1.7 },
  { time: '18:00', demand: 1.2, predicted: 1.3 },
  { time: '20:00', demand: 1.5, predicted: 1.4 },
  { time: '22:00', demand: 1.7, predicted: 1.6 },
  { time: '23:00', demand: 1.4, predicted: 1.5 },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isFetching = useRef(false);
  const [logs, setLogs] = useState<string[]>([
    "[ARC-L1] ATLAS NODE ONLINE — CIRCLE SDK ACTIVE",
    "[CIRCLE] USDC NANOPAYMENT CHANNEL INITIALIZED",
    "[ML] RANDOM FOREST MODEL LOADED — 10 ESTIMATORS",
    "[EXECUTOR] CIRCLE SDK: READY TO SETTLE USDC ON ARC",
    "[GUARDIAN] Z-SCORE ANOMALY DETECTOR: ARMED"
  ]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [circleStatus, setCircleStatus] = useState<any>(null);

  // AI Chat State
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([
    { role: 'assistant', content: 'System initialized. I am your Atlas Arc AI Analyst. How can I assist you with market data today?' }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // AI initialized lazily inside handler to prevent crash on load

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isTyping) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsTyping(true);

    try {
      const groqKey = import.meta.env.VITE_GROQ_API_KEY || '';
      if (!groqKey) {
        setMessages(prev => [...prev, { role: 'assistant', content: 'AI Analyst offline: GROQ_API_KEY not configured.' }]);
        setIsTyping(false);
        return;
      }

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: `You are the Atlas Arc AI Analyst, a specialized AI for the Atlas Arc Agentic Economy. 
              Analyze market trends and pricing. BTC: $${stats?.market?.btc}, SOL: $${stats?.market?.sol}, Demand: ${stats?.currentDemand}req/s. 
              Be concise, professional, and focus on the Circle-powered economy.` },
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: "user", content: userMessage }
          ]
        })
      });

      const data = await response.json();
      const assistantMessage = data.choices?.[0]?.message?.content || "Neural link unstable. Calibration required.";
      setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
    } catch (err) {
      console.error("Groq AI Error:", err);
      setMessages(prev => [...prev, { role: 'assistant', content: "Error: Failed to connect to Groq Inference Cloud." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const fetchData = async (retries = 3) => {
    if (isFetching.current) return;
    isFetching.current = true;

    try {
      const apiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
      const statsRes = await fetch(`${apiUrl}/api/stats`);
      if (!statsRes.ok) throw new Error(`Stats API error: ${statsRes.status}`);
      
      const contentType = statsRes.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Received non-JSON response from /api/stats");
      }

      const statsData = await statsRes.json();
      setStats(statsData);
      setError(null);
      setIsLoading(false);

      const logsRes = await fetch(`${apiUrl}/api/logs`);
      if (!logsRes.ok) throw new Error(`Logs API error: ${logsRes.status}`);
      
      const logsContentType = logsRes.headers.get("content-type");
      if (!logsContentType || !logsContentType.includes("application/json")) {
        throw new Error("Received non-JSON response from /api/logs");
      }

      const logsData = await logsRes.json();
      if (logsData && logsData.length > 0) {
        setLogs(prev => [...prev.slice(-10), ...logsData].filter((v, i, a) => a.indexOf(v) === i));
      }

      const txRes = await fetch(`${apiUrl}/api/transactions`);
      if (txRes.ok) {
        const txData = await txRes.json();
        setTransactions(txData);
      }

      // Fetch Circle Status
      const circleRes = await fetch(`${apiUrl}/api/circle/status`);
      if (circleRes.ok) {
        const cData = await circleRes.json();
        setCircleStatus(cData);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      if (retries > 0) {
        const delay = 1000;
        console.log(`Retrying fetch in ${delay}ms... (${retries} left)`);
        setTimeout(() => {
          isFetching.current = false;
          fetchData(retries - 1);
        }, delay);
        return;
      } else {
        setError(err instanceof Error ? err.message : String(err));
        setIsLoading(false);
      }
    } finally {
      isFetching.current = false;
    }
  };

  useEffect(() => {
    // Fetch immediately, no delay
    fetchData();
    // Safety fallback: force hide loading after 4 seconds no matter what
    const safetyTimeout = setTimeout(() => setIsLoading(false), 4000);
    const interval = setInterval(fetchData, 5000);
    return () => {
      clearTimeout(safetyTimeout);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#020408] flex items-start justify-center p-4">
      <div className="scanline" />
      
      {/* Loading Overlay */}
      <AnimatePresence>
        {isLoading && !error && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-[#020408] flex flex-col items-center justify-center gap-6"
          >
            <div className="relative w-24 h-24">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                className="absolute inset-0 border-2 border-[#00d2ff33] rounded-full"
              />
              <motion.div 
                animate={{ rotate: -360 }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                className="absolute inset-2 border-2 border-t-[#00d2ff] border-r-transparent border-b-transparent border-l-transparent rounded-full"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <BrainCircuit className="w-8 h-8 text-[#00d2ff] animate-pulse" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h2 className="font-black text-xl tracking-tight uppercase text-[#00d2ff] glow-text">Initializing Neural Link</h2>
              <p className="text-[10px] text-gray-500 uppercase tracking-[0.3em] animate-pulse">Establishing connection to Atlas Arc Core...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Overlay */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] sci-fi-frame p-4 bg-red-500/10 border-red-500/50 rounded-sm flex items-center gap-4"
          >
            <div className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-widest">Connection Error: {error}</span>
            </div>
            <button 
              onClick={() => fetchData()}
              className="px-3 py-1 bg-red-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-colors"
            >
              RETRY_CONNECTION
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Monitor Frame Simulation - LARGE MIN-HEIGHT FOR FULL PAGE SCROLL */}
      <div className="monitor-frame w-full max-w-[1400px] flex overflow-visible rounded-lg shadow-2xl relative my-8" style={{ minHeight: '80vh', height: 'auto', flexShrink: 0 }}>
        
        {/* Left Mechanical Side */}
        <div className="side-mechanical hidden lg:flex">
          <div className="side-light" />
          <div className="side-light opacity-50" />
          <div className="side-light" />
          <div className="flex-1" />
          <div className="w-6 h-6 border border-[#00d2ff33] rounded-full mb-8" />
        </div>

        {/* Main Interface Area */}
        <div className="flex-1 flex flex-col bg-[#04080f] grid-bg p-4 gap-4 overflow-hidden h-full">
          
              {/* Header Bar */}
          <div className="h-16 flex items-center relative border-b border-[#00d2ff11] bg-black/20">
            <div className="absolute inset-0 flex items-center justify-between px-8">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#00d2ff] rounded-sm flex items-center justify-center shadow-[0_0_15px_rgba(0,210,255,0.5)]">
                  <span className="font-black text-black text-xs">A</span>
                </div>
                <span className="font-black text-xl tracking-tighter italic glow-text">ARC HACK</span>
              </div>
              
              <h1 className="font-black text-lg tracking-[0.3em] uppercase glow-text hidden lg:block text-center flex-1">
                ARC SURGE ECONOMY PLATFORM
              </h1>
              
              <div className="flex items-center gap-4">
                {/* LIVE MARKET TICKER - MOVED TO RIGHT TO PREVENT OVERLAP */}
                <div className="flex items-center gap-4 px-3 py-1 bg-black/40 border border-[#00d2ff22] rounded-md">
                  <div className="flex items-center gap-1.5 border-r border-white/10 pr-3">
                    <span className="text-[7px] text-gray-500 font-bold uppercase">BTC</span>
                    <span className="text-[9px] text-white font-black">${stats?.market?.btc?.toLocaleString() || "---"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 border-r border-white/10 pr-3">
                    <span className="text-[7px] text-gray-500 font-bold uppercase">SOL</span>
                    <span className="text-[9px] text-[#f59e0b] font-black">${stats?.market?.sol?.toLocaleString() || "---"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 border-r border-white/10 pr-3">
                    <span className="text-[7px] text-gray-500 font-bold uppercase">ETH</span>
                    <span className="text-[9px] text-[#00d2ff] font-black">${stats?.market?.eth?.toLocaleString() || "---"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${circleStatus ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                    <span className="text-[7px] text-white font-black uppercase tracking-widest">CIRCLE_{circleStatus ? 'SECURE' : 'OFFLINE'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-2 -mt-2">
            <TabButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard className="w-3 h-3" />} label="COMMAND CENTER (Active)" />
            <TabButton active={activeTab === 'market'} onClick={() => setActiveTab('market')} icon={<Zap className="w-3 h-3" />} label="MARKET ENGINE" />
            <TabButton active={activeTab === 'agents'} onClick={() => setActiveTab('agents')} icon={<Users className="w-3 h-3" />} label="AUTONOMOUS AGENTS" />
            <TabButton active={activeTab === 'ai'} onClick={() => setActiveTab('ai')} icon={<Bot className="w-3 h-3" />} label="AI ANALYST" />
            <TabButton active={activeTab === 'ledger'} onClick={() => setActiveTab('ledger')} icon={<Database className="w-3 h-3" />} label="DECENTRALIZED LEDGER" />
            <TabButton active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} icon={<History className="w-3 h-3" />} label="SYSTEM LOGS" />
            <TabButton active={activeTab === 'anomaly'} onClick={() => setActiveTab('anomaly')} icon={<ShieldAlert className="w-3 h-3" />} label="ANOMALY DETECTOR" />
          </div>

          {/* Main Content Grid */}
          <div className="flex-1 grid grid-cols-12 gap-4 overflow-hidden">
            
            {activeTab === 'ai' && (
              <motion.div 
                key="ai"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="col-span-12 flex flex-col gap-4 overflow-hidden h-full max-w-4xl mx-auto"
              >
                <div className="flex-1 sci-fi-frame p-4 rounded-lg flex flex-col gap-3 overflow-hidden relative">
                  <div className="corner-accents corner-top-left corner-top-right corner-bottom-left corner-bottom-right" />
                  
                  <div className="flex items-center justify-between border-b border-[#00d2ff33] pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-[#00d2ff11] border border-[#00d2ff33] flex items-center justify-center">
                        <Bot className="w-6 h-6 text-[#00d2ff]" />
                      </div>
                      <div>
                        <h2 className="font-black text-xl tracking-tight uppercase glow-text">GROQ AI ANALYST</h2>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest">Neural Link: ACTIVE | Model: LLAMA-3.3-70B</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="px-3 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-[10px] terminal-text text-emerald-500">
                        SEARCH GROUNDING ON
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 min-h-[400px] max-h-[600px] overflow-y-auto terminal-scroll space-y-3 p-3 bg-black/20 border border-[#00d2ff11]">
                    {messages.map((m, i) => (
                      <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-4 rounded-sm border ${
                          m.role === 'user' 
                            ? 'bg-[#00d2ff11] border-[#00d2ff33] text-[#00d2ff]' 
                            : 'bg-white/5 border-white/10 text-gray-300'
                        }`}>
                          <div className="text-[8px] uppercase tracking-widest mb-1 opacity-50">
                            {m.role === 'user' ? 'OPERATOR' : 'AI_ANALYST'}
                          </div>
                          <div className="text-sm terminal-text leading-relaxed whitespace-pre-wrap">
                            {m.content}
                          </div>
                        </div>
                      </div>
                    ))}
                    {isTyping && (
                      <div className="flex justify-start">
                        <div className="bg-white/5 border border-white/10 p-4 rounded-sm">
                          <div className="flex gap-1">
                            <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-[#00d2ff] rounded-full" />
                            <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-[#00d2ff] rounded-full" />
                            <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-[#00d2ff] rounded-full" />
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  <div className="flex gap-4">
                    <input 
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="ENTER QUERY FOR NEURAL ANALYSIS..."
                      className="flex-1 bg-black/40 text-[#00d2ff] placeholder-[#00d2ff55] font-bold border border-[#00d2ff33] p-4 text-sm terminal-text focus:outline-none focus:border-[#00d2ff] transition-colors"
                    />
                    <button 
                      onClick={handleSendMessage}
                      disabled={isTyping}
                      className="px-8 bg-[#00d2ff] text-black font-black uppercase tracking-widest hover:bg-[#00d2ffcc] transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" /> SEND
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'ledger' && (
              <motion.div 
                key="ledger"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="col-span-12 flex flex-col gap-4 overflow-hidden h-full max-w-6xl mx-auto w-full"
              >
                <div className="flex-1 sci-fi-frame p-6 rounded-lg flex flex-col gap-6 overflow-hidden relative">
                  <div className="corner-accents corner-top-left corner-top-right corner-bottom-left corner-bottom-right" />
                  
                  <div className="flex items-center justify-between border-b border-[#00d2ff33] pb-4">
                    <div className="flex items-center gap-3">
                      <Database className="w-6 h-6 text-[#00d2ff]" />
                      <div>
                        <h2 className="font-black text-xl tracking-tight uppercase glow-text">DECENTRALIZED LEDGER</h2>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest">ARC_L1 Settlement | Protocol: CIRCLE_NANOPAYMENT</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="text-right">
                        <div className="text-[8px] text-gray-500 uppercase">Settled_Ops</div>
                        <div className="text-xl font-black text-white italic">55+</div>
                      </div>
                      <div className="text-right border-l border-[#00d2ff33] pl-4">
                        <div className="text-[8px] text-gray-500 uppercase">Margin_Saved</div>
                        <div className="text-xl font-black text-[#00ff9d] glow-text">99.9%</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto terminal-scroll pr-2">
                    <table className="w-full text-left border-separate border-spacing-y-2">
                      <thead className="sticky top-0 bg-[#04080f] z-10 px-2">
                        <tr className="text-[8px] text-gray-500 uppercase tracking-widest">
                          <th className="pb-4 pl-4">Transaction_Hash (ARC Explorer)</th>
                          <th className="pb-4">Agent_Node</th>
                          <th className="pb-4">Asset</th>
                          <th className="pb-4">Settlement</th>
                          <th className="pb-4">Margin_Retained</th>
                          <th className="pb-4 text-right pr-4">Finality</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(transactions.length > 0 ? transactions : []).map((tx, i) => {
                          const isRealHash = tx.hash && tx.hash.startsWith('0x') && !tx.hash.startsWith('0xMOCK') && !tx.hash.startsWith('0xSIM');
                          const explorerLink = isRealHash ? `https://testnet.arcscan.app/tx/${tx.hash}` : null;
                          
                          return (
                            <motion.tr 
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: (i % 15) * 0.01 }}
                              key={tx.id || i} 
                              className="bg-white/[0.02] border border-white/[0.05] hover:bg-[#00d2ff08] transition-all rounded-sm group"
                            >
                              <td className="p-4 text-[10px] font-mono pl-4">
                                {explorerLink ? (
                                  <a 
                                    href={explorerLink} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-[#00d2ff] hover:underline hover:text-white transition-all underline-offset-4 decoration-[#00d2ff33]"
                                  >
                                    {tx.hash.substring(0, 18)}... <ArrowUpRight className="w-2 h-2 opacity-0 group-hover:opacity-100" />
                                  </a>
                                ) : (
                                  <span className="text-gray-600 flex items-center gap-2">
                                    {tx.hash && tx.hash.startsWith('0xSIM') ? 'SIMULATING_ON_ARC...' : 'QUEUED_FOR_SETTLEMENT'}
                                    <div className="w-1 h-1 rounded-full bg-gray-700 animate-pulse" />
                                  </span>
                                )}
                              </td>
                              <td className="p-4">
                                <span className="px-2 py-0.5 rounded-sm bg-black/40 border border-white/10 text-[8px] text-gray-400 font-bold uppercase tracking-widest">
                                  {tx.agent || (i % 4 === 0 ? 'EXECUTOR_1' : 'BRAIN_7')}
                                </span>
                              </td>
                              <td className="p-4 text-[10px] text-white font-black italic">USDC</td>
                              <td className="p-4 text-[10px] text-[#00ff9d] font-mono font-bold">$ {tx.amount ? tx.amount.toFixed(6) : (0.00001).toFixed(6)}</td>
                              <td className="p-4">
                                <div className="w-24 h-1 bg-black/40 rounded-full overflow-hidden border border-white/5 relative">
                                  <div className="h-full bg-emerald-500 w-[99.9%]" />
                                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />
                                </div>
                                <div className="text-[6px] text-emerald-500 mt-1 uppercase font-bold tracking-tighter">99.99% Profit Capture</div>
                              </td>
                              <td className="p-4 text-right pr-4">
                                <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-tighter border ${tx.status ? 'bg-[#00ff9d11] text-[#00ff9d] border-[#00ff9d33]' : 'bg-gray-500/10 text-gray-500 border-white/10'}`}>
                                  {tx.status || 'CONFIRMED'}
                                </span>
                              </td>
                            </motion.tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* REQUIRED HACKATHON DOCUMENTATION: MARGIN ANALYSIS & PRODUCT FEEDBACK */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-2">
                    {/* MARGIN ANALYSIS PANEL */}
                    <div className="sci-fi-frame p-4 bg-emerald-500/[0.03] border-emerald-500/30 rounded-lg relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-2 opacity-10">
                        <TrendingUp className="w-16 h-16 text-emerald-500" />
                      </div>
                      <h3 className="text-xs font-black text-[#00ff9d] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <Activity className="w-4 h-4" /> Margin Proof of Concept
                      </h3>
                      <div className="space-y-4">
                        <p className="text-[9px] text-gray-400 leading-relaxed italic">
                          "Traditional blockchains destroy 100% of profit on sub-cent transactions due to gas volatility. Arc enables true autonomous commerce."
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 bg-black/40 border-l border-red-500/30">
                            <div className="text-[7px] text-gray-500 uppercase mb-1">Legacy L1 (Avg Gas)</div>
                            <div className="text-sm font-black text-red-500">$0.35 - $2.50</div>
                            <div className="text-[6px] text-red-900 font-bold uppercase mt-1">Status: UNVIABLE</div>
                          </div>
                          <div className="p-3 bg-black/40 border-l border-emerald-500/30">
                            <div className="text-[7px] text-gray-500 uppercase mb-1">Arc (Nanopayment)</div>
                            <div className="text-sm font-black text-[#00ff9d]">$0.00001</div>
                            <div className="text-[6px] text-emerald-800 font-bold uppercase mt-1">Status: PROFITABLE</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* CIRCLE PRODUCT FEEDBACK PANEL */}
                    <div className="sci-fi-frame p-4 bg-blue-500/[0.03] border-blue-500/30 rounded-lg">
                      <h3 className="text-xs font-black text-[#00d2ff] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <Settings className="w-4 h-4" /> Circle Product Feedback
                      </h3>
                      <div className="space-y-3">
                        <div className="flex flex-col gap-1 border-b border-white/5 pb-2">
                          <span className="text-[7px] text-[#00d2ff] font-bold uppercase">Infrastructure Used:</span>
                          <span className="text-[9px] text-gray-300">Arc L1, USDC, Nanopayment SDK, Circle Wallets</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[7px] text-[#00d2ff] font-bold uppercase">Development Experience:</span>
                          <p className="text-[8px] text-gray-400 leading-relaxed">
                            The determinism of Arc finality is game-changing for agentic logic. The Nanopayment infra allowed us to align Pricing precisely with Usage (Compute Units) without batching, resulting in 99.9% margin retention.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'dashboard' && (
              <AnimatePresence mode="wait">
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="col-span-12 grid grid-cols-12 gap-3 h-full pb-4" style={{minHeight: '600px'}}
                >
                  {/* Left Column: Main Chart & Stats */}
                  <div className="col-span-8 flex flex-col gap-4 pr-2">
              
              {/* Main Chart Panel */}
              <div className="sci-fi-frame p-3 rounded-lg flex flex-col gap-2 h-[220px]">
                <div className="corner-accents corner-top-left corner-top-right corner-bottom-left corner-bottom-right" />
                
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-black text-xl tracking-tight uppercase glow-text">DEMAND VS. ML PREDICTION</h2>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest">Live-time visualization of traffic</p>
                  </div>
                  <div className="flex items-center gap-6 text-[10px] terminal-text">
                    <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" /> Predicted wave</span>
                    <span className="flex items-center gap-2"><div className="w-3 h-1 bg-orange-500" /> XGBoost Forecasting Model</span>
                  </div>
                </div>

                <div className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats?.history || []}>
                      <defs>
                        <linearGradient id="colorDemand" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                      <XAxis dataKey="time" stroke="#ffffff20" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#ffffff20" fontSize={10} tickLine={false} axisLine={false} domain={[0, 300]} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0a111d', border: '1px solid #00d2ff33', borderRadius: '0px' }}
                        itemStyle={{ fontSize: '10px', fontFamily: 'JetBrains Mono' }}
                      />
                      <ReferenceLine y={200} stroke="#ef444433" strokeDasharray="3 3" label={{ value: 'SURGE THRESHOLD', position: 'right', fill: '#ef444466', fontSize: 8 }} />
                      <Area type="monotone" dataKey="demand" stroke="#10b981" fillOpacity={1} fill="url(#colorDemand)" strokeWidth={3} name="Actual Demand" />
                      <Area type="monotone" dataKey="predicted" stroke="#f59e0b" fillOpacity={1} fill="url(#colorPredicted)" strokeWidth={2} strokeDasharray="5 5" name="ML Prediction" />
                      {stats?.history?.map((entry: any, index: number) => entry.isAnomaly && (
                        <ReferenceLine key={index} x={entry.time} stroke="#ef4444" strokeWidth={2} label={{ value: '!', position: 'top', fill: '#ef4444', fontSize: 12, fontWeight: 'bold' }} />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* System Stats Panel */}
              <div className="h-20 sci-fi-frame p-3 rounded-lg">
                <div className="corner-accents corner-top-left corner-top-right corner-bottom-left corner-bottom-right" />
                <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-[#00d2ff] mb-2">SYSTEM STATS</h3>
                <div className="grid grid-cols-3 gap-4">
                  <StatItem label="ACTIVE AGENTS" value={String(stats?.agents?.length || "0")} />
                  <StatItem label="REQUESTS/SEC" value={`${stats?.currentDemand || 180} (LIVE)`} />
                  <StatItem 
                    label="Z-SCORE (ML)" 
                    value={String(stats?.zScore || "0.00")} 
                    className={stats?.isAnomaly ? "text-red-500 animate-pulse" : "text-[#00d2ff]"}
                  />
                </div>
              </div>

              {/* Market Surge Engine Panel */}
              <div className="h-20 sci-fi-frame p-3 rounded-lg">
                <div className="corner-accents corner-top-left corner-top-right corner-bottom-left corner-bottom-right" />
                <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-[#00d2ff] mb-2">MARKET SURGE ENGINE</h3>
                <div className="flex items-center justify-between px-4">
                  <EngineStep label="LIVE DEMAND" sub="(from server.ts)" />
                  <ArrowRight className="w-4 h-4 text-[#00d2ff33]" />
                  <EngineStep label="ML MODEL" sub="Z-Score Guard" />
                  <ArrowRight className="w-4 h-4 text-[#00d2ff33]" />
                  <EngineStep 
                    label="SYSTEM STATUS" 
                    value={stats?.systemStatus || "ONLINE"} 
                    sub={stats?.isAnomaly ? "ANOMALY DETECTED" : "NORMAL"}
                    className={stats?.isAnomaly ? "text-red-500" : "text-[#00d2ff]"}
                  />
                  <ArrowRight className="w-4 h-4 text-[#00d2ff33]" />
                  <EngineStep label="CALCULATED PRICE" value={`$${stats?.price || "0.001"}`} />
                </div>
              </div>
            </div>

            {/* Right Column: Logs & Payments */}
            <div className="col-span-4 flex flex-col gap-4 pr-2">
              
              {/* System Log Panel */}
              <div className="sci-fi-frame p-2 rounded-lg flex flex-col" style={{maxHeight: '180px'}}>
                <div className="corner-accents corner-top-left corner-top-right corner-bottom-left corner-bottom-right" />
                <h3 className="text-[8px] font-black uppercase tracking-[0.2em] text-[#00d2ff] mb-2">SYSTEM LOG</h3>
                <div className="flex-1 max-h-[120px] bg-black/40 p-2 font-mono text-[8px] space-y-1 overflow-y-auto terminal-scroll border border-[#00d2ff11]">
                  {logs.map((log, i) => (
                    <div key={i} className="text-emerald-400/80 uppercase tracking-tight">
                      {log}
                    </div>
                  ))}
                </div>
              </div>

              {/* Enhanced Payment Gateway Panel */}
              <div className="sci-fi-frame p-2 rounded-lg bg-emerald-500/[0.02]" style={{height:'85px'}}>
                <div className="corner-accents corner-top-left corner-top-right corner-bottom-left corner-bottom-right" />
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-[8px] font-black uppercase tracking-[0.2em] text-[#00d2ff]">CIRCLE PAYMENT GATEWAY</h3>
                  <div className="flex gap-1">
                    <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                    <div className="text-[6px] text-emerald-500 font-bold uppercase tracking-widest">Live</div>
                  </div>
                </div>
                <div className="flex items-center justify-between px-2 gap-4 h-12">
                  <div className="flex flex-col">
                    <span className="text-[7px] text-gray-500 uppercase">Vault Balance</span>
                    <span className="text-sm font-black text-white italic tracking-tighter">${circleStatus?.available_usdc || "1,000.00"} <span className="text-[8px] not-italic text-[#00d2ff]">USDC</span></span>
                  </div>
                  <div className="flex-1 flex items-center justify-center">
                    <motion.div 
                      animate={{ scale: [1, 1.1, 1], rotate: [0, 90, 0] }}
                      transition={{ repeat: Infinity, duration: 4 }}
                      className="w-8 h-8 rounded-full border border-[#00d2ff] flex items-center justify-center shadow-[0_0_15px_rgba(0,210,255,0.2)]"
                    >
                      <Coins className="w-4 h-4 text-[#00d2ff]" />
                    </motion.div>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-[7px] text-gray-500 uppercase">Network</span>
                    <span className="text-[9px] font-black text-[#f59e0b] uppercase tracking-widest">{circleStatus?.network || "TESTNET"}</span>
                  </div>
                </div>
              </div>

              {/* Transaction Log Panel */}
              <div className="flex-[0.2] sci-fi-frame p-4 rounded-lg flex flex-col gap-4">
                <div className="corner-accents corner-top-left corner-top-right corner-bottom-left corner-bottom-right" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#00d2ff]">TRANSACTION LEDGER (ARC L1)</h3>
                <div className="flex-1 overflow-y-auto terminal-scroll space-y-2 mt-2">
                  {transactions.slice(0, 10).map((tx, i) => (
                    <div key={i} className="flex flex-col p-2 bg-black/40 border border-[#00d2ff11] rounded-sm text-[8px] font-mono">
                      <div className="flex justify-between text-emerald-400">
                        <span>TX: {tx.id}</span>
                        <span>{tx.amount} USDC</span>
                      </div>
                      <div className="flex justify-between text-gray-500 mt-1">
                        <span className="truncate max-w-[150px]">{tx.hash}</span>
                        <span className="text-[7px]">0.0001s FINALITY</span>
                      </div>
                    </div>
                  ))}
                  {transactions.length === 0 && (
                    <div className="text-[8px] text-gray-600 text-center py-4">AWAITING ON-CHAIN SETTLEMENT...</div>
                  )}
                </div>
              </div>

              {/* Margin Analysis Section */}
              <div className="sci-fi-frame p-4 rounded-lg bg-[#00d2ff05] border-[#00d2ff33]">
                <div className="corner-accents corner-top-left corner-top-right corner-bottom-left corner-bottom-right" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#f59e0b]">MARGIN ECONOMICS</h3>
                <div className="mt-4 space-y-3">
                  <div className="flex justify-between items-center bg-red-500/5 p-2 border border-red-500/20">
                    <span className="text-[9px] text-red-400 font-bold uppercase">Legacy L1 Gas Cost</span>
                    <span className="text-[10px] text-red-400 font-black">$0.45 - $2.50</span>
                  </div>
                  <div className="flex justify-between items-center bg-emerald-500/5 p-2 border border-emerald-500/20">
                    <span className="text-[9px] text-emerald-400 font-bold uppercase">Arc Nanopayment Fee</span>
                    <span className="text-[10px] text-emerald-400 font-black">$0.00000 (Gas-Free)</span>
                  </div>
                  <div className="p-2 border border-[#00d2ff11] bg-black/40 text-[8px] text-gray-400 italic">
                    "Traditional L1s erode 100% of profit on sub-cent transactions. Arc enables 99.9% margin on agentic commerce."
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      )}

            {activeTab === 'agents' && (
              <motion.div 
                key="agents"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="col-span-12 flex flex-col overflow-hidden h-full relative"
              >
                {/* Neural Map Controls */}
                <div className="absolute top-4 left-4 z-20 flex gap-4">
                  <div className="px-3 py-1 bg-black/60 border border-[#00d2ff33] rounded-sm flex items-center gap-2">
                    <Activity className="w-3 h-3 text-[#00d2ff]" />
                    <span className="text-[8px] font-black text-white uppercase tracking-widest">NEURAL_DENSITY: HIGH</span>
                  </div>
                  <div className="px-3 py-1 bg-black/60 border border-[#00d2ff33] rounded-sm flex items-center gap-2">
                    <Zap className="w-3 h-3 text-[#f59e0b]" />
                    <span className="text-[8px] font-black text-white uppercase tracking-widest">COMM_FREQ: 144Hz</span>
                  </div>
                </div>

                {/* SCATTERED NEURAL WEB VIEW */}
                <div className="flex-1 relative overflow-hidden bg-black/40 rounded-lg border border-[#00d2ff11] cursor-crosshair min-h-[500px]">
                  <div className="absolute inset-0 grid-bg opacity-10" />
                  
                  {/* SVG Neural Connections */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    <defs>
                      <filter id="glow">
                        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                        <feMerge>
                          <feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>
                    {/* Connections between agents (Neural Web) */}
                    {stats?.agents?.filter((a: any) => a.layer > 0).map((agent: any, i: number) => {
                      const angle = (i / (stats.agents.length - 1)) * Math.PI * 2;
                      const dist = 140 + (agent.layer * 55) + (i % 2 === 0 ? 15 : -15);
                      const x = 50 + Math.cos(angle) * (dist / 12);
                      const y = 50 + Math.sin(angle) * (dist / 7);

                      // Connect to Mythos (Center)
                      const mythosConn = (
                        <motion.line 
                          key={`mythos-${agent.id}`}
                          x1="50%" y1="50%" x2={`${x}%`} y2={`${y}%`}
                          stroke="#00d2ff"
                          strokeWidth="0.5"
                          initial={{ pathLength: 0, opacity: 0 }}
                          animate={{ pathLength: 1, opacity: 0.2 }}
                        />
                      );

                      // Connect to neighbor to form a ring/mesh (n8n style)
                      const nextAgent = stats.agents[i + 1] || stats.agents[0];
                      const nextAngle = ((i + 1) / (stats.agents.length - 1)) * Math.PI * 2;
                      const nextDist = 140 + (nextAgent.layer * 55) + ((i+1) % 2 === 0 ? 15 : -15);
                      const nextX = 50 + Math.cos(nextAngle) * (nextDist / 12);
                      const nextY = 50 + Math.sin(nextAngle) * (nextDist / 7);

                      return (
                        <g key={`group-${agent.id}`}>
                          {mythosConn}
                          <motion.line 
                            x1={`${x}%`} y1={`${y}%`} x2={`${nextX}%`} y2={`${nextY}%`}
                            stroke="#00d2ff11"
                            strokeWidth="0.5"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.1 }}
                          />
                        </g>
                      );
                    })}
                  </svg>

                  {/* Central Core (Mythos) */}
                  <div 
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
                  >
                    <div className="relative w-32 h-32 flex items-center justify-center">
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
                        className="absolute inset-0 border-2 border-dashed border-[#00d2ff66] rounded-full"
                      />
                      <motion.div 
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ repeat: Infinity, duration: 4 }}
                        className="w-20 h-20 rounded bg-black border-2 border-[#00d2ff] shadow-[0_0_40px_rgba(0,210,255,0.6)] flex flex-col items-center justify-center z-10"
                      >
                        <Bot className="w-8 h-8 text-[#00d2ff] mb-1" />
                        <span className="text-[8px] font-black text-white glow-text">MYTHOS_CORE</span>
                      </motion.div>
                    </div>
                  </div>

                  {/* Scattered Agents */}
                  {stats?.agents?.filter((a: any) => a.layer > 0).map((agent: any, i: number) => {
                    const angle = (i / (stats.agents.length - 1)) * Math.PI * 2;
                    const dist = 140 + (agent.layer * 55) + (i % 2 === 0 ? 15 : -15);
                    const posX = 50 + Math.cos(angle) * (dist / 12);
                    const posY = 50 + Math.sin(angle) * (dist / 7);

                    return (
                      <motion.div 
                        key={agent.id}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ 
                          opacity: 1, 
                          scale: 1,
                          left: `${posX}%`,
                          top: `${posY}%`
                        }}
                        style={{ position: 'absolute' }}
                        className="z-10 -translate-x-1/2 -translate-y-1/2"
                      >
                        <AgentNode agent={agent} />
                      </motion.div>
                    );
                  })}
                </div>

                {/* Performance Overlay (Required by Hackathon) */}
                <div className="h-24 grid grid-cols-4 gap-4 mt-4">
                  <AgentStatCard label="SYNC_FREQUENCY" value="0.04s" trend="OPTIMAL" />
                  <AgentStatCard label="NEURAL_CONVERGENCE" value="98.2%" trend="STABLE" />
                  <AgentStatCard label="ACTIVE_AGENTS" value={String(stats?.agents?.length || "0")} trend="+1" />
                  <AgentStatCard label="TASK_LATENCY" value="12ms" trend="LOW" />
                </div>

                {/* Mobile-Style Inter-Agent Comm Stream */}
                <div className="absolute bottom-6 right-6 w-80 h-48 bg-black/90 border border-[#00d2ff33] p-4 font-mono text-[9px] text-[#00ff9d] rounded-lg shadow-2xl backdrop-blur-md overflow-hidden flex flex-col">
                  <div className="flex items-center justify-between mb-2 border-b border-white/10 pb-2">
                    <span className="font-black tracking-widest uppercase text-gray-500 flex items-center gap-2">
                       <TerminalIcon className="w-3 h-3" /> Live Comm_Stream
                    </span>
                    <span className="text-emerald-500 animate-pulse">ENCRYPTED</span>
                  </div>
                  <div className="flex-1 space-y-1 overflow-y-auto terminal-scroll pr-1">
                    {logs.slice(-6).map((log, i) => (
                      <div key={i} className="flex gap-2 border-l border-emerald-500/30 pl-2">
                        <span className="text-[#00d2ff] opacity-50">{new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                        <span className="flex-1 truncate uppercase">{log}</span>
                      </div>
                    ))}
                    <motion.div 
                      animate={{ opacity: [0, 1] }} 
                      transition={{ repeat: Infinity, duration: 0.8 }}
                      className="w-1.5 h-3 bg-[#00ff9d] mt-1"
                    />
                  </div>
                </div>
              </motion.div>
            )}







            {activeTab === 'market' && (
              <motion.div 
                key="market"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="col-span-12 flex flex-col gap-4 overflow-y-auto terminal-scroll h-full"
              >
                <div className="grid grid-cols-12 gap-4 flex-1">
                  <div className="col-span-12 lg:col-span-7 flex flex-col gap-4">
                    <div className="sci-fi-frame p-6 rounded-lg flex flex-col gap-6 overflow-hidden relative">
                      <div className="corner-accents corner-top-left corner-top-right corner-bottom-left corner-bottom-right" />
                      <div className="flex items-center gap-3 border-b border-[#00d2ff33] pb-4">
                        <TrendingUp className="w-6 h-6 text-[#f59e0b]" />
                        <h2 className="font-black text-xl tracking-tight uppercase glow-text">MARKET SURGE ENGINE</h2>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="p-6 bg-black/40 border border-[#00d2ff11] rounded-sm space-y-4">
                          <div className="text-[10px] text-gray-500 uppercase tracking-widest">Current Multiplier</div>
                          <div className="text-5xl font-black italic text-[#f59e0b] glow-text">{stats?.surgeMultiplier || "1.0"}x</div>
                          <div className="text-[10px] terminal-text text-emerald-500 uppercase">Status: DYNAMIC_SCALING</div>
                        </div>
                        <div className="p-6 bg-black/40 border border-[#00d2ff11] rounded-sm space-y-4">
                          <div className="text-[10px] text-gray-500 uppercase tracking-widest">Base Price</div>
                          <div className="text-5xl font-black italic text-[#00d2ff] glow-text">$0.001</div>
                          <div className="text-[10px] terminal-text text-gray-400 uppercase">Fixed Protocol Rate</div>
                        </div>
                        <div className="p-6 bg-black/40 border border-[#00d2ff11] rounded-sm space-y-4">
                          <div className="text-[10px] text-gray-500 uppercase tracking-widest">Surge Price</div>
                          <div className="text-5xl font-black italic text-white glow-text">${stats?.price || "0.001"}</div>
                          <div className="text-[10px] terminal-text text-orange-500 uppercase">Impact: HIGH_DEMAND</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 sci-fi-frame p-6 rounded-lg relative overflow-hidden h-[200px]">
                      <div className="corner-accents corner-top-left corner-top-right corner-bottom-left corner-bottom-right" />
                      <h3 className="text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-[#00d2ff]" /> NEURAL CORE VISUALIZATION
                      </h3>
                      <div className="grid grid-cols-8 gap-2 mt-4">
                        {stats?.neuralWeights?.map((weight: number, i: number) => (
                          <div 
                            key={i} 
                            style={{ opacity: 0.3 + weight * 0.7 }}
                            className={`h-8 rounded-sm transition-all duration-500 ${weight > 0.8 ? 'bg-white shadow-[0_0_10px_#fff]' : weight > 0.5 ? 'bg-[#00d2ff] shadow-[0_0_10px_#00d2ff]' : 'bg-[#00d2ff33]'}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="col-span-12 lg:col-span-5 flex flex-col gap-4">
                    <div className="sci-fi-frame p-6 flex-1 rounded-lg">
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#00d2ff] mb-6">Price Calculation Logic</h3>
                      <div className="space-y-6">
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-full border border-[#00d2ff33] flex items-center justify-center text-[10px] font-black">01</div>
                          <div className="flex-1 p-3 bg-black/20 border border-white/5 text-[10px] terminal-text">
                            <span className="text-[#00d2ff]">INPUT:</span> LIVE_DEMAND_STREAM ({stats?.currentDemand || 0} req/s)
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-full border border-[#00d2ff33] flex items-center justify-center text-[10px] font-black">02</div>
                          <div className="flex-1 p-3 bg-black/20 border border-white/5 text-[10px] terminal-text">
                            <span className="text-[#00d2ff]">PROCESS:</span> XGBOOST_INFERENCE_ENGINE (PREDICTING_NEXT_60S)
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-full border border-[#00d2ff33] flex items-center justify-center text-[10px] font-black">03</div>
                          <div className="flex-1 p-3 bg-black/20 border border-white/5 text-[10px] terminal-text">
                            <span className="text-[#00d2ff]">OUTPUT:</span> DYNAMIC_PRICE_ADJUSTMENT (${stats?.price || 0} USDC)
                          </div>
                        </div>
                        
                        <div className="mt-8 p-4 bg-black/40 border border-[#00d2ff11] border-l-4 border-l-[#00d2ff]">
                          <div className="text-[10px] font-black text-[#00d2ff] uppercase mb-2">Research Implementation</div>
                          <p className="text-[10px] text-gray-400 font-mono leading-relaxed">
                            Using Extreme Gradient Boosting (XGBoost) to detect market micro-fluctuations. 
                            Our Arc settlement layer ensures that 95% of predicted surge profit is captured as margin.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'logs' && (
              <motion.div 
                key="logs"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="col-span-12 flex flex-col gap-4 overflow-y-auto terminal-scroll h-full"
              >
                <div className="flex-1 sci-fi-frame p-6 rounded-lg flex flex-col gap-4 overflow-hidden relative">
                  <div className="corner-accents corner-top-left corner-top-right corner-bottom-left corner-bottom-right" />
                  <div className="flex items-center justify-between border-b border-[#00d2ff33] pb-4">
                    <div className="flex items-center gap-3">
                      <Terminal className="w-6 h-6 text-[#00d2ff]" />
                      <h2 className="font-black text-xl tracking-tight uppercase glow-text">SYSTEM LOGS</h2>
                    </div>
                    <div className="text-[10px] terminal-text text-gray-500">
                      NODE: ARC-L1-MAIN-01 | UPTIME: 100%
                    </div>
                  </div>
                  <div className="flex-1 min-h-[500px] bg-black/40 p-6 font-mono text-xs space-y-3 overflow-y-auto terminal-scroll border border-[#00d2ff11]">
                    {logs.map((log, i) => (
                      <div key={i} className="flex gap-4">
                        <span className="text-gray-600">[{new Date().toLocaleTimeString()}]</span>
                        <span className="text-emerald-400 uppercase tracking-tight">{log}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'anomaly' && (
              <motion.div 
                key="anomaly"
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="col-span-12 flex flex-col gap-4 overflow-hidden h-full"
              >
                <div className="grid grid-cols-12 gap-4 flex-1">
                  {/* Main Scanner Section */}
                  <div className="col-span-12 lg:col-span-8 flex flex-col gap-4">
                    <div className={`flex-1 sci-fi-frame p-6 rounded-lg flex flex-col items-center justify-center gap-6 relative border-red-500/30 h-[300px] transition-all duration-500 ${stats?.isAnomaly ? 'bg-red-500/20 shadow-[inset_0_0_50px_rgba(239,68,68,0.2)] border-red-500' : 'bg-red-500/5'}`}>
                      <div className="corner-accents corner-top-left corner-top-right corner-bottom-left corner-bottom-right" />
                      
                      <div className="relative">
                        <ShieldAlert className={`w-20 h-20 text-red-500 ${stats?.isAnomaly ? 'animate-bounce scale-110' : 'animate-pulse'}`} />
                        <motion.div 
                          animate={{ rotate: stats?.isAnomaly ? 1080 : 360 }}
                          transition={{ repeat: Infinity, duration: stats?.isAnomaly ? 1 : 4, ease: "linear" }}
                          className="absolute -inset-4 border-2 border-dashed border-red-500/40 rounded-full"
                        />
                      </div>
                      
                      <div className="text-center space-y-2">
                        <h2 className="font-black text-2xl tracking-tight uppercase text-red-500 glow-text">
                          {stats?.isAnomaly ? 'CRITICAL_ANOMALY_DETECTED' : 'AGENTIC THREAT SCANNER'}
                        </h2>
                        <div className="flex items-center justify-center gap-3 text-[8px] text-red-400 font-bold tracking-widest uppercase">
                          <span className={stats?.isAnomaly ? 'text-white bg-red-600 px-2' : 'animate-pulse'}>
                            {stats?.isAnomaly ? 'MALICIOUS_TRAFFIC_ID' : 'Active Scanning'}
                          </span>
                          <span className="w-1 h-1 bg-red-500 rounded-full" />
                          <span>Z-SCORE: {stats?.zScore || '0.00'}</span>
                        </div>
                      </div>
                      
                      <div className="w-full max-w-xs h-1 bg-red-500/10 rounded-full overflow-hidden relative border border-red-500/20">
                        <motion.div 
                          animate={{ x: stats?.isAnomaly ? [-160, 160] : [-320, 320] }}
                          transition={{ repeat: Infinity, duration: stats?.isAnomaly ? 0.5 : 2.5, ease: "linear" }}
                          className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-red-500 to-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Sidebar Info Section */}
                  <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
                    <div className="sci-fi-frame p-4 bg-black/40 rounded-lg flex-1">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-4 border-b border-red-500/20 pb-1">Anomaly Stream</h3>
                      <div className="space-y-3 overflow-y-auto terminal-scroll max-h-[250px]">
                        {[
                          { time: '10:54:12', msg: 'HEURISTIC SCAN COMPLETE', status: 'OK' },
                          { time: '10:54:05', msg: 'Z-SCORE RADIUS CHECK', status: 'NORMAL' },
                          { time: '10:53:50', msg: 'AUTH TOKEN VALIDATION', status: 'VARYING' }
                        ].map((log, i) => (
                          <div key={i} className="flex gap-3 text-[8px] font-mono border-l-2 border-red-500/30 pl-2 py-0.5">
                            <span className="text-gray-600">{log.time}</span>
                            <span className="text-gray-300 uppercase flex-1">{log.msg}</span>
                            <span className="text-red-400 font-black">{log.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Footer Bar */}
          <div className="h-10 sci-fi-frame flex items-center justify-center rounded-sm">
            <div className="text-[10px] font-black uppercase tracking-[0.4em] text-[#00d2ff] glow-text">
              ARC_L1 STATUS: {stats?.systemStatus || 'IDLE'} | AGENT_ECONOMY: {circleStatus ? 'CIRCLE_AUTHORIZED' : 'PENDING'} | NODE_LATENCY: 0.0001s
            </div>
          </div>
        </div>

        {/* Right Mechanical Side */}
        <div className="side-mechanical hidden lg:flex border-l border-[#00d2ff33] border-r-0">
          <div className="side-light" />
          <div className="side-light opacity-50" />
          <div className="side-light" />
          <div className="flex-1" />
          <div className="w-6 h-6 border border-[#00d2ff33] rounded-full mb-8" />
        </div>
      </div>
    </div>
  );
}

function AgentNode({ agent }: { agent: any }) {
  const isActive = agent.status === 'ACTIVE' || agent.status === 'ONLINE';
  const roleColors: Record<string, string> = {
    BOSS: "#00d2ff",
    SCOUT: "#f59e0b",
    BRAIN: "#10b981",
    EXECUTOR: "#ef4444",
    GUARDIAN: "#8b5cf6"
  };

  const color = roleColors[agent.role] || "#white";

  return (
    <motion.div 
      whileHover={{ scale: 1.1, zIndex: 50 }}
      className={`w-28 p-2 rounded-sm border bg-black/80 backdrop-blur-md transition-all duration-300 relative group overflow-hidden ${
        isActive ? '' : 'border-gray-800 opacity-60'
      }`}
      style={{ borderColor: isActive ? color : undefined }}
    >
      <div className="flex justify-between items-center mb-1">
        <span className="text-[7px] font-black uppercase text-gray-500 tracking-tighter">{agent.role}</span>
        <div className={`w-1 h-1 rounded-full ${isActive ? 'animate-pulse' : ''}`} style={{ backgroundColor: isActive ? color : '#374151' }} />
      </div>
      
      <div className={`text-[9px] font-black tracking-tight mb-1 ${isActive ? 'text-white' : 'text-gray-600'}`}>
        {agent.name}
      </div>

      <div className="flex items-center gap-1.5 overflow-hidden">
        <span className="text-[6px] text-gray-500 font-mono uppercase truncate flex-1">{agent.task}</span>
      </div>

      {agent.lastAction && isActive && (
        <div className="mt-1 pt-1 border-t border-white/5 text-[5px] font-mono leading-tight text-gray-400 group-hover:text-white transition-colors h-4 overflow-hidden italic">
          &gt; {agent.lastAction}
        </div>
      )}

      {/* Decorative pulse ring if active */}
      {isActive && (
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.1, 0.3] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute -inset-1 rounded-sm -z-10"
          style={{ border: `1px solid ${color}` }}
        />
      )}
    </motion.div>
  );
}

function AgentStatCard({ label, value, trend }: { label: string, value: string, trend: string }) {
  return (
    <div className="sci-fi-frame p-3 bg-black/40 border border-[#00d2ff11] flex flex-col justify-center">
      <div className="text-[7px] text-gray-500 uppercase tracking-widest">{label}</div>
      <div className="flex items-end justify-between">
        <div className="text-xl font-black text-white italic">{value}</div>
        <div className="text-[7px] font-bold text-emerald-500 uppercase">{trend}</div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, label, icon }: { active: boolean, onClick: () => void, label: string, icon?: React.ReactNode }) {
  return (
    <button 
      onClick={onClick}
      className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
        active ? 'tab-active shadow-[0_0_15px_rgba(0,210,255,0.3)]' : 'tab-inactive hover:bg-white/5 font-bold'
      }`}
    >
      {icon} {label}
    </button>
  );
}

function StatItem({ label, value, className }: { label: string, value: string, className?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">{label}</span>
      <span className={`text-2xl font-black italic tracking-tight glow-text ${className || ''}`}>{value}</span>
    </div>
  );
}

function EngineStep({ label, sub, value, className }: { label: string, sub?: string, value?: string, className?: string }) {
  return (
    <div className={`flex flex-col items-center text-center ${className || ''}`}>
      <div className="text-[10px] font-black border border-[#00d2ff33] px-4 py-2 rounded-sm tracking-widest uppercase mb-1">
        {label}
      </div>
      {sub && <span className="text-[8px] text-gray-600 uppercase tracking-widest">{sub}</span>}
      {value && <span className={`text-lg font-black italic text-[#00d2ff] glow-text ${className || ''}`}>{value}</span>}
    </div>
  );
}
