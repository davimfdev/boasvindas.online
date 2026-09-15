
import React, { useState, useEffect, useRef } from 'react';
import { FormStep, FullFormData, PROPERTIES } from './types';
import { saveToGoogleSheets } from './services/externalServices';
import StepIndicator from './components/StepIndicator';
import FileUpload from './components/FileUpload';
import SelfieCapture from './components/SelfieCapture';
import Logo from './components/Logo';
import { AdminPanel } from './components/AdminPanel';
import { Language, TRANSLATIONS } from './translations';

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('pt');
  const t = TRANSLATIONS[lang];
  const [step, setStep] = useState<FormStep>(FormStep.CONSENT);
  const [loading, setLoading] = useState(false);
  const [isOtherReason, setIsOtherReason] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  
  const [formData, setFormData] = useState<FullFormData>({
    reservation: {
      startDate: '',
      endDate: '',
      guestCount: 1,
      reasonForVisit: 'Férias/Lazer',
      hasVehicle: false,
      vehicleBrand: '',
      vehicleModel: '',
      vehicleColor: '',
      vehiclePlate: '',
      propertyId: '',
      totalValue: 0,
      securityDepositValue: 0,
      hasSecurityDeposit: false,
      bookingSource: '',
      observations: ''
    },
    pet: {
      hasPet: false,
      name: '',
      breed: '',
      species: 'Cão/Gato',
    },
    mainGuest: {
      fullName: '',
      cpf: '',
      rg: '',
      nationality: 'Brasileira',
      email: '',
      phone: '',
      address: '',
      addressStreet: '',
      addressComplement: '',
      addressDistrict: '',
      addressCityState: '',
      addressZipCode: '',
      maritalStatus: '',
      profession: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      emergencyContactRelationship: ''
    },
    companions: [],
    lgpdConsent: false
  });

  const selectedProperty = PROPERTIES.find(p => p.id === formData.reservation.propertyId) || PROPERTIES[0];
  const isPetAllowedProperty = selectedProperty.petAllowed;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const nextStep = () => {
    if (step === FormStep.MAIN_GUEST && !isPetAllowedProperty) {
      setStep(FormStep.COMPANIONS);
    } else {
      setStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (step === FormStep.COMPANIONS && !isPetAllowedProperty) {
      setStep(FormStep.MAIN_GUEST);
    } else {
      setStep(prev => prev - 1);
    }
  };

  const handleReservationChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => {
      const nextReservation = {
        ...prev.reservation,
        [name]: (name === 'guestCount' || name === 'totalValue' || name === 'securityDepositValue') 
          ? (value === '' ? 0 : parseFloat(value)) 
          : val
      };
      
      let nextPet = prev.pet;
      if (name === 'propertyId') {
        const targetProp = PROPERTIES.find(p => p.id === value);
        const isPetAllowed = targetProp ? targetProp.petAllowed : false;
        if (!isPetAllowed) {
          nextPet = { ...prev.pet, hasPet: false };
        }
        if (targetProp && prev.reservation.guestCount > targetProp.capacity) {
          nextReservation.guestCount = targetProp.capacity;
        }
      }

      return {
        ...prev,
        reservation: nextReservation,
        pet: nextPet
      };
    });
  };

  const [searchingCep, setSearchingCep] = useState(false);
  const [cepError, setCepError] = useState('');

  const lookupCep = async (cepValue: string) => {
    const cleanCep = cepValue.replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      setCepError(t.guestZipError);
      return;
    }
    setSearchingCep(true);
    setCepError('');
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      if (data.erro) {
        setCepError(t.guestZipError);
      } else {
        setFormData(prev => {
          const updatedGuest = {
            ...prev.mainGuest,
            addressStreet: data.logradouro || '',
            addressDistrict: data.bairro || '',
            addressCityState: `${data.localidade} - ${data.uf}`,
            addressZipCode: data.cep || cepValue
          };
          
          const parts = [];
          if (updatedGuest.addressStreet) parts.push(updatedGuest.addressStreet);
          if (updatedGuest.addressComplement) parts.push(updatedGuest.addressComplement);
          if (updatedGuest.addressDistrict) parts.push(`Bairro: ${updatedGuest.addressDistrict}`);
          if (updatedGuest.addressCityState) parts.push(updatedGuest.addressCityState);
          if (updatedGuest.addressZipCode) parts.push(`CEP: ${updatedGuest.addressZipCode}`);
          updatedGuest.address = parts.join(', ');
          
          return { ...prev, mainGuest: updatedGuest };
        });
      }
    } catch (err) {
      setCepError(t.guestZipError);
    } finally {
      setSearchingCep(false);
    }
  };

  const handleMainGuestChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updatedGuest = { ...prev.mainGuest, [name]: value };
      
      if (['addressStreet', 'addressComplement', 'addressDistrict', 'addressCityState', 'addressZipCode'].includes(name)) {
        const parts = [];
        if (updatedGuest.addressStreet) parts.push(updatedGuest.addressStreet);
        if (updatedGuest.addressComplement) parts.push(updatedGuest.addressComplement);
        if (updatedGuest.addressDistrict) parts.push(`Bairro: ${updatedGuest.addressDistrict}`);
        if (updatedGuest.addressCityState) parts.push(updatedGuest.addressCityState);
        if (updatedGuest.addressZipCode) parts.push(`CEP: ${updatedGuest.addressZipCode}`);
        updatedGuest.address = parts.join(', ');
      }
      
      return { ...prev, mainGuest: updatedGuest };
    });
  };

  const handlePetToggle = (hasPet: boolean) => {
    setFormData(prev => ({ ...prev, pet: { ...prev.pet, hasPet: isPetAllowedProperty ? hasPet : false } }));
  };

  const handlePetChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, pet: { ...prev.pet, [name]: value } }));
  };

  const handleCompanionChange = (index: number, name: string, value: string) => {
    const newCompanions = [...formData.companions];
    if (!newCompanions[index]) {
      newCompanions[index] = { 
        id: Math.random().toString(), 
        name: '', 
        rg: '', 
        cpf: '', 
        email: '', 
        phone: '', 
        documentNumber: '' 
      };
    }
    newCompanions[index] = { ...newCompanions[index], [name]: value };
    // Mapeamento de compatibilidade para documentNumber
    if (name === 'cpf') {
      newCompanions[index].documentNumber = value;
    } else if (name === 'rg' && !newCompanions[index].cpf) {
      newCompanions[index].documentNumber = value;
    }
    setFormData(prev => ({ ...prev, companions: newCompanions }));
  };

  const handleUpload = (role: 'main' | 'companion' | 'pet', index?: number) => (base64: string) => {
    if (role === 'main') setFormData(prev => ({ ...prev, mainGuest: { ...prev.mainGuest, documentFile: base64 } }));
    else if (role === 'pet') setFormData(prev => ({ ...prev, pet: { ...prev.pet, vaccineFile: base64 } }));
    else if (index !== undefined) {
      const newCompanions = [...formData.companions];
      newCompanions[index] = { ...newCompanions[index], documentFile: base64 };
      setFormData(prev => ({ ...prev, companions: newCompanions }));
    }
  };

  const finalizeProcess = async () => {
    setLoading(true);
    try {
      // Garantir que enviamos apenas a quantidade correta de acompanhantes baseada no guestCount
      const trimmedCompanions = formData.companions.slice(0, formData.reservation.guestCount - 1);
      const dataToSave = { ...formData, companions: trimmedCompanions, propertyDetails: selectedProperty };
      
      const success = await saveToGoogleSheets(dataToSave);
      if (success) {
        localStorage.setItem('last_successful_submission', JSON.stringify(dataToSave));
        setStep(FormStep.SUCCESS);
      }
      else alert("Erro ao salvar. Tente novamente.");
    } catch (error) {
      alert("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-12 bg-slate-50 flex flex-col font-['Nunito']">
      <header className="bg-white border-b sticky top-0 z-50 shadow-sm px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Logo className="w-10 h-10" />
          <h1 className="font-black text-slate-800 text-sm uppercase leading-tight">{t.wellintonName}<br/><span className="text-blue-600 text-[10px]">{t.realtorSubtitle}</span></h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Language Selector */}
          <div className="flex items-center gap-1.5">
            {[
              { 
                code: 'pt', 
                label: 'PT',
                flag: (
                  <svg viewBox="0 0 32 32" className="w-4 h-4 rounded-full overflow-hidden shadow-xs border border-black/10">
                    <circle cx="16" cy="16" r="16" fill="#009c3b" />
                    <polygon points="16,4 28,16 16,28 4,16" fill="#ffdf00" />
                    <circle cx="16" cy="16" r="6" fill="#002776" />
                  </svg>
                )
              },
              { 
                code: 'en', 
                label: 'EN',
                flag: (
                  <svg viewBox="0 0 32 32" className="w-4 h-4 rounded-full overflow-hidden shadow-xs border border-black/10 bg-white">
                    <rect x="0" y="0" width="32" height="32" fill="#fff" />
                    <rect x="0" y="0" width="32" height="2.46" fill="#b22234" />
                    <rect x="0" y="4.92" width="32" height="2.46" fill="#b22234" />
                    <rect x="0" y="9.84" width="32" height="2.46" fill="#b22234" />
                    <rect x="0" y="14.76" width="32" height="2.46" fill="#b22234" />
                    <rect x="0" y="19.68" width="32" height="2.46" fill="#b22234" />
                    <rect x="0" y="24.6" width="32" height="2.46" fill="#b22234" />
                    <rect x="0" y="29.52" width="32" height="2.48" fill="#b22234" />
                    <rect x="0" y="0" width="16" height="17.2" fill="#3c3b6e" />
                    <circle cx="3" cy="3" r="0.7" fill="#fff" />
                    <circle cx="7" cy="3" r="0.7" fill="#fff" />
                    <circle cx="11" cy="3" r="0.7" fill="#fff" />
                    <circle cx="5" cy="6" r="0.7" fill="#fff" />
                    <circle cx="9" cy="6" r="0.7" fill="#fff" />
                    <circle cx="3" cy="9" r="0.7" fill="#fff" />
                    <circle cx="7" cy="9" r="0.7" fill="#fff" />
                    <circle cx="11" cy="9" r="0.7" fill="#fff" />
                    <circle cx="5" cy="12" r="0.7" fill="#fff" />
                    <circle cx="9" cy="12" r="0.7" fill="#fff" />
                    <circle cx="3" cy="15" r="0.7" fill="#fff" />
                    <circle cx="7" cy="15" r="0.7" fill="#fff" />
                    <circle cx="11" cy="15" r="0.7" fill="#fff" />
                  </svg>
                )
              },
              { 
                code: 'es', 
                label: 'ES',
                flag: (
                  <svg viewBox="0 0 32 32" className="w-4 h-4 rounded-full overflow-hidden shadow-xs border border-black/10">
                    <rect x="0" y="0" width="32" height="8" fill="#c60b1e" />
                    <rect x="0" y="8" width="32" height="16" fill="#ffc400" />
                    <rect x="0" y="24" width="32" height="8" fill="#c60b1e" />
                    <circle cx="10" cy="16" r="2" fill="#c60b1e" />
                  </svg>
                )
              }
            ].map(item => (
              <button
                key={item.code}
                type="button"
                onClick={() => setLang(item.code as Language)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[10px] font-black tracking-wider transition-all cursor-pointer ${
                  lang === item.code 
                    ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-100 scale-105' 
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {item.flag}
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          <div className="text-[10px] font-bold text-slate-400 text-right uppercase hidden xs:block">{t.creci}</div>
          <button 
            onClick={() => setShowAdmin(true)} 
            className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            title={t.adminPanel}
          >
            <i className="fas fa-lock text-sm"></i>
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 mt-6">
        {showAdmin ? (
          <AdminPanel 
            onClose={() => setShowAdmin(false)} 
            onResend={saveToGoogleSheets} 
          />
        ) : (
          <>
            {step > FormStep.CONSENT && step !== FormStep.SUCCESS && <StepIndicator currentStep={step} petAllowed={isPetAllowedProperty} lang={lang} />}

            <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-10">
          
          {step === FormStep.CONSENT && (
            <div className="space-y-6 text-center py-4">
              <h2 className="text-2xl font-black text-slate-800">{t.consentTitle}</h2>
              <p className="text-slate-500 text-sm leading-relaxed">
                {t.consentDesc}
              </p>
              <label className="flex items-center gap-4 p-5 bg-blue-50 rounded-2xl border border-blue-100 cursor-pointer text-left">
                <input type="checkbox" checked={formData.lgpdConsent} onChange={(e) => setFormData(prev => ({ ...prev, lgpdConsent: e.target.checked }))} className="w-6 h-6 rounded text-blue-600" />
                <span className="text-xs font-bold text-blue-900 uppercase">{t.consentCheck}</span>
              </label>
              <button onClick={nextStep} disabled={!formData.lgpdConsent} className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-lg disabled:opacity-30">{t.consentButton}</button>
            </div>
          )}

          {step === FormStep.RESERVATION && (
            <div className="space-y-6 animate-in slide-in-from-right-4">
              <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight border-b pb-2">{t.resTitle}</h2>
              <div className="grid gap-4">
                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 mb-2">
                  <label className="text-[10px] font-black text-blue-600 uppercase mb-1 block tracking-widest">{t.resPropertyLabel}</label>
                  <p className="text-[9px] text-blue-400 font-bold mb-2 italic">{t.resPropertyPlaceholder}</p>
                  <select 
                    name="propertyId" 
                    value={formData.reservation.propertyId} 
                    onChange={handleReservationChange} 
                    className="bg-transparent border-none p-0 focus:ring-0 font-black text-blue-800 text-sm w-full cursor-pointer uppercase"
                  >
                    <option value="" disabled>{t.resPropertyPlaceholder}</option>
                    {PROPERTIES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>

                {!isPetAllowedProperty && (
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs font-bold text-amber-900 animate-in fade-in slide-in-from-top-2 flex gap-3 items-start">
                    <div className="p-1 text-amber-600 flex-shrink-0">
                      <i className="fas fa-info-circle text-lg"></i>
                    </div>
                    <div className="space-y-1">
                      <p className="font-black uppercase text-[10px] tracking-wider text-amber-800">{t.resPetWarningTitle}</p>
                      <p className="font-bold leading-normal text-amber-700">
                        {selectedProperty.id === "9" 
                          ? t.resPetWarningSunSquare
                          : t.resPetWarningOthers}
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.resSourceLabel}</label>
                  <p className="text-[9px] text-blue-600 font-bold ml-1 mb-2 italic">{t.resSourceSub}</p>
                  <div className="flex flex-wrap gap-2">
                    {['Airbnb', 'Booking.com', 'alugagoias.com.br', 'Outros'].map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, reservation: { ...prev.reservation, bookingSource: opt } }))}
                        className={`px-4 py-2 rounded-xl border-2 text-[10px] font-bold uppercase transition-all ${
                          formData.reservation.bookingSource === opt 
                            ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm' 
                             : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {formData.reservation.bookingSource && (
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-xs font-bold text-emerald-800 animate-in fade-in slide-in-from-top-2">
                    {formData.reservation.bookingSource === 'Airbnb' ? (
                      <p>{t.resSourceAirbnbMessage}</p>
                    ) : (
                      <p>{t.resSourceOtherMessage.replace('{source}', formData.reservation.bookingSource)}</p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.resReasonLabel}</label>
                  <p className="text-[9px] text-blue-600 font-bold ml-1 mb-2 italic">{t.resReasonSub}</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'Férias/Lazer', label: t.resReasonOptionVacation },
                      { key: 'Negócios', label: t.resReasonOptionBusiness },
                      { key: 'Saúde', label: t.resReasonOptionHealth },
                      { key: 'Parentes/Amigos', label: t.resReasonOptionFriends },
                      { key: 'Eventos', label: t.resReasonOptionEvents },
                      { key: 'Outro', label: t.resReasonOptionOther }
                    ].map(opt => {
                      const isSelected = opt.key === 'Outro' ? isOtherReason : (!isOtherReason && formData.reservation.reasonForVisit === opt.key);
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => {
                            if (opt.key === 'Outro') {
                              setIsOtherReason(true);
                              setFormData(prev => ({ ...prev, reservation: { ...prev.reservation, reasonForVisit: '' } }));
                            } else {
                              setIsOtherReason(false);
                              setFormData(prev => ({ ...prev, reservation: { ...prev.reservation, reasonForVisit: opt.key } }));
                            }
                          }}
                          className={`px-4 py-2 rounded-xl border-2 text-[10px] font-bold uppercase transition-all ${
                            isSelected 
                              ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm' 
                              : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>

                  {isOtherReason && (
                    <div className="space-y-1 mt-2 animate-in fade-in slide-in-from-top-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.resReasonOtherLabel}</label>
                      <input
                        type="text"
                        placeholder={t.resReasonOtherPlaceholder}
                        value={['Férias/Lazer', 'Negócios', 'Saúde', 'Parentes/Amigos', 'Eventos'].includes(formData.reservation.reasonForVisit) ? '' : formData.reservation.reasonForVisit}
                        onChange={(e) => setFormData(prev => ({ ...prev, reservation: { ...prev.reservation, reasonForVisit: e.target.value } }))}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none text-slate-700 placeholder-slate-400 focus:border-blue-500 focus:bg-white transition-all text-xs"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">{t.resCheckinLabel}</label>
                    <input type="date" name="startDate" value={formData.reservation.startDate} onChange={handleReservationChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">{t.resCheckoutLabel}</label>
                    <input type="date" name="endDate" value={formData.reservation.endDate} onChange={handleReservationChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.resObservationsLabel}</label>
                  <textarea
                    name="observations"
                    placeholder={t.resObservationsPlaceholder}
                    value={formData.reservation.observations}
                    onChange={handleReservationChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none text-slate-700 placeholder-slate-400 focus:border-blue-500 focus:bg-white transition-all text-xs resize-none h-20"
                  />
                </div>

                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <label className="text-[10px] font-black text-blue-600 uppercase mb-1 block">{t.resGuestsLabel}</label>
                  <select name="guestCount" value={formData.reservation.guestCount} onChange={handleReservationChange} className="bg-transparent border-none p-0 focus:ring-0 font-black text-blue-800 text-xl w-full">
                    {Array.from({ length: selectedProperty.capacity || 8 }).map((_, i) => <option key={i+1} value={i+1}>{i+1} {t.resGuestsUnit}</option>)}
                  </select>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="space-y-1">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        name="hasVehicle" 
                        checked={formData.reservation.hasVehicle} 
                        onChange={handleReservationChange} 
                        className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500" 
                      />
                      <span className="text-sm font-bold text-slate-700">{t.resVehicleLabel}</span>
                    </label>
                    <p className="text-[10px] text-slate-400 font-bold ml-8 italic uppercase leading-normal">
                      {t.resVehicleSub}
                    </p>
                  </div>

                  {formData.reservation.hasVehicle && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-in fade-in slide-in-from-top-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">{t.resVehicleBrand}</label>
                        <input name="vehicleBrand" value={formData.reservation.vehicleBrand} onChange={handleReservationChange} placeholder="Ex: Toyota" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">{t.resVehicleModel}</label>
                        <input name="vehicleModel" value={formData.reservation.vehicleModel} onChange={handleReservationChange} placeholder="Ex: Corolla" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">{t.resVehicleColor}</label>
                        <input name="vehicleColor" value={formData.reservation.vehicleColor} onChange={handleReservationChange} placeholder="Ex: Prata" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">{t.resVehiclePlate}</label>
                        <input name="vehiclePlate" value={formData.reservation.vehiclePlate} onChange={handleReservationChange} placeholder="ABC-1234" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold uppercase" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <button onClick={nextStep} disabled={!formData.reservation.propertyId || !formData.reservation.startDate || !formData.reservation.endDate || !formData.reservation.bookingSource || (isOtherReason && !formData.reservation.reasonForVisit.trim())} className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-100 active:scale-[0.98] transition-all">{t.continue}</button>
            </div>
          )}

          {step === FormStep.MAIN_GUEST && (
            <div className="space-y-6 animate-in slide-in-from-right-4">
              <h2 className="text-lg font-black text-slate-800 uppercase border-b pb-2">{t.guestTitle}</h2>
              <div className="grid gap-4">
                <input name="fullName" value={formData.mainGuest.fullName} onChange={handleMainGuestChange} placeholder={t.guestFullName} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold uppercase placeholder:text-slate-300" />
                
                <div className="grid grid-cols-2 gap-4">
                  <input name="cpf" value={formData.mainGuest.cpf} onChange={handleMainGuestChange} placeholder={t.guestCpf} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" />
                  <input name="rg" value={formData.mainGuest.rg} onChange={handleMainGuestChange} placeholder={t.guestRg} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" />
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block tracking-widest">{t.guestMaritalStatus}</label>
                  <select 
                    name="maritalStatus" 
                    value={formData.mainGuest.maritalStatus} 
                    onChange={handleMainGuestChange} 
                    className="bg-transparent border-none p-0 focus:ring-0 font-black text-slate-700 text-sm w-full cursor-pointer"
                  >
                    <option value="">{t.guestMaritalPlaceholder}</option>
                    {[
                      { key: 'Solteiro(a)', label: t.guestMaritalSingle },
                      { key: 'Casado(a)', label: t.guestMaritalMarried },
                      { key: 'União Estável', label: t.guestMaritalStable },
                      { key: 'Divorciado(a)', label: t.guestMaritalDivorced },
                      { key: 'Viúvo(a)', label: t.guestMaritalWidowed }
                    ].map(opt => (
                      <option key={opt.key} value={opt.key}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <input name="profession" value={formData.mainGuest.profession} onChange={handleMainGuestChange} placeholder={t.guestProfession} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold uppercase" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input name="email" value={formData.mainGuest.email} onChange={handleMainGuestChange} placeholder={t.guestEmail} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" />
                  <input name="phone" value={formData.mainGuest.phone} onChange={handleMainGuestChange} placeholder={t.guestPhone} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" />
                </div>

                <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <i className="fas fa-map-marked-alt text-blue-600"></i> {t.guestAddressSection}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">{t.guestZipCode}</label>
                      <div className="relative flex gap-2">
                        <input 
                          name="addressZipCode" 
                          value={formData.mainGuest.addressZipCode || ''} 
                          onChange={(e) => {
                            handleMainGuestChange(e);
                            if (e.target.value.replace(/\D/g, '').length === 8) {
                              lookupCep(e.target.value);
                            }
                          }} 
                          placeholder="00000-000" 
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-sm" 
                        />
                        <button 
                          type="button"
                          onClick={() => lookupCep(formData.mainGuest.addressZipCode || '')}
                          disabled={searchingCep}
                          className="px-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50 whitespace-nowrap uppercase"
                        >
                          {searchingCep ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-search"></i>}
                          {t.guestZipSearch}
                        </button>
                      </div>
                      {cepError && <span className="text-[10px] font-bold text-red-500 ml-1 block">{cepError}</span>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-3 space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">{t.guestAddressLine}</label>
                      <input 
                        name="addressStreet" 
                        value={formData.mainGuest.addressStreet || ''} 
                        onChange={handleMainGuestChange} 
                        placeholder="Rua Exemplo, 123" 
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-sm uppercase placeholder:text-slate-300" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">{t.guestComplement}</label>
                      <input 
                        name="addressComplement" 
                        value={formData.mainGuest.addressComplement || ''} 
                        onChange={handleMainGuestChange} 
                        placeholder="Ap 101, Bloco B" 
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-sm uppercase placeholder:text-slate-300" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">{t.guestDistrict}</label>
                      <input 
                        name="addressDistrict" 
                        value={formData.mainGuest.addressDistrict || ''} 
                        onChange={handleMainGuestChange} 
                        placeholder="Setor Central" 
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-sm uppercase placeholder:text-slate-300" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">{t.guestCityState}</label>
                      <input 
                        name="addressCityState" 
                        value={formData.mainGuest.addressCityState || ''} 
                        onChange={handleMainGuestChange} 
                        placeholder="Goiânia - GO" 
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-sm uppercase placeholder:text-slate-300" 
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <FileUpload id="doc_main" label={t.guestDocUpload} onFileSelect={handleUpload('main')} lang={lang} />
                  <SelfieCapture 
                    label={t.guestSelfieLabel} 
                    hint={t.guestSelfieHint}
                    onCapture={(base64) => setFormData(prev => ({ ...prev, mainGuest: { ...prev.mainGuest, selfieFile: base64 } }))} 
                    lang={lang}
                  />
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <i className="fas fa-phone-alt"></i> {t.guestEmergencyTitle}
                  </h3>
                  <div className="grid gap-3">
                    <input name="emergencyContactName" value={formData.mainGuest.emergencyContactName} onChange={handleMainGuestChange} placeholder={t.guestEmergencyName} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-sm uppercase" />
                    <div className="grid grid-cols-2 gap-3">
                      <input name="emergencyContactPhone" value={formData.mainGuest.emergencyContactPhone} onChange={handleMainGuestChange} placeholder={t.guestEmergencyPhone} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-sm" />
                    <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
                      <label className="text-[9px] font-black text-orange-600 uppercase mb-1 block tracking-widest">{t.guestEmergencyRelationship}</label>
                      <select 
                        name="emergencyContactRelationship" 
                        value={formData.mainGuest.emergencyContactRelationship} 
                        onChange={handleMainGuestChange} 
                        className="bg-transparent border-none p-0 focus:ring-0 font-black text-orange-800 text-xs w-full cursor-pointer"
                      >
                        <option value="">{t.guestEmergencyRelationshipSelect}</option>
                        {[
                          { key: 'Cônjuge', label: t.guestEmergencySpouse },
                          { key: 'Filho(a)', label: t.guestEmergencyChild },
                          { key: 'Pai/Mãe', label: t.guestEmergencyParents },
                          { key: 'Irmão/Irmã', label: t.guestEmergencySibling },
                          { key: 'Amigo(a)', label: t.guestEmergencyFriend },
                          { key: 'Outro', label: t.guestEmergencyOther }
                        ].map(opt => (
                          <option key={opt.key} value={opt.key}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button onClick={prevStep} className="flex-1 py-4 bg-slate-100 font-bold rounded-xl text-slate-600">{t.back}</button>
                <button 
                  onClick={nextStep} 
                  disabled={!formData.mainGuest.fullName || !formData.mainGuest.cpf || !formData.mainGuest.phone || !formData.mainGuest.documentFile || !formData.mainGuest.selfieFile || !formData.mainGuest.addressStreet || !formData.mainGuest.addressZipCode} 
                  className="flex-[2] py-4 bg-blue-600 text-white font-black rounded-xl disabled:opacity-30 transition-all animate-none"
                >
                  {isPetAllowedProperty ? t.guestNextStepPet : t.guestNextStepCompanions}
                </button>
              </div>
            </div>
          )}

          {step === FormStep.PET_INFO && (
            <div className="space-y-8 animate-in slide-in-from-right-4">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-black text-slate-800">{t.petTitle}</h2>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{t.petSub}</p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <button 
                  type="button"
                  onClick={() => handlePetToggle(false)}
                  className={`py-10 rounded-3xl border-4 transition-all flex flex-col items-center gap-3 ${!formData.pet.hasPet ? 'border-blue-600 bg-blue-50' : 'border-slate-100 bg-slate-50'}`}
                >
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center ${!formData.pet.hasPet ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-200 text-slate-400'}`}>
                    <i className="fas fa-times text-2xl"></i>
                  </div>
                  <span className="font-black text-sm uppercase">{t.petOptionNo}</span>
                </button>

                {isPetAllowedProperty ? (
                  <button 
                    type="button"
                    onClick={() => handlePetToggle(true)}
                    className={`py-10 rounded-3xl border-4 transition-all flex flex-col items-center gap-3 ${formData.pet.hasPet ? 'border-orange-500 bg-orange-50' : 'border-slate-100 bg-slate-50'}`}
                  >
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center ${formData.pet.hasPet ? 'bg-orange-500 text-white shadow-lg' : 'bg-slate-200 text-slate-400'}`}>
                      <i className="fas fa-dog text-2xl"></i>
                    </div>
                    <span className="font-black text-sm uppercase">{t.petOptionYes}</span>
                  </button>
                ) : (
                  <div 
                    className="py-10 rounded-3xl border-4 border-dashed border-red-200 bg-red-50/20 flex flex-col items-center gap-3 cursor-not-allowed opacity-60 select-none text-center px-4"
                  >
                    <div className="w-14 h-14 rounded-full flex items-center justify-center bg-red-100 text-red-500">
                      <i className="fas fa-ban text-2xl"></i>
                    </div>
                    <span className="font-black text-xs text-red-600 uppercase">{t.petNotAllowed}</span>
                  </div>
                )}
              </div>

              {formData.pet.hasPet && (
                <div className="space-y-4 p-6 bg-orange-50/50 border border-orange-100 rounded-3xl animate-in zoom-in-95">
                  <div className="p-4 bg-orange-100/50 rounded-2xl border border-orange-200">
                    <label className="text-[10px] font-black text-orange-600 uppercase mb-1 block tracking-widest">{t.petTypeLabel}</label>
                    <select 
                      name="species" 
                      value={formData.pet.species} 
                      onChange={handlePetChange} 
                      className="bg-transparent border-none p-0 focus:ring-0 font-black text-orange-800 text-sm w-full cursor-pointer uppercase"
                    >
                      {[
                        { key: 'Cão', label: t.petTypeDog },
                        { key: 'Gato', label: t.petTypeCat },
                        { key: 'Aves', label: t.petTypeBird },
                        { key: 'Outros', label: t.petTypeOther }
                      ].map(opt => (
                        <option key={opt.key} value={opt.key}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <input name="name" value={formData.pet.name} onChange={handlePetChange} placeholder={t.petNamePlaceholder} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold uppercase" />
                    <input name="breed" value={formData.pet.breed} onChange={handlePetChange} placeholder={t.petBreedPlaceholder} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold uppercase" />
                  </div>
                  <FileUpload id="pet_vac" label={t.petVaccineLabel} onFileSelect={handleUpload('pet')} lang={lang} />
                </div>
              )}

              <div className="flex gap-4">
                <button onClick={prevStep} className="flex-1 py-4 bg-slate-100 font-bold rounded-xl text-slate-600">{t.back}</button>
                <button onClick={nextStep} className="flex-[2] py-4 bg-blue-600 text-white font-black rounded-xl">{t.guestNextStepCompanions}</button>
              </div>
            </div>
          )}

          {step === FormStep.COMPANIONS && (
            <div className="space-y-6 animate-in slide-in-from-right-4">
              <div className="space-y-1">
                <h2 className="text-lg font-black text-slate-800 uppercase border-b pb-2 flex justify-between items-center">
                  {t.compTitle} 
                  <span className="text-blue-600 text-xs font-bold">{formData.reservation.guestCount - 1} {t.compPendente}</span>
                </h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  {t.compSub.replace('{count}', formData.reservation.guestCount.toString())}
                </p>
              </div>

              {formData.reservation.guestCount > 1 ? (
                <div className="space-y-6">
                  {Array.from({ length: formData.reservation.guestCount - 1 }).map((_, idx) => (
                    <div key={idx} className="p-5 bg-slate-50 rounded-3xl border-2 border-slate-100 space-y-4 relative overflow-hidden">
                      <div className="absolute top-0 left-0 bg-blue-600 text-white text-[9px] font-black px-3 py-1 rounded-br-xl uppercase">
                        {t.compGuestLabel} {idx + 2}
                      </div>
                      <div className="pt-4 grid gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase ml-1">{t.guestFullName}</label>
                          <input 
                            placeholder={t.guestFullName} 
                            value={formData.companions[idx]?.name || ''} 
                            onChange={(e) => handleCompanionChange(idx, 'name', e.target.value)} 
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold uppercase focus:ring-2 focus:ring-blue-100 outline-none placeholder:text-slate-300" 
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">{t.guestCpf}</label>
                            <input 
                              placeholder={t.guestCpf} 
                              value={formData.companions[idx]?.cpf || ''} 
                              onChange={(e) => handleCompanionChange(idx, 'cpf', e.target.value)} 
                              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-100 outline-none placeholder:text-slate-300" 
                            />
                          </div>
                          
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">{t.guestRg}</label>
                            <input 
                              placeholder={t.guestRg} 
                              value={formData.companions[idx]?.rg || ''} 
                              onChange={(e) => handleCompanionChange(idx, 'rg', e.target.value)} 
                              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold uppercase focus:ring-2 focus:ring-blue-100 outline-none placeholder:text-slate-300" 
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">{t.guestEmail}</label>
                            <input 
                              type="email"
                              placeholder={t.guestEmail} 
                              value={formData.companions[idx]?.email || ''} 
                              onChange={(e) => handleCompanionChange(idx, 'email', e.target.value)} 
                              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-100 outline-none placeholder:text-slate-300" 
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">{t.guestPhone}</label>
                            <input 
                              placeholder={t.guestPhone} 
                              value={formData.companions[idx]?.phone || ''} 
                              onChange={(e) => handleCompanionChange(idx, 'phone', e.target.value)} 
                              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-100 outline-none placeholder:text-slate-300" 
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                  <i className="fas fa-user text-3xl mb-3 block opacity-20"></i>
                  <p className="font-bold text-xs uppercase">{t.compIndividualTitle} ({t.compIndividualText})</p>
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <button onClick={prevStep} className="flex-1 py-4 bg-slate-100 font-bold rounded-2xl text-slate-600">{t.back}</button>
                <button 
                  onClick={finalizeProcess} 
                  disabled={loading || (formData.reservation.guestCount > 1 && Array.from({ length: formData.reservation.guestCount - 1 }).some((_, i) => {
                    const companion = formData.companions[i];
                    return !companion?.name || !companion?.rg || !companion?.cpf || !companion?.email || !companion?.phone;
                  }))} 
                  className="flex-[2] py-4 bg-emerald-600 text-white font-black rounded-2xl shadow-xl shadow-emerald-100 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-30"
                >
                  {loading ? <i className="fas fa-spinner fa-spin text-xl"></i> : <i className="fas fa-check-circle text-xl"></i>}
                  {loading ? t.processing : t.compFinishButton}
                </button>
              </div>
              
              {formData.reservation.guestCount > 1 && Array.from({ length: formData.reservation.guestCount - 1 }).some((_, i) => {
                const companion = formData.companions[i];
                return !companion?.name || !companion?.rg || !companion?.cpf || !companion?.email || !companion?.phone;
              }) && (
                <p className="text-[10px] text-red-500 font-black text-center uppercase animate-pulse">
                  {t.compErrorAlert}
                </p>
              )}
            </div>
          )}

          {step === FormStep.SUCCESS && (
            <div className="text-center py-12 space-y-6">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl shadow-inner"><i className="fas fa-check"></i></div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{t.successTitle}</h2>
                <p className="text-slate-500 text-sm">{t.successText}</p>
              </div>
              <button onClick={() => window.location.reload()} className="px-12 py-5 bg-slate-800 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all">{t.successButton}</button>
            </div>
          )}
            </div>
          </>
        )}
      </main>

      <footer className="w-full max-w-2xl mx-auto px-4 py-8 mt-auto border-t border-slate-200">
        <div className="text-center space-y-2">
          <p className="text-slate-800 font-black text-sm uppercase">{t.realtorSubtitle}: WELLINGTON RODOVALHO FONSECA</p>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            <span>CAEPF: 269.462.701/001-49</span>
            <span>CRECI: CRECI-GO 42695</span>
            <span>CNAI: 54826</span>
            <span>|</span>
            <button 
              onClick={() => setShowAdmin(true)} 
              className="hover:text-slate-800 hover:underline transition-all cursor-pointer font-black"
            >
              {t.adminPanel}
            </button>
          </div>
          <div className="pt-4 flex flex-col items-center gap-2">
            <a href="https://www.alugagoias.com.br" target="_blank" rel="noopener noreferrer" className="text-blue-600 font-bold text-xs hover:underline flex items-center gap-2">
              <i className="fas fa-globe"></i> www.alugagoias.com.br
            </a>
            <div className="flex gap-6">
              <a href="https://wa.me/5562991514568" target="_blank" rel="noopener noreferrer" className="text-emerald-600 font-bold text-xs hover:underline flex items-center gap-2">
                <i className="fab fa-whatsapp"></i> 62 99151-4568
              </a>
              <a href="mailto:contato@alugagoias.com.br" className="text-slate-600 font-bold text-xs hover:underline flex items-center gap-2">
                <i className="fas fa-envelope"></i> contato@alugagoias.com.br
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
