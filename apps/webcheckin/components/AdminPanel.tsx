import React, { useState, useEffect } from 'react';
import { FullFormData, PROPERTIES } from '../types';
import Logo from './Logo';
import { downloadAuthorizationPDF, syncPropertyWithCatalog } from '../services/externalServices';

const DEFAULT_SUN_SQUARE_SUBMISSION: FullFormData = {
  propertyDetails: {
    id: "9",
    name: "Flat no Sun Square Praça do Sol Setor Oeste",
    address: "Rua 9, 244, Flat 1208A, Sun Square, Setor Oeste, Goiânia-GO, 74110-100",
    ownerName: "LEANDRO CARVALHAL FERREIRA",
    ownerCpf: "",
    ownerStatus: "",
    ownerProfession: "",
    petAllowed: false,
    capacity: 2,
    welcomeLink: "https://photos.app.goo.gl/9mYmYmYmYmYmYmYm9"
  },
  reservation: {
    propertyId: "9",
    startDate: "2026-09-05",
    endDate: "2026-09-07",
    guestCount: 1,
    bookingSource: "Airbnb",
    reasonForVisit: "Turismo / Lazer",
    observations: "",
    hasVehicle: false,
    vehicleBrand: "",
    vehicleModel: "",
    vehicleColor: "",
    vehiclePlate: "",
    totalValue: 0,
    securityDepositValue: 0,
    hasSecurityDeposit: false
  },
  mainGuest: {
    fullName: "ARAM MANUEL WENGER",
    cpf: "111111111",
    rg: "X5538237",
    phone: "+41772904319",
    email: "Aram1993.wenger@gmail.com",
    nationality: "Estrangeiro",
    maritalStatus: "Solteiro",
    profession: "Outros",
    emergencyContactName: "PATRICIA",
    emergencyContactPhone: "+41792541461",
    emergencyContactRelationship: "Pai/Mãe",
    address: "Suíça",
    addressStreet: "",
    addressComplement: "",
    addressDistrict: "",
    addressCityState: "",
    addressZipCode: ""
  },
  companions: [],
  pet: {
    hasPet: false,
    name: "",
    breed: "",
    species: "",
    age: "",
    weight: "",
    size: ""
  },
  lgpdConsent: true
};

interface AdminPanelProps {
  onClose: () => void;
  onResend: (data: FullFormData) => Promise<boolean>;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose, onResend }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('admin_authenticated') === 'true';
  });
  const [email, setEmail] = useState('wellington.rodovalho@gmail.com');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  const [lastSubmission, setLastSubmission] = useState<FullFormData | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [resendMessage, setResendMessage] = useState('');

  // Carregar última submissão do localStorage (com sincronização de endereço)
  useEffect(() => {
    if (isAuthenticated) {
      try {
        const stored = localStorage.getItem('last_successful_submission');
        if (stored) {
          const parsed: FullFormData = JSON.parse(stored);
          syncPropertyWithCatalog(parsed);
          setLastSubmission(parsed);
        } else {
          setLastSubmission(DEFAULT_SUN_SQUARE_SUBMISSION);
        }
      } catch (err) {
        console.error('Erro ao ler do localStorage:', err);
        setLastSubmission(DEFAULT_SUN_SQUARE_SUBMISSION);
      }
    }
  }, [isAuthenticated]);

  // Estados para Recuperação de Senha (Esqueceu a Senha)
  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryStep, setRecoveryStep] = useState<'input_email' | 'options' | 'success'>('input_email');
  const [recoveryError, setRecoveryError] = useState('');
  const [recoverySuccessMsg, setRecoverySuccessMsg] = useState('');
  const [recoveryNewPass, setRecoveryNewPass] = useState('');
  const [recoveryConfirmPass, setRecoveryConfirmPass] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordChangeStatus, setPasswordChangeStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [passwordChangeMessage, setPasswordChangeMessage] = useState('');

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeStatus('idle');
    setPasswordChangeMessage('');

    const cleanNewPass = newPassword.trim();
    const cleanConfirmPass = confirmPassword.trim();

    if (cleanNewPass.length < 6) {
      setPasswordChangeStatus('error');
      setPasswordChangeMessage('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (cleanNewPass !== cleanConfirmPass) {
      setPasswordChangeStatus('error');
      setPasswordChangeMessage('As senhas não coincidem.');
      return;
    }

    try {
      localStorage.setItem('admin_custom_password', cleanNewPass);
      setPasswordChangeStatus('success');
      setPasswordChangeMessage('Sua senha personalizada foi configurada e salva com segurança!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordChangeStatus('error');
      setPasswordChangeMessage('Erro ao salvar no armazenamento local do navegador.');
    }
  };

  const handleResetPassword = () => {
    if (window.confirm('Tem certeza que deseja apagar sua senha personalizada e restaurar a senha mestra padrão?')) {
      localStorage.removeItem('admin_custom_password');
      setPasswordChangeStatus('success');
      setPasswordChangeMessage('A senha personalizada foi removida. Apenas a Senha Mestra padrão está ativa agora.');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    // Senha padrão segura de fábrica
    const defaultMasterPassword = 'Wellington@AlugaGoias2026#';
    
    // Obter senha personalizada se houver no localStorage
    const customPassword = localStorage.getItem('admin_custom_password') || '';

    // Wellington ou administrador podem acessar
    const isUserAllowed = cleanEmail === 'wellington.rodovalho@gmail.com' || cleanEmail === 'admin@alugagoias.com.br' || cleanEmail === 'admin';
    const isPasswordCorrect = cleanPassword === defaultMasterPassword || (customPassword && cleanPassword === customPassword);

    if (isUserAllowed && isPasswordCorrect) {
      sessionStorage.setItem('admin_authenticated', 'true');
      setIsAuthenticated(true);
    } else {
      setLoginError('E-mail ou senha de acesso inválidos.');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_authenticated');
    setIsAuthenticated(false);
    setPassword('');
    setResendStatus('idle');
  };

  const handleResendClick = async () => {
    if (!lastSubmission) return;
    setIsResending(true);
    setResendStatus('idle');
    setResendMessage('');

    try {
      const success = await onResend(lastSubmission);
      if (success) {
        setResendStatus('success');
        setResendMessage(`Enviado com sucesso em ${new Date().toLocaleTimeString('pt-BR')}!`);
      } else {
        setResendStatus('error');
        setResendMessage('Falha ao enviar. Verifique a conexão com o Google Sheets.');
      }
    } catch (err) {
      setResendStatus('error');
      setResendMessage('Erro de conexão durante o reenvio.');
    } finally {
      setIsResending(false);
    }
  };

  if (!isAuthenticated) {
    if (isForgotPasswordMode) {
      return (
        <div className="max-w-md mx-auto my-4 bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden animate-in zoom-in-95">
          <div className="p-6 bg-slate-900 text-white flex flex-col items-center text-center space-y-3">
            <div className="w-14 h-14 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center border border-amber-500/30">
              <i className="fas fa-key text-xl"></i>
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-200">Recuperação de Senha</h2>
              <p className="text-xs text-slate-400 mt-0.5">Painel do Administrador</p>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-5">
            {recoveryError && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-bold uppercase text-center flex items-center justify-center gap-2">
                <i className="fas fa-exclamation-triangle"></i>
                {recoveryError}
              </div>
            )}

            {recoveryStep === 'input_email' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const clean = recoveryEmail.trim().toLowerCase();
                  if (clean === 'wellington.rodovalho@gmail.com' || clean === 'admin@alugagoias.com.br' || clean === 'admin') {
                    setRecoveryError('');
                    setRecoveryStep('options');
                  } else {
                    setRecoveryError('E-mail não reconhecido. Digite o e-mail do administrador.');
                  }
                }}
                className="space-y-4"
              >
                <p className="text-xs font-medium text-slate-600 leading-relaxed">
                  Informe o seu e-mail cadastrado como administrador para redefinir ou recuperar sua senha de acesso.
                </p>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-1">E-mail Cadastrado</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <i className="fas fa-envelope"></i>
                    </div>
                    <input
                      type="text"
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(e.target.value)}
                      placeholder="wellington.rodovalho@gmail.com"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-slate-200 transition-all placeholder:text-slate-300"
                      required
                    />
                  </div>
                </div>

                <div className="pt-2 space-y-2.5">
                  <button
                    type="submit"
                    className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <i className="fas fa-arrow-right"></i>
                    Verificar e Continuar
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPasswordMode(false);
                      setRecoveryError('');
                    }}
                    className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                  >
                    Voltar ao Login
                  </button>
                </div>
              </form>
            )}

            {recoveryStep === 'options' && (
              <div className="space-y-5">
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2">
                  <i className="fas fa-user-check text-emerald-600 text-sm"></i>
                  E-mail validado: <span className="font-black">{recoveryEmail}</span>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-black text-slate-700 uppercase tracking-wide">Escolha uma opção:</p>

                  {/* Opção 1: Restaurar Senha Mestra */}
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.removeItem('admin_custom_password');
                      setRecoverySuccessMsg('A senha personalizada foi removida e a Senha Mestra Padrão de Fábrica foi restaurada com sucesso!');
                      setRecoveryStep('success');
                    }}
                    className="w-full p-4 bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 rounded-2xl text-left transition-all group cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-slate-800 group-hover:text-amber-900 uppercase">1. Restaurar Senha Mestra Padrão</span>
                      <i className="fas fa-undo text-amber-600"></i>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 font-medium">Restaura o acesso utilizando a senha padrão de fábrica: Wellington@AlugaGoias2026#</p>
                  </button>

                  {/* Opção 2: Definir nova senha */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      setRecoveryError('');
                      const cleanNew = recoveryNewPass.trim();
                      const cleanConfirm = recoveryConfirmPass.trim();

                      if (cleanNew.length < 6) {
                        setRecoveryError('A nova senha deve possuir no mínimo 6 caracteres.');
                        return;
                      }
                      if (cleanNew !== cleanConfirm) {
                        setRecoveryError('As duas senhas informadas não coincidem.');
                        return;
                      }

                      localStorage.setItem('admin_custom_password', cleanNew);
                      setRecoverySuccessMsg('Sua nova senha de acesso foi cadastrada e ativada com sucesso!');
                      setRecoveryStep('success');
                    }}
                    className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-slate-800 uppercase">2. Criar Nova Senha Personalizada</span>
                      <i className="fas fa-lock text-slate-600"></i>
                    </div>

                    <div className="space-y-2">
                      <input
                        type="password"
                        value={recoveryNewPass}
                        onChange={(e) => setRecoveryNewPass(e.target.value)}
                        placeholder="Nova Senha (mín. 6 dígitos)"
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-amber-500"
                        required
                      />
                      <input
                        type="password"
                        value={recoveryConfirmPass}
                        onChange={(e) => setRecoveryConfirmPass(e.target.value)}
                        placeholder="Confirmar Nova Senha"
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-amber-500"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-[11px] uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <i className="fas fa-save text-amber-400"></i>
                      Salvar e Ativar Nova Senha
                    </button>
                  </form>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPasswordMode(false);
                    setRecoveryError('');
                  }}
                  className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  Cancelar e Voltar ao Login
                </button>
              </div>
            )}

            {recoveryStep === 'success' && (
              <div className="space-y-5 animate-in fade-in duration-300">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0">
                      <i className="fas fa-check text-sm"></i>
                    </div>
                    <p className="font-black text-xs uppercase tracking-wide">Recuperação Concluída!</p>
                  </div>
                  <p className="text-xs text-emerald-900 font-bold leading-relaxed">{recoverySuccessMsg}</p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPasswordMode(false);
                    setLoginError('');
                    setPassword('');
                  }}
                  className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <i className="fas fa-sign-in-alt text-amber-400"></i>
                  Ir para Tela de Login
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-md mx-auto my-4 bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden animate-in zoom-in-95">
        <div className="p-6 bg-slate-900 text-white flex flex-col items-center text-center space-y-3">
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center border border-white/20 shadow-inner">
            <Logo className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Área do Administrador</h2>
            <p className="text-xs text-slate-300 mt-1">Acesso exclusivo para Wellington Rodovalho</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="p-6 sm:p-8 space-y-5">
          {loginError && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-bold uppercase text-center flex items-center justify-center gap-2">
              <i className="fas fa-exclamation-triangle"></i>
              {loginError}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-1">E-mail de Acesso</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <i className="fas fa-envelope"></i>
              </div>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemplo@gmail.com"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-slate-200 transition-all placeholder:text-slate-300"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Senha</label>
              <button
                type="button"
                onClick={() => {
                  setIsForgotPasswordMode(true);
                  setRecoveryEmail(email || 'wellington.rodovalho@gmail.com');
                  setRecoveryStep('input_email');
                  setRecoveryError('');
                  setRecoverySuccessMsg('');
                }}
                className="text-[10px] font-black text-amber-600 hover:text-amber-700 hover:underline transition-all cursor-pointer"
              >
                Esqueceu a senha?
              </button>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <i className="fas fa-lock"></i>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Sua senha secreta"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-slate-200 transition-all placeholder:text-slate-300"
                required
              />
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-3">
            <button
              type="submit"
              className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <i className="fas fa-sign-in-alt"></i>
              Entrar no Painel
            </button>
            
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider rounded-xl transition-all"
            >
              Voltar ao Check-in
            </button>
          </div>

          <div className="pt-2 text-center">
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
              Acesso protegido por Senha Mestra Segura ou sua Senha Personalizada.
            </p>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Admin Header Info */}
      <div className="bg-slate-900 rounded-3xl p-6 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center border border-white/15">
            <i className="fas fa-user-shield text-xl text-amber-400"></i>
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-300">Painel do Administrador</h2>
            <p className="text-xs text-slate-400 mt-0.5">Conectado como <strong className="text-amber-400">{email}</strong></p>
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button 
            onClick={handleLogout} 
            className="flex-1 md:flex-none px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-[10px] uppercase tracking-wider rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 transition-colors"
          >
            <i className="fas fa-sign-out-alt"></i>
            Sair
          </button>
          <button 
            onClick={onClose} 
            className="flex-1 md:flex-none px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[10px] uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 transition-colors"
          >
            <i className="fas fa-arrow-left"></i>
            Voltar
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {lastSubmission ? (
        <div className="space-y-6">
          <div className="p-6 bg-amber-50/40 border border-amber-100 rounded-3xl space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-amber-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <i className="fas fa-history text-amber-600"></i>
                  Último Check-in Enviado
                </h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">
                  Dados guardados localmente para retransmissão rápida
                </p>
              </div>
              <span className="text-[9px] bg-amber-100 text-amber-800 font-black px-2.5 py-1 rounded-full uppercase">
                Pronto para reenvio
              </span>
            </div>

            {/* Compact summary grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold">
              {/* Titular */}
              <div className="p-4 bg-white border border-slate-100 rounded-2xl space-y-1.5">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Titular da Reserva</span>
                <p className="text-slate-800 uppercase text-sm font-black">{lastSubmission.mainGuest.fullName}</p>
                <div className="text-[10px] text-slate-600 space-y-0.5">
                  <p>CPF: {lastSubmission.mainGuest.cpf}</p>
                  <p>Telefone: {lastSubmission.mainGuest.phone}</p>
                  <p className="lowercase">E-mail: {lastSubmission.mainGuest.email}</p>
                </div>
              </div>

              {/* Reserva */}
              <div className="p-4 bg-white border border-slate-100 rounded-2xl space-y-1.5">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Detalhes da Hospedagem</span>
                <p className="text-slate-800 uppercase text-xs font-black truncate">{lastSubmission.propertyDetails?.name || 'Imóvel sem nome'}</p>
                <div className="text-[10px] text-slate-600 space-y-0.5">
                  <p>Check-in: <span className="text-slate-800 font-black">{lastSubmission.reservation.startDate}</span></p>
                  <p>Check-out: <span className="text-slate-800 font-black">{lastSubmission.reservation.endDate}</span></p>
                  <p>Total de Hóspedes: {lastSubmission.reservation.guestCount}</p>
                </div>
              </div>

              {/* Extras */}
              <div className="p-4 bg-white border border-slate-100 rounded-2xl space-y-2 col-span-1 md:col-span-2">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Veículo, Pets e Acompanhantes</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[10px] text-slate-600">
                  <div>
                    <p className="text-slate-400 font-black uppercase text-[8px] mb-0.5">Veículo</p>
                    <p>{lastSubmission.reservation.hasVehicle 
                      ? `${lastSubmission.reservation.vehicleBrand} ${lastSubmission.reservation.vehicleModel} (${lastSubmission.reservation.vehiclePlate?.toUpperCase()})` 
                      : 'Nenhum veículo registrado'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-black uppercase text-[8px] mb-0.5">Pet</p>
                    <p>{lastSubmission.pet.hasPet 
                      ? `${lastSubmission.pet.name} - ${lastSubmission.pet.breed} (${lastSubmission.pet.species})` 
                      : 'Nenhum pet registrado'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-black uppercase text-[8px] mb-0.5">Acompanhantes</p>
                    <p>{lastSubmission.companions.length > 0 
                      ? `${lastSubmission.companions.length} pessoa(s): ` + lastSubmission.companions.map(c => c.name.split(' ')[0]).join(', ')
                      : 'Nenhum acompanhante'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Box */}
            <div className="pt-4 flex flex-col items-center gap-3 w-full">
              {/* Botões para Baixar e Visualizar PDF da Autorização */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                <button
                  type="button"
                  onClick={() => {
                    if (lastSubmission) {
                      downloadAuthorizationPDF(lastSubmission);
                    }
                  }}
                  className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black uppercase text-xs tracking-wider rounded-2xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  <i className="fas fa-file-pdf text-base"></i>
                  Baixar PDF da Autorização
                </button>

                <a
                  href={`${import.meta.env.BASE_URL}Autorizacao_Sun_Square_1208A.pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-black uppercase text-xs tracking-wider rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer text-center"
                >
                  <i className="fas fa-external-link-alt text-base"></i>
                  Visualizar PDF (Flat 1208A)
                </a>
              </div>

              <button
                onClick={handleResendClick}
                disabled={isResending}
                className={`w-full py-4 rounded-2xl font-black uppercase text-xs tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 ${
                  isResending 
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-100'
                }`}
              >
                {isResending ? (
                  <>
                    <i className="fas fa-spinner fa-spin text-lg"></i>
                    Processando Reenvio...
                  </>
                ) : (
                  <>
                    <i className="fas fa-paper-plane text-lg"></i>
                    Reenviar Formulário para a Planilha & E-mail
                  </>
                )}
              </button>

              {resendStatus === 'success' && (
                <div className="w-full p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl flex items-center gap-3 animate-in fade-in duration-300">
                  <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0">
                    <i className="fas fa-check"></i>
                  </div>
                  <div>
                    <p className="font-black text-xs uppercase">Check-in Reenviado com Sucesso!</p>
                    <p className="text-[10px] text-emerald-600 mt-0.5">{resendMessage}</p>
                  </div>
                </div>
              )}

              {resendStatus === 'error' && (
                <div className="w-full p-4 bg-red-50 border border-red-100 text-red-800 rounded-2xl flex items-center gap-3 animate-in fade-in duration-300">
                  <div className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center flex-shrink-0">
                    <i className="fas fa-exclamation-triangle"></i>
                  </div>
                  <div>
                    <p className="font-black text-xs uppercase">Falha ao Reenviar</p>
                    <p className="text-[10px] text-red-600 mt-0.5">{resendMessage}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="text-center">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Apenas um envio é salvo localmente por dispositivo por razões de privacidade.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-slate-50 border border-dashed border-slate-200 rounded-3xl space-y-3">
          <i className="fas fa-history text-3xl text-slate-300 block"></i>
          <p className="font-black text-xs uppercase text-slate-400">Nenhum envio recente registrado neste navegador</p>
          <p className="text-[10px] text-slate-400 font-bold uppercase max-w-sm mx-auto leading-relaxed">
            Realize pelo menos um check-in completo neste dispositivo para salvar os dados no cache de retransmissão automática.
          </p>
        </div>
      )}

      {/* Password Change Section */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
            <i className="fas fa-key text-amber-500"></i>
            Segurança de Acesso (Nova Senha)
          </h3>
          <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">
            Defina uma senha personalizada de alta segurança para bloquear o painel
          </p>
        </div>

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-1">Nova Senha</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo de 6 caracteres"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-slate-200 transition-all placeholder:text-slate-300"
                required
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-1">Confirmar Nova Senha</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-slate-200 transition-all placeholder:text-slate-300"
                required
              />
            </div>
          </div>

          {passwordChangeStatus === 'success' && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl flex items-center gap-2 text-[11px] font-bold">
              <i className="fas fa-check-circle text-emerald-600"></i>
              <span>{passwordChangeMessage}</span>
            </div>
          )}

          {passwordChangeStatus === 'error' && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-800 rounded-xl flex items-center gap-2 text-[11px] font-bold">
              <i className="fas fa-exclamation-circle text-red-600"></i>
              <span>{passwordChangeMessage}</span>
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              type="submit"
              className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <i className="fas fa-save"></i>
              Salvar Nova Senha
            </button>
            
            {localStorage.getItem('admin_custom_password') && (
              <button
                type="button"
                onClick={handleResetPassword}
                className="py-3 px-4 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <i className="fas fa-trash-alt"></i>
                Restaurar Padrão
              </button>
            )}
          </div>
        </form>
      </div>

      {/* AutoCrat Contract Template Section */}
      <AutoCratContractCard />
    </div>
  );
};

const AutoCratContractCard: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const [showFull, setShowFull] = useState(false);

  const contractText = `CONTRATO DE LOCAÇÃO DE IMÓVEL POR TEMPORADA

<<Proprietário>>, <<Nacionalidade Proprietário>>, <<Estado Civil Proprietário>>, <<Profissão Proprietário>>, <<Residente Proprietário>> em <<Endereço Proprietário>>, <<Portador Proprietário>> do CPF nº <<CPF do Proprietário>>, adiante <<Denominação Proprietário>>;

<<Nome Titular>>, <<Nacionalidade Titular>>, <<Estado Civil Titular>>, <<Profissão Titular>>, <<Portador Titular>> do CPF nº <<CPF Titular>>, <<Residente Titular>> em <<Endereço>>, <<Denominação Titular>>.

As partes acima identificadas acordam com o presente CONTRATO DE LOCAÇÃO RESIDENCIAL PARA TEMPORADA, que se regerá pelas cláusulas seguintes:

OBJETO DO CONTRATO
Cláusula 1 - <<Artigo Proprietário>> <<Termo Proprietário>>, <<Título Proprietário>> do imóvel objeto da locação, mediante a contraprestação fixada abaixo, dá em locação o imóvel residencial <<Ao Termo Titular>>, que está situado à <<Endereço do Imóvel>>. Imóvel: <<Imóvel>>, capacidade máxima para <<Capacidade Máxima>> pessoas. A mobília, bem como o imóvel e seu estado de conservação, são descritos detalhadamente no ANEXO RELATÓRIO DE VISTORIA DE IMÓVEL, especificamente no Item 5 - Mobília e Equipamentos. O referido relatório inclui uma lista completa dos móveis, equipamentos e suas condições atuais. Ambas as partes concordam que o estado de conservação mencionado no relatório é considerado como referência durante o período de locação, e <<Artigo Titular>> <<Termo Titular>> se compromete a preservar e manter a mobília e os equipamentos em bom estado, de acordo com os padrões de uso adequados.

USO DO IMÓVEL
Cláusula 2 - <<Artigo Titular>> <<Termo Titular>> deverá usar o imóvel deste contrato, somente com a finalidade residencial para temporada, ficando proibido <<Ao Termo Titular>>, sublocá-lo de forma diferente do previsto, salvo autorização expressa <<Do Termo Proprietário>>.

Parágrafo Primeiro - O presente Contrato autoriza a acomodação de no máximo <<Hóspedes>> pessoas no imóvel, ainda que tenha espaço para acomodar mais pessoas. No caso de excedentes a esse limite, será cobrado um valor adicional de R$ 50,00 (cinquenta reais) por dia a ser determinado pela quantidade de pessoas excedentes ou pelos dias que essas permanecerem no imóvel.

Parágrafo Segundo - <<Artigo Proprietário>> <<Termo Proprietário>> e <<Artigo Titular>> <<Termo Titular>> concordam que uma vistoria completa do imóvel será realizada antes, no momento da entrada ou posteriormente em momento oportuno <<Do Termo Titular>>. Essa vistoria será documentada em um relatório, que será anexado ao contrato e considerado parte integrante dele. No final do período de locação, uma nova vistoria será feita para verificar as condições do imóvel e identificar possíveis avarias. É importante notar que <<Artigo Proprietário>> <<Termo Proprietário>> e <<Artigo Titular>> <<Termo Titular>> não precisam estar presentes simultaneamente durante as vistorias; cada um pode designar um representante ou realizá-las separadamente. Após cada vistoria, o relatório deve ser assinado pelo presente ou pelo seu representante, para validação.

OBRIGAÇÕES DO LOCATÁRIO / DA LOCATÁRIA
Cláusula 3 - Fica obrigado(a) <<Artigo Titular>> <<Termo Titular>>, em agir de acordo com o estabelecido nas normas do condomínio, responsabilizando-se civil e criminalmente, durante a vigência deste contrato. Caso haja descumprimento do Regimento Interno <<Artigo Titular>> <<Termo Titular>> se responsabiliza pela multa cabível à negligência.

Cláusula 4 - Obriga-se <<Artigo Titular>> <<Termo Titular>> em zelar pela conservação do imóvel, bem como todos os bens que nele contém, sendo responsável em entregá-lo ao término do prazo estipulado neste contrato, nas condições de estado e funcionamento em que recebeu conforme previamente vistoriado. <<Artigo Titular>> <<Termo Titular>> deve comunicar <<Ao Termo Proprietário>> quaisquer ocorrências imprevistas havidas no imóvel e seus utensílios.

Cláusula 5 - <<Artigo Titular>> <<Termo Titular>> deverá devolver o imóvel locado nas mesmas condições em que o recebeu. Qualquer dano ou detalhe na pintura que não tenha sido mencionado na inspeção no check-in será de responsabilidade <<Do Termo Titular>>. Caso seja necessário fazer reparos na pintura durante a estadia, o imóvel deverá ser pintado utilizando tinta da mesma marca e cor especificadas no auto de vistoria. Além disso, todas as instalações elétricas, hidráulicas e acessórios devem estar em perfeitas condições de funcionamento, exceto por deteriorações decorrentes do uso normal e habitual do imóvel.

Cláusula 6 - Não é permitido fumar no interior do imóvel, para isso o condomínio dispõe de uma área razoável no térreo.

Parágrafo Único - Não é permitido <<Ao Termo Titular>> fazer modificações ou reformas nas instalações do imóvel, dessa forma não há que se falar em direito de indenização ou ainda retenção por qualquer benfeitoria realizada.

PRAZO
Cláusula 7 - A locação por temporada não terá prazo superior a 90 (noventa) dias, com início na data de <<Check-in>> até <<Check-out>>, vigorando a partir da assinatura deste contrato por ambas as PARTES, e ao final do prazo cessarão os efeitos deste contrato, independente de notificação judicial ou extrajudicial.

Parágrafo Único - Em observância ao art. 48 da Lei 8.245/91, a presente locação não pode ser superior a 90 (noventa) dias, no caso de manifestação <<Do Termo Titular>> e anuência <<Do Termo Proprietário>>, esse contrato passará a ter vigência por prazo indeterminado.

VALOR DO ALUGUEL
Cláusula 8 - Pagamento do Aluguel:
● Durante o período de locação, <<Artigo Titular>> <<Termo Titular>> pagará <<Ao Termo Proprietário>> o valor total de <<Valor Total>> como aluguel.
● O pagamento será efetuado por transferência PIX para a chave de e-mail: reservas@alugagoias.com.br.

Despesas Incluídas no Aluguel:
● O valor do aluguel cobre as seguintes despesas: Água, Luz, Impostos, Condomínio, Internet, Limpeza inicial do imóvel, Roupas de cama e banho suficientes para o número de pessoas na reserva.

Limites para Despesas de Água, Luz e Gás:
● Os custos mensais de água e luz estão incluídos no aluguel, mas com os seguintes limites:
  ○ Água: até R$ 120,00 (cento e vinte reais)
  ○ Luz: até R$ 120,00 (cento e vinte reais)
● Qualquer gasto que exceda esses limites será de responsabilidade exclusiva <<Do Termo Titular>> e deverá ser pago adicionalmente.

Cláusula 9 - Para serviços de limpeza extra, será cobrada uma taxa de R$ 130,00 (cento e trinta reais) por limpeza. Esse valor inclui a troca de roupas de cama e de banho.

Parágrafo Único - Cláusula de Garantia de Contrato com Caução
Caução Proporcional ao Número de Diárias:
<<Artigo Titular>> <<Termo Titular>> concorda em pagar uma caução no valor de <<Caução>> como garantia de cumprimento das obrigações contratuais e cobertura de eventuais danos à propriedade.

Do Pagamento e da Garantia
1. Valor e Forma de Pagamento da Locação:
O valor total da locação (<<Valor Total>>) e a caução (<<Caução>>) serão pagos conforme o combinado.
Observações de Reserva: <<Observações>>

2. Da Caução (Garantia):
A caução deverá ser quitada integralmente no momento da assinatura do contrato ou, impreterivelmente, até o ato do check-in.
● Meios de pagamento: Transferência bancária via PIX ou Cartão de Crédito.

3. Condições de Uso da Caução:
O valor depositado a título de garantia servirá para cobrir eventuais danos ao imóvel, mobília, equipamentos ou penalidades por violação das regras da casa.
● Transparência: Qualquer retenção (parcial ou total) da caução será obrigatoriamente documentada e comunicada <<Ao Termo Titular>>, acompanhada da descrição detalhada dos danos ou violações constatadas.

Reembolso da Caução:
A caução será reembolsada integralmente <<Ao Termo Titular>> no prazo de até 7 (sete) dias após o término da locação, desde que não sejam identificados danos ou violações das regras do contrato.

Resolução de Disputas:
Em caso de disputa sobre a utilização da caução, as partes se comprometem a resolver a questão amigavelmente.

MULTA
Cláusula 10 - Caso <<Artigo Titular>> <<Termo Titular>> não desocupe o imóvel na data estipulada da Cláusula 7, ou ainda atrase no pagamento do valor devido a título de aluguel, ficará sujeito(a) ao pagamento de multa diária no valor de R$ 300,00 (trezentos reais) enquanto ocupar o imóvel.

Parágrafo Único - Reembolso integral para cancelamentos feitos até 30 dias antes do check-in.

DOS ANIMAIS DE ESTIMAÇÃO
Cláusula 11 - Possui Pet: <<Possui Pet?>> (Dados do Pet: <<Pet: Nome>>, <<Pet: Raça>>).

CONDIÇÕES GERAIS
Cláusula 12 - Nenhuma omissão ou demora no exercício de qualquer direito, faculdade, obrigação ou recurso, oriundo do presente contrato, será considerado como desistência, concordância ou renúncia destes.

Cláusula 13 - Os herdeiros, sucessores ou cessionários das partes contratantes se obrigam desde já ao inteiro teor deste contrato.

Cláusula 14 - Para dirimir quaisquer controvérsias oriundas deste contrato as partes elegem o foro da comarca de Goiânia-GO.

E assim, estando as partes de comum acordo quanto ao contratado, dando-o por justo e acertado, assinam o presente contrato com duas testemunhas, a fim de se produzir todos os efeitos de direito.

Goiânia, <<Data de Envio>>.

___________________________________________
<<Proprietário>>
<<Termo Proprietário>>

___________________________________________
<<Nome Titular>>
<<Termo Titular>>

_________________________________
TESTEMUNHA 1

_________________________________
TESTEMUNHA 2`;

  const handleCopy = () => {
    navigator.clipboard.writeText(contractText);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xl space-y-4">
      <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
            <i className="fas fa-file-contract text-amber-600"></i>
            Modelo de Contrato para AutoCrat (Google Docs)
          </h3>
          <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">
            Cole este texto no Google Docs e configure no AutoCrat para gerar contratos automáticos em PDF
          </p>
        </div>
        <button
          onClick={handleCopy}
          className={`px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
            copied
              ? 'bg-emerald-600 text-white shadow-emerald-100'
              : 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md'
          }`}
        >
          <i className={`fas ${copied ? 'fa-check' : 'fa-copy'}`}></i>
          {copied ? 'Copiado para a Área de Transferência!' : 'Copiar Modelo para Google Docs'}
        </button>
      </div>

      <div className="bg-slate-900 rounded-2xl p-4 text-slate-200 font-mono text-[11px] leading-relaxed max-h-72 overflow-y-auto border border-slate-800 relative">
        <pre className="whitespace-pre-wrap font-sans">
          {showFull ? contractText : contractText.slice(0, 750) + '...'}
        </pre>
        <button
          onClick={() => setShowFull(!showFull)}
          className="mt-3 text-[10px] font-black uppercase text-amber-400 hover:text-amber-300 flex items-center gap-1.5"
        >
          <i className={`fas ${showFull ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
          {showFull ? 'Mostrar Menos' : 'Ver Modelo Completo'}
        </button>
      </div>
    </div>
  );
};
