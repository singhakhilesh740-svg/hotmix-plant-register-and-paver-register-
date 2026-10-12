/* Firebase setting — Firebase console → Project settings → General → "Your apps" → Web app (</>) → config
   wala object yahan paste karo. Ye config public hoti hai (secret nahi); suraksha Firestore rules se hoti hai.
   Jab tak ye null hai, app bina login ke (sirf is browser mein data) chalta hai. */
window.FIREBASE_CONFIG = null;
/* Udaharan:
window.FIREBASE_CONFIG = {
  apiKey: "AIza....",
  authDomain: "rnb-office.firebaseapp.com",
  projectId: "rnb-office",
  storageBucket: "rnb-office.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcd1234"
};
*/
