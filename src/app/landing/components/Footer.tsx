import Link from 'next/link'
import { Separator } from '@/components/ui/separator'
import { X, Linkedin, Github, Youtube } from 'lucide-react'

const footerLinks = {
  Servicios: [
    { name: 'Certificados Energéticos', href: '/landing#features' },
    { name: 'Cédulas de Habitabilidad', href: '/landing#features' },
    { name: 'Generación de Contratos', href: '/landing#contracts' },
    { name: 'Tours Matterport', href: '/landing#pricing' },
    { name: 'Fotografía', href: '/landing#pricing' },
  ],
  'Para Inmobiliarias': [
    { name: 'Precios', href: '/landing#pricing' },
    { name: 'Programa de Afiliados', href: '/landing/para-inmobiliarias' },
    { name: 'Facturación Directa', href: '/landing/para-inmobiliarias' },
    { name: 'Calculadora ROI', href: '/landing/para-inmobiliarias' },
    { name: 'Casos de Éxito', href: '/landing#testimonials' },
  ],
  Recursos: [
    { name: 'Cómo Funciona', href: '/landing/como-funciona' },
    { name: 'Requisitos Legales', href: '/landing/contacto' },
    { name: 'Preguntas Frecuentes', href: '/landing/contacto' },
    { name: 'Soporte', href: '/landing/contacto' },
    { name: 'Blog', href: '#' },
  ],
  Legal: [
    { name: 'Privacidad', href: '#' },
    { name: 'Términos', href: '#' },
    { name: 'Registro COAC', href: '#' },
    { name: 'Seguro RC', href: '#' },
    { name: 'Cumplimiento', href: '#' },
  ],
}

const socialLinks = [
  { name: 'Twitter', icon: X, href: '#' },
  { name: 'LinkedIn', icon: Linkedin, href: '#' },
  { name: 'GitHub', icon: Github, href: '#' },
  { name: 'YouTube', icon: Youtube, href: '#' },
]

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg" />
              <span className="font-semibold text-xl text-white">CertPro</span>
            </Link>
            <p className="text-sm text-gray-400 mb-4">
              Arquitecto profesional ofreciendo certificados inmobiliarios ilimitados para agencias.
            </p>
            <div className="flex space-x-3">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                  aria-label={social.name}
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="font-semibold text-white mb-4">{category}</h3>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.name}>
                    <Link 
                      href={link.href}
                      className="text-sm hover:text-white transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="bg-gray-800 mb-8" />

        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="text-sm text-gray-400">
            © 2024 CertPro. Arquitecto Colegiado Nº 12345 COAC
          </div>
          <div className="flex space-x-6 text-sm">
            <Link href="#" className="hover:text-white transition-colors">
              Política de Privacidad
            </Link>
            <Link href="#" className="hover:text-white transition-colors">
              Términos de Servicio
            </Link>
            <Link href="#" className="hover:text-white transition-colors">
              Configuración de Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}