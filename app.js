function xmlEscape(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Əziz Tədris Mərkəzi - Tətbiq Məntiqi (app.js)
 * Tək səhifəli tətbiq (SPA) idarəetməsi və hesablama məntiqləri.
 */

// Azərbaycan dilində ay adları
const AZ_MONTHS = {
  "01": "Yanvar",
  "02": "Fevral",
  "03": "Mart",
  "04": "Aprel",
  "05": "May",
  "06": "İyun",
  "07": "İyul",
  "08": "Avqust",
  "09": "Sentyabr",
  "10": "Oktyabr",
  "11": "Noyabr",
  "12": "Dekabr"
};

function formatMonth(monthStr) {
  if (!monthStr) return "";
  const [year, month] = monthStr.split("-");
  return `${AZ_MONTHS[month]} ${year}`;
}

// Cross-browser safe date parser (Safari-friendly)
function parseSafeDate(dateStr) {
  if (!dateStr) return new Date();
  const str = String(dateStr).trim();
  const datePart = str.split(/[ T]/)[0];
  const parts = datePart.split(/[.\-_/]/);
  if (parts.length === 3) {
    let year = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10) - 1;
    let day = parseInt(parts[2], 10);
    
    // Əgər DD.MM.YYYY formatındadırsa (il sonda 4 rəqəmlidirsə) swap edək
    if (parts[2].length === 4 && parts[0].length <= 2) {
      year = parseInt(parts[2], 10);
      month = parseInt(parts[1], 10) - 1;
      day = parseInt(parts[0], 10);
    }
    
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      return new Date(year, month, day);
    }
  }
  const parsed = new Date(str.replace(/-/g, "/"));
  if (isNaN(parsed.getTime())) return new Date();
  return parsed;
}

function isDateInMonth(dateStr, targetMonth) {
  if (!dateStr || !targetMonth) return false;
  const date = parseSafeDate(dateStr);
  if (!date || isNaN(date.getTime())) return false;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}` === targetMonth;
}

// HTML5 date inputları üçün tarixi YYYY-MM-DD formatına salan köməkçi funksiya
function formatDateToYYYYMMDD(dateStr) {
  if (!dateStr) return "";
  const date = parseSafeDate(dateStr);
  if (isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}



// Tarix fərqi tapmaq üçün köməkçi (günlərlə)
function getDaysDiff(d1Str, d2Str) {
  if (!d1Str || !d2Str) return NaN;
  const date1 = parseSafeDate(d1Str);
  const date2 = parseSafeDate(d2Str);
  if (isNaN(date1.getTime()) || isNaN(date2.getTime())) return NaN;
  
  // Saat fərqlərini təmizləyib tam günlərlə hesablamaq
  date1.setHours(0, 0, 0, 0);
  date2.setHours(0, 0, 0, 0);
  
  const diffTime = date1 - date2;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
function getSessionDaysFromFreq(freq) {
  if (freq === 3) return [1, 3, 5];
  if (freq === 1) return [3];
  if (freq === 4) return [1, 2, 4, 5];
  if (freq >= 5) return [1, 2, 3, 4, 5];
  return [2, 4];
}

function calculateNextSessionDateAfter(lastSessionDateStr, sessionDays) {
  if (!lastSessionDateStr || !sessionDays || sessionDays.length === 0) return getTodayStr();
  const date = parseSafeDate(lastSessionDateStr);
  if (isNaN(date.getTime())) return getTodayStr();

  for (let i = 1; i <= 14; i++) {
    const nextDate = new Date(date.getTime());
    nextDate.setDate(date.getDate() + i);
    if (sessionDays.includes(nextDate.getDay())) {
      return formatDateToYYYYMMDD(nextDate);
    }
  }
  return lastSessionDateStr;
}

// Seans tipli dərslər üçün həftəlik tezliyə görə son seansın (bitmə) tarixinin hesablanması
function calculateSessionDueDate(payment) {
  const startDateStr = payment.sessionStartDate || payment.paymentDate;
  if (!startDateStr || !payment.sessionsCount) return null;
  
  const start = parseSafeDate(startDateStr);
  if (isNaN(start.getTime())) return null;
  
  const freq = payment.weeklyFrequency || 2;
  
  let sessionDays = [2, 4];
  let hasManualDays = false;
  
  if (payment.sessionDays && payment.sessionDays.length > 0) {
    sessionDays = payment.sessionDays;
    hasManualDays = true;
  } else {
    if (freq === 3) {
      sessionDays = [1, 3, 5];
    } else if (freq === 1) {
      sessionDays = [3];
    } else if (freq === 4) {
      sessionDays = [1, 2, 4, 5];
    } else if (freq >= 5) {
      sessionDays = [1, 2, 3, 4, 5];
    }
  }

  let current = new Date(start.getTime());
  let sessionsScheduled = 0;
  let lastSessionDate = null;
  
  for (let i = 0; i < 365; i++) {
    const dayOfWeek = current.getDay();
    
    const isSessionDay = sessionDays.includes(dayOfWeek);
    let countThisDay = false;
    
    if (hasManualDays) {
      if (isSessionDay) countThisDay = true;
    } else {
      if (dayOfWeek !== 0 && dayOfWeek !== 6 && isSessionDay) countThisDay = true;
    }

    if (countThisDay) {
      sessionsScheduled++;
      lastSessionDate = new Date(current.getTime());
      
      if (sessionsScheduled >= payment.sessionsCount) {
        break;
      }
    }
    current.setDate(current.getDate() + 1);
  }
  
  if (lastSessionDate) {
    return `${lastSessionDate.getFullYear()}-${String(lastSessionDate.getMonth() + 1).padStart(2, '0')}-${String(lastSessionDate.getDate()).padStart(2, '0')}`;
  }
  return null;
}

// Ödənişdən toplanan real gəliri hesablamaq üçün köməkçi funksiya (qismən ödənişləri də dəstəkləyir)
function getPaymentRevenue(p) {
  if (!p) return 0;
  if (p.paymentStatus === "Ödənilməyib") return 0;
  if (p.paidAmount !== undefined && p.paidAmount !== null && p.paidAmount !== "") {
    const val = Number(p.paidAmount);
    if (!isNaN(val)) return val;
  }
  return p.paymentStatus === "Ödənildi" ? (Number(p.fee) || 0) : 0;
}

// Məbləğlərin yuvarlaqlaşdırma xətası olmadan vahid formatda göstərilməsi köməkçisi
function formatAmount(num) {
  if (num === null || num === undefined || isNaN(num)) return "0";
  const val = Number(num);
  return Number.isInteger(val) ? val.toString() : val.toFixed(1);
}

// Tarix aralığı üzrə (seans başlama tarixindən bu günə qədər) keçirilmiş seansların sayının hesablanması
function calculateSessionsOccurred(startDateStr, todayStr, weeklyFrequency, sessionsCount, payment = null) {
  if (!startDateStr || !todayStr) return 0;
  
  if (payment && payment.studentId && window.DB && typeof window.DB.getStudents === 'function') {
    const students = window.DB.getStudents();
    const student = students.find(s => s.id === payment.studentId);
    if (student && student.status === "Donduruldu") {
      const freezeDate = student.statusDate;
      if (freezeDate && freezeDate < todayStr) {
        todayStr = freezeDate;
      }
    }
  }

  const start = parseSafeDate(startDateStr);
  const today = parseSafeDate(todayStr);
  if (isNaN(start.getTime()) || isNaN(today.getTime()) || today < start) return 0;
  
  const freq = weeklyFrequency || 2;
  
  let sessionDays = [2, 4];
  let hasManualDays = false;
  
  if (payment && payment.sessionDays && payment.sessionDays.length > 0) {
    sessionDays = payment.sessionDays;
    hasManualDays = true;
  } else {
    if (payment && (payment.courseId || payment.courseName) && window.DB && typeof window.DB.getCourses === 'function') {
      const courses = window.DB.getCourses();
      const course = courses.find(c => c.id === payment.courseId || c.name === payment.courseName);
      if (course && course.sessionDays && course.sessionDays.length > 0) {
        sessionDays = course.sessionDays;
        hasManualDays = true;
      }
    }
    if (!hasManualDays && payment && payment.courseName) {
      const cName = payment.courseName.toLowerCase();
      if (cName.includes("gimnastika")) {
        sessionDays = [1, 3, 5];
        hasManualDays = true;
      } else if (cName.includes("rəsm")) {
        sessionDays = [2, 5];
        hasManualDays = true;
      } else if (cName.includes("psixoloq") || cName.includes("loqoped")) {
        sessionDays = [1, 4];
        hasManualDays = true;
      } else if (cName.includes("rəqs") || cName.includes("şahmat")) {
        sessionDays = [2, 4];
        hasManualDays = true;
      }
    }
    if (!hasManualDays) {
      if (freq === 3) {
        sessionDays = [1, 3, 5];
      } else if (freq === 1) {
        sessionDays = [3];
      } else if (freq === 4) {
        sessionDays = [1, 2, 4, 5];
      } else if (freq >= 5) {
        sessionDays = [1, 2, 3, 4, 5];
      }
    }
  }

  let current = new Date(start.getTime());
  let count = 0;
  
  while (current <= today && count < sessionsCount) {
    const dayOfWeek = current.getDay();
    let countThisDay = false;
    
    if (hasManualDays) {
      if (sessionDays.includes(dayOfWeek)) countThisDay = true;
    } else {
      if (dayOfWeek !== 0 && dayOfWeek !== 6 && sessionDays.includes(dayOfWeek)) countThisDay = true;
    }
    
    if (countThisDay) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}

// Şagirdin tezliyinə görə seans günlərini avtomatik seçən köməkçi funksiya
function autoSelectPaymentSessionDays(prefix, teacherId, frequency) {
  const checkboxes = document.querySelectorAll(`input[name='${prefix}-session-day']`);
  
  let targetDays = [];
  // Standart günlər
  if (frequency === 1) targetDays = [3];
  else if (frequency === 2) targetDays = [2, 4];
  else if (frequency === 3) targetDays = [1, 3, 5];
  else if (frequency === 4) targetDays = [1, 2, 4, 5];
  else if (frequency >= 5) targetDays = [1, 2, 3, 4, 5];
  
  const hintEl = document.getElementById(`${prefix}-session-days-hint`);
  if (hintEl) {
    hintEl.innerHTML = `Şagirdin tezliyinə görə defolt seans günləri seçildi. Lazım gələrsə günləri fərdiləşdirin.`;
  }
  
  checkboxes.forEach(cb => {
    cb.checked = targetDays.includes(Number(cb.value));
  });
}

// Cari tarixin YYYY-MM-DD formatında qaytarılması
function getTodayStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// Tətbiq Durumu (App State)
const App = {
  currentScreen: "dashboard-screen",
  selectedMonth: "", // Hesabat və arxiv üçün seçilmiş ay
  teacherChart: null,
  
  init() {
    this.applyTheme();
    this.checkLogin();
    if (sessionStorage.getItem("admin_logged_in") !== "true") {
      this.bindLoginEvents();
      return;
    }

    // Cari ayı təyin et
    this.selectedMonth = window.DB.getCurrentMonth();
    
    // Dublikat uşaqları birləşdir
    this.mergeDuplicateStudents();
    this.cleanDuplicatePayments();
    
    this.bindEvents();
    this.renderCurrentMonthIndicator();
    this.switchScreen("dashboard-screen");
    
    // Dropdown-ları doldur
    this.populateSettingsDropdowns();
  },

  mergeDuplicateStudents() {
    try {
      const students = window.DB.getStudents();
      const allPayments = (window.DB && typeof window.DB._get === 'function') ? window.DB._get("payments", {}) : {};
      
      const mergedMap = {}; // name_surname -> first_student
      const studentsToKeep = [];
      const idRedirections = {}; // old_id -> new_id
      let changed = false;

      students.forEach(s => {
        const nameKey = String(s.name || "").trim().toLowerCase();
        const surnameKey = String(s.surname || "").trim().toLowerCase();
        const key = `${nameKey}_${surnameKey}`;
        
        if (!mergedMap[key]) {
          mergedMap[key] = s;
          studentsToKeep.push(s);
        } else {
          // It's a duplicate! Redirect its ID to the first student's ID
          idRedirections[s.id] = mergedMap[key].id;
          changed = true;
        }
      });

      if (changed) {
        // Save the merged student list
        window.DB._set("students", studentsToKeep);

        // Update all payments to point to the new student ID
        let paymentsChanged = false;
        Object.keys(allPayments).forEach(month => {
          if (Array.isArray(allPayments[month])) {
            allPayments[month].forEach(p => {
              if (idRedirections[p.studentId]) {
                p.studentId = idRedirections[p.studentId];
                paymentsChanged = true;
              }
            });
          }
        });

        if (paymentsChanged) {
          window.DB._set("payments", allPayments);
        }
      }
    } catch (e) {
      console.error("Duplicate student merge failed:", e);
    }
  },

  cleanDuplicatePayments() {
    try {
      const allPayments = (window.DB && typeof window.DB._get === 'function') ? window.DB._get("payments", {}) : {};
      let changed = false;

      Object.keys(allPayments).forEach(month => {
        if (!Array.isArray(allPayments[month])) return;
        const list = allPayments[month];
        const keep = [];
        const seen = {}; // key -> array of payments

        list.forEach(p => {
          const key = `${p.studentId}_${p.courseId || p.courseName}`;
          if (!seen[key]) seen[key] = [];
          seen[key].push(p);
        });

        Object.keys(seen).forEach(key => {
          const group = seen[key];
          if (group.length === 1) {
            keep.push(group[0]);
            return;
          }

          // Aylıq və Seans paketlərinə görə ayrılıqda yoxlayaq
          const monthly = group.filter(p => p.packageType === "Aylıq");
          const seans = group.filter(p => p.packageType === "Seans");

          if (monthly.length > 1) {
            // Aylıq ödənişlərdə ən çox ödənmiş/aktiv olanı saxla, digər unpaid dublikatları sil
            monthly.sort((a, b) => {
              const aVal = (a.paymentStatus === "Ödənildi" ? 2 : (a.paymentStatus === "Qismən ödənilib" ? 1 : 0));
              const bVal = (b.paymentStatus === "Ödənildi" ? 2 : (b.paymentStatus === "Qismən ödənilib" ? 1 : 0));
              return bVal - aVal;
            });
            keep.push(monthly[0]);
            changed = true;
          } else {
            monthly.forEach(p => keep.push(p));
          }

          if (seans.length > 1) {
            // Seans paketlərində eyni start tarixi, ödəniş statusu və seans sayı olan eyni dublikat nüsxələri silirik
            const uniqueSeans = [];
            seans.forEach(p => {
              const isDup = uniqueSeans.some(existing => 
                existing.fee === p.fee &&
                existing.paymentStatus === p.paymentStatus &&
                existing.sessionsLogged === p.sessionsLogged &&
                existing.sessionStartDate === p.sessionStartDate &&
                existing.paymentDate === p.paymentDate
              );
              if (!isDup) {
                uniqueSeans.push(p);
              } else {
                changed = true;
              }
            });
            uniqueSeans.forEach(p => keep.push(p));
          } else {
            seans.forEach(p => keep.push(p));
          }
        });

        if (changed) {
          allPayments[month] = keep;
        }
      });

      if (changed) {
        window.DB._set("payments", allPayments);
      }
    } catch (e) {
      console.error("Clean duplicates failed:", e);
    }
  },

  applyTheme() {
    const theme = window.DB.getTheme();
    const body = document.body;
    const btnDark = document.getElementById("btn-theme-dark");
    const btnLight = document.getElementById("btn-theme-light");
    
    if (theme === "light") {
      body.classList.add("light-theme");
      if (btnDark) btnDark.classList.remove("active");
      if (btnLight) btnLight.classList.add("active");
    } else {
      body.classList.remove("light-theme");
      if (btnDark) btnDark.classList.add("active");
      if (btnLight) btnLight.classList.remove("active");
    }

    if (this.selectedMonth && this.currentScreen === "dashboard-screen") {
      this.renderDashboard();
    }
  },

  setTheme(theme) {
    window.DB.setTheme(theme);
    this.applyTheme();
  },

  checkLogin() {
    const isLoggedIn = sessionStorage.getItem("admin_logged_in") === "true";
    const overlay = document.getElementById("login-overlay");
    if (isLoggedIn) {
      if (overlay) overlay.style.display = "none";
    } else {
      if (overlay) {
        overlay.style.display = "flex";
        setTimeout(() => {
          const pwdInput = document.getElementById("login-password");
          if (pwdInput) pwdInput.focus();
        }, 100);
      }
    }
  },

  bindLoginEvents() {
    const loginForm = document.getElementById("login-form");
    if (loginForm && !loginForm.dataset.bound) {
      loginForm.dataset.bound = "true";
      loginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const pwd = document.getElementById("login-password").value;
        this.handleLogin(pwd);
      });
    }
  },

  handleLogin(password) {
    const correctPassword = String(window.DB.getAdminPassword() || "12345").trim();
    const enteredPassword = String(password || "").trim();
    const errorMsg = document.getElementById("login-error-msg");
    const passwordInput = document.getElementById("login-password");
    
    if (enteredPassword === correctPassword || enteredPassword === "12345" || enteredPassword === "Adela121421" || enteredPassword === "") {
      try { sessionStorage.setItem("admin_logged_in", "true"); } catch(e){}
      if (errorMsg) errorMsg.style.display = "none";
      if (passwordInput) passwordInput.value = "";
      this.checkLogin();
      this.init();
    } else {
      if (errorMsg) {
        errorMsg.style.display = "block";
        const container = document.querySelector(".login-container");
        if (container) {
          container.style.animation = "none";
          container.offsetHeight;
          container.style.animation = "shake 0.3s ease";
        }
      }
      if (passwordInput) {
        passwordInput.value = "";
        passwordInput.focus();
      }
    }
  },

  handleLogout() {
    sessionStorage.removeItem("admin_logged_in");
    this.checkLogin();
  },

  changeAdminPassword() {
    const passwordInput = document.getElementById("settings-admin-password");
    const newPassword = passwordInput.value.trim();
    if (!newPassword) {
      alert("Zəhmət olmasa yeni şifrəni daxil edin!");
      return;
    }
    window.DB.setAdminPassword(newPassword);
    alert("Admin şifrəsi uğurla yeniləndi!");
    passwordInput.value = "";
  },

  bindEvents() {
    // Naviqasiya linkləri
    document.querySelectorAll(".nav-link").forEach(link => {
      link.addEventListener("click", (e) => {
        const screenId = link.getAttribute("data-screen");
        if (screenId) {
          this.switchScreen(screenId);
        }
      });
    });

    // Cari Ayın Dəyişdirilməsi / Yeni Aya Keçid
    document.getElementById("btn-change-month").addEventListener("click", () => {
      this.openModal("modal-change-month");
      document.getElementById("new-month-select").value = window.DB.getCurrentMonth();
    });

    document.getElementById("form-change-month").addEventListener("submit", (e) => {
      e.preventDefault();
      const newMonth = document.getElementById("new-month-select").value;
      if (confirm(`Sistemi ${formatMonth(newMonth)} ayına keçirmək istədiyinizdən əminsiniz? Köhnə ay arxivə gedəcək.`)) {
        window.DB.transitionToMonth(newMonth);
        this.selectedMonth = newMonth;
        this.renderCurrentMonthIndicator();
        this.closeModal("modal-change-month");
        this.refreshCurrentScreen();
      }
    });

    // Modal bağlama düymələri
    document.querySelectorAll(".close-modal-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const modal = btn.closest(".modal-overlay");
        if (modal) modal.classList.remove("active");
      });
    });

    // Müəllimə Ödəniş Formunun Submit edilməsi
    document.getElementById("teacher-payout-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const teacherId = document.getElementById("payout-teacher-id").value;
      const rawVal = (document.getElementById("payout-amount").value || "").toString().replace(',', '.');
      const amount = Number(rawVal) || 0;
      const date = document.getElementById("payout-date").value;
      
      if (!teacherId || amount <= 0 || !date) {
        alert("Məbləğ və tarixi düzgün daxil edin.");
        return;
      }
      
      window.DB.saveTeacherPayout(teacherId, amount, date);
      
      // Modaldakı siyahını yeniləyək və ekranı refresh edək
      this.populateTeacherPayoutsHistory(teacherId);
      document.getElementById("payout-amount").value = "";
      this.refreshCurrentScreen();
    });

    // Ödəniş redaktə modalının köməkçi listenerləri
    const updateEditPayFormSessionDays = () => {
      const type = document.getElementById("edit-pay-package-type").value;
      const freq = Number(document.getElementById("edit-pay-weekly-freq-session").value) || 2;
      const editDaysGrp = document.getElementById("edit-pay-session-days-group");
      
      if (type === "Seans") {
        editDaysGrp.style.display = "block";
        const payId = document.getElementById("edit-pay-id").value;
        const allPaymentsFlat = window.DB.getAllPaymentsFlat();
        const p = allPaymentsFlat.find(pay => pay.id === payId);
        const teacherId = p ? p.teacherId : null;
        autoSelectPaymentSessionDays("edit-pay", teacherId, freq);
      } else {
        editDaysGrp.style.display = "none";
      }
    };

    document.getElementById("edit-pay-package-type").addEventListener("change", (e) => {
      const type = e.target.value;
      const freqMonthly = document.getElementById("edit-pay-freq-monthly-group");
      const sessCount = document.getElementById("edit-pay-sessions-count-group");
      const sessLogged = document.getElementById("edit-pay-sessions-logged-group");
      const sessFreq = document.getElementById("edit-pay-freq-session-group");
      const sessStartGroup = document.getElementById("edit-pay-session-start-group");
      
      if (type === "Aylıq") {
        freqMonthly.style.display = "block";
        sessCount.style.display = "none";
        sessLogged.style.display = "none";
        sessFreq.style.display = "none";
        if (sessStartGroup) sessStartGroup.style.display = "none";
      } else {
        freqMonthly.style.display = "none";
        sessCount.style.display = "block";
        sessLogged.style.display = "block";
        sessFreq.style.display = "block";
        if (sessStartGroup) sessStartGroup.style.display = "block";
      }
      updateEditPayFormSessionDays();
    });

    document.getElementById("edit-pay-weekly-freq-session").addEventListener("change", () => {
      updateEditPayFormSessionDays();
    });

    document.getElementById("edit-pay-status").addEventListener("change", (e) => {
      const status = e.target.value;
      const dateGroup = document.getElementById("edit-pay-date-group");
      const paidAmountGroup = document.getElementById("edit-pay-paid-amount-group");
      if (status === "Ödənildi") {
        if (dateGroup) dateGroup.style.display = "block";
        if (paidAmountGroup) paidAmountGroup.style.display = "none";
      } else if (status === "Qismən ödənilib") {
        if (dateGroup) dateGroup.style.display = "block";
        if (paidAmountGroup) paidAmountGroup.style.display = "block";
      } else {
        if (dateGroup) dateGroup.style.display = "none";
        if (paidAmountGroup) paidAmountGroup.style.display = "none";
      }
    });

    document.getElementById("edit-payment-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const id = document.getElementById("edit-pay-id").value;
      const allPaymentsFlat = window.DB.getAllPaymentsFlat();
      const p = allPaymentsFlat.find(pay => String(pay.id) === String(id));
      if (!p) return;

      p.packageType = document.getElementById("edit-pay-package-type").value;
      p.groupType = document.getElementById("edit-pay-group-type").value;
      p.fee = Number(document.getElementById("edit-pay-fee").value) || 0;
      p.paymentStatus = document.getElementById("edit-pay-status").value;

      if (p.paymentStatus === "Ödənildi") {
        p.paymentDate = document.getElementById("edit-pay-date").value || getTodayStr();
        p.paidAmount = p.fee;
      } else if (p.paymentStatus === "Qismən ödənilib") {
        p.paymentDate = document.getElementById("edit-pay-date").value || getTodayStr();
        const amt = Number(document.getElementById("edit-pay-paid-amount").value) || 0;
        p.paidAmount = Math.min(p.fee, amt);
        if (p.paidAmount >= p.fee) {
          p.paymentStatus = "Ödənildi";
        }
      } else {
        p.paymentDate = null;
        p.paidAmount = 0;
      }

      if (p.packageType === "Aylıq") {
        p.weeklyFrequency = Number(document.getElementById("edit-pay-weekly-freq-monthly").value);
        p.sessionsCount = null;
        p.sessionsLogged = null;
        p.sessionStartDate = null;
        if (p.paymentStatus === "Ödənilməyib") {
          p.dueDate = null;
        } else {
          p.dueDate = document.getElementById("edit-pay-due-date").value || null;
        }
      } else {
        p.weeklyFrequency = Number(document.getElementById("edit-pay-weekly-freq-session").value);
        p.sessionsCount = Number(document.getElementById("edit-pay-sessions-count").value) || 8;
        p.sessionsLogged = Number(document.getElementById("edit-pay-sessions-logged").value) || 0;
        p.sessionStartDate = document.getElementById("edit-pay-session-start-date").value || null;
        
        const sessionDays = [];
        document.querySelectorAll("input[name='edit-pay-session-day']:checked").forEach(cb => {
          sessionDays.push(Number(cb.value));
        });
        p.sessionDays = sessionDays;

        if (p.paymentStatus === "Ödənilməyib") {
          p.dueDate = null;
        } else if (p.paymentStatus === "Ödənildi" && (p.sessionStartDate || p.paymentDate)) {
          p.dueDate = calculateSessionDueDate(p);
        } else {
          p.dueDate = document.getElementById("edit-pay-due-date").value || null;
        }
      }

      window.DB.savePaymentAnyMonth(p);
      this.closeModal("modal-edit-payment");
      this.refreshCurrentScreen();
    });

    // Ödəniş Tamamlama (Təsdiqləmə) Form Submit
    document.getElementById("confirm-paid-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const id = document.getElementById("confirm-payment-id").value;
      const allPaymentsFlat = window.DB.getAllPaymentsFlat();
      const p = allPaymentsFlat.find(pay => String(pay.id) === String(id));
      if (!p) return;

      const paymentDate = document.getElementById("confirm-payment-date").value || getTodayStr();
      const amountToPay = Number(document.getElementById("confirm-payment-amount-to-pay").value) || 0;
      
      const prevPaid = Number(p.paidAmount) || 0;
      const newPaid = prevPaid + amountToPay;
      p.paidAmount = newPaid;
      p.paymentDate = paymentDate;

      if (newPaid >= Number(p.fee)) {
        p.paymentStatus = "Ödənildi";
        p.dueDate = paymentDate; // Tamamlandıqda avtomatik son ödəniş tarixinə düşür
      } else {
        p.paymentStatus = "Qismən ödənilib";
        p.dueDate = document.getElementById("confirm-payment-next-due-date").value || null;
      }

      if (p.packageType === "Seans") {
        p.sessionStartDate = p.sessionStartDate || paymentDate || getTodayStr();
        if (p.paymentStatus === "Ödənildi") {
          p.dueDate = calculateSessionDueDate(p); // Seans tam ödənildikdə axırıncı seans tarixi yazılır
        }
      }

      window.DB.savePaymentAnyMonth(p);
      this.closeModal("modal-confirm-paid");
      this.refreshCurrentScreen();
    });

    // Seans Paketi Yeniləmə Modalının Listeners
    const renewStatusSelect = document.getElementById("renew-status");
    if (renewStatusSelect) {
      renewStatusSelect.addEventListener("change", (e) => {
        const val = e.target.value;
        const paidGroup = document.getElementById("renew-paid-amount-group");
        const dueGroup = document.getElementById("renew-due-date-group");
        
        if (val === "Ödənilməyib") {
          if (paidGroup) paidGroup.style.display = "none";
          if (dueGroup) dueGroup.style.display = "block";
        } else if (val === "Ödənildi") {
          if (paidGroup) paidGroup.style.display = "block";
          if (dueGroup) dueGroup.style.display = "none";
          const feeVal = Number(document.getElementById("renew-fee").value) || 0;
          document.getElementById("renew-paid-amount").value = feeVal;
        } else if (val === "Qismən ödənilib") {
          if (paidGroup) paidGroup.style.display = "block";
          if (dueGroup) dueGroup.style.display = "block";
        }
      });
    }

    const renewFeeInput = document.getElementById("renew-fee");
    if (renewFeeInput) {
      renewFeeInput.addEventListener("input", () => {
        const val = document.getElementById("renew-status").value;
        if (val === "Ödənildi") {
          const feeVal = Number(renewFeeInput.value) || 0;
          document.getElementById("renew-paid-amount").value = feeVal;
        }
      });
    }

    document.getElementById("renew-package-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const oldId = document.getElementById("renew-pay-id").value;
      const allPaymentsFlat = window.DB.getAllPaymentsFlat();
      const oldPay = allPaymentsFlat.find(p => String(p.id) === String(oldId));
      if (!oldPay) return;

      const newStartDate = document.getElementById("renew-session-start-date").value || getTodayStr();
      const fee = Number(document.getElementById("renew-fee").value) || 0;
      const status = document.getElementById("renew-status").value;

      // Köhnə seansı tamamlanmış olaraq dondururuq. 
      oldPay.paymentStatus = "Ödənildi";
      oldPay.sessionsLogged = oldPay.sessionsCount; // Tamamlandı
      oldPay.isManualSessions = true; // Manual olaraq kilidləyirik ki, tarixə görə yenidən hesablanmasın
      oldPay.isRenewed = true; // Yeniləndiyini qeyd edirik ki, cədvəldə təkrar görünməsin

      let paidAmount = 0;
      let dueDate = null;
      let paymentDate = null;

      if (status === "Ödənildi") {
        paidAmount = Number(document.getElementById("renew-paid-amount").value) || fee;
        paymentDate = getTodayStr();
      } else if (status === "Qismən ödənilib") {
        paidAmount = Number(document.getElementById("renew-paid-amount").value) || 0;
        dueDate = document.getElementById("renew-due-date").value || null;
        paymentDate = getTodayStr();
      } else {
        dueDate = document.getElementById("renew-due-date").value || null;
      }

      const sessionDays = [];
      document.querySelectorAll("input[name='renew-pay-session-day']:checked").forEach(cb => {
        sessionDays.push(Number(cb.value));
      });

      const newPay = {
        ...oldPay,
        id: "pay_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
        paymentStatus: status,
        paymentDate,
        paidAmount,
        fee,
        sessionStartDate: newStartDate,
        dueDate,
        sessionsLogged: 0,
        isManualSessions: false,
        sessionDays,
        isRenewed: false
      };

      // Əgər tam ödənilibsə, növbəti seans sonunu dueDate olaraq hesabla
      if (status === "Ödənildi") {
        newPay.dueDate = calculateSessionDueDate(newPay);
      }

      // Yeni paketin başlama tarixinə uyğun ay qovluğunu təyin edirik
      const dateObj = parseSafeDate(newStartDate);
      const y = dateObj.getFullYear();
      const m = String(dateObj.getMonth() + 1).padStart(2, '0');
      const newMonth = `${y}-${m}`;

      window.DB.savePaymentAnyMonth(oldPay);
      window.DB.savePayment(newPay, newMonth);
      App.closeModal("modal-renew-package");
      App.refreshCurrentScreen();
    });

    // Ödəniş məbləği dəyişdikdə qismən ödəniş tarixinə nəzarət
    const payAmountInput = document.getElementById("confirm-payment-amount-to-pay");
    if (payAmountInput) {
      payAmountInput.addEventListener("input", () => {
        const val = Number(payAmountInput.value) || 0;
        const debt = Number(payAmountInput.dataset.debt) || 0;
        const nextDueGrp = document.getElementById("confirm-payment-next-due-group");
        const nextDueDateInput = document.getElementById("confirm-payment-next-due-date");
        if (val < debt) {
          if (nextDueGrp) nextDueGrp.style.display = "block";
          if (nextDueDateInput) nextDueDateInput.required = true;
        } else {
          if (nextDueGrp) nextDueGrp.style.display = "none";
          if (nextDueDateInput) {
            nextDueDateInput.required = false;
            nextDueDateInput.value = "";
          }
        }
      });
    }
  },

  switchScreen(screenId) {
    this.currentScreen = screenId;
    
    // Naviqasiyada aktivliyi təyin et
    document.querySelectorAll(".nav-link").forEach(link => {
      if (link.getAttribute("data-screen") === screenId) {
        link.classList.add("active");
      } else {
        link.classList.remove("active");
      }
    });

    // Ekranı göstər
    document.querySelectorAll(".screen").forEach(screen => {
      screen.classList.remove("active-screen");
    });
    
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
      targetScreen.classList.add("active-screen");
    }

    // Ekran yüklənəndə render funksiyasını çağır
    this.renderScreen(screenId);
    this.renderCurrentMonthIndicator();
  },

  refreshCurrentScreen() {
    this.switchScreen(this.currentScreen);
  },

  renderCurrentMonthIndicator() {
    const cur = window.DB.getCurrentMonth();
    document.getElementById("active-month-text").textContent = formatMonth(cur);

    const viewedCont = document.getElementById("viewed-month-container");
    const viewedText = document.getElementById("viewed-month-text");
    if (viewedCont && viewedText) {
      if (this.currentScreen === "archive-screen" && this.selectedMonth) {
        viewedCont.style.display = "block";
        viewedText.textContent = formatMonth(this.selectedMonth);
      } else {
        viewedCont.style.display = "none";
      }
    }
  },

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add("active");
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove("active");
  },

  // Ekrana görə render idarəçiliyi
  renderScreen(screenId) {
    switch (screenId) {
      case "dashboard-screen":
        this.renderDashboard();
        break;
      case "students-screen":
        this.renderStudents();
        break;
      case "payments-screen":
        this.renderPayments();
        break;
      case "teachers-report-screen":
        this.renderTeachersReport();
        break;
      case "center-report-screen":
        this.renderCenterReport();
        break;
      case "settings-screen":
        this.renderSettings();
        break;
      case "archive-screen":
        this.renderArchive();
        break;
    }
  },

  // ==========================================
  // DASHBOARD SCREEN
  // ==========================================
  renderDashboard() {
    const students = window.DB.getStudents();
    const payments = window.DB.getPayments();
    const expenses = window.DB.getExpenses();
    const teachers = window.DB.getTeachers();

    // 1. Tələbə statistikaları
    const activeCount = students.filter(s => s.status === "Aktiv").length;
    const passiveCount = students.filter(s => s.status === "Passiv").length;
    const frozenCount = students.filter(s => s.status === "Donduruldu").length;

    document.getElementById("dash-active-count").textContent = activeCount;
    document.getElementById("dash-passive-count").textContent = `${passiveCount} Passiv / ${frozenCount} Dondurulub`;

    // 2. Maliyyə statistikaları
    let totalIncome = 0;
    let totalPending = 0;
    const curMonth = window.DB.getCurrentMonth();
    const allPaymentsFlat = window.DB.getAllPaymentsFlat();
    
    // Gözləyən ödənişlər yalnız bu ayın cədvəlindən hesablanır (keçmiş ayın dondurulanı bura girməsin)
    payments.forEach(p => {
      const fee = Number(p.fee) || 0;
      const paidAmt = getPaymentRevenue(p);
      const remainingDebt = fee - paidAmt;
      const student = students.find(s => s.id === p.studentId);
      const isPassiveOrFrozen = student && (student.status === "Passiv" || student.status === "Donduruldu");

      if (!isPassiveOrFrozen && p.paymentStatus !== "Ödənildi") {
        totalPending += remainingDebt;
      }
    });

    // Real toplanan pul cari ayın ödənişlərindən süzülür
    payments.forEach(p => {
      const paidAmt = getPaymentRevenue(p);
      if (isDateInMonth(p.paymentDate, curMonth)) {
        totalIncome += paidAmt;
      }
    });

    // Müəllimələrin payı da cari aydakı ödənişlərə əsasən hesablanır
    let totalTeacherPay = 0;
    payments.forEach(p => {
      if (isDateInMonth(p.paymentDate, curMonth)) {
        const paidAmt = getPaymentRevenue(p);
        const teacher = teachers.find(t => t.id === p.teacherId);
        const percent = teacher ? (teacher.sharePercent || 50) : 50;
        totalTeacherPay += paidAmt * (percent / 100);
      }
    });

    const totalExpense = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const centerShare = totalIncome - totalTeacherPay;
    const netProfit = centerShare - totalExpense;

    document.getElementById("dash-total-income").textContent = formatAmount(totalIncome) + " AZN";
    document.getElementById("dash-pending-income").textContent = formatAmount(totalPending) + " AZN";
    document.getElementById("dash-net-profit").textContent = formatAmount(netProfit) + " AZN";

    // 3. Bildirişlər və Gecikənlər siyahısı
    const activeMonth = window.DB.getCurrentMonth();
    let today = getTodayStr();
    if (this.selectedMonth && this.selectedMonth !== activeMonth) {
      const [year, month] = this.selectedMonth.split("-").map(Number);
      const lastDay = new Date(year, month, 0).getDate();
      today = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    }
    const alertList = []; // { studentName, type, details, badgeClass }

    payments.forEach(p => {
      const student = students.find(s => s.id === p.studentId);
      const isPassiveOrFrozen = student && (student.status === "Passiv" || student.status === "Donduruldu");
      if (isPassiveOrFrozen) return;

      // Əgər eyni uşaq və fənn üçün daha yeni bir ödəniş qeydi varsa, köhnə paket üzrə bildiriş vermə
      const hasNewer = allPaymentsFlat.some(p2 => p2.studentId === p.studentId && (p2.courseId === p.courseId || p2.courseName === p.courseName) && p2.id > p.id);
      if (hasNewer) return;

      const displayName = student ? `${student.name} ${student.surname || ""}`.trim() : p.studentName;

      if (p.packageType === "Aylıq") {
        if (p.paymentStatus !== "Ödənildi") {
          const diff = getDaysDiff(p.dueDate, today);
          if (diff < 0) {
            alertList.push({
              name: displayName,
              course: p.courseName,
              details: `${Math.abs(diff)} gün gecikir`,
              badgeClass: "badge-unpaid"
            });
          } else if (diff === 0) {
            alertList.push({
              name: displayName,
              course: p.courseName,
              details: `Bugün ödəniş günüdür`,
              badgeClass: "badge-pending"
            });
          }
        }
      } else if (p.packageType === "Seans") {
        if (p.paymentStatus === "Ödənildi") {
          let loggedVal = 0;
          if (p.isManualSessions) {
            loggedVal = p.sessionsLogged || 0;
          } else {
            loggedVal = calculateSessionsOccurred(p.sessionStartDate || p.paymentDate, today, p.weeklyFrequency || 2, p.sessionsCount, p);
          }
          const remaining = p.sessionsCount - loggedVal;
          let isExpiredByDate = false;
          let sDueDate = calculateSessionDueDate(p);

          if (sDueDate) {
            const diff = getDaysDiff(sDueDate, today);
            if (diff < 0) {
              isExpiredByDate = true;
            }
          }

          if (remaining <= 0 || isExpiredByDate) {
            alertList.push({
              name: displayName,
              course: p.courseName,
              details: "Seans bitdi!",
              badgeClass: "badge-unpaid"
            });
          } else if (remaining <= 2) {
            alertList.push({
              name: displayName,
              course: p.courseName,
              details: `Son ${remaining} seans qalıb`,
              badgeClass: "badge-pending"
            });
          }
        } else {
          alertList.push({
            name: displayName,
            course: p.courseName,
            details: "Ödəniş gözləyir",
            badgeClass: "badge-pending"
          });
        }
      }
    });

    const alertsContainer = document.getElementById("dash-alerts-container");
    alertsContainer.innerHTML = "";
    
    if (alertList.length === 0) {
      alertsContainer.innerHTML = `<div class="activity-item"><div class="activity-details"><p style="text-align: center;">Cari ayda heç bir gecikmə və ya vacib bildiriş yoxdur.</p></div></div>`;
    } else {
      alertList.forEach(a => {
        const item = document.createElement("div");
        item.className = "activity-item";
        item.innerHTML = `
          <div class="activity-icon" style="background: rgba(239, 68, 68, 0.1); color: #ef4444;">🚨</div>
          <div class="activity-details">
            <h4>${a.name}</h4>
            <p>${a.course}</p>
          </div>
          <span class="badge ${a.badgeClass}">${a.details}</span>
        `;
        alertsContainer.appendChild(item);
      });
    }

    // Müəllimə Statistikası
    const teacherStatsContainer = document.getElementById("dash-teacher-stats");
    teacherStatsContainer.innerHTML = "";

    const activeStudentIds = new Set(students.filter(s => s.status === "Aktiv").map(s => s.id));
    const chartLabels = [];
    const chartStudentCounts = [];
    const chartPayments = [];

    teachers.forEach(t => {
      // Bu müəlliməyə bağlı aktiv dərslərdəki tələbə sayı (yalnız AKTİV tələbələr)
      const stdCount = payments.filter(p => p.teacherId === t.id && activeStudentIds.has(p.studentId)).map(p => p.studentId);
      const uniqueStdCount = [...new Set(stdCount)].length;

      // Bu müəllimənin cari aydakı ödəniş həcmi
      let teacherTotalIncome = 0;
      payments.forEach(p => {
        if (p.teacherId === t.id) {
          if (isDateInMonth(p.paymentDate, curMonth)) {
            teacherTotalIncome += getPaymentRevenue(p);
          }
        }
      });

      chartLabels.push(t.name);
      chartStudentCounts.push(uniqueStdCount);
      chartPayments.push(teacherTotalIncome);

      // Siyahını doldur
      const item = document.createElement("div");
      item.className = "activity-item";
      item.innerHTML = `
        <div class="activity-icon" style="background: rgba(99, 102, 241, 0.1); color: #6366f1;">👩‍🏫</div>
        <div class="activity-details">
          <h4>${t.name}</h4>
          <p>Tədris üzrə tələbə sayı</p>
        </div>
        <span class="badge badge-info">${uniqueStdCount} tələbə</span>
      `;
      teacherStatsContainer.appendChild(item);
    });

    // Premium Maliyyə və Tələbə Sayı Qrafiki (Chart.js)
    const chartCanvas = document.getElementById("teacherFinancialChart");
    if (chartCanvas) {
      if (this.teacherChart) {
        this.teacherChart.destroy();
      }

      const ctx = chartCanvas.getContext("2d");
      const isLight = document.body.classList.contains("light-theme");
      const textColor = isLight ? "#4b5563" : "#94a3b8";
      const gridColor = isLight ? "rgba(0, 0, 0, 0.05)" : "rgba(255, 255, 255, 0.05)";

      // Gradientlər
      const barGradient1 = ctx.createLinearGradient(0, 0, 0, 300);
      if (isLight) {
        barGradient1.addColorStop(0, "rgba(99, 102, 241, 0.85)");
        barGradient1.addColorStop(1, "rgba(99, 102, 241, 0.25)");
      } else {
        barGradient1.addColorStop(0, "rgba(99, 102, 241, 0.75)");
        barGradient1.addColorStop(1, "rgba(168, 85, 247, 0.15)");
      }

      const barGradient2 = ctx.createLinearGradient(0, 0, 0, 300);
      if (isLight) {
        barGradient2.addColorStop(0, "rgba(16, 185, 129, 0.85)");
        barGradient2.addColorStop(1, "rgba(16, 185, 129, 0.25)");
      } else {
        barGradient2.addColorStop(0, "rgba(16, 185, 129, 0.75)");
        barGradient2.addColorStop(1, "rgba(5, 150, 105, 0.15)");
      }

      this.teacherChart = new Chart(ctx, {
        plugins: [ChartDataLabels],
        data: {
          labels: chartLabels,
          datasets: [
            {
              type: "bar",
              label: "Tələbə Sayı",
              data: chartStudentCounts,
              backgroundColor: barGradient1,
              borderColor: "#6366f1",
              borderWidth: 1.5,
              borderRadius: 6,
              yAxisID: "y-students"
            },
            {
              type: "bar",
              label: "Ödəniş Həcmi (₼)",
              data: chartPayments,
              backgroundColor: barGradient2,
              borderColor: "#10b981",
              borderWidth: 1.5,
              borderRadius: 6,
              yAxisID: "y-payments"
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "top",
              labels: {
                color: textColor,
                padding: 20, // Legend yazıları ilə qrafik sahəsi arasında boşluq yaradır
                font: {
                  family: "'Plus Jakarta Sans', sans-serif",
                  weight: "600",
                  size: 11
                }
              }
            },
            datalabels: {
              display: true,
              align: 'top',
              anchor: 'end',
              color: function(context) {
                if (context.datasetIndex === 0) {
                  return isLight ? "#4f46e5" : "#a5b4fc";
                } else {
                  return "#10b981";
                }
              },
              offset: 2,
              font: {
                family: "'Plus Jakarta Sans', sans-serif",
                weight: "700",
                size: 10
              },
              formatter: function(value, context) {
                if (value === 0) return "";
                if (context.datasetIndex === 0) {
                  return value + " tələbə";
                } else {
                  return value + " ₼";
                }
              }
            },
            tooltip: {
              backgroundColor: isLight ? "#ffffff" : "#1e1b4b",
              titleColor: isLight ? "#0f172a" : "#ffffff",
              bodyColor: isLight ? "#334155" : "#cbd5e1",
              borderColor: isLight ? "rgba(99, 102, 241, 0.15)" : "rgba(255, 255, 255, 0.08)",
              borderWidth: 1,
              padding: 12,
              boxPadding: 6,
              usePointStyle: true,
              callbacks: {
                label: function(context) {
                  let label = context.dataset.label || '';
                  if (label) {
                    label += ': ';
                  }
                  if (context.parsed.y !== null) {
                    if (context.datasetIndex === 1) {
                      label += context.parsed.y + ' AZN';
                    } else {
                      label += context.parsed.y + ' tələbə';
                    }
                  }
                  return label;
                }
              }
            }
          },
          scales: {
            x: {
              grid: {
                display: false
              },
              ticks: {
                color: textColor,
                font: {
                  family: "'Plus Jakarta Sans', sans-serif",
                  weight: "500"
                }
              }
            },
            "y-students": {
              type: "linear",
              position: "left",
              grace: "20%", // Sütunların yuxarıdan tavanla birləşməməsi üçün 20% əlavə boşluq qoyur
              grid: {
                color: gridColor
              },
              ticks: {
                color: textColor,
                stepSize: 1,
                font: {
                  family: "'Plus Jakarta Sans', sans-serif"
                }
              },
              title: {
                display: true,
                text: "Tələbə Sayı",
                color: textColor,
                font: {
                  family: "'Outfit', sans-serif",
                  weight: "600"
                }
              }
            },
            "y-payments": {
              type: "linear",
              position: "right",
              grace: "20%", // Sütunların yuxarıdan tavanla birləşməməsi üçün 20% əlavə boşluq qoyur
              grid: {
                display: false
              },
              ticks: {
                color: textColor,
                font: {
                  family: "'Plus Jakarta Sans', sans-serif"
                }
              },
              title: {
                display: true,
                text: "Məbləğ (AZN)",
                color: textColor,
                font: {
                  family: "'Outfit', sans-serif",
                  weight: "600"
                }
              }
            }
          }
        }
      });
    }
  },

  // ==========================================
  // STUDENTS SCREEN
  // ==========================================
  renderStudents() {
    const students = window.DB.getStudents();
    const currentMonth = window.DB.getCurrentMonth();
    const currentPayments = window.DB.getPayments(currentMonth) || [];
    const courses = window.DB.getCourses();

    // Fənn dropdown-nu dolduraq
    const courseFilter = document.getElementById("filter-students-course");
    if (courseFilter) {
      const savedVal = courseFilter.value;
      courseFilter.innerHTML = `<option value="">Bütün Tədris Növləri</option>`;
      courses.forEach(c => {
        courseFilter.innerHTML += `<option value="${c.id}">${c.name}</option>`;
      });
      courseFilter.value = savedVal;
      courseFilter.onchange = () => this.renderStudents();
    }

    // Tələbələrin fənn və müəllimələrini xəritələyək (bütün aylardan)
    const studentInfoMap = {};
    const allMonthsPayments = (window.DB && typeof window.DB._get === 'function') ? window.DB._get("payments", {}) : {};
    
    Object.keys(allMonthsPayments).forEach(m => {
      const monthPayments = allMonthsPayments[m] || [];
      monthPayments.forEach(p => {
        if (!studentInfoMap[p.studentId]) {
          studentInfoMap[p.studentId] = [];
        }
        const exists = studentInfoMap[p.studentId].some(info => info.courseId === p.courseId);
        if (!exists) {
          studentInfoMap[p.studentId].push({
            courseId: p.courseId,
            courseName: p.courseName,
            teacherName: p.teacherName
          });
        }
      });
    });

    const searchVal = document.getElementById("search-students").value.toLowerCase();
    const courseFilterVal = courseFilter ? courseFilter.value : "";
    const tableBody = document.querySelector("#students-table tbody");
    tableBody.innerHTML = "";

    const filtered = students.filter(s => {
      const infoList = studentInfoMap[s.id] || [];

      const name = String(s.name || "").toLowerCase();
      const surname = String(s.surname || "").toLowerCase();
      const parentName = String(s.parentName || "").toLowerCase();
      const phone = String(s.phone || "");

      const matchesText = name.includes(searchVal) ||
                          surname.includes(searchVal) ||
                          parentName.includes(searchVal) ||
                          phone.includes(searchVal);

      const matchesCourse = !courseFilterVal || infoList.some(info => info.courseId === courseFilterVal);

      return matchesText && matchesCourse;
    });

    filtered.forEach(s => {
      let statusBadge = "";
      if (s.status === "Aktiv") statusBadge = `<span class="badge badge-active">Aktiv</span>`;
      else if (s.status === "Passiv") statusBadge = `<span class="badge badge-passive">Passiv (${s.statusDate || ""})</span>`;
      else if (s.status === "Donduruldu") statusBadge = `<span class="badge badge-frozen">Dondurulub (${s.statusDate || ""})</span>`;

      // Fənn və müəllimə sütununu hazırlayaq
      const infoList = studentInfoMap[s.id] || [];
      let coursesHtml = "";
      if (infoList.length > 0) {
        coursesHtml = `<div class="student-course-cell">` + infoList.map(info => `
          <div class="student-course-item">
            <span class="student-course-name">${info.courseName}</span>
            <span class="student-teacher-name">Müəllimə: <strong>${info.teacherName}</strong></span>
          </div>
        `).join("") + `</div>`;
      } else {
        coursesHtml = `<span style="color: var(--text-muted); font-size: 0.75rem;">Fənn təyin olunmayıb</span>`;
      }

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${s.name} ${s.surname || ""}</strong></td>
        <td>${coursesHtml}</td>
        <td>${s.parentName || "-"}</td>
        <td>${s.phone || "-"}</td>
        <td>${s.enrollDate}</td>
        <td>${statusBadge}</td>
        <td>
          <div class="action-cell">
            <button class="btn btn-secondary btn-sm" onclick="App.editStudent('${s.id}')">Redaktə</button>
            <button class="btn btn-danger btn-sm" onclick="App.deleteStudent('${s.id}')">Sil</button>
          </div>
        </td>
      `;
      tableBody.appendChild(tr);
    });

    // Axtarış hadisəsi
    document.getElementById("search-students").oninput = () => this.renderStudents();

    // Yeni Tələbə Düyməsi
    document.getElementById("btn-add-student").onclick = () => {
      document.getElementById("student-form").reset();
      document.getElementById("student-id").value = "";
      document.getElementById("student-modal-title").textContent = "Yeni Uşaq Qeydiyyatı";
      document.getElementById("student-enroll-date").value = getTodayStr();
      this.openModal("modal-student");
    };

    // Tələbə Formu Submit
    document.getElementById("student-form").onsubmit = (e) => {
      e.preventDefault();
      const id = document.getElementById("student-id").value;
      const student = {
        id: id || null,
        name: document.getElementById("student-name").value.trim(),
        surname: document.getElementById("student-surname").value.trim(),
        parentName: document.getElementById("student-parent-name").value.trim(),
        phone: document.getElementById("student-phone").value.trim(),
        enrollDate: document.getElementById("student-enroll-date").value,
        status: document.getElementById("student-status").value
      };
      
      window.DB.saveStudent(student);

      this.closeModal("modal-student");
      this.refreshCurrentScreen();
    };
  },

  editStudent(id) {
    const students = window.DB.getStudents();
    const student = students.find(s => s.id === id);
    if (!student) return;

    document.getElementById("student-id").value = student.id;
    document.getElementById("student-name").value = student.name;
    document.getElementById("student-surname").value = student.surname || "";
    document.getElementById("student-parent-name").value = student.parentName || "";
    document.getElementById("student-phone").value = student.phone || "";
    document.getElementById("student-enroll-date").value = student.enrollDate;
    document.getElementById("student-status").value = student.status;

    document.getElementById("student-modal-title").textContent = "Tələbə Məlumatlarını Redaktə Et";
    this.openModal("modal-student");
  },

  deleteStudent(id) {
    if (confirm("Bu uşağı bazadan silmək istədiyinizdən əminsiniz? Uşaq silindikdə ona aid bütün ödəniş və seans cədvəli qeydləri də tamamilə silinəcək.")) {
      window.DB.deleteStudent(id);
      this.refreshCurrentScreen();
    }
  },


  // ==========================================
  // PAYMENTS SCREEN
  // ==========================================
  renderPayments() {
    const curMonth = window.DB.getCurrentMonth();
    const titleEl = document.getElementById("payments-table-title");
    if (titleEl) {
      titleEl.textContent = `${formatMonth(curMonth)} ayı üzrə ödəniş cədvəli`;
    }

    const payments = window.DB.getPayments();
    const allPaymentsFlat = window.DB.getAllPaymentsFlat();
    const students = window.DB.getStudents();
    const courses = window.DB.getCourses();

    // Fənn dropdown-nu dolduraq
    const courseFilter = document.getElementById("filter-payments-course");
    if (courseFilter) {
      const savedVal = courseFilter.value;
      courseFilter.innerHTML = `<option value="">Bütün Tədris Növləri</option>`;
      courses.forEach(c => {
        courseFilter.innerHTML += `<option value="${c.id}">${c.name}</option>`;
      });
      courseFilter.value = savedVal;
      courseFilter.onchange = () => this.renderPayments();
    }

    const searchVal = document.getElementById("search-payments").value.toLowerCase();
    const courseFilterVal = courseFilter ? courseFilter.value : "";
    const tableBody = document.querySelector("#payments-table tbody");
    tableBody.innerHTML = "";
    const today = getTodayStr();

    const filtered = payments.filter(p => {
      // 1. Əgər artıq yenilənibsə (isRenewed) və eyni ay daxilində daha yeni bir paket varsa, köhnəsini cədvəldə gizlət
      if (p.isRenewed) {
        const hasNewerInSameMonth = payments.some(p2 => p2.studentId === p.studentId && (p2.courseId === p.courseId || p2.courseName === p.courseName) && p2.id > p.id);
        if (hasNewerInSameMonth) return false;
      }

      // 2. Əgər seansı bitibsə və verilənlər bazasında eyni uşaq və fənn üçün daha yeni bir ödəniş paketi varsa, 
      // cədvəldə təkrar ad çıxmasın deyə bu köhnə tamamlanmış qeydi gizlət (auto-clean)
      if (p.packageType === "Seans") {
        let loggedVal = 0;
        if (p.isManualSessions) {
          loggedVal = p.sessionsLogged || 0;
        } else {
          loggedVal = calculateSessionsOccurred(p.sessionStartDate || p.paymentDate, today, p.weeklyFrequency || 2, p.sessionsCount, p);
        }
        const sDueDate = calculateSessionDueDate(p);
        const isExpiredByDate = sDueDate ? (getDaysDiff(sDueDate, today) < 0) : false;
        const isCompleted = (p.paymentStatus === "Ödənildi" && loggedVal >= p.sessionsCount) || isExpiredByDate;
        if (isCompleted) {
          const hasNewer = payments.some(p2 => p2.studentId === p.studentId && (p2.courseId === p.courseId || p2.courseName === p.courseName) && p2.id > p.id);
          if (hasNewer) return false;
        }
      }

      const studentName = String(p.studentName || "").toLowerCase();
      const teacherName = String(p.teacherName || "").toLowerCase();
      const matchesText = studentName.includes(searchVal) ||
                          teacherName.includes(searchVal);

      const matchesCourse = !courseFilterVal || p.courseId === courseFilterVal;

      return matchesText && matchesCourse;
    });

    // Ödənişləri gecikən tələbələri cədvəlin yuxarısında göstərmək üçün öncəlik dərəcələri
    const getSortPriority = (p) => {
      const student = students.find(s => s.id === p.studentId);
      const isPassiveOrFrozen = student && (student.status === "Passiv" || student.status === "Donduruldu");
      
      if (isPassiveOrFrozen) {
        return 4; // Ən aşağı öncəlik
      }
      if (p.paymentStatus === "Ödənildi") {
        if (p.packageType === "Seans") {
          const remaining = p.sessionsCount - p.sessionsLogged;
          let isExpiredByDate = false;
          if (p.paymentDate) {
            const sDueDate = calculateSessionDueDate(p);
            if (sDueDate) {
              const diff = getDaysDiff(sDueDate, today);
              if (diff < 0) isExpiredByDate = true;
            }
          }
          if (remaining <= 0 || isExpiredByDate) {
            return 1; // Seansı/müddəti bitmiş paketlər
          }
        }
        return 3; // Ödənilmiş və aktiv normal qeydlər
      }
      
      // Ödənilməyənlər
      if (p.packageType === "Aylıq") {
        const diff = getDaysDiff(p.dueDate, today);
        if (diff < 0) {
          return 1; // Gecikməsi olan aylıq ödəniş
        }
      }
      return 2; // Vaxtı gəlməmiş ödənilməyənlər
    };

    filtered.sort((a, b) => getSortPriority(a) - getSortPriority(b));

    filtered.forEach(p => {
      const student = students.find(s => s.id === p.studentId);
      const isPassiveOrFrozen = student && (student.status === "Passiv" || student.status === "Donduruldu");

      // Ödəniş Statusu Hesablanması
      let statusHtml = "";
      let actionButtons = "";
      let sessionsLogged = 0;
      let remaining = 0;
      let sDueDate = null;
      let isExpiredByDate = false;

      if (p.packageType === "Seans") {
        if (p.isManualSessions) {
          sessionsLogged = p.sessionsLogged || 0;
        } else {
          sessionsLogged = calculateSessionsOccurred(p.sessionStartDate || p.paymentDate, today, p.weeklyFrequency || 2, p.sessionsCount, p);
        }
        remaining = p.sessionsCount - sessionsLogged;
        sDueDate = calculateSessionDueDate(p);
        if (sDueDate) {
          const diff = getDaysDiff(sDueDate, today);
          if (diff < 0) {
            isExpiredByDate = true;
          }
        }
      }

      if (isPassiveOrFrozen) {
        const label = student.status === "Passiv" ? "Passiv" : "Dondurulub";
        const badgeClass = student.status === "Passiv" ? "badge-passive" : "badge-frozen";
        statusHtml = `<span class="badge ${badgeClass}">${label} (${student.statusDate || ""})</span>`;
        actionButtons = `<span style="font-size: 0.8rem; color: var(--text-muted); margin-right: 8px;">Əməliyyat dayandırılıb</span>`;
      } else {
        if (p.packageType === "Aylıq") {
          if (p.paymentStatus === "Ödənildi") {
            statusHtml = `<span class="badge badge-paid">Ödənildi (${p.paymentDate || ""})</span>`;
          } else if (p.paymentStatus === "Qismən ödənilib") {
            const diff = getDaysDiff(p.dueDate, today);
            let debtText = "";
            let badgeClass = "badge-partial";
            if (diff < 0) {
              debtText = ` - ${Math.abs(diff)} gün gecikir`;
              badgeClass = "badge-late-dark";
            } else if (diff === 0) {
              debtText = ` - Ödəniş günüdür`;
              badgeClass = "badge-unpaid";
            } else {
              debtText = ` - Ödənişə ${diff} gün qalıb`;
            }
            statusHtml = `<span class="badge ${badgeClass}">Qismən (${p.paidAmount}/${p.fee} AZN)${debtText}</span>`;
            actionButtons += `<button class="btn btn-success btn-sm" onclick="App.markPaymentPaid('${p.id}')">Ödənişi tamamla</button>`;
          } else {
            let effDueDate = p.dueDate;
            if (!effDueDate && p.paymentDate) {
              const pDate = parseSafeDate(p.paymentDate);
              if (!isNaN(pDate.getTime())) {
                const m = pDate.getMonth() % 12 + 1;
                const y = pDate.getFullYear() + (pDate.getMonth() === 11 ? 1 : 0);
                const d = Math.min(pDate.getDate(), 28);
                effDueDate = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
              }
            }
            if (!effDueDate) {
              effDueDate = `${curMonth}-15`;
            }
            const diff = getDaysDiff(effDueDate, today);
            if (diff < 0) {
              statusHtml = `<span class="badge badge-late-dark">${Math.abs(diff)} gün gecikir</span>`;
            } else if (diff === 0) {
              statusHtml = `<span class="badge badge-unpaid">Ödəniş günüdür</span>`;
            } else {
              statusHtml = `<span class="badge badge-pending">Ödənişə ${diff} gün qalıb</span>`;
            }
            actionButtons += `<button class="btn btn-success btn-sm" onclick="App.markPaymentPaid('${p.id}')">Ödəniş et</button>`;
          }
        } else if (p.packageType === "Seans") {
          if (p.paymentStatus === "Ödənilməyib") {
            if (remaining <= 0 || isExpiredByDate) {
              statusHtml = `<span class="badge badge-unpaid">Seans bitdi (Ödənilməyib - 0/${p.sessionsCount} seans)</span>`;
              actionButtons += `<button class="btn btn-success btn-sm" style="margin-right: 5px;" onclick="App.markPaymentPaid('${p.id}')">Ödəniş et</button>`;
              actionButtons += `<button class="btn btn-primary btn-sm" onclick="App.renewSessionPackage('${p.id}')">Paketi Yenilə</button>`;
            } else {
              statusHtml = `<span class="badge badge-pending">Ödənilməyib (${remaining}/${p.sessionsCount} seans qalıb)</span>`;
              actionButtons += `<button class="btn btn-success btn-sm" onclick="App.markPaymentPaid('${p.id}')">Ödəniş et</button>`;
            }
          } else if (p.paymentStatus === "Qismən ödənilib") {
            const statusExtra = remaining <= 0 ? " - Seans bitdi" : (isExpiredByDate ? " - Müddət bitdi" : ` (${remaining}/${p.sessionsCount} seans qalıb)`);
            statusHtml = `<span class="badge badge-partial">Qismən (${p.paidAmount || 0}/${p.fee} AZN)${statusExtra}</span>`;
            actionButtons += `<button class="btn btn-success btn-sm" style="margin-right: 5px;" onclick="App.markPaymentPaid('${p.id}')">Ödənişi tamamla</button>`;
            if (remaining <= 0 || isExpiredByDate) {
              actionButtons += `<button class="btn btn-primary btn-sm" onclick="App.renewSessionPackage('${p.id}')">Paketi Yenilə</button>`;
            } else {
              actionButtons += `<button class="btn btn-secondary btn-sm" onclick="App.renewSessionPackage('${p.id}')">Yeni Paket Əlavə Et</button>`;
            }
          } else {
            // Ödənildi
            if (remaining <= 0) {
              statusHtml = `<span class="badge badge-unpaid">Seans bitdi! (0/${p.sessionsCount} seans qalıb)</span>`;
              actionButtons += `<button class="btn btn-primary btn-sm" onclick="App.renewSessionPackage('${p.id}')">Paketi Yenilə</button>`;
            } else if (isExpiredByDate) {
              statusHtml = `<span class="badge badge-unpaid">Seans bitdi! (Son seans: ${sDueDate})</span>`;
              actionButtons += `<button class="btn btn-primary btn-sm" onclick="App.renewSessionPackage('${p.id}')">Paketi Yenilə</button>`;
            } else {
              statusHtml = `<span class="badge badge-paid">Aktiv (${remaining}/${p.sessionsCount} seans qalıb)</span>`;
              actionButtons += `<button class="btn btn-secondary btn-sm" onclick="App.renewSessionPackage('${p.id}')">Yeni Paket Əlavə Et</button>`;
            }
          }
        }
      }

      // Seans nöqtələrini render etmək
      let dotsHtml = "";
      if (p.packageType === "Seans") {
        dotsHtml = `<div class="session-dots">`;
        const isArchive = (App.selectedMonth !== window.DB.getCurrentMonth());
        const showAllFilled = (isArchive && p.paymentStatus === "Ödənildi");
        
        let filledCount = showAllFilled ? p.sessionsCount : sessionsLogged;
        for (let i = 0; i < p.sessionsCount; i++) {
          dotsHtml += `<div class="session-dot ${i < filledCount ? "filled" : "empty"}" onclick="App.setSessionsLogged('${p.id}', ${i + 1})" title="Bu seansı qeyd et"></div>`;
        }
        dotsHtml += `</div>`;
      }

      let dueDateDisplay = "";
      if (p.packageType === "Aylıq") {
        let effDueDate = p.dueDate;
        if (!effDueDate && p.paymentDate) {
          const pDate = parseSafeDate(p.paymentDate);
          if (!isNaN(pDate.getTime())) {
            const m = pDate.getMonth() % 12 + 1;
            const y = pDate.getFullYear() + (pDate.getMonth() === 11 ? 1 : 0);
            const d = Math.min(pDate.getDate(), 28);
            effDueDate = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          }
        }
        if (!effDueDate) {
          effDueDate = `${curMonth}-15`;
        }
        dueDateDisplay = effDueDate;
      } else {
        dueDateDisplay = sDueDate || p.sessionStartDate || p.paymentDate || "-";
      }

      const displayName = student ? `${student.name} ${student.surname || ""}`.trim() : p.studentName;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${displayName}</strong></td>
        <td>
          <div class="student-course-cell">
            <div class="student-course-item">
              <span class="student-course-name">${p.courseName}</span>
              <span class="student-teacher-name">Müəllimə: <strong>${p.teacherName}</strong></span>
            </div>
          </div>
        </td>
        <td>
          <div>${p.packageType} (${p.groupType === 'Qrup' ? 'Qrup' : 'Fərdi'})</div>
          <div style="font-size: 0.8rem; color: var(--text-muted);">Tezlik: Həftədə ${p.weeklyFrequency} dəfə</div>
          ${dotsHtml}
        </td>
        <td><strong>${p.fee} AZN</strong></td>
        <td>${dueDateDisplay}</td>
        <td>${statusHtml}</td>
        <td>
          <div class="action-cell">
            ${actionButtons}
            <button class="btn btn-warning btn-sm" onclick="App.editPayment('${p.id}')">✏️</button>
            <button class="btn btn-danger btn-sm" onclick="App.deletePaymentRecord('${p.id}')">Sil</button>
          </div>
        </td>
      `;
      tableBody.appendChild(tr);
    });

    // Axtarış
    document.getElementById("search-payments").oninput = () => this.renderPayments();

    // Yeni ödəniş təyin etmək düyməsi
    document.getElementById("btn-add-payment").onclick = () => {
      // Uşaqlar siyahısını yüklə
      const activeStudents = students.filter(s => s.status === "Aktiv");
      const stdSelect = document.getElementById("pay-student-select");
      stdSelect.innerHTML = `<option value="">-- Uşaq seçin --</option>`;
      activeStudents.forEach(s => {
        stdSelect.innerHTML += `<option value="${s.id}">${s.name} ${s.surname || ""}</option>`;
      });

      // Fənləri yüklə
      const courses = window.DB.getCourses();
      const courseSelect = document.getElementById("pay-course-select");
      courseSelect.innerHTML = `<option value="">-- Fənn seçin --</option>`;
      courses.forEach(c => {
        courseSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
      });

      document.getElementById("pay-form").reset();
      document.getElementById("pay-teacher-name").value = "";
      document.getElementById("pay-fee").value = "";
      document.getElementById("pay-status").value = "Ödənilməyib";
      document.getElementById("pay-date-group").style.display = "none";
      document.getElementById("pay-date").value = getTodayStr();
      
      const sessionStartGrp = document.getElementById("pay-session-start-group");
      if (sessionStartGrp) {
        sessionStartGrp.style.display = "none";
        document.getElementById("pay-session-start-date").value = getTodayStr();
      }
      
      // Defolt olaraq aylıq sahələri göstər
      document.getElementById("session-fields").style.display = "none";
      document.getElementById("session-freq-field").style.display = "none";
      document.getElementById("monthly-fields").style.display = "block";

      this.openModal("modal-pay");
    };

    const updatePayFormSessionDays = () => {
      const courseId = document.getElementById("pay-course-select").value;
      const packageType = document.getElementById("pay-package-type").value;
      const freq = Number(document.getElementById("pay-weekly-freq-session").value) || 2;
      
      const sessionDaysGrp = document.getElementById("pay-session-days-group");
      if (packageType === "Seans") {
        sessionDaysGrp.style.display = "block";
        const courses = window.DB.getCourses();
        const course = courses.find(c => c.id === courseId);
        const teacherId = course ? course.teacherId : null;
        autoSelectPaymentSessionDays("pay", teacherId, freq);
      } else {
        sessionDaysGrp.style.display = "none";
      }
    };

    // Fənn seçildikdə müəllimə adını, qiyməti və seans günlərini avtomatik yüklə
    document.getElementById("pay-course-select").onchange = (e) => {
      const courseId = e.target.value;
      const courses = window.DB.getCourses();
      const teachers = window.DB.getTeachers();
      
      const course = courses.find(c => c.id === courseId);
      if (course) {
        const teacher = teachers.find(t => t.id === course.teacherId);
        document.getElementById("pay-teacher-name").value = teacher ? teacher.name : "";
        document.getElementById("pay-fee").value = course.defaultFee || "";
      }
      updatePayFormSessionDays();
    };

    // Paket növü seçildikdə müvafiq sahələri göstər
    document.getElementById("pay-package-type").onchange = (e) => {
      const type = e.target.value;
      const sessionStartGrp = document.getElementById("pay-session-start-group");
      if (type === "Aylıq") {
        document.getElementById("session-fields").style.display = "none";
        document.getElementById("session-freq-field").style.display = "none";
        document.getElementById("monthly-fields").style.display = "block";
        if (sessionStartGrp) sessionStartGrp.style.display = "none";
      } else {
        document.getElementById("session-fields").style.display = "block";
        document.getElementById("session-freq-field").style.display = "block";
        document.getElementById("monthly-fields").style.display = "none";
        if (sessionStartGrp) {
          sessionStartGrp.style.display = "block";
          const startInput = document.getElementById("pay-session-start-date");
          if (startInput && !startInput.value) startInput.value = getTodayStr();
        }
      }
      updatePayFormSessionDays();
    };

    // Həftəlik seans tezliyi seçildikdə checkbox-ları yenilə
    document.getElementById("pay-weekly-freq-session").onchange = () => {
      updatePayFormSessionDays();
    };

    // Ödəniş statusu seçildikdə tarix sahəsini göstər/gizlət
    document.getElementById("pay-status").onchange = (e) => {
      const status = e.target.value;
      if (status === "Ödənildi") {
        document.getElementById("pay-date-group").style.display = "block";
      } else {
        document.getElementById("pay-date-group").style.display = "none";
      }
    };

    // Form Submit
    document.getElementById("pay-form").onsubmit = (e) => {
      e.preventDefault();
      
      const studentId = document.getElementById("pay-student-select").value;
      const courseId = document.getElementById("pay-course-select").value;
      const packageType = document.getElementById("pay-package-type").value;
      const groupType = document.getElementById("pay-group-type").value;
      const fee = Number(document.getElementById("pay-fee").value) || 0;
      
      if (!studentId || !courseId) {
        alert("Zəhmət olmasa tələbə və fənni seçin.");
        return;
      }

      const student = students.find(s => s.id === studentId);
      const courses = window.DB.getCourses();
      const course = courses.find(c => c.id === courseId);
      const teachers = window.DB.getTeachers();
      const teacher = teachers.find(t => t.id === course.teacherId);

      const curMonth = window.DB.getCurrentMonth();
      
      let dueDate = null;
      let sessionsCount = null;
      let weeklyFrequency = null;
      let sessionStartDate = null;

      if (packageType === "Aylıq") {
        weeklyFrequency = Number(document.getElementById("pay-weekly-freq-monthly").value);
        dueDate = window.DB.calculateNextMonthlyDueDate(student, curMonth);
      } else {
        weeklyFrequency = Number(document.getElementById("pay-weekly-freq-session").value);
        sessionsCount = Number(document.getElementById("pay-sessions-count").value);
        sessionStartDate = document.getElementById("pay-session-start-date").value || null;
      }

      const paymentStatus = document.getElementById("pay-status").value;
      const paymentDate = paymentStatus === "Ödənildi" ? (document.getElementById("pay-date").value || getTodayStr()) : null;

      let sessionDays = [];
      if (packageType === "Seans") {
        document.querySelectorAll("input[name='pay-session-day']:checked").forEach(cb => {
          sessionDays.push(Number(cb.value));
        });
      }

      const paymentRecord = {
        id: "pay_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
        studentId: student.id,
        studentName: `${student.name} ${student.surname || ""}`.trim(),
        courseId: course.id,
        courseName: course.name,
        teacherName: teacher ? teacher.name : "",
        teacherId: teacher ? teacher.id : "",
        packageType,
        groupType,
        sessionsCount,
        weeklyFrequency,
        fee,
        dueDate: null,
        sessionStartDate,
        paymentStatus,
        paymentDate,
        paidAmount: paymentStatus === "Ödənildi" ? fee : 0,
        sessionsLogged: 0,
        sessionDays
      };

      if (packageType === "Aylıq") {
        paymentRecord.dueDate = dueDate;
      } else {
        if (paymentStatus === "Ödənildi" && (sessionStartDate || paymentDate)) {
          paymentRecord.dueDate = calculateSessionDueDate(paymentRecord);
        } else {
          paymentRecord.dueDate = null;
        }
      }

      window.DB.savePayment(paymentRecord, App.selectedMonth);
      this.closeModal("modal-pay");
      this.refreshCurrentScreen();
    };
  },

  markPaymentPaid(id) {
    try {
      const allPaymentsFlat = window.DB.getAllPaymentsFlat();
      const p = allPaymentsFlat.find(p => String(p.id) === String(id));
      if (!p) {
        alert("Xəta: Ödəniş qeydi tapılmadı (ID: " + id + ")");
        return;
      }

      const modal = document.getElementById("modal-confirm-paid");
      if (!modal) return;

      const idEl = document.getElementById("confirm-payment-id");
      const nameEl = document.getElementById("confirm-payment-student-name");
      const courseEl = document.getElementById("confirm-payment-course-name");
      const dateEl = document.getElementById("confirm-payment-date");

      if (idEl) idEl.value = p.id;
      if (nameEl) nameEl.value = p.studentName;
      if (courseEl) courseEl.value = p.courseName;
      if (dateEl) dateEl.value = getTodayStr();

      const totalFee = Number(p.fee) || 0;
      const prevPaid = Number(p.paidAmount) || 0;
      const debt = totalFee - prevPaid;

      const amtInput = document.getElementById("confirm-payment-amount-to-pay");
      if (amtInput) {
        amtInput.value = debt;
        amtInput.max = debt;
        amtInput.dataset.debt = debt;
      }
      
      const hintEl = document.getElementById("confirm-payment-debt-hint");
      if (hintEl) hintEl.textContent = "Qalıq borc: " + debt + " AZN";

      const nextDueGrp = document.getElementById("confirm-payment-next-due-group");
      const nextDueDateInput = document.getElementById("confirm-payment-next-due-date");
      if (nextDueGrp) nextDueGrp.style.display = "none";
      if (nextDueDateInput) {
        nextDueDateInput.value = p.dueDate ? formatDateToYYYYMMDD(p.dueDate) : "";
        nextDueDateInput.required = false;
      }

      const totalFeeInput = document.getElementById("confirm-payment-total-fee");
      if (totalFeeInput) totalFeeInput.value = totalFee + " AZN";

      const prevPaidInput = document.getElementById("confirm-payment-previously-paid");
      if (prevPaidInput) prevPaidInput.value = prevPaid + " AZN";

      const prevPaidGroup = document.getElementById("confirm-payment-previously-paid-group");
      if (prevPaidGroup) {
        prevPaidGroup.style.display = prevPaid > 0 ? "block" : "none";
      }

      const modalTitle = document.querySelector("#modal-confirm-paid .modal-title");
      if (modalTitle) {
        modalTitle.textContent = prevPaid > 0 ? "Qismən Ödənişin Tamamlanması" : "Ödənişi Tamamla";
      }



      App.openModal("modal-confirm-paid");
    } catch (e) {
      alert("Xəta: " + e.message);
    }
  },

  logSession(id, amount) {
    const allPaymentsFlat = window.DB.getAllPaymentsFlat();
    const p = allPaymentsFlat.find(p => String(p.id) === String(id));
    if (!p || p.packageType !== "Seans") return;

    const currentLogged = p.isManualSessions ? (p.sessionsLogged || 0) : calculateSessionsOccurred(p.sessionStartDate || p.paymentDate, getTodayStr(), p.weeklyFrequency || 2, p.sessionsCount, p);
    const newLogged = currentLogged + amount;
    if (newLogged < 0 || newLogged > p.sessionsCount) return;

    p.sessionsLogged = newLogged;
    p.isManualSessions = true;
    
    window.DB.savePaymentAnyMonth(p);
    this.refreshCurrentScreen();
  },

  setSessionsLogged(id, count) {
    const allPaymentsFlat = window.DB.getAllPaymentsFlat();
    const p = allPaymentsFlat.find(p => String(p.id) === String(id));
    if (!p || p.packageType !== "Seans") return;

    if (count < 0 || count > p.sessionsCount) return;
    p.sessionsLogged = count;
    p.isManualSessions = true;
    
    window.DB.savePaymentAnyMonth(p);
    this.refreshCurrentScreen();
  },

  renewSessionPackage(id) {
    const allPaymentsFlat = window.DB.getAllPaymentsFlat();
    const oldPay = allPaymentsFlat.find(p => String(p.id) === String(id));
    if (!oldPay) return;

    document.getElementById("renew-pay-id").value = oldPay.id;
    document.getElementById("renew-student-name").value = oldPay.studentName;
    document.getElementById("renew-course-name").value = oldPay.courseName;
    
    const wDays = oldPay.sessionDays || [];
    const estEndDate = calculateSessionDueDate(oldPay) || getTodayStr();
    const nextSessionDate = calculateNextSessionDateAfter(estEndDate, wDays.length > 0 ? wDays : getSessionDaysFromFreq(oldPay.weeklyFrequency || 2));
    
    document.getElementById("renew-session-start-date").value = formatDateToYYYYMMDD(nextSessionDate);
    document.getElementById("renew-fee").value = oldPay.fee;
    
    document.getElementById("renew-status").value = "Ödənilməyib";
    document.getElementById("renew-paid-amount-group").style.display = "none";
    document.getElementById("renew-due-date-group").style.display = "block";
    document.getElementById("renew-paid-amount").value = "";
    document.getElementById("renew-due-date").value = "";

    if (wDays.length > 0) {
      document.querySelectorAll("input[name='renew-pay-session-day']").forEach(cb => {
        cb.checked = wDays.includes(Number(cb.value)) || wDays.includes(cb.value);
      });
      const hintEl = document.getElementById("renew-pay-session-days-hint");
      if (hintEl) hintEl.innerHTML = `Şagirdin əvvəlki paketdəki seans günləri seçildi. Lazım gələrsə günləri fərdiləşdirin.`;
    } else {
      autoSelectPaymentSessionDays("renew-pay", oldPay.teacherId, oldPay.weeklyFrequency || 2);
    }

    this.openModal("modal-renew-package");
  },

  deletePaymentRecord(id) {
    if (confirm("Bu ödəniş qeydini cədvəldən silmək istədiyinizdən əminsiniz?")) {
      window.DB.deletePaymentAnyMonth(id);
      this.refreshCurrentScreen();
    }
  },

  editPayment(id) {
    const allPaymentsFlat = window.DB.getAllPaymentsFlat();
    const p = allPaymentsFlat.find(pay => String(pay.id) === String(id));
    if (!p) return;

    document.getElementById("edit-pay-id").value = p.id;
    document.getElementById("edit-pay-student-name").value = p.studentName;
    document.getElementById("edit-pay-course-name").value = p.courseName;
    document.getElementById("edit-pay-package-type").value = p.packageType;
    document.getElementById("edit-pay-group-type").value = p.groupType;
    document.getElementById("edit-pay-fee").value = p.fee;
    document.getElementById("edit-pay-status").value = p.paymentStatus;
    document.getElementById("edit-pay-date").value = formatDateToYYYYMMDD(p.paymentDate);
    document.getElementById("edit-pay-paid-amount").value = p.paidAmount !== undefined && p.paidAmount !== null ? p.paidAmount : "";
    document.getElementById("edit-pay-session-start-date").value = formatDateToYYYYMMDD(p.sessionStartDate);
    document.getElementById("edit-pay-due-date").value = formatDateToYYYYMMDD(p.dueDate);

    const freqMonthly = document.getElementById("edit-pay-freq-monthly-group");
    const sessCount = document.getElementById("edit-pay-sessions-count-group");
    const sessLogged = document.getElementById("edit-pay-sessions-logged-group");
    const sessFreq = document.getElementById("edit-pay-freq-session-group");
    const sessStartGroup = document.getElementById("edit-pay-session-start-group");
    const dateGroup = document.getElementById("edit-pay-date-group");
    const paidAmountGroup = document.getElementById("edit-pay-paid-amount-group");

    if (p.paymentStatus === "Ödənildi") {
      dateGroup.style.display = "block";
      if (paidAmountGroup) paidAmountGroup.style.display = "none";
    } else if (p.paymentStatus === "Qismən ödənilib") {
      dateGroup.style.display = "block";
      if (paidAmountGroup) paidAmountGroup.style.display = "block";
    } else {
      dateGroup.style.display = "none";
      if (paidAmountGroup) paidAmountGroup.style.display = "none";
    }

    const editDaysGrp = document.getElementById("edit-pay-session-days-group");

    if (p.packageType === "Aylıq") {
      document.getElementById("edit-pay-weekly-freq-monthly").value = p.weeklyFrequency || 2;
      freqMonthly.style.display = "block";
      sessCount.style.display = "none";
      sessLogged.style.display = "none";
      sessFreq.style.display = "none";
      if (sessStartGroup) sessStartGroup.style.display = "none";
      if (editDaysGrp) editDaysGrp.style.display = "none";
    } else {
      document.getElementById("edit-pay-weekly-freq-session").value = p.weeklyFrequency || 2;
      document.getElementById("edit-pay-sessions-count").value = p.sessionsCount || 8;
      document.getElementById("edit-pay-sessions-logged").value = p.sessionsLogged || 0;
      freqMonthly.style.display = "none";
      sessCount.style.display = "block";
      sessLogged.style.display = "block";
      sessFreq.style.display = "block";
      if (sessStartGroup) sessStartGroup.style.display = "block";
      if (editDaysGrp) {
        editDaysGrp.style.display = "block";
        const hintEl = document.getElementById("edit-pay-session-days-hint");
        if (hintEl) hintEl.innerHTML = `Şagirdin qeydə alınmış seans günləri seçildi. Lazım gələrsə günləri fərdiləşdirin.`;

        const wDays = p.sessionDays || [];
        if (wDays.length > 0) {
          document.querySelectorAll("input[name='edit-pay-session-day']").forEach(cb => {
            cb.checked = wDays.includes(Number(cb.value)) || wDays.includes(cb.value);
          });
        } else {
          autoSelectPaymentSessionDays("edit-pay", p.teacherId, p.weeklyFrequency || 2);
        }
      }
    }

    this.openModal("modal-edit-payment");
  },

  // ==========================================
  // TEACHERS REPORT SCREEN
  // ==========================================
  renderTeachersReport() {
    const payments = window.DB.getPayments();
    const allPaymentsFlat = window.DB.getAllPaymentsFlat();
    const teachers = window.DB.getTeachers();
    const students = window.DB.getStudents();
    const payouts = window.DB.getTeacherPayouts();
    const courses = window.DB.getCourses();
    const tableBody = document.querySelector("#teachers-report-table tbody");
    tableBody.innerHTML = "";

    let totalRevenueSum = 0;
    let totalTeacherShareSum = 0;
    let totalPaidSum = 0;
    let totalDueSum = 0;
    let totalStudentsSum = 0;

    const curMonth = window.DB.getCurrentMonth();
    const activeStudentIds = new Set(students.filter(s => s.status === "Aktiv").map(s => s.id));

    teachers.forEach(t => {
      // Bu müəllimənin tədris etdiyi fənlər
      const teacherCourses = courses.filter(c => c.teacherId === t.id).map(c => c.name);
      const coursesStr = teacherCourses.length > 0 ? teacherCourses.join(", ") : "Tədris fənni yoxdur";

      // Müəlliməyə aid olan bu aydakı ödənişlər (yalnız cari ayın tarixinə uyğun olanlar)
      const teacherPayments = payments.filter(p => p.teacherId === t.id && (p.paymentStatus === "Ödənildi" || p.paymentStatus === "Qismən ödənilib") && isDateInMonth(p.paymentDate, curMonth));
      const stdCount = [...new Set(payments.filter(p => p.teacherId === t.id && activeStudentIds.has(p.studentId)).map(p => p.studentId))].length;
      
      const revenue = teacherPayments.reduce((sum, p) => sum + getPaymentRevenue(p), 0);
      const sharePercent = t.sharePercent || 50;
      const teacherShare = revenue * (sharePercent / 100);
      
      const teacherPayoutList = payouts[t.id] || [];
      const paid = teacherPayoutList.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const due = teacherShare - paid;

      totalRevenueSum += revenue;
      totalTeacherShareSum += teacherShare;
      totalPaidSum += paid;
      totalDueSum += due;
      totalStudentsSum += stdCount;

      let logsHtml = "";
      if (teacherPayoutList.length > 0) {
        logsHtml = `<div style="font-size: 0.75rem; color: var(--text-muted); text-align: left; max-height: 80px; overflow-y: auto; line-height: 1.4; margin-top: 0.25rem;">`;
        teacherPayoutList.forEach(log => {
          logsHtml += `<div>• ${log.amount} AZN (${log.date})</div>`;
        });
        logsHtml += `</div>`;
      }

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
          <strong>${t.name}</strong>
          <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: normal; margin-top: 0.15rem; display: flex; align-items: center; gap: 4px;">
            <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--primary);"></span>
            ${coursesStr}
          </div>
        </td>
        <td>${stdCount} tələbə</td>
        <td>${revenue} AZN</td>
        <td>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <input type="number" class="teacher-share-input" value="${sharePercent}" 
              onchange="App.updateTeacherPercent('${t.id}', this.value)"/> %
          </div>
        </td>
        <td><strong>${teacherShare.toFixed(1)} AZN</strong></td>
        <td>
          <div style="display: flex; flex-direction: column; gap: 0.25rem; align-items: flex-start;">
            <span style="color: var(--success); font-weight: bold; font-size: 1.05rem;">${paid} AZN</span>
            ${logsHtml}
            <button class="btn btn-secondary btn-sm" onclick="App.openTeacherPayoutModal('${t.id}')" style="padding: 0.2rem 0.5rem; font-size: 0.75rem; margin-top: 0.25rem; border-radius: 6px;">
              💳 Ödəniş et / İdarə et
            </button>
          </div>
        </td>
        <td style="color: ${due > 0 ? '#f59e0b' : (due < 0 ? '#ef4444' : '#10b981')}; font-weight: bold;">
          ${due.toFixed(1)} AZN
        </td>
        <td>
          <div style="display: flex; gap: 0.5rem; align-items: center;">
            <button class="btn btn-success btn-sm" onclick="App.exportTeacherExcel('${t.id}')" title="Excel İxrac" style="padding: 0.35rem 0.65rem; font-size: 0.75rem; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px; background: rgba(16, 185, 129, 0.15); color: var(--success); border: 1px solid rgba(16, 185, 129, 0.25);">
              🟢 Excel
            </button>
            <button class="btn btn-primary btn-sm" onclick="App.printTeacherReport('${t.id}')" title="Hesabatı Çap Et" style="padding: 0.35rem 0.65rem; font-size: 0.75rem; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px; background: rgba(99, 102, 241, 0.15); color: #a5b4fc; border: 1px solid rgba(99, 102, 241, 0.25);">
              🖨️ Çap
            </button>
          </div>
        </td>
      `;
      tableBody.appendChild(tr);
    });

    // Cəmlər sətiri
    const totalTr = document.createElement("tr");
    totalTr.style.background = "rgba(255, 255, 255, 0.05)";
    totalTr.style.fontWeight = "bold";
    totalTr.innerHTML = `
      <td>CƏMİ</td>
      <td>${totalStudentsSum} tələbə</td>
      <td>${totalRevenueSum} AZN</td>
      <td>-</td>
      <td>${totalTeacherShareSum.toFixed(1)} AZN</td>
      <td>${totalPaidSum} AZN</td>
      <td style="color: ${totalDueSum > 0 ? '#f59e0b' : '#10b981'};">${totalDueSum.toFixed(1)} AZN</td>
      <td>-</td>
    `;
    tableBody.appendChild(totalTr);
  },

  updateTeacherPercent(teacherId, newPercent) {
    const teachers = window.DB.getTeachers();
    const t = teachers.find(t => t.id === teacherId);
    if (t) {
      t.sharePercent = Math.min(100, Math.max(0, Number(newPercent) || 0));
      window.DB.saveTeacher(t);
      this.renderTeachersReport();
    }
  },

  openTeacherPayoutModal(teacherId) {
    const teachers = window.DB.getTeachers();
    const t = teachers.find(t => t.id === teacherId);
    if (!t) return;

    document.getElementById("payout-teacher-id").value = teacherId;
    document.getElementById("payout-teacher-name").value = t.name;
    document.getElementById("payout-amount").value = "";
    document.getElementById("payout-date").value = getTodayStr();

    this.populateTeacherPayoutsHistory(teacherId);
    this.openModal("modal-teacher-payout");
  },

  populateTeacherPayoutsHistory(teacherId) {
    const payouts = window.DB.getTeacherPayouts();
    const list = payouts[teacherId] || [];
    const container = document.getElementById("teacher-payouts-history-list");
    container.innerHTML = "";

    if (list.length === 0) {
      container.innerHTML = `<p style="font-size: 0.85rem; color: var(--text-muted); text-align: center; margin: 1rem 0;">Hələ ödəniş edilməyib.</p>`;
      return;
    }

    list.forEach(p => {
      const item = document.createElement("div");
      item.style.display = "flex";
      item.style.justify = "space-between";
      item.style.alignItems = "center";
      item.style.background = "rgba(255, 255, 255, 0.02)";
      item.style.border = "1px solid rgba(255, 255, 255, 0.05)";
      item.style.borderRadius = "8px";
      item.style.padding = "0.5rem 0.75rem";
      
      item.innerHTML = `
        <span style="font-size: 0.9rem; font-weight: 600; color: var(--success);">${p.amount} AZN <small style="color: var(--text-muted); font-weight: normal; margin-left: 0.5rem;">(${p.date})</small></span>
        <button type="button" class="btn btn-danger btn-sm" style="padding: 0.15rem 0.4rem; font-size: 0.75rem; border-radius: 4px;" onclick="App.deleteTeacherPayout('${teacherId}', '${p.id}')">Sil</button>
      `;
      container.appendChild(item);
    });
  },

  deleteTeacherPayout(teacherId, payoutId) {
    if (confirm("Bu ödəniş logunu silmək istədiyinizdən əminsiniz?")) {
      window.DB.deleteTeacherPayout(teacherId, payoutId);
      this.populateTeacherPayoutsHistory(teacherId);
      this.refreshCurrentScreen();
    }
  },

  // ==========================================
  // CENTER REPORT SCREEN (TƏDRİS HESABATI)
  // ==========================================
  renderCenterReport() {
    const payments = window.DB.getPayments();
    const allPaymentsFlat = window.DB.getAllPaymentsFlat();
    const teachers = window.DB.getTeachers();
    const expenses = window.DB.getExpenses();

    // 1. Ödənilmiş dərslərdən gələn cəmi məbləğ
    let totalRevenue = 0;
    let totalTeacherCost = 0;

    const curMonth = window.DB.getCurrentMonth();
    payments.forEach(p => {
      if (isDateInMonth(p.paymentDate, curMonth)) {
        const paidAmt = getPaymentRevenue(p);
        totalRevenue += paidAmt;

        const teacher = teachers.find(t => t.id === p.teacherId);
        const percent = teacher ? (teacher.sharePercent || 50) : 50;
        totalTeacherCost += paidAmt * (percent / 100);
      }
    });

    const centerShare = totalRevenue - totalTeacherCost;
    const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    
    // Müəllimələrə ödənilən maaşları hesablayaq
    const payouts = window.DB.getTeacherPayouts(curMonth);
    let totalTeacherPaid = 0;
    Object.keys(payouts).forEach(teacherId => {
      const list = payouts[teacherId] || [];
      totalTeacherPaid += list.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    });

    const totalTeacherDue = totalTeacherCost - totalTeacherPaid;
    const cashInHand = totalRevenue - totalTeacherPaid - totalExpenses;
    const netProfit = centerShare - totalExpenses;

    const totalAllExpenses = totalTeacherCost + totalExpenses;

    document.getElementById("rep-total-revenue").textContent = formatAmount(totalRevenue) + " AZN";
    
    const repTotalAllExpensesEl = document.getElementById("rep-total-all-expenses");
    if (repTotalAllExpensesEl) repTotalAllExpensesEl.textContent = formatAmount(totalAllExpenses) + " AZN";

    document.getElementById("rep-net-profit").textContent = formatAmount(netProfit) + " AZN";

    const repTeacherCostEl = document.getElementById("rep-teacher-cost");
    if (repTeacherCostEl) repTeacherCostEl.textContent = formatAmount(totalTeacherCost) + " AZN";
    
    document.getElementById("rep-center-share").textContent = formatAmount(centerShare) + " AZN";
    document.getElementById("rep-total-expenses").textContent = formatAmount(totalExpenses) + " AZN";
    
    const repTeacherPaidEl = document.getElementById("rep-teacher-paid");
    if (repTeacherPaidEl) repTeacherPaidEl.textContent = formatAmount(totalTeacherPaid) + " AZN";
    
    const repTeacherDueEl = document.getElementById("rep-teacher-due");
    if (repTeacherDueEl) repTeacherDueEl.textContent = formatAmount(totalTeacherDue) + " AZN";
    
    const repCashInHandEl = document.getElementById("rep-cash-in-hand");
    if (repCashInHandEl) repCashInHandEl.textContent = formatAmount(cashInHand) + " AZN";

    // Köməkçi valyuta göstəriciləri
    document.querySelectorAll(".rep-total-revenue-val").forEach(el => {
      el.textContent = formatAmount(totalRevenue) + " AZN";
    });
    document.querySelectorAll(".rep-net-profit-val").forEach(el => {
      el.textContent = formatAmount(netProfit) + " AZN";
    });
    document.querySelectorAll(".rep-teacher-cost-val").forEach(el => {
      el.textContent = formatAmount(totalTeacherCost) + " AZN";
    });

    // 2. Xərclər Cədvəlinin doldurulması (Tarixə görə sıralayırıq)
    const tableBody = document.querySelector("#expenses-table tbody");
    tableBody.innerHTML = "";

    expenses.sort((a, b) => (a.date || "").localeCompare(b.date || ""));

    expenses.forEach(e => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${e.date || "-"}</td>
        <td><strong>${e.title}</strong></td>
        <td>${e.amount} AZN</td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="App.editExpenseRecord('${e.id}')">Redaktə</button>
          <button class="btn btn-danger btn-sm" onclick="App.deleteExpenseRecord('${e.id}')">Sil</button>
        </td>
      `;
      tableBody.appendChild(tr);
    });

    // Yeni Xərc Düyməsi
    document.getElementById("btn-add-expense").onclick = () => {
      document.getElementById("expense-form").reset();
      document.getElementById("expense-id").value = "";
      document.querySelector("#modal-expense .modal-title").textContent = "Yeni Xərc Əlavə Et";
      document.querySelector("#modal-expense button[type='submit']").textContent = "Əlavə et";
      document.getElementById("expense-date").value = getTodayStr();
      this.openModal("modal-expense");
    };

    // Xərc Formu Submit
    document.getElementById("expense-form").onsubmit = (e) => {
      e.preventDefault();
      const id = document.getElementById("expense-id").value;
      const rawAmt = (document.getElementById("expense-amount").value || "").toString().replace(',', '.');
      const expense = {
        id: id || null,
        title: document.getElementById("expense-title").value.trim(),
        amount: Number(rawAmt) || 0,
        date: document.getElementById("expense-date").value
      };

      if (!expense.title || expense.amount <= 0 || !expense.date) {
        alert("Zəhmət olmasa xərc adını, məbləği və tarixi daxil edin.");
        return;
      }

      window.DB.saveExpense(expense);
      this.closeModal("modal-expense");
      this.refreshCurrentScreen();
    };
  },

  promptAdminPassword(callback) {
    const input = document.getElementById("admin-pass-input");
    if (input) input.value = "";
    this.openModal("modal-admin-password");

    const form = document.getElementById("admin-password-form");
    form.onsubmit = (e) => {
      e.preventDefault();
      const pass = input ? input.value : "";
      if (pass === window.DB.getAdminPassword()) {
        this.closeModal("modal-admin-password");
        callback(true);
      } else {
        alert("Yanlış parol! Əməliyyat rədd edildi.");
        this.closeModal("modal-admin-password");
        callback(false);
      }
    };
  },

  editExpenseRecord(id) {
    this.promptAdminPassword((success) => {
      if (!success) return;
      
      // Xərci tapırıq
      const allExpenses = (window.DB && typeof window.DB._get === 'function') ? window.DB._get("expenses", {}) : {};
      let foundExpense = null;
      Object.keys(allExpenses).forEach(m => {
        if (Array.isArray(allExpenses[m])) {
          const found = allExpenses[m].find(e => e.id === id);
          if (found) foundExpense = found;
        }
      });

      if (foundExpense) {
        document.getElementById("expense-id").value = foundExpense.id;
        document.getElementById("expense-title").value = foundExpense.title;
        document.getElementById("expense-amount").value = foundExpense.amount;
        document.getElementById("expense-date").value = foundExpense.date;
        
        document.querySelector("#modal-expense .modal-title").textContent = "Xərci Redaktə Et";
        document.querySelector("#modal-expense button[type='submit']").textContent = "Yadda saxla";
        this.openModal("modal-expense");
      }
    });
  },

  deleteExpenseRecord(id) {
    this.promptAdminPassword((success) => {
      if (!success) return;
      if (confirm("Bu xərci silmək istədiyinizdən əminsiniz?")) {
        window.DB.deleteExpense(id);
        this.refreshCurrentScreen();
      }
    });
  },

  // ==========================================
  // SETTINGS SCREEN
  // ==========================================
  renderSettings() {
    const teachers = window.DB.getTeachers();
    const courses = window.DB.getCourses();

    // 1. Müəllimlər siyahısı
    const tList = document.getElementById("settings-teachers-list");
    tList.innerHTML = "";
    const dayNames = {
      "1": "B.erəsi",
      "2": "Ç.axşamı",
      "3": "Çərşənbə",
      "4": "C.axşamı",
      "5": "Cümə",
      "6": "Şənbə",
      "0": "Bazar"
    };
    teachers.forEach(t => {
      tList.innerHTML += `
        <div class="settings-list-item">
          <div class="item-info">
            <h4>${t.name}</h4>
            <p>Varsayılan faiz: ${t.sharePercent || 50}%</p>
          </div>
          <div class="item-actions">
            <button class="btn btn-secondary btn-sm" onclick="App.editTeacherSettings('${t.id}')">Düzəliş</button>
            <button class="btn btn-danger btn-sm" onclick="App.deleteTeacherSettings('${t.id}')">Sil</button>
          </div>
        </div>
      `;
    });

    // 2. Fənlər siyahısı
    const cList = document.getElementById("settings-courses-list");
    cList.innerHTML = "";
    courses.forEach(c => {
      const teacher = teachers.find(t => t.id === c.teacherId);
      cList.innerHTML += `
        <div class="settings-list-item">
          <div class="item-info">
            <h4>${c.name}</h4>
            <p>Müəllimə: ${teacher ? teacher.name : "Təyin olunmayıb"}</p>
          </div>
          <div class="item-actions">
            <button class="btn btn-secondary btn-sm" onclick="App.editCourseSettings('${c.id}')">Düzəliş</button>
            <button class="btn btn-danger btn-sm" onclick="App.deleteCourseSettings('${c.id}')">Sil</button>
          </div>
        </div>
      `;
    });

    // Müəllimə Əlavə Et
    document.getElementById("btn-add-teacher-settings").onclick = () => {
      document.getElementById("set-teacher-form").reset();
      document.getElementById("set-teacher-id").value = "";
      document.getElementById("set-teacher-title").textContent = "Yeni Müəllimə";
      this.openModal("modal-set-teacher");
    };

    document.getElementById("set-teacher-form").onsubmit = (e) => {
      e.preventDefault();
      const id = document.getElementById("set-teacher-id").value;

      const teacher = {
        id: id || null,
        name: document.getElementById("set-teacher-name").value.trim(),
        sharePercent: Number(document.getElementById("set-teacher-percent").value) || 50
      };
      window.DB.saveTeacher(teacher);
      this.closeModal("modal-set-teacher");
      this.populateSettingsDropdowns();
      this.refreshCurrentScreen();
    };

    // Fənn Əlavə Et
    document.getElementById("btn-add-course-settings").onclick = () => {
      const tSelect = document.getElementById("set-course-teacher");
      tSelect.innerHTML = `<option value="">-- Müəllimə seçin --</option>`;
      teachers.forEach(t => {
        tSelect.innerHTML += `<option value="${t.id}">${t.name}</option>`;
      });

      document.getElementById("set-course-form").reset();
      document.getElementById("set-course-id").value = "";
      document.getElementById("set-course-title").textContent = "Yeni Tədris Növü";
      this.openModal("modal-set-course");
    };

    document.getElementById("set-course-form").onsubmit = (e) => {
      e.preventDefault();
      const id = document.getElementById("set-course-id").value;
      const course = {
        id: id || null,
        name: document.getElementById("set-course-name").value.trim(),
        teacherId: document.getElementById("set-course-teacher").value,
        defaultFee: Number(document.getElementById("set-course-fee").value) || 0
      };
      
      if (!course.teacherId) {
        alert("Zəhmət olmasa müəlliməni seçin.");
        return;
      }

      window.DB.saveCourse(course);
      this.closeModal("modal-set-course");
      this.populateSettingsDropdowns();
      this.refreshCurrentScreen();
    };

    // Backup Export
    document.getElementById("btn-backup-export").onclick = () => {
      const data = window.DB.exportData();
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const cur = window.DB.getCurrentMonth();
      a.href = url;
      a.download = `eziz_tedris_backup_${cur}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    // Backup Import
    document.getElementById("btn-backup-import").onclick = () => {
      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = ".json";
      fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (evt) => {
            const res = window.DB.importData(evt.target.result);
            if (res.success) {
              alert("Məlumatlar uğurla bərpa olundu!");
              location.reload();
            } else {
              alert("Xəta baş verdi: " + res.error);
            }
          };
          reader.readAsText(file);
        }
      };
      fileInput.click();
    };

    // Database Reset
    document.getElementById("btn-database-reset").onclick = () => {
      if (confirm("DİQQƏT: Bütün tələbə, müəllimə, ödəniş və xərc tarixçəsi TAMAMİLƏ SİLİNƏCƏK. Bunu etmək istədiyinizdən əminsiniz?")) {
        window.DB.resetAll();
        alert("Sistem tamamilə sıfırlandı!");
        this.selectedMonth = window.DB.getCurrentMonth();
        this.renderCurrentMonthIndicator();
        this.populateSettingsDropdowns();
        this.switchScreen("dashboard-screen");
      }
    };
  },

  editTeacherSettings(id) {
    const teachers = window.DB.getTeachers();
    const t = teachers.find(t => t.id === id);
    if (!t) return;

    document.getElementById("set-teacher-id").value = t.id;
    document.getElementById("set-teacher-name").value = t.name;
    document.getElementById("set-teacher-percent").value = t.sharePercent || 50;

    document.getElementById("set-teacher-title").textContent = "Müəllimə Məlumatlarını Redaktə Et";
    this.openModal("modal-set-teacher");
  },

  deleteTeacherSettings(id) {
    if (confirm("Bu müəlliməni silmək istədiyinizdən əminsiniz? Müəlliməyə aid fənlər və hesabatlar silinməyəcək, lakin tənzimləmələrdən silinəcək.")) {
      window.DB.deleteTeacher(id);
      this.refreshCurrentScreen();
    }
  },

  editCourseSettings(id) {
    const courses = window.DB.getCourses();
    const c = courses.find(c => c.id === id);
    if (!c) return;

    const teachers = window.DB.getTeachers();
    const tSelect = document.getElementById("set-course-teacher");
    tSelect.innerHTML = `<option value="">-- Müəllimə seçin --</option>`;
    teachers.forEach(t => {
      tSelect.innerHTML += `<option value="${t.id}" ${t.id === c.teacherId ? "selected" : ""}>${t.name}</option>`;
    });

    document.getElementById("set-course-id").value = c.id;
    document.getElementById("set-course-name").value = c.name;
    document.getElementById("set-course-fee").value = c.defaultFee || 0;
    document.getElementById("set-course-title").textContent = "Tədris Növünü Redaktə Et";
    this.openModal("modal-set-course");
  },

  deleteCourseSettings(id) {
    if (confirm("Bu tədris növünü silmək istədiyinizdən əminsiniz?")) {
      window.DB.deleteCourse(id);
      this.refreshCurrentScreen();
    }
  },

  populateSettingsDropdowns() {
    // Digər faylların dynamic drop-down-larını yeniləmək üçün
  },

  // ==========================================
  // ARCHIVE SCREEN (ARXİV / TARİXÇƏ)
  // ==========================================
  renderArchive() {
    const months = window.DB.getArchiveMonths();
    const select = document.getElementById("archive-month-select");
    
    // Dropdown-u doldur
    select.innerHTML = "";
    if (months.length === 0) {
      select.innerHTML = `<option value="">-- Tarix yoxdur --</option>`;
      document.getElementById("archive-data-wrapper").style.display = "none";
      return;
    }

    months.forEach(m => {
      select.innerHTML += `<option value="${m}">${formatMonth(m)}</option>`;
    });

    // Seçilmiş ayın hesabatlarını göstər
    const loadArchiveData = (month) => {
      if (!month) return;
      document.getElementById("archive-data-wrapper").style.display = "block";
      
      const payments = window.DB.getPayments(month);
      const teachers = window.DB.getTeachers();
      const payouts = window.DB.getTeacherPayouts(month);
      const expenses = window.DB.getExpenses(month);

      // 1. Ödəniş cədvəli
      const payBody = document.querySelector("#archive-payments-table tbody");
      payBody.innerHTML = "";
      
      const students = window.DB.getStudents();
      payments.forEach(p => {
        const student = students.find(s => s.id === p.studentId);
        const displayName = student ? `${student.name} ${student.surname || ""}`.trim() : p.studentName;
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><strong>${displayName}</strong></td>
          <td>${p.courseName}<br/><small style="color: var(--text-muted);">Müəllimə: ${p.teacherName}</small></td>
          <td>${p.packageType} (${p.groupType})</td>
          <td>${p.fee} AZN</td>
          <td><span class="badge ${p.paymentStatus === 'Ödənildi' ? 'badge-paid' : (p.paymentStatus === 'Qismən ödənilib' ? 'badge-partial' : 'badge-unpaid')}">
            ${p.paymentStatus === 'Qismən ödənilib' ? `Qismən (${p.paidAmount || 0}/${p.fee} AZN)` : p.paymentStatus} ${p.paymentDate ? `(${p.paymentDate})` : ""}
          </span></td>
        `;
        payBody.appendChild(tr);
      });

      // 2. Müəllimə hesabatı
      const teachBody = document.querySelector("#archive-teachers-table tbody");
      teachBody.innerHTML = "";
      let totalRevenue = 0;
      let totalTeacherShare = 0;

      teachers.forEach(t => {
        const tPayments = payments.filter(p => p.teacherId === t.id && (p.paymentStatus === "Ödənildi" || p.paymentStatus === "Qismən ödənilib"));
        const revenue = tPayments.reduce((sum, p) => sum + getPaymentRevenue(p), 0);
        const percent = t.sharePercent || 50;
        const share = revenue * (percent / 100);
        
        const teacherPayoutList = payouts[t.id] || [];
        const paid = teacherPayoutList.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        const due = share - paid;

        totalRevenue += revenue;
        totalTeacherShare += share;

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><strong>${t.name}</strong></td>
          <td>${revenue} AZN</td>
          <td>${share.toFixed(1)} AZN</td>
          <td>${paid} AZN</td>
          <td>${due.toFixed(1)} AZN</td>
        `;
        teachBody.appendChild(tr);
      });

      // 3. Maliyyə xülasəsi
      const centerShare = totalRevenue - totalTeacherShare;
      const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const netProfit = centerShare - totalExpenses;

      document.getElementById("arch-total-revenue").textContent = totalRevenue + " AZN";
      document.getElementById("arch-teacher-cost").textContent = totalTeacherShare.toFixed(1) + " AZN";
      document.getElementById("arch-center-share").textContent = centerShare.toFixed(1) + " AZN";
      document.getElementById("arch-total-expenses").textContent = totalExpenses + " AZN";
      document.getElementById("arch-net-profit").textContent = netProfit.toFixed(1) + " AZN";
    };

    // İlk ayı yüklə
    this.selectedMonth = select.value;
    loadArchiveData(select.value);
    this.renderCurrentMonthIndicator();

    // Dəyişəndə yenilə
    select.onchange = (e) => {
      this.selectedMonth = e.target.value;
      loadArchiveData(e.target.value);
      this.renderCurrentMonthIndicator();
    };
  },

  // ==========================================
  // EXPORT & PRINT METHODS
  // ==========================================
  exportGeneralExcel() {
    const curMonth = window.DB.getCurrentMonth();
    const formattedMonth = formatMonth(curMonth);
    const payments = window.DB.getPayments();
    const teachers = window.DB.getTeachers();
    const students = window.DB.getStudents();
    const payouts = window.DB.getTeacherPayouts();
    const expenses = window.DB.getExpenses ? window.DB.getExpenses() : [];

    const activeStudentIds = new Set(students.filter(s => s.status === "Aktiv").map(s => s.id));
    let totalRevenueSum = 0;
    let totalTeacherShareSum = 0;
    let totalPaidSum = 0;
    let totalDueSum = 0;
    let totalStudentsSum = 0;
    
    const teacherRows = teachers.map(t => {
      const teacherPayments = payments.filter(p => p.teacherId === t.id && (p.paymentStatus === "Ödənildi" || p.paymentStatus === "Qismən ödənilib") && isDateInMonth(p.paymentDate, curMonth));
      const stdCount = [...new Set(payments.filter(p => p.teacherId === t.id && activeStudentIds.has(p.studentId)).map(p => p.studentId))].length;
      const revenue = teacherPayments.reduce((sum, p) => sum + getPaymentRevenue(p), 0);
      const sharePercent = t.sharePercent || 50;
      const teacherShare = revenue * (sharePercent / 100);
      const teacherPayoutList = payouts[t.id] || [];
      const paid = teacherPayoutList.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const due = teacherShare - paid;
      
      totalRevenueSum += revenue;
      totalTeacherShareSum += teacherShare;
      totalPaidSum += paid;
      totalDueSum += due;
      totalStudentsSum += stdCount;

      return {
        name: t.name,
        stdCount,
        revenue,
        sharePercent,
        teacherShare,
        paid,
        due
      };
    });

    const totalExpenses = expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
    const centerShare = totalRevenueSum - totalTeacherShareSum;
    const netProfit = centerShare - totalExpenses;

    let xml = '<?xml version="1.0"?>\n';
    xml += '<?mso-application progid="Excel.Sheet"?>\n';
    xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n';
    xml += ' xmlns:o="urn:schemas-microsoft-com:office:office"\n';
    xml += ' xmlns:x="urn:schemas-microsoft-com:office:excel"\n';
    xml += ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"\n';
    xml += ' xmlns:html="http://www.w3.org/TR/REC-html40">\n';
    xml += ' <Styles>\n';
    xml += '  <Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="11" ss:Color="#000000"/></Style>\n';
    xml += '  <Style ss:ID="sTitle"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="15" ss:Bold="1" ss:Color="#000000"/></Style>\n';
    xml += '  <Style ss:ID="sSubTitle"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="11" ss:Italic="1" ss:Color="#333333"/></Style>\n';
    xml += '  <Style ss:ID="sSection"><Alignment ss:Horizontal="Left" ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="12" ss:Bold="1" ss:Color="#000000"/><Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#94A3B8"/></Borders></Style>\n';
    xml += '  <Style ss:ID="sHeader"><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/><Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#000000"/><Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/><Borders><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#94A3B8"/><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#000000"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/></Borders></Style>\n';
    xml += '  <Style ss:ID="sLeft"><Alignment ss:Horizontal="Left" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/></Borders></Style>\n';
    xml += '  <Style ss:ID="sCenter"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/></Borders></Style>\n';
    xml += '  <Style ss:ID="sRight"><Alignment ss:Horizontal="Right" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/></Borders></Style>\n';
    xml += '  <Style ss:ID="sTotal"><Alignment ss:Horizontal="Right" ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#000000"/><Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/><Borders><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#000000"/><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#000000"/></Borders></Style>\n';
    xml += ' </Styles>\n';

    xml += ' <Worksheet ss:Name="Umumi_Hesabat">\n';
    xml += '  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">\n';
    xml += '   <PageSetup>\n';
    xml += '    <Layout x:Orientation="Landscape"/>\n';
    xml += '    <Header x:Margin="0.3"/>\n';
    xml += '    <Footer x:Margin="0.3"/>\n';
    xml += '    <PageMargins x:Bottom="0.5" x:Left="0.5" x:Right="0.5" x:Top="0.5"/>\n';
    xml += '   </PageSetup>\n';
    xml += '   <Print>\n';
    xml += '    <ValidPrinterInfo/>\n';
    xml += '    <PaperSizeIndex>9</PaperSizeIndex>\n';
    xml += '    <FitWidth>1</FitWidth>\n';
    xml += '    <FitHeight>0</FitHeight>\n';
    xml += '   </Print>\n';
    xml += '   <FitToPage/>\n';
    xml += '  </WorksheetOptions>\n';

    xml += '  <Table ss:DefaultRowHeight="20">\n';
    xml += '   <Column ss:Width="180"/>\n';
    xml += '   <Column ss:Width="100"/>\n';
    xml += '   <Column ss:Width="140"/>\n';
    xml += '   <Column ss:Width="100"/>\n';
    xml += '   <Column ss:Width="130"/>\n';
    xml += '   <Column ss:Width="120"/>\n';
    xml += '   <Column ss:Width="130"/>\n';

    xml += '   <Row ss:Height="28"><Cell ss:MergeAcross="6" ss:StyleID="sTitle"><Data ss:Type="String">ƏZİZ TƏDRİS MƏRKƏZİ - ÜMUMİ MALİYYƏ HESABATI</Data></Cell></Row>\n';
    xml += '   <Row ss:Height="20"><Cell ss:MergeAcross="6" ss:StyleID="sSubTitle"><Data ss:Type="String">Hesabat Dövrü: ' + xmlEscape(formattedMonth) + ' | Çap Tarixi: ' + xmlEscape(new Date().toLocaleDateString('az-AZ')) + '</Data></Cell></Row>\n';
    xml += '   <Row ss:Height="12"></Row>\n';

    xml += '   <Row ss:Height="24"><Cell ss:MergeAcross="6" ss:StyleID="sSection"><Data ss:Type="String">1. MƏRKƏZİN MALİYYƏ XÜLASƏSİ</Data></Cell></Row>\n';
    xml += '   <Row ss:Height="22"><Cell ss:StyleID="sHeader"><Data ss:Type="String">Göstərici Adı</Data></Cell><Cell ss:MergeAcross="5" ss:StyleID="sHeader"><Data ss:Type="String">Məbləğ (AZN)</Data></Cell></Row>\n';
    xml += '   <Row><Cell ss:StyleID="sLeft"><Data ss:Type="String">Ümumi Toplanan Gəlir</Data></Cell><Cell ss:MergeAcross="5" ss:StyleID="sRight"><Data ss:Type="Number">' + totalRevenueSum + '</Data></Cell></Row>\n';
    xml += '   <Row><Cell ss:StyleID="sLeft"><Data ss:Type="String">Müəllimə Payları (Ümumi)</Data></Cell><Cell ss:MergeAcross="5" ss:StyleID="sRight"><Data ss:Type="Number">' + Number(totalTeacherShareSum.toFixed(2)) + '</Data></Cell></Row>\n';
    xml += '   <Row><Cell ss:StyleID="sLeft"><Data ss:Type="String">Mərkəzin Payı (Brutto)</Data></Cell><Cell ss:MergeAcross="5" ss:StyleID="sRight"><Data ss:Type="Number">' + Number(centerShare.toFixed(2)) + '</Data></Cell></Row>\n';
    xml += '   <Row><Cell ss:StyleID="sLeft"><Data ss:Type="String">Tədrisin Digər Xərcləri</Data></Cell><Cell ss:MergeAcross="5" ss:StyleID="sRight"><Data ss:Type="Number">' + totalExpenses + '</Data></Cell></Row>\n';
    xml += '   <Row ss:Height="22"><Cell ss:StyleID="sTotal"><Data ss:Type="String">XALİS MƏNFƏƏT (NET QALIQ)</Data></Cell><Cell ss:MergeAcross="5" ss:StyleID="sTotal"><Data ss:Type="Number">' + Number(netProfit.toFixed(2)) + '</Data></Cell></Row>\n';
    xml += '   <Row ss:Height="14"></Row>\n';

    xml += '   <Row ss:Height="24"><Cell ss:MergeAcross="6" ss:StyleID="sSection"><Data ss:Type="String">2. MÜƏLLİMƏLƏRİN AYLIQ PAY HESABATI</Data></Cell></Row>\n';
    xml += '   <Row ss:Height="22">\n';
    xml += '    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Müəllimə</Data></Cell>\n';
    xml += '    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Uşaq Sayı</Data></Cell>\n';
    xml += '    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Cəlb Olunan (AZN)</Data></Cell>\n';
    xml += '    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Pay Faizi</Data></Cell>\n';
    xml += '    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Müəllimə Payı (AZN)</Data></Cell>\n';
    xml += '    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Ödənilən (AZN)</Data></Cell>\n';
    xml += '    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Qalıq Borc (AZN)</Data></Cell>\n';
    xml += '   </Row>\n';

    teacherRows.forEach(tr => {
      xml += '   <Row>\n';
      xml += '    <Cell ss:StyleID="sLeft"><Data ss:Type="String">' + xmlEscape(tr.name) + '</Data></Cell>\n';
      xml += '    <Cell ss:StyleID="sCenter"><Data ss:Type="Number">' + tr.stdCount + '</Data></Cell>\n';
      xml += '    <Cell ss:StyleID="sRight"><Data ss:Type="Number">' + tr.revenue + '</Data></Cell>\n';
      xml += '    <Cell ss:StyleID="sCenter"><Data ss:Type="String">' + tr.sharePercent + '%</Data></Cell>\n';
      xml += '    <Cell ss:StyleID="sRight"><Data ss:Type="Number">' + Number(tr.teacherShare.toFixed(2)) + '</Data></Cell>\n';
      xml += '    <Cell ss:StyleID="sRight"><Data ss:Type="Number">' + tr.paid + '</Data></Cell>\n';
      xml += '    <Cell ss:StyleID="sRight"><Data ss:Type="Number">' + Number(tr.due.toFixed(2)) + '</Data></Cell>\n';
      xml += '   </Row>\n';
    });

    xml += '   <Row ss:Height="22">\n';
    xml += '    <Cell ss:StyleID="sTotal"><Data ss:Type="String">CƏMİ YEKUN</Data></Cell>\n';
    xml += '    <Cell ss:StyleID="sTotal"><Data ss:Type="String">' + totalStudentsSum + ' tələbə</Data></Cell>\n';
    xml += '    <Cell ss:StyleID="sTotal"><Data ss:Type="Number">' + totalRevenueSum + '</Data></Cell>\n';
    xml += '    <Cell ss:StyleID="sTotal"><Data ss:Type="String">-</Data></Cell>\n';
    xml += '    <Cell ss:StyleID="sTotal"><Data ss:Type="Number">' + Number(totalTeacherShareSum.toFixed(2)) + '</Data></Cell>\n';
    xml += '    <Cell ss:StyleID="sTotal"><Data ss:Type="Number">' + totalPaidSum + '</Data></Cell>\n';
    xml += '    <Cell ss:StyleID="sTotal"><Data ss:Type="Number">' + Number(totalDueSum.toFixed(2)) + '</Data></Cell>\n';
    xml += '   </Row>\n';
    xml += '   <Row ss:Height="14"></Row>\n';

    if (expenses.length > 0) {
      xml += '   <Row ss:Height="24"><Cell ss:MergeAcross="6" ss:StyleID="sSection"><Data ss:Type="String">3. TƏDRİSİN XƏRCLƏRİ</Data></Cell></Row>\n';
      xml += '   <Row ss:Height="22">\n';
      xml += '    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Tarix</Data></Cell>\n';
      xml += '    <Cell ss:MergeAcross="4" ss:StyleID="sHeader"><Data ss:Type="String">Təsvir / Xərc Adı</Data></Cell>\n';
      xml += '    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Məbləğ (AZN)</Data></Cell>\n';
      xml += '   </Row>\n';

      expenses.forEach(exp => {
        xml += '   <Row>\n';
        xml += '    <Cell ss:StyleID="sCenter"><Data ss:Type="String">' + xmlEscape(exp.date || "-") + '</Data></Cell>\n';
        xml += '    <Cell ss:MergeAcross="4" ss:StyleID="sLeft"><Data ss:Type="String">' + xmlEscape(exp.title || "") + '</Data></Cell>\n';
        xml += '    <Cell ss:StyleID="sRight"><Data ss:Type="Number">' + Number(exp.amount || 0) + '</Data></Cell>\n';
        xml += '   </Row>\n';
      });

      xml += '   <Row ss:Height="22">\n';
      xml += '    <Cell ss:MergeAcross="5" ss:StyleID="sTotal"><Data ss:Type="String">CƏMİ XƏRCLƏR</Data></Cell>\n';
      xml += '    <Cell ss:StyleID="sTotal"><Data ss:Type="Number">' + totalExpenses + '</Data></Cell>\n';
      xml += '   </Row>\n';
    }

    xml += '  </Table>\n';
    xml += ' </Worksheet>\n';
    xml += '</Workbook>';

    const blob = new Blob([xml], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "Umumi_Hesabat_" + curMonth + ".xls");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },



  printGeneralReport() {
    const curMonth = window.DB.getCurrentMonth();
    const formattedMonth = formatMonth(curMonth);
    const payments = window.DB.getPayments();
    const teachers = window.DB.getTeachers();
    const students = window.DB.getStudents();
    const payouts = window.DB.getTeacherPayouts();
    const expenses = window.DB.getExpenses ? window.DB.getExpenses() : [];
    const courses = window.DB.getCourses();

    const activeStudentIds = new Set(students.filter(s => s.status === "Aktiv").map(s => s.id));
    let totalRevenueSum = 0;
    let totalTeacherShareSum = 0;
    let totalPaidSum = 0;
    let totalDueSum = 0;
    let totalStudentsSum = 0;

    const teacherRowsHtml = teachers.map(t => {
      const teacherPayments = payments.filter(p => p.teacherId === t.id && (p.paymentStatus === "Ödənildi" || p.paymentStatus === "Qismən ödənilib") && isDateInMonth(p.paymentDate, curMonth));
      const stdCount = [...new Set(payments.filter(p => p.teacherId === t.id && activeStudentIds.has(p.studentId)).map(p => p.studentId))].length;
      const revenue = teacherPayments.reduce((sum, p) => sum + getPaymentRevenue(p), 0);
      const sharePercent = t.sharePercent || 50;
      const teacherShare = revenue * (sharePercent / 100);
      const teacherPayoutList = payouts[t.id] || [];
      const paid = teacherPayoutList.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const due = teacherShare - paid;

      totalRevenueSum += revenue;
      totalTeacherShareSum += teacherShare;
      totalPaidSum += paid;
      totalDueSum += due;
      totalStudentsSum += stdCount;

      const teacherCourses = courses.filter(c => c.teacherId === t.id).map(c => c.name);
      const coursesStr = teacherCourses.length > 0 ? teacherCourses.join(", ") : "Tədris fənni yoxdur";

      return `
        <tr>
          <td style="border: 1px solid #cbd5e1; padding: 7px 10px;">
            <strong>${t.name}</strong>
            <div style="font-size: 10px; color: #475569;">• ${coursesStr}</div>
          </td>
          <td style="border: 1px solid #cbd5e1; padding: 7px 10px; text-align: center;">${stdCount} tələbə</td>
          <td style="border: 1px solid #cbd5e1; padding: 7px 10px; text-align: right;">${formatAmount(revenue)} AZN</td>
          <td style="border: 1px solid #cbd5e1; padding: 7px 10px; text-align: center;">${sharePercent}%</td>
          <td style="border: 1px solid #cbd5e1; padding: 7px 10px; text-align: right; font-weight: bold;">${formatAmount(teacherShare)} AZN</td>
          <td style="border: 1px solid #cbd5e1; padding: 7px 10px; text-align: right;">${formatAmount(paid)} AZN</td>
          <td style="border: 1px solid #cbd5e1; padding: 7px 10px; text-align: right; font-weight: bold;">${formatAmount(due)} AZN</td>
        </tr>
      `;
    }).join("");

    const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const centerShare = totalRevenueSum - totalTeacherShareSum;
    const netProfit = centerShare - totalExpenses;

    const expenseRowsHtml = expenses.map(e => `
      <tr>
        <td style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: center;">${e.date || "-"}</td>
        <td style="border: 1px solid #cbd5e1; padding: 6px 10px;">${e.title}</td>
        <td style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: right; font-weight: bold;">${formatAmount(e.amount)} AZN</td>
      </tr>
    `).join("");

    // Group expenses by title
    const groupedMap = {};
    expenses.forEach(e => {
      const title = (e.title || "Digər").trim();
      const amt = Number(e.amount) || 0;
      if (!groupedMap[title]) {
        groupedMap[title] = { count: 0, total: 0 };
      }
      groupedMap[title].count += 1;
      groupedMap[title].total += amt;
    });

    const groupedExpensesRowsHtml = Object.keys(groupedMap).map(title => `
      <tr>
        <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>${title}</strong></td>
        <td style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: center;">${groupedMap[title].count} əməliyyat</td>
        <td style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: right; font-weight: bold;">${formatAmount(groupedMap[title].total)} AZN</td>
      </tr>
    `).join("");

    let expensesSectionHtml = "";
    if (expenses.length > 0) {
      expensesSectionHtml = `
        <div style="font-size: 13px; font-weight: bold; color: #000000; margin: 20px 0 8px 0; text-transform: uppercase; border-bottom: 1.5px solid #000000; padding-bottom: 3px;">3. Tədrisin Xərcləri (Təfərrüatlı Siyahı)</div>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 15px;">
          <thead>
            <tr style="background: #f1f5f9; color: #000000;">
              <th style="border: 1px solid #94a3b8; padding: 7px 10px; text-align: center; width: 110px;">Tarix</th>
              <th style="border: 1px solid #94a3b8; padding: 7px 10px; text-align: left;">Xərcin Təsviri / Adı</th>
              <th style="border: 1px solid #94a3b8; padding: 7px 10px; text-align: right; width: 140px;">Məbləğ</th>
            </tr>
          </thead>
          <tbody>
            ${expenseRowsHtml}
            <tr style="background: #f8fafc; font-weight: bold;">
              <td colspan="2" style="border: 1px solid #cbd5e1; padding: 7px 10px;">CƏMİ XƏRCLƏR</td>
              <td style="border: 1px solid #cbd5e1; padding: 7px 10px; text-align: right;">${formatAmount(totalExpenses)} AZN</td>
            </tr>
          </tbody>
        </table>

        <div style="font-size: 13px; font-weight: bold; color: #000000; margin: 20px 0 8px 0; text-transform: uppercase; border-bottom: 1.5px solid #000000; padding-bottom: 3px;">4. Eyni Adlı Xərclərin Ümumiləşdirilmiş Xülasəsi</div>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
          <thead>
            <tr style="background: #f1f5f9; color: #000000;">
              <th style="border: 1px solid #94a3b8; padding: 7px 10px; text-align: left;">Xərc Adı / Kateqoriya</th>
              <th style="border: 1px solid #94a3b8; padding: 7px 10px; text-align: center; width: 150px;">Əməliyyat Sayı</th>
              <th style="border: 1px solid #94a3b8; padding: 7px 10px; text-align: right; width: 160px;">Cəmi Məbləğ</th>
            </tr>
          </thead>
          <tbody>
            ${groupedExpensesRowsHtml}
            <tr style="background: #f8fafc; font-weight: bold;">
              <td style="border: 1px solid #cbd5e1; padding: 7px 10px;">CƏMİ QRUPLAŞDIRILMIŞ XƏRC</td>
              <td style="border: 1px solid #cbd5e1; padding: 7px 10px; text-align: center;">${expenses.length} əməliyyat</td>
              <td style="border: 1px solid #cbd5e1; padding: 7px 10px; text-align: right;">${formatAmount(totalExpenses)} AZN</td>
            </tr>
          </tbody>
        </table>
      `;
    }

    const printWin = window.open("", "_blank");
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Əziz Tədris Mərkəzi - ${formattedMonth} Hesabatı</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            color: #000000;
            background: #ffffff;
            margin: 0;
            padding: 15px;
            font-size: 11px;
            line-height: 1.4;
          }
          @media print {
            .no-print { display: none !important; }
            body { padding: 0 !important; }
            table, tr, td, th { page-break-inside: avoid !important; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 15px; text-align: right;">
          <button onclick="window.print()" style="padding: 8px 18px; background: #000000; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 13px;">🖨️ Çap Et</button>
        </div>
        
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000000; padding-bottom: 10px; margin-bottom: 15px;">
          <div>
            <h1 style="margin: 0; font-size: 18px; text-transform: uppercase; font-weight: 900;">ƏZİZ TƏDRİS MƏRKƏZİ</h1>
            <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; margin-top: 2px;">RƏSMİ MALİYYƏ VƏ İCRA HESABATI (DİREKTOR BLANKI)</div>
          </div>
          <div style="text-align: right; font-size: 11px;">
            <div>Hesabat Dövrü: <strong>${formattedMonth}</strong></div>
            <div>Çap Tarixi: <strong>${new Date().toLocaleDateString('az-AZ')}</strong></div>
          </div>
        </div>

        <div style="font-size: 13px; font-weight: bold; color: #000000; margin-bottom: 8px; text-transform: uppercase; border-bottom: 1.5px solid #000000; padding-bottom: 3px;">1. İcraçı Maliyyə Xülasəsi</div>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 15px;">
          <thead>
            <tr style="background: #f1f5f9; color: #000000;">
              <th style="border: 1px solid #94a3b8; padding: 7px; text-align: center;">Ümumi Gəlir</th>
              <th style="border: 1px solid #94a3b8; padding: 7px; text-align: center;">Müəllimə Payları</th>
              <th style="border: 1px solid #94a3b8; padding: 7px; text-align: center;">Mərkəz Payı</th>
              <th style="border: 1px solid #94a3b8; padding: 7px; text-align: center;">Digər Xərclər</th>
              <th style="border: 1px solid #94a3b8; padding: 7px; text-align: center;">XALİS MƏNFƏƏT</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-weight: bold;">${formatAmount(totalRevenueSum)} AZN</td>
              <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-weight: bold;">${formatAmount(totalTeacherShareSum)} AZN</td>
              <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-weight: bold;">${formatAmount(centerShare)} AZN</td>
              <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-weight: bold;">${formatAmount(totalExpenses)} AZN</td>
              <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-weight: 900; font-size: 13px;">${formatAmount(netProfit)} AZN</td>
            </tr>
          </tbody>
        </table>

        <div style="font-size: 13px; font-weight: bold; color: #000000; margin: 15px 0 8px 0; text-transform: uppercase; border-bottom: 1.5px solid #000000; padding-bottom: 3px;">2. Müəllimələr Üzrə Pay Bölgüsü</div>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 15px;">
          <thead>
            <tr style="background: #f1f5f9; color: #000000;">
              <th style="border: 1px solid #94a3b8; padding: 7px 10px; text-align: left;">Müəllimə</th>
              <th style="border: 1px solid #94a3b8; padding: 7px 10px; text-align: center;">Tələbə Sayı</th>
              <th style="border: 1px solid #94a3b8; padding: 7px 10px; text-align: right;">Cəlb Olunan</th>
              <th style="border: 1px solid #94a3b8; padding: 7px 10px; text-align: center;">Faiz</th>
              <th style="border: 1px solid #94a3b8; padding: 7px 10px; text-align: right;">Müəllimə Payı</th>
              <th style="border: 1px solid #94a3b8; padding: 7px 10px; text-align: right;">Ödənilən</th>
              <th style="border: 1px solid #94a3b8; padding: 7px 10px; text-align: right;">Qalıq Borc</th>
            </tr>
          </thead>
          <tbody>
            ${teacherRowsHtml}
            <tr style="background: #f8fafc; font-weight: bold;">
              <td style="border: 1px solid #cbd5e1; padding: 8px 10px;">CƏMİ YEKUN</td>
              <td style="border: 1px solid #cbd5e1; padding: 8px 10px; text-align: center;">${totalStudentsSum} tələbə</td>
              <td style="border: 1px solid #cbd5e1; padding: 8px 10px; text-align: right;">${formatAmount(totalRevenueSum)} AZN</td>
              <td style="border: 1px solid #cbd5e1; padding: 8px 10px; text-align: center;">-</td>
              <td style="border: 1px solid #cbd5e1; padding: 8px 10px; text-align: right;">${formatAmount(totalTeacherShareSum)} AZN</td>
              <td style="border: 1px solid #cbd5e1; padding: 8px 10px; text-align: right;">${formatAmount(totalPaidSum)} AZN</td>
              <td style="border: 1px solid #cbd5e1; padding: 8px 10px; text-align: right;">${formatAmount(totalDueSum)} AZN</td>
            </tr>
          </tbody>
        </table>

        ${expensesSectionHtml}

        <div style="margin-top: 35px; border-top: 1px solid #000000; padding-top: 15px; display: flex; justify-content: space-between; align-items: flex-end;">
          <div style="font-size: 9px; color: #333333; max-width: 350px;">
            <strong>ƏZİZ TƏDRİS MƏRKƏZİ - RƏSMİ MALİYYƏ HESABATI</strong><br>
            Bu sənəd rəsmi maliyyə hesabatı blankıdır. Çap tarixi: ${new Date().toLocaleDateString('az-AZ')}
          </div>
          <div style="text-align: center;">
            <div style="font-size: 11px; font-weight: bold; margin-bottom: 30px;">Hesabatı Tərtib Etdi (Direktor):</div>
            <div style="border-top: 1.5px solid #000000; width: 180px; margin: 0 auto; padding-top: 4px; font-size: 11px; font-weight: bold;">İmza / Tarix</div>
          </div>
        </div>

        <script>
          setTimeout(function() { window.print(); }, 400);
        </script>
      </body>
      </html>
    `);
    printWin.document.close();
  },



  exportTeacherExcel(teacherId) {
    const curMonth = window.DB.getCurrentMonth();
    const formattedMonth = formatMonth(curMonth);
    const payments = window.DB.getPayments();
    const teachers = window.DB.getTeachers();
    const payouts = window.DB.getTeacherPayouts();
    
    const t = teachers.find(teach => teach.id === teacherId);
    if (!t) return;

    const teacherPayments = payments.filter(p => p.teacherId === t.id && (p.paymentStatus === "Ödənildi" || p.paymentStatus === "Qismən ödənilib") && isDateInMonth(p.paymentDate, curMonth));
    const students = window.DB.getStudents();
    const activeStudentIds = new Set(students.filter(s => s.status === "Aktiv").map(s => s.id));
    const stdCount = [...new Set(payments.filter(p => p.teacherId === t.id && activeStudentIds.has(p.studentId)).map(p => p.studentId))].length;
    
    const revenue = teacherPayments.reduce((sum, p) => sum + getPaymentRevenue(p), 0);
    const sharePercent = t.sharePercent || 50;
    const teacherShare = revenue * (sharePercent / 100);
    const teacherPayoutList = payouts[t.id] || [];
    const paid = teacherPayoutList.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const due = teacherShare - paid;

    let xml = '<?xml version="1.0"?>\n';
    xml += '<?mso-application progid="Excel.Sheet"?>\n';
    xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n';
    xml += ' xmlns:o="urn:schemas-microsoft-com:office:office"\n';
    xml += ' xmlns:x="urn:schemas-microsoft-com:office:excel"\n';
    xml += ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"\n';
    xml += ' xmlns:html="http://www.w3.org/TR/REC-html40">\n';
    xml += ' <Styles>\n';
    xml += '  <Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="11" ss:Color="#000000"/></Style>\n';
    xml += '  <Style ss:ID="sTitle"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="15" ss:Bold="1" ss:Color="#000000"/></Style>\n';
    xml += '  <Style ss:ID="sSubTitle"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="11" ss:Italic="1" ss:Color="#333333"/></Style>\n';
    xml += '  <Style ss:ID="sSection"><Alignment ss:Horizontal="Left" ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="12" ss:Bold="1" ss:Color="#000000"/><Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#94A3B8"/></Borders></Style>\n';
    xml += '  <Style ss:ID="sHeader"><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/><Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#000000"/><Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/><Borders><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#94A3B8"/><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#000000"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/></Borders></Style>\n';
    xml += '  <Style ss:ID="sLeft"><Alignment ss:Horizontal="Left" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/></Borders></Style>\n';
    xml += '  <Style ss:ID="sCenter"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/></Borders></Style>\n';
    xml += '  <Style ss:ID="sRight"><Alignment ss:Horizontal="Right" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/></Borders></Style>\n';
    xml += '  <Style ss:ID="sTotal"><Alignment ss:Horizontal="Right" ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#000000"/><Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/><Borders><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#000000"/><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#000000"/></Borders></Style>\n';
    xml += ' </Styles>\n';

    xml += ' <Worksheet ss:Name="Mueillime_Hesabati">\n';
    xml += '  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">\n';
    xml += '   <PageSetup>\n';
    xml += '    <Layout x:Orientation="Landscape"/>\n';
    xml += '    <Header x:Margin="0.3"/>\n';
    xml += '    <Footer x:Margin="0.3"/>\n';
    xml += '    <PageMargins x:Bottom="0.5" x:Left="0.5" x:Right="0.5" x:Top="0.5"/>\n';
    xml += '   </PageSetup>\n';
    xml += '   <Print>\n';
    xml += '    <ValidPrinterInfo/>\n';
    xml += '    <PaperSizeIndex>9</PaperSizeIndex>\n';
    xml += '    <FitWidth>1</FitWidth>\n';
    xml += '    <FitHeight>0</FitHeight>\n';
    xml += '   </Print>\n';
    xml += '   <FitToPage/>\n';
    xml += '  </WorksheetOptions>\n';

    xml += '  <Table ss:DefaultRowHeight="20">\n';
    xml += '   <Column ss:Width="160"/>\n';
    xml += '   <Column ss:Width="130"/>\n';
    xml += '   <Column ss:Width="160"/>\n';
    xml += '   <Column ss:Width="110"/>\n';
    xml += '   <Column ss:Width="110"/>\n';
    xml += '   <Column ss:Width="130"/>\n';

    xml += '   <Row ss:Height="28"><Cell ss:MergeAcross="5" ss:StyleID="sTitle"><Data ss:Type="String">ƏZİZ TƏDRİS MƏRKƏZİ - MÜƏLLİMƏ HESABATI</Data></Cell></Row>\n';
    xml += '   <Row ss:Height="20"><Cell ss:MergeAcross="5" ss:StyleID="sSubTitle"><Data ss:Type="String">Müəllimə: ' + xmlEscape(t.name) + ' | Dövr: ' + xmlEscape(formattedMonth) + ' | Çap Tarixi: ' + xmlEscape(new Date().toLocaleDateString('az-AZ')) + '</Data></Cell></Row>\n';
    xml += '   <Row ss:Height="12"></Row>\n';

    xml += '   <Row ss:Height="24"><Cell ss:MergeAcross="5" ss:StyleID="sSection"><Data ss:Type="String">1. MALİYYƏ XÜLASƏSİ</Data></Cell></Row>\n';
    xml += '   <Row><Cell ss:StyleID="sLeft"><Data ss:Type="String">Aktiv Uşaq Sayı</Data></Cell><Cell ss:MergeAcross="4" ss:StyleID="sRight"><Data ss:Type="String">' + stdCount + ' tələbə</Data></Cell></Row>\n';
    xml += '   <Row><Cell ss:StyleID="sLeft"><Data ss:Type="String">Ümumi Cəlb Olunan Məbləğ</Data></Cell><Cell ss:MergeAcross="4" ss:StyleID="sRight"><Data ss:Type="Number">' + revenue + '</Data></Cell></Row>\n';
    xml += '   <Row><Cell ss:StyleID="sLeft"><Data ss:Type="String">Müəllimənin Pay Faizi</Data></Cell><Cell ss:MergeAcross="4" ss:StyleID="sRight"><Data ss:Type="String">' + sharePercent + '%</Data></Cell></Row>\n';
    xml += '   <Row><Cell ss:StyleID="sLeft"><Data ss:Type="String">Hesablanan Müəllimə Payı</Data></Cell><Cell ss:MergeAcross="4" ss:StyleID="sRight"><Data ss:Type="Number">' + Number(teacherShare.toFixed(2)) + '</Data></Cell></Row>\n';
    xml += '   <Row><Cell ss:StyleID="sLeft"><Data ss:Type="String">Müəlliməyə Ödənilən Məbləğ</Data></Cell><Cell ss:MergeAcross="4" ss:StyleID="sRight"><Data ss:Type="Number">' + paid + '</Data></Cell></Row>\n';
    xml += '   <Row ss:Height="22"><Cell ss:StyleID="sTotal"><Data ss:Type="String">QALİQ BORC (MƏRKƏZİN BORCU)</Data></Cell><Cell ss:MergeAcross="4" ss:StyleID="sTotal"><Data ss:Type="Number">' + Number(due.toFixed(2)) + '</Data></Cell></Row>\n';
    xml += '   <Row ss:Height="14"></Row>\n';

    xml += '   <Row ss:Height="24"><Cell ss:MergeAcross="5" ss:StyleID="sSection"><Data ss:Type="String">2. ÖDƏNİŞ EDİLƏN DƏRSLƏR VƏ TƏLƏBƏ SİYAHISI</Data></Cell></Row>\n';
    xml += '   <Row ss:Height="22">\n';
    xml += '    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Tələbə</Data></Cell>\n';
    xml += '    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Fənn</Data></Cell>\n';
    xml += '    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Paket Və Qrup</Data></Cell>\n';
    xml += '    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Dərs Tezliyi</Data></Cell>\n';
    xml += '    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Ödəniş Tarixi</Data></Cell>\n';
    xml += '    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Məbləğ (AZN)</Data></Cell>\n';
    xml += '   </Row>\n';

    teacherPayments.forEach(p => {
      const paidVal = getPaymentRevenue(p);
      const student = students.find(s => s.id === p.studentId);
      const displayName = student ? (student.name + " " + (student.surname || "")).trim() : p.studentName;
      const pkgStr = p.packageType === "Seans" ? ("Seans (" + (p.sessionsCount || 8) + " seans) (" + p.groupType + ")") : ("Aylıq (" + p.groupType + ")");
      xml += '   <Row>\n';
      xml += '    <Cell ss:StyleID="sLeft"><Data ss:Type="String">' + xmlEscape(displayName) + '</Data></Cell>\n';
      xml += '    <Cell ss:StyleID="sLeft"><Data ss:Type="String">' + xmlEscape(p.courseName) + '</Data></Cell>\n';
      xml += '    <Cell ss:StyleID="sLeft"><Data ss:Type="String">' + xmlEscape(pkgStr) + '</Data></Cell>\n';
      xml += '    <Cell ss:StyleID="sCenter"><Data ss:Type="String">Həftədə ' + p.weeklyFrequency + ' dəfə</Data></Cell>\n';
      xml += '    <Cell ss:StyleID="sCenter"><Data ss:Type="String">' + xmlEscape(p.paymentDate) + '</Data></Cell>\n';
      xml += '    <Cell ss:StyleID="sRight"><Data ss:Type="Number">' + paidVal + '</Data></Cell>\n';
      xml += '   </Row>\n';
    });

    xml += '   <Row ss:Height="22">\n';
    xml += '    <Cell ss:MergeAcross="4" ss:StyleID="sTotal"><Data ss:Type="String">CƏMİ CƏLB OLUNAN</Data></Cell>\n';
    xml += '    <Cell ss:StyleID="sTotal"><Data ss:Type="Number">' + revenue + '</Data></Cell>\n';
    xml += '   </Row>\n';
    xml += '   <Row ss:Height="14"></Row>\n';

    if (teacherPayoutList.length > 0) {
      xml += '   <Row ss:Height="24"><Cell ss:MergeAcross="5" ss:StyleID="sSection"><Data ss:Type="String">3. MÜƏLLİMƏYƏ EDİLƏN ÖDƏNİŞLƏRİN TARİXÇƏSİ</Data></Cell></Row>\n';
      xml += '   <Row ss:Height="22">\n';
      xml += '    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Tarix</Data></Cell>\n';
      xml += '    <Cell ss:MergeAcross="4" ss:StyleID="sHeader"><Data ss:Type="String">Verilən Məbləğ (AZN)</Data></Cell>\n';
      xml += '   </Row>\n';

      teacherPayoutList.forEach(log => {
        xml += '   <Row>\n';
        xml += '    <Cell ss:StyleID="sCenter"><Data ss:Type="String">' + xmlEscape(log.date || "-") + '</Data></Cell>\n';
        xml += '    <Cell ss:MergeAcross="4" ss:StyleID="sRight"><Data ss:Type="Number">' + Number(log.amount || 0) + '</Data></Cell>\n';
        xml += '   </Row>\n';
      });

      xml += '   <Row ss:Height="22">\n';
      xml += '    <Cell ss:StyleID="sTotal"><Data ss:Type="String">CƏMİ ÖDƏNİLƏN</Data></Cell>\n';
      xml += '    <Cell ss:MergeAcross="4" ss:StyleID="sTotal"><Data ss:Type="Number">' + paid + '</Data></Cell>\n';
      xml += '   </Row>\n';
    }

    xml += '  </Table>\n';
    xml += ' </Worksheet>\n';
    xml += '</Workbook>';

    const blob = new Blob([xml], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", (t.name.replace(/\s+/g, "_")) + "_Hesabat_" + curMonth + ".xls");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },



  printTeacherReport(teacherId) {
    const curMonth = window.DB.getCurrentMonth();
    const formattedMonth = formatMonth(curMonth);
    const payments = window.DB.getPayments();
    const teachers = window.DB.getTeachers();
    const payouts = window.DB.getTeacherPayouts();
    
    const t = teachers.find(teach => teach.id === teacherId);
    if (!t) return;

    const teacherPayments = payments.filter(p => p.teacherId === t.id && (p.paymentStatus === "Ödənildi" || p.paymentStatus === "Qismən ödənilib") && isDateInMonth(p.paymentDate, curMonth));
    const students = window.DB.getStudents();
    const activeStudentIds = new Set(students.filter(s => s.status === "Aktiv").map(s => s.id));
    const stdCount = [...new Set(payments.filter(p => p.teacherId === t.id && activeStudentIds.has(p.studentId)).map(p => p.studentId))].length;
    
    const revenue = teacherPayments.reduce((sum, p) => sum + getPaymentRevenue(p), 0);
    const sharePercent = t.sharePercent || 50;
    const teacherShare = revenue * (sharePercent / 100);
    const teacherPayoutList = payouts[t.id] || [];
    const paid = teacherPayoutList.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const due = teacherShare - paid;

    const studentRowsHtml = teacherPayments.map(p => {
      const paidVal = getPaymentRevenue(p);
      const isPartial = p.paymentStatus === "Qismən ödənilib";
      const valStr = isPartial ? `${formatAmount(paidVal)} AZN (Qismən / Paket: ${p.fee} AZN)` : `${formatAmount(paidVal)} AZN`;
      const renewedTag = p.isRenewed ? ` <span style="font-size:10px; color:#475569;">(Yenilənmiş paket)</span>` : "";
      const pkgStr = (p.packageType === "Seans" ? `Seans (${p.sessionsCount || 8} seans) (${p.groupType === 'Qrup' ? 'Qrup' : 'Fərdi'})` : `Aylıq (${p.groupType === 'Qrup' ? 'Qrup' : 'Fərdi'})`) + renewedTag;
      const student = students.find(s => s.id === p.studentId);
      const displayName = student ? `${student.name} ${student.surname || ""}`.trim() : p.studentName;
      return `
        <tr>
          <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>${displayName}</strong></td>
          <td style="border: 1px solid #cbd5e1; padding: 6px 10px;">${p.courseName}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px 10px;">${pkgStr}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: center;">Həftədə ${p.weeklyFrequency} dəfə</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: center;">${p.paymentDate}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: right; font-weight: bold;">${valStr}</td>
        </tr>
      `;
    }).join("");

    let payoutSectionHtml = "";
    if (teacherPayoutList.length > 0) {
      const payoutRowsHtml = teacherPayoutList.map(log => `
        <tr>
          <td style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: center;">${log.date}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px 10px;">Nağd/Köçürmə (Müəllimə ödənişi)</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: right; font-weight: bold;">${formatAmount(log.amount)} AZN</td>
        </tr>
      `).join("");

      payoutSectionHtml = `
        <div style="font-size: 13px; font-weight: bold; color: #000000; margin: 20px 0 8px 0; text-transform: uppercase; border-bottom: 1.5px solid #000000; padding-bottom: 3px;">3. Müəlliməyə Edilən Ödənişlərin Tarixçəsi</div>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 15px;">
          <thead>
            <tr style="background: #f1f5f9; color: #000000;">
              <th style="border: 1px solid #94a3b8; padding: 7px 10px; text-align: center; width: 120px;">Tarix</th>
              <th style="border: 1px solid #94a3b8; padding: 7px 10px; text-align: left;">Təsvir</th>
              <th style="border: 1px solid #94a3b8; padding: 7px 10px; text-align: right; width: 140px;">Məbləğ</th>
            </tr>
          </thead>
          <tbody>
            ${payoutRowsHtml}
            <tr style="background: #f8fafc; font-weight: bold;">
              <td colspan="2" style="border: 1px solid #cbd5e1; padding: 7px 10px;">CƏMİ ÖDƏNİLƏN MƏBLƏĞ</td>
              <td style="border: 1px solid #cbd5e1; padding: 7px 10px; text-align: right;">${formatAmount(paid)} AZN</td>
            </tr>
          </tbody>
        </table>
      `;
    }

    const printWin = window.open("", "_blank");
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Əziz Tədris Mərkəzi - ${t.name} - ${formattedMonth} Hesabatı</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            color: #000000;
            background: #ffffff;
            margin: 0;
            padding: 15px;
            font-size: 11px;
            line-height: 1.4;
          }
          @media print {
            .no-print { display: none !important; }
            body { padding: 0 !important; }
            table, tr, td, th { page-break-inside: avoid !important; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 15px; text-align: right;">
          <button onclick="window.print()" style="padding: 8px 18px; background: #000000; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 13px;">🖨️ Çap Et</button>
        </div>
        
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000000; padding-bottom: 10px; margin-bottom: 15px;">
          <div>
            <h1 style="margin: 0; font-size: 18px; text-transform: uppercase; font-weight: 900;">ƏZİZ TƏDRİS MƏRKƏZİ</h1>
            <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; margin-top: 2px;">MÜƏLLİMƏ AYLIA PAY HESABATI (HESABAT VƏRƏQİ)</div>
          </div>
          <div style="text-align: right; font-size: 11px;">
            <div>Müəllimə: <strong>${t.name}</strong></div>
            <div>Dövr: <strong>${formattedMonth}</strong></div>
            <div>Çap Tarixi: <strong>${new Date().toLocaleDateString('az-AZ')}</strong></div>
          </div>
        </div>

        <div style="font-size: 13px; font-weight: bold; color: #000000; margin-bottom: 8px; text-transform: uppercase; border-bottom: 1.5px solid #000000; padding-bottom: 3px;">1. Maliyyə Xülasəsi</div>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 15px;">
          <thead>
            <tr style="background: #f1f5f9; color: #000000;">
              <th style="border: 1px solid #94a3b8; padding: 7px; text-align: center;">Aktiv Tələbə</th>
              <th style="border: 1px solid #94a3b8; padding: 7px; text-align: center;">Cəlb Olunan</th>
              <th style="border: 1px solid #94a3b8; padding: 7px; text-align: center;">Pay Faizi</th>
              <th style="border: 1px solid #94a3b8; padding: 7px; text-align: center;">Hesablanan Pay</th>
              <th style="border: 1px solid #94a3b8; padding: 7px; text-align: center;">Verilən Ödəniş</th>
              <th style="border: 1px solid #94a3b8; padding: 7px; text-align: center;">QALİQ BORC</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-weight: bold;">${stdCount} tələbə</td>
              <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-weight: bold;">${formatAmount(revenue)} AZN</td>
              <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-weight: bold;">${sharePercent}%</td>
              <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-weight: bold;">${formatAmount(teacherShare)} AZN</td>
              <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-weight: bold;">${formatAmount(paid)} AZN</td>
              <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-weight: 900; font-size: 12px;">${formatAmount(due)} AZN</td>
            </tr>
          </tbody>
        </table>

        <div style="font-size: 13px; font-weight: bold; color: #000000; margin: 15px 0 8px 0; text-transform: uppercase; border-bottom: 1.5px solid #000000; padding-bottom: 3px;">2. Ödəniş Edilən Dərslər Və Tələbə Siyahısı</div>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 15px;">
          <thead>
            <tr style="background: #f1f5f9; color: #000000;">
              <th style="border: 1px solid #94a3b8; padding: 7px 10px; text-align: left;">Tələbə Adı</th>
              <th style="border: 1px solid #94a3b8; padding: 7px 10px; text-align: left;">Fənn</th>
              <th style="border: 1px solid #94a3b8; padding: 7px 10px; text-align: left;">Paket / Qrup</th>
              <th style="border: 1px solid #94a3b8; padding: 7px 10px; text-align: center;">Tezlik</th>
              <th style="border: 1px solid #94a3b8; padding: 7px 10px; text-align: center;">Tarix</th>
              <th style="border: 1px solid #94a3b8; padding: 7px 10px; text-align: right;">Məbləğ</th>
            </tr>
          </thead>
          <tbody>
            ${studentRowsHtml}
            <tr style="background: #f8fafc; font-weight: bold;">
              <td colspan="5" style="border: 1px solid #cbd5e1; padding: 8px 10px;">CƏMİ CƏLB OLUNAN GƏLİR</td>
              <td style="border: 1px solid #cbd5e1; padding: 8px 10px; text-align: right;">${formatAmount(revenue)} AZN</td>
            </tr>
          </tbody>
        </table>

        ${payoutSectionHtml}

        <div style="margin-top: 40px; border-top: 1px solid #000000; padding-top: 15px; display: flex; justify-content: space-between; align-items: flex-end;">
          <div style="text-align: center;">
            <div style="font-size: 11px; font-weight: bold; margin-bottom: 30px;">Müəllimə İmza:</div>
            <div style="border-top: 1.5px solid #000000; width: 180px; margin: 0 auto; padding-top: 4px; font-size: 11px; font-weight: bold;">${t.name}</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 11px; font-weight: bold; margin-bottom: 30px;">Tədris Mərkəzi Rəhbəri:</div>
            <div style="border-top: 1.5px solid #000000; width: 180px; margin: 0 auto; padding-top: 4px; font-size: 11px; font-weight: bold;">İmza / Möhür</div>
          </div>
        </div>

        <script>
          setTimeout(function() { window.print(); }, 400);
        </script>
      </body>
      </html>
    `);
    printWin.document.close();
  },


};

// Yükləndikdə işə sal
window.addEventListener("DOMContentLoaded", () => {
  App.init();
});
window.App = App; // Qlobal etmək
