/**
 * Grade 6 «Қазақстан тарихы» textbook (186.pdf): Бакина Н.С., Жанақова Н.Т., Сүлейменова Қ.Қ. — Алматы, «Атамұра», 2018.
 * PDF page N = printed page N. Chapters are the sections of grade 6; `quarter` is the school quarter they are taught in.
 * Lessons built from the 6-N.pptx decks (demo-lessons-6.ts) point at a chapter by its 0-based index here.
 */
export const TEXTBOOK_6_FILE = "186.pdf";
export const TEXTBOOK_6_KEY = "library/kazakhstan-tarihy-6-2018.pdf";
export const TEXTBOOK_6_NAME = "kazakhstan-tarihy-6-2018.pdf";
export const TEXTBOOK_6_TITLE = "Қазақстан тарихы, 6-сынып — Алматы «Атамұра», 2018";

export const TEXTBOOK_6_CHAPTERS: { n: number; title: string; quarter: 1 | 2 | 3 | 4 }[] = [
  { n: 1, title: "VI–IX ғасырлардағы Қазақстан", quarter: 1 },
  { n: 2, title: "Көне түркі дәуірі мәдениетінің тарихы", quarter: 1 },
  { n: 3, title: "X ғасырдың ортасы – XIII ғасырдың басындағы Қазақстан", quarter: 2 },
  { n: 4, title: "Қазақстан аумағындағы Ұлы Жібек жолы", quarter: 2 },
  { n: 5, title: "X–XIII ғасыр басындағы Қазақстан мәдениеті", quarter: 2 },
  { n: 6, title: "XIII–XV ғасырдың бірінші жартысындағы Қазақстанның саяси тарихы", quarter: 3 },
  { n: 7, title: "XIII–XV ғасырдағы мемлекеттердің құрылымы, экономикасы және мәдениеті", quarter: 3 },
  { n: 8, title: "Біртұтас Қазақ мемлекетінің құрылуы", quarter: 4 },
  { n: 9, title: "XV–XVII ғасырлардағы Қазақ хандығының әлеуметтік-экономикалық дамуы және мәдениеті", quarter: 4 },
];
