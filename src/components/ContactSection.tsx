
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, Mail, MapPin, Clock, MessageCircle } from 'lucide-react';

const ContactSection = () => {
  return (
    <section className="py-16 px-4 bg-gray-50">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <h3 className="text-4xl font-bold text-teal-primary mb-4">Entre em Contato</h3>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Estamos prontos para atender suas necessidades de transporte turístico
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Telefone */}
          <Card className="text-center hover:shadow-lg transition-shadow duration-300 border-0 shadow-md">
            <CardHeader className="pb-3">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-primary to-teal-secondary rounded-full flex items-center justify-center mx-auto mb-3">
                <Phone className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-lg text-teal-primary">Telefone</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-2">(71) 99985-8182</p>
              <p className="text-sm text-gray-500">WhatsApp disponível</p>
            </CardContent>
          </Card>

          {/* E-mail */}
          <Card className="text-center hover:shadow-lg transition-shadow duration-300 border-0 shadow-md">
            <CardHeader className="pb-3">
              <div className="w-16 h-16 bg-gradient-to-br from-gold to-gold-light rounded-full flex items-center justify-center mx-auto mb-3">
                <Mail className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-lg text-teal-primary">E-mail</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-2">arembepe@terra.com.br</p>
              <p className="text-sm text-gray-500">Resposta em até 2h</p>
            </CardContent>
          </Card>

          {/* Localização */}
          <Card className="text-center hover:shadow-lg transition-shadow duration-300 border-0 shadow-md">
            <CardHeader className="pb-3">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-primary to-teal-secondary rounded-full flex items-center justify-center mx-auto mb-3">
                <MapPin className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-lg text-teal-primary">Localização</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-2">Salvador, Bahia</p>
              <p className="text-sm text-gray-500">Atendemos toda a região</p>
            </CardContent>
          </Card>

          {/* Horário */}
          <Card className="text-center hover:shadow-lg transition-shadow duration-300 border-0 shadow-md">
            <CardHeader className="pb-3">
              <div className="w-16 h-16 bg-gradient-to-br from-gold to-gold-light rounded-full flex items-center justify-center mx-auto mb-3">
                <Clock className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-lg text-teal-primary">Atendimento</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-2">8h às 18h</p>
              <p className="text-sm text-gray-500">24h para emergências</p>
            </CardContent>
          </Card>
        </div>

        {/* Call to Action */}
        <div className="mt-12 text-center">
          <Card className="bg-gradient-to-r from-teal-primary to-teal-secondary text-white border-0 shadow-xl max-w-2xl mx-auto">
            <CardContent className="p-8">
              <div className="flex items-center justify-center mb-4">
                <MessageCircle className="w-8 h-8 mr-3" />
                <h4 className="text-2xl font-bold">Fale Conosco Agora</h4>
              </div>
              <p className="text-blue-100 mb-6 text-lg">
                Nossa equipe está pronta para criar a experiência de viagem perfeita para você
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a 
                  href="tel:+5571999999999" 
                  className="bg-white text-teal-primary px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors flex items-center justify-center"
                >
                  <Phone className="w-5 h-5 mr-2" />
                  Ligar Agora
                </a>
                <a 
                  href="https://wa.me/5571999999999" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-gold hover:bg-gold-light text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center"
                >
                  <MessageCircle className="w-5 h-5 mr-2" />
                  WhatsApp
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
