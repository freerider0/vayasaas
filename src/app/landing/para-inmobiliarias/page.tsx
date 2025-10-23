'use client'

import { Navbar } from '../components/Navbar'
import { Footer } from '../components/Footer'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowRight, Check, Euro, Clock, Users, TrendingUp } from 'lucide-react'

export default function ParaInmobiliarias() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      {/* Hero Section with Video */}
      <section className="pt-32 pb-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-sm font-medium text-gray-800 mb-4">
              500+ inmobiliarias ya ahorran con nosotros
            </p>
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Para inmobiliarias que 
              <span className="block text-indigo-600">quieren multiplicar ventas</span>
            </h1>
            <p className="text-xl text-gray-800 max-w-3xl mx-auto">
              Elimina el cuello de botella de los certificados. Ofrece un servicio más rápido, 
              ahorra miles cada mes y cierra más ventas.
            </p>
          </div>
          
          {/* Video Container */}
          <div className="max-w-4xl mx-auto mb-12">
            <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden shadow-lg">
              {/* Replace this div with your video player */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-4 bg-indigo-600 rounded-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M5 4v12l10-6z" />
                    </svg>
                  </div>
                  <p className="text-gray-800">Por qué 500+ inmobiliarias nos eligen (1 minuto)</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700">
              Prueba 1 Certificado Gratis
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline">
              Ver planes y precios
            </Button>
          </div>
        </div>
      </section>

      {/* Key Benefits */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-12">
            El problema que resolvemos
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Sin CertPro (modelo tradicional)
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="text-red-600 mt-1">✗</span>
                  <span className="text-gray-800">€250-350 por cada certificado</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-600 mt-1">✗</span>
                  <span className="text-gray-800">5-10 días de espera</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-600 mt-1">✗</span>
                  <span className="text-gray-800">Ventas perdidas por retrasos</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-600 mt-1">✗</span>
                  <span className="text-gray-800">Costes imprevisibles cada mes</span>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Con CertPro (ilimitados)
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                  <span className="text-gray-800">€0 por certificado (ilimitados)</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                  <span className="text-gray-800">24-48h garantizadas</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                  <span className="text-gray-800">Cierra ventas más rápido</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                  <span className="text-gray-800">Cuota fija mensual predecible</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <Euro className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
              <div className="text-3xl font-bold text-gray-900">€3.500</div>
              <div className="text-sm text-gray-800">Ahorro mensual medio</div>
            </div>
            <div className="text-center">
              <Clock className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
              <div className="text-3xl font-bold text-gray-900">48h</div>
              <div className="text-sm text-gray-800">Entrega garantizada</div>
            </div>
            <div className="text-center">
              <Users className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
              <div className="text-3xl font-bold text-gray-900">500+</div>
              <div className="text-sm text-gray-800">Inmobiliarias activas</div>
            </div>
            <div className="text-center">
              <TrendingUp className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
              <div className="text-3xl font-bold text-gray-900">92%</div>
              <div className="text-sm text-gray-800">Retención clientes</div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="p-12 bg-indigo-600 text-white">
            <blockquote className="text-2xl font-medium mb-6 leading-relaxed">
              "Pasamos de gastar €3.000/mes en certificados a solo €100. El ROI fue inmediato. 
              En 3 meses hemos triplicado las ventas gracias a la rapidez de entrega."
            </blockquote>
            <div>
              <div className="font-semibold">Pedro Sánchez</div>
              <div className="text-indigo-200">Director General, Grupo Inmobiliario Barcelona</div>
            </div>
            <div className="mt-4 text-lg font-semibold">
              €2.900/mes ahorrados
            </div>
          </Card>
        </div>
      </section>

      {/* ROI Calculator */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Calcula tu ahorro
          </h2>
          
          <Card className="p-8">
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div>
                <label className="text-sm text-gray-800">Certificados al mes</label>
                <div className="text-3xl font-bold text-gray-900">15</div>
              </div>
              <div>
                <label className="text-sm text-gray-800">Coste actual</label>
                <div className="text-3xl font-bold text-red-600">€3.750</div>
              </div>
              <div>
                <label className="text-sm text-gray-800">Con CertPro</label>
                <div className="text-3xl font-bold text-green-600">€100</div>
              </div>
            </div>
            
            <div className="border-t pt-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-lg text-gray-700">Ahorro mensual:</span>
                <span className="text-3xl font-bold text-green-600">€3.650</span>
              </div>
              <div className="text-sm text-gray-800">
                Ahorro anual: €43.800
              </div>
            </div>
          </Card>
          
          <div className="text-center mt-8">
            <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700">
              Empieza a ahorrar hoy
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Features Table */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-12">
            Comparativa completa
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-4 px-4 font-semibold text-gray-900">Característica</th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-900">Tradicional</th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-900">CertPro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="py-4 px-4 text-gray-800">Certificados al mes</td>
                  <td className="text-center py-4 px-4 text-gray-800">10 unidades</td>
                  <td className="text-center py-4 px-4 font-semibold text-green-600">Ilimitados</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 text-gray-800">Precio por certificado</td>
                  <td className="text-center py-4 px-4 text-gray-800">€250-350</td>
                  <td className="text-center py-4 px-4 font-semibold text-green-600">€0</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 text-gray-800">Tiempo de entrega</td>
                  <td className="text-center py-4 px-4 text-gray-800">5-10 días</td>
                  <td className="text-center py-4 px-4 font-semibold text-green-600">24-48h</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 text-gray-800">Facturación directa</td>
                  <td className="text-center py-4 px-4 text-gray-800">No</td>
                  <td className="text-center py-4 px-4 font-semibold text-green-600">Sí (€100/mes)</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 text-gray-800">Contratos automáticos</td>
                  <td className="text-center py-4 px-4 text-gray-800">No</td>
                  <td className="text-center py-4 px-4 font-semibold text-green-600">Incluido</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 text-gray-800">Programa afiliados</td>
                  <td className="text-center py-4 px-4 text-gray-800">No</td>
                  <td className="text-center py-4 px-4 font-semibold text-green-600">20% comisión</td>
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
            Únete a 500+ inmobiliarias que ya ahorran
          </h2>
          <p className="text-xl text-gray-800 mb-8">
            Primera certificado gratis. Sin tarjeta. Sin compromiso.
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