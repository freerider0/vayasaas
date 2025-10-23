'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Play, ArrowRight } from 'lucide-react'

const certificateTypes = [
  {
    id: 'energy',
    title: 'Certificado Energético',
    description: 'CEE obligatorio para todas las ventas y alquileres',
    color: 'from-green-500 to-emerald-500',
    benefits: [
      'Validez de 10 años desde la emisión',
      'Obligatorio para todas las transacciones',
      'Calificación energética de A a G',
      'Incluye recomendaciones de mejora',
      'Registro digital en ICAEN',
    ],
    turnaround: '24-48h',
    normalPrice: '€150-300',
  },
  {
    id: 'habitability',
    title: 'Cédula de Habitabilidad',
    description: 'Requisito legal para ocupación y suministros',
    color: 'from-blue-500 to-cyan-500',
    benefits: [
      'Necesaria para conexión de suministros',
      'Validez de 15 años',
      'Verificación cumplimiento municipal',
      'Comprobación superficie y distribución',
      'Esencial para contratos de alquiler',
    ],
    turnaround: '48-72h',
    normalPrice: '€200-400',
  },
  {
    id: 'ite',
    title: 'Inspección Técnica (ITE)',
    description: 'Obligatoria para edificios de más de 45 años',
    color: 'from-orange-500 to-red-500',
    benefits: [
      'Evaluación seguridad estructural',
      'Inspección fachadas y cubiertas',
      'Verificación de instalaciones',
      'Validez de 10 años',
      'Registro municipal incluido',
    ],
    turnaround: '3-5 días',
    normalPrice: '€500-1500',
  },
  {
    id: 'nota-simple',
    title: 'Documentación Inmobiliaria',
    description: 'Informes completos registro y catastro',
    color: 'from-purple-500 to-pink-500',
    benefits: [
      'Nota simple registral',
      'Informe referencia catastral',
      'Verificación de titularidad',
      'Comprobación de cargas',
      'Entrega el mismo día',
    ],
    turnaround: 'Mismo día',
    normalPrice: '€50-100',
  },
]

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-blue-500" />
            <span className="text-sm font-bold text-blue-600 uppercase tracking-wider">Todo incluido</span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-blue-500" />
          </div>
          <h2 className="text-5xl lg:text-6xl font-black text-gray-900 mb-6">
            Un Plan. <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Todo Ilimitado.</span>
          </h2>
          <p className="text-2xl text-gray-600 max-w-3xl mx-auto font-light">
            Certificados energéticos, cédulas, ITE, contratos... Todo sin límites.
          </p>
        </div>

        <Tabs defaultValue="energy" className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 mb-12">
            {certificateTypes.map((cert) => (
              <TabsTrigger key={cert.id} value={cert.id}>
                {cert.title}
              </TabsTrigger>
            ))}
          </TabsList>

          {certificateTypes.map((cert) => (
            <TabsContent key={cert.id} value={cert.id}>
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div>
                  <div className="mb-8">
                    <div className="inline-flex items-center gap-3 mb-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-full px-4 py-2">
                      <Play className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-semibold text-gray-700">Ver video explicativo (60s)</span>
                    </div>
                    <h3 className="text-4xl font-black text-gray-900 mb-3">{cert.title}</h3>
                    <p className="text-xl text-gray-600 leading-relaxed">{cert.description}</p>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {cert.benefits.map((benefit, index) => (
                      <li key={index} className="flex items-start gap-3 group">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-xs font-bold">✓</span>
                        </div>
                        <span className="text-gray-700 text-lg group-hover:text-gray-900 transition-colors">{benefit}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
                      <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Precio tradicional</span>
                      <div className="text-2xl font-black text-gray-700 line-through mt-1">{cert.normalPrice}</div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-4 border border-purple-100">
                      <span className="text-xs font-bold text-purple-600 uppercase tracking-wide">Tiempo entrega</span>
                      <div className="text-2xl font-black text-purple-600 mt-1">{cert.turnaround}</div>
                    </div>
                  </div>
                </div>

                <Card className="relative overflow-hidden border-0 shadow-2xl">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600" />
                  <div className="relative p-8 text-white">
                    <div className="text-center mb-8">
                      <h4 className="text-2xl font-bold mb-4">
                        Con CertPro Ilimitado
                      </h4>
                      <div className="text-7xl font-black">€0</div>
                      <p className="text-lg opacity-90">por certificado</p>
                      <div className="inline-flex items-center gap-2 mt-4 bg-white/20 rounded-full px-4 py-2">
                        <span className="text-sm font-bold">Ahorro: {parseInt(cert.normalPrice.replace('€', '')) * 20}€/mes</span>
                      </div>
                    </div>
                  
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-white/10 backdrop-blur-sm rounded-xl">
                        <span className="text-sm font-medium">Certificados mensuales</span>
                        <span className="font-bold">ILIMITADOS</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white/10 backdrop-blur-sm rounded-xl">
                        <span className="text-sm font-medium">Procesamiento prioritario</span>
                        <span className="text-white font-bold text-lg">✓</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white/10 backdrop-blur-sm rounded-xl">
                        <span className="text-sm font-medium">Entrega digital</span>
                        <span className="text-white font-bold text-lg">✓</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </TabsContent>
          ))}
        </Tabs>

        <div className="mt-20 p-8 bg-gradient-to-r from-blue-50 to-slate-50 rounded-2xl">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Calculadora de Ahorro</h3>
              <p className="text-sm text-gray-800">
                Las inmobiliarias ahorran una media de €2.500/mes con la suscripción ilimitada
              </p>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Servicio Express</h3>
              <p className="text-sm text-gray-800">
                Cola prioritaria para todos los miembros con suscripción
              </p>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Acceso de Equipo</h3>
              <p className="text-sm text-gray-800">
                Múltiples usuarios por cuenta de inmobiliaria sin coste extra
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}