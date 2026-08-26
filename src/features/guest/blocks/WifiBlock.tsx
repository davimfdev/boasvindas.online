import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Wifi, Copy, Check, QrCode } from 'lucide-react'
import type { Block } from '@/lib/blocks/schema'
import type { RenderCtx } from './BlockRenderer'

export function WifiBlock({ block }: { block: Block; ctx: RenderCtx }) {
  if (block.type !== 'wifi') return null
  const { ssid, password } = block.props
  const [copied, setCopied] = useState(false)
  const qrValue = `WIFI:S:${ssid};T:WPA;P:${password};;`

  function copyPassword() {
    navigator.clipboard.writeText(password)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section className="bg-white p-6 rounded-2xl shadow-sm border border-teal-100 relative overflow-hidden group">
      <div className="absolute -right-8 -top-8 text-teal-50/50 group-hover:text-teal-50 transition-colors pointer-events-none">
        <Wifi size={120} strokeWidth={1} />
      </div>

      <div className="flex items-center gap-3 mb-6 text-teal-700 relative z-10">
        <div className="p-2 bg-teal-50 rounded-lg">
          <Wifi size={24} />
        </div>
        <h3 className="text-xl font-bold font-serif">Conexão Wi-Fi</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
        <div className="space-y-4">
          <div>
            <p className="text-[10px] uppercase text-gray-400 font-black tracking-[0.2em] mb-1">Nome da Rede</p>
            <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
              <p className="text-lg font-mono font-bold text-gaccent">{ssid}</p>
            </div>
          </div>

          <div>
            <p className="text-[10px] uppercase text-gray-400 font-black tracking-[0.2em] mb-1">Senha</p>
            <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100 relative">
              <p className="text-lg font-mono font-bold text-gaccent">{password}</p>
              <button
                onClick={copyPassword}
                className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all"
                title="Copiar senha"
              >
                {copied ? <Check size={18} className="text-teal-600" /> : <Copy size={18} />}
              </button>
              {copied && (
                <span className="absolute -top-8 right-0 bg-teal-600 text-white text-[10px] px-2 py-1 rounded-md animate-bounce">
                  Copiado!
                </span>
              )}
            </div>
          </div>

          <div className="pt-2">
            <a
              href={qrValue}
              className="w-full bg-gaccent text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-teal-600/20 active:scale-[0.98] transition-all"
            >
              <Wifi size={20} />
              Conectar agora
            </a>
            <p className="text-[10px] text-gray-400 mt-3 text-center leading-relaxed">
              *O botão &ldquo;Conectar&rdquo; funciona em dispositivos compatíveis com o protocolo WIFI:.
              Caso não conecte, utilize o QR Code ao lado ou use a senha acima.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center bg-gray-50/50 p-6 rounded-3xl border-2 border-dashed border-gray-200">
          <div className="bg-white p-4 rounded-2xl shadow-md mb-4 border border-gray-100">
            <QRCodeSVG value={qrValue} size={140} level="H" />
          </div>
          <div className="text-center">
            <p className="flex items-center justify-center gap-2 font-bold text-gaccent text-sm mb-1">
              <QrCode size={18} className="text-gsecondary" />
              Conexão Rápida
            </p>
            <p className="text-[11px] text-gray-500">Aponte a câmera do celular para conectar automaticamente</p>
          </div>
        </div>
      </div>
    </section>
  )
}
