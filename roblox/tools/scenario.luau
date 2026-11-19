-- Сквозной сценарий: запускает сервер и клиент в имитации Roblox и проходит игру
-- от приезда на вокзал до покупки квартиры.

local m = __mock
local game = m.game
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")

local checks = 0
local function check(condition, message)
	checks += 1
	if not condition then
		error("ПРОВАЛ: " .. message, 2)
	end
end
local function noErrors(where)
	if #m.errors > 0 then
		error("Ошибки (" .. where .. "):\n" .. table.concat(m.errors, "\n---\n"), 2)
	end
end

local function module(name, parent, class)
	local instance = m.new(class or "ModuleScript", name)
	instance.Parent = parent
	return instance
end

local shared = module("Shared", ReplicatedStorage, "Folder")
local Config = m.require(module("Config", shared))
local Logic = m.require(module("Logic", shared))
local Questions = m.require(module("Questions", ServerScriptService))
module("World", ServerScriptService)
local main = module("Main", ServerScriptService, "Script")

-- ---------- логика ----------
check(Logic.money(1234567) == "1 234 567 ₸", "формат денег: " .. Logic.money(1234567))
check(Logic.money(500) == "500 ₸", "формат денег 500")
check(Logic.clock(605) == "10:05", "формат времени")
do
	local s = Logic.newState()
	check(Logic.warmRating(s) == 0, "без одежды тепло 0")
	local cold = Logic.coldDrain(s, { indoors = false, temp = -20, buran = false })
	check(not Logic.buy(s, "puffer"), "на пуховик сначала надо заработать")
	s.money = 20000
	local ok = Logic.buy(s, "puffer")
	check(ok and s.money == 2000 and s.items.puffer, "покупка пуховика")
	check(Logic.coldDrain(s, { indoors = false, temp = -20, buran = false }) < cold / 2, "пуховик греет")
	check(not Logic.buy(s, "puffer"), "второй пуховик не продаётся")
	check(not Logic.buy(s, "laptop"), "на ноутбук не хватает")
	s.warmth = 1
	check(Logic.tick(s, 30, { indoors = false, temp = -25, buran = true }) == "cold", "замерзание")
	local bill = Logic.faint(s)
	check(bill == 0 and s.money == 2000 and s.warmth >= 70 and s.faints == 1, "первый обморок лечат бесплатно")
	s.money = 10000
	check(Logic.faint(s) == Config.HOSPITAL_BILL and s.money == 8000, "второй обморок — по счёту")
	s.money = 1000
	check(Logic.faint(s) == 300 and s.money == 700, "больница берёт не больше 30 % наличных")
	check(Logic.newDay(s) and s.day == 2 and s.debt == 0 and s.money == 700, "первая ночь бесплатно")
	Logic.newDay(s)
	check(s.day == 3 and s.money == 0 and s.debt == Config.RENT - 700, "аренда: платим сколько есть, остальное в долг")
	s.money = 1000
	check(Logic.payDebt(s) and s.money == 0 and s.debt == Config.RENT - 1700, "долг можно гасить частями")
	check(not Logic.payDebt(s), "без денег погасить нельзя")
	s.money = 10000
	check(Logic.payDebt(s) and s.debt == 0 and s.money == 10000 - (Config.RENT - 1700), "долг погашен")
	-- карьера и награды
	local w = Logic.newState()
	check(Logic.title(w) == "Новичок", "звание новичка")
	w.hired = true
	check(Logic.itPay(w, true) == Config.IT_PAY and Logic.title(w) == "Junior-разработчик", "джуниор")
	w.itTasks = 30
	check(Logic.itPay(w, true) == 10000 and Logic.itRank(w).name == "Middle", "повышение до Middle")
	w.itTasks = 80
	check(Logic.itPay(w, true) == 12000 and Logic.itPay(w, false) == Config.IT_PAY_FAIL, "Senior и задача с ошибкой")
	local before = w.money
	check(Logic.daily(w, 100) == Config.DAILY_BASE and w.streak == 1, "первый ежедневный подарок")
	check(Logic.daily(w, 100) == nil and w.money == before + Config.DAILY_BASE, "второй раз за день подарка нет")
	check(Logic.daily(w, 105) == Config.DAILY_BASE + Config.DAILY_STEP and w.streak == 2, "пропуск дней не обнуляет серию")
	for day = 106, 120 do
		Logic.daily(w, day)
	end
	check(Logic.daily(w, 121) == Config.DAILY_BASE + Config.DAILY_STEP * Config.DAILY_MAX_STREAK, "подарок перестаёт расти")
	w.ownsFlat = true
	w.money = 0
	check(string.find(Logic.goal(w), "переезд мамы", 1, true) and Logic.goalPlace(w) == "it" and Logic.title(w) == "Своя квартира", "после квартиры — копить на переезд мамы")
	w.money = Config.MOM_PRICE
	check(Logic.goalPlace(w) == "flat", "хватает на маму — метка ведёт в ЖК")
	w.momMoved = true
	w.money = 0
	check(string.find(Logic.goal(w), "Накопи на мебель", 1, true) and Logic.goalPlace(w) == "it", "потом — мебель, сначала заработать")
	w.money = 100000
	check(string.find(Logic.goal(w), "мебель 0 из", 1, true) and Logic.goalPlace(w) == "flat", "на сырмақ хватает — к менеджеру")
	for _, id in Config.FURNITURE do
		w.items[id] = true
	end
	check(Logic.goalPlace(w) == nil and Logic.title(w) == "Семья в Астане" and select(1, Logic.progress(w)) == 1, "история закончена")
	-- цели учитывают деньги
	local g = Logic.newState()
	g.deliveries = 1
	g.money = 5000
	check(string.find(Logic.goal(g), "Накопи на пуховик", 1, true) and Logic.goalPlace(g) == "depot", "на пуховик не хватает — к Даурену")
	g.items.ushanka = true
	check(Logic.goalPlace(g) == "depot", "ушанка не заменяет пуховик")
	g.money = 20000
	check(Logic.goalPlace(g) == "bazaar", "хватает на пуховик — на базар")
	g.items.puffer = true
	g.money = 100
	check(string.find(Logic.goal(g), "на урок", 1, true) and Logic.goalPlace(g) == "depot", "на урок не хватает — к Даурену")
	g.money = 0
	g.debt = 3000
	check(Logic.goalPlace(g) == "depot", "долг без денег — сначала заработать")
	check(Logic.temperature(15, false) > Logic.temperature(3, false), "днём теплее, чем ночью")
	local dirty = Logic.sanitize({ money = -5, energy = 900, items = { scooter = true, hack = true, samsa = true }, hired = "да", day = 0 / 0 })
	check(dirty.money == 0 and dirty.energy == 100 and dirty.items.scooter and not dirty.items.hack and not dirty.items.samsa and dirty.hired == false and dirty.day == 1, "очистка сохранения")
	check(Logic.walkSpeed(dirty) == Config.SCOOTER_SPEED, "самокат ускоряет")
	local rng = m.Random.new(7)
	for _ = 1, 200 do
		local q = Questions.kaz(rng)
		check(#q.options == 4 and q.options[q.answer] ~= nil, "вопрос по казахскому")
		local c = Questions.code(rng)
		check(#c.options == 4 and c.options[c.answer] ~= nil, "вопрос по коду")
	end
	for _, make in { Questions.kaz, Questions.code } do
		for _ = 1, 50 do
			local used, texts = {}, {}
			for _ = 1, Config.LESSON_QUESTIONS do
				local q = make(rng, used)
				check(not texts[q.text], "вопрос повторился в уроке: " .. q.text)
				texts[q.text] = true
			end
		end
	end
	do
		local used, texts, total = {}, {}, #Questions.CODE
		for _ = 1, total do
			local q = Questions.code(rng, used)
			check(not texts[q.text], "повтор до исчерпания вопросов: " .. q.text)
			texts[q.text] = true
		end
		local extra = Questions.code(rng, used)
		check(#extra.options == 4 and extra.options[extra.answer] ~= nil, "вопрос после исчерпания списка")
	end
	local seen = {}
	for _, pair in Questions.KAZ do
		check(not seen[pair[2]], "повтор перевода: " .. pair[2])
		seen[pair[2]] = true
	end
end

-- ---------- сервер ----------
m.stores[Config.DATASTORE] = {
	p_2 = { version = 1, money = 1300000, kazXp = 300, codeXp = 300, energy = 100, food = 100, warmth = 100, day = 7, items = { puffer = true, ushanka = true, bogus = true } },
}
m.definitions.Main(main)
noErrors("запуск сервера")

local city = m.workspace.Astana
local parts = #city:GetChildren()
check(parts > 600 and parts < 4000, "число деталей города: " .. parts)

local remotes = ReplicatedStorage.Remotes
local prompts = {}
local function collect(instance)
	for _, child in instance:GetChildren() do
		if child.ClassName == "ProximityPrompt" then
			table.insert(prompts, child)
		end
		collect(child)
	end
end
collect(city)
local function trigger(player, action, arg)
	for _, prompt in prompts do
		if prompt:GetAttribute("Action") == action and (arg == nil or prompt:GetAttribute("Arg") == arg) then
			-- игрок подходит к кнопке, как в настоящей игре: сервер проверяет расстояние
			local at = prompt.Parent.Position
			player.Character.HumanoidRootPart.CFrame = m.CFrame.new(at.X + 2, at.Y, at.Z + 2)
			prompt.Triggered:Fire(player)
			return
		end
	end
	error("нет действия " .. action)
end
for _, action in { "sleep", "sleepFlat", "landlady", "kazLesson", "studyHome", "studyLibrary", "courier", "barista", "interview", "itWork", "buyFlat", "baiterekUp", "baiterekDown", "wish", "ped", "talk" } do
	local found = false
	for _, prompt in prompts do
		found = found or prompt:GetAttribute("Action") == action
	end
	check(found, "в городе есть действие " .. action)
end
local function farTrigger(player, action)
	for _, prompt in prompts do
		if prompt:GetAttribute("Action") == action then
			player.Character.HumanoidRootPart.CFrame = m.CFrame.new(prompt.Parent.Position.X + 200, 3, prompt.Parent.Position.Z)
			prompt.Triggered:Fire(player)
			return
		end
	end
end

local function last(player, event)
	local list = m.sent[player] or {}
	for i = #list, 1, -1 do
		if list[i].event == event then
			return list[i].args[1], list[i].args
		end
	end
	return nil
end
local function sawToast(player, pattern)
	for _, item in m.sent[player] or {} do
		if (item.event == "Toast" or item.event == "Fade") and string.find(item.args[1], pattern, 1, true) then
			return true
		end
	end
	return false
end
local function moveTo(player, x, y, z)
	player.Character.HumanoidRootPart.CFrame = m.CFrame.new(x, y, z)
end

-- ---------- игрок с клиентом ----------
local p1 = m.addPlayer("Tester", 1, true)
local clientScript = module("Client", p1.PlayerGui, "LocalScript")
m.definitions.Client(clientScript)
noErrors("запуск клиента")

local function find(instance, class)
	for _, child in instance:GetChildren() do
		if child.ClassName == class then
			return child
		end
		local deep = find(child, class)
		if deep then
			return deep
		end
	end
	return nil
end
local dialogGui = p1.PlayerGui.AstanaDialog
local shade = dialogGui:FindFirstChildOfClass("Frame")
local list = find(dialogGui, "ScrollingFrame")
local function buttons()
	local out = {}
	for _, child in list:GetChildren() do
		if child.ClassName == "TextButton" then
			table.insert(out, child)
		end
	end
	table.sort(out, function(a, b) return a.LayoutOrder < b.LayoutOrder end)
	return out
end
local function click(index)
	local all = buttons()
	check(shade.Visible, "диалог открыт перед нажатием " .. index)
	check(all[index] ~= nil, "есть кнопка " .. index .. " из " .. #all)
	all[index].Activated:Fire()
	noErrors("нажатие")
end
local function state()
	return last(p1, "State")
end

m.advance(4)
check(shade.Visible, "вступление показано")
click(1)
check(not shade.Visible, "вступление закрыто")
check(state().money == Config.START_MONEY, "стартовые деньги")
check(string.find(state().goal, "Даурен", 1, true), "первая цель — заказ курьера: " .. state().goal)
check(state().guide ~= nil and state().guide.name == "Курьерская служба", "метка ведёт в курьерскую службу")

-- базар
trigger(p1, "shop", "bazaar")
check(#buttons() == 8, "товары базара: " .. #buttons())
click(3)
check(state().money == 14600, "самса куплена: " .. state().money)
click(1)
check(state().money == 14600, "на пуховик пока не хватает")
click(2)
check(state().money == 12100, "ушанка куплена: " .. state().money)
click(8)
check(not shade.Visible, "магазин закрыт")
check(string.find(state().goal, "Даурен", 1, true), "цель всё ещё — первый заказ")

-- курьер
trigger(p1, "courier")
click(1)
local target = state().target
check(target ~= nil, "заказ выдан")
moveTo(p1, target.x, 3, target.z)
m.advance(0.6)
check(state().target ~= nil, "телепорт к адресу не засчитывается")
m.advance(12)
check(state().target == nil and state().money > 12100, "доставка оплачена: " .. state().money)
check(string.find(state().goal, "Накопи на пуховик", 1, true) and state().guide.name == "Курьерская служба", "на пуховик пока не хватает — цель честно ведёт к заказам: " .. state().goal)
m.advance(2)
check(shade.Visible and string.find(last(p1, "Dialog").text, "Есть заказ", 1, true), "после доставки сразу предлагают новый заказ")
click(3)
check(not shade.Visible and state().target == nil, "от нового заказа можно отказаться")
local afterCourier = state().money

-- урок казахского через интерфейс
moveTo(p1, -80, 3, -156)
trigger(p1, "kazLesson")
click(1)
for _ = 1, Config.LESSON_QUESTIONS do
	click(1)
end
click(1)
check(not shade.Visible and state().money == afterCourier - Config.KAZ_LESSON_PRICE, "урок оплачен")

-- библиотека: закрыть крестиком на втором вопросе
trigger(p1, "studyLibrary")
click(2)
shade:FindFirstChildOfClass("Frame"):FindFirstChildOfClass("TextButton").Activated:Fire()
check(not shade.Visible, "крестик закрывает диалог")
m.advance(0.1)
noErrors("библиотека")

-- бариста
local beforeShift = state().money
moveTo(p1, 60, 3, -86)
trigger(p1, "barista")
click(1)
for round = 1, 3 do
	local payload = last(p1, "Dialog")
	check(payload.kind == "sequence" and #payload.order == round + 2, "заказ бариста " .. round .. ": " .. tostring(payload.kind) .. " / " .. tostring(payload.title) .. " / " .. tostring(payload.text))
	check(#buttons() == 0, "кнопки скрыты, пока показан рецепт")
	m.advance(payload.show + 0.1)
	check(#buttons() == #Config.BARISTA_INGREDIENTS, "кнопки ингредиентов")
	for _, index in payload.order do
		click(index)
	end
end
click(1)
check(state().money == beforeShift + Logic.baristaPay(Logic.newState(), 3), "зарплата бариста: " .. (state().money - beforeShift))
trigger(p1, "barista")
check(string.find(last(p1, "Dialog").text, "Приходи через", 1, true), "перерыв между сменами")
click(1)

-- автобус и Байтерек
local beforeBus = state().money
trigger(p1, "bus", "station")
check(#buttons() == 4, "остановки")
click(2)
m.advance(2)
check(p1.Character.HumanoidRootPart.Position.Z > 0 and state().money == beforeBus - Config.BUS_FARE, "автобус привёз на левый берег")
trigger(p1, "baiterekUp")
m.advance(2)
check(p1.Character.HumanoidRootPart.Position.Y > 80, "подъём на Байтерек")
trigger(p1, "wish")
click(1)
check(state().money == beforeBus - Config.BUS_FARE + 2000, "перевод от мамы")
trigger(p1, "wish")
m.advance(0.1)
check(sawToast(p1, "уже загадано"), "второе желание за день не срабатывает")
trigger(p1, "baiterekDown")
m.advance(2)
check(p1.Character.HumanoidRootPart.Position.Y < 10, "спуск")

-- сутки на морозе: аренда и обморок
local waited = 0
while not sawToast(p1, "теряешь сознание") and waited < 800 do
	m.advance(5)
	waited += 5
end
noErrors("мороз")
check(sawToast(p1, "теряешь сознание"), "обморок на морозе")
m.advance(3)
check(shade.Visible and string.find(last(p1, "Dialog").text, "больнице", 1, true), "диалог больницы")
click(1)
m.advance(1)
check(state().indoors == true and state().warmth >= 70, "очнулся в тёплой больнице")
log(`  обморок на морозе в пуховике через {waited} с реального времени`)
while not sawToast(p1, "День 2") and waited < 1500 do
	m.advance(5)
	waited += 5
	if shade.Visible then
		click(1)
	end
end
noErrors("сутки")
check(sawToast(p1, "День 2"), "наступил второй день")

-- сон
moveTo(p1, -150, 3, -158)
m.advance(1)
check(state().indoors, "дома — в помещении")
trigger(p1, "sleep")
m.advance(0.1)
if shade.Visible then
	click(1)
else
	m.advance(6)
	check(state().energy > 95, "сон восстановил силы")
end
trigger(p1, "ped")
trigger(p1, "talk", "arman")
trigger(p1, "landlady")
m.advance(0.1)
if shade.Visible then
	click(1)
end
noErrors("разговоры")

-- ---------- игрок без клиента: собеседование, работа, квартира ----------
local p2 = m.addPlayer("Rich", 2, false)
m.advance(1)
check(last(p2, "State").money == 1300000, "сохранение загружено")
moveTo(p2, -100, 3, 156)

local function answer(player, value)
	local payload = last(player, "Dialog")
	remotes.DialogReply.OnServerEvent:Fire(player, payload.id, value)
	noErrors("ответ")
end
local function solve(payload)
	local word = string.match(payload.text, "«(.-)»")
	local correct
	if string.find(payload.text, "Как переводится", 1, true) then
		for _, pair in Questions.KAZ do
			if pair[1] == word then
				correct = pair[2]
			end
		end
	else
		for _, raw in Questions.CODE do
			if raw[1] == payload.text then
				correct = raw[2][raw[3]]
			end
		end
	end
	return table.find(payload.options, correct)
end

trigger(p2, "itWork")
check(string.find(last(p2, "Dialog").text, "собеседование", 1, true), "без найма работать нельзя")
answer(p2, 1)
trigger(p2, "interview")
answer(p2, 1)
for _ = 1, 3 do
	answer(p2, solve(last(p2, "Dialog")))
end
check(string.find(last(p2, "Dialog").text, "Qazaq Soft", 1, true), "принят на работу")
answer(p2, 1)
trigger(p2, "itWork")
answer(p2, solve(last(p2, "Dialog")))
m.advance(1)
check(last(p2, "State").money == 1300000 + Config.IT_PAY, "зарплата в IT")
trigger(p2, "itWork")
check(string.find(last(p2, "Dialog").text, "Новая задача", 1, true), "пауза между задачами")
answer(p2, 1)
-- подделанные ответы не должны ломать сервер
remotes.DialogReply.OnServerEvent:Fire(p2, 999, 1)
remotes.DialogReply.OnServerEvent:Fire(p2, nil, { 1, 2 })
trigger(p2, "buyFlat")
answer(p2, "взлом")
check(not string.find(last(p2, "State").goal, "переезд мамы", 1, true), "мусорный ответ не покупает квартиру")
trigger(p2, "buyFlat")
answer(p2, 1)
m.advance(1)
answer(p2, 1)
m.advance(1)
local rich = last(p2, "State")
check(rich.money == 1300000 + Config.IT_PAY - Config.FLAT_PRICE, "квартира оплачена")
check(string.find(rich.goal, "переезд мамы", 1, true) and rich.title == "Своя квартира", "квартира куплена, дальше — мама: " .. rich.goal)
check(sawToast(p1, "своя квартира"), "все игроки видят новость")
-- мебель и мама
trigger(p2, "buyFlat")
answer(p2, 1)
m.advance(0.1)
check(string.find(last(p2, "Dialog").text, "Осталось", 1, true), "на переезд мамы пока не хватает")
answer(p2, 1)
trigger(p2, "buyFlat")
answer(p2, 2)
answer(p2, 1)
m.advance(0.1)
check(last(p2, "State").money == 1300000 + Config.IT_PAY - Config.FLAT_PRICE - Config.ITEMS.syrmak.price, "сырмақ куплен")
answer(p2, #last(p2, "Dialog").options)
m.advance(0.1)
-- издалека кнопки не работают
local dialogsBefore = #(m.sent[p2] or {})
farTrigger(p2, "itWork")
m.advance(0.1)
check(#m.sent[p2] == dialogsBefore or last(p2, "Dialog").title ~= "Qazaq Soft", "кнопка издалека не срабатывает")
trigger(p2, "sleepFlat")
m.advance(0.1)

m.removePlayer(p2)
local record = m.stores[Config.DATASTORE].p_2
local saved = record.state
check(saved.ownsFlat == true and saved.hired == true and saved.items.bogus == nil and saved.items.puffer == true and saved.items.syrmak == true, "сохранение при выходе")
check(record.lock == nil, "при выходе блокировка снята")
m.removePlayer(p1)
check(m.stores[Config.DATASTORE].p_1 ~= nil and m.stores[Config.DATASTORE].p_1.state.day >= 2, "сохранение первого игрока")

-- игрок ещё сохраняется на другом сервере: этот сервер не загружает старые данные
m.stores[Config.DATASTORE].p_3 = { state = { money = 777 }, lock = { job = "other-server", t = m.os.time() } }
local p3 = m.addPlayer("Twin", 3, false)
m.advance(30)
check(p3._props.kicked == nil, "сначала ждём, пока другой сервер допишет сохранение")
m.advance(40)
check(p3._props.kicked ~= nil, "занятое сохранение — вежливо просим зайти позже")
check(m.stores[Config.DATASTORE].p_3.state.money == 777 and m.stores[Config.DATASTORE].p_3.lock.job == "other-server", "чужое сохранение не тронуто")
for i = #m.errors, 1, -1 do
	if string.find(m.errors[i], "занято другим сервером", 1, true) then
		table.remove(m.errors, i) -- это предупреждение здесь ожидаемо
	end
end
for _, close in m.closers do
	close()
end
m.advance(130)
noErrors("завершение")

log(`OK: проверок {checks}, деталей города {parts}, кнопок действий {#prompts}`)
