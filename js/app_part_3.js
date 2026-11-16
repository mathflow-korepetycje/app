// ==================== KONFIGURACJA SUPABASE (CHMURA + LOGOWANIE) ====================
        const SUPABASE_URL = 'https://rigytlossnilebvijthk.supabase.co';
        const SUPABASE_ANON_KEY = 'sb_publishable_LmI8Ral-ZV2J1fx16XxEyw_I9ne9tTY';
        const isEmbeddedSandbox = (() => {
            try {
                return window.self !== window.top || ['about:', 'blob:', 'data:', 'file:'].includes(window.location.protocol);
            } catch (e) {
                return true;
            }
        })();
        const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        let currentUser = null;
        let isSyncingFromCloud = false;
        let cloudSaveTimer = null;
        let realtimeChannel = null;
        let cloudPollInterval = null;
        let lastCloudUpdatedAt = null;

        // ==================== ŚCIEŻKI EDUKACYJNE (AUTO-AWANS 1 WRZEŚNIA) ====================
        const SCHOOL_LEVELS = [
            'Szkoła Podstawowa - klasa 1',
            'Szkoła Podstawowa - klasa 2',
            'Szkoła Podstawowa - klasa 3',
            'Szkoła Podstawowa - klasa 4',
            'Szkoła Podstawowa - klasa 5',
            'Szkoła Podstawowa - klasa 6',
            'Szkoła Podstawowa - klasa 7',
            'Szkoła Podstawowa - klasa 8 (E8)',
            'Liceum - klasa 1 (Podstawa)',
            'Liceum - klasa 1 (Rozszerzenie)',
            'Liceum - klasa 2 (Podstawa)',
            'Liceum - klasa 2 (Rozszerzenie)',
            'Liceum - klasa 3 (Podstawa)',
            'Liceum - klasa 3 (Rozszerzenie)',
            'Liceum - klasa 4 (Podstawa)',
            'Liceum - klasa 4 (Rozszerzenie)',
            'Technikum - klasa 1 (Podstawa)',
            'Technikum - klasa 1 (Rozszerzenie)',
            'Technikum - klasa 2 (Podstawa)',
            'Technikum - klasa 2 (Rozszerzenie)',
            'Technikum - klasa 3 (Podstawa)',
            'Technikum - klasa 3 (Rozszerzenie)',
            'Technikum - klasa 4 (Podstawa)',
            'Technikum - klasa 4 (Rozszerzenie)',
            'Technikum - klasa 5 (Podstawa)',
            'Technikum - klasa 5 (Rozszerzenie)',
            'Studia / Matura poprawkowa / Dorośli'
        ];

        const PROMOTION_MAP = {
            'Szkoła Podstawowa - klasa 1': 'Szkoła Podstawowa - klasa 2',
            'Szkoła Podstawowa - klasa 2': 'Szkoła Podstawowa - klasa 3',
            'Szkoła Podstawowa - klasa 3': 'Szkoła Podstawowa - klasa 4',
            'Szkoła Podstawowa - klasa 4': 'Szkoła Podstawowa - klasa 5',
            'Szkoła Podstawowa - klasa 5': 'Szkoła Podstawowa - klasa 6',
            'Szkoła Podstawowa - klasa 6': 'Szkoła Podstawowa - klasa 7',
            'Szkoła Podstawowa - klasa 7': 'Szkoła Podstawowa - klasa 8 (E8)',
            'Szkoła Podstawowa - klasa 8 (E8)': 'Liceum - klasa 1 (Podstawa)',
            'Liceum - klasa 1 (Podstawa)': 'Liceum - klasa 2 (Podstawa)',
            'Liceum - klasa 1 (Rozszerzenie)': 'Liceum - klasa 2 (Rozszerzenie)',
            'Liceum - klasa 2 (Podstawa)': 'Liceum - klasa 3 (Podstawa)',
            'Liceum - klasa 2 (Rozszerzenie)': 'Liceum - klasa 3 (Rozszerzenie)',
            'Liceum - klasa 3 (Podstawa)': 'Liceum - klasa 4 (Podstawa)',
            'Liceum - klasa 3 (Rozszerzenie)': 'Liceum - klasa 4 (Rozszerzenie)',
            'Liceum - klasa 4 (Podstawa)': 'Studia / Matura poprawkowa / Dorośli',
            'Liceum - klasa 4 (Rozszerzenie)': 'Studia / Matura poprawkowa / Dorośli',
            'Technikum - klasa 1 (Podstawa)': 'Technikum - klasa 2 (Podstawa)',
            'Technikum - klasa 1 (Rozszerzenie)': 'Technikum - klasa 2 (Rozszerzenie)',
            'Technikum - klasa 2 (Podstawa)': 'Technikum - klasa 3 (Podstawa)',
            'Technikum - klasa 2 (Rozszerzenie)': 'Technikum - klasa 3 (Rozszerzenie)',
            'Technikum - klasa 3 (Podstawa)': 'Technikum - klasa 4 (Podstawa)',
            'Technikum - klasa 3 (Rozszerzenie)': 'Technikum - klasa 4 (Rozszerzenie)',
            'Technikum - klasa 4 (Podstawa)': 'Technikum - klasa 5 (Podstawa)',
            'Technikum - klasa 4 (Rozszerzenie)': 'Technikum - klasa 5 (Rozszerzenie)',
            'Technikum - klasa 5 (Podstawa)': 'Studia / Matura poprawkowa / Dorośli',
            'Technikum - klasa 5 (Rozszerzenie)': 'Studia / Matura poprawkowa / Dorośli',
            // Obsługa starszych zapisów
            'Liceum / Technikum - klasa 1 (Podstawa)': 'Liceum - klasa 2 (Podstawa)',
            'Liceum / Technikum - klasa 1 (Rozszerzenie)': 'Liceum - klasa 2 (Rozszerzenie)',
            'Liceum / Technikum - klasa 2 (Podstawa)': 'Liceum - klasa 3 (Podstawa)',
            'Liceum / Technikum - klasa 2 (Rozszerzenie)': 'Liceum - klasa 3 (Rozszerzenie)',
            'Liceum / Technikum - klasa 3 (Podstawa)': 'Liceum - klasa 4 (Podstawa)',
            'Liceum / Technikum - klasa 3 (Rozszerzenie)': 'Liceum - klasa 4 (Rozszerzenie)',
            'Liceum - klasa 4 / Technikum - klasa 4 (Podstawa)': 'Studia / Matura poprawkowa / Dorośli',
            'Liceum - klasa 4 / Technikum - klasa 4 (Rozszerzenie)': 'Studia / Matura poprawkowa / Dorośli',
            'Technikum - klasa 5 (Matura Podstawa)': 'Studia / Matura poprawkowa / Dorośli',
            'Technikum - klasa 5 (Matura Rozszerzenie)': 'Studia / Matura poprawkowa / Dorośli'
        };

        function getCurrentSchoolYearStart(dateObj = new Date()) {
            const year = dateObj.getFullYear();
            const month = dateObj.getMonth();
            return month >= 8 ? year : year - 1;
        }

        // ==================== STAN APLIKACJI I PAMIĘĆ LOKALNA + CHMURA ====================
        const STORAGE_KEY = 'mathflow_tutor_crm_v3';

        function formatDateISO(dateObj) {
            const y = dateObj.getFullYear();
            const m = String(dateObj.getMonth() + 1).padStart(2, '0');
            const d = String(dateObj.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        }

        function addDaysISO(baseDate, days) {
            const d = new Date(baseDate);
            d.setDate(d.getDate() + days);
            return formatDateISO(d);
        }

        const todayObj = new Date();
        const todayISO = formatDateISO(todayObj);
        const currentSysYear = getCurrentSchoolYearStart(todayObj);

        const defaultState = {
            settings: {
                tutorName: 'Jan Kowalski',
                blikPhone: '500 600 700',
                bankAccount: '',
                ndgQuarterlyLimit: 10813.50,
                defaultRate: 90,
                notificationsEnabled: false,
                googleClientId: ''
            },
            students: [
                {
                    id: 'stu_1',
                    name: 'Kacper Nowak',
                    phone: '601 234 567',
                    email: 'kacper.nowak@gmail.com',
                    parentName: 'Anna Nowak',
                    parentPhone: '501 222 333',
                    parentEmail: 'anna.nowak@gmail.com',
                    level: 'Szkoła Podstawowa - klasa 8 (E8)',
                    schoolYearStart: currentSysYear,
                    rate: 90
                },
                {
                    id: 'stu_2',
                    name: 'Zuzanna Wiśniewska',
                    phone: '602 345 678',
                    email: 'zuzia.wisniewska@gmail.com',
                    parentName: 'Marek Wiśniewski',
                    parentPhone: '502 444 555',
                    parentEmail: 'm.wisniewski@gmail.com',
                    level: 'Liceum - klasa 3 (Rozszerzenie)',
                    schoolYearStart: currentSysYear,
                    rate: 110
                },
                {
                    id: 'stu_3',
                    name: 'Michał Zieliński',
                    phone: '603 456 789',
                    email: 'michal.z@gmail.com',
                    parentName: 'Katarzyna Zielińska',
                    parentPhone: '503 666 777',
                    parentEmail: 'k.zielinska@gmail.com',
                    level: 'Liceum - klasa 1 (Podstawa)',
                    schoolYearStart: currentSysYear,
                    rate: 80
                }
            ],
            groups: [
                {
                    id: 'grp_1',
                    name: 'Grupa E8 - Środa 17:00',
                    level: 'Szkoła Podstawowa - klasa 8 (E8)',
                    schoolYearStart: currentSysYear,
                    studentIds: ['stu_1', 'stu_3'],
                    ratePerStudent: 60
                }
            ],
            payments: [
                {
                    id: 'pay_1',
                    studentId: 'stu_1',
                    amount: 360,
                    date: addDaysISO(todayObj, -12),
                    method: 'BLIK',
                    note: 'Nadpłata za 4 lekcje z góry'
                },
                {
                    id: 'pay_2',
                    studentId: 'stu_2',
                    amount: 110,
                    date: addDaysISO(todayObj, -6),
                    method: 'Przelew',
                    note: 'Opłata za zajęcia z funkcji kwadratowej'
                }
            ],
            lessons: [
                {
                    id: 'les_1',
                    targetType: 'single',
                    studentId: 'stu_1',
                    groupId: null,
                    date: addDaysISO(todayObj, -7),
                    time: '16:00',
                    duration: 60,
                    status: 'completed',
                    topic: 'Ułamki algebraiczne i przekształcanie wzorów',
                    homework: 'Zbiór zadań str. 42 zad. 1-10',
                    hwStatus: 'done',
                    participants: [{ studentId: 'stu_1', price: 90 }]
                },
                {
                    id: 'les_2',
                    targetType: 'single',
                    studentId: 'stu_2',
                    groupId: null,
                    date: addDaysISO(todayObj, -5),
                    time: '17:30',
                    duration: 90,
                    status: 'completed',
                    topic: 'Funkcja kwadratowa z parametrem - analiza miejsc zerowych',
                    homework: 'Arkusz maturalny CKE maj 2024 - zadania otwarte',
                    hwStatus: 'assigned',
                    participants: [{ studentId: 'stu_2', price: 165 }]
                },
                {
                    id: 'les_3',
                    targetType: 'group',
                    studentId: null,
                    groupId: 'grp_1',
                    date: addDaysISO(todayObj, -2),
                    time: '17:00',
                    duration: 60,
                    status: 'completed',
                    topic: 'Powtórka E8: Procenty, podwyżki i obniżki',
                    homework: 'Karta pracy PDF (12 zadań)',
                    hwStatus: 'partial',
                    participants: [
                        { studentId: 'stu_1', price: 60 },
                        { studentId: 'stu_3', price: 60 }
                    ]
                },
                {
                    id: 'les_4',
                    targetType: 'single',
                    studentId: 'stu_1',
                    groupId: null,
                    date: todayISO,
                    time: '16:00',
                    duration: 60,
                    status: 'planned',
                    topic: 'Geometria płaska - twierdzenie Pitagorasa i pola figur',
                    homework: '',
                    hwStatus: 'none',
                    participants: [{ studentId: 'stu_1', price: 90 }]
                },
                {
                    id: 'les_5',
                    targetType: 'single',
                    studentId: 'stu_2',
                    groupId: null,
                    date: addDaysISO(todayObj, 2),
                    time: '18:00',
                    duration: 60,
                    status: 'planned',
                    topic: 'Ciągi arytmetyczne i geometryczne',
                    homework: '',
                    hwStatus: 'none',
                    participants: [{ studentId: 'stu_2', price: 110 }]
                }
            ],
            examScores: [
                { id: 'ex_1', studentId: 'stu_1', title: 'Diagnoza wstępna E8', date: addDaysISO(todayObj, -30), percent: 56 },
                { id: 'ex_2', studentId: 'stu_1', title: 'Arkusz próbny CKE', date: addDaysISO(todayObj, -10), percent: 72 },
                { id: 'ex_3', studentId: 'stu_2', title: 'Matura Rozszerzona - Próbna', date: addDaysISO(todayObj, -14), percent: 68 }
            ],
            whiteboards: {}
        };

        let state = loadState();
        let activeTab = 'dashboard';
        let currentCalendarYear = todayObj.getFullYear();
        let currentCalendarMonth = todayObj.getMonth();
        let selectedCalendarDate = todayISO;
        let notifiedLessonsSet = new Set();

        function loadState() {
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                if (!raw) return JSON.parse(JSON.stringify(defaultState));
                const parsed = JSON.parse(raw);
                return {
                    ...defaultState,
                    ...parsed,
                    settings: { ...defaultState.settings, ...(parsed.settings || {}) },
                    payments: parsed.payments || [],
                    students: parsed.students || [],
                    groups: parsed.groups || [],
                    lessons: parsed.lessons || [],
                    examScores: parsed.examScores || [],
                    whiteboards: parsed.whiteboards || {}
                };
            } catch (e) {
                return JSON.parse(JSON.stringify(defaultState));
            }
        }

        function setCloudSyncUI(status, text) {
            const el = document.getElementById('cloud-sync-indicator');
            if (!el) return;
            if (status === 'syncing') {
                el.className = 'px-3.5 py-2 rounded-xl bg-amber-950/60 text-[11px] text-amber-300 font-medium flex items-center gap-2';
                el.innerHTML = `<i class="fa-solid fa-arrows-rotate fa-spin"></i><span>${text || 'Zapisywanie w chmurze...'}</span>`;
            } else if (status === 'error') {
                el.className = 'px-3.5 py-2 rounded-xl bg-rose-950/70 text-[11px] text-rose-300 font-medium flex items-center gap-2';
                el.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i><span>${text || 'Błąd synchronizacji'}</span>`;
            } else {
                el.className = 'px-3.5 py-2 rounded-xl bg-slate-800/80 text-[11px] text-emerald-400 font-medium flex items-center gap-2';
                el.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400"></span><span>${text || 'Chmura zsynchronizowana'}</span>`;
            }
        }

        function saveState() {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            } catch (e) {}

            if (!currentUser || isSyncingFromCloud) return;

            setCloudSyncUI('syncing', 'Zapisywanie w chmurze...');
            clearTimeout(cloudSaveTimer);
            cloudSaveTimer = setTimeout(async () => {
                try {
                    const nowIso = new Date().toISOString();
                    const { error } = await supabaseClient
                        .from('mathflow_state')
                        .upsert({
                            user_id: currentUser.id,
                            data: state,
                            updated_at: nowIso
                        }, { onConflict: 'user_id' });

                    if (error) {
                        console.error('Supabase save error:', error);
                        setCloudSyncUI('error', 'Błąd zapisu (sprawdź SQL)');
                    } else {
                        lastCloudUpdatedAt = nowIso;
                        setCloudSyncUI('ok', 'Chmura zsynchronizowana');
                    }
                } catch (err) {
                    console.error('Cloud sync exception:', err);
                    setCloudSyncUI('error', 'Brak połączenia z chmurą');
                }
            }, 350);
        }

        async function loadStateFromCloud(silent = false) {
            if (!currentUser) return;
            if (!silent) setCloudSyncUI('syncing', 'Pobieranie z chmury...');
            try {
                const { data, error } = await supabaseClient
                    .from('mathflow_state')
                    .select('data, updated_at')
                    .eq('user_id', currentUser.id)
                    .maybeSingle();

                if (error) {
                    console.error('Supabase fetch error:', error);
                    setCloudSyncUI('error', 'Brak tabeli mathflow_state');
                    return;
                }

                if (data && data.data) {
                    if (silent && lastCloudUpdatedAt && data.updated_at === lastCloudUpdatedAt) {
                        return;
                    }
                    lastCloudUpdatedAt = data.updated_at;
                    isSyncingFromCloud = true;
                    state = {
                        ...defaultState,
                        ...data.data,
                        settings: { ...defaultState.settings, ...(data.data.settings || {}) },
                        payments: data.data.payments || [],
                        students: data.data.students || [],
                        groups: data.data.groups || [],
                        lessons: data.data.lessons || [],
                        examScores: data.data.examScores || [],
                        whiteboards: data.data.whiteboards || {}
                    };
                    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
                    runAcademicYearPromotion();
                    populateDashboardYears();
                    populateLessonDropdowns();
                    renderCurrentView();
                    isSyncingFromCloud = false;
                    setCloudSyncUI('ok', 'Chmura zsynchronizowana');
                    if (silent) showToast('Zaktualizowano dane z drugiego urządzenia.', 'info');
                } else if (!silent) {
                    saveState();
                }
            } catch (err) {
                isSyncingFromCloud = false;
                setCloudSyncUI('error', 'Tryb offline');
            }
        }

        function subscribeToRealtimeChanges() {
            if (!currentUser) return;

            if (cloudPollInterval) clearInterval(cloudPollInterval);
            cloudPollInterval = setInterval(() => {
                if (document.visibilityState === 'visible' && !cloudSaveTimer) {
                    loadStateFromCloud(true);
                }
            }, 12000);

            if (isEmbeddedSandbox) return;

            try {
                if (realtimeChannel) {
                    supabaseClient.removeChannel(realtimeChannel);
                }

                realtimeChannel = supabaseClient
                    .channel('mathflow_realtime_' + currentUser.id)
                    .on(
                        'postgres_changes',
                        {
                            event: '*',
                            schema: 'public',
                            table: 'mathflow_state',
                            filter: `user_id=eq.${currentUser.id}`
                        },
                        (payload) => {
                            if (payload.new && payload.new.data && !cloudSaveTimer) {
                                lastCloudUpdatedAt = payload.new.updated_at || new Date().toISOString();
                                isSyncingFromCloud = true;
                                state = {
                                    ...defaultState,
                                    ...payload.new.data,
                                    settings: { ...defaultState.settings, ...(payload.new.data.settings || {}) }
                                };
                                try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
                                runAcademicYearPromotion();
                                populateDashboardYears();
                                populateLessonDropdowns();
                                renderCurrentView();
                                isSyncingFromCloud = false;
                                setCloudSyncUI('ok', 'Zsynchronizowano na żywo');
                            }
                        }
                    )
                    .subscribe();
            } catch (e) {
                console.warn('Realtime fallback to HTTPS polling');
            }
        }

        async function handleSupabaseLogin(e) {
            e.preventDefault();
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;
            const errBox = document.getElementById('login-error-box');
            const btn = document.getElementById('login-submit-btn');

            errBox.classList.add('hidden');
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>Logowanie...</span>';

            try {
                const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
                if (error) {
                    errBox.textContent = 'Nieprawidłowy e-mail lub hasło (' + error.message + ')';
                    errBox.classList.remove('hidden');
                } else if (data && data.user) {
                    currentUser = data.user;
                    showAuthenticatedApp();
                }
            } catch (err) {
                errBox.textContent = 'Błąd połączenia z serwerem logowania.';
                errBox.classList.remove('hidden');
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i><span>Zaloguj do panelu</span>';
            }
        }

        async function handleSupabaseLogout() {
            await supabaseClient.auth.signOut();
            currentUser = null;
            if (cloudPollInterval) clearInterval(cloudPollInterval);
            if (realtimeChannel) {
                try { supabaseClient.removeChannel(realtimeChannel); } catch (e) {}
            }
            document.getElementById('app-shell').classList.add('hidden');
            document.getElementById('auth-screen').classList.remove('hidden');
            showToast('Wylogowano z panelu.', 'info');
        }

        async function showAuthenticatedApp() {
            document.getElementById('auth-screen').classList.add('hidden');
            const standaloneParams = getStandaloneBoardParams();
            if (standaloneParams) {
                isStandaloneBoardWindow = true;
                const shell = document.getElementById('app-shell');
                if (shell) shell.remove();
                try {
                    window.history.replaceState({ mathflow: true, standaloneBoard: true }, '', window.location.href);
                    window.history.pushState({ mathflow: true, standaloneBoard: true }, '', window.location.href);
                } catch (e) {}
                await loadStateFromCloud(false);
                subscribeToRealtimeChanges();
                const nb = getOrCreateStudentNotebook(standaloneParams.studentId);
                openWhiteboardNotebook(nb.id, standaloneParams.sectionId);
                return;
            }

            document.getElementById('app-shell').classList.remove('hidden');
            await loadStateFromCloud(false);
            subscribeToRealtimeChanges();
            renderCurrentView();
        }

        async function initAuthAndApp() {
            initMobileBackNavigation();
            runAcademicYearPromotion();
            populateDashboardYears();
            populateLessonDropdowns();
            updateNotificationButtonUI();
            updateGoogleApiStatusUI();

            const now = new Date();
            const currentQ = Math.floor(now.getMonth() / 3) + 1;
            const qEl = document.getElementById('dashboard-quarter');
            const yEl = document.getElementById('dashboard-year');
            if (qEl) qEl.value = String(currentQ);
            if (yEl) yEl.value = String(now.getFullYear());

            try {
                const { data: { session } } = await supabaseClient.auth.getSession();
                if (session && session.user) {
                    currentUser = session.user;
                    await showAuthenticatedApp();
                } else {
                    document.getElementById('auth-screen').classList.remove('hidden');
                    document.getElementById('app-shell').classList.add('hidden');
                }
            } catch (e) {
                document.getElementById('auth-screen').classList.remove('hidden');
            }

            setInterval(checkUpcomingLessonReminders, 30000);
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible' && currentUser) {
                    loadStateFromCloud(true);
                }
            });
        }

        // ==================== POMOCNICY FORMATOWANIA I KASKADOWYCH KLAS ====================
        function formatMoney(val) {
            const num = Number(val) || 0;
            return num.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' zł';
        }

        function escapeHTML(str) {
            if (!str) return '';
            return String(str).replace(/[&<>"']/g, m => ({
                '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
            }[m]));
        }

        function showToast(message, type = 'success') {
            const container = document.getElementById('toast-container');
            if (!container) return;
            const toast = document.createElement('div');
            const colors = {
                success: 'bg-slate-900 text-white border-emerald-500',
                error: 'bg-rose-600 text-white border-rose-800',
                info: 'bg-brand-600 text-white border-brand-800'
            };
            const icons = {
                success: 'fa-circle-check text-emerald-400',
                error: 'fa-circle-exclamation text-white',
                info: 'fa-circle-info text-white'
            };
            toast.className = `${colors[type] || colors.success} border-l-4 px-4 py-3 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2.5 pointer-events-auto fade-in`;
            toast.innerHTML = `<i class="fa-solid ${icons[type] || icons.success} text-sm"></i><span>${escapeHTML(message)}</span>`;
            container.appendChild(toast);
            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transition = 'opacity 0.25s ease';
                setTimeout(() => toast.remove(), 260);
            }, 3400);
        }

        // ==================== OBSŁUGA SYSTEMOWEGO PRZYCISKU WSTECZ (MOBILE / PWA) ====================
        let isHandlingPopState = false;
        let lastExitWarningTime = 0;

        function pushNavHistory(entry) {
            if (isHandlingPopState) return;
            try {
                window.history.pushState({ mathflow: true, ...entry }, '');
            } catch (e) {}
        }

        function getOpenModalIds() {
            const modalIds = [
                'modal-lesson', 'modal-payment', 'modal-student', 'modal-group',
                'modal-note', 'modal-exam', 'modal-blik', 'modal-clear', 'modal-student-details', 'modal-kpi-breakdown'
            ];
            return modalIds.filter(id => {
                const el = document.getElementById(id);
                return el && !el.classList.contains('hidden');
            });
        }

        function initMobileBackNavigation() {
            try {
                window.history.replaceState({ mathflow: true, tab: 'dashboard', root: true }, '');
                window.history.pushState({ mathflow: true, tab: 'dashboard' }, '');
            } catch (e) {}

            window.addEventListener('popstate', (event) => {
                isHandlingPopState = true;
                try {
                    // 0. Jeśli jesteśmy w trybie osobnego okna tablicy (Meet), całkowicie zablokuj cofanie do panelu rozliczeń
                    if (isStandaloneBoardWindow || getStandaloneBoardParams()) {
                        try {
                            window.history.pushState({ mathflow: true, standaloneBoard: true }, '', window.location.href);
                        } catch (e) {}
                        return;
                    }

                    // 1. Jeśli otwarta jest tablica pełnoekranowa — zamknij ją
                    const wbEl = document.getElementById('whiteboard-overlay');
                    if (wbEl && !wbEl.classList.contains('hidden')) {
                        closeWhiteboard(true);
                        return;
                    }

                    // 2. Jeśli otwarty jest dowolny modal — zamknij najnowszy
                    const openModals = getOpenModalIds();
                    if (openModals.length > 0) {
                        const topModal = openModals[openModals.length - 1];
                        const el = document.getElementById(topModal);
                        if (el) el.classList.add('hidden');
                        return;
                    }

                    // 3. Jeśli jest wpisana poprzednia zakładka w historii — przełącz do niej
                    const targetTab = event.state && event.state.tab ? event.state.tab : 'dashboard';
                    if (activeTab !== targetTab) {
                        switchTab(targetTab, true);
                        return;
                    }

                    // 4. Jesteśmy na głównym ekranie (Pulpit) — zapobiegaj przypadkowemu wyjściu na pulpit telefonu
                    const now = Date.now();
                    if (now - lastExitWarningTime > 2500) {
                        lastExitWarningTime = now;
                        showToast('Naciśnij Wstecz ponownie, aby zamknąć aplikację.', 'info');
                        window.history.pushState({ mathflow: true, tab: activeTab }, '');
                    }
                } finally {
                    isHandlingPopState = false;
                }
            });
        }

        function openModal(id) {
            const el = document.getElementById(id);
            if (el) {
                const wasHidden = el.classList.contains('hidden');
                el.classList.remove('hidden');
                if (wasHidden) {
                    pushNavHistory({ modal: id, tab: activeTab });
                }
            }
        }

        function closeModal(id, fromPopState = false) {
            const el = document.getElementById(id);
            if (el && !el.classList.contains('hidden')) {
                el.classList.add('hidden');
                if (!fromPopState && !isHandlingPopState && window.history.state && window.history.state.modal === id) {
                    isHandlingPopState = true;
                    try { window.history.back(); } catch (e) {}
                    setTimeout(() => { isHandlingPopState = false; }, 60);
                }
            }
        }

        function updateLevelSelectors(prefix, presetLevel = null) {
            const typeEl = document.getElementById(`${prefix}-school-type`);
            const trackWrap = document.getElementById(`${prefix}-track-wrap`);
            const trackEl = document.getElementById(`${prefix}-school-track`);
            const gradeWrap = document.getElementById(`${prefix}-grade-wrap`);
            const gradeEl = document.getElementById(`${prefix}-school-grade`);
            if (!typeEl || !gradeEl) return;

            if (presetLevel) {
                if (presetLevel.startsWith('Szkoła Podstawowa')) {
                    typeEl.value = 'SP';
                } else if (presetLevel.startsWith('Liceum')) {
                    typeEl.value = 'LO';
                } else if (presetLevel.startsWith('Technikum')) {
                    typeEl.value = 'TECH';
                } else {
                    typeEl.value = 'OTHER';
                }
                if (trackEl) {
                    trackEl.value = presetLevel.includes('Rozszerzenie') ? 'Rozszerzenie' : 'Podstawa';
                }
            }

            const schoolType = typeEl.value;
            if (schoolType === 'SP') {
                trackWrap.classList.add('hidden');
                gradeWrap.classList.remove('hidden');
                gradeEl.innerHTML = [1, 2, 3, 4, 5, 6, 7, 8].map(g => {
                    const label = g === 8 ? 'klasa 8 (E8)' : `klasa ${g}`;
                    return `<option value="${label}">${label}</option>`;
                }).join('');
            } else if (schoolType === 'LO') {
                trackWrap.classList.remove('hidden');
                gradeWrap.classList.remove('hidden');
                gradeEl.innerHTML = [1, 2, 3, 4].map(g => `<option value="klasa ${g}">klasa ${g}</option>`).join('');
            } else if (schoolType === 'TECH') {
                trackWrap.classList.remove('hidden');
                gradeWrap.classList.remove('hidden');
                gradeEl.innerHTML = [1, 2, 3, 4, 5].map(g => `<option value="klasa ${g}">klasa ${g}</option>`).join('');
            } else {
                trackWrap.classList.add('hidden');
                gradeWrap.classList.add('hidden');
                gradeEl.innerHTML = '';
            }

            if (presetLevel && gradeEl.options.length > 0) {
                const match = presetLevel.match(/klasa \d+( \(E8\))?/);
                if (match) gradeEl.value = match[0];
            }

            syncComposedLevel(prefix);
        }

        function syncComposedLevel(prefix) {
            const typeEl = document.getElementById(`${prefix}-school-type`);
            const trackEl = document.getElementById(`${prefix}-school-track`);
            const gradeEl = document.getElementById(`${prefix}-school-grade`);
            const hiddenEl = document.getElementById(`${prefix}-level`);
            if (!typeEl || !hiddenEl) return;

            const t = typeEl.value;
            if (t === 'SP') {
                hiddenEl.value = `Szkoła Podstawowa - ${gradeEl.value}`;
            } else if (t === 'LO') {
                hiddenEl.value = `Liceum - ${gradeEl.value} (${trackEl.value})`;
            } else if (t === 'TECH') {
                hiddenEl.value = `Technikum - ${gradeEl.value} (${trackEl.value})`;
            } else {
                hiddenEl.value = 'Studia / Matura poprawkowa / Dorośli';
            }
        }

        function runAcademicYearPromotion() {
            const currentSchoolYear = getCurrentSchoolYearStart();
            let promotedCount = 0;

            state.students.forEach(s => {
                if (!s.schoolYearStart) s.schoolYearStart = currentSchoolYear;
                while (s.schoolYearStart < currentSchoolYear) {
                    if (PROMOTION_MAP[s.level]) {
                        s.level = PROMOTION_MAP[s.level];
                        promotedCount++;
                    }
                    s.schoolYearStart++;
                }
            });

            state.groups.forEach(g => {
                if (!g.schoolYearStart) g.schoolYearStart = currentSchoolYear;
                while (g.schoolYearStart < currentSchoolYear) {
                    if (PROMOTION_MAP[g.level]) {
                        g.level = PROMOTION_MAP[g.level];
                    }
                    g.schoolYearStart++;
                }
            });

            if (promotedCount > 0) {
                saveState();
            }
        }

        // ==================== NAWIGACJA I WIDOKI ====================
        const TAB_TITLES = {
            dashboard: 'Pulpit i Ewidencja',
            schedule: 'Kalendarz',
            boards: 'Tablice do lekcji',
            students: 'Uczniowie i Grupy',
            billing: 'Wpłaty i Rozliczenia',
            progress: 'Postępy i Arkusze',
            settings: 'Ustawienia i Kopia'
        };

        function switchTab(tabName, fromPopState = false) {
            const prevTab = activeTab;
            activeTab = tabName;
            document.querySelectorAll('.tab-view').forEach(el => el.classList.add('hidden'));
            const target = document.getElementById(`view-${tabName}`);
            if (target) target.classList.remove('hidden');

            const titleEl = document.getElementById('page-title');
            if (titleEl) titleEl.textContent = TAB_TITLES[tabName] || 'MathFlow';

            document.querySelectorAll('.nav-btn').forEach(btn => {
                const isActive = btn.dataset.nav === tabName;
                btn.className = isActive
                    ? 'nav-btn w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all bg-brand-600 text-white'
                    : 'nav-btn w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-all';
            });

            document.querySelectorAll('.nav-btn-mob').forEach(btn => {
                const isActive = btn.dataset.nav === tabName;
                btn.className = isActive
                    ? 'nav-btn-mob flex flex-col items-center justify-center flex-1 py-1 text-brand-600'
                    : 'nav-btn-mob flex flex-col items-center justify-center flex-1 py-1 text-slate-400';
            });

            if (!fromPopState && prevTab !== tabName) {
                pushNavHistory({ tab: tabName });
            }

            renderCurrentView();
        }

        function renderCurrentView() {
            if (activeTab === 'dashboard') renderDashboard();
            else if (activeTab === 'schedule') renderSchedule();
            else if (activeTab === 'boards') renderBoardsList();
            else if (activeTab === 'students') renderStudents();
            else if (activeTab === 'billing') renderBilling();
            else if (activeTab === 'progress') renderProgress();
            else if (activeTab === 'settings') renderSettings();
        }

        // ==================== FINANSE I OBLICZENIA SALD ====================
        function getStudentBalanceInfo(studentId) {
            const stu = state.students.find(s => s.id === studentId);
            const rate = Number(stu?.rate) || Number(state.settings.defaultRate) || 90;

            const totalPaid = state.payments
                .filter(p => p.studentId === studentId)
                .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

            let totalDue = 0;
            state.lessons.forEach(l => {
                if (l.status === 'completed') {
                    const part = (l.participants || []).find(p => p.studentId === studentId);
                    if (part) totalDue += Number(part.price) || 0;
                }
            });

            const balance = Math.round((totalPaid - totalDue) * 100) / 100;
            const lessonsEquivalent = rate > 0 ? Math.abs(balance) / rate : 0;
            const fullLessons = rate > 0 ? Math.floor((Math.abs(balance) + 0.001) / rate) : 0;
            const remainder = rate > 0 ? Math.round((Math.abs(balance) - fullLessons * rate) * 100) / 100 : 0;

            return { totalPaid, totalDue, balance, rate, lessonsEquivalent, fullLessons, remainder };
        }

        function formatLessonsCountPL(count) {
            const rounded = Math.round(count * 10) / 10;
            const str = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace('.', ',');
            if (rounded === 1) return `${str} lekcja`;
            const lastDigit = Math.floor(rounded) % 10;
            const lastTwo = Math.floor(rounded) % 100;
            if (Number.isInteger(rounded) && lastDigit >= 2 && lastDigit <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) {
                return `${str} lekcje`;
            }
            return `${str} lekcji`;
        }

        function getStudentUnpaidLessonsDetails(studentId) {
            const stuPayments = state.payments
                .filter(p => p.studentId === studentId)
                .slice()
                .sort((a, b) => a.date.localeCompare(b.date));
            let availableFunds = stuPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

            const completedLessons = state.lessons
                .filter(l => l.status === 'completed' && (l.participants || []).some(p => p.studentId === studentId))
                .slice()
                .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

            const unpaidItems = [];
            completedLessons.forEach(l => {
                const part = l.participants.find(p => p.studentId === studentId);
                const price = Number(part?.price) || 0;
                if (availableFunds >= price - 0.001) {
                    availableFunds -= price;
                } else {
                    const unpaidAmount = Math.round((price - Math.max(0, availableFunds)) * 100) / 100;
                    availableFunds = 0;
                    unpaidItems.push({
                        lesson: l,
                        fullPrice: price,
                        unpaidAmount,
                        isPartial: unpaidAmount < price - 0.001
                    });
                }
            });
            return unpaidItems;
        }

        function getStudentPrepaidUpcomingLessons(studentId) {
            const info = getStudentBalanceInfo(studentId);
            if (info.balance <= 0.001) return { info, coveredLessons: [], unscheduledCount: 0, remainderAfterScheduled: 0 };

            let remainingCredit = info.balance;
            const upcoming = state.lessons
                .filter(l => l.status === 'planned' && (l.participants || []).some(p => p.studentId === studentId))
                .slice()
                .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

            const coveredLessons = [];
            upcoming.forEach(l => {
                const part = l.participants.find(p => p.studentId === studentId);
                const price = Number(part?.price) || info.rate;
                if (remainingCredit >= price - 0.001) {
                    remainingCredit = Math.round((remainingCredit - price) * 100) / 100;
                    coveredLessons.push({ lesson: l, price, status: 'full' });
                } else if (remainingCredit > 0.001) {
                    coveredLessons.push({ lesson: l, price, coveredAmount: remainingCredit, status: 'partial' });
                    remainingCredit = 0;
                }
            });

            const unscheduledCount = info.rate > 0 ? Math.floor((remainingCredit + 0.001) / info.rate) : 0;
            const remainderAfterScheduled = info.rate > 0 ? Math.round((remainingCredit - unscheduledCount * info.rate) * 100) / 100 : 0;

            return { info, coveredLessons, unscheduledCount, remainderAfterScheduled };
        }

        function openKpiBreakdownModal(mode) {
            const container = document.getElementById('kpi-breakdown-content');
            if (!container) return;

            if (mode === 'debt') {
                const debtors = state.students
                    .map(s => ({
                        student: s,
                        info: getStudentBalanceInfo(s.id),
                        unpaidLessons: getStudentUnpaidLessonsDetails(s.id)
                    }))
                    .filter(d => d.info.balance < -0.001)
                    .sort((a, b) => a.info.balance - b.info.balance);

                const totalDebt = debtors.reduce((acc, d) => acc + Math.abs(d.info.balance), 0);

                container.innerHTML = `
                    <div class="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                        <div>
                            <span class="text-[11px] font-bold uppercase tracking-wider text-amber-600 block">Podsumowanie zaległości</span>
                            <h3 class="text-lg sm:text-xl font-extrabold text-slate-900">Łączne zaległości: <span class="text-amber-600">${formatMoney(totalDebt)}</span></h3>
                        </div>
                        <button onclick="closeModal('modal-kpi-breakdown')" class="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                    ${debtors.length === 0
                        ? '<p class="py-8 text-center text-xs text-emerald-600 font-semibold"><i class="fa-solid fa-check-circle mr-1"></i> Brak zaległości – wszyscy uczniowie są rozliczeni!</p>'
                        : `<div class="space-y-3">
                            ${debtors.map(d => `
                                <div class="p-3.5 rounded-2xl border border-amber-200 bg-amber-50/40 space-y-2.5">
                                    <div class="flex flex-wrap items-center justify-between gap-2">
                                        <div>
                                            <h4 class="font-extrabold text-sm text-slate-900">${escapeHTML(d.student.name)}</h4>
                                            <span class="text-[11px] text-slate-500">Nieopłacone zajęcia: <strong>${formatLessonsCountPL(d.info.lessonsEquivalent)}</strong> (${d.unpaidLessons.length} poz.)</span>
                                        </div>
                                        <div class="flex items-center gap-2">
                                            <span class="text-sm font-extrabold text-rose-600">Łącznie: ${formatMoney(Math.abs(d.info.balance))}</span>
                                            <button onclick="closeModal('modal-kpi-breakdown'); openPaymentModal('${d.student.id}', ${Math.abs(d.info.balance)})" class="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold">+ Wpłata</button>
                                        </div>
                                    </div>
                                    <div class="bg-white rounded-xl border border-amber-100 divide-y divide-slate-100">
                                        ${d.unpaidLessons.map(item => `
                                            <div class="px-3 py-2 flex items-center justify-between gap-2 text-xs">
                                                <div class="min-w-0">
                                                    <span class="font-bold text-slate-800">${item.lesson.date} • ${item.lesson.time}</span>
                                                    <span class="text-slate-400">(${item.lesson.duration} min)</span>
                                                    ${item.lesson.topic ? `<span class="text-slate-600 block sm:inline sm:ml-1.5 truncate">– ${escapeHTML(item.lesson.topic)}</span>` : ''}
                                                </div>
                                                <span class="font-bold text-amber-700 shrink-0">${formatMoney(item.unpaidAmount)}${item.isPartial ? ' (dopłata)' : ''}</span>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            `).join('')}
                        </div>`
                    }
                `;
            } else {
                const prepaidList = state.students
                    .map(s => ({
                        student: s,
                        ...getStudentPrepaidUpcomingLessons(s.id)
                    }))
                    .filter(d => d.info.balance > 0.001)
                    .sort((a, b) => b.info.balance - a.info.balance);

                const totalPrepaid = prepaidList.reduce((acc, d) => acc + d.info.balance, 0);

                container.innerHTML = `
                    <div class="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                        <div>
                            <span class="text-[11px] font-bold uppercase tracking-wider text-sky-600 block">Podsumowanie nadpłat (środki z góry)</span>
                            <h3 class="text-lg sm:text-xl font-extrabold text-slate-900">Łączne nadpłaty: <span class="text-sky-600">${formatMoney(totalPrepaid)}</span></h3>
                        </div>
                        <button onclick="closeModal('modal-kpi-breakdown')" class="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                    ${prepaidList.length === 0
                        ? '<p class="py-8 text-center text-xs text-slate-400">Brak aktywnych nadpłat na kontach uczniów.</p>'
                        : `<div class="space-y-3">
                            ${prepaidList.map(d => `
                                <div class="p-3.5 rounded-2xl border border-sky-200 bg-sky-50/40 space-y-2.5">
                                    <div class="flex flex-wrap items-center justify-between gap-2">
                                        <div>
                                            <h4 class="font-extrabold text-sm text-slate-900">${escapeHTML(d.student.name)}</h4>
                                            <span class="text-[11px] text-sky-800 font-semibold">
                                                Do zrobienia z nadpłaty: <strong>${formatLessonsCountPL(d.info.lessonsEquivalent)}</strong> (stawka ${d.info.rate} zł/h)
                                            </span>
                                        </div>
                                        <span class="text-sm font-extrabold text-sky-700">+${formatMoney(d.info.balance)}</span>
                                    </div>
                                    <div class="bg-white rounded-xl border border-sky-100 divide-y divide-slate-100">
                                        ${d.coveredLessons.length > 0
                                            ? d.coveredLessons.map((item, idx) => `
                                                <div class="px-3 py-2 flex items-center justify-between gap-2 text-xs">
                                                    <div class="min-w-0">
                                                        <span class="inline-block w-5 text-[11px] font-bold text-sky-600">#${idx + 1}</span>
                                                        <span class="font-bold text-slate-800">${item.lesson.date} • ${item.lesson.time}</span>
                                                        <span class="text-slate-400">(${item.lesson.duration} min)</span>
                                                        ${item.lesson.topic ? `<span class="text-slate-600 block sm:inline sm:ml-1.5 truncate">– ${escapeHTML(item.lesson.topic)}</span>` : ''}
                                                    </div>
                                                    <span class="px-2 py-0.5 rounded-md text-[10px] font-bold ${item.status === 'full' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'} shrink-0">
                                                        ${item.status === 'full' ? `Opłacona (${formatMoney(item.price)})` : `Częściowo (${formatMoney(item.coveredAmount)})`}
                                                    </span>
                                                </div>
                                            `).join('')
                                            : '<div class="px-3 py-2 text-xs text-slate-500">Brak zaplanowanych przyszłych terminów w kalendarzu.</div>'
                                        }
                                        ${d.unscheduledCount > 0 || d.remainderAfterScheduled > 0.001 ? `
                                            <div class="px-3 py-2 bg-sky-50/70 text-[11px] text-sky-800 font-medium flex items-center justify-between">
                                                <span>Pozostały wolny kredyt do zaplanowania w grafiku:</span>
                                                <strong>${d.unscheduledCount > 0 ? formatLessonsCountPL(d.unscheduledCount) : ''}${d.remainderAfterScheduled > 0.001 ? ` (+${formatMoney(d.remainderAfterScheduled)})` : ''}</strong>
                                            </div>
                                        ` : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>`
                    }
                `;
            }

            openModal('modal-kpi-breakdown');
        }

        function getLessonPaymentAllocation(studentId) {
            const studentPayments = state.payments
                .filter(p => p.studentId === studentId)
                .slice()
                .sort((a, b) => a.date.localeCompare(b.date));

            const paymentBuckets = studentPayments.map(p => ({
                ...p,
                remaining: Number(p.amount) || 0
            }));

            const studentCompletedLessons = state.lessons
                .filter(l => l.status === 'completed' && (l.participants || []).some(p => p.studentId === studentId))
                .slice()
                .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

            const map = {};
            studentCompletedLessons.forEach(l => {
                const part = l.participants.find(p => p.studentId === studentId);
                let needed = Number(part.price) || 0;
                const matchedPayments = [];

                for (const bucket of paymentBuckets) {
                    if (needed <= 0.001) break;
                    if (bucket.remaining > 0.001) {
                        const used = Math.min(bucket.remaining, needed);
                        bucket.remaining -= used;
                        needed -= used;
                        matchedPayments.push({
                            date: bucket.date,
                            method: bucket.method,
                            amount: used
                        });
                    }
                }

                if (needed <= 0.001) {
                    const lastPay = matchedPayments[matchedPayments.length - 1];
                    map[l.id] = {
                        status: 'covered',
                        label: 'Pokryta z salda',
                        paidDate: lastPay ? lastPay.date : '',
                        paidMethod: lastPay ? lastPay.method : '',
                        payments: matchedPayments
                    };
                } else if (matchedPayments.length > 0) {
                    map[l.id] = {
                        status: 'partial',
                        label: 'Częściowo pokryta',
                        paidDate: matchedPayments[matchedPayments.length - 1].date,
                        paidMethod: matchedPayments[matchedPayments.length - 1].method,
                        payments: matchedPayments
                    };
                } else {
                    map[l.id] = {
                        status: 'unpaid',
                        label: 'Oczekuje na wpłatę',
                        paidDate: null,
                        paidMethod: null,
                        payments: []
                    };
                }
            });

            return map;
        }

        // ==================== 1. PULPIT I EWIDENCJA NDG ====================
        let ndgSortState = { key: 'date', dir: 'asc' };

        function populateDashboardYears() {
            const sel = document.getElementById('dashboard-year');
            if (!sel) return;
            const currentVal = sel.value;
            const nowYear = new Date().getFullYear();
            const yearsSet = new Set([2025, nowYear - 1, nowYear, nowYear + 1, nowYear + 2, nowYear + 3, nowYear + 4, nowYear + 5]);
            state.lessons.forEach(l => {
                if (l.date) yearsSet.add(Number(l.date.slice(0, 4)));
            });
            state.payments.forEach(p => {
                if (p.date) yearsSet.add(Number(p.date.slice(0, 4)));
            });
            const sortedYears = Array.from(yearsSet).filter(y => !isNaN(y)).sort((a, b) => a - b);
            sel.innerHTML = sortedYears.map(y => `<option value="${y}">${y}</option>`).join('');
            if (currentVal && sortedYears.includes(Number(currentVal))) {
                sel.value = currentVal;
            } else {
                sel.value = String(nowYear);
            }
        }

        function toggleNdgColumnSort(colKey) {
            if (ndgSortState.key === colKey) {
                ndgSortState.dir = ndgSortState.dir === 'asc' ? 'desc' : 'asc';
            } else {
                ndgSortState.key = colKey;
                ndgSortState.dir = colKey === 'amount' ? 'desc' : 'asc';
            }
            const sel = document.getElementById('ndg-sort');
            if (sel) sel.value = `${ndgSortState.key}_${ndgSortState.dir}`;
            updateNdgSortIcons();
            renderDashboard();
        }

        function updateNdgSortIcons() {
            ['date', 'buyer', 'amount'].forEach(k => {
                const icon = document.getElementById(`sort-icon-${k}`);
                if (!icon) return;
                if (ndgSortState.key === k) {
                    icon.className = `fa-solid ${ndgSortState.dir === 'asc' ? 'fa-arrow-up' : 'fa-arrow-down'} text-[10px] ml-1 text-brand-600`;
                } else {
                    icon.className = 'fa-solid fa-sort text-[10px] ml-1 text-slate-300';
                }
            });
        }

        function renderDashboard() {
            const q = Number(document.getElementById('dashboard-quarter')?.value || 1);
            const y = Number(document.getElementById('dashboard-year')?.value || new Date().getFullYear());
            const startMonth = (q - 1) * 3 + 1;
            const endMonth = q * 3;

            const isInQuarter = (dateStr) => {
                if (!dateStr) return false;
                const [yy, mm] = dateStr.split('-').map(Number);
                return yy === y && mm >= startMonth && mm <= endMonth;
            };

            const limit = Number(state.settings.ndgQuarterlyLimit) || 10813.50;
            const limitDisp = document.getElementById('ndg-limit-display');
            if (limitDisp) limitDisp.textContent = formatMoney(limit);

            const quarterLessons = state.lessons
                .filter(l => l.status === 'completed' && isInQuarter(l.date))
                .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

            const allocationByStudent = {};
            state.students.forEach(s => {
                allocationByStudent[s.id] = getLessonPaymentAllocation(s.id);
            });

            const rawEntries = [];
            let earnedTotal = 0;

            quarterLessons.forEach(l => {
                (l.participants || []).forEach(part => {
                    const stu = state.students.find(s => s.id === part.studentId);
                    const amount = Number(part.price) || 0;
                    earnedTotal += amount;
                    const alloc = allocationByStudent[part.studentId]?.[l.id] || { status: 'unpaid', label: 'Oczekuje na wpłatę' };
                    rawEntries.push({
                        lp: rawEntries.length + 1,
                        date: l.date,
                        time: l.time,
                        studentId: part.studentId,
                        buyer: stu ? `${stu.name}${stu.parentName ? ' (' + stu.parentName + ')' : ''}` : 'Uczeń usunięty',
                        desc: `Korepetycje z matematyki (${l.duration} min)${l.topic ? ' – ' + l.topic : ''}`,
                        amount,
                        coverageStatus: alloc.status,
                        coverageLabel: alloc.label
                    });
                });
            });

            const remaining = Math.max(0, limit - earnedTotal);
            const pct = Math.min(100, (earnedTotal / limit) * 100);

            document.getElementById('ndg-earned').textContent = formatMoney(earnedTotal);
            document.getElementById('ndg-remaining').textContent = formatMoney(remaining);
            const bar = document.getElementById('ndg-progress-bar');
            const badge = document.getElementById('ndg-status-badge');
            if (bar) {
                bar.style.width = `${pct}%`;
                bar.className = pct >= 90
                    ? 'bg-rose-500 h-2.5 rounded-full transition-all duration-500'
                    : pct >= 75
                        ? 'bg-amber-500 h-2.5 rounded-full transition-all duration-500'
                        : 'bg-emerald-500 h-2.5 rounded-full transition-all duration-500';
            }
            if (badge) {
                if (earnedTotal > limit) {
                    badge.className = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-rose-100 text-rose-700';
                    badge.textContent = 'Przekroczony limit!';
                } else if (pct >= 80) {
                    badge.className = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-amber-100 text-amber-700';
                    badge.textContent = 'Zbliżasz się do limitu';
                } else {
                    badge.className = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-emerald-50 text-emerald-700';
                    badge.textContent = 'Bezpieczny zapas';
                }
            }

            // KPI
            const quarterPaid = state.payments
                .filter(p => isInQuarter(p.date))
                .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
            document.getElementById('kpi-paid').textContent = formatMoney(quarterPaid);

            let totalDebt = 0;
            let totalPrepaid = 0;
            const debtors = [];
            state.students.forEach(s => {
                const info = getStudentBalanceInfo(s.id);
                if (info.balance < -0.001) {
                    totalDebt += Math.abs(info.balance);
                    debtors.push({ student: s, debt: Math.abs(info.balance) });
                } else if (info.balance > 0.001) {
                    totalPrepaid += info.balance;
                }
            });
            document.getElementById('kpi-unpaid').textContent = formatMoney(totalDebt);
            document.getElementById('kpi-prepaid').textContent = formatMoney(totalPrepaid);

            // Najbliższe lekcje
            const nowStr = formatDateISO(new Date());
            const upcoming = state.lessons
                .filter(l => l.status === 'planned' && l.date >= nowStr)
                .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
                .slice(0, 5);

            const upList = document.getElementById('dashboard-upcoming-list');
            if (upcoming.length === 0) {
                upList.innerHTML = '<p class="text-xs text-slate-400 py-4 text-center">Brak nadchodzących zaplanowanych zajęć.</p>';
            } else {
                upList.innerHTML = upcoming.map(l => {
                    const title = getLessonDisplayTitle(l);
                    return `
                        <div class="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                            <div class="min-w-0">
                                <p class="text-xs font-bold text-slate-800 truncate">${escapeHTML(title)}</p>
                                <p class="text-[11px] text-slate-500">${l.date} • ${l.time} (${l.duration} min)</p>
                            </div>
                            <div class="flex items-center gap-1.5 shrink-0">
                                <button onclick="markLessonCompleted('${l.id}')" class="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-semibold">Odbyta</button>
                                <button onclick="openGoogleMeetForLesson('${l.id}')" class="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 text-[11px] font-semibold">Meet</button>
                            </div>
                        </div>
                    `;
                }).join('');
            }

            // Oczekujące na płatność
            const unpaidList = document.getElementById('dashboard-unpaid-list');
            if (debtors.length === 0) {
                unpaidList.innerHTML = '<p class="text-xs text-emerald-600 font-medium py-4 text-center"><i class="fa-solid fa-check-circle mr-1"></i> Wszyscy uczniowie są rozliczeni na bieżąco!</p>';
            } else {
                unpaidList.innerHTML = debtors.sort((a, b) => b.debt - a.debt).slice(0, 5).map(d => `
                    <div class="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/70">
                        <div class="min-w-0">
                            <p class="text-xs font-bold text-slate-800 truncate">${escapeHTML(d.student.name)}</p>
                            <p class="text-[11px] text-amber-700 font-semibold">Zaległość: ${formatMoney(d.debt)}</p>
                        </div>
                        <div class="flex items-center gap-1.5 shrink-0">
                            <button onclick="openPaymentModal('${d.student.id}', ${d.debt})" class="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold">Wpłata</button>
                            <button onclick="openBlikModal('${d.student.id}')" class="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[11px] font-semibold">Przypomnij</button>
                        </div>
                    </div>
                `).join('');
            }

            // Filtry ewidencji sprzedaży
            const stuFilterSel = document.getElementById('ndg-filter-student');
            if (stuFilterSel) {
                const prevStu = stuFilterSel.value;
                stuFilterSel.innerHTML = '<option value="all">Wszyscy nabywcy (uczniowie)</option>' +
                    state.students.map(s => `<option value="${s.id}">${escapeHTML(s.name)}</option>`).join('');
                if ([...stuFilterSel.options].some(o => o.value === prevStu)) stuFilterSel.value = prevStu;
            }

            const searchQ = (document.getElementById('ndg-search')?.value || '').toLowerCase().trim();
            const stuFilter = document.getElementById('ndg-filter-student')?.value || 'all';
            const statusFilter = document.getElementById('ndg-filter-status')?.value || 'all';
            const sortVal = document.getElementById('ndg-sort')?.value || 'date_asc';

            const [sKey, sDir] = sortVal.split('_');
            ndgSortState = { key: sKey || 'date', dir: sDir || 'asc' };
            updateNdgSortIcons();

            let filtered = rawEntries.filter(item => {
                if (stuFilter !== 'all' && item.studentId !== stuFilter) return false;
                if (statusFilter !== 'all' && item.coverageStatus !== statusFilter) return false;
                if (searchQ) {
                    const hay = `${item.buyer} ${item.desc} ${item.date}`.toLowerCase();
                    if (!hay.includes(searchQ)) return false;
                }
                return true;
            });

            filtered.sort((a, b) => {
                let cmp = 0;
                if (ndgSortState.key === 'date') cmp = (a.date + a.time).localeCompare(b.date + b.time);
                else if (ndgSortState.key === 'buyer') cmp = a.buyer.localeCompare(b.buyer, 'pl');
                else if (ndgSortState.key === 'amount') cmp = a.amount - b.amount;
                return ndgSortState.dir === 'desc' ? -cmp : cmp;
            });

            document.getElementById('ndg-records-count').textContent = `${filtered.length} pozycji`;
            const tbody = document.getElementById('ndg-table-body');
            if (filtered.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="py-8 text-center text-xs text-slate-400">Brak pozycji spełniających kryteria w wybranym kwartale.</td></tr>';
            } else {
                tbody.innerHTML = filtered.map(row => {
                    const badgeCls = row.coverageStatus === 'covered'
                        ? 'bg-emerald-50 text-emerald-700'
                        : row.coverageStatus === 'partial'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-rose-50 text-rose-700';
                    return `
                        <tr class="hover:bg-slate-50/80 transition-colors">
                            <td class="py-3 px-3 sm:px-4 text-xs font-semibold text-slate-400">${row.lp}</td>
                            <td class="py-3 px-3 sm:px-4 text-xs font-semibold text-slate-700 whitespace-nowrap">${row.date}</td>
                            <td class="py-3 px-3 sm:px-4 text-xs font-bold text-slate-800">${escapeHTML(row.buyer)}</td>
                            <td class="py-3 px-3 sm:px-4 text-xs text-slate-600">${escapeHTML(row.desc)}</td>
                            <td class="py-3 px-3 sm:px-4 text-xs font-extrabold text-slate-900 text-right whitespace-nowrap">${formatMoney(row.amount)}</td>
                            <td class="py-3 px-3 sm:px-4 text-center whitespace-nowrap">
                                <span class="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeCls}">${row.coverageLabel}</span>
                            </td>
                        </tr>
                    `;
                }).join('');
            }
        }

        function exportQuarterCSV() {
            const q = Number(document.getElementById('dashboard-quarter')?.value || 1);
            const y = Number(document.getElementById('dashboard-year')?.value || new Date().getFullYear());
            const startMonth = (q - 1) * 3 + 1;
            const endMonth = q * 3;

            const rows = [['Lp.', 'Data uzyskania przychodu', 'Nabywca', 'Opis uslugi', 'Kwota przychodu (PLN)']];
            let lp = 1;
            state.lessons
                .filter(l => {
                    if (l.status !== 'completed' || !l.date) return false;
                    const [yy, mm] = l.date.split('-').map(Number);
                    return yy === y && mm >= startMonth && mm <= endMonth;
                })
                .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
                .forEach(l => {
                    (l.participants || []).forEach(part => {
                        const stu = state.students.find(s => s.id === part.studentId);
                        rows.push([
                            lp++,
                            l.date,
                            stu ? stu.name : 'Uczen',
                            `Korepetycje z matematyki (${l.duration} min)`,
                            (Number(part.price) || 0).toFixed(2).replace('.', ',')
                        ]);
                    });
                });

            const csvContent = '\uFEFF' + rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Ewidencja_Sprzedazy_${y}_Q${q}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            showToast(`Wyeksportowano ewidencję za Q${q} ${y}.`);
        }

        // ==================== 2. KALENDARZ I OŚ DNIA ====================
        const POLISH_MONTHS = ['styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec', 'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień'];

        function changeCalendarMonth(delta) {
            currentCalendarMonth += delta;
            if (currentCalendarMonth < 0) {
                currentCalendarMonth = 11;
                currentCalendarYear--;
            } else if (currentCalendarMonth > 11) {
                currentCalendarMonth = 0;
                currentCalendarYear++;
            }
            renderSchedule();
        }

        function jumpToTodayCalendar() {
            const now = new Date();
            currentCalendarYear = now.getFullYear();
            currentCalendarMonth = now.getMonth();
            selectedCalendarDate = formatDateISO(now);
            renderSchedule();
        }

        function selectCalendarDay(dateStr) {
            selectedCalendarDate = dateStr;
            renderSchedule();
        }

        function getLessonDisplayTitle(lesson) {
            if (lesson.targetType === 'group') {
                const grp = state.groups.find(g => g.id === lesson.groupId);
                return grp ? `Grupa: ${grp.name}` : 'Zajęcia grupowe';
            }
            const stu = state.students.find(s => s.id === lesson.studentId);
            return stu ? stu.name : 'Uczeń';
        }

        function renderSchedule() {
            const titleEl = document.getElementById('cal-month-title');
            if (titleEl) titleEl.textContent = `${POLISH_MONTHS[currentCalendarMonth]} ${currentCalendarYear}`;

            const grid = document.getElementById('calendar-grid');
            if (!grid) return;

            const firstDay = new Date(currentCalendarYear, currentCalendarMonth, 1);
            const lastDay = new Date(currentCalendarYear, currentCalendarMonth + 1, 0);
            let startOffset = firstDay.getDay() - 1;
            if (startOffset < 0) startOffset = 6;

            const todayStr = formatDateISO(new Date());
            let cellsHTML = '';

            for (let i = 0; i < startOffset; i++) {
                cellsHTML += '<div class="h-12 sm:h-16 rounded-xl bg-slate-50/60"></div>';
            }

            for (let day = 1; day <= lastDay.getDate(); day++) {
                const dateStr = `${currentCalendarYear}-${String(currentCalendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dayLessons = state.lessons.filter(l => l.date === dateStr);
                const isSelected = dateStr === selectedCalendarDate;
                const isToday = dateStr === todayStr;

                const dots = dayLessons.slice(0, 4).map(l => {
                    const color = l.status === 'completed' ? 'bg-emerald-500' : l.status === 'cancelled' ? 'bg-slate-300' : 'bg-brand-600';
                    return `<span class="w-1.5 h-1.5 rounded-full ${color}"></span>`;
                }).join('');

                cellsHTML += `
                    <button onclick="selectCalendarDay('${dateStr}')" class="h-12 sm:h-16 rounded-xl border p-1 sm:p-1.5 flex flex-col justify-between items-center transition-all ${
                        isSelected
                            ? 'border-brand-600 bg-brand-50/80 ring-2 ring-brand-500/30'
                            : isToday
                                ? 'border-brand-300 bg-white'
                                : 'border-slate-100 hover:border-slate-300 bg-white'
                    }">
                        <span class="text-xs font-bold ${isSelected ? 'text-brand-700' : isToday ? 'text-brand-600' : 'text-slate-700'}">${day}</span>
                        <div class="flex items-center gap-0.5 flex-wrap justify-center">${dots}</div>
                    </button>
                `;
            }
            grid.innerHTML = cellsHTML;

            // Oś dnia
            const dayTitle = document.getElementById('day-timeline-title');
            if (dayTitle) dayTitle.textContent = selectedCalendarDate;

            const step = Number(document.getElementById('timeline-step-select')?.value || 30);
            const dayLessons = state.lessons
                .filter(l => l.date === selectedCalendarDate)
                .sort((a, b) => a.time.localeCompare(b.time));

            const timelineList = document.getElementById('day-timeline-list');
            if (!timelineList) return;

            const toMins = (t) => {
                const [hh, mm] = t.split(':').map(Number);
                return hh * 60 + mm;
            };
            const toTimeStr = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

            const renderedLessonIds = new Set();
            let rowsHTML = '';

            for (let m = 8 * 60; m <= 20 * 60; m += step) {
                const slotStart = m;
                const slotEnd = m + step;

                const matchingLesson = dayLessons.find(l => {
                    const ls = toMins(l.time);
                    const le = ls + (Number(l.duration) || 60);
                    return ls < slotEnd && le > slotStart;
                });

                if (matchingLesson) {
                    if (!renderedLessonIds.has(matchingLesson.id)) {
                        renderedLessonIds.add(matchingLesson.id);
                        const ls = toMins(matchingLesson.time);
                        const le = ls + (Number(matchingLesson.duration) || 60);
                        const endStr = toTimeStr(le);
                        const title = getLessonDisplayTitle(matchingLesson);
                        const statusStyle = matchingLesson.status === 'completed'
                            ? 'bg-emerald-50/90 border-emerald-200'
                            : matchingLesson.status === 'cancelled'
                                ? 'bg-slate-100 border-slate-200 opacity-65'
                                : 'bg-brand-50/80 border-brand-200';

                        rowsHTML += `
                            <div class="p-3 rounded-xl border ${statusStyle} space-y-2">
                                <div class="flex items-start justify-between gap-2">
                                    <div class="min-w-0">
                                        <span class="text-[11px] font-extrabold text-brand-700">${matchingLesson.time} – ${endStr} (${matchingLesson.duration} min)</span>
                                        <h4 class="text-xs sm:text-sm font-bold text-slate-900 truncate">${escapeHTML(title)}</h4>
                                        ${matchingLesson.topic ? `<p class="text-[11px] text-slate-600 truncate">${escapeHTML(matchingLesson.topic)}</p>` : ''}
                                    </div>
                                    <div class="flex items-center gap-1 shrink-0">
                                        <button onclick="openLessonModal('${matchingLesson.id}')" class="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 flex items-center justify-center" title="Edytuj">
                                            <i class="fa-solid fa-pen text-[11px]"></i>
                                        </button>
                                        <button onclick="deleteLesson('${matchingLesson.id}')" class="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:bg-rose-50 text-rose-500 flex items-center justify-center" title="Usuń">
                                            <i class="fa-solid fa-trash text-[11px]"></i>
                                        </button>
                                    </div>
                                </div>
                                <div class="flex flex-wrap items-center gap-1.5 pt-1">
                                    ${matchingLesson.status !== 'completed' ? `<button onclick="markLessonCompleted('${matchingLesson.id}')" class="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold">Oznacz jako odbytą</button>` : `<span class="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">Odbyta</span>`}
                                    ${lessonHasBoard(matchingLesson)
                                        ? `<button onclick="openWhiteboardForLesson('${matchingLesson.id}')" class="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-semibold flex items-center gap-1"><i class="fa-solid fa-chalkboard-user text-[10px]"></i> Tablica</button>
                                           <button onclick="openLessonBoardInNewWindow('${matchingLesson.id}')" class="px-2 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-semibold flex items-center gap-1" title="Otwórz tablicę w nowym oknie (Meet)"><i class="fa-solid fa-up-right-from-square text-[10px]"></i></button>`
                                        : `<button onclick="createBoardForLesson('${matchingLesson.id}')" class="px-2.5 py-1 rounded-lg bg-white border border-purple-200 hover:bg-purple-50 text-purple-700 text-[11px] font-semibold flex items-center gap-1"><i class="fa-solid fa-plus text-[10px]"></i> Dodaj tablicę</button>`
                                    }
                                    <button onclick="openGoogleMeetForLesson('${matchingLesson.id}')" class="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-semibold flex items-center gap-1"><i class="fa-solid fa-video text-[10px]"></i> Meet</button>
                                    <button onclick="openNoteModal('${matchingLesson.id}')" class="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[11px] font-semibold">Notatka</button>
                                </div>
                            </div>
                        `;
                    }
                } else {
                    const timeStr = toTimeStr(slotStart);
                    rowsHTML += `
                        <button onclick="openLessonModal(null, '${selectedCalendarDate}', '${timeStr}')" class="w-full flex items-center justify-between px-3 py-1.5 rounded-lg border border-dashed border-slate-200 hover:border-brand-400 hover:bg-brand-50/40 text-left group transition-all">
                            <span class="text-[11px] font-semibold text-slate-400 group-hover:text-brand-600">${timeStr}</span>
                            <span class="text-[10px] font-medium text-slate-300 group-hover:text-brand-600">+ Wolny termin</span>
                        </button>
                    `;
                }
            }

            timelineList.innerHTML = rowsHTML;
        }

        // ==================== DODAWANIE / EDYCJA ZAJĘĆ + GOOGLE CALENDAR ====================
        function populateLessonDropdowns() {
            const stuSel = document.getElementById('les-student-id');
            if (stuSel) {
                stuSel.innerHTML = state.students.map(s => `<option value="${s.id}">${escapeHTML(s.name)} (${s.rate} zł/60m)</option>`).join('');
            }
            const grpSel = document.getElementById('les-group-id');
            if (grpSel) {
                grpSel.innerHTML = state.groups.map(g => `<option value="${g.id}">${escapeHTML(g.name)} (${g.ratePerStudent} zł/os.)</option>`).join('');
            }
        }

        function setLessonTargetType(type) {
            document.getElementById('les-target-type').value = type;
            const singleWrap = document.getElementById('les-single-wrapper');
            const groupWrap = document.getElementById('les-group-wrapper');
            const btnSingle = document.getElementById('btn-type-single');
            const btnGroup = document.getElementById('btn-type-group');

            if (type === 'group') {
                singleWrap.classList.add('hidden');
                groupWrap.classList.remove('hidden');
                btnGroup.className = 'py-2 rounded-lg text-xs font-semibold bg-white text-slate-900 shadow-2xs';
                btnSingle.className = 'py-2 rounded-lg text-xs font-semibold text-slate-600';
            } else {
                groupWrap.classList.add('hidden');
                singleWrap.classList.remove('hidden');
                btnSingle.className = 'py-2 rounded-lg text-xs font-semibold bg-white text-slate-900 shadow-2xs';
                btnGroup.className = 'py-2 rounded-lg text-xs font-semibold text-slate-600';
            }
            recalculateLessonPrice();
        }

        function setDurationPreset(mins) {
            document.getElementById('les-duration').value = mins;
            recalculateLessonPrice();
        }

        function recalculateLessonPrice() {
            const type = document.getElementById('les-target-type').value;
            const duration = Number(document.getElementById('les-duration').value) || 60;
            let baseRate = Number(state.settings.defaultRate) || 90;

            if (type === 'single') {
                const stuId = document.getElementById('les-student-id').value;
                const stu = state.students.find(s => s.id === stuId);
                if (stu) baseRate = Number(stu.rate) || baseRate;
            } else {
                const grpId = document.getElementById('les-group-id').value;
                const grp = state.groups.find(g => g.id === grpId);
                if (grp) baseRate = Number(grp.ratePerStudent) || baseRate;
            }

            const calc = Math.round((baseRate * (duration / 60)) * 100) / 100;
            document.getElementById('les-price-per-student').value = calc;
        }

        function openLessonModal(lessonId = null, presetDate = null, presetTime = null) {
            populateLessonDropdowns();
            const titleEl = document.getElementById('modal-lesson-title');
            if (lessonId) {
                const les = state.lessons.find(l => l.id === lessonId);
                if (!les) return;
                titleEl.textContent = 'Edytuj zajęcia';
                document.getElementById('les-id').value = les.id;
                setLessonTargetType(les.targetType || 'single');
                if (les.studentId) document.getElementById('les-student-id').value = les.studentId;
                if (les.groupId) document.getElementById('les-group-id').value = les.groupId;
                document.getElementById('les-date').value = les.date;
                document.getElementById('les-time').value = les.time;
                document.getElementById('les-duration').value = les.duration;
                const firstPrice = les.participants?.[0]?.price ?? state.settings.defaultRate;
                document.getElementById('les-price-per-student').value = firstPrice;
                document.getElementById('les-status').value = les.status;
                document.getElementById('les-topic').value = les.topic || '';
                document.getElementById('les-auto-gcal').checked = false;
            } else {
                titleEl.textContent = 'Zaplanuj nowe zajęcia';
                document.getElementById('les-id').value = '';
                setLessonTargetType('single');
                document.getElementById('les-date').value = presetDate || selectedCalendarDate || formatDateISO(new Date());
                document.getElementById('les-time').value = presetTime || '16:00';
                document.getElementById('les-duration').value = 60;
                document.getElementById('les-status').value = 'planned';
                document.getElementById('les-topic').value = '';
                document.getElementById('les-auto-gcal').checked = true;
                recalculateLessonPrice();
            }
            openModal('modal-lesson');
        }

        function saveLesson(e) {
            e.preventDefault();
            const id = document.getElementById('les-id').value;
            const targetType = document.getElementById('les-target-type').value;
            const studentId = targetType === 'single' ? document.getElementById('les-student-id').value : null;
            const groupId = targetType === 'group' ? document.getElementById('les-group-id').value : null;
            const date = document.getElementById('les-date').value;
            const time = document.getElementById('les-time').value;
            const duration = Number(document.getElementById('les-duration').value) || 60;
            const pricePerStudent = Number(document.getElementById('les-price-per-student').value) || 0;
            const status = document.getElementById('les-status').value;
            const topic = document.getElementById('les-topic').value.trim();
            const autoGcal = document.getElementById('les-auto-gcal').checked;

            if (targetType === 'single' && !studentId) {
                showToast('Najpierw dodaj ucznia w zakładce Uczniowie.', 'error');
                return;
            }
            if (targetType === 'group' && !groupId) {
                showToast('Najpierw utwórz grupę zajęciową.', 'error');
                return;
            }

            // Blokada kolizji terminów (dla zajęć nieodwołanych)
            if (status !== 'cancelled') {
                const toMins = (t) => {
                    const [hh, mm] = t.split(':').map(Number);
                    return hh * 60 + mm;
                };
                const newStart = toMins(time);
                const newEnd = newStart + duration;

                const conflict = state.lessons.find(l => {
                    if (l.id === id) return false;
                    if (l.status === 'cancelled') return false;
                    if (l.date !== date) return false;
                    const exStart = toMins(l.time);
                    const exEnd = exStart + (Number(l.duration) || 60);
                    return newStart < exEnd && newEnd > exStart;
                });

                if (conflict) {
                    const conflictName = getLessonDisplayTitle(conflict);
                    showToast(`Kolizja terminów! W tym czasie masz już zajęcia: ${conflictName} (${conflict.time}, ${conflict.duration} min).`, 'error');
                    return;
                }
            }

            let participants = [];
            if (targetType === 'single') {
                participants = [{ studentId, price: pricePerStudent }];
            } else {
                const grp = state.groups.find(g => g.id === groupId);
                participants = (grp?.studentIds || []).map(sid => ({ studentId: sid, price: pricePerStudent }));
            }

            let savedLesson;
            if (id) {
                const idx = state.lessons.findIndex(l => l.id === id);
                if (idx !== -1) {
                    state.lessons[idx] = {
                        ...state.lessons[idx],
                        targetType,
                        studentId,
                        groupId,
                        date,
                        time,
                        duration,
                        status,
                        topic,
                        participants
                    };
                    savedLesson = state.lessons[idx];
                }
                showToast('Zaktualizowano zajęcia.');
            } else {
                savedLesson = {
                    id: 'les_' + Date.now(),
                    targetType,
                    studentId,
                    groupId,
                    date,
                    time,
                    duration,
                    status,
                    topic,
                    homework: '',
                    hwStatus: 'none',
                    participants
                };
                state.lessons.push(savedLesson);
                showToast('Zapisano nowe zajęcia.');
            }

            selectedCalendarDate = date;
            saveState();
            closeModal('modal-lesson');
            renderCurrentView();

            if (autoGcal && savedLesson) {
                openGoogleMeetForLesson(savedLesson.id, true);
            }
        }

        function markLessonCompleted(lessonId) {
            const les = state.lessons.find(l => l.id === lessonId);
            if (!les) return;
            les.status = 'completed';
            saveState();
            renderCurrentView();
            showToast('Zajęcia oznaczono jako odbyte.');
        }

        function deleteLesson(lessonId) {
            state.lessons = state.lessons.filter(l => l.id !== lessonId);
            saveState();
            renderCurrentView();
            showToast('Usunięto zajęcia z harmonogramu.', 'info');
        }

        // ==================== INTEGRACJA Z KALENDARZEM GOOGLE / MEET ====================
        function buildGoogleCalendarPayload(lesson) {
            const title = `Korepetycje z matematyki – ${getLessonDisplayTitle(lesson)}`;
            const [y, m, d] = lesson.date.split('-').map(Number);
            const [hh, mm] = lesson.time.split(':').map(Number);
            const startDt = new Date(y, m - 1, d, hh, mm, 0);
            const endDt = new Date(startDt.getTime() + (Number(lesson.duration) || 60) * 60000);

            const fmtGCal = (dt) => {
                const pad = (n) => String(n).padStart(2, '0');
                return `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`;
            };

            const datesParam = `${fmtGCal(startDt)}/${fmtGCal(endDt)}`;
            const emailsSet = new Set();
            (lesson.participants || []).forEach(p => {
                const stu = state.students.find(s => s.id === p.studentId);
                if (stu?.email) emailsSet.add(stu.email.trim());
                if (stu?.parentEmail) emailsSet.add(stu.parentEmail.trim());
            });
            const emails = Array.from(emailsSet).filter(Boolean);

            const detailsLines = [
                `Przedmiot: Matematyka (${lesson.duration} min)`,
                lesson.topic ? `Temat zajęć: ${lesson.topic}` : null,
                `Prowadzący: ${state.settings.tutorName || 'Korepetytor'}`
            ].filter(Boolean);
            const detailsText = detailsLines.join('\n');

            const params = new URLSearchParams({
                action: 'TEMPLATE',
                text: title,
                dates: datesParam,
                details: detailsText
            });
            if (emails.length > 0) {
                params.set('add', emails.join(','));
            }

            const queryStr = params.toString();
            const browserUrl = `https://calendar.google.com/calendar/render?${queryStr}`;

            return { title, startDt, endDt, datesParam, emails, detailsText, browserUrl };
        }

        function openGoogleMeetForLesson(lessonId, autoTriggered = false) {
            const lesson = state.lessons.find(l => l.id === lessonId);
            if (!lesson) return;
            const payload = buildGoogleCalendarPayload(lesson);

            const a = document.createElement('a');
            a.href = payload.browserUrl;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            document.body.appendChild(a);
            a.click();
            a.remove();
        }

        function updateGoogleApiStatusUI() {
            const badge = document.getElementById('gcal-api-status');
            const input = document.getElementById('set-gcal-client-id');
            if (input) input.value = state.settings.googleClientId || '';
            if (badge) {
                if (state.settings.googleClientId) {
                    badge.className = 'text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700';
                    badge.textContent = 'Client ID skonfigurowany';
                } else {
                    badge.className = 'text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600';
                    badge.textContent = 'Tryb szybki (bez API)';
                }
            }
        }

        function saveGoogleClientId() {
            const val = document.getElementById('set-gcal-client-id')?.value.trim() || '';
            state.settings.googleClientId = val;
            saveState();
            updateGoogleApiStatusUI();
            showToast('Zapisano Google Client ID.');
        }

        function connectGoogleCalendarAPI() {
            if (!state.settings.googleClientId) {
                showToast('Najpierw wpisz i zapisz swój Google OAuth Client ID.', 'error');
                return;
            }
            showToast('Client ID jest aktywny. Wydarzenia otwierają się bezpośrednio z Twoim kontem Google.', 'info');
        }

        // ==================== 3. UCZNIOWIE, GRUPY I PEŁNA KARTOTEKA ====================
        let activeStudentsSubtab = 'individuals';

        function switchStudentsSubtab(tab) {
            activeStudentsSubtab = tab;
            const indGrid = document.getElementById('students-grid');
            const grpGrid = document.getElementById('groups-grid');
            const btnInd = document.getElementById('subtab-individuals');
            const btnGrp = document.getElementById('subtab-groups');

            if (tab === 'groups') {
                indGrid.classList.add('hidden');
                grpGrid.classList.remove('hidden');
                btnGrp.className = 'flex-1 sm:flex-initial px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-900 shadow-2xs transition-all';
                btnInd.className = 'flex-1 sm:flex-initial px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 transition-all';
            } else {
                grpGrid.classList.add('hidden');
                indGrid.classList.remove('hidden');
                btnInd.className = 'flex-1 sm:flex-initial px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-900 shadow-2xs transition-all';
                btnGrp.className = 'flex-1 sm:flex-initial px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 transition-all';
            }
            renderStudents();
        }

        function renderStudents() {
            const stuGrid = document.getElementById('students-grid');
            const grpGrid = document.getElementById('groups-grid');
            if (!stuGrid || !grpGrid) return;

            if (state.students.length === 0) {
                stuGrid.innerHTML = '<div class="col-span-full bg-white p-8 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">Brak dodanych uczniów. Kliknij „Dodaj ucznia”, aby rozpocząć.</div>';
            } else {
                stuGrid.innerHTML = state.students.map(s => {
                    const info = getStudentBalanceInfo(s.id);
                    const completedCount = state.lessons.filter(l => l.status === 'completed' && (l.participants || []).some(p => p.studentId === s.id)).length;
                    const balanceBadge = info.balance < -0.001
                        ? `<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700">Zaległość: ${formatMoney(Math.abs(info.balance))} (${formatLessonsCountPL(info.lessonsEquivalent)})</span>`
                        : info.balance > 0.001
                            ? `<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700">Nadpłata: ${formatMoney(info.balance)} (${formatLessonsCountPL(info.lessonsEquivalent)})</span>`
                            : `<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700">Rozliczony</span>`;

                    return `
                        <div onclick="openStudentDetailsModal('${s.id}')" class="cursor-pointer bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 hover:border-brand-400 hover:shadow-md transition-all flex flex-col justify-between gap-4 min-w-0">
                            <div class="space-y-2.5 min-w-0">
                                <div class="flex items-start justify-between gap-2">
                                    <div class="min-w-0">
                                        <h3 class="font-extrabold text-base text-slate-900 truncate">${escapeHTML(s.name)}</h3>
                                        <span class="inline-block mt-1 px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 text-[11px] font-semibold">${escapeHTML(s.level)}</span>
                                    </div>
                                    <span class="text-xs font-extrabold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg shrink-0">${s.rate} zł/h</span>
                                </div>

                                <div class="text-xs text-slate-500 space-y-1 pt-1">
                                    ${s.phone ? `<p class="truncate"><i class="fa-solid fa-phone w-4 text-slate-400"></i> ${escapeHTML(s.phone)}</p>` : ''}
                                    ${s.email ? `<p class="break-all"><i class="fa-regular fa-envelope w-4 text-slate-400"></i> ${escapeHTML(s.email)}</p>` : ''}
                                    ${s.parentName ? `<p class="truncate text-slate-600 font-medium"><i class="fa-solid fa-user-shield w-4 text-slate-400"></i> Rodzic: ${escapeHTML(s.parentName)} ${s.parentPhone ? '(' + escapeHTML(s.parentPhone) + ')' : ''}</p>` : ''}
                                </div>
                            </div>

                            <div class="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                                <div class="flex items-center gap-1.5 flex-wrap">
                                    ${balanceBadge}
                                    <span class="text-[11px] text-slate-400 font-medium">• ${completedCount} lekcji</span>
                                </div>
                                <div class="flex items-center gap-1 shrink-0" onclick="event.stopPropagation()">
                                    <button onclick="openStudentDetailsModal('${s.id}')" class="px-2.5 py-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 text-[11px] font-semibold" title="Statystyki ucznia">Profil</button>
                                    <button onclick="openStudentModal('${s.id}')" class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center" title="Edytuj">
                                        <i class="fa-solid fa-pen text-[11px]"></i>
                                    </button>
                                    <button onclick="deleteStudent('${s.id}')" class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-rose-50 text-rose-500 flex items-center justify-center" title="Usuń">
                                        <i class="fa-solid fa-trash text-[11px]"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
            }

            if (state.groups.length === 0) {
                grpGrid.innerHTML = '<div class="col-span-full bg-white p-8 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">Brak utworzonych grup zajęciowych.</div>';
            } else {
                grpGrid.innerHTML = state.groups.map(g => {
                    const members = (g.studentIds || []).map(sid => state.students.find(s => s.id === sid)?.name).filter(Boolean);
                    return `
                        <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3 min-w-0">
                            <div class="flex items-start justify-between gap-2">
                                <div class="min-w-0">
                                    <h3 class="font-extrabold text-base text-slate-900 truncate">${escapeHTML(g.name)}</h3>
                                    <span class="inline-block mt-1 px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 text-[11px] font-semibold">${escapeHTML(g.level)}</span>
                                </div>
                                <div class="flex items-center gap-1.5 shrink-0">
                                    <span class="text-xs font-extrabold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">${g.ratePerStudent} zł/os.</span>
                                    <button onclick="deleteGroup('${g.id}')" class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-rose-50 text-rose-500 flex items-center justify-center">
                                        <i class="fa-solid fa-trash text-[11px]"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="text-xs text-slate-600">
                                <span class="font-semibold text-slate-500 block mb-1">Uczestnicy (${members.length}):</span>
                                <div class="flex flex-wrap gap-1.5">
                                    ${members.map(m => `<span class="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-medium">${escapeHTML(m)}</span>`).join('')}
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }

        function openStudentDetailsModal(studentId, lessonFilter = 'all') {
            const stu = state.students.find(s => s.id === studentId);
            if (!stu) return;

            const info = getStudentBalanceInfo(stu.id);
            const allocationMap = getLessonPaymentAllocation(stu.id);

            const allLessons = state.lessons
                .filter(l => (l.participants || []).some(p => p.studentId === stu.id))
                .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

            const completedLessons = allLessons.filter(l => l.status === 'completed');
            const cancelledLessons = allLessons.filter(l => l.status === 'cancelled');
            const plannedLessons = allLessons.filter(l => l.status === 'planned');

            const totalMinutes = completedLessons.reduce((acc, l) => acc + (Number(l.duration) || 60), 0);
            const totalHours = (totalMinutes / 60).toFixed(1).replace('.0', '');
            const attendanceRate = (completedLessons.length + cancelledLessons.length) > 0
                ? Math.round((completedLessons.length / (completedLessons.length + cancelledLessons.length)) * 100)
                : 100;

            const studentPayments = state.payments
                .filter(p => p.studentId === stu.id)
                .sort((a, b) => b.date.localeCompare(a.date));

            const studentExams = state.examScores
                .filter(ex => ex.studentId === stu.id)
                .sort((a, b) => b.date.localeCompare(a.date));

            const studentGroups = state.groups.filter(g => (g.studentIds || []).includes(stu.id));

            const filteredLessons = allLessons.filter(l => lessonFilter === 'all' || l.status === lessonFilter);

            const balanceLabel = info.balance < -0.001
                ? `<span class="text-rose-600">-${formatMoney(Math.abs(info.balance))} <span class="text-xs font-semibold">(${formatLessonsCountPL(info.lessonsEquivalent)})</span></span>`
                : info.balance > 0.001
                    ? `<span class="text-sky-600">+${formatMoney(info.balance)} <span class="text-xs font-semibold">(${formatLessonsCountPL(info.lessonsEquivalent)})</span></span>`
                    : `<span class="text-emerald-600">0,00 zł</span>`;

            const showMsgButton = info.balance <= 0.001;

            const container = document.getElementById('student-details-content');
            container.innerHTML = `
                <div class="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                    <div class="min-w-0">
                        <div class="flex flex-wrap items-center gap-2">
                            <h3 class="text-lg sm:text-xl font-extrabold text-slate-900">${escapeHTML(stu.name)}</h3>
                            <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700">${escapeHTML(stu.level)}</span>
                        </div>
                        <p class="text-xs text-slate-500 mt-1">
                            Stawka: <strong>${stu.rate} zł/60 min</strong>
                            ${stu.parentName ? ` • Rodzic: <strong>${escapeHTML(stu.parentName)}</strong> (${escapeHTML(stu.parentPhone || 'brak tel.')})` : ''}
                            ${studentGroups.length ? ` • Grupy: <strong>${studentGroups.map(g => escapeHTML(g.name)).join(', ')}</strong>` : ''}
                        </p>
                    </div>
                    <button onclick="closeModal('modal-student-details')" class="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <!-- 5 Kafelków statystyk -->
                <div class="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3">
                    <div class="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200/80">
                        <span class="text-[11px] font-semibold text-emerald-700 block">Lekcje odbyte</span>
                        <span class="text-lg sm:text-xl font-extrabold text-emerald-900">${completedLessons.length}</span>
                        <span class="text-[11px] text-emerald-700 block">Łącznie ${totalHours} godz.</span>
                    </div>
                    <div class="p-3 rounded-xl bg-rose-50/80 border border-rose-200/80">
                        <span class="text-[11px] font-semibold text-rose-700 block">Lekcje odwołane</span>
                        <span class="text-lg sm:text-xl font-extrabold text-rose-900">${cancelledLessons.length}</span>
                        <span class="text-[11px] text-rose-700 block">Zaplanowane: ${plannedLessons.length}</span>
                    </div>
                    <div class="p-3 rounded-xl bg-indigo-50/80 border border-indigo-200/80">
                        <span class="text-[11px] font-semibold text-indigo-700 block">Frekwencja</span>
                        <span class="text-lg sm:text-xl font-extrabold text-indigo-900">${attendanceRate}%</span>
                        <span class="text-[11px] text-indigo-700 block">Obecność na zajęciach</span>
                    </div>
                    <div class="p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <span class="text-[11px] font-semibold text-slate-500 block">Aktualne saldo</span>
                        <span class="text-lg sm:text-xl font-extrabold">${balanceLabel}</span>
                        <span class="text-[11px] text-slate-500 block">Należne: ${formatMoney(info.totalDue)}</span>
                    </div>
                    <div class="col-span-2 sm:col-span-1 p-3 rounded-xl bg-sky-50/80 border border-sky-200/80">
                        <span class="text-[11px] font-semibold text-sky-700 block">Wpłacono</span>
                        <span class="text-lg sm:text-xl font-extrabold text-sky-900">${formatMoney(info.totalPaid)}</span>
                        <span class="text-[11px] text-sky-700 block">${studentPayments.length} wpłat</span>
                    </div>
                </div>

                <!-- Szybkie akcje -->
                <div class="flex flex-wrap gap-2">
                    <button onclick="closeModal('modal-student-details'); openPaymentModal('${stu.id}', ${info.balance < 0 ? Math.abs(info.balance) : ''})" class="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5">
                        <i class="fa-solid fa-plus-circle"></i> Zaksięguj wpłatę
                    </button>
                    ${showMsgButton ? `
                        <button onclick="openBlikModal('${stu.id}')" class="px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold flex items-center gap-1.5">
                            <i class="fa-solid fa-paper-plane"></i> Wiadomość z rozliczeniem
                        </button>
                    ` : ''}
                    <button onclick="closeModal('modal-student-details'); openStudentModal('${stu.id}')" class="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5">
                        <i class="fa-solid fa-pen"></i> Edytuj dane
                    </button>
                </div>

                <!-- Spis tablic interaktywnych ucznia -->
                ${renderStudentBoardsSectionHTML(stu.id)}

                <!-- Lista wszystkich zajęć ucznia z datą opłacenia -->
                <div class="space-y-2.5">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                        <h4 class="font-bold text-sm text-slate-900">Wszystkie zajęcia ucznia (${allLessons.length})</h4>
                        <div class="flex gap-1 bg-slate-100 p-1 rounded-xl text-[11px] font-semibold">
                            <button onclick="openStudentDetailsModal('${stu.id}', 'all')" class="px-2.5 py-1 rounded-lg ${lessonFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}">Wszystkie</button>
                            <button onclick="openStudentDetailsModal('${stu.id}', 'completed')" class="px-2.5 py-1 rounded-lg ${lessonFilter === 'completed' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}">Odbyte</button>
                            <button onclick="openStudentDetailsModal('${stu.id}', 'planned')" class="px-2.5 py-1 rounded-lg ${lessonFilter === 'planned' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}">Zaplanowane</button>
                            <button onclick="openStudentDetailsModal('${stu.id}', 'cancelled')" class="px-2.5 py-1 rounded-lg ${lessonFilter === 'cancelled' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}">Odwołane</button>
                        </div>
                    </div>

                    <div class="max-h-64 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                        ${filteredLessons.length === 0
                            ? '<p class="p-4 text-xs text-slate-400 text-center">Brak zajęć w wybranej kategorii.</p>'
                            : filteredLessons.map(l => {
                                const part = (l.participants || []).find(p => p.studentId === stu.id);
                                const price = Number(part?.price) || 0;
                                const alloc = allocationMap[l.id];

                                let statusBadge = '';
                                if (l.status === 'completed') {
                                    statusBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">Odbyta</span>';
                                } else if (l.status === 'cancelled') {
                                    statusBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700">Odwołana</span>';
                                } else {
                                    statusBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-50 text-brand-700">Zaplanowana</span>';
                                }

                                let paymentInfo = '';
                                if (l.status === 'completed' && alloc) {
                                    if (alloc.status === 'covered') {
                                        paymentInfo = `<span class="text-[11px] font-semibold text-emerald-700"><i class="fa-solid fa-check-circle mr-1"></i>Opłacono: ${alloc.paidDate} (${alloc.paidMethod})</span>`;
                                    } else if (alloc.status === 'partial') {
                                        paymentInfo = `<span class="text-[11px] font-semibold text-amber-700">Częściowo opłacono (${alloc.paidDate})</span>`;
                                    } else {
                                        paymentInfo = `<span class="text-[11px] font-semibold text-rose-600">Nieopłacona</span>`;
                                    }
                                }

                                return `
                                    <div class="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                                        <div class="min-w-0">
                                            <div class="flex flex-wrap items-center gap-1.5">
                                                <span class="font-bold text-slate-900">${l.date} • ${l.time}</span>
                                                <span class="text-slate-400">(${l.duration} min)</span>
                                                ${statusBadge}
                                            </div>
                                            ${l.topic ? `<p class="text-slate-600 mt-0.5 truncate">${escapeHTML(l.topic)}</p>` : ''}
                                        </div>
                                        <div class="flex sm:flex-col items-center sm:items-end justify-between gap-1.5 shrink-0">
                                            <div class="flex items-center gap-1.5">
                                                ${lessonHasBoard(l)
                                                    ? `<button onclick="openWhiteboardFromStudentDetails('${l.id}', '${stu.id}')" class="px-2 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-[10px] font-bold flex items-center gap-1" title="Otwórz tablicę tej lekcji">
                                                           <i class="fa-solid fa-chalkboard-user"></i> Tablica
                                                       </button>
                                                       <button onclick="openLessonBoardInNewWindow('${l.id}')" class="px-1.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 text-[10px] font-bold" title="Otwórz tablicę w nowym oknie (Meet)">
                                                           <i class="fa-solid fa-up-right-from-square"></i>
                                                       </button>`
                                                    : `<button onclick="createBoardForLesson('${l.id}', '${stu.id}')" class="px-2 py-1 rounded-lg bg-slate-100 hover:bg-purple-50 text-slate-600 hover:text-purple-700 text-[10px] font-bold flex items-center gap-1" title="Utwórz tablicę dla tej lekcji">
                                                           <i class="fa-solid fa-plus"></i> Dodaj tablicę
                                                       </button>`
                                                }
                                                <span class="font-extrabold text-slate-800 ml-1">${l.status === 'cancelled' ? '0,00 zł' : formatMoney(price)}</span>
                                            </div>
                                            ${paymentInfo}
                                        </div>
                                    </div>
                                `;
                            }).join('')
                        }
                    </div>
                </div>

                <!-- Historia wpłat i arkuszy -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div class="space-y-2">
                        <h4 class="font-bold text-xs uppercase text-slate-500">Historia wpłat (${studentPayments.length})</h4>
                        <div class="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-40 overflow-y-auto">
                            ${studentPayments.length === 0
                                ? '<p class="p-3 text-xs text-slate-400 text-center">Brak zaksięgowanych wpłat.</p>'
                                : studentPayments.map(p => `
                                    <div class="p-2.5 flex items-center justify-between text-xs">
                                        <div>
                                            <span class="font-bold text-slate-800">${p.date}</span>
                                            <span class="text-slate-400 ml-1">(${escapeHTML(p.method)})</span>
                                            ${p.note ? `<p class="text-[11px] text-slate-500">${escapeHTML(p.note)}</p>` : ''}
                                        </div>
                                        <span class="font-extrabold text-emerald-600">+${formatMoney(p.amount)}</span>
                                    </div>
                                `).join('')
                            }
                        </div>
                    </div>

                    <div class="space-y-2">
                        <h4 class="font-bold text-xs uppercase text-slate-500">Wyniki arkuszy próbnych (${studentExams.length})</h4>
                        <div class="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-40 overflow-y-auto">
                            ${studentExams.length === 0
                                ? '<p class="p-3 text-xs text-slate-400 text-center">Brak wpisanych arkuszy.</p>'
                                : studentExams.map(ex => `
                                    <div class="p-2.5 flex items-center justify-between text-xs">
                                        <div class="min-w-0 pr-2">
                                            <p class="font-bold text-slate-800 truncate">${escapeHTML(ex.title)}</p>
                                            <span class="text-[11px] text-slate-400">${ex.date}</span>
                                        </div>
                                        <span class="font-extrabold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-lg shrink-0">${ex.percent}%</span>
                                    </div>
                                `).join('')
                            }
                        </div>
                    </div>
                </div>
            `;

            openModal('modal-student-details');
        }

        function openStudentModal(studentId = null) {
            const titleEl = document.getElementById('modal-student-title');
            if (studentId) {
                const stu = state.students.find(s => s.id === studentId);
                if (!stu) return;
                titleEl.textContent = 'Edytuj dane ucznia';
                document.getElementById('stu-id').value = stu.id;
                document.getElementById('stu-school-year-start').value = stu.schoolYearStart || getCurrentSchoolYearStart();
                document.getElementById('stu-name').value = stu.name || '';
                document.getElementById('stu-phone').value = stu.phone || '';
                document.getElementById('stu-email').value = stu.email || '';
                document.getElementById('stu-parent-name').value = stu.parentName || '';
                document.getElementById('stu-parent-phone').value = stu.parentPhone || '';
                document.getElementById('stu-parent-email').value = stu.parentEmail || '';
                document.getElementById('stu-rate').value = stu.rate || state.settings.defaultRate || 90;
                updateLevelSelectors('stu', stu.level || 'Szkoła Podstawowa - klasa 8 (E8)');
            } else {
                titleEl.textContent = 'Dodaj ucznia';
                document.getElementById('stu-id').value = '';
                document.getElementById('stu-school-year-start').value = getCurrentSchoolYearStart();
                document.getElementById('stu-name').value = '';
                document.getElementById('stu-phone').value = '';
                document.getElementById('stu-email').value = '';
                document.getElementById('stu-parent-name').value = '';
                document.getElementById('stu-parent-phone').value = '';
                document.getElementById('stu-parent-email').value = '';
                document.getElementById('stu-rate').value = state.settings.defaultRate || 90;
                updateLevelSelectors('stu', 'Szkoła Podstawowa - klasa 8 (E8)');
            }
            openModal('modal-student');
        }

        function saveStudent(e) {
            e.preventDefault();
            syncComposedLevel('stu');
            const id = document.getElementById('stu-id').value;
            const payload = {
                name: document.getElementById('stu-name').value.trim(),
                phone: document.getElementById('stu-phone').value.trim(),
                email: document.getElementById('stu-email').value.trim(),
                parentName: document.getElementById('stu-parent-name').value.trim(),
                parentPhone: document.getElementById('stu-parent-phone').value.trim(),
                parentEmail: document.getElementById('stu-parent-email').value.trim(),
                level: document.getElementById('stu-level').value,
                schoolYearStart: Number(document.getElementById('stu-school-year-start').value) || getCurrentSchoolYearStart(),
                rate: Number(document.getElementById('stu-rate').value) || 90
            };

            if (id) {
                const idx = state.students.findIndex(s => s.id === id);
                if (idx !== -1) state.students[idx] = { ...state.students[idx], ...payload };
                showToast('Zaktualizowano profil ucznia.');
            } else {
                state.students.push({
                    id: 'stu_' + Date.now(),
                    ...payload
                });
                showToast('Dodano nowego ucznia.');
            }

            saveState();
            populateLessonDropdowns();
            closeModal('modal-student');
            renderCurrentView();
        }

        function deleteStudent(studentId) {
            state.students = state.students.filter(s => s.id !== studentId);
            state.groups.forEach(g => {
                g.studentIds = (g.studentIds || []).filter(sid => sid !== studentId);
            });
            saveState();
            populateLessonDropdowns();
            renderCurrentView();
            showToast('Usunięto ucznia.', 'info');
        }

        function openGroupModal() {
            document.getElementById('grp-name').value = '';
            document.getElementById('grp-rate').value = 60;
            updateLevelSelectors('grp', 'Szkoła Podstawowa - klasa 8 (E8)');

            const box = document.getElementById('grp-students-checkboxes');
            if (state.students.length === 0) {
                box.innerHTML = '<p class="text-xs text-slate-400">Najpierw dodaj uczniów indywidualnych.</p>';
            } else {
                box.innerHTML = state.students.map(s => `
                    <label class="flex items-center gap-2 text-xs text-slate-700 cursor-pointer py-1">
                        <input type="checkbox" name="grp-stu" value="${s.id}" class="rounded text-brand-600 focus:ring-brand-500">
                        <span class="font-medium">${escapeHTML(s.name)}</span>
                        <span class="text-slate-400">(${escapeHTML(s.level)})</span>
                    </label>
                `).join('');
            }
            openModal('modal-group');
        }

        function saveGroup(e) {
            e.preventDefault();
            syncComposedLevel('grp');
            const selected = Array.from(document.querySelectorAll('input[name="grp-stu"]:checked')).map(el => el.value);
            if (selected.length < 2) {
                showToast('Wybierz co najmniej 2 uczniów do grupy.', 'error');
                return;
            }
            state.groups.push({
                id: 'grp_' + Date.now(),
                name: document.getElementById('grp-name').value.trim(),
                level: document.getElementById('grp-level').value,
                schoolYearStart: getCurrentSchoolYearStart(),
                studentIds: selected,
                ratePerStudent: Number(document.getElementById('grp-rate').value) || 60
            });
            saveState();
            populateLessonDropdowns();
            closeModal('modal-group');
            renderStudents();
            showToast('Utworzono nową grupę zajęciową.');
        }

        function deleteGroup(groupId) {
            state.groups = state.groups.filter(g => g.id !== groupId);
            saveState();
            populateLessonDropdowns();
            renderStudents();
            showToast('Usunięto grupę.', 'info');
        }

        // ==================== 4. WPŁATY, SALDA I GENERATOR WIADOMOŚCI ====================
        let activeBillingSubtab = 'balances';

        function switchBillingSubtab(tab) {
            activeBillingSubtab = tab;
            const balView = document.getElementById('billing-balances-view');
            const payView = document.getElementById('billing-payments-view');
            const btnBal = document.getElementById('bill-sub-balances');
            const btnPay = document.getElementById('bill-sub-payments');

            if (tab === 'payments') {
                balView.classList.add('hidden');
                payView.classList.remove('hidden');
                btnPay.className = 'flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-900 shadow-2xs transition-all';
                btnBal.className = 'flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 transition-all';
            } else {
                payView.classList.add('hidden');
                balView.classList.remove('hidden');
                btnBal.className = 'flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-900 shadow-2xs transition-all';
                btnPay.className = 'flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 transition-all';
            }
            renderBilling();
        }

        function renderBilling() {
            const stuFilterSel = document.getElementById('billing-filter-student');
            if (stuFilterSel) {
                const prev = stuFilterSel.value;
                stuFilterSel.innerHTML = '<option value="all">Wszyscy uczniowie</option>' +
                    state.students.map(s => `<option value="${s.id}">${escapeHTML(s.name)}</option>`).join('');
                if ([...stuFilterSel.options].some(o => o.value === prev)) stuFilterSel.value = prev;
            }

            const q = (document.getElementById('billing-search-input')?.value || '').toLowerCase().trim();
            const stuFilter = document.getElementById('billing-filter-student')?.value || 'all';
            const statusFilter = document.getElementById('billing-filter-status')?.value || 'all';

            const balContainer = document.getElementById('billing-balances-view');
            const filteredStudents = state.students.filter(s => {
                if (stuFilter !== 'all' && s.id !== stuFilter) return false;
                const info = getStudentBalanceInfo(s.id);
                if (statusFilter === 'debt' && info.balance >= -0.001) return false;
                if (statusFilter === 'prepaid' && info.balance <= 0.001) return false;
                if (statusFilter === 'settled' && Math.abs(info.balance) > 0.001) return false;
                if (q) {
                    const hay = `${s.name} ${s.parentName || ''}`.toLowerCase();
                    if (!hay.includes(q)) return false;
                }
                return true;
            });

            if (filteredStudents.length === 0) {
                balContainer.innerHTML = '<div class="bg-white p-8 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">Brak uczniów spełniających wybrane kryteria.</div>';
            } else {
                balContainer.innerHTML = filteredStudents.map(s => {
                    const info = getStudentBalanceInfo(s.id);
                    const showMsgButton = info.balance <= 0.001;

                    let badge = '';
                    let amountColor = 'text-emerald-600';
                    if (info.balance < -0.001) {
                        badge = '<span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700">Zaległość</span>';
                        amountColor = 'text-rose-600';
                    } else if (info.balance > 0.001) {
                        badge = '<span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700">Nadpłata (z góry)</span>';
                        amountColor = 'text-sky-600';
                    } else {
                        badge = '<span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700">Rozliczony (0 zł)</span>';
                    }

                    return `
                        <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div class="space-y-1 min-w-0">
                                <div class="flex flex-wrap items-center gap-2">
                                    <h4 class="font-extrabold text-sm sm:text-base text-slate-900">${escapeHTML(s.name)}</h4>
                                    ${badge}
                                </div>
                                <p class="text-xs text-slate-500">
                                    Wpłacono: <strong>${formatMoney(info.totalPaid)}</strong> • Odbyte lekcje: <strong>${formatMoney(info.totalDue)}</strong>
                                </p>
                            </div>
                            <div class="flex flex-wrap items-center justify-between sm:justify-end gap-2 sm:gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                                <span class="text-base sm:text-lg font-extrabold ${amountColor}">${info.balance > 0 ? '+' : ''}${formatMoney(info.balance)}</span>
                                <div class="flex items-center gap-1.5">
                                    <button onclick="openPaymentModal('${s.id}', ${info.balance < 0 ? Math.abs(info.balance) : ''})" class="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold">
                                        + Wpłata
                                    </button>
                                    ${showMsgButton ? `
                                        <button onclick="openBlikModal('${s.id}')" class="px-3 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-semibold flex items-center gap-1">
                                            <i class="fa-solid fa-paper-plane text-[11px]"></i> Rozliczenie
                                        </button>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
            }

            // Rejestr wpłat
            const filteredPayments = state.payments
                .filter(p => {
                    if (stuFilter !== 'all' && p.studentId !== stuFilter) return false;
                    if (q) {
                        const stu = state.students.find(s => s.id === p.studentId);
                        const hay = `${stu?.name || ''} ${stu?.parentName || ''} ${p.note || ''} ${p.method}`.toLowerCase();
                        if (!hay.includes(q)) return false;
                    }
                    return true;
                })
                .sort((a, b) => b.date.localeCompare(a.date));

            const countEl = document.getElementById('billing-payments-count');
            if (countEl) countEl.textContent = `${filteredPayments.length} wpłat`;

            const tbody = document.getElementById('payments-table-body');
            if (filteredPayments.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="py-8 text-center text-xs text-slate-400">Brak zaksięgowanych wpłat.</td></tr>';
            } else {
                tbody.innerHTML = filteredPayments.map(p => {
                    const stu = state.students.find(s => s.id === p.studentId);
                    return `
                        <tr class="hover:bg-slate-50">
                            <td class="py-3 px-3 sm:px-4 text-xs font-semibold text-slate-700 whitespace-nowrap">${p.date}</td>
                            <td class="py-3 px-3 sm:px-4 text-xs font-bold text-slate-900">${escapeHTML(stu ? stu.name : 'Uczeń')}</td>
                            <td class="py-3 px-3 sm:px-4 text-xs"><span class="px-2 py-0.5 rounded-md bg-slate-100 font-semibold">${escapeHTML(p.method)}</span></td>
                            <td class="py-3 px-3 sm:px-4 text-xs text-slate-600">${escapeHTML(p.note || '—')}</td>
                            <td class="py-3 px-3 sm:px-4 text-xs font-extrabold text-emerald-600 text-right whitespace-nowrap">+${formatMoney(p.amount)}</td>
                            <td class="py-3 px-3 sm:px-4 text-center">
                                <button onclick="deletePayment('${p.id}')" class="text-rose-500 hover:text-rose-700 text-xs" title="Usuń wpłatę"><i class="fa-solid fa-trash"></i></button>
                            </td>
                        </tr>
                    `;
                }).join('');
            }
        }

        function openPaymentModal(presetStudentId = null, presetAmount = '') {
            const sel = document.getElementById('pay-student-id');
            if (sel) {
                sel.innerHTML = state.students.map(s => `<option value="${s.id}">${escapeHTML(s.name)}</option>`).join('');
                if (presetStudentId) sel.value = presetStudentId;
            }
            document.getElementById('pay-amount').value = presetAmount || '';
            document.getElementById('pay-date').value = formatDateISO(new Date());
            document.getElementById('pay-note').value = '';
            openModal('modal-payment');
        }

        function savePayment(e) {
            e.preventDefault();
            const studentId = document.getElementById('pay-student-id').value;
            const amount = Number(document.getElementById('pay-amount').value) || 0;
            const date = document.getElementById('pay-date').value;
            const method = document.querySelector('input[name="pay-method"]:checked')?.value || 'BLIK';
            const note = document.getElementById('pay-note').value.trim();

            if (!studentId || amount <= 0) {
                showToast('Wybierz ucznia i wpisz poprawną kwotę.', 'error');
                return;
            }

            state.payments.push({
                id: 'pay_' + Date.now(),
                studentId,
                amount,
                date,
                method,
                note
            });
            saveState();
            closeModal('modal-payment');
            renderCurrentView();
            showToast(`Zaksięgowano wpłatę ${formatMoney(amount)}.`);
        }

        function deletePayment(paymentId) {
            state.payments = state.payments.filter(p => p.id !== paymentId);
            saveState();
            renderCurrentView();
            showToast('Usunięto wpłatę.', 'info');
        }

        function openBlikModal(studentId) {
            const stu = state.students.find(s => s.id === studentId);
            if (!stu) return;
            const info = getStudentBalanceInfo(stu.id);
            if (info.balance > 0.001) return;

            const recipient = stu.parentName ? `Dzień dobry Pani/Panie ${stu.parentName.split(' ')[0]},` : `Cześć / Dzień dobry,`;
            const blikLine = state.settings.blikPhone ? `📱 BLIK na telefon: ${state.settings.blikPhone}` : '';
            const bankLine = state.settings.bankAccount ? `🏦 Nr konta: ${state.settings.bankAccount}` : '';
            const payMethods = [blikLine, bankLine].filter(Boolean).join('\n');
            const tutorSign = state.settings.tutorName || 'Korepetytor';

            let msg = '';
            if (info.balance < -0.001) {
                const debt = formatMoney(Math.abs(info.balance));
                msg = `${recipient}\n\nprzypominam uprzejmie o rozliczeniu dotychczasowych zajęć z matematyki (${stu.name}).\nAktualna kwota do uregulowania wynosi: ${debt}.\n\nDane do płatności:\n${payMethods}\nTytuł: Korepetycje matematyka – ${stu.name}\n\nDziękuję i pozdrawiam,\n${tutorSign}`;
            } else {
                const pack4 = formatMoney((Number(stu.rate) || 90) * 4);
                msg = `${recipient}\n\ninformuję, że wszystkie dotychczasowe zajęcia z matematyki (${stu.name}) są w pełni rozliczone (saldo: 0,00 zł).\n\nGdyby chcieli Państwo dokonać wpłaty z góry za kolejny pakiet (np. 4 lekcje = ${pack4}), podaję dane:\n${payMethods}\nTytuł: Nadpłata korepetycje – ${stu.name}\n\nPozdrawiam serdecznie,\n${tutorSign}`;
            }

            document.getElementById('blik-message-box').value = msg;
            openModal('modal-blik');
        }

        function copyBlikMessage() {
            const box = document.getElementById('blik-message-box');
            box.select();
            box.setSelectionRange(0, 99999);
            try {
                document.execCommand('copy');
                showToast('Skopiowano treść wiadomości do schowka!');
            } catch (e) {
                showToast('Zaznaczono tekst – skopiuj go ręcznie.', 'info');
            }
        }

        // ==================== 5. POSTĘPY I ARKUSZE ====================
        function renderProgress() {
            const sel = document.getElementById('progress-student-select');
            if (!sel) return;
            const prev = sel.value;
            sel.innerHTML = state.students.map(s => `<option value="${s.id}">${escapeHTML(s.name)} (${escapeHTML(s.level)})</option>`).join('');
            if ([...sel.options].some(o => o.value === prev)) sel.value = prev;

            const studentId = sel.value;
            const searchQ = (document.getElementById('progress-search')?.value || '').toLowerCase().trim();
            const hwFilter = document.getElementById('progress-hw-filter')?.value || 'all';

            const exams = state.examScores
                .filter(ex => ex.studentId === studentId && (!searchQ || ex.title.toLowerCase().includes(searchQ)))
                .sort((a, b) => b.date.localeCompare(a.date));

            const examList = document.getElementById('exam-scores-list');
            if (exams.length === 0) {
                examList.innerHTML = '<p class="text-xs text-slate-400 py-4 text-center">Brak zapisanych arkuszy próbnych dla tego ucznia.</p>';
            } else {
                examList.innerHTML = exams.map(ex => `
                    <div class="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-2">
                        <div class="min-w-0">
                            <p class="text-xs font-bold text-slate-800 truncate">${escapeHTML(ex.title)}</p>
                            <span class="text-[11px] text-slate-400">${ex.date}</span>
                        </div>
                        <div class="flex items-center gap-2 shrink-0">
                            <span class="px-2.5 py-1 rounded-lg bg-brand-600 text-white text-xs font-extrabold">${ex.percent}%</span>
                            <button onclick="deleteExamScore('${ex.id}')" class="text-slate-400 hover:text-rose-500 text-xs"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </div>
                `).join('');
            }

            const notesLessons = state.lessons
                .filter(l => (l.participants || []).some(p => p.studentId === studentId))
                .filter(l => {
                    if (hwFilter !== 'all' && (l.hwStatus || 'none') !== hwFilter) return false;
                    if (searchQ) {
                        const hay = `${l.topic || ''} ${l.homework || ''} ${l.date}`.toLowerCase();
                        if (!hay.includes(searchQ)) return false;
                    }
                    return true;
                })
                .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

            const hwBadges = {
                assigned: '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700">Zadane</span>',
                done: '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">Wykonane</span>',
                partial: '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700">Częściowo</span>',
                none: '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">Brak zadania</span>'
            };

            const notesList = document.getElementById('lesson-notes-list');
            if (notesLessons.length === 0) {
                notesList.innerHTML = '<p class="text-xs text-slate-400 py-4 text-center">Brak wpisów w dzienniku dla wybranych filtrów.</p>';
            } else {
                notesList.innerHTML = notesLessons.map(l => `
                    <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                        <div class="flex items-center justify-between gap-2">
                            <span class="text-xs font-extrabold text-slate-800">${l.date} • ${l.time} (${l.duration} min)</span>
                            <div class="flex items-center gap-1.5">
                                ${hwBadges[l.hwStatus || 'none']}
                                <button onclick="openNoteModal('${l.id}')" class="text-xs font-semibold text-brand-600 hover:underline ml-1">Edytuj</button>
                            </div>
                        </div>
                        <p class="text-xs text-slate-700"><strong>Temat:</strong> ${escapeHTML(l.topic || 'Brak opisu tematu')}</p>
                        ${l.homework ? `<p class="text-xs text-slate-600"><strong>Praca domowa:</strong> ${escapeHTML(l.homework)}</p>` : ''}
                    </div>
                `).join('');
            }
        }

        function openNoteModal(lessonId) {
            const les = state.lessons.find(l => l.id === lessonId);
            if (!les) return;
            document.getElementById('note-lesson-id').value = les.id;
            document.getElementById('note-topic').value = les.topic || '';
            document.getElementById('note-homework').value = les.homework || '';
            document.getElementById('note-hw-status').value = les.hwStatus || 'none';
            openModal('modal-note');
        }

        function saveLessonNote(e) {
            e.preventDefault();
            const id = document.getElementById('note-lesson-id').value;
            const les = state.lessons.find(l => l.id === id);
            if (!les) return;
            les.topic = document.getElementById('note-topic').value.trim();
            les.homework = document.getElementById('note-homework').value.trim();
            les.hwStatus = document.getElementById('note-hw-status').value;
            saveState();
            closeModal('modal-note');
            renderCurrentView();
            showToast('Zapisano notatkę z lekcji.');
        }

        function openExamModal() {
            const stuId = document.getElementById('progress-student-select')?.value;
            if (!stuId) {
                showToast('Najpierw dodaj i wybierz ucznia.', 'error');
                return;
            }
            document.getElementById('exam-title').value = '';
            document.getElementById('exam-date').value = formatDateISO(new Date());
            document.getElementById('exam-percent').value = '';
            openModal('modal-exam');
        }

        function saveExamScore(e) {
            e.preventDefault();
            const studentId = document.getElementById('progress-student-select')?.value;
            if (!studentId) return;
            state.examScores.push({
                id: 'ex_' + Date.now(),
                studentId,
                title: document.getElementById('exam-title').value.trim(),
                date: document.getElementById('exam-date').value,
                percent: Number(document.getElementById('exam-percent').value) || 0
            });
            saveState();
            closeModal('modal-exam');
            renderProgress();
            showToast('Dodano wynik arkusza próbnego.');
        }

        function deleteExamScore(examId) {
            state.examScores = state.examScores.filter(ex => ex.id !== examId);
            saveState();
            renderProgress();
            showToast('Usunięto wynik arkusza.', 'info');
        }

        // ==================== 6. USTAWIENIA, POWIADOMIENIA I KOPIA JSON ====================
        function renderSettings() {
            document.getElementById('set-tutor-name').value = state.settings.tutorName || '';
            document.getElementById('set-blik-phone').value = state.settings.blikPhone || '';
            document.getElementById('set-ndg-limit').value = state.settings.ndgQuarterlyLimit || 10813.50;
            document.getElementById('set-bank-account').value = state.settings.bankAccount || '';
            document.getElementById('set-default-rate').value = state.settings.defaultRate || 90;
            updateGoogleApiStatusUI();
        }

        function saveSettings(e) {
            e.preventDefault();
            state.settings.tutorName = document.getElementById('set-tutor-name').value.trim();
            state.settings.blikPhone = document.getElementById('set-blik-phone').value.trim();
            state.settings.ndgQuarterlyLimit = Number(document.getElementById('set-ndg-limit').value) || 10813.50;
            state.settings.bankAccount = document.getElementById('set-bank-account').value.trim();
            state.settings.defaultRate = Number(document.getElementById('set-default-rate').value) || 90;
            saveState();
            showToast('Zapisano ustawienia.');
        }

        function updateNotificationButtonUI() {
            const icon = document.getElementById('notify-icon');
            const btn = document.getElementById('btn-notify-toggle');
            if (!icon || !btn) return;
            if (state.settings.notificationsEnabled) {
                icon.className = 'fa-solid fa-bell text-brand-600';
                btn.className = 'bg-brand-50 border border-brand-200 text-brand-700 text-xs font-semibold px-2.5 sm:px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 shrink-0';
            } else {
                icon.className = 'fa-regular fa-bell';
                btn.className = 'bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-2.5 sm:px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 shrink-0';
            }
        }

        async function toggleNotifications() {
            state.settings.notificationsEnabled = !state.settings.notificationsEnabled;
            if (state.settings.notificationsEnabled && 'Notification' in window && Notification.permission === 'default') {
                try { await Notification.requestPermission(); } catch (e) {}
            }
            saveState();
            updateNotificationButtonUI();
            showToast(state.settings.notificationsEnabled ? 'Włączono przypomnienia 30 min przed lekcją.' : 'Wyłączono przypomnienia.', 'info');
        }

        function checkUpcomingLessonReminders() {
            if (!state.settings.notificationsEnabled) return;
            const now = new Date();
            const todayStr = formatDateISO(now);
            const nowMins = now.getHours() * 60 + now.getMinutes();

            state.lessons.forEach(l => {
                if (l.status !== 'planned' || l.date !== todayStr || notifiedLessonsSet.has(l.id)) return;
                const [hh, mm] = l.time.split(':').map(Number);
                const lesMins = hh * 60 + mm;
                const diff = lesMins - nowMins;
                if (diff > 0 && diff <= 30) {
                    notifiedLessonsSet.add(l.id);
                    const msg = `Za ${diff} min lekcja: ${getLessonDisplayTitle(l)} (${l.time})`;
                    showToast(msg, 'info');
                    if ('Notification' in window && Notification.permission === 'granted') {
                        try { new Notification('MathFlow – Przypomnienie', { body: msg }); } catch (e) {}
                    }
                }
            });
        }

        function exportBackupJSON() {
            const jsonStr = JSON.stringify(state, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `MathFlow_Kopia_${formatDateISO(new Date())}.json`;
            a.click();
            URL.revokeObjectURL(url);
            showToast('Pobrano kopię zapasową JSON.');
        }

        function importBackupJSON(event) {
            const file = event.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const parsed = JSON.parse(e.target.result);
                    if (!parsed.students || !parsed.lessons) throw new Error('Invalid format');
                    state = {
                        ...defaultState,
                        ...parsed,
                        settings: { ...defaultState.settings, ...(parsed.settings || {}) }
                    };
                    saveState();
                    populateDashboardYears();
                    populateLessonDropdowns();
                    renderCurrentView();
                    showToast('Pomyślnie wczytano kopię zapasową!');
                } catch (err) {
                    showToast('Nieprawidłowy plik kopii zapasowej JSON.', 'error');
                }
            };
            reader.readAsText(file);
        }

        function openClearDataModal() {
            const inp = document.getElementById('clear-confirm-input');
            const btn = document.getElementById('btn-confirm-clear-all');
            if (inp) inp.value = '';
            if (btn) btn.disabled = true;
            openModal('modal-clear');
        }

        function validateClearConfirmInput() {
            const val = (document.getElementById('clear-confirm-input')?.value || '').trim().toUpperCase();
            const btn = document.getElementById('btn-confirm-clear-all');
            if (btn) btn.disabled = (val !== 'USUŃ' && val !== 'USUN');
        }

        function confirmClearAllData() {
            const val = (document.getElementById('clear-confirm-input')?.value || '').trim().toUpperCase();
            if (val !== 'USUŃ' && val !== 'USUN') return;
            state = {
                ...JSON.parse(JSON.stringify(defaultState)),
                students: [],
                groups: [],
                payments: [],
                lessons: [],
                examScores: [],
                whiteboards: {}
            };
            saveState();
            closeModal('modal-clear');
            populateLessonDropdowns();
            renderCurrentView();
            showToast('Wyczyszczono wszystkie dane.', 'info');
        }


        // ==================== 7. MODUŁ TABLICE (CIĄGŁA PRZESTRZEŃ A4 + PODZIAŁ STRON PDF + TABLET GRAFICZNY) ====================
        // Stała szerokość kartki logicznej (identyczna z eksportem PDF A4 Poziomo: 1400 x 900 px na 1 stronę)
        const WB_PAGE_W = 1400;
        const WB_PAGE_H = 900;

        let wbCurrentNotebookId = null;
        let wbCurrentSectionId = null;
        let wbCurrentPageIdx = 0;

        let wbTool = 'pen'; // 'select' | 'lasso' | 'text' | 'pen' | 'highlighter' | 'eraser-stroke' | 'eraser-point' | 'laser' | 'line' | 'arrow' | 'axes' | 'rect' | 'circle' | 'triangle'
        let wbLastEraserMode = 'eraser-stroke';
        let wbColor = '#0f172a';
        let wbWidth = 3;
        let wbAutoShape = true;

        // Kamera kartki: Zoom (skala) oraz Pan (przewijanie w dół / przesuwanie)
        let wbZoom = 1;
        let wbPanX = 0;
        let wbPanY = 0;
        let wbIsPanning = false;
        let wbPanStartScreen = null;
        let wbPanStartOffset = null;
        let wbSpacePressed = false;
        let wbActiveTouchPointers = new Map();
        let wbPinchStartDist = 0;
        let wbPinchStartZoom = 1;
        let wbPinchStartCenter = null;
        let wbPinchStartPan = null;

        // Rysowanie, Hold-to-Shape i modyfikatory
        let wbIsDrawing = false;
        let wbActivePointerId = null;
        let wbActiveStroke = null;
        let wbHoldShapeTimer = null;
        let wbHoldConvertedShape = false;
        let wbLastMoveTime = 0;
        let wbLastMovePoint = null;
        let wbShiftPressed = false;

        let wbRedoStack = [];
        let wbSaveDebounce = null;

        // Wskaźnik laserowy
        let wbLaserStrokes = [];
        let wbLaserAnimId = null;

        // Zaznaczanie, Lasso, Przesuwanie i Skalowanie uchwytami
        let wbLassoPolygon = null;
        let wbSelectedIndices = new Set();
        let wbSelectionMode = null;
        let wbActiveHandle = null;
        let wbDragLastWorld = null;
        let wbResizeOrigBBox = null;
        let wbResizeOrigStrokes = null;

        // Edytor tekstu na tablicy + cache obrazów
        let wbInlineTextWorldPos = null;
        const wbImageCache = new Map();

        function ensureWhiteboardsStore() {
            if (!state.whiteboards || typeof state.whiteboards !== 'object') {
                state.whiteboards = {};
            }
        }

        let isStandaloneBoardWindow = false;

        function getStandaloneBoardParams() {
            try {
                const params = new URLSearchParams(window.location.search);
                if (params.get('boardMode') === '1' && params.get('studentId')) {
                    return {
                        studentId: params.get('studentId'),
                        sectionId: params.get('sectionId') || null
                    };
                }
            } catch (e) {}
            return null;
        }

        // Konsoliduje wielostronicową tablicę do jednej ciągłej kartki scrollowanej w dół (zachowując treść istniejących stron)
        function normalizeSectionToContinuousPage(sec) {
            if (!sec) return;
            if (!Array.isArray(sec.pages) || sec.pages.length === 0) {
                sec.pages = [{ bg: 'grid', strokes: [], pageCount: 1 }];
                return;
            }
            if (sec.pages.length > 1) {
                const mergedStrokes = [];
                sec.pages.forEach((p, idx) => {
                    const offsetY = idx * WB_PAGE_H;
                    (p.strokes || []).forEach(st => {
                        const copy = JSON.parse(JSON.stringify(st));
                        if (copy.points) copy.points.forEach(pt => { pt.y += offsetY; });
                        if (copy.y1 !== undefined) copy.y1 += offsetY;
                        if (copy.y2 !== undefined) copy.y2 += offsetY;
                        mergedStrokes.push(copy);
                    });
                });
                sec.pages = [{
                    bg: sec.pages[0].bg || 'grid',
                    strokes: mergedStrokes,
                    pageCount: sec.pages.length
                }];
            } else {
                if (!sec.pages[0].strokes) sec.pages[0].strokes = [];
                if (!sec.pages[0].pageCount || sec.pages[0].pageCount < 1) {
                    sec.pages[0].pageCount = 1;
                }
            }
        }

        function wbGetPageCount(page) {
            if (!page) return 1;
            let maxY = 0;
            (page.strokes || []).forEach(s => {
                const b = wbGetStrokeBBox(s);
                if (b.maxY > maxY) maxY = b.maxY;
            });
            const fromContent = Math.max(1, Math.ceil((maxY + 40) / WB_PAGE_H));
            const explicitPages = Math.max(1, Number(page.pageCount) || 1);
            return Math.max(fromContent, explicitPages);
        }

        function wbGetCanvasLogicalHeight(page) {
            return wbGetPageCount(page) * WB_PAGE_H;
        }

        function getOrCreateStudentNotebook(studentId) {
            ensureWhiteboardsStore();
            const stu = state.students.find(s => s.id === studentId);
            const nbId = 'nb_' + studentId;

            if (!state.whiteboards[nbId] || !Array.isArray(state.whiteboards[nbId].sections)) {
                state.whiteboards[nbId] = {
                    id: nbId,
                    studentId: studentId,
                    studentName: stu ? stu.name : 'Uczeń',
                    updatedAt: new Date().toISOString(),
                    sections: []
                };
            } else if (stu) {
                state.whiteboards[nbId].studentName = stu.name;
            }

            const nb = state.whiteboards[nbId];
            nb.sections.forEach(sec => normalizeSectionToContinuousPage(sec));
            return nb;
        }

        function lessonHasBoard(lesson) {
            if (!lesson) return false;
            const studentId = lesson.studentId || lesson.participants?.[0]?.studentId;
            if (!studentId) return false;
            const nb = state.whiteboards?.['nb_' + studentId];
            if (!nb || !Array.isArray(nb.sections)) return false;
            return nb.sections.some(s => s.lessonId === lesson.id || s.id === 'sec_' + lesson.id);
        }

        function createBoardForLesson(lessonId, reopenStudentModalId = null) {
            const les = state.lessons.find(l => l.id === lessonId);
            if (!les) return;
            const studentId = les.studentId || les.participants?.[0]?.studentId;
            if (!studentId) {
                showToast('Ta lekcja nie ma przypisanego ucznia.', 'error');
                return;
            }
            const nb = getOrCreateStudentNotebook(studentId);
            const secId = 'sec_' + les.id;
            let sec = nb.sections.find(s => s.id === secId || s.lessonId === les.id);
            if (!sec) {
                const label = `${les.date} (${les.time})${les.topic ? ' – ' + les.topic : ''}`;
                sec = {
                    id: secId,
                    lessonId: les.id,
                    title: label,
                    date: les.date,
                    pages: [{ bg: 'grid', strokes: [], pageCount: 1 }]
                };
                nb.sections.push(sec);
                saveState();
            }

            if (reopenStudentModalId) {
                openStudentDetailsModal(reopenStudentModalId);
                showToast('Dodano tablicę do lekcji.');
            } else {
                renderCurrentView();
                openWhiteboardNotebook(nb.id, sec.id);
            }
        }

        function createCustomBoardForStudent(studentId, reopenStudentModalId = null) {
            const nb = getOrCreateStudentNotebook(studentId);
            const defaultName = `Tablica ${formatDateISO(new Date())}`;
            const name = prompt('Podaj nazwę nowej tablicy (np. Funkcja kwadratowa, Powtórka):', defaultName);
            if (!name || !name.trim()) return;

            const newSec = {
                id: 'sec_custom_' + Date.now(),
                lessonId: null,
                title: name.trim(),
                date: formatDateISO(new Date()),
                pages: [{ bg: 'grid', strokes: [], pageCount: 1 }]
            };
            nb.sections.push(newSec);
            saveState();
            showToast('Dodano nową tablicę.');

            if (reopenStudentModalId) {
                openStudentDetailsModal(reopenStudentModalId);
            } else if (activeTab === 'boards') {
                renderBoardsList();
            } else {
                renderCurrentView();
            }
        }

        function deleteStudentBoardSection(studentId, sectionId, reopenStudentModalId = null) {
            const nb = getOrCreateStudentNotebook(studentId);
            if (!nb) return;
            const sec = nb.sections.find(s => s.id === sectionId);
            if (!sec) return;

            if (!confirm(`Czy na pewno usunąć tablicę "${sec.title}"? Wszystkie zapisane na niej notatki zostaną trwale usunięte.`)) {
                return;
            }

            nb.sections = nb.sections.filter(s => s.id !== sectionId);
            if (sec.lessonId && state.whiteboards[sec.lessonId]) {
                delete state.whiteboards[sec.lessonId];
            }
            saveState();
            showToast('Usunięto tablicę.', 'info');

            if (reopenStudentModalId) {
                openStudentDetailsModal(reopenStudentModalId);
            } else if (activeTab === 'boards') {
                renderBoardsList();
            } else if (activeTab === 'schedule') {
                renderSchedule();
            }
        }

        function deleteAllStudentBoards(studentId, reopenStudentModalId = null) {
            const nb = getOrCreateStudentNotebook(studentId);
            if (!nb || !nb.sections.length) return;

            if (!confirm(`Czy na pewno usunąć WSZYSTKIE tablice ucznia ${nb.studentName} (${nb.sections.length})? Tej operacji nie można cofnąć.`)) {
                return;
            }

            nb.sections.forEach(sec => {
                if (sec.lessonId && state.whiteboards[sec.lessonId]) {
                    delete state.whiteboards[sec.lessonId];
                }
            });
            nb.sections = [];
            saveState();
            showToast('Usunięto wszystkie tablice ucznia.', 'info');

            if (reopenStudentModalId) {
                openStudentDetailsModal(reopenStudentModalId);
            } else if (activeTab === 'boards') {
                renderBoardsList();
            } else if (activeTab === 'schedule') {
                renderSchedule();
            }
        }

        function openBoardInNewWindow(studentId, sectionId) {
            const baseUrl = window.location.href.split('?')[0].split('#')[0];
            const params = new URLSearchParams({
                boardMode: '1',
                studentId: studentId,
                sectionId: sectionId || ''
            });
            const url = `${baseUrl}?${params.toString()}`;
            const winName = `MathFlow_Board_${studentId}_${sectionId || 'main'}`;
            const popup = window.open(url, winName, 'width=1360,height=860,menubar=no,toolbar=no,location=no,status=no');
            if (!popup) {
                showToast('Przeglądarka zablokowała wyskakujące okno. Zezwól na otwieranie okien dla tej strony.', 'error');
            }
        }

        function openLessonBoardInNewWindow(lessonId) {
            const les = state.lessons.find(l => l.id === lessonId);
            if (!les) return;
            const studentId = les.studentId || les.participants?.[0]?.studentId;
            if (!studentId) return;
            const nb = getOrCreateStudentNotebook(studentId);
            let sec = nb.sections.find(s => s.lessonId === lessonId || s.id === 'sec_' + lessonId);
            if (!sec) {
                const label = `${les.date} (${les.time})${les.topic ? ' – ' + les.topic : ''}`;
                sec = {
                    id: 'sec_' + les.id,
                    lessonId: les.id,
                    title: label,
                    date: les.date,
                    pages: [{ bg: 'grid', strokes: [], pageCount: 1 }]
                };
                nb.sections.push(sec);
                saveState();
            }
            openBoardInNewWindow(studentId, sec.id);
        }

        function renderStudentBoardsSectionHTML(studentId) {
            const nb = getOrCreateStudentNotebook(studentId);
            const sections = nb.sections || [];

            return `
                <div class="bg-purple-50/50 border border-purple-200/80 rounded-2xl p-3.5 sm:p-4 space-y-3">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                        <div class="flex items-center gap-2">
                            <div class="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center text-xs">
                                <i class="fa-solid fa-chalkboard-user"></i>
                            </div>
                            <div>
                                <h4 class="font-bold text-sm text-slate-900">Tablice ucznia (${sections.length})</h4>
                                <span class="text-[11px] text-slate-500 block">Otwórz w bieżącym oknie lub w osobnym oknie do udostępnienia na Meet</span>
                            </div>
                        </div>
                        <div class="flex items-center gap-1.5">
                            ${sections.length > 0 ? `
                                <button onclick="deleteAllStudentBoards('${studentId}', '${studentId}')" class="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center gap-1" title="Usuń wszystkie tablice tego ucznia">
                                    <i class="fa-solid fa-trash-can"></i> Usuń wszystkie
                                </button>
                            ` : ''}
                            <button onclick="createCustomBoardForStudent('${studentId}', '${studentId}')" class="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs">
                                <i class="fa-solid fa-plus"></i> Nowa tablica
                            </button>
                        </div>
                    </div>

                    ${sections.length === 0
                        ? `<p class="text-xs text-slate-500 bg-white/80 rounded-xl p-3 border border-purple-100 text-center">Ten uczeń nie ma jeszcze żadnej tablicy. Kliknij <strong>+ Nowa tablica</strong> powyżej lub dodaj ją przy konkretnej lekcji.</p>`
                        : `<div class="divide-y divide-purple-100 bg-white rounded-xl border border-purple-100 overflow-hidden max-h-56 overflow-y-auto">
                            ${sections.slice().reverse().map(sec => {
                                const page = sec.pages?.[0];
                                const pagesCount = wbGetPageCount(page);
                                const strokesCount = page?.strokes?.length || 0;
                                return `
                                    <div class="p-2.5 sm:px-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-purple-50/40 transition-colors">
                                        <div class="min-w-0">
                                            <p class="text-xs font-bold text-slate-800 truncate">${escapeHTML(sec.title)}</p>
                                            <span class="text-[10px] text-slate-400">${pagesCount} str. PDF • ${strokesCount} elementów</span>
                                        </div>
                                        <div class="flex items-center gap-1.5 shrink-0">
                                            <button onclick="openWhiteboardNotebookFromModal('${nb.id}', '${sec.id}')" class="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-semibold flex items-center gap-1" title="Otwórz w bieżącym oknie">
                                                <i class="fa-solid fa-pen-to-square text-[10px]"></i> Otwórz
                                            </button>
                                            <button onclick="openBoardInNewWindow('${studentId}', '${sec.id}')" class="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-semibold flex items-center gap-1" title="Otwórz w osobnym oknie (bez finansów – do udostępniania w Google Meet)">
                                                <i class="fa-solid fa-up-right-from-square text-[10px]"></i> Nowe okno
                                            </button>
                                            <button onclick="deleteStudentBoardSection('${studentId}', '${sec.id}', '${studentId}')" class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 flex items-center justify-center transition-colors" title="Usuń tablicę">
                                                <i class="fa-solid fa-trash-can text-[11px]"></i>
                                            </button>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>`
                    }
                </div>
            `;
        }

        function renderBoardsList() {
            ensureWhiteboardsStore();
            const grid = document.getElementById('boards-grid');
            if (!grid) return;

            const stuSel = document.getElementById('boards-filter-student');
            if (stuSel) {
                const prev = stuSel.value;
                stuSel.innerHTML = '<option value="all">Wszyscy uczniowie</option>' +
                    state.students.map(s => `<option value="${s.id}">${escapeHTML(s.name)}</option>`).join('');
                if ([...stuSel.options].some(o => o.value === prev)) stuSel.value = prev;
            }

            const q = (document.getElementById('boards-search')?.value || '').toLowerCase().trim();
            const stuFilter = document.getElementById('boards-filter-student')?.value || 'all';

            const filteredStudents = state.students.filter(s => {
                if (stuFilter !== 'all' && s.id !== stuFilter) return false;
                if (q) {
                    const nb = getOrCreateStudentNotebook(s.id);
                    const secTitles = nb.sections.map(sec => sec.title).join(' ');
                    if (!`${s.name} ${s.level} ${secTitles}`.toLowerCase().includes(q)) return false;
                }
                return true;
            });

            if (filteredStudents.length === 0) {
                grid.innerHTML = '<div class="col-span-full bg-white p-8 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">Brak uczniów spełniających kryteria.</div>';
                return;
            }

            grid.innerHTML = filteredStudents.map(stu => {
                const nb = getOrCreateStudentNotebook(stu.id);
                const sectionsCount = nb.sections.length;
                const totalPages = nb.sections.reduce((acc, sec) => acc + wbGetPageCount(sec.pages?.[0]), 0);

                return `
                    <div class="bg-white p-4 sm:p-5 rounded-2xl border ${sectionsCount > 0 ? 'border-purple-200' : 'border-slate-200'} shadow-2xs flex flex-col justify-between gap-4 hover:shadow-md transition-all">
                        <div class="space-y-2.5 min-w-0">
                            <div class="flex items-start justify-between gap-2">
                                <div class="flex items-center gap-2.5 min-w-0">
                                    <div class="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 font-bold">
                                        <i class="fa-solid fa-book"></i>
                                    </div>
                                    <div class="min-w-0">
                                        <h3 class="font-extrabold text-sm sm:text-base text-slate-900 truncate">${escapeHTML(stu.name)}</h3>
                                        <span class="text-[11px] text-slate-500 block truncate">${escapeHTML(stu.level)}</span>
                                    </div>
                                </div>
                                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${sectionsCount > 0 ? 'bg-purple-50 text-purple-700' : 'bg-slate-100 text-slate-500'} shrink-0">
                                    ${sectionsCount} tablic • ${totalPages} str.
                                </span>
                            </div>

                            ${sectionsCount === 0
                                ? `<div class="bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs text-slate-400 text-center">Brak utworzonych tablic dla tego ucznia</div>`
                                : `<div class="bg-slate-50 rounded-xl p-2.5 border border-slate-100 text-xs space-y-1.5 max-h-40 overflow-y-auto">
                                    ${nb.sections.slice().reverse().map(sec => `
                                        <div class="flex items-center justify-between gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/70">
                                            <span class="font-semibold text-slate-700 truncate flex-1" title="${escapeHTML(sec.title)}">${escapeHTML(sec.title)}</span>
                                            <div class="flex items-center gap-1 shrink-0">
                                                <button onclick="openWhiteboardNotebook('${nb.id}', '${sec.id}')" class="px-2 py-1 rounded bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-semibold flex items-center gap-1" title="Otwórz w bieżącym oknie">
                                                    <i class="fa-solid fa-pen-to-square text-[9px]"></i> Otwórz
                                                </button>
                                                <button onclick="openBoardInNewWindow('${stu.id}', '${sec.id}')" class="px-2 py-1 rounded bg-sky-600 hover:bg-sky-700 text-white text-[10px] font-semibold flex items-center gap-1" title="Otwórz w osobnym oknie (Meet)">
                                                    <i class="fa-solid fa-up-right-from-square text-[9px]"></i> Nowe okno
                                                </button>
                                                <button onclick="deleteStudentBoardSection('${stu.id}', '${sec.id}')" class="w-6 h-6 rounded bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 flex items-center justify-center" title="Usuń tablicę">
                                                    <i class="fa-solid fa-trash-can text-[10px]"></i>
                                                </button>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>`
                            }
                        </div>

                        <div class="pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5">
                            ${sectionsCount > 0
                                ? `<button onclick="openWhiteboardForStudent('${stu.id}')" class="flex-1 py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs">
                                       <i class="fa-solid fa-book-open"></i> Otwórz ostatnią
                                   </button>`
                                : `<button onclick="createCustomBoardForStudent('${stu.id}')" class="flex-1 py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs">
                                       <i class="fa-solid fa-plus"></i> Utwórz tablicę
                                   </button>`
                            }
                            <button onclick="createCustomBoardForStudent('${stu.id}')" class="py-2.5 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold flex items-center gap-1" title="Dodaj nową tablicę">
                                <i class="fa-solid fa-plus"></i>
                            </button>
                            ${sectionsCount > 0 ? `
                                <button onclick="exportStudentNotebookPDF('${stu.id}')" class="py-2.5 px-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center gap-1" title="Eksportuj wszystkie tablice ucznia do PDF">
                                    <i class="fa-solid fa-file-pdf"></i>
                                </button>
                                <button onclick="deleteAllStudentBoards('${stu.id}')" class="py-2.5 px-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold flex items-center gap-1" title="Usuń wszystkie tablice ucznia">
                                    <i class="fa-solid fa-trash-can"></i>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `;
            }).join('');
        }

        function openWhiteboardForStudent(studentId, targetLessonId = null) {
            const nb = getOrCreateStudentNotebook(studentId);
            if (!nb.sections || nb.sections.length === 0) {
                createCustomBoardForStudent(studentId);
                return;
            }
            let targetSec = null;
            if (targetLessonId) {
                targetSec = nb.sections.find(s => s.lessonId === targetLessonId || s.id === 'sec_' + targetLessonId);
            }
            if (!targetSec) {
                targetSec = nb.sections[nb.sections.length - 1];
            }
            openWhiteboardNotebook(nb.id, targetSec ? targetSec.id : null);
        }

        function openWhiteboardFromStudentDetails(lessonId, studentId) {
            const modalEl = document.getElementById('modal-student-details');
            if (modalEl) modalEl.classList.add('hidden');
            const les = state.lessons.find(l => l.id === lessonId);
            const targetStuId = studentId || les?.studentId || les?.participants?.[0]?.studentId;
            if (!targetStuId) return;
            const nb = getOrCreateStudentNotebook(targetStuId);
            let sec = nb.sections.find(s => s.lessonId === lessonId || s.id === 'sec_' + lessonId);
            if (!sec && les) {
                const label = `${les.date} (${les.time})${les.topic ? ' – ' + les.topic : ''}`;
                sec = {
                    id: 'sec_' + les.id,
                    lessonId: les.id,
                    title: label,
                    date: les.date,
                    pages: [{ bg: 'grid', strokes: [], pageCount: 1 }]
                };
                nb.sections.push(sec);
                saveState();
            }
            openWhiteboardNotebook(nb.id, sec ? sec.id : null);
        }

        function openWhiteboardNotebookFromModal(notebookId, sectionId) {
            const modalEl = document.getElementById('modal-student-details');
            if (modalEl) modalEl.classList.add('hidden');
            openWhiteboardNotebook(notebookId, sectionId);
        }

        function openWhiteboardForLesson(lessonId) {
            const les = state.lessons.find(l => l.id === lessonId);
            if (!les) return;
            const firstStudentId = les.studentId || les.participants?.[0]?.studentId;
            if (!firstStudentId) {
                showToast('Ta lekcja nie ma przypisanego ucznia.', 'error');
                return;
            }
            const nb = getOrCreateStudentNotebook(firstStudentId);
            const existing = nb.sections.find(s => s.lessonId === lessonId || s.id === 'sec_' + lessonId);
            if (!existing) {
                createBoardForLesson(lessonId);
                return;
            }
            openWhiteboardNotebook(nb.id, existing.id);
        }

        function openWhiteboardNotebook(notebookId, sectionId = null) {
            ensureWhiteboardsStore();
            const nb = state.whiteboards[notebookId];
            if (!nb) return;

            if (!nb.sections || nb.sections.length === 0) {
                nb.sections = [{
                    id: 'sec_custom_' + Date.now(),
                    lessonId: null,
                    title: `Tablica ${formatDateISO(new Date())}`,
                    date: formatDateISO(new Date()),
                    pages: [{ bg: 'grid', strokes: [], pageCount: 1 }]
                }];
            }

            nb.sections.forEach(sec => normalizeSectionToContinuousPage(sec));

            wbCurrentNotebookId = notebookId;
            if (sectionId && nb.sections.some(s => s.id === sectionId)) {
                wbCurrentSectionId = sectionId;
            } else {
                wbCurrentSectionId = nb.sections[nb.sections.length - 1]?.id || null;
            }
            wbCurrentPageIdx = 0;
            wbRedoStack = [];
            wbClearSelection();
            wbCommitInlineText();
            wbCloseAllDropdowns();

            document.getElementById('wb-title').textContent = `Tablica: ${nb.studentName}`;
            wbPopulateSectionDropdown();

            const overlay = document.getElementById('whiteboard-overlay');
            const wasHidden = overlay.classList.contains('hidden');
            overlay.classList.remove('hidden');
            if (wasHidden && !isStandaloneBoardWindow) {
                pushNavHistory({ whiteboard: notebookId, tab: activeTab });
            }

            wbSyncPageControls();
            wbRefreshColorButtonsUI();
            setTimeout(() => {
                wbResizeCanvas();
                wbResetView();
            }, 20);
        }

        function wbPopulateSectionDropdown() {
            const nb = state.whiteboards?.[wbCurrentNotebookId];
            const sel = document.getElementById('wb-section-select');
            if (!nb || !sel) return;

            sel.innerHTML = nb.sections.map(sec =>
                `<option value="${sec.id}" class="bg-zinc-900 text-zinc-100">${escapeHTML(sec.title)}</option>`
            ).join('');

            if (wbCurrentSectionId) sel.value = wbCurrentSectionId;
            const activeSec = wbGetCurrentSection();
            document.getElementById('wb-subtitle').textContent = activeSec
                ? `${activeSec.title} • Podział stron PDF przerywaną linią`
                : 'Podział stron PDF przerywaną linią';
        }

        function wbSelectSection(secId) {
            wbCommitInlineText();
            wbClearSelection();
            wbCurrentSectionId = secId;
            wbCurrentPageIdx = 0;
            wbRedoStack = [];
            const activeSec = wbGetCurrentSection();
            document.getElementById('wb-subtitle').textContent = activeSec
                ? `${activeSec.title} • Podział stron PDF przerywaną linią`
                : 'Podział stron PDF przerywaną linią';
            wbSyncPageControls();
            wbResetView();
        }

        function wbAddCustomSection() {
            const nb = state.whiteboards?.[wbCurrentNotebookId];
            if (!nb) return;
            const name = prompt('Nazwa nowej tablicy w notatniku ucznia (np. Powtórka przed sprawdzianem):', `Tablica ${formatDateISO(new Date())}`);
            if (!name || !name.trim()) return;

            wbCommitInlineText();
            const newSec = {
                id: 'sec_custom_' + Date.now(),
                lessonId: null,
                title: name.trim(),
                date: formatDateISO(new Date()),
                pages: [{ bg: 'grid', strokes: [], pageCount: 1 }]
            };
            nb.sections.push(newSec);
            wbCurrentSectionId = newSec.id;
            wbCurrentPageIdx = 0;
            wbRedoStack = [];
            wbClearSelection();
            wbPopulateSectionDropdown();
            wbSyncPageControls();
            wbResetView();
            wbScheduleSave();
            showToast('Dodano nową tablicę.');
        }

        function wbDeleteCurrentSection() {
            const nb = state.whiteboards?.[wbCurrentNotebookId];
            if (!nb || !wbCurrentSectionId) return;
            const sec = nb.sections.find(s => s.id === wbCurrentSectionId);
            if (!sec) return;

            if (!confirm(`Czy na pewno usunąć tablicę "${sec.title}"? Tej operacji nie można cofnąć.`)) {
                return;
            }

            nb.sections = nb.sections.filter(s => s.id !== wbCurrentSectionId);
            if (sec.lessonId && state.whiteboards[sec.lessonId]) {
                delete state.whiteboards[sec.lessonId];
            }
            saveState();
            showToast('Usunięto tablicę.', 'info');

            if (nb.sections.length === 0) {
                if (isStandaloneBoardWindow) {
                    window.close();
                } else {
                    closeWhiteboard();
                }
                return;
            }

            wbCurrentSectionId = nb.sections[nb.sections.length - 1].id;
            wbCurrentPageIdx = 0;
            wbRedoStack = [];
            wbClearSelection();
            wbPopulateSectionDropdown();
            wbSyncPageControls();
            wbResetView();
        }

        function closeWhiteboard(fromPopState = false) {
            wbCommitInlineText();
            wbClearSelection();
            wbCloseAllDropdowns();

            if (document.fullscreenElement) {
                try { document.exitFullscreen(); } catch (e) {}
            }

            if (isStandaloneBoardWindow) {
                saveState();
                window.close();
                // W osobnym oknie tablicy nie otwieraj panelu rozliczeń nawet jeśli window.close() zostanie zablokowane
                showToast('Zapisano tablicę. Możesz bezpiecznie zamknąć to okno.', 'info');
                return;
            }

            const overlay = document.getElementById('whiteboard-overlay');
            if (overlay && !overlay.classList.contains('hidden')) {
                overlay.classList.add('hidden');
                wbCurrentNotebookId = null;
                wbCurrentSectionId = null;
                saveState();
                if (activeTab === 'boards') renderBoardsList();
                else if (activeTab === 'schedule') renderSchedule();

                if (!fromPopState && !isHandlingPopState && window.history.state && window.history.state.whiteboard) {
                    isHandlingPopState = true;
                    try { window.history.back(); } catch (e) {}
                    setTimeout(() => { isHandlingPopState = false; }, 60);
                }
            }
        }

        function wbToggleFullscreen() {
            const overlay = document.getElementById('whiteboard-overlay');
            if (!overlay) return;
            if (!document.fullscreenElement) {
                overlay.requestFullscreen?.().catch(() => {
                    showToast('Przeglądarka nie zezwoliła na tryb pełnoekranowy.', 'info');
                });
            } else {
                document.exitFullscreen?.().catch(() => {});
            }
        }

        document.addEventListener('fullscreenchange', () => {
            const icon = document.getElementById('wb-fullscreen-icon');
            const label = document.getElementById('wb-fullscreen-label');
            const isFs = Boolean(document.fullscreenElement);
            if (icon) icon.className = isFs ? 'fa-solid fa-compress' : 'fa-solid fa-expand';
            if (label) label.textContent = isFs ? 'Wyjdź z pełnego' : 'Pełny ekran';
            if (wbCurrentNotebookId) {
                setTimeout(() => {
                    wbResizeCanvas();
                    wbClampCamera();
                    wbRedrawCanvas();
                }, 40);
            }
        });

        function wbGetCurrentSection() {
            const nb = state.whiteboards?.[wbCurrentNotebookId];
            if (!nb || !nb.sections.length) return null;
            let sec = nb.sections.find(s => s.id === wbCurrentSectionId);
            if (!sec) {
                sec = nb.sections[nb.sections.length - 1];
                wbCurrentSectionId = sec.id;
            }
            normalizeSectionToContinuousPage(sec);
            return sec;
        }

        function wbGetCurrentPage() {
            const sec = wbGetCurrentSection();
            if (!sec) return null;
            return sec.pages[0];
        }

        function wbSyncPageControls() {
            const page = wbGetCurrentPage();
            if (!page) return;
            const totalPages = wbGetPageCount(page);
            const ind = document.getElementById('wb-page-indicator');
            if (ind) ind.textContent = `${totalPages} str. A4`;

            const bgVal = page.bg || 'grid';
            document.querySelectorAll('.wb-bg-opt').forEach(btn => {
                const check = btn.querySelector('.fa-check');
                if (check) {
                    if (btn.dataset.wbBg === bgVal) check.classList.remove('hidden');
                    else check.classList.add('hidden');
                }
            });
        }

        function wbExtendCanvasHeight() {
            const page = wbGetCurrentPage();
            if (!page) return;
            const currentCount = wbGetPageCount(page);
            page.pageCount = currentCount + 1;
            wbSyncPageControls();
            // Płynnie przesuń widok nieco niżej, aby pokazać nową przestrzeń pod przerywaną linią
            wbPanY -= Math.round(WB_PAGE_H * 0.45 * wbZoom);
            wbClampCamera();
            wbRedrawCanvas();
            wbScheduleSave();
            showToast(`Dodano przestrzeń na stronę ${page.pageCount} (pod przerywaną linią).`, 'info');
        }

        // ==================== ZARZĄDZANIE ROZWIJANYMI KATEGORIAMI W PASKU NARZĘDZI ====================
        function wbCloseAllDropdowns() {
            document.querySelectorAll('.wb-dropdown').forEach(el => el.classList.add('hidden'));
        }

        function wbToggleDropdown(name) {
            const target = document.getElementById('wb-dd-' + name);
            if (!target) return;
            const wasHidden = target.classList.contains('hidden');
            wbCloseAllDropdowns();
            if (wasHidden) {
                target.classList.remove('hidden');
            }
            if (name === 'eraser') {
                wbSetTool(wbLastEraserMode);
            }
        }

        function wbSelectEraserMode(mode) {
            wbLastEraserMode = mode;
            const lbl = document.getElementById('wb-eraser-label');
            if (lbl) lbl.textContent = mode === 'eraser-point' ? 'Punktowa' : 'Gumka';

            const optStroke = document.getElementById('wb-opt-eraser-stroke');
            const optPoint = document.getElementById('wb-opt-eraser-point');
            if (optStroke && optPoint) {
                optStroke.className = mode === 'eraser-stroke'
                    ? 'w-full px-2.5 py-2 rounded-lg text-left text-xs flex items-center gap-2 bg-zinc-800 text-white font-semibold'
                    : 'w-full px-2.5 py-2 rounded-lg text-left text-xs flex items-center gap-2 text-zinc-300 hover:bg-zinc-800 font-semibold';
                optPoint.className = mode === 'eraser-point'
                    ? 'w-full px-2.5 py-2 rounded-lg text-left text-xs flex items-center gap-2 bg-zinc-800 text-white font-semibold'
                    : 'w-full px-2.5 py-2 rounded-lg text-left text-xs flex items-center gap-2 text-zinc-300 hover:bg-zinc-800 font-semibold';
            }

            wbSetTool(mode);
            wbCloseAllDropdowns();
        }

        function wbPickShape(shapeType, iconClass) {
            const iconEl = document.getElementById('wb-active-shape-icon');
            if (iconEl && iconClass) {
                iconEl.className = `${iconClass} text-purple-400 text-xs`;
            }
            wbSetTool(shapeType);
            wbCloseAllDropdowns();
        }

        // ==================== WIDOK, ZOOM (+ / - / CTRL+SCROLL) I CIĄGŁE PRZEWIJANIE W DÓŁ ====================
        function wbGetFitZoom() {
            const canvas = document.getElementById('wb-canvas');
            if (!canvas) return 1;
            const dpr = window.devicePixelRatio || 1;
            const viewW = canvas.width / dpr;
            const margin = 32;
            const fit = (viewW - margin) / WB_PAGE_W;
            return Math.max(0.25, Math.min(1.5, fit));
        }

        function wbClampCamera() {
            const canvas = document.getElementById('wb-canvas');
            if (!canvas) return;
            const dpr = window.devicePixelRatio || 1;
            const viewW = canvas.width / dpr;
            const viewH = canvas.height / dpr;

            const page = wbGetCurrentPage();
            const logicalH = wbGetCanvasLogicalHeight(page);

            const scaledW = WB_PAGE_W * wbZoom;
            const scaledH = logicalH * wbZoom;
            const pad = 24;

            if (scaledW <= viewW - pad * 2) {
                wbPanX = Math.round((viewW - scaledW) / 2);
            } else {
                const minX = viewW - scaledW - pad;
                const maxX = pad;
                wbPanX = Math.round(Math.max(minX, Math.min(maxX, wbPanX)));
            }

            if (scaledH <= viewH - pad * 2) {
                wbPanY = pad;
            } else {
                const minY = viewH - scaledH - pad;
                const maxY = pad;
                wbPanY = Math.round(Math.max(minY, Math.min(maxY, wbPanY)));
            }
        }

        function wbUpdateZoomIndicator() {
            const ind = document.getElementById('wb-zoom-indicator');
            if (ind) {
                ind.textContent = `${Math.round(wbZoom * 100)}%`;
            }
        }

        function wbResetView() {
            wbZoom = wbGetFitZoom();
            wbPanY = 24;
            wbClampCamera();
            wbUpdateZoomIndicator();
            wbRedrawCanvas();
        }

        function wbChangeZoom(delta, anchorScreenX = null, anchorScreenY = null) {
            const canvas = document.getElementById('wb-canvas');
            if (!canvas) return;
            const dpr = window.devicePixelRatio || 1;
            const viewW = canvas.width / dpr;
            const viewH = canvas.height / dpr;

            const sx = anchorScreenX !== null ? anchorScreenX : viewW / 2;
            const sy = anchorScreenY !== null ? anchorScreenY : viewH / 2;

            const worldX = (sx - wbPanX) / wbZoom;
            const worldY = (sy - wbPanY) / wbZoom;

            const minZoom = Math.min(0.25, wbGetFitZoom() * 0.75);
            const maxZoom = 3.0;
            wbZoom = Math.max(minZoom, Math.min(maxZoom, Math.round((wbZoom + delta) * 100) / 100));

            wbPanX = sx - worldX * wbZoom;
            wbPanY = sy - worldY * wbZoom;

            wbClampCamera();
            wbUpdateZoomIndicator();
            wbRedrawCanvas();
        }

        function wbClampToPage(x, y) {
            const page = wbGetCurrentPage();
            const maxH = wbGetCanvasLogicalHeight(page);
            return {
                x: Math.max(0, Math.min(WB_PAGE_W, x)),
                y: Math.max(0, Math.min(maxH, y))
            };
        }

        // ==================== NIEZNIKAJĄCY KURSOR RYSIKA / TABLETU GRAFICZNEGO ====================
        function wbUpdateStylusCursor(clientX, clientY) {
            const cursorEl = document.getElementById('wb-stylus-cursor');
            const wrapper = document.getElementById('wb-canvas-wrapper');
            if (!cursorEl || !wrapper || !wbCurrentNotebookId) return;

            const rect = wrapper.getBoundingClientRect();
            const inside = clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
            if (!inside) {
                cursorEl.classList.add('hidden');
                return;
            }

            cursorEl.style.left = `${clientX}px`;
            cursorEl.style.top = `${clientY}px`;
            cursorEl.classList.remove('hidden');

            if (wbTool === 'eraser-stroke' || wbTool === 'eraser-point') {
                const size = Math.max(14, Math.round(wbWidth * 2.6 * wbZoom));
                cursorEl.style.width = `${size}px`;
                cursorEl.style.height = `${size}px`;
                cursorEl.innerHTML = `<div class="w-full h-full rounded-full border-2 border-purple-600 bg-purple-400/20 shadow-xs"></div>`;
            } else if (wbTool === 'pen' || wbTool === 'highlighter') {
                const dotSize = Math.max(6, Math.min(20, Math.round((wbTool === 'highlighter' ? wbWidth * 2.5 : wbWidth) * wbZoom)));
                cursorEl.style.width = `${dotSize + 12}px`;
                cursorEl.style.height = `${dotSize + 12}px`;
                cursorEl.innerHTML = `
                    <div class="relative w-full h-full flex items-center justify-center">
                        <div class="w-full h-[1.5px] bg-slate-600/70 absolute"></div>
                        <div class="h-full w-[1.5px] bg-slate-600/70 absolute"></div>
                        <div class="rounded-full border border-white shadow-2xs" style="width:${dotSize}px;height:${dotSize}px;background:${wbColor};"></div>
                    </div>`;
            } else if (wbTool === 'laser') {
                cursorEl.style.width = '16px';
                cursorEl.style.height = '16px';
                cursorEl.innerHTML = `<div class="w-full h-full rounded-full bg-red-500 ring-2 ring-white shadow-md"></div>`;
            } else {
                cursorEl.classList.add('hidden');
            }
        }

        function wbUpdateCursorForTool(tool) {
            const wrapper = document.getElementById('wb-canvas-wrapper');
            if (!wrapper) return;
            if (wbSpacePressed) wrapper.style.cursor = wbIsPanning ? 'grabbing' : 'grab';
            else if (tool === 'text') wrapper.style.cursor = 'text';
            else if (tool === 'select' || tool === 'lasso') wrapper.style.cursor = 'default';
            else if (['pen', 'highlighter', 'eraser-stroke', 'eraser-point', 'laser'].includes(tool)) wrapper.style.cursor = 'none';
            else wrapper.style.cursor = 'crosshair';
        }

        function wbSetTool(tool) {
            if (wbTool === 'text' && tool !== 'text') {
                wbCommitInlineText();
            }
            if (tool !== 'lasso' && tool !== 'select') {
                wbClearSelection();
            }
            wbTool = tool;
            wbUpdateCursorForTool(tool);

            const isShapeTool = ['line', 'arrow', 'axes', 'rect', 'circle', 'triangle'].includes(tool);
            const shapesMainBtn = document.getElementById('wb-shapes-main-btn');
            if (shapesMainBtn) {
                shapesMainBtn.className = isShapeTool
                    ? 'px-2.5 h-9 rounded-xl bg-zinc-700 border border-purple-400 text-white text-xs font-semibold flex items-center gap-1.5 transition-all'
                    : 'px-2.5 h-9 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-xs font-semibold flex items-center gap-1.5 text-zinc-200 transition-all';
            }

            document.querySelectorAll('.wb-tool-btn').forEach(btn => {
                const btnTool = btn.dataset.wbTool;
                const active = btnTool === tool || (btnTool === 'eraser' && (tool === 'eraser-stroke' || tool === 'eraser-point'));
                if (active) {
                    btn.className = 'wb-tool-btn px-2.5 h-8 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 bg-zinc-700 text-white ring-1 ring-purple-400 shadow-2xs transition-all';
                } else {
                    btn.className = 'wb-tool-btn px-2 h-8 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 text-zinc-300 hover:bg-zinc-800 transition-all';
                }
            });
            wbRefreshColorButtonsUI();
            wbRedrawCanvas();
        }

        function wbRefreshColorButtonsUI() {
            const dot = document.getElementById('wb-current-color-dot');
            if (dot) dot.style.backgroundColor = wbColor;

            document.querySelectorAll('.wb-color-btn').forEach(btn => {
                const c = btn.dataset.wbColor;
                const active = c && c.toLowerCase() === wbColor.toLowerCase();
                const isWhite = c && c.toLowerCase() === '#ffffff';
                btn.style.backgroundColor = c;
                btn.className = active
                    ? `wb-color-btn w-6 h-6 rounded-full border ${isWhite ? 'border-zinc-300' : 'border-zinc-400'} ring-2 ring-offset-1 ring-offset-zinc-900 ring-purple-400 scale-110 transition-transform`
                    : `wb-color-btn w-6 h-6 rounded-full border ${isWhite ? 'border-zinc-400' : 'border-zinc-600'} transition-transform`;
            });
        }

        function wbSetColor(hex) {
            wbColor = hex;
            wbRefreshColorButtonsUI();

            const page = wbGetCurrentPage();
            if (page && wbSelectedIndices.size > 0) {
                let changed = false;
                wbSelectedIndices.forEach(idx => {
                    const s = page.strokes[idx];
                    if (s && s.type !== 'image') {
                        s.color = hex;
                        changed = true;
                    }
                });
                if (changed) {
                    wbRedrawCanvas();
                    wbScheduleSave();
                }
            }

            const editor = document.getElementById('wb-inline-text-editor');
            if (editor && !editor.classList.contains('hidden')) {
                editor.style.color = hex;
            }
            if (['eraser-stroke', 'eraser-point', 'lasso'].includes(wbTool)) {
                wbSetTool('pen');
            }
            wbCloseAllDropdowns();
        }

        function wbStepWidth(delta) {
            wbSetWidth(wbWidth + delta, false);
        }

        function wbSetWidth(w, closeDropdown = true) {
            wbWidth = Math.max(1, Math.min(40, Math.round(Number(w) || 3)));
            const lbl = document.getElementById('wb-current-width-label');
            if (lbl) lbl.textContent = `${wbWidth}px`;

            const ddVal = document.getElementById('wb-dd-width-val');
            if (ddVal) ddVal.textContent = `${wbWidth} px`;

            const slider = document.getElementById('wb-width-slider');
            if (slider && Number(slider.value) !== wbWidth) {
                slider.value = wbWidth;
            }

            const page = wbGetCurrentPage();
            if (page && wbSelectedIndices.size > 0) {
                let changed = false;
                wbSelectedIndices.forEach(idx => {
                    const s = page.strokes[idx];
                    if (s && s.type !== 'image') {
                        s.width = s.type === 'highlighter' ? Math.max(12, wbWidth * 4) : wbWidth;
                        changed = true;
                    }
                });
                if (changed) {
                    wbRedrawCanvas();
                    wbScheduleSave();
                }
            }
            if (closeDropdown) wbCloseAllDropdowns();
        }

        function wbSetBackground(bg) {
            const page = wbGetCurrentPage();
            if (!page) return;
            page.bg = bg;
            if (bg === 'dark' && wbColor === '#0f172a') {
                wbSetColor('#ffffff');
            } else if (bg !== 'dark' && wbColor === '#ffffff') {
                wbSetColor('#0f172a');
            }
            wbSyncPageControls();
            wbRedrawCanvas();
            wbScheduleSave();
            wbCloseAllDropdowns();
        }

        function wbToggleAutoShape() {
            wbAutoShape = !wbAutoShape;
            const stateBadge = document.getElementById('wb-autoshape-state');
            const btn = document.getElementById('wb-autoshape-btn');
            if (stateBadge) {
                stateBadge.textContent = wbAutoShape ? 'WŁ' : 'WYŁ';
                stateBadge.className = wbAutoShape
                    ? 'text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-purple-600 text-white'
                    : 'text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-300';
            }
            if (btn) {
                btn.className = wbAutoShape
                    ? 'w-full px-2.5 py-2 rounded-lg border border-purple-500/40 bg-purple-600/20 text-purple-200 text-xs font-semibold flex items-center justify-between'
                    : 'w-full px-2.5 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-400 text-xs font-semibold flex items-center justify-between';
            }
            showToast(wbAutoShape ? 'Pismo odręczne na kształty: WŁĄCZONE' : 'Pismo odręczne na kształty: WYŁĄCZONE', 'info');
        }

        function wbUndo() {
            wbCommitInlineText();
            wbClearSelection();
            const page = wbGetCurrentPage();
            if (!page || page.strokes.length === 0) return;
            const removed = page.strokes.pop();
            wbRedoStack.push(removed);
            wbSyncPageControls();
            wbRedrawCanvas();
            wbScheduleSave();
        }

        function wbRedo() {
            wbCommitInlineText();
            wbClearSelection();
            const page = wbGetCurrentPage();
            if (!page || wbRedoStack.length === 0) return;
            const restored = wbRedoStack.pop();
            page.strokes.push(restored);
            wbSyncPageControls();
            wbRedrawCanvas();
            wbScheduleSave();
        }

        function wbClearCurrentPage() {
            wbCommitInlineText();
            wbClearSelection();
            const page = wbGetCurrentPage();
            if (!page || page.strokes.length === 0) return;
            page.strokes = [];
            page.pageCount = 1;
            wbRedoStack = [];
            wbSyncPageControls();
            wbResetView();
            wbScheduleSave();
            showToast('Wyczyszczono bieżącą tablicę.', 'info');
        }

        function wbScheduleSave() {
            const nb = state.whiteboards?.[wbCurrentNotebookId];
            if (nb) nb.updatedAt = new Date().toISOString();
            clearTimeout(wbSaveDebounce);
            wbSaveDebounce = setTimeout(() => {
                saveState();
            }, 500);
        }

        // ==================== WKLEJANIE I WSTAWIANIE OBRAZÓW (CTRL+V / PLIK) ====================
        function wbTriggerImageUpload() {
            const inp = document.getElementById('wb-image-input');
            if (inp) {
                inp.value = '';
                inp.click();
            }
        }

        function wbHandleImageFileInput(event) {
            const file = event.target.files?.[0];
            if (!file) return;
            wbInsertImageBlob(file);
        }

        function wbInsertImageBlob(blob) {
            if (!wbCurrentNotebookId) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                const rawDataUrl = ev.target.result;
                const img = new Image();
                img.onload = () => {
                    const maxDim = 1200;
                    let w = img.naturalWidth || img.width || 400;
                    let h = img.naturalHeight || img.height || 300;
                    let finalDataUrl = rawDataUrl;

                    if (w > maxDim || h > maxDim) {
                        const scale = maxDim / Math.max(w, h);
                        w = Math.round(w * scale);
                        h = Math.round(h * scale);
                        const tmpCanvas = document.createElement('canvas');
                        tmpCanvas.width = w;
                        tmpCanvas.height = h;
                        tmpCanvas.getContext('2d').drawImage(img, 0, 0, w, h);
                        finalDataUrl = tmpCanvas.toDataURL('image/jpeg', 0.86);
                    }

                    let displayW = w;
                    let displayH = h;
                    const maxStartW = 560;
                    const maxStartH = 440;
                    if (displayW > maxStartW || displayH > maxStartH) {
                        const s = Math.min(maxStartW / displayW, maxStartH / displayH);
                        displayW = Math.round(displayW * s);
                        displayH = Math.round(displayH * s);
                    }

                    const page = wbGetCurrentPage();
                    if (!page) return;

                    // Wstaw obraz w aktualnie widocznym fragmencie ekranu
                    const canvas = document.getElementById('wb-canvas');
                    const dpr = window.devicePixelRatio || 1;
                    const viewH = canvas ? canvas.height / dpr : WB_PAGE_H;
                    const visibleCenterY = Math.max(displayH / 2 + 40, ((viewH / 2) - wbPanY) / wbZoom);

                    const startX = Math.round((WB_PAGE_W - displayW) / 2);
                    const startY = Math.round(visibleCenterY - displayH / 2);

                    const cachedImg = new Image();
                    cachedImg.src = finalDataUrl;
                    wbImageCache.set(finalDataUrl, cachedImg);

                    page.strokes.push({
                        type: 'image',
                        x1: startX,
                        y1: startY,
                        x2: startX + displayW,
                        y2: startY + displayH,
                        src: finalDataUrl
                    });

                    const newIdx = page.strokes.length - 1;
                    wbSetTool('select');
                    wbSelectedIndices.clear();
                    wbSelectedIndices.add(newIdx);
                    wbUpdateDeleteBtnVisibility();
                    wbRedoStack = [];
                    wbSyncPageControls();
                    wbRedrawCanvas();
                    wbScheduleSave();
                    showToast('Wklejono obraz na tablicę. Możesz go przesuwać i skalować.', 'success');
                };
                img.src = rawDataUrl;
            };
            reader.readAsDataURL(blob);
        }

        // ==================== BEZPOŚREDNI TEKST NA KARTCE ====================
        function wbOpenInlineTextAt(worldX, worldY) {
            wbCommitInlineText();
            const clamped = wbClampToPage(worldX, worldY);
            const editor = document.getElementById('wb-inline-text-editor');
            if (!editor) return;

            const screenX = clamped.x * wbZoom + wbPanX;
            const screenY = clamped.y * wbZoom + wbPanY - 14;

            wbInlineTextWorldPos = { x: clamped.x, y: clamped.y };
            editor.style.left = `${Math.max(8, screenX)}px`;
            editor.style.top = `${Math.max(8, screenY)}px`;
            editor.style.color = wbColor;
            editor.style.width = 'auto';
            editor.style.height = 'auto';
            editor.textContent = '';
            editor.classList.remove('hidden');

            setTimeout(() => {
                editor.focus();
            }, 10);
        }

        function wbCommitInlineText() {
            const editor = document.getElementById('wb-inline-text-editor');
            if (!editor || editor.classList.contains('hidden')) return;

            const rawText = editor.innerText.replace(/\r/g, '').replace(/\n+$/, '');
            if (rawText.trim() && wbInlineTextWorldPos) {
                const page = wbGetCurrentPage();
                if (page) {
                    const fontSize = Math.max(16, 14 + wbWidth * 1.5);
                    page.strokes.push({
                        type: 'text',
                        x1: wbInlineTextWorldPos.x + 6,
                        y1: wbInlineTextWorldPos.y + 4,
                        text: rawText,
                        fontSize: fontSize,
                        color: wbColor,
                        width: wbWidth
                    });
                    wbRedoStack = [];
                    wbSyncPageControls();
                    wbScheduleSave();
                }
            }

            editor.textContent = '';
            editor.classList.add('hidden');
            wbInlineTextWorldPos = null;
            wbRedrawCanvas();
        }

        // ==================== ZAZNACZANIE, PRZESUWANIE I SKALOWANIE OBIEKTÓW ====================
        function wbUpdateDeleteBtnVisibility() {
            const delBtn = document.getElementById('wb-lasso-delete-btn');
            if (!delBtn) return;
            if (wbSelectedIndices.size > 0) delBtn.classList.remove('hidden');
            else delBtn.classList.add('hidden');
        }

        function wbClearSelection() {
            wbSelectedIndices.clear();
            wbLassoPolygon = null;
            wbSelectionMode = null;
            wbActiveHandle = null;
            wbResizeOrigBBox = null;
            wbResizeOrigStrokes = null;
            wbUpdateDeleteBtnVisibility();
        }

        function wbGetStrokeBBox(s) {
            if (s.points && s.points.length) {
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                for (const p of s.points) {
                    if (p.x < minX) minX = p.x;
                    if (p.y < minY) minY = p.y;
                    if (p.x > maxX) maxX = p.x;
                    if (p.y > maxY) maxY = p.y;
                }
                const pad = (s.width || 3) + 4;
                return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
            }
            if (s.type === 'text') {
                const fontSize = s.fontSize || 18;
                const lines = String(s.text || '').split('\n');
                const maxLen = Math.max(...lines.map(l => l.length), 1);
                const lineHeight = Math.round(fontSize * 1.32);
                return {
                    minX: s.x1 - 4,
                    minY: s.y1 - fontSize,
                    maxX: s.x1 + maxLen * (fontSize * 0.58) + 8,
                    maxY: s.y1 + (lines.length - 1) * lineHeight + 8
                };
            }
            const x1 = Number(s.x1) || 0;
            const y1 = Number(s.y1) || 0;
            const x2 = s.x2 !== undefined ? Number(s.x2) : x1;
            const y2 = s.y2 !== undefined ? Number(s.y2) : y1;
            const pad = s.type === 'image' ? 0 : (s.width || 3) + 4;
            return {
                minX: Math.min(x1, x2) - pad,
                minY: Math.min(y1, y2) - pad,
                maxX: Math.max(x1, x2) + pad,
                maxY: Math.max(y1, y2) + pad
            };
        }

        function wbGetCombinedSelectionBBox(page) {
            if (!page || wbSelectedIndices.size === 0) return null;
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            wbSelectedIndices.forEach(idx => {
                const s = page.strokes[idx];
                if (!s) return;
                const b = wbGetStrokeBBox(s);
                if (b.minX < minX) minX = b.minX;
                if (b.minY < minY) minY = b.minY;
                if (b.maxX > maxX) maxX = b.maxX;
                if (b.maxY > maxY) maxY = b.maxY;
            });
            if (minX === Infinity) return null;
            return { minX: minX - 4, minY: minY - 4, maxX: maxX + 4, maxY: maxY + 4 };
        }

        function wbGetSelectionHandles(box) {
            const mx = (box.minX + box.maxX) / 2;
            const my = (box.minY + box.maxY) / 2;
            return [
                { id: 'nw', x: box.minX, y: box.minY },
                { id: 'n',  x: mx,       y: box.minY },
                { id: 'ne', x: box.maxX, y: box.minY },
                { id: 'e',  x: box.maxX, y: my },
                { id: 'se', x: box.maxX, y: box.maxY },
                { id: 's',  x: mx,       y: box.maxY },
                { id: 'sw', x: box.minX, y: box.maxY },
                { id: 'w',  x: box.minX, y: my }
            ];
        }

        function wbHitTestHandle(worldX, worldY, page) {
            if (!page || wbSelectedIndices.size === 0) return null;
            const tol = 14 / wbZoom;

            if (wbSelectedIndices.size === 1) {
                const onlyIdx = Array.from(wbSelectedIndices)[0];
                const s = page.strokes[onlyIdx];
                if (s && (s.type === 'line' || s.type === 'arrow')) {
                    if (Math.hypot(worldX - s.x1, worldY - s.y1) <= tol) return { type: 'endpoint1' };
                    if (Math.hypot(worldX - s.x2, worldY - s.y2) <= tol) return { type: 'endpoint2' };
                }
            }

            const box = wbGetCombinedSelectionBBox(page);
            if (!box) return null;
            const handles = wbGetSelectionHandles(box);
            for (const h of handles) {
                if (Math.abs(worldX - h.x) <= tol && Math.abs(worldY - h.y) <= tol) {
                    return { type: 'resize', handle: h.id };
                }
            }
            if (worldX >= box.minX && worldX <= box.maxX && worldY >= box.minY && worldY <= box.maxY) {
                return { type: 'move' };
            }
            return null;
        }

        function wbFindTopmostStrokeAt(worldX, worldY, page) {
            if (!page || !page.strokes.length) return -1;
            const radius = 10 / wbZoom;
            for (let i = page.strokes.length - 1; i >= 0; i--) {
                if (wbStrokeHitsPoint(page.strokes[i], worldX, worldY, radius)) {
                    return i;
                }
            }
            return -1;
        }

        function wbPointInPolygon(pt, vs) {
            let inside = false;
            for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
                const xi = vs[i].x, yi = vs[i].y;
                const xj = vs[j].x, yj = vs[j].y;
                const intersect = ((yi > pt.y) !== (yj > pt.y)) &&
                    (pt.x < (xj - xi) * (pt.y - yi) / ((yj - yi) || 0.00001) + xi);
                if (intersect) inside = !inside;
            }
            return inside;
        }

        function wbFinalizeLassoSelection() {
            const page = wbGetCurrentPage();
            wbSelectedIndices.clear();
            if (!page || !wbLassoPolygon || wbLassoPolygon.length < 3) {
                wbLassoPolygon = null;
                wbUpdateDeleteBtnVisibility();
                return;
            }

            page.strokes.forEach((s, idx) => {
                if (s.points && s.points.length) {
                    const hits = s.points.filter(p => wbPointInPolygon(p, wbLassoPolygon)).length;
                    if (hits > 0 && hits >= s.points.length * 0.35) {
                        wbSelectedIndices.add(idx);
                    }
                } else {
                    const b = wbGetStrokeBBox(s);
                    const center = { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
                    const corners = [
                        center,
                        { x: b.minX, y: b.minY },
                        { x: b.maxX, y: b.minY },
                        { x: b.minX, y: b.maxY },
                        { x: b.maxX, y: b.maxY }
                    ];
                    if (corners.some(c => wbPointInPolygon(c, wbLassoPolygon))) {
                        wbSelectedIndices.add(idx);
                    }
                }
            });

            wbLassoPolygon = null;
            wbUpdateDeleteBtnVisibility();
        }

        function wbTranslateSelectedStrokes(dx, dy) {
            const page = wbGetCurrentPage();
            if (!page || wbSelectedIndices.size === 0) return;
            const maxH = wbGetCanvasLogicalHeight(page);
            const box = wbGetCombinedSelectionBBox(page);
            if (box) {
                if (box.minX + dx < 0) dx = -box.minX;
                if (box.maxX + dx > WB_PAGE_W) dx = WB_PAGE_W - box.maxX;
                if (box.minY + dy < 0) dy = -box.minY;
                if (box.maxY + dy > maxH) dy = maxH - box.maxY;
            }
            wbSelectedIndices.forEach(idx => {
                const s = page.strokes[idx];
                if (!s) return;
                if (s.points) {
                    s.points.forEach(p => { p.x += dx; p.y += dy; });
                }
                if (s.x1 !== undefined) s.x1 += dx;
                if (s.y1 !== undefined) s.y1 += dy;
                if (s.x2 !== undefined) s.x2 += dx;
                if (s.y2 !== undefined) s.y2 += dy;
            });
            wbSyncPageControls();
        }

        // POPRAWIONE SKALOWANIE: Kotwiczy przeciwległy róg/krawędź i skaluje dokładnie od uchwytu, za który ciągniesz
        function wbApplyResizeFromHandles(worldX, worldY, keepAspect) {
            const page = wbGetCurrentPage();
            if (!page || !wbResizeOrigBBox || !wbResizeOrigStrokes) return;

            const clamped = wbClampToPage(worldX, worldY);
            worldX = clamped.x;
            worldY = clamped.y;

            const ob = wbResizeOrigBBox;
            const origW = Math.max(1, ob.maxX - ob.minX);
            const origH = Math.max(1, ob.maxY - ob.minY);
            const h = wbActiveHandle;

            // Wyznacz stały punkt zakotwiczenia (przeciwległy względem ciągniętego uchwytu)
            const anchorX = h.includes('w') ? ob.maxX : h.includes('e') ? ob.minX : (ob.minX + ob.maxX) / 2;
            const anchorY = h.includes('n') ? ob.maxY : h.includes('s') ? ob.minY : (ob.minY + ob.maxY) / 2;

            let newMinX = ob.minX;
            let newMaxX = ob.maxX;
            let newMinY = ob.minY;
            let newMaxY = ob.maxY;

            if (h.includes('w')) newMinX = Math.min(worldX, anchorX - 12);
            if (h.includes('e')) newMaxX = Math.max(worldX, anchorX + 12);
            if (h.includes('n')) newMinY = Math.min(worldY, anchorY - 12);
            if (h.includes('s')) newMaxY = Math.max(worldY, anchorY + 12);

            let newW = Math.max(12, newMaxX - newMinX);
            let newH = Math.max(12, newMaxY - newMinY);

            if (keepAspect) {
                const ratio = origW / origH;
                if (h === 'n' || h === 's') {
                    newW = newH * ratio;
                    newMinX = anchorX - newW / 2;
                    newMaxX = anchorX + newW / 2;
                } else if (h === 'e' || h === 'w') {
                    newH = newW / ratio;
                    newMinY = anchorY - newH / 2;
                    newMaxY = anchorY + newH / 2;
                } else {
                    const uniformScale = Math.max(newW / origW, newH / origH);
                    newW = origW * uniformScale;
                    newH = origH * uniformScale;
                    if (h.includes('w')) { newMaxX = anchorX; newMinX = anchorX - newW; }
                    else { newMinX = anchorX; newMaxX = anchorX + newW; }
                    if (h.includes('n')) { newMaxY = anchorY; newMinY = anchorY - newH; }
                    else { newMinY = anchorY; newMaxY = anchorY + newH; }
                }
            }

            const sx = newW / origW;
            const sy = newH / origH;

            wbResizeOrigStrokes.forEach((origS, idx) => {
                const curS = page.strokes[idx];
                if (!curS) return;
                if (origS.points) {
                    curS.points = origS.points.map(p => ({
                        x: newMinX + (p.x - ob.minX) * sx,
                        y: newMinY + (p.y - ob.minY) * sy
                    }));
                }
                if (origS.x1 !== undefined) curS.x1 = newMinX + (origS.x1 - ob.minX) * sx;
                if (origS.y1 !== undefined) curS.y1 = newMinY + (origS.y1 - ob.minY) * sy;
                if (origS.x2 !== undefined) curS.x2 = newMinX + (origS.x2 - ob.minX) * sx;
                if (origS.y2 !== undefined) curS.y2 = newMinY + (origS.y2 - ob.minY) * sy;
                if (origS.type === 'text') {
                    const origFont = origS.fontSize || 18;
                    curS.fontSize = Math.max(10, Math.round(origFont * ((sx + sy) / 2)));
                }
            });
            wbSyncPageControls();
        }

        function wbDeleteLassoSelection() {
            const page = wbGetCurrentPage();
            if (!page || wbSelectedIndices.size === 0) return;
            page.strokes = page.strokes.filter((_, idx) => !wbSelectedIndices.has(idx));
            wbClearSelection();
            wbSyncPageControls();
            wbRedrawCanvas();
            wbScheduleSave();
            showToast('Usunięto zaznaczone elementy.', 'info');
        }

        // ==================== GUMKA POCIĄGNIĘĆ ORAZ GUMKA PUNKTOWA ====================
        function wbDistanceToSegment(px, py, x1, y1, x2, y2) {
            const dx = x2 - x1;
            const dy = y2 - y1;
            if (dx === 0 && dy === 0) return Math.hypot(px - x1, py - y1);
            const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
            return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
        }

        function wbStrokeHitsPoint(s, x, y, radius) {
            if (s.points && s.points.length) {
                if (s.points.length === 1) {
                    return Math.hypot(s.points[0].x - x, s.points[0].y - y) <= radius + (s.width || 3) / 2;
                }
                for (let i = 0; i < s.points.length - 1; i++) {
                    if (wbDistanceToSegment(x, y, s.points[i].x, s.points[i].y, s.points[i + 1].x, s.points[i + 1].y) <= radius + (s.width || 3) / 2) {
                        return true;
                    }
                }
                return false;
            }
            if (s.type === 'line' || s.type === 'arrow') {
                return wbDistanceToSegment(x, y, s.x1, s.y1, s.x2, s.y2) <= radius + (s.width || 3) / 2;
            }
            const b = wbGetStrokeBBox(s);
            return x >= b.minX - radius && x <= b.maxX + radius && y >= b.minY - radius && y <= b.maxY + radius;
        }

        function wbEraseStrokeAt(x, y) {
            const page = wbGetCurrentPage();
            if (!page || !page.strokes.length) return;
            const radius = Math.max(12, wbWidth * 2.5);
            const beforeLen = page.strokes.length;

            page.strokes = page.strokes.filter(s => !wbStrokeHitsPoint(s, x, y, radius));

            if (page.strokes.length !== beforeLen) {
                wbSyncPageControls();
                wbRedrawCanvas();
                wbScheduleSave();
            }
        }

        function wbSegmentCircleCut(p1, p2, cx, cy, r) {
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const fx = p1.x - cx;
            const fy = p1.y - cy;
            const a = dx * dx + dy * dy;
            if (a < 1e-8) {
                const inside = Math.hypot(fx, fy) <= r;
                return inside ? [] : [[p1, p2]];
            }
            const b = 2 * (fx * dx + fy * dy);
            const c = (fx * fx + fy * fy) - r * r;
            const disc = b * b - 4 * a * c;
            if (disc <= 0) {
                return [[p1, p2]];
            }
            const sqrtDisc = Math.sqrt(disc);
            const t1 = (-b - sqrtDisc) / (2 * a);
            const t2 = (-b + sqrtDisc) / (2 * a);

            if (t2 <= 0 || t1 >= 1) {
                return [[p1, p2]];
            }
            if (t1 <= 0 && t2 >= 1) {
                return [];
            }
            const parts = [];
            if (t1 > 0 && t1 < 1) {
                parts.push([p1, { x: p1.x + t1 * dx, y: p1.y + t1 * dy }]);
            }
            if (t2 > 0 && t2 < 1) {
                parts.push([{ x: p1.x + t2 * dx, y: p1.y + t2 * dy }, p2]);
            }
            return parts;
        }

        function wbErasePointAt(x, y) {
            const page = wbGetCurrentPage();
            if (!page || !page.strokes.length) return;
            const radius = Math.max(8, wbWidth * 2.2);
            let modified = false;
            const nextStrokes = [];

            for (const s of page.strokes) {
                const effectiveR = radius + (s.width || 2) * 0.35;
                if (s.points && s.points.length > 0) {
                    if (s.points.length === 1) {
                        if (Math.hypot(s.points[0].x - x, s.points[0].y - y) <= effectiveR) {
                            modified = true;
                        } else {
                            nextStrokes.push(s);
                        }
                        continue;
                    }

                    let strokeModified = false;
                    let currentChain = [];

                    for (let i = 0; i < s.points.length - 1; i++) {
                        const p1 = s.points[i];
                        const p2 = s.points[i + 1];
                        const pieces = wbSegmentCircleCut(p1, p2, x, y, effectiveR);

                        if (pieces.length === 1 && pieces[0][0] === p1 && pieces[0][1] === p2) {
                            if (currentChain.length === 0) currentChain.push({ x: p1.x, y: p1.y });
                            currentChain.push({ x: p2.x, y: p2.y });
                        } else {
                            strokeModified = true;
                            if (pieces.length === 0) {
                                if (currentChain.length >= 2) {
                                    nextStrokes.push({ ...s, points: currentChain });
                                }
                                currentChain = [];
                            } else if (pieces.length === 1) {
                                const [segA, segB] = pieces[0];
                                if (segA === p1) {
                                    if (currentChain.length === 0) currentChain.push({ x: segA.x, y: segA.y });
                                    currentChain.push({ x: segB.x, y: segB.y });
                                    if (currentChain.length >= 2) {
                                        nextStrokes.push({ ...s, points: currentChain });
                                    }
                                    currentChain = [];
                                } else {
                                    if (currentChain.length >= 2) {
                                        nextStrokes.push({ ...s, points: currentChain });
                                    }
                                    currentChain = [{ x: segA.x, y: segA.y }, { x: segB.x, y: segB.y }];
                                }
                            } else if (pieces.length === 2) {
                                const [firstA, firstB] = pieces[0];
                                const [secA, secB] = pieces[1];
                                if (currentChain.length === 0) currentChain.push({ x: firstA.x, y: firstA.y });
                                currentChain.push({ x: firstB.x, y: firstB.y });
                                if (currentChain.length >= 2) {
                                    nextStrokes.push({ ...s, points: currentChain });
                                }
                                currentChain = [{ x: secA.x, y: secA.y }, { x: secB.x, y: secB.y }];
                            }
                        }
                    }

                    if (strokeModified) {
                        modified = true;
                        if (currentChain.length >= 2) {
                            nextStrokes.push({ ...s, points: currentChain });
                        }
                    } else {
                        nextStrokes.push(s);
                    }
                } else if (s.type === 'line' || s.type === 'arrow') {
                    const pieces = wbSegmentCircleCut({ x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 }, x, y, effectiveR);
                    if (pieces.length === 1 && pieces[0][0].x === s.x1 && pieces[0][1].x === s.x2) {
                        nextStrokes.push(s);
                    } else {
                        modified = true;
                        pieces.forEach(([a, b], idx) => {
                            nextStrokes.push({
                                ...s,
                                type: (s.type === 'arrow' && idx === pieces.length - 1) ? 'arrow' : 'line',
                                x1: a.x,
                                y1: a.y,
                                x2: b.x,
                                y2: b.y
                            });
                        });
                    }
                } else {
                    if (wbStrokeHitsPoint(s, x, y, radius * 0.7)) {
                        modified = true;
                    } else {
                        nextStrokes.push(s);
                    }
                }
            }

            if (modified) {
                page.strokes = nextStrokes;
                wbSyncPageControls();
                wbRedrawCanvas();
                wbScheduleSave();
            }
        }

        // ==================== WSKAŹNIK LASEROWY ====================
        function wbStartLaserLoop() {
            if (wbLaserAnimId) return;
            const tick = () => {
                const now = Date.now();
                wbLaserStrokes = wbLaserStrokes.filter(ls => now - ls.createdAt < 1800 && ls.points.length > 0);
                wbRedrawCanvas();
                if (wbLaserStrokes.length > 0) {
                    wbLaserAnimId = requestAnimationFrame(tick);
                } else {
                    wbLaserAnimId = null;
                }
            };
            wbLaserAnimId = requestAnimationFrame(tick);
        }

        function renderLaserStrokes(ctx) {
            if (!wbLaserStrokes.length) return;
            const now = Date.now();
            wbLaserStrokes.forEach(ls => {
                const age = now - ls.createdAt;
                const alpha = Math.max(0, 1 - age / 1800);
                if (alpha <= 0 || ls.points.length === 0) return;

                ctx.save();
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                ctx.strokeStyle = `rgba(239, 68, 68, ${alpha * 0.45})`;
                ctx.lineWidth = 10;
                ctx.beginPath();
                ctx.moveTo(ls.points[0].x, ls.points[0].y);
                for (let i = 1; i < ls.points.length; i++) {
                    ctx.lineTo(ls.points[i].x, ls.points[i].y);
                }
                ctx.stroke();

                ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.95})`;
                ctx.lineWidth = 3;
                ctx.stroke();

                const last = ls.points[ls.points.length - 1];
                ctx.fillStyle = `rgba(239, 68, 68, ${alpha})`;
                ctx.beginPath();
                ctx.arc(last.x, last.y, 6, 0, Math.PI * 2);
                ctx.fill();

                ctx.restore();
            });
        }

        // ==================== ROZPOZNAWANIE ODRĘCZNYCH KSZTAŁTÓW (HOLD-TO-SHAPE) ====================
        function recognizeHandDrawnShape(points) {
            if (!points || points.length < 6) return null;

            const first = points[0];
            const last = points[points.length - 1];
            let pathLen = 0;
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

            for (let i = 0; i < points.length; i++) {
                const p = points[i];
                if (p.x < minX) minX = p.x;
                if (p.x > maxX) maxX = p.x;
                if (p.y < minY) minY = p.y;
                if (p.y > maxY) maxY = p.y;
                if (i > 0) {
                    pathLen += Math.hypot(p.x - points[i - 1].x, p.y - points[i - 1].y);
                }
            }

            const width = maxX - minX;
            const height = maxY - minY;
            const diag = Math.hypot(width, height);
            if (diag < 22 || pathLen < 20) return null;

            const endDist = Math.hypot(last.x - first.x, last.y - first.y);

            if (endDist / pathLen > 0.86) {
                let x1 = first.x, y1 = first.y, x2 = last.x, y2 = last.y;
                if (Math.abs(y2 - y1) < 10) y2 = y1;
                if (Math.abs(x2 - x1) < 10) x2 = x1;
                return { type: 'line', x1, y1, x2, y2 };
            }

            const isClosed = endDist < Math.max(44, diag * 0.30);
            if (!isClosed) return null;

            const cx = (minX + maxX) / 2;
            const cy = (minY + maxY) / 2;
            const rx = width / 2;
            const ry = height / 2;

            if (rx > 10 && ry > 10) {
                let radialErrSum = 0;
                for (const p of points) {
                    const nx = (p.x - cx) / rx;
                    const ny = (p.y - cy) / ry;
                    const r = Math.hypot(nx, ny);
                    radialErrSum += Math.abs(r - 1);
                }
                if (radialErrSum / points.length < 0.14) {
                    const avgR = (rx + ry) / 2;
                    return { type: 'circle', x1: cx - avgR, y1: cy - avgR, x2: cx + avgR, y2: cy + avgR };
                }
            }

            const step = Math.max(2, Math.floor(points.length / 26));
            const sampled = [];
            for (let i = 0; i < points.length; i += step) sampled.push(points[i]);

            let corners = 0;
            for (let i = 1; i < sampled.length - 1; i++) {
                const v1x = sampled[i].x - sampled[i - 1].x;
                const v1y = sampled[i].y - sampled[i - 1].y;
                const v2x = sampled[i + 1].x - sampled[i].x;
                const v2y = sampled[i + 1].y - sampled[i].y;
                const l1 = Math.hypot(v1x, v1y);
                const l2 = Math.hypot(v2x, v2y);
                if (l1 > 5 && l2 > 5) {
                    const cosA = (v1x * v2x + v1y * v2y) / (l1 * l2);
                    const angle = Math.acos(Math.max(-1, Math.min(1, cosA))) * (180 / Math.PI);
                    if (angle > 50) corners++;
                }
            }

            if (corners >= 2 && corners <= 3) {
                return { type: 'triangle', x1: minX, y1: minY, x2: maxX, y2: maxY };
            }
            return { type: 'rect', x1: minX, y1: minY, x2: maxX, y2: maxY };
        }

        function constrainShapeWithShift(stroke, rawX, rawY) {
            if (!stroke) return;
            const clamped = wbClampToPage(rawX, rawY);
            rawX = clamped.x;
            rawY = clamped.y;

            const x1 = stroke.x1;
            const y1 = stroke.y1;
            const dx = rawX - x1;
            const dy = rawY - y1;

            if (!wbShiftPressed) {
                stroke.x2 = rawX;
                stroke.y2 = rawY;
                return;
            }

            if (stroke.type === 'line' || stroke.type === 'arrow') {
                const len = Math.hypot(dx, dy);
                const angle = Math.atan2(dy, dx);
                const snapAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
                const end = wbClampToPage(x1 + len * Math.cos(snapAngle), y1 + len * Math.sin(snapAngle));
                stroke.x2 = end.x;
                stroke.y2 = end.y;
            } else {
                const side = Math.max(Math.abs(dx), Math.abs(dy));
                const end = wbClampToPage(x1 + (dx >= 0 ? side : -side), y1 + (dy >= 0 ? side : -side));
                stroke.x2 = end.x;
                stroke.y2 = end.y;
            }
        }

        // ==================== RENDEROWANIE CIĄGŁEJ KARTKI A4 Z LINIAMI PODZIAŁU STRON PDF ====================
        function wbResizeCanvas() {
            const wrapper = document.getElementById('wb-canvas-wrapper');
            const canvas = document.getElementById('wb-canvas');
            if (!wrapper || !canvas) return;
            const dpr = window.devicePixelRatio || 1;
            const rect = wrapper.getBoundingClientRect();
            canvas.width = Math.max(300, Math.floor(rect.width * dpr));
            canvas.height = Math.max(300, Math.floor(rect.height * dpr));
            const ctx = canvas.getContext('2d');
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        function renderBackgroundToCtx(ctx, w, h, bg) {
            if (bg === 'dark') {
                ctx.fillStyle = '#0f172a';
                ctx.fillRect(0, 0, w, h);
                ctx.strokeStyle = 'rgba(255,255,255,0.06)';
                ctx.lineWidth = 1;
                const step = 28;
                for (let x = 0; x <= w; x += step) {
                    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
                }
                for (let y = 0; y <= h; y += step) {
                    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
                }
                return;
            }

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, w, h);

            if (bg === 'grid') {
                ctx.strokeStyle = '#e2e8f0';
                ctx.lineWidth = 1;
                const step = 26;
                for (let x = 0; x <= w; x += step) {
                    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
                }
                for (let y = 0; y <= h; y += step) {
                    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
                }
            } else if (bg === 'dots') {
                ctx.fillStyle = '#cbd5e1';
                const step = 26;
                for (let x = 26; x < w; x += step) {
                    for (let y = 26; y < h; y += step) {
                        ctx.beginPath();
                        ctx.arc(x, y, 1.4, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            } else if (bg === 'lines') {
                ctx.strokeStyle = '#e2e8f0';
                ctx.lineWidth = 1;
                const step = 32;
                for (let y = 32; y < h; y += step) {
                    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
                }
            }
        }

        function drawArrowHead(ctx, fromX, fromY, toX, toY, size = 12) {
            const angle = Math.atan2(toY - fromY, toX - fromX);
            ctx.beginPath();
            ctx.moveTo(toX, toY);
            ctx.lineTo(toX - size * Math.cos(angle - Math.PI / 6), toY - size * Math.sin(angle - Math.PI / 6));
            ctx.moveTo(toX, toY);
            ctx.lineTo(toX - size * Math.cos(angle + Math.PI / 6), toY - size * Math.sin(angle + Math.PI / 6));
            ctx.stroke();
        }

        function renderStrokeToCtx(ctx, s) {
            ctx.save();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = s.color || '#0f172a';
            ctx.fillStyle = s.color || '#0f172a';
            ctx.lineWidth = s.width || 3;
            ctx.globalAlpha = s.alpha ?? 1;

            if (s.type === 'image' && s.src) {
                let img = wbImageCache.get(s.src);
                if (!img) {
                    img = new Image();
                    img.onload = () => wbRedrawCanvas();
                    img.src = s.src;
                    wbImageCache.set(s.src, img);
                }
                const x = Math.min(s.x1, s.x2);
                const y = Math.min(s.y1, s.y2);
                const w = Math.abs(s.x2 - s.x1);
                const h = Math.abs(s.y2 - s.y1);
                if (img.complete && img.naturalWidth > 0) {
                    ctx.drawImage(img, x, y, w, h);
                } else {
                    ctx.strokeStyle = '#94a3b8';
                    ctx.strokeRect(x, y, w, h);
                }
            } else if (s.type === 'freehand' || s.type === 'highlighter') {
                const pts = s.points || [];
                if (pts.length === 1) {
                    ctx.beginPath();
                    ctx.arc(pts[0].x, pts[0].y, (s.width || 3) / 2, 0, Math.PI * 2);
                    ctx.fill();
                } else if (pts.length > 1) {
                    ctx.beginPath();
                    ctx.moveTo(pts[0].x, pts[0].y);
                    for (let i = 1; i < pts.length - 1; i++) {
                        const midX = (pts[i].x + pts[i + 1].x) / 2;
                        const midY = (pts[i].y + pts[i + 1].y) / 2;
                        ctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
                    }
                    const last = pts[pts.length - 1];
                    ctx.lineTo(last.x, last.y);
                    ctx.stroke();
                }
            } else if (s.type === 'line') {
                ctx.beginPath();
                ctx.moveTo(s.x1, s.y1);
                ctx.lineTo(s.x2, s.y2);
                ctx.stroke();
            } else if (s.type === 'arrow') {
                ctx.beginPath();
                ctx.moveTo(s.x1, s.y1);
                ctx.lineTo(s.x2, s.y2);
                ctx.stroke();
                drawArrowHead(ctx, s.x1, s.y1, s.x2, s.y2, Math.max(10, (s.width || 3) * 3.5));
            } else if (s.type === 'axes') {
                const cx = (s.x1 + s.x2) / 2;
                const cy = (s.y1 + s.y2) / 2;
                const left = Math.min(s.x1, s.x2);
                const right = Math.max(s.x1, s.x2);
                const top = Math.min(s.y1, s.y2);
                const bottom = Math.max(s.y1, s.y2);
                ctx.beginPath(); ctx.moveTo(left, cy); ctx.lineTo(right, cy); ctx.stroke();
                drawArrowHead(ctx, left, cy, right, cy, 10);
                ctx.beginPath(); ctx.moveTo(cx, bottom); ctx.lineTo(cx, top); ctx.stroke();
                drawArrowHead(ctx, cx, bottom, cx, top, 10);
                ctx.font = 'bold 13px Inter, sans-serif';
                ctx.fillText('x', right - 10, cy + 16);
                ctx.fillText('y', cx + 10, top + 12);
            } else if (s.type === 'rect') {
                ctx.strokeRect(s.x1, s.y1, s.x2 - s.x1, s.y2 - s.y1);
            } else if (s.type === 'circle') {
                const cx = (s.x1 + s.x2) / 2;
                const cy = (s.y1 + s.y2) / 2;
                const rx = Math.abs(s.x2 - s.x1) / 2;
                const ry = Math.abs(s.y2 - s.y1) / 2;
                ctx.beginPath();
                ctx.ellipse(cx, cy, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);
                ctx.stroke();
            } else if (s.type === 'triangle') {
                const topX = (s.x1 + s.x2) / 2;
                ctx.beginPath();
                ctx.moveTo(topX, s.y1);
                ctx.lineTo(s.x2, s.y2);
                ctx.lineTo(s.x1, s.y2);
                ctx.closePath();
                ctx.stroke();
            } else if (s.type === 'text') {
                const fontSize = s.fontSize || 18;
                const lineHeight = Math.round(fontSize * 1.32);
                ctx.font = `600 ${fontSize}px Inter, sans-serif`;
                const lines = String(s.text || '').split('\n');
                lines.forEach((ln, idx) => {
                    ctx.fillText(ln, s.x1, s.y1 + idx * lineHeight);
                });
            }

            ctx.restore();
        }

        function wbRedrawCanvas() {
            const canvas = document.getElementById('wb-canvas');
            const page = wbGetCurrentPage();
            if (!canvas || !page) return;

            const dpr = window.devicePixelRatio || 1;
            const viewW = canvas.width / dpr;
            const viewH = canvas.height / dpr;
            const ctx = canvas.getContext('2d');

            const pageCount = wbGetPageCount(page);
            const logicalH = pageCount * WB_PAGE_H;

            // Zewnętrzne tło biurka poza arkuszem wydruku PDF
            ctx.fillStyle = '#e2e8f0';
            ctx.fillRect(0, 0, viewW, viewH);

            ctx.save();
            ctx.translate(wbPanX, wbPanY);
            ctx.scale(wbZoom, wbZoom);

            // Cień ciągłego arkusza A4
            ctx.save();
            ctx.shadowColor = 'rgba(15, 23, 42, 0.16)';
            ctx.shadowBlur = 24;
            ctx.shadowOffsetY = 6;
            ctx.fillStyle = page.bg === 'dark' ? '#0f172a' : '#ffffff';
            ctx.fillRect(0, 0, WB_PAGE_W, logicalH);
            ctx.restore();

            // Przycięcie rysowania ściśle do szerokości wydruku PDF (1400 px) i aktualnej wysokości
            ctx.save();
            ctx.beginPath();
            ctx.rect(0, 0, WB_PAGE_W, logicalH);
            ctx.clip();

            renderBackgroundToCtx(ctx, WB_PAGE_W, logicalH, page.bg || 'grid');

            // Cienkie przerywane linie podziału stron A4 przy wydruku PDF (co 900 px)
            for (let pIdx = 1; pIdx < pageCount; pIdx++) {
                const breakY = pIdx * WB_PAGE_H;
                ctx.save();
                ctx.strokeStyle = page.bg === 'dark' ? 'rgba(148, 163, 184, 0.55)' : 'rgba(100, 116, 139, 0.55)';
                ctx.lineWidth = 1.25 / wbZoom;
                ctx.setLineDash([8 / wbZoom, 6 / wbZoom]);
                ctx.beginPath();
                ctx.moveTo(0, breakY);
                ctx.lineTo(WB_PAGE_W, breakY);
                ctx.stroke();
                ctx.setLineDash([]);

                ctx.font = `600 ${Math.max(10, Math.round(11 / wbZoom))}px Inter, sans-serif`;
                ctx.fillStyle = page.bg === 'dark' ? 'rgba(148, 163, 184, 0.75)' : 'rgba(100, 116, 139, 0.8)';
                ctx.fillText(`Strona ${pIdx + 1} (PDF)`, 14, breakY + Math.max(14, 15 / wbZoom));
                ctx.restore();
            }

            (page.strokes || []).forEach(s => renderStrokeToCtx(ctx, s));
            if (wbActiveStroke) {
                renderStrokeToCtx(ctx, wbActiveStroke);
            }

            if (wbLassoPolygon && wbLassoPolygon.length > 1) {
                ctx.save();
                ctx.strokeStyle = '#9333ea';
                ctx.fillStyle = 'rgba(147, 51, 234, 0.08)';
                ctx.lineWidth = 2 / wbZoom;
                ctx.setLineDash([6 / wbZoom, 4 / wbZoom]);
                ctx.beginPath();
                ctx.moveTo(wbLassoPolygon[0].x, wbLassoPolygon[0].y);
                for (let i = 1; i < wbLassoPolygon.length; i++) {
                    ctx.lineTo(wbLassoPolygon[i].x, wbLassoPolygon[i].y);
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            }

            if (wbSelectedIndices.size > 0) {
                if (wbSelectedIndices.size === 1) {
                    const onlyIdx = Array.from(wbSelectedIndices)[0];
                    const s = page.strokes[onlyIdx];
                    if (s && (s.type === 'line' || s.type === 'arrow')) {
                        ctx.save();
                        ctx.strokeStyle = '#9333ea';
                        ctx.lineWidth = 1.5 / wbZoom;
                        ctx.setLineDash([4 / wbZoom, 3 / wbZoom]);
                        ctx.beginPath();
                        ctx.moveTo(s.x1, s.y1);
                        ctx.lineTo(s.x2, s.y2);
                        ctx.stroke();
                        ctx.setLineDash([]);
                        [ { x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 } ].forEach(pt => {
                            ctx.fillStyle = '#ffffff';
                            ctx.strokeStyle = '#9333ea';
                            ctx.lineWidth = 2 / wbZoom;
                            ctx.beginPath();
                            ctx.arc(pt.x, pt.y, 6 / wbZoom, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.stroke();
                        });
                        ctx.restore();
                    } else {
                        wbDrawSelectionBoxAndHandles(ctx, page);
                    }
                } else {
                    wbDrawSelectionBoxAndHandles(ctx, page);
                }
            }

            renderLaserStrokes(ctx);

            ctx.restore(); // koniec clip()

            // Wyraźna obwódka granicy kartki wydruku PDF
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 1.5 / wbZoom;
            ctx.strokeRect(0, 0, WB_PAGE_W, logicalH);

            ctx.restore();
        }

        function wbDrawSelectionBoxAndHandles(ctx, page) {
            const box = wbGetCombinedSelectionBBox(page);
            if (!box) return;
            ctx.save();
            ctx.strokeStyle = '#9333ea';
            ctx.fillStyle = 'rgba(147, 51, 234, 0.05)';
            ctx.lineWidth = 1.5 / wbZoom;
            ctx.setLineDash([5 / wbZoom, 3 / wbZoom]);
            ctx.fillRect(box.minX, box.minY, box.maxX - box.minX, box.maxY - box.minY);
            ctx.strokeRect(box.minX, box.minY, box.maxX - box.minX, box.maxY - box.minY);
            ctx.setLineDash([]);

            const hs = 5 / wbZoom;
            const handles = wbGetSelectionHandles(box);
            handles.forEach(h => {
                ctx.fillStyle = '#ffffff';
                ctx.strokeStyle = '#9333ea';
                ctx.lineWidth = 2 / wbZoom;
                ctx.fillRect(h.x - hs, h.y - hs, hs * 2, hs * 2);
                ctx.strokeRect(h.x - hs, h.y - hs, hs * 2, hs * 2);
            });
            ctx.restore();
        }

        // ==================== OBSŁUGA ZDARZEŃ RYSOWANIA, TABLETU GRAFICZNEGO I TELEFONU ====================
        function initWhiteboardEvents() {
            const canvas = document.getElementById('wb-canvas');
            const textEditor = document.getElementById('wb-inline-text-editor');
            if (!canvas) return;

            document.addEventListener('pointerdown', (e) => {
                if (!e.target.closest('#wb-dd-eraser-wrap') &&
                    !e.target.closest('#wb-dd-shapes-wrap') &&
                    !e.target.closest('#wb-dd-style-wrap') &&
                    !e.target.closest('#wb-dd-view-wrap')) {
                    wbCloseAllDropdowns();
                }
            });

            if (textEditor) {
                textEditor.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape') {
                        e.preventDefault();
                        wbCommitInlineText();
                    } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                        e.preventDefault();
                        wbCommitInlineText();
                    }
                });
            }

            const getScreenCoords = (e) => {
                const rect = canvas.getBoundingClientRect();
                return {
                    sx: Math.round((e.clientX - rect.left) * 100) / 100,
                    sy: Math.round((e.clientY - rect.top) * 100) / 100
                };
            };

            const getWorldCoordsFromScreen = (sx, sy) => {
                const page = wbGetCurrentPage();
                const maxH = wbGetCanvasLogicalHeight(page);
                const rawX = Math.round(((sx - wbPanX) / wbZoom) * 100) / 100;
                const rawY = Math.round(((sy - wbPanY) / wbZoom) * 100) / 100;
                const clamped = wbClampToPage(rawX, rawY);
                return {
                    sx,
                    sy,
                    rawX,
                    rawY,
                    x: clamped.x,
                    y: clamped.y,
                    insidePage: rawX >= 0 && rawX <= WB_PAGE_W && rawY >= 0 && rawY <= maxH
                };
            };

            const getWorldCoords = (e) => {
                const { sx, sy } = getScreenCoords(e);
                return getWorldCoordsFromScreen(sx, sy);
            };

            // Automatyczne wydłużanie kartki o kolejną stronę A4, gdy piszesz blisko dolnej krawędzi
            const maybeAutoExtendOnBottomEdge = (worldY) => {
                const page = wbGetCurrentPage();
                if (!page) return;
                const maxH = wbGetCanvasLogicalHeight(page);
                if (worldY > maxH - 80) {
                    page.pageCount = wbGetPageCount(page) + 1;
                    wbSyncPageControls();
                }
            };

            const startHoldShapeWatcher = () => {
                clearInterval(wbHoldShapeTimer);
                wbHoldConvertedShape = false;
                wbHoldShapeTimer = setInterval(() => {
                    if (!wbIsDrawing || !wbAutoShape || wbHoldConvertedShape) return;
                    if (!wbActiveStroke || !['freehand', 'highlighter'].includes(wbActiveStroke.type) || !wbActiveStroke.points) return;
                    const idleMs = Date.now() - wbLastMoveTime;
                    if (idleMs >= 420 && wbActiveStroke.points.length >= 6) {
                        const isHighlighter = wbActiveStroke.type === 'highlighter';
                        const recognized = recognizeHandDrawnShape(wbActiveStroke.points);
                        if (recognized) {
                            wbHoldConvertedShape = true;
                            wbActiveStroke = {
                                ...recognized,
                                color: wbActiveStroke.color,
                                width: wbActiveStroke.width,
                                alpha: isHighlighter ? 0.32 : 1
                            };
                            wbRedrawCanvas();
                        } else if (isHighlighter) {
                            const first = wbActiveStroke.points[0];
                            const last = wbActiveStroke.points[wbActiveStroke.points.length - 1];
                            if (Math.hypot(last.x - first.x, last.y - first.y) >= 16) {
                                wbHoldConvertedShape = true;
                                let x1 = first.x, y1 = first.y, x2 = last.x, y2 = last.y;
                                if (Math.abs(y2 - y1) < 12) y2 = y1;
                                if (Math.abs(x2 - x1) < 12) x2 = x1;
                                wbActiveStroke = {
                                    type: 'line',
                                    x1, y1, x2, y2,
                                    color: wbActiveStroke.color,
                                    width: wbActiveStroke.width,
                                    alpha: 0.32
                                };
                                wbRedrawCanvas();
                            }
                        }
                    }
                }, 90);
            };

            canvas.addEventListener('pointerdown', (e) => {
                if (!wbCurrentNotebookId) return;
                wbShiftPressed = e.shiftKey;

                // Śledzenie gestów wielodotykowych na smartfonie (2 palce = przewijanie / pinch-to-zoom)
                if (e.pointerType === 'touch') {
                    wbActiveTouchPointers.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
                    if (wbActiveTouchPointers.size === 2) {
                        // Przerwij ewentualne rozpoczęte pojedynczym palcem kreski i przełącz na płynne przewijanie / zoom
                        clearInterval(wbHoldShapeTimer);
                        wbIsDrawing = false;
                        wbActiveStroke = null;
                        wbActivePointerId = null;
                        const pts = Array.from(wbActiveTouchPointers.values());
                        const rect = canvas.getBoundingClientRect();
                        wbPinchStartDist = Math.max(10, Math.hypot(pts[1].clientX - pts[0].clientX, pts[1].clientY - pts[0].clientY));
                        wbPinchStartZoom = wbZoom;
                        wbPinchStartCenter = {
                            sx: ((pts[0].clientX + pts[1].clientX) / 2) - rect.left,
                            sy: ((pts[0].clientY + pts[1].clientY) / 2) - rect.top
                        };
                        wbPinchStartPan = { x: wbPanX, y: wbPanY };
                        wbRedrawCanvas();
                        return;
                    }
                }

                // Zabezpieczenie przed przeskakiwaniem piórka tabletu graficznego (ignoruj wtórne zdarzenia przy aktywnym rysowaniu)
                if (wbIsDrawing && wbActivePointerId !== null && wbActivePointerId !== e.pointerId) {
                    return;
                }

                if (e.pointerType !== 'touch') {
                    wbUpdateStylusCursor(e.clientX, e.clientY);
                }
                wbUpdateCursorForTool(wbTool);

                const { sx, sy, x, y, insidePage } = getWorldCoords(e);

                if (textEditor && !textEditor.classList.contains('hidden')) {
                    wbCommitInlineText();
                    if (wbTool === 'text' && insidePage) {
                        wbOpenInlineTextAt(x, y);
                    }
                    return;
                }

                // Przesuwanie kartki (Spacja lub środkowy przycisk myszy)
                if (wbSpacePressed || e.button === 1) {
                    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
                    wbIsPanning = true;
                    wbActivePointerId = e.pointerId;
                    wbPanStartScreen = { sx, sy };
                    wbPanStartOffset = { x: wbPanX, y: wbPanY };
                    wbUpdateCursorForTool(wbTool);
                    return;
                }

                if (!insidePage && wbTool !== 'select') {
                    return;
                }

                if (wbTool === 'text') {
                    wbOpenInlineTextAt(x, y);
                    return;
                }

                try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
                wbActivePointerId = e.pointerId;

                if (wbTool === 'select') {
                    const page = wbGetCurrentPage();
                    if (!page) return;

                    const handleHit = wbHitTestHandle(x, y, page);
                    if (handleHit) {
                        wbIsDrawing = true;
                        wbSelectionMode = handleHit.type;
                        wbActiveHandle = handleHit.handle || null;
                        wbDragLastWorld = { x, y };
                        if (handleHit.type === 'resize') {
                            wbResizeOrigBBox = wbGetCombinedSelectionBBox(page);
                            wbResizeOrigStrokes = new Map();
                            wbSelectedIndices.forEach(idx => {
                                wbResizeOrigStrokes.set(idx, JSON.parse(JSON.stringify(page.strokes[idx])));
                            });
                        }
                        return;
                    }

                    const hitIdx = wbFindTopmostStrokeAt(x, y, page);
                    if (hitIdx !== -1) {
                        if (e.shiftKey) {
                            if (wbSelectedIndices.has(hitIdx)) wbSelectedIndices.delete(hitIdx);
                            else wbSelectedIndices.add(hitIdx);
                        } else if (!wbSelectedIndices.has(hitIdx)) {
                            wbSelectedIndices.clear();
                            wbSelectedIndices.add(hitIdx);
                        }
                        wbUpdateDeleteBtnVisibility();
                        wbIsDrawing = true;
                        wbSelectionMode = 'move';
                        wbDragLastWorld = { x, y };
                        wbRedrawCanvas();
                        return;
                    }

                    wbClearSelection();
                    if (insidePage) {
                        wbIsDrawing = true;
                        wbSelectionMode = 'lasso';
                        wbLassoPolygon = [{ x, y }];
                    }
                    wbRedrawCanvas();
                    return;
                }

                wbIsDrawing = true;

                if (wbTool === 'lasso') {
                    const page = wbGetCurrentPage();
                    const handleHit = wbHitTestHandle(x, y, page);
                    if (handleHit) {
                        wbSelectionMode = handleHit.type;
                        wbActiveHandle = handleHit.handle || null;
                        wbDragLastWorld = { x, y };
                        if (handleHit.type === 'resize') {
                            wbResizeOrigBBox = wbGetCombinedSelectionBBox(page);
                            wbResizeOrigStrokes = new Map();
                            wbSelectedIndices.forEach(idx => {
                                wbResizeOrigStrokes.set(idx, JSON.parse(JSON.stringify(page.strokes[idx])));
                            });
                        }
                        return;
                    }
                    wbClearSelection();
                    wbSelectionMode = 'lasso';
                    wbLassoPolygon = [{ x, y }];
                    wbRedrawCanvas();
                    return;
                }

                if (wbTool === 'laser') {
                    const laserObj = { createdAt: Date.now(), points: [{ x, y }] };
                    wbLaserStrokes.push(laserObj);
                    wbActiveStroke = laserObj;
                    wbStartLaserLoop();
                    return;
                }

                // Gumka bocznym przyciskiem rysika (e.buttons === 32) lub narzędziem gumki
                if (wbTool === 'eraser-stroke' || e.buttons === 32) {
                    wbEraseStrokeAt(x, y);
                    return;
                }
                if (wbTool === 'eraser-point') {
                    wbErasePointAt(x, y);
                    return;
                }

                if (wbTool === 'pen' || wbTool === 'highlighter') {
                    maybeAutoExtendOnBottomEdge(y);
                    wbLastMoveTime = Date.now();
                    wbLastMovePoint = { x, y };
                    wbActiveStroke = {
                        type: wbTool === 'highlighter' ? 'highlighter' : 'freehand',
                        color: wbColor,
                        width: wbTool === 'highlighter' ? Math.max(16, wbWidth * 4) : wbWidth,
                        alpha: wbTool === 'highlighter' ? 0.32 : 1,
                        points: [{ x, y }]
                    };
                    if ((wbTool === 'pen' || wbTool === 'highlighter') && wbAutoShape) {
                        startHoldShapeWatcher();
                    }
                } else {
                    maybeAutoExtendOnBottomEdge(y);
                    wbActiveStroke = {
                        type: wbTool,
                        color: wbColor,
                        width: wbWidth,
                        alpha: 1,
                        x1: x,
                        y1: y,
                        x2: x,
                        y2: y
                    };
                }
                wbRedrawCanvas();
            });

            canvas.addEventListener('pointermove', (e) => {
                if (!wbCurrentNotebookId) return;
                wbShiftPressed = e.shiftKey;

                // Obsługa 2 palców na smartfonie (pinch-to-zoom + płynne przewijanie w dół)
                if (e.pointerType === 'touch' && wbActiveTouchPointers.has(e.pointerId)) {
                    wbActiveTouchPointers.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
                    if (wbActiveTouchPointers.size === 2 && wbPinchStartCenter && wbPinchStartPan) {
                        const pts = Array.from(wbActiveTouchPointers.values());
                        const rect = canvas.getBoundingClientRect();
                        const curDist = Math.max(10, Math.hypot(pts[1].clientX - pts[0].clientX, pts[1].clientY - pts[0].clientY));
                        const curCenterX = ((pts[0].clientX + pts[1].clientX) / 2) - rect.left;
                        const curCenterY = ((pts[0].clientY + pts[1].clientY) / 2) - rect.top;

                        const minZoom = Math.min(0.25, wbGetFitZoom() * 0.75);
                        const nextZoom = Math.max(minZoom, Math.min(3.0, wbPinchStartZoom * (curDist / wbPinchStartDist)));
                        const worldAnchorX = (wbPinchStartCenter.sx - wbPinchStartPan.x) / wbPinchStartZoom;
                        const worldAnchorY = (wbPinchStartCenter.sy - wbPinchStartPan.y) / wbPinchStartZoom;

                        wbZoom = nextZoom;
                        wbPanX = curCenterX - worldAnchorX * wbZoom;
                        wbPanY = curCenterY - worldAnchorY * wbZoom;
                        wbClampCamera();
                        wbUpdateZoomIndicator();
                        wbRedrawCanvas();
                        return;
                    }
                }

                if (e.pointerType !== 'touch') {
                    wbUpdateStylusCursor(e.clientX, e.clientY);
                }

                // Ignoruj zdarzenia z innego wskaźnika niż aktywny (zapobiega przeskokom dłoń/piórko)
                if ((wbIsDrawing || wbIsPanning) && wbActivePointerId !== null && wbActivePointerId !== e.pointerId) {
                    return;
                }

                const { sx, sy, x, y } = getWorldCoords(e);

                if (!wbIsDrawing && !wbIsPanning) {
                    if (wbTool === 'select' || wbTool === 'lasso') {
                        const page = wbGetCurrentPage();
                        const hit = wbHitTestHandle(x, y, page);
                        const wrapper = document.getElementById('wb-canvas-wrapper');
                        if (wrapper) {
                            if (hit && hit.type === 'move') wrapper.style.cursor = 'move';
                            else if (hit && (hit.type === 'resize' || hit.type === 'endpoint1' || hit.type === 'endpoint2')) wrapper.style.cursor = 'nwse-resize';
                            else if (wbFindTopmostStrokeAt(x, y, page) !== -1) wrapper.style.cursor = 'pointer';
                            else wrapper.style.cursor = 'default';
                        }
                    } else {
                        wbUpdateCursorForTool(wbTool);
                    }
                }

                if (wbIsPanning && wbPanStartScreen && wbPanStartOffset) {
                    wbPanX = Math.round(wbPanStartOffset.x + (sx - wbPanStartScreen.sx));
                    wbPanY = Math.round(wbPanStartOffset.y + (sy - wbPanStartScreen.sy));
                    wbClampCamera();
                    wbRedrawCanvas();
                    return;
                }

                if (!wbIsDrawing) return;

                if (wbTool === 'select' || wbTool === 'lasso') {
                    const page = wbGetCurrentPage();
                    if (wbSelectionMode === 'move' && wbDragLastWorld) {
                        const dx = x - wbDragLastWorld.x;
                        const dy = y - wbDragLastWorld.y;
                        wbTranslateSelectedStrokes(dx, dy);
                        wbDragLastWorld = { x, y };
                        wbRedrawCanvas();
                    } else if (wbSelectionMode === 'resize') {
                        wbApplyResizeFromHandles(x, y, wbShiftPressed);
                        wbRedrawCanvas();
                    } else if (wbSelectionMode === 'endpoint1' && page && wbSelectedIndices.size === 1) {
                        const idx = Array.from(wbSelectedIndices)[0];
                        const s = page.strokes[idx];
                        if (s) { s.x1 = x; s.y1 = y; wbRedrawCanvas(); }
                    } else if (wbSelectionMode === 'endpoint2' && page && wbSelectedIndices.size === 1) {
                        const idx = Array.from(wbSelectedIndices)[0];
                        const s = page.strokes[idx];
                        if (s) { s.x2 = x; s.y2 = y; wbRedrawCanvas(); }
                    } else if (wbSelectionMode === 'lasso' && wbLassoPolygon) {
                        wbLassoPolygon.push({ x, y });
                        wbRedrawCanvas();
                    }
                    return;
                }

                if (wbTool === 'laser' && wbActiveStroke) {
                    wbActiveStroke.createdAt = Date.now();
                    wbActiveStroke.points.push({ x, y });
                    wbRedrawCanvas();
                    return;
                }

                if (wbTool === 'eraser-stroke' || e.buttons === 32) {
                    wbEraseStrokeAt(x, y);
                    return;
                }
                if (wbTool === 'eraser-point') {
                    wbErasePointAt(x, y);
                    return;
                }

                if (!wbActiveStroke) return;

                if (wbHoldConvertedShape && !wbActiveStroke.points) {
                    constrainShapeWithShift(wbActiveStroke, x, y);
                    wbRedrawCanvas();
                    return;
                }

                // Wykorzystaj coalescedEvents z tabletu graficznego (gdy dostępne), aby krzywe były idealnie gładkie bez skoków
                const eventsList = (typeof e.getCoalescedEvents === 'function') ? e.getCoalescedEvents() : [e];
                const rect = canvas.getBoundingClientRect();

                if (wbActiveStroke.points) {
                    for (const ev of eventsList) {
                        const csx = Math.round((ev.clientX - rect.left) * 100) / 100;
                        const csy = Math.round((ev.clientY - rect.top) * 100) / 100;
                        const pt = getWorldCoordsFromScreen(csx, csy);
                        const lastPt = wbActiveStroke.points[wbActiveStroke.points.length - 1];
                        const stepDist = lastPt ? Math.hypot(pt.x - lastPt.x, pt.y - lastPt.y) : 999;

                        // Odfiltruj mikrodrgania (0.4 px) oraz nagłe nienaturalne skoki artefaktowe (> 220 px w 1 próbce)
                        if (stepDist >= 0.4 && stepDist < 220) {
                            maybeAutoExtendOnBottomEdge(pt.y);
                            wbActiveStroke.points.push({ x: pt.x, y: pt.y });
                            if (!wbLastMovePoint || Math.hypot(pt.x - wbLastMovePoint.x, pt.y - wbLastMovePoint.y) > 2.2) {
                                wbLastMoveTime = Date.now();
                                wbLastMovePoint = { x: pt.x, y: pt.y };
                            }
                        }
                    }
                } else {
                    maybeAutoExtendOnBottomEdge(y);
                    constrainShapeWithShift(wbActiveStroke, x, y);
                }
                wbRedrawCanvas();
            });

            canvas.addEventListener('pointerleave', () => {
                const cursorEl = document.getElementById('wb-stylus-cursor');
                if (cursorEl) cursorEl.classList.add('hidden');
            });

            const finishStroke = (e) => {
                if (e && e.pointerType === 'touch') {
                    wbActiveTouchPointers.delete(e.pointerId);
                    if (wbActiveTouchPointers.size < 2) {
                        wbPinchStartCenter = null;
                        wbPinchStartPan = null;
                    }
                }

                if (e && wbActivePointerId !== null && wbActivePointerId !== e.pointerId) {
                    return;
                }
                wbActivePointerId = null;

                clearInterval(wbHoldShapeTimer);

                if (wbIsPanning) {
                    wbIsPanning = false;
                    wbPanStartScreen = null;
                    wbPanStartOffset = null;
                    wbUpdateCursorForTool(wbTool);
                    return;
                }

                if (!wbIsDrawing) return;
                wbIsDrawing = false;

                if (wbTool === 'select' || wbTool === 'lasso') {
                    if (wbSelectionMode === 'move' || wbSelectionMode === 'resize' || wbSelectionMode === 'endpoint1' || wbSelectionMode === 'endpoint2') {
                        wbScheduleSave();
                    } else if (wbSelectionMode === 'lasso' && wbLassoPolygon) {
                        wbFinalizeLassoSelection();
                    }
                    wbSelectionMode = null;
                    wbActiveHandle = null;
                    wbResizeOrigBBox = null;
                    wbResizeOrigStrokes = null;
                    wbRedrawCanvas();
                    return;
                }

                if (wbTool === 'laser') {
                    wbActiveStroke = null;
                    return;
                }

                if (!wbActiveStroke) return;

                const page = wbGetCurrentPage();
                if (page) {
                    let finalStroke = wbActiveStroke;
                    if (!finalStroke.points) {
                        const dist = Math.hypot((finalStroke.x2 ?? finalStroke.x1) - finalStroke.x1, (finalStroke.y2 ?? finalStroke.y1) - finalStroke.y1);
                        if (dist < 4) {
                            wbActiveStroke = null;
                            wbHoldConvertedShape = false;
                            wbRedrawCanvas();
                            return;
                        }
                    }

                    page.strokes.push(finalStroke);
                    wbRedoStack = [];
                    wbSyncPageControls();
                    wbScheduleSave();
                }
                wbActiveStroke = null;
                wbHoldConvertedShape = false;
                wbRedrawCanvas();
            };

            canvas.addEventListener('pointerup', finishStroke);
            canvas.addEventListener('pointercancel', finishStroke);

            // Ctrl + Scroll = Przybliżanie / Oddalanie; zwykły scroll = płynne przewijanie ciągłej kartki w dół/górę
            canvas.addEventListener('wheel', (e) => {
                if (!wbCurrentNotebookId) return;
                e.preventDefault();
                const { sx, sy } = getScreenCoords(e);

                if (e.ctrlKey || e.metaKey) {
                    const zoomDelta = e.deltaY < 0 ? 0.12 : -0.12;
                    wbChangeZoom(zoomDelta, sx, sy);
                    return;
                }

                wbPanX = Math.round(wbPanX - e.deltaX);
                wbPanY = Math.round(wbPanY - e.deltaY);
                wbClampCamera();
                wbRedrawCanvas();
            }, { passive: false });

            // Wklejanie zrzutów ekranu i obrazów skrótem Ctrl+V
            window.addEventListener('paste', (e) => {
                if (!wbCurrentNotebookId) return;
                const editor = document.getElementById('wb-inline-text-editor');
                if (editor && !editor.classList.contains('hidden')) return;

                const items = e.clipboardData?.items;
                if (!items) return;
                for (const item of items) {
                    if (item.type.startsWith('image/')) {
                        e.preventDefault();
                        const blob = item.getAsFile();
                        if (blob) wbInsertImageBlob(blob);
                        return;
                    }
                }
            });

            window.addEventListener('resize', () => {
                if (wbCurrentNotebookId) {
                    wbResizeCanvas();
                    wbClampCamera();
                    wbRedrawCanvas();
                }
            });

            window.addEventListener('keydown', (e) => {
                if (!wbCurrentNotebookId) return;
                wbShiftPressed = e.shiftKey;

                const editor = document.getElementById('wb-inline-text-editor');
                if (editor && !editor.classList.contains('hidden')) return;

                if (e.key === 'F11') {
                    e.preventDefault();
                    wbToggleFullscreen();
                    return;
                }

                if (e.code === 'Space' && !wbSpacePressed) {
                    e.preventDefault();
                    wbSpacePressed = true;
                    wbUpdateCursorForTool(wbTool);
                    return;
                }

                const ctrlOrMeta = e.ctrlKey || e.metaKey;
                const key = e.key.toLowerCase();

                if ((e.key === 'Delete' || e.key === 'Backspace') && wbSelectedIndices.size > 0) {
                    e.preventDefault();
                    wbDeleteLassoSelection();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    wbCloseAllDropdowns();
                    if (wbSelectedIndices.size > 0) {
                        wbClearSelection();
                        wbRedrawCanvas();
                    }
                } else if (ctrlOrMeta && (e.key === '=' || e.key === '+')) {
                    e.preventDefault();
                    wbChangeZoom(0.15);
                } else if (ctrlOrMeta && e.key === '-') {
                    e.preventDefault();
                    wbChangeZoom(-0.15);
                } else if (ctrlOrMeta && e.key === '0') {
                    e.preventDefault();
                    wbResetView();
                } else if (ctrlOrMeta && key === 'z') {
                    e.preventDefault();
                    if (e.shiftKey) wbRedo();
                    else wbUndo();
                } else if (ctrlOrMeta && key === 'y') {
                    e.preventDefault();
                    wbRedo();
                } else if (ctrlOrMeta && key === 'a') {
                    e.preventDefault();
                    const page = wbGetCurrentPage();
                    if (page && page.strokes.length > 0) {
                        wbSetTool('select');
                        wbSelectedIndices.clear();
                        page.strokes.forEach((_, idx) => wbSelectedIndices.add(idx));
                        wbUpdateDeleteBtnVisibility();
                        wbRedrawCanvas();
                    }
                } else if (ctrlOrMeta && key === 'd' && wbSelectedIndices.size > 0) {
                    e.preventDefault();
                    const page = wbGetCurrentPage();
                    if (page) {
                        const maxH = wbGetCanvasLogicalHeight(page);
                        const newSet = new Set();
                        wbSelectedIndices.forEach(idx => {
                            const orig = page.strokes[idx];
                            if (!orig) return;
                            const copy = JSON.parse(JSON.stringify(orig));
                            if (copy.points) copy.points.forEach(p => { p.x = Math.min(WB_PAGE_W - 10, p.x + 24); p.y = Math.min(maxH - 10, p.y + 24); });
                            if (copy.x1 !== undefined) copy.x1 = Math.min(WB_PAGE_W - 10, copy.x1 + 24);
                            if (copy.y1 !== undefined) copy.y1 = Math.min(maxH - 10, copy.y1 + 24);
                            if (copy.x2 !== undefined) copy.x2 = Math.min(WB_PAGE_W - 10, copy.x2 + 24);
                            if (copy.y2 !== undefined) copy.y2 = Math.min(maxH - 10, copy.y2 + 24);
                            page.strokes.push(copy);
                            newSet.add(page.strokes.length - 1);
                        });
                        wbSelectedIndices = newSet;
                        wbUpdateDeleteBtnVisibility();
                        wbSyncPageControls();
                        wbRedrawCanvas();
                        wbScheduleSave();
                        showToast('Zduplikowano zaznaczone elementy.', 'info');
                    }
                }
            });

            window.addEventListener('keyup', (e) => {
                wbShiftPressed = e.shiftKey;
                if (e.code === 'Space') {
                    wbSpacePressed = false;
                    wbUpdateCursorForTool(wbTool);
                }
            });
        }

        // ==================== EKSPORT DO PDF (AUTOMATYCZNY PODZIAŁ CIĄGŁEJ KARTKI NA STRONY A4) ====================
        function exportCurrentBoardPDF() {
            if (!wbCurrentNotebookId) return;
            const nb = state.whiteboards[wbCurrentNotebookId];
            const sec = wbGetCurrentSection();
            if (!nb || !sec) return;
            exportSectionsToPDF(nb.studentName, [sec], `${nb.studentName}_${sec.title}`);
        }

        function exportStudentNotebookPDF(studentId) {
            const nb = getOrCreateStudentNotebook(studentId);
            if (!nb || !nb.sections.length) return;
            exportSectionsToPDF(nb.studentName, nb.sections, `Notatnik_${nb.studentName}`);
        }

        function exportSectionsToPDF(studentName, sections, fileNameBase) {
            if (!window.jspdf || !window.jspdf.jsPDF) {
                showToast('Biblioteka PDF jeszcze się ładuje, spróbuj za chwilę.', 'error');
                return;
            }

            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
            const pageW = pdf.internal.pageSize.getWidth();
            const pageH = pdf.internal.pageSize.getHeight();

            const headerH = 44;
            const offCanvas = document.createElement('canvas');
            offCanvas.width = WB_PAGE_W;
            offCanvas.height = WB_PAGE_H + headerH;
            const ctx = offCanvas.getContext('2d');

            let isFirstPdfPage = true;

            sections.forEach(sec => {
                normalizeSectionToContinuousPage(sec);
                const continuousPage = sec.pages[0];
                const totalSlices = wbGetPageCount(continuousPage);

                for (let idx = 0; idx < totalSlices; idx++) {
                    if (!isFirstPdfPage) pdf.addPage();
                    isFirstPdfPage = false;

                    const offsetY = idx * WB_PAGE_H;

                    // Dedykowany pasek nagłówka NAD obszarem kartki, aby nie zasłaniał żadnej notatki
                    ctx.save();
                    ctx.fillStyle = '#18181b';
                    ctx.fillRect(0, 0, WB_PAGE_W, headerH);
                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 16px Inter, sans-serif';
                    ctx.fillText(`MathFlow • ${studentName} — ${sec.title}`, 18, 28);
                    ctx.font = '500 13px Inter, sans-serif';
                    ctx.fillStyle = '#d4d4d8';
                    ctx.fillText(`Strona ${idx + 1} / ${totalSlices}`, WB_PAGE_W - 125, 28);
                    ctx.restore();

                    // Obszar notatek przesunięty poniżej nagłówka (y = headerH)
                    ctx.save();
                    ctx.translate(0, headerH);
                    ctx.beginPath();
                    ctx.rect(0, 0, WB_PAGE_W, WB_PAGE_H);
                    ctx.clip();

                    renderBackgroundToCtx(ctx, WB_PAGE_W, WB_PAGE_H, continuousPage.bg || 'grid');

                    ctx.save();
                    ctx.translate(0, -offsetY);
                    (continuousPage.strokes || []).forEach(s => renderStrokeToCtx(ctx, s));
                    ctx.restore();

                    ctx.restore();

                    const imgData = offCanvas.toDataURL('image/jpeg', 0.94);
                    const margin = 4;
                    const availW = pageW - margin * 2;
                    const availH = pageH - margin * 2;
                    const aspect = offCanvas.width / offCanvas.height;
                    let drawW = availW;
                    let drawH = drawW / aspect;
                    if (drawH > availH) {
                        drawH = availH;
                        drawW = drawH * aspect;
                    }
                    const drawX = (pageW - drawW) / 2;
                    const drawY = (pageH - drawH) / 2;
                    pdf.addImage(imgData, 'JPEG', drawX, drawY, drawW, drawH);
                }
            });

            const safeName = (fileNameBase || 'Notatnik_MathFlow')
                .replace(/[^a-zA-Z0-9ąćęłńóśźżĄĆĘŁŃÓŚŹŻ _-]/g, '')
                .replace(/\s+/g, '_');
            pdf.save(`${safeName}.pdf`);
            showToast('Wygenerowano i pobrano notatki w formacie PDF!');
        }

        // Natychmiastowa synchronizacja między oknem głównym a osobnym oknem tablicy (localStorage event)
        window.addEventListener('storage', (e) => {
            if (e.key === STORAGE_KEY && e.newValue) {
                try {
                    const parsed = JSON.parse(e.newValue);
                    isSyncingFromCloud = true;
                    state = {
                        ...defaultState,
                        ...parsed,
                        settings: { ...defaultState.settings, ...(parsed.settings || {}) }
                    };
                    isSyncingFromCloud = false;
                    if (wbCurrentNotebookId) {
                        wbPopulateSectionDropdown();
                        wbSyncPageControls();
                        wbRedrawCanvas();
                    } else {
                        renderCurrentView();
                    }
                } catch (err) {
                    isSyncingFromCloud = false;
                }
            }
        });

        // Start aplikacji po załadowaniu DOM
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                initWhiteboardEvents();
                initAuthAndApp();
            });
        } else {
            initWhiteboardEvents();
            initAuthAndApp();
        }