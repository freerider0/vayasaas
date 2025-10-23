'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowRight, Play, Sparkles } from 'lucide-react'

export function HeroSection() {
  const [email, setEmail] = useState('')

  return (
    <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-blue-50" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute top-40 right-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center">
          {/* Premium Badge */}
          <div className="inline-flex items-center gap-2 mb-8 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg border border-purple-100">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-bold text-gray-700">Arquitecto Colegiado • 15+ años • 500+ inmobiliarias</span>
          </div>
          
          <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black text-gray-900 mb-8 tracking-tight leading-[0.9]">
            Certificados
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">
              Ilimitados
            </span>
            <span className="block text-4xl lg:text-5xl font-light text-gray-600 mt-4">
              desde 50€/mes
            </span>
          </h1>
          
          <p className="text-2xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
            Olvida los <span className="font-semibold text-gray-500 line-through">€250</span> por certificado.
            <span className="block mt-2">
              Todo ilimitado. Sin sorpresas. Sin límites.
            </span>
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
          
          <div className="flex items-center justify-center gap-4 text-sm text-gray-800 mb-12">
            <span>✓ 100% Cumplimiento Legal</span>
            <span>✓ Entrega en 48h</span>
            <span>✓ Cancela cuando quieras</span>
          </div>
          
          {/* Video Section - Premium Design */}
          <div className="max-w-5xl mx-auto mb-20">
            <div className="relative group cursor-pointer">
              {/* Video Container */}
              <div className="relative aspect-video bg-gradient-to-br from-purple-100 to-blue-100 rounded-3xl overflow-hidden shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-blue-600/20" />

                {/* Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 bg-white rounded-full animate-ping" />
                    <button className="relative w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-300">
                      <Play className="w-10 h-10 text-purple-600 ml-1 fill-current" />
                    </button>
                  </div>
                </div>

                {/* Video Label */}
                <div className="absolute bottom-6 left-6 bg-white/90 backdrop-blur-sm rounded-2xl px-6 py-3">
                  <p className="text-sm font-bold text-gray-900">Cómo ahorrar 4.000€/mes</p>
                  <p className="text-xs text-gray-600">Video explicativo • 90 segundos</p>
                </div>
              </div>

              {/* Decorative Elements */}
              <div className="absolute -top-4 -right-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl px-3 py-1.5 text-white text-xs font-bold shadow-lg">
                🔥 Más visto
              </div>
            </div>
          </div>
          
          {/* Stats - Glassmorphism Design */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
            <div className="bg-white/60 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/20 group hover:scale-105 transition-transform">
              <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">10K+</div>
              <div className="text-sm text-gray-700 font-semibold mt-2">Certificados</div>
            </div>
            <div className="bg-white/60 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/20 group hover:scale-105 transition-transform">
              <div className="text-5xl font-black text-gray-900">48h</div>
              <div className="text-sm text-gray-700 font-semibold mt-2">Garantía entrega</div>
            </div>
            <div className="bg-white/60 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/20 group hover:scale-105 transition-transform">
              <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">500+</div>
              <div className="text-sm text-gray-700 font-semibold mt-2">Inmobiliarias</div>
            </div>
            <div className="bg-white/60 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/20 group hover:scale-105 transition-transform">
              <div className="text-5xl font-black text-gray-900">70%</div>
              <div className="text-sm text-gray-700 font-semibold mt-2">Ahorro medio</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}