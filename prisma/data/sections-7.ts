/**
 * Sections of grade 7 «Қазақстан тарихы» (XVIII–XIX ғасырлар). No grade 7 textbook is in the materials folder, so the
 * sections are named after the topics of the 7-N.pptx decks; `quarter` is the school quarter they are taught in.
 * Lessons in demo-lessons-7.ts point at a section by its 0-based index here — append new sections, never reorder.
 */
export const GRADE_7_SECTIONS: { title: string; quarter: 1 | 2 | 3 | 4 }[] = [
  { title: "XVIII ғасырдағы Қазақ хандығы: жоңғар шапқыншылығына қарсы күрес", quarter: 1 },
  { title: "Қазақ-орыс қарым-қатынастары және Ресей империясына қосылудың басталуы", quarter: 1 },
  { title: "XVIII ғасырдағы қазақ мәдениеті", quarter: 2 },
  { title: "XVIII–XIX ғасырлардағы Қазақстанды отарлау және патша реформалары", quarter: 2 },
  { title: "XVIII ғасырдың соңы – XIX ғасырдағы ұлт-азаттық қозғалыстар", quarter: 3 },
  { title: "Өлкетану: өлкені дамытқан тұлғалар", quarter: 2 },
  { title: "XIX ғасырдың екінші жартысы – XX ғасырдың басындағы әлеуметтік-экономикалық даму", quarter: 3 },
  { title: "XIX ғасырдағы қазақ қоғамы мен мәдениеті", quarter: 4 },
];
