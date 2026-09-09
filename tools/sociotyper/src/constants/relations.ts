export interface RelationPartner {
  abbr: string;
  name: string;
}

export interface RelationInfo {
  name: string;
  description: string;
  partner: RelationPartner;
}

export const RELATION_METADATA: { [key: string]: { name: string; description: string; rating: 'excellent' | 'good' | 'neutral' | 'difficult' } } = {
  dual: {
    name: "Дуальные",
    description: "Полное психологическое достраивание и поддержка. Самые гармоничные отношения в соционике. Партнеры прикрывают слабые ('болевые') стороны друг друга своими сильными сторонами без лишних слов.",
    rating: 'excellent'
  },
  mirror: {
    name: "Зеркальные",
    description: "Отношения сходства и конструктивного диалога. Партнеры принадлежат к одной квадре, отлично понимают мотивы друг друга, но один реализует идеи словом, а другой — делом.",
    rating: 'good'
  },
  activation: {
    name: "Активация",
    description: "Взаимная психологическая подзарядка. Общение завязывается легко и бурно, партнеры постоянно мотивируют друг друга к действию, но при непрерывном тесном контакте могут уставать.",
    rating: 'good'
  },
  semidual: {
    name: "Полудуальные",
    description: "Отношения неполного дополнения. Хорошее взаимопонимание и поддержка, однако партнерам сложно согласовать совместные практические действия — постоянно возникает ощущение внезапной преграды.",
    rating: 'good'
  },
  mirage: {
    name: "Миражные",
    description: "Отношения комфортного расслабления и приятного досуга. Уютно общаться и отдыхать вместе, но совместная эффективная работа или бизнес затруднены из-за разных стилей планирования.",
    rating: 'neutral'
  },
  business: {
    name: "Деловые",
    description: "Отношения паритетного сотрудничества. Хорошо понимают деловые качества и методы друг друга, но имеют разные глобальные жизненные цели. Благоприятно для работы на равных.",
    rating: 'neutral'
  },
  kindred: {
    name: "Родственные",
    description: "Отношения схожих умов с разными инструментами. Прекрасно понимают мысли и взгляды друг друга, но методы действия кажутся чуждыми. Хорошо на расстоянии, тяжело в тесном быту.",
    rating: 'neutral'
  },
  quasi: {
    name: "Квазитождество",
    description: "Внешнее сходство при полном различии внутренней сути. Легко находят общие темы для дискуссий, но абсолютно расходятся в методах реализации. Споры интересны, но бесплодны.",
    rating: 'neutral'
  },
  extinguishment: {
    name: "Погашение",
    description: "Отношения полной противоположности. При общении один на один возникает глубокий интерес и взаимное притяжение, но при появлении третьих лиц или в группе вспыхивает негласное соперничество.",
    rating: 'difficult'
  },
  superego: {
    name: "Суперэго",
    description: "Отношения взаимного уважения и постоянной дистанции. Каждый видит в партнере загадочный идеал, но близкий контакт приносит чувство постоянного напряжения и боязнь не оправдать ожидания.",
    rating: 'difficult'
  },
  conflict: {
    name: "Конфликтные",
    description: "Наиболее сложные отношения. Партнеры подсознательно бьют по самым ранимым, 'болевым' точкам друг друга. Любое неосторожное слово или действие трактуется превратно и вызывает лавину обид.",
    rating: 'difficult'
  },
  request_sender: {
    name: "Заказчик (Передатчик)",
    description: "Асимметричные отношения социального заказа. Заказчик является источником вдохновения и импульса к действию, его идеи воспринимаются подзаказным легко и без излишней критики.",
    rating: 'neutral'
  },
  request_receiver: {
    name: "Подзаказный (Приемник)",
    description: "Асимметричные отношения социального заказа. Подзаказный стремится делом реализовать замыслы заказчика, воспринимая его как интересную и авторитетную фигуру.",
    rating: 'neutral'
  },
  supervision_sender: {
    name: "Ревизор",
    description: "Сложные асимметричные отношения ревизии. Ревизор непроизвольно подмечает слабые стороны и ошибки подревизного, из-за чего общение часто держит последнего в напряжении.",
    rating: 'difficult'
  },
  supervision_receiver: {
    name: "Подревизный",
    description: "Сложные асимметричные отношения ревизии. Подревизный чувствует уязвимость перед ревизором, ощущая постоянный негласный контроль за своими действиями и решениями.",
    rating: 'difficult'
  }
};

export const INTERTYPE_RELATIONS_DATA: { [key: string]: { [relationKey: string]: RelationPartner } } = {
  "ИЛЭ": {
    dual: { abbr: "СЭИ", name: "Дюма" },
    mirror: { abbr: "ЛИИ", name: "Робеспьер" },
    activation: { abbr: "ЭСЭ", name: "Гюго" },
    semidual: { abbr: "СЛИ", name: "Габен" },
    mirage: { abbr: "ИЭИ", name: "Есенин" },
    business: { abbr: "СЛЭ", name: "Жуков" },
    kindred: { abbr: "ИЭЭ", name: "Гексли" },
    quasi: { abbr: "ЛИЭ", name: "Джек Лондон" },
    extinguishment: { abbr: "ИЛИ", name: "Бальзак" },
    superego: { abbr: "СЭЭ", name: "Наполеон" },
    conflict: { abbr: "ЭСИ", name: "Драйзер" },
    request_sender: { abbr: "ЛСЭ", name: "Штирлиц" },
    request_receiver: { abbr: "ЭИЭ", name: "Гамлет" },
    supervision_sender: { abbr: "ЭИИ", name: "Достоевский" },
    supervision_receiver: { abbr: "ЛСИ", name: "Максим Горький" }
  },
  "СЭИ": {
    dual: { abbr: "ИЛЭ", name: "Дон Кихот" },
    mirror: { abbr: "ЭСЭ", name: "Гюго" },
    activation: { abbr: "ЛИИ", name: "Робеспьер" },
    semidual: { abbr: "ИЭЭ", name: "Гексли" },
    mirage: { abbr: "СЛЭ", name: "Жуков" },
    business: { abbr: "ИЭИ", name: "Есенин" },
    kindred: { abbr: "СЛИ", name: "Габен" },
    quasi: { abbr: "ЭСИ", name: "Драйзер" },
    extinguishment: { abbr: "СЭЭ", name: "Наполеон" },
    superego: { abbr: "ИЛИ", name: "Бальзак" },
    conflict: { abbr: "ЛИЭ", name: "Джек Лондон" },
    request_sender: { abbr: "ЭИИ", name: "Достоевский" },
    request_receiver: { abbr: "ЛСИ", name: "Максим Горький" },
    supervision_sender: { abbr: "ЛСЭ", name: "Штирлиц" },
    supervision_receiver: { abbr: "ЭИЭ", name: "Гамлет" }
  },
  "ЭСЭ": {
    dual: { abbr: "ЛИИ", name: "Робеспьер" },
    mirror: { abbr: "СЭИ", name: "Дюма" },
    activation: { abbr: "ИЛЭ", name: "Дон Кихот" },
    semidual: { abbr: "ЛСИ", name: "Максим Горький" },
    mirage: { abbr: "ЭИИ", name: "Достоевский" },
    business: { abbr: "ЛСЭ", name: "Штирлиц" },
    kindred: { abbr: "ЭИЭ", name: "Гамлет" },
    quasi: { abbr: "СЭЭ", name: "Наполеон" },
    extinguishment: { abbr: "ЭСИ", name: "Драйзер" },
    superego: { abbr: "ЛИЭ", name: "Джек Лондон" },
    conflict: { abbr: "ИЛИ", name: "Бальзак" },
    request_sender: { abbr: "СЛЭ", name: "Жуков" },
    request_receiver: { abbr: "ИЭЭ", name: "Гексли" },
    supervision_sender: { abbr: "ИЭИ", name: "Есенин" },
    supervision_receiver: { abbr: "СЛИ", name: "Габен" }
  },
  "ЛИИ": {
    dual: { abbr: "ЭСЭ", name: "Гюго" },
    mirror: { abbr: "ИЛЭ", name: "Дон Кихот" },
    activation: { abbr: "СЭИ", name: "Дюма" },
    semidual: { abbr: "ЭИЭ", name: "Гамлет" },
    mirage: { abbr: "ЛСЭ", name: "Штирлиц" },
    business: { abbr: "ЭИИ", name: "Достоевский" },
    kindred: { abbr: "ЛСИ", name: "Максим Горький" },
    quasi: { abbr: "ИЛИ", name: "Бальзак" },
    extinguishment: { abbr: "ЛИЭ", name: "Джек Лондон" },
    superego: { abbr: "ЭСИ", name: "Драйзер" },
    conflict: { abbr: "СЭЭ", name: "Наполеон" },
    request_sender: { abbr: "СЛИ", name: "Габен" },
    request_receiver: { abbr: "ИЭИ", name: "Есенин" },
    supervision_sender: { abbr: "СЛЭ", name: "Жуков" },
    supervision_receiver: { abbr: "ИЭЭ", name: "Гексли" }
  },
  "ЭИЭ": {
    dual: { abbr: "ЛСИ", name: "Максим Горький" },
    mirror: { abbr: "ИЭИ", name: "Есенин" },
    activation: { abbr: "СЛЭ", name: "Жуков" },
    semidual: { abbr: "ЛИИ", name: "Робеспьер" },
    mirage: { abbr: "ЭСИ", name: "Драйзер" },
    business: { abbr: "ЛИЭ", name: "Джек Лондон" },
    kindred: { abbr: "ЭСЭ", name: "Гюго" },
    quasi: { abbr: "ИЭЭ", name: "Гексли" },
    extinguishment: { abbr: "ЭИИ", name: "Достоевский" },
    superego: { abbr: "ЛСЭ", name: "Штирлиц" },
    conflict: { abbr: "СЛИ", name: "Габен" },
    request_sender: { abbr: "ИЛЭ", name: "Дон Кихот" },
    request_receiver: { abbr: "СЭЭ", name: "Наполеон" },
    supervision_sender: { abbr: "СЭИ", name: "Дюма" },
    supervision_receiver: { abbr: "ИЛИ", name: "Бальзак" }
  },
  "ЛСИ": {
    dual: { abbr: "ЭИЭ", name: "Гамлет" },
    mirror: { abbr: "СЛЭ", name: "Жуков" },
    activation: { abbr: "ИЭИ", name: "Есенин" },
    semidual: { abbr: "ЭСЭ", name: "Гюго" },
    mirage: { abbr: "ЛИЭ", name: "Джек Лондон" },
    business: { abbr: "ЭСИ", name: "Драйзер" },
    kindred: { abbr: "ЛИИ", name: "Робеспьер" },
    quasi: { abbr: "СЛИ", name: "Габен" },
    extinguishment: { abbr: "ЛСЭ", name: "Штирлиц" },
    superego: { abbr: "ЭИИ", name: "Достоевский" },
    conflict: { abbr: "ИЭЭ", name: "Гексли" },
    request_sender: { abbr: "СЭИ", name: "Дюма" },
    request_receiver: { abbr: "ИЛИ", name: "Бальзак" },
    supervision_sender: { abbr: "ИЛЭ", name: "Дон Кихот" },
    supervision_receiver: { abbr: "СЭЭ", name: "Наполеон" }
  },
  "СЛЭ": {
    dual: { abbr: "ИЭИ", name: "Есенин" },
    mirror: { abbr: "ЛСИ", name: "Максим Горький" },
    activation: { abbr: "ЭИЭ", name: "Гамлет" },
    semidual: { abbr: "ИЛИ", name: "Бальзак" },
    mirage: { abbr: "СЭИ", name: "Дюма" },
    business: { abbr: "ИЛЭ", name: "Дон Кихот" },
    kindred: { abbr: "СЭЭ", name: "Наполеон" },
    quasi: { abbr: "ЛСЭ", name: "Штирлиц" },
    extinguishment: { abbr: "СЛИ", name: "Габен" },
    superego: { abbr: "ИЭЭ", name: "Гексли" },
    conflict: { abbr: "ЭИИ", name: "Достоевский" },
    request_sender: { abbr: "ЛИЭ", name: "Джек Лондон" },
    request_receiver: { abbr: "ЭСЭ", name: "Гюго" },
    supervision_sender: { abbr: "ЭСИ", name: "Драйзер" },
    supervision_receiver: { abbr: "ЛИИ", name: "Робеспьер" }
  },
  "ИЭИ": {
    dual: { abbr: "СЛЭ", name: "Жуков" },
    mirror: { abbr: "ЭИЭ", name: "Гамлет" },
    activation: { abbr: "ЛСИ", name: "Максим Горький" },
    semidual: { abbr: "СЭЭ", name: "Наполеон" },
    mirage: { abbr: "ИЛЭ", name: "Дон Кихот" },
    business: { abbr: "СЭИ", name: "Дюма" },
    kindred: { abbr: "ИЛИ", name: "Бальзак" },
    quasi: { abbr: "ЭИИ", name: "Достоевский" },
    extinguishment: { abbr: "ИЭЭ", name: "Гексли" },
    superego: { abbr: "СЛИ", name: "Габен" },
    conflict: { abbr: "ЛСЭ", name: "Штирлиц" },
    request_sender: { abbr: "ЛИИ", name: "Робеспьер" },
    request_receiver: { abbr: "ЭСИ", name: "Драйзер" },
    supervision_sender: { abbr: "ЛИЭ", name: "Джек Лондон" },
    supervision_receiver: { abbr: "ЭСЭ", name: "Гюго" }
  },
  "СЭЭ": {
    dual: { abbr: "ИЛИ", name: "Бальзак" },
    mirror: { abbr: "ЭСИ", name: "Драйзер" },
    activation: { abbr: "ЛИЭ", name: "Джек Лондон" },
    semidual: { abbr: "ИЭИ", name: "Есенин" },
    mirage: { abbr: "СЛИ", name: "Габен" },
    business: { abbr: "ИЭЭ", name: "Гексли" },
    kindred: { abbr: "СЛЭ", name: "Жуков" },
    quasi: { abbr: "ЭСЭ", name: "Гюго" },
    extinguishment: { abbr: "СЭИ", name: "Дюма" },
    superego: { abbr: "ИЛЭ", name: "Дон Кихот" },
    conflict: { abbr: "ЛИИ", name: "Робеспьер" },
    request_sender: { abbr: "ЭИЭ", name: "Гамлет" },
    request_receiver: { abbr: "ЛСЭ", name: "Штирлиц" },
    supervision_sender: { abbr: "ЛСИ", name: "Максим Горький" },
    supervision_receiver: { abbr: "ЭИИ", name: "Достоевский" }
  },
  "ИЛИ": {
    dual: { abbr: "СЭЭ", name: "Наполеон" },
    mirror: { abbr: "ЛИЭ", name: "Джек Лондон" },
    activation: { abbr: "ЭСИ", name: "Драйзер" },
    semidual: { abbr: "СЛЭ", name: "Жуков" },
    mirage: { abbr: "ИЭЭ", name: "Гексли" },
    business: { abbr: "СЛИ", name: "Габен" },
    kindred: { abbr: "ИЭИ", name: "Есенин" },
    quasi: { abbr: "ЛИИ", name: "Робеспьер" },
    extinguishment: { abbr: "ИЛЭ", name: "Дон Кихот" },
    superego: { abbr: "СЭИ", name: "Дюма" },
    conflict: { abbr: "ЭСЭ", name: "Гюго" },
    request_sender: { abbr: "ЛСИ", name: "Максим Горький" },
    request_receiver: { abbr: "ЭИИ", name: "Достоевский" },
    supervision_sender: { abbr: "ЭИЭ", name: "Гамлет" },
    supervision_receiver: { abbr: "ЛСЭ", name: "Штирлиц" }
  },
  "ЛИЭ": {
    dual: { abbr: "ЭСИ", name: "Драйзер" },
    mirror: { abbr: "ИЛИ", name: "Бальзак" },
    activation: { abbr: "СЭЭ", name: "Наполеон" },
    semidual: { abbr: "ЭИИ", name: "Достоевский" },
    mirage: { abbr: "ЛСИ", name: "Максим Горький" },
    business: { abbr: "ЭИЭ", name: "Гамлет" },
    kindred: { abbr: "ЛСЭ", name: "Штирлиц" },
    quasi: { abbr: "ИЛЭ", name: "Дон Кихот" },
    extinguishment: { abbr: "ЛИИ", name: "Робеспьер" },
    superego: { abbr: "ЭСЭ", name: "Гюго" },
    conflict: { abbr: "СЭИ", name: "Дюма" },
    request_sender: { abbr: "ИЭЭ", name: "Гексли" },
    request_receiver: { abbr: "СЛЭ", name: "Жуков" },
    supervision_sender: { abbr: "СЛИ", name: "Габен" },
    supervision_receiver: { abbr: "ИЭИ", name: "Есенин" }
  },
  "ЭСИ": {
    dual: { abbr: "ЛИЭ", name: "Джек Лондон" },
    mirror: { abbr: "СЭЭ", name: "Наполеон" },
    activation: { abbr: "ИЛИ", name: "Бальзак" },
    semidual: { abbr: "ЛСЭ", name: "Штирлиц" },
    mirage: { abbr: "ИЭИ", name: "Есенин" },
    business: { abbr: "ЭИИ", name: "Достоевский" },
    kindred: { abbr: "ЛСИ", name: "Максим Горький" },
    quasi: { abbr: "ЛИИ", name: "Робеспьер" },
    extinguishment: { abbr: "СЛИ", name: "Габен" },
    superego: { abbr: "СЭИ", name: "Дюма" },
    conflict: { abbr: "ИЛЭ", name: "Дон Кихот" },
    request_sender: { abbr: "ИЭИ", name: "Есенин" },
    request_receiver: { abbr: "СЛИ", name: "Габен" },
    supervision_sender: { abbr: "ИЭЭ", name: "Гексли" },
    supervision_receiver: { abbr: "СЛЭ", name: "Жуков" }
  },
  "ЛСЭ": {
    dual: { abbr: "ЭИИ", name: "Достоевский" },
    mirror: { abbr: "СЛИ", name: "Габен" },
    activation: { abbr: "ИЭЭ", name: "Гексли" },
    semidual: { abbr: "ЭСИ", name: "Драйзер" },
    mirage: { abbr: "ЛИИ", name: "Робеспьер" },
    business: { abbr: "ЭСЭ", name: "Гюго" },
    kindred: { abbr: "ЛИЭ", name: "Джек Лондон" },
    quasi: { abbr: "СЛЭ", name: "Жуков" },
    extinguishment: { abbr: "ЛСИ", name: "Максим Горький" },
    superego: { abbr: "ЭИЭ", name: "Гамлет" },
    conflict: { abbr: "ИЭИ", name: "Есенин" },
    request_sender: { abbr: "СЭЭ", name: "Наполеон" },
    request_receiver: { abbr: "ИЛЭ", name: "Дон Кихот" },
    supervision_sender: { abbr: "ИЛИ", name: "Бальзак" },
    supervision_receiver: { abbr: "СЭИ", name: "Дюма" }
  },
  "ЭИИ": {
    dual: { abbr: "ЛСЭ", name: "Штирлиц" },
    mirror: { abbr: "ИЭЭ", name: "Гексли" },
    activation: { abbr: "СЛИ", name: "Габен" },
    semidual: { abbr: "ЛИЭ", name: "Джек Лондон" },
    mirage: { abbr: "ЭСЭ", name: "Гюго" },
    business: { abbr: "ЛИИ", name: "Робеспьер" },
    kindred: { abbr: "ЭСИ", name: "Драйзер" },
    quasi: { abbr: "ИЭИ", name: "Есенин" },
    extinguishment: { abbr: "ЭИЭ", name: "Гамлет" },
    superego: { abbr: "ЛСИ", name: "Максим Горький" },
    conflict: { abbr: "СЛЭ", name: "Жуков" },
    request_sender: { abbr: "ИЛИ", name: "Бальзак" },
    request_receiver: { abbr: "СЭИ", name: "Дюма" },
    supervision_sender: { abbr: "СЭЭ", name: "Наполеон" },
    supervision_receiver: { abbr: "ИЛЭ", name: "Дон Кихот" }
  },
  "ИЭЭ": {
    dual: { abbr: "СЛИ", name: "Габен" },
    mirror: { abbr: "ЭИИ", name: "Достоевский" },
    activation: { abbr: "ЛСЭ", name: "Штирлиц" },
    semidual: { abbr: "СЭИ", name: "Дюма" },
    mirage: { abbr: "ИЛИ", name: "Бальзак" },
    business: { abbr: "СЭЭ", name: "Наполеон" },
    kindred: { abbr: "ИЛЭ", name: "Дон Кихот" },
    quasi: { abbr: "ЭИЭ", name: "Гамлет" },
    extinguishment: { abbr: "ИЭИ", name: "Есенин" },
    superego: { abbr: "СЛЭ", name: "Жуков" },
    conflict: { abbr: "ЛСИ", name: "Максим Горький" },
    request_sender: { abbr: "ЭСЭ", name: "Гюго" },
    request_receiver: { abbr: "ЛИЭ", name: "Джек Лондон" },
    supervision_sender: { abbr: "ЛИИ", name: "Робеспьер" },
    supervision_receiver: { abbr: "ЭСИ", name: "Драйзер" }
  },
  "СЛИ": {
    dual: { abbr: "ИЭЭ", name: "Гексли" },
    mirror: { abbr: "ЛСЭ", name: "Штирлиц" },
    activation: { abbr: "ЭИИ", name: "Достоевский" },
    semidual: { abbr: "ИЛЭ", name: "Дон Кихот" },
    mirage: { abbr: "СЭЭ", name: "Наполеон" },
    business: { abbr: "ИЛИ", name: "Бальзак" },
    kindred: { abbr: "СЭИ", name: "Дюма" },
    quasi: { abbr: "ЛСИ", name: "Максим Горький" },
    extinguishment: { abbr: "СЛЭ", name: "Жуков" },
    superego: { abbr: "ИЭИ", name: "Есенин" },
    conflict: { abbr: "ЭИЭ", name: "Гамлет" },
    request_sender: { abbr: "ЭСИ", name: "Драйзер" },
    request_receiver: { abbr: "ЛИИ", name: "Робеспьер" },
    supervision_sender: { abbr: "ЭСЭ", name: "Гюго" },
    supervision_receiver: { abbr: "ЛИЭ", name: "Джек Лондон" }
  }
};
