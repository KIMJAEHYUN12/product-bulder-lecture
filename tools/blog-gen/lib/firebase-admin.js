const admin = require('firebase-admin');
const path = require('path');

let app;

function getFirebaseAdmin() {
  if (app) return app;

  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
    || path.resolve(__dirname, '../../../serviceAccountKey.json');

  try {
    const serviceAccount = require(serviceAccountPath);
    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (err) {
    console.error('Firebase Admin 초기화 실패:', err.message);
    console.error('서비스 계정 키 경로:', serviceAccountPath);
    throw err;
  }

  return app;
}

function getFirestore() {
  getFirebaseAdmin();
  return admin.firestore();
}

module.exports = { getFirebaseAdmin, getFirestore };
