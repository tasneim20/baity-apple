// معلومات تفصيلية عن كل محافظة
export const governorateInfo = {
  amman: {
    id: "amman",
    name: "عمّان",
    nameEn: "Amman",
    description: "العاصمة الأردنية وأكبر المدن، مركز الأعمال والثقافة",
    descriptionEn: "The Jordanian capital and largest city, center of business and culture",
    schools: [
      "المدرسة الأهلية للبنات والبنين",
      "مدرسة الملك عبدالله الثاني",
      "مدرسة اليوبيل",
      "الأكاديمية الأمريكية",
      "مدرسة البكالوريا الدولية"
    ],
    markets: [
      "سيتي مول",
      "مكة مول",
      "تاج مول",
      "الصويفية مول",
      "كارفور عبدون",
      "سفوي مول"
    ],
    transportation: {
      publicTransport: true,
      taxi: true,
      busLines: ["رقم 1 - العبدلي/الرابية", "رقم 2 - البلد/الجامعة", "رقم 3 - مرج الحمام"],
      highways: ["الطريق الصحراوي", "طريق المطار", "الأوتوستراد الشمالي"],
      airports: ["مطار الملكة علياء الدولي - 35 كم"]
    },
    amenities: {
      hospitals: ["مستشفى الخالدي", "مستشفى العبدلي", "مستشفى الأردن"],
      restaurants: ["مطاعم الرينبو", "مطاعم شارع الوكالات", "مطاعم عبدون"],
      entertainment: ["البوليفارد", "السيتي مول سينما", "كينغز أكاديمي"]
    },
    avgPrice: 120000,
    popularAreas: ["عبدون", "دير غبار", "الجبيهة", "خلدا", "تلاع العلي"]
  },
  zarqa: {
    id: "zarqa",
    name: "الزرقاء",
    nameEn: "Zarqa",
    description: "ثاني أكبر مدينة أردنية، مركز صناعي مهم",
    descriptionEn: "Second largest Jordanian city, important industrial center",
    schools: [
      "مدرسة الزرقاء النموذجية",
      "مدرسة الحسين بن طلال",
      "مدرسة الملكة علياء",
      "المدرسة الوطنية الأرثوذكسية"
    ],
    markets: [
      "الزرقاء مول",
      "سيتي سنتر",
      "كارفور الزرقاء",
      "مجمع الشرق التجاري"
    ],
    transportation: {
      publicTransport: true,
      taxi: true,
      busLines: ["خط عمان-الزرقاء السريع", "باصات النقل الداخلي"],
      highways: ["الأوتوستراد الأردني", "طريق البادية الشمالية"],
      airports: ["قريبة من مطار الملكة علياء - 45 كم"]
    },
    amenities: {
      hospitals: ["مستشفى الزرقاء الحكومي", "مستشفى فلسطين"],
      restaurants: ["منطقة المطاعم الرئيسية", "كنتاكي", "ماكدونالدز"],
      entertainment: ["حديقة الأمير حسن", "النادي الرياضي"]
    },
    avgPrice: 65000,
    popularAreas: ["جبل الأمير حسن", "الزرقاء الجديدة", "الهاشمية"]
  },
  irbid: {
    id: "irbid",
    name: "إربد",
    nameEn: "Irbid",
    description: "عروس الشمال، مدينة جامعية وثقافية",
    descriptionEn: "Bride of the North, university and cultural city",
    schools: [
      "مدرسة اليرموك",
      "مدرسة الملك عبدالله الثاني",
      "مدرسة البيان النموذجية",
      "الأكاديمية العربية"
    ],
    markets: [
      "إربد سيتي سنتر",
      "مول البستان",
      "كارفور إربد",
      "سوق الحصن"
    ],
    transportation: {
      publicTransport: true,
      taxi: true,
      busLines: ["خط عمان-إربد السريع", "خطوط النقل الداخلي"],
      highways: ["الطريق الشمالي السريع"],
      airports: ["بعيدة عن المطار - 100 كم"]
    },
    amenities: {
      hospitals: ["مستشفى الأميرة بسمة", "مستشفى الكرامة"],
      restaurants: ["مطاعم شارع الجامعة", "كورنيش إربد"],
      entertainment: ["متحف التراث", "حدائق الحصن"]
    },
    avgPrice: 70000,
    popularAreas: ["إربد الجديدة", "الحصن", "حي الجامعة"]
  },
  aqaba: {
    id: "aqaba",
    name: "العقبة",
    nameEn: "Aqaba",
    description: "المنفذ البحري الوحيد للأردن، مدينة سياحية",
    descriptionEn: "Jordan's only seaport, tourist city",
    schools: [
      "مدرسة الملك عبدالله الثاني",
      "مدرسة العقبة النموذجية",
      "المدرسة الدولية"
    ],
    markets: [
      "العقبة مول",
      "سوق السوق الحرة",
      "كارفور العقبة"
    ],
    transportation: {
      publicTransport: true,
      taxi: true,
      busLines: ["خط عمان-العقبة السريع"],
      highways: ["طريق الصحراء", "الطريق الملوكي"],
      airports: ["مطار الملك حسين الدولي"]
    },
    amenities: {
      hospitals: ["مستشفى الأمير هاشم", "مستشفى العقبة الخاص"],
      restaurants: ["مطاعم الكورنيش", "المطاعم السياحية"],
      entertainment: ["شواطئ العقبة", "الغوص", "رحلات بحرية"]
    },
    avgPrice: 85000,
    popularAreas: ["الكورنيش الجنوبي", "العقبة الجديدة", "المنطقة السياحية"]
  },
  mafraq: {
    id: "mafraq",
    name: "المفرق",
    nameEn: "Mafraq",
    description: "بوابة البادية الشمالية",
    descriptionEn: "Gateway to the Northern Desert",
    schools: [
      "مدرسة المفرق الثانوية",
      "مدرسة جابر بن حيان",
      "المدرسة النموذجية"
    ],
    markets: [
      "المفرق مول",
      "السوق المركزي",
      "كارفور المفرق"
    ],
    transportation: {
      publicTransport: true,
      taxi: true,
      busLines: ["خط عمان-المفرق", "خطوط داخلية"],
      highways: ["الطريق الصحراوي الدولي", "طريق البادية"],
      airports: ["قريبة من عمان - 80 كم"]
    },
    amenities: {
      hospitals: ["مستشفى المفرق الحكومي"],
      restaurants: ["مطاعم الطريق الدولي"],
      entertainment: ["حدائق عامة"]
    },
    avgPrice: 45000,
    popularAreas: ["وسط المدينة", "حي الجامعة"]
  },
  balqa: {
    id: "balqa",
    name: "البلقاء",
    nameEn: "Balqa",
    description: "محافظة تاريخية قريبة من عمان",
    descriptionEn: "Historic governorate close to Amman",
    schools: [
      "مدرسة السلط الثانوية",
      "مدرسة الملكة رانيا",
      "المدرسة الهاشمية"
    ],
    markets: [
      "سوق السلط المركزي",
      "كارفور السلط"
    ],
    transportation: {
      publicTransport: true,
      taxi: true,
      busLines: ["خط عمان-السلط", "خطوط داخلية"],
      highways: ["طريق السلط السريع"],
      airports: ["قريبة من عمان - 30 كم"]
    },
    amenities: {
      hospitals: ["مستشفى السلط الحكومي"],
      restaurants: ["مطاعم تراثية"],
      entertainment: ["المتحف الأثري", "البلدة القديمة"]
    },
    avgPrice: 55000,
    popularAreas: ["السلط", "الفحيص", "دير علا"]
  },
  karak: {
    id: "karak",
    name: "الكرك",
    nameEn: "Karak",
    description: "مدينة القلعة التاريخية",
    descriptionEn: "City of the historic castle",
    schools: [
      "مدرسة الكرك الثانوية",
      "مدرسة المؤتة"
    ],
    markets: [
      "سوق الكرك المركزي"
    ],
    transportation: {
      publicTransport: true,
      taxi: true,
      busLines: ["خط عمان-الكرك"],
      highways: ["الطريق الملوكي", "طريق الصحراء"],
      airports: ["بعيدة عن عمان - 120 كم"]
    },
    amenities: {
      hospitals: ["مستشفى الكرك الحكومي"],
      restaurants: ["مطاعم تقليدية"],
      entertainment: ["قلعة الكرك الأثرية"]
    },
    avgPrice: 50000,
    popularAreas: ["وسط المدينة", "المزار الجنوبي"]
  },
  madaba: {
    id: "madaba",
    name: "مأدبا",
    nameEn: "Madaba",
    description: "مدينة الفسيفساء",
    descriptionEn: "City of Mosaics",
    schools: [
      "مدرسة مأدبا الثانوية",
      "المدرسة اللاتينية"
    ],
    markets: [
      "سوق مأدبا التراثي"
    ],
    transportation: {
      publicTransport: true,
      taxi: true,
      busLines: ["خط عمان-مأدبا"],
      highways: ["طريق الملوكي"],
      airports: ["قريبة من عمان - 35 كم"]
    },
    amenities: {
      hospitals: ["مستشفى مأدبا الحكومي"],
      restaurants: ["مطاعم تراثية"],
      entertainment: ["كنيسة الخارطة", "جبل نيبو"]
    },
    avgPrice: 60000,
    popularAreas: ["وسط مأدبا", "ماعين"]
  },
  jerash: {
    id: "jerash",
    name: "جرش",
    nameEn: "Jerash",
    description: "مدينة الآثار الرومانية",
    descriptionEn: "City of Roman ruins",
    schools: [
      "مدرسة جرش الثانوية",
      "المدرسة النموذجية"
    ],
    markets: [
      "سوق جرش المركزي"
    ],
    transportation: {
      publicTransport: true,
      taxi: true,
      busLines: ["خط عمان-جرش"],
      highways: ["الطريق الشمالي"],
      airports: ["قريبة من عمان - 50 كم"]
    },
    amenities: {
      hospitals: ["مستشفى الأميرة بديعة"],
      restaurants: ["مطاعم سياحية"],
      entertainment: ["مدينة جرش الأثرية", "مهرجان جرش"]
    },
    avgPrice: 58000,
    popularAreas: ["وسط جرش", "سوف"]
  },
  ajloun: {
    id: "ajloun",
    name: "عجلون",
    nameEn: "Ajloun",
    description: "مدينة الطبيعة والغابات",
    descriptionEn: "City of nature and forests",
    schools: [
      "مدرسة عجلون الثانوية"
    ],
    markets: [
      "سوق عجلون المركزي"
    ],
    transportation: {
      publicTransport: true,
      taxi: true,
      busLines: ["خط عمان-عجلون"],
      highways: ["الطريق الشمالي"],
      airports: ["قريبة من عمان - 75 كم"]
    },
    amenities: {
      hospitals: ["مستشفى عجلون الحكومي"],
      restaurants: ["مطاعم محلية"],
      entertainment: ["قلعة عجلون", "محمية عجلون الطبيعية"]
    },
    avgPrice: 48000,
    popularAreas: ["وسط عجلون", "كفرنجة"]
  },
  maan: {
    id: "maan",
    name: "معان",
    nameEn: "Maan",
    description: "بوابة الجنوب",
    descriptionEn: "Gateway to the South",
    schools: [
      "مدرسة معان الثانوية"
    ],
    markets: [
      "سوق معان المركزي"
    ],
    transportation: {
      publicTransport: true,
      taxi: true,
      busLines: ["خط عمان-معان"],
      highways: ["الطريق الصحراوي"],
      airports: ["بعيدة - 200 كم من عمان"]
    },
    amenities: {
      hospitals: ["مستشفى معان الحكومي"],
      restaurants: ["مطاعم محلية"],
      entertainment: ["البترا القريبة"]
    },
    avgPrice: 42000,
    popularAreas: ["وسط معان"]
  },
  tafilah: {
    id: "tafilah",
    name: "الطفيلة",
    nameEn: "Tafilah",
    description: "مدينة الجبال",
    descriptionEn: "City of Mountains",
    schools: [
      "مدرسة الطفيلة الثانوية"
    ],
    markets: [
      "سوق الطفيلة المركزي"
    ],
    transportation: {
      publicTransport: true,
      taxi: true,
      busLines: ["خط عمان-الطفيلة"],
      highways: ["الطريق الملوكي"],
      airports: ["بعيدة - 180 كم من عمان"]
    },
    amenities: {
      hospitals: ["مستشفى الطفيلة الحكومي"],
      restaurants: ["مطاعم محلية"],
      entertainment: ["محمية ضانا الطبيعية"]
    },
    avgPrice: 40000,
    popularAreas: ["وسط الطفيلة"]
  }
};
