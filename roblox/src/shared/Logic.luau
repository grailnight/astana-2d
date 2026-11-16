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
	state.food = math.max(0, state.food - 0.085 * minutes)
	local energyDrain = if state.food <= 0 then 0.27 else 0.09
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
	local bill = math.min(state.money, Config.HOSPITAL_BILL)
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
	if state.money >= Config.RENT then
		state.money -= Config.RENT
		return `День {state.day}. Аренда комнаты: −{Logic.money(Config.RENT)}.`
	end
	state.debt += Config.RENT
	return `День {state.day}. Нечем платить за комнату! Долг: {Logic.money(state.debt)}.`
end

function Logic.payDebt(state: State): (boolean, string)
	if state.debt <= 0 then
		return false, "Долгов нет."
	end
	if state.money < state.debt then
		return false, `Нужно {Logic.money(state.debt)}, а у тебя {Logic.money(state.money)}.`
	end
	state.money -= state.debt
	state.debt = 0
	return true, "Долг за комнату погашен. Гульнар-апай довольна."
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

-- Подсказка: что делать дальше.
function Logic.goal(state: State): string
	if state.ownsFlat then
		return "У тебя своя квартира на левом берегу. Астана — твой дом!"
	end
	if state.debt > 0 then
		return `Погаси долг за комнату: {Logic.money(state.debt)} (Гульнар-апай, дома)`
	end
	if Logic.warmRating(state) == 0 then
		return "Купи пуховик на базаре — на улице мороз. Заработать можно курьером."
	end
	if state.hired then
		return `Работай в Qazaq Soft и копи на квартиру в ЖК «Есіл»: {Logic.money(Config.FLAT_PRICE)}`
	end
	if Logic.level(state.kazXp) < Config.INTERVIEW_KAZ then
		return `Учи казахский на курсах: уровень {Logic.level(state.kazXp)} из {Config.INTERVIEW_KAZ}`
	end
	if Logic.level(state.codeXp) < Config.INTERVIEW_CODE then
		return `Учи код в библиотеке: уровень {Logic.level(state.codeXp)} из {Config.INTERVIEW_CODE}`
	end
	return "Иди на собеседование в Qazaq Soft на левом берегу"
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
