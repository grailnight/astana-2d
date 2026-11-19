--!strict
-- Общие настройки игры «Астана: Жаңа өмір» (Roblox).
-- Здесь только данные: цены, предметы, точки на карте. Логика — в Logic.luau.

local Config = {}

Config.SAVE_VERSION = 2
Config.DATASTORE = "AstanaZhanaOmir_v1"
Config.LOCK_SECONDS = 300 -- чужая блокировка сохранения считается брошенной через 5 минут

-- Время: одна игровая минута длится 0.5 секунды, сутки — 12 минут.
Config.SECONDS_PER_GAME_MINUTE = 0.5
Config.START_HOUR = 10
Config.RENT_HOUR = 8

Config.START_MONEY = 15000
Config.RENT = 5000
Config.BUS_FARE = 100
Config.HOSPITAL_BILL = 2000
Config.HOSPITAL_SHARE = 0.3 -- больница берёт не больше 30 % наличных
Config.FLAT_PRICE = 1200000

Config.WALK_SPEED = 16
Config.SCOOTER_SPEED = 27

Config.XP_PER_LEVEL = 100
Config.MAX_LEVEL = 5
Config.INTERVIEW_KAZ = 3
Config.INTERVIEW_CODE = 3

Config.KAZ_LESSON_PRICE = 500
Config.LESSON_QUESTIONS = 5
Config.KAZ_XP = 12
Config.CODE_XP = 10
Config.CODE_XP_LAPTOP = 15

Config.COURIER_BASE = 800
Config.COURIER_PER_STUD = 6
Config.COURIER_ENERGY = 6
Config.COURIER_MIN_DISTANCE = 140

Config.BARISTA_PAY = 1200
Config.BARISTA_ENERGY = 15
Config.BARISTA_COOLDOWN = 180 -- игровых минут
Config.BARISTA_OPEN = 7
Config.BARISTA_CLOSE = 21

Config.IT_PAY = 8000
Config.IT_PAY_FAIL = 1500
Config.IT_ENERGY = 15
Config.IT_COOLDOWN = 90
-- Карьера в Qazaq Soft: после стольких задач — повышение и прибавка к оплате.
Config.IT_RANKS = {
	{ tasks = 0, name = "Junior", pay = 1 },
	{ tasks = 30, name = "Middle", pay = 1.25 },
	{ tasks = 80, name = "Senior", pay = 1.5 },
}

-- Ежедневный подарок за вход: растёт с серией дней, пропуск не обнуляет серию.
Config.DAILY_BASE = 1000
Config.DAILY_STEP = 500
Config.DAILY_MAX_STREAK = 6

-- После квартиры: обустроить дом и перевезти маму.
Config.MOM_PRICE = 1500000
Config.FURNITURE = { "syrmak", "sofa", "kitchen", "tv", "telescope" }

export type Item = {
	id: string,
	name: string,
	price: number,
	desc: string,
	food: number?,
	energy: number?,
	warmth: number?,
	warm: number?, -- тепло одежды
	slot: string?, -- "outer" | "hat" | "key"
}

Config.ITEMS = {
	samsa = { id = "samsa", name = "Самса", price = 400, desc = "Из тандыра, с мясом", food = 22 },
	baursak = { id = "baursak", name = "Баурсаки", price = 300, desc = "Пышные, ещё тёплые", food = 20 },
	kurt = { id = "kurt", name = "Курт", price = 150, desc = "Солёные шарики из творога", food = 8 },
	ayran = { id = "ayran", name = "Айран", price = 500, desc = "Освежает и бодрит", food = 10, energy = 8 },
	tea = { id = "tea", name = "Горячий чай с молоком", price = 200, desc = "Согревает", food = 3, warmth = 35 },
	doner = { id = "doner", name = "Донер", price = 900, desc = "Большой, с собой", food = 45 },
	lagman = { id = "lagman", name = "Лагман", price = 1400, desc = "Горячий и сытный", food = 60, warmth = 20 },
	cappuccino = { id = "cappuccino", name = "Капучино", price = 700, desc = "Тепло и бодрость", energy = 15, warmth = 15 },
	puffer = { id = "puffer", name = "Пуховик", price = 18000, desc = "Без него зимой никак", warm = 3, slot = "outer" },
	ushanka = { id = "ushanka", name = "Ушанка", price = 2500, desc = "Уши в тепле", warm = 1, slot = "hat" },
	pufferN = { id = "pufferN", name = "Пуховик «Солтүстік»", price = 45000, desc = "Держит до −40", warm = 4, slot = "outer" },
	scooter = { id = "scooter", name = "Электросамокат", price = 35000, desc = "Двигаешься намного быстрее", slot = "key" },
	laptop = { id = "laptop", name = "Ноутбук", price = 90000, desc = "Учить код и работать прямо из дома", slot = "key" },
	-- мебель для своей квартиры
	syrmak = { id = "syrmak", name = "Сырмақ", price = 80000, desc = "Войлочный ковёр с орнаментом", slot = "home" },
	sofa = { id = "sofa", name = "Диван", price = 120000, desc = "Мягкий, для гостей", slot = "home" },
	kitchen = { id = "kitchen", name = "Кухня", price = 150000, desc = "Чтобы угощать бешбармаком", slot = "home" },
	tv = { id = "tv", name = "Большой телевизор", price = 180000, desc = "Смотреть хоккей с «Барысом»", slot = "home" },
	telescope = { id = "telescope", name = "Телескоп", price = 250000, desc = "Смотреть на Байтерек и звёзды", slot = "home" },
} :: { [string]: Item }

Config.SHOPS = {
	bazaar = { title = "Базар", text = "Подходи, бауырым, всё свежее!", items = { "samsa", "baursak", "kurt", "ayran", "tea", "ushanka", "puffer" } },
	doner = { title = "Шаурма №1", text = "Что будем заказывать?", items = { "doner", "lagman", "tea" } },
	coffee = { title = "Кофейня «Есіл»", text = "Сәлем! Что приготовить?", items = { "cappuccino", "tea" } },
	mall = { title = "Хан Шатыр", text = "Добро пожаловать в торговый центр!", items = { "pufferN", "scooter", "laptop", "cappuccino" } },
	furniture = { title = "Мебель для дома", text = "Обустрой свою квартиру!", items = { "syrmak", "sofa", "kitchen", "tv", "telescope" } },
}

Config.BARISTA_INGREDIENTS = { "Эспрессо", "Молоко", "Пенка", "Сироп", "Корица", "Лёд" }

-- Карта. X — восток, Z — юг. Есиль течёт вдоль оси X; правый берег на севере (Z < 0).
Config.RIVER_HALF = 40
Config.MAP_HALF_X = 320
Config.MAP_DEPTH = 360

export type Place = { id: string, name: string, x: number, z: number, w: number, d: number, h: number, door: number, color: { number }, tall: number? }

-- door: 1 — дверь смотрит на юг (+Z), -1 — на север (−Z).
Config.BUILDINGS = {
	{ id = "station", name = "Вокзал", x = -230, z = -160, w = 50, d = 30, h = 16, door = 1, color = { 214, 196, 160 } },
	{ id = "home", name = "Комната у Гульнар-апай", x = -150, z = -158, w = 34, d = 26, h = 14, door = 1, color = { 176, 170, 160 }, tall = 40 },
	{ id = "school", name = "Курсы казахского", x = -80, z = -156, w = 30, d = 22, h = 14, door = 1, color = { 96, 150, 190 } },
	{ id = "hospital", name = "Больница", x = 70, z = -158, w = 44, d = 26, h = 16, door = 1, color = { 235, 235, 235 } },
	{ id = "library", name = "Библиотека", x = 150, z = -156, w = 34, d = 22, h = 14, door = 1, color = { 150, 120, 100 } },
	{ id = "depot", name = "Курьерская служба", x = -190, z = -86, w = 32, d = 22, h = 13, door = -1, color = { 240, 180, 41 } },
	{ id = "doner", name = "Шаурма №1", x = -30, z = -86, w = 26, d = 20, h = 12, door = -1, color = { 200, 80, 60 } },
	{ id = "coffee", name = "Кофейня «Есіл»", x = 60, z = -86, w = 28, d = 20, h = 12, door = -1, color = { 110, 80, 60 } },
	{ id = "it", name = "Qazaq Soft", x = -100, z = 156, w = 36, d = 28, h = 15, door = -1, color = { 90, 140, 200 }, tall = 110 },
	{ id = "flat", name = "ЖК «Есіл»", x = 100, z = 156, w = 36, d = 28, h = 15, door = -1, color = { 230, 225, 215 }, tall = 90 },
	{ id = "mall", name = "Хан Шатыр", x = -220, z = 150, w = 40, d = 22, h = 14, door = -1, color = { 190, 230, 225 } },
} :: { Place }

Config.BAZAAR = { x = -105, z = -84 }
Config.SPAWN = { x = -230, z = -132 }
Config.HOSPITAL_EXIT = { x = 70, z = -134 }
Config.BAITEREK = { x = 0, z = 235, deck = 86 }

Config.BUS_STOPS = {
	{ id = "station", name = "Вокзал", x = -200, z = -131 },
	{ id = "bazaar", name = "Базар", x = -70, z = -109 },
	{ id = "baiterek", name = "Байтерек", x = 24, z = 131 },
	{ id = "shatyr", name = "Хан Шатыр", x = -185, z = 131 },
}

-- Адреса доставки для курьера.
Config.ADDRESSES = {
	{ name = "Вокзал, камера хранения", x = -230, z = -138 },
	{ name = "Библиотека", x = 150, z = -140 },
	{ name = "Больница, приёмный покой", x = 70, z = -138 },
	{ name = "Кофейня «Есіл»", x = 60, z = -102 },
	{ name = "Дом на улице Сейфуллина", x = 230, z = -100 },
	{ name = "Набережная, правый берег", x = 120, z = -52 },
	{ name = "Qazaq Soft, ресепшен", x = -100, z = 136 },
	{ name = "ЖК «Есіл», консьерж", x = 100, z = 136 },
	{ name = "Байтерек, касса", x = 0, z = 205 },
	{ name = "Хан Шатыр, вход", x = -220, z = 133 },
	{ name = "Нұр Әлем", x = 235, z = 200 },
	{ name = "Набережная, левый берег", x = -130, z = 52 },
}

Config.PED_LINES = {
	"Ветер сегодня такой, что шапку уносит до Караганды.",
	"Летом +35, зимой −40. Астана закаляет!",
	"Байтерек — 97 метров. В честь 1997 года, когда сюда перенесли столицу.",
	"Наверху Байтерека есть отпечаток ладони. Приложи руку и загадай желание!",
	"Я из Шымкента. Тут, конечно, холоднее… раз в десять.",
	"Опять пробка на мосту. Как обычно.",
	"Мой дедушка помнит, когда город назывался Целиноград.",
	"Говорят, шар EXPO — самое большое сферическое здание в мире.",
	"Зимой Есиль замерзает — можно идти прямо по льду!",
	"Бешбармак лучше всего у мамы. Ну или на тое.",
	"Байтерек — это дерево жизни, а золотой шар — яйцо птицы Самрук.",
	"В Астане два сезона: зима и ремонт дорог.",
	"−30 и ветер. Обычный вторник.",
	"Пуховик — лучшая инвестиция в Астане.",
	"Буран обещали. Беги в тепло, пока автобусы ходят.",
}

return Config
