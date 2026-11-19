--!strict
-- Клиент: интерфейс (деньги, потребности, подсказка), диалоги, метка доставки, снег.
-- Рассчитан на телефон: крупные кнопки, всё масштабируется под экран.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local remotes = ReplicatedStorage:WaitForChild("Remotes")
local Logic = require(ReplicatedStorage:WaitForChild("Shared"):WaitForChild("Logic"))

local StateEvent = remotes:WaitForChild("State") :: RemoteEvent
local ToastEvent = remotes:WaitForChild("Toast") :: RemoteEvent
local DialogEvent = remotes:WaitForChild("Dialog") :: RemoteEvent
local DialogReply = remotes:WaitForChild("DialogReply") :: RemoteEvent
local FadeEvent = remotes:WaitForChild("Fade") :: RemoteEvent

local INK = Color3.fromRGB(22, 28, 40)
local PANEL = Color3.fromRGB(30, 38, 54)
local ACCENT = Color3.fromRGB(46, 196, 230)
local GOLD = Color3.fromRGB(255, 214, 110)
local WHITE = Color3.fromRGB(245, 248, 252)

local function make(class: string, props: { [string]: any }, parent: Instance?): any
	local instance = Instance.new(class)
	for key, value in props do
		(instance :: any)[key] = value
	end
	instance.Parent = parent
	return instance
end

local function round(parent: Instance, radius: number)
	make("UICorner", { CornerRadius = UDim.new(0, radius) }, parent)
end

local function text(props: { [string]: any }, parent: Instance): TextLabel
	local base = {
		BackgroundTransparency = 1,
		Font = Enum.Font.GothamMedium,
		TextColor3 = WHITE,
		TextSize = 16,
		TextXAlignment = Enum.TextXAlignment.Left,
		TextWrapped = true,
		AutoLocalize = false,
	}
	for key, value in props do
		base[key] = value
	end
	return make("TextLabel", base, parent)
end

-- Звуки. Все — публичные звуки Roblox, проверены в Studio.
local SoundService = game:GetService("SoundService")
local SOUNDS = {
	coin = { 17208380755, 0.55 }, -- деньги пришли
	good = { 15675043410, 0.5 }, -- верный ответ, успех
	bad = { 17208353912, 0.45 }, -- ошибка, не хватает
	toast = { 15675055424, 0.25 }, -- обычное сообщение
	click = { 15675059323, 0.4 }, -- нажатие кнопки
	open = { 17208204604, 0.4 }, -- открылся диалог
	win = { 12222253, 0.6 }, -- новый уровень, большая цель
	whoosh = { 15674975792, 0.35 }, -- затемнение экрана
}
local sounds: { [string]: Sound } = {}
for name, info in SOUNDS do
	sounds[name] = make("Sound", { Name = name, SoundId = "rbxassetid://" .. info[1], Volume = info[2] }, SoundService)
end
local function sfx(name: string)
	local sound = sounds[name]
	if sound then
		sound.TimePosition = 0
		sound:Play()
	end
end
local music = make("Sound", { Name = "Music", SoundId = "rbxassetid://15675069601", Volume = 0.12, Looped = true }, SoundService)
music:Play()

local screen = make("ScreenGui", { Name = "Astana", ResetOnSpawn = false, DisplayOrder = 5 }, playerGui)
local scale = make("UIScale", {}, screen)
local scales: { UIScale } = {}

local function rescale()
	local camera = workspace.CurrentCamera
	if camera then
		scale.Scale = math.clamp(camera.ViewportSize.Y / 520, 0.62, 1.5)
		for _, other in scales do
			other.Scale = scale.Scale
		end
	end
end
rescale()
if workspace.CurrentCamera then
	workspace.CurrentCamera:GetPropertyChangedSignal("ViewportSize"):Connect(rescale)
end

-- Панель слева: деньги, время, шкалы.
local hud = make("Frame", {
	Position = UDim2.fromOffset(10, 8),
	Size = UDim2.fromOffset(230, 172),
	BackgroundColor3 = PANEL,
	BackgroundTransparency = 0.15,
	BorderSizePixel = 0,
}, screen)
round(hud, 12)
local moneyLabel = text({ Position = UDim2.fromOffset(12, 6), Size = UDim2.fromOffset(206, 28), Font = Enum.Font.GothamBold, TextSize = 24, TextColor3 = GOLD, Text = "…" }, hud)
local timeLabel = text({ Position = UDim2.fromOffset(12, 34), Size = UDim2.fromOffset(206, 18), TextSize = 14, Text = "" }, hud)
local skillLabel = text({ Position = UDim2.fromOffset(12, 126), Size = UDim2.fromOffset(206, 18), TextSize = 13, TextColor3 = Color3.fromRGB(190, 200, 216), Text = "" }, hud)

local function bar(name: string, y: number, color: Color3): Frame
	text({ Position = UDim2.fromOffset(12, y), Size = UDim2.fromOffset(58, 18), TextSize = 13, Text = name }, hud)
	local back = make("Frame", { Position = UDim2.fromOffset(72, y + 3), Size = UDim2.fromOffset(146, 12), BackgroundColor3 = INK, BorderSizePixel = 0 }, hud)
	round(back, 6)
	local fill = make("Frame", { Size = UDim2.fromScale(1, 1), BackgroundColor3 = color, BorderSizePixel = 0 }, back)
	round(fill, 6)
	return fill
end
local warmthBar = bar("Тепло", 58, Color3.fromRGB(255, 140, 80))
local foodBar = bar("Еда", 80, Color3.fromRGB(120, 210, 110))
local energyBar = bar("Силы", 102, ACCENT)
-- Прогресс к большой цели (квартира, мебель, мама): видно, что каждое действие приближает мечту.
local progressName = text({ Position = UDim2.fromOffset(12, 148), Size = UDim2.fromOffset(100, 18), TextSize = 13, TextColor3 = GOLD, Text = "Квартира" }, hud)
local progressBack = make("Frame", { Position = UDim2.fromOffset(112, 152), Size = UDim2.fromOffset(70, 10), BackgroundColor3 = INK, BorderSizePixel = 0 }, hud)
round(progressBack, 5)
local progressFill = make("Frame", { Size = UDim2.fromScale(0, 1), BackgroundColor3 = GOLD, BorderSizePixel = 0 }, progressBack)
round(progressFill, 5)
local progressLabel = text({ Position = UDim2.fromOffset(186, 148), Size = UDim2.fromOffset(40, 18), TextSize = 13, TextColor3 = GOLD, Text = "0%" }, hud)
local WARM_COLOR = Color3.fromRGB(255, 140, 80)
local outdoorsCold = false

-- Подсказка «что делать дальше» сверху по центру.
local goalFrame = make("Frame", {
	AnchorPoint = Vector2.new(0.5, 0),
	Position = UDim2.new(0.5, 60, 0, 8),
	Size = UDim2.fromOffset(380, 44),
	BackgroundColor3 = PANEL,
	BackgroundTransparency = 0.15,
	BorderSizePixel = 0,
}, screen)
round(goalFrame, 12)
local goalLabel = text({ Position = UDim2.fromOffset(12, 2), Size = UDim2.new(1, -24, 1, -4), TextSize = 14, Text = "" }, goalFrame)

-- Всплывающие сообщения: отдельный слой поверх диалога, чтобы «Дұрыс!» было видно во время урока.
local toastGui = make("ScreenGui", { Name = "AstanaToasts", ResetOnSpawn = false, DisplayOrder = 15 }, playerGui)
local toastScale = make("UIScale", { Scale = scale.Scale }, toastGui)
table.insert(scales, toastScale)
local toasts = make("Frame", {
	AnchorPoint = Vector2.new(0.5, 0),
	Position = UDim2.new(0.5, 60, 0, 60),
	Size = UDim2.fromOffset(380, 200),
	BackgroundTransparency = 1,
}, toastGui)
make("UIListLayout", { Padding = UDim.new(0, 6), SortOrder = Enum.SortOrder.LayoutOrder }, toasts)
local toastOrder = 0

local TOAST_COLORS = {
	good = Color3.fromRGB(28, 84, 58),
	bad = Color3.fromRGB(110, 36, 40),
	big = Color3.fromRGB(120, 92, 20),
}

local function toast(message: string, kind: string?)
	sfx(if kind == "good" then "good" elseif kind == "bad" then "bad" elseif kind == "big" then "win" else "toast")
	toastOrder += 1
	local label = text({
		Size = UDim2.new(1, 0, 0, 0),
		AutomaticSize = Enum.AutomaticSize.Y,
		BackgroundTransparency = 0.1,
		BackgroundColor3 = (kind and TOAST_COLORS[kind]) or INK,
		TextSize = if kind == "big" then 17 else 15,
		Font = if kind == "big" then Enum.Font.GothamBold else Enum.Font.GothamMedium,
		Text = message,
		LayoutOrder = toastOrder,
	}, toasts)
	round(label, 10)
	make("UIPadding", { PaddingLeft = UDim.new(0, 10), PaddingRight = UDim.new(0, 10), PaddingTop = UDim.new(0, 7), PaddingBottom = UDim.new(0, 7) }, label)
	local children = toasts:GetChildren()
	local labels = 0
	for _, child in children do
		if child:IsA("TextLabel") then
			labels += 1
		end
	end
	if labels > 3 then
		for _, child in children do
			if child:IsA("TextLabel") then
				child:Destroy()
				break
			end
		end
	end
	task.delay(5, function()
		if label.Parent then
			local tween = TweenService:Create(label, TweenInfo.new(0.4), { BackgroundTransparency = 1, TextTransparency = 1 })
			tween:Play()
			task.wait(0.45)
			label:Destroy()
		end
	end)
end

-- Диалоговое окно.
local shade = make("Frame", { Size = UDim2.fromScale(1, 1), BackgroundColor3 = Color3.new(0, 0, 0), BackgroundTransparency = 0.55, BorderSizePixel = 0, Visible = false, Active = true }, make("ScreenGui", { Name = "AstanaDialog", ResetOnSpawn = false, DisplayOrder = 10, IgnoreGuiInset = true }, playerGui))
local dialogScale = make("UIScale", { Scale = scale.Scale }, shade.Parent)
table.insert(scales, dialogScale)
local holder = make("Frame", {
	AnchorPoint = Vector2.new(0.5, 0.5),
	Position = UDim2.fromScale(0.5, 0.5),
	Size = UDim2.fromOffset(440, 0),
	AutomaticSize = Enum.AutomaticSize.Y,
	BackgroundColor3 = PANEL,
	BorderSizePixel = 0,
}, shade)
round(holder, 14)
local dialog = make("Frame", { Size = UDim2.new(1, 0, 0, 0), AutomaticSize = Enum.AutomaticSize.Y, BackgroundTransparency = 1 }, holder)
make("UIPadding", { PaddingLeft = UDim.new(0, 16), PaddingRight = UDim.new(0, 16), PaddingTop = UDim.new(0, 12), PaddingBottom = UDim.new(0, 14) }, dialog)
make("UIListLayout", { Padding = UDim.new(0, 8), SortOrder = Enum.SortOrder.LayoutOrder }, dialog)
local dialogTitle = text({ Size = UDim2.new(1, -40, 0, 26), Font = Enum.Font.GothamBold, TextSize = 20, TextColor3 = GOLD, LayoutOrder = 1, Text = "" }, dialog)
local dialogText = text({ Size = UDim2.new(1, 0, 0, 0), AutomaticSize = Enum.AutomaticSize.Y, TextSize = 16, LayoutOrder = 2, Text = "" }, dialog)
local optionList = make("ScrollingFrame", {
	Size = UDim2.new(1, 0, 0, 100),
	BackgroundTransparency = 1,
	BorderSizePixel = 0,
	ScrollBarThickness = 5,
	CanvasSize = UDim2.fromOffset(0, 0),
	AutomaticCanvasSize = Enum.AutomaticSize.Y,
	LayoutOrder = 3,
}, dialog)
local listLayout = make("UIListLayout", { Padding = UDim.new(0, 6), SortOrder = Enum.SortOrder.LayoutOrder }, optionList)
-- Для мини-игры бариста кнопки идут сеткой в два столбца, чтобы все ингредиенты помещались на телефоне.
local gridLayout = make("UIGridLayout", { CellSize = UDim2.new(0.5, -8, 0, 44), CellPadding = UDim2.fromOffset(6, 6), SortOrder = Enum.SortOrder.LayoutOrder })
local closeButton = make("TextButton", {
	AnchorPoint = Vector2.new(1, 0),
	Position = UDim2.new(1, -8, 0, 8),
	Size = UDim2.fromOffset(36, 36),
	BackgroundColor3 = INK,
	BorderSizePixel = 0,
	Font = Enum.Font.GothamBold,
	TextSize = 20,
	TextColor3 = WHITE,
	Text = "×",
	ZIndex = 3,
}, holder)
round(closeButton, 18)

local currentId: number? = nil
local dialogToken = 0

local function clearOptions()
	for _, child in optionList:GetChildren() do
		if child:IsA("GuiButton") then
			child:Destroy()
		end
	end
end

local function closeDialog()
	currentId = nil
	dialogToken += 1
	shade.Visible = false
	clearOptions()
end

local function reply(value: any)
	local id = currentId
	if id then
		closeDialog()
		DialogReply:FireServer(id, value)
	end
end

local function optionButton(label: string, order: number, onClick: () -> ()): TextButton
	local button = make("TextButton", {
		Size = UDim2.new(1, -8, 0, 42),
		AutomaticSize = Enum.AutomaticSize.Y,
		BackgroundColor3 = Color3.fromRGB(52, 66, 94),
		BorderSizePixel = 0,
		AutoButtonColor = true,
		AutoLocalize = false,
		Font = Enum.Font.GothamMedium,
		TextSize = 16,
		TextColor3 = WHITE,
		TextWrapped = true,
		Text = label,
		LayoutOrder = order,
	}, optionList)
	round(button, 10)
	make("UIPadding", { PaddingLeft = UDim.new(0, 10), PaddingRight = UDim.new(0, 10), PaddingTop = UDim.new(0, 6), PaddingBottom = UDim.new(0, 6) }, button)
	button.Activated:Connect(function()
		sfx("click")
		onClick()
	end)
	return button
end

local function fitOptions(count: number, grid: boolean?)
	listLayout.Parent = if grid then nil else optionList
	gridLayout.Parent = if grid then optionList else nil
	local rows = if grid then math.ceil(count / 2) else count
	optionList.Size = UDim2.new(1, 0, 0, math.min(rows * (if grid then 50 else 48), 250))
end

local function showChoice(data: any)
	dialogTitle.Text = data.title
	dialogText.Text = data.text
	clearOptions()
	for index, option in data.options do
		optionButton(option, index, function()
			reply(index)
		end)
	end
	fitOptions(#data.options)
end

-- Мини-игра бариста: запомнить порядок, затем повторить.
local function showSequence(data: any)
	local token = dialogToken
	local names: { string } = data.options
	local order: { number } = data.order
	local recipe = {}
	for i, index in order do
		recipe[i] = names[index]
	end
	dialogTitle.Text = data.title
	dialogText.Text = "Запомни рецепт:\n" .. table.concat(recipe, "  →  ")
	clearOptions()
	fitOptions(0)
	task.delay(data.show or 3, function()
		if token ~= dialogToken then
			return
		end
		local picked: { number } = {}
		local function refresh()
			local shown = {}
			for i, index in picked do
				shown[i] = names[index]
			end
			dialogText.Text = `Повтори рецепт ({#picked}/{#order}):\n` .. table.concat(shown, "  →  ")
		end
		refresh()
		for index, name in names do
			optionButton(name, index, function()
				table.insert(picked, index)
				if #picked >= #order then
					reply(picked)
				else
					refresh()
				end
			end)
		end
		fitOptions(#names, true)
	end)
end

DialogEvent.OnClientEvent:Connect(function(data: any)
	if data.kind == "close" then
		if currentId == data.id then
			closeDialog()
		end
		return
	end
	closeDialog()
	currentId = data.id
	shade.Visible = true
	sfx("open")
	if data.kind == "sequence" then
		showSequence(data)
	else
		showChoice(data)
	end
end)

closeButton.Activated:Connect(function()
	sfx("click")
	reply(nil)
end)

-- Затемнение экрана (сон, автобус, обморок).
local fadeGui = make("ScreenGui", { Name = "AstanaFade", ResetOnSpawn = false, DisplayOrder = 20, IgnoreGuiInset = true }, playerGui)
local fadeFrame = make("Frame", { Size = UDim2.fromScale(1, 1), BackgroundColor3 = Color3.new(0, 0, 0), BackgroundTransparency = 1, BorderSizePixel = 0, Visible = false }, fadeGui)
local fadeLabel = text({ Size = UDim2.fromScale(1, 1), TextSize = 26, Font = Enum.Font.GothamBold, TextXAlignment = Enum.TextXAlignment.Center, TextTransparency = 1, Text = "" }, fadeFrame)
local fadeToken = 0

FadeEvent.OnClientEvent:Connect(function(message: string, seconds: number)
	fadeToken += 1
	local token = fadeToken
	sfx("whoosh")
	fadeLabel.Text = message
	fadeFrame.Visible = true
	TweenService:Create(fadeFrame, TweenInfo.new(0.4), { BackgroundTransparency = 0 }):Play()
	TweenService:Create(fadeLabel, TweenInfo.new(0.4), { TextTransparency = 0 }):Play()
	task.wait(math.max(0.5, seconds - 0.4))
	if token ~= fadeToken then
		return
	end
	TweenService:Create(fadeFrame, TweenInfo.new(0.5), { BackgroundTransparency = 1 }):Play()
	TweenService:Create(fadeLabel, TweenInfo.new(0.5), { TextTransparency = 1 }):Play()
	task.wait(0.55)
	if token == fadeToken then
		fadeFrame.Visible = false
	end
end)

-- Метка доставки.
local marker = make("Part", {
	Name = "DeliveryMarker",
	Anchored = true,
	CanCollide = false,
	CanQuery = false,
	CanTouch = false,
	Material = Enum.Material.Neon,
	Color = GOLD,
	Transparency = 0.45,
	Shape = Enum.PartType.Cylinder,
	Size = Vector3.new(60, 5, 5),
})
local markerGui = make("BillboardGui", { Size = UDim2.fromOffset(260, 44), StudsOffset = Vector3.new(0, 0, 0), AlwaysOnTop = true, LightInfluence = 0 }, marker)
local markerLabel = text({ Size = UDim2.fromScale(1, 1), TextSize = 16, Font = Enum.Font.GothamBold, TextColor3 = GOLD, TextStrokeTransparency = 0.2, TextXAlignment = Enum.TextXAlignment.Center, Text = "" }, markerGui)
local target: { x: number, z: number, name: string }? = nil
local isGuide = false
local GUIDE = Color3.fromRGB(90, 230, 240)

-- Снег.
local snow = make("Part", { Name = "Snow", Anchored = true, CanCollide = false, CanQuery = false, CanTouch = false, Transparency = 1, Size = Vector3.new(90, 1, 90) }, workspace)
local flakes = make("ParticleEmitter", {
	Rate = 140,
	Lifetime = NumberRange.new(3, 4),
	Speed = NumberRange.new(12, 18),
	EmissionDirection = Enum.NormalId.Bottom,
	SpreadAngle = Vector2.new(12, 12),
	Size = NumberSequence.new(0.3),
	Color = ColorSequence.new(Color3.new(1, 1, 1)),
	Transparency = NumberSequence.new(0.15),
	LightEmission = 0.5,
	Acceleration = Vector3.new(3, 0, 1),
}, snow)

-- Всплывающее «+2 200 ₸» рядом с деньгами и короткий «пульс» суммы.
local moneyPulse = make("UIScale", {}, moneyLabel)
local lastMoney: number? = nil

local function moneyPop(delta: number)
	local label = text({
		AnchorPoint = Vector2.new(0, 0.5),
		Position = UDim2.fromOffset(236, 22),
		Size = UDim2.fromOffset(170, 28),
		Font = Enum.Font.GothamBold,
		TextSize = 22,
		TextColor3 = if delta > 0 then Color3.fromRGB(130, 235, 140) else Color3.fromRGB(255, 125, 115),
		TextStrokeTransparency = 0.35,
		Text = (if delta > 0 then "+" else "") .. Logic.money(delta),
	}, hud)
	TweenService:Create(label, TweenInfo.new(1.4, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
		Position = UDim2.fromOffset(236, -6),
		TextTransparency = 1,
		TextStrokeTransparency = 1,
	}):Play()
	task.delay(1.5, function()
		label:Destroy()
	end)
	if delta > 0 then
		moneyPulse.Scale = 1.25
		TweenService:Create(moneyPulse, TweenInfo.new(0.35, Enum.EasingStyle.Back, Enum.EasingDirection.Out), { Scale = 1 }):Play()
	end
end

-- Кнопка музыки.
local musicButton = make("TextButton", {
	Position = UDim2.fromOffset(10, 186),
	Size = UDim2.fromOffset(44, 36),
	BackgroundColor3 = PANEL,
	BackgroundTransparency = 0.15,
	BorderSizePixel = 0,
	Font = Enum.Font.GothamBold,
	TextSize = 18,
	TextColor3 = WHITE,
	Text = "♪",
}, screen)
round(musicButton, 10)
musicButton.Activated:Connect(function()
	music.Volume = if music.Volume > 0 then 0 else 0.12
	musicButton.TextTransparency = if music.Volume > 0 then 0 else 0.6
	sfx("click")
end)

local function ratio(value: number): UDim2
	return UDim2.fromScale(math.clamp(value / 100, 0, 1), 1)
end

StateEvent.OnClientEvent:Connect(function(state: any)
	moneyLabel.Text = Logic.money(state.money)
	if lastMoney and state.money ~= lastMoney then
		moneyPop(state.money - lastMoney)
		if state.money > lastMoney then
			sfx("coin")
		end
	end
	lastMoney = state.money
	local weather = if state.buran then "буран" else (if state.indoors then "в тепле" else "мороз")
	timeLabel.Text = `День {state.day} · {state.clock} · {state.temp}° · {weather}`
	skillLabel.Text = `Казахский {state.kaz} · Код {state.code}` .. (if state.debt > 0 then ` · долг {Logic.money(state.debt)}` else "")
	warmthBar.Size = ratio(state.warmth)
	outdoorsCold = not state.indoors and state.warmth < 35
	if not outdoorsCold then
		warmthBar.BackgroundColor3 = WARM_COLOR
	end
	local share = math.clamp(state.progress or 0, 0, 1)
	progressName.Text = state.progressName or "Квартира"
	progressFill.Size = UDim2.fromScale(share, 1)
	progressLabel.Text = `{math.floor(share * 100)}%`
	foodBar.Size = ratio(state.food)
	energyBar.Size = ratio(state.energy)
	goalLabel.Text = "Цель: " .. state.goal

	-- Жёлтая метка — заказ курьера, бирюзовая — следующая цель из подсказки.
	isGuide = state.target == nil and state.guide ~= nil
	target = state.target or state.guide
	if target then
		local color = if isGuide then GUIDE else GOLD
		marker.Color = color
		markerLabel.TextColor3 = color
		marker.CFrame = CFrame.new(target.x, 30, target.z) * CFrame.Angles(0, 0, math.rad(90))
		marker.Parent = workspace
	else
		marker.Parent = nil
	end

	flakes.Enabled = not state.indoors
	flakes.Rate = if state.buran then 350 else 140
	flakes.Acceleration = if state.buran then Vector3.new(40, 0, 14) else Vector3.new(3, 0, 1)
end)

ToastEvent.OnClientEvent:Connect(toast)

local elapsed = 0
RunService.RenderStepped:Connect(function(dt: number)
	local camera = workspace.CurrentCamera
	if not camera then
		return
	end
	snow.CFrame = CFrame.new(camera.CFrame.Position + Vector3.new(0, 40, 0))
	if outdoorsCold then
		-- шкала тепла мигает красным: пора в тепло
		local pulse = (math.sin(os.clock() * 7) + 1) / 2
		warmthBar.BackgroundColor3 = WARM_COLOR:Lerp(Color3.fromRGB(255, 40, 40), pulse)
	end
	elapsed += dt
	if elapsed < 0.2 then
		return
	end
	elapsed = 0
	local goal = target
	local character = player.Character
	local root = character and character:FindFirstChild("HumanoidRootPart")
	if goal and root and root:IsA("BasePart") then
		local distance = (Vector3.new(goal.x, root.Position.Y, goal.z) - root.Position).Magnitude
		-- метку цели прячем, когда игрок уже пришёл
		local near = isGuide and distance < 22
		marker.Transparency = if near then 1 else 0.45
		markerGui.Enabled = not near
		markerLabel.Text = if isGuide then `▼ Цель: {goal.name} · {math.floor(distance / 3.5)} м` else `▼ {goal.name} · {math.floor(distance / 3.5)} м`
	end
end)
