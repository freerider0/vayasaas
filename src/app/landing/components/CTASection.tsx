'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowRight } from 'lucide-react'

export function CTASection() {
  const [email, setEmail] = useState('')

  const benefits = [
    'Prueba gratis 30 días',
    'Sin gastos de alta',
    'Cancela cuando quieras',
    'Empieza a ahorrar inmediatamente',
  ]

  return (
    <section className="py-24 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-white/10 bg-grid-16" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center bg-green-500/20 text-green-300 px-5 py-2 rounded-full mb-6">
          <span className="text-base font-semibold">Las inmobiliarias ahorran una media de €3.500/mes</span>
        </div>

        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
          Deja de pagar de más por certificados
        </h2>
        <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
          Únete a más de 500 inmobiliarias que ya ahorran miles con certificados ilimitados. 
          Empieza tu prueba gratuita y ve la diferencia en tu primer mes.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8 max-w-md mx-auto">
          <Input
            type="email"
            placeholder="Email de tu inmobiliaria"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white focus:text-gray-900"
          />
          <Button 
            size="lg" 
            className="h-12 px-8 bg-white text-blue-900 hover:bg-gray-100 font-semibold shadow-lg"
          >
            Prueba 30 Días Gratis
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-wrap justify-center gap-4 text-sm text-white/90 mb-12">
          {benefits.map((benefit, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="text-white">• {benefit}</span>
            </div>
          ))}
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 max-w-3xl mx-auto">
          <h3 className="text-xl font-semibold text-white mb-4">
            Calculadora Rápida de ROI
          </h3>
          <div className="grid md:grid-cols-3 gap-6 text-left">
            <div>
              <label className="text-sm text-blue-200">Certificados al mes</label>
              <div className="text-2xl font-bold text-white">20</div>
            </div>
            <div>
              <label className="text-sm text-blue-200">Coste tradicional</label>
              <div className="text-2xl font-bold text-red-400">€5.000</div>
            </div>
            <div>
              <label className="text-sm text-blue-200">Con CertPro (plan €100)</label>
              <div className="text-2xl font-bold text-green-400">€100</div>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-white/20">
            <div className="flex justify-between items-center">
              <span className="text-blue-200">Ahorro mensual</span>
              <span className="text-3xl font-bold text-green-400">€4.900</span>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-12 border-t border-white/20">
          <p className="text-white/80 mb-4">
            Confían en nosotros las principales inmobiliarias
          </p>
          <div className="flex justify-center gap-8 opacity-70">
            {['RE/MAX', 'Century 21', 'Coldwell Banker', 'Engel & Völkers'].map((company) => (
              <span key={company} className="text-white font-semibold">
                {company}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}