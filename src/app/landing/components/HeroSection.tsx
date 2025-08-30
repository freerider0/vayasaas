'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowRight } from 'lucide-react'

export function HeroSection() {
  const [email, setEmail] = useState('')

  return (
    <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
      <div className="absolute inset-0 bg-white" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center">
          <p className="text-sm font-medium text-gray-600 mb-4">
            Arquitecto Colegiado • 15+ años de experiencia
          </p>
          
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 tracking-tight">
            Certificados Ilimitados
            <span className="block text-indigo-600">
              Una Sola Cuota Mensual
            </span>
          </h1>
          
          <p className="text-xl text-gray-700 mb-8 max-w-3xl mx-auto leading-relaxed">
            Deja de pagar por certificado. Obtén cédulas de habitabilidad y certificados energéticos 
            ilimitados para todas tus transacciones inmobiliarias. Más de 500 inmobiliarias confían en nosotros.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 max-w-md mx-auto">
            <Input
              type="email"
              placeholder="Email de tu inmobiliaria"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 text-base"
            />
            <Button 
              size="lg" 
              className="h-12 px-8 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow-md transition-all duration-200"
            >
              Empieza a Ahorrar
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center justify-center gap-4 text-sm text-gray-600 mb-12">
            <span>✓ 100% Cumplimiento Legal</span>
            <span>✓ Entrega en 48h</span>
            <span>✓ Cancela cuando quieras</span>
          </div>
          
          {/* Video Section */}
          <div className="max-w-4xl mx-auto mb-16">
            <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden shadow-lg">
              {/* Replace this div with your video player */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-4 bg-indigo-600 rounded-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M5 4v12l10-6z" />
                    </svg>
                  </div>
                  <p className="text-gray-600">Descubre cómo ahorrar €4.000/mes (1 minuto)</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900">10.000+</div>
              <div className="text-sm text-gray-600">Certificados Emitidos</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900">48h</div>
              <div className="text-sm text-gray-600">Tiempo de Entrega</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900">500+</div>
              <div className="text-sm text-gray-600">Inmobiliarias</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900">70%</div>
              <div className="text-sm text-gray-600">Ahorro Mensual</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}