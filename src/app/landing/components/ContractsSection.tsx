'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Camera,
  FileText,
  Sparkles,
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
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border-purple-200">
            <Sparkles className="w-3 h-3 mr-1" />
            Función Revolucionaria
          </Badge>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Genera Contratos en Segundos
          </h2>
          <p className="text-xl text-slate-700 max-w-3xl mx-auto">
            Solo necesitas 2 fotos: DNI del cliente y referencia catastral. 
            Nuestra IA genera todos los contratos inmobiliarios al instante.
          </p>
        </div>

        {/* How it works */}
        <div className="grid lg:grid-cols-3 gap-8 mb-16">
          <Card className="p-6 hover:shadow-lg transition-shadow group">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 text-white flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <span className="font-bold">1</span>
            </div>
            <Camera className="w-8 h-8 text-blue-600 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Fotografía el DNI
            </h3>
            <p className="text-slate-700">
              Una simple foto del DNI del cliente para extraer todos los datos personales automáticamente.
            </p>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow group">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 text-white flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <span className="font-bold">2</span>
            </div>
            <Home className="w-8 h-8 text-purple-600 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Captura la referencia catastral
            </h3>
            <p className="text-slate-700">
              Foto de cualquier documento con la referencia catastral. Extraemos todos los datos del inmueble.
            </p>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow group">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 text-white flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <span className="font-bold">3</span>
            </div>
            <Zap className="w-8 h-8 text-green-600 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Contratos listos al instante
            </h3>
            <p className="text-slate-700">
              Todos los contratos generados automáticamente con los datos correctos. Listos para firmar.
            </p>
          </Card>
        </div>

        {/* Contract Types Grid */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">
            Todos los contratos que necesitas
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {contractTypes.map((contract, index) => (
              <Card key={index} className="p-6 hover:shadow-lg transition-all hover:scale-105">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-slate-100">
                    <contract.icon className="w-5 h-5 text-slate-700" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-1">{contract.title}</h4>
                    <p className="text-sm text-slate-700 mb-2">{contract.description}</p>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3 text-green-600" />
                      <span className="text-xs text-green-600 font-medium">Genera en {contract.time}</span>
                    </div>
                  </div>
                </div>
              </Card>
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