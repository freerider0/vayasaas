'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Check, X, Zap, Home, Camera, FileText, TrendingUp, Star } from 'lucide-react'

const plans = [
  {
    name: 'Esencial',
    icon: FileText,
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
    icon: TrendingUp,
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
    icon: Star,
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
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Elige tu plan ilimitado
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
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
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                  Más Popular
                </div>
              )}

              <div className="mb-8">
                <div className="mb-4">
                  <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                </div>
                <p className="text-gray-600">{plan.description}</p>
                {plan.highlight && (
                  <p className="text-sm text-green-700 font-medium mt-2">
                    {plan.highlight}
                  </p>
                )}
              </div>

              <div className="mb-8">
                <div className="flex items-baseline">
                  <span className="text-4xl font-bold text-gray-900">
                    €{plan.monthlyPrice}
                  </span>
                  <span className="ml-2 text-gray-600">/mes</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Facturado mensualmente
                </p>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    {feature.included ? (
                      <Check className={`w-5 h-5 ${feature.highlight ? 'text-blue-600' : 'text-green-500'} mt-0.5 flex-shrink-0`} />
                    ) : (
                      <X className="w-5 h-5 text-gray-300 mt-0.5 flex-shrink-0" />
                    )}
                    <span className={`
                      ${feature.included ? 'text-gray-700' : 'text-gray-400'}
                      ${feature.highlight ? 'font-semibold' : ''}
                    `}>
                      {feature.name}
                    </span>
                  </li>
                ))}
              </ul>

              <Button 
                className={`w-full ${
                  plan.popular 
                    ? 'bg-indigo-600 hover:bg-indigo-700' 
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
                variant={plan.popular ? 'default' : 'outline'}
                size="lg"
              >
                {plan.cta}
              </Button>
            </Card>
          ))}
        </div>

        <div className="mt-20 p-8 bg-white rounded-2xl shadow-lg">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Compara costes: Tradicional vs CertPro
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Servicio</th>
                  <th className="text-center py-3 px-4">Precio Mercado</th>
                  <th className="text-center py-3 px-4">Con CertPro</th>
                  <th className="text-center py-3 px-4">Tu Ahorro</th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.map((item, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-3 px-4 font-medium">{item.service}</td>
                    <td className="text-center py-3 px-4 text-gray-600">{item.traditional}</td>
                    <td className="text-center py-3 px-4 text-green-600 font-semibold">{item.withUs}</td>
                    <td className="text-center py-3 px-4 text-green-700 font-semibold">
                      Hasta {parseInt(item.traditional.replace('€', '')) - parseInt(item.withUs.replace('€', ''))}€
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-center text-sm text-gray-600 mt-4">
            * Basado en precios promedio del mercado en área metropolitana de Barcelona
          </p>
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-600 mb-4">
            Todos los planes incluyen: Garantía cumplimiento legal • Archivo digital • Soporte experto
          </p>
          <p className="text-sm text-gray-500">
            ¿Necesitas un plan personalizado? <a href="#" className="text-blue-600 hover:underline">Contacta para soluciones enterprise</a>
          </p>
        </div>
      </div>
    </section>
  )
}