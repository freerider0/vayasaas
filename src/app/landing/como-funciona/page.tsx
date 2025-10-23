'use client'

import { Navbar } from '../components/Navbar'
import { Footer } from '../components/Footer'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowRight, Check } from 'lucide-react'

const steps = [
  {
    number: '01',
    title: 'Crea tu cuenta',
    description: 'Registro en 2 minutos con tu email profesional. Incluye 1 certificado energético gratis para que pruebes el servicio.',
  },
  {
    number: '02',
    title: 'Solicita certificados',
    description: 'Rellena un simple formulario con los datos de la propiedad. Sin límites, todas las que necesites.',
  },
  {
    number: '03',
    title: 'Recibe en 48h',
    description: 'Certificado oficial firmado digitalmente y registrado. Listo para descargar desde tu panel.',
  },
  {
    number: '04',
    title: 'Factura sin comisiones',
    description: 'Con el plan Profesional (€100/mes), factura directamente al propietario y quédate el 100% de tus honorarios.',
  },
]

export default function ComoFunciona() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      {/* Hero Section with Video */}
      <section className="pt-32 pb-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Cómo funciona
            </h1>
            <p className="text-xl text-gray-800 leading-relaxed">
              Certificados ilimitados para tu inmobiliaria en 4 pasos simples.<br />
              Sin complicaciones, sin sorpresas.
            </p>
          </div>
          
          {/* Video Container */}
          <div className="max-w-4xl mx-auto">
            <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden shadow-lg">
              {/* Replace this div with your video player */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-4 bg-indigo-600 rounded-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M5 4v12l10-6z" />
                    </svg>
                  </div>
                  <p className="text-gray-800">Video explicativo (1 minuto)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Steps Section */}
      <section className="pb-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-24">
            {steps.map((step, index) => (
              <div key={index} className="flex flex-col md:flex-row gap-8 items-start">
                <div className="flex-shrink-0">
                  <div className="text-6xl font-bold text-gray-200">
                    {step.number}
                  </div>
                </div>
                <div className="flex-grow">
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">
                    {step.title}
                  </h2>
                  <p className="text-lg text-gray-800 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What's Included */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-12">
            ¿Qué incluye el servicio?
          </h2>
          
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-6">
                Certificados energéticos
              </h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                  <span className="text-gray-800">
                    Evaluación completa de eficiencia energética
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                  <span className="text-gray-800">
                    Registro oficial en ICAEN o organismo autonómico
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                  <span className="text-gray-800">
                    Certificado con firma digital del arquitecto
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                  <span className="text-gray-800">
                    Válido para venta y alquiler de inmuebles
                  </span>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-6">
                Cédulas de habitabilidad
              </h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                  <span className="text-gray-800">
                    Inspección de condiciones de habitabilidad
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                  <span className="text-gray-800">
                    Documento oficial para contratos de alquiler
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                  <span className="text-gray-800">
                    Tramitación completa incluida
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                  <span className="text-gray-800">
                    Visita técnica cuando sea necesaria
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-16 p-8 bg-white rounded-lg border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">
              Generación automática de contratos
            </h3>
            <p className="text-gray-800 mb-6">
              Con solo 2 fotos (DNI + referencia catastral) genera instantáneamente:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-gray-800">• Mandato de venta</div>
              <div className="text-gray-800">• Contrato de arras</div>
              <div className="text-gray-800">• Hoja de visita</div>
              <div className="text-gray-800">• Contrato de alquiler</div>
              <div className="text-gray-800">• Anexo inventario</div>
              <div className="text-gray-800">• Contrato exclusividad</div>
              <div className="text-gray-800">• Nota de encargo</div>
              <div className="text-gray-800">• Y más...</div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-12">
            Compara con el modelo tradicional
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-4 px-4 font-semibold text-gray-900">Concepto</th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-900">Modelo tradicional</th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-900">CertPro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="py-4 px-4 text-gray-800">Precio por certificado</td>
                  <td className="text-center py-4 px-4 text-gray-800">€250-350</td>
                  <td className="text-center py-4 px-4 font-semibold text-green-600">€0 (ilimitados)</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 text-gray-800">Tiempo de entrega</td>
                  <td className="text-center py-4 px-4 text-gray-800">5-10 días</td>
                  <td className="text-center py-4 px-4 font-semibold text-green-600">24-48h</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 text-gray-800">Facturación directa</td>
                  <td className="text-center py-4 px-4 text-gray-800">No disponible</td>
                  <td className="text-center py-4 px-4 font-semibold text-green-600">Sí (plan €100)</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 text-gray-800">Contratos automáticos</td>
                  <td className="text-center py-4 px-4 text-gray-800">No incluido</td>
                  <td className="text-center py-4 px-4 font-semibold text-green-600">Incluido</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 text-gray-800">Programa afiliados</td>
                  <td className="text-center py-4 px-4 text-gray-800">No existe</td>
                  <td className="text-center py-4 px-4 font-semibold text-green-600">Comisiones extra</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            Prueba gratis con tu primer certificado
          </h2>
          <p className="text-xl text-gray-800 mb-8">
            Sin tarjeta de crédito. Sin compromiso. <br />
            Comprueba la calidad de nuestro servicio.
          </p>
          <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700">
            Obtener Certificado Gratis
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  )
}