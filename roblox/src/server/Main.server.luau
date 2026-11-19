--!strict
-- Сервер «Астана: Жаңа өмір»: игроки, время, работа, магазины, сохранение.

local DataStoreService = game:GetService("DataStoreService")
local Lighting = game:GetService("Lighting")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Config = require(ReplicatedStorage.Shared.Config)
local Logic = require(ReplicatedStorage.Shared.Logic)
local Questions = require(ReplicatedStorage.Shared.Questions)
local World = require(script.Parent.World)

World.build()

local remotes = Instance.new("Folder")
remotes.Name = "Remotes"
local function remote(name: string): RemoteEvent
	local event = Instance.new("RemoteEvent")
	event.Name = name
	event.Parent = remotes
	return event
end
local StateEvent = remote("State")
local ToastEvent = remote("Toast")
local DialogEvent = remote("Dialog")
local DialogReply = remote("DialogReply")
local FadeEvent = remote("Fade")
remotes.Parent = ReplicatedStorage

local store: DataStore? = nil
pcall(function()
	store = DataStoreService:GetDataStore(Config.DATASTORE)
end)

type Target = { x: number, z: number, name: string, pay: number }
type Session = {
	state: Logic.State,
	busy: boolean,
	dialogId: number,
	waiting: thread?,
	target: Target?,
	cooldowns: { [string]: number },
	canSave: boolean,
	indoors: boolean,
	warned: { [string]: boolean },
	money: IntValue,
	day: IntValue,
}

local sessions: { [Player]: Session } = {}
local rng = Random.new()

local clock = Config.START_HOUR * 60 -- минута суток
local totalMinutes = 0
local buran = false
local buranSwitchAt = rng:NextInteger(500, 1100)

local function temperature(): number
	return Logic.temperature(clock / 60, buran)
end

local function rootOf(player: Player): BasePart?
	local character = player.Character
	local root = character and character:FindFirstChild("HumanoidRootPart")
	return if root and root:IsA("BasePart") then root else nil
end

local function teleport(player: Player, position: Vector3)
	local character = player.Character
	if character then
		character:PivotTo(CFrame.new(position))
	end
end

local function applySpeed(player: Player, session: Session)
	local character = player.Character
	local humanoid = character and character:FindFirstChildOfClass("Humanoid")
	if humanoid then
		humanoid.WalkSpeed = Logic.walkSpeed(session.state)
	end
end

local function toast(player: Player, text: string)
	ToastEvent:FireClient(player, text)
end

local function send(player: Player)
	local session = sessions[player]
	if not session then
		return
	end
	local state = session.state
	session.money.Value = state.money
	session.day.Value = state.day
	local target = session.target
	StateEvent:FireClient(player, {
		money = state.money,
		energy = state.energy,
		food = state.food,
		warmth = state.warmth,
		kaz = Logic.level(state.kazXp),
		code = Logic.level(state.codeXp),
		day = state.day,
		debt = state.debt,
		goal = Logic.goal(state),
		clock = Logic.clock(clock),
		temp = temperature(),
		buran = buran,
		indoors = session.indoors,
		target = if target then { x = target.x, z = target.z, name = target.name } else nil,
	})
end

-- Диалог с вариантами ответа. Возвращает номер выбранного варианта или nil (закрыл, вышел, не ответил).
local function ask(player: Player, title: string, text: string, options: { string }, extra: { [string]: any }?): any
	local session = sessions[player]
	if not session then
		return nil
	end
	session.dialogId += 1
	local id = session.dialogId
	local payload: { [string]: any } = { id = id, kind = "choice", title = title, text = text, options = options }
	if extra then
		for key, value in extra do
			payload[key] = value
		end
	end
	session.waiting = coroutine.running()
	DialogEvent:FireClient(player, payload)
	task.delay(120, function()
		if sessions[player] == session and session.dialogId == id and session.waiting then
			local thread = session.waiting
			session.waiting = nil
			DialogEvent:FireClient(player, { id = id, kind = "close" })
			task.spawn(thread, nil)
		end
	end)
	local value = coroutine.yield()
	if payload.kind == "choice" then
		if type(value) == "number" and value % 1 == 0 and value >= 1 and value <= #options then
			return value
		end
		return nil
	end
	return value
end

local function say(player: Player, title: string, text: string)
	ask(player, title, text, { "Понятно" })
end

DialogReply.OnServerEvent:Connect(function(player: Player, id: any, value: any)
	local session = sessions[player]
	if not session or not session.waiting or id ~= session.dialogId then
		return
	end
	local thread = session.waiting
	session.waiting = nil
	task.spawn(thread, value)
end)

-- Запускает сценарий для игрока; пока он идёт, другие сценарии не начинаются.
local function flow(player: Player, run: (player: Player, session: Session) -> ())
	local session = sessions[player]
	if not session or session.busy then
		return
	end
	session.busy = true
	task.spawn(function()
		local ok, err = pcall(run, player, session)
		session.busy = false
		if not ok then
			warn("Ошибка сценария: " .. tostring(err))
		end
		send(player)
	end)
end

local function spend(session: Session, energy: number): boolean
	if session.state.energy < energy then
		return false
	end
	session.state.energy -= energy
	return true
end

local function onCooldown(session: Session, key: string, minutes: number): number
	local last = session.cooldowns[key]
	if last and totalMinutes - last < minutes then
		return math.ceil(minutes - (totalMinutes - last))
	end
	return 0
end

-- Серия вопросов. Возвращает число верных ответов или nil, если игрок прервал урок.
local function quiz(player: Player, title: string, count: number, make: (Random) -> Questions.Question): number?
	local correct = 0
	for i = 1, count do
		local question = make(rng)
		local answer = ask(player, `{title} · {i}/{count}`, question.text, question.options)
		if answer == nil then
			return if i == 1 then nil else correct
		end
		if answer == question.answer then
			correct += 1
			toast(player, "Дұрыс! Верно.")
		else
			toast(player, `Неверно. Правильный ответ: {question.options[question.answer]}`)
		end
	end
	return correct
end

local function levelUp(player: Player, before: number, after: number, skill: string)
	if after > before then
		toast(player, `{skill}: уровень {after}!`)
	end
end

local TALK: { [string]: { string } } = {
	station = { "Добро пожаловать в Астану! Автобус до левого берега — на остановке у вокзала, 100 тенге.", "Комнату ищешь? Гульнар-апай сдаёт, второй дом направо." },
	doctor = { "Ешь вовремя, высыпайся и одевайся теплее — и ко мне не попадёшь.", "Обморожение — не шутка. В буран сиди в тепле." },
	library = { "Тише, пожалуйста. Учебники по программированию — за столом слева.", "С ноутбуком код учится быстрее, но и у нас книги хорошие." },
	arman = { "В Qazaq Soft берут тех, кто знает казахский и код хотя бы на третий уровень.", "Я тоже начинал курьером. Главное — не бросай учёбу." },
}

local actions: { [string]: (player: Player, session: Session, arg: string?) -> () } = {}

function actions.shop(player, session, arg)
	local shop = Config.SHOPS[arg or ""]
	if not shop then
		return
	end
	while true do
		local options = {}
		for _, id in shop.items do
			local item = Config.ITEMS[id]
			local owned = item.slot ~= nil and session.state.items[id] == true
			table.insert(options, if owned then `{item.name} — уже есть` else `{item.name} — {Logic.money(item.price)} · {item.desc}`)
		end
		table.insert(options, "Уйти")
		local choice = ask(player, shop.title, `{shop.text}\nУ тебя: {Logic.money(session.state.money)}`, options)
		if choice == nil or choice == #options then
			return
		end
		local _, message = Logic.buy(session.state, shop.items[choice])
		toast(player, message)
		applySpeed(player, session)
		send(player)
	end
end

local function sleep(player: Player, session: Session)
	local state = session.state
	if state.energy > 75 then
		say(player, "Кровать", "Спать пока не хочется. Приходи, когда устанешь.")
		return
	end
	FadeEvent:FireClient(player, "Ты спишь… Zzz", 5)
	task.wait(5)
	state.energy = 100
	state.warmth = 100
	state.food = math.max(10, state.food - 15)
	toast(player, "Сон пошёл на пользу. Силы восстановлены!")
end

function actions.sleep(player, session)
	if session.state.debt > 0 then
		say(player, "Гульнар-апай", `Сначала заплати за комнату! Долг: {Logic.money(session.state.debt)}. Поговори со мной, когда будут деньги.`)
		return
	end
	sleep(player, session)
end

function actions.sleepFlat(player, session)
	if not session.state.ownsFlat then
		say(player, "ЖК «Есіл»", "Это шоурум. Купи квартиру у менеджера — и кровать будет твоей.")
		return
	end
	sleep(player, session)
end

function actions.landlady(player, session)
	local state = session.state
	if state.debt > 0 then
		local choice = ask(player, "Гульнар-апай", `Балам, за комнату надо платить. Долг: {Logic.money(state.debt)}.`, { "Заплатить", "Потом" })
		if choice == 1 then
			local _, message = Logic.payDebt(state)
			toast(player, message)
		end
		return
	end
	local lines = {
		`Аренда — {Logic.money(Config.RENT)} каждое утро в 8:00. Не забывай!`,
		"Кушать хочешь? На базаре самса свежая. И чай попей, согреешься.",
		"Одевайся теплее, балам. Астана шуток не любит.",
	}
	say(player, "Гульнар-апай", lines[rng:NextInteger(1, #lines)])
end

function actions.talk(player, _session, arg)
	local lines = TALK[arg or ""]
	if lines then
		toast(player, lines[rng:NextInteger(1, #lines)])
	end
end

function actions.ped(player)
	toast(player, "Прохожий: " .. Config.PED_LINES[rng:NextInteger(1, #Config.PED_LINES)])
end

function actions.kazLesson(player, session)
	local state = session.state
	local choice = ask(player, "Курсы казахского", `Сәлеметсіз бе! Урок стоит {Logic.money(Config.KAZ_LESSON_PRICE)}. Начнём?\nТвой уровень: {Logic.level(state.kazXp)} из {Config.MAX_LEVEL}`, { "Начать урок", "Не сейчас" })
	if choice ~= 1 then
		return
	end
	if state.money < Config.KAZ_LESSON_PRICE then
		say(player, "Сауле-апай", "Не хватает денег на урок. Приходи после работы.")
		return
	end
	if not spend(session, 10) then
		say(player, "Сауле-апай", "Ты еле стоишь на ногах. Сначала отдохни.")
		return
	end
	state.money -= Config.KAZ_LESSON_PRICE
	send(player)
	local correct = quiz(player, "Урок казахского", Config.LESSON_QUESTIONS, Questions.kaz)
	if correct == nil then
		-- закрыл урок на первом вопросе: возвращаем деньги и силы
		state.money += Config.KAZ_LESSON_PRICE
		state.energy = math.min(100, state.energy + 10)
		toast(player, "Урок отменён, деньги возвращены.")
		return
	end
	local before = Logic.level(state.kazXp)
	Logic.addXp(state, "kazXp", correct * Config.KAZ_XP)
	levelUp(player, before, Logic.level(state.kazXp), "Казахский")
	say(player, "Сауле-апай", `Жарайсың! Верных ответов: {correct} из {Config.LESSON_QUESTIONS}.`)
end

local function study(player: Player, session: Session, xp: number)
	local state = session.state
	if not spend(session, 12) then
		say(player, "Учёба", "Глаза слипаются. Сначала отдохни.")
		return
	end
	local correct = quiz(player, "Основы программирования", Config.LESSON_QUESTIONS, Questions.code)
	if correct == nil then
		state.energy = math.min(100, state.energy + 12)
		return
	end
	local before = Logic.level(state.codeXp)
	Logic.addXp(state, "codeXp", correct * xp)
	levelUp(player, before, Logic.level(state.codeXp), "Код")
	toast(player, `Занятие окончено. Верных ответов: {correct} из {Config.LESSON_QUESTIONS}.`)
end

function actions.studyLibrary(player, session)
	study(player, session, Config.CODE_XP)
end

function actions.studyHome(player, session)
	if not session.state.items.laptop then
		say(player, "Стол", "Здесь можно учить код, но нужен ноутбук. Он продаётся в Хан Шатыре. А пока — библиотека.")
		return
	end
	study(player, session, Config.CODE_XP_LAPTOP)
end

function actions.courier(player, session)
	if session.target then
		local choice = ask(player, "Даурен", `У тебя уже есть заказ: {session.target.name}. Отказаться?`, { "Продолжу доставку", "Отказаться от заказа" })
		if choice == 2 then
			session.target = nil
			toast(player, "Заказ отменён.")
		end
		return
	end
	if session.state.energy < Config.COURIER_ENERGY then
		say(player, "Даурен", "Ты совсем без сил. Поспи и поешь, потом приходи.")
		return
	end
	local root = rootOf(player)
	if not root then
		return
	end
	local candidates = {}
	for _, address in Config.ADDRESSES do
		local distance = (Vector3.new(address.x, root.Position.Y, address.z) - root.Position).Magnitude
		if distance >= Config.COURIER_MIN_DISTANCE then
			table.insert(candidates, { address = address, distance = distance })
		end
	end
	if #candidates == 0 then
		say(player, "Даурен", "Заказов пока нет. Загляни чуть позже.")
		return
	end
	local pick = candidates[rng:NextInteger(1, #candidates)]
	local pay = Logic.courierPay(pick.distance)
	local choice = ask(player, "Даурен", `Есть заказ: {pick.address.name}.\nОплата: {Logic.money(pay)}. Берёшь?`, { "Беру!", "Другой заказ", "Не сейчас" })
	if choice == 1 then
		session.target = { x = pick.address.x, z = pick.address.z, name = pick.address.name, pay = pay }
		toast(player, `Доставь посылку: {pick.address.name}. Иди по жёлтой метке.`)
	elseif choice == 2 then
		actions.courier(player, session)
	end
end

function actions.barista(player, session)
	local state = session.state
	local hour = clock / 60
	if hour < Config.BARISTA_OPEN or hour >= Config.BARISTA_CLOSE then
		say(player, "Кофейня", `Кофейня работает с {Config.BARISTA_OPEN}:00 до {Config.BARISTA_CLOSE}:00.`)
		return
	end
	local wait = onCooldown(session, "barista", Config.BARISTA_COOLDOWN)
	if wait > 0 then
		say(player, "Айгерим", `Сейчас посетителей нет. Приходи через {Logic.clock(wait)} (ч:мин игрового времени).`)
		return
	end
	local choice = ask(player, "Смена бариста", "Запомни порядок ингредиентов и повтори его. Три заказа за смену.", { "Начать смену", "Не сейчас" })
	if choice ~= 1 then
		return
	end
	if not spend(session, Config.BARISTA_ENERGY) then
		say(player, "Айгерим", "На смену сейчас не хватит сил.")
		return
	end
	session.cooldowns.barista = totalMinutes
	local names = Config.BARISTA_INGREDIENTS
	local correct = 0
	for round = 1, 3 do
		local order = {}
		for i = 1, round + 2 do
			order[i] = rng:NextInteger(1, #names)
		end
		local reply = ask(player, `Заказ {round}/3`, "Запомни рецепт!", names, { kind = "sequence", order = order, show = 1.2 + 0.7 * #order })
		local good = type(reply) == "table" and #reply == #order
		if good then
			for i, value in order do
				if reply[i] ~= value then
					good = false
					break
				end
			end
		end
		if good then
			correct += 1
			toast(player, "Гость доволен: «Рақмет!»")
		else
			toast(player, "Рецепт перепутан. Гость ушёл.")
		end
	end
	local pay = Logic.baristaPay(state, correct)
	state.money += pay
	state.shifts += 1
	say(player, "Айгерим", `Смена окончена. Заказов без ошибок: {correct} из 3.\nЗаработано: {Logic.money(pay)}.`)
end

function actions.interview(player, session)
	local state = session.state
	if state.hired then
		say(player, "Жанель", "Ты уже в команде! Рабочее место — справа от входа.")
		return
	end
	if not Logic.canInterview(state) then
		say(player, "Жанель", `Нам нужны разработчики со знанием казахского.\nТребования: казахский — уровень {Config.INTERVIEW_KAZ} (у тебя {Logic.level(state.kazXp)}), код — уровень {Config.INTERVIEW_CODE} (у тебя {Logic.level(state.codeXp)}).`)
		return
	end
	if state.interviewDay == state.day then
		say(player, "Жанель", "Сегодня собеседование уже было. Приходи завтра.")
		return
	end
	local choice = ask(player, "Жанель", "Сәлеметсіз бе! Начнём собеседование? Три вопроса, нужно ответить хотя бы на два.", { "Начать", "Позже" })
	if choice ~= 1 then
		return
	end
	local correct = 0
	local makers = { Questions.kaz, Questions.code, Questions.code }
	for i, make in makers do
		local question = make(rng)
		local answer = ask(player, `Собеседование · {i}/3`, question.text, question.options)
		if answer == question.answer then
			correct += 1
		end
	end
	if correct >= 2 then
		state.hired = true
		say(player, "Жанель", `Құттықтаймын! Добро пожаловать в команду Qazaq Soft.\nЗа каждую задачу платим {Logic.money(Config.IT_PAY)}.`)
	else
		state.interviewDay = state.day
		say(player, "Жанель", "Пока не хватает знаний. Подготовься и приходи завтра.")
	end
end

function actions.itWork(player, session)
	local state = session.state
	if not state.hired then
		say(player, "Qazaq Soft", "Это рабочее место сотрудника. Сначала пройди собеседование у Жанель.")
		return
	end
	local wait = onCooldown(session, "it", Config.IT_COOLDOWN)
	if wait > 0 then
		say(player, "Qazaq Soft", `Новая задача появится через {wait} мин. игрового времени.`)
		return
	end
	if not spend(session, Config.IT_ENERGY) then
		say(player, "Qazaq Soft", "Голова не варит. Отдохни и возвращайся.")
		return
	end
	session.cooldowns.it = totalMinutes
	local question = Questions.code(rng)
	local answer = ask(player, "Рабочая задача", question.text, question.options)
	local pay = if answer == question.answer then Config.IT_PAY else Config.IT_PAY_FAIL
	state.money += pay
	state.itTasks += 1
	toast(player, if answer == question.answer then `Задача закрыта! +{Logic.money(pay)}` else `С ошибкой, пришлось переделывать. +{Logic.money(pay)}`)
end

function actions.buyFlat(player, session)
	local state = session.state
	if state.ownsFlat then
		say(player, "ЖК «Есіл»", "Это твой дом. Кровать — в глубине квартиры.")
		return
	end
	if state.money < Config.FLAT_PRICE then
		say(player, "Менеджер", `Квартира с видом на Байтерек стоит {Logic.money(Config.FLAT_PRICE)}.\nУ тебя: {Logic.money(state.money)}. Осталось накопить {Logic.money(Config.FLAT_PRICE - state.money)}.`)
		return
	end
	local choice = ask(player, "Менеджер", `Квартира в ЖК «Есіл» — {Logic.money(Config.FLAT_PRICE)}. Оформляем?`, { "Купить квартиру", "Ещё подумаю" })
	if choice ~= 1 or state.money < Config.FLAT_PRICE then
		return
	end
	state.money -= Config.FLAT_PRICE
	state.ownsFlat = true
	state.debt = 0
	FadeEvent:FireClient(player, "Ключи у тебя в руках!", 3)
	for _, other in Players:GetPlayers() do
		toast(other, `{player.DisplayName}: своя квартира на левом берегу!`)
	end
	say(player, "Астана: Жаңа өмір", `Всё началось с одной сумки, а теперь у тебя свой дом в столице.\nДней в Астане: {state.day}. Құттықтаймыз!`)
end

function actions.bus(player, session, arg)
	local options = {}
	local stops = {}
	for _, stop in Config.BUS_STOPS do
		if stop.id ~= arg then
			table.insert(options, stop.name)
			table.insert(stops, stop)
		end
	end
	table.insert(options, "Остаться")
	local choice = ask(player, "Автобус", `Проезд — {Logic.money(Config.BUS_FARE)}. Куда едем?`, options)
	local stop = choice and stops[choice]
	if not stop then
		return
	end
	if session.state.money < Config.BUS_FARE then
		toast(player, "Не хватает на проезд.")
		return
	end
	session.state.money -= Config.BUS_FARE
	FadeEvent:FireClient(player, `Автобус едет: {stop.name}`, 2)
	task.wait(1)
	teleport(player, Vector3.new(stop.x, 4, stop.z + (if stop.z < 0 then 4 else -4)))
end

function actions.baiterekUp(player)
	FadeEvent:FireClient(player, "Лифт поднимается на 97 метров…", 2)
	task.wait(1)
	teleport(player, World.baiterekTop)
end

function actions.baiterekDown(player)
	FadeEvent:FireClient(player, "Лифт спускается…", 2)
	task.wait(1)
	teleport(player, World.baiterekBottom)
end

function actions.wish(player, session)
	local state = session.state
	if state.wishDay == state.day then
		toast(player, "Желание на сегодня уже загадано. Приходи завтра.")
		return
	end
	state.wishDay = state.day
	state.energy = math.min(100, state.energy + 15)
	if not state.wished then
		state.wished = true
		state.money += 2000
		say(player, "Байтерек", "Ты прикладываешь ладонь к отпечатку и загадываешь желание.\nТелефон звякает: мама перевела 2 000 ₸ «на удачу».")
	else
		toast(player, "Желание загадано. На душе стало легче. Силы +15.")
	end
end

for _, prompt in World.prompts do
	prompt.Triggered:Connect(function(player: Player)
		local action = actions[prompt:GetAttribute("Action")]
		if action then
			flow(player, function(who, session)
				action(who, session, prompt:GetAttribute("Arg"))
			end)
		end
	end)
end

local function faint(player: Player, session: Session, reason: string)
	session.busy = true
	session.target = nil
	task.spawn(function()
		local state = session.state
		FadeEvent:FireClient(player, if reason == "cold" then "Мороз взял своё: ты теряешь сознание…" else "Силы кончились: ты теряешь сознание…", 4)
		task.wait(2)
		local hospital = World.place("hospital")
		if hospital then
			teleport(player, Vector3.new(hospital.x, 4, hospital.z))
		end
		local bill = Logic.faint(state)
		session.busy = false
		send(player)
		flow(player, function()
			say(player, "Больница", `Ты приходишь в себя в больнице. Врач говорит: «Ешь вовремя, высыпайся и одевайся теплее».\nСчёт за помощь: {Logic.money(bill)}.`)
		end)
	end)
end

local function warn1(player: Player, session: Session, key: string, value: number, text: string)
	if value < 25 and not session.warned[key] then
		session.warned[key] = true
		toast(player, text)
	elseif value > 45 then
		session.warned[key] = nil
	end
end

local function step(player: Player, session: Session, minutes: number, newDay: boolean)
	local root = rootOf(player)
	local state = session.state
	if newDay then
		toast(player, Logic.newDay(state))
	end
	if not root or session.busy then
		return
	end
	session.indoors = World.indoor(root.Position) ~= nil
	local reason = Logic.tick(state, minutes, { indoors = session.indoors, temp = temperature(), buran = buran })
	if reason then
		faint(player, session, reason)
		return
	end
	warn1(player, session, "warmth", state.warmth, "Ты замерзаешь! Зайди в любое здание погреться.")
	warn1(player, session, "food", state.food, "Очень хочется есть. Поешь на базаре или в донерной.")
	warn1(player, session, "energy", state.energy, "Силы на исходе. Пора поспать дома.")

	local target = session.target
	if target then
		local flat = Vector3.new(target.x, root.Position.Y, target.z)
		if (flat - root.Position).Magnitude < 10 then
			session.target = nil
			state.money += target.pay
			state.deliveries += 1
			state.energy = math.max(0, state.energy - Config.COURIER_ENERGY)
			toast(player, `Посылка доставлена: {target.name}. +{Logic.money(target.pay)}`)
		end
	end
end

local function save(player: Player)
	local session = sessions[player]
	if not session or not session.canSave or not store then
		return
	end
	local ok, err = pcall(function()
		(store :: DataStore):SetAsync("p_" .. player.UserId, session.state)
	end)
	if not ok then
		warn("Не удалось сохранить игру: " .. tostring(err))
	end
end

local function onCharacter(player: Player, character: Model)
	local session = sessions[player]
	if not session then
		return
	end
	local humanoid = character:WaitForChild("Humanoid", 10)
	if humanoid and humanoid:IsA("Humanoid") then
		humanoid.WalkSpeed = Logic.walkSpeed(session.state)
	end
	send(player)
end

local function onPlayer(player: Player)
	local saved = nil
	local canSave = false
	if store then
		local ok, result = pcall(function()
			return (store :: DataStore):GetAsync("p_" .. player.UserId)
		end)
		if ok then
			saved = result
			canSave = true
		else
			warn("Не удалось загрузить сохранение: " .. tostring(result))
		end
	end
	if player.Parent ~= Players then
		return
	end

	local stats = Instance.new("Folder")
	stats.Name = "leaderstats"
	local money = Instance.new("IntValue")
	money.Name = "Тенге"
	money.Parent = stats
	local day = Instance.new("IntValue")
	day.Name = "День"
	day.Parent = stats
	stats.Parent = player

	local state = Logic.sanitize(saved)
	local session: Session = {
		state = state,
		busy = false,
		dialogId = 0,
		waiting = nil,
		target = nil,
		cooldowns = {},
		canSave = canSave,
		indoors = false,
		warned = {},
		money = money,
		day = day,
	}
	sessions[player] = session

	player.CharacterAdded:Connect(function(character)
		onCharacter(player, character)
	end)
	if player.Character then
		task.spawn(onCharacter, player, player.Character)
	end
	send(player)

	if saved == nil then
		task.delay(3, function()
			flow(player, function()
				say(player, "Астана: Жаңа өмір", `Ты в столице: с одной сумкой и {Logic.money(Config.START_MONEY)}.\nНа улице мороз: следи за теплом, едой и силами.\nКомната у Гульнар-апай стоит {Logic.money(Config.RENT)} в день. Подсказка вверху экрана скажет, что делать дальше.`)
				say(player, "С чего начать", "1. Иди в жёлтое здание «Курьерская служба» и возьми заказ.\n2. Купи пуховик на базаре.\n3. Спи в комнате у Гульнар-апай — серый дом рядом с вокзалом.\nВ зданиях тепло. Подходи к людям и предметам и нажимай кнопку действия.")
			end)
		end)
	else
		toast(player, `С возвращением! День {state.day} в Астане.`)
	end
end

Players.PlayerAdded:Connect(onPlayer)
for _, player in Players:GetPlayers() do
	task.spawn(onPlayer, player)
end

Players.PlayerRemoving:Connect(function(player)
	save(player)
	sessions[player] = nil
end)

game:BindToClose(function()
	for _, player in Players:GetPlayers() do
		save(player)
	end
end)

task.spawn(function()
	while true do
		task.wait(120)
		for _, player in Players:GetPlayers() do
			save(player)
		end
	end
end)

-- Главный цикл: время, погода, потребности.
task.spawn(function()
	local last = os.clock()
	local rentMinute = Config.RENT_HOUR * 60
	local ticks = 0
	while true do
		task.wait(0.5)
		local now = os.clock()
		local minutes = math.min(now - last, 2) / Config.SECONDS_PER_GAME_MINUTE
		last = now
		local before = clock
		clock = (clock + minutes) % 1440
		totalMinutes += minutes
		Lighting.ClockTime = clock / 60
		local newDay = before < rentMinute and clock >= rentMinute

		if totalMinutes >= buranSwitchAt then
			buran = not buran
			buranSwitchAt = totalMinutes + (if buran then rng:NextInteger(120, 240) else rng:NextInteger(700, 1500))
			World.setBuran(buran)
			for _, player in Players:GetPlayers() do
				toast(player, if buran then "Начинается буран! Мороз усиливается — прячься в тепло." else "Буран стих.")
			end
		end

		ticks += 1
		for player, session in sessions do
			step(player, session, minutes, newDay)
			if ticks % 2 == 0 or newDay then
				send(player)
			end
		end
	end
end)
