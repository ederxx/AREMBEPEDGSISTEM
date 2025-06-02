
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDd3NWNEIun-P_T1ncBbK488OBg-3KYIJ8",
  authDomain: "arembepe-711b4.firebaseapp.com",
  projectId: "arembepe-711b4",
  storageBucket: "arembepe-711b4.firebasestorage.app",
  messagingSenderId: "857753703784",
  appId: "1:857753703784:web:63003d2e3d2348d00eb2dd"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
