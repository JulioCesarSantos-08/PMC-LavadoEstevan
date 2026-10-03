import {
    auth,
    googleProvider
} from "./firebase.js";

import {
    signInWithEmailAndPassword,
    signInWithPopup,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

const loginForm = document.getElementById("loginForm");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const passwordToggle = document.getElementById("passwordToggle");
const passwordIcon = document.getElementById("passwordIcon");

const loginButton = document.getElementById("loginButton");
const googleButton = document.getElementById("googleButton");

const loginError = document.getElementById("loginError");
const loginErrorText = document.getElementById("loginErrorText");

const toast = document.getElementById("toast");
const toastTitle = document.getElementById("toastTitle");
const toastMessage = document.getElementById("toastMessage");

let checkingSession = true;
let redirecting = false;

function setLoginLoading(loading) {
    loginButton.disabled = loading;
    googleButton.disabled = loading;

    loginButton.classList.toggle(
        "loading",
        loading
    );
}

function hideError() {
    loginError.classList.remove("show");
}

function showError(message) {
    loginErrorText.textContent = message;
    loginError.classList.add("show");
}

function showToast(
    title,
    message,
    type = "success"
) {
    toastTitle.textContent = title;
    toastMessage.textContent = message;

    toast.classList.toggle(
        "error",
        type === "error"
    );

    toast.classList.add("show");

    clearTimeout(showToast.timeout);

    showToast.timeout = setTimeout(
        () => {
            toast.classList.remove("show");
        },
        3500
    );
}

function getFirebaseErrorMessage(error) {
    const code = error?.code || "";

    const messages = {
        "auth/invalid-credential":
            "El correo o la contraseña no son correctos.",

        "auth/user-not-found":
            "No encontramos una cuenta con este correo.",

        "auth/wrong-password":
            "La contraseña no es correcta.",

        "auth/invalid-email":
            "Escribe un correo electrónico válido.",

        "auth/user-disabled":
            "Esta cuenta se encuentra deshabilitada.",

        "auth/too-many-requests":
            "Se realizaron demasiados intentos. Intenta nuevamente más tarde.",

        "auth/network-request-failed":
            "No pudimos conectarnos. Revisa tu conexión a internet.",

        "auth/popup-closed-by-user":
            "Se cerró la ventana de Google antes de terminar.",

        "auth/popup-blocked":
            "El navegador bloqueó la ventana de Google.",

        "auth/cancelled-popup-request":
            "El inicio de sesión fue cancelado.",

        "auth/unauthorized-domain":
            "Este dominio todavía no está autorizado en Firebase Authentication."
    };

    return (
        messages[code] ||
        "No fue posible iniciar sesión. Intenta nuevamente."
    );
}

function saveSessionUser(user) {
    const nombre =
        user.displayName ||
        user.email?.split("@")[0] ||
        "Usuario";

    const data = {
        uid: user.uid,
        nombre,
        email: user.email || "",
        foto: user.photoURL || "",
        proveedor:
            user.providerData?.[0]?.providerId ||
            ""
    };

    sessionStorage.setItem(
        "autolavadoUsuario",
        JSON.stringify(data)
    );

    return data;
}

function redirectToSystem(user) {
    if (redirecting) {
        return;
    }

    redirecting = true;

    saveSessionUser(user);

    window.location.replace(
        "index.html"
    );
}

async function enterSystem(user) {
    saveSessionUser(user);

    showToast(
        "Acceso correcto",
        "Preparando el sistema de Lavado y Engrasado Esteban."
    );

    setTimeout(
        () => {
            redirectToSystem(user);
        },
        450
    );
}

passwordToggle.addEventListener(
    "click",
    () => {
        const passwordVisible =
            passwordInput.type === "text";

        passwordInput.type =
            passwordVisible
                ? "password"
                : "text";

        passwordIcon.className =
            passwordVisible
                ? "fa-regular fa-eye"
                : "fa-regular fa-eye-slash";

        passwordToggle.setAttribute(
            "aria-label",
            passwordVisible
                ? "Mostrar contraseña"
                : "Ocultar contraseña"
        );
    }
);

emailInput.addEventListener(
    "input",
    hideError
);

passwordInput.addEventListener(
    "input",
    hideError
);

loginForm.addEventListener(
    "submit",
    async (event) => {
        event.preventDefault();

        hideError();

        const email =
            emailInput.value
                .trim()
                .toLowerCase();

        const password =
            passwordInput.value;

        if (!email) {
            showError(
                "Escribe tu correo electrónico."
            );

            emailInput.focus();

            return;
        }

        if (!password) {
            showError(
                "Escribe tu contraseña."
            );

            passwordInput.focus();

            return;
        }

        setLoginLoading(true);

        try {
            const credential =
                await signInWithEmailAndPassword(
                    auth,
                    email,
                    password
                );

            await enterSystem(
                credential.user
            );
        } catch (error) {
            console.error(
                "Error iniciando sesión:",
                error
            );

            showError(
                getFirebaseErrorMessage(error)
            );

            setLoginLoading(false);
        }
    }
);

googleButton.addEventListener(
    "click",
    async () => {
        hideError();

        setLoginLoading(true);

        try {
            const credential =
                await signInWithPopup(
                    auth,
                    googleProvider
                );

            await enterSystem(
                credential.user
            );
        } catch (error) {
            console.error(
                "Error iniciando sesión con Google:",
                error
            );

            showError(
                getFirebaseErrorMessage(error)
            );

            setLoginLoading(false);
        }
    }
);

onAuthStateChanged(
    auth,
    (user) => {
        if (!checkingSession) {
            return;
        }

        checkingSession = false;

        if (!user) {
            return;
        }

        setLoginLoading(true);

        redirectToSystem(user);
    }
);