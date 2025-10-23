'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu'
import { Menu, X } from 'lucide-react'

const solutions = [
  {
    title: 'Certificado Energético',
    href: '/landing#features',
    description: 'Certificados oficiales de eficiencia energética para viviendas y locales comerciales.',
  },
  {
    title: 'Cédula de Habitabilidad',
    href: '/landing#features',
    description: 'Evaluaciones legales de habitabilidad para transacciones y alquileres.',
  },
  {
    title: 'Generación de Contratos',
    href: '/landing#contracts',
    description: '✨ NUEVO: Genera todos los contratos con solo 2 fotos. Mandatos, arras, hojas de visita.',
  },
  {
    title: 'Inspección Técnica (ITE)',
    href: '/landing#features',
    description: 'Informes ITE completos para edificios de más de 45 años.',
  },
]

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
      isScrolled ? 'bg-white/95 backdrop-blur-md shadow-sm' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/landing" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg" />
              <span className="font-semibold text-xl text-gray-900">CertPro</span>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-8">
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="bg-transparent text-gray-700 hover:text-gray-900">Certificados</NavigationMenuTrigger>
                  <NavigationMenuContent className="bg-white border border-gray-200 shadow-lg">
                    <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 bg-white">
                      {solutions.map((item) => (
                        <li key={item.title}>
                          <NavigationMenuLink asChild>
                            <a
                              href={item.href}
                              className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-gray-50 focus:bg-gray-50"
                            >
                              <div className="text-sm font-medium leading-none text-gray-900">{item.title}</div>
                              <p className="line-clamp-2 text-sm leading-snug text-gray-700">
                                {item.description}
                              </p>
                            </a>
                          </NavigationMenuLink>
                        </li>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <Link href="/landing#pricing" className="text-sm font-medium text-gray-700 hover:text-gray-900 px-3 py-2">
                    Precios
                  </Link>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <Link href="/landing/como-funciona" className="text-sm font-medium text-gray-700 hover:text-gray-900 px-3 py-2">
                    Cómo Funciona
                  </Link>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <Link href="/landing/para-inmobiliarias" className="text-sm font-medium text-gray-700 hover:text-gray-900 px-3 py-2">
                    Para Inmobiliarias
                  </Link>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <Button variant="ghost" size="sm" className="text-gray-700 hover:text-gray-900">
              Acceder
            </Button>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
              Empezar Ahora
            </Button>
          </div>

          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-gray-700 hover:text-gray-900"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t">
          <div className="px-4 pt-2 pb-3 space-y-1">
            <Link href="/landing#features" className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900">
              Certificados
            </Link>
            <Link href="/landing#pricing" className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900">
              Precios
            </Link>
            <Link href="/landing/como-funciona" className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900">
              Cómo Funciona
            </Link>
            <Link href="/landing/para-inmobiliarias" className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900">
              Para Inmobiliarias
            </Link>
          </div>
          <div className="px-4 py-3 space-y-2 border-t">
            <Button variant="outline" className="w-full">Acceder</Button>
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700">Empezar Ahora</Button>
          </div>
        </div>
      )}
    </nav>
  )
}