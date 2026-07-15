const { initializeApp } = require("firebase/app");
const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } = require("firebase/auth");

const firebaseConfig = {
  apiKey: "AIzaSyC1FkBslK7_cEUx-5hPOXSMMho0msxhIok",
  authDomain: "chai-chaska-dc795.firebaseapp.com",
  projectId: "chai-chaska-dc795",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function testAuth(email, password) {
  try {
    console.log(`Attempting login for ${email}...`);
    await signInWithEmailAndPassword(auth, email, password);
    console.log(`Login SUCCESS for ${email}`);
  } catch (err) {
    console.log(`Login FAILED for ${email}:`, err.code, err.message);
    if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found") {
      try {
        console.log(`Attempting signup for ${email}...`);
        await createUserWithEmailAndPassword(auth, email, password);
        console.log(`Signup SUCCESS for ${email}`);
      } catch (err2) {
        console.log(`Signup FAILED for ${email}:`, err2.code, err2.message);
      }
    }
  }
}

async function run() {
  await testAuth("admin123@gmail.com", "admin123");
  await testAuth("brewmaster@gmail.com", "brewmaster123");
  process.exit(0);
}
run();
