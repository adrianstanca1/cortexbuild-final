import React, { useMemo, useState } from 'react';
import { Upload, FileText, Download, Image as ImageIcon, Box, Link, X, Search, CheckCircle2, MoreVertical, Eye, FileSpreadsheet, Trash2, Calendar, Paperclip, Loader2, Clock, MapPin } from 'lucide-react';
import { useProjects } from '@/contexts/ProjectContext';
import { Task, ProjectDocument, RFI, PunchItem } from '@/types';
// import { uploadFile } from '@/services/supabaseClient';
import FileUploadZone from '@/components/FileUploadZone';
import { runRawPrompt, parseAIJSON } from '@/services/geminiService';
import { useToast } from '@/contexts/ToastContext';

interface DocumentsViewProps {
    projectId?: string;
}

const DocumentsView: React.FC<DocumentsViewProps> = ({ projectId }) => {
    const { documents, tasks, updateDocument, addDocument, projects } = useProjects();
    const { addToast } = useToast();
    const [linkingDocId, setLinkingDocId] = useState<string | null>(null);
    const [viewingVersionsId, setViewingVersionsId] = useState<string | null>(null);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [selectedUploadProject, setSelectedUploadProject] = useState<string>(projectId || '');
    const [taskSearch, setTaskSearch] = useState('');
    const [filterType, setFilterType] = useState('All');
    const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');
    const [isUploading, setIsUploading] = useState(false);
    const [isPinMode, setIsPinMode] = useState(false);
    const [activePin, setActivePin] = useState<{ x: number, y: number } | null>(null);
    const [showPinModal, setShowPinModal] = useState(false);
    const [selectedDocForPin, setSelectedDocForPin] = useState<string | null>(null);
    const [pinType, setPinType] = useState<'RFI' | 'PUNCH' | null>(null);
    const [pinSubject, setPinSubject] = useState('');
    const [pinDescription, setPinDescription] = useState('');

    const { addRFI, addPunchItem, rfis, punchItems } = useProjects();

    const handleCreatePin = async () => {
        if (!pinSubject || !activePin || !selectedDocForPin) return;
        const targetProjectId = projectId || selectedUploadProject || (documents.find(d => d.id === selectedDocForPin)?.projectId);

        if (!targetProjectId) {
            addToast("Project context missing", "error");
            return;
        }

        try {
            if (pinType === 'RFI') {
                const rfi: RFI = {
                    id: crypto.randomUUID(),
                    projectId: targetProjectId,
                    number: `RFI-${String(rfis.length + 1).padStart(3, '0')}`,
                    subject: pinSubject,
                    question: pinDescription,
                    assignedTo: 'Unassigned',
                    status: 'Open',
                    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    createdAt: new Date().toISOString().split('T')[0],
                    planMetadata: {
                        documentId: selectedDocForPin,
                        x: activePin.x,
                        y: activePin.y
                    }
                };
                await addRFI(rfi);
                addToast("RFI pinned to plan successfully", "success");
            } else {
                const punch: PunchItem = {
                    id: crypto.randomUUID(),
                    projectId: targetProjectId,
                    title: pinSubject,
                    description: pinDescription,
                    location: `Plan: ${selectedDocForPin}`,
                    priority: 'Medium',
                    status: 'Open',
                    createdAt: new Date().toISOString().split('T')[0],
                    planMetadata: {
                        documentId: selectedDocForPin,
                        x: activePin.x,
                        y: activePin.y
                    }
                };
                await addPunchItem(punch);
                addToast("Punch item pinned to plan successfully", "success");
            }
            setShowPinModal(false);
            setPinType(null);
            setPinSubject('');
            setPinDescription('');
        } catch (err) {
            addToast("Failed to create pin", "error");
        }
    };

    // File Upload
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const filteredDocs = useMemo(() => {
        let docs = documents;
        if (projectId) {
            docs = docs.filter(d => d.projectId === projectId);
        }
        if (filterType !== 'All') {
            if (filterType === 'Plans') docs = docs.filter(d => d.type === 'CAD' || d.type === 'PDF');
            else if (filterType === 'Images') docs = docs.filter(d => d.type === 'Image');
            else docs = docs.filter(d => d.type === filterType); // Generic match
        }
        return docs;
    }, [documents, projectId, filterType]);

    const projectTasks = useMemo(() => {
        if (!projectId) return [];
        return tasks.filter(t => t.projectId === projectId);
    }, [tasks, projectId]);

    const filteredTasks = projectTasks.filter(t =>
        t.title.toLowerCase().includes(taskSearch.toLowerCase())
    );

    const handleLinkTask = (taskId: string) => {
        if (!linkingDocId) return;
        const doc = documents.find(d => d.id === linkingDocId);
        if (!doc) return;

        const currentLinks = doc.linkedTaskIds || [];
        const newLinks = currentLinks.includes(taskId)
            ? currentLinks.filter(id => id !== taskId)
            : [...currentLinks, taskId];

        updateDocument(linkingDocId, { linkedTaskIds: newLinks });
    };

    const getLinkedTaskTitle = (taskId: string) => {
        return tasks.find(t => t.id === taskId)?.title || 'Unknown Task';
    };

    const handleUploadComplete = async (url: string, file: File) => {
        const targetProjectId = projectId || selectedUploadProject;
        if (!targetProjectId) {
            addToast("Please select a project first", "error");
            return;
        }

        try {
            // AI Analysis for specialized summary
            let aiSummary = "Processing document intelligence...";
            try {
                const base64 = url.startsWith('data:') ? url.split(',')[1] : null;
                if (base64) {
                    const prompt = `Analyze this ${file.type} named "${file.name}". Provide a 1-sentence executive summary of its content/purpose for a construction project management system.`;
                    const res = await runRawPrompt(prompt, { model: 'gemini-2.0-flash' }, base64);
                    aiSummary = res || "Document uploaded successfully.";
                }
            } catch (err) {
                console.warn("AI Analysis failed", err);
                aiSummary = "Document uploaded successfully.";
            }

            const newDoc: ProjectDocument = {
                id: `doc-${Date.now()}`,
                name: file.name,
                type: file.type.includes('image') ? 'Image' : file.type.includes('pdf') ? 'PDF' : file.name.endsWith('.dwg') ? 'CAD' : 'Document',
                projectId: targetProjectId,
                projectName: projects.find(p => p.id === targetProjectId)?.name || 'Unknown Project',
                size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
                date: new Date().toLocaleDateString(),
                status: 'Approved',
                url: url,
                currentVersion: 1
            };

            addDocument(newDoc);
            addToast(`Successfully uploaded ${file.name}`, 'success');
            setShowUploadModal(false);
        } catch (err) {
            console.error("Doc View upload error", err);
            addToast("Failed to process document", "error");
        }
    };

    const getFileIcon = (type: string) => {
        if (type === 'Image') return <ImageIcon size={32} className="text-purple-500" />;
        if (type === 'CAD') return <Box size={32} className="text-blue-500" />;
        if (type === 'Spreadsheet') return <FileSpreadsheet size={32} className="text-green-500" />;
        return <FileText size={32} className="text-orange-500" />;
    };

    const getFileColor = (type: string) => {
        if (type === 'Image') return 'bg-purple-50/50 border-purple-100 text-purple-600';
        if (type === 'CAD') return 'bg-blue-50/50 border-blue-100 text-blue-600';
        if (type === 'Spreadsheet') return 'bg-green-50/50 border-green-100 text-green-600';
        return 'bg-orange-50/50 border-orange-100 text-orange-600';
    };

    return (
        <div className="p-8 max-w-7xl mx-auto h-full flex flex-col relative">
            <div className="mb-8">
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-zinc-900 mb-1">{projectId ? 'Project Documents' : 'Documents Library'}</h1>
                        <p className="text-zinc-500">Manage drawings, permits, specs, and photos.</p>
                    </div>
                    <button
                        onClick={() => {
                            setSelectedUploadProject(projectId || '');
                            setShowUploadModal(true);
                        }}
                        className="flex items-center gap-2 bg-[#0f5c82] text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-[#0c4a6e] shadow-lg shadow-blue-900/10 transition-all transform hover:scale-105 active:scale-95 transition-all"
                    >
                        <Upload size={18} />
                        Upload New
                    </button>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex gap-2 overflow-x-auto pb-2 w-full sm:w-auto no-scrollbar">
                        {['All', 'Plans', 'Permits', 'Reports', 'Images'].map((tag) => (
                            <button
                                key={tag}
                                onClick={() => setFilterType(tag)}
                                className={`px-4 py-2 rounded-full text-xs font-bold border transition-all whitespace-nowrap ${filterType === tag
                                    ? 'bg-zinc-800 text-white border-zinc-800 shadow-md'
                                    : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                                    }`}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                    <div className="flex bg-white border border-zinc-200 rounded-lg p-1 shadow-sm">
                        <button onClick={() => setViewMode('GRID')} className={`p-2 rounded-md transition-all ${viewMode === 'GRID' ? 'bg-zinc-100 text-zinc-900 shadow-inner' : 'text-zinc-400 hover:text-zinc-600'}`}><Box size={16} /></button>
                        <button onClick={() => setViewMode('LIST')} className={`p-2 rounded-md transition-all ${viewMode === 'LIST' ? 'bg-zinc-100 text-zinc-900 shadow-inner' : 'text-zinc-400 hover:text-zinc-600'}`}><FileText size={16} /></button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pb-10 custom-scrollbar">
                {viewMode === 'GRID' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredDocs.map((doc) => (
                            <div key={doc.id} className="bg-white border border-zinc-200 rounded-2xl overflow-hidden hover:shadow-xl transition-all group flex flex-col relative h-64">
                                {/* Preview Area */}
                                <div className={`h-36 w-full relative overflow-hidden ${doc.type === 'Image' ? 'bg-zinc-900' : getFileColor(doc.type)} flex items-center justify-center`}>
                                    {doc.type === 'Image' && doc.url ? (
                                        <img src={doc.url} alt={doc.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-90 group-hover:opacity-100" />
                                    ) : (
                                        <div className="transform transition-transform duration-300 group-hover:scale-110 opacity-80">
                                            {getFileIcon(doc.type)}
                                        </div>
                                    )}

                                    {/* Visual Pins Overlay */}
                                    <div className="absolute inset-0 pointer-events-none z-10">
                                        {rfis.filter(r => r.planMetadata?.documentId === doc.id).map(r => (
                                            <div
                                                key={r.id}
                                                className="absolute w-5 h-5 bg-orange-500 rounded-full border-2 border-white flex items-center justify-center text-white shadow-lg"
                                                style={{ left: `${r.planMetadata?.x}%`, top: `${r.planMetadata?.y}%`, transform: 'translate(-50%, -50%)' }}
                                                title={`RFI: ${r.subject}`}
                                            >
                                                <FileText size={10} />
                                            </div>
                                        ))}
                                        {punchItems.filter(p => p.planMetadata?.documentId === doc.id).map(p => (
                                            <div
                                                key={p.id}
                                                className="absolute w-5 h-5 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center text-white shadow-lg"
                                                style={{ left: `${p.planMetadata?.x}%`, top: `${p.planMetadata?.y}%`, transform: 'translate(-50%, -50%)' }}
                                                title={`Punch: ${p.title}`}
                                            >
                                                <CheckCircle2 size={10} />
                                            </div>
                                        ))}
                                    </div>

                                    {/* Hover Actions Overlay */}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[2px]">
                                        <button className="p-2 bg-white text-zinc-800 rounded-full hover:bg-blue-50 hover:text-blue-600 transition-colors shadow-lg" title="Preview">
                                            <Eye size={18} />
                                        </button>
                                        <button className="p-2 bg-white text-zinc-800 rounded-full hover:bg-green-50 hover:text-green-600 transition-colors shadow-lg" title="Download">
                                            <Download size={18} />
                                        </button>
                                        {projectId && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setLinkingDocId(doc.id); }}
                                                className="p-2 bg-white text-zinc-800 rounded-full hover:bg-purple-50 hover:text-purple-600 transition-colors shadow-lg"
                                                title="Link to Task"
                                            >
                                                <Link size={18} />
                                            </button>
                                        )}
                                        {/* Pin Button */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedDocForPin(doc.id);
                                                setIsPinMode(true);
                                                addToast("Click anywhere on the document to drop a pin", "info");
                                            }}
                                            className={`p-2 rounded-full transition-colors shadow-lg ${isPinMode && selectedDocForPin === doc.id ? 'bg-orange-500 text-white' : 'bg-white text-zinc-800 hover:bg-orange-50 hover:text-orange-600'}`}
                                            title="Drop Pin for RFI/Punch"
                                        >
                                            <MapPin size={18} />
                                        </button>
                                    </div>

                                    {/* Clickable Area for Pins */}
                                    {isPinMode && selectedDocForPin === doc.id && (
                                        <div
                                            className="absolute inset-0 z-10 cursor-crosshair"
                                            onClick={(e) => {
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                const x = ((e.clientX - rect.left) / rect.width) * 100;
                                                const y = ((e.clientY - rect.top) / rect.height) * 100;
                                                setActivePin({ x, y });
                                                setShowPinModal(true);
                                                setIsPinMode(false);
                                            }}
                                        />
                                    )}
                                </div>

                                {/* Content Area */}
                                <div className="p-4 flex-1 flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className="font-bold text-zinc-900 text-sm leading-tight line-clamp-2 group-hover:text-[#0f5c82] transition-colors">{doc.name}</h4>
                                            <button className="text-zinc-300 hover:text-zinc-600 -mr-2 -mt-1 p-1"><MoreVertical size={16} /></button>
                                        </div>
                                        <div className="text-[10px] text-zinc-400 flex items-center gap-2 font-medium">
                                            <span>{doc.size}</span>
                                            <span className="w-1 h-1 bg-zinc-300 rounded-full"></span>
                                            <span>{doc.date}</span>
                                        </div>
                                    </div>

                                    {/* Linked Tasks & Version */}
                                    <div className="mt-3 pt-2 border-t border-zinc-50 flex justify-between items-center">
                                        <div className="flex flex-wrap gap-1.5 flex-1 mr-2">
                                            {doc.linkedTaskIds && doc.linkedTaskIds.length > 0 ? (
                                                <>
                                                    {doc.linkedTaskIds.slice(0, 2).map(taskId => (
                                                        <span key={taskId} className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded-md font-bold border border-blue-100 flex items-center gap-1 truncate max-w-[80px]">
                                                            <Link size={8} /> {getLinkedTaskTitle(taskId)}
                                                        </span>
                                                    ))}
                                                    {doc.linkedTaskIds.length > 2 && (
                                                        <span className="text-[10px] bg-zinc-100 text-zinc-500 px-1.5 py-1 rounded-md font-bold">
                                                            +{doc.linkedTaskIds.length - 2}
                                                        </span>
                                                    )}
                                                </>
                                            ) : (
                                                <span className="text-[10px] text-zinc-300 italic flex items-center gap-1">
                                                    <Link size={10} /> No links
                                                </span>
                                            )}
                                        </div>

                                        {/* Version Badge */}
                                        <div className="text-[9px] font-bold bg-zinc-100 text-zinc-500 px-2 py-1 rounded border border-zinc-200 flex items-center gap-1 cursor-help title='Click History to view versions'">
                                            <Clock size={10} /> v{doc.currentVersion}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
                        {filteredDocs.map((doc, i) => (
                            <div key={i} className="flex items-center p-4 border-b border-zinc-100 hover:bg-zinc-50 transition-colors group">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-4 border ${getFileColor(doc.type).replace('/50', '')} bg-opacity-20`}>
                                    {doc.type === 'Image' && doc.url ? (
                                        <img src={doc.url} className="w-full h-full object-cover rounded-lg" alt="icon" />
                                    ) : getFileIcon(doc.type)}
                                </div>
                                <div className="flex-1 min-w-0 mr-4">
                                    <h4 className="text-sm font-bold text-zinc-900 truncate group-hover:text-[#0f5c82] transition-colors">{doc.name}</h4>
                                    <div className="text-xs text-zinc-500 flex items-center gap-2 mt-0.5">
                                        <span>{doc.type}</span>
                                        <span className="w-1 h-1 bg-zinc-300 rounded-full"></span>
                                        <span>{doc.date}</span>
                                        <span className="w-1 h-1 bg-zinc-300 rounded-full"></span>
                                        <span>{doc.size}</span>
                                    </div>
                                </div>

                                <div className="flex-1 hidden md:flex items-center gap-2">
                                    {doc.linkedTaskIds?.map(tid => (
                                        <span key={tid} className="text-[10px] bg-blue-50 text-blue-700 px-2 py-1 rounded font-bold border border-blue-100 truncate max-w-[150px]">
                                            <Link size={10} className="inline mr-1" /> {getLinkedTaskTitle(tid)}
                                        </span>
                                    ))}
                                </div>

                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {projectId && (
                                        <button onClick={() => setLinkingDocId(doc.id)} className="p-2 hover:bg-purple-50 text-zinc-400 hover:text-purple-600 rounded transition-colors" title="Link"><Link size={16} /></button>
                                    )}
                                    <button className="p-2 hover:bg-blue-50 text-zinc-400 hover:text-blue-600 rounded transition-colors" title="Download"><Download size={16} /></button>
                                    <button className="p-2 hover:bg-red-50 text-zinc-400 hover:text-red-600 rounded transition-colors" title="Delete"><Trash2 size={16} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {filteredDocs.length === 0 && (
                    <div className="text-center py-20 bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-300 shadow-sm">
                            <FileText size={32} />
                        </div>
                        <h3 className="text-zinc-900 font-bold mb-1">No Documents Found</h3>
                        <p className="text-zinc-500 text-sm mb-6">Try adjusting filters or upload a new document.</p>
                        {projectId && (
                            <button onClick={() => fileInputRef.current?.click()} className="text-[#0f5c82] text-sm font-bold hover:underline">Upload Document</button>
                        )}
                    </div>
                )}
            </div>

            {/* Upload Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden border border-zinc-200 animate-in zoom-in-95">
                        <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                            <div>
                                <h3 className="text-lg font-bold text-zinc-900">Upload to Project Library</h3>
                                <p className="text-xs text-zinc-500">Files will be automatically categorized and analyzed by AI.</p>
                            </div>
                            <button onClick={() => setShowUploadModal(false)} className="p-2 hover:bg-white rounded-full text-zinc-400 group"><X size={20} className="group-hover:text-zinc-900" /></button>
                        </div>
                        <div className="p-8">
                            {!projectId && (
                                <div className="mb-6">
                                    <label className="block text-sm font-bold text-zinc-700 mb-2">Select Project</label>
                                    <select
                                        value={selectedUploadProject}
                                        onChange={(e) => setSelectedUploadProject(e.target.value)}
                                        className="w-full p-3 bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-[#0f5c82] outline-none transition-all"
                                    >
                                        <option value="">Select a project...</option>
                                        {projects.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <FileUploadZone
                                onUploadComplete={handleUploadComplete}
                                path={projectId}
                            />
                        </div>
                        <div className="p-4 bg-zinc-50/50 border-t border-zinc-100 flex justify-end">
                            <button onClick={() => setShowUploadModal(false)} className="px-6 py-2 text-sm font-bold text-zinc-600 hover:text-zinc-900">Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Link Task Modal */}
            {linkingDocId && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] border border-zinc-200 animate-in zoom-in-95">
                        <div className="p-6 border-b border-zinc-100 bg-zinc-50/80 backdrop-blur-md">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2"><Link size={18} className="text-[#0f5c82]" /> Link Document to Tasks</h3>
                                    <p className="text-xs text-zinc-500 mt-1">Select tasks relevant to <span className="font-medium text-zinc-800">{documents.find(d => d.id === linkingDocId)?.name}</span></p>
                                </div>
                                <button onClick={() => setLinkingDocId(null)} className="p-2 hover:bg-white rounded-full text-zinc-500 transition-colors shadow-sm"><X size={20} /></button>
                            </div>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search tasks by name..."
                                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0f5c82] outline-none shadow-sm transition-all"
                                    value={taskSearch}
                                    onChange={e => setTaskSearch(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-zinc-50/30 custom-scrollbar">
                            {filteredTasks.length > 0 ? filteredTasks.map(task => {
                                const isLinked = documents.find(d => d.id === linkingDocId)?.linkedTaskIds?.includes(task.id);
                                return (
                                    <div
                                        key={task.id}
                                        onClick={() => handleLinkTask(task.id)}
                                        className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all group ${isLinked
                                            ? 'bg-blue-50 border-blue-200 shadow-sm ring-1 ring-blue-100'
                                            : 'bg-white border-zinc-100 hover:border-zinc-300 hover:shadow-sm'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-300 ${isLinked ? 'border-blue-500 bg-blue-500 scale-110' : 'border-zinc-300 group-hover:border-blue-400'}`}>
                                                {isLinked && <CheckCircle2 size={14} className="text-white" />}
                                            </div>
                                            <div className="min-w-0">
                                                <div className={`font-bold text-sm truncate transition-colors ${isLinked ? 'text-blue-900' : 'text-zinc-700'}`}>{task.title}</div>
                                                <div className="text-xs text-zinc-500 flex items-center gap-2 mt-0.5">
                                                    <span className={`px-1.5 rounded text-[10px] font-bold uppercase ${task.status === 'Done' ? 'bg-green-100 text-green-700' :
                                                        task.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                                                            'bg-zinc-100 text-zinc-600'
                                                        }`}>
                                                        {task.status}
                                                    </span>
                                                    <span className="flex items-center gap-1"><Calendar size={10} /> {task.dueDate}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }) : (
                                <div className="p-8 text-center text-zinc-400 text-sm italic bg-zinc-50 rounded-xl border border-dashed border-zinc-200">No matching tasks found.</div>
                            )}
                        </div>

                        <div className="p-4 border-t border-zinc-100 bg-white flex justify-end">
                            <button onClick={() => setLinkingDocId(null)} className="px-6 py-2.5 bg-[#0f5c82] text-white font-bold rounded-xl hover:bg-[#0c4a6e] shadow-lg shadow-blue-900/10 transition-all text-sm">
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Version History Modal */}
            {viewingVersionsId && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] border border-zinc-200 animate-in zoom-in-95">
                        <div className="p-6 border-b border-zinc-100 bg-zinc-50/80 backdrop-blur-md">
                            <div className="flex justify-between items-center mb-1">
                                <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2"><Clock size={18} className="text-zinc-600" /> Version History</h3>
                                <button onClick={() => setViewingVersionsId(null)} className="p-2 hover:bg-white rounded-full text-zinc-500 transition-colors shadow-sm"><X size={20} /></button>
                            </div>
                            <p className="text-sm text-zinc-500">{documents.find(d => d.id === viewingVersionsId)?.name}</p>
                        </div>

                        <div className="flex-1 overflow-y-auto p-0 bg-white">
                            {(() => {
                                const doc = documents.find(d => d.id === viewingVersionsId);
                                if (!doc) return null;

                                const allVersions = [
                                    // Current version
                                    {
                                        id: 'current',
                                        version: doc.currentVersion,
                                        date: doc.date || new Date().toLocaleDateString(),
                                        size: doc.size,
                                        author: 'Current',
                                        url: doc.url || '',
                                        isCurrent: true
                                    },
                                    // Past versions
                                    ...(doc.versions || [])
                                ].sort((a, b) => b.version - a.version);

                                return (
                                    <div className="divide-y divide-zinc-100">
                                        {allVersions.map((v: any) => (
                                            <div key={v.version} className={`p-4 hover:bg-zinc-50 transition-colors flex items-center justify-between ${v.isCurrent ? 'bg-blue-50/50' : ''}`}>
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${v.isCurrent ? 'bg-blue-100 text-blue-700' : 'bg-zinc-100 text-zinc-500'}`}>
                                                        v{v.version}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-zinc-900 text-sm flex items-center gap-2">
                                                            {v.isCurrent ? 'Current Version' : `Version ${v.version}`}
                                                            {v.isCurrent && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 rounded-full">LATEST</span>}
                                                        </div>
                                                        <div className="text-xs text-zinc-500 mt-0.5 flex items-center gap-3">
                                                            <span>{v.date}</span>
                                                            <span>•</span>
                                                            <span>{v.size}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <a href={v.url} target="_blank" rel="noreferrer" className="p-2 text-zinc-400 hover:text-[#0f5c82] hover:bg-blue-50 rounded-lg transition-colors" title="View/Download">
                                                        <Download size={16} />
                                                    </a>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}
                        </div>

                        <div className="p-4 border-t border-zinc-100 bg-zinc-50 flex justify-between items-center">
                            <span className="text-xs text-zinc-400">Upload new version via main list</span>
                            <button onClick={() => setViewingVersionsId(null)} className="px-5 py-2 bg-white border border-zinc-200 text-zinc-700 font-medium rounded-xl hover:bg-zinc-50 shadow-sm transition-all text-sm">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Pin Form Modal */}
            {showPinModal && activePin && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-zinc-200 animate-in zoom-in-95">
                        <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                            <div>
                                <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2"><MapPin size={18} className="text-orange-500" /> New Plan Pin</h3>
                                <p className="text-xs text-zinc-500">Create an issue at X:{activePin.x.toFixed(1)}% Y:{activePin.y.toFixed(1)}%</p>
                            </div>
                            <button onClick={() => setShowPinModal(false)} className="p-2 hover:bg-white rounded-full text-zinc-400"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            {!pinType ? (
                                <div className="flex gap-4">
                                    <button className="flex-1 p-4 border rounded-xl hover:bg-orange-50 hover:border-orange-200 transition-all flex flex-col items-center gap-2 group" onClick={() => setPinType('RFI')}>
                                        <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <FileText size={20} />
                                        </div>
                                        <span className="font-bold text-sm text-zinc-700">Create RFI</span>
                                    </button>
                                    <button className="flex-1 p-4 border rounded-xl hover:bg-blue-50 hover:border-blue-200 transition-all flex flex-col items-center gap-2 group" onClick={() => setPinType('PUNCH')}>
                                        <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <CheckCircle2 size={20} />
                                        </div>
                                        <span className="font-bold text-sm text-zinc-700">Create Punch</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4 animate-in slide-in-from-right-4 duration-200">
                                    <button onClick={() => setPinType(null)} className="text-xs font-bold text-[#0f5c82] hover:underline flex items-center gap-1 mb-2">Back to Selection</button>
                                    <div>
                                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">{pinType === 'RFI' ? 'Subject' : 'Issue Title'}</label>
                                        <input
                                            type="text"
                                            value={pinSubject}
                                            onChange={e => setPinSubject(e.target.value)}
                                            className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-[#0f5c82] outline-none"
                                            placeholder="Brief summary..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Details</label>
                                        <textarea
                                            value={pinDescription}
                                            onChange={e => setPinDescription(e.target.value)}
                                            className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-[#0f5c82] outline-none h-24 resize-none"
                                            placeholder="Detailed information..."
                                        />
                                    </div>
                                    <button
                                        onClick={handleCreatePin}
                                        disabled={!pinSubject}
                                        className="w-full py-3 bg-[#0f5c82] text-white font-bold rounded-xl hover:bg-[#0c4a6e] shadow-lg disabled:opacity-50 transition-all"
                                    >
                                        Pin {pinType} to Plan
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="p-4 bg-zinc-50/50 border-t border-zinc-100 flex justify-end">
                            <button onClick={() => setShowPinModal(false)} className="px-6 py-2 text-sm font-bold text-zinc-600 hover:text-zinc-900">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DocumentsView;
