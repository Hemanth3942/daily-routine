// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { 
    getAuth, 
    signInWithPopup, 
    GoogleAuthProvider, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";

// Replace with your Firebase project's configuration
const firebaseConfig = {
    apiKey: "AIzaSyDpuC3zi3ZARD6UTGSH9eGDqHs5kBSWcNM",
    authDomain: "daily-routine-schedule-app.firebaseapp.com",
    projectId: "daily-routine-schedule-app",
    storageBucket: "daily-routine-schedule-app.firebasestorage.app",
    messagingSenderId: "282751356018",
    appId: "1:282751356018:web:e772086ff8591cca6ac6eb"
};

// Initialize Firebase
let app, auth, provider;

try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    provider = new GoogleAuthProvider();
} catch (error) {
    console.error("Firebase Initialization Error:", error);
}

// UI Elements
const loggedOutView = document.getElementById('logged-out-view');
const loggedInView = document.getElementById('logged-in-view');
const btnGoogleSignIn = document.getElementById('btn-google-signin');
const btnSignOut = document.getElementById('btn-signout');
const userAvatar = document.getElementById('user-avatar');
const userName = document.getElementById('user-name');
const userEmail = document.getElementById('user-email');

// Global Auth State
window.currentUser = null;

// Auth State Observer
if (auth) {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // User is signed in
            window.currentUser = user;
            
            // Update UI
            loggedOutView.style.display = 'none';
            loggedInView.style.display = 'flex';
            
            const initialsDiv = document.getElementById('user-avatar-initials');
            if (user.photoURL) {
                userAvatar.src = user.photoURL;
                userAvatar.style.display = 'block';
                if (initialsDiv) initialsDiv.style.display = 'none';
            } else {
                userAvatar.style.display = 'none';
                if (initialsDiv) {
                    const name = user.displayName || 'U';
                    const parts = name.split(' ');
                    const initials = parts.length >= 2 
                        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
                        : name.substring(0, 2).toUpperCase();
                    initialsDiv.textContent = initials;
                    initialsDiv.style.display = 'flex';
                }
            }
            userName.textContent = user.displayName || 'Routine Planner User';
            userEmail.textContent = user.email || '';
            
            console.log("User logged in:", user.displayName);
            
            // Trigger app reload or sync if needed
            if (window.app && typeof window.app.onUserLogin === 'function') {
                window.app.onUserLogin(user);
            }
            
        } else {
            // User is signed out
            window.currentUser = null;
            
            // Update UI
            loggedOutView.style.display = 'flex';
            loggedInView.style.display = 'none';
            
            console.log("User logged out");
            
            if (window.app && typeof window.app.onUserLogout === 'function') {
                window.app.onUserLogout();
            }
        }
    });

    // Google Sign In
    btnGoogleSignIn.addEventListener('click', () => {
        if (firebaseConfig.apiKey === "YOUR_API_KEY") {
            alert("Firebase is not configured yet! Please provide your firebaseConfig to the assistant.");
            return;
        }
        
        signInWithPopup(auth, provider)
            .then((result) => {
                // This gives you a Google Access Token.
                const credential = GoogleAuthProvider.credentialFromResult(result);
                const token = credential.accessToken;
                const user = result.user;
                console.log("Successfully signed in!");
            }).catch((error) => {
                const errorCode = error.code;
                const errorMessage = error.message;
                console.error("Login failed:", errorCode, errorMessage);
                alert("Login failed: " + errorMessage);
            });
    });

    // Sign Out
    btnSignOut.addEventListener('click', () => {
        signOut(auth).then(() => {
            console.log("Successfully signed out!");
        }).catch((error) => {
            console.error("Sign out failed:", error);
        });
    });
}
