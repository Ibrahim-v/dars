// ==========================================================
// app.js - دفتر الدروس
// ==========================================================
import {
    auth,
    db,
    signOut,
    onAuthStateChanged,
    updateProfile,
    deleteUser,
    GoogleAuthProvider,
    signInWithPopup,
    collection,
    addDoc,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    query,
    where
} from "./firebase.js";
import { uploadToCloudinary } from "./cloudinary.js";

let currentUser = null;

// ----------------------------------------------------------
// أدوات مساعدة عامة
// ----------------------------------------------------------
function showToast(message, type = "success") {
    const toastEl = document.getElementById("toast");
    if (!toastEl) return alert(message);
    toastEl.textContent = message;
    toastEl.className = type === "error" ? "toast-error" : "toast-success";
    toastEl.style.display = "block";
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => { toastEl.style.display = "none"; }, 3000);
}

// ----------------------------------------------------------
// المصادقة (Google فقط)
// ----------------------------------------------------------
function translateAuthError(code) {
    const map = {
        "auth/popup-closed-by-user": "تم إغلاق نافذة تسجيل الدخول قبل إتمام العملية",
        "auth/cancelled-popup-request": "تم إلغاء الطلب، حاول مرة أخرى",
        "auth/popup-blocked": "المتصفح منع فتح نافذة تسجيل الدخول، تحقق من إعدادات النوافذ المنبثقة",
        "auth/network-request-failed": "تحقق من اتصالك بالإنترنت",
        "auth/account-exists-with-different-credential": "هذا البريد مسجل مسبقاً بطريقة دخول أخرى",
        "auth/unauthorized-domain": "هذا الدومين غير مصرّح له بتسجيل الدخول من إعدادات Firebase"
    };
    return map[code] || ("حدث خطأ غير متوقع: " + code);
}

function setupAuth() {
    const modal = document.getElementById("auth-modal");
    const googleBtn = document.getElementById("google-login-btn");

    if (googleBtn) {
        googleBtn.onclick = async () => {
            const originalText = googleBtn.innerHTML;
            googleBtn.disabled = true;
            googleBtn.classList.add("loading");
            googleBtn.innerHTML = "جاري الاتصال بجوجل...";
            try {
                const provider = new GoogleAuthProvider();
                await signInWithPopup(auth, provider);
            } catch (err) {
                if (err.code !== "auth/popup-closed-by-user" && err.code !== "auth/cancelled-popup-request") {
                    showToast(translateAuthError(err.code), "error");
                }
            } finally {
                googleBtn.disabled = false;
                googleBtn.classList.remove("loading");
                googleBtn.innerHTML = originalText;
            }
        };
    }

    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        if (modal) modal.style.display = user ? "none" : "flex";
        updateAvatarUI(user);
        if (user) {
            bootLibrary();
        } else {
            document.getElementById("root").innerHTML = "";
        }
    });
}

function updateAvatarUI(user) {
    const img = document.getElementById("profile-avatar-img");
    const fallback = document.getElementById("profile-avatar-fallback");
    if (!img || !fallback) return;
    if (user && user.photoURL) {
        img.src = user.photoURL;
        img.style.display = "block";
        fallback.style.display = "none";
    } else {
        img.style.display = "none";
        fallback.style.display = "flex";
        fallback.textContent = user && user.email ? user.email.charAt(0).toUpperCase() : "؟";
    }
}

function setupProfileMenu() {
    const avatarBtn = document.getElementById("profile-avatar-btn");
    const menu = document.getElementById("profile-menu");
    const editBtn = document.getElementById("menu-edit-profile");
    const logoutBtn = document.getElementById("menu-logout");
    const profileModal = document.getElementById("profile-modal");
    const closeProfileBtn = document.getElementById("btn-close-profile");
    const saveProfileBtn = document.getElementById("btn-save-profile");
    const profileImageInput = document.getElementById("profile-image-input");
    const profileModalAvatar = document.getElementById("profile-modal-avatar");

    if (avatarBtn && menu) {
        avatarBtn.onclick = (e) => {
            e.stopPropagation();
            menu.classList.toggle("open");
        };
        document.addEventListener("click", () => menu.classList.remove("open"));
        menu.addEventListener("click", (e) => e.stopPropagation());
    }

    if (editBtn && profileModal) {
        editBtn.onclick = () => {
            menu.classList.remove("open");
            if (profileModalAvatar) {
                if (currentUser && currentUser.photoURL) {
                    profileModalAvatar.src = currentUser.photoURL;
                    profileModalAvatar.style.display = "block";
                } else {
                    profileModalAvatar.style.display = "none";
                }
            }
            profileModal.style.display = "flex";
        };
    }

    if (closeProfileBtn && profileModal) {
        closeProfileBtn.onclick = () => { profileModal.style.display = "none"; };
    }

    if (logoutBtn) {
        logoutBtn.onclick = () => {
            menu.classList.remove("open");
            signOut(auth);
        };
    }

    if (saveProfileBtn) {
        saveProfileBtn.onclick = async () => {
            const file = profileImageInput ? profileImageInput.files[0] : null;
            if (!currentUser) return;
            if (!file) return showToast("اختر صورة أولاً", "error");

            const originalText = saveProfileBtn.textContent;
            saveProfileBtn.disabled = true;
            saveProfileBtn.textContent = "جاري الرفع...";

            try {
                const uploaded = await uploadToCloudinary(file);
                await updateProfile(currentUser, { photoURL: uploaded.url });
                updateAvatarUI(currentUser);
                showToast("تم تحديث الصورة الشخصية بنجاح");
                if (profileModal) profileModal.style.display = "none";
                if (profileImageInput) profileImageInput.value = "";
            } catch (err) {
                showToast("حدث خطأ: " + err.message, "error");
            } finally {
                saveProfileBtn.disabled = false;
                saveProfileBtn.textContent = originalText;
            }
        };
    }
}

function setupDeleteAccount() {
    const deleteBtn = document.getElementById("menu-delete-account");
    const menu = document.getElementById("profile-menu");
    if (!deleteBtn) return;

    deleteBtn.onclick = async () => {
        if (menu) menu.classList.remove("open");
        if (!currentUser) return;

        const confirmed = confirm(
            "سيتم حذف حسابك وكل دروسك المحفوظة نهائياً ولا يمكن التراجع عن هذا الإجراء. هل أنت متأكد؟"
        );
        if (!confirmed) return;

        const originalText = deleteBtn.textContent;
        deleteBtn.disabled = true;
        deleteBtn.textContent = "جاري الحذف...";

        try {
            const lessons = await fetchUserLessons();
            for (const lesson of lessons) {
                await deleteDoc(doc(db, "lessons", lesson.id));
            }
            await deleteUser(currentUser);
            showToast("تم حذف الحساب نهائياً");
        } catch (err) {
            if (err.code === "auth/requires-recent-login") {
                showToast("لأمان حسابك، يرجى تسجيل الخروج والدخول مرة أخرى ثم إعادة محاولة الحذف مباشرة", "error");
            } else {
                showToast("تعذر حذف الحساب: " + err.message, "error");
            }
        } finally {
            deleteBtn.disabled = false;
            deleteBtn.textContent = originalText;
        }
    };
}

// ----------------------------------------------------------
// Firestore: دروس المستخدم
// ----------------------------------------------------------
async function fetchUserLessons() {
    if (!currentUser) return [];
    const q = query(collection(db, "lessons"), where("userId", "==", currentUser.uid));
    const snap = await getDocs(q);
    const list = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
    list.sort((a, b) => (a.createdAtMs || 0) - (b.createdAtMs || 0));
    return list;
}

async function saveLessonQuestions(lessonId, questions) {
    await updateDoc(doc(db, "lessons", lessonId), { questions });
}

// ----------------------------------------------------------
// حالة التطبيق (المكتبة / الرفع / الأسئلة / المتصفح / الاختبار)
// ----------------------------------------------------------
let state = {
    view: 'loading',
    lessons: [],
    currentId: null,
    currentMeta: null,
    pdfDoc: null,
    currentPage: 1,
    addError: '',
    saving: false,
    qDraft: { type: 'mcq', text: '', options: ['', ''], correct: 0, answer: '' },
    quizAnswers: {},
};

const root = () => document.getElementById('root');

function render() {
    const r = root();
    if (!r) return;
    r.innerHTML = '';
    if (state.view === 'loading') r.appendChild(renderLoading());
    else if (state.view === 'library') r.appendChild(renderLibrary());
    else if (state.view === 'add') r.appendChild(renderAdd());
    else if (state.view === 'questions') r.appendChild(renderQuestions());
    else if (state.view === 'viewer') r.appendChild(renderViewer());
    else if (state.view === 'quiz') r.appendChild(renderQuiz());
}

function el(tag, attrs = {}, children = []) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
        if (k === 'class') e.className = v;
        else if (k === 'html') e.innerHTML = v;
        else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
        else if (v !== undefined && v !== null) e.setAttribute(k, v);
    }
    (Array.isArray(children) ? children : [children]).forEach((c) => {
        if (c === null || c === undefined) return;
        if (typeof c === 'string') e.appendChild(document.createTextNode(c));
        else e.appendChild(c);
    });
    return e;
}

/* ---------------- Loading ---------------- */
function renderLoading() {
    return el('div', { class: 'loading' }, [el('div', { class: 'spin' }), el('div', {}, ['يجهّز المكتبة...'])]);
}

/* ---------------- Library ---------------- */
function renderLibrary() {
    const wrap = el('div');
    if (state.lessons.length === 0) {
        wrap.appendChild(el('div', { class: 'empty' }, [
            el('div', { class: 'plus' }, ['+']),
            el('h3', { style: 'font-family:Aref Ruqaa,serif;font-size:22px;margin:10px 0 6px;' }, ['المكتبة فاضية']),
            el('p', {}, ['ابدأ برفع أول درس على شكل PDF']),
            el('button', { class: 'btn btn-primary', style: 'margin-top:14px;', onclick: () => openAdd() }, ['+ إضافة درس'])
        ]));
        return wrap;
    }

    const tabColors = ['var(--teal)', 'var(--rust)', 'var(--moss)', 'var(--mustard)', 'var(--plum)'];
    const grid = el('div', { class: 'grid' });
    state.lessons.forEach((l, i) => {
        const color = tabColors[i % tabColors.length];
        grid.appendChild(el('div', { class: 'card' }, [
            el('div', { class: 'tab', style: `background:${color};` }, ['PDF']),
            el('h3', {}, [l.title]),
            el('div', { class: 'meta' }, [
                el('span', {}, [`${l.pageCount || '؟'} صفحة`]),
                el('span', {}, [`${(l.questions || []).length} سؤال`]),
            ]),
            el('div', { class: 'row' }, [
                el('button', { class: 'btn btn-primary btn-sm', onclick: () => openViewer(l.id) }, ['فتح الدرس']),
                el('button', { class: 'btn btn-ghost btn-sm', onclick: () => openQuestions(l.id) }, ['الأسئلة']),
                el('button', { class: 'btn btn-danger btn-sm', onclick: () => deleteLesson(l.id) }, ['حذف']),
            ])
        ]));
    });
    grid.appendChild(el('div', { class: 'card add', onclick: () => openAdd() }, [
        el('div', { class: 'plus' }, ['+']),
        el('div', {}, ['إضافة درس جديد'])
    ]));
    wrap.appendChild(grid);
    return wrap;
}

/* ---------------- Add lesson ---------------- */
function renderAdd() {
    const wrap = el('div');
    wrap.appendChild(el('div', { class: 'top-actions' }, [
        el('div', { class: 'breadcrumb', onclick: () => { state.view = 'library'; render(); } }, ['→ رجوع للمكتبة']),
    ]));
    const panel = el('div', { class: 'panel' }, [el('h2', {}, ['إضافة درس جديد'])]);

    if (state.addError) panel.appendChild(el('div', { class: 'banner error' }, [state.addError]));

    panel.appendChild(el('div', { class: 'field' }, [
        el('label', {}, ['عنوان الدرس']),
        el('input', { type: 'text', id: 'lesson-title-input', placeholder: 'مثال: الدرس الأول - المعادلات' })
    ]));
    panel.appendChild(el('div', { class: 'field' }, [
        el('label', {}, ['ملف PDF']),
        el('input', { type: 'file', accept: 'application/pdf', id: 'lesson-file-input' })
    ]));
    panel.appendChild(el('button', { class: 'btn btn-primary', onclick: handleAddLesson }, ['حفظ الدرس']));
    wrap.appendChild(panel);
    return wrap;
}

async function handleAddLesson() {
    const titleInput = document.getElementById('lesson-title-input');
    const fileInput = document.getElementById('lesson-file-input');
    const title = titleInput.value.trim();
    const file = fileInput.files[0];
    state.addError = '';

    if (!title) { state.addError = 'اكتب عنوان للدرس.'; render(); return; }
    if (!file) { state.addError = 'اختر ملف PDF.'; render(); return; }
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        state.addError = 'الملف لازم يكون PDF.'; render(); return;
    }

    root().innerHTML = '';
    root().appendChild(el('div', { class: 'loading' }, [el('div', { class: 'spin' }), el('div', {}, ['يرفع الملف...'])]));

    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise;
        const pageCount = pdfDoc.numPages;

        const uploaded = await uploadToCloudinary(file);

        await addDoc(collection(db, "lessons"), {
            userId: currentUser.uid,
            title,
            pageCount,
            pdfUrl: uploaded.url,
            publicId: uploaded.publicId,
            questions: [],
            createdAtMs: Date.now(),
        });

        showToast("تم رفع الدرس بنجاح");
        state.lessons = await fetchUserLessons();
        state.view = 'library';
    } catch (err) {
        state.addError = 'ما قدرت أرفع الملف: ' + err.message;
        state.view = 'add';
    }
    render();
}

/* ---------------- Questions editor ---------------- */
function openQuestions(id) {
    state.currentId = id;
    state.currentMeta = state.lessons.find(l => l.id === id);
    state.qDraft = { type: 'mcq', text: '', options: ['', ''], correct: 0, answer: '' };
    state.view = 'questions';
    render();
}

function renderQuestions() {
    const wrap = el('div');
    const meta = state.currentMeta;
    wrap.appendChild(el('div', { class: 'top-actions' }, [
        el('div', { class: 'breadcrumb', onclick: () => { state.view = 'library'; render(); } }, ['→ رجوع للمكتبة']),
    ]));
    const panel = el('div', { class: 'panel' }, [el('h2', {}, ['أسئلة: ' + meta.title])]);

    const qlist = el('div', { class: 'qlist' });
    const questions = meta.questions || [];
    if (questions.length === 0) {
        qlist.appendChild(el('div', { style: 'color:var(--ink-faint);font-size:13.5px;' }, ['ما فيه أسئلة بعد. ضيف أول سؤال تحت.']));
    }
    questions.forEach((q, i) => {
        qlist.appendChild(el('div', { class: 'qitem' }, [
            el('div', {}, [el('span', { class: 'tag ' + (q.type === 'mcq' ? 'mcq' : 'open') }, [q.type === 'mcq' ? 'اختياري' : 'مفتوح']), ' ', `${i + 1}. ${q.text}`]),
            el('button', { class: 'btn btn-danger btn-sm', onclick: () => deleteQuestion(q.id) }, ['حذف'])
        ]));
    });
    panel.appendChild(qlist);
    panel.appendChild(el('div', { style: 'border-top:1px dashed var(--line); margin:6px 0 18px;' }));
    panel.appendChild(el('div', { style: 'font-weight:700; font-size:14px; margin-bottom:10px;' }, ['سؤال جديد']));

    panel.appendChild(el('div', { class: 'qtype-toggle' }, [
        el('button', { class: state.qDraft.type === 'mcq' ? 'active' : '', onclick: () => { state.qDraft.type = 'mcq'; render(); } }, ['اختيار من متعدد']),
        el('button', { class: state.qDraft.type === 'open' ? 'active' : '', onclick: () => { state.qDraft.type = 'open'; render(); } }, ['سؤال مفتوح']),
    ]));

    panel.appendChild(el('div', { class: 'field' }, [
        el('label', {}, ['نص السؤال']),
        el('textarea', { id: 'q-text-input', placeholder: 'اكتب السؤال هنا...' }, [state.qDraft.text])
    ]));

    if (state.qDraft.type === 'mcq') {
        const optWrap = el('div', { class: 'field' }, [el('label', {}, ['الخيارات (حدد الإجابة الصحيحة)'])]);
        state.qDraft.options.forEach((opt, i) => {
            optWrap.appendChild(el('div', { class: 'option-row' }, [
                el('input', { type: 'radio', name: 'correct-opt', checked: state.qDraft.correct === i ? 'checked' : undefined, onchange: () => { state.qDraft.correct = i; } }),
                el('input', { type: 'text', placeholder: `خيار ${i + 1}`, value: opt, oninput: (e) => { state.qDraft.options[i] = e.target.value; } }),
                state.qDraft.options.length > 2 ? el('button', { class: 'btn btn-ghost btn-sm', onclick: () => { syncDraftText(); state.qDraft.options.splice(i, 1); if (state.qDraft.correct >= state.qDraft.options.length) state.qDraft.correct = 0; render(); } }, ['✕']) : null
            ]));
        });
        if (state.qDraft.options.length < 6) {
            optWrap.appendChild(el('button', { class: 'btn btn-ghost btn-sm', onclick: () => { syncDraftText(); state.qDraft.options.push(''); render(); } }, ['+ إضافة خيار']));
        }
        panel.appendChild(optWrap);
    } else {
        panel.appendChild(el('div', { class: 'field' }, [
            el('label', {}, ['إجابة نموذجية (اختياري، تظهر لما يضغط "عرض الإجابة")']),
            el('textarea', { id: 'q-answer-input', placeholder: 'اختياري...' }, [state.qDraft.answer])
        ]));
    }

    panel.appendChild(el('button', { class: 'btn btn-primary', onclick: handleAddQuestion }, ['+ إضافة السؤال']));
    wrap.appendChild(panel);
    return wrap;
}

function syncDraftText() {
    const t = document.getElementById('q-text-input');
    if (t) state.qDraft.text = t.value;
}

async function handleAddQuestion() {
    syncDraftText();
    const text = document.getElementById('q-text-input').value.trim();
    if (!text) { showToast('اكتب نص السؤال أولاً.', 'error'); return; }

    let q;
    if (state.qDraft.type === 'mcq') {
        const options = state.qDraft.options.map(o => o.trim()).filter(o => o.length > 0);
        if (options.length < 2) { showToast('لازم خيارين على الأقل.', 'error'); return; }
        const correctIdx = Math.min(state.qDraft.correct, options.length - 1);
        q = { id: 'q_' + Date.now(), type: 'mcq', text, options, correct: correctIdx };
    } else {
        const answerInput = document.getElementById('q-answer-input');
        q = { id: 'q_' + Date.now(), type: 'open', text, answer: answerInput ? answerInput.value.trim() : '' };
    }

    state.currentMeta.questions = [...(state.currentMeta.questions || []), q];
    await saveLessonQuestions(state.currentId, state.currentMeta.questions);
    const lib = state.lessons.find(l => l.id === state.currentId);
    if (lib) lib.questions = state.currentMeta.questions;
    state.qDraft = { type: 'mcq', text: '', options: ['', ''], correct: 0, answer: '' };
    render();
}

async function deleteQuestion(qid) {
    state.currentMeta.questions = (state.currentMeta.questions || []).filter(q => q.id !== qid);
    await saveLessonQuestions(state.currentId, state.currentMeta.questions);
    const lib = state.lessons.find(l => l.id === state.currentId);
    if (lib) lib.questions = state.currentMeta.questions;
    render();
}

/* ---------------- Viewer ---------------- */
async function openViewer(id) {
    state.currentId = id;
    state.currentMeta = state.lessons.find(l => l.id === id);
    root().innerHTML = '';
    root().appendChild(el('div', { class: 'loading' }, [el('div', { class: 'spin' }), el('div', {}, ['يفتح الدرس...'])]));

    try {
        const doc_ = await pdfjsLib.getDocument({ url: state.currentMeta.pdfUrl }).promise;
        state.pdfDoc = doc_;
        state.currentPage = 1;
        state.view = 'viewer';
        render();
        drawCurrentPage();
    } catch (err) {
        showToast('ما قدرت أفتح ملف الدرس: ' + err.message, 'error');
        state.view = 'library';
        render();
    }
}

function renderViewer() {
    const wrap = el('div');
    wrap.appendChild(el('div', { class: 'top-actions' }, [
        el('div', { class: 'breadcrumb', onclick: () => { state.view = 'library'; render(); } }, ['→ رجوع للمكتبة']),
    ]));
    wrap.appendChild(el('div', { class: 'viewer-top' }, [
        el('h2', {}, [state.currentMeta.title]),
        el('button', { class: 'btn btn-ghost btn-sm', onclick: () => openQuestions(state.currentId) }, ['تعديل الأسئلة'])
    ]));

    const stage = el('div', { class: 'page-stage' }, [el('canvas', { id: 'pdf-canvas' })]);
    const showDots = state.pdfDoc.numPages <= 25;
    let tabstrip = null;
    if (showDots) {
        tabstrip = el('div', { class: 'tabstrip' });
        for (let p = 1; p <= state.pdfDoc.numPages; p++) {
            tabstrip.appendChild(el('div', { class: 'dot' + (p === state.currentPage ? ' current' : ''), onclick: () => goToPage(p) }));
        }
    }
    wrap.appendChild(el('div', { class: 'viewer-wrap' }, [tabstrip, stage].filter(Boolean)));

    const isLast = state.currentPage === state.pdfDoc.numPages;
    wrap.appendChild(el('div', { class: 'viewer-controls' }, [
        el('button', { class: 'nav-btn', disabled: state.currentPage <= 1 ? 'disabled' : undefined, onclick: () => goToPage(state.currentPage - 1) }, ['›']),
        el('div', { class: 'count' }, [`${state.currentPage} / ${state.pdfDoc.numPages}`]),
        el('button', { class: 'nav-btn', onclick: () => isLast ? goToQuiz() : goToPage(state.currentPage + 1) }, [isLast ? '✓' : '‹']),
    ]));
    if (isLast) {
        wrap.appendChild(el('div', { style: 'text-align:center;margin-top:10px;' }, [
            el('button', { class: 'btn btn-primary btn-sm', onclick: goToQuiz }, ['الانتقال للأسئلة ←'])
        ]));
    }
    return wrap;
}

function goToPage(p) {
    if (p < 1 || p > state.pdfDoc.numPages) return;
    state.currentPage = p;
    render();
    drawCurrentPage();
}

async function drawCurrentPage() {
    const canvas = document.getElementById('pdf-canvas');
    if (!canvas) return;
    const page = await state.pdfDoc.getPage(state.currentPage);
    const viewport = page.getViewport({ scale: 1.4 });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;
}

/* ---------------- Quiz ---------------- */
function goToQuiz() {
    state.quizAnswers = {};
    (state.currentMeta.questions || []).forEach(q => { state.quizAnswers[q.id] = { selected: null, submitted: false, revealed: false }; });
    state.view = 'quiz';
    render();
}

function renderQuiz() {
    const wrap = el('div');
    wrap.appendChild(el('div', { class: 'top-actions' }, [
        el('div', { class: 'breadcrumb', onclick: () => { state.view = 'viewer'; render(); drawCurrentPage(); } }, ['→ رجوع للصفحات']),
        el('div', { class: 'breadcrumb', onclick: () => { state.view = 'library'; render(); } }, ['المكتبة ←']),
    ]));

    const questions = state.currentMeta.questions || [];
    wrap.appendChild(el('div', { class: 'worksheet-header' }, [
        el('h2', {}, ['أسئلة الدرس']),
        el('p', {}, [state.currentMeta.title])
    ]));

    if (questions.length === 0) {
        wrap.appendChild(el('div', { class: 'score-card' }, [
            el('p', {}, ['ما فيه أسئلة مضافة لهذا الدرس بعد.']),
            el('button', { class: 'btn btn-primary btn-sm', onclick: () => openQuestions(state.currentId) }, ['+ إضافة أسئلة'])
        ]));
        return wrap;
    }

    const mcqs = questions.filter(q => q.type === 'mcq');
    const submittedMcqs = mcqs.filter(q => state.quizAnswers[q.id].submitted);
    if (mcqs.length > 0 && submittedMcqs.length === mcqs.length) {
        const correctCount = mcqs.filter(q => state.quizAnswers[q.id].selected === q.correct).length;
        wrap.appendChild(el('div', { class: 'score-card' }, [
            el('div', { style: 'font-size:13px;color:var(--ink-soft);margin-bottom:6px;' }, ['نتيجتك في الأسئلة الاختيارية']),
            el('div', { class: 'big' }, [`${correctCount} / ${mcqs.length}`]),
        ]));
    }

    questions.forEach((q, i) => {
        const ans = state.quizAnswers[q.id];
        const card = el('div', { class: 'qcard' }, [
            el('div', { class: 'qnum' }, [`سؤال ${i + 1}`]),
            el('div', { class: 'qtext' }, [q.text]),
        ]);
        if (q.type === 'mcq') {
            q.options.forEach((opt, oi) => {
                let cls = 'choice';
                if (ans.submitted) {
                    if (oi === q.correct) cls += ' correct';
                    else if (oi === ans.selected) cls += ' wrong';
                } else if (ans.selected === oi) {
                    cls += ' selected';
                }
                card.appendChild(el('div', { class: cls, onclick: () => { if (!ans.submitted) { ans.selected = oi; render(); } } }, [
                    el('input', { type: 'radio', name: 'quiz-' + q.id, checked: ans.selected === oi ? 'checked' : undefined, disabled: ans.submitted ? 'disabled' : undefined }),
                    el('span', {}, [opt])
                ]));
            });
            if (!ans.submitted) {
                card.appendChild(el('button', { class: 'btn btn-primary btn-sm', style: 'margin-top:8px;', disabled: ans.selected === null ? 'disabled' : undefined, onclick: () => { ans.submitted = true; render(); } }, ['تحقق من الإجابة']));
            } else {
                const ok = ans.selected === q.correct;
                card.appendChild(el('div', { class: 'feedback ' + (ok ? 'ok' : 'no') }, [ok ? '✓ إجابة صحيحة' : '✕ إجابة غير صحيحة']));
            }
        } else {
            card.appendChild(el('button', { class: 'btn btn-ghost btn-sm reveal-btn', onclick: () => { ans.revealed = !ans.revealed; render(); } }, [ans.revealed ? 'إخفاء الإجابة' : 'عرض الإجابة']));
            if (ans.revealed) {
                card.appendChild(el('div', { class: 'answer-box' }, [q.answer ? q.answer : 'ما فيه إجابة نموذجية مكتوبة لهذا السؤال.']));
            }
        }
        wrap.appendChild(card);
    });

    return wrap;
}

/* ---------------- Library actions ---------------- */
function openAdd() {
    state.addError = '';
    state.view = 'add';
    render();
}

async function deleteLesson(id) {
    if (!confirm('حذف هذا الدرس نهائياً؟ (ملف الـ PDF بيبقى مرفوع في Cloudinary بدون ربط)')) return;
    await deleteDoc(doc(db, "lessons", id));
    state.lessons = state.lessons.filter(l => l.id !== id);
    render();
}

/* ---------------- Boot ---------------- */
async function bootLibrary() {
    state.view = 'loading';
    render();
    state.lessons = await fetchUserLessons();
    state.view = 'library';
    render();
}

document.addEventListener("DOMContentLoaded", () => {
    setupAuth();
    setupProfileMenu();
    setupDeleteAccount();
});
