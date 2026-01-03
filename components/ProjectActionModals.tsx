import React, { useState, useRef } from 'react';
import {
    X, HelpCircle, CheckSquare, Clipboard, Hammer, Camera, Upload,
    Calendar, User, FileText, AlertTriangle, Plus, Image as ImageIcon,
    Loader2, ScanLine, Trash2, Paperclip, PoundSterling
} from 'lucide-react';
import { useProjects } from '../contexts/ProjectContext';
import { RFI, PunchItem, DailyLog, Daywork, ProjectDocument, DayworkLabor, DayworkMaterial, DayworkAttachment } from '@/types';
import { runRawPrompt } from '../services/geminiService';
import { Modal } from './Modal';

type ModalType = 'RFI' | 'PUNCH' | 'LOG' | 'DAYWORK' | 'PHOTO';

interface ProjectActionModalsProps {
    type: ModalType | null;
    projectId: string;
    onClose: () => void;
}

export const ProjectActionModals: React.FC<ProjectActionModalsProps> = ({ type, projectId, onClose }) => {
    const { addRFI, addPunchItem, addDailyLog, addDaywork, addDocument, getProject } = useProjects();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Refs for File inputs
    const fileInputRef = useRef<HTMLInputElement>(null);
    const docInputRef = useRef<HTMLInputElement>(null);

    // --- RFI State ---
    const [rfiData, setRfiData] = useState({ subject: '', question: '', assignedTo: '', dueDate: '' });

    // --- Punch Item State ---
    const [punchData, setPunchData] = useState({ title: '', location: '', priority: 'Medium' as const, description: '' });

    // --- Daily Log State ---
    const [logData, setLogData] = useState({ date: new Date().toISOString().split('T')[0], weather: '', crewCount: 0, workPerformed: '', notes: '' });
    const [isGeneratingLog, setIsGeneratingLog] = useState(false);

    // --- Daywork State ---
    const [dayworkData, setDayworkData] = useState({
        date: new Date().toISOString().split('T')[0],
        description: ''
    });
    const [laborRows, setLaborRows] = useState<DayworkLabor[]>([{ name: '', trade: '', hours: 0, rate: 30 }]);
    const [materialRows, setMaterialRows] = useState<DayworkMaterial[]>([{ item: '', quantity: 0, unit: '', cost: 0 }]);
    const [dayworkAttachments, setDayworkAttachments] = useState<DayworkAttachment[]>([]);

    // --- Photo State ---
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    const inputClass = "w-full p-3 bg-white border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0f5c82] focus:border-[#0f5c82] outline-none transition-all text-zinc-900 placeholder:text-zinc-400";

    const InputGroup = ({ label, children }: any) => (
        <div className="mb-4">
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">{label}</label>
            {children}
        </div>
    );

    if (!type) return null;

    // --- Handlers ---

    const handleSubmitRFI = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const newRFI: RFI = {
            id: `rfi-${Date.now()}`,
            projectId,
            number: `RFI-${Math.floor(100 + Math.random() * 900)}`,
            subject: rfiData.subject,
            question: rfiData.question,
            assignedTo: rfiData.assignedTo || 'Project Manager',
            status: 'Open',
            dueDate: rfiData.dueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
            createdAt: new Date().toISOString().split('T')[0]
        };
        await addRFI(newRFI);
        setIsSubmitting(false);
        onClose();
    };

    const handleSubmitPunch = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const newPunch: PunchItem = {
            id: `pi-${Date.now()}`,
            projectId,
            title: punchData.title,
            location: punchData.location,
            description: punchData.description,
            priority: punchData.priority,
            status: 'Open',
            createdAt: new Date().toISOString().split('T')[0]
        };
        await addPunchItem(newPunch);
        setIsSubmitting(false);
        onClose();
    };

    const handleSubmitLog = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const newLog: DailyLog = {
            id: `dl-${Date.now()}`,
            projectId,
            date: logData.date,
            weather: logData.weather,
            crewCount: logData.crewCount,
            workPerformed: logData.workPerformed,
            notes: logData.notes,
            status: 'Draft',
            author: 'Current User', // Should come from Auth
            createdAt: new Date().toISOString().split('T')[0]
        };
        await addDailyLog(newLog);
        setIsSubmitting(false);
        onClose();
    };

    const generateLogWithAI = async () => {
        setIsGeneratingLog(true);
        try {
            const prompt = `Generate a realistic construction daily log summary for today (${logData.date}). Assume sunny weather, 15 workers, and progress on structural framing and electrical rough-in. Return JSON: { "weather": "string", "workPerformed": "string", "notes": "string" }`;
            const res = await runRawPrompt(prompt, { model: 'gemini-2.5-flash', responseMimeType: 'application/json' });
            const data = JSON.parse(res);
            setLogData(prev => ({ ...prev, ...data, crewCount: 15 }));
        } catch (e) {
            console.error(e);
        } finally {
            setIsGeneratingLog(false);
        }
    };

    const addLaborRow = () => setLaborRows([...laborRows, { name: '', trade: '', hours: 0, rate: 30 }]);
    const removeLaborRow = (i: number) => setLaborRows(laborRows.filter((_, idx) => idx !== i));
    const updateLaborRow = (i: number, field: keyof DayworkLabor, val: any) => {
        const newRows = [...laborRows];
        newRows[i] = { ...newRows[i], [field]: val };
        setLaborRows(newRows);
    };

    const addMaterialRow = () => setMaterialRows([...materialRows, { item: '', quantity: 0, unit: '', cost: 0 }]);
    const removeMaterialRow = (i: number) => setMaterialRows(materialRows.filter((_, idx) => idx !== i));
    const updateMaterialRow = (i: number, field: keyof DayworkMaterial, val: any) => {
        const newRows = [...materialRows];
        newRows[i] = { ...newRows[i], [field]: val };
        setMaterialRows(newRows);
    };

    const handleDayworkAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            Array.from(files).forEach((file: File) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setDayworkAttachments(prev => [...prev, {
                        name: file.name,
                        type: file.type,
                        data: reader.result as string,
                        size: (file.size / 1024).toFixed(2) + ' KB'
                    }]);
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const removeAttachment = (index: number) => {
        setDayworkAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const calculateDayworkTotal = () => {
        const laborCost = laborRows.reduce((acc, row) => acc + (row.hours * (row.rate || 0)), 0);
        const materialCost = materialRows.reduce((acc, row) => acc + (row.cost || 0), 0);
        return { laborCost, materialCost, total: laborCost + materialCost };
    };

    const handleSubmitDaywork = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const { laborCost, materialCost, total } = calculateDayworkTotal();
        const validLabor = laborRows.filter(l => l.name);
        const validMaterials = materialRows.filter(m => m.item);

        const newDW: Daywork = {
            id: `dw-${Date.now()}`,
            projectId,
            date: dayworkData.date,
            description: dayworkData.description,
            status: 'Pending',
            createdAt: new Date().toISOString().split('T')[0],
            labor: validLabor,
            materials: validMaterials,
            attachments: dayworkAttachments,
            totalLaborCost: laborCost,
            totalMaterialCost: materialCost,
            grandTotal: total
        };

        await addDaywork(newDW);

        if (dayworkAttachments.length > 0) {
            const project = getProject(projectId);
            for (const att of dayworkAttachments) {
                const newDoc: ProjectDocument = {
                    id: `doc-dw-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                    name: `[Daywork] ${att.name}`,
                    type: att.type.startsWith('image/') ? 'Image' : 'Document',
                    projectId,
                    projectName: project?.name || 'Project',
                    size: att.size || 'Unknown',
                    date: new Date().toLocaleDateString(),
                    status: 'Approved',
                    url: att.data,
                    linkedDayworkId: newDW.id,
                    currentVersion: 1
                };
                await addDocument(newDoc);
            }
        }

        setIsSubmitting(false);
        onClose();
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPhotoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setPhotoPreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const startCamera = async () => {
        setIsCameraOpen(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (e) {
            console.error("Camera error", e);
            setIsCameraOpen(false);
        }
    };

    const capturePhoto = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
            const dataUrl = canvas.toDataURL('image/jpeg');
            setPhotoPreview(dataUrl);

            const stream = videoRef.current.srcObject as MediaStream;
            stream?.getTracks().forEach(t => t.stop());
            setIsCameraOpen(false);
        }
    };

    const handleSubmitPhoto = async () => {
        if (!photoPreview) return;
        setIsSubmitting(true);

        const project = getProject(projectId);
        let fileUrl = photoPreview;

        if (photoFile) {
            try {
                const { publicUrl } = await import('@/services/storageService').then(m => m.storageService.upload(photoFile, 'documents', `projects/${projectId}/photos`));
                const uploaded = publicUrl;
                if (uploaded) fileUrl = uploaded;
            } catch (e) {
                console.warn("Upload failed, using base64", e);
            }
        }

        const newDoc: ProjectDocument = {
            id: `doc-${Date.now()}`,
            name: `Site Photo ${new Date().toLocaleTimeString()}`,
            type: 'Image',
            projectId,
            projectName: project?.name || 'Project',
            size: '2 MB',
            date: new Date().toLocaleDateString(),
            status: 'Approved',
            url: fileUrl,
            currentVersion: 1
        };

        await addDocument(newDoc);
        setIsSubmitting(false);
        onClose();
    };

    if (type === 'RFI') return (
        <Modal isOpen={!!type} onClose={onClose} title="New Request for Information" size="md">
            <div className="flex items-center gap-3 mb-4 text-[#0f5c82] bg-blue-50 p-3 rounded-lg border border-blue-100">
                <HelpCircle size={24} />
                <span className="text-sm font-medium text-blue-900">Request information or clarification from the project team.</span>
            </div>
            <form onSubmit={handleSubmitRFI}>
                <InputGroup label="Subject">
                    <input type="text" className={inputClass} placeholder="e.g. Clarification on steel spec" value={rfiData.subject} onChange={e => setRfiData({ ...rfiData, subject: e.target.value })} required />
                </InputGroup>
                <InputGroup label="Question / Issue">
                    <textarea className={`${inputClass} h-32 resize-none`} placeholder="Describe the issue..." value={rfiData.question} onChange={e => setRfiData({ ...rfiData, question: e.target.value })} required />
                </InputGroup>
                <div className="grid grid-cols-2 gap-4">
                    <InputGroup label="Assigned To">
                        <input type="text" className={inputClass} placeholder="Name or Role" value={rfiData.assignedTo} onChange={e => setRfiData({ ...rfiData, assignedTo: e.target.value })} />
                    </InputGroup>
                    <InputGroup label="Due Date">
                        <input type="date" className={inputClass} value={rfiData.dueDate} onChange={e => setRfiData({ ...rfiData, dueDate: e.target.value })} />
                    </InputGroup>
                </div>
                <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-[#0f5c82] text-white rounded-xl font-bold hover:bg-[#0c4a6e] transition-all shadow-md mt-2">
                    {isSubmitting ? 'Submitting...' : 'Create RFI'}
                </button>
            </form>
        </Modal>
    );

    if (type === 'PUNCH') return (
        <Modal isOpen={!!type} onClose={onClose} title="Log Punch Item" size="md">
            <div className="flex items-center gap-3 mb-4 text-orange-600 bg-orange-50 p-3 rounded-lg border border-orange-100">
                <CheckSquare size={24} />
                <span className="text-sm font-medium text-orange-900">Record defects or outstanding items.</span>
            </div>
            <form onSubmit={handleSubmitPunch}>
                <InputGroup label="Item Title">
                    <input type="text" className={inputClass} placeholder="e.g. Paint scratch" value={punchData.title} onChange={e => setPunchData({ ...punchData, title: e.target.value })} required />
                </InputGroup>
                <div className="grid grid-cols-2 gap-4">
                    <InputGroup label="Location">
                        <input type="text" className={inputClass} placeholder="e.g. Room 101" value={punchData.location} onChange={e => setPunchData({ ...punchData, location: e.target.value })} required />
                    </InputGroup>
                    <InputGroup label="Priority">
                        <select className={inputClass} value={punchData.priority} onChange={e => setPunchData({ ...punchData, priority: e.target.value as any })}>
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                        </select>
                    </InputGroup>
                </div>
                <InputGroup label="Description">
                    <textarea className={`${inputClass} h-24 resize-none`} placeholder="Details..." value={punchData.description} onChange={e => setPunchData({ ...punchData, description: e.target.value })} />
                </InputGroup>
                <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition-all shadow-md mt-2">
                    {isSubmitting ? 'Saving...' : 'Add Item'}
                </button>
            </form>
        </Modal>
    );

    if (type === 'LOG') return (
        <Modal isOpen={!!type} onClose={onClose} title="Daily Site Log" size="md">
            <div className="flex items-center gap-3 mb-4 text-purple-600 bg-purple-50 p-3 rounded-lg border border-purple-100">
                <Clipboard size={24} />
                <span className="text-sm font-medium text-purple-900">Record daily site progress and conditions.</span>
            </div>
            <form onSubmit={handleSubmitLog}>
                <div className="flex justify-end mb-2">
                    <button type="button" onClick={generateLogWithAI} disabled={isGeneratingLog} className="text-xs flex items-center gap-1 text-purple-600 hover:bg-purple-50 px-2 py-1 rounded font-bold transition-colors">
                        {isGeneratingLog ? <Loader2 size={12} className="animate-spin" /> : <ScanLine size={12} />} Auto-Fill with AI
                    </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <InputGroup label="Date">
                        <input type="date" className={inputClass} value={logData.date} onChange={e => setLogData({ ...logData, date: e.target.value })} required />
                    </InputGroup>
                    <InputGroup label="Crew Count">
                        <input type="number" className={inputClass} value={logData.crewCount} onChange={e => setLogData({ ...logData, crewCount: parseInt(e.target.value) })} />
                    </InputGroup>
                </div>
                <InputGroup label="Weather Conditions">
                    <input type="text" className={inputClass} placeholder="e.g. Sunny, 22°C" value={logData.weather} onChange={e => setLogData({ ...logData, weather: e.target.value })} />
                </InputGroup>
                <InputGroup label="Work Performed">
                    <textarea className={`${inputClass} h-24 resize-none`} placeholder="Summary of work..." value={logData.workPerformed} onChange={e => setLogData({ ...logData, workPerformed: e.target.value })} required />
                </InputGroup>
                <InputGroup label="Notes / Delays">
                    <textarea className={`${inputClass} h-20 resize-none`} placeholder="Any issues..." value={logData.notes} onChange={e => setLogData({ ...logData, notes: e.target.value })} />
                </InputGroup>
                <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-[#0f5c82] text-white rounded-xl font-bold hover:bg-[#0c4a6e] transition-all shadow-md mt-2">
                    {isSubmitting ? 'Saving...' : 'Submit Log'}
                </button>
            </form>
        </Modal>
    );

    if (type === 'DAYWORK') return (
        <Modal isOpen={!!type} onClose={onClose} title="Daywork Sheet" size="xl">
            <form onSubmit={handleSubmitDaywork} className="space-y-6">

                {/* Section 1: General Info */}
                <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
                    <h4 className="text-sm font-bold text-zinc-800 mb-4 flex items-center gap-2"><Clipboard size={16} /> Sheet Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Sheet Date</label>
                            <input type="date" className={inputClass} value={dayworkData.date} onChange={e => setDayworkData({ ...dayworkData, date: e.target.value })} required />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Description of Work</label>
                            <textarea className={`${inputClass} h-[46px] resize-none py-2`} placeholder="Summary of work carried out..." value={dayworkData.description} onChange={e => setDayworkData({ ...dayworkData, description: e.target.value })} required />
                        </div>
                    </div>
                </div>

                {/* Section 2: Labor Grid */}
                <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="text-sm font-bold text-zinc-800 flex items-center gap-2"><User size={16} /> Labour</h4>
                        <button type="button" onClick={addLaborRow} className="text-[#0f5c82] text-xs font-bold hover:bg-blue-50 px-2 py-1 rounded transition-colors">+ Add Worker</button>
                    </div>
                    <div className="space-y-2">
                        <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-zinc-400 uppercase px-2">
                            <div className="col-span-4">Name</div>
                            <div className="col-span-3">Trade</div>
                            <div className="col-span-2">Total Hours</div>
                            <div className="col-span-2">Rate (£)</div>
                            <div className="col-span-1 text-center">Action</div>
                        </div>
                        <div className="space-y-2">
                            {laborRows.map((row, i) => (
                                <div key={i} className="grid grid-cols-12 gap-2 items-center bg-zinc-50 p-2 rounded-lg border border-zinc-100">
                                    <div className="col-span-4"><input type="text" placeholder="Worker Name" className="w-full p-2 text-sm border border-zinc-200 rounded bg-white focus:border-[#0f5c82] outline-none" value={row.name} onChange={e => updateLaborRow(i, 'name', e.target.value)} /></div>
                                    <div className="col-span-3"><input type="text" placeholder="Trade" className="w-full p-2 text-sm border border-zinc-200 rounded bg-white focus:border-[#0f5c82] outline-none" value={row.trade} onChange={e => updateLaborRow(i, 'trade', e.target.value)} /></div>
                                    <div className="col-span-2"><input type="number" placeholder="0" className="w-full p-2 text-sm border border-zinc-200 rounded bg-white focus:border-[#0f5c82] outline-none" value={row.hours} onChange={e => updateLaborRow(i, 'hours', parseFloat(e.target.value))} /></div>
                                    <div className="col-span-2"><input type="number" placeholder="0" className="w-full p-2 text-sm border border-zinc-200 rounded bg-white focus:border-[#0f5c82] outline-none" value={row.rate} onChange={e => updateLaborRow(i, 'rate', parseFloat(e.target.value))} /></div>
                                    <div className="col-span-1 flex justify-center"><button type="button" onClick={() => removeLaborRow(i)} className="text-zinc-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button></div>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-end mt-2 px-2">
                            <div className="text-sm font-bold text-zinc-700">Total Labour: <span className="text-[#0f5c82]">£{laborRows.reduce((acc, row) => acc + (row.hours * (row.rate || 0)), 0).toFixed(2)}</span></div>
                        </div>
                    </div>
                </div>

                {/* Section 3: Material Grid */}
                <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="text-sm font-bold text-zinc-800 flex items-center gap-2"><Hammer size={16} /> Materials & Plant</h4>
                        <button type="button" onClick={addMaterialRow} className="text-[#0f5c82] text-xs font-bold hover:bg-blue-50 px-2 py-1 rounded transition-colors">+ Add Item</button>
                    </div>
                    <div className="space-y-2">
                        <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-zinc-400 uppercase px-2">
                            <div className="col-span-5">Description</div>
                            <div className="col-span-2">Qty</div>
                            <div className="col-span-2">Unit</div>
                            <div className="col-span-2">Cost (£)</div>
                            <div className="col-span-1 text-center">Action</div>
                        </div>
                        <div className="space-y-2">
                            {materialRows.map((row, i) => (
                                <div key={i} className="grid grid-cols-12 gap-2 items-center bg-zinc-50 p-2 rounded-lg border border-zinc-100">
                                    <div className="col-span-5"><input type="text" placeholder="Item Name" className="w-full p-2 text-sm border border-zinc-200 rounded bg-white focus:border-[#0f5c82] outline-none" value={row.item} onChange={e => updateMaterialRow(i, 'item', e.target.value)} /></div>
                                    <div className="col-span-2"><input type="number" placeholder="0" className="w-full p-2 text-sm border border-zinc-200 rounded bg-white focus:border-[#0f5c82] outline-none" value={row.quantity} onChange={e => updateMaterialRow(i, 'quantity', parseFloat(e.target.value))} /></div>
                                    <div className="col-span-2"><input type="text" placeholder="Unit" className="w-full p-2 text-sm border border-zinc-200 rounded bg-white focus:border-[#0f5c82] outline-none" value={row.unit} onChange={e => updateMaterialRow(i, 'unit', e.target.value)} /></div>
                                    <div className="col-span-2"><input type="number" placeholder="0.00" className="w-full p-2 text-sm border border-zinc-200 rounded bg-white focus:border-[#0f5c82] outline-none" value={row.cost} onChange={e => updateMaterialRow(i, 'cost', parseFloat(e.target.value))} /></div>
                                    <div className="col-span-1 flex justify-center"><button type="button" onClick={() => removeMaterialRow(i)} className="text-zinc-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button></div>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-end mt-2 px-2">
                            <div className="text-sm font-bold text-zinc-700">Total Materials: <span className="text-[#0f5c82]">£{materialRows.reduce((acc, row) => acc + (row.cost || 0), 0).toFixed(2)}</span></div>
                        </div>
                    </div>
                </div>

                {/* Section 4: Uploads */}
                <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
                    <h4 className="text-sm font-bold text-zinc-800 mb-4 flex items-center gap-2"><Paperclip size={16} /> Documentation</h4>
                    <div className="flex flex-wrap gap-4">
                        {dayworkAttachments.map((file, i) => (
                            <div key={i} className="relative group w-24 h-24 bg-zinc-50 border border-zinc-200 rounded-xl overflow-hidden flex flex-col items-center justify-center shadow-sm hover:shadow-md transition-all">
                                {file.type.startsWith('image/') ? (
                                    <img src={file.data} alt={file.name} className="w-full h-full object-cover" />
                                ) : (
                                    <FileText size={32} className="text-zinc-400" />
                                )}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                <button type="button" onClick={() => removeAttachment(i)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity transform scale-75 hover:scale-100"><X size={12} /></button>
                                {!file.type.startsWith('image/') && <span className="text-[9px] text-zinc-500 mt-2 px-1 truncate w-full text-center">{file.name}</span>}
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={() => docInputRef.current?.click()}
                            className="w-24 h-24 border-2 border-dashed border-zinc-300 rounded-xl flex flex-col items-center justify-center text-zinc-400 hover:border-[#0f5c82] hover:text-[#0f5c82] hover:bg-blue-50 transition-all group"
                        >
                            <Upload size={24} className="mb-2 group-hover:scale-110 transition-transform" />
                            <span className="text-xs font-bold">Upload</span>
                        </button>
                        <input type="file" ref={docInputRef} className="hidden" multiple accept="image/*,.pdf" onChange={handleDayworkAttachment} />
                    </div>
                </div>

                {/* Footer Totals */}
                <div className="bg-zinc-900 text-white p-4 rounded-xl flex justify-between items-center shadow-lg">
                    <div>
                        <div className="text-xs text-zinc-400 uppercase font-bold">Grand Total</div>
                        <div className="text-2xl font-bold">£{(laborRows.reduce((acc, row) => acc + (row.hours * (row.rate || 0)), 0) + materialRows.reduce((acc, row) => acc + (row.cost || 0), 0)).toFixed(2)}</div>
                    </div>
                    <div className="flex gap-3">
                        <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl text-sm font-bold text-zinc-300 hover:bg-white/10 transition-colors">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="px-8 py-3 bg-white text-zinc-900 rounded-xl text-sm font-bold hover:bg-zinc-200 transition-colors shadow-md flex items-center gap-2">
                            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckSquare size={16} />}
                            {isSubmitting ? 'Saving...' : 'Submit Sheet'}
                        </button>
                    </div>
                </div>
            </form>
        </Modal>
    );

    if (type === 'PHOTO') return (
        <Modal isOpen={!!type} onClose={onClose} title="Add Project Photo" size="md">
            <div className="space-y-6">
                {!isCameraOpen && !photoPreview && (
                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={startCamera} className="flex flex-col items-center justify-center p-8 bg-zinc-50 border-2 border-dashed border-zinc-300 rounded-2xl hover:bg-blue-50 hover:border-[#0f5c82] transition-all group">
                            <Camera size={32} className="text-zinc-400 group-hover:text-[#0f5c82] mb-2" />
                            <span className="text-sm font-bold text-zinc-600 group-hover:text-[#0f5c82]">Take Photo</span>
                        </button>
                        <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center p-8 bg-zinc-50 border-2 border-dashed border-zinc-300 rounded-2xl hover:bg-blue-50 hover:border-[#0f5c82] transition-all group">
                            <Upload size={32} className="text-zinc-400 group-hover:text-[#0f5c82] mb-2" />
                            <span className="text-sm font-bold text-zinc-600 group-hover:text-[#0f5c82]">Upload File</span>
                        </button>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                    </div>
                )}

                {isCameraOpen && (
                    <div className="relative bg-black rounded-2xl overflow-hidden aspect-[4/3]">
                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                        <button onClick={capturePhoto} className="absolute bottom-4 left-1/2 -translate-x-1/2 w-16 h-16 bg-white rounded-full border-4 border-zinc-300 shadow-lg active:scale-95 transition-transform" />
                        <button onClick={() => setIsCameraOpen(false)} className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full"><X size={20} /></button>
                    </div>
                )}

                {photoPreview && (
                    <div className="space-y-4">
                        <div className="relative rounded-2xl overflow-hidden border border-zinc-200 aspect-video bg-zinc-100">
                            <img src={photoPreview} alt="Preview" className="w-full h-full object-contain" />
                            <button onClick={() => { setPhotoPreview(null); setPhotoFile(null); }} className="absolute top-2 right-2 p-1 bg-white/80 rounded-full hover:bg-red-100 hover:text-red-500"><X size={16} /></button>
                        </div>
                        <button onClick={handleSubmitPhoto} disabled={isSubmitting} className="w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all shadow-md">
                            {isSubmitting ? 'Uploading...' : 'Save Photo'}
                        </button>
                    </div>
                )}
            </div>
        </Modal>
    );

    return null;
};
