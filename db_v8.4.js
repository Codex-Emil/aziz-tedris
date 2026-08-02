/**
 * Əziz Tədris Mərkəzi - Verilənlər Bazası Modulu (db.js)
 * Tamamilə offline işləyir və localStorage-dan istifadə edir.
 */

const DB_PREFIX = "aziz_tedris_";

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

// Seans tipli dərslər üçün bitmə (növbəti ödəniş) tarixinin hesablanması
function calculateSessionDueDate(payment) {
  if (!payment.paymentDate || !payment.sessionsCount) return null;
  const start = parseSafeDate(payment.paymentDate);
  const freq = payment.weeklyFrequency || 2;
  const weeksNeeded = payment.sessionsCount / freq;
  const daysNeeded = Math.ceil(weeksNeeded * 7);
  const end = new Date(start.getTime() + daysNeeded * 24 * 60 * 60 * 1000);
  return `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
}

// Tarix aralığı üzrə keçirilmiş seansların sayının hesablanması
function dbCalculateSessionsOccurred(startDateStr, todayStr, weeklyFrequency, sessionsCount, payment = null) {
  if (!startDateStr || !todayStr) return 0;

  if (payment && payment.studentId && typeof this.getStudents === 'function') {
    const students = this.getStudents();
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
  if (freq === 3) {
    sessionDays = [1, 3, 5];
  } else if (freq === 1) {
    sessionDays = [3];
  } else if (freq === 4) {
    sessionDays = [1, 2, 4, 5];
  } else if (freq >= 5) {
    sessionDays = [1, 2, 3, 4, 5];
  }

  let current = new Date(start.getTime());
  let count = 0;
  while (current <= today && count < sessionsCount) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && sessionDays.includes(dayOfWeek)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}

// Defolt Müəllimlər və Fənlər (Təmiz başlamaq üçün boşdur)
const DEFAULT_TEACHERS = [];
const DEFAULT_COURSES = [];

const DB = {
  // Yaddaşdan məlumat oxumaq üçün köməkçi
  _get(key, defaultValue = []) {
    try {
      const data = localStorage.getItem(DB_PREFIX + key);
      if (!data) return defaultValue;
      return JSON.parse(data);
    } catch (e) {
      return defaultValue;
    }
  },

  // Yaddaşa yazmaq üçün köməkçi
  _set(key, data) {
    try {
      localStorage.setItem(DB_PREFIX + key, JSON.stringify(data));
    } catch (e) {
      console.error("LocalStorage write error:", e);
    }
  },

  // Bazanı sıfırlamaq və ya ilkin sazlamaq
  initialize() {
    if (!localStorage.getItem(DB_PREFIX + "initialized")) {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      this._set("teachers", []);
      this._set("courses", []);
      this._set("students", []);
      this._set("payments", {});
      this._set("expenses", {});
      this._set("teacher_payouts", {});
      this._set("current_month", currentMonth);
      localStorage.setItem(DB_PREFIX + "initialized", "true");
    }
    
    // Yarımçıq qalmış seans dərslərini aylardan aya avtomatik sinxronizasiya et
    this.healActiveSessions();
    // Müəllimə adlarını sinxronlaşdır
    this.syncTeacherNames();
  },

  syncTeacherNames() {
    const teachers = this.getTeachers();
    const allPayments = this._get("payments", {});
    let changed = false;

    Object.keys(allPayments).forEach(month => {
      const monthPayments = allPayments[month] || [];
      monthPayments.forEach(p => {
        const teacher = teachers.find(t => t.id === p.teacherId);
        if (teacher && p.teacherName !== teacher.name) {
          p.teacherName = teacher.name;
          changed = true;
        }
      });
    });

    if (changed) {
      this._set("payments", allPayments);
    }
  },

  healActiveSessions() {
    const students = this.getStudents();
    const allPayments = this._get("payments", {});
    const currentMonth = this.getCurrentMonth();
    
    const months = Object.keys(allPayments).sort();
    if (months.length <= 1) return;
    
    const currentIndex = months.indexOf(currentMonth);
    if (currentIndex === -1) return;
    
    let changed = false;
    
    for (let i = 0; i < currentIndex; i++) {
      const sourceMonth = months[i];
      const targetMonth = months[i + 1];
      const sourcePayments = allPayments[sourceMonth] || [];
      if (!allPayments[targetMonth]) allPayments[targetMonth] = [];
      const targetPayments = allPayments[targetMonth];
      
      const [year, month] = sourceMonth.split("-").map(Number);
      const lastDayStr = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;
      
      sourcePayments.forEach(oldPay => {
        if (oldPay.packageType === "Seans") {
          const student = students.find(s => s.id === oldPay.studentId);
          if (student && student.status === "Aktiv") {
            let isExpired = false;
            if (oldPay.paymentStatus === "Ödənildi") {
              const loggedAtEndOfMonth = dbCalculateSessionsOccurred(
                oldPay.sessionStartDate || oldPay.paymentDate,
                lastDayStr,
                oldPay.weeklyFrequency || 2,
                oldPay.sessionsCount
              );
              if (loggedAtEndOfMonth >= oldPay.sessionsCount) {
                isExpired = true;
              }
            }
            
            if (!isExpired) {
              const hasRecord = targetPayments.some(tp => tp.studentId === oldPay.studentId && tp.courseId === oldPay.courseId);
              if (!hasRecord) {
                const newPay = {
                  ...oldPay,
                  id: "pay_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
                };
                targetPayments.push(newPay);
                changed = true;
              }
            }
          }
        }
      });
    }
    
    if (changed) {
      this._set("payments", allPayments);
    }
  },

  // 1. Tələbə Əməliyyatları (Students)
  getStudents() {
    return this._get("students");
  },

  shiftStudentActivePackages(studentId, daysToShift) {
    if (!daysToShift || daysToShift <= 0) return;
    const allPayments = this._get("payments", {});
    let changed = false;

    Object.keys(allPayments).forEach(month => {
      const list = allPayments[month] || [];
      list.forEach(p => {
        if (p.studentId === studentId) {
          const baseStart = p.sessionStartDate || p.paymentDate;
          if (baseStart) {
            const startDate = parseSafeDate(baseStart);
            if (!isNaN(startDate.getTime())) {
              startDate.setDate(startDate.getDate() + daysToShift);
              p.sessionStartDate = startDate.toISOString().split('T')[0];
              changed = true;
            }
          }
          if (p.dueDate) {
            const dueDate = parseSafeDate(p.dueDate);
            if (!isNaN(dueDate.getTime())) {
              dueDate.setDate(dueDate.getDate() + daysToShift);
              p.dueDate = dueDate.toISOString().split('T')[0];
              changed = true;
            }
          }
        }
      });
    });

    if (changed) {
      this._set("payments", allPayments);
    }
  },

  saveStudent(student) {
    const students = this.getStudents();
    const index = students.findIndex(s => s.id === student.id);
    
    if (index > -1) {
      // Mövcud tələbənin status dəyişib-dəyişmədiyini yoxlayaq
      const oldStudent = students[index];
      student.lastActiveDate = oldStudent.lastActiveDate || null;
      student.statusDate = oldStudent.statusDate || null;

      if (oldStudent.status !== student.status) {
        const todayStr = new Date().toISOString().split('T')[0];

        // Əgər dondurulmuş tələbə yenidən Aktivləşdirilirsə:
        if (oldStudent.status === "Donduruldu" && student.status === "Aktiv") {
          const freezeStart = oldStudent.statusDate;
          if (freezeStart) {
            const freezeDateObj = parseSafeDate(freezeStart);
            const todayObj = parseSafeDate(todayStr);
            if (!isNaN(freezeDateObj.getTime()) && !isNaN(todayObj.getTime())) {
              const diffTime = todayObj.getTime() - freezeDateObj.getTime();
              const daysFrozen = Math.floor(diffTime / (1000 * 60 * 60 * 24));
              if (daysFrozen > 0) {
                this.shiftStudentActivePackages(student.id, daysFrozen);
              }
            }
          }
        }

        student.statusDate = todayStr;
        if (student.status === 'Aktiv') {
          student.lastActiveDate = todayStr;
        }
      }
      students[index] = student;
    } else {
      // Yeni tələbə
      student.id = "std_" + Date.now();
      student.statusDate = new Date().toISOString().split('T')[0];
      student.lastActiveDate = student.status === 'Aktiv' ? student.enrollDate : null;
      students.push(student);
    }
    this._set("students", students);
    return student;
  },

  deleteStudent(id) {
    let students = this.getStudents();
    students = students.filter(s => s.id !== id);
    this._set("students", students);

    // Ödəniş cədvəlindən bu tələbəyə aid bütün qeydləri silək (bütün aylardan)
    const allPayments = this._get("payments", {});
    let paymentsChanged = false;
    Object.keys(allPayments).forEach(month => {
      const originalLength = allPayments[month].length;
      allPayments[month] = allPayments[month].filter(p => p.studentId !== id);
      if (allPayments[month].length !== originalLength) {
        paymentsChanged = true;
      }
    });
    if (paymentsChanged) {
      this._set("payments", allPayments);
    }
  },

  // 2. Müəllimə və Fənn Əməliyyatları (Settings)
  getTeachers() {
    return this._get("teachers", DEFAULT_TEACHERS);
  },

  saveTeacher(teacher) {
    const teachers = this.getTeachers();
    const index = teachers.findIndex(t => t.id === teacher.id);
    if (index > -1) {
      const oldTeacher = teachers[index];
      teachers[index] = teacher;

      // Əgər müəllimənin adı dəyişibsə, bütün ödənişlərdəki adı da yeniləyək (cascade update)
      if (oldTeacher.name !== teacher.name) {
        const allPayments = this._get("payments", {});
        let changed = false;

        Object.keys(allPayments).forEach(month => {
          const monthPayments = allPayments[month] || [];
          monthPayments.forEach(p => {
            if (p.teacherId === teacher.id) {
              p.teacherName = teacher.name;
              changed = true;
            }
          });
        });

        if (changed) {
          this._set("payments", allPayments);
        }
      }
    } else {
      teacher.id = "t_" + Date.now();
      teachers.push(teacher);
    }
    this._set("teachers", teachers);
    return teacher;
  },

  deleteTeacher(id) {
    let teachers = this.getTeachers();
    teachers = teachers.filter(t => t.id !== id);
    this._set("teachers", teachers);
  },

  getCourses() {
    return this._get("courses", DEFAULT_COURSES);
  },

  saveCourse(course) {
    const courses = this.getCourses();
    const index = courses.findIndex(c => c.id === course.id);
    let oldCourse = null;
    
    if (index > -1) {
      oldCourse = { ...courses[index] };
      courses[index] = course;
    } else {
      course.id = "c_" + Date.now();
      courses.push(course);
    }
    this._set("courses", courses);

    // Əgər mövcud tədris növü redaktə olunubsa və müəlliməsi dəyişibsə,
    // cari aydakı ödəniş cədvəlində də həmin fənnə aid müəlliməni və fənn adını yeniləyək
    if (oldCourse && (oldCourse.teacherId !== course.teacherId || oldCourse.name !== course.name)) {
      const teachers = this.getTeachers();
      const newTeacher = teachers.find(t => t.id === course.teacherId);
      if (newTeacher) {
        const currentMonth = this.getCurrentMonth();
        const payments = this.getPayments(currentMonth);
        let changed = false;
        
        payments.forEach(p => {
          if (p.courseId === course.id || p.courseName === oldCourse.name) {
            p.courseName = course.name;
            p.teacherId = newTeacher.id;
            p.teacherName = newTeacher.name;
            changed = true;
          }
        });
        
        if (changed) {
          const allPayments = this._get("payments", {});
          allPayments[currentMonth] = payments;
          this._set("payments", allPayments);
        }
      }
    }

    return course;
  },

  deleteCourse(id) {
    let courses = this.getCourses();
    courses = courses.filter(c => c.id !== id);
    this._set("courses", courses);
  },

  // 3. Cari Ay İdarəetməsi
  getCurrentMonth() {
    const now = new Date();
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return this._get("current_month", defaultMonth);
  },

  setCurrentMonth(month) {
    this._set("current_month", month);
  },

  // 4. Ödənişlər (Payments)
  getPayments(month = this.getCurrentMonth()) {
    const allPayments = this._get("payments", {});
    const list = allPayments[month] || [];
    let updated = false;
    list.forEach(p => {
      if (!p.id) {
        p.id = "pay_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
        updated = true;
      }
    });
    if (updated) {
      allPayments[month] = list;
      this._set("payments", allPayments);
    }
    return list;
  },

  getAllPaymentsFlat() {
    const allPayments = this._get("payments", {});
    let flat = [];
    let updated = false;
    Object.keys(allPayments).forEach(m => {
      if (Array.isArray(allPayments[m])) {
        allPayments[m].forEach(p => {
          if (!p.id) {
            p.id = "pay_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
            updated = true;
          }
        });
        flat = flat.concat(allPayments[m]);
      }
    });
    if (updated) {
      this._set("payments", allPayments);
    }
    return flat;
  },

  savePayment(payment, month = this.getCurrentMonth()) {
    const allPayments = this._get("payments", {});
    if (!allPayments[month]) allPayments[month] = [];
    
    const index = allPayments[month].findIndex(p => p.id === payment.id);
    if (index > -1) {
      allPayments[month][index] = payment;
    } else {
      payment.id = "pay_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
      allPayments[month].push(payment);
    }
    this._set("payments", allPayments);
    return payment;
  },

  deletePayment(id, month = this.getCurrentMonth()) {
    const allPayments = this._get("payments", {});
    if (allPayments[month]) {
      allPayments[month] = allPayments[month].filter(p => p.id !== id);
      this._set("payments", allPayments);
    }
  },

  savePaymentAnyMonth(payment) {
    const allPayments = this._get("payments", {});
    let foundMonth = null;
    Object.keys(allPayments).forEach(m => {
      if (Array.isArray(allPayments[m])) {
        const idx = allPayments[m].findIndex(p => p.id === payment.id);
        if (idx > -1) {
          foundMonth = m;
        }
      }
    });

    if (foundMonth) {
      const idx = allPayments[foundMonth].findIndex(p => p.id === payment.id);
      allPayments[foundMonth][idx] = payment;
      this._set("payments", allPayments);
      return payment;
    } else {
      return this.savePayment(payment, this.getCurrentMonth());
    }
  },

  deletePaymentAnyMonth(id) {
    const allPayments = this._get("payments", {});
    Object.keys(allPayments).forEach(m => {
      if (Array.isArray(allPayments[m])) {
        allPayments[m] = allPayments[m].filter(p => p.id !== id);
      }
    });
    this._set("payments", allPayments);
  },

  // 5. Müəllimələrə Ödənilən Məbləğ (Payouts)
  getTeacherPayouts(month = this.getCurrentMonth()) {
    const allPayouts = this._get("teacher_payouts", {});
    const monthPayouts = allPayouts[month] || {};
    const normalized = {};
    Object.keys(monthPayouts).forEach(teacherId => {
      const val = monthPayouts[teacherId];
      if (Array.isArray(val)) {
        normalized[teacherId] = val;
      } else {
        // Köhnə formatı array-ə çeviririk
        normalized[teacherId] = [{ id: "p_init", amount: Number(val), date: "Cari Ay" }];
      }
    });
    return normalized;
  },

  saveTeacherPayout(teacherId, amount, date, month = this.getCurrentMonth()) {
    const allPayouts = this._get("teacher_payouts", {});
    if (!allPayouts[month]) allPayouts[month] = {};
    
    if (allPayouts[month][teacherId] !== undefined && !Array.isArray(allPayouts[month][teacherId])) {
      allPayouts[month][teacherId] = [{ id: "p_init", amount: Number(allPayouts[month][teacherId]), date: "Cari Ay" }];
    }
    
    if (!allPayouts[month][teacherId]) {
      allPayouts[month][teacherId] = [];
    }
    
    allPayouts[month][teacherId].push({
      id: "p_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
      amount: Number(amount),
      date: date || new Date().toISOString().split('T')[0]
    });
    
    this._set("teacher_payouts", allPayouts);
  },

  deleteTeacherPayout(teacherId, payoutId, month = this.getCurrentMonth()) {
    const allPayouts = this._get("teacher_payouts", {});
    if (allPayouts[month] && allPayouts[month][teacherId]) {
      if (!Array.isArray(allPayouts[month][teacherId])) {
        allPayouts[month][teacherId] = [{ id: "p_init", amount: Number(allPayouts[month][teacherId]), date: "Cari Ay" }];
      }
      allPayouts[month][teacherId] = allPayouts[month][teacherId].filter(p => p.id !== payoutId);
      this._set("teacher_payouts", allPayouts);
    }
  },

  // 6. Xərclər (Expenses)
  getExpenses(month = this.getCurrentMonth()) {
    const allExpenses = this._get("expenses", {});
    return allExpenses[month] || [];
  },

  saveExpense(expense) {
    const targetMonth = expense.date.substring(0, 7);
    const allExpenses = this._get("expenses", {});
    
    if (expense.id) {
      // Köhnə qeydi əvvəlki yerləşdiyi aydan silək (çünki tarix/ay dəyişmiş ola bilər)
      Object.keys(allExpenses).forEach(m => {
        if (Array.isArray(allExpenses[m])) {
          allExpenses[m] = allExpenses[m].filter(e => e.id !== expense.id);
        }
      });
    } else {
      expense.id = "exp_" + Date.now();
    }
    
    if (!allExpenses[targetMonth]) allExpenses[targetMonth] = [];
    allExpenses[targetMonth].push(expense);
    
    this._set("expenses", allExpenses);
    return expense;
  },

  deleteExpense(id) {
    const allExpenses = this._get("expenses", {});
    Object.keys(allExpenses).forEach(m => {
      if (Array.isArray(allExpenses[m])) {
        allExpenses[m] = allExpenses[m].filter(e => e.id !== id);
      }
    });
    this._set("expenses", allExpenses);
  },

  // 7. Arxivləşdirilmiş Ayların Siyahısı
  getArchiveMonths() {
    const allPayments = this._get("payments", {});
    return Object.keys(allPayments).sort().reverse();
  },

  transitionToMonth(newMonth) {
    const currentMonth = this.getCurrentMonth();
    if (currentMonth === newMonth) return;

    const allPayments = this._get("payments", {});

    // Əgər hədəf ay yoxdursa və ya boşdursa, həmin ayı cari aktiv uşaqların məlumatlarına görə kopyalaya bilərik.
    if (!allPayments[newMonth] || allPayments[newMonth].length === 0) {
      const students = this.getStudents();
      const currentPayments = this.getPayments(currentMonth);
      allPayments[newMonth] = [];

      // Aktiv uşaqların əvvəlki aydakı ödəniş qeydlərini analiz edək
      currentPayments.forEach(oldPay => {
        const student = students.find(s => s.id === oldPay.studentId);
        // Uşaq hələ də aktivdirsə, yeni aya keçiririk
        if (student && student.status === "Aktiv") {
          if (oldPay.packageType === "Aylıq") {
            // Aylıq paketlər yeni aya həmişə unpaid olaraq keçir
            const newPay = {
              id: "pay_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
              studentId: oldPay.studentId,
              studentName: oldPay.studentName,
              courseId: oldPay.courseId || null,
              courseName: oldPay.courseName,
              teacherName: oldPay.teacherName,
              teacherId: oldPay.teacherId,
              packageType: "Aylıq",
              groupType: oldPay.groupType,
              sessionsCount: null,
              weeklyFrequency: oldPay.weeklyFrequency,
              fee: oldPay.fee,
              dueDate: this.calculateNextMonthlyDueDate(student, newMonth),
              paymentStatus: "Ödənilməyib",
              paymentDate: null,
              sessionsLogged: 0
            };
            allPayments[newMonth].push(newPay);
          } else if (oldPay.packageType === "Seans") {
            // Köhnə ayın son günü etibarı ilə neçə seansın keçirildiyini hesablayaq
            let isExpired = false;
            if (oldPay.paymentStatus === "Ödənildi") {
              const [year, month] = currentMonth.split("-").map(Number);
              const lastDayStr = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;
              const loggedAtEndOfMonth = dbCalculateSessionsOccurred(
                oldPay.sessionStartDate || oldPay.paymentDate,
                lastDayStr,
                oldPay.weeklyFrequency || 2,
                oldPay.sessionsCount
              );

              if (loggedAtEndOfMonth >= oldPay.sessionsCount) {
                isExpired = true;
              }
            }
            
            // Əgər seans dərsləri köhnə ayın sonuna qədər hələ bitməyibsə, yeni aya keçiririk
            if (!isExpired) {
              const newPay = {
                ...oldPay,
                id: "pay_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
              };
              allPayments[newMonth].push(newPay);
            }
          }
        }
      });
      this._set("payments", allPayments);
    }

    this.setCurrentMonth(newMonth);
  },

  // Aylıq ödəniş gününün hesablanması (Qeydiyyat gününə görə)
  calculateNextMonthlyDueDate(student, targetMonth) {
    if (!student) return new Date().toISOString().split('T')[0];
    const baseDateStr = student.lastActiveDate || student.enrollDate || new Date().toISOString().split('T')[0];
    
    // Cross-browser safe parsing (Safari works fine with "YYYY/MM/DD")
    const baseDate = parseSafeDate(baseDateStr);
    let day = baseDate.getDate();
    if (isNaN(day)) day = 1;

    const [year, month] = targetMonth.split("-").map(Number);
    const lastDayOfTargetMonth = new Date(year, month, 0).getDate();
    const actualDay = Math.min(day, lastDayOfTargetMonth);

    return `${year}-${String(month).padStart(2, '0')}-${String(actualDay).padStart(2, '0')}`;
  },

  // 9. Data Backup & Restore
  exportData() {
    const keys = ["initialized", "teachers", "courses", "students", "expenses", "payments", "teacher_payouts", "current_month", "admin_password", "theme"];
    const backup = {};
    keys.forEach(k => {
      backup[k] = localStorage.getItem(DB_PREFIX + k);
    });
    return JSON.stringify(backup, null, 2);
  },

  importData(jsonString) {
    try {
      const backup = JSON.parse(jsonString);
      Object.keys(backup).forEach(k => {
        if (backup[k] !== null) {
          localStorage.setItem(DB_PREFIX + k, backup[k]);
        }
      });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  getAdminPassword() {
    return this._get("admin_password", "12345");
  },

  setAdminPassword(password) {
    this._set("admin_password", password);
  },

  getTheme() {
    return this._get("theme", "dark");
  },

  setTheme(theme) {
    this._set("theme", theme);
  },

  // Bütün bazanı təmizləmək (Müəllimlər və Fənlər qorunur!)
  resetAll() {
    const teachers = this.getTeachers();
    const courses = this.getCourses();

    const keys = ["initialized", "teachers", "courses", "students", "expenses", "payments", "teacher_payouts", "current_month"];
    keys.forEach(k => {
      localStorage.removeItem(DB_PREFIX + k);
    });

    this.initialize();

    if (teachers.length > 0) this._set("teachers", teachers);
    if (courses.length > 0) this._set("courses", courses);
  }
};

// Bazanı işə salırıq
DB.initialize();
window.DB = DB; // Qlobal etmək ki, digər scriptlər istifadə edə bilsin
