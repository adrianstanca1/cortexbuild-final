import React, { useState, useEffect, useRef } from 'react';
import { AtSign } from 'lucide-react';
import { useProjects } from '@/contexts/ProjectContext';
import { TeamMember } from '@/types';

interface MentionInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    onKeyDown?: (e: React.KeyboardEvent) => void;
    disabled?: boolean;
    className?: string;
}

export const MentionInput: React.FC<MentionInputProps> = ({
    value,
    onChange,
    placeholder,
    onKeyDown,
    disabled,
    className
}) => {
    const { teamMembers } = useProjects();
    const [showMentions, setShowMentions] = useState(false);
    const [filteredMembers, setFilteredMembers] = useState<TeamMember[]>([]);
    const [mentionIndex, setMentionIndex] = useState(-1);
    const [cursorPosition, setCursorPosition] = useState(0);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        const pos = e.target.selectionStart;
        setCursorPosition(pos);
        onChange(newValue);

        const lastChar = newValue.lastIndexOf('@', pos - 1);
        if (lastChar !== -1) {
            const query = newValue.substring(lastChar + 1, pos);
            if (!query.includes(' ')) {
                const filtered = teamMembers.filter(m =>
                    m.name.toLowerCase().includes(query.toLowerCase()) ||
                    m.email.toLowerCase().includes(query.toLowerCase())
                );
                setFilteredMembers(filtered);
                setShowMentions(filtered.length > 0);
                setMentionIndex(0);
                return;
            }
        }
        setShowMentions(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (showMentions) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setMentionIndex(prev => (prev + 1) % filteredMembers.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setMentionIndex(prev => (prev - 1 + filteredMembers.length) % filteredMembers.length);
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                insertMention(filteredMembers[mentionIndex]);
            } else if (e.key === 'Escape') {
                setShowMentions(false);
            }
        }
        onKeyDown?.(e);
    };

    const insertMention = (member: TeamMember) => {
        const before = value.substring(0, value.lastIndexOf('@', cursorPosition - 1));
        const after = value.substring(cursorPosition);
        const newValue = `${before}@${member.name} ${after}`;
        onChange(newValue);
        setShowMentions(false);
        inputRef.current?.focus();
    };

    return (
        <div className="relative">
            <textarea
                ref={inputRef}
                value={value}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled}
                className={className}
                rows={3}
            />

            {showMentions && (
                <div className="absolute bottom-full left-0 mb-2 w-64 bg-white rounded-xl shadow-xl border border-zinc-200 overflow-hidden z-[70] animate-in slide-in-from-bottom-2">
                    <div className="p-2 border-b border-zinc-100 bg-zinc-50 flex items-center gap-2">
                        <AtSign size={12} className="text-blue-600" />
                        <span className="text-[10px] font-bold text-zinc-500 uppercase">Mention Team Member</span>
                    </div>
                    <div className="max-h-48 overflow-y-auto p-1">
                        {filteredMembers.map((member, index) => (
                            <button
                                key={member.id}
                                onClick={() => insertMention(member)}
                                className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${index === mentionIndex ? 'bg-blue-50 text-blue-700' : 'hover:bg-zinc-50 text-zinc-700'
                                    }`}
                            >
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">
                                    {member.name[0]}
                                </div>
                                <div className="min-w-0">
                                    <div className="text-sm font-semibold truncate">{member.name}</div>
                                    <div className="text-[10px] opacity-60 truncate">{member.role}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
