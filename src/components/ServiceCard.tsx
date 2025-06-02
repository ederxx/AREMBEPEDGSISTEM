
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, ArrowRight } from 'lucide-react';

interface Vehicle {
  type: string;
  price?: number;
  pricePerKm?: number;
  passengers: string;
}

interface Service {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  vehicles: Vehicle[];
  features: string[];
  note?: string;
}

interface ServiceCardProps {
  service: Service;
  onRequestQuote: () => void;
}

const ServiceCard = ({ service, onRequestQuote }: ServiceCardProps) => {
  const IconComponent = service.icon;

  return (
    <Card className="h-full bg-white/70 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-500 group hover:-translate-y-1 relative overflow-hidden">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent pointer-events-none" />
      
      <CardHeader className="relative z-10 text-center pb-4">
        <div className="w-16 h-16 bg-gradient-to-br from-teal-primary/10 to-teal-secondary/20 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
          <IconComponent className="w-8 h-8 text-teal-primary" />
        </div>
        <Badge variant="secondary" className="bg-gold/10 text-gold border-gold/20 mb-3 w-fit mx-auto">
          Premium
        </Badge>
        <h3 className="text-xl font-bold text-gray-900 mb-2">{service.title}</h3>
        <p className="text-gray-600 text-sm leading-relaxed">{service.description}</p>
      </CardHeader>

      <CardContent className="relative z-10 px-6">
        {/* Veículos com design minimalista */}
        <div className="mb-6">
          <h4 className="font-medium text-gray-800 mb-3 flex items-center text-sm">
            <Users className="w-4 h-4 mr-2 text-teal-primary" />
            Frota Disponível
          </h4>
          <div className="space-y-2">
            {service.vehicles.slice(0, 2).map((vehicle, index) => (
              <div key={index} className="flex justify-between items-center py-2 px-3 bg-gray-50/50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-800 text-sm">{vehicle.type}</div>
                  <div className="text-xs text-gray-500">{vehicle.passengers} passageiros</div>
                </div>
                <div className="text-right">
                  {vehicle.price && (
                    <div className="text-teal-primary font-bold text-sm">
                      R$ {vehicle.price.toLocaleString()}
                    </div>
                  )}
                  {vehicle.pricePerKm && (
                    <div className="text-teal-primary font-bold text-sm">
                      R$ {vehicle.pricePerKm}/km
                    </div>
                  )}
                </div>
              </div>
            ))}
            {service.vehicles.length > 2 && (
              <div className="text-xs text-gray-500 text-center py-2">
                +{service.vehicles.length - 2} veículos disponíveis
              </div>
            )}
          </div>
        </div>

        {/* Features com design clean */}
        <div className="mb-4">
          <ul className="space-y-1">
            {service.features.slice(0, 3).map((feature, index) => (
              <li key={index} className="flex items-center text-sm text-gray-600">
                <div className="w-1.5 h-1.5 bg-gold rounded-full mr-3" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {/* Nota com design sutil */}
        {service.note && (
          <div className="bg-amber-50/50 border border-amber-200/50 rounded-lg p-3 mb-4">
            <p className="text-xs text-amber-700">{service.note}</p>
          </div>
        )}
      </CardContent>

      <CardFooter className="relative z-10 p-6 pt-0">
        <Button 
          onClick={onRequestQuote}
          className="w-full bg-teal-primary hover:bg-teal-secondary text-white py-3 rounded-xl font-medium transition-all duration-300 flex items-center justify-center group-hover:bg-teal-secondary shadow-lg hover:shadow-xl"
        >
          Solicitar Orçamento
          <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ServiceCard;
