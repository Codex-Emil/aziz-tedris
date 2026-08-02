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
    const backupData = {
  "initialized": true,
  "teachers": [
    {
      "id": "t1",
      "name": "Pərvanə m.",
      "sharePercent": 60
    },
    {
      "id": "t2",
      "name": "Natavan m.",
      "sharePercent": 50
    },
    {
      "id": "t3",
      "name": "Rövşanə m.",
      "sharePercent": 50
    },
    {
      "id": "t4",
      "name": "Səba m.",
      "sharePercent": 50
    },
    {
      "id": "t5",
      "name": "Fatimə m.",
      "sharePercent": 50
    },
    {
      "id": "t_1783363696932",
      "name": "Nərmin m.",
      "sharePercent": 50
    },
    {
      "id": "t_1783363713798",
      "name": "Aytən m.",
      "sharePercent": 50
    },
    {
      "id": "t_1783363738768",
      "name": "Sevinc m.",
      "sharePercent": 50
    },
    {
      "id": "t_1783363759267",
      "name": "Nərminə m.",
      "sharePercent": 50
    },
    {
      "id": "t_1783363774084",
      "name": "Aynur m.",
      "sharePercent": 50
    }
  ],
  "courses": [
    {
      "id": "c1",
      "name": "İbtidai sinif qrup (rus)",
      "teacherId": "t1",
      "defaultFee": 80
    },
    {
      "id": "c2",
      "name": "İbtidai sinif qrup (az)",
      "teacherId": "t2",
      "defaultFee": 80
    },
    {
      "id": "c3",
      "name": "İngilis dili (az)",
      "teacherId": "t_1783363696932",
      "defaultFee": 100
    },
    {
      "id": "c4",
      "name": "İngilis dili (rus)",
      "teacherId": "t_1783363713798",
      "defaultFee": 100
    },
    {
      "id": "c5",
      "name": "Rəqs",
      "teacherId": "t_1783363738768",
      "defaultFee": 60
    },
    {
      "id": "c6",
      "name": "Gimnastika",
      "teacherId": "t_1783363759267",
      "defaultFee": 70
    },
    {
      "id": "c7",
      "name": "Rəsm",
      "teacherId": "t5",
      "defaultFee": 50
    },
    {
      "id": "c8",
      "name": "Şahmat",
      "teacherId": "t4",
      "defaultFee": 60
    },
    {
      "id": "c9",
      "name": "Psixoloq",
      "teacherId": "t_1783363774084",
      "defaultFee": 120
    },
    {
      "id": "c10",
      "name": "Loqoped",
      "teacherId": "t3",
      "defaultFee": 120
    }
  ],
  "students": [
    {
      "id": "std_1783365786841",
      "name": "Rauf",
      "surname": "",
      "parentName": "Sabina xanım",
      "phone": "",
      "enrollDate": "2026-01-12",
      "status": "Donduruldu",
      "lastActiveDate": "2026-01-12",
      "statusDate": "2026-07-15"
    },
    {
      "id": "std_1783365865574",
      "name": "Nihad",
      "surname": "",
      "parentName": "Tünzalə xanım",
      "phone": "",
      "enrollDate": "2026-06-02",
      "status": "Aktiv",
      "statusDate": "2026-07-06",
      "lastActiveDate": "2026-06-02"
    },
    {
      "id": "std_1783366073623",
      "name": "İsmayıl",
      "surname": "",
      "parentName": "Səlimə xanım",
      "phone": "",
      "enrollDate": "2026-06-15",
      "status": "Aktiv",
      "lastActiveDate": "2026-07-29",
      "statusDate": "2026-07-29"
    },
    {
      "id": "std_1783366161874",
      "name": "Aliyə",
      "surname": "Cəfərzadə",
      "parentName": "Yeganə xanım",
      "phone": "0558208997",
      "enrollDate": "2026-06-30",
      "status": "Aktiv",
      "lastActiveDate": "2026-06-30",
      "statusDate": "2026-07-06"
    },
    {
      "id": "std_1783367111359",
      "name": "Polad",
      "surname": "",
      "parentName": "",
      "phone": "",
      "enrollDate": "2026-05-09",
      "status": "Donduruldu",
      "lastActiveDate": "2026-05-09",
      "statusDate": "2026-07-27"
    },
    {
      "id": "std_1783367148442",
      "name": "Nuray",
      "surname": "",
      "parentName": "",
      "phone": "",
      "enrollDate": "2026-02-22",
      "status": "Donduruldu",
      "lastActiveDate": "2026-02-22",
      "statusDate": "2026-07-27"
    },
    {
      "id": "std_1783367190242",
      "name": "Məryəm",
      "surname": "",
      "parentName": "",
      "phone": "",
      "enrollDate": "2026-02-15",
      "status": "Donduruldu",
      "lastActiveDate": "2026-02-15",
      "statusDate": "2026-07-27"
    },
    {
      "id": "std_1783367647426",
      "name": "Fatimə",
      "surname": "İsmayılova",
      "parentName": "",
      "phone": "",
      "enrollDate": "2026-05-11",
      "status": "Aktiv",
      "statusDate": "2026-07-06",
      "lastActiveDate": "2026-05-11"
    },
    {
      "id": "std_1783367709542",
      "name": "Əbülfəz",
      "surname": "",
      "parentName": "",
      "phone": "",
      "enrollDate": "2026-06-22",
      "status": "Aktiv",
      "statusDate": "2026-07-06",
      "lastActiveDate": "2026-06-22"
    },
    {
      "id": "std_1783367888279",
      "name": "Emiliya",
      "surname": "",
      "parentName": "Səbinə xanım",
      "phone": "0126666666",
      "enrollDate": "2026-06-22",
      "status": "Aktiv",
      "lastActiveDate": "2026-06-22",
      "statusDate": "2026-07-06"
    },
    {
      "id": "std_1783367958062",
      "name": "Murad",
      "surname": "",
      "parentName": "Aytac xanım",
      "phone": "",
      "enrollDate": "2026-06-18",
      "status": "Donduruldu",
      "lastActiveDate": "2026-06-18",
      "statusDate": "2026-07-15"
    },
    {
      "id": "std_1783367986409",
      "name": "Nərgiz",
      "surname": "Kərimli",
      "parentName": "Gültəkin xanım",
      "phone": "0702530098",
      "enrollDate": "2026-06-18",
      "status": "Aktiv",
      "lastActiveDate": "2026-06-18",
      "statusDate": "2026-07-06"
    },
    {
      "id": "std_1783368069311",
      "name": "Xədicə",
      "surname": "",
      "parentName": "Elnurə xanım",
      "phone": "",
      "enrollDate": "2026-06-22",
      "status": "Aktiv",
      "statusDate": "2026-07-06",
      "lastActiveDate": "2026-06-22"
    },
    {
      "id": "std_1783368110528",
      "name": "Afaq xanım",
      "surname": "",
      "parentName": "",
      "phone": "",
      "enrollDate": "2026-06-22",
      "status": "Aktiv",
      "statusDate": "2026-07-06",
      "lastActiveDate": "2026-06-22"
    },
    {
      "id": "std_1783368333279",
      "name": "Milana",
      "surname": "",
      "parentName": "",
      "phone": "",
      "enrollDate": "2026-06-05",
      "status": "Donduruldu",
      "lastActiveDate": "2026-06-05",
      "statusDate": "2026-07-15"
    },
    {
      "id": "std_1783368416308",
      "name": "Diana",
      "surname": "",
      "parentName": "",
      "phone": "",
      "enrollDate": "2026-06-02",
      "status": "Donduruldu",
      "lastActiveDate": "2026-06-02",
      "statusDate": "2026-07-07"
    },
    {
      "id": "std_1783368485694",
      "name": "İnci",
      "surname": "Əlizadə",
      "parentName": "Zulfiyə xanim",
      "phone": "0556375038",
      "enrollDate": "2026-06-08",
      "status": "Aktiv",
      "lastActiveDate": "2026-06-08",
      "statusDate": "2026-07-06"
    },
    {
      "id": "std_1783368720538",
      "name": "Xədicə",
      "surname": "Məmmədli",
      "parentName": "Ayşən xanım",
      "phone": "",
      "enrollDate": "2026-03-12",
      "status": "Aktiv",
      "statusDate": "2026-07-06",
      "lastActiveDate": "2026-03-12"
    },
    {
      "id": "std_1783368766556",
      "name": "Milana",
      "surname": "Əliyeva",
      "parentName": "Xanım xanım",
      "phone": "",
      "enrollDate": "2026-04-27",
      "status": "Donduruldu",
      "lastActiveDate": "2026-04-27",
      "statusDate": "2026-07-15"
    },
    {
      "id": "std_1783368818211",
      "name": "Diana",
      "surname": "Əlicanova",
      "parentName": "Dilarə xanım",
      "phone": "",
      "enrollDate": "2026-06-02",
      "status": "Aktiv",
      "statusDate": "2026-07-06",
      "lastActiveDate": "2026-06-02"
    },
    {
      "id": "std_1783368899840",
      "name": "Çiçək",
      "surname": "",
      "parentName": "Rəqsanə xanım",
      "phone": "",
      "enrollDate": "2026-06-16",
      "status": "Aktiv",
      "statusDate": "2026-07-06",
      "lastActiveDate": "2026-06-16"
    },
    {
      "id": "std_1783368960243",
      "name": "Ayan",
      "surname": "",
      "parentName": "Aysel xanım",
      "phone": "",
      "enrollDate": "2026-06-26",
      "status": "Aktiv",
      "lastActiveDate": "2026-06-26",
      "statusDate": "2026-07-06"
    },
    {
      "id": "std_1783369229905",
      "name": "Şamil",
      "surname": "",
      "parentName": "",
      "phone": "",
      "enrollDate": "2026-06-18",
      "status": "Aktiv",
      "statusDate": "2026-07-06",
      "lastActiveDate": "2026-06-18"
    },
    {
      "id": "std_1783372487562",
      "name": "Mikayıl",
      "surname": "",
      "parentName": "",
      "phone": "",
      "enrollDate": "2026-06-10",
      "status": "Aktiv",
      "statusDate": "2026-07-06",
      "lastActiveDate": "2026-06-10"
    },
    {
      "id": "std_1783376322807",
      "name": "Tunar",
      "surname": "",
      "parentName": "",
      "phone": "",
      "enrollDate": "2026-06-12",
      "status": "Aktiv",
      "statusDate": "2026-07-06",
      "lastActiveDate": "2026-06-12"
    },
    {
      "id": "std_1783441283898",
      "name": "Ayaz",
      "surname": "",
      "parentName": "",
      "phone": "",
      "enrollDate": "2026-06-26",
      "status": "Aktiv",
      "lastActiveDate": "2026-06-12",
      "statusDate": "2026-07-07"
    },
    {
      "id": "std_1783445352542",
      "name": "Alisa",
      "surname": "",
      "parentName": "Lamiyə xanım",
      "phone": "",
      "enrollDate": "2026-07-02",
      "status": "Aktiv",
      "statusDate": "2026-07-07",
      "lastActiveDate": "2026-07-02"
    },
    {
      "id": "std_1783445955414",
      "name": "Nilay",
      "surname": "",
      "parentName": "",
      "phone": "",
      "enrollDate": "2026-07-06",
      "status": "Donduruldu",
      "lastActiveDate": "2026-07-06",
      "statusDate": "2026-07-24"
    },
    {
      "id": "std_1783446164431",
      "name": "Duyğu",
      "surname": "",
      "parentName": "Nigar xanım",
      "phone": "",
      "enrollDate": "2026-07-07",
      "status": "Aktiv",
      "lastActiveDate": "2026-07-03",
      "statusDate": "2026-07-07"
    },
    {
      "id": "std_1783446336579",
      "name": "Məhəmməd",
      "surname": "",
      "parentName": "Nigar xanım",
      "phone": "",
      "enrollDate": "2026-07-03",
      "status": "Aktiv",
      "statusDate": "2026-07-07",
      "lastActiveDate": "2026-07-03"
    },
    {
      "id": "std_1783583787104",
      "name": "Fidan",
      "surname": "Qasimzadə",
      "parentName": "Nəzrin xanim",
      "phone": "0557719195",
      "enrollDate": "2026-07-09",
      "status": "Aktiv",
      "lastActiveDate": "2026-07-09",
      "statusDate": "2026-07-09"
    },
    {
      "id": "std_1783584058634",
      "name": "İnci",
      "surname": "Həsənova",
      "parentName": "Həcər xanim",
      "phone": "0707201498",
      "enrollDate": "2026-07-09",
      "status": "Aktiv",
      "lastActiveDate": "2026-08-02",
      "statusDate": "2026-08-02"
    },
    {
      "id": "std_1783584372790",
      "name": "İbrahim",
      "surname": "Həsənov",
      "parentName": "Həcər xanim",
      "phone": "0707201498",
      "enrollDate": "2026-07-09",
      "status": "Aktiv",
      "lastActiveDate": "2026-08-02",
      "statusDate": "2026-08-02"
    },
    {
      "id": "std_1783584522706",
      "name": "Yusif",
      "surname": "Həsənov",
      "parentName": "Həcər xanim",
      "phone": "0707201498",
      "enrollDate": "2026-07-09",
      "status": "Aktiv",
      "lastActiveDate": "2026-08-02",
      "statusDate": "2026-08-02"
    },
    {
      "id": "std_1783587479028",
      "name": "Mətanət",
      "surname": "",
      "parentName": "Təzəgül xanim",
      "phone": "0556350242",
      "enrollDate": "2026-07-09",
      "status": "Aktiv",
      "lastActiveDate": "2026-07-09",
      "statusDate": "2026-07-09"
    },
    {
      "id": "std_1783615090017",
      "name": "Rəvan",
      "surname": "",
      "parentName": "",
      "phone": "",
      "enrollDate": "2026-07-09",
      "status": "Donduruldu",
      "lastActiveDate": "2026-07-09",
      "statusDate": "2026-07-21"
    },
    {
      "id": "std_1784131042760",
      "name": "Rüqəyya",
      "surname": "Rəhimli",
      "parentName": "",
      "phone": "",
      "enrollDate": "2026-07-16",
      "status": "Aktiv",
      "statusDate": "2026-07-15",
      "lastActiveDate": "2026-07-16"
    },
    {
      "id": "std_1784131149517",
      "name": "Nuray",
      "surname": "Rəhimli",
      "parentName": "",
      "phone": "",
      "enrollDate": "2026-07-16",
      "status": "Aktiv",
      "statusDate": "2026-07-15",
      "lastActiveDate": "2026-07-16"
    },
    {
      "id": "std_1784131961669",
      "name": "Emin",
      "surname": "",
      "parentName": "",
      "phone": "",
      "enrollDate": "2026-06-16",
      "status": "Aktiv",
      "statusDate": "2026-07-15",
      "lastActiveDate": "2026-06-16"
    },
    {
      "id": "std_1784216628065",
      "name": "Aydan",
      "surname": "Məmiyeva",
      "parentName": "",
      "phone": "",
      "enrollDate": "2026-07-16",
      "status": "Aktiv",
      "statusDate": "2026-07-16",
      "lastActiveDate": "2026-07-16"
    },
    {
      "id": "std_1784216840133",
      "name": "Tamerlan",
      "surname": "",
      "parentName": "",
      "phone": "",
      "enrollDate": "2026-07-20",
      "status": "Aktiv",
      "statusDate": "2026-07-16",
      "lastActiveDate": "2026-07-20"
    },
    {
      "id": "std_1784309929508",
      "name": "Xədicə",
      "surname": "Abdullayeva",
      "parentName": "Aytac xanım",
      "phone": "",
      "enrollDate": "2026-07-17",
      "status": "Aktiv",
      "lastActiveDate": "2026-07-17",
      "statusDate": "2026-07-17"
    },
    {
      "id": "std_1784626548869",
      "name": "Hüseyn",
      "surname": "Haqverdiyev",
      "parentName": "",
      "phone": "",
      "enrollDate": "2026-07-21",
      "status": "Aktiv",
      "statusDate": "2026-07-21",
      "lastActiveDate": "2026-07-21"
    },
    {
      "id": "std_1784880938189",
      "name": "Mətanət",
      "surname": "Babazadə",
      "parentName": "Fatimə",
      "phone": "0103721995",
      "enrollDate": "2026-07-24",
      "status": "Donduruldu",
      "lastActiveDate": "2026-07-24",
      "statusDate": "2026-07-29"
    },
    {
      "id": "std_1785164921358",
      "name": "Həmid",
      "surname": "",
      "parentName": "",
      "phone": "",
      "enrollDate": "2026-07-27",
      "status": "Aktiv",
      "statusDate": "2026-07-27",
      "lastActiveDate": "2026-07-27"
    },
    {
      "id": "std_1785165138971",
      "name": "Ümüd",
      "surname": "",
      "parentName": "",
      "phone": "",
      "enrollDate": "2026-07-27",
      "status": "Aktiv",
      "statusDate": "2026-07-27",
      "lastActiveDate": "2026-07-27"
    },
    {
      "id": "std_1785224754231",
      "name": "Zoya",
      "surname": "",
      "parentName": "Leyla xanim",
      "phone": "",
      "enrollDate": "2026-07-28",
      "status": "Aktiv",
      "lastActiveDate": "2026-07-28",
      "statusDate": "2026-07-28"
    },
    {
      "id": "std_1785350910182",
      "name": "Aysu",
      "surname": "Dadıyeva",
      "parentName": "İlahə",
      "phone": "",
      "enrollDate": "2026-07-28",
      "status": "Aktiv",
      "statusDate": "2026-07-29",
      "lastActiveDate": "2026-07-28"
    },
    {
      "id": "std_1785426941710",
      "name": "Mehdi",
      "surname": "",
      "parentName": "Səadət",
      "phone": "",
      "enrollDate": "2026-07-20",
      "status": "Aktiv",
      "statusDate": "2026-07-30",
      "lastActiveDate": "2026-07-20"
    },
    {
      "id": "std_1785658050897",
      "name": "Ebutalib",
      "surname": "Ceferov",
      "parentName": "Zeyneb xanim",
      "phone": "0703139753",
      "enrollDate": "2026-08-02",
      "status": "Aktiv",
      "statusDate": "2026-08-02",
      "lastActiveDate": "2026-08-02"
    }
  ],
  "expenses": {
    "2026-07": [
      {
        "title": "Alim m.",
        "amount": 30,
        "date": "2026-07-02",
        "id": "exp_1783446738462"
      },
      {
        "title": "Alim m.",
        "amount": 29,
        "date": "2026-07-03",
        "id": "exp_1783446760663"
      },
      {
        "title": "Alim m.",
        "amount": 68,
        "date": "2026-07-03",
        "id": "exp_1783446781312"
      },
      {
        "title": "AzərSu",
        "amount": 50,
        "date": "2026-07-14",
        "id": "exp_1784055609671"
      },
      {
        "title": "Alim m.",
        "amount": 100,
        "date": "2026-07-16",
        "id": "exp_1784216113402"
      },
      {
        "title": "Ləman x.",
        "amount": 240,
        "date": "2026-07-25",
        "id": "exp_1785002507902"
      },
      {
        "title": "Alim m.",
        "amount": 70,
        "date": "2026-07-27",
        "id": "exp_1785164694854"
      },
      {
        "id": "exp_1783583557855",
        "title": "Alim m.",
        "amount": 100,
        "date": "2026-07-09"
      },
      {
        "id": "exp_1784194295610",
        "title": "Alim m.",
        "amount": 25,
        "date": "2026-07-16"
      },
      {
        "id": "exp_1784029027573",
        "title": "Leman x.",
        "amount": 27,
        "date": "2026-07-10"
      },
      {
        "id": "exp_1784029065460",
        "title": "Alim m.",
        "amount": 30,
        "date": "2026-07-14"
      },
      {
        "id": "exp_1785244392224",
        "title": "Alim   m.",
        "amount": 100,
        "date": "2026-07-28"
      },
      {
        "id": "exp_1785268866023",
        "title": "Alim m.",
        "amount": 67,
        "date": "2026-07-29"
      },
      {
        "id": "exp_1785348757336",
        "title": "Rəsm  ləvazimatları",
        "amount": 8,
        "date": "2026-07-29"
      },
      {
        "id": "exp_1785511980033",
        "title": "Alim.",
        "amount": 150,
        "date": "2026-07-31"
      },
      {
        "id": "exp_1785663679874",
        "title": "Alim m.",
        "amount": 62.5,
        "date": "2026-07-31"
      }
    ]
  },
  "payments": {
    "2026-06": [
      {
        "id": "pay_1783366341253_80rya",
        "studentId": "std_1783365786841",
        "studentName": "Rauf",
        "courseId": "c1",
        "courseName": "İbtidai sinif qrup (rus)",
        "teacherName": "Pərvanə m.",
        "teacherId": "t1",
        "packageType": "Aylıq",
        "groupType": "Qrup",
        "sessionsCount": null,
        "weeklyFrequency": 2,
        "fee": 90,
        "dueDate": "2026-06-12",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-06-17",
        "sessionsLogged": 0
      },
      {
        "id": "pay_1783366341253_uda8c",
        "studentId": "std_1783365865574",
        "studentName": "Nihad",
        "courseId": "c1",
        "courseName": "İbtidai sinif qrup (rus)",
        "teacherName": "Pərvanə m.",
        "teacherId": "t1",
        "packageType": "Aylıq",
        "groupType": "Qrup",
        "sessionsCount": null,
        "weeklyFrequency": 2,
        "fee": 60,
        "dueDate": "2026-06-02",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-06-02",
        "sessionsLogged": 0
      },
      {
        "id": "pay_1783366341253_22ybd",
        "studentId": "std_1783366073623",
        "studentName": "İsmayıl",
        "courseId": "c1",
        "courseName": "İbtidai sinif qrup (rus)",
        "teacherName": "Pərvanə m.",
        "teacherId": "t1",
        "packageType": "Aylıq",
        "groupType": "Qrup",
        "sessionsCount": null,
        "weeklyFrequency": 2,
        "fee": 60,
        "dueDate": "2026-06-15",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-06-15",
        "sessionsLogged": 0,
        "sessionStartDate": "2026-06-15"
      },
      {
        "id": "pay_1783366341253_g8qvq",
        "studentId": "std_1783366161874",
        "studentName": "Aliyə",
        "courseId": "c1",
        "courseName": "İbtidai sinif qrup (rus)",
        "teacherName": "Pərvanə m.",
        "teacherId": "t1",
        "packageType": "Aylıq",
        "groupType": "Qrup",
        "sessionsCount": null,
        "weeklyFrequency": 2,
        "fee": 90,
        "dueDate": "2026-06-30",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-06-30",
        "sessionsLogged": 0
      },
      {
        "id": "pay_1783367111359_iidfi",
        "studentId": "std_1783367111359",
        "studentName": "Polad",
        "courseId": "c4",
        "courseName": "İngilis dili (rus)",
        "teacherName": "Aytən m.",
        "teacherId": "t_1783363713798",
        "packageType": "Aylıq",
        "groupType": "Qrup",
        "sessionsCount": null,
        "weeklyFrequency": 2,
        "fee": 110,
        "dueDate": "2026-06-09",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-06-15",
        "sessionsLogged": 0
      },
      {
        "id": "pay_1783367148442_zal0a",
        "studentId": "std_1783367148442",
        "studentName": "Nuray",
        "courseId": "c4",
        "courseName": "İngilis dili (rus)",
        "teacherName": "Aytən m.",
        "teacherId": "t_1783363713798",
        "packageType": "Aylıq",
        "groupType": "Qrup",
        "sessionsCount": null,
        "weeklyFrequency": 2,
        "fee": 60,
        "dueDate": "2026-06-22",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-06-22",
        "sessionsLogged": 0
      },
      {
        "id": "pay_1783367190242_i2st9",
        "studentId": "std_1783367190242",
        "studentName": "Məryəm",
        "courseId": "c4",
        "courseName": "İngilis dili (rus)",
        "teacherName": "Aytən m.",
        "teacherId": "t_1783363713798",
        "packageType": "Aylıq",
        "groupType": "Qrup",
        "sessionsCount": null,
        "weeklyFrequency": 2,
        "fee": 60,
        "dueDate": "2026-06-15",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-06-22",
        "sessionsLogged": 0
      },
      {
        "id": "pay_1783367647426_c2ir8",
        "studentId": "std_1783367647426",
        "studentName": "Fatimə İsmayılova",
        "courseId": "c2",
        "courseName": "İbtidai sinif qrup (az)",
        "teacherName": "Natavan m.",
        "teacherId": "t2",
        "packageType": "Aylıq",
        "groupType": "Qrup",
        "sessionsCount": null,
        "weeklyFrequency": 2,
        "fee": 50,
        "dueDate": "2026-06-11",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-06-17",
        "sessionsLogged": 0
      },
      {
        "id": "pay_1783367709542_mahmt",
        "studentId": "std_1783367709542",
        "studentName": "Əbülfəz",
        "courseId": "c2",
        "courseName": "İbtidai sinif qrup (az)",
        "teacherName": "Natavan m.",
        "teacherId": "t2",
        "packageType": "Aylıq",
        "groupType": "Qrup",
        "sessionsCount": null,
        "weeklyFrequency": 2,
        "fee": 50,
        "dueDate": "2026-06-22",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-06-22",
        "sessionsLogged": 0
      },
      {
        "id": "pay_1783367888279_y9yx8",
        "studentId": "std_1783367888279",
        "studentName": "Emiliya",
        "courseId": "c5",
        "courseName": "Rəqs",
        "teacherName": "Sevinc m.",
        "teacherId": "t_1783363738768",
        "packageType": "Aylıq",
        "groupType": "Qrup",
        "sessionsCount": null,
        "weeklyFrequency": 2,
        "fee": 30,
        "dueDate": "2026-06-22",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-06-25",
        "sessionsLogged": 0
      },
      {
        "id": "pay_1783367958062_0b4bx",
        "studentId": "std_1783367958062",
        "studentName": "Murad",
        "courseId": "c5",
        "courseName": "Rəqs",
        "teacherName": "Sevinc m.",
        "teacherId": "t_1783363738768",
        "packageType": "Aylıq",
        "groupType": "Qrup",
        "sessionsCount": null,
        "weeklyFrequency": 2,
        "fee": 30,
        "dueDate": "2026-06-18",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-06-22",
        "sessionsLogged": 0
      },
      {
        "id": "pay_1783367986409_1bd86",
        "studentId": "std_1783367986409",
        "studentName": "Nərgiz",
        "courseId": "c5",
        "courseName": "Rəqs",
        "teacherName": "Sevinc m.",
        "teacherId": "t_1783363738768",
        "packageType": "Aylıq",
        "groupType": "Qrup",
        "sessionsCount": null,
        "weeklyFrequency": 2,
        "fee": 30,
        "dueDate": "2026-06-18",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-06-18",
        "sessionsLogged": 0
      },
      {
        "id": "pay_1783368069311_cvlr0",
        "studentId": "std_1783368069311",
        "studentName": "Xədicə",
        "courseId": "c5",
        "courseName": "Rəqs",
        "teacherName": "Sevinc m.",
        "teacherId": "t_1783363738768",
        "packageType": "Aylıq",
        "groupType": "Qrup",
        "sessionsCount": null,
        "weeklyFrequency": 2,
        "fee": 40,
        "dueDate": "2026-06-22",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-06-25",
        "sessionsLogged": 0
      },
      {
        "id": "pay_1783368110528_meebi",
        "studentId": "std_1783368110528",
        "studentName": "Afaq xanım",
        "courseId": "c5",
        "courseName": "Rəqs",
        "teacherName": "Sevinc m.",
        "teacherId": "t_1783363738768",
        "packageType": "Aylıq",
        "groupType": "Fərdi",
        "sessionsCount": null,
        "weeklyFrequency": 2,
        "fee": 50,
        "dueDate": "2026-06-22",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-06-22",
        "sessionsLogged": 0
      },
      {
        "id": "pay_1783368333279_e2xgv",
        "studentId": "std_1783368333279",
        "studentName": "Milana",
        "courseId": "c6",
        "courseName": "Gimnastika",
        "teacherName": "Nərminə m.",
        "teacherId": "t_1783363759267",
        "packageType": "Aylıq",
        "groupType": "Qrup",
        "sessionsCount": null,
        "weeklyFrequency": 2,
        "fee": 40,
        "dueDate": "2026-06-05",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-06-05",
        "sessionsLogged": 0
      },
      {
        "id": "pay_1783368416309_mwdnd",
        "studentId": "std_1783368416308",
        "studentName": "Diana",
        "courseId": "c6",
        "courseName": "Gimnastika",
        "teacherName": "Nərminə m.",
        "teacherId": "t_1783363759267",
        "packageType": "Aylıq",
        "groupType": "Qrup",
        "sessionsCount": null,
        "weeklyFrequency": 2,
        "fee": 40,
        "dueDate": "2026-06-02",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-06-03",
        "sessionsLogged": 0
      },
      {
        "id": "pay_1783368441845_a1v9g",
        "studentId": "std_1783366161874",
        "studentName": "Aliyə",
        "courseId": "c6",
        "courseName": "Gimnastika",
        "teacherName": "Nərminə m.",
        "teacherId": "t_1783363759267",
        "packageType": "Aylıq",
        "groupType": "Qrup",
        "sessionsCount": null,
        "weeklyFrequency": 2,
        "fee": 40,
        "dueDate": "2026-06-16",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-06-17",
        "sessionsLogged": 0
      },
      {
        "id": "pay_1783368485695_7qryz",
        "studentId": "std_1783368485694",
        "studentName": "İnci",
        "courseId": "c6",
        "courseName": "Gimnastika",
        "teacherName": "Nərminə m.",
        "teacherId": "t_1783363759267",
        "packageType": "Aylıq",
        "groupType": "Qrup",
        "sessionsCount": null,
        "weeklyFrequency": 2,
        "fee": 40,
        "dueDate": "2026-06-08",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-06-10",
        "sessionsLogged": 0
      },
      {
        "id": "pay_1783368511130_m2s74",
        "studentId": "std_1783365786841",
        "studentName": "Rauf",
        "courseId": "c6",
        "courseName": "Gimnastika",
        "teacherName": "Nərminə m.",
        "teacherId": "t_1783363759267",
        "packageType": "Aylıq",
        "groupType": "Qrup",
        "sessionsCount": null,
        "weeklyFrequency": 2,
        "fee": 40,
        "dueDate": "2026-06-17",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-06-24",
        "sessionsLogged": 0
      },
      {
        "id": "pay_1783368720538_2su36",
        "studentId": "std_1783368720538",
        "studentName": "Xədicə Məmmədli",
        "courseId": "c7",
        "courseName": "Rəsm",
        "teacherName": "Fatimə m.",
        "teacherId": "t5",
        "packageType": "Aylıq",
        "groupType": "Qrup",
        "sessionsCount": null,
        "weeklyFrequency": 2,
        "fee": 30,
        "dueDate": "2026-06-12",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-06-15",
        "sessionsLogged": 0
      },
      {
        "id": "pay_1783368766556_4uuzz",
        "studentId": "std_1783368766556",
        "studentName": "Milana Əliyeva",
        "courseId": "c7",
        "courseName": "Rəsm",
        "teacherName": "Fatimə m.",
        "teacherId": "t5",
        "packageType": "Aylıq",
        "groupType": "Qrup",
        "sessionsCount": null,
        "weeklyFrequency": 2,
        "fee": 30,
        "dueDate": "2026-06-27",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-06-01",
        "sessionsLogged": 0
      },
      {
        "id": "pay_1783368818211_0g40t",
        "studentId": "std_1783368818211",
        "studentName": "Diana Əlicanova",
        "courseId": "c7",
        "courseName": "Rəsm",
        "teacherName": "Fatimə m.",
        "teacherId": "t5",
        "packageType": "Aylıq",
        "groupType": "Qrup",
        "sessionsCount": null,
        "weeklyFrequency": 2,
        "fee": 30,
        "dueDate": "2026-06-02",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-06-02",
        "sessionsLogged": 0
      },
      {
        "id": "pay_1783368899840_lgedz",
        "studentId": "std_1783368899840",
        "studentName": "Çiçək",
        "courseId": "c7",
        "courseName": "Rəsm",
        "teacherName": "Fatimə m.",
        "teacherId": "t5",
        "packageType": "Aylıq",
        "groupType": "Qrup",
        "sessionsCount": null,
        "weeklyFrequency": 2,
        "fee": 30,
        "dueDate": "2026-06-16",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-06-16",
        "sessionsLogged": 0
      },
      {
        "id": "pay_1783368934258_vt775",
        "studentId": "std_1783366161874",
        "studentName": "Aliyə",
        "courseId": "c7",
        "courseName": "Rəsm",
        "teacherName": "Fatimə m.",
        "teacherId": "t5",
        "packageType": "Aylıq",
        "groupType": "Qrup",
        "sessionsCount": null,
        "weeklyFrequency": 2,
        "fee": 30,
        "dueDate": "2026-06-16",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-06-17",
        "sessionsLogged": 0
      },
      {
        "id": "pay_1783368960243_0gci1",
        "studentId": "std_1783368960243",
        "studentName": "Ayan",
        "courseId": "c7",
        "courseName": "Rəsm",
        "teacherName": "Fatimə m.",
        "teacherId": "t5",
        "packageType": "Aylıq",
        "groupType": "Qrup",
        "sessionsCount": null,
        "weeklyFrequency": 2,
        "fee": 30,
        "dueDate": "2026-06-26",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-06-30",
        "sessionsLogged": 0
      },
      {
        "id": "pay_1783369205439_33xe7",
        "studentId": "std_1783366161874",
        "studentName": "Aliyə",
        "courseId": "c8",
        "courseName": "Şahmat",
        "teacherName": "Səba m.",
        "teacherId": "t4",
        "packageType": "Aylıq",
        "groupType": "Qrup",
        "sessionsCount": null,
        "weeklyFrequency": 2,
        "fee": 30,
        "dueDate": "2026-06-18",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-06-18",
        "sessionsLogged": 0
      },
      {
        "id": "pay_1783369229905_18po4",
        "studentId": "std_1783369229905",
        "studentName": "Şamil",
        "courseId": "c8",
        "courseName": "Şahmat",
        "teacherName": "Səba m.",
        "teacherId": "t4",
        "packageType": "Aylıq",
        "groupType": "Qrup",
        "sessionsCount": null,
        "weeklyFrequency": 2,
        "fee": 30,
        "dueDate": "2026-06-18",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-06-18",
        "sessionsLogged": 0
      },
      {
        "id": "pay_1783372487562_i6sdf",
        "studentId": "std_1783372487562",
        "studentName": "Mikayıl",
        "courseId": "c9",
        "courseName": "Psixoloq",
        "teacherName": "Aynur m.",
        "teacherId": "t_1783363774084",
        "packageType": "Seans",
        "groupType": "Fərdi",
        "sessionsCount": 5,
        "weeklyFrequency": 2,
        "fee": 120,
        "dueDate": "2026-06-28",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-06-10",
        "sessionsLogged": 0
      },
      {
        "id": "pay_1783372625597_i6v2a",
        "studentId": "std_1783372487562",
        "studentName": "Mikayıl",
        "courseId": "c10",
        "courseName": "Loqoped",
        "teacherName": "Rövşanə m.",
        "teacherId": "t3",
        "packageType": "Seans",
        "groupType": "Qrup",
        "sessionsCount": 5,
        "weeklyFrequency": 2,
        "fee": 120,
        "dueDate": "2026-06-28",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-06-10",
        "sessionsLogged": 0
      },
      {
        "id": "pay_1783376322807_enzm4",
        "studentId": "std_1783376322807",
        "studentName": "Tunar",
        "courseId": "c10",
        "courseName": "Loqoped",
        "teacherName": "Rövşanə m.",
        "teacherId": "t3",
        "packageType": "Seans",
        "groupType": "Fərdi",
        "sessionsCount": 12,
        "weeklyFrequency": 3,
        "fee": 180,
        "dueDate": "2026-07-10",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-06-12",
        "sessionsLogged": 0
      },
      {
        "id": "pay_1783441283898_3kb5q",
        "studentId": "std_1783441283898",
        "studentName": "Ayaz",
        "courseId": "c9",
        "courseName": "Psixoloq",
        "teacherName": "Aynur m.",
        "teacherId": "t_1783363774084",
        "packageType": "Seans",
        "groupType": "Fərdi",
        "sessionsCount": 4,
        "weeklyFrequency": 2,
        "fee": 60,
        "dueDate": "2026-06-26",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-06-12",
        "sessionsLogged": 0
      },
      {
        "id": "pay_1783443475103_4liiz",
        "studentId": "std_1783441283898",
        "studentName": "Ayaz ",
        "courseId": "c9",
        "courseName": "Psixoloq",
        "teacherName": "Aynur m.",
        "teacherId": "t_1783363774084",
        "packageType": "Seans",
        "groupType": "Fərdi",
        "sessionsCount": 4,
        "weeklyFrequency": 2,
        "fee": 60,
        "dueDate": "2026-07-10",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-06-26",
        "sessionsLogged": 0
      }
    ],
    "2026-07": [
      {
        "id": "pay_1783370008659_l0wds",
        "studentId": "std_1783365786841",
        "studentName": "Rauf",
        "courseId": "c1",
        "courseName": "İbtidai sinif qrup (rus)",
        "teacherName": "Pərvanə m.",
        "teacherId": "t1",
        "packageType": "Aylıq",
        "groupType": "Qrup",
        "sessionsCount": null,
        "weeklyFrequency": 2,
        "fee": 90,
        "dueDate": "2026-07-12",
        "paymentStatus": "Ödənilməyib",
        "paymentDate": null,
        "sessionsLogged": 0
      },
      {
        "id": "pay_1783370008659_9jk63",
        "studentId": "std_1783365865574",
        "studentName": "Nihad",
        "courseId": "c1",
        "courseName": "İbtidai sinif qrup (rus)",
        "teacherName": "Pərvanə m.",
        "teacherId": "t1",
        "packageType": "Aylıq",
        "groupType": "Qrup",
        "sessionsCount": null,
        "weeklyFrequency": 2,
        "fee": 60,
        "dueDate": "2026-07-02",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-07-02",
        "sessionsLogged": null,
        "paidAmount": 60,
        "sessionStartDate": null
      },
      {
        "id": "pay_1783370008659_p2fuk",
        "studentId": "std_1783366073623",
        "studentName": "İsmayıl",
        "courseId": "c1",
        "courseName": "İbtidai sinif qrup (rus)",
        "teacherName": "Pərvanə m.",
        "teacherId": "t1",
        "packageType": "Aylıq",
        "groupType": "Qrup",
        "sessionsCount": null,
        "weeklyFrequency": 2,
        "fee": 60,
        "dueDate": "2026-07-15",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-07-29",
        "sessionsLogged": null,
        "paidAmount": 60,
        "sessionStartDate": "2026-07-29"
      },
      {
        "id": "pay_1783370008659_krdhg",
        "studentId": "std_1783366161874",
        "studentName": "Aliyə",
        "courseId": "c1",
        "courseName": "İbtidai sinif qrup (rus)",
        "teacherName": "Pərvanə m.",
        "teacherId": "t1",
        "packageType": "Aylıq",
        "groupType": "Qrup",
        "sessionsCount": null,
        "weeklyFrequency": 2,
        "fee": 90,
        "dueDate": "2026-07-30",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-07-30",
        "sessionsLogged": 0,
        "paidAmount": 90
      },
      {
        "id": "pay_1783370008659_y6fft",
        "studentId": "std_1783367111359",
        "studentName": "Polad",
        "courseId": "c4",
        "courseName": "İngilis dili (rus)",
        "teacherName": "Aytən m.",
        "teacherId": "t_1783363713798",
        "packageType": "Aylıq",
        "groupType": "Qrup",
        "sessionsCount": null,
        "weeklyFrequency": 2,
        "fee": 110,
        "dueDate": "2026-07-09",
        "paymentStatus": "Ödənilməyib",
        "paymentDate": null,
        "sessionsLogged": 0
      },
      {
        "id": "pay_1783370008659_ui43f",
        "studentId": "std_1783367148442",
        "studentName": "Nuray",
        "courseId": "c4",
        "courseName": "İngilis dili (rus)",
        "teacherName": "Aytən m.",
        "teacherId": "t_1783363713798",
        "packageType": "Aylıq",
        "groupType": "Qrup",
        "sessionsCount": null,
        "weeklyFrequency": 2,
        "fee": 60,
        "dueDate": "2026-07-22",
        "paymentStatus": "Ödənilməyib",
        "paymentDate": null,
        "sessionsLogged": 0
      },
      {
        "id": "pay_1783370008659_3mbpe",
        "studentId": "std_1783367190242",
        "studentName": "Məryəm",
        "courseId": "c4",
        "courseName": "İngilis dili (rus)",
        "teacherName": "Aytən m.",
        "teacherId": "t_1783363713798",
        "packageType": "Aylıq",
        "groupType": "Qrup",
        "sessionsCount": null,
        "weeklyFrequency": 2,
        "fee": 60,
        "dueDate": "2026-07-15",
        "paymentStatus": "Ödənilməyib",
        "paymentDate": null,
        "sessionsLogged": 0
      },
      {
        "id": "pay_1783370008659_x6rew",
        "studentId": "std_1783367647426",
        "studentName": "Fatimə İsmayılova",
        "courseId": "c2",
        "courseName": "İbtidai sinif qrup (az)",
        "teacherName": "Natavan m.",
        "teacherId": "t2",
        "packageType": "Aylıq",
        "groupType": "Qrup",
        "sessionsCount": null,
        "weeklyFrequency": 2,
        "fee": 50,
        "dueDate": "2026-07-11",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-07-14",
        "sessionsLogged": 0,
        "paidAmount": 50
      },
      {
        "id": "pay_1783370008659_xgjx7",
        "studentId": "std_1783367709542",
        "studentName": "Əbülfəz",
        "courseId": "c2",
        "courseName": "İbtidai sinif qrup (az)",
        "teacherName": "Natavan m.",
        "teacherId": "t2",
        "packageType": "Aylıq",
        "groupType": "Qrup",
        "sessionsCount": null,
        "weeklyFrequency": 2,
        "fee": 50,
        "dueDate": "2026-07-28",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-07-28",
        "sessionsLogged": 0,
        "paidAmount": 50
      },
      {
        "id": "pay_1783370008659_6xrvo",
        "studentId": "std_1783367888279",
        "studentName": "Emiliya",
        "courseId": "c5",
        "courseName": "Rəqs",
        "teacherName": "Sevinc m.",
        "teacherId": "t_1783363738768",
        "packageType": "Seans",
        "groupType": "Qrup",
        "sessionsCount": 8,
        "weeklyFrequency": 2,
        "fee": 30,
        "dueDate": "2026-07-16",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-06-22",
        "sessionsLogged": 8,
        "paidAmount": 30,
        "sessionStartDate": "2026-06-22",
        "sessionDays": [
          2,
          4
        ],
        "isManualSessions": true,
        "isRenewed": true
      },
      {
        "id": "pay_1783370008660_r12hb",
        "studentId": "std_1783367958062",
        "studentName": "Murad",
        "courseId": "c5",
        "courseName": "Rəqs",
        "teacherName": "Sevinc m.",
        "teacherId": "t_1783363738768",
        "packageType": "Seans",
        "groupType": "Qrup",
        "sessionsCount": 8,
        "weeklyFrequency": 2,
        "fee": 30,
        "dueDate": "2026-07-14",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-06-18",
        "sessionsLogged": 0,
        "paidAmount": 30,
        "sessionStartDate": "2026-06-18"
      },
      {
        "id": "pay_1783370008660_mfapj",
        "studentId": "std_1783367986409",
        "studentName": "Nərgiz",
        "courseId": "c5",
        "courseName": "Rəqs",
        "teacherName": "Sevinc m.",
        "teacherId": "t_1783363738768",
        "packageType": "Seans",
        "groupType": "Qrup",
        "sessionsCount": 8,
        "weeklyFrequency": 2,
        "fee": 30,
        "dueDate": "2026-07-14",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-06-18",
        "sessionsLogged": 8,
        "paidAmount": 30,
        "sessionStartDate": "2026-06-18",
        "isManualSessions": true,
        "isRenewed": true
      },
      {
        "id": "pay_1783370008660_pyhri",
        "studentId": "std_1783368069311",
        "studentName": "Xədicə",
        "courseId": "c5",
        "courseName": "Rəqs",
        "teacherName": "Sevinc m.",
        "teacherId": "t_1783363738768",
        "packageType": "Seans",
        "groupType": "Qrup",
        "sessionsCount": 8,
        "weeklyFrequency": 2,
        "fee": 40,
        "dueDate": "2026-07-16",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-06-22",
        "sessionsLogged": 8,
        "paidAmount": 40,
        "sessionStartDate": "2026-06-22",
        "isManualSessions": true,
        "isRenewed": true
      },
      {
        "id": "pay_1783370008660_ao1cw",
        "studentId": "std_1783368110528",
        "studentName": "Afaq xanım",
        "courseId": "c5",
        "courseName": "Rəqs",
        "teacherName": "Sevinc m.",
        "teacherId": "t_1783363738768",
        "packageType": "Seans",
        "groupType": "Fərdi",
        "sessionsCount": 8,
        "weeklyFrequency": 2,
        "fee": 50,
        "dueDate": "2026-07-16",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-06-22",
        "sessionsLogged": 8,
        "paidAmount": 50,
        "sessionStartDate": "2026-06-22",
        "sessionDays": [
          2,
          4
        ],
        "isManualSessions": true,
        "isRenewed": true
      },
      {
        "id": "pay_1783370008660_ug2u5",
        "studentId": "std_1783368333279",
        "studentName": "Milana",
        "courseId": "c6",
        "courseName": "Gimnastika",
        "teacherName": "Nərminə m.",
        "teacherId": "t_1783363759267",
        "packageType": "Seans",
        "groupType": "Qrup",
        "sessionsCount": 12,
        "weeklyFrequency": 3,
        "fee": 40,
        "dueDate": "2026-07-01",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-06-05",
        "sessionsLogged": 0,
        "paidAmount": 40,
        "sessionStartDate": "2026-06-05",
        "sessionDays": [
          1,
          3,
          5
        ]
      },
      {
        "id": "pay_1783370008660_qz1zk",
        "studentId": "std_1783368416308",
        "studentName": "Diana",
        "courseId": "c6",
        "courseName": "Gimnastika",
        "teacherName": "Nərminə m.",
        "teacherId": "t_1783363759267",
        "packageType": "Aylıq",
        "groupType": "Qrup",
        "sessionsCount": null,
        "weeklyFrequency": 2,
        "fee": 40,
        "dueDate": "2026-07-02",
        "paymentStatus": "Ödənilməyib",
        "paymentDate": null,
        "sessionsLogged": 0
      },
      {
        "id": "pay_1783370008660_7fal2",
        "studentId": "std_1783366161874",
        "studentName": "Aliyə",
        "courseId": "c6",
        "courseName": "Gimnastika",
        "teacherName": "Nərminə m.",
        "teacherId": "t_1783363759267",
        "packageType": "Seans",
        "groupType": "Qrup",
        "sessionsCount": 12,
        "weeklyFrequency": 3,
        "fee": 40,
        "dueDate": "2026-07-13",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-06-17",
        "sessionsLogged": 12,
        "paidAmount": 40,
        "sessionStartDate": "2026-06-17",
        "sessionDays": [
          1,
          3,
          5
        ],
        "isManualSessions": true,
        "isRenewed": true
      },
      {
        "id": "pay_1783370008660_auoeq",
        "studentId": "std_1783368485694",
        "studentName": "İnci",
        "courseId": "c6",
        "courseName": "Gimnastika",
        "teacherName": "Nərminə m.",
        "teacherId": "t_1783363759267",
        "packageType": "Seans",
        "groupType": "Qrup",
        "sessionsCount": 12,
        "weeklyFrequency": 3,
        "fee": 40,
        "dueDate": "2026-08-05",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-07-06",
        "sessionsLogged": 0,
        "paidAmount": 40,
        "sessionStartDate": "2026-07-09",
        "sessionDays": [
          1,
          3,
          5
        ]
      },
      {
        "id": "pay_1783370008660_8r669",
        "studentId": "std_1783365786841",
        "studentName": "Rauf",
        "courseId": "c6",
        "courseName": "Gimnastika",
        "teacherName": "Nərminə m.",
        "teacherId": "t_1783363759267",
        "packageType": "Seans",
        "groupType": "Qrup",
        "sessionsCount": 12,
        "weeklyFrequency": 3,
        "fee": 40,
        "dueDate": "2026-07-13",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-06-17",
        "sessionsLogged": 12,
        "paidAmount": 40,
        "sessionStartDate": "2026-06-17",
        "sessionDays": [
          1,
          3,
          5
        ],
        "isManualSessions": true,
        "isRenewed": true
      },
      {
        "id": "pay_1783370008660_8mmne",
        "studentId": "std_1783368720538",
        "studentName": "Xədicə Məmmədli",
        "courseId": "c7",
        "courseName": "Rəsm",
        "teacherName": "Fatimə m.",
        "teacherId": "t5",
        "packageType": "Seans",
        "groupType": "Qrup",
        "sessionsCount": 8,
        "weeklyFrequency": 2,
        "fee": 30,
        "dueDate": "2026-07-09",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-06-12",
        "sessionsLogged": 8,
        "paidAmount": 30,
        "sessionStartDate": "2026-06-12",
        "isManualSessions": true
      },
      {
        "id": "pay_1783370008660_aezb1",
        "studentId": "std_1783368766556",
        "studentName": "Milana Əliyeva",
        "courseId": "c7",
        "courseName": "Rəsm",
        "teacherName": "Fatimə m.",
        "teacherId": "t5",
        "packageType": "Seans",
        "groupType": "Qrup",
        "sessionsCount": 8,
        "weeklyFrequency": 2,
        "fee": 30,
        "dueDate": "2026-06-25",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-06-01",
        "sessionsLogged": 0,
        "paidAmount": 30,
        "sessionStartDate": "2026-06-01"
      },
      {
        "id": "pay_1783370008660_s4i08",
        "studentId": "std_1783368818211",
        "studentName": "Diana Əlicanova",
        "courseId": "c7",
        "courseName": "Rəsm",
        "teacherName": "Fatimə m.",
        "teacherId": "t5",
        "packageType": "Seans",
        "groupType": "Qrup",
        "sessionsCount": 8,
        "weeklyFrequency": 2,
        "fee": 30,
        "dueDate": "2026-08-04",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-07-07",
        "sessionsLogged": 0,
        "paidAmount": 30,
        "sessionStartDate": "2026-07-09",
        "sessionDays": [
          2,
          5
        ]
      },
      {
        "id": "pay_1783370008660_w3bbp",
        "studentId": "std_1783368899840",
        "studentName": "Çiçək",
        "courseId": "c7",
        "courseName": "Rəsm",
        "teacherName": "Fatimə m.",
        "teacherId": "t5",
        "packageType": "Seans",
        "groupType": "Qrup",
        "sessionsCount": 8,
        "weeklyFrequency": 2,
        "fee": 30,
        "dueDate": "2026-07-14",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-06-16",
        "sessionsLogged": 8,
        "paidAmount": 30,
        "sessionStartDate": "2026-06-17",
        "isManualSessions": true,
        "isRenewed": true
      },
      {
        "id": "pay_1783370008660_kuvpv",
        "studentId": "std_1783366161874",
        "studentName": "Aliyə",
        "courseId": "c7",
        "courseName": "Rəsm",
        "teacherName": "Fatimə m.",
        "teacherId": "t5",
        "packageType": "Seans",
        "groupType": "Qrup",
        "sessionsCount": 8,
        "weeklyFrequency": 2,
        "fee": 30,
        "dueDate": "2026-07-14",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-06-17",
        "sessionsLogged": 8,
        "paidAmount": 30,
        "sessionStartDate": "2026-06-17",
        "isManualSessions": true,
        "isRenewed": true
      },
      {
        "id": "pay_1783370008660_f7twe",
        "studentId": "std_1783368960243",
        "studentName": "Ayan",
        "courseId": "c7",
        "courseName": "Rəsm",
        "teacherName": "Fatimə m.",
        "teacherId": "t5",
        "packageType": "Seans",
        "groupType": "Qrup",
        "sessionsCount": 8,
        "weeklyFrequency": 2,
        "fee": 30,
        "dueDate": "2026-07-21",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-06-30",
        "sessionsLogged": 8,
        "paidAmount": 30,
        "sessionStartDate": "2026-06-26",
        "sessionDays": [
          2,
          5
        ],
        "isManualSessions": true,
        "isRenewed": true
      },
      {
        "id": "pay_1783370008660_7xx51",
        "studentId": "std_1783366161874",
        "studentName": "Aliyə",
        "courseId": "c8",
        "courseName": "Şahmat",
        "teacherName": "Səba m.",
        "teacherId": "t4",
        "packageType": "Seans",
        "groupType": "Qrup",
        "sessionsCount": 8,
        "weeklyFrequency": 2,
        "fee": 35,
        "dueDate": "2026-07-14",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-06-18",
        "sessionsLogged": 8,
        "paidAmount": 35,
        "sessionStartDate": "2026-06-18",
        "sessionDays": [
          2,
          4
        ],
        "isManualSessions": true,
        "isRenewed": true
      },
      {
        "id": "pay_1783370008660_t4oun",
        "studentId": "std_1783369229905",
        "studentName": "Şamil",
        "courseId": "c8",
        "courseName": "Şahmat",
        "teacherName": "Səba m.",
        "teacherId": "t4",
        "packageType": "Seans",
        "groupType": "Qrup",
        "sessionsCount": 8,
        "weeklyFrequency": 2,
        "fee": 35,
        "dueDate": "2026-07-14",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-06-18",
        "sessionsLogged": 8,
        "paidAmount": 35,
        "sessionStartDate": "2026-06-18",
        "sessionDays": [
          2,
          4
        ],
        "isManualSessions": true,
        "isRenewed": true
      },
      {
        "id": "pay_1783445352542_3azu9",
        "studentId": "std_1783445352542",
        "studentName": "Alisa",
        "courseId": "c5",
        "courseName": "Rəqs",
        "teacherName": "Sevinc m.",
        "teacherId": "t_1783363738768",
        "packageType": "Seans",
        "groupType": "Qrup",
        "sessionsCount": 8,
        "weeklyFrequency": 2,
        "fee": 30,
        "dueDate": "2026-07-30",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-07-02",
        "sessionsLogged": 8,
        "isManualSessions": true,
        "isRenewed": true
      },
      {
        "id": "pay_1783445955415_addbv",
        "studentId": "std_1783445955414",
        "studentName": "Nilay",
        "courseId": "c6",
        "courseName": "Gimnastika",
        "teacherName": "Nərminə m.",
        "teacherId": "t_1783363759267",
        "packageType": "Seans",
        "groupType": "Qrup",
        "sessionsCount": 12,
        "weeklyFrequency": 3,
        "fee": 40,
        "dueDate": "2026-08-10",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-07-06",
        "sessionsLogged": 0,
        "paidAmount": 40,
        "sessionStartDate": "2026-07-15",
        "sessionDays": [
          1,
          3,
          5
        ]
      },
      {
        "id": "pay_1783446164431_wyns1",
        "studentId": "std_1783446164431",
        "studentName": "Duyğu",
        "courseId": "c7",
        "courseName": "Rəsm",
        "teacherName": "Fatimə m.",
        "teacherId": "t5",
        "packageType": "Seans",
        "groupType": "Qrup",
        "sessionsCount": 8,
        "weeklyFrequency": 2,
        "fee": 30,
        "dueDate": "2026-07-31",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-07-07",
        "sessionsLogged": 0,
        "paidAmount": 30,
        "sessionStartDate": "2026-07-07",
        "sessionDays": [
          2,
          5
        ]
      },
      {
        "id": "pay_1783446336579_209gh",
        "studentId": "std_1783446336579",
        "studentName": "Məhəmməd",
        "courseId": "c7",
        "courseName": "Rəsm",
        "teacherName": "Fatimə m.",
        "teacherId": "t5",
        "packageType": "Seans",
        "groupType": "Qrup",
        "sessionsCount": 8,
        "weeklyFrequency": 2,
        "fee": 40,
        "dueDate": "2026-07-31",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-07-07",
        "sessionsLogged": 0,
        "paidAmount": 40,
        "sessionStartDate": "2026-07-07",
        "sessionDays": [
          2,
          5
        ]
      },
      {
        "id": "pay_1783446522079_imhe9",
        "studentId": "std_1783372487562",
        "studentName": "Mikayıl ",
        "courseId": "c9",
        "courseName": "Psixoloq",
        "teacherName": "Aynur m.",
        "teacherId": "t_1783363774084",
        "packageType": "Seans",
        "groupType": "Fərdi",
        "sessionsCount": 8,
        "weeklyFrequency": 2,
        "fee": 120,
        "dueDate": "2026-08-06",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-07-02",
        "sessionsLogged": 8,
        "paidAmount": 120,
        "sessionStartDate": "2026-07-14",
        "isManualSessions": true,
        "isRenewed": true
      },
      {
        "id": "pay_1783446585970_gunz3",
        "studentId": "std_1783372487562",
        "studentName": "Mikayıl ",
        "courseId": "c10",
        "courseName": "Loqoped",
        "teacherName": "Rövşanə m.",
        "teacherId": "t3",
        "packageType": "Seans",
        "groupType": "Fərdi",
        "sessionsCount": 8,
        "weeklyFrequency": 2,
        "fee": 120,
        "dueDate": "2026-08-06",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-07-02",
        "sessionsLogged": 0,
        "sessionStartDate": "2026-07-14",
        "paidAmount": 120
      },
      {
        "id": "pay_1783535463759_o0n0g",
        "studentId": "std_1783376322807",
        "studentName": "Tunar",
        "courseId": "c10",
        "courseName": "Loqoped",
        "teacherName": "Rövşanə m.",
        "teacherId": "t3",
        "packageType": "Seans",
        "groupType": "Fərdi",
        "sessionsCount": 12,
        "weeklyFrequency": 3,
        "fee": 180,
        "dueDate": "2026-07-13",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-06-12",
        "sessionsLogged": 12,
        "sessionStartDate": "2026-06-17",
        "isManualSessions": true,
        "isRenewed": true
      },
      {
        "id": "pay_1783535463759_ayax7",
        "studentId": "std_1783441283898",
        "studentName": "Ayaz ",
        "courseId": "c9",
        "courseName": "Psixoloq",
        "teacherName": "Aynur m.",
        "teacherId": "t_1783363774084",
        "packageType": "Seans",
        "groupType": "Fərdi",
        "sessionsCount": 4,
        "weeklyFrequency": 2,
        "fee": 60,
        "dueDate": "2026-07-10",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-06-26",
        "sessionsLogged": 4
      },
      {
        "id": "pay_1783583787104_9vino",
        "studentId": "std_1783583787104",
        "studentName": "Fidan Qasimzadə",
        "courseId": "c5",
        "courseName": "Rəqs",
        "teacherName": "Sevinc m.",
        "teacherId": "t_1783363738768",
        "packageType": "Seans",
        "groupType": "Qrup",
        "sessionsCount": 8,
        "weeklyFrequency": 2,
        "fee": 30,
        "dueDate": "2026-08-06",
        "sessionStartDate": "2026-07-14",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-07-14",
        "sessionsLogged": 8,
        "paidAmount": 30,
        "sessionDays": [
          2,
          4
        ]
      },
      {
        "id": "pay_1783584058634_ogomd",
        "studentId": "std_1783584058634",
        "studentName": "İnci Həsənova",
        "courseId": "c5",
        "courseName": "Rəqs",
        "teacherName": "Sevinc m.",
        "teacherId": "t_1783363738768",
        "packageType": "Seans",
        "groupType": "Qrup",
        "sessionsCount": 8,
        "weeklyFrequency": 2,
        "fee": 40,
        "dueDate": "2026-08-06",
        "sessionStartDate": "2026-07-13",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-07-31",
        "sessionsLogged": 0,
        "paidAmount": 40,
        "sessionDays": [
          2,
          4
        ]
      },
      {
        "id": "pay_1783584372791_ymf1f",
        "studentId": "std_1783584372790",
        "studentName": "İbrahim Həsənov",
        "courseId": "c8",
        "courseName": "Şahmat",
        "teacherName": "Səba m.",
        "teacherId": "t4",
        "packageType": "Seans",
        "groupType": "Qrup",
        "sessionsCount": 8,
        "weeklyFrequency": 2,
        "fee": 40,
        "dueDate": "2026-08-06",
        "sessionStartDate": "2026-07-13",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-07-31",
        "sessionsLogged": 0,
        "paidAmount": 40,
        "sessionDays": [
          2,
          4
        ]
      },
      {
        "id": "pay_1783584522707_n8wga",
        "studentId": "std_1783584522706",
        "studentName": "Yusif Həsənov",
        "courseId": "c8",
        "courseName": "Şahmat",
        "teacherName": "Səba m.",
        "teacherId": "t4",
        "packageType": "Seans",
        "groupType": "Qrup",
        "sessionsCount": 8,
        "weeklyFrequency": 2,
        "fee": 40,
        "dueDate": "2026-08-06",
        "sessionStartDate": "2026-07-13",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-07-31",
        "sessionsLogged": 0,
        "paidAmount": 40,
        "sessionDays": [
          2,
          4
        ]
      },
      {
        "id": "pay_1783587479028_ury3q",
        "studentId": "std_1783587479028",
        "studentName": "Mətanət",
        "courseId": "c9",
        "courseName": "Psixoloq",
        "teacherName": "Aynur m.",
        "teacherId": "t_1783363774084",
        "packageType": "Seans",
        "groupType": "Fərdi",
        "sessionsCount": 8,
        "weeklyFrequency": 2,
        "fee": 100,
        "dueDate": "2026-07-14",
        "sessionStartDate": "2026-07-02",
        "paymentStatus": "Qismən ödənilib",
        "paymentDate": "2026-07-30",
        "sessionsLogged": 0,
        "paidAmount": 60
      },
      {
        "id": "pay_1783615090018_ji5av",
        "studentId": "std_1783615090017",
        "studentName": "Rəvan",
        "courseId": "c9",
        "courseName": "Psixoloq",
        "teacherName": "Aynur m.",
        "teacherId": "t_1783363774084",
        "packageType": "Seans",
        "groupType": "Fərdi",
        "sessionsCount": 10,
        "weeklyFrequency": 2,
        "fee": 120,
        "dueDate": null,
        "sessionStartDate": "2026-07-09",
        "paymentStatus": "Ödənilməyib",
        "paymentDate": null,
        "sessionsLogged": 9,
        "paidAmount": 0,
        "sessionDays": [
          2,
          3
        ],
        "isManualSessions": true
      },
      {
        "id": "pay_1784037266470_dmddr",
        "studentId": "std_1783368720538",
        "studentName": "Xədicə Məmmədli",
        "courseId": "c7",
        "courseName": "Rəsm",
        "teacherName": "Fatimə m.",
        "teacherId": "t5",
        "packageType": "Seans",
        "groupType": "Qrup",
        "sessionsCount": 8,
        "weeklyFrequency": 2,
        "fee": 30,
        "dueDate": "2026-08-07",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-07-14",
        "sessionsLogged": 0,
        "paidAmount": 30,
        "sessionStartDate": "2026-07-14",
        "isManualSessions": false,
        "sessionDays": [
          2,
          5
        ]
      },
      {
        "id": "pay_1784042583685_t9tkj",
        "studentId": "std_1783441283898",
        "studentName": "Ayaz ",
        "courseId": "c9",
        "courseName": "Psixoloq",
        "teacherName": "Aynur m.",
        "teacherId": "t_1783363774084",
        "packageType": "Seans",
        "groupType": "Fərdi",
        "sessionsCount": 4,
        "weeklyFrequency": 2,
        "fee": 60,
        "dueDate": "2026-07-23",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-07-14",
        "sessionsLogged": 0,
        "paidAmount": 60,
        "sessionStartDate": "2026-07-14",
        "isManualSessions": false
      },
      {
        "id": "pay_1784131042761_wizd1",
        "studentId": "std_1784131042760",
        "studentName": "Rüqəyya Rəhimli",
        "courseId": "c7",
        "courseName": "Rəsm",
        "teacherName": "Fatimə m.",
        "teacherId": "t5",
        "packageType": "Seans",
        "groupType": "Qrup",
        "sessionsCount": 8,
        "weeklyFrequency": 2,
        "fee": 40,
        "dueDate": "2026-08-11",
        "sessionStartDate": "2026-07-16",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-07-17",
        "paidAmount": 40,
        "sessionsLogged": 0,
        "sessionDays": [
          2,
          5
        ]
      },
      {
        "id": "pay_1784131149517_3bgmc",
        "studentId": "std_1784131149517",
        "studentName": "Nuray Rəhimli",
        "courseId": "c7",
        "courseName": "Rəsm",
        "teacherName": "Fatimə m.",
        "teacherId": "t5",
        "packageType": "Seans",
        "groupType": "Qrup",
        "sessionsCount": 8,
        "weeklyFrequency": 2,
        "fee": 30,
        "dueDate": "2026-08-11",
        "sessionStartDate": "2026-07-16",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-07-17",
        "paidAmount": 30,
        "sessionsLogged": 0,
        "sessionDays": [
          2,
          5
        ]
      },
      {
        "id": "pay_1784131961669_25oy9",
        "studentId": "std_1784131961669",
        "studentName": "Emin",
        "courseId": "c7",
        "courseName": "Rəsm",
        "teacherName": "Fatimə m.",
        "teacherId": "t5",
        "packageType": "Seans",
        "groupType": "Qrup",
        "sessionsCount": 8,
        "weeklyFrequency": 2,
        "fee": 30,
        "dueDate": "2026-08-04",
        "sessionStartDate": "2026-07-10",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-07-10",
        "paidAmount": 30,
        "sessionsLogged": 0,
        "sessionDays": [
          2,
          5
        ]
      },
      {
        "id": "pay_1784132255613_7oy0w",
        "studentId": "std_1783368899840",
        "studentName": "Çiçək",
        "courseId": "c7",
        "courseName": "Rəsm",
        "teacherName": "Fatimə m.",
        "teacherId": "t5",
        "packageType": "Seans",
        "groupType": "Qrup",
        "sessionsCount": 8,
        "weeklyFrequency": 2,
        "fee": 30,
        "dueDate": "2026-08-07",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-07-15",
        "sessionsLogged": 0,
        "paidAmount": 30,
        "sessionStartDate": "2026-07-14",
        "isManualSessions": false,
        "isRenewed": false,
        "sessionDays": [
          2,
          5
        ]
      },
      {
        "id": "pay_1784132375177_lgio0",
        "studentId": "std_1783366161874",
        "studentName": "Aliyə",
        "courseId": "c7",
        "courseName": "Rəsm",
        "teacherName": "Fatimə m.",
        "teacherId": "t5",
        "packageType": "Seans",
        "groupType": "Qrup",
        "sessionsCount": 8,
        "weeklyFrequency": 2,
        "fee": 30,
        "dueDate": "2026-08-07",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-07-15",
        "sessionsLogged": 0,
        "paidAmount": 30,
        "sessionStartDate": "2026-07-14",
        "isManualSessions": false,
        "isRenewed": false,
        "sessionDays": [
          2,
          5
        ]
      },
      {
        "id": "pay_1784134170440_awf7s",
        "studentId": "std_1783366161874",
        "studentName": "Aliyə",
        "courseId": "c6",
        "courseName": "Gimnastika",
        "teacherName": "Nərminə m.",
        "teacherId": "t_1783363759267",
        "packageType": "Seans",
        "groupType": "Qrup",
        "sessionsCount": 12,
        "weeklyFrequency": 3,
        "fee": 40,
        "dueDate": "2026-08-10",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-07-16",
        "sessionsLogged": 0,
        "paidAmount": 40,
        "sessionStartDate": "2026-07-15",
        "sessionDays": [
          1,
          3,
          5
        ],
        "isManualSessions": false,
        "isRenewed": false
      },
      {
        "id": "pay_1784134189461_artmj",
        "studentId": "std_1783365786841",
        "studentName": "Rauf",
        "courseId": "c6",
        "courseName": "Gimnastika",
        "teacherName": "Nərminə m.",
        "teacherId": "t_1783363759267",
        "packageType": "Seans",
        "groupType": "Qrup",
        "sessionsCount": 12,
        "weeklyFrequency": 3,
        "fee": 40,
        "dueDate": null,
        "paymentStatus": "Ödənilməyib",
        "paymentDate": null,
        "sessionsLogged": 0,
        "paidAmount": 0,
        "sessionStartDate": "2026-07-15",
        "sessionDays": [
          1,
          3,
          5
        ],
        "isManualSessions": false,
        "isRenewed": false
      },
      {
        "id": "pay_1784214017858_87bjd",
        "studentId": "std_1783366161874",
        "studentName": "Aliyə",
        "courseId": "c8",
        "courseName": "Şahmat",
        "teacherName": "Səba m.",
        "teacherId": "t4",
        "packageType": "Seans",
        "groupType": "Qrup",
        "sessionsCount": 8,
        "weeklyFrequency": 2,
        "fee": 35,
        "dueDate": "2026-08-11",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-07-16",
        "sessionsLogged": 0,
        "paidAmount": 35,
        "sessionStartDate": "2026-07-16",
        "sessionDays": [
          2,
          4
        ],
        "isManualSessions": false,
        "isRenewed": false
      },
      {
        "id": "pay_1784214049908_sr247",
        "studentId": "std_1783367986409",
        "studentName": "Nərgiz",
        "courseId": "c5",
        "courseName": "Rəqs",
        "teacherName": "Sevinc m.",
        "teacherId": "t_1783363738768",
        "packageType": "Seans",
        "groupType": "Qrup",
        "sessionsCount": 8,
        "weeklyFrequency": 2,
        "fee": 30,
        "dueDate": "2026-08-11",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-07-16",
        "sessionsLogged": 0,
        "paidAmount": 30,
        "sessionStartDate": "2026-07-16",
        "isManualSessions": false,
        "isRenewed": false,
        "sessionDays": [
          2,
          4
        ]
      },
      {
        "id": "pay_1784214068404_d3bki",
        "studentId": "std_1783369229905",
        "studentName": "Şamil",
        "courseId": "c8",
        "courseName": "Şahmat",
        "teacherName": "Səba m.",
        "teacherId": "t4",
        "packageType": "Seans",
        "groupType": "Qrup",
        "sessionsCount": 8,
        "weeklyFrequency": 2,
        "fee": 35,
        "dueDate": "2026-08-11",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-07-16",
        "sessionsLogged": 0,
        "paidAmount": 35,
        "sessionStartDate": "2026-07-16",
        "sessionDays": [
          2,
          4
        ],
        "isManualSessions": false,
        "isRenewed": false
      },
      {
        "id": "pay_1784214259409_03ef3",
        "studentId": "std_1783376322807",
        "studentName": "Tunar",
        "courseId": "c10",
        "courseName": "Loqoped",
        "teacherName": "Rövşanə m.",
        "teacherId": "t3",
        "packageType": "Seans",
        "groupType": "Fərdi",
        "sessionsCount": 12,
        "weeklyFrequency": 3,
        "fee": 180,
        "dueDate": "2026-08-14",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-07-16",
        "sessionsLogged": 0,
        "sessionStartDate": "2026-07-21",
        "isManualSessions": false,
        "isRenewed": false,
        "paidAmount": 180,
        "sessionDays": [
          2,
          4,
          5
        ]
      },
      {
        "id": "pay_1784216692527_g80bu",
        "studentId": "std_1784216628065",
        "studentName": "Aydan Məmiyeva",
        "courseId": "c5",
        "courseName": "Rəqs",
        "teacherName": "Sevinc m.",
        "teacherId": "t_1783363738768",
        "packageType": "Seans",
        "groupType": "Fərdi",
        "sessionsCount": 8,
        "weeklyFrequency": 2,
        "fee": 50,
        "dueDate": "2026-08-13",
        "sessionStartDate": "2026-07-21",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-07-21",
        "paidAmount": 50,
        "sessionsLogged": 0,
        "sessionDays": [
          2,
          4
        ]
      },
      {
        "id": "pay_1784216900643_t98t5",
        "studentId": "std_1784216840133",
        "studentName": "Tamerlan",
        "courseId": "c6",
        "courseName": "Gimnastika",
        "teacherName": "Nərminə m.",
        "teacherId": "t_1783363759267",
        "packageType": "Seans",
        "groupType": "Qrup",
        "sessionsCount": 12,
        "weeklyFrequency": 3,
        "fee": 40,
        "dueDate": "2026-08-14",
        "sessionStartDate": "2026-07-20",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-07-21",
        "paidAmount": 40,
        "sessionsLogged": 0,
        "sessionDays": [
          1,
          3,
          5
        ]
      },
      {
        "id": "pay_1784309973982_omyb0",
        "studentId": "std_1784309929508",
        "studentName": "Xədicə",
        "courseId": "c6",
        "courseName": "Gimnastika",
        "teacherName": "Nərminə m.",
        "teacherId": "t_1783363759267",
        "packageType": "Seans",
        "groupType": "Qrup",
        "sessionsCount": 12,
        "weeklyFrequency": 3,
        "fee": 40,
        "dueDate": "2026-08-12",
        "sessionStartDate": "2026-07-17",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-07-17",
        "paidAmount": 40,
        "sessionsLogged": 0,
        "sessionDays": [
          1,
          3,
          5
        ]
      },
      {
        "id": "pay_1784622464262_cpmob",
        "studentId": "std_1783367888279",
        "studentName": "Emiliya",
        "courseId": "c5",
        "courseName": "Rəqs",
        "teacherName": "Sevinc m.",
        "teacherId": "t_1783363738768",
        "packageType": "Seans",
        "groupType": "Qrup",
        "sessionsCount": 8,
        "weeklyFrequency": 2,
        "fee": 30,
        "dueDate": "2026-08-13",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-07-21",
        "sessionsLogged": 0,
        "paidAmount": 30,
        "sessionStartDate": "2026-07-21",
        "sessionDays": [
          2,
          4
        ],
        "isManualSessions": false,
        "isRenewed": false
      },
      {
        "id": "pay_1784625540936_6jqcq",
        "studentId": "std_1783368110528",
        "studentName": "Afaq xanım",
        "courseId": "c5",
        "courseName": "Rəqs",
        "teacherName": "Sevinc m.",
        "teacherId": "t_1783363738768",
        "packageType": "Seans",
        "groupType": "Fərdi",
        "sessionsCount": 8,
        "weeklyFrequency": 2,
        "fee": 50,
        "dueDate": "2026-08-13",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-07-21",
        "sessionsLogged": 0,
        "paidAmount": 50,
        "sessionStartDate": "2026-07-21",
        "sessionDays": [
          2,
          4
        ],
        "isManualSessions": false,
        "isRenewed": false
      },
      {
        "id": "pay_1784626670842_ypdfd",
        "studentId": "std_1784626548869",
        "studentName": "Hüseyn Haqverdiyev",
        "courseId": "c5",
        "courseName": "Rəqs",
        "teacherName": "Sevinc m.",
        "teacherId": "t_1783363738768",
        "packageType": "Seans",
        "groupType": "Fərdi",
        "sessionsCount": 8,
        "weeklyFrequency": 2,
        "fee": 35,
        "dueDate": "2026-08-20",
        "sessionStartDate": "2026-07-28",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-07-28",
        "paidAmount": 35,
        "sessionsLogged": 0,
        "sessionDays": [
          2,
          4
        ]
      },
      {
        "id": "pay_1784818319894_r11jy",
        "studentId": "std_1783368069311",
        "studentName": "Xədicə",
        "courseId": "c5",
        "courseName": "Rəqs",
        "teacherName": "Sevinc m.",
        "teacherId": "t_1783363738768",
        "packageType": "Seans",
        "groupType": "Qrup",
        "sessionsCount": 8,
        "weeklyFrequency": 2,
        "fee": 40,
        "dueDate": "2026-08-18",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-07-23",
        "sessionsLogged": 0,
        "paidAmount": 40,
        "sessionStartDate": "2026-07-23",
        "isManualSessions": false,
        "isRenewed": false,
        "sessionDays": [
          2,
          4
        ]
      },
      {
        "id": "pay_1784880996418_42p1w",
        "studentId": "std_1784880938189",
        "studentName": "Mətanət Babazadə",
        "courseId": "c6",
        "courseName": "Gimnastika",
        "teacherName": "Nərminə m.",
        "teacherId": "t_1783363759267",
        "packageType": "Seans",
        "groupType": "Qrup",
        "sessionsCount": 12,
        "weeklyFrequency": 3,
        "fee": 40,
        "dueDate": null,
        "sessionStartDate": "2026-07-27",
        "paymentStatus": "Ödənilməyib",
        "paymentDate": null,
        "paidAmount": 0,
        "sessionsLogged": 0,
        "sessionDays": [
          1,
          3,
          5
        ]
      },
      {
        "id": "pay_1785003092854_uxgdv",
        "studentId": "std_1783368960243",
        "studentName": "Ayan",
        "courseId": "c7",
        "courseName": "Rəsm",
        "teacherName": "Fatimə m.",
        "teacherId": "t5",
        "packageType": "Seans",
        "groupType": "Qrup",
        "sessionsCount": 8,
        "weeklyFrequency": 2,
        "fee": 30,
        "dueDate": "2026-08-18",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-07-29",
        "sessionsLogged": 0,
        "paidAmount": 30,
        "sessionStartDate": "2026-07-24",
        "sessionDays": [
          2,
          5
        ],
        "isManualSessions": false,
        "isRenewed": false
      },
      {
        "id": "pay_1785164953022_vuftw",
        "studentId": "std_1785164921358",
        "studentName": "Həmid",
        "courseId": "c9",
        "courseName": "Psixoloq",
        "teacherName": "Aynur m.",
        "teacherId": "t_1783363774084",
        "packageType": "Seans",
        "groupType": "Fərdi",
        "sessionsCount": 8,
        "weeklyFrequency": 2,
        "fee": 120,
        "dueDate": "2026-08-20",
        "sessionStartDate": "2026-07-27",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-07-27",
        "paidAmount": 120,
        "sessionsLogged": 0,
        "sessionDays": [
          1,
          4
        ]
      },
      {
        "id": "pay_1785165196112_fv822",
        "studentId": "std_1785165138971",
        "studentName": "Ümüd",
        "courseId": "c9",
        "courseName": "Psixoloq",
        "teacherName": "Aynur m.",
        "teacherId": "t_1783363774084",
        "packageType": "Seans",
        "groupType": "Fərdi",
        "sessionsCount": 8,
        "weeklyFrequency": 2,
        "fee": 120,
        "dueDate": "2026-08-20",
        "sessionStartDate": "2026-07-27",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-07-27",
        "paidAmount": 120,
        "sessionsLogged": 0,
        "sessionDays": [
          1,
          4
        ]
      },
      {
        "id": "pay_1785224872916_8lew5",
        "studentId": "std_1785224754231",
        "studentName": "Zoya",
        "courseId": "c3",
        "courseName": "İngilis dili (az)",
        "teacherName": "Nərmin m.",
        "teacherId": "t_1783363696932",
        "packageType": "Aylıq",
        "groupType": "Fərdi",
        "sessionsCount": null,
        "weeklyFrequency": 2,
        "fee": 70,
        "dueDate": "2026-07-28",
        "sessionStartDate": null,
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-07-28",
        "paidAmount": 70,
        "sessionsLogged": 0,
        "sessionDays": []
      },
      {
        "id": "pay_1785269051269_e2cvp",
        "studentId": "std_1783445352542",
        "studentName": "Alisa",
        "courseId": "c5",
        "courseName": "Rəqs",
        "teacherName": "Sevinc m.",
        "teacherId": "t_1783363738768",
        "packageType": "Seans",
        "groupType": "Qrup",
        "sessionsCount": 8,
        "weeklyFrequency": 2,
        "fee": 30,
        "dueDate": "2026-08-25",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-07-29",
        "sessionsLogged": 0,
        "isManualSessions": false,
        "isRenewed": false,
        "paidAmount": 30,
        "sessionStartDate": "2026-07-30",
        "sessionDays": [
          2,
          4
        ]
      },
      {
        "id": "pay_1785349580230_m3s5f",
        "studentId": "std_1783366161874",
        "studentName": "Aliyə Cəfərzadə",
        "courseId": "c3",
        "courseName": "İngilis dili (az)",
        "teacherName": "Nərmin m.",
        "teacherId": "t_1783363696932",
        "packageType": "Aylıq",
        "groupType": "Fərdi",
        "sessionsCount": null,
        "weeklyFrequency": 2,
        "fee": 70,
        "dueDate": "2026-07-30",
        "sessionStartDate": null,
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-07-30",
        "paidAmount": 70,
        "sessionsLogged": 0,
        "sessionDays": []
      },
      {
        "id": "pay_1785350972386_hfrbz",
        "studentId": "std_1785350910182",
        "studentName": "Aysu Dadıyeva",
        "courseId": "c5",
        "courseName": "Rəqs",
        "teacherName": "Sevinc m.",
        "teacherId": "t_1783363738768",
        "packageType": "Seans",
        "groupType": "Qrup",
        "sessionsCount": 8,
        "weeklyFrequency": 2,
        "fee": 30,
        "dueDate": "2026-08-20",
        "sessionStartDate": "2026-07-28",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-07-29",
        "paidAmount": 30,
        "sessionsLogged": 0,
        "sessionDays": [
          2,
          4
        ]
      },
      {
        "id": "pay_1785426989854_ky3fm",
        "studentId": "std_1785426941710",
        "studentName": "Mehdi",
        "courseId": "c10",
        "courseName": "Loqoped",
        "teacherName": "Rövşanə m.",
        "teacherId": "t3",
        "packageType": "Seans",
        "groupType": "Fərdi",
        "sessionsCount": 4,
        "weeklyFrequency": 2,
        "fee": 60,
        "dueDate": "2026-08-03",
        "sessionStartDate": "2026-07-23",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-07-23",
        "paidAmount": 60,
        "sessionsLogged": 0,
        "sessionDays": [
          1,
          4
        ]
      }
    ],
    "2026-08": [
      {
        "id": "pay_1784232368714_of01g",
        "studentId": "std_1783365865574",
        "studentName": "Nihad",
        "courseId": "c1",
        "courseName": "İbtidai sinif qrup (rus)",
        "teacherName": "Pərvanə m.",
        "teacherId": "t1",
        "packageType": "Aylıq",
        "groupType": "Qrup",
        "sessionsCount": null,
        "weeklyFrequency": 2,
        "fee": 60,
        "dueDate": "2026-08-02",
        "paymentStatus": "Ödənilməyib",
        "paymentDate": null,
        "sessionsLogged": 0
      },
      {
        "id": "pay_1784232368714_w0ra5",
        "studentId": "std_1783366073623",
        "studentName": "İsmayıl",
        "courseId": "c1",
        "courseName": "İbtidai sinif qrup (rus)",
        "teacherName": "Pərvanə m.",
        "teacherId": "t1",
        "packageType": "Aylıq",
        "groupType": "Qrup",
        "sessionsCount": null,
        "weeklyFrequency": 2,
        "fee": 60,
        "dueDate": "2026-08-15",
        "paymentStatus": "Ödənilməyib",
        "paymentDate": null,
        "sessionsLogged": 0
      },
      {
        "id": "pay_1784232368714_8wn6d",
        "studentId": "std_1783366161874",
        "studentName": "Aliyə",
        "courseId": "c1",
        "courseName": "İbtidai sinif qrup (rus)",
        "teacherName": "Pərvanə m.",
        "teacherId": "t1",
        "packageType": "Aylıq",
        "groupType": "Qrup",
        "sessionsCount": null,
        "weeklyFrequency": 2,
        "fee": 90,
        "dueDate": "2026-08-30",
        "paymentStatus": "Ödənilməyib",
        "paymentDate": null,
        "sessionsLogged": 0
      },
      {
        "id": "pay_1784232368714_ntot0",
        "studentId": "std_1783367111359",
        "studentName": "Polad",
        "courseId": "c4",
        "courseName": "İngilis dili (rus)",
        "teacherName": "Aytən m.",
        "teacherId": "t_1783363713798",
        "packageType": "Aylıq",
        "groupType": "Qrup",
        "sessionsCount": null,
        "weeklyFrequency": 2,
        "fee": 110,
        "dueDate": "2026-08-09",
        "paymentStatus": "Ödənilməyib",
        "paymentDate": null,
        "sessionsLogged": 0
      },
      {
        "id": "pay_1784232368714_s2che",
        "studentId": "std_1783367148442",
        "studentName": "Nuray",
        "courseId": "c4",
        "courseName": "İngilis dili (rus)",
        "teacherName": "Aytən m.",
        "teacherId": "t_1783363713798",
        "packageType": "Aylıq",
        "groupType": "Qrup",
        "sessionsCount": null,
        "weeklyFrequency": 2,
        "fee": 60,
        "dueDate": "2026-08-22",
        "paymentStatus": "Ödənilməyib",
        "paymentDate": null,
        "sessionsLogged": 0
      },
      {
        "id": "pay_1784232368714_c3lra",
        "studentId": "std_1783367190242",
        "studentName": "Məryəm",
        "courseId": "c4",
        "courseName": "İngilis dili (rus)",
        "teacherName": "Aytən m.",
        "teacherId": "t_1783363713798",
        "packageType": "Aylıq",
        "groupType": "Qrup",
        "sessionsCount": null,
        "weeklyFrequency": 2,
        "fee": 60,
        "dueDate": "2026-08-15",
        "paymentStatus": "Ödənilməyib",
        "paymentDate": null,
        "sessionsLogged": 0
      },
      {
        "id": "pay_1784232368714_msk8c",
        "studentId": "std_1783367647426",
        "studentName": "Fatimə İsmayılova",
        "courseId": "c2",
        "courseName": "İbtidai sinif qrup (az)",
        "teacherName": "Natavan m.",
        "teacherId": "t2",
        "packageType": "Aylıq",
        "groupType": "Qrup",
        "sessionsCount": null,
        "weeklyFrequency": 2,
        "fee": 50,
        "dueDate": "2026-08-11",
        "paymentStatus": "Ödənilməyib",
        "paymentDate": null,
        "sessionsLogged": 0
      },
      {
        "id": "pay_1784232368714_xmghq",
        "studentId": "std_1783367709542",
        "studentName": "Əbülfəz",
        "courseId": "c2",
        "courseName": "İbtidai sinif qrup (az)",
        "teacherName": "Natavan m.",
        "teacherId": "t2",
        "packageType": "Aylıq",
        "groupType": "Qrup",
        "sessionsCount": null,
        "weeklyFrequency": 2,
        "fee": 50,
        "dueDate": "2026-08-22",
        "paymentStatus": "Ödənilməyib",
        "paymentDate": null,
        "sessionsLogged": 0
      },
      {
        "id": "pay_1784232368715_pqnax",
        "studentId": "std_1783368485694",
        "studentName": "İnci",
        "courseId": "c6",
        "courseName": "Gimnastika",
        "teacherName": "Nərminə m.",
        "teacherId": "t_1783363759267",
        "packageType": "Seans",
        "groupType": "Qrup",
        "sessionsCount": 12,
        "weeklyFrequency": 3,
        "fee": 40,
        "dueDate": "2026-08-05",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-07-06",
        "sessionsLogged": 0,
        "paidAmount": 40,
        "sessionStartDate": "2026-07-09",
        "sessionDays": [
          1,
          3,
          5
        ]
      },
      {
        "id": "pay_1784232368715_dtjtz",
        "studentId": "std_1783368818211",
        "studentName": "Diana Əlicanova",
        "courseId": "c7",
        "courseName": "Rəsm",
        "teacherName": "Fatimə m.",
        "teacherId": "t5",
        "packageType": "Seans",
        "groupType": "Qrup",
        "sessionsCount": 8,
        "weeklyFrequency": 2,
        "fee": 30,
        "dueDate": "2026-08-04",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-07-07",
        "sessionsLogged": 0,
        "paidAmount": 30,
        "sessionStartDate": "2026-07-09"
      },
      {
        "id": "pay_1784232368715_ptajo",
        "studentId": "std_1783445955414",
        "studentName": "Nilay",
        "courseId": "c6",
        "courseName": "Gimnastika",
        "teacherName": "Nərminə m.",
        "teacherId": "t_1783363759267",
        "packageType": "Seans",
        "groupType": "Qrup",
        "sessionsCount": 12,
        "weeklyFrequency": 3,
        "fee": 40,
        "dueDate": "2026-08-10",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-07-06",
        "sessionsLogged": 0,
        "paidAmount": 40,
        "sessionStartDate": "2026-07-15",
        "sessionDays": [
          1,
          3,
          5
        ]
      },
      {
        "id": "pay_1784232368715_fnr5u",
        "studentId": "std_1783372487562",
        "studentName": "Mikayıl ",
        "courseId": "c9",
        "courseName": "Psixoloq",
        "teacherName": "Aynur m.",
        "teacherId": "t_1783363774084",
        "packageType": "Seans",
        "groupType": "Fərdi",
        "sessionsCount": 8,
        "weeklyFrequency": 2,
        "fee": 120,
        "dueDate": "2026-08-06",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-07-02",
        "sessionsLogged": 0,
        "paidAmount": 120,
        "sessionStartDate": "2026-07-14"
      },
      {
        "id": "pay_1784232368715_wd35h",
        "studentId": "std_1783372487562",
        "studentName": "Mikayıl ",
        "courseId": "c10",
        "courseName": "Loqoped",
        "teacherName": "Rövşanə m.",
        "teacherId": "t3",
        "packageType": "Seans",
        "groupType": "Fərdi",
        "sessionsCount": 8,
        "weeklyFrequency": 2,
        "fee": 120,
        "dueDate": "2026-08-06",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-07-02",
        "sessionsLogged": 0,
        "sessionStartDate": "2026-07-14",
        "paidAmount": 120
      },
      {
        "id": "pay_1784232368715_ghqg6",
        "studentId": "std_1783583787104",
        "studentName": "Fidan Qasimzadə",
        "courseId": "c5",
        "courseName": "Rəqs",
        "teacherName": "Sevinc m.",
        "teacherId": "t_1783363738768",
        "packageType": "Seans",
        "groupType": "Qrup",
        "sessionsCount": 8,
        "weeklyFrequency": 2,
        "fee": 30,
        "dueDate": "2026-08-06",
        "sessionStartDate": "2026-07-14",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-07-14",
        "sessionsLogged": 8,
        "paidAmount": 30,
        "sessionDays": [
          2,
          4
        ]
      },
      {
        "id": "pay_1784232368715_uhbd6",
        "studentId": "std_1783584058634",
        "studentName": "İnci Həsənova",
        "courseId": "c5",
        "courseName": "Rəqs",
        "teacherName": "Sevinc m.",
        "teacherId": "t_1783363738768",
        "packageType": "Seans",
        "groupType": "Qrup",
        "sessionsCount": 8,
        "weeklyFrequency": 2,
        "fee": 40,
        "dueDate": "2026-07-18",
        "sessionStartDate": "2026-07-13",
        "paymentStatus": "Ödənilməyib",
        "paymentDate": null,
        "sessionsLogged": 0,
        "paidAmount": 0,
        "sessionDays": [
          2,
          4
        ]
      },
      {
        "id": "pay_1784232368715_w04pf",
        "studentId": "std_1783584372790",
        "studentName": "İbrahim Həsənov",
        "courseId": "c8",
        "courseName": "Şahmat",
        "teacherName": "Səba m.",
        "teacherId": "t4",
        "packageType": "Seans",
        "groupType": "Qrup",
        "sessionsCount": 8,
        "weeklyFrequency": 2,
        "fee": 40,
        "dueDate": "2026-07-18",
        "sessionStartDate": "2026-07-13",
        "paymentStatus": "Ödənilməyib",
        "paymentDate": null,
        "sessionsLogged": 0,
        "paidAmount": 0
      },
      {
        "id": "pay_1784232368715_265l6",
        "studentId": "std_1783584522706",
        "studentName": "Yusif Həsənov",
        "courseId": "c8",
        "courseName": "Şahmat",
        "teacherName": "Səba m.",
        "teacherId": "t4",
        "packageType": "Seans",
        "groupType": "Qrup",
        "sessionsCount": 8,
        "weeklyFrequency": 2,
        "fee": 40,
        "dueDate": "2026-07-18",
        "sessionStartDate": "2026-07-13",
        "paymentStatus": "Ödənilməyib",
        "paymentDate": null,
        "sessionsLogged": 0,
        "paidAmount": 0
      },
      {
        "id": "pay_1784232368715_rd0b4",
        "studentId": "std_1783587479028",
        "studentName": "Mətanət",
        "courseId": "c9",
        "courseName": "Psixoloq",
        "teacherName": "Aynur m.",
        "teacherId": "t_1783363774084",
        "packageType": "Seans",
        "groupType": "Fərdi",
        "sessionsCount": 8,
        "weeklyFrequency": 2,
        "fee": 100,
        "dueDate": "2026-07-14",
        "sessionStartDate": "2026-07-02",
        "paymentStatus": "Ödənilməyib",
        "paymentDate": null,
        "sessionsLogged": 0,
        "paidAmount": 0
      },
      {
        "id": "pay_1784232368715_90vfh",
        "studentId": "std_1783615090017",
        "studentName": "Rəvan",
        "courseId": "c9",
        "courseName": "Psixoloq",
        "teacherName": "Aynur m.",
        "teacherId": "t_1783363774084",
        "packageType": "Seans",
        "groupType": "Fərdi",
        "sessionsCount": 10,
        "weeklyFrequency": 2,
        "fee": 120,
        "dueDate": "2026-07-14",
        "sessionStartDate": "2026-07-09",
        "paymentStatus": "Ödənilməyib",
        "paymentDate": null,
        "sessionsLogged": 0,
        "paidAmount": 0
      },
      {
        "id": "pay_1784232368715_3d85b",
        "studentId": "std_1783368720538",
        "studentName": "Xədicə Məmmədli",
        "courseId": "c7",
        "courseName": "Rəsm",
        "teacherName": "Fatimə m.",
        "teacherId": "t5",
        "packageType": "Seans",
        "groupType": "Qrup",
        "sessionsCount": 8,
        "weeklyFrequency": 2,
        "fee": 30,
        "dueDate": "2026-08-06",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-07-14",
        "sessionsLogged": 0,
        "paidAmount": 30,
        "sessionStartDate": "2026-07-14",
        "isManualSessions": false,
        "sessionDays": [
          2,
          4
        ]
      },
      {
        "id": "pay_1784232368715_hc828",
        "studentId": "std_1784131042760",
        "studentName": "Rüqəyya Rəhimli",
        "courseId": "c7",
        "courseName": "Rəsm",
        "teacherName": "Fatimə m.",
        "teacherId": "t5",
        "packageType": "Seans",
        "groupType": "Qrup",
        "sessionsCount": 8,
        "weeklyFrequency": 2,
        "fee": 40,
        "dueDate": null,
        "sessionStartDate": "2026-07-16",
        "paymentStatus": "Ödənilməyib",
        "paymentDate": null,
        "paidAmount": 0,
        "sessionsLogged": 0
      },
      {
        "id": "pay_1784232368715_ti6jd",
        "studentId": "std_1784131149517",
        "studentName": "Nuray Rəhimli",
        "courseId": "c7",
        "courseName": "Rəsm",
        "teacherName": "Fatimə m.",
        "teacherId": "t5",
        "packageType": "Seans",
        "groupType": "Qrup",
        "sessionsCount": 8,
        "weeklyFrequency": 2,
        "fee": 30,
        "dueDate": null,
        "sessionStartDate": "2026-07-16",
        "paymentStatus": "Ödənilməyib",
        "paymentDate": null,
        "paidAmount": 0,
        "sessionsLogged": 0
      },
      {
        "id": "pay_1784232368715_c0zec",
        "studentId": "std_1784131961669",
        "studentName": "Emin",
        "courseId": "c7",
        "courseName": "Rəsm",
        "teacherName": "Fatimə m.",
        "teacherId": "t5",
        "packageType": "Seans",
        "groupType": "Qrup",
        "sessionsCount": 8,
        "weeklyFrequency": 2,
        "fee": 30,
        "dueDate": "2026-08-04",
        "sessionStartDate": "2026-07-10",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-07-10",
        "paidAmount": 30,
        "sessionsLogged": 0,
        "sessionDays": [
          2,
          5
        ]
      },
      {
        "id": "pay_1784232368715_rqlj2",
        "studentId": "std_1783368899840",
        "studentName": "Çiçək",
        "courseId": "c7",
        "courseName": "Rəsm",
        "teacherName": "Fatimə m.",
        "teacherId": "t5",
        "packageType": "Seans",
        "groupType": "Qrup",
        "sessionsCount": 8,
        "weeklyFrequency": 2,
        "fee": 30,
        "dueDate": "2026-08-07",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-07-15",
        "sessionsLogged": 0,
        "paidAmount": 30,
        "sessionStartDate": "2026-07-14",
        "isManualSessions": false,
        "isRenewed": false,
        "sessionDays": [
          2,
          5
        ]
      },
      {
        "id": "pay_1784232368715_pknog",
        "studentId": "std_1783366161874",
        "studentName": "Aliyə",
        "courseId": "c7",
        "courseName": "Rəsm",
        "teacherName": "Fatimə m.",
        "teacherId": "t5",
        "packageType": "Seans",
        "groupType": "Qrup",
        "sessionsCount": 8,
        "weeklyFrequency": 2,
        "fee": 30,
        "dueDate": "2026-08-07",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-07-15",
        "sessionsLogged": 0,
        "paidAmount": 30,
        "sessionStartDate": "2026-07-14",
        "isManualSessions": false,
        "isRenewed": false,
        "sessionDays": [
          2,
          5
        ]
      },
      {
        "id": "pay_1784232368715_nxnt1",
        "studentId": "std_1783366161874",
        "studentName": "Aliyə",
        "courseId": "c6",
        "courseName": "Gimnastika",
        "teacherName": "Nərminə m.",
        "teacherId": "t_1783363759267",
        "packageType": "Seans",
        "groupType": "Qrup",
        "sessionsCount": 12,
        "weeklyFrequency": 3,
        "fee": 40,
        "dueDate": "2026-08-10",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-07-16",
        "sessionsLogged": 0,
        "paidAmount": 40,
        "sessionStartDate": "2026-07-15",
        "sessionDays": [
          1,
          3,
          5
        ],
        "isManualSessions": false,
        "isRenewed": false
      },
      {
        "id": "pay_1784232368715_85x3u",
        "studentId": "std_1783366161874",
        "studentName": "Aliyə",
        "courseId": "c8",
        "courseName": "Şahmat",
        "teacherName": "Səba m.",
        "teacherId": "t4",
        "packageType": "Seans",
        "groupType": "Qrup",
        "sessionsCount": 8,
        "weeklyFrequency": 2,
        "fee": 35,
        "dueDate": "2026-08-11",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-07-16",
        "sessionsLogged": 0,
        "paidAmount": 35,
        "sessionStartDate": "2026-07-16",
        "sessionDays": [
          2,
          4
        ],
        "isManualSessions": false,
        "isRenewed": false
      },
      {
        "id": "pay_1784232368715_jk7gg",
        "studentId": "std_1783367986409",
        "studentName": "Nərgiz",
        "courseId": "c5",
        "courseName": "Rəqs",
        "teacherName": "Sevinc m.",
        "teacherId": "t_1783363738768",
        "packageType": "Seans",
        "groupType": "Qrup",
        "sessionsCount": 8,
        "weeklyFrequency": 2,
        "fee": 30,
        "dueDate": "2026-08-11",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-07-16",
        "sessionsLogged": 0,
        "paidAmount": 30,
        "sessionStartDate": "2026-07-16",
        "isManualSessions": false,
        "isRenewed": false,
        "sessionDays": [
          2,
          4
        ]
      },
      {
        "id": "pay_1784232368715_8233c",
        "studentId": "std_1783369229905",
        "studentName": "Şamil",
        "courseId": "c8",
        "courseName": "Şahmat",
        "teacherName": "Səba m.",
        "teacherId": "t4",
        "packageType": "Seans",
        "groupType": "Qrup",
        "sessionsCount": 8,
        "weeklyFrequency": 2,
        "fee": 35,
        "dueDate": "2026-08-11",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-07-16",
        "sessionsLogged": 0,
        "paidAmount": 35,
        "sessionStartDate": "2026-07-16",
        "sessionDays": [
          2,
          4
        ],
        "isManualSessions": false,
        "isRenewed": false
      },
      {
        "id": "pay_1784232368715_83ptp",
        "studentId": "std_1783376322807",
        "studentName": "Tunar",
        "courseId": "c10",
        "courseName": "Loqoped",
        "teacherName": "Rövşanə m.",
        "teacherId": "t3",
        "packageType": "Seans",
        "groupType": "Fərdi",
        "sessionsCount": 12,
        "weeklyFrequency": 3,
        "fee": 180,
        "dueDate": "2026-08-14",
        "paymentStatus": "Ödənildi",
        "paymentDate": "2026-07-16",
        "sessionsLogged": 0,
        "sessionStartDate": "2026-07-21",
        "isManualSessions": false,
        "isRenewed": false,
        "paidAmount": 180,
        "sessionDays": [
          2,
          4,
          5
        ]
      },
      {
        "id": "pay_1784232368715_w7pms",
        "studentId": "std_1784216628065",
        "studentName": "Aydan Məmiyeva",
        "courseId": "c5",
        "courseName": "Rəqs",
        "teacherName": "Sevinc m.",
        "teacherId": "t_1783363738768",
        "packageType": "Seans",
        "groupType": "Fərdi",
        "sessionsCount": 8,
        "weeklyFrequency": 2,
        "fee": 50,
        "dueDate": null,
        "sessionStartDate": "2026-07-21",
        "paymentStatus": "Ödənilməyib",
        "paymentDate": null,
        "paidAmount": 0,
        "sessionsLogged": 0,
        "sessionDays": [
          2,
          4
        ]
      },
      {
        "id": "pay_1784232368715_3r1hh",
        "studentId": "std_1784216840133",
        "studentName": "Tamerlan",
        "courseId": "c6",
        "courseName": "Gimnastika",
        "teacherName": "Nərminə m.",
        "teacherId": "t_1783363759267",
        "packageType": "Seans",
        "groupType": "Qrup",
        "sessionsCount": 12,
        "weeklyFrequency": 3,
        "fee": 40,
        "dueDate": null,
        "sessionStartDate": "2026-07-20",
        "paymentStatus": "Ödənilməyib",
        "paymentDate": null,
        "paidAmount": 0,
        "sessionsLogged": 0,
        "sessionDays": [
          1,
          3,
          5
        ]
      },
      {
        "id": "pay_1784232368715_atoz6",
        "studentId": "std_1783367709542",
        "studentName": "Əbülfəz",
        "courseId": "c3",
        "courseName": "İngilis dili (az)",
        "teacherName": "Nərmin m.",
        "teacherId": "t_1783363696932",
        "packageType": "Aylıq",
        "groupType": "Qrup",
        "sessionsCount": null,
        "weeklyFrequency": 2,
        "fee": 50,
        "dueDate": "2026-08-22",
        "paymentStatus": "Ödənilməyib",
        "paymentDate": null,
        "sessionsLogged": 0
      },
      {
        "id": "pay_1784232368715_zaufj",
        "studentId": "std_1784216840133",
        "studentName": "Tamerlan",
        "courseId": "c3",
        "courseName": "İngilis dili (az)",
        "teacherName": "Nərmin m.",
        "teacherId": "t_1783363696932",
        "packageType": "Aylıq",
        "groupType": "Qrup",
        "sessionsCount": null,
        "weeklyFrequency": 2,
        "fee": 50,
        "dueDate": "2026-08-20",
        "paymentStatus": "Ödənilməyib",
        "paymentDate": null,
        "sessionsLogged": 0
      }
    ],
    "2026-09": []
  },
  "teacher_payouts": {
    "2026-06": {
      "t1": [
        {
          "id": "p_1783366218129_7vsrg",
          "amount": 360,
          "date": "2026-06-30"
        }
      ],
      "t2": [
        {
          "id": "p_1783367824137_58f73",
          "amount": 125,
          "date": "2026-06-30"
        }
      ],
      "t_1783363696932": [
        {
          "id": "p_1783367290088_3waju",
          "amount": 35,
          "date": "2026-06-30"
        }
      ],
      "t_1783363713798": [
        {
          "id": "p_1783367447325_tmx34",
          "amount": 115,
          "date": "2026-06-30"
        }
      ],
      "t4": [
        {
          "id": "p_1783370636663_n848g",
          "amount": 30,
          "date": "2026-06-30"
        }
      ],
      "t_1783363738768": [
        {
          "id": "p_1783443945382_zwjl7",
          "amount": 145,
          "date": "2026-06-30"
        }
      ],
      "t_1783363759267": [
        {
          "id": "p_1783443968117_j7q29",
          "amount": 140,
          "date": "2026-06-30"
        }
      ],
      "t5": [
        {
          "id": "p_1783443996532_ydrvo",
          "amount": 135,
          "date": "2026-06-30"
        }
      ],
      "t3": [
        {
          "id": "p_1783444382087_kyojn",
          "amount": 352,
          "date": "2026-06-30"
        }
      ],
      "t_1783363774084": [
        {
          "id": "p_1783444397968_o22ie",
          "amount": 440,
          "date": "2026-06-30"
        }
      ]
    },
    "2026-07": {
      "t3": [
        {
          "id": "p_1783446674566_ff252",
          "amount": 60,
          "date": "2026-07-02"
        },
        {
          "id": "p_1784214480277_wptu4",
          "amount": 90,
          "date": "2026-07-16"
        },
        {
          "id": "p_1785427037560_xy4to",
          "amount": 30,
          "date": "2026-07-30"
        }
      ],
      "t_1783363774084": [
        {
          "id": "p_1783446691483_fhqjf",
          "amount": 60,
          "date": "2026-07-02"
        },
        {
          "id": "p_1784043573952_4ydvt",
          "amount": 30,
          "date": "2026-07-14"
        },
        {
          "id": "p_1785165266628_5h9rp",
          "amount": 60,
          "date": "2026-07-27"
        },
        {
          "id": "p_1785165271184_bu4ee",
          "amount": 60,
          "date": "2026-07-27"
        },
        {
          "id": "p_1785511040271_7hweh",
          "amount": 30,
          "date": "2026-07-31"
        }
      ],
      "t_1783363696932": [
        {
          "id": "p_1785226389993_hglms",
          "amount": 35,
          "date": "2026-07-28"
        },
        {
          "id": "p_1785503519303_4r2cu",
          "amount": 35,
          "date": "2026-07-31"
        }
      ],
      "t2": [
        {
          "id": "p_1785268751910_0c7dg",
          "amount": 50,
          "date": "2026-07-28"
        }
      ],
      "t_1783363759267": [
        {
          "id": "p_1785506787405_f54w4",
          "amount": 100,
          "date": "2026-07-31"
        }
      ],
      "t4": [
        {
          "id": "p_1785511021294_iggg4",
          "amount": 35,
          "date": "2026-07-31"
        },
        {
          "id": "p_1785663771241_ub023",
          "amount": 40,
          "date": "2026-07-31"
        }
      ],
      "t_1783363738768": [
        {
          "id": "p_1785511306403_bo6i4",
          "amount": 177.5,
          "date": "2026-07-31"
        },
        {
          "id": "p_1785663790809_yvep6",
          "amount": 20,
          "date": "2026-07-31"
        }
      ],
      "t5": [
        {
          "id": "p_1785511103788_a1mv9",
          "amount": 160,
          "date": "2026-07-31"
        }
      ],
      "t1": [
        {
          "id": "p_1785511118359_l1yei",
          "amount": 126,
          "date": "2026-07-31"
        }
      ]
    }
  },
  "current_month": "2026-07",
  "admin_password": "Adela121421",
  "theme": "light"
};
    if (!localStorage.getItem(DB_PREFIX + "initialized") || this.getStudents().length === 0) {
      Object.keys(backupData).forEach(k => {
        this._set(k, backupData[k]);
      });
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
    const p = this._get("admin_password", "12345");
    return String(p || "12345").trim();
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
