'use client'

import { Card } from '@/components/ui/card'
import { Play, TrendingUp, Quote } from 'lucide-react'

const testimonials = [
  {
    name: 'María González',
    role: 'Directora General',
    company: 'RE/MAX Barcelona',
    image: '👩‍💼',
    content: 'Antes de CertPro, gastábamos más de €5.000 al mes en certificados. Ahora con el plan de €100, ahorramos más de €4.000 cada mes. La facturación directa sin comisiones ha sido revolucionaria.',
    rating: 5,
    metric: '€4.000/mes ahorrados',
  },
  {
    name: 'Carlos Martínez',
    role: 'Director',
    company: 'Century 21 Costa Brava',
    image: '👨‍💼',
    content: 'El modelo ilimitado transformó nuestro negocio. Pasamos de 10 certificados/mes a más de 40. Nuestros agentes adoran la entrega en 48h, y el programa de afiliados genera ingresos extra.',
    rating: 5,
    metric: '300% más transacciones',
  },
  {
    name: 'Ana Rodríguez',
    role: 'Fundadora',
    company: 'Barcelona Luxury Properties',
    image: '👩‍💼',
    content: 'El plan Premium con tours Matterport incluidos es un valor increíble. Las propiedades con tours 3D se venden 30% más rápido. ¿Fotos profesionales a €40 vs precio de mercado de €200? Imbatible.',
    rating: 5,
    metric: '30% ventas más rápidas',
  },
]

const metrics = [
  { label: 'Ahorro Mensual Promedio', value: '€3.500' },
  { label: 'Certificados Procesados', value: '10.000+' },
  { label: 'Tiempo de Entrega', value: '< 48h' },
]

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-24 relative overflow-hidden">
      {/* Background Design */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-br from-blue-100 to-purple-100 rounded-full blur-3xl opacity-30" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-bold text-purple-600 uppercase tracking-wider">Casos de éxito reales</span>
          </div>
          <h2 className="text-5xl lg:text-6xl font-black text-gray-900 mb-6">
            500+ Inmobiliarias
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">
              Ahorrando Miles
            </span>
          </h2>
          <div className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg border border-purple-100 cursor-pointer hover:shadow-xl transition-shadow">
            <Play className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-semibold text-gray-700">Ver testimonios en vídeo (2 min)</span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="group relative">
              {/* Gradient Border Effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-3xl opacity-0 group-hover:opacity-75 blur transition duration-300" />

              <Card className="relative h-full p-8 bg-white/90 backdrop-blur-sm border-0 shadow-xl rounded-3xl hover:shadow-2xl transition-all duration-300">
                {/* Quote Icon */}
                <Quote className="w-8 h-8 text-purple-200 mb-4" />

                {/* Content */}
                <p className="text-lg text-gray-700 leading-relaxed mb-8">
                  {testimonial.content}
                </p>

                {/* Metric Highlight */}
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-4 mb-8 border border-purple-100">
                  <p className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600 text-center">
                    {testimonial.metric}
                  </p>
                </div>

                {/* Author */}
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-purple-400 to-blue-400 rounded-2xl flex items-center justify-center text-2xl shadow-lg">
                    {testimonial.image}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">{testimonial.name}</div>
                    <div className="text-sm text-gray-600">
                      {testimonial.role}
                    </div>
                    <div className="text-xs font-semibold text-purple-600">
                      {testimonial.company}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          ))}
        </div>

        {/* Metrics Section - Premium Design */}
        <div className="relative mt-20">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-3xl blur-2xl opacity-75" />
          <div className="relative bg-gradient-to-r from-purple-600 to-blue-600 rounded-3xl p-12 text-white overflow-hidden">
            {/* Pattern Background */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='white' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
              }} />
            </div>

            <h3 className="text-3xl font-bold text-center mb-12 relative">
              Los números que importan
            </h3>
            <div className="grid md:grid-cols-3 gap-8 relative">
              {metrics.map((metric, index) => (
                <div key={index} className="text-center group">
                  <div className="text-6xl font-black mb-3 group-hover:scale-110 transition-transform">
                    {metric.value}
                  </div>
                  <div className="text-lg font-medium text-white/90">{metric.label}</div>
                </div>
              ))}
            </div>
            <div className="mt-12 text-center relative">
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-6 py-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span className="text-sm font-semibold">Actualizado en tiempo real • 92% retención</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}