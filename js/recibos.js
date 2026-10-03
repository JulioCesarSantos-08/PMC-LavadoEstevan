import {
    auth,
    db
} from "./firebase.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    orderBy,
    limit,
    runTransaction,
    serverTimestamp,
    Timestamp
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const loadingScreen = document.getElementById("loadingScreen");

const userButton = document.getElementById("userButton");
const userMenu = document.getElementById("userMenu");
const logoutButton = document.getElementById("logoutButton");

const headerUserName = document.getElementById("headerUserName");
const menuUserName = document.getElementById("menuUserName");
const menuUserEmail = document.getElementById("menuUserEmail");
const welcomeUserName = document.getElementById("welcomeUserName");

const currentDayName = document.getElementById("currentDayName");
const currentDate = document.getElementById("currentDate");

const todayIncome = document.getElementById("todayIncome");
const todayExpenses = document.getElementById("todayExpenses");
const todayProfit = document.getElementById("todayProfit");

const nextFolio = document.getElementById("nextFolio");

const receiptDate = document.getElementById("receiptDate");
const receiptTime = document.getElementById("receiptTime");
const receiptEmployee = document.getElementById("receiptEmployee");

const receiptForm = document.getElementById("receiptForm");

const serviceInput = document.getElementById("service");
const otherServiceGroup = document.getElementById("otherServiceGroup");
const otherServiceInput = document.getElementById("otherService");

const customerNameInput = document.getElementById("customerName");
const vehicleInput = document.getElementById("vehicle");
const platesInput = document.getElementById("plates");
const paymentMethodInput = document.getElementById("paymentMethod");
const descriptionInput = document.getElementById("description");
const descriptionCounter = document.getElementById("descriptionCounter");
const amountInput = document.getElementById("amount");

const generateReceiptButton = document.getElementById(
    "generateReceiptButton"
);

const recentReceipts = document.getElementById("recentReceipts");

const newReceiptButton = document.getElementById("newReceiptButton");
const viewReceiptsButton = document.getElementById("viewReceiptsButton");
const expensesButton = document.getElementById("expensesButton");
const viewAllReceiptsButton = document.getElementById(
    "viewAllReceiptsButton"
);

const mobileHomeButton = document.getElementById("mobileHomeButton");
const mobileReceiptsButton = document.getElementById(
    "mobileReceiptsButton"
);
const mobileCreateButton = document.getElementById("mobileCreateButton");
const mobileExpensesButton = document.getElementById(
    "mobileExpensesButton"
);
const mobileProfileButton = document.getElementById(
    "mobileProfileButton"
);

const receiptResultModal = document.getElementById(
    "receiptResultModal"
);
const closeReceiptModal = document.getElementById(
    "closeReceiptModal"
);
const newReceiptAfterButton = document.getElementById(
    "newReceiptAfterButton"
);
const shareReceiptButton = document.getElementById(
    "shareReceiptButton"
);
const downloadReceiptButton = document.getElementById(
    "downloadReceiptButton"
);

const generatedFolioTitle = document.getElementById(
    "generatedFolioTitle"
);

const receiptExportContainer = document.getElementById(
    "receiptExportContainer"
);

const exportFolio = document.getElementById("exportFolio");
const exportDate = document.getElementById("exportDate");
const exportTime = document.getElementById("exportTime");
const exportService = document.getElementById("exportService");
const exportCustomer = document.getElementById("exportCustomer");
const exportVehicle = document.getElementById("exportVehicle");
const exportPlates = document.getElementById("exportPlates");
const exportAmount = document.getElementById("exportAmount");
const exportPayment = document.getElementById("exportPayment");
const exportEmployee = document.getElementById("exportEmployee");

const exportCustomerRow = document.getElementById(
    "exportCustomerRow"
);
const exportVehicleRow = document.getElementById(
    "exportVehicleRow"
);
const exportPlatesRow = document.getElementById(
    "exportPlatesRow"
);

const toast = document.getElementById("toast");
const toastTitle = document.getElementById("toastTitle");
const toastMessage = document.getElementById("toastMessage");

const counterRef = doc(
    db,
    "autolavado",
    "configuracion",
    "contadores",
    "recibos"
);

const receiptsCollection = collection(
    db,
    "autolavado",
    "recibos",
    "registros"
);

const expensesCollection = collection(
    db,
    "autolavado",
    "gastos",
    "registros"
);

const financeMovementsCollection = collection(
    db,
    "finanzas",
    "movimientos",
    "registros"
);

let currentUser = null;
let currentEmployee = null;
let currentGeneratedReceipt = null;
let submittingReceipt = false;

function formatMoney(value) {
    const amount = Number(value) || 0;

    return new Intl.NumberFormat(
        "es-MX",
        {
            style: "currency",
            currency: "MXN",
            minimumFractionDigits: 2
        }
    ).format(amount);
}

function formatFolio(value) {
    return `#${String(value).padStart(4, "0")}`;
}

function capitalizeFirst(value) {
    if (!value) {
        return "";
    }

    return (
        value.charAt(0).toUpperCase() +
        value.slice(1)
    );
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

    const icon = toast.querySelector(".toast-icon i");

    if (icon) {
        icon.className =
            type === "error"
                ? "fa-solid fa-circle-exclamation"
                : "fa-solid fa-circle-check";
    }

    toast.classList.add("show");

    clearTimeout(showToast.timeout);

    showToast.timeout = setTimeout(
        () => {
            toast.classList.remove("show");
        },
        3500
    );
}

function setLoadingScreen(show) {
    if (show) {
        loadingScreen.classList.remove("hide");
        return;
    }

    loadingScreen.classList.add("hide");
}

function setGenerateLoading(loading) {
    submittingReceipt = loading;

    generateReceiptButton.disabled = loading;

    generateReceiptButton.classList.toggle(
        "loading",
        loading
    );
}

function getLocalDateData(date = new Date()) {
    const dateText = new Intl.DateTimeFormat(
        "es-MX",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    ).format(date);

    const timeText = new Intl.DateTimeFormat(
        "es-MX",
        {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
        }
    ).format(date);

    const dayName = new Intl.DateTimeFormat(
        "es-MX",
        {
            weekday: "long"
        }
    ).format(date);

    const longDate = new Intl.DateTimeFormat(
        "es-MX",
        {
            day: "numeric",
            month: "long",
            year: "numeric"
        }
    ).format(date);

    return {
        dateText,
        timeText,
        dayName: capitalizeFirst(dayName),
        longDate
    };
}

function updateClock() {
    const now = new Date();

    const data = getLocalDateData(now);

    currentDayName.textContent = data.dayName;
    currentDate.textContent = data.longDate;

    receiptDate.textContent = data.dateText;
    receiptTime.textContent = data.timeText;
}

function scrollToReceiptForm() {
    document
        .getElementById("newReceiptSection")
        .scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    setTimeout(
        () => {
            serviceInput.focus({
                preventScroll: true
            });
        },
        500
    );
}

async function getEmployeeData(user) {
    let profile = null;

    try {
        const profileSnapshot = await getDoc(
            doc(
                db,
                "usuarios",
                user.uid
            )
        );

        if (profileSnapshot.exists()) {
            profile = profileSnapshot.data();
        }
    } catch (error) {
        console.warn(
            "No fue posible leer el perfil del usuario:",
            error
        );
    }

    const email =
        user.email ||
        profile?.email ||
        "";

    const fallbackEmailName =
        email.includes("@")
            ? email.split("@")[0]
            : "Usuario";

    const nombre =
        profile?.nombre ||
        user.displayName ||
        fallbackEmailName;

    return {
        uid: user.uid,
        nombre,
        email,
        foto: user.photoURL || ""
    };
}

function renderEmployee() {
    const firstName =
        currentEmployee.nombre
            .trim()
            .split(/\s+/)[0] ||
        "Usuario";

    headerUserName.textContent =
        currentEmployee.nombre;

    menuUserName.textContent =
        currentEmployee.nombre;

    menuUserEmail.textContent =
        currentEmployee.email;

    welcomeUserName.textContent =
        firstName;

    receiptEmployee.textContent =
        currentEmployee.nombre;
}

async function loadNextFolioPreview() {
    try {
        const snapshot = await getDoc(counterRef);

        const lastFolio =
            snapshot.exists()
                ? Number(
                    snapshot.data()?.ultimoFolio
                ) || 0
                : 0;

        nextFolio.textContent =
            formatFolio(lastFolio + 1);
    } catch (error) {
        console.error(
            "Error consultando folio:",
            error
        );

        nextFolio.textContent = "#----";
    }
}

function startOfToday() {
    const date = new Date();

    date.setHours(
        0,
        0,
        0,
        0
    );

    return date;
}

function isToday(value) {
    if (!value) {
        return false;
    }

    let date;

    if (
        typeof value?.toDate === "function"
    ) {
        date = value.toDate();
    } else if (
        value instanceof Date
    ) {
        date = value;
    } else {
        date = new Date(value);
    }

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return false;
    }

    return (
        date.getTime() >=
        startOfToday().getTime()
    );
}

async function loadTodaySummary() {
    let income = 0;
    let expenses = 0;

    try {
        const receiptsSnapshot =
            await getDocs(
                receiptsCollection
            );

        receiptsSnapshot.forEach(
            (receiptDocument) => {
                const data =
                    receiptDocument.data();

                if (
                    data.estado !== "eliminado" &&
                    isToday(
                        data.fecha ||
                        data.creadoEn
                    )
                ) {
                    income +=
                        Number(data.monto) || 0;
                }
            }
        );

        const expensesSnapshot =
            await getDocs(
                expensesCollection
            );

        expensesSnapshot.forEach(
            (expenseDocument) => {
                const data =
                    expenseDocument.data();

                if (
                    data.estado !== "eliminado" &&
                    isToday(
                        data.fecha ||
                        data.creadoEn
                    )
                ) {
                    expenses +=
                        Number(data.monto) || 0;
                }
            }
        );
    } catch (error) {
        console.error(
            "Error cargando resumen:",
            error
        );
    }

    const profit =
        income - expenses;

    todayIncome.textContent =
        formatMoney(income);

    todayExpenses.textContent =
        formatMoney(expenses);

    todayProfit.textContent =
        formatMoney(profit);

    todayProfit.classList.remove(
        "text-green",
        "text-red"
    );

    if (profit > 0) {
        todayProfit.classList.add(
            "text-green"
        );
    }

    if (profit < 0) {
        todayProfit.classList.add(
            "text-red"
        );
    }
}

function getReceiptDate(data) {
    const value =
        data.fecha ||
        data.creadoEn;

    if (
        value &&
        typeof value.toDate === "function"
    ) {
        return value.toDate();
    }

    if (value instanceof Date) {
        return value;
    }

    if (value) {
        const parsed = new Date(value);

        if (
            !Number.isNaN(
                parsed.getTime()
            )
        ) {
            return parsed;
        }
    }

    return null;
}

async function loadRecentReceipts() {
    recentReceipts.innerHTML = `
        <div class="empty-state">
            <div class="loading-spinner"></div>

            <p style="margin-top:12px;">
                Cargando recibos...
            </p>
        </div>
    `;

    try {
        const receiptsQuery = query(
            receiptsCollection,
            orderBy(
                "creadoEn",
                "desc"
            ),
            limit(5)
        );

        const snapshot =
            await getDocs(receiptsQuery);

        const receipts = [];

        snapshot.forEach(
            (receiptDocument) => {
                const data =
                    receiptDocument.data();

                if (
                    data.estado !== "eliminado"
                ) {
                    receipts.push({
                        id: receiptDocument.id,
                        ...data
                    });
                }
            }
        );

        if (!receipts.length) {
            recentReceipts.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <i class="fa-solid fa-receipt"></i>
                    </div>

                    <h3>
                        Aún no hay recibos
                    </h3>

                    <p>
                        Los últimos recibos generados aparecerán aquí.
                    </p>
                </div>
            `;

            return;
        }

        recentReceipts.innerHTML =
            receipts
                .map(
                    (receipt) => {
                        const date =
                            getReceiptDate(
                                receipt
                            );

                        const dateLabel =
                            date
                                ? new Intl.DateTimeFormat(
                                    "es-MX",
                                    {
                                        day: "2-digit",
                                        month: "short",
                                        hour: "2-digit",
                                        minute: "2-digit"
                                    }
                                ).format(date)
                                : "";

                        const service =
                            receipt.servicio ||
                            "Servicio";

                        return `
                            <button
                                type="button"
                                class="recent-receipt-item"
                                data-receipt-id="${receipt.id}"
                            >
                                <span class="recent-receipt-icon">
                                    <i class="fa-solid fa-receipt"></i>
                                </span>

                                <span class="recent-receipt-info">
                                    <strong>
                                        ${escapeHtml(service)}
                                    </strong>

                                    <span>
                                        ${formatFolio(receipt.folio)}
                                        ·
                                        ${escapeHtml(dateLabel)}
                                    </span>
                                </span>

                                <span class="recent-receipt-total">
                                    <strong>
                                        ${formatMoney(receipt.monto)}
                                    </strong>

                                    <small>
                                        ${escapeHtml(
                                            receipt.metodoPago ||
                                            ""
                                        )}
                                    </small>
                                </span>
                            </button>
                        `;
                    }
                )
                .join("");

        document
            .querySelectorAll(
                "[data-receipt-id]"
            )
            .forEach(
                (button) => {
                    button.addEventListener(
                        "click",
                        () => {
                            window.location.href =
                                `recibos.html?id=${encodeURIComponent(
                                    button.dataset.receiptId
                                )}`;
                        }
                    );
                }
            );
    } catch (error) {
        console.error(
            "Error cargando recibos recientes:",
            error
        );

        recentReceipts.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                </div>

                <h3>
                    No pudimos cargar los recibos
                </h3>

                <p>
                    Revisa tu conexión o los permisos de Firestore.
                </p>
            </div>
        `;
    }
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function getSelectedService() {
    if (
        serviceInput.value === "Otro"
    ) {
        return otherServiceInput.value.trim();
    }

    return serviceInput.value.trim();
}

function validateReceipt() {
    const service =
        getSelectedService();

    const amount =
        Number(amountInput.value);

    if (!service) {
        showToast(
            "Falta el servicio",
            "Selecciona o escribe el servicio realizado.",
            "error"
        );

        if (
            serviceInput.value === "Otro"
        ) {
            otherServiceInput.focus();
        } else {
            serviceInput.focus();
        }

        return false;
    }

    if (
        !Number.isFinite(amount) ||
        amount <= 0
    ) {
        showToast(
            "Monto incorrecto",
            "Escribe un monto mayor a $0.00.",
            "error"
        );

        amountInput.focus();

        return false;
    }

    return true;
}

async function createReceipt() {
    if (
        submittingReceipt ||
        !currentUser ||
        !currentEmployee
    ) {
        return;
    }

    if (!validateReceipt()) {
        return;
    }

    setGenerateLoading(true);

    const now = new Date();

    const service =
        getSelectedService();

    const amount =
        Number(
            Number(
                amountInput.value
            ).toFixed(2)
        );

    const receiptDocumentRef =
        doc(receiptsCollection);

    const financeMovementRef =
        doc(
            financeMovementsCollection,
            `autolavado_${receiptDocumentRef.id}`
        );

    try {
        const result =
            await runTransaction(
                db,
                async (transaction) => {
                    const counterSnapshot =
                        await transaction.get(
                            counterRef
                        );

                    const currentFolio =
                        counterSnapshot.exists()
                            ? Number(
                                counterSnapshot
                                    .data()
                                    ?.ultimoFolio
                            ) || 0
                            : 0;

                    const folio =
                        currentFolio + 1;

                    const timestamp =
                        Timestamp.fromDate(now);

                    const receiptData = {
                        folio,

                        servicio: service,

                        cliente:
                            customerNameInput.value
                                .trim(),

                        vehiculo:
                            vehicleInput.value
                                .trim(),

                        placas:
                            platesInput.value
                                .trim()
                                .toUpperCase(),

                        descripcion:
                            descriptionInput.value
                                .trim(),

                        metodoPago:
                            paymentMethodInput.value,

                        monto: amount,

                        moneda: "MXN",

                        empleadoUid:
                            currentEmployee.uid,

                        empleadoNombre:
                            currentEmployee.nombre,

                        empleadoEmail:
                            currentEmployee.email,

                        estado: "activo",

                        origen: "autolavado",

                        fecha: timestamp,

                        creadoEn: timestamp,

                        actualizadoEn: timestamp,

                        movimientoFinancieroId:
                            financeMovementRef.id,

                        registradoEnFinanzas:
                            true
                    };

                    const financeData = {
                        tipo: "ingreso",

                        monto: amount,

                        concepto:
                            `Recibo de autolavado ${formatFolio(
                                folio
                            )}`,

                        categoria:
                            "Autolavado",

                        origen:
                            "autolavado",

                        moneda:
                            "MXN",

                        folio,

                        reciboId:
                            receiptDocumentRef.id,

                        servicio:
                            service,

                        metodoPago:
                            paymentMethodInput.value,

                        registradoPorUid:
                            currentEmployee.uid,

                        registradoPorNombre:
                            currentEmployee.nombre,

                        registradoPorEmail:
                            currentEmployee.email,

                        fecha: timestamp,

                        creadoEn: timestamp,

                        actualizadoEn: timestamp,

                        estado: "activo"
                    };

                    transaction.set(
                        counterRef,
                        {
                            ultimoFolio: folio,
                            actualizadoEn: timestamp
                        },
                        {
                            merge: true
                        }
                    );

                    transaction.set(
                        receiptDocumentRef,
                        receiptData
                    );

                    transaction.set(
                        financeMovementRef,
                        financeData
                    );

                    return {
                        id:
                            receiptDocumentRef.id,

                        ...receiptData
                    };
                }
            );

        currentGeneratedReceipt =
            result;

        renderGeneratedReceipt(
            result
        );

        openReceiptModal();

        receiptForm.reset();

        otherServiceGroup.hidden =
            true;

        otherServiceInput.required =
            false;

        descriptionCounter.textContent =
            "0";

        updateClock();

        await Promise.all([
            loadNextFolioPreview(),
            loadTodaySummary(),
            loadRecentReceipts()
        ]);

        showToast(
            "Recibo guardado",
            `${formatFolio(
                result.folio
            )} fue registrado correctamente.`
        );
    } catch (error) {
        console.error(
            "Error generando recibo:",
            error
        );

        showToast(
            "No se pudo generar",
            "El recibo no fue guardado. Revisa los permisos de Firestore e intenta nuevamente.",
            "error"
        );
    } finally {
        setGenerateLoading(false);
    }
}

function renderGeneratedReceipt(receipt) {
    const date =
        getReceiptDate(receipt) ||
        new Date();

    const dateData =
        getLocalDateData(date);

    const folio =
        formatFolio(receipt.folio);

    generatedFolioTitle.textContent =
        folio;

    exportFolio.textContent =
        folio;

    exportDate.textContent =
        dateData.dateText;

    exportTime.textContent =
        dateData.timeText;

    exportService.textContent =
        receipt.servicio;

    exportAmount.textContent =
        formatMoney(receipt.monto);

    exportPayment.textContent =
        receipt.metodoPago;

    exportEmployee.textContent =
        receipt.empleadoNombre;

    if (receipt.cliente) {
        exportCustomerRow.hidden =
            false;

        exportCustomer.textContent =
            receipt.cliente;
    } else {
        exportCustomerRow.hidden =
            true;
    }

    if (receipt.vehiculo) {
        exportVehicleRow.hidden =
            false;

        exportVehicle.textContent =
            receipt.vehiculo;
    } else {
        exportVehicleRow.hidden =
            true;
    }

    if (receipt.placas) {
        exportPlatesRow.hidden =
            false;

        exportPlates.textContent =
            receipt.placas;
    } else {
        exportPlatesRow.hidden =
            true;
    }
}

function openReceiptModal() {
    receiptResultModal.classList.add(
        "show"
    );

    receiptResultModal.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.classList.add(
        "no-scroll"
    );
}

function closeGeneratedReceiptModal() {
    receiptResultModal.classList.remove(
        "show"
    );

    receiptResultModal.setAttribute(
        "aria-hidden",
        "true"
    );

    document.body.classList.remove(
        "no-scroll"
    );
}

async function createReceiptCanvas() {
    if (
        typeof window.html2canvas !==
        "function"
    ) {
        throw new Error(
            "html2canvas no está disponible."
        );
    }

    const canvas =
        await window.html2canvas(
            receiptExportContainer,
            {
                scale: 3,
                useCORS: true,
                allowTaint: false,
                backgroundColor: "#ffffff",
                logging: false,
                imageTimeout: 15000,
                removeContainer: true
            }
        );

    return canvas;
}

function canvasToBlob(canvas) {
    return new Promise(
        (resolve, reject) => {
            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(
                            new Error(
                                "No se pudo crear la imagen."
                            )
                        );

                        return;
                    }

                    resolve(blob);
                },
                "image/png",
                1
            );
        }
    );
}

async function downloadReceiptImage() {
    if (!currentGeneratedReceipt) {
        return;
    }

    downloadReceiptButton.disabled =
        true;

    try {
        const canvas =
            await createReceiptCanvas();

        const link =
            document.createElement("a");

        link.download =
            `Recibo-${String(
                currentGeneratedReceipt.folio
            ).padStart(4, "0")}.png`;

        link.href =
            canvas.toDataURL(
                "image/png",
                1
            );

        document.body.appendChild(link);

        link.click();
        link.remove();

        showToast(
            "Imagen guardada",
            "El recibo fue generado en formato PNG."
        );
    } catch (error) {
        console.error(
            "Error descargando recibo:",
            error
        );

        showToast(
            "No se pudo crear la imagen",
            "Intenta nuevamente.",
            "error"
        );
    } finally {
        downloadReceiptButton.disabled =
            false;
    }
}

function buildWhatsAppMessage(receipt) {
    return (
        `Hola 👋\n\n` +
        `Gracias por visitar *Lavado y Engrasado Esteban*.\n\n` +
        `Te compartimos tu recibo ${formatFolio(
            receipt.folio
        )} correspondiente a tu servicio de *${receipt.servicio}*.\n\n` +
        `Total: *${formatMoney(
            receipt.monto
        )} MXN*\n\n` +
        `¡Gracias por tu preferencia! 🚘✨`
    );
}

async function shareReceiptImage() {
    if (!currentGeneratedReceipt) {
        return;
    }

    shareReceiptButton.disabled =
        true;

    try {
        const canvas =
            await createReceiptCanvas();

        const blob =
            await canvasToBlob(canvas);

        const file =
            new File(
                [blob],
                `Recibo-${String(
                    currentGeneratedReceipt.folio
                ).padStart(4, "0")}.png`,
                {
                    type: "image/png"
                }
            );

        const message =
            buildWhatsAppMessage(
                currentGeneratedReceipt
            );

        if (
            navigator.share &&
            navigator.canShare &&
            navigator.canShare({
                files: [file]
            })
        ) {
            await navigator.share({
                title:
                    `Recibo ${formatFolio(
                        currentGeneratedReceipt.folio
                    )}`,
                text: message,
                files: [file]
            });

            return;
        }

        const link =
            document.createElement("a");

        link.download = file.name;

        link.href =
            URL.createObjectURL(blob);

        document.body.appendChild(link);

        link.click();
        link.remove();

        setTimeout(
            () => {
                URL.revokeObjectURL(
                    link.href
                );
            },
            1000
        );

        const whatsappUrl =
            `https://wa.me/?text=${encodeURIComponent(
                message
            )}`;

        window.open(
            whatsappUrl,
            "_blank",
            "noopener,noreferrer"
        );

        showToast(
            "Imagen preparada",
            "Tu navegador no permite adjuntar la imagen automáticamente. Se guardó el PNG y se abrió WhatsApp para que puedas adjuntarlo."
        );
    } catch (error) {
        if (
            error?.name === "AbortError"
        ) {
            return;
        }

        console.error(
            "Error compartiendo recibo:",
            error
        );

        showToast(
            "No se pudo compartir",
            "Intenta guardar la imagen y compartirla manualmente.",
            "error"
        );
    } finally {
        shareReceiptButton.disabled =
            false;
    }
}

function goToReceipts() {
    window.location.href =
        "recibos.html";
}

function goToExpenses() {
    window.location.href =
        "gastos.html";
}

async function initializeSystem(user) {
    currentUser = user;

    try {
        currentEmployee =
            await getEmployeeData(
                user
            );

        renderEmployee();

        updateClock();

        await Promise.all([
            loadNextFolioPreview(),
            loadTodaySummary(),
            loadRecentReceipts()
        ]);
    } catch (error) {
        console.error(
            "Error iniciando sistema:",
            error
        );

        showToast(
            "Error de carga",
            "Algunos datos no pudieron cargarse.",
            "error"
        );
    } finally {
        setLoadingScreen(false);
    }
}

serviceInput.addEventListener(
    "change",
    () => {
        const isOther =
            serviceInput.value === "Otro";

        otherServiceGroup.hidden =
            !isOther;

        otherServiceInput.required =
            isOther;

        if (isOther) {
            setTimeout(
                () => {
                    otherServiceInput.focus();
                },
                100
            );
        } else {
            otherServiceInput.value = "";
        }
    }
);

descriptionInput.addEventListener(
    "input",
    () => {
        descriptionCounter.textContent =
            String(
                descriptionInput.value.length
            );
    }
);

platesInput.addEventListener(
    "input",
    () => {
        platesInput.value =
            platesInput.value.toUpperCase();
    }
);

receiptForm.addEventListener(
    "submit",
    async (event) => {
        event.preventDefault();

        await createReceipt();
    }
);

userButton.addEventListener(
    "click",
    (event) => {
        event.stopPropagation();

        userMenu.classList.toggle(
            "show"
        );
    }
);

document.addEventListener(
    "click",
    (event) => {
        if (
            !userMenu.contains(
                event.target
            ) &&
            !userButton.contains(
                event.target
            )
        ) {
            userMenu.classList.remove(
                "show"
            );
        }
    }
);

logoutButton.addEventListener(
    "click",
    async () => {
        try {
            sessionStorage.removeItem(
                "autolavadoUsuario"
            );

            await signOut(auth);

            window.location.replace(
                "login.html"
            );
        } catch (error) {
            console.error(
                "Error cerrando sesión:",
                error
            );

            showToast(
                "No se pudo cerrar sesión",
                "Intenta nuevamente.",
                "error"
            );
        }
    }
);

newReceiptButton.addEventListener(
    "click",
    scrollToReceiptForm
);

mobileCreateButton.addEventListener(
    "click",
    scrollToReceiptForm
);

mobileHomeButton.addEventListener(
    "click",
    () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }
);

viewReceiptsButton.addEventListener(
    "click",
    goToReceipts
);

viewAllReceiptsButton.addEventListener(
    "click",
    goToReceipts
);

mobileReceiptsButton.addEventListener(
    "click",
    goToReceipts
);

expensesButton.addEventListener(
    "click",
    goToExpenses
);

mobileExpensesButton.addEventListener(
    "click",
    goToExpenses
);

mobileProfileButton.addEventListener(
    "click",
    () => {
        userMenu.classList.toggle(
            "show"
        );

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }
);

closeReceiptModal.addEventListener(
    "click",
    closeGeneratedReceiptModal
);

receiptResultModal
    .querySelectorAll(
        "[data-close-receipt-modal]"
    )
    .forEach(
        (element) => {
            element.addEventListener(
                "click",
                closeGeneratedReceiptModal
            );
        }
    );

newReceiptAfterButton.addEventListener(
    "click",
    () => {
        closeGeneratedReceiptModal();

        scrollToReceiptForm();
    }
);

downloadReceiptButton.addEventListener(
    "click",
    downloadReceiptImage
);

shareReceiptButton.addEventListener(
    "click",
    shareReceiptImage
);

document.addEventListener(
    "keydown",
    (event) => {
        if (
            event.key === "Escape" &&
            receiptResultModal.classList.contains(
                "show"
            )
        ) {
            closeGeneratedReceiptModal();
        }
    }
);

setInterval(
    updateClock,
    30000
);

onAuthStateChanged(
    auth,
    async (user) => {
        if (!user) {
            window.location.replace(
                "login.html"
            );

            return;
        }

        await initializeSystem(user);
    }
);