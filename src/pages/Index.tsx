import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Car, Bus, Users, MapPin, Phone, Mail, Clock, Shield, Settings } from 'lucide-react';
import ServiceCard from '@/components/ServiceCard';
import QuoteForm from '@/components/QuoteForm';
import ContactSection from '@/components/ContactSection';

const Index = () => {
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [selectedService, setSelectedService] = useState<string | null>(null);

  const services = [
    {
      id: 'trf',
      title: 'Transfer (TRF)',
      description: 'Translado confortável e seguro entre aeroportos, hotéis e pontos turísticos',
      icon: Car,
      vehicles: [
        { type: 'Van', price: 350, passengers: '7-14' },
        { type: 'Sedan', price: 250, passengers: '1-4' },
        { type: 'Micro-ônibus', price: 650, passengers: '15-25' },
        { type: 'Ônibus', price: 1200, passengers: '26-50' }
      ],
      features: ['Motorista experiente', 'Veículo climatizado', 'Pontualidade garantida']
    },
    {
      id: 'diaria',
      title: 'Diárias',
      description: 'Serviço completo de transporte por período de tempo determinado',
      icon: Clock,
      vehicles: [
        { type: 'Van', price: 100, passengers: '7-14' },
        { type: 'Sedan', price: 600, passengers: '1-4' },
        { type: 'Micro-ônibus', price: 1500, passengers: '15-25' },
        { type: 'Ônibus', price: 2500, passengers: '26-50' }
      ],
      features: ['Flexibilidade de horários', 'Múltiplos destinos', 'Acompanhamento personalizado'],
      note: 'Valores para Salvador. Acréscimo de R$ 400 para destinos até 250km'
    },
    {
      id: 'personalizada',
      title: 'Viagens Personalizadas',
      description: 'Experiências únicas e roteiros customizados para sua necessidade',
      icon: MapPin,
      vehicles: [
        { type: 'Van', pricePerKm: 4, passengers: '7-14' },
        { type: 'Sedan', pricePerKm: 3, passengers: '1-4' },
        { type: 'Micro-ônibus', pricePerKm: 8, passengers: '15-25' },
        { type: 'Ônibus', pricePerKm: 10, passengers: '26-50' }
      ],
      features: ['Roteiros exclusivos', 'Guia especializado', 'Experiência premium'],
      note: 'Apenas para distâncias acima de 250km. Motorista: R$ 350/dia + Carro: R$ 700/dia'
    }
  ];

  const handleRequestQuote = (serviceId: string) => {
    setSelectedService(serviceId);
    setShowQuoteForm(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-teal-50/20">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50 border-b border-white/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-teal-primary to-teal-secondary rounded-2xl flex items-center justify-center shadow-lg">
                <Bus className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-teal-primary">AREMBEPE TURISMO/DG TRANSPORTES</h1>
                <p className="text-sm text-gray-600">Experiências Premium em Turismo e transporte</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-6">
                <div className="flex items-center space-x-2 text-gray-600">
                  <Phone className="w-4 h-4" />
                  <span>(71) 9985-8182</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-600">
                  <Mail className="w-4 h-4" />
                  <span>arembepe@terra.com.br</span>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.href = '/auth'}
                className="border-teal-primary text-teal-primary hover:bg-teal-primary hover:text-white"
              >
                <Settings className="w-4 h-4 mr-2" />
                Admin
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section (agora com os serviços) */}
      <section
  className="relative flex flex-col justify-center items-center min-h-[60vh] px-2 py-8 bg-gradient-to-br from-white via-blue-50/30 to-teal-50/20 overflow-hidden"
  style={{ minHeight: 'calc(80vh - 100px)' }}
>
  <div className="container mx-auto">
    <div className="text-center mb-8">
      <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
        Nossos Serviços
      </h1>
      <p className="text-base md:text-lg text-gray-600 max-w-xl mx-auto font-light">
        Escolha o serviço ideal para sua necessidade e descubra o conforto de viajar conosco
      </p>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
      {services.map((service, index) => (
        <div
          key={service.id}
          className="animate-fade-in"
          style={{ animationDelay: `${index * 0.07}s` }}
        >
          <ServiceCard
            service={service}
            onRequestQuote={() => handleRequestQuote(service.id)}
            className="p-3 md:p-4 rounded-lg shadow-sm"
          />
        </div>
      ))}
    </div>
  </div>
</section>

      {/* Quote Form Modal */}
      {showQuoteForm && (
        <QuoteForm 
          selectedService={selectedService}
          services={services}
          onClose={() => setShowQuoteForm(false)}
        />
      )}

      {/* Contact Section */}
      <ContactSection />

      {/* Footer */}
      <footer className="bg-teal-secondary text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gold rounded-full flex items-center justify-center">
                  <Bus className="w-5 h-5 text-white" />
                </div>
                <h4 className="text-xl font-bold">AREMBEPE/DG</h4>
              </div>
              <p className="text-gray-300 leading-relaxed">
                Sua experiência em turismo merece o melhor transporte. 
                Conforto, segurança e qualidade em cada viagem.
              </p>
            </div>
            
            <div>
              <h5 className="text-lg font-semibold mb-4">Contato</h5>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4" />
                  <span>(71) 9985-8182</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4" />
                  <span>arembepe@terra.com.br</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4" />
                  <span>Salvador, Bahia</span>
                </div>
              </div>
            </div>
            
            <div>
              <h5 className="text-lg font-semibold mb-4">Horário de Atendimento</h5>
              <div className="space-y-1 text-gray-300">
                <p>Segunda à Sexta: 8h às 18h</p>
                <p>Sábado: 8h às 14h</p>
                <p>Domingo: Emergências</p>
                <p className="text-gold mt-2">24h para transfers</p>
              </div>
            </div>
          </div>
          
          <div className="border-t border-teal-primary mt-8 pt-8 text-center text-gray-300">
            <p>&copy; 2024 AREMBEPE/DG. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
