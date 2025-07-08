import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyARVeIf1WvUs3UxQnOHdMpDtcXX1pVVC1E",
  authDomain: "arembepe-714b7.firebaseapp.com",
  databaseURL: "https://arembepe-714b7-default-rtdb.firebaseio.com",
  projectId: "arembepe-714b7",
  storageBucket: "arembepe-714b7.firebasestorage.app",
  messagingSenderId: "252600565144",
  appId: "1:252600565144:web:12ee333473769457737fed"
};

console.log('Inicializando Firebase com configuração:', firebaseConfig);

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Log para verificar se a conexão foi estabelecida
console.log('Firebase inicializado com sucesso');
console.log('Firestore:', db);
console.log('Auth:', auth);
console.log('Storage:', storage);

export default app;
