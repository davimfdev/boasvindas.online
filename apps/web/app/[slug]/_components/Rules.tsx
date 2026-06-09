'use client'

import React from 'react'
import { ShieldCheck, Info, Sparkles, Dog, Trash2, Volume2, CigaretteOff } from 'lucide-react'

export function Rules() {
  return (
    <div className="p-6 animate-fadeIn space-y-6">
      <div className="text-center pb-4">
        <h3 className="text-2xl font-serif font-bold text-[#8c7355]">&ldquo;Mi casa su casa&rdquo;</h3>
        <p className="text-sm text-gray-500 italic mt-1">Cuidem do nosso espaço como se fosse a casa de vocês!</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <RuleItem icon={<Volume2 className="text-indigo-500" />} title="Silêncio e Respeito" description="Pedimos que seja silencioso e discreto, especialmente à noite. Não é permitido transitar sem camisa nas áreas comuns." />
        <RuleItem icon={<CigaretteOff className="text-red-500" />} title="Fumo Proibido" description="Não é permitido fumar no interior do apartamento. O local possui sensores de gás e fumaça." />
        <RuleItem icon={<Trash2 className="text-amber-500" />} title="Lixeiras" description="Ficam no hall dos elevadores à esquerda, em um espaço com porta antes dos elevadores." />
        <RuleItem icon={<Sparkles className="text-blue-500" />} title="Toalhas" description="Não utilize toalhas para limpeza de maquiagem ou chão. Manchas irreparáveis serão cobradas para reposição." />
        <RuleItem icon={<Dog className="text-amber-700" />} title="Animais de Estimação" description="Pets são bem-vindos! Solicite o formulário online e atente-se ao regimento interno do condomínio." />
        <RuleItem icon={<ShieldCheck className="text-green-500" />} title="Saída do Apartamento" description="Sempre feche as janelas, desligue o Ar Condicionado e a TV ao se ausentar." />
      </div>

      <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex gap-3">
        <Info className="text-amber-600 shrink-0" />
        <div className="text-sm text-amber-800">
          <p className="font-bold">Limpeza Adicional</p>
          <p>Troca de enxoval ou limpeza extra durante a estadia possui taxa de R$ 70,00.</p>
        </div>
      </div>
    </div>
  )
}

function RuleItem({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm flex items-start gap-4 border border-gray-100">
      <div className="p-2 bg-gray-50 rounded-lg">{icon}</div>
      <div>
        <h4 className="font-bold text-gray-800 mb-1">{title}</h4>
        <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
      </div>
    </div>
  )
}
