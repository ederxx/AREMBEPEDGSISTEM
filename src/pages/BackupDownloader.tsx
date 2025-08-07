import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input'; // certifique-se que esse componente existe

const BackupDownloader = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [password, setPassword] = useState('');
  const { user } = useAuth();

  const CORRECT_PASSWORD = '254923Ea';

  const handlePasswordSubmit = async () => {
    if (password !== CORRECT_PASSWORD) {
      setStatus('❌ Senha incorreta.');
      return;
    }
    await downloadBackup();
  };

  const downloadBackup = async () => {
    if (!user) {
      setStatus('Você precisa estar logado para fazer backup.');
      return;
    }

    setLoading(true);
    setStatus('Coletando dados...');

    try {
      const collectionNames = ['vehicles', 'drivers', 'services', 'quotes', 'depositos', 'expenses', 'garage','users'];
      const backupData: Record<string, any[]> = {};

      for (const colName of collectionNames) {
        const snapshot = await getDocs(collection(db, colName));
        const docs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        backupData[colName] = docs;
      }

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
      setShowPasswordInput(false);
      setPassword('');
    }
  };

  return (
    <div className="space-y-4">
      {showPasswordInput ? (
        <div className="space-y-2">
          <Input
            type="password"
            placeholder="Digite a senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button onClick={handlePasswordSubmit} disabled={loading}>
            {loading ? 'Verificando...' : 'Confirmar senha e baixar'}
          </Button>
        </div>
      ) : (
        <Button onClick={() => setShowPasswordInput(true)} disabled={loading}>
          {loading ? 'Gerando Backup...' : 'Baixar Backup do Firestore'}
        </Button>
      )}

      {status && <p className="text-sm text-muted-foreground">{status}</p>}
    </div>
  );
};

export default BackupDownloader;
