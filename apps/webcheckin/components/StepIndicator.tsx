
import React from 'react';
import { FormStep } from '../types';
import { Language, TRANSLATIONS } from '../translations';

interface StepIndicatorProps {
  currentStep: FormStep;
  petAllowed?: boolean;
  lang: Language;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, petAllowed = true, lang }) => {
  const t = TRANSLATIONS[lang];
  const steps = [
    { id: FormStep.RESERVATION, label: t.stepReservation, icon: 'fa-calendar-check' },
    { id: FormStep.MAIN_GUEST, label: t.stepMainGuest, icon: 'fa-user' },
    ...(petAllowed ? [{ id: FormStep.PET_INFO, label: t.stepPet, icon: 'fa-paw' }] : []),
    { id: FormStep.COMPANIONS, label: t.stepCompanions, icon: 'fa-users' },
    { id: FormStep.SUCCESS, label: t.stepFinish, icon: 'fa-check' },
  ];

  return (
    <div className="w-full py-4 sm:py-6 flex justify-between items-center px-2 sm:px-4 max-w-4xl mx-auto">
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          <div className="flex flex-col items-center relative z-10">
            <div className={`w-8 h-8 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-xs sm:text-lg transition-all duration-500 shadow-md
              ${currentStep >= step.id 
                ? 'bg-blue-600 text-white scale-110' 
                : 'bg-white border-2 border-slate-200 text-slate-400'}`}>
              <i className={`fas ${step.icon}`}></i>
            </div>
            <span className={`text-[8px] sm:text-[10px] mt-2 font-black uppercase tracking-widest hidden xs:block
              ${currentStep >= step.id ? 'text-blue-600' : 'text-slate-400'}`}>
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div className="flex-1 px-1 sm:px-2 -mt-4 sm:-mt-6">
              <div className={`h-[2px] sm:h-[3px] w-full rounded-full transition-all duration-700
                ${currentStep > step.id ? 'bg-blue-600' : 'bg-slate-200'}`}></div>
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default StepIndicator;
