import React, { useRef, useState, useEffect } from 'react';
import { Language, TRANSLATIONS } from '../translations';

interface SelfieCaptureProps {
  onCapture: (base64: string) => void;
  label: string;
  hint?: string;
  lang?: Language;
}

const SelfieCapture: React.FC<SelfieCaptureProps> = ({ onCapture, label, hint, lang = 'pt' }) => {
  const t = TRANSLATIONS[lang];
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  
  // Camera fallback states
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  const [showFallback, setShowFallback] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  useEffect(() => {
    const checkCamera = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
          setHasCamera(false);
          setShowFallback(true);
          return;
        }
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        if (videoDevices.length === 0) {
          setHasCamera(false);
          setShowFallback(true);
        } else {
          setHasCamera(true);
        }
      } catch (err) {
        setHasCamera(false);
        setShowFallback(true);
      }
    };
    checkCamera();
  }, []);

  useEffect(() => {
    if (isCapturing && stream && videoRef.current) {
      const video = videoRef.current;
      video.srcObject = stream;
      video.onplaying = () => setIsCameraReady(true);
      video.play().catch(() => setIsCameraReady(false));
    }
  }, [isCapturing, stream]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 480, height: 480 },
        audio: false
      });
      setStream(mediaStream);
      setIsCapturing(true);
      setShowFallback(false);
    } catch (err) {
      alert(t.compSelfieCameraPermission);
      setShowFallback(true);
    }
  };

  const stopCamera = () => {
    if (stream) stream.getTracks().forEach(track => track.stop());
    setStream(null);
    setIsCapturing(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      canvas.width = 480;
      canvas.height = 480;
      ctx.translate(480, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, 480, 480);
      
      // Qualidade reduzida para 0.4
      const base64 = canvas.toDataURL('image/jpeg', 0.4);
      setCapturedImage(base64);
      onCapture(base64);
      stopCamera();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingFile(true);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Target dimension for compression
        const maxDimension = 640;
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
          const base64 = canvas.toDataURL('image/jpeg', 0.4);
          setCapturedImage(base64);
          onCapture(base64);
        }
        setIsProcessingFile(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRetake = () => {
    setCapturedImage(null);
    if (!showFallback) {
      startCamera();
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      <label className="text-sm font-bold text-slate-700 uppercase tracking-tight">{label}</label>
      {hint && <span className="text-[10px] text-blue-600 font-bold -mt-2 leading-normal italic">{hint}</span>}
      
      {capturedImage ? (
        // Preview de Selfie Capturada (seja por câmera ou fallback upload)
        <div className="flex flex-col items-center gap-3">
          <div className="relative w-full aspect-square max-w-[200px] mx-auto overflow-hidden rounded-3xl border-4 border-emerald-400 bg-slate-900 shadow-lg">
            <img src={capturedImage} className="w-full h-full object-cover" alt="Selfie" />
          </div>
          <button 
            type="button" 
            onClick={handleRetake} 
            className="text-[10px] font-black uppercase bg-slate-800 text-white px-5 py-2.5 rounded-xl shadow-md hover:bg-slate-700 transition-colors cursor-pointer"
          >
            {t.compSelfieRetake}
          </button>
        </div>
      ) : showFallback ? (
        // Interface Alternativa (Fallback) - Computador Sem Câmera Detectada
        <div className="w-full p-5 bg-amber-50/50 border border-amber-200 rounded-3xl space-y-4 animate-in fade-in zoom-in-95">
          <div className="flex gap-3 items-start">
            <div className="p-1.5 bg-amber-100 text-amber-700 rounded-full flex-shrink-0">
              <i className="fas fa-video-slash text-sm"></i>
            </div>
            <p className="text-[11px] font-bold text-amber-900 leading-normal">
              {t.cameraNoCameraAlert}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {/* Opção A: QR Code */}
            <div className="flex flex-col items-center text-center p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
              <span className="text-[10px] font-black text-blue-600 uppercase mb-1 tracking-wide">{t.cameraOptionA}</span>
              <p className="text-[9px] text-slate-400 font-bold mb-3 leading-normal max-w-[180px]">{t.cameraOptionADesc}</p>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-center">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(window.location.href)}`} 
                  alt="QR Code" 
                  className="w-28 h-28 mix-blend-multiply"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>

            {/* Opção B: Upload de Arquivo */}
            <div className="flex flex-col items-center text-center p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs justify-between min-h-[190px]">
              <span className="text-[10px] font-black text-emerald-600 uppercase mb-1 tracking-wide">{t.cameraOptionB}</span>
              <p className="text-[9px] text-slate-400 font-bold mb-4 leading-normal max-w-[180px]">{t.cameraOptionBDesc}</p>
              
              <input 
                type="file" 
                id="selfie_fallback_upload" 
                accept="image/jpeg,image/png,image/jpg" 
                onChange={handleFileChange} 
                className="hidden" 
              />
              <label 
                htmlFor="selfie_fallback_upload" 
                className={`w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[9px] rounded-xl cursor-pointer shadow-sm transition-all flex items-center justify-center gap-1.5 uppercase ${isProcessingFile ? 'opacity-50 cursor-wait' : ''}`}
              >
                {isProcessingFile ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    <span>{t.compUploadProcessing}</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-cloud-upload-alt text-xs"></i>
                    <span>{t.cameraOptionBButton}</span>
                  </>
                )}
              </label>
            </div>
          </div>

          {/* Opção de tentar usar câmera novamente (se disponível) */}
          {hasCamera !== false && (
            <div className="text-center pt-2 border-t border-amber-200/40">
              <button 
                type="button" 
                onClick={startCamera} 
                className="text-[9px] font-black text-slate-600 hover:text-blue-600 transition-colors uppercase tracking-wider underline cursor-pointer"
              >
                <i className="fas fa-sync-alt mr-1"></i> Tentar Câmera Novamente
              </button>
            </div>
          )}
        </div>
      ) : (
        // Interface Normal com Câmera Ativa
        <div className="flex flex-col items-center gap-3">
          <div className="relative w-full aspect-square max-w-[200px] mx-auto overflow-hidden rounded-3xl border-4 border-slate-200 bg-slate-900 flex items-center justify-center shadow-md">
            {isCapturing ? (
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
            ) : (
              <i className="fas fa-user-circle text-slate-700 text-6xl"></i>
            )}
            {isCapturing && !isCameraReady && (
              <div className="absolute inset-0 bg-black/65 flex items-center justify-center text-white text-[10px] font-black uppercase tracking-widest">
                {t.compSelfieLoading}
              </div>
            )}
          </div>
          
          <div className="flex flex-col items-center gap-2 mt-1">
            {!isCapturing ? (
              <div className="flex flex-col items-center gap-2">
                <button 
                  type="button" 
                  onClick={startCamera} 
                  className="text-[10px] font-black uppercase bg-blue-600 text-white px-5 py-2.5 rounded-xl shadow-md hover:bg-blue-700 transition-all cursor-pointer"
                >
                  <i className="fas fa-camera mr-1"></i> {t.compSelfieOpen}
                </button>
                
                {/* Botão de atalho para fallback manual */}
                <button 
                  type="button" 
                  onClick={() => setShowFallback(true)} 
                  className="text-[9px] font-black text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-wider underline cursor-pointer mt-1"
                >
                  Sem câmera? Usar alternativas
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <button 
                  type="button" 
                  onClick={capturePhoto} 
                  disabled={!isCameraReady}
                  className="w-14 h-14 rounded-full border-4 border-white bg-blue-600 shadow-lg active:scale-95 transition-all flex items-center justify-center text-white disabled:opacity-40 cursor-pointer"
                  title="Capturar Foto"
                >
                  <i className="fas fa-camera text-lg"></i>
                </button>
                <button 
                  type="button" 
                  onClick={stopCamera} 
                  className="text-[9px] font-black text-red-500 hover:text-red-700 transition-colors uppercase tracking-wider underline cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default SelfieCapture;
