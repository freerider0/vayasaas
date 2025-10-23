'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check, X } from 'lucide-react'

const plans = [
  {
    name: 'Esencial',
    description: 'Perfecto para inmobiliarias que empiezan su transformación digital',
    monthlyPrice: 50,
    yearlyPrice: 50,
    features: [
      { name: 'Elige UNO: Certificados Energéticos O Cédulas Ilimitadas', included: true, highlight: true },
      { name: 'Generación automática de TODOS los contratos', included: true, highlight: true },
      { name: 'Entrega garantizada en 48h', included: true },
      { name: 'Archivo digital de certificados', included: true },
      { name: 'Acceso programa de afiliados', included: true },
      { name: 'Soporte por email', included: true },
      { name: 'Hasta 2 miembros del equipo', included: true },
      { name: 'Facturación directa (sin comisiones)', included: false },
      { name: 'Ambos tipos de certificados', included: false },
      { name: 'Tours Matterport 3D', included: false },
      { name: 'Fotografía profesional', included: false },
    ],
    cta: 'Prueba Gratis 30 Días',
    popular: false,
    highlight: null,
  },
  {
    name: 'Profesional',
    description: 'La elección más popular para inmobiliarias activas',
    monthlyPrice: 100,
    yearlyPrice: 100,
    features: [
      { name: 'Certificados Energéticos ILIMITADOS', included: true, highlight: true },
      { name: 'Cédulas de Habitabilidad ILIMITADAS', included: true, highlight: true },
      { name: 'Generación automática de TODOS los contratos', included: true, highlight: true },
      { name: 'Facturación directa - SIN COMISIONES', included: true, highlight: true },
      { name: 'Programa de afiliados con comisiones', included: true },
      { name: 'Entrega express 24-48h', included: true },
      { name: 'Cola de procesamiento prioritaria', included: true },
      { name: 'Soporte telefónico y email', included: true },
      { name: 'Hasta 5 miembros del equipo', included: true },
      { name: 'Informes mensuales de uso', included: true },
      { name: 'Tours Matterport 3D', included: false },
      { name: 'Fotografía profesional', included: false },
    ],
    cta: 'Prueba Gratis 30 Días',
    popular: true,
    highlight: 'Ahorra €2.000+/mes',
  },
  {
    name: 'Premium Plus',
    description: 'Solución completa con herramientas de marketing visual',
    monthlyPrice: 200,
    yearlyPrice: 200,
    features: [
      { name: 'TODOS los tipos de certificados ILIMITADOS', included: true, highlight: true },
      { name: 'Generación automática de TODOS los contratos', included: true, highlight: true },
      { name: '2 Tours Matterport 3D incluidos/mes', included: true, highlight: true },
      { name: 'Fotografía profesional: €40/sesión', included: true, highlight: true },
      { name: 'Facturación directa - SIN COMISIONES', included: true, highlight: true },
      { name: 'Programa de afiliados premium', included: true },
      { name: 'Matterport adicional: €40 cada uno', included: true },
      { name: 'Procesamiento urgente mismo día', included: true },
      { name: 'Gestor de cuenta dedicado', included: true },
      { name: 'Miembros de equipo ilimitados', included: true },
      { name: 'Integración API disponible', included: true },
      { name: 'Certificados marca blanca', included: true },
    ],
    cta: 'Prueba Premium 30 Días',
    popular: false,
    highlight: 'Mejor valor para inmobiliarias',
  },
]

const comparisonData = [
  { service: 'Certificado Energético (por unidad)', traditional: '€250', withUs: '€0' },
  { service: 'Cédula de Habitabilidad', traditional: '€350', withUs: '€0' },
  { service: 'Tour Matterport 3D', traditional: '€150', withUs: '€40' },
  { service: 'Fotografía Profesional', traditional: '€200', withUs: '€40' },
]

export function PricingSection() {
  return (
    <section id="pricing" className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Elige tu plan ilimitado
          </h2>
          <p className="text-2xl text-gray-700 max-w-2xl mx-auto mb-10 font-light leading-relaxed">
            Deja de pagar por certificado. Ahorra miles con nuestro modelo de suscripción ilimitada.
          </p>

        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan) => (
            <Card 
              key={plan.name} 
              className={`relative p-8 ${
                plan.popular 
                  ? 'border-2 border-indigo-600 shadow-lg' 
                  : 'border border-gray-200'
              } bg-white`}
            >
              {plan.popular && (
                <div className="absolute -top-5 left-0 right-0">
                  <div className="text-center">
                    <span className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-2 rounded-full text-xs font-bold uppercase tracking-wider inline-block">
                      Recomendado
                    </span>
                  </div>
                </div>
              )}

              <div className="mb-8">
                <div className="mb-2">
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight">{plan.name}</h3>
                </div>
                <p className="text-base text-gray-600 leading-relaxed mb-3">{plan.description}</p>
                {plan.highlight && (
                  <div className="inline-block bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg px-3 py-1">
                    <p className="text-xs text-purple-700 font-bold uppercase tracking-wide">
                      {plan.highlight}
                    </p>
                  </div>
                )}
              </div>

              <div className="mb-8 pb-8 border-b border-gray-100">
                <div className="flex items-end gap-1">
                  <span className="text-lg font-medium text-gray-600">€</span>
                  <span className="text-6xl font-black text-gray-900 leading-none tracking-tight">{plan.monthlyPrice}</span>
                  <span className="text-lg text-gray-600 font-medium mb-2">/mes</span>
                </div>
                <p className="text-xs text-gray-500 mt-2 uppercase tracking-wide font-semibold">
                  Facturación mensual • Sin permanencia
                </p>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    {feature.included ? (
                      <Check className={`w-5 h-5 ${feature.highlight ? 'text-purple-600' : 'text-blue-600'} mt-0.5 flex-shrink-0`} />
                    ) : (
                      <X className="w-5 h-5 text-gray-300 mt-0.5 flex-shrink-0" />
                    )}
                    <span className={`
                      ${feature.included ? 'text-gray-700' : 'text-gray-400 line-through'}
                      ${feature.highlight ? 'font-bold text-gray-900' : ''}
                      text-sm leading-relaxed
                    `}>
                      {feature.name}
                    </span>
                  </li>
                ))}
              </ul>

              <Button
                className={`w-full py-6 text-base font-semibold transition-all duration-200 ${
                  plan.popular
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl'
                    : 'bg-white border-2 border-gray-300 hover:border-gray-400 text-gray-900 hover:bg-gray-50'
                }`}
                variant={plan.popular ? 'default' : 'outline'}
                size="lg"
              >
                <span className="tracking-wide">{plan.cta}</span>
              </Button>
            </Card>
          ))}
        </div>

        <div className="mt-24">
          <div className="text-center mb-12">
            <span className="text-sm font-bold text-indigo-600 uppercase tracking-wider">Comparativa de ahorro</span>
            <h3 className="text-4xl font-black text-gray-900 mt-2">
              Por qué pagar más?
            </h3>
          </div>
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-4 px-6 text-xs font-black text-gray-600 uppercase tracking-wider">Servicio</th>
                  <th className="text-center py-4 px-6 text-xs font-black text-gray-600 uppercase tracking-wider">Precio Tradicional</th>
                  <th className="text-center py-4 px-6 text-xs font-black text-indigo-600 uppercase tracking-wider">Con CertPro</th>
                  <th className="text-center py-4 px-6 text-xs font-black text-purple-600 uppercase tracking-wider">Tu Ahorro</th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.map((item, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-4 px-6 font-semibold text-gray-900">{item.service}</td>
                    <td className="text-center py-4 px-6">
                      <span className="text-xl font-bold text-gray-500 line-through">{item.traditional}</span>
                    </td>
                    <td className="text-center py-4 px-6">
                      <span className="text-xl font-black text-purple-600">{item.withUs}</span>
                    </td>
                    <td className="text-center py-4 px-6">
                      <span className="inline-block bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 px-3 py-1 rounded-full text-sm font-black">
                        Hasta {parseInt(item.traditional.replace('€', '')) - parseInt(item.withUs.replace('€', ''))}€
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-center text-sm text-gray-800 mt-4">
            * Basado en precios promedio del mercado en área metropolitana de Barcelona
          </p>
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-800 mb-4">
            Todos los planes incluyen: Garantía cumplimiento legal • Archivo digital • Soporte experto
          </p>
          <p className="text-sm text-gray-700">
            ¿Necesitas un plan personalizado? <a href="#" className="text-blue-600 hover:underline">Contacta para soluciones enterprise</a>
          </p>
        </div>
      </div>
    </section>
  )
}