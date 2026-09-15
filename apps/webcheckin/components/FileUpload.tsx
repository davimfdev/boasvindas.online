
import React, { useState } from 'react';
import { Language, TRANSLATIONS } from '../translations';

interface FileUploadProps {
  label: string;
  onFileSelect: (base64: string) => void;
  id: string;
  lang?: Language;
}

const FileUpload: React.FC<FileUploadProps> = ({ label, onFileSelect, id, lang = 'pt' }) => {
  const t = TRANSLATIONS[lang];
  const [preview, setPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileType, setFileType] = useState<'image' | 'pdf' | null>(null);

  const processFile = (file: File) => {
    setIsProcessing(true);
    const reader = new FileReader();
    
    // Se for PDF, não passamos pelo Canvas (compressão), pois destruiria o arquivo
    if (file.type === 'application/pdf') {
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        setPreview(base64);
        setFileType('pdf');
        onFileSelect(base64);
        setIsProcessing(false);
      };
      reader.readAsDataURL(file);
      return;
    }

    // Se for Imagem, mantemos a compressão para economizar dados
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        const maxDimension = 800;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height * maxDimension) / width;
            width = maxDimension;
          } else {
            width = (width * maxDimension) / height;
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.4);
          setPreview(compressedBase64);
          setFileType('image');
          onFileSelect(compressedBase64);
        }
        setIsProcessing(false);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="relative group">
        <input
          type="file"
          id={id}
          accept="image/jpeg,image/png,image/jpg,application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />
        <label
          htmlFor={id}
          className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all
            ${preview ? 'border-emerald-400 bg-emerald-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-blue-400'}
            ${isProcessing ? 'opacity-50 cursor-wait' : ''}`}
        >
          {isProcessing ? (
            <div className="flex flex-col items-center">
              <i className="fas fa-circle-notch fa-spin text-blue-500 text-2xl mb-2"></i>
              <span className="text-slate-500 text-xs font-bold uppercase tracking-tighter">{t.compUploadProcessing}</span>
            </div>
          ) : preview ? (
            <div className="flex flex-col items-center gap-1">
              <i className={`fas ${fileType === 'pdf' ? 'fa-file-pdf text-red-500' : 'fa-check-circle text-emerald-500'} text-2xl`}></i>
              <span className={`${fileType === 'pdf' ? 'text-red-700' : 'text-emerald-700'} font-black text-[10px] uppercase`}>
                {fileType === 'pdf' ? t.compUploadPdfAttached : t.compUploadImageReady}
              </span>
            </div>
          ) : (
            <div className="text-center p-4">
              <i className="fas fa-file-upload text-slate-400 text-3xl mb-2"></i>
              <p className="text-slate-500 text-[10px] font-bold uppercase">{t.compUploadAllowedTypes}</p>
            </div>
          )}
        </label>
      </div>
    </div>
  );
};

export default FileUpload;
