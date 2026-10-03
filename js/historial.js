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
    runTransaction,
    Timestamp
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const loadingScreen = document.getElementById("loadingScreen");

const userButton = document.getElementById("userButton");
const userMenu = document.getElementById("userMenu");
const logoutButton = document.getElementById("logoutButton");

const headerUserName = document.getElementById("headerUserName");
const menuUserName = document.getElementById("menuUserName");
const menuUserEmail = document.getElementById("menuUserEmail");

const totalReceipts = document.getElementById("totalReceipts");
const totalReceiptIncome = document.getElementById("totalReceiptIncome");
const todayReceiptCount = document.getElementById("todayReceiptCount");

const receiptSearch = document.getElementById("receiptSearch");
const clearSearchButton = document.getElementById("clearSearchButton");
const dateFilter = document.getElementById("dateFilter");
const paymentFilter = document.getElementById("paymentFilter");

const resultsTitle = document.getElementById("resultsTitle");
const resultsCount = document.getElementById("resultsCount");
const receiptsList = document.getElementById("receiptsList");

const receiptDetailModal = document.getElementById("receiptDetailModal");
const closeDetailModal = document.getElementById("closeDetailModal");

const detailFolio = document.getElementById("detailFolio");
const detailStatus = document.getElementById("detailStatus");

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

const exportCustomerRow = document.getElementById("exportCustomerRow");
const exportVehicleRow = document.getElementById("exportVehicleRow");
const exportPlatesRow = document.getElementById("exportPlatesRow");

const shareReceiptButton = document.getElementById("shareReceiptButton");
const downloadReceiptButton = document.getElementById(
    "downloadReceiptButton"
);
const editReceiptButton = document.getElementById("editReceiptButton");
const deleteReceiptButton = document.getElementById(
    "deleteReceiptButton"
);

const editReceiptModal = document.getElementById("editReceiptModal");
const closeEditModal = document.getElementById("closeEditModal");
const editReceiptForm = document.getElementById("editReceiptForm");
const editReceiptFolio = document.getElementById("editReceiptFolio");

const editService = document.getElementById("editService");
const editCustomer = document.getElementById("editCustomer");
const editVehicle = document.getElementById("editVehicle");
const editPlates = document.getElementById("editPlates");
const editPayment = document.getElementById("editPayment");
const editDescription = document.getElementById("editDescription");
const editAmount = document.getElementById("editAmount");
const saveEditButton = document.getElementById("saveEditButton");

const deleteReceiptModal = document.getElementById("deleteReceiptModal");
const deleteReceiptFolio = document.getElementById("deleteReceiptFolio");
const cancelDeleteButton = document.getElementById("cancelDeleteButton");
const confirmDeleteButton = document.getElementById(
    "confirmDeleteButton"
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

const toast = document.getElementById("toast");
const toastTitle = document.getElementById("toastTitle");
const toastMessage = document.getElementById("toastMessage");

const receiptsCollection = collection(
    db,
    "autolavado",
    "recibos",
    "registros"
);

let currentUser = null;
let currentEmployee = null;

let allReceipts = [];
let filteredReceipts = [];

let selectedReceipt = null;

let editingReceipt = false;
let deletingReceipt = false;

function formatMoney(value) {
    return new Intl.NumberFormat(
        "es-MX",
        {
            style: "currency",
            currency: "MXN",
            minimumFractionDigits: 2
        }
    ).format(Number(value) || 0);
}

function formatFolio(value) {
    return `#${String(Number(value) || 0).padStart(4, "0")}`;
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function normalizeText(value) {
    return String(value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function showToast(title, message, type = "success") {
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

function hideLoadingScreen() {
    loadingScreen.classList.add("hide");
}

function getReceiptDate(receipt) {
    const value =
        receipt.fecha ||
        receipt.creadoEn;

    if (!value) {
        return null;
    }

    if (typeof value.toDate === "function") {
        return value.toDate();
    }

    if (value instanceof Date) {
        return value;
    }

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    return parsed;
}

function formatReceiptDate(date) {
    if (!date) {
        return "--";
    }

    return new Intl.DateTimeFormat(
        "es-MX",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    ).format(date);
}

function formatReceiptTime(date) {
    if (!date) {
        return "--";
    }

    return new Intl.DateTimeFormat(
        "es-MX",
        {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
        }
    ).format(date);
}

function formatListDate(date) {
    if (!date) {
        return "Fecha desconocida";
    }

    return new Intl.DateTimeFormat(
        "es-MX",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    ).format(date);
}

function startOfToday() {
    const date = new Date();

    date.setHours(0, 0, 0, 0);

    return date;
}

function startOfWeek() {
    const now = new Date();

    const day = now.getDay();

    const difference =
        day === 0
            ? 6
            : day - 1;

    const start = new Date(now);

    start.setDate(
        now.getDate() - difference
    );

    start.setHours(0, 0, 0, 0);

    return start;
}

function startOfMonth() {
    const now = new Date();

    return new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
        0,
        0,
        0,
        0
    );
}

function isToday(date) {
    if (!date) {
        return false;
    }

    return (
        date.getTime() >=
        startOfToday().getTime()
    );
}

async function getEmployeeData(user) {
    let profile = null;

    try {
        const snapshot = await getDoc(
            doc(
                db,
                "usuarios",
                user.uid
            )
        );

        if (snapshot.exists()) {
            profile = snapshot.data();
        }
    } catch (error) {
        console.warn(
            "No se pudo leer el perfil:",
            error
        );
    }

    const email =
        user.email ||
        profile?.email ||
        "";

    const emailName =
        email.includes("@")
            ? email.split("@")[0]
            : "Usuario";

    return {
        uid: user.uid,

        nombre:
            profile?.nombre ||
            user.displayName ||
            emailName,

        email
    };
}

function renderUser() {
    headerUserName.textContent =
        currentEmployee.nombre;

    menuUserName.textContent =
        currentEmployee.nombre;

    menuUserEmail.textContent =
        currentEmployee.email;
}

async function loadReceipts() {
    try {
        const receiptsQuery = query(
            receiptsCollection,
            orderBy(
                "creadoEn",
                "desc"
            )
        );

        const snapshot =
            await getDocs(receiptsQuery);

        allReceipts = [];

        snapshot.forEach(
            (receiptDocument) => {
                const data =
                    receiptDocument.data();

                if (
                    data.estado !== "eliminado"
                ) {
                    allReceipts.push({
                        id: receiptDocument.id,
                        ...data
                    });
                }
            }
        );

        renderGlobalStats();

        applyFilters();

        openReceiptFromUrl();
    } catch (error) {
        console.error(
            "Error cargando recibos:",
            error
        );

        receiptsList.innerHTML = `
            <div class="history-no-results">
                <div>
                    <i class="fa-solid fa-triangle-exclamation"></i>
                </div>

                <h3>
                    No pudimos cargar los recibos
                </h3>

                <p>
                    Revisa tu conexión y los permisos de Firestore.
                </p>
            </div>
        `;

        resultsCount.textContent =
            "0 resultados";
    }
}

function renderGlobalStats() {
    const income =
        allReceipts.reduce(
            (total, receipt) =>
                total +
                (Number(receipt.monto) || 0),
            0
        );

    const todayCount =
        allReceipts.filter(
            (receipt) =>
                isToday(
                    getReceiptDate(receipt)
                )
        ).length;

    totalReceipts.textContent =
        String(allReceipts.length);

    totalReceiptIncome.textContent =
        formatMoney(income);

    todayReceiptCount.textContent =
        String(todayCount);
}

function applyFilters() {
    const search =
        normalizeText(
            receiptSearch.value
        );

    const selectedDate =
        dateFilter.value;

    const selectedPayment =
        paymentFilter.value;

    filteredReceipts =
        allReceipts.filter(
            (receipt) => {
                const date =
                    getReceiptDate(receipt);

                const folio =
                    String(
                        receipt.folio || ""
                    );

                const searchable =
                    normalizeText(
                        [
                            folio,
                            formatFolio(
                                receipt.folio
                            ),
                            receipt.servicio,
                            receipt.cliente,
                            receipt.vehiculo,
                            receipt.placas,
                            receipt.metodoPago,
                            receipt.empleadoNombre
                        ].join(" ")
                    );

                const matchesSearch =
                    !search ||
                    searchable.includes(search);

                let matchesDate = true;

                if (selectedDate === "today") {
                    matchesDate =
                        date &&
                        date.getTime() >=
                            startOfToday().getTime();
                }

                if (selectedDate === "week") {
                    matchesDate =
                        date &&
                        date.getTime() >=
                            startOfWeek().getTime();
                }

                if (selectedDate === "month") {
                    matchesDate =
                        date &&
                        date.getTime() >=
                            startOfMonth().getTime();
                }

                const matchesPayment =
                    selectedPayment === "all" ||
                    receipt.metodoPago ===
                        selectedPayment;

                return (
                    matchesSearch &&
                    matchesDate &&
                    matchesPayment
                );
            }
        );

    renderFilteredStats();

    renderReceipts();
}

function renderFilteredStats() {
    const income =
        filteredReceipts.reduce(
            (total, receipt) =>
                total +
                (Number(receipt.monto) || 0),
            0
        );

    totalReceiptIncome.textContent =
        formatMoney(income);

    resultsCount.textContent =
        `${filteredReceipts.length} ${
            filteredReceipts.length === 1
                ? "resultado"
                : "resultados"
        }`;

    const filtering =
        receiptSearch.value.trim() ||
        dateFilter.value !== "all" ||
        paymentFilter.value !== "all";

    resultsTitle.textContent =
        filtering
            ? "Resultados filtrados"
            : "Recibos registrados";
}

function renderReceipts() {
    if (!filteredReceipts.length) {
        receiptsList.innerHTML = `
            <div class="history-no-results">
                <div>
                    <i class="fa-solid fa-receipt"></i>
                </div>

                <h3>
                    No encontramos recibos
                </h3>

                <p>
                    Prueba cambiando la búsqueda o los filtros seleccionados.
                </p>
            </div>
        `;

        return;
    }

    receiptsList.innerHTML =
        filteredReceipts
            .map(
                (receipt) => {
                    const date =
                        getReceiptDate(receipt);

                    const edited =
                        receipt.editado === true;

                    const tags = [];

                    if (receipt.cliente) {
                        tags.push(`
                            <span class="receipt-extra-tag">
                                <i class="fa-regular fa-user"></i>
                                <span>
                                    ${escapeHtml(receipt.cliente)}
                                </span>
                            </span>
                        `);
                    }

                    if (receipt.vehiculo) {
                        tags.push(`
                            <span class="receipt-extra-tag">
                                <i class="fa-solid fa-car-side"></i>
                                <span>
                                    ${escapeHtml(receipt.vehiculo)}
                                </span>
                            </span>
                        `);
                    }

                    if (receipt.placas) {
                        tags.push(`
                            <span class="receipt-extra-tag">
                                <i class="fa-solid fa-id-card"></i>
                                <span>
                                    ${escapeHtml(receipt.placas)}
                                </span>
                            </span>
                        `);
                    }

                    return `
                        <article
                            class="history-receipt"
                            data-id="${receipt.id}"
                        >
                            <div>
                                <div class="history-receipt-main">

                                    <span class="history-receipt-icon">
                                        <i class="fa-solid fa-receipt"></i>
                                    </span>

                                    <div class="history-receipt-data">

                                        <div class="history-receipt-folio">

                                            <strong>
                                                ${formatFolio(receipt.folio)}
                                            </strong>

                                            <span class="receipt-status ${
                                                edited
                                                    ? "edited"
                                                    : ""
                                            }">
                                                ${
                                                    edited
                                                        ? "Editado"
                                                        : "Activo"
                                                }
                                            </span>

                                        </div>

                                        <div class="history-receipt-service">
                                            ${escapeHtml(
                                                receipt.servicio ||
                                                "Servicio"
                                            )}
                                        </div>

                                        <div class="history-receipt-meta">

                                            <span>
                                                <i class="fa-regular fa-calendar"></i>
                                                ${escapeHtml(
                                                    formatListDate(date)
                                                )}
                                            </span>

                                            <span>
                                                ·
                                            </span>

                                            <span>
                                                ${escapeHtml(
                                                    receipt.metodoPago ||
                                                    ""
                                                )}
                                            </span>

                                        </div>

                                    </div>

                                    <div class="history-receipt-amount">

                                        <strong>
                                            ${formatMoney(receipt.monto)}
                                        </strong>

                                        <small>
                                            MXN
                                        </small>

                                    </div>

                                </div>

                                ${
                                    tags.length
                                        ? `
                                            <div class="history-receipt-extra">
                                                ${tags.join("")}
                                            </div>
                                        `
                                        : ""
                                }
                            </div>

                            <div class="history-receipt-actions">

                                <button
                                    type="button"
                                    class="receipt-action-button view"
                                    data-action="view"
                                    data-id="${receipt.id}"
                                >
                                    <i class="fa-regular fa-eye"></i>
                                    Ver
                                </button>

                                <button
                                    type="button"
                                    class="receipt-action-button share"
                                    data-action="share"
                                    data-id="${receipt.id}"
                                >
                                    <i class="fa-brands fa-whatsapp"></i>
                                    Compartir
                                </button>

                                <button
                                    type="button"
                                    class="receipt-action-button edit"
                                    data-action="edit"
                                    data-id="${receipt.id}"
                                >
                                    <i class="fa-solid fa-pen"></i>
                                    Editar
                                </button>

                                <button
                                    type="button"
                                    class="receipt-action-button delete"
                                    data-action="delete"
                                    data-id="${receipt.id}"
                                >
                                    <i class="fa-solid fa-trash"></i>
                                    Eliminar
                                </button>

                            </div>
                        </article>
                    `;
                }
            )
            .join("");
}

function findReceipt(id) {
    return allReceipts.find(
        (receipt) =>
            receipt.id === id
    );
}

function fillReceiptPreview(receipt) {
    const date =
        getReceiptDate(receipt);

    const folio =
        formatFolio(receipt.folio);

    detailFolio.textContent =
        folio;

    detailStatus.textContent =
        receipt.editado
            ? "Recibo editado"
            : "Recibo activo";

    exportFolio.textContent =
        folio;

    exportDate.textContent =
        formatReceiptDate(date);

    exportTime.textContent =
        formatReceiptTime(date);

    exportService.textContent =
        receipt.servicio || "--";

    exportAmount.textContent =
        formatMoney(receipt.monto);

    exportPayment.textContent =
        receipt.metodoPago || "--";

    exportEmployee.textContent =
        receipt.empleadoNombre || "--";

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

function openModal(modal) {
    modal.classList.add("show");

    modal.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.classList.add(
        "no-scroll"
    );
}

function closeModal(modal) {
    modal.classList.remove("show");

    modal.setAttribute(
        "aria-hidden",
        "true"
    );

    const anotherModalOpen =
        document.querySelector(
            ".modal.show"
        );

    if (!anotherModalOpen) {
        document.body.classList.remove(
            "no-scroll"
        );
    }
}

function openReceiptDetail(receipt) {
    selectedReceipt = receipt;

    fillReceiptPreview(receipt);

    openModal(receiptDetailModal);
}

function openEditReceipt(receipt) {
    selectedReceipt = receipt;

    editReceiptFolio.textContent =
        formatFolio(receipt.folio);

    editService.value =
        receipt.servicio || "";

    editCustomer.value =
        receipt.cliente || "";

    editVehicle.value =
        receipt.vehiculo || "";

    editPlates.value =
        receipt.placas || "";

    editPayment.value =
        receipt.metodoPago || "Efectivo";

    editDescription.value =
        receipt.descripcion || "";

    editAmount.value =
        Number(receipt.monto) || "";

    closeModal(receiptDetailModal);

    openModal(editReceiptModal);
}

function openDeleteReceipt(receipt) {
    selectedReceipt = receipt;

    deleteReceiptFolio.textContent =
        formatFolio(receipt.folio);

    closeModal(receiptDetailModal);

    openModal(deleteReceiptModal);
}

function setEditLoading(loading) {
    editingReceipt = loading;

    saveEditButton.disabled =
        loading;

    saveEditButton.classList.toggle(
        "loading",
        loading
    );
}

function setDeleteLoading(loading) {
    deletingReceipt = loading;

    confirmDeleteButton.disabled =
        loading;

    confirmDeleteButton.classList.toggle(
        "loading",
        loading
    );
}

async function saveReceiptChanges() {
    if (
        editingReceipt ||
        !selectedReceipt
    ) {
        return;
    }

    const service =
        editService.value.trim();

    const amount =
        Number(editAmount.value);

    if (!service) {
        showToast(
            "Falta el servicio",
            "Escribe el servicio realizado.",
            "error"
        );

        editService.focus();

        return;
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

        editAmount.focus();

        return;
    }

    setEditLoading(true);

    const receiptRef =
        doc(
            receiptsCollection,
            selectedReceipt.id
        );

    const movementId =
        selectedReceipt.movimientoFinancieroId ||
        `autolavado_${selectedReceipt.id}`;

    const financeRef =
        doc(
            db,
            "finanzas",
            "movimientos",
            "registros",
            movementId
        );

    try {
        await runTransaction(
            db,
            async (transaction) => {
                const receiptSnapshot =
                    await transaction.get(
                        receiptRef
                    );

                if (
                    !receiptSnapshot.exists()
                ) {
                    throw new Error(
                        "El recibo ya no existe."
                    );
                }

                const currentData =
                    receiptSnapshot.data();

                if (
                    currentData.estado ===
                    "eliminado"
                ) {
                    throw new Error(
                        "Este recibo fue eliminado."
                    );
                }

                const now =
                    Timestamp.fromDate(
                        new Date()
                    );

                const newAmount =
                    Number(
                        amount.toFixed(2)
                    );

                const newService =
                    service;

                const updateData = {
                    servicio:
                        newService,

                    cliente:
                        editCustomer.value.trim(),

                    vehiculo:
                        editVehicle.value.trim(),

                    placas:
                        editPlates.value
                            .trim()
                            .toUpperCase(),

                    metodoPago:
                        editPayment.value,

                    descripcion:
                        editDescription.value.trim(),

                    monto:
                        newAmount,

                    actualizadoEn:
                        now,

                    editadoEn:
                        now,

                    editado:
                        true,

                    editadoPorUid:
                        currentEmployee.uid,

                    editadoPorNombre:
                        currentEmployee.nombre,

                    movimientoFinancieroId:
                        movementId
                };

                transaction.update(
                    receiptRef,
                    updateData
                );

                transaction.set(
                    financeRef,
                    {
                        tipo:
                            "ingreso",

                        monto:
                            newAmount,

                        concepto:
                            `Recibo de autolavado ${formatFolio(
                                currentData.folio
                            )}`,

                        categoria:
                            "Autolavado",

                        origen:
                            "autolavado",

                        moneda:
                            "MXN",

                        folio:
                            currentData.folio,

                        reciboId:
                            selectedReceipt.id,

                        servicio:
                            newService,

                        metodoPago:
                            editPayment.value,

                        fecha:
                            currentData.fecha ||
                            currentData.creadoEn ||
                            now,

                        actualizadoEn:
                            now,

                        estado:
                            "activo"
                    },
                    {
                        merge: true
                    }
                );
            }
        );

        closeModal(editReceiptModal);

        showToast(
            "Recibo actualizado",
            `${formatFolio(
                selectedReceipt.folio
            )} y su ingreso fueron actualizados.`
        );

        await loadReceipts();

        const updated =
            findReceipt(
                selectedReceipt.id
            );

        if (updated) {
            selectedReceipt = updated;
        }
    } catch (error) {
        console.error(
            "Error editando recibo:",
            error
        );

        showToast(
            "No se pudo actualizar",
            error?.message ||
            "Intenta nuevamente.",
            "error"
        );
    } finally {
        setEditLoading(false);
    }
}

async function deleteSelectedReceipt() {
    if (
        deletingReceipt ||
        !selectedReceipt
    ) {
        return;
    }

    setDeleteLoading(true);

    const receiptId =
        selectedReceipt.id;

    const folio =
        selectedReceipt.folio;

    const receiptRef =
        doc(
            receiptsCollection,
            receiptId
        );

    const movementId =
        selectedReceipt.movimientoFinancieroId ||
        `autolavado_${receiptId}`;

    const financeRef =
        doc(
            db,
            "finanzas",
            "movimientos",
            "registros",
            movementId
        );

    try {
        await runTransaction(
            db,
            async (transaction) => {
                const receiptSnapshot =
                    await transaction.get(
                        receiptRef
                    );

                if (
                    !receiptSnapshot.exists()
                ) {
                    throw new Error(
                        "El recibo ya no existe."
                    );
                }

                const now =
                    Timestamp.fromDate(
                        new Date()
                    );

                transaction.update(
                    receiptRef,
                    {
                        estado:
                            "eliminado",

                        eliminadoEn:
                            now,

                        eliminadoPorUid:
                            currentEmployee.uid,

                        eliminadoPorNombre:
                            currentEmployee.nombre,

                        actualizadoEn:
                            now
                    }
                );

                transaction.delete(
                    financeRef
                );
            }
        );

        closeModal(deleteReceiptModal);

        selectedReceipt = null;

        showToast(
            "Recibo eliminado",
            `${formatFolio(
                folio
            )} dejó de contabilizarse en Finanzas.`
        );

        await loadReceipts();
    } catch (error) {
        console.error(
            "Error eliminando recibo:",
            error
        );

        showToast(
            "No se pudo eliminar",
            error?.message ||
            "Intenta nuevamente.",
            "error"
        );
    } finally {
        setDeleteLoading(false);
    }
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

    return await window.html2canvas(
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

function buildWhatsAppMessage(receipt) {
    return (
        `Hola 👋\n\n` +
        `Gracias por visitar *Lavado y Engrasado Esteban*.\n\n` +
        `Te compartimos tu recibo ${formatFolio(
            receipt.folio
        )} correspondiente a tu servicio de *${
            receipt.servicio
        }*.\n\n` +
        `Total: *${formatMoney(
            receipt.monto
        )} MXN*\n\n` +
        `¡Gracias por tu preferencia! 🚘✨`
    );
}

async function downloadSelectedReceipt() {
    if (!selectedReceipt) {
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
                selectedReceipt.folio
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
            "Error creando imagen:",
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

async function shareSelectedReceipt() {
    if (!selectedReceipt) {
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
                    selectedReceipt.folio
                ).padStart(4, "0")}.png`,
                {
                    type: "image/png"
                }
            );

        const message =
            buildWhatsAppMessage(
                selectedReceipt
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
                        selectedReceipt.folio
                    )}`,

                text:
                    message,

                files:
                    [file]
            });

            return;
        }

        const imageUrl =
            URL.createObjectURL(blob);

        const link =
            document.createElement("a");

        link.download =
            file.name;

        link.href =
            imageUrl;

        document.body.appendChild(link);

        link.click();
        link.remove();

        setTimeout(
            () => {
                URL.revokeObjectURL(
                    imageUrl
                );
            },
            2000
        );

        window.open(
            `https://wa.me/?text=${encodeURIComponent(
                message
            )}`,
            "_blank",
            "noopener,noreferrer"
        );

        showToast(
            "Imagen preparada",
            "Se guardó el PNG y se abrió WhatsApp. Adjunta la imagen si tu navegador no permite compartir archivos directamente."
        );
    } catch (error) {
        if (
            error?.name === "AbortError"
        ) {
            return;
        }

        console.error(
            "Error compartiendo:",
            error
        );

        showToast(
            "No se pudo compartir",
            "Puedes guardar el PNG y enviarlo manualmente.",
            "error"
        );
    } finally {
        shareReceiptButton.disabled =
            false;
    }
}

async function shareReceiptDirectly(receipt) {
    selectedReceipt = receipt;

    fillReceiptPreview(receipt);

    openReceiptDetail(receipt);

    await new Promise(
        (resolve) =>
            setTimeout(
                resolve,
                150
            )
    );

    await shareSelectedReceipt();
}

function handleReceiptAction(event) {
    const button =
        event.target.closest(
            "[data-action][data-id]"
        );

    if (!button) {
        return;
    }

    const receipt =
        findReceipt(
            button.dataset.id
        );

    if (!receipt) {
        return;
    }

    const action =
        button.dataset.action;

    if (action === "view") {
        openReceiptDetail(receipt);
        return;
    }

    if (action === "share") {
        shareReceiptDirectly(receipt);
        return;
    }

    if (action === "edit") {
        openEditReceipt(receipt);
        return;
    }

    if (action === "delete") {
        openDeleteReceipt(receipt);
    }
}

function openReceiptFromUrl() {
    const params =
        new URLSearchParams(
            window.location.search
        );

    const id =
        params.get("id");

    if (!id) {
        return;
    }

    const receipt =
        findReceipt(id);

    if (!receipt) {
        return;
    }

    openReceiptDetail(receipt);

    const cleanUrl =
        new URL(
            window.location.href
        );

    cleanUrl.searchParams.delete("id");

    window.history.replaceState(
        {},
        "",
        cleanUrl.pathname +
        cleanUrl.search
    );
}

receiptSearch.addEventListener(
    "input",
    () => {
        clearSearchButton.hidden =
            !receiptSearch.value;

        applyFilters();
    }
);

clearSearchButton.addEventListener(
    "click",
    () => {
        receiptSearch.value = "";

        clearSearchButton.hidden = true;

        receiptSearch.focus();

        applyFilters();
    }
);

dateFilter.addEventListener(
    "change",
    applyFilters
);

paymentFilter.addEventListener(
    "change",
    applyFilters
);

receiptsList.addEventListener(
    "click",
    handleReceiptAction
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

closeDetailModal.addEventListener(
    "click",
    () => {
        closeModal(
            receiptDetailModal
        );
    }
);

document
    .querySelectorAll(
        "[data-close-detail]"
    )
    .forEach(
        (element) => {
            element.addEventListener(
                "click",
                () => {
                    closeModal(
                        receiptDetailModal
                    );
                }
            );
        }
    );

closeEditModal.addEventListener(
    "click",
    () => {
        if (!editingReceipt) {
            closeModal(
                editReceiptModal
            );
        }
    }
);

document
    .querySelectorAll(
        "[data-close-edit]"
    )
    .forEach(
        (element) => {
            element.addEventListener(
                "click",
                () => {
                    if (!editingReceipt) {
                        closeModal(
                            editReceiptModal
                        );
                    }
                }
            );
        }
    );

cancelDeleteButton.addEventListener(
    "click",
    () => {
        if (!deletingReceipt) {
            closeModal(
                deleteReceiptModal
            );
        }
    }
);

document
    .querySelectorAll(
        "[data-close-delete]"
    )
    .forEach(
        (element) => {
            element.addEventListener(
                "click",
                () => {
                    if (!deletingReceipt) {
                        closeModal(
                            deleteReceiptModal
                        );
                    }
                }
            );
        }
    );

editReceiptButton.addEventListener(
    "click",
    () => {
        if (selectedReceipt) {
            openEditReceipt(
                selectedReceipt
            );
        }
    }
);

deleteReceiptButton.addEventListener(
    "click",
    () => {
        if (selectedReceipt) {
            openDeleteReceipt(
                selectedReceipt
            );
        }
    }
);

shareReceiptButton.addEventListener(
    "click",
    shareSelectedReceipt
);

downloadReceiptButton.addEventListener(
    "click",
    downloadSelectedReceipt
);

editReceiptForm.addEventListener(
    "submit",
    async (event) => {
        event.preventDefault();

        await saveReceiptChanges();
    }
);

editPlates.addEventListener(
    "input",
    () => {
        editPlates.value =
            editPlates.value.toUpperCase();
    }
);

confirmDeleteButton.addEventListener(
    "click",
    deleteSelectedReceipt
);

mobileHomeButton.addEventListener(
    "click",
    () => {
        window.location.href =
            "index.html";
    }
);

mobileReceiptsButton.addEventListener(
    "click",
    () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }
);

mobileCreateButton.addEventListener(
    "click",
    () => {
        window.location.href =
            "index.html#newReceiptSection";
    }
);

mobileExpensesButton.addEventListener(
    "click",
    () => {
        window.location.href =
            "gastos.html";
    }
);

mobileProfileButton.addEventListener(
    "click",
    () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

        userMenu.classList.toggle(
            "show"
        );
    }
);

document.addEventListener(
    "keydown",
    (event) => {
        if (event.key !== "Escape") {
            return;
        }

        if (
            deleteReceiptModal.classList.contains(
                "show"
            ) &&
            !deletingReceipt
        ) {
            closeModal(
                deleteReceiptModal
            );

            return;
        }

        if (
            editReceiptModal.classList.contains(
                "show"
            ) &&
            !editingReceipt
        ) {
            closeModal(
                editReceiptModal
            );

            return;
        }

        if (
            receiptDetailModal.classList.contains(
                "show"
            )
        ) {
            closeModal(
                receiptDetailModal
            );
        }
    }
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

        currentUser = user;

        try {
            currentEmployee =
                await getEmployeeData(
                    user
                );

            renderUser();

            await loadReceipts();
        } catch (error) {
            console.error(
                "Error iniciando historial:",
                error
            );

            showToast(
                "Error de carga",
                "No pudimos iniciar correctamente el historial.",
                "error"
            );
        } finally {
            hideLoadingScreen();
        }
    }
);