'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  FileCheck, 
  Clock, 
  Calculator, 
  Shield, 
  Zap, 
  Users,
  CheckCircle,
  ArrowRight,
  Building,
  FileText,
  Home,
  ClipboardCheck
} from 'lucide-react'

const certificateTypes = [
  {
    id: 'energy',
    title: 'Certificado Energético',
    icon: Zap,
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
    icon: Home,
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
    icon: Building,
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
    icon: FileText,
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
          <Badge variant="outline" className="mb-4">Tipos de Certificados</Badge>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Todos los Certificados que tu Inmobiliaria Necesita
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Una suscripción cubre todos los tipos de certificados. Sin límites, sin costes extra, sin sorpresas.
          </p>
        </div>

        <Tabs defaultValue="energy" className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 mb-12">
            {certificateTypes.map((cert) => (
              <TabsTrigger key={cert.id} value={cert.id} className="flex items-center gap-2">
                <cert.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{cert.title}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {certificateTypes.map((cert) => (
            <TabsContent key={cert.id} value={cert.id}>
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${cert.color} text-white`}>
                      <cert.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">{cert.title}</h3>
                      <p className="text-gray-600">{cert.description}</p>
                    </div>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {cert.benefits.map((benefit, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{benefit}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="flex items-center gap-6 p-4 bg-slate-50 rounded-lg">
                    <div>
                      <span className="text-sm text-gray-500">Tiempo habitual</span>
                      <div className="font-semibold text-gray-900">{cert.turnaround}</div>
                    </div>
                    <div className="border-l pl-6">
                      <span className="text-sm text-gray-500">Precio mercado por certificado</span>
                      <div className="font-semibold text-gray-900">{cert.normalPrice}</div>
                    </div>
                  </div>
                </div>

                <Card className="p-8 bg-gradient-to-br from-blue-50 to-slate-50 border-slate-200">
                  <div className="text-center mb-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">
                      Con Suscripción Ilimitada
                    </h4>
                    <div className="text-4xl font-bold text-green-600">€0</div>
                    <p className="text-sm text-gray-600">por certificado</p>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <span className="text-sm text-gray-600">Certificados mensuales</span>
                      <span className="font-semibold">Ilimitados</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <span className="text-sm text-gray-600">Procesamiento prioritario</span>
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <span className="text-sm text-gray-600">Entrega digital</span>
                      <CheckCircle className="w-5 h-5 text-green-500" />
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
              <Calculator className="w-12 h-12 text-blue-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Calculadora de Ahorro</h3>
              <p className="text-sm text-gray-600">
                Las inmobiliarias ahorran una media de €2.500/mes con la suscripción ilimitada
              </p>
            </div>
            <div>
              <Clock className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Servicio Express</h3>
              <p className="text-sm text-gray-600">
                Cola prioritaria para todos los miembros con suscripción
              </p>
            </div>
            <div>
              <Users className="w-12 h-12 text-purple-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Acceso de Equipo</h3>
              <p className="text-sm text-gray-600">
                Múltiples usuarios por cuenta de inmobiliaria sin coste extra
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}