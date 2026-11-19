--!strict
-- Чистая игровая логика без обращений к Roblox API: её можно проверять тестами.

local Config = require(script.Parent.Config)

local Logic = {}

export type State = {
	version: number,
	money: number,
	energy: number,
	food: number,
	warmth: number,
	kazXp: number,
	codeXp: number,
	day: number,
	debt: number,
	items: { [string]: boolean },
	hired: boolean,
	ownsFlat: boolean,
	deliveries: number,
	shifts: number,
	itTasks: number,
	wishDay: number,
	wished: boolean,
	interviewDay: number,
	faints: number,
	milestone: number, -- последняя отмеченная доля пути к текущей большой цели, в процентах
	milestoneStage: string, -- к какой цели относится milestone
	lastDaily: number, -- номер дня (UTC) последнего ежедневного подарка
	streak: number,
	momMoved: boolean,
}

export type Env = { indoors: boolean, temp: number, buran: boolean }

function Logic.newState(): State
	return {
		version = Config.SAVE_VERSION,
		money = Config.START_MONEY,
		energy = 100,
		food = 80,
		warmth = 100,
		kazXp = 0,
		codeXp = 0,
		day = 1,
		debt = 0,
		items = {},
		hired = false,
		ownsFlat = false,
		deliveries = 0,
		shifts = 0,
		itTasks = 0,
		wishDay = 0,
		wished = false,
		interviewDay = 0,
		faints = 0,
		milestone = 0,
		milestoneStage = "",
		lastDaily = 0,
		streak = 0,
		momMoved = false,
	}
end

-- Приводит сохранённые данные к актуальному виду: неизвестное отбрасывает, недостающее дополняет.
function Logic.sanitize(saved: any): State
	local state = Logic.newState()
	if type(saved) ~= "table" then
		return state
	end
	local target = state :: any
	for key, default in pairs(target) do
		local value = saved[key]
		if key ~= "items" and type(value) == type(default) then
			if type(value) == "number" and (value ~= value or math.abs(value) == math.huge) then
				continue
			end
			target[key] = value
		end
	end
	if type(saved.items) == "table" then
		for id, owned in pairs(saved.items) do
			if owned == true and Config.ITEMS[id] and Config.ITEMS[id].slot then
				state.items[id] = true
			end
		end
	end
	state.version = Config.SAVE_VERSION
	state.energy = math.clamp(state.energy, 0, 100)
	state.food = math.clamp(state.food, 0, 100)
	state.warmth = math.clamp(state.warmth, 0, 100)
	state.money = math.max(0, math.floor(state.money))
	state.debt = math.max(0, math.floor(state.debt))
	state.day = math.max(1, math.floor(state.day))
	return state
end

function Logic.level(xp: number): number
	return math.min(Config.MAX_LEVEL, math.floor(xp / Config.XP_PER_LEVEL))
end

function Logic.addXp(state: State, skill: "kazXp" | "codeXp", amount: number)
	local cap = Config.MAX_LEVEL * Config.XP_PER_LEVEL
	state[skill] = math.min(cap, state[skill] + amount)
end

-- Суммарное тепло одежды: лучшая верхняя одежда плюс шапка.
function Logic.warmRating(state: State): number
	local outer, hat = 0, 0
	for id in pairs(state.items) do
		local item = Config.ITEMS[id]
		if item and item.warm then
			if item.slot == "outer" then
				outer = math.max(outer, item.warm)
			elseif item.slot == "hat" then
				hat = math.max(hat, item.warm)
			end
		end
	end
	return outer + hat
end

function Logic.walkSpeed(state: State): number
	return if state.items.scooter then Config.SCOOTER_SPEED else Config.WALK_SPEED
end

-- Температура на улице по часу суток.
function Logic.temperature(hour: number, buran: boolean): number
	local wave = math.cos((hour - 15) / 24 * 2 * math.pi) -- максимум в 15:00
	local temp = -18 + 6 * wave
	if buran then
		temp -= 9
	end
	return math.floor(temp + 0.5)
end

-- Сколько тепла уходит за игровую минуту на улице.
function Logic.coldDrain(state: State, env: Env): number
	local coldness = math.max(0, 5 - env.temp) / 10
	if env.buran then
		coldness *= 1.8
	end
	local protection = math.max(0.08, 1 - 0.2 * Logic.warmRating(state))
	return coldness * 0.25 * protection
end

-- Продвигает потребности на указанное число игровых минут.
-- Возвращает причину обморока ("cold" | "tired") или nil.
function Logic.tick(state: State, minutes: number, env: Env): string?
	state.food = math.max(0, state.food - 0.06 * minutes)
	local energyDrain = if state.food <= 0 then 0.21 else 0.07
	state.energy = math.max(0, state.energy - energyDrain * minutes)
	if env.indoors then
		state.warmth = math.min(100, state.warmth + 3 * minutes)
	else
		state.warmth = math.max(0, state.warmth - Logic.coldDrain(state, env) * minutes)
	end
	if state.warmth <= 0 then
		return "cold"
	elseif state.energy <= 0 then
		return "tired"
	end
	return nil
end

-- Обморок: очнулся в больнице, заплатил по счёту. Возвращает сумму счёта.
function Logic.faint(state: State): number
	state.energy = math.max(state.energy, 45)
	state.food = math.max(state.food, 30)
	state.warmth = math.max(state.warmth, 70)
	-- Первый раз лечат бесплатно, потом — не больше 30 % наличных.
	local bill = if state.faints == 0 then 0 else math.min(math.floor(state.money * Config.HOSPITAL_SHARE / 100) * 100, Config.HOSPITAL_BILL)
	state.faints += 1
	state.money -= bill
	return bill
end

function Logic.canAfford(state: State, price: number): boolean
	return state.money >= price
end

-- Покупка предмета. Возвращает успех и сообщение для игрока.
function Logic.buy(state: State, itemId: string): (boolean, string)
	local item = Config.ITEMS[itemId]
	if not item then
		return false, "Такого товара нет."
	end
	if item.slot and state.items[itemId] then
		return false, `У тебя уже есть: {item.name}.`
	end
	if state.money < item.price then
		return false, `Не хватает денег: нужно {Logic.money(item.price)}.`
	end
	state.money -= item.price
	if item.slot then
		state.items[itemId] = true
		return true, `Куплено: {item.name}.`
	end
	state.food = math.min(100, state.food + (item.food or 0))
	state.energy = math.min(100, state.energy + (item.energy or 0))
	state.warmth = math.min(100, state.warmth + (item.warmth or 0))
	return true, `{item.name} — вкусно!`
end

-- Новое утро: списывает аренду. Возвращает сообщение.
function Logic.newDay(state: State): string
	state.day += 1
	if state.ownsFlat then
		return `День {state.day}. Доброе утро в своей квартире!`
	end
	if state.day == 2 then
		return "День 2. Первую ночь Гульнар-апай подарила: «Добро пожаловать, балам!»"
	end
	-- Платим сколько есть, в долг уходит только недостача.
	local paid = math.min(state.money, Config.RENT)
	state.money -= paid
	state.debt += Config.RENT - paid
	if paid < Config.RENT then
		return `День {state.day}. Не хватило на аренду. Долг: {Logic.money(state.debt)}.`
	end
	if state.debt > 0 then
		return `День {state.day}. Аренда оплачена. Старый долг: {Logic.money(state.debt)}.`
	end
	return `День {state.day}. Аренда комнаты: −{Logic.money(Config.RENT)}.`
end

-- Гасит долг сколько получится. Возвращает успех и сообщение.
function Logic.payDebt(state: State): (boolean, string)
	if state.debt <= 0 then
		return false, "Долгов нет."
	end
	local paid = math.min(state.money, state.debt)
	if paid <= 0 then
		return false, `Денег нет. Долг: {Logic.money(state.debt)}. Заработай курьером.`
	end
	state.money -= paid
	state.debt -= paid
	if state.debt > 0 then
		return true, `Оплачено {Logic.money(paid)}. Осталось: {Logic.money(state.debt)}.`
	end
	return true, "Долг за комнату погашен. Гульнар-апай довольна."
end

-- Ранг в Qazaq Soft по числу закрытых задач.
function Logic.itRank(state: State): { tasks: number, name: string, pay: number }
	local rank = Config.IT_RANKS[1]
	for _, entry in Config.IT_RANKS do
		if state.itTasks >= entry.tasks then
			rank = entry
		end
	end
	return rank
end

function Logic.itPay(state: State, success: boolean): number
	if not success then
		return Config.IT_PAY_FAIL
	end
	return math.floor(Config.IT_PAY * Logic.itRank(state).pay / 100 + 0.5) * 100
end

-- Ежедневный подарок. today — номер дня по UTC. Возвращает сумму или nil, если сегодня уже был.
-- Пропуск дней серию не обнуляет: она просто продолжается со следующего входа.
function Logic.daily(state: State, today: number): number?
	if state.lastDaily >= today then
		return nil
	end
	state.lastDaily = today
	state.streak += 1
	local amount = Config.DAILY_BASE + Config.DAILY_STEP * (math.min(state.streak, Config.DAILY_MAX_STREAK + 1) - 1)
	state.money += amount
	return amount
end

-- Сколько мебели уже куплено.
function Logic.furnished(state: State): number
	local count = 0
	for _, id in Config.FURNITURE do
		if state.items[id] then
			count += 1
		end
	end
	return count
end

-- Доля пути к текущей большой цели (0..1) и её название — для полоски на экране.
function Logic.progress(state: State): (number, string)
	if not state.ownsFlat then
		return math.clamp(state.money / Config.FLAT_PRICE, 0, 1), "Квартира"
	end
	if not state.momMoved then
		return math.clamp(state.money / Config.MOM_PRICE, 0, 1), "Мама"
	end
	if Logic.furnished(state) < #Config.FURNITURE then
		return Logic.furnished(state) / #Config.FURNITURE, "Мебель"
	end
	return 1, "Всё сделано"
end

-- Звание игрока: видно над головой и в таблице.
function Logic.title(state: State): string
	if state.momMoved then
		return "Семья в Астане"
	elseif state.ownsFlat then
		return "Своя квартира"
	elseif state.hired then
		return Logic.itRank(state).name .. "-разработчик"
	elseif state.deliveries >= 10 then
		return "Курьер"
	elseif state.deliveries >= 1 then
		return "Стажёр"
	end
	return "Новичок"
end

function Logic.canInterview(state: State): boolean
	return Logic.level(state.kazXp) >= Config.INTERVIEW_KAZ and Logic.level(state.codeXp) >= Config.INTERVIEW_CODE
end

function Logic.courierPay(distance: number): number
	local raw = Config.COURIER_BASE + distance * Config.COURIER_PER_STUD
	return math.floor(raw / 100 + 0.5) * 100
end

function Logic.baristaPay(state: State, correct: number): number
	local tips = 1 + 0.1 * Logic.level(state.kazXp)
	return math.floor(Config.BARISTA_PAY * correct * tips / 100 + 0.5) * 100
end

-- Подсказка: что делать дальше. Возвращает текст и здание, к которому ведёт метка.
function Logic.hasPuffer(state: State): boolean
	return state.items.puffer == true or state.items.pufferN == true
end

-- Самая дешёвая мебель, которой ещё нет (или nil, если всё куплено).
function Logic.nextFurniture(state: State): Config.Item?
	local best: Config.Item? = nil
	for _, id in Config.FURNITURE do
		local item = Config.ITEMS[id]
		if not state.items[id] and (best == nil or item.price < best.price) then
			best = item
		end
	end
	return best
end

-- Подсказка: что делать дальше. Возвращает текст и здание, к которому ведёт метка.
-- Каждый шаг учитывает деньги: если на цель не хватает, подсказка ведёт туда, где заработать.
function Logic.goalStep(state: State): (string, string?)
	local money = Logic.money
	if state.ownsFlat then
		if not state.momMoved then
			if state.money >= Config.MOM_PRICE then
				return "Денег хватает! Перевези маму в Астану — менеджер в ЖК «Есіл»", "flat"
			end
			return `Накопи на переезд мамы в Астану: {money(state.money)} из {money(Config.MOM_PRICE)}`, "it"
		end
		local item = Logic.nextFurniture(state)
		if item then
			if state.money >= item.price then
				return `Обустрой дом: мебель {Logic.furnished(state)} из {#Config.FURNITURE} (менеджер в ЖК «Есіл»)`, "flat"
			end
			return `Накопи на мебель: {item.name} — {money(item.price)}`, "it"
		end
		return "Вы с мамой дома, в Астане. Құттықтаймыз!", nil
	end
	if state.debt > 0 then
		if state.money <= 0 then
			return `Заработай курьером и отдай долг за комнату: {money(state.debt)}`, "depot"
		end
		return `Погаси долг за комнату: {money(state.debt)} (Гульнар-апай, дома)`, "home"
	end
	if state.deliveries == 0 and state.shifts == 0 and not state.hired then
		return "Заработай первые деньги: возьми заказ у Даурена в «Курьерской службе»", "depot"
	end
	if not Logic.hasPuffer(state) then
		local price = Config.ITEMS.puffer.price
		if state.money < price then
			return `Накопи на пуховик: {money(state.money)} из {money(price)} — бери заказы у Даурена`, "depot"
		end
		return `Купи пуховик на базаре ({money(price)}) — на улице мороз`, "bazaar"
	end
	if state.hired then
		if state.money >= Config.FLAT_PRICE then
			return "Денег хватает! Купи квартиру в ЖК «Есіл»", "flat"
		end
		return `Работай в Qazaq Soft и копи на квартиру: {money(state.money)} из {money(Config.FLAT_PRICE)}`, "it"
	end
	if Logic.level(state.kazXp) < Config.INTERVIEW_KAZ then
		if state.money < Config.KAZ_LESSON_PRICE then
			return `Заработай на урок казахского ({money(Config.KAZ_LESSON_PRICE)}): заказы у Даурена`, "depot"
		end
		return `Учи казахский на курсах: уровень {Logic.level(state.kazXp)} из {Config.INTERVIEW_KAZ}`, "school"
	end
	if Logic.level(state.codeXp) < Config.INTERVIEW_CODE then
		return `Учи код в библиотеке (бесплатно): уровень {Logic.level(state.codeXp)} из {Config.INTERVIEW_CODE}`, "library"
	end
	return "Иди на собеседование в Qazaq Soft на левом берегу", "it"
end

function Logic.goal(state: State): string
	return (Logic.goalStep(state))
end

function Logic.goalPlace(state: State): string?
	local _, place = Logic.goalStep(state)
	return place
end

-- Точка на улице перед дверью здания (для метки цели).
local function doorOf(id: string): (number, number)
	for _, place in Config.BUILDINGS do
		if place.id == id then
			return place.x, place.z + place.door * (place.d / 2 + 4)
		end
	end
	return Config.SPAWN.x, Config.SPAWN.z
end

export type Spot = { x: number, z: number, name: string }

-- Куда идти ради текущей цели: метка в мире дублирует подсказку сверху.
function Logic.goalSpot(state: State): Spot?
	local id = Logic.goalPlace(state)
	if id == nil then
		return nil
	end
	if id == "bazaar" then
		return { x = Config.BAZAAR.x, z = Config.BAZAAR.z + 8, name = "Базар" }
	end
	local x, z = doorOf(id)
	for _, place in Config.BUILDINGS do
		if place.id == id then
			return { x = x, z = z, name = place.name }
		end
	end
	return { x = x, z = z, name = id }
end

-- 1234567 → "1 234 567 ₸"
function Logic.money(amount: number): string
	local digits = tostring(math.floor(math.abs(amount)))
	local out = digits:reverse():gsub("(%d%d%d)", "%1 "):reverse()
	out = out:gsub("^%s+", "")
	return (if amount < 0 then "−" else "") .. out .. " ₸"
end

function Logic.clock(minuteOfDay: number): string
	local hours = math.floor(minuteOfDay / 60) % 24
	local minutes = math.floor(minuteOfDay % 60)
	return string.format("%02d:%02d", hours, minutes)
end

return Logic
