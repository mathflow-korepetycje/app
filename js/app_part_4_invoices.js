// ============================================================================
// MODUŁ RACHUNKÓW DLA DZIAŁALNOŚCI NIEREJESTROWANEJ (NDG 2026) – MathFlow
// Zgodny z Ordynacją podatkową (art. 87-88), Rozporządzeniem MF ws. rachunków
// oraz ustawą o VAT (zwolnienie art. 113 ust. 1 i 9 / art. 43 ust. 1 pkt 27).
// ============================================================================

(function initInvoicesModule() {
    // Pomocnik do bezpiecznego usuwania polskich znaków dla standardowego fontu Helvetica w jsPDF
    function plAscii(text) {
        if (!text) return '';
        const map = {
            'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n', 'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
            'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N', 'Ó': 'O', 'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z',
            '–': '-', '—': '-', '„': '"', '”': '"'
        };
        return String(text).replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ–—„”]/g, ch => map[ch] || ch);
    }

    function ensureInvoicesState() {
        if (!window.state) return;
        if (!Array.isArray(state.invoices)) state.invoices = [];
        if (!state.settings) state.settings = {};
        if (typeof state.settings.sellerAddress !== 'string') state.settings.sellerAddress = '';
        if (typeof state.settings.vatExemption !== 'string') state.settings.vatExemption = 'art113';
    }

    // Rozszerzenie switchBillingSubtab o 3. zakładkę: 'invoices'
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

    // Rozszerzenie renderBilling oraz renderSettings
    const origRenderBilling = window.renderBilling;
    window.renderBilling = function () {
        ensureInvoicesState();
        if (typeof origRenderBilling === 'function') origRenderBilling();
        renderInvoicesTable();
    };

    const origRenderSettings = window.renderSettings;
    window.renderSettings = function () {
        ensureInvoicesState();
        if (typeof origRenderSettings === 'function') origRenderSettings();
        const addrEl = document.getElementById('set-seller-address');
        const vatEl = document.getElementById('set-vat-exemption');
        if (addrEl) addrEl.value = state.settings.sellerAddress || '';
        if (vatEl) vatEl.value = state.settings.vatExemption || 'art113';
    };

    const origSaveSettings = window.saveSettings;
    window.saveSettings = function (e) {
        ensureInvoicesState();
        const addrEl = document.getElementById('set-seller-address');
        const vatEl = document.getElementById('set-vat-exemption');
        if (addrEl) state.settings.sellerAddress = addrEl.value.trim();
        if (vatEl) state.settings.vatExemption = vatEl.value;
        if (typeof origSaveSettings === 'function') origSaveSettings(e);
    };

    // Generowanie kolejnego numeru rachunku w danym miesiącu: RACH/RRRR/MM/001
    function generateNextInvoiceNumber(issueDateStr) {
        ensureInvoicesState();
        const [year, month] = (issueDateStr || new Date().toISOString().slice(0, 10)).split('-');
        const prefix = `RACH/${year}/${month}/`;
        let maxSeq = 0;
        state.invoices.forEach(inv => {
            if (inv.number && inv.number.startsWith(prefix)) {
                const seq = parseInt(inv.number.slice(prefix.length), 10);
                if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
            }
        });
        return `${prefix}${String(maxSeq + 1).padStart(3, '0')}`;
    }

    // Otwarcie modalu wystawiania rachunku
    window.openInvoiceModal = function (preselectedStudentId = null) {
        ensureInvoicesState();
        const stuSelect = document.getElementById('inv-student-id');
        const monthInput = document.getElementById('inv-month');
        const issueDateInput = document.getElementById('inv-issue-date');
        const includePlannedChk = document.getElementById('inv-include-planned');

        if (!stuSelect) return;

        if (!state.students || state.students.length === 0) {
            if (typeof showToast === 'function') showToast('Najpierw dodaj ucznia w zakładce Uczniowie.', 'error');
            return;
        }

        stuSelect.innerHTML = state.students
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name, 'pl'))
            .map(s => `<option value="${s.id}">${s.name} (${s.parentName ? 'rodzic: ' + s.parentName : 'uczeń'})</option>`)
            .join('');

        if (preselectedStudentId) {
            stuSelect.value = preselectedStudentId;
        }

        const today = new Date();
        const isoToday = today.toISOString().slice(0, 10);
        if (issueDateInput) issueDateInput.value = isoToday;
        if (monthInput) monthInput.value = isoToday.slice(0, 7);
        if (includePlannedChk) includePlannedChk.checked = false;

        onInvoiceStudentOrPeriodChange();

        const modal = document.getElementById('modal-invoice');
        if (modal) modal.classList.remove('hidden');
    };

    // Przeliczanie i renderowanie listy lekcji w modalu rachunku
    window.onInvoiceStudentOrPeriodChange = function () {
        ensureInvoicesState();
        const studentId = document.getElementById('inv-student-id')?.value;
        const monthVal = document.getElementById('inv-month')?.value; // YYYY-MM lub pusty
        const includePlanned = document.getElementById('inv-include-planned')?.checked;
        const buyerNameInput = document.getElementById('inv-buyer-name');
        const listContainer = document.getElementById('inv-lessons-list');

        const student = state.students.find(s => s.id === studentId);
        if (!student || !listContainer) return;

        // Domyślnie nabywcą jest rodzic (jeśli podany) lub uczeń
        if (buyerNameInput) {
            buyerNameInput.value = student.parentName
                ? `${student.parentName} (dot. ucznia: ${student.name})`
                : student.name;
        }

        // Pobranie lekcji ucznia (indywidualnych i grupowych)
        const allocMap = typeof getLessonPaymentAllocation === 'function'
            ? getLessonPaymentAllocation(student.id)
            : {};

        const matchingLessons = state.lessons
            .filter(l => {
                const isStudentInLesson = (l.targetType === 'group')
                    ? (state.groups.find(g => g.id === l.groupId)?.studentIds || []).includes(student.id)
                    : l.studentId === student.id;
                if (!isStudentInLesson) return false;
                if (l.status === 'cancelled') return false;
                if (!includePlanned && l.status !== 'completed') return false;
                if (monthVal && !l.date.startsWith(monthVal)) return false;
                return true;
            })
            .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

        if (matchingLessons.length === 0) {
            listContainer.innerHTML = `
                <div class="p-4 text-center text-xs text-slate-500">
                    Brak lekcji w wybranym miesiącu. Wyczyść pole miesiąca lub zaznacz opcję uwzględniania zaplanowanych lekcji (opłaconych z nadpłaty).
                </div>`;
            recalculateInvoiceModalTotal();
            return;
        }

        listContainer.innerHTML = matchingLessons.map(l => {
            const price = Number(l.pricePerStudent || 0);
            const alloc = allocMap[l.id];
            const isPaid = alloc && alloc.paid >= price - 0.01;
            const statusBadge = l.status === 'completed'
                ? '<span class="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-bold">Odbyta</span>'
                : '<span class="px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 text-[10px] font-bold">Zaplanowana (z góry)</span>';

            const paidBadge = isPaid
                ? `<span class="text-[10px] text-emerald-600 font-semibold">Opłacona (${alloc.lastPaidDate || ''})</span>`
                : `<span class="text-[10px] text-amber-600 font-semibold">Nieopłacona</span>`;

            return `
                <label class="flex items-center justify-between gap-3 p-2.5 hover:bg-white cursor-pointer transition-colors">
                    <div class="flex items-start gap-2.5 min-w-0">
                        <input type="checkbox" checked data-inv-lesson-id="${l.id}" data-inv-price="${price}" onchange="recalculateInvoiceModalTotal()" class="mt-1 rounded text-indigo-600 focus:ring-indigo-500">
                        <div class="min-w-0">
                            <div class="text-xs font-bold text-slate-800 flex flex-wrap items-center gap-1.5">
                                <span>${l.date} • godz. ${l.time} (${l.duration} min)</span>
                                ${statusBadge}
                            </div>
                            <div class="text-[11px] text-slate-500 truncate">${l.topic || 'Korepetycje z matematyki'} • ${paidBadge}</div>
                        </div>
                    </div>
                    <span class="text-xs font-extrabold text-slate-900 shrink-0">${price.toFixed(2).replace('.', ',')} zł</span>
                </label>
            `;
        }).join('');

        recalculateInvoiceModalTotal();
    };

    window.recalculateInvoiceModalTotal = function () {
        const checkboxes = document.querySelectorAll('#inv-lessons-list input[type="checkbox"]:checked');
        let sum = 0;
        checkboxes.forEach(cb => {
            sum += parseFloat(cb.getAttribute('data-inv-price') || '0');
        });
        const totalEl = document.getElementById('inv-total-amount');
        const countEl = document.getElementById('inv-selected-count');
        if (totalEl) totalEl.textContent = `${sum.toFixed(2).replace('.', ',')} zł`;
        if (countEl) countEl.textContent = `${checkboxes.length} ${checkboxes.length === 1 ? 'lekcja' : 'lekcji'}`;
    };

    // Zapisanie rachunku w stanie (i Supabase) oraz wygenerowanie PDF
    window.saveAndGenerateInvoice = function (e) {
        e.preventDefault();
        ensureInvoicesState();

        const studentId = document.getElementById('inv-student-id')?.value;
        const buyerName = document.getElementById('inv-buyer-name')?.value.trim();
        const buyerAddress = document.getElementById('inv-buyer-address')?.value.trim();
        const issueDate = document.getElementById('inv-issue-date')?.value;
        const paymentStatus = document.getElementById('inv-payment-status')?.value;

        const checkedBoxes = Array.from(document.querySelectorAll('#inv-lessons-list input[type="checkbox"]:checked'));
        if (checkedBoxes.length === 0) {
            if (typeof showToast === 'function') showToast('Zaznacz przynajmniej jedną lekcję na rachunku.', 'error');
            return;
        }

        const student = state.students.find(s => s.id === studentId);
        const allocMap = typeof getLessonPaymentAllocation === 'function'
            ? getLessonPaymentAllocation(studentId)
            : {};

        const items = checkedBoxes.map(cb => {
            const lessonId = cb.getAttribute('data-inv-lesson-id');
            const lesson = state.lessons.find(l => l.id === lessonId);
            const alloc = allocMap[lessonId];
            const price = Number(lesson?.pricePerStudent || 0);
            return {
                lessonId,
                date: lesson?.date || issueDate,
                time: lesson?.time || '16:00',
                duration: lesson?.duration || 60,
                topic: lesson?.topic || 'Korepetycje z matematyki',
                status: lesson?.status || 'completed',
                paidDate: (alloc && alloc.paid >= price - 0.01) ? (alloc.lastPaidDate || '') : '',
                amount: price
            };
        });

        const totalAmount = items.reduce((acc, it) => acc + it.amount, 0);
        const invoiceNumber = generateNextInvoiceNumber(issueDate);

        const invoiceRecord = {
            id: 'inv_' + Date.now(),
            number: invoiceNumber,
            issueDate,
            generatedAt: new Date().toISOString(),
            studentId,
            studentName: student?.name || '',
            buyerName,
            buyerAddress,
            sellerName: state.settings.tutorName || 'Korepetytor',
            sellerAddress: state.settings.sellerAddress || '',
            bankAccount: state.settings.bankAccount || '',
            blikPhone: state.settings.blikPhone || '',
            vatExemption: state.settings.vatExemption || 'art113',
            paymentStatus,
            items,
            totalAmount
        };

        state.invoices.unshift(invoiceRecord);
        if (typeof saveState === 'function') saveState();

        closeModal('modal-invoice');
        renderInvoicesTable();
        downloadInvoicePDF(invoiceRecord.id);

        if (typeof showToast === 'function') {
            showToast(`Wystawiono rachunek ${invoiceNumber} i pobrano PDF.`, 'success');
        }
    };

    // Renderowanie tabeli wystawionych rachunków
    window.renderInvoicesTable = function () {
        ensureInvoicesState();
        const tbody = document.getElementById('invoices-table-body');
        const countEl = document.getElementById('billing-invoices-count');
        if (!tbody) return;

        const list = state.invoices.slice().sort((a, b) => (b.generatedAt || b.issueDate).localeCompare(a.generatedAt || a.issueDate));
        if (countEl) countEl.textContent = `${list.length} dok.`;

        if (list.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="py-8 px-4 text-center text-xs text-slate-400">
                        Nie wystawiono jeszcze żadnego rachunku. Kliknij <strong>„Wystaw rachunek”</strong> powyżej, aby wygenerować dokument PDF dla ucznia lub rodzica.
                    </td>
                </tr>`;
            return;
        }

        tbody.innerHTML = list.map(inv => {
            const isPaid = !inv.paymentStatus.startsWith('Do zapłaty');
            const badge = isPaid
                ? `<span class="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700">${inv.paymentStatus}</span>`
                : `<span class="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700">${inv.paymentStatus}</span>`;

            return `
                <tr class="hover:bg-slate-50/80 transition-colors">
                    <td class="py-3 px-3 sm:px-4 font-bold text-indigo-700 whitespace-nowrap">${inv.number}</td>
                    <td class="py-3 px-3 sm:px-4 text-xs text-slate-600 whitespace-nowrap">${inv.issueDate}</td>
                    <td class="py-3 px-3 sm:px-4">
                        <div class="font-semibold text-slate-800 text-xs sm:text-sm">${inv.buyerName}</div>
                        ${inv.buyerAddress ? `<div class="text-[11px] text-slate-400">${inv.buyerAddress}</div>` : ''}
                    </td>
                    <td class="py-3 px-3 sm:px-4 text-center text-xs font-semibold text-slate-600">${inv.items.length}</td>
                    <td class="py-3 px-3 sm:px-4 text-right font-extrabold text-slate-900 whitespace-nowrap">${Number(inv.totalAmount).toFixed(2).replace('.', ',')} zł</td>
                    <td class="py-3 px-3 sm:px-4 text-center whitespace-nowrap">${badge}</td>
                    <td class="py-3 px-3 sm:px-4 text-right whitespace-nowrap">
                        <div class="inline-flex items-center gap-1.5">
                            <button onclick="downloadInvoicePDF('${inv.id}')" class="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold inline-flex items-center gap-1" title="Pobierz PDF">
                                <i class="fa-solid fa-file-pdf"></i> PDF
                            </button>
                            <button onclick="deleteInvoiceRecord('${inv.id}')" class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50" title="Usuń rachunek">
                                <i class="fa-solid fa-trash-can text-xs"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    };

    window.deleteInvoiceRecord = function (invoiceId) {
        ensureInvoicesState();
        if (!confirm('Czy na pewno usunąć ten rachunek z rejestru?')) return;
        state.invoices = state.invoices.filter(i => i.id !== invoiceId);
        if (typeof saveState === 'function') saveState();
        renderInvoicesTable();
        if (typeof showToast === 'function') showToast('Usunięto rachunek z rejestru.', 'info');
    };

    // Generowanie profesjonalnego PDF rachunku zgodnego z polskimi przepisami NDG 2026
    window.downloadInvoicePDF = function (invoiceId) {
        ensureInvoicesState();
        const inv = state.invoices.find(i => i.id === invoiceId);
        if (!inv) return;

        if (!window.jspdf || !window.jspdf.jsPDF) {
            if (typeof showToast === 'function') showToast('Biblioteka PDF nie jest jeszcze załadowana.', 'error');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

        // Nagłówek dokumentu
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, 210, 28, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text(plAscii(`RACHUNEK NR ${inv.number}`), 15, 13);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(plAscii('Dokument wystawiony w ramach dzialalnosci nierejestrowanej (art. 5 ust. 1 ustawy Prawo przedsiebiorcow)'), 15, 20);

        // Daty i znacznik czasu po prawej stronie nagłówka
        doc.setFontSize(9);
        doc.text(plAscii(`Data wystawienia: ${inv.issueDate}`), 195, 13, { align: 'right' });
        const genStamp = inv.generatedAt ? inv.generatedAt.replace('T', ' ').slice(0, 16) : inv.issueDate;
        doc.text(plAscii(`Wygenerowano: ${genStamp}`), 195, 20, { align: 'right' });

        // Ramki Sprzedawcy i Nabywcy
        doc.setTextColor(15, 23, 42);
        doc.setDrawColor(203, 213, 225);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(15, 35, 86, 36, 2, 2, 'FD');
        doc.roundedRect(109, 35, 86, 36, 2, 2, 'FD');

        // Sprzedawca
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(79, 70, 229);
        doc.text('SPRZEDAWCA (WYSTAWCA):', 19, 41);

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
        doc.text(plAscii('Działalność nierejestrowana (bez wpisu do CEIDG)'), 19, sellerY);
        if (inv.bankAccount) {
            doc.text(plAscii(`Konto: ${inv.bankAccount}`), 19, sellerY + 4.5);
        } else if (inv.blikPhone) {
            doc.text(plAscii(`Tel. BLIK: ${inv.blikPhone}`), 19, sellerY + 4.5);
        }

        // Nabywca
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

        // Tabela pozycji
        let y = 80;
        doc.setFillColor(241, 245, 249);
        doc.rect(15, y, 180, 8, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(51, 65, 85);

        doc.text('Lp.', 17, y + 5.5);
        doc.text('Data i godzina zajec', 26, y + 5.5);
        doc.text('Nazwa uslugi / zakres', 72, y + 5.5);
        doc.text('Czas', 142, y + 5.5);
        doc.text('Status wplaty', 156, y + 5.5);
        doc.text('Kwota', 193, y + 5.5, { align: 'right' });

        y += 8;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);

        inv.items.forEach((item, idx) => {
            if (y > 255) {
                doc.addPage();
                y = 20;
            }
            const serviceLabel = plAscii(`Korepetycje z matematyki${item.topic ? ' - ' + item.topic : ''}`);
            const wrappedService = doc.splitTextToSize(serviceLabel, 66);
            const rowHeight = Math.max(7, wrappedService.length * 4 + 2);

            doc.setDrawColor(226, 232, 240);
            doc.line(15, y + rowHeight, 195, y + rowHeight);

            doc.text(String(idx + 1), 17, y + 4.5);
            doc.text(plAscii(`${item.date}, ${item.time}`), 26, y + 4.5);
            doc.text(wrappedService, 72, y + 4.5);
            doc.text(`${item.duration} min`, 142, y + 4.5);
            doc.text(plAscii(item.paidDate ? `Opl. ${item.paidDate}` : 'Wg statusu'), 156, y + 4.5);
            doc.setFont('helvetica', 'bold');
            doc.text(`${Number(item.amount).toFixed(2).replace('.', ',')} zl`, 193, y + 4.5, { align: 'right' });
            doc.setFont('helvetica', 'normal');

            y += rowHeight;
        });

        // Podsumowanie kwoty do zapłaty / zapłacono
        y += 6;
        doc.setFillColor(238, 242, 255);
        doc.roundedRect(110, y, 85, 16, 2, 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(55, 48, 163);
        doc.text('RAZEM DO ZAPLATY / WARTOSC:', 114, y + 6);
        doc.setFontSize(12);
        doc.text(`${Number(inv.totalAmount).toFixed(2).replace('.', ',')} PLN`, 191, y + 12.5, { align: 'right' });

        // Status płatności i podstawa zwolnienia z VAT
        y += 24;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(15, 23, 42);
        doc.text(plAscii(`Status platnosci: ${inv.paymentStatus}`), 15, y);

        y += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        const vatText = inv.vatExemption === 'art43'
            ? 'Podstawa zwolnienia z podatku VAT: uslugi nauczania prywatnego obejmujace ksztalcenie powszechne lub wyzsze, swiadczone przez nauczycieli - zwolnienie przedmiotowe na podstawie art. 43 ust. 1 pkt 27 ustawy z dnia 11 marca 2004 r. o podatku od towarow i uslug.'
            : 'Podstawa zwolnienia z podatku VAT: sprzedaz zwolniona z podatku od towarow i uslug ze wzgledu na nieprzekroczenie limitu obrotow (zwolnienie podmiotowe na podstawie art. 113 ust. 1 i 9 ustawy z dnia 11 marca 2004 r. o podatku od towarow i uslug).';
        const vatLines = doc.splitTextToSize(plAscii(vatText), 180);
        doc.text(vatLines, 15, y);

        // Podpisy na dole strony
        const sigY = Math.max(y + vatLines.length * 4 + 22, 255);
        doc.setDrawColor(148, 163, 184);
        doc.line(20, sigY, 85, sigY);
        doc.line(125, sigY, 190, sigY);
        doc.setFontSize(7.5);
        doc.text(plAscii('Podpis osoby uprawnionej do wystawienia rachunku'), 52.5, sigY + 4, { align: 'center' });
        doc.text(plAscii('Podpis nabywcy (opcjonalnie)'), 157.5, sigY + 4, { align: 'center' });

        const safeFileName = inv.number.replace(/\//g, '_') + '.pdf';
        doc.save(safeFileName);
    };
})();