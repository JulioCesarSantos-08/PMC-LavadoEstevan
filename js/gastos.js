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

const monthIncome = document.getElementById("monthIncome");
const monthExpenses = document.getElementById("monthExpenses");
const monthProfit = document.getElementById("monthProfit");

const financeChartCanvas = document.getElementById("financeChart");

const newExpenseButton = document.getElementById("newExpenseButton");
const expenseFormSection = document.getElementById("expenseFormSection");
const expenseForm = document.getElementById("expenseForm");

const expenseConcept = document.getElementById("expenseConcept");
const expenseCategory = document.getElementById("expenseCategory");
const expensePayment = document.getElementById("expensePayment");
const expenseDescription = document.getElementById("expenseDescription");
const expenseAmount = document.getElementById("expenseAmount");
const saveExpenseButton = document.getElementById("saveExpenseButton");

const expenseSearch = document.getElementById("expenseSearch");
const clearExpenseSearch = document.getElementById("clearExpenseSearch");
const expenseDateFilter = document.getElementById("expenseDateFilter");
const expensesCount = document.getElementById("expensesCount");
const expensesList = document.getElementById("expensesList");

const editExpenseModal = document.getElementById("editExpenseModal");
const closeExpenseEditModal = document.getElementById(
    "closeExpenseEditModal"
);
const editExpenseForm = document.getElementById("editExpenseForm");
const editExpenseConcept = document.getElementById("editExpenseConcept");
const editExpenseCategory = document.getElementById("editExpenseCategory");
const editExpensePayment = document.getElementById("editExpensePayment");
const editExpenseDescription = document.getElementById(
    "editExpenseDescription"
);
const editExpenseAmount = document.getElementById("editExpenseAmount");
const updateExpenseButton = document.getElementById("updateExpenseButton");

const deleteExpenseModal = document.getElementById("deleteExpenseModal");
const deleteExpenseTitle = document.getElementById("deleteExpenseTitle");
const cancelExpenseDelete = document.getElementById("cancelExpenseDelete");
const confirmExpenseDelete = document.getElementById(
    "confirmExpenseDelete"
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

let allReceipts = [];
let allExpenses = [];
let filteredExpenses = [];

let selectedExpense = null;

let financeChart = null;

let savingExpense = false;
let editingExpense = false;
let deletingExpense = false;

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

    const icon = toast.querySelector(
        ".toast-icon i"
    );

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

function getDocumentDate(data) {
    const value =
        data.fecha ||
        data.creadoEn;

    if (!value) {
        return null;
    }

    if (
        typeof value.toDate === "function"
    ) {
        return value.toDate();
    }

    if (value instanceof Date) {
        return value;
    }

    const parsed =
        new Date(value);

    if (
        Number.isNaN(
            parsed.getTime()
        )
    ) {
        return null;
    }

    return parsed;
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

    date.setHours(
        0,
        0,
        0,
        0
    );

    return date;
}

function startOfWeek() {
    const now = new Date();

    const day =
        now.getDay();

    const difference =
        day === 0
            ? 6
            : day - 1;

    const start =
        new Date(now);

    start.setDate(
        now.getDate() - difference
    );

    start.setHours(
        0,
        0,
        0,
        0
    );

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

function endOfMonth() {
    const now = new Date();

    return new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        1,
        0,
        0,
        0,
        0
    );
}

function isCurrentMonth(date) {
    if (!date) {
        return false;
    }

    return (
        date.getTime() >=
            startOfMonth().getTime() &&
        date.getTime() <
            endOfMonth().getTime()
    );
}

async function getEmployeeData(user) {
    let profile = null;

    try {
        const profileSnapshot =
            await getDoc(
                doc(
                    db,
                    "usuarios",
                    user.uid
                )
            );

        if (profileSnapshot.exists()) {
            profile =
                profileSnapshot.data();
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

    const fallbackName =
        email.includes("@")
            ? email.split("@")[0]
            : "Usuario";

    return {
        uid:
            user.uid,

        nombre:
            profile?.nombre ||
            user.displayName ||
            fallbackName,

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

async function loadBusinessData() {
    try {
        const [
            receiptsSnapshot,
            expensesSnapshot
        ] = await Promise.all([
            getDocs(
                query(
                    receiptsCollection,
                    orderBy(
                        "creadoEn",
                        "desc"
                    )
                )
            ),

            getDocs(
                query(
                    expensesCollection,
                    orderBy(
                        "creadoEn",
                        "desc"
                    )
                )
            )
        ]);

        allReceipts = [];

        receiptsSnapshot.forEach(
            (receiptDocument) => {
                const data =
                    receiptDocument.data();

                if (
                    data.estado !==
                    "eliminado"
                ) {
                    allReceipts.push({
                        id:
                            receiptDocument.id,
                        ...data
                    });
                }
            }
        );

        allExpenses = [];

        expensesSnapshot.forEach(
            (expenseDocument) => {
                const data =
                    expenseDocument.data();

                if (
                    data.estado !==
                    "eliminado"
                ) {
                    allExpenses.push({
                        id:
                            expenseDocument.id,
                        ...data
                    });
                }
            }
        );

        renderSummary();
        renderChart();
        applyExpenseFilters();
    } catch (error) {
        console.error(
            "Error cargando datos:",
            error
        );

        expensesList.innerHTML = `
            <div class="expenses-empty">
                <div>
                    <i class="fa-solid fa-triangle-exclamation"></i>
                </div>

                <h3>
                    No pudimos cargar los gastos
                </h3>

                <p>
                    Revisa tu conexión y los permisos de Firestore.
                </p>
            </div>
        `;
    }
}

function renderSummary() {
    const income =
        allReceipts
            .filter(
                (receipt) =>
                    isCurrentMonth(
                        getDocumentDate(
                            receipt
                        )
                    )
            )
            .reduce(
                (total, receipt) =>
                    total +
                    (
                        Number(
                            receipt.monto
                        ) || 0
                    ),
                0
            );

    const expenses =
        allExpenses
            .filter(
                (expense) =>
                    isCurrentMonth(
                        getDocumentDate(
                            expense
                        )
                    )
            )
            .reduce(
                (total, expense) =>
                    total +
                    (
                        Number(
                            expense.monto
                        ) || 0
                    ),
                0
            );

    const profit =
        income - expenses;

    monthIncome.textContent =
        formatMoney(income);

    monthExpenses.textContent =
        formatMoney(expenses);

    monthProfit.textContent =
        formatMoney(profit);

    monthProfit.style.color =
        profit < 0
            ? "#ff808b"
            : "#67ceff";
}

function getLastSevenDays() {
    const days = [];

    const today =
        new Date();

    today.setHours(
        0,
        0,
        0,
        0
    );

    for (
        let offset = 6;
        offset >= 0;
        offset--
    ) {
        const date =
            new Date(today);

        date.setDate(
            today.getDate() - offset
        );

        const next =
            new Date(date);

        next.setDate(
            date.getDate() + 1
        );

        days.push({
            start:
                date,
            end:
                next,
            label:
                new Intl.DateTimeFormat(
                    "es-MX",
                    {
                        weekday:
                            "short"
                    }
                )
                    .format(date)
                    .replace(".", "")
        });
    }

    return days;
}

function sumForDay(
    documents,
    start,
    end
) {
    return documents.reduce(
        (total, item) => {
            const date =
                getDocumentDate(item);

            if (!date) {
                return total;
            }

            if (
                date.getTime() >=
                    start.getTime() &&
                date.getTime() <
                    end.getTime()
            ) {
                return (
                    total +
                    (
                        Number(
                            item.monto
                        ) || 0
                    )
                );
            }

            return total;
        },
        0
    );
}

function renderChart() {
    if (
        typeof window.Chart !==
        "function"
    ) {
        return;
    }

    const days =
        getLastSevenDays();

    const labels =
        days.map(
            (day) =>
                day.label
        );

    const incomeData =
        days.map(
            (day) =>
                sumForDay(
                    allReceipts,
                    day.start,
                    day.end
                )
        );

    const expenseData =
        days.map(
            (day) =>
                sumForDay(
                    allExpenses,
                    day.start,
                    day.end
                )
        );

    if (financeChart) {
        financeChart.destroy();
    }

    financeChart =
        new window.Chart(
            financeChartCanvas,
            {
                type:
                    "bar",

                data: {
                    labels,

                    datasets: [
                        {
                            label:
                                "Ingresos",

                            data:
                                incomeData,

                            backgroundColor:
                                "rgba(53, 217, 149, 0.72)",

                            borderColor:
                                "#35d995",

                            borderWidth:
                                1,

                            borderRadius:
                                7,

                            borderSkipped:
                                false,

                            maxBarThickness:
                                30
                        },
                        {
                            label:
                                "Gastos",

                            data:
                                expenseData,

                            backgroundColor:
                                "rgba(255, 95, 109, 0.72)",

                            borderColor:
                                "#ff5f6d",

                            borderWidth:
                                1,

                            borderRadius:
                                7,

                            borderSkipped:
                                false,

                            maxBarThickness:
                                30
                        }
                    ]
                },

                options: {
                    responsive:
                        true,

                    maintainAspectRatio:
                        false,

                    interaction: {
                        intersect:
                            false,

                        mode:
                            "index"
                    },

                    plugins: {
                        legend: {
                            display:
                                false
                        },

                        tooltip: {
                            backgroundColor:
                                "#07131d",

                            titleColor:
                                "#ffffff",

                            bodyColor:
                                "#c8d8e2",

                            borderColor:
                                "rgba(255,255,255,0.08)",

                            borderWidth:
                                1,

                            padding:
                                11,

                            callbacks: {
                                label:
                                    (context) =>
                                        `${context.dataset.label}: ${formatMoney(
                                            context.raw
                                        )}`
                            }
                        }
                    },

                    scales: {
                        x: {
                            grid: {
                                display:
                                    false
                            },

                            border: {
                                display:
                                    false
                            },

                            ticks: {
                                color:
                                    "#657b8a",

                                font: {
                                    family:
                                        "Inter",

                                    size:
                                        10,

                                    weight:
                                        "600"
                                }
                            }
                        },

                        y: {
                            beginAtZero:
                                true,

                            grid: {
                                color:
                                    "rgba(255,255,255,0.04)"
                            },

                            border: {
                                display:
                                    false
                            },

                            ticks: {
                                color:
                                    "#657b8a",

                                font: {
                                    family:
                                        "Inter",

                                    size:
                                        9
                                },

                                callback:
                                    (value) =>
                                        `$${Number(
                                            value
                                        ).toLocaleString(
                                            "es-MX"
                                        )}`
                            }
                        }
                    }
                }
            }
        );
}

function applyExpenseFilters() {
    const search =
        normalizeText(
            expenseSearch.value
        );

    const dateValue =
        expenseDateFilter.value;

    filteredExpenses =
        allExpenses.filter(
            (expense) => {
                const searchable =
                    normalizeText(
                        [
                            expense.concepto,
                            expense.categoria,
                            expense.descripcion,
                            expense.metodoPago,
                            expense.empleadoNombre
                        ].join(" ")
                    );

                const matchesSearch =
                    !search ||
                    searchable.includes(
                        search
                    );

                const date =
                    getDocumentDate(
                        expense
                    );

                let matchesDate =
                    true;

                if (
                    dateValue ===
                    "today"
                ) {
                    matchesDate =
                        date &&
                        date.getTime() >=
                            startOfToday().getTime();
                }

                if (
                    dateValue ===
                    "week"
                ) {
                    matchesDate =
                        date &&
                        date.getTime() >=
                            startOfWeek().getTime();
                }

                if (
                    dateValue ===
                    "month"
                ) {
                    matchesDate =
                        date &&
                        date.getTime() >=
                            startOfMonth().getTime();
                }

                return (
                    matchesSearch &&
                    matchesDate
                );
            }
        );

    renderExpenses();
}

function renderExpenses() {
    expensesCount.textContent =
        `${filteredExpenses.length} ${
            filteredExpenses.length === 1
                ? "gasto"
                : "gastos"
        }`;

    if (
        !filteredExpenses.length
    ) {
        expensesList.innerHTML = `
            <div class="expenses-empty">

                <div>
                    <i class="fa-solid fa-wallet"></i>
                </div>

                <h3>
                    No hay gastos para mostrar
                </h3>

                <p>
                    Los gastos registrados aparecerán aquí.
                </p>

            </div>
        `;

        return;
    }

    expensesList.innerHTML =
        filteredExpenses
            .map(
                (expense) => {
                    const date =
                        getDocumentDate(
                            expense
                        );

                    return `
                        <article
                            class="expense-item"
                            data-id="${expense.id}"
                        >

                            <div>

                                <div class="expense-item-main">

                                    <span class="expense-item-icon">
                                        <i class="fa-solid fa-arrow-trend-down"></i>
                                    </span>

                                    <div class="expense-item-info">

                                        <strong>
                                            ${escapeHtml(
                                                expense.concepto ||
                                                "Gasto"
                                            )}
                                        </strong>

                                        <span>
                                            ${escapeHtml(
                                                expense.categoria ||
                                                "Otro"
                                            )}
                                        </span>

                                        <div class="expense-item-meta">

                                            <span>
                                                <i class="fa-regular fa-calendar"></i>
                                                ${escapeHtml(
                                                    formatListDate(
                                                        date
                                                    )
                                                )}
                                            </span>

                                            <span>
                                                ·
                                            </span>

                                            <span>
                                                ${escapeHtml(
                                                    expense.metodoPago ||
                                                    ""
                                                )}
                                            </span>

                                        </div>

                                    </div>

                                    <div class="expense-item-amount">

                                        <strong>
                                            -${formatMoney(
                                                expense.monto
                                            )}
                                        </strong>

                                        <small>
                                            MXN
                                        </small>

                                    </div>

                                </div>

                                ${
                                    expense.descripcion
                                        ? `
                                            <div class="expense-description">
                                                ${escapeHtml(
                                                    expense.descripcion
                                                )}
                                            </div>
                                        `
                                        : ""
                                }

                            </div>

                            <div class="expense-item-actions">

                                <button
                                    type="button"
                                    class="expense-edit-button"
                                    data-action="edit"
                                    data-id="${expense.id}"
                                >
                                    <i class="fa-solid fa-pen"></i>

                                    Editar
                                </button>

                                <button
                                    type="button"
                                    class="expense-delete-button"
                                    data-action="delete"
                                    data-id="${expense.id}"
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

function findExpense(id) {
    return allExpenses.find(
        (expense) =>
            expense.id === id
    );
}

function setSaveLoading(loading) {
    savingExpense =
        loading;

    saveExpenseButton.disabled =
        loading;

    saveExpenseButton.classList.toggle(
        "loading",
        loading
    );
}

function setEditLoading(loading) {
    editingExpense =
        loading;

    updateExpenseButton.disabled =
        loading;

    updateExpenseButton.classList.toggle(
        "loading",
        loading
    );
}

function setDeleteLoading(loading) {
    deletingExpense =
        loading;

    confirmExpenseDelete.disabled =
        loading;

    confirmExpenseDelete.classList.toggle(
        "loading",
        loading
    );
}

async function createExpense() {
    if (
        savingExpense ||
        !currentEmployee
    ) {
        return;
    }

    const concept =
        expenseConcept.value.trim();

    const category =
        expenseCategory.value;

    const amount =
        Number(
            expenseAmount.value
        );

    if (!concept) {
        showToast(
            "Falta el concepto",
            "Escribe qué gasto se realizó.",
            "error"
        );

        expenseConcept.focus();

        return;
    }

    if (!category) {
        showToast(
            "Falta la categoría",
            "Selecciona una categoría para el gasto.",
            "error"
        );

        expenseCategory.focus();

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

        expenseAmount.focus();

        return;
    }

    setSaveLoading(true);

    const expenseRef =
        doc(
            expensesCollection
        );

    const financeRef =
        doc(
            financeMovementsCollection,
            `autolavado_gasto_${expenseRef.id}`
        );

    const now =
        Timestamp.fromDate(
            new Date()
        );

    const finalAmount =
        Number(
            amount.toFixed(2)
        );

    try {
        await runTransaction(
            db,
            async (transaction) => {
                const expenseData = {
                    concepto:
                        concept,

                    categoria:
                        category,

                    descripcion:
                        expenseDescription.value.trim(),

                    metodoPago:
                        expensePayment.value,

                    monto:
                        finalAmount,

                    moneda:
                        "MXN",

                    fecha:
                        now,

                    creadoEn:
                        now,

                    actualizadoEn:
                        now,

                    empleadoUid:
                        currentEmployee.uid,

                    empleadoNombre:
                        currentEmployee.nombre,

                    empleadoEmail:
                        currentEmployee.email,

                    estado:
                        "activo",

                    origen:
                        "autolavado",

                    movimientoFinancieroId:
                        financeRef.id,

                    registradoEnFinanzas:
                        true
                };

                const financeData = {
                    tipo:
                        "egreso",

                    monto:
                        finalAmount,

                    concepto:
                        `Gasto autolavado - ${concept}`,

                    categoria:
                        "Autolavado",

                    subcategoria:
                        category,

                    origen:
                        "autolavado",

                    moneda:
                        "MXN",

                    gastoId:
                        expenseRef.id,

                    metodoPago:
                        expensePayment.value,

                    registradoPorUid:
                        currentEmployee.uid,

                    registradoPorNombre:
                        currentEmployee.nombre,

                    registradoPorEmail:
                        currentEmployee.email,

                    fecha:
                        now,

                    creadoEn:
                        now,

                    actualizadoEn:
                        now,

                    estado:
                        "activo"
                };

                transaction.set(
                    expenseRef,
                    expenseData
                );

                transaction.set(
                    financeRef,
                    financeData
                );
            }
        );

        expenseForm.reset();

        expensePayment.value =
            "Efectivo";

        showToast(
            "Gasto registrado",
            `${concept} se guardó y se agregó a PMC Finanzas.`
        );

        await loadBusinessData();
    } catch (error) {
        console.error(
            "Error registrando gasto:",
            error
        );

        showToast(
            "No se pudo registrar",
            error?.code ===
            "permission-denied"
                ? "Firebase no permitió guardar el gasto. Debemos actualizar las reglas de Firestore."
                : "El gasto no fue guardado. Intenta nuevamente.",
            "error"
        );
    } finally {
        setSaveLoading(false);
    }
}

function openModal(modal) {
    modal.classList.add(
        "show"
    );

    modal.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.classList.add(
        "no-scroll"
    );
}

function closeModal(modal) {
    modal.classList.remove(
        "show"
    );

    modal.setAttribute(
        "aria-hidden",
        "true"
    );

    if (
        !document.querySelector(
            ".modal.show"
        )
    ) {
        document.body.classList.remove(
            "no-scroll"
        );
    }
}

function openEditExpense(expense) {
    selectedExpense =
        expense;

    editExpenseConcept.value =
        expense.concepto || "";

    editExpenseCategory.value =
        expense.categoria ||
        "Otro";

    editExpensePayment.value =
        expense.metodoPago ||
        "Efectivo";

    editExpenseDescription.value =
        expense.descripcion || "";

    editExpenseAmount.value =
        Number(
            expense.monto
        ) || "";

    openModal(
        editExpenseModal
    );
}

function openDeleteExpense(expense) {
    selectedExpense =
        expense;

    deleteExpenseTitle.textContent =
        expense.concepto ||
        "Gasto";

    openModal(
        deleteExpenseModal
    );
}

async function updateSelectedExpense() {
    if (
        editingExpense ||
        !selectedExpense
    ) {
        return;
    }

    const concept =
        editExpenseConcept.value.trim();

    const category =
        editExpenseCategory.value;

    const amount =
        Number(
            editExpenseAmount.value
        );

    if (!concept) {
        showToast(
            "Falta el concepto",
            "Escribe el concepto del gasto.",
            "error"
        );

        editExpenseConcept.focus();

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

        editExpenseAmount.focus();

        return;
    }

    setEditLoading(true);

    const expenseId =
        selectedExpense.id;

    const expenseRef =
        doc(
            expensesCollection,
            expenseId
        );

    const movementId =
        selectedExpense
            .movimientoFinancieroId ||
        `autolavado_gasto_${expenseId}`;

    const financeRef =
        doc(
            financeMovementsCollection,
            movementId
        );

    try {
        await runTransaction(
            db,
            async (transaction) => {
                const expenseSnapshot =
                    await transaction.get(
                        expenseRef
                    );

                if (
                    !expenseSnapshot.exists()
                ) {
                    throw new Error(
                        "El gasto ya no existe."
                    );
                }

                const currentData =
                    expenseSnapshot.data();

                if (
                    currentData.estado ===
                    "eliminado"
                ) {
                    throw new Error(
                        "Este gasto ya fue eliminado."
                    );
                }

                const now =
                    Timestamp.fromDate(
                        new Date()
                    );

                const finalAmount =
                    Number(
                        amount.toFixed(2)
                    );

                transaction.update(
                    expenseRef,
                    {
                        concepto:
                            concept,

                        categoria:
                            category,

                        descripcion:
                            editExpenseDescription.value.trim(),

                        metodoPago:
                            editExpensePayment.value,

                        monto:
                            finalAmount,

                        editado:
                            true,

                        editadoEn:
                            now,

                        editadoPorUid:
                            currentEmployee.uid,

                        editadoPorNombre:
                            currentEmployee.nombre,

                        actualizadoEn:
                            now,

                        movimientoFinancieroId:
                            movementId
                    }
                );

                transaction.set(
                    financeRef,
                    {
                        tipo:
                            "egreso",

                        monto:
                            finalAmount,

                        concepto:
                            `Gasto autolavado - ${concept}`,

                        categoria:
                            "Autolavado",

                        subcategoria:
                            category,

                        origen:
                            "autolavado",

                        moneda:
                            "MXN",

                        gastoId:
                            expenseId,

                        metodoPago:
                            editExpensePayment.value,

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
                        merge:
                            true
                    }
                );
            }
        );

        closeModal(
            editExpenseModal
        );

        selectedExpense =
            null;

        showToast(
            "Gasto actualizado",
            "El gasto y su egreso financiero fueron actualizados."
        );

        await loadBusinessData();
    } catch (error) {
        console.error(
            "Error actualizando gasto:",
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

async function deleteSelectedExpense() {
    if (
        deletingExpense ||
        !selectedExpense
    ) {
        return;
    }

    setDeleteLoading(true);

    const expenseId =
        selectedExpense.id;

    const expenseName =
        selectedExpense.concepto ||
        "Gasto";

    const expenseRef =
        doc(
            expensesCollection,
            expenseId
        );

    const movementId =
        selectedExpense
            .movimientoFinancieroId ||
        `autolavado_gasto_${expenseId}`;

    const financeRef =
        doc(
            financeMovementsCollection,
            movementId
        );

    try {
        await runTransaction(
            db,
            async (transaction) => {
                const expenseSnapshot =
                    await transaction.get(
                        expenseRef
                    );

                if (
                    !expenseSnapshot.exists()
                ) {
                    throw new Error(
                        "El gasto ya no existe."
                    );
                }

                const now =
                    Timestamp.fromDate(
                        new Date()
                    );

                transaction.update(
                    expenseRef,
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

        closeModal(
            deleteExpenseModal
        );

        selectedExpense =
            null;

        showToast(
            "Gasto eliminado",
            `${expenseName} dejó de contabilizarse en PMC Finanzas.`
        );

        await loadBusinessData();
    } catch (error) {
        console.error(
            "Error eliminando gasto:",
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

function handleExpenseActions(event) {
    const button =
        event.target.closest(
            "[data-action][data-id]"
        );

    if (!button) {
        return;
    }

    const expense =
        findExpense(
            button.dataset.id
        );

    if (!expense) {
        return;
    }

    if (
        button.dataset.action ===
        "edit"
    ) {
        openEditExpense(
            expense
        );

        return;
    }

    if (
        button.dataset.action ===
        "delete"
    ) {
        openDeleteExpense(
            expense
        );
    }
}

function scrollToExpenseForm() {
    expenseFormSection.scrollIntoView({
        behavior:
            "smooth",

        block:
            "start"
    });

    setTimeout(
        () => {
            expenseConcept.focus({
                preventScroll:
                    true
            });
        },
        500
    );
}

expenseForm.addEventListener(
    "submit",
    async (event) => {
        event.preventDefault();

        await createExpense();
    }
);

newExpenseButton.addEventListener(
    "click",
    scrollToExpenseForm
);

mobileCreateButton.addEventListener(
    "click",
    scrollToExpenseForm
);

expenseSearch.addEventListener(
    "input",
    () => {
        clearExpenseSearch.hidden =
            !expenseSearch.value;

        applyExpenseFilters();
    }
);

clearExpenseSearch.addEventListener(
    "click",
    () => {
        expenseSearch.value =
            "";

        clearExpenseSearch.hidden =
            true;

        expenseSearch.focus();

        applyExpenseFilters();
    }
);

expenseDateFilter.addEventListener(
    "change",
    applyExpenseFilters
);

expensesList.addEventListener(
    "click",
    handleExpenseActions
);

editExpenseForm.addEventListener(
    "submit",
    async (event) => {
        event.preventDefault();

        await updateSelectedExpense();
    }
);

confirmExpenseDelete.addEventListener(
    "click",
    deleteSelectedExpense
);

closeExpenseEditModal.addEventListener(
    "click",
    () => {
        if (!editingExpense) {
            closeModal(
                editExpenseModal
            );
        }
    }
);

document
    .querySelectorAll(
        "[data-close-expense-edit]"
    )
    .forEach(
        (element) => {
            element.addEventListener(
                "click",
                () => {
                    if (!editingExpense) {
                        closeModal(
                            editExpenseModal
                        );
                    }
                }
            );
        }
    );

cancelExpenseDelete.addEventListener(
    "click",
    () => {
        if (!deletingExpense) {
            closeModal(
                deleteExpenseModal
            );
        }
    }
);

document
    .querySelectorAll(
        "[data-close-expense-delete]"
    )
    .forEach(
        (element) => {
            element.addEventListener(
                "click",
                () => {
                    if (!deletingExpense) {
                        closeModal(
                            deleteExpenseModal
                        );
                    }
                }
            );
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
        window.location.href =
            "recibos.html";
    }
);

mobileExpensesButton.addEventListener(
    "click",
    () => {
        window.scrollTo({
            top:
                0,

            behavior:
                "smooth"
        });
    }
);

mobileProfileButton.addEventListener(
    "click",
    () => {
        window.scrollTo({
            top:
                0,

            behavior:
                "smooth"
        });

        userMenu.classList.toggle(
            "show"
        );
    }
);

document.addEventListener(
    "keydown",
    (event) => {
        if (
            event.key !==
            "Escape"
        ) {
            return;
        }

        if (
            deleteExpenseModal.classList.contains(
                "show"
            ) &&
            !deletingExpense
        ) {
            closeModal(
                deleteExpenseModal
            );

            return;
        }

        if (
            editExpenseModal.classList.contains(
                "show"
            ) &&
            !editingExpense
        ) {
            closeModal(
                editExpenseModal
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

        currentUser =
            user;

        try {
            currentEmployee =
                await getEmployeeData(
                    user
                );

            renderUser();

            await loadBusinessData();
        } catch (error) {
            console.error(
                "Error iniciando gastos:",
                error
            );

            showToast(
                "Error de carga",
                "No pudimos iniciar correctamente la pantalla de gastos.",
                "error"
            );
        } finally {
            hideLoadingScreen();
        }
    }
);