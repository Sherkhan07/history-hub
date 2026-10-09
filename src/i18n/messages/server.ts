import { defineMessages } from "../define";

/** Server-side messages. Actions return these keys; runAction / route handlers translate them. */
export const serverMessages = defineMessages({
  ru: {
    msg: {
      // generic
      saved: "Сохранено", formInvalid: "Проверьте данные формы", actionFailed: "Не удалось выполнить действие. Попробуйте ещё раз.",
      loginRequired: "Требуется вход", forbidden: "Недостаточно прав", tooMany: "Слишком много попыток. Попробуйте через минуту.",
      tooManyLater: "Слишком много запросов. Попробуйте позже.", tooOften: "Слишком часто", fieldRequired: "Заполните поле",
      // auth
      emailInvalid: "Введите корректный email", passwordRequired: "Введите пароль", badCredentials: "Неверный email или пароль",
      accountBlocked: "Аккаунт заблокирован. Обратитесь к администратору.",
      resetRequested: "Если аккаунт существует, запрос зарегистрирован. Администратор платформы увидит его и передаст вам ссылку для сброса пароля.",
      passwordMin: "Минимум 8 символов", resetInvalid: "Ссылка недействительна или устарела", passwordUpdated: "Пароль обновлён. Теперь можно войти.",
      // users
      nameRequired: "Укажите имя", emailTaken: "Пользователь с таким email уже есть", accountCreated: "Аккаунт {email} создан", userNotFound: "Пользователь не найден",
      cannotDemoteSelf: "Нельзя снять роль администратора с самого себя", lastAdmin: "В системе должен остаться хотя бы один администратор",
      changesSaved: "Изменения сохранены", cannotBlockSelf: "Нельзя заблокировать самого себя", userBlocked: "Пользователь заблокирован", userUnblocked: "Пользователь разблокирован",
      // curriculum
      slugFormat: "Латиница, цифры и дефис", slugTaken: "Такой адрес (slug) уже занят", subjectSaved: "Предмет сохранён", gradeOn: "{n} класс включён",
      gradeOff: "{n} класс скрыт", yearFormat: "Формат: 2026/2027", programExists: "Такая программа уже существует", programCreated: "Программа создана с четырьмя четвертями",
      sectionNameRequired: "Название раздела", sectionSaved: "Раздел сохранён", sectionNotFound: "Раздел не найден",
      sectionHasLessons: "В разделе есть уроки — перенесите их в другой раздел", sectionDeleted: "Раздел удалён", settingsSaved: "Настройки сохранены",
      // lessons
      lessonNotFound: "Урок не найден", lessonLocked: "Урок нельзя редактировать в текущем статусе", lessonNumberMin: "Номер урока ≥ 1",
      titleMin: "Название — минимум 3 символа", objectiveCode: "Код — цифры и точки, напр. 5.1.2.1", objectiveText: "Опишите цель",
      objectivesSaved: "Цели сохранены", stageTitle: "Название этапа", scenarioSaved: "Сценарий сохранён", resourceNotFound: "Материал не найден",
      resourceDeleted: "Материал удалён", linkRequired: "Введите ссылку", httpsOnly: "Только https-ссылки", linkAdded: "Ссылка добавлена",
      quizNotFound: "Тест не найден", quizSaved: "Тест сохранён", quizDeleted: "Тест удалён", gameItemsRequired: "Добавьте хотя бы одно задание",
      gameNotFound: "Игра не найдена", gameItemInvalid: "Задание {n}: {issue}", gameSaved: "Игра сохранена", gameDeleted: "Игра удалена", lessonCreated: "Урок создан",
      transitionForbidden: "Это действие недоступно для текущего статуса или вашей роли", rejectReasonRequired: "Опишите, что нужно исправить",
      // content schemas
      taskTitle: "Название задания", taskInstructions: "Опишите задание", cardFront: "Лицевая сторона", cardBack: "Оборот",
      optionText: "Текст варианта обязателен", questionText: "Введите вопрос", minTwoOptions: "Минимум 2 варианта", exactlyOneCorrect: "Отметьте ровно один правильный ответ",
      atLeastOneCorrect: "Отметьте хотя бы один правильный ответ", matchingPairs: "Заполните пары для сопоставления", quizTitle: "Название теста обязательно",
      minTwoEvents: "Минимум 2 события", minTwoPairs: "Минимум 2 пары", minOneClue: "Минимум одна подсказка", pickCorrect: "Выберите правильный вариант",
      addSource: "Добавьте источник", pickConclusion: "Выберите правильный вывод", addImage: "Добавьте изображение", pickAnswer: "Выберите ответ",
      // sessions
      gameNoItems: "В игре нет заданий", quizNoQuestions: "В тесте нет вопросов", pickQuizOrGame: "Выберите тест или игру", sessionNotFound: "Сессия не найдена",
      activityEmpty: "В активности нет вопросов", pinFailed: "Не удалось создать PIN — попробуйте ещё раз", pinNotFound: "Игра с таким PIN не найдена или уже завершена",
      nameTaken: "Это имя уже занято — добавьте первую букву фамилии", sessionFull: "В игре уже максимальное число участников", gameInactive: "Игра не активна",
      notJoined: "Вы не присоединились к игре", questionClosed: "Этот вопрос уже закрыт", timeUp: "Время вышло", badAnswer: "Неверный формат ответа",
      answerAccepted: "Ответ уже принят", pinFormat: "PIN — 6 цифр", nameMin: "Имя — минимум 2 символа", nameMax: "Имя — до 30 символов",
      waitMinute: "Слишком много попыток. Подождите минуту.",
      // uploads
      formatUnsupported: "Формат .{ext} не поддерживается", fileEmpty: "Файл пустой", fileTooBig: "Файл больше {mb} МБ", fileMismatch: "Содержимое файла не соответствует расширению",
      fileMissing: "Файл не передан", fileUnreadable: "Не удалось прочитать файл", fileProcessFailed: "Не удалось обработать файл", imageTooBig: "Изображение больше 10 МБ",
      imageFormat: "Нужен PNG, JPEG или WebP", materialDefault: "Материал",
    },
    sheet: {
      fileName: "00 Лист урока.txt", where: "{subject} · {grade} класс · {q} четверть", stageLine: "{n}. {title} — {m} мин", answer: "Ответ: {a}",
    },
  },
  kk: {
    msg: {
      saved: "Сақталды", formInvalid: "Форма деректерін тексеріңіз", actionFailed: "Әрекетті орындау мүмкін болмады. Қайталап көріңіз.",
      loginRequired: "Кіру қажет", forbidden: "Құқық жеткіліксіз", tooMany: "Тым көп әрекет. Бір минуттан кейін көріңіз.",
      tooManyLater: "Тым көп сұрау. Кейінірек көріңіз.", tooOften: "Тым жиі", fieldRequired: "Өрісті толтырыңыз",
      emailInvalid: "Дұрыс email енгізіңіз", passwordRequired: "Құпиясөзді енгізіңіз", badCredentials: "Email немесе құпиясөз қате",
      accountBlocked: "Аккаунт бұғатталған. Әкімшіге хабарласыңыз.",
      resetRequested: "Аккаунт бар болса, сұрау тіркелді. Платформа әкімшісі оны көріп, құпиясөзді қалпына келтіру сілтемесін сізге береді.",
      passwordMin: "Кемінде 8 таңба", resetInvalid: "Сілтеме жарамсыз немесе ескірген", passwordUpdated: "Құпиясөз жаңартылды. Енді кіруге болады.",
      nameRequired: "Атыңызды көрсетіңіз", emailTaken: "Мұндай email-мен пайдаланушы бар", accountCreated: "{email} аккаунты құрылды", userNotFound: "Пайдаланушы табылмады",
      cannotDemoteSelf: "Өзіңізден әкімші рөлін алуға болмайды", lastAdmin: "Жүйеде кемінде бір әкімші қалуы керек",
      changesSaved: "Өзгерістер сақталды", cannotBlockSelf: "Өзіңізді бұғаттауға болмайды", userBlocked: "Пайдаланушы бұғатталды", userUnblocked: "Пайдаланушы бұғаттан шығарылды",
      slugFormat: "Латын әріптері, сандар және дефис", slugTaken: "Мұндай мекенжай (slug) бос емес", subjectSaved: "Пән сақталды", gradeOn: "{n}-сынып қосылды",
      gradeOff: "{n}-сынып жасырылды", yearFormat: "Пішімі: 2026/2027", programExists: "Мұндай бағдарлама бар", programCreated: "Төрт тоқсаны бар бағдарлама құрылды",
      sectionNameRequired: "Бөлім атауы", sectionSaved: "Бөлім сақталды", sectionNotFound: "Бөлім табылмады",
      sectionHasLessons: "Бөлімде сабақтар бар — оларды басқа бөлімге ауыстырыңыз", sectionDeleted: "Бөлім жойылды", settingsSaved: "Баптаулар сақталды",
      lessonNotFound: "Сабақ табылмады", lessonLocked: "Сабақты ағымдағы мәртебеде өңдеуге болмайды", lessonNumberMin: "Сабақ нөмірі ≥ 1",
      titleMin: "Атауы — кемінде 3 таңба", objectiveCode: "Код — сандар мен нүктелер, мысалы 5.1.2.1", objectiveText: "Мақсатты сипаттаңыз",
      objectivesSaved: "Мақсаттар сақталды", stageTitle: "Кезең атауы", scenarioSaved: "Сценарий сақталды", resourceNotFound: "Материал табылмады",
      resourceDeleted: "Материал жойылды", linkRequired: "Сілтемені енгізіңіз", httpsOnly: "Тек https-сілтемелер", linkAdded: "Сілтеме қосылды",
      quizNotFound: "Тест табылмады", quizSaved: "Тест сақталды", quizDeleted: "Тест жойылды", gameItemsRequired: "Кемінде бір тапсырма қосыңыз",
      gameNotFound: "Ойын табылмады", gameItemInvalid: "{n}-тапсырма: {issue}", gameSaved: "Ойын сақталды", gameDeleted: "Ойын жойылды", lessonCreated: "Сабақ құрылды",
      transitionForbidden: "Бұл әрекет ағымдағы мәртебе немесе рөліңіз үшін қолжетімсіз", rejectReasonRequired: "Нені түзету керектігін жазыңыз",
      taskTitle: "Тапсырма атауы", taskInstructions: "Тапсырманы сипаттаңыз", cardFront: "Беті", cardBack: "Сырты",
      optionText: "Нұсқа мәтіні міндетті", questionText: "Сұрақты енгізіңіз", minTwoOptions: "Кемінде 2 нұсқа", exactlyOneCorrect: "Дәл бір дұрыс жауапты белгілеңіз",
      atLeastOneCorrect: "Кемінде бір дұрыс жауапты белгілеңіз", matchingPairs: "Сәйкестендіру жұптарын толтырыңыз", quizTitle: "Тест атауы міндетті",
      minTwoEvents: "Кемінде 2 оқиға", minTwoPairs: "Кемінде 2 жұп", minOneClue: "Кемінде бір кеңес", pickCorrect: "Дұрыс нұсқаны таңдаңыз",
      addSource: "Дерек қосыңыз", pickConclusion: "Дұрыс қорытындыны таңдаңыз", addImage: "Сурет қосыңыз", pickAnswer: "Жауапты таңдаңыз",
      gameNoItems: "Ойында тапсырма жоқ", quizNoQuestions: "Тестте сұрақ жоқ", pickQuizOrGame: "Тестті немесе ойынды таңдаңыз", sessionNotFound: "Сессия табылмады",
      activityEmpty: "Белсенділікте сұрақ жоқ", pinFailed: "PIN жасау мүмкін болмады — қайталап көріңіз", pinNotFound: "Мұндай PIN-мен ойын табылмады немесе аяқталған",
      nameTaken: "Бұл ат бос емес — тегіңіздің бірінші әрпін қосыңыз", sessionFull: "Ойында қатысушылар саны шегіне жетті", gameInactive: "Ойын белсенді емес",
      notJoined: "Сіз ойынға қосылмадыңыз", questionClosed: "Бұл сұрақ жабылды", timeUp: "Уақыт бітті", badAnswer: "Жауап пішімі қате",
      answerAccepted: "Жауап қабылданып қойған", pinFormat: "PIN — 6 сан", nameMin: "Аты — кемінде 2 таңба", nameMax: "Аты — 30 таңбаға дейін",
      waitMinute: "Тым көп әрекет. Бір минут күтіңіз.",
      formatUnsupported: ".{ext} пішімі қолдау көрсетілмейді", fileEmpty: "Файл бос", fileTooBig: "Файл {mb} МБ-тан үлкен", fileMismatch: "Файл мазмұны кеңейтімге сәйкес келмейді",
      fileMissing: "Файл берілмеді", fileUnreadable: "Файлды оқу мүмкін болмады", fileProcessFailed: "Файлды өңдеу мүмкін болмады", imageTooBig: "Сурет 10 МБ-тан үлкен",
      imageFormat: "PNG, JPEG немесе WebP қажет", materialDefault: "Материал",
    },
    sheet: {
      fileName: "00 Сабақ парағы.txt", where: "{subject} · {grade}-сынып · {q} тоқсан", stageLine: "{n}. {title} — {m} мин", answer: "Жауабы: {a}",
    },
  },
});
