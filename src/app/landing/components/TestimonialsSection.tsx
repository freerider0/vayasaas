'use client'

import { Card } from '@/components/ui/card'
import { Star } from 'lucide-react'

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
    <section id="testimonials" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Inmobiliarias reales, resultados reales
          </h2>
          <p className="text-xl text-gray-600">
            Únete a más de 500 inmobiliarias que ahorran miles cada mes
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="p-6 border border-gray-200 hover:border-gray-300 transition-all duration-300 bg-white">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              
              
              <p className="text-gray-700 mb-6 leading-relaxed">
                {testimonial.content}
              </p>

              <div className="border-l-4 border-indigo-600 pl-4 mb-6">
                <p className="text-lg font-bold text-gray-900">{testimonial.metric}</p>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="text-3xl">{testimonial.image}</div>
                <div>
                  <div className="font-semibold text-gray-900">{testimonial.name}</div>
                  <div className="text-sm text-gray-600">
                    {testimonial.role} en {testimonial.company}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="bg-indigo-600 rounded-xl p-12 text-white">
          <h3 className="text-2xl font-bold text-center mb-8">
            Los números hablan por sí solos
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            {metrics.map((metric, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl font-bold mb-2">{metric.value}</div>
                <div className="text-indigo-100">{metric.label}</div>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <p className="text-indigo-100 mb-4">
              Basado en datos de más de 500 inmobiliarias usando CertPro
            </p>
            <p className="text-sm font-medium">
              92% tasa de retención de clientes
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}