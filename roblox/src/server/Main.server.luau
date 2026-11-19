--!strict
-- Сервер «Астана: Жаңа өмір»: игроки, время, работа, магазины, сохранение.

local DataStoreService = game:GetService("DataStoreService")
local Lighting = game:GetService("Lighting")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local Config = require(ReplicatedStorage.Shared.Config)
local Logic = require(ReplicatedStorage.Shared.Logic)
-- Вопросы лежат на сервере: клиент не видит правильных ответов.
local Questions = require(script.Parent.Questions)
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

local IS_STUDIO = RunService:IsStudio()
local store: DataStore? = nil
pcall(function()
	-- Тесты в Studio пишут в отдельное хранилище и не трогают сохранения игроков.
	store = DataStoreService:GetDataStore(Config.DATASTORE .. (if IS_STUDIO then "_studio" else ""))
end)

type Target = { x: number, z: number, name: string, pay: number, startedAt: number, distance: number }
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
	title: StringValue,
	tag: TextLabel?,
	closed: boolean, -- игрок вышел: финальное сохранение уже снимает блокировку
}

local sessions: { [Player]: Session } = {}
local rng = Random.new()

local clock = Config.START_HOUR * 60 -- минута суток
local totalMinutes = 0
local buran = false
local buranSwitchAt = rng:NextInteger(500, 1100)
local buranWarned = false

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

local function toast(player: Player, text: string, kind: string?)
	ToastEvent:FireClient(player, text, kind)
end

local function toastAll(text: string, kind: string?)
	for _, other in Players:GetPlayers() do
		toast(other, text, kind)
	end
end

local function send(player: Player)
	local session = sessions[player]
	if not session then
		return
	end
	local state = session.state
	session.money.Value = state.money
	local title = Logic.title(state)
	if session.title.Value ~= title then
		session.title.Value = title
	end
	if session.tag and session.tag.Text ~= title then
		session.tag.Text = title
	end
	local target = session.target
	local progress, progressName = Logic.progress(state)
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
		guide = if target then nil else Logic.goalSpot(state),
		progress = progress,
		progressName = progressName,
		title = title,
		streak = state.streak,
	})
end

-- Диалог с вариантами ответа. Возвращает номер выбранного варианта или nil (закрыл, вышел, не ответил).
local function ask(player: Player, title: string, text: string, options: { string }, extra: { [string]: any }?, timeout: number?): any
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
	task.delay(timeout or 120, function()
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
	ask(player, title, text, { "Понятно" }, nil, 45)
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
	if not session then
		return
	end
	if session.busy then
		if not session.waiting then
			toast(player, "Сначала закончи текущее дело.")
		end
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
local function quiz(player: Player, title: string, count: number, make: (Random, Questions.Used?) -> Questions.Question): number?
	local correct = 0
	local used: Questions.Used = {}
	for i = 1, count do
		local question = make(rng, used)
		local answer = ask(player, `{title} · {i}/{count}`, question.text, question.options)
		if answer == nil then
			return if i == 1 then nil else correct
		end
		if answer == question.answer then
			correct += 1
			toast(player, "Дұрыс! Верно.", "good")
		else
			toast(player, `Неверно. Правильный ответ: {question.options[question.answer]}`, "bad")
		end
	end
	return correct
end

local function levelUp(player: Player, before: number, after: number, skill: string)
	if after > before then
		toast(player, `{skill}: уровень {after}!`, "big")
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
		local bought, message = Logic.buy(session.state, shop.items[choice])
		toast(player, message, if bought then "good" else "bad")
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
		-- спать можно и с долгом, иначе получается ловушка: без сна нет сил заработать
		toast(player, `Гульнар-апай ворчит: «Не забудь про долг — {Logic.money(session.state.debt)}!»`)
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
			local paid, message = Logic.payDebt(state)
			toast(player, message, if paid then "good" else "bad")
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
	local correct = quiz(player, "Урок казахского", Config.LESSON_QUESTIONS, Questions.kaz)
	if correct == nil then
		-- закрыл урок на первом вопросе: урок не считается, силы возвращаем
		state.energy = math.min(100, state.energy + 10)
		toast(player, "Урок отменён.")
		return
	end
	-- платим в конце урока: если игрок вышел посреди урока, деньги не пропадут
	state.money -= math.min(state.money, Config.KAZ_LESSON_PRICE)
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
	if session.state.hired then
		local choice = ask(player, "Ноутбук", "Чем займёмся?", { "Рабочая задача Qazaq Soft", "Учить код", "Ничего" })
		if choice == 1 then
			actions.itWork(player, session)
		elseif choice == 2 then
			study(player, session, Config.CODE_XP_LAPTOP)
		end
		return
	end
	study(player, session, Config.CODE_XP_LAPTOP)
end

function actions.courier(player, session, reroll: any?)
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
	if session.state.deliveries == 0 and reroll ~= true then
		-- первый заказ — ближайший, чтобы первые деньги пришли быстро
		for _, candidate in candidates do
			if candidate.distance < pick.distance then
				pick = candidate
			end
		end
	end
	local pay = Logic.courierPay(pick.distance)
	local choice = ask(player, "Даурен", `Есть заказ: {pick.address.name}.\nОплата: {Logic.money(pay)}. Берёшь?`, { "Беру!", "Другой заказ", "Не сейчас" })
	if choice == 1 then
		session.target = { x = pick.address.x, z = pick.address.z, name = pick.address.name, pay = pay, startedAt = os.clock(), distance = pick.distance }
		toast(player, `Доставь посылку: {pick.address.name}. Иди по жёлтой метке.`)
	elseif choice == 2 then
		actions.courier(player, session, true)
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
		say(player, "Айгерим", `Сейчас посетителей нет. Приходи через {math.ceil(wait * Config.SECONDS_PER_GAME_MINUTE)} сек.`)
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
		if reply == nil then
			toast(player, "Смена прервана.", "bad")
			break
		end
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
			toast(player, "Гость доволен: «Рақмет!»", "good")
		else
			toast(player, "Рецепт перепутан. Гость ушёл.", "bad")
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
		say(player, "Жанель", "Ты уже в команде! Рабочее место — слева от входа.")
		return
	end
	if not Logic.canInterview(state) then
		say(player, "Жанель", `Нам нужны разработчики со знанием казахского.\nТребования: казахский — уровень {Config.INTERVIEW_KAZ} (у тебя {Logic.level(state.kazXp)}), код — уровень {Config.INTERVIEW_CODE} (у тебя {Logic.level(state.codeXp)}).`)
		return
	end
	local wait = onCooldown(session, "interview", Config.INTERVIEW_COOLDOWN)
	if wait > 0 then
		say(player, "Жанель", `Давай чуть позже: повтори материал и приходи через {math.ceil(wait * Config.SECONDS_PER_GAME_MINUTE)} сек.`)
		return
	end
	local choice = ask(player, "Жанель", "Сәлеметсіз бе! Начнём собеседование? Три вопроса, нужно ответить хотя бы на два.", { "Начать", "Позже" })
	if choice ~= 1 then
		return
	end
	local correct = 0
	local makers = { Questions.kaz, Questions.code, Questions.code }
	local used: Questions.Used = {}
	for i, make in makers do
		local question = make(rng, used)
		local answer = ask(player, `Собеседование · {i}/3`, question.text, question.options)
		if answer == nil then
			toast(player, "Собеседование прервано. Приходи, когда подготовишься.")
			return
		end
		if answer == question.answer then
			correct += 1
		end
	end
	if correct >= 2 then
		state.hired = true
		toastAll(`{player.DisplayName} теперь разработчик в Qazaq Soft!`, "big")
		say(player, "Жанель", `Құттықтаймын! Добро пожаловать в команду Qazaq Soft.\nЗа каждую задачу платим {Logic.money(Logic.itPay(state, true))}. После 30 задач — повышение до Middle.`)
	else
		session.cooldowns.interview = totalMinutes
		say(player, "Жанель", `Пока не хватает знаний — нужно 2 верных ответа из 3, у тебя {correct}. Попробуй ещё раз через {math.ceil(Config.INTERVIEW_COOLDOWN * Config.SECONDS_PER_GAME_MINUTE)} сек.\nСовет: с ноутбуком из Хан Шатыра можно учиться и работать прямо из дома.`)
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
		say(player, "Qazaq Soft", `Новая задача появится через {math.ceil(wait * Config.SECONDS_PER_GAME_MINUTE)} сек.`)
		return
	end
	if not spend(session, Config.IT_ENERGY) then
		say(player, "Qazaq Soft", "Голова не варит. Отдохни и возвращайся.")
		return
	end
	session.cooldowns.it = totalMinutes
	local question = Questions.code(rng)
	local rankBefore = Logic.itRank(state)
	local answer = ask(player, `Рабочая задача · {rankBefore.name}`, question.text, question.options)
	local success = answer == question.answer
	local pay = Logic.itPay(state, success)
	state.money += pay
	state.itTasks += 1
	toast(player, if success then `Задача закрыта! +{Logic.money(pay)}` else `С ошибкой, пришлось переделывать. +{Logic.money(pay)}`, if success then "good" else "bad")
	local rankAfter = Logic.itRank(state)
	if rankAfter ~= rankBefore then
		toastAll(`{player.DisplayName} получает повышение: {rankAfter.name}-разработчик!`, "big")
		say(player, "Qazaq Soft", `Повышение! Теперь ты {rankAfter.name}-разработчик.\nЗа задачу платим {Logic.money(Logic.itPay(state, true))}.`)
	else
		local nextRank = nil
		for _, entry in Config.IT_RANKS do
			if entry.tasks > state.itTasks then
				nextRank = entry
				break
			end
		end
		if nextRank and nextRank.tasks - state.itTasks <= 5 then
			toast(player, `До повышения до {nextRank.name}: {nextRank.tasks - state.itTasks} задач(и)`)
		end
	end
end

function actions.buyFlat(player, session)
	local state = session.state
	if state.ownsFlat then
		local options = { "Перевезти маму в Астану", "Купить мебель", "Уйти" }
		local choice = ask(player, "Менеджер", `С новосельем! Мебель: {Logic.furnished(state)} из {#Config.FURNITURE}.`, options)
		if choice == 1 then
			actions.moveMom(player, session)
		elseif choice == 2 then
			actions.shop(player, session, "furniture")
		end
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
	toastAll(`{player.DisplayName}: своя квартира на левом берегу!`, "big")
	say(player, "Астана: Жаңа өмір", `Всё началось с одной сумки, а теперь у тебя свой дом в столице.\nДней в Астане: {state.day}. Құттықтаймыз!\n\nДальше: перевези маму в Астану и обустрой дом.`)
end

function actions.moveMom(player, session)
	local state = session.state
	if state.momMoved then
		say(player, "Мама", "Балам, я так горжусь тобой! Чай уже на столе.")
		return
	end
	if state.money < Config.MOM_PRICE then
		say(player, "Менеджер", `Переезд, билеты и подарки — {Logic.money(Config.MOM_PRICE)}.\nУ тебя: {Logic.money(state.money)}. Осталось {Logic.money(Config.MOM_PRICE - state.money)}.`)
		return
	end
	local choice = ask(player, "Менеджер", `Переезд мамы: билеты, вещи и подарки — {Logic.money(Config.MOM_PRICE)}. Оформляем?`, { "Да, зову маму!", "Чуть позже" })
	if choice ~= 1 or state.money < Config.MOM_PRICE then
		return
	end
	state.money -= Config.MOM_PRICE
	state.momMoved = true
	FadeEvent:FireClient(player, "Поезд прибывает на вокзал Астаны…", 3)
	toastAll(`{player.DisplayName}: мама переехала в Астану!`, "big")
	say(player, "Мама", "Балам, правда можно приехать? Я так соскучилась!")
	say(player, "Конец истории", `Мама обнимает тебя на перроне.\nОдна сумка, мороз, курьерские заказы — и вот у вас общий дом в столице.\nДней в Астане: {state.day}. Рақмет за игру!`)
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
		toast(player, "Не хватает на проезд.", "bad")
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
		if not action then
			return
		end
		-- защита от читов: кнопку должен нажать игрок, который стоит рядом
		local root = rootOf(player)
		local holder = prompt.Parent
		if not root or not holder or not holder:IsA("BasePart") then
			return
		end
		if (root.Position - holder.Position).Magnitude > prompt.MaxActivationDistance + 8 then
			return
		end
		flow(player, function(who, session)
			action(who, session, prompt:GetAttribute("Arg"))
		end)
	end)
end

-- Только в Studio: запуск действий без нажатия кнопок, для автопроверок через MCP.
-- Объект лежит в ServerStorage, клиенты до него не дотягиваются; в опубликованной игре его нет.
if IS_STUDIO then
	local dev = Instance.new("BindableEvent")
	dev.Name = "AstanaDevTrigger"
	dev.Event:Connect(function(player: Player, action: string, arg: string?)
		local session = sessions[player]
		if action == "devGrant" and session then
			-- деньги и уровни для проверки поздней игры
			session.state.money += tonumber(arg) or 0
			session.state.kazXp = math.max(session.state.kazXp, 300)
			session.state.codeXp = math.max(session.state.codeXp, 300)
			session.state.deliveries = math.max(session.state.deliveries, 1)
			if arg == "hire" then
				session.state.hired = true
			end
			send(player)
			return
		end
		local run = actions[action]
		if run then
			flow(player, function(who, session)
				run(who, session, arg)
			end)
		end
	end)
	dev.Parent = game:GetService("ServerStorage")
end

local function faint(player: Player, session: Session, reason: string)
	session.busy = true
	task.spawn(function()
		local state = session.state
		FadeEvent:FireClient(player, if reason == "cold" then "Мороз взял своё: ты теряешь сознание…" else "Силы кончились: ты теряешь сознание…", 4)
		task.wait(2)
		local hospital = World.place("hospital")
		if hospital then
			teleport(player, Vector3.new(hospital.x, 4, hospital.z))
		end
		local first = state.faints == 0
		local bill = Logic.faint(state)
		local target = session.target
		if target and hospital then
			-- заказ не пропадает: путь считаем заново от больницы
			target.startedAt = os.clock()
			target.distance = (Vector3.new(target.x, 0, target.z) - Vector3.new(hospital.x, 0, hospital.z)).Magnitude
		end
		session.busy = false
		send(player)
		flow(player, function()
			local billText = if first then "Первый раз лечим бесплатно." else `Счёт за помощь: {Logic.money(bill)}.`
			say(player, "Больница", `Ты приходишь в себя в больнице. Врач говорит: «Ешь вовремя, высыпайся и одевайся теплее».\n{billText}`)
		end)
	end)
end

local function warn1(player: Player, session: Session, key: string, value: number, text: string, below: number?)
	local limit = below or 25
	if value < limit and not session.warned[key] then
		session.warned[key] = true
		toast(player, text, "bad")
	elseif value > limit + 20 then
		session.warned[key] = nil
	end
end

-- Вехи на пути к большой цели (квартира, мама): каждые 10 % — маленький праздник.
local function milestones(player: Player, session: Session)
	local state = session.state
	if not state.hired then
		return
	end
	local share, stage = Logic.progress(state)
	if stage == "Мебель" or stage == "Всё сделано" then
		return
	end
	if state.milestoneStage ~= stage then
		state.milestoneStage = stage
		state.milestone = math.floor(share * 10) * 10
		return
	end
	local percent = math.floor(share * 10) * 10
	if percent > state.milestone and percent < 100 then
		state.milestone = percent
		toast(player, if stage == "Квартира" then `Квартира уже на {percent}% ближе! Так держать.` else `Переезд мамы: накоплено {percent}%!`, "big")
	elseif percent >= 100 and state.milestone < 100 then
		state.milestone = 100
		toast(player, if stage == "Квартира" then "Денег хватает на квартиру! Беги в ЖК «Есіл»." else "Хватает на переезд мамы! Беги в ЖК «Есіл».", "big")
	end
end

local function step(player: Player, session: Session, minutes: number, newDay: boolean)
	local root = rootOf(player)
	local state = session.state
	if newDay then
		toast(player, Logic.newDay(state), if state.debt > 0 then "bad" else nil)
	end
	if not root then
		return
	end
	session.indoors = World.indoor(root.Position) ~= nil
	-- потребности идут и во время диалога, но обморок подождёт, пока игрок не закончит
	local reason = Logic.tick(state, minutes, { indoors = session.indoors, temp = temperature(), buran = buran })
	if not session.indoors then
		warn1(player, session, "chill", state.warmth, if not Logic.hasPuffer(state) then "Холодает! Погрейся в любом здании, а лучше купи пуховик на базаре." else "Холодает. Загляни погреться в любое здание.", 50)
	end
	warn1(player, session, "warmth", state.warmth, "Ты замерзаешь! Зайди в любое здание погреться.")
	warn1(player, session, "food", state.food, "Очень хочется есть. Поешь на базаре или в донерной.")
	warn1(player, session, "energy", state.energy, "Силы на исходе. Пора поспать дома.")
	if session.busy then
		-- пока открыт диалог, в обморок не падаем: шкалы не опускаются ниже 5
		state.warmth = math.max(state.warmth, 5)
		state.energy = math.max(state.energy, 5)
		return
	end
	if reason then
		faint(player, session, reason)
		return
	end
	milestones(player, session)

	local target = session.target
	if target then
		local flat = Vector3.new(target.x, root.Position.Y, target.z)
		if (flat - root.Position).Magnitude < 10 then
			-- защита от телепорта: дойти быстрее, чем позволяет скорость, нельзя
			local fastest = target.distance / (Logic.walkSpeed(state) * 1.6)
			if os.clock() - target.startedAt < fastest then
				if not session.warned.parcel then
					session.warned.parcel = true
					toast(player, "Ты на месте! Клиент спускается за посылкой…")
				end
				return
			end
			session.warned.parcel = nil
			session.target = nil
			state.money += target.pay
			state.deliveries += 1
			state.energy = math.max(0, state.energy - Config.COURIER_ENERGY)
			toast(player, `Посылка доставлена: {target.name}. +{Logic.money(target.pay)}`, "good")
			if state.deliveries == 10 then
				toast(player, "10 доставок! Теперь ты настоящий курьер.", "big")
			end
			-- сразу следующий заказ отсюда же: не нужно идти обратно к Даурену
			task.delay(1.5, function()
				flow(player, function(who, s)
					if s.target == nil and s.state.energy >= Config.COURIER_ENERGY then
						actions.courier(who, s)
					end
				end)
			end)
		end
	end
end

-- ---------- сохранение ----------
-- Запись: { state = ..., lock = { job, t } }. Блокировка не даёт двум серверам затереть друг друга,
-- если игрок быстро перешёл на другой сервер.

local pendingSaves = 0

local function lockedByOther(old: any): boolean
	if type(old) ~= "table" or type(old.lock) ~= "table" then
		return false
	end
	local lockTime = tonumber(old.lock.t) or 0
	return old.lock.job ~= game.JobId and os.time() - lockTime < Config.LOCK_SECONDS
end

local function save(player: Player, session: Session?, release: boolean?)
	if not session or not session.canSave or not store then
		return
	end
	-- после выхода игрока обычное автосохранение не должно снова ставить блокировку
	if session.closed and not release then
		return
	end
	pendingSaves += 1
	local state = session.state
	for attempt = 1, 3 do
		if session.closed and not release then
			break
		end
		local ok, err = pcall(function()
			(store :: DataStore):UpdateAsync("p_" .. player.UserId, function(old)
				if lockedByOther(old) then
					return nil -- игрок уже на другом сервере: там данные свежее
				end
				return { state = state, lock = if release then nil else { job = game.JobId, t = os.time() } }, { player.UserId }
			end)
		end)
		if ok then
			break
		end
		if attempt == 3 then
			warn("Не удалось сохранить игру: " .. tostring(err))
		else
			task.wait(attempt * 2)
		end
	end
	pendingSaves -= 1
end

-- Загружает сохранение и ставит блокировку. Возвращает: удалось ли, сохранённое состояние (или nil у новичка).
local function load(player: Player): (boolean, any)
	if not store then
		return false, nil
	end
	-- если игрок только что вышел с другого сервера, ждём, пока тот допишет сохранение
	local attempts = 12
	for attempt = 1, attempts do
		local busyElsewhere = false
		local result: any = nil
		local ok, err = pcall(function()
			(store :: DataStore):UpdateAsync("p_" .. player.UserId, function(old)
				if lockedByOther(old) then
					busyElsewhere = true
					return nil
				end
				busyElsewhere = false
				if type(old) ~= "table" then
					result = nil
				elseif old.state ~= nil or old.lock ~= nil then
					-- новый формат; запись с одной блокировкой и без состояния — это новичок
					result = if type(old.state) == "table" then old.state else nil
				else
					result = old -- старый формат: состояние лежит прямо в записи
				end
				return { state = result, lock = { job = game.JobId, t = os.time() } }, { player.UserId }
			end)
		end)
		if ok and not busyElsewhere then
			return true, result
		end
		if attempt == attempts or (not ok and attempt >= 5) then
			warn("Не удалось загрузить сохранение: " .. tostring(if ok then "занято другим сервером" else err))
			return false, nil
		end
		task.wait(if busyElsewhere then 5 else attempt * 2)
		if player.Parent ~= Players then
			return false, nil
		end
	end
	return false, nil
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
	-- звание над головой; висит на HumanoidRootPart: голову R15 игра подменяет при загрузке аватара
	local anchor = character:WaitForChild("HumanoidRootPart", 10)
	if anchor and anchor:IsA("BasePart") then
		local gui = Instance.new("BillboardGui")
		gui.Name = "Title"
		gui.Size = UDim2.fromOffset(200, 24)
		gui.StudsOffset = Vector3.new(0, 4.4, 0)
		gui.MaxDistance = 80
		gui.LightInfluence = 0
		local label = Instance.new("TextLabel")
		label.Size = UDim2.fromScale(1, 1)
		label.BackgroundTransparency = 1
		label.Font = Enum.Font.GothamBold
		label.TextSize = 15
		label.TextColor3 = Color3.fromRGB(255, 214, 110)
		label.TextStrokeTransparency = 0.3
		label.AutoLocalize = false
		label.Text = Logic.title(session.state)
		label.Parent = gui
		gui.Parent = anchor
		session.tag = label
	end
	send(player)
end

local function releaseLock(player: Player)
	if not store then
		return
	end
	pcall(function()
		(store :: DataStore):UpdateAsync("p_" .. player.UserId, function(old)
			if type(old) == "table" and type(old.lock) == "table" and old.lock.job == game.JobId then
				old.lock = nil
				return old, { player.UserId }
			end
			return nil
		end)
	end)
end

local function onPlayer(player: Player)
	local loaded, saved = load(player)
	if player.Parent ~= Players then
		-- ушёл, пока грузилось сохранение: снимаем свою блокировку, чтобы не мешать на другом сервере
		if loaded then
			releaseLock(player)
		end
		return
	end
	if store and not loaded and not IS_STUDIO then
		-- без загрузки прогресс потом затёр бы старое сохранение: лучше попросить зайти позже
		player:Kick("Не удалось загрузить сохранение. Зайди через пару минут — прогресс цел.")
		return
	end

	local stats = Instance.new("Folder")
	stats.Name = "leaderstats"
	local money = Instance.new("IntValue")
	money.Name = "Тенге"
	money.Parent = stats
	local title = Instance.new("StringValue")
	title.Name = "Статус"
	title.Parent = stats
	stats.Parent = player

	local state = Logic.sanitize(saved)
	local session: Session = {
		state = state,
		busy = false,
		dialogId = 0,
		waiting = nil,
		target = nil,
		cooldowns = {},
		canSave = loaded,
		indoors = false,
		warned = {},
		money = money,
		title = title,
		tag = nil,
		closed = false,
	}
	sessions[player] = session

	player.CharacterAdded:Connect(function(character)
		onCharacter(player, character)
	end)
	if player.Character then
		task.spawn(onCharacter, player, player.Character)
	end
	local today = math.floor(os.time() / 86400)
	local gift = nil
	if saved == nil then
		-- новичок: первый день серии засчитан, подарки — со следующего входа
		state.lastDaily = today
		state.streak = 1
	else
		gift = Logic.daily(state, today)
	end
	send(player)

	if saved == nil then
		task.delay(3, function()
			flow(player, function()
				say(player, "Астана: Жаңа өмір", `Ты в Астане: одна сумка и {Logic.money(state.money)}. Мечта — своя квартира на левом берегу.\n\nБирюзовая метка ведёт к цели, жёлтая — к адресу доставки. Каждое утро в 8:00 — аренда {Logic.money(Config.RENT)}. На улице мороз, в зданиях тепло.`)
			end)
		end)
	elseif gift then
		toast(player, `С возвращением! Подарок за вход: +{Logic.money(gift)} · серия {state.streak} дн.`, "big")
	else
		toast(player, `С возвращением! День {state.day} в Астане.`)
	end
end

Players.PlayerAdded:Connect(onPlayer)
for _, player in Players:GetPlayers() do
	task.spawn(onPlayer, player)
end

Players.PlayerRemoving:Connect(function(player)
	local session = sessions[player]
	sessions[player] = nil
	if session then
		session.closed = true
	end
	save(player, session, true)
end)

game:BindToClose(function()
	for player, session in sessions do
		session.closed = true
		task.spawn(save, player, session, true)
	end
	-- ждём, пока допишутся все сохранения, включая начатые при выходе игроков
	local deadline = os.clock() + 25
	while pendingSaves > 0 and os.clock() < deadline do
		task.wait(0.1)
	end
end)

task.spawn(function()
	while true do
		task.wait(Config.AUTOSAVE_SECONDS)
		for player, session in sessions do
			task.spawn(save, player, session)
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

		if not buran and not buranWarned and totalMinutes >= buranSwitchAt - 40 then
			buranWarned = true
			for _, player in Players:GetPlayers() do
				toast(player, "Синоптики: скоро буран! Закончи дела на улице и держись ближе к зданиям.", "bad")
			end
		end
		if totalMinutes >= buranSwitchAt then
			buran = not buran
			buranWarned = false
			buranSwitchAt = totalMinutes + (if buran then rng:NextInteger(120, 240) else rng:NextInteger(700, 1500))
			World.setBuran(buran)
			for _, player in Players:GetPlayers() do
				toast(player, if buran then "Начинается буран! Мороз усиливается — прячься в тепло." else "Буран стих.", if buran then "bad" else nil)
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
