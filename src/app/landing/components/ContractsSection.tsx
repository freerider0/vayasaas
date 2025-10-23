'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Camera,
  FileText,
  Clock,
  CheckCircle,
  ArrowRight,
  CreditCard,
  FileSignature,
  Home,
  ClipboardCheck,
  Users,
  Zap
} from 'lucide-react'

const contractTypes = [
  {
    icon: FileSignature,
    title: 'Mandato de Venta',
    description: 'Contrato de exclusividad generado al instante',
    time: '2 min',
  },
  {
    icon: CreditCard,
    title: 'Contrato de Arras',
    description: 'Señal y forma de pago automatizadas',
    time: '3 min',
  },
  {
    icon: ClipboardCheck,
    title: 'Hoja de Visita',
    description: 'Registro de visitas con firma digital',
    time: '1 min',
  },
  {
    icon: Home,
    title: 'Contrato de Alquiler',
    description: 'Contrato completo con todas las cláusulas legales',
    time: '5 min',
  },
  {
    icon: FileText,
    title: 'Nota de Encargo',
    description: 'Documento de captación profesional',
    time: '2 min',
  },
  {
    icon: Users,
    title: 'Contrato Compraventa',
    description: 'Documento privado de compraventa',
    time: '5 min',
  },
]

export function ContractsSection() {
  return (
    <section id="contracts" className="py-24 bg-gradient-to-b from-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-purple-500" />
            <span className="text-sm font-bold text-purple-600 uppercase tracking-wider">Revolucionario</span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-purple-500" />
          </div>
          <h2 className="text-5xl lg:text-6xl font-black text-gray-900 mb-6">
            Genera Contratos en
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">
              Segundos
            </span>
          </h2>
          <p className="text-2xl text-gray-600 max-w-3xl mx-auto font-light leading-relaxed">
            Solo necesitas <span className="font-semibold text-gray-900">2 fotos</span>: DNI del cliente y referencia catastral.
            <span className="block mt-2">Nuestra IA genera todos los contratos inmobiliarios al instante.</span>
          </p>
        </div>

        {/* How it works - Sophisticated Design */}
        <div className="relative mb-24">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-50 via-transparent to-blue-50 rounded-3xl" />

          <div className="relative grid lg:grid-cols-3 gap-0">
            {/* Step 1 */}
            <div className="relative group">
              <div className="p-8">
                <div className="relative z-10">
                  {/* Big Number */}
                  <div className="absolute -top-4 -left-4 text-8xl font-black text-gray-100 select-none">01</div>

                  {/* Content */}
                  <div className="relative">
                    <div className="mb-6 inline-block">
                      <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                        <Camera className="w-8 h-8 text-white" />
                      </div>
                    </div>

                    <h3 className="text-2xl font-black text-gray-900 mb-3">
                      Fotografía el DNI
                    </h3>
                    <p className="text-base text-gray-600 leading-relaxed">
                      Una simple foto del DNI del cliente para extraer todos los datos personales automáticamente.
                    </p>

                    {/* Time indicator */}
                    <div className="mt-6 inline-flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse" />
                      <span className="text-purple-600 font-semibold">30 segundos</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Connector Line */}
              <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-purple-600 to-blue-600 z-20" />
            </div>

            {/* Step 2 */}
            <div className="relative group">
              <div className="p-8">
                <div className="relative z-10">
                  {/* Big Number */}
                  <div className="absolute -top-4 -left-4 text-8xl font-black text-gray-100 select-none">02</div>

                  {/* Content */}
                  <div className="relative">
                    <div className="mb-6 inline-block">
                      <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                        <Home className="w-8 h-8 text-white" />
                      </div>
                    </div>

                    <h3 className="text-2xl font-black text-gray-900 mb-3">
                      Captura la referencia catastral
                    </h3>
                    <p className="text-base text-gray-600 leading-relaxed">
                      Foto de cualquier documento con la referencia catastral. Extraemos todos los datos del inmueble.
                    </p>

                    {/* Time indicator */}
                    <div className="mt-6 inline-flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse" />
                      <span className="text-purple-600 font-semibold">45 segundos</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Connector Line */}
              <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-purple-600 to-blue-600 z-20" />
            </div>

            {/* Step 3 */}
            <div className="relative group">
              <div className="p-8">
                <div className="relative z-10">
                  {/* Big Number */}
                  <div className="absolute -top-4 -left-4 text-8xl font-black text-gray-100 select-none">03</div>

                  {/* Content */}
                  <div className="relative">
                    <div className="mb-6 inline-block">
                      <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                        <Zap className="w-8 h-8 text-white" />
                      </div>
                    </div>

                    <h3 className="text-2xl font-black text-gray-900 mb-3">
                      Contratos listos al instante
                    </h3>
                    <p className="text-base text-gray-600 leading-relaxed">
                      Todos los contratos generados automáticamente con los datos correctos. Listos para firmar.
                    </p>

                    {/* Time indicator */}
                    <div className="mt-6 inline-flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                      <span className="text-blue-600 font-semibold">✓ Completado</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Total Time */}
          <div className="text-center mt-12">
            <div className="inline-flex items-center gap-3 bg-white rounded-full px-6 py-3 shadow-lg">
              <Clock className="w-5 h-5 text-indigo-600" />
              <span className="text-sm text-gray-600">Tiempo total:</span>
              <span className="text-xl font-black text-gray-900">&lt; 2 minutos</span>
            </div>
          </div>
        </div>

        {/* Contract Types Grid - Premium Design */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-black text-gray-900 mb-4">
              Biblioteca Completa de Contratos
            </h3>
            <p className="text-lg text-gray-600">Todos los documentos legales que tu inmobiliaria necesita, actualizados y listos para usar</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contractTypes.map((contract, index) => (
              <div key={index} className="group relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl" />
                <Card className="relative p-6 bg-white border-gray-100 hover:border-transparent transition-all duration-300 group-hover:shadow-2xl rounded-2xl">
                  <div className="flex flex-col h-full">
                    {/* Icon and Time */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl flex items-center justify-center group-hover:from-purple-50 group-hover:to-blue-50 transition-colors">
                        <contract.icon className="w-6 h-6 text-gray-700 group-hover:text-purple-600 transition-colors" />
                      </div>
                      <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-full">
                        {contract.time}
                      </span>
                    </div>

                    {/* Content */}
                    <h4 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
                      {contract.title}
                    </h4>
                    <p className="text-sm text-gray-600 leading-relaxed flex-grow">
                      {contract.description}
                    </p>

                    {/* Hover Action */}
                    <div className="mt-4 flex items-center text-sm font-semibold text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>Generar ahora</span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </div>

        {/* Benefits */}
        <Card className="bg-gradient-to-br from-purple-600 to-pink-600 text-white p-12">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-3xl font-bold text-center mb-8">
              Ahorra 10+ horas a la semana en papeleo
            </h3>
            
            <div className="grid md:grid-cols-3 gap-8 mb-8">
              <div className="text-center">
                <div className="text-4xl font-bold mb-2">0€</div>
                <p className="text-purple-100">Errores en contratos</p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold mb-2">100%</div>
                <p className="text-purple-100">Cumplimiento legal</p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold mb-2">5min</div>
                <p className="text-purple-100">Por contrato completo</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 justify-center">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span>Datos siempre correctos</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span>Actualizado con última legislación</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span>Firma digital integrada</span>
              </div>
            </div>
          </div>
        </Card>

        {/* CTA */}
        <div className="text-center mt-12">
          <p className="text-lg text-slate-700 mb-6">
            Esta función revolucionaria está incluida en todos nuestros planes
          </p>
          <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
            Prueba la Generación de Contratos
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  )
}