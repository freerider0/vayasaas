import { Shield, Award, FileCheck, Scale, Building, Users } from 'lucide-react'

export function TrustSection() {
  const credentials = [
    { 
      name: 'Colegiado COAC', 
      icon: Building,
      description: 'Colegio Oficial Arquitectos'
    },
    { 
      name: 'Certificador Energético', 
      icon: Award,
      description: 'Autorizado ICAEN'
    },
    { 
      name: 'Cumplimiento Legal', 
      icon: Scale,
      description: 'RD 390/2021'
    },
    { 
      name: 'Seguro Profesional', 
      icon: Shield,
      description: 'Cobertura 3M€'
    },
    { 
      name: 'Inspector ITE', 
      icon: FileCheck,
      description: 'Certificado Municipal'
    },
    { 
      name: 'Red de Inmobiliarias', 
      icon: Users,
      description: '500+ Partners'
    },
  ]

  return (
    <section className="py-16 bg-slate-50 border-y">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <p className="text-sm font-medium text-gray-700 uppercase tracking-wider">
            Arquitecto Profesional Certificado
          </p>
          <h2 className="text-2xl font-bold text-gray-900 mt-2">
            Cumplimiento Legal Total y Acreditaciones Profesionales
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 items-center">
          {credentials.map((credential) => (
            <div key={credential.name} className="flex flex-col items-center justify-center group hover:scale-105 transition-transform">
              <div className="p-3 rounded-lg bg-white shadow-sm group-hover:shadow-md transition-shadow mb-2">
                <credential.icon className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-sm font-semibold text-gray-900 text-center">{credential.name}</span>
              <span className="text-xs text-gray-700 text-center">{credential.description}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}