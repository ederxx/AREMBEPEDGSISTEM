import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import path from 'path';

/* -------------------------------------------------
 🔐 Inicialização do Firebase Admin
-------------------------------------------------- */

const serviceAccount = JSON.parse(
  readFileSync(
    path.resolve(__dirname, '../config/serviceAccountKey.json'),
    'utf8'
  )
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const { Timestamp } = admin.firestore;

/* -------------------------------------------------
 🧠 Utilitário seguro para datas
-------------------------------------------------- */

const toDateSafe = (value: any): Date | null => {
  if (!value) return null;

  if (value instanceof Timestamp) {
    return value.toDate();
  }

  if (typeof value === 'string') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  if (value instanceof Date) {
    return value;
  }

  return null;
};

/* -------------------------------------------------
 🔁 Migração de despesas de 2026
-------------------------------------------------- */

async function migrateExpenses2026() {
  const sourceRef = db.collection('expenses');
  const targetRef = db.collection('expenses_2026');

  const snapshot = await sourceRef.get();

  let migrated = 0;
  let skipped = 0;

  console.log(`📦 Total encontrado: ${snapshot.size}`);

  for (const doc of snapshot.docs) {
    const data = doc.data();

    const vencimento = toDateSafe(data.dataVencimento);
    if (!vencimento) {
      skipped++;
      continue;
    }

    if (vencimento.getFullYear() !== 2026) {
      skipped++;
      continue;
    }

    const targetDocRef = targetRef.doc(doc.id);

    // evita duplicação
    const exists = await targetDocRef.get();
    if (exists.exists) {
      skipped++;
      continue;
    }

    await targetDocRef.set({
      ...data,
      migratedFrom: 'expenses',
      migratedAt: Timestamp.now(),
    });

    migrated++;
    console.log(`✅ Migrado: ${doc.id}`);
  }

  console.log('----------------------------------');
  console.log(`🎉 Migração finalizada`);
  console.log(`✅ Migrados: ${migrated}`);
  console.log(`⏭️ Ignorados: ${skipped}`);
}

/* -------------------------------------------------
 🚀 Execução
-------------------------------------------------- */

migrateExpenses2026()
  .then(() => {
    console.log('🚀 Script concluído com sucesso');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Erro na migração:', err);
    process.exit(1);
  });
