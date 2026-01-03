
import React, { useState, useRef, useEffect } from 'react';
import { Send, ImagePlus, Loader2, Bot, User, X, Paperclip, Sparkles, Mic, Volume2, Brain, Globe, Map as MapIcon, Zap, Trash2, Copy, Truck, ShieldAlert, HardHat, CheckCircle2, AlertTriangle, Wrench } from 'lucide-react';
import { useProjects } from '@/contexts/ProjectContext';
import { useToast } from '@/contexts/ToastContext';
import { Message, Page } from '@/types';
import { streamChatResponse, transcribeAudio, generateSpeech, ChatConfig, runRawPrompt, parseAIJSON } from '@/services/geminiService';

interface ChatViewProps {
  setPage: (page: Page) => void;
}

type ChatMode = 'PRO' | 'THINKING' | 'SEARCH' | 'MAPS' | 'LITE' | 'LOGISTICS' | 'FIELD';

// Helper to format inline text styles
const formatInline = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*|`[^`]+`|@[a-zA-Z0-9_]+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold text-zinc-900">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="bg-zinc-100 border border-zinc-200 px-1.5 py-0.5 rounded text-pink-600 font-mono text-xs">{part.slice(1, -1)}</code>;
    }
    if (part.startsWith('@')) {
      return <span key={i} className="text-[#0f5c82] font-medium bg-blue-50 px-1 rounded">{part}</span>;
    }
    return part;
  });
};

// Helper component for rendering message content with rich formatting
const MessageContent: React.FC<{ text: string }> = ({ text }) => {
  // Split by code blocks (triple backticks)
  const blocks = text.split(/(```[\s\S]*?```)/g);

  return (
    <div className="text-sm leading-relaxed space-y-1 break-words">
      {blocks.map((block, i) => {
        if (block.startsWith('```') && block.endsWith('```')) {
          // Extract code content
          const content = block.slice(3, -3).trim();
          // Simple language detection (first line)
          const firstLine = content.split('\n')[0].trim();
          const language = firstLine && !firstLine.includes(' ') ? firstLine : 'code';
          const codeBody = language === firstLine ? content.substring(firstLine.length).trim() : content;

          return (
            <div key={i} className="my-3 rounded-lg overflow-hidden bg-[#1e1e1e] border border-zinc-700 shadow-sm group/code">
              <div className="flex items-center justify-between px-3 py-1.5 bg-[#2d2d2d] border-b border-zinc-700">
                <span className="text-[10px] font-mono text-zinc-400 lowercase">{language}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(codeBody)}
                  className="text-zinc-500 hover:text-zinc-300 transition-colors"
                  title="Copy Code"
                >
                  <Copy size={12} />
                </button>
              </div>
              <pre className="p-3 overflow-x-auto text-xs font-mono text-zinc-300 whitespace-pre scrollbar-thin scrollbar-thumb-zinc-600 scrollbar-track-transparent">
                <code>{codeBody}</code>
              </pre>
            </div>
          );
        }

        // Process normal text blocks for lists and inline formatting
        return (
          <div key={i}>
            {block.split('\n').map((line, lineIdx) => {
              const trimmed = line.trim();
              // Bullet lists
              if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                return (
                  <div key={lineIdx} className="flex gap-2 ml-1 mt-1 items-start">
                    <div className="mt-2 w-1.5 h-1.5 bg-zinc-400 rounded-full shrink-0 opacity-60"></div>
                    <div className="flex-1">{formatInline(trimmed.substring(2))}</div>
                  </div>
                );
              }
              // Numbered lists (simple regex for "1. ", "2. ")
              if (/^\d+\.\s/.test(trimmed)) {
                const dotIndex = trimmed.indexOf('.');
                const num = trimmed.substring(0, dotIndex + 1);
                const content = trimmed.substring(dotIndex + 1);
                return (
                  <div key={lineIdx} className="flex gap-2 ml-1 mt-1 items-start">
                    <span className="text-zinc-500 font-mono text-xs mt-0.5 shrink-0">{num}</span>
                    <div className="flex-1">{formatInline(content)}</div>
                  </div>
                );
              }

              if (trimmed === '') return <div key={lineIdx} className="h-2" />; // Paragraph spacing
              return <div key={lineIdx} className="min-h-[1.2em]">{formatInline(line)}</div>;
            })}
          </div>
        );
      })}
    </div>
  );
};

const ChatView: React.FC<ChatViewProps> = ({ setPage }) => {
  const { addToast } = useToast();
  const { inventory, transactions, addTask, addSafetyHazard, updateEquipment, equipment, projects, safetyHazards } = useProjects();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'intro',
      role: 'model',
      text: "Hello! I'm Gemini, your advanced BuildPro assistant. I can help with reasoning, analysis, and finding real-time information.",
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mode, setMode] = useState<ChatMode>('PRO');
  const [groundingMetadata, setGroundingMetadata] = useState<any>(null);
  const [ttsLoadingId, setTtsLoadingId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, groundingMetadata]);

  const formatTimestamp = (timestamp: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Clear Chat History
  const handleClearChat = () => {
    if (window.confirm("Are you sure you want to clear the chat history?")) {
      setMessages([{
        id: 'intro',
        role: 'model',
        text: "Hello! I'm Gemini, your advanced BuildPro assistant. I can help with reasoning, analysis, and finding real-time information.",
        timestamp: Date.now()
      }]);
      setGroundingMetadata(null);
    }
  };

  // Audio Recording Handling
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          setIsLoading(true);
          try {
            const transcript = await transcribeAudio(base64Audio, 'audio/webm');
            setInput(prev => prev + " " + transcript);
          } catch (e) {
            console.error("Transcription error", e);
          } finally {
            setIsLoading(false);
          }
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (e) {
      console.error("Error accessing microphone", e);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handlePlayTTS = async (text: string, msgId: string) => {
    if (isPlaying === msgId) {
      // Ideally stop playback here, but web audio needs ref holding.
      // For now, assume simple trigger.
      return;
    }
    setTtsLoadingId(msgId);
    try {
      const audioBuffer = await generateSpeech(text);
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => setIsPlaying(null);
      source.start(0);
      setIsPlaying(msgId);
    } catch (e) {
      console.error("TTS play error", e);
    } finally {
      setTtsLoadingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      image: selectedImage || undefined,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    const currentImage = selectedImage;
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsLoading(true);
    setGroundingMetadata(null);

    // Placeholder for model response
    const modelMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, {
      id: modelMsgId,
      role: 'model',
      text: currentImage ? 'Analyzing...' : '',
      timestamp: Date.now(),
      isThinking: true
    }]);

    try {
      let fullText = "";
      const mimeType = currentImage ? currentImage.split(';')[0].split(':')[1] : undefined;
      const base64Data = currentImage ? currentImage.split(',')[1] : undefined;

      // Determine Config based on Mode
      const config: ChatConfig = {
        model: 'gemini-1.5-pro' // Default
      };

      if (mode === 'THINKING') {
        config.model = 'gemini-1.5-pro';
        // config.thinkingBudget = 32768; // Removed as not supported in standard 1.5 Pro yet
        config.systemInstruction = "You are an expert construction analyst and strategist. Use deep reasoning to analyze complex problems, verify assumptions, and provide comprehensive solutions. Use markdown for formatting lists, code, and emphasis.";
      } else if (mode === 'SEARCH') {
        config.model = 'gemini-2.0-flash-exp';
        config.tools = [{ googleSearch: {} }];
      } else if (mode === 'MAPS') {
        config.model = 'gemini-2.0-flash-exp';
        config.tools = [{ googleMaps: {} }];
      } else if (mode === 'LITE') {
        config.model = 'gemini-1.5-flash';
      } else if (mode === 'LOGISTICS') {
        config.model = 'gemini-2.0-flash-exp';
        config.systemInstruction = `You are the BuildPro Logistics Specialist. You help manage supply chains, track shipments, and predict stockouts. 
        Current Context:
        Inventory: ${JSON.stringify(inventory.map(i => ({ name: i.name, stock: i.stock, threshold: i.threshold, status: i.status })))}
        Transactions: ${JSON.stringify(transactions.filter(t => t.category === 'Procurement').slice(-5))}
        Use this data to answer specific questions about materials and deliveries. Be professional, data-driven, and proactive.`;
      } else if (mode === 'FIELD') {
        config.model = 'gemini-2.0-flash-exp';
        config.systemInstruction = `You are the BuildPro Field Intelligence Assistant. You convert voice logs and site observations into structured actions.
        Available Actions:
        1. create_hazard: { "type": "Trip", "severity": "High", "location": "Zone A", "description": "...", "priority": 1-5 }
        2. create_task: { "title": "...", "priority": "High", "dueDate": "YYYY-MM-DD", "description": "..." }
        3. update_equipment: { "id": "...", "status": "Maintenance", "notes": "..." }
        
        Current Equipment Context: ${JSON.stringify(equipment.map(e => ({ id: e.id, name: e.name, status: e.status })))}
        Projects Context: ${JSON.stringify(projects.map(p => ({ id: p.id, name: p.name })))}

        When the user reports something, identify if it's a hazard, a task, or equipment status change.
        Respond with a brief confirmation AND a JSON block at the end of your response following this format:
        [ACTION: type { ...Data... }]
        Example: [ACTION: create_hazard { "type": "Fire", "severity": "Critical", "location": "Site Exit", "description": "Blocked exit", "priority": 5 }]
        If multiple actions are needed, include multiple blocks. Keep the confirmation text site-appropriate and brief.`;
      }

      const response = await streamChatResponse(
        messages,
        userMsg.text,
        base64Data,
        mimeType,
        (chunk) => {
          fullText += chunk;
          setMessages(prev => prev.map(m =>
            m.id === modelMsgId
              ? { ...m, text: fullText, isThinking: false }
              : m
          ));
        },
        config
      );

      // Handle Grounding Metadata (Search/Maps)
      if (response.candidates?.[0]?.groundingMetadata) {
        setGroundingMetadata(response.candidates[0].groundingMetadata);
      }

      // Handle Field Mode Actions
      if (mode === 'FIELD' && fullText.includes('[ACTION:')) {
        const actionRegex = /\[ACTION:\s*(\w+)\s*(\{[\s\S]*?\})\]/g;
        let match;
        while ((match = actionRegex.exec(fullText)) !== null) {
          const actionType = match[1];
          try {
            const data = JSON.parse(match[2]);
            if (actionType === 'create_hazard') {
              addSafetyHazard({
                id: `hz-${Date.now()}`,
                projectId: projects[0]?.id || '',
                type: data.type,
                severity: data.severity,
                // location property removed as it is not part of SafetyHazard type
                description: data.description,
                timestamp: new Date().toISOString(),
                // status property removed as it is not part of SafetyHazard type
                recommendation: data.recommendation || 'Immediate inspection required',
              });
              addToast(`Safety hazard logged: ${data.type}`, "success");
            } else if (actionType === 'create_task') {
              addTask({
                id: `task-${Date.now()}`,
                title: data.title,
                projectId: projects[0]?.id || '',
                status: 'To Do',
                priority: data.priority || 'Medium',
                description: data.description,
                dueDate: data.dueDate || new Date(Date.now() + 86400000).toISOString().split('T')[0],
                assigneeType: 'role'
              });
              addToast(`Task created: ${data.title}`, "success");
            } else if (actionType === 'update_equipment') {
              updateEquipment(data.id, { status: data.status });
              addToast(`Equipment ${data.id} updated to ${data.status}`, "success");
            }
          } catch (e) {
            console.error("Failed to parse field action", e);
          }
        }
      }

    } catch (error) {
      setMessages(prev => prev.map(m =>
        m.id === modelMsgId
          ? { ...m, text: "Sorry, I encountered an error processing your request.", isThinking: false }
          : m
      ));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Header & Mode Selector */}
      <div className="h-16 border-b border-zinc-200 flex items-center px-6 bg-white sticky top-0 z-10 justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm transition-colors ${mode === 'THINKING' ? 'bg-purple-600' : mode === 'SEARCH' ? 'bg-blue-600' : mode === 'MAPS' ? 'bg-green-600' : mode === 'LITE' ? 'bg-orange-500' : mode === 'LOGISTICS' ? 'bg-[#0f5c82]' : mode === 'FIELD' ? 'bg-amber-600' : 'bg-[#0f5c82]'
            }`}>
            {mode === 'THINKING' ? <Brain size={18} /> : mode === 'SEARCH' ? <Globe size={18} /> : mode === 'MAPS' ? <MapIcon size={18} /> : mode === 'LITE' ? <Zap size={18} /> : mode === 'LOGISTICS' ? <Truck size={18} /> : mode === 'FIELD' ? <HardHat size={18} /> : <Sparkles size={18} />}
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-900">{mode === 'LOGISTICS' ? 'Logistics Specialist' : mode === 'FIELD' ? 'Field Intelligence' : 'Gemini Assistant'}</h2>
            <div className="text-xs text-zinc-500">
              {mode === 'THINKING' ? 'Gemini 1.5 Pro (Deep Reasoning)' : mode === 'SEARCH' ? 'Gemini 2.0 Flash (Search)' : mode === 'MAPS' ? 'Gemini 2.0 Flash (Maps)' : mode === 'LITE' ? 'Gemini 1.5 Flash' : mode === 'LOGISTICS' ? 'Specialized Supply Chain AI' : mode === 'FIELD' ? 'Voice-to-Action Site Mode' : 'Gemini 1.5 Pro'}
            </div>
          </div>
        </div>

        {/* Mode Toggles */}
        <div className="flex items-center gap-2">
          <div className="flex bg-zinc-100 p-1 rounded-lg">
            <button onClick={() => setMode('PRO')} className={`p-2 rounded-md transition-all ${mode === 'PRO' ? 'bg-white shadow text-[#0f5c82]' : 'text-zinc-400 hover:text-zinc-600'}`} title="Standard Pro">
              <Sparkles size={16} />
            </button>
            <button onClick={() => setMode('THINKING')} className={`p-2 rounded-md transition-all ${mode === 'THINKING' ? 'bg-white shadow text-purple-600' : 'text-zinc-400 hover:text-zinc-600'}`} title="Deep Reasoning">
              <Brain size={16} />
            </button>
            <button onClick={() => setMode('SEARCH')} className={`p-2 rounded-md transition-all ${mode === 'SEARCH' ? 'bg-white shadow text-blue-600' : 'text-zinc-400 hover:text-zinc-600'}`} title="Google Search">
              <Globe size={16} />
            </button>
            <button onClick={() => setMode('MAPS')} className={`p-2 rounded-md transition-all ${mode === 'MAPS' ? 'bg-white shadow text-green-600' : 'text-zinc-400 hover:text-zinc-600'}`} title="Google Maps">
              <MapIcon size={16} />
            </button>
            <button onClick={() => setMode('LITE')} className={`p-2 rounded-md transition-all ${mode === 'LITE' ? 'bg-white shadow text-orange-500' : 'text-zinc-400 hover:text-zinc-600'}`} title="Flash Lite">
              <Zap size={16} />
            </button>
            <button onClick={() => setMode('LOGISTICS')} className={`p-2 rounded-md transition-all ${mode === 'LOGISTICS' ? 'bg-white shadow text-[#0f5c82]' : 'text-zinc-400 hover:text-zinc-600'}`} title="Logistics Specialist">
              <Truck size={16} />
            </button>
            <button onClick={() => setMode('FIELD')} className={`p-2 rounded-md transition-all ${mode === 'FIELD' ? 'bg-white shadow text-amber-600' : 'text-zinc-400 hover:text-zinc-600'}`} title="Field Intelligence">
              <HardHat size={16} />
            </button>
          </div>

          <div className="w-px h-6 bg-zinc-200 mx-1"></div>

          <button
            onClick={handleClearChat}
            className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Clear Chat History"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scroll-smooth bg-zinc-50/30">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-4 max-w-3xl mx-auto ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-white border border-zinc-200 text-[#0f5c82]' : 'bg-[#0f5c82] text-white'
              }`}>
              {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>

            <div className={`flex flex-col max-w-[80%] md:max-w-[70%] space-y-2 ${msg.role === 'user' ? 'items-end' : 'items-start'
              }`}>
              {msg.image && (
                <div className="relative group rounded-2xl overflow-hidden border border-zinc-200 shadow-md max-w-xs">
                  <img src={msg.image} alt="Upload" className="w-full h-auto object-cover" />
                </div>
              )}
              <div
                className={`px-5 py-3.5 rounded-2xl shadow-sm relative group ${msg.role === 'user'
                  ? 'bg-white border border-zinc-200 text-zinc-800 rounded-tr-none'
                  : 'bg-white border border-zinc-200 text-zinc-800 rounded-tl-none'
                  }`}
              >
                {msg.role === 'model' && !msg.isThinking && (
                  <button
                    onClick={() => handlePlayTTS(msg.text, msg.id)}
                    disabled={ttsLoadingId === msg.id}
                    className={`absolute -right-9 top-2 p-1.5 rounded-full transition-all disabled:opacity-100 ${ttsLoadingId === msg.id ? 'opacity-100' : isPlaying === msg.id ? 'text-blue-500 bg-blue-50' : 'text-zinc-400 hover:text-[#0f5c82] hover:bg-zinc-100 opacity-0 group-hover:opacity-100'}`}
                    title="Read Aloud"
                  >
                    {ttsLoadingId === msg.id ? <Loader2 size={16} className="animate-spin text-[#0f5c82]" /> : <Volume2 size={16} />}
                  </button>
                )}

                {msg.isThinking ? (
                  <div className="flex items-center gap-3 text-zinc-500">
                    <Loader2 size={16} className="animate-spin text-[#0f5c82]" />
                    <span className="animate-pulse">{mode === 'THINKING' ? 'Thinking deeply...' : 'Thinking...'}</span>
                  </div>
                ) : (
                  <MessageContent text={msg.text} />
                )}
              </div>
              <span className="text-[10px] text-zinc-400 px-1 select-none">
                {formatTimestamp(msg.timestamp)}
              </span>
            </div>
          </div>
        ))}

        {/* Grounding Metadata Display */}
        {groundingMetadata && (
          <div className="max-w-3xl mx-auto mt-2 p-4 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-600">
            <h4 className="font-bold mb-2 flex items-center gap-2"><Globe size={12} /> Sources & Grounding</h4>
            {/* Search Chunks */}
            {groundingMetadata.groundingChunks?.map((chunk: any, i: number) => (
              <div key={i} className="mb-1">
                {chunk.web?.uri && (
                  <a href={chunk.web.uri} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                    <span className="truncate max-w-xs">{chunk.web.title || chunk.web.uri}</span>
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-zinc-200">
        <div className="max-w-3xl mx-auto">
          {selectedImage && (
            <div className="mb-3 flex items-center gap-3 bg-blue-50 p-2.5 rounded-xl border border-blue-100 w-fit animate-in slide-in-from-bottom-2">
              <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-blue-200">
                <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />
              </div>
              <button onClick={clearImage} className="p-1.5 hover:bg-blue-100 rounded-full text-blue-500 transition-colors ml-2"><X size={14} /></button>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className={`relative flex items-end gap-2 bg-zinc-50 p-2 rounded-3xl border transition-all shadow-sm ${isLoading ? 'opacity-50 pointer-events-none' : 'border-zinc-200 focus-within:ring-2 focus-within:ring-[#0f5c82] focus-within:border-transparent'}`}
          >
            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageSelect} />

            <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 text-zinc-400 hover:text-[#0f5c82] hover:bg-zinc-100 rounded-full transition-colors flex-shrink-0">
              <Paperclip size={20} />
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isRecording ? "Listening..." : selectedImage ? "Ask about this image..." : mode === 'THINKING' ? "Ask a complex reasoning question..." : "Message Gemini..."}
              className="flex-1 bg-transparent border-none focus:ring-0 py-3 px-2 text-zinc-900 placeholder-zinc-400 min-w-0"
            />

            <button
              type="button"
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onMouseLeave={stopRecording}
              className={`p-3 rounded-full flex-shrink-0 transition-colors ${isRecording ? 'bg-red-100 text-red-600 animate-pulse' : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100'}`}
            >
              <Mic size={20} />
            </button>

            <button
              type="submit"
              disabled={(!input.trim() && !selectedImage) || isLoading}
              className={`p-3 rounded-full flex-shrink-0 transition-all duration-200 ${(!input.trim() && !selectedImage) || isLoading ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed' : 'bg-[#0f5c82] text-white hover:bg-[#0c4a6e] shadow-md'}`}
            >
              {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatView;
