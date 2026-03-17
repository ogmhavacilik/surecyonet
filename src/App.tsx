/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Save, FileDown, Table as TableIcon, FileText, Plus, Trash2, ChevronRight, ChevronLeft, ArrowUpLeft, ArrowUpRight, ArrowDown, Sparkles } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
interface PerformanceRow {
  gosterge: string;
  yontem: string;
  olcut: string;
  deger: string;
}

interface ProcessStep {
  id: number;
  text: string;
  type: 'start' | 'process' | 'decision' | 'end' | 'input' | 'loop' | 'document' | 'subroutine';
  yesLabel?: string;
  noLabel?: string;
  infoLabel?: string;
  yesTargetId?: number;
  noTargetId?: number;
  infoTargetId?: number;
  position?: 'left' | 'center' | 'right';
}

const StepBox = ({ step, selectingTarget, onSelect }: { step: ProcessStep, selectingTarget: any, onSelect: () => void }) => {
  return (
    <div 
      onClick={onSelect}
      className={cn(
        "p-4 min-w-[240px] max-w-[320px] text-center text-[13px] font-bold shadow-md border border-[#1d4e89] flex items-center justify-center min-h-[100px] relative transition-all",
        "bg-gradient-to-b from-[#dce6f1] to-[#b8cce4]",
        selectingTarget ? "cursor-pointer hover:ring-4 hover:ring-yellow-400 hover:scale-105 z-50" : "",
        (step.type === 'start' || step.type === 'end') ? 'rounded-[60px]' : '',
        step.type === 'process' ? 'rounded-none' : '',
        step.type === 'decision' ? 'w-[160px] h-[160px] mb-16 mt-16 rotate-45 border-2 border-[#1d4e89] bg-gradient-to-br from-[#dce6f1] to-[#b8cce4]' : '',
        step.type === 'input' ? 'skew-x-[-20deg]' : '',
        step.type === 'loop' ? '[clip-path:polygon(20%_0%,80%_0%,100%_50%,80%_100%,20%_100%,0%_50%)]' : '',
        step.type === 'document' ? '[clip-path:polygon(0%_0%,100%_0%,100%_85%,75%_100%,25%_85%,0%_100%)]' : '',
        step.type === 'subroutine' ? 'border-x-[5px] border-x-[#1d4e89]' : ''
    )}>
      <div className={cn(
        "leading-tight px-2 w-full z-10",
        step.type === 'decision' ? '-rotate-45 max-w-[120px]' : '',
        step.type === 'input' ? 'skew-x-[20deg]' : ''
      )}>
        {step.text}
      </div>
    </div>
  );
};

interface FormData {
  yayinTarihi: string;
  surecNo: string;
  revizyonTarihi: string;
  revizyonNo: string;
  ustBirim: string;
  altBirim: string;
  personel: string;
  surecAdi: string;
  surecGayesi: string;
  surecGirdisi: string;
  surecTedarikcisi: string;
  surecCiktisi: string;
  surecMusterisi: string;
  surecDayanagi: string;
  surecPeriyodu: string;
  iliskiliSurecler: string;
  basvurudaIstenenEvraklar: string;
  performansTablos: PerformanceRow[];
  hazirlayan: string;
  kontrolEden: string;
  onaylayan: string;
  steps: ProcessStep[];
}

// --- Components ---

const EditableCell = ({ 
  value, 
  onChange, 
  className, 
  isLabel = false,
  multiline = false,
  isExporting = false,
  bgClass
}: { 
  value: string; 
  onChange: (val: string) => void; 
  className?: string;
  isLabel?: boolean;
  multiline?: boolean;
  isExporting?: boolean;
  bgClass?: string;
}) => {
  const baseClass = isLabel 
    ? "bg-[#b8cce4] border border-black p-1 text-[10px] font-bold flex items-center justify-center text-center uppercase leading-tight outline-none focus:bg-blue-200 transition-colors"
    : cn("bg-white border border-black p-1 text-[10px] flex items-center leading-tight min-h-[24px] outline-none focus:bg-yellow-50 transition-colors w-full h-full", bgClass);

  const finalClass = cn(baseClass, className);

  if (isExporting) {
    return (
      <div className={cn(finalClass, "whitespace-pre-wrap")}>
        {value || " "}
      </div>
    );
  }

  if (multiline) {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(finalClass, "resize-none")}
        rows={3}
      />
    );
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={finalClass}
    />
  );
};

export default function App() {
  const [view, setView] = useState<'form' | 'matrix'>('form');
  const [data, setData] = useState<FormData>({
    yayinTarihi: "",
    surecNo: "",
    revizyonTarihi: "",
    revizyonNo: "00",
    ustBirim: "Havacılık Dairesi Başkanlığı",
    altBirim: "Hava Araçları Bakım ve Teknik Şube Müdürlüğü",
    personel: "",
    surecAdi: "Yakıt ikmali sonrası Makbuz bilgilerinin sisteme girilmesi",
    surecGayesi: "Yakıt makbuz bilgilerinin kontrolü",
    surecGirdisi: "Makbuz Görseli ve bilgileri",
    surecTedarikcisi: "Orman Genel Müdürlüğü",
    surecCiktisi: "Yakıt Takip Sistemi",
    surecMusterisi: "Hava Araçları Bakım ve Teknik Şube Müdürlüğü",
    surecDayanagi: "",
    surecPeriyodu: "Her ikmal sonrası",
    iliskiliSurecler: "",
    basvurudaIstenenEvraklar: "Makbuz Görseli",
    performansTablos: [
      { gosterge: "", yontem: "", olcut: "", deger: "" },
      { gosterge: "", yontem: "", olcut: "", deger: "" },
      { gosterge: "", yontem: "", olcut: "", deger: "" },
    ],
    hazirlayan: "HAVACILIK DAİRESİ BAŞKANLIĞI",
    kontrolEden: "STRATEJİ GELİŞTİRME DAİRESİ BAŞKANLIĞI",
    onaylayan: "GENEL MÜDÜR YARDIMCISI",
    steps: [
      { id: 1, text: "İkmal süreci tamamlanır. Görsel Uçuş Teknisyeni tarafından hazırlanır.", type: 'start' },
      { id: 2, text: "Hazırlanan Görsel ile sistemde makbuz bilgileri doldurulur.", type: 'process' },
      { id: 3, text: "Görsel sisteme yüklenir.", type: 'process' },
      { id: 4, text: "Sisteme yüklendikten sonra sistem içinden \"Kayıtları Ara\" kısmından kontrolü yapılır.", type: 'process' },
      { id: 5, text: "Sürecin sonu (Yakıt Takip Sistemine başarılı şekilde Makbuz verisi ve Görseli yüklenir)", type: 'end' }
    ]
  });

  const formRef = useRef<HTMLDivElement>(null);
  const matrixRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const [selectingTarget, setSelectingTarget] = useState<{ stepIndex: number, branch: 'yes' | 'no' | 'info' } | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  const generateWithAi = async () => {
    const userInput = window.prompt("Süreci tasarlamak için bir açıklama girin (Örn: 'İş başvurusu süreci'):");
    if (!userInput) return;

    setIsAiGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Aşağıdaki süreç için bir iş akışı tasarla. Yanıtı sadece JSON formatında ver.
        Süreç: ${userInput}
        
        JSON yapısı:
        {
          "steps": [
            { "id": 1, "text": "Başlangıç", "type": "start", "position": "center" },
            { "id": 2, "text": "İşlem adımı", "type": "process", "position": "center" },
            { "id": 3, "text": "Karar", "type": "decision", "position": "center", "yesTargetId": 4, "noTargetId": 5, "yesLabel": "Evet", "noLabel": "Hayır" }
          ]
        }
        
        Tipler: 'start', 'process', 'decision', 'end', 'input', 'loop', 'document', 'subroutine'
        Pozisyonlar: 'left', 'center', 'right'
        
        Lütfen mantıklı bir akış oluştur.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              steps: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.INTEGER },
                    text: { type: Type.STRING },
                    type: { type: Type.STRING },
                    position: { type: Type.STRING },
                    yesTargetId: { type: Type.INTEGER },
                    noTargetId: { type: Type.INTEGER },
                    infoTargetId: { type: Type.INTEGER },
                    yesLabel: { type: Type.STRING },
                    noLabel: { type: Type.STRING },
                    infoLabel: { type: Type.STRING }
                  }
                }
              }
            }
          }
        }
      });

      const result = JSON.parse(response.text);
      if (result.steps) {
        setData(prev => ({ ...prev, steps: result.steps }));
      }
    } catch (error) {
      console.error("AI Generation Error:", error);
      alert("AI ile tasarım yapılırken bir hata oluştu.");
    } finally {
      setIsAiGenerating(false);
    }
  };

  const updateField = (field: keyof FormData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const updatePerformance = (index: number, field: keyof PerformanceRow, value: string) => {
    const newTable = [...data.performansTablos];
    newTable[index] = { ...newTable[index], [field]: value };
    setData(prev => ({ ...prev, performansTablos: newTable }));
  };

  const updateStep = (index: number, field: keyof ProcessStep, value: any) => {
    const newSteps = [...data.steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setData(prev => ({ ...prev, steps: newSteps }));
  };

    const exportToPDF = async () => {
      if (isExporting) return;
      setIsExporting(true);
      try {
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        // Helper to force visibility for capture
        const forceVisible = (el: HTMLElement) => {
          let curr: HTMLElement | null = el;
          while (curr && curr !== document.body) {
            if (curr.classList.contains('hidden')) {
              curr.classList.remove('hidden');
              curr.setAttribute('data-temp-visible', 'true');
            }
            curr = curr.parentElement;
          }
          el.style.width = '210mm';
          el.style.backgroundColor = 'white';
          el.style.padding = '0'; // Kenarlara tam oturması için padding sıfırlandı
          el.style.margin = '0';
          el.style.position = 'fixed';
          el.style.left = '-10000px';
          el.style.top = '0';
          el.style.zIndex = '9999';
        };
        
        const restoreVisibility = (el: HTMLElement) => {
          let curr: HTMLElement | null = el;
          while (curr && curr !== document.body) {
            if (curr.getAttribute('data-temp-visible') === 'true') {
              curr.classList.add('hidden');
              curr.removeAttribute('data-temp-visible');
            }
            curr = curr.parentElement;
          }
          el.style.width = '';
          el.style.backgroundColor = '';
          el.style.padding = '';
          el.style.margin = '';
          el.style.position = '';
          el.style.left = '';
          el.style.top = '';
          el.style.zIndex = '';
        };

        window.scrollTo(0, 0);

        // Page 1: Form
        if (formRef.current) {
          forceVisible(formRef.current);
          await new Promise(r => setTimeout(r, 1200));
          const canvas = await html2canvas(formRef.current, { 
            scale: 3,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            windowWidth: 1200,
            onclone: (clonedDoc) => {
              // Fix oklch colors which html2canvas cannot parse
              const allElements = clonedDoc.getElementsByTagName('*');
              for (let i = 0; i < allElements.length; i++) {
                const el = allElements[i] as HTMLElement;
                const style = window.getComputedStyle(el);
                
                // Check common color properties
                ['color', 'backgroundColor', 'borderColor', 'borderTopColor', 'borderBottomColor', 'borderLeftColor', 'borderRightColor'].forEach(prop => {
                  const val = (el.style as any)[prop] || style.getPropertyValue(prop);
                  if (val && val.includes('oklch')) {
                    // Force a fallback color or try to strip oklch (simple fallback to black/white or similar)
                    // Since we can't easily convert oklch to rgb in JS without a library, 
                    // we'll just force them to their hex equivalents if we can identify them, 
                    // or just remove the oklch property to let it fallback.
                    el.style.setProperty(prop, '#000000', 'important'); 
                  }
                });
              }

              const inputs = clonedDoc.querySelectorAll('input, textarea');
              inputs.forEach(input => {
                const div = clonedDoc.createElement('div');
                div.innerText = (input as HTMLInputElement | HTMLTextAreaElement).value;
                div.className = input.className;
                // Ensure text is visible in the div
                div.style.display = 'flex';
                div.style.alignItems = 'center';
                div.style.padding = '4px';
                div.style.fontSize = '10px';
                div.style.fontWeight = 'bold';
                div.style.color = 'black';
                div.style.backgroundColor = 'white';
                div.style.border = '1px solid black';
                div.style.width = '100%';
                div.style.height = '100%';
                div.style.minHeight = '24px';
                if (input.parentNode) {
                  input.parentNode.replaceChild(div, input);
                }
              });
            }
          });
          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          
          // %20 yaklaştırma (Önceki 0.9'dan 1.0'a veya 1.1'e çıkarıyoruz, kullanıcı "yaklaştır" dediği için daha büyük istiyor)
          const scaleFactor = 1.0; 
          const imgWidth = pdfWidth * scaleFactor;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          const xOffset = (pdfWidth - imgWidth) / 2;
          const yOffset = 0; // Üstten boşluğu da azalttık "yaklaştırmak" için
          
          pdf.addImage(imgData, 'JPEG', xOffset, yOffset, imgWidth, imgHeight, undefined, 'FAST');
          restoreVisibility(formRef.current);
        }

        // Page 2: Matrix Preview
        if (previewRef.current) {
          pdf.addPage();
          forceVisible(previewRef.current);
          await new Promise(r => setTimeout(r, 1200));
          const canvas = await html2canvas(previewRef.current, { 
            scale: 3,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            windowWidth: 1200,
            onclone: (clonedDoc) => {
              // Fix oklch colors
              const allElements = clonedDoc.getElementsByTagName('*');
              for (let i = 0; i < allElements.length; i++) {
                const el = allElements[i] as HTMLElement;
                const style = window.getComputedStyle(el);
                ['color', 'backgroundColor', 'borderColor', 'borderTopColor', 'borderBottomColor', 'borderLeftColor', 'borderRightColor'].forEach(prop => {
                  const val = (el.style as any)[prop] || style.getPropertyValue(prop);
                  if (val && val.includes('oklch')) {
                    el.style.setProperty(prop, '#000000', 'important'); 
                  }
                });
              }

              const inputs = clonedDoc.querySelectorAll('input, textarea');
              inputs.forEach(input => {
                const div = clonedDoc.createElement('div');
                div.innerText = (input as HTMLInputElement | HTMLTextAreaElement).value;
                div.className = input.className;
                div.style.display = 'flex';
                div.style.alignItems = 'center';
                div.style.padding = '4px';
                div.style.fontSize = '10px';
                div.style.fontWeight = 'bold';
                div.style.color = 'black';
                div.style.backgroundColor = 'white';
                div.style.border = '1px solid black';
                div.style.width = '100%';
                div.style.height = '100%';
                div.style.minHeight = '24px';
                if (input.parentNode) {
                  input.parentNode.replaceChild(div, input);
                }
              });
            }
          });
          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
          restoreVisibility(previewRef.current);
        }

        pdf.save(`OGM_Surec_Bilgileri_${data.surecNo || 'Formu'}.pdf`);
      } catch (error) {
        console.error('PDF Export Error:', error);
        alert('PDF oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.');
      } finally {
        setIsExporting(false);
      }
    };

  const headerTextClass = "text-[#1d4e89] font-bold text-center uppercase";

  return (
    <div className="min-h-screen bg-gray-200 p-4 md:p-8 flex flex-col items-center font-sans text-black">
      
      {/* TOOLBAR */}
      <div className="w-full max-w-[800px] mb-6 flex flex-wrap gap-4 justify-between items-center bg-white p-4 rounded-xl shadow-md border border-gray-300">
        <div className="flex gap-2">
          <button 
            onClick={() => setView('form')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${view === 'form' ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            <FileText size={18} /> Form Hazırla
          </button>
          <button 
            onClick={() => setView('matrix')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${view === 'matrix' ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            <TableIcon size={18} /> Matris Hazırla
          </button>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={generateWithAi}
            disabled={isAiGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-bold text-sm hover:bg-purple-700 shadow-md transition-all disabled:opacity-50"
          >
            <Sparkles size={18} className={isAiGenerating ? "animate-spin" : ""} />
            {isAiGenerating ? 'Tasarlanıyor...' : 'AI ile Tasarla'}
          </button>
          <button 
            onClick={exportToPDF}
            disabled={isExporting}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm shadow-md transition-all",
              isExporting 
                ? "bg-gray-400 cursor-not-allowed text-white" 
                : "bg-blue-600 text-white hover:bg-blue-700"
            )}
          >
            {isExporting ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Hazırlanıyor...
              </>
            ) : (
              <>
                <FileDown size={18} /> PDF Dök
              </>
            )}
          </button>
          <button 
            onClick={() => {
              alert('Veriler kaydedildi (Simülasyon)');
              exportToPDF();
            }}
            disabled={isExporting}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm shadow-md transition-all",
              isExporting 
                ? "bg-gray-400 cursor-not-allowed text-white" 
                : "bg-emerald-600 text-white hover:bg-emerald-700"
            )}
          >
            <Save size={18} /> {isExporting ? 'İşleniyor...' : 'Kaydet ve PDF Al'}
          </button>
        </div>
      </div>

      {/* FORM VIEW */}
      <div className={cn("w-full flex flex-col items-center", view !== 'form' && "hidden")}>
        <div ref={formRef} className="w-full max-w-[800px] bg-white border-2 border-black shadow-2xl overflow-hidden">
          {/* HEADER */}
          <div className="grid grid-cols-[140px_1fr_140px] bg-[#dce6f1] border-b border-black items-center p-4">
            <div className="flex justify-center">
              <div className="w-24 h-24 rounded-full border border-black bg-white flex items-center justify-center overflow-hidden shadow-sm">
                <img 
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Tar%C4%B1m_ve_Orman_Bakanl%C4%B1%C4%9F%C4%B1_logo.svg/500px-Tar%C4%B1m_ve_Orman_Bakanl%C4%B1%C4%9F%C4%B1_logo.svg.png?20200705213721" 
                  alt="TC Logo" 
                  className="w-20 h-20 object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
            <div className="flex flex-col items-center justify-center space-y-1">
              <h3 className={`${headerTextClass} text-[15px] tracking-tight`}>T.C. TARIM VE ORMAN BAKANLIĞI</h3>
              <h2 className={`${headerTextClass} text-[19px] tracking-tighter`}>ORMAN GENEL MÜDÜRLÜĞÜ</h2>
              <h1 className={`${headerTextClass} text-[15px] underline`}>SÜREÇ BİLGİLERİ FORMU</h1>
            </div>
            <div className="flex justify-center">
              <img 
                src="https://upload.wikimedia.org/wikipedia/tr/d/d4/Orman_Genel_M%C3%BCd%C3%BCrl%C3%BC%C4%9F%C3%BC_logo.png" 
                alt="OGM Logo" 
                className="w-24 h-24 object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          {/* METADATA ROWS */}
          <div className="grid grid-cols-[180px_1fr_180px_1fr]">
            <div className="bg-[#b8cce4] border border-black p-1 text-[11px] font-bold flex items-center justify-center text-center uppercase">Yayın Tarihi :</div>
            <EditableCell value={data.yayinTarihi} onChange={(v) => updateField('yayinTarihi', v)} isExporting={isExporting} />
            <div className="bg-[#b8cce4] border border-black p-1 text-[11px] font-bold flex items-center justify-center text-center uppercase">Süreç No:</div>
            <EditableCell value={data.surecNo} onChange={(v) => updateField('surecNo', v)} isExporting={isExporting} />
          </div>
          <div className="grid grid-cols-[180px_1fr_180px_1fr]">
            <div className="bg-[#b8cce4] border border-black p-1 text-[11px] font-bold flex items-center justify-center text-center uppercase">Revizyon Tarihi:</div>
            <EditableCell value={data.revizyonTarihi} onChange={(v) => updateField('revizyonTarihi', v)} isExporting={isExporting} />
            <div className="bg-[#b8cce4] border border-black p-1 text-[11px] font-bold flex items-center justify-center text-center uppercase">Revizyon No:</div>
            <EditableCell value={data.revizyonNo} onChange={(v) => updateField('revizyonNo', v)} isExporting={isExporting} />
          </div>

          {/* SÜREÇ SORUMLUSU */}
          <div className="grid grid-cols-[180px_1fr]">
            <div className="bg-[#b8cce4] border border-black p-1 text-[11px] font-bold flex items-center justify-center text-center uppercase">SÜREÇ SORUMLUSU</div>
            <div className="grid grid-rows-2">
              <div className="grid grid-cols-[120px_1fr]">
                <div className="bg-[#b8cce4] border border-black p-1 text-[11px] font-bold flex items-center justify-center text-center uppercase">ÜST BİRİM:</div>
                <EditableCell value={data.ustBirim} onChange={(v) => updateField('ustBirim', v)} isExporting={isExporting} />
              </div>
              <div className="grid grid-cols-[120px_1fr]">
                <div className="bg-[#b8cce4] border border-black p-1 text-[11px] font-bold flex items-center justify-center text-center uppercase">ALT BİRİM:</div>
                <EditableCell value={data.altBirim} onChange={(v) => updateField('altBirim', v)} isExporting={isExporting} />
              </div>
            </div>
          </div>

          {/* MAIN FIELDS */}
          {[
            { label: 'PERSONEL:', field: 'personel' },
            { label: 'SÜREÇ ADI:', field: 'surecAdi' },
            { label: 'SÜRECİN GAYESİ:', field: 'surecGayesi' },
            { label: 'SÜREÇ GİRDİSİ:', field: 'surecGirdisi' },
            { label: 'SÜREÇ TEDARİKÇİSİ:', field: 'surecTedarikcisi' },
            { label: 'SÜREÇ ÇIKTISI:', field: 'surecCiktisi' },
            { label: 'SÜREÇ MÜŞTERİSİ:', field: 'surecMusterisi' },
            { label: 'SÜRECİN DAYANAĞI:', field: 'surecDayanagi' },
            { label: 'SÜRECİN PERİYODU:', field: 'surecPeriyodu' },
            { label: 'İLİŞKİLİ SÜREÇLER:', field: 'iliskiliSurecler' },
          ].map((item) => (
            <div key={item.field} className="grid grid-cols-[180px_1fr]">
              <div className="bg-[#b8cce4] border border-black p-1 text-[11px] font-bold flex items-center justify-center text-center uppercase">{item.label}</div>
              <EditableCell value={(data as any)[item.field]} onChange={(v) => updateField(item.field as any, v)} isExporting={isExporting} />
            </div>
          ))}

          <div className="grid grid-cols-[180px_1fr]">
            <div className="bg-[#b8cce4] border border-black p-1 text-[11px] font-bold flex items-center justify-center text-center uppercase min-h-[80px]">BAŞVURUDA İSTENEN EVRAKLAR</div>
            <EditableCell value={data.basvurudaIstenenEvraklar} onChange={(v) => updateField('basvurudaIstenenEvraklar', v)} multiline isExporting={isExporting} />
          </div>

          {/* PERFORMANCE TABLE */}
          <div className="grid grid-cols-[1fr_1.5fr_100px_100px]">
            <div className="bg-[#b8cce4] border border-black p-1 text-[10px] font-bold flex items-center justify-center text-center uppercase">PERFORMANS GÖSTERGESİ</div>
            <div className="bg-[#b8cce4] border border-black p-1 text-[10px] font-bold flex items-center justify-center text-center uppercase">ÖLÇÜM YÖNTEMİ</div>
            <div className="bg-[#b8cce4] border border-black p-1 text-[10px] font-bold flex items-center justify-center text-center uppercase">DEĞER ÖLÇÜTÜ (Azami/Asgari)</div>
            <div className="bg-[#b8cce4] border border-black p-1 text-[10px] font-bold flex items-center justify-center text-center uppercase">PERFORMANS DEĞERİ</div>
          </div>
          {data.performansTablos.map((row, i) => (
            <div key={i} className="grid grid-cols-[1fr_1.5fr_100px_100px]">
              <EditableCell value={row.gosterge} onChange={(v) => updatePerformance(i, 'gosterge', v)} isExporting={isExporting} />
              <EditableCell value={row.yontem} onChange={(v) => updatePerformance(i, 'yontem', v)} isExporting={isExporting} />
              <EditableCell value={row.olcut} onChange={(v) => updatePerformance(i, 'olcut', v)} isExporting={isExporting} />
              <EditableCell value={row.deger} onChange={(v) => updatePerformance(i, 'deger', v)} isExporting={isExporting} />
            </div>
          ))}

          {/* FOOTER */}
          <div className="grid grid-cols-[140px_1fr_1fr_1fr] bg-[#dce6f1] border border-black items-center p-0">
            <div className="flex justify-center border-r border-black h-full items-center p-4">
               <img 
                src="https://upload.wikimedia.org/wikipedia/tr/d/d4/Orman_Genel_M%C3%BCd%C3%BCrl%C3%BC%C4%9F%C3%BC_logo.png" 
                alt="OGM Logo Footer" 
                className="w-24 h-24 object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex flex-col items-center text-center h-full justify-start border-r border-black">
              <div className="w-full bg-[#b8cce4] border-b border-black p-1 text-[12px] font-bold text-[#1d4e89] uppercase">Hazırlayan</div>
              <div className="w-full flex-grow">
                <EditableCell 
                  value={data.hazirlayan} 
                  onChange={(v) => updateField('hazirlayan', v)} 
                  className="text-center font-bold text-[10px] w-full h-full min-h-[60px] overflow-hidden focus:bg-[#dce6f1]" 
                  multiline={true}
                  bgClass="bg-[#dce6f1]"
                  isExporting={isExporting}
                />
              </div>
            </div>
            <div className="flex flex-col items-center text-center h-full justify-start border-r border-black">
              <div className="w-full bg-[#b8cce4] border-b border-black p-1 text-[12px] font-bold text-[#1d4e89] uppercase">Kontrol Eden</div>
              <div className="w-full flex-grow">
                <EditableCell 
                  value={data.kontrolEden} 
                  onChange={(v) => updateField('kontrolEden', v)} 
                  className="text-center font-bold text-[10px] w-full h-full min-h-[60px] overflow-hidden focus:bg-[#dce6f1]" 
                  multiline={true}
                  bgClass="bg-[#dce6f1]"
                  isExporting={isExporting}
                />
              </div>
            </div>
            <div className="flex flex-col items-center text-center h-full justify-start">
              <div className="w-full bg-[#b8cce4] border-b border-black p-1 text-[12px] font-bold text-[#1d4e89] uppercase">Onaylayan</div>
              <div className="w-full flex-grow">
                <EditableCell 
                  value={data.onaylayan} 
                  onChange={(v) => updateField('onaylayan', v)} 
                  className="text-center font-bold text-[10px] w-full h-full min-h-[60px] overflow-hidden focus:bg-[#dce6f1]" 
                  multiline={true}
                  bgClass="bg-[#dce6f1]"
                  isExporting={isExporting}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MATRIX VIEW */}
      <div className={cn("w-full flex flex-col items-center", view !== 'matrix' && "hidden")}>
        <div className="w-full max-w-[900px] flex flex-col gap-8">
          {/* EDITOR SECTION */}
          <div ref={matrixRef} className="w-full bg-white border-2 border-black shadow-2xl p-0">
            <div className="bg-gray-800 text-white p-3 text-center font-bold text-sm uppercase">Süreç Adımları Editörü</div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-[60px_1fr_120px_80px] bg-[#b8cce4] border border-black p-2 font-bold text-xs text-center uppercase">
                <div>No</div>
                <div>Süreç Adımı / Faaliyet</div>
                <div>Şekil Tipi</div>
                <div>İşlem</div>
              </div>
              
              {data.steps.map((step, index) => (
                <React.Fragment key={step.id}>
                  <div className="grid grid-cols-[60px_1fr_120px_80px] border border-black items-center group bg-white">
                    <div className="p-2 text-center font-bold border-r border-black h-full flex items-center justify-center">{index + 1}</div>
                    <div className="p-2 border-r border-black h-full flex flex-col gap-1">
                      <textarea 
                        value={step.text} 
                        onChange={(e) => updateStep(index, 'text', e.target.value)}
                        className="w-full text-xs font-medium resize-none outline-none focus:bg-yellow-50 flex-1"
                        rows={2}
                      />
                      <div className="flex gap-1 mt-1">
                        {(['left', 'center', 'right'] as const).map((pos) => (
                          <button
                            key={pos}
                            type="button"
                            onClick={() => updateStep(index, 'position', pos)}
                            className={cn(
                              "flex-1 py-0.5 text-[8px] font-bold rounded border transition-all",
                              (step.position || 'center') === pos 
                                ? "bg-blue-600 text-white border-blue-600" 
                                : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                            )}
                          >
                            {pos === 'left' ? 'Sol' : pos === 'center' ? 'Orta' : 'Sağ'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="p-2 border-r border-black flex justify-center h-full items-center">
                      <select 
                        value={step.type} 
                        onChange={(e) => updateStep(index, 'type', e.target.value)}
                        className="text-[10px] font-bold uppercase p-1 border border-gray-300 rounded w-full"
                      >
                        <option value="start">Başla / Dur (Oval)</option>
                        <option value="process">İşlem (Dikdörtgen)</option>
                        <option value="decision">Karar (Elmas)</option>
                        <option value="input">Veri Girişi (Paralelkenar)</option>
                        <option value="loop">Döngü (Altıgen)</option>
                        <option value="document">Veri Yazma (Doküman)</option>
                        <option value="subroutine">Alt Program (Çift Çizgi)</option>
                        <option value="end">Bitiş (Oval)</option>
                      </select>
                    </div>
                    <div className="p-2 flex justify-center gap-2 h-full items-center">
                      <button 
                        onClick={() => {
                          const newSteps = data.steps.filter(s => s.id !== step.id);
                          setData(prev => ({ ...prev, steps: newSteps }));
                        }}
                        className="text-red-500 hover:text-red-700 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  {step.type === 'decision' && (
                    <div className="grid grid-cols-[60px_1fr] border-x border-b border-black bg-[#fdf2f2]">
                      <div className="border-r border-black p-2 flex items-center justify-center bg-[#fee2e2]">
                        <div className="rotate-45 w-3 h-3 border-2 border-red-400 bg-white"></div>
                      </div>
                      <div className="p-3 grid grid-cols-3 gap-4">
                        {/* Evet Branch */}
                        <div className="flex flex-col gap-2 p-3 border-2 border-green-200 bg-white rounded-lg shadow-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <span className="text-[10px] font-black text-green-700 uppercase">EVET (OLUMLU)</span>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] text-gray-500 font-bold">Şart Metni:</label>
                            <input 
                              type="text" 
                              value={step.yesLabel || "Evet"} 
                              onChange={(e) => updateStep(index, 'yesLabel', e.target.value)}
                              className="w-full text-[10px] p-1.5 border border-green-200 rounded outline-none focus:ring-1 focus:ring-green-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] text-gray-500 font-bold">Gideceği Adım:</label>
                            <div className="flex gap-1">
                              <select 
                                value={step.yesTargetId || ""} 
                                onChange={(e) => updateStep(index, 'yesTargetId', Number(e.target.value))}
                                className="flex-1 text-[10px] p-1.5 border border-green-200 rounded bg-green-50 font-bold"
                              >
                                <option value="">Sonraki Adım</option>
                                {data.steps.map((s, i) => (
                                  <option key={s.id} value={s.id}>{i + 1}. Adım</option>
                                ))}
                              </select>
                              <button 
                                onClick={() => setSelectingTarget({ stepIndex: index, branch: 'yes' })}
                                className={cn(
                                  "p-1.5 rounded border transition-all",
                                  selectingTarget?.stepIndex === index && selectingTarget?.branch === 'yes' 
                                    ? "bg-green-600 text-white border-green-700" 
                                    : "bg-white text-green-600 border-green-200 hover:bg-green-50"
                                )}
                                title="Ön izlemeden seç"
                              >
                                <ArrowDown size={14} />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Hayır Branch */}
                        <div className="flex flex-col gap-2 p-3 border-2 border-red-200 bg-white rounded-lg shadow-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500"></div>
                            <span className="text-[10px] font-black text-red-700 uppercase">HAYIR (OLUMSUZ)</span>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] text-gray-500 font-bold">Şart Metni:</label>
                            <input 
                              type="text" 
                              value={step.noLabel || "Hayır"} 
                              onChange={(e) => updateStep(index, 'noLabel', e.target.value)}
                              className="w-full text-[10px] p-1.5 border border-red-200 rounded outline-none focus:ring-1 focus:ring-red-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] text-gray-500 font-bold">Gideceği Adım:</label>
                            <div className="flex gap-1">
                              <select 
                                value={step.noTargetId || ""} 
                                onChange={(e) => updateStep(index, 'noTargetId', Number(e.target.value))}
                                className="flex-1 text-[10px] p-1.5 border border-red-200 rounded bg-red-50 font-bold"
                              >
                                <option value="">Sonraki Adım</option>
                                {data.steps.map((s, i) => (
                                  <option key={s.id} value={s.id}>{i + 1}. Adım</option>
                                ))}
                              </select>
                              <button 
                                onClick={() => setSelectingTarget({ stepIndex: index, branch: 'no' })}
                                className={cn(
                                  "p-1.5 rounded border transition-all",
                                  selectingTarget?.stepIndex === index && selectingTarget?.branch === 'no' 
                                    ? "bg-red-600 text-white border-red-700" 
                                    : "bg-white text-red-600 border-red-200 hover:bg-red-50"
                                )}
                                title="Ön izlemeden seç"
                              >
                                <ArrowDown size={14} />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Bilgi Branch */}
                        <div className="flex flex-col gap-2 p-3 border-2 border-blue-200 bg-white rounded-lg shadow-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            <span className="text-[10px] font-black text-blue-700 uppercase">YETERSİZ VERİ</span>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] text-gray-500 font-bold">Şart Metni:</label>
                            <input 
                              type="text" 
                              value={step.infoLabel || "Yeterli veri yok"} 
                              onChange={(e) => updateStep(index, 'infoLabel', e.target.value)}
                              className="w-full text-[10px] p-1.5 border border-blue-200 rounded outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] text-gray-500 font-bold">Gideceği Adım:</label>
                            <div className="flex gap-1">
                              <select 
                                value={step.infoTargetId || ""} 
                                onChange={(e) => updateStep(index, 'infoTargetId', Number(e.target.value))}
                                className="flex-1 text-[10px] p-1.5 border border-blue-200 rounded bg-blue-50 font-bold"
                              >
                                <option value="">Sonraki Adım</option>
                                {data.steps.map((s, i) => (
                                  <option key={s.id} value={s.id}>{i + 1}. Adım</option>
                                ))}
                              </select>
                              <button 
                                onClick={() => setSelectingTarget({ stepIndex: index, branch: 'info' })}
                                className={cn(
                                  "p-1.5 rounded border transition-all",
                                  selectingTarget?.stepIndex === index && selectingTarget?.branch === 'info' 
                                    ? "bg-blue-600 text-white border-blue-700" 
                                    : "bg-white text-blue-600 border-blue-200 hover:bg-blue-50"
                                )}
                                title="Ön izlemeden seç"
                              >
                                <ArrowDown size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              ))}

              <button 
                onClick={() => {
                  const newId = Math.max(...data.steps.map(s => s.id), 0) + 1;
                  setData(prev => ({ 
                    ...prev, 
                    steps: [...prev.steps, { id: newId, text: "Yeni süreç adımı...", type: 'process' }] 
                  }));
                }}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-400 hover:text-blue-600 hover:border-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 font-bold"
              >
                <Plus size={20} /> Yeni Adım Ekle
              </button>
            </div>
          </div>

          {/* PREVIEW SECTION (MATCHING IMAGE PAGE 2) */}
          <div ref={previewRef} className="w-full bg-white border-2 border-black shadow-2xl p-0 flex flex-col items-center min-h-[1100px]">
            {/* MATRIX HEADER (MATCHING IMAGE) */}
            <div className="w-full border-b border-black">
              <div className="bg-[#b8cce4] p-5 border-b border-black text-center min-h-[70px] flex items-center justify-center">
                <h2 className="text-[15px] font-bold text-black leading-tight tracking-tight uppercase">{data.surecAdi.toLocaleUpperCase('tr-TR')}</h2>
              </div>
              <div className="bg-[#dce6f1] p-4 text-center min-h-[50px] flex items-center justify-center">
                <h3 className="text-[14px] font-bold text-black leading-tight tracking-tight uppercase">{data.altBirim.toLocaleUpperCase('tr-TR')}</h3>
              </div>
            </div>

            <div className="p-12 w-full flex flex-col items-center">
              {selectingTarget && (
                <div className="mb-6 p-4 bg-yellow-100 border-2 border-yellow-400 rounded-xl text-yellow-800 font-bold text-sm animate-bounce flex items-center gap-3">
                  <ArrowDown size={20} />
                  Lütfen {selectingTarget.branch === 'yes' ? 'EVET' : selectingTarget.branch === 'no' ? 'HAYIR' : 'YETERSİZ VERİ'} şartı için hedef adımı aşağıdan seçin...
                  <button onClick={() => setSelectingTarget(null)} className="ml-4 bg-yellow-400 text-white px-3 py-1 rounded-lg hover:bg-yellow-500 transition-colors">İptal</button>
                </div>
              )}
              <div className="flex flex-col items-center gap-0 w-full max-w-[1000px]">
                {data.steps.map((step, i) => (
                  <React.Fragment key={step.id}>
                    <div className="grid grid-cols-3 w-full gap-4 items-center min-h-[160px]">
                      {/* Left Column */}
                      <div className="flex justify-end pr-4">
                        {step.position === 'left' && (
                          <StepBox 
                            step={step} 
                            selectingTarget={selectingTarget} 
                            onSelect={() => {
                              if (selectingTarget) {
                                const field = selectingTarget.branch === 'yes' ? 'yesTargetId' : selectingTarget.branch === 'no' ? 'noTargetId' : 'infoTargetId';
                                updateStep(selectingTarget.stepIndex, field, step.id);
                                setSelectingTarget(null);
                              }
                            }}
                          />
                        )}
                      </div>

                      {/* Center Column */}
                      <div className="flex justify-center relative">
                        {(step.position === 'center' || !step.position) && (
                          <StepBox 
                            step={step} 
                            selectingTarget={selectingTarget} 
                            onSelect={() => {
                              if (selectingTarget) {
                                const field = selectingTarget.branch === 'yes' ? 'yesTargetId' : selectingTarget.branch === 'no' ? 'noTargetId' : 'infoTargetId';
                                updateStep(selectingTarget.stepIndex, field, step.id);
                                setSelectingTarget(null);
                              }
                            }}
                          />
                        )}
                        
                        {/* Vertical Connector Line (Only for center steps) */}
                        {i < data.steps.length - 1 && (step.position === 'center' || !step.position) && (
                          <div className="absolute top-full h-16 w-[2px] bg-[#1d4e89] flex flex-col items-center">
                            <div className="absolute bottom-[-1px] w-0 h-0 border-l-[8px] border-r-[8px] border-t-[14px] border-l-transparent border-r-transparent border-t-[#1d4e89]"></div>
                          </div>
                        )}
                      </div>

                      {/* Right Column */}
                      <div className="flex justify-start pl-4">
                        {step.position === 'right' && (
                          <StepBox 
                            step={step} 
                            selectingTarget={selectingTarget} 
                            onSelect={() => {
                              if (selectingTarget) {
                                const field = selectingTarget.branch === 'yes' ? 'yesTargetId' : selectingTarget.branch === 'no' ? 'noTargetId' : 'infoTargetId';
                                updateStep(selectingTarget.stepIndex, field, step.id);
                                setSelectingTarget(null);
                              }
                            }}
                          />
                        )}
                      </div>
                    </div>

                    {/* RENDER SIDE CONNECTORS */}
                    <div className="relative w-full flex justify-center">
                      {data.steps.slice(0, i + 1).map((s, idx) => {
                        const targets = [
                          { id: s.yesTargetId, color: 'emerald', label: s.yesLabel || 'Evet' },
                          { id: s.noTargetId, color: 'red', label: s.noLabel || 'Hayır' },
                          { id: s.infoTargetId, color: 'blue', label: s.infoLabel || 'Bilgi' }
                        ].filter(t => t.id);

                        return targets.map(target => {
                          const targetIdx = data.steps.findIndex(step => step.id === target.id);
                          if (targetIdx === -1) return null;

                          // Only draw if it's NOT the immediate next step in center
                          const isSequential = targetIdx === idx + 1 && (s.position === 'center' || !s.position) && (data.steps[targetIdx].position === 'center' || !data.steps[targetIdx].position);
                          if (isSequential && idx === i) return null;

                          if (idx === i) {
                            const isUp = targetIdx < idx;
                            const side = target.label === 'Hayır' || target.label === 'No' || target.label === 'Red' ? 'left' : 'right';
                            const height = Math.abs(idx - targetIdx) * 160;
                            const offset = side === 'left' ? '-220px' : '220px';

                            return (
                              <div 
                                key={`${s.id}-${target.id}`} 
                                className={cn(
                                  "absolute top-1/2 w-32 border-t-2 border-b-2 pointer-events-none z-40",
                                  side === 'left' ? "right-1/2 border-l-2 rounded-l-3xl" : "left-1/2 border-r-2 rounded-r-3xl",
                                  target.color === 'red' ? "border-red-500" : target.color === 'emerald' ? "border-emerald-500" : "border-blue-500"
                                )}
                                style={{ 
                                  height: `${height}px`,
                                  [side]: offset,
                                  top: isUp ? `-${height - 80}px` : '80px'
                                }}
                              >
                                {/* Arrow Head */}
                                <div 
                                  className={cn(
                                    "absolute border-l-[10px] border-r-[10px] border-t-[16px] border-l-transparent border-r-transparent",
                                    side === 'left' ? "left-[-11px]" : "right-[-11px]",
                                    isUp ? "top-0 rotate-180" : "bottom-0",
                                    target.color === 'red' ? "border-t-red-500" : target.color === 'emerald' ? "border-t-emerald-500" : "border-t-blue-500"
                                  )}
                                />
                                {/* Label */}
                                <div className={cn(
                                  "absolute top-1/2 -translate-y-1/2 px-3 py-1 bg-white text-[11px] font-bold whitespace-nowrap rounded-full border shadow-md",
                                  side === 'left' ? "left-6" : "right-6",
                                  target.color === 'red' ? "text-red-700 border-red-300" : target.color === 'emerald' ? "text-emerald-700 border-emerald-300" : "text-blue-700 border-blue-300"
                                )}>
                                  {target.label}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        });
                      })}
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* INSTRUCTIONS */}
      <div className="mt-8 text-gray-500 text-xs text-center max-w-[600px] leading-relaxed">
        <p>İpucu: Metinlerin üzerine tıklayarak düzenleme yapabilirsiniz. Form ve Matris sayfaları arasında geçiş yaparak tüm süreci yapılandırın. Hazırlayan, Kontrol Eden ve Onaylayan alanları da düzenlenebilir.</p>
      </div>
    </div>
  );
}
