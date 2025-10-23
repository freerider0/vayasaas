'use client'

import { useState } from 'react'
import { Navbar } from '../components/Navbar'
import { Footer } from '../components/Footer'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Phone,
  Mail,
  MapPin,
  Clock,
  Send,
  MessageSquare,
  Calendar,
  Building
} from 'lucide-react'

const contactInfo = [
  {
    icon: Phone,
    title: 'Teléfono',
    content: '+34 93 123 45 67',
    subtext: 'Lun-Vie 9:00-19:00',
  },
  {
    icon: Mail,
    title: 'Email',
    content: 'info@certpro.es',
    subtext: 'Respuesta en 24h',
  },
  {
    icon: MapPin,
    title: 'Oficina',
    content: 'Barcelona, España',
    subtext: 'Servicio en toda España',
  },
  {
    icon: Clock,
    title: 'Horario',
    content: '9:00 - 19:00',
    subtext: 'Lunes a Viernes',
  },
]

export default function Contacto() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    message: '',
    certificates: '10-20'
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle form submission
    console.log('Form submitted:', formData)
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-24 pb-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-800 mb-4">
              Respuesta en menos de 24h
            </p>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              Hablemos de tu inmobiliaria
            </h1>
            <p className="text-xl text-slate-700 max-w-3xl mx-auto">
              Descubre cómo podemos ayudarte a ahorrar miles de euros cada mes 
              con certificados ilimitados. Primera consulta gratuita.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Form & Info */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Contact Form */}
            <div className="lg:col-span-2">
              <Card className="p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Solicita tu certificado GRATIS
                </h2>
                <p className="text-slate-700 mb-8">
                  Completa el formulario y recibe tu primer certificado energético totalmente gratis. 
                  Sin compromiso, sin tarjeta de crédito.
                </p>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Nombre completo *
                      </label>
                      <Input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        placeholder="Juan García"
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Email profesional *
                      </label>
                      <Input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        placeholder="juan@inmobiliaria.com"
                        className="w-full"
                      />
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Teléfono *
                      </label>
                      <Input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        placeholder="+34 600 000 000"
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Inmobiliaria
                      </label>
                      <Input
                        type="text"
                        value={formData.company}
                        onChange={(e) => setFormData({...formData, company: e.target.value})}
                        placeholder="Nombre de tu inmobiliaria"
                        className="w-full"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      ¿Cuántos certificados necesitas al mes?
                    </label>
                    <select 
                      value={formData.certificates}
                      onChange={(e) => setFormData({...formData, certificates: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="1-5">1-5 certificados</option>
                      <option value="5-10">5-10 certificados</option>
                      <option value="10-20">10-20 certificados</option>
                      <option value="20-50">20-50 certificados</option>
                      <option value="50+">Más de 50 certificados</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Mensaje (opcional)
                    </label>
                    <textarea
                      value={formData.message}
                      onChange={(e) => setFormData({...formData, message: e.target.value})}
                      placeholder="Cuéntanos sobre tu inmobiliaria y tus necesidades..."
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                  </div>
                  
                  <Button 
                    type="submit"
                    size="lg"
                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                  >
                    Obtener Certificado Gratis
                    <Send className="ml-2 h-4 w-4" />
                  </Button>
                  
                  <p className="text-sm text-slate-600 text-center">
                    Al enviar este formulario, aceptas nuestros términos y condiciones. 
                    Tu información está protegida según RGPD.
                  </p>
                </form>
              </Card>
            </div>
            
            {/* Contact Information */}
            <div className="space-y-6">
              <Card className="p-6 border border-indigo-200 bg-indigo-50">
                <Building className="w-8 h-8 text-indigo-600 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Arquitecto Colegiado
                </h3>
                <p className="text-slate-700 mb-4">
                  Col. Nº 12345 COAC<br />
                  Seguro RC: 3M€<br />
                  15+ años de experiencia
                </p>
                <p className="text-sm font-medium text-green-700">
                  100% Legal y Certificado
                </p>
              </Card>
              
              {contactInfo.map((info, index) => (
                <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-slate-100">
                      <info.icon className="w-5 h-5 text-slate-700" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{info.title}</h4>
                      <p className="text-slate-700 font-medium">{info.content}</p>
                      <p className="text-sm text-slate-600">{info.subtext}</p>
                    </div>
                  </div>
                </Card>
              ))}
              
              <Card className="p-6 border border-green-200 bg-green-50">
                <Calendar className="w-8 h-8 text-green-600 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  ¿Prefieres una llamada?
                </h3>
                <p className="text-slate-700 mb-4">
                  Agenda una videollamada de 15 minutos con nuestro equipo.
                </p>
                <Button variant="outline" className="w-full">
                  Agendar Llamada
                </Button>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Preguntas frecuentes
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-2">
                ¿Cómo funciona el certificado gratis?
              </h3>
              <p className="text-slate-700">
                Te registras, solicitas tu primer certificado energético y lo recibes en 48h. 
                Sin compromiso, sin tarjeta de crédito.
              </p>
            </Card>
            
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-2">
                ¿Qué incluye cada plan?
              </h3>
              <p className="text-slate-700">
                €50: Un tipo de certificado ilimitado<br />
                €100: Ambos tipos + facturación directa<br />
                €200: Todo + 2 Matterport incluidos
              </p>
            </Card>
            
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-2">
                ¿Hay permanencia?
              </h3>
              <p className="text-slate-700">
                No, puedes cancelar cuando quieras. Sin penalizaciones ni letra pequeña.
              </p>
            </Card>
            
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-2">
                ¿Cuánto tardo en empezar?
              </h3>
              <p className="text-slate-700">
                El registro toma 2 minutos. Puedes solicitar tu primer certificado inmediatamente.
              </p>
            </Card>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}