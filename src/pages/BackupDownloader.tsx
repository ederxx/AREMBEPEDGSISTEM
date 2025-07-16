import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/hooks/useAuth';

const BackupDownloader = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
 const { user } = useAuth();
  const downloadBackup = async () => {
    if (!user) {
      setStatus('Você precisa estar logado para fazer backup.');
      return;
    } setLoading(true);
    setStatus('Coletando dados...');

    try {
      // 🔁 Coleções do seu Firestore (adicione ou remova conforme necessário)
      const collectionNames = ['vehicles', 'drivers', 'services', 'quotes','depositos', 'expenses', 'garages', ];
      const backupData: Record<string, any[]> = {};

      for (const colName of collectionNames) {
        const snapshot = await getDocs(collection(db, colName));
        const docs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        backupData[colName] = docs;
      }

      // 📦 Criar o JSON e iniciar download
      const json = JSON.stringify(backupData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `firestore-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setStatus('✅ Backup baixado com sucesso.');
    } catch (err) {
      console.error('Erro ao gerar backup:', err);
      setStatus('❌ Erro ao gerar backup.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button onClick={downloadBackup} disabled={loading}>
        {loading ? 'Gerando Backup...' : 'Baixar Backup do Firestore'}
      </Button>
      {status && <p className="text-sm text-muted-foreground">{status}</p>}
    </div>
  );
};

export default BackupDownloader;
