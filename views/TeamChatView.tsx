
import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Hash, Lock, Users, Sparkles, MoreVertical, Phone, Video, Search, Smile, Mic, Check, CheckCheck, Loader2 } from 'lucide-react';
import { transcribeAudio } from '@/services/geminiService';
import { useProjects } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { TeamMessage } from '@/types';

const TeamChatView: React.FC = () => {
    const { channels, teamMessages, addTeamMessage } = useProjects();
    const { user } = useAuth();
    const { addToast } = useToast();

    const [activeChannel, setActiveChannel] = useState<string>('');
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    // Set initial active channel
    useEffect(() => {
        if (channels.length > 0 && !activeChannel) {
            setActiveChannel(channels[0].id);
        }
    }, [channels, activeChannel]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const currentMessages = teamMessages.filter(m => m.channelId === activeChannel);

    useEffect(() => {
        scrollToBottom();
    }, [currentMessages, activeChannel]);

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputText.trim() || !user) return;

        const newMsg: TeamMessage = {
            id: `msg-${Date.now()}`,
            channelId: activeChannel,
            senderId: user.id,
            senderName: user.name,
            senderRole: user.role,
            senderAvatar: user.avatarInitials,
            content: inputText,
            createdAt: new Date().toISOString()
        };

        await addTeamMessage(newMsg);
        setInputText('');


    };

    const handleAIDraft = () => {
        setInputText("Based on the recent progress reports, we are on track for the milestone. Please ensure all safety checks are logged by EOD.");
    };

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
                    setIsTyping(true);
                    try {
                        const transcript = await transcribeAudio(base64Audio, 'audio/webm');
                        setInputText(prev => (prev ? prev + " " + transcript : transcript));
                    } catch (e) {
                        console.error("Transcription error", e);
                        addToast("Transcription failed. Please try again.", "error");
                    } finally {
                        setIsTyping(false);
                    }
                };
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (e) {
            console.error("Error accessing microphone", e);
            addToast("Microphone access needed for voice-to-text.", "warning");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const currentChannelName = channels.find(c => c.id === activeChannel)?.name;

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto h-full flex flex-col">
            <div className="flex-1 bg-white border border-zinc-200 rounded-2xl overflow-hidden flex shadow-xl">
                {/* Channels Sidebar */}
                <div className="w-64 bg-zinc-50 border-r border-zinc-200 flex flex-col hidden md:flex">
                    <div className="p-4 border-b border-zinc-200">
                        <h2 className="font-bold text-zinc-800 flex items-center gap-2">
                            <Users size={20} className="text-[#0f5c82]" /> Team Chat
                        </h2>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-6">
                        <div>
                            <h3 className="text-xs font-bold text-zinc-400 uppercase px-3 mb-2">Projects</h3>
                            <div className="space-y-0.5">
                                {channels.filter(c => c.type === 'public').map(c => (
                                    <button
                                        key={c.id}
                                        onClick={() => setActiveChannel(c.id)}
                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${activeChannel === c.id
                                            ? 'bg-white text-[#0f5c82] shadow-sm font-medium'
                                            : 'text-zinc-600 hover:bg-zinc-200/50'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Hash size={14} className="opacity-50" />
                                            <span className="truncate">{c.name}</span>
                                        </div>
                                        {c.unreadCount > 0 && (
                                            <span className="bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{c.unreadCount}</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h3 className="text-xs font-bold text-zinc-400 uppercase px-3 mb-2">Direct Messages</h3>
                            <div className="space-y-0.5">
                                {channels.filter(c => c.type === 'private').map(c => (
                                    <button
                                        key={c.id}
                                        onClick={() => setActiveChannel(c.id)}
                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${activeChannel === c.id
                                            ? 'bg-white text-[#0f5c82] shadow-sm font-medium'
                                            : 'text-zinc-600 hover:bg-zinc-200/50'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Lock size={14} className="opacity-50" />
                                            <span className="truncate">{c.name}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="p-4 border-t border-zinc-200 bg-zinc-100/50">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-[#0f5c82] rounded-full flex items-center justify-center text-white text-xs font-bold">
                                {user?.avatarInitials || 'ME'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold text-zinc-900 truncate">{user?.name || 'Me'}</div>
                                <div className="text-xs text-green-600 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span> Online
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 flex flex-col bg-white relative">
                    {/* Chat Header */}
                    <div className="h-16 border-b border-zinc-100 flex items-center justify-between px-6">
                        <div className="flex items-center gap-2">
                            <Hash size={20} className="text-zinc-400" />
                            <div>
                                <div className="font-bold text-zinc-900">{currentChannelName || 'Select a Channel'}</div>
                                <div className="text-xs text-zinc-500">Team Chat • Topic: General construction updates</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 text-zinc-400">
                            <button className="hover:text-[#0f5c82] hover:bg-zinc-50 p-2 rounded-full transition-colors"><Search size={20} /></button>
                            <button className="hover:text-[#0f5c82] hover:bg-zinc-50 p-2 rounded-full transition-colors"><Phone size={20} /></button>
                            <button className="hover:text-[#0f5c82] hover:bg-zinc-50 p-2 rounded-full transition-colors"><Video size={20} /></button>
                            <div className="w-px h-6 bg-zinc-200"></div>
                            <button className="hover:text-zinc-700"><MoreVertical size={20} /></button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#f8fafc]">
                        {currentMessages.map((msg) => {
                            const isMe = msg.senderId === user?.id;
                            const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                            return (
                                <div key={msg.id} className={`flex gap-4 ${isMe ? 'flex-row-reverse' : ''}`}>
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm ${isMe ? 'bg-[#0f5c82]' : 'bg-zinc-400'}`}>
                                        {msg.senderAvatar}
                                    </div>
                                    <div className={`flex flex-col max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                                        <div className="flex items-baseline gap-2 mb-1 px-1">
                                            <span className="text-sm font-bold text-zinc-900">{msg.senderName}</span>
                                            <span className="text-[10px] text-zinc-400">{time}</span>
                                        </div>
                                        <div className={`px-5 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${isMe
                                            ? 'bg-[#0f5c82] text-white rounded-tr-sm'
                                            : 'bg-white border border-zinc-200 text-zinc-700 rounded-tl-sm'
                                            }`}>
                                            {msg.content}
                                        </div>
                                        {isMe && (
                                            <div className="text-[10px] text-zinc-400 mt-1 flex items-center gap-1 select-none">
                                                <Check size={14} />
                                                <span>Sent</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                        {isTyping && (
                            <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-2">
                                <div className="w-10 h-10 bg-zinc-400 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0">...</div>
                                <div className="bg-white border border-zinc-200 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-white border-t border-zinc-100">
                        <form onSubmit={handleSendMessage} className="relative flex items-end gap-2 bg-zinc-50 p-2 rounded-2xl border border-zinc-200 focus-within:ring-2 focus-within:ring-[#0f5c82] focus-within:border-transparent transition-all shadow-sm">
                            <button type="button" className="p-3 text-zinc-400 hover:text-[#0f5c82] hover:bg-zinc-100 rounded-xl transition-colors">
                                <Paperclip size={20} />
                            </button>

                            <textarea
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage();
                                    }
                                }}
                                placeholder={isRecording ? "Listening... Speak now" : `Message #${currentChannelName || '...'}...`}
                                className="flex-1 bg-transparent border-none focus:ring-0 py-3 px-2 text-zinc-900 placeholder-zinc-400 min-h-[24px] max-h-32 resize-none text-sm"
                                rows={1}
                                disabled={!activeChannel}
                            />

                            <button
                                type="button"
                                onClick={handleAIDraft}
                                className="p-2 mr-1 text-[#0f5c82] bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold"
                                title="AI Smart Compose"
                            >
                                <Sparkles size={16} /> AI
                            </button>

                            <button
                                type="button"
                                onMouseDown={startRecording}
                                onMouseUp={stopRecording}
                                onMouseLeave={stopRecording}
                                className={`p-3 rounded-xl transition-all duration-300 ${isRecording ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-200' : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100'}`}
                                title="Hold to Record"
                            >
                                {isRecording ? <Loader2 size={20} className="animate-spin" /> : <Mic size={20} />}
                            </button>

                            <button
                                type="submit"
                                disabled={!inputText.trim() || !activeChannel}
                                className={`p-3 rounded-xl transition-all duration-200 ${!inputText.trim() || !activeChannel
                                    ? 'bg-zinc-200 text-zinc-400'
                                    : 'bg-[#0f5c82] text-white hover:bg-[#0c4a6e] shadow-md'
                                    }`}
                            >
                                <Send size={18} />
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeamChatView;
