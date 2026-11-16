// ============================================================================
// MODUŁ ZESTAWIEŃ DO ZAPŁATY I RACHUNKÓW NDG (2026) – MathFlow
// Obsługuje:
// 1. Dwukolumnowy widok: lewa kolumna ustawień + prawa kolumna podglądu A4 na żywo
// 2. Zestawienie lekcji do zapłaty oraz formalny Rachunek NDG (zwolniony z VAT)
// 3. Płatności mieszane (FIFO): przedpłaty, dopłaty późniejsze, BLIK, Gotówka, Przelew
// ============================================================================

(function initBillingDocumentsModule() {
    function getAppState() {
        if (typeof state !== 'undefined' && state) return state;
        if (window.state) return window.state;
        return null;
    }

    function persistAppState() {
        if (typeof saveState === 'function') {
            saveState();
        } else if (typeof window.saveState === 'function') {
            window.saveState();
        }
    }

    function notifyUser(msg, type = 'info') {
        if (typeof showToast === 'function') {
            showToast(msg, type);
        } else if (typeof window.showToast === 'function') {
            window.showToast(msg, type);
        } else {
            alert(msg);
        }
    }

    function plAscii(text) {
        if (!text) return '';
        const map = {
            'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n', 'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
            'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N', 'Ó': 'O', 'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z',
            '–': '-', '—': '-', '„': '"', '”': '"', '•': '-'
        };
        return String(text).replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ–—„”•]/g, ch => map[ch] || ch);
    }

    function fmtMoney(val) {
        return Number(val || 0).toFixed(2).replace('.', ',') + ' zł';
    }

    function ensureInvoicesState() {
        const s = getAppState();
        if (!s) return null;
        if (!Array.isArray(s.invoices)) s.invoices = [];
        if (!s.settings) s.settings = {};
        if (typeof s.settings.sellerAddress !== 'string') s.settings.sellerAddress = '';
        if (typeof s.settings.vatExemption !== 'string') s.settings.vatExemption = 'art113';
        return s;
    }

    // ============================================================================
    // SILNIK ALOKACJI WPŁAT MIESZANYCH (FIFO: Przedpłaty, BLIK, Gotówka, Przelew)
    // ============================================================================
    function computeMixedPaymentAllocation(studentId) {
        const s = getAppState();
        if (!s) return { byLessonId: {}, unallocatedCredit: 0, allPayments: [] };

        const studentLessons = (s.lessons || [])
            .filter(l => {
                if (l.status === 'cancelled') return false;
                if (l.targetType === 'group') {
                    const grp = (s.groups || []).find(g => g.id === l.groupId);
                    return grp && Array.isArray(grp.studentIds) && grp.studentIds.includes(studentId);
                }
                return l.studentId === studentId;
            })
            .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

        const studentPayments = (s.payments || [])
            .filter(p => p.studentId === studentId)
            .map(p => ({
                id: p.id,
                date: p.date || '',
                method: p.method || 'Przelew',
                note: p.note || '',
                amount: Number(p.amount || 0),
                remaining: Number(p.amount || 0)
            }))
            .sort((a, b) => a.date.localeCompare(b.date));

        const byLessonId = {};

        const orderedForFifo = [
            ...studentLessons.filter(l => l.status === 'completed'),
            ...studentLessons.filter(l => l.status !== 'completed')
        ];

        orderedForFifo.forEach(lesson => {
            const price = Number(lesson.pricePerStudent || 0);
            let needed = price;
            const slices = [];

            for (const pay of studentPayments) {
                if (needed <= 0.009) break;
                if (pay.remaining <= 0.009) continue;

                const used = Math.min(needed, pay.remaining);
                pay.remaining = Math.round((pay.remaining - used) * 100) / 100;
                needed = Math.round((needed - used) * 100) / 100;

                const isPrepaid = pay.date && lesson.date && pay.date <= lesson.date;
                slices.push({
                    paymentId: pay.id,
                    date: pay.date,
                    method: pay.method,
                    amount: used,
                    isPrepaid
                });
            }

            const paidAmount = Math.round((price - needed) * 100) / 100;
            const unpaidAmount = Math.max(0, Math.round(needed * 100) / 100);

            byLessonId[lesson.id] = {
                price,
                paidAmount,
                unpaidAmount,
                slices,
                isFullyPaid: unpaidAmount <= 0.009,
                isPartiallyPaid: paidAmount > 0.009 && unpaidAmount > 0.009
            };
        });

        const unallocatedCredit = studentPayments.reduce((acc, p) => acc + p.remaining, 0);
        return { byLessonId, unallocatedCredit, allPayments: studentPayments };
    }

    // ============================================================================
    // INTEGRACJA Z ZAKŁADKĄ WPŁATY I ROZLICZENIA ORAZ USTAWIENIAMI
    // ============================================================================
    const origSwitchBillingSubtab = window.switchBillingSubtab;
    window.switchBillingSubtab = function (subtab) {
        ensureInvoicesState();
        const balView = document.getElementById('billing-balances-view');
        const payView = document.getElementById('billing-payments-view');
        const invView = document.getElementById('billing-invoices-view');
        const filterBar = document.getElementById('billing-filter-bar');

        const btnBal = document.getElementById('bill-sub-balances');
        const btnPay = document.getElementById('bill-sub-payments');
        const btnInv = document.getElementById('bill-sub-invoices');

        if (!invView || !btnInv) {
            if (typeof origSwitchBillingSubtab === 'function') origSwitchBillingSubtab(subtab);
            return;
        }

        [balView, payView, invView].forEach(v => v && v.classList.add('hidden'));
        [btnBal, btnPay, btnInv].forEach(b => {
            if (b) {
                b.classList.remove('bg-white', 'text-slate-900', 'shadow-2xs');
                b.classList.add('text-slate-600');
            }
        });

        if (subtab === 'invoices') {
            invView.classList.remove('hidden');
            if (filterBar) filterBar.classList.add('hidden');
            btnInv.classList.add('bg-white', 'text-slate-900', 'shadow-2xs');
            btnInv.classList.remove('text-slate-600');
            renderInvoicesTable();
        } else {
            if (filterBar) filterBar.classList.remove('hidden');
            if (typeof origSwitchBillingSubtab === 'function') {
                origSwitchBillingSubtab(subtab);
            }
        }
    };

    const origRenderBilling = window.renderBilling;
    window.renderBilling = function () {
        ensureInvoicesState();
        if (typeof origRenderBilling === 'function') origRenderBilling();
        renderInvoicesTable();
    };

    const origRenderSettings = window.renderSettings;
    window.renderSettings = function () {
        const s = ensureInvoicesState();
        if (typeof origRenderSettings === 'function') origRenderSettings();
        if (!s) return;
        const addrEl = document.getElementById('set-seller-address');
        const vatEl = document.getElementById('set-vat-exemption');
        if (addrEl) addrEl.value = s.settings.sellerAddress || '';
        if (vatEl) vatEl.value = s.settings.vatExemption || 'art113';
    };

    const origSaveSettings = window.saveSettings;
    window.saveSettings = function (e) {
        const s = ensureInvoicesState();
        if (s) {
            const addrEl = document.getElementById('set-seller-address');
            const vatEl = document.getElementById('set-vat-exemption');
            if (addrEl) s.settings.sellerAddress = addrEl.value.trim();
            if (vatEl) s.settings.vatExemption = vatEl.value;
        }
        if (typeof origSaveSettings === 'function') origSaveSettings(e);
    };

    function generateNextDocNumber(docType, issueDateStr) {
        const s = ensureInvoicesState();
        const [year, month] = (issueDateStr || new Date().toISOString().slice(0, 10)).split('-');
        const code = docType === 'statement' ? 'ZEST' : 'RACH';
        const prefix = `${code}/${year}/${month}/`;
        let maxSeq = 0;
        (s?.invoices || []).forEach(inv => {
            if (inv.number && inv.number.startsWith(prefix)) {
                const seq = parseInt(inv.number.slice(prefix.length), 10);
                if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
            }
        });
        return `${prefix}${String(maxSeq + 1).padStart(3, '0')}`;
    }

    // ============================================================================
    // OTWARCIE KREATORA DWUKOLUMNOWEGO I OBSŁUGA FORMULARZA
    // ============================================================================
    window.openInvoiceModal = function (preselectedStudentId = null, docType = 'statement') {
        const s = ensureInvoicesState();
        if (!s) {
            notifyUser('Błąd inicjalizacji danych aplikacji.', 'error');
            return;
        }

        if (!s.students || s.students.length === 0) {
            notifyUser('Najpierw dodaj ucznia w zakładce Uczniowie.', 'error');
            return;
        }

        const stuSelect = document.getElementById('inv-student-id');
        const monthInput = document.getElementById('inv-month');
        const issueDateInput = document.getElementById('inv-issue-date');
        const includePlannedChk = document.getElementById('inv-include-planned');
        const paymentModeSelect = document.getElementById('inv-payment-mode');
        const customNoteInput = document.getElementById('inv-custom-note');

        if (!stuSelect) return;

        stuSelect.innerHTML = s.students
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name, 'pl'))
            .map(st => `<option value="${st.id}">${st.name}${st.parentName ? ' (rodzic: ' + st.parentName + ')' : ''}</option>`)
            .join('');

        if (preselectedStudentId && s.students.some(st => st.id === preselectedStudentId)) {
            stuSelect.value = preselectedStudentId;
        }

        const today = new Date().toISOString().slice(0, 10);
        if (issueDateInput) issueDateInput.value = today;
        if (monthInput) monthInput.value = today.slice(0, 7);
        if (includePlannedChk) includePlannedChk.checked = false;
        if (paymentModeSelect) paymentModeSelect.value = 'auto';
        if (customNoteInput) customNoteInput.value = '';

        setInvoiceDocType(docType || 'statement', false);
        onInvoiceConfigChange(true);

        const modal = document.getElementById('modal-invoice');
        if (modal) modal.classList.remove('hidden');
    };

    window.setInvoiceDocType = function (docType, shouldRenderPreview = true) {
        const hiddenInput = document.getElementById('inv-doc-type');
        const btnStatement = document.getElementById('inv-mode-statement');
        const btnInvoice = document.getElementById('inv-mode-invoice');
        const previewBadge = document.getElementById('inv-preview-badge');

        if (hiddenInput) hiddenInput.value = docType;

        if (btnStatement && btnInvoice) {
            if (docType === 'statement') {
                btnStatement.classList.add('bg-white', 'text-slate-900', 'shadow-2xs');
                btnStatement.classList.remove('text-slate-600');
                btnInvoice.classList.remove('bg-white', 'text-slate-900', 'shadow-2xs');
                btnInvoice.classList.add('text-slate-600');
                if (previewBadge) previewBadge.textContent = 'Zestawienie rozliczeniowe / do zapłaty';
            } else {
                btnInvoice.classList.add('bg-white', 'text-slate-900', 'shadow-2xs');
                btnInvoice.classList.remove('text-slate-600');
                btnStatement.classList.remove('bg-white', 'text-slate-900', 'shadow-2xs');
                btnStatement.classList.add('text-slate-600');
                if (previewBadge) previewBadge.textContent = 'Rachunek NDG 2026 (zwolniony z VAT)';
            }
        }

        if (shouldRenderPreview) renderInvoiceLivePreview();
    };

    window.toggleAllInvoiceLessons = function () {
        const boxes = Array.from(document.querySelectorAll('#inv-lessons-list input[type="checkbox"]'));
        if (boxes.length === 0) return;
        const anyUnchecked = boxes.some(b => !b.checked);
        boxes.forEach(b => { b.checked = anyUnchecked; });
        renderInvoiceLivePreview();
    };

    window.onInvoiceConfigChange = function (resetBuyer = false) {
        const s = ensureInvoicesState();
        if (!s) return;

        const studentId = document.getElementById('inv-student-id')?.value;
        const monthVal = document.getElementById('inv-month')?.value;
        const includePlanned = document.getElementById('inv-include-planned')?.checked;
        const buyerNameInput = document.getElementById('inv-buyer-name');
        const listContainer = document.getElementById('inv-lessons-list');

        const student = s.students.find(st => st.id === studentId);
        if (!student || !listContainer) return;

        if (resetBuyer && buyerNameInput) {
            buyerNameInput.value = student.parentName
                ? `${student.parentName} (dot. ucznia: ${student.name})`
                : student.name;
        }

        const allocation = computeMixedPaymentAllocation(student.id);

        const matchingLessons = (s.lessons || [])
            .filter(l => {
                if (l.status === 'cancelled') return false;
                const isForStudent = (l.targetType === 'group')
                    ? ((s.groups || []).find(g => g.id === l.groupId)?.studentIds || []).includes(student.id)
                    : l.studentId === student.id;
                if (!isForStudent) return false;
                if (!includePlanned && l.status !== 'completed') return false;
                if (monthVal && !l.date.startsWith(monthVal)) return false;
                return true;
            })
            .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

        if (matchingLessons.length === 0) {
            listContainer.innerHTML = `
                <div class="p-4 text-center text-xs text-slate-500">
                    Brak lekcji w wybranym miesiącu. Kliknij <strong>„Wszystkie”</strong> obok miesiąca lub zaznacz <strong>„+ Zaplanowane”</strong>.
                </div>`;
            renderInvoiceLivePreview();
            return;
        }

        listContainer.innerHTML = matchingLessons.map(l => {
            const alloc = allocation.byLessonId[l.id] || { price: Number(l.pricePerStudent || 0), paidAmount: 0, unpaidAmount: Number(l.pricePerStudent || 0), slices: [] };
            let statusHtml = '';
            if (alloc.isFullyPaid) {
                const methods = alloc.slices.map(sl => `${sl.isPrepaid ? 'Przedpłata' : 'Wpłata'} ${sl.method} (${sl.date})`).join(' + ');
                statusHtml = `<span class="text-[10px] text-emerald-700 font-semibold">${methods}</span>`;
            } else if (alloc.isPartiallyPaid) {
                const methods = alloc.slices.map(sl => `${sl.method}: ${fmtMoney(sl.amount)}`).join(', ');
                statusHtml = `<span class="text-[10px] text-amber-700 font-semibold">Częściowo (${methods}) • Dopłata: ${fmtMoney(alloc.unpaidAmount)}</span>`;
            } else {
                statusHtml = `<span class="text-[10px] text-rose-600 font-semibold">Do zapłaty: ${fmtMoney(alloc.unpaidAmount)}</span>`;
            }

            const typeBadge = l.status === 'completed'
                ? '<span class="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[9px] font-bold">Odbyta</span>'
                : '<span class="px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 text-[9px] font-bold">Zaplanowana</span>';

            return `
                <label class="flex items-start justify-between gap-2 p-2.5 hover:bg-white cursor-pointer transition-colors">
                    <div class="flex items-start gap-2 min-w-0">
                        <input type="checkbox" checked data-inv-lesson-id="${l.id}" onchange="renderInvoiceLivePreview()" class="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500">
                        <div class="min-w-0">
                            <div class="text-[11px] font-bold text-slate-800 flex flex-wrap items-center gap-1">
                                <span>${l.date} • ${l.time} (${l.duration} min)</span>
                                ${typeBadge}
                            </div>
                            <div class="text-[10px] text-slate-500 truncate">${l.topic || 'Korepetycje z matematyki'}</div>
                            <div>${statusHtml}</div>
                        </div>
                    </div>
                    <span class="text-xs font-extrabold text-slate-900 shrink-0">${fmtMoney(alloc.price)}</span>
                </label>
            `;
        }).join('');

        renderInvoiceLivePreview();
    };

    function buildDocumentDraftFromForm() {
        const s = ensureInvoicesState();
        if (!s) return null;

        const docType = document.getElementById('inv-doc-type')?.value || 'statement';
        const studentId = document.getElementById('inv-student-id')?.value;
        const buyerName = document.getElementById('inv-buyer-name')?.value.trim() || 'Nabywca';
        const buyerAddress = document.getElementById('inv-buyer-address')?.value.trim() || '';
        const issueDate = document.getElementById('inv-issue-date')?.value || new Date().toISOString().slice(0, 10);
        const paymentMode = document.getElementById('inv-payment-mode')?.value || 'auto';
        const customNote = document.getElementById('inv-custom-note')?.value.trim() || '';

        const student = s.students.find(st => st.id === studentId);
        const allocation = computeMixedPaymentAllocation(studentId);
        const checkedIds = Array.from(document.querySelectorAll('#inv-lessons-list input[type="checkbox"]:checked'))
            .map(cb => cb.getAttribute('data-inv-lesson-id'));

        const items = checkedIds.map(lessonId => {
            const lesson = s.lessons.find(l => l.id === lessonId);
            const price = Number(lesson?.pricePerStudent || 0);
            const alloc = allocation.byLessonId[lessonId] || { price, paidAmount: 0, unpaidAmount: price, slices: [] };

            let paidAmount = alloc.paidAmount;
            let unpaidAmount = alloc.unpaidAmount;
            let paymentDesc = '';

            if (paymentMode === 'auto') {
                if (alloc.slices.length > 0) {
                    paymentDesc = alloc.slices.map(sl =>
                        `${sl.isPrepaid ? 'Przedpłata' : 'Wpłata'} ${sl.method} ${fmtMoney(sl.amount)} (${sl.date})`
                    ).join('; ');
                }
                if (unpaidAmount > 0.009) {
                    paymentDesc += (paymentDesc ? ' | ' : '') + `Do zapłaty: ${fmtMoney(unpaidAmount)}`;
                }
            } else if (paymentMode.startsWith('Zapłacono')) {
                paidAmount = price;
                unpaidAmount = 0;
                paymentDesc = paymentMode;
            } else {
                paidAmount = 0;
                unpaidAmount = price;
                paymentDesc = 'Do zapłaty (termin 7 dni)';
            }

            return {
                lessonId,
                date: lesson?.date || issueDate,
                time: lesson?.time || '16:00',
                duration: lesson?.duration || 60,
                topic: lesson?.topic || 'Korepetycje z matematyki',
                status: lesson?.status || 'completed',
                price,
                paidAmount,
                unpaidAmount,
                slices: paymentMode === 'auto' ? alloc.slices : [],
                paymentDesc
            };
        });

        const totalGross = items.reduce((acc, it) => acc + it.price, 0);
        const totalPaid = items.reduce((acc, it) => acc + it.paidAmount, 0);
        const totalDue = Math.max(0, Math.round((totalGross - totalPaid) * 100) / 100);

        const methodTotals = {};
        items.forEach(it => {
            if (paymentMode === 'auto') {
                it.slices.forEach(sl => {
                    const label = `${sl.isPrepaid ? 'Przedpłata – ' : 'Wpłata – '}${sl.method}`;
                    methodTotals[label] = (methodTotals[label] || 0) + sl.amount;
                });
            } else if (paymentMode.startsWith('Zapłacono')) {
                methodTotals[paymentMode] = (methodTotals[paymentMode] || 0) + it.paidAmount;
            }
        });

        return {
            docType,
            number: generateNextDocNumber(docType, issueDate),
            issueDate,
            generatedAt: new Date().toISOString(),
            studentId,
            studentName: student?.name || '',
            buyerName,
            buyerAddress,
            sellerName: s.settings.tutorName || 'Korepetytor',
            sellerAddress: s.settings.sellerAddress || '',
            bankAccount: s.settings.bankAccount || '',
            blikPhone: s.settings.blikPhone || '',
            vatExemption: s.settings.vatExemption || 'art113',
            paymentMode,
            customNote,
            items,
            totalGross,
            totalPaid,
            totalDue,
            methodTotals
        };
    }

    // ============================================================================
    // RENDEROWANIE PODGLĄDU DOKUMENTU NA ŻYWO (PRAWA KOLUMNA)
    // ============================================================================
    window.renderInvoiceLivePreview = function () {
        const container = document.getElementById('inv-live-preview-sheet');
        if (!container) return;

        const draft = buildDocumentDraftFromForm();
        if (!draft) return;

        const isStatement = draft.docType === 'statement';
        const titleText = isStatement
            ? `ZESTAWIENIE LEKCJI I ROZLICZENIE NR ${draft.number}`
            : `RACHUNEK NR ${draft.number}`;
        const subtitleText = isStatement
            ? 'Szczegółowe rozliczenie zajęć, przedpłat, wpłat oraz kwoty pozostałej do zapłaty'
            : 'Dokument wystawiony w ramach działalności nierejestrowanej (art. 5 ust. 1 ustawy Prawo przedsiębiorców)';

        const methodEntries = Object.entries(draft.methodTotals);
        const methodsSummaryHtml = methodEntries.length > 0
            ? methodEntries.map(([label, amt]) => `<div class="flex justify-between text-[11px] text-slate-600"><span>${label}:</span><span class="font-bold text-emerald-700">${fmtMoney(amt)}</span></div>`).join('')
            : '<div class="text-[11px] text-slate-400">Brak zaksięgowanych wpłat przypisanych do tych lekcji</div>';

        const rowsHtml = draft.items.length > 0
            ? draft.items.map((it, idx) => `
                <tr class="border-b border-slate-100">
                    <td class="py-2 pr-2 text-slate-500">${idx + 1}</td>
                    <td class="py-2 pr-2 whitespace-nowrap font-medium">${it.date}<br><span class="text-[10px] text-slate-400">${it.time} (${it.duration}m)</span></td>
                    <td class="py-2 pr-2">
                        <div class="font-semibold text-slate-800">${it.topic}</div>
                        <div class="text-[10px] text-slate-500">${it.paymentDesc}</div>
                    </td>
                    <td class="py-2 pr-2 text-right whitespace-nowrap text-emerald-700 font-semibold">${fmtMoney(it.paidAmount)}</td>
                    <td class="py-2 text-right whitespace-nowrap font-bold text-slate-900">${fmtMoney(it.price)}</td>
                </tr>
            `).join('')
            : `<tr><td colspan="5" class="py-6 text-center text-slate-400">Zaznacz po lewej stronie przynajmniej jedną lekcję, aby zobaczyć ją na podglądzie.</td></tr>`;

        const legalFooterHtml = isStatement
            ? `<div class="p-3 rounded-lg bg-amber-50/80 border border-amber-200/80 text-[11px] text-amber-950 space-y-1">
                    <p class="font-bold">Dane do uregulowania pozostałej kwoty (${fmtMoney(draft.totalDue)}):</p>
                    ${draft.blikPhone ? `<p>• Przelew na telefon BLIK: <strong>${draft.blikPhone}</strong></p>` : ''}
                    ${draft.bankAccount ? `<p>• Przelew tradycyjny na konto: <strong>${draft.bankAccount}</strong></p>` : ''}
                    <p>• Tytuł przelewu: <strong>Korepetycje matematyka – ${draft.studentName}</strong></p>
               </div>`
            : `<div class="text-[10px] text-slate-500 leading-relaxed border-t border-slate-200 pt-3">
                    <strong>Podstawa zwolnienia z podatku VAT:</strong> ${
                        draft.vatExemption === 'art43'
                            ? 'usługi nauczania prywatnego obejmujące kształcenie powszechne lub wyższe, świadczone przez nauczycieli – zwolnienie przedmiotowe na podstawie art. 43 ust. 1 pkt 27 ustawy o VAT.'
                            : 'sprzedaż zwolniona z podatku VAT ze względu na nieprzekroczenie limitu obrotów – zwolnienie podmiotowe na podstawie art. 113 ust. 1 i 9 ustawy o VAT.'
                    }
               </div>`;

        container.innerHTML = `
            <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b-2 border-slate-900 pb-4">
                <div>
                    <span class="inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${isStatement ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'} mb-1">
                        ${isStatement ? 'Zestawienie rozliczeniowe' : 'Rachunek NDG'}
                    </span>
                    <h4 class="text-base sm:text-lg font-extrabold text-slate-900">${titleText}</h4>
                    <p class="text-[11px] text-slate-500">${subtitleText}</p>
                </div>
                <div class="text-left sm:text-right text-[11px] text-slate-600 shrink-0">
                    <div>Data wystawienia: <strong>${draft.issueDate}</strong></div>
                    <div class="text-[10px] text-slate-400">Znacznik: ${new Date().toLocaleString('pl-PL')}</div>
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div class="p-3 rounded-lg bg-slate-50 border border-slate-200/80 space-y-0.5">
                    <div class="text-[10px] font-bold uppercase text-indigo-600">Wystawca (Sprzedawca)</div>
                    <div class="font-bold text-slate-900">${draft.sellerName}</div>
                    ${draft.sellerAddress ? `<div class="text-[11px] text-slate-600">${draft.sellerAddress}</div>` : '<div class="text-[10px] text-amber-600">Uzupełnij adres w Ustawieniach</div>'}
                    <div class="text-[10px] text-slate-500">Działalność nierejestrowana (bez CEIDG)</div>
                </div>
                <div class="p-3 rounded-lg bg-slate-50 border border-slate-200/80 space-y-0.5">
                    <div class="text-[10px] font-bold uppercase text-indigo-600">Nabywca (Klient)</div>
                    <div class="font-bold text-slate-900">${draft.buyerName}</div>
                    ${draft.buyerAddress ? `<div class="text-[11px] text-slate-600">${draft.buyerAddress}</div>` : ''}
                    ${draft.studentName && !draft.buyerName.includes(draft.studentName) ? `<div class="text-[10px] text-slate-500">Uczeń: ${draft.studentName}</div>` : ''}
                </div>
            </div>

            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse text-[11px]">
                    <thead>
                        <tr class="border-b-2 border-slate-200 text-slate-500 uppercase text-[10px]">
                            <th class="py-1.5 pr-2">Lp.</th>
                            <th class="py-1.5 pr-2">Termin</th>
                            <th class="py-1.5 pr-2">Zakres usługi i historia wpłat</th>
                            <th class="py-1.5 pr-2 text-right">Opłacono</th>
                            <th class="py-1.5 text-right">Wartość</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHtml}</tbody>
                </table>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div class="p-3 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1">
                    <div class="text-[10px] font-bold uppercase text-slate-500">Rozbicie zaksięgowanych płatności</div>
                    ${methodsSummaryHtml}
                </div>
                <div class="p-3 rounded-lg ${draft.totalDue > 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'} border space-y-1">
                    <div class="flex justify-between text-[11px]">
                        <span class="text-slate-600">Wartość zajęć łącznie:</span>
                        <span class="font-bold text-slate-900">${fmtMoney(draft.totalGross)}</span>
                    </div>
                    <div class="flex justify-between text-[11px]">
                        <span class="text-slate-600">Opłacono / przedpłacono:</span>
                        <span class="font-bold text-emerald-700">${fmtMoney(draft.totalPaid)}</span>
                    </div>
                    <div class="flex justify-between text-sm pt-1 border-t border-slate-200/80">
                        <span class="font-extrabold text-slate-900">POZOSTAŁO DO ZAPŁATY:</span>
                        <span class="font-extrabold ${draft.totalDue > 0 ? 'text-rose-600' : 'text-emerald-700'}">${fmtMoney(draft.totalDue)}</span>
                    </div>
                </div>
            </div>

            ${draft.customNote ? `<div class="text-[11px] text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200"><strong>Uwagi:</strong> ${draft.customNote}</div>` : ''}

            ${legalFooterHtml}
        `;
    };

    // ============================================================================
    // ZAPIS DOKUMENTU I GENEROWANIE PLIKU PDF
    // ============================================================================
    window.saveAndGenerateInvoice = function (e) {
        e.preventDefault();
        const s = ensureInvoicesState();
        if (!s) return;

        const draft = buildDocumentDraftFromForm();
        if (!draft || draft.items.length === 0) {
            notifyUser('Zaznacz przynajmniej jedną lekcję na dokumencie.', 'error');
            return;
        }

        const record = {
            id: 'doc_' + Date.now(),
            ...draft
        };

        s.invoices.unshift(record);
        persistAppState();

        closeModal('modal-invoice');
        renderInvoicesTable();
        downloadInvoicePDF(record.id);

        notifyUser(`Wygenerowano ${record.docType === 'statement' ? 'zestawienie' : 'rachunek'} ${record.number} i pobrano PDF.`, 'success');
    };

    window.renderInvoicesTable = function () {
        const s = ensureInvoicesState();
        const tbody = document.getElementById('invoices-table-body');
        const countEl = document.getElementById('billing-invoices-count');
        if (!tbody || !s) return;

        const list = (s.invoices || []).slice().sort((a, b) => (b.generatedAt || b.issueDate).localeCompare(a.generatedAt || a.issueDate));
        if (countEl) countEl.textContent = `${list.length} dok.`;

        if (list.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="py-8 px-4 text-center text-xs text-slate-400">
                        Brak wygenerowanych dokumentów. Kliknij <strong>„Zestawienie”</strong> lub <strong>„Rachunek”</strong> powyżej, aby utworzyć dokument PDF z podglądem na żywo.
                    </td>
                </tr>`;
            return;
        }

        tbody.innerHTML = list.map(inv => {
            const isStatement = inv.docType === 'statement';
            const typePill = isStatement
                ? '<span class="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">Zestawienie</span>'
                : '<span class="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[10px] font-bold">Rachunek NDG</span>';

            const totalGross = Number(inv.totalGross ?? inv.totalAmount ?? 0);
            const totalDue = Number(inv.totalDue ?? 0);

            const statusBadge = totalDue <= 0.009
                ? `<span class="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700">Opłacone w całości</span>`
                : `<span class="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700">Do zapłaty: ${fmtMoney(totalDue)}</span>`;

            return `
                <tr class="hover:bg-slate-50/80 transition-colors">
                    <td class="py-3 px-3 sm:px-4 whitespace-nowrap">
                        <div class="font-bold text-slate-900 text-xs">${inv.number}</div>
                        <div class="mt-0.5">${typePill}</div>
                    </td>
                    <td class="py-3 px-3 sm:px-4 text-xs text-slate-600 whitespace-nowrap">${inv.issueDate}</td>
                    <td class="py-3 px-3 sm:px-4">
                        <div class="font-semibold text-slate-800 text-xs sm:text-sm">${inv.buyerName}</div>
                        ${inv.buyerAddress ? `<div class="text-[11px] text-slate-400">${inv.buyerAddress}</div>` : ''}
                    </td>
                    <td class="py-3 px-3 sm:px-4 text-center text-xs font-semibold text-slate-600">${(inv.items || []).length}</td>
                    <td class="py-3 px-3 sm:px-4 text-right font-extrabold text-slate-900 whitespace-nowrap">${fmtMoney(totalGross)}</td>
                    <td class="py-3 px-3 sm:px-4 text-center whitespace-nowrap">${statusBadge}</td>
                    <td class="py-3 px-3 sm:px-4 text-right whitespace-nowrap">
                        <div class="inline-flex items-center gap-1.5">
                            <button onclick="downloadInvoicePDF('${inv.id}')" class="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold inline-flex items-center gap-1" title="Pobierz PDF">
                                <i class="fa-solid fa-file-pdf"></i> PDF
                            </button>
                            <button onclick="deleteInvoiceRecord('${inv.id}')" class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50" title="Usuń dokument">
                                <i class="fa-solid fa-trash-can text-xs"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    };

    window.deleteInvoiceRecord = function (invoiceId) {
        const s = ensureInvoicesState();
        if (!s) return;
        if (!confirm('Czy na pewno usunąć ten dokument z rejestru?')) return;
        s.invoices = s.invoices.filter(i => i.id !== invoiceId);
        persistAppState();
        renderInvoicesTable();
        notifyUser('Usunięto dokument z rejestru.', 'info');
    };

    window.downloadInvoicePDF = function (invoiceId) {
        const s = ensureInvoicesState();
        const inv = (s?.invoices || []).find(i => i.id === invoiceId);
        if (!inv) return;

        if (!window.jspdf || !window.jspdf.jsPDF) {
            notifyUser('Biblioteka PDF nie jest jeszcze załadowana.', 'error');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const isStatement = inv.docType === 'statement';

        doc.setFillColor(isStatement ? 30 : 15, isStatement ? 41 : 23, isStatement ? 59 : 42);
        doc.rect(0, 0, 210, 28, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text(plAscii(isStatement ? `ZESTAWIENIE LEKCJI I ROZLICZENIE NR ${inv.number}` : `RACHUNEK NR ${inv.number}`), 15, 13);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.text(plAscii(isStatement
            ? 'Szczegolowe rozliczenie zajec, przedplat, wplat oraz kwoty pozostalej do zaplaty'
            : 'Dokument wystawiony w ramach dzialalnosci nierejestrowanej (art. 5 ust. 1 ustawy Prawo przedsiebiorcow)'
        ), 15, 20);

        doc.text(plAscii(`Data wystawienia: ${inv.issueDate}`), 195, 13, { align: 'right' });
        const genStamp = inv.generatedAt ? inv.generatedAt.replace('T', ' ').slice(0, 16) : inv.issueDate;
        doc.text(plAscii(`Wygenerowano: ${genStamp}`), 195, 20, { align: 'right' });

        doc.setTextColor(15, 23, 42);
        doc.setDrawColor(203, 213, 225);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(15, 35, 86, 35, 2, 2, 'FD');
        doc.roundedRect(109, 35, 86, 35, 2, 2, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(79, 70, 229);
        doc.text('WYSTAWCA (SPRZEDAWCA):', 19, 41);

        doc.setTextColor(15, 23, 42);
        doc.setFontSize(10);
        doc.text(plAscii(inv.sellerName || 'Korepetytor'), 19, 47);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        let sellerY = 52;
        if (inv.sellerAddress) {
            const addrLines = doc.splitTextToSize(plAscii(inv.sellerAddress), 78);
            doc.text(addrLines, 19, sellerY);
            sellerY += addrLines.length * 4;
        }
        doc.text(plAscii('Dzialalnosc nierejestrowana (bez wpisu do CEIDG)'), 19, sellerY);
        if (inv.blikPhone) {
            doc.text(plAscii(`Tel. BLIK: ${inv.blikPhone}`), 19, sellerY + 4.5);
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(79, 70, 229);
        doc.text('NABYWCA:', 113, 41);

        doc.setTextColor(15, 23, 42);
        doc.setFontSize(10);
        const buyerLines = doc.splitTextToSize(plAscii(inv.buyerName), 78);
        doc.text(buyerLines, 113, 47);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        let buyerY = 47 + buyerLines.length * 4.5;
        if (inv.buyerAddress) {
            const bAddrLines = doc.splitTextToSize(plAscii(inv.buyerAddress), 78);
            doc.text(bAddrLines, 113, buyerY);
            buyerY += bAddrLines.length * 4;
        }
        if (inv.studentName && !inv.buyerName.includes(inv.studentName)) {
            doc.text(plAscii(`Uczen: ${inv.studentName}`), 113, buyerY);
        }

        let y = 78;
        doc.setFillColor(241, 245, 249);
        doc.rect(15, y, 180, 8, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(51, 65, 85);

        doc.text('Lp.', 17, y + 5.5);
        doc.text('Termin zajec', 25, y + 5.5);
        doc.text('Zakres uslugi i historia wplat', 62, y + 5.5);
        doc.text('Oplacono', 165, y + 5.5, { align: 'right' });
        doc.text('Wartosc', 193, y + 5.5, { align: 'right' });

        y += 8;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);

        (inv.items || []).forEach((item, idx) => {
            if (y > 245) {
                doc.addPage();
                y = 20;
            }
            const price = Number(item.price ?? item.amount ?? 0);
            const paid = Number(item.paidAmount ?? price);
            const topicText = plAscii(`${item.topic || 'Korepetycje z matematyki'}`);
            const payDetailText = plAscii(item.paymentDesc || '');

            const wrappedTopic = doc.splitTextToSize(topicText, 78);
            const wrappedPay = payDetailText ? doc.splitTextToSize(payDetailText, 78) : [];
            const lineCount = wrappedTopic.length + wrappedPay.length;
            const rowHeight = Math.max(8, lineCount * 3.8 + 3);

            doc.setDrawColor(226, 232, 240);
            doc.line(15, y + rowHeight, 195, y + rowHeight);

            doc.text(String(idx + 1), 17, y + 4.5);
            doc.text(plAscii(`${item.date}, ${item.time}`), 25, y + 4.5);
            doc.text(`${item.duration} min`, 25, y + 8.2);

            doc.setFont('helvetica', 'bold');
            doc.text(wrappedTopic, 62, y + 4.5);
            doc.setFont('helvetica', 'normal');
            if (wrappedPay.length > 0) {
                doc.setFontSize(7.2);
                doc.setTextColor(71, 85, 105);
                doc.text(wrappedPay, 62, y + 4.5 + wrappedTopic.length * 3.8);
                doc.setFontSize(8);
                doc.setTextColor(15, 23, 42);
            }

            doc.text(plAscii(fmtMoney(paid)), 165, y + 4.5, { align: 'right' });
            doc.setFont('helvetica', 'bold');
            doc.text(plAscii(fmtMoney(price)), 193, y + 4.5, { align: 'right' });
            doc.setFont('helvetica', 'normal');

            y += rowHeight;
        });

        y += 6;
        if (y > 235) {
            doc.addPage();
            y = 20;
        }

        const totalGross = Number(inv.totalGross ?? inv.totalAmount ?? 0);
        const totalPaid = Number(inv.totalPaid ?? totalGross);
        const totalDue = Number(inv.totalDue ?? 0);

        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(203, 213, 225);
        doc.roundedRect(15, y, 90, 24, 2, 2, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        doc.text('ROZBICIE ZAKSIEGOWANYCH WPLAT:', 18, y + 5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        const entries = Object.entries(inv.methodTotals || {});
        if (entries.length === 0) {
            doc.text('Brak przypisanych wplat do tych lekcji', 18, y + 10.5);
        } else {
            entries.slice(0, 4).forEach(([label, amt], i) => {
                doc.text(plAscii(`${label}: ${fmtMoney(amt)}`), 18, y + 10 + i * 3.8);
            });
        }

        doc.setFillColor(totalDue > 0 ? 254 : 236, totalDue > 0 ? 243 : 253, totalDue > 0 ? 199 : 245);
        doc.roundedRect(110, y, 85, 24, 2, 2, 'FD');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);
        doc.text(plAscii(`Wartosc zajec lacznie: ${fmtMoney(totalGross)}`), 114, y + 6);
        doc.text(plAscii(`Oplacono / przedplacono: ${fmtMoney(totalPaid)}`), 114, y + 11.5);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(plAscii(`DO ZAPLATY: ${fmtMoney(totalDue)}`), 114, y + 19);

        y += 30;
        if (inv.customNote) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            const noteLines = doc.splitTextToSize(plAscii(`Uwagi: ${inv.customNote}`), 180);
            doc.text(noteLines, 15, y);
            y += noteLines.length * 4 + 4;
        }

        if (isStatement) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.text(plAscii('Dane do uregulowania pozostalej kwoty:'), 15, y);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            let payInfoY = y + 4.5;
            if (inv.blikPhone) {
                doc.text(plAscii(`- Przelew na telefon BLIK: ${inv.blikPhone}`), 15, payInfoY);
                payInfoY += 4;
            }
            if (inv.bankAccount) {
                doc.text(plAscii(`- Konto bankowe: ${inv.bankAccount}`), 15, payInfoY);
                payInfoY += 4;
            }
            doc.text(plAscii(`- Tytul przelewu: Korepetycje matematyka - ${inv.studentName}`), 15, payInfoY);
        } else {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(71, 85, 105);
            const vatText = inv.vatExemption === 'art43'
                ? 'Podstawa zwolnienia z podatku VAT: uslugi nauczania prywatnego obejmujace ksztalcenie powszechne lub wyzsze, swiadczone przez nauczycieli - zwolnienie przedmiotowe na podstawie art. 43 ust. 1 pkt 27 ustawy o VAT.'
                : 'Podstawa zwolnienia z podatku VAT: sprzedaz zwolniona z podatku VAT ze wzgledu na nieprzekroczenie limitu obrotow - zwolnienie podmiotowe na podstawie art. 113 ust. 1 i 9 ustawy o VAT.';
            const vatLines = doc.splitTextToSize(plAscii(vatText), 180);
            doc.text(vatLines, 15, y);
        }

        const sigY = 272;
        doc.setDrawColor(148, 163, 184);
        doc.line(20, sigY, 85, sigY);
        doc.line(125, sigY, 190, sigY);
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        doc.text(plAscii('Podpis osoby uprawnionej do wystawienia'), 52.5, sigY + 4, { align: 'center' });
        doc.text(plAscii('Podpis nabywcy (opcjonalnie)'), 157.5, sigY + 4, { align: 'center' });

        const safeFileName = inv.number.replace(/\//g, '_') + '.pdf';
        doc.save(safeFileName);
    };
})();
