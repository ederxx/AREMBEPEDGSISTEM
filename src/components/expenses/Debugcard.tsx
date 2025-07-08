
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const DebugCard = () => {
  return (
    <Card className="mb-4 bg-blue-50 border-blue-200">
      <CardHeader>
        <CardTitle className="text-blue-800">Status da Conexão</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-blue-700">
          Verifique o console do navegador para logs de conexão com o Firebase.
          Abra as ferramentas de desenvolvedor (F12) e vá para a aba Console.
        </p>
      </CardContent>
    </Card>
  );
};

export default DebugCard;
