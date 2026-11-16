--!strict
-- Строит Астану из деталей прямо при запуске сервера: в файле места нет ни одной модели.

local Lighting = game:GetService("Lighting")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Config = require(ReplicatedStorage.Shared.Config)

local World = {}

World.prompts = {} :: { ProximityPrompt }
World.zones = {} :: { { id: string, minX: number, maxX: number, minZ: number, maxZ: number, top: number } }

local root: Folder
local rng = Random.new(1997)

local SNOW = Color3.fromRGB(238, 243, 248)
local ASPHALT = Color3.fromRGB(74, 78, 86)
local GOLD = Color3.fromRGB(240, 190, 60)
local SKIN = Color3.fromRGB(224, 179, 140)

local function rgb(c: { number }): Color3
	return Color3.fromRGB(c[1], c[2], c[3])
end

local function part(size: Vector3, cframe: CFrame, color: Color3, material: Enum.Material?, name: string?): Part
	local p = Instance.new("Part")
	p.Anchored = true
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	p.Material = material or Enum.Material.SmoothPlastic
	p.Color = color
	p.Size = size
	p.CFrame = cframe
	p.Name = name or "Part"
	p.Parent = root
	return p
end

local function block(x: number, y: number, z: number, sx: number, sy: number, sz: number, color: Color3, material: Enum.Material?, name: string?): Part
	return part(Vector3.new(sx, sy, sz), CFrame.new(x, y, z), color, material, name)
end

-- Вертикальный цилиндр (в Roblox цилиндр лежит вдоль оси X, поэтому поворачиваем).
local function cylinder(x: number, y: number, z: number, radius: number, height: number, color: Color3, material: Enum.Material?): Part
	local p = part(Vector3.new(height, radius * 2, radius * 2), CFrame.new(x, y, z) * CFrame.Angles(0, 0, math.rad(90)), color, material)
	p.Shape = Enum.PartType.Cylinder
	return p
end

local function ball(x: number, y: number, z: number, diameter: number, color: Color3, material: Enum.Material?): Part
	local p = block(x, y, z, diameter, diameter, diameter, color, material)
	p.Shape = Enum.PartType.Ball
	return p
end

local function label(parent: Instance, text: string, face: Enum.NormalId, textColor: Color3?, background: Color3?)
	local gui = Instance.new("SurfaceGui")
	gui.Face = face
	gui.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud
	gui.PixelsPerStud = 24
	gui.LightInfluence = 0.3
	local text1 = Instance.new("TextLabel")
	text1.Size = UDim2.fromScale(1, 1)
	text1.BackgroundTransparency = if background then 0 else 1
	text1.BackgroundColor3 = background or Color3.new(0, 0, 0)
	text1.BorderSizePixel = 0
	text1.TextColor3 = textColor or Color3.new(1, 1, 1)
	text1.Font = Enum.Font.GothamBold
	text1.TextScaled = true
	text1.Text = text
	text1.Parent = gui
	gui.Parent = parent
end

local function nameTag(parent: Instance, text: string, offsetY: number)
	local gui = Instance.new("BillboardGui")
	gui.Size = UDim2.fromScale(9, 1.4)
	gui.StudsOffset = Vector3.new(0, offsetY, 0)
	gui.MaxDistance = 70
	gui.LightInfluence = 0
	local text1 = Instance.new("TextLabel")
	text1.Size = UDim2.fromScale(1, 1)
	text1.BackgroundTransparency = 1
	text1.TextColor3 = Color3.new(1, 1, 1)
	text1.TextStrokeTransparency = 0.3
	text1.Font = Enum.Font.GothamBold
	text1.TextScaled = true
	text1.Text = text
	text1.Parent = gui
	gui.Parent = parent
end

local function prompt(parent: Instance, action: string, actionText: string, objectText: string?, arg: string?): ProximityPrompt
	local p = Instance.new("ProximityPrompt")
	p.ActionText = actionText
	p.ObjectText = objectText or ""
	p.HoldDuration = 0
	p.MaxActivationDistance = 9
	p.RequiresLineOfSight = false
	p:SetAttribute("Action", action)
	if arg then
		p:SetAttribute("Arg", arg)
	end
	p.Parent = parent
	table.insert(World.prompts, p)
	return p
end

-- Простая фигурка человека из трёх деталей. Возвращает туловище.
local function npc(name: string, x: number, z: number, top: Color3, bottom: Color3?, baseY: number?): Part
	local y = baseY or 0.4
	block(x, y + 1, z, 2, 2, 1, bottom or Color3.fromRGB(43, 47, 58), nil, "Legs")
	local torso = block(x, y + 3, z, 2.2, 2, 1.1, top, nil, name)
	local head = block(x, y + 4.7, z, 1.4, 1.4, 1.4, SKIN, nil, "Head")
	head.Shape = Enum.PartType.Ball
	nameTag(torso, name, 3.2)
	return torso
end

local function lamp(x: number, z: number)
	block(x, 6, z, 0.5, 12, 0.5, Color3.fromRGB(60, 64, 72))
	local bulb = block(x, 12.4, z, 1.6, 0.8, 1.6, Color3.fromRGB(255, 236, 190), Enum.Material.Neon)
	local light = Instance.new("PointLight")
	light.Range = 34
	light.Brightness = 0.9
	light.Color = Color3.fromRGB(255, 226, 170)
	light.Parent = bulb
end

local function tree(x: number, z: number)
	block(x, 2, z, 1, 4, 1, Color3.fromRGB(96, 70, 50))
	local green = Color3.fromRGB(46, 96, 70)
	cylinder(x, 4.5, z, 4, 2.4, green)
	cylinder(x, 6.9, z, 3, 2.4, green)
	cylinder(x, 9.3, z, 1.8, 2.4, green)
	cylinder(x, 10.9, z, 2.1, 0.5, SNOW)
end

-- Полосы окон на передней и задней стене.
local function windows(x: number, z: number, w: number, d: number, fromY: number, toY: number)
	local glass = Color3.fromRGB(66, 88, 120)
	local y = fromY + 3
	while y < toY - 1 do
		local lit = rng:NextNumber() < 0.25
		for _, side in { -1, 1 } do
			local strip = block(x, y, z + side * (d / 2 + 0.05), w * 0.88, 1.8, 0.2, if lit then Color3.fromRGB(255, 214, 130) else glass, if lit then Enum.Material.Neon else Enum.Material.Glass)
			strip.CanCollide = false
		end
		y += 5
	end
end

-- Здание-декорация без входа.
local function decor(x: number, z: number, w: number, d: number, h: number, color: Color3, glassy: boolean?)
	local body = block(x, h / 2, z, w, h, d, color, if glassy then Enum.Material.Glass else Enum.Material.Concrete)
	if glassy then
		body.Reflectance = 0.25
	else
		windows(x, z, w, d, 0, h)
	end
	block(x, h + 0.4, z, w + 1, 0.8, d + 1, SNOW, Enum.Material.Snow)
end

type Inside = (dx: number, depth: number) -> (number, number)

-- Здание с открытым входом, в которое можно зайти. Возвращает функцию для расстановки
-- мебели: dx — вбок от центра, depth — насколько глубоко от двери (0 у двери, 1 у задней стены).
local function shell(place: Config.Place): Inside
	local x, z, w, d, h, door = place.x, place.z, place.w, place.d, place.h, place.door
	local color = rgb(place.color)
	local wall = Enum.Material.Concrete
	local gap = 8
	local frontZ = z + door * (d / 2 - 0.5)
	local side = (w - gap) / 2

	block(x, 0.2, z, w, 0.4, d, Color3.fromRGB(150, 120, 90), Enum.Material.WoodPlanks, "Floor")
	block(x, h / 2, z - door * (d / 2 - 0.5), w, h, 1, color, wall)
	block(x - (w / 2 - 0.5), h / 2, z, 1, h, d, color, wall)
	block(x + (w / 2 - 0.5), h / 2, z, 1, h, d, color, wall)
	block(x - (gap / 2 + side / 2), h / 2, frontZ, side, h, 1, color, wall)
	block(x + (gap / 2 + side / 2), h / 2, frontZ, side, h, 1, color, wall)
	block(x, 9 + (h - 9) / 2, frontZ, gap, h - 9, 1, color, wall)
	block(x, h + 0.5, z, w + 2, 1, d + 2, if place.tall then color else SNOW, if place.tall then wall else Enum.Material.Snow, "Roof")

	local sign = block(x, h - 1.8, z + door * (d / 2 + 0.2), math.min(w - 4, 28), 2.8, 0.4, Color3.fromRGB(28, 34, 48))
	label(sign, place.name, if door == 1 then Enum.NormalId.Back else Enum.NormalId.Front, Color3.fromRGB(255, 230, 160))

	local bulb = block(x, h - 0.3, z, 3, 0.4, 3, Color3.fromRGB(255, 240, 210), Enum.Material.Neon)
	local light = Instance.new("PointLight")
	light.Range = 46
	light.Brightness = 1.2
	light.Parent = bulb

	if place.tall then
		local base = h + 1
		block(x, base + place.tall / 2, z, w, place.tall, d, color, wall)
		windows(x, z, w, d, base, base + place.tall)
		block(x, base + place.tall + 0.4, z, w + 1, 0.8, d + 1, SNOW, Enum.Material.Snow)
	end

	table.insert(World.zones, {
		id = place.id,
		minX = x - w / 2,
		maxX = x + w / 2,
		minZ = z - d / 2,
		maxZ = z + d / 2,
		top = h,
	})

	return function(dx: number, depth: number): (number, number)
		local inner = d - 4
		return x + dx, z + door * (d / 2 - 2) - door * inner * depth
	end
end

local function counter(x: number, z: number, width: number)
	block(x, 1.9, z, width, 3, 2, Color3.fromRGB(120, 90, 66), Enum.Material.Wood, "Counter")
end

local function bed(x: number, z: number, action: string, text: string)
	local frame = block(x, 1.2, z, 5, 1.6, 9, Color3.fromRGB(110, 84, 62), Enum.Material.Wood, "Bed")
	block(x, 2.3, z, 4.6, 0.6, 8.6, Color3.fromRGB(70, 110, 170), Enum.Material.Fabric)
	block(x, 2.8, z - 3.2, 3.4, 0.6, 1.8, Color3.fromRGB(245, 245, 245), Enum.Material.Fabric)
	prompt(frame, action, text, "Кровать")
end

local function desk(x: number, z: number, action: string, text: string, object: string)
	local top = block(x, 3, z, 6, 0.4, 3, Color3.fromRGB(130, 100, 74), Enum.Material.Wood, "Desk")
	block(x - 2.6, 1.6, z, 0.4, 2.6, 2.6, Color3.fromRGB(90, 70, 52))
	block(x + 2.6, 1.6, z, 0.4, 2.6, 2.6, Color3.fromRGB(90, 70, 52))
	block(x, 4.2, z, 2.6, 1.8, 0.2, Color3.fromRGB(30, 34, 44))
	block(x, 4.2, z + 0.12, 2.3, 1.5, 0.05, Color3.fromRGB(90, 190, 255), Enum.Material.Neon).CanCollide = false
	prompt(top, action, text, object)
end

local function furnish(place: Config.Place, at: Inside)
	local id = place.id
	local half = place.w / 2
	if id == "home" then
		local bx, bz = at(-half + 5, 0.75)
		bed(bx, bz, "sleep", "Спать")
		local dx, dz = at(half - 6, 0.8)
		desk(dx, dz, "studyHome", "Учить код", "Ноутбук")
		local nx, nz = at(half - 6, 0.2)
		prompt(npc("Гульнар-апай", nx, nz, Color3.fromRGB(123, 45, 74)), "landlady", "Поговорить", "Гульнар-апай")
	elseif id == "station" then
		local nx, nz = at(-half + 8, 0.6)
		prompt(npc("Кассир", nx, nz, Color3.fromRGB(60, 90, 140)), "talk", "Поговорить", "Кассир", "station")
		local bx, bz = at(half - 10, 0.7)
		block(bx, 1.2, bz, 12, 0.6, 2.4, Color3.fromRGB(120, 90, 66), Enum.Material.Wood, "Bench")
	elseif id == "school" then
		local nx, nz = at(0, 0.75)
		prompt(npc("Сауле-апай", nx, nz, Color3.fromRGB(59, 89, 152)), "kazLesson", "Урок казахского", "Сауле-апай")
		local wx, wz = at(0, 0.97)
		label(block(wx, 6, wz, 14, 5, 0.3, Color3.fromRGB(34, 70, 54)), "Қазақ тілі\nСәлем! Рақмет!", if place.door == 1 then Enum.NormalId.Back else Enum.NormalId.Front)
	elseif id == "hospital" then
		local nx, nz = at(-8, 0.7)
		prompt(npc("Врач", nx, nz, Color3.fromRGB(245, 245, 245), Color3.fromRGB(120, 190, 200)), "talk", "Поговорить", "Врач", "doctor")
		local bx, bz = at(10, 0.75)
		block(bx, 1.4, bz, 4, 1.2, 8, Color3.fromRGB(240, 240, 240), Enum.Material.Fabric, "Cot")
	elseif id == "library" then
		for i = -1, 1 do
			local sx, sz = at(i * 9, 0.95)
			block(sx, 4, sz, 7, 7, 1.4, Color3.fromRGB(100, 72, 52), Enum.Material.Wood, "Shelf")
		end
		local dx, dz = at(-8, 0.5)
		desk(dx, dz, "studyLibrary", "Учить код", "Учебник по программированию")
		local nx, nz = at(9, 0.4)
		prompt(npc("Библиотекарь", nx, nz, Color3.fromRGB(110, 90, 130)), "talk", "Поговорить", "Библиотекарь", "library")
	elseif id == "depot" then
		local cx, cz = at(0, 0.6)
		counter(cx, cz, 12)
		local nx, nz = at(0, 0.8)
		prompt(npc("Даурен", nx, nz, Color3.fromRGB(240, 180, 41)), "courier", "Работа курьером", "Даурен")
		for i = 1, 3 do
			local px, pz = at(-half + 4 + i * 2.6, 0.9)
			block(px, 1.4, pz, 2.2, 2, 2.2, Color3.fromRGB(176, 136, 92), Enum.Material.Cardboard, "Parcel")
		end
	elseif id == "doner" then
		local cx, cz = at(0, 0.6)
		counter(cx, cz, 14)
		local nx, nz = at(0, 0.82)
		prompt(npc("Ержан-ага", nx, nz, Color3.fromRGB(74, 122, 58)), "shop", "Меню", "Шаурма №1", "doner")
	elseif id == "coffee" then
		local cx, cz = at(-4, 0.6)
		counter(cx, cz, 12)
		local nx, nz = at(-4, 0.82)
		prompt(npc("Айгерим", nx, nz, Color3.fromRGB(242, 239, 232)), "shop", "Заказать", "Кофейня «Есіл»", "coffee")
		local mx, mz = at(half - 5, 0.8)
		local machine = block(mx, 2.6, mz, 3, 4.4, 2.4, Color3.fromRGB(190, 50, 50), Enum.Material.Metal, "CoffeeMachine")
		prompt(machine, "barista", "Смена бариста", "Кофемашина")
	elseif id == "it" then
		local cx, cz = at(-8, 0.5)
		counter(cx, cz, 8)
		local nx, nz = at(-8, 0.7)
		prompt(npc("Жанель", nx, nz, Color3.fromRGB(244, 247, 248), Color3.fromRGB(91, 127, 166)), "interview", "Собеседование", "Жанель, HR")
		local dx, dz = at(9, 0.8)
		desk(dx, dz, "itWork", "Работать", "Рабочее место")
		local ax, az = at(9, 0.3)
		prompt(npc("Арман", ax, az, Color3.fromRGB(58, 63, 74)), "talk", "Поговорить", "Арман", "arman")
	elseif id == "flat" then
		local nx, nz = at(-9, 0.35)
		prompt(npc("Менеджер", nx, nz, Color3.fromRGB(59, 74, 90)), "buyFlat", "Купить квартиру", "Отдел продаж")
		local bx, bz = at(half - 6, 0.75)
		bed(bx, bz, "sleepFlat", "Спать")
		local sx, sz = at(-9, 0.9)
		block(sx, 1.6, sz, 9, 2.4, 3, Color3.fromRGB(200, 170, 120), Enum.Material.Fabric, "Sofa")
	elseif id == "mall" then
		local cx, cz = at(0, 0.6)
		counter(cx, cz, 16)
		local nx, nz = at(0, 0.82)
		prompt(npc("Продавец", nx, nz, Color3.fromRGB(30, 150, 160)), "shop", "Магазин", "Хан Шатыр", "mall")
	end
end

local function ground()
	local halfX = Config.MAP_HALF_X
	local river = Config.RIVER_HALF
	local depth = Config.MAP_DEPTH - river
	for _, side in { -1, 1 } do
		block(0, -2, side * (river + depth / 2), halfX * 2, 4, depth, SNOW, Enum.Material.Snow, "Bank")
		block(0, 0.02, side * 120, halfX * 2 - 20, 0.2, 18, ASPHALT, Enum.Material.Asphalt, "Road")
		block(0, 0.02, side * (river + depth / 2), 18, 0.2, depth, ASPHALT, Enum.Material.Asphalt, "Road")
		-- невидимые границы карты
		local wall = block(0, 40, side * (Config.MAP_DEPTH + 1), halfX * 2, 120, 2, SNOW)
		wall.Transparency = 1
		local edge = block(side * (halfX + 1), 40, 0, 2, 120, Config.MAP_DEPTH * 2, SNOW)
		edge.Transparency = 1
	end

	local ice = block(0, -2.3, 0, halfX * 2, 3, river * 2, Color3.fromRGB(176, 214, 236), Enum.Material.Ice, "Esil")
	ice.CustomPhysicalProperties = PhysicalProperties.new(0.9, 0.04, 0.2, 100, 1)

	-- мост
	block(0, -0.5, 0, 22, 1, river * 2 + 4, Color3.fromRGB(150, 154, 162), Enum.Material.Concrete, "Bridge")
	block(0, 0.02, 0, 18, 0.2, river * 2 + 4, ASPHALT, Enum.Material.Asphalt, "Road")
	for _, side in { -1, 1 } do
		block(side * 10.5, 1.5, 0, 1, 3, river * 2 + 4, Color3.fromRGB(230, 232, 236), Enum.Material.Metal, "Railing")
		for z = -30, 30, 30 do
			block(side * 9, -2.4, z, 3, 3, 3, Color3.fromRGB(130, 134, 142), Enum.Material.Concrete, "Pier")
		end
	end

	for x = -300, 300, 60 do
		if math.abs(x) > 20 then
			lamp(x, -108)
			lamp(x, 108)
		end
	end
	for z = 60, 330, 54 do
		lamp(-11, z)
		lamp(11, -z)
	end
	for x = -280, 280, 40 do
		if math.abs(x) > 24 then
			tree(x + rng:NextInteger(-6, 6), -52 + rng:NextInteger(-4, 4))
			tree(x + rng:NextInteger(-6, 6), 56 + rng:NextInteger(-4, 4))
		end
	end
end

local function bazaar()
	local x, z = Config.BAZAAR.x, Config.BAZAAR.z
	local colors = { Color3.fromRGB(200, 60, 50), Color3.fromRGB(40, 120, 190), Color3.fromRGB(240, 190, 60) }
	for i = -1, 1 do
		local sx = x + i * 12
		block(sx, 1.6, z, 9, 0.5, 4, Color3.fromRGB(130, 100, 74), Enum.Material.Wood, "Stall")
		block(sx - 4.2, 3, z + 1.8, 0.4, 6, 0.4, Color3.fromRGB(90, 70, 52))
		block(sx + 4.2, 3, z + 1.8, 0.4, 6, 0.4, Color3.fromRGB(90, 70, 52))
		block(sx - 4.2, 3, z - 1.8, 0.4, 6, 0.4, Color3.fromRGB(90, 70, 52))
		block(sx + 4.2, 3, z - 1.8, 0.4, 6, 0.4, Color3.fromRGB(90, 70, 52))
		block(sx, 6.2, z, 10, 0.4, 5, colors[i + 2], Enum.Material.Fabric, "Canopy")
		for j = -1, 1 do
			block(sx + j * 2.4, 2.2, z, 1.4, 0.8, 1.4, colors[(i + j) % 3 + 1], Enum.Material.Fabric).CanCollide = false
		end
	end
	local vendor = npc("Продавщица Бибігүл", x, z + 3.4, Color3.fromRGB(91, 58, 110))
	prompt(vendor, "shop", "Купить", "Базар", "bazaar").MaxActivationDistance = 14
	local sign = block(x, 9, z + 2.6, 20, 2.6, 0.4, Color3.fromRGB(28, 34, 48))
	label(sign, "БАЗАР", Enum.NormalId.Front, Color3.fromRGB(255, 230, 160))
	block(x - 9.5, 4, z + 2.6, 0.5, 8, 0.5, Color3.fromRGB(60, 64, 72))
	block(x + 9.5, 4, z + 2.6, 0.5, 8, 0.5, Color3.fromRGB(60, 64, 72))
end

local function busStops()
	for _, stop in Config.BUS_STOPS do
		local facing = if stop.z < 0 then (if stop.z < -120 then 1 else -1) else (if stop.z > 120 then -1 else 1)
		block(stop.x - 4, 4, stop.z, 0.4, 8, 0.4, Color3.fromRGB(60, 64, 72))
		block(stop.x + 4, 4, stop.z, 0.4, 8, 0.4, Color3.fromRGB(60, 64, 72))
		block(stop.x, 8.2, stop.z, 10, 0.4, 4, Color3.fromRGB(40, 120, 190), Enum.Material.Metal, "BusRoof")
		local board = block(stop.x, 6, stop.z - facing * 0.2, 8, 2.4, 0.3, Color3.fromRGB(245, 245, 245), nil, "BusStop")
		label(board, "Автобус · " .. stop.name, if facing == 1 then Enum.NormalId.Back else Enum.NormalId.Front, Color3.fromRGB(20, 60, 110))
		local bench = block(stop.x, 1.2, stop.z, 7, 0.5, 1.6, Color3.fromRGB(120, 90, 66), Enum.Material.Wood, "Bench")
		prompt(bench, "bus", "Автобус", "Остановка «" .. stop.name .. "»", stop.id)
	end
end

local function baiterek()
	local x, z = Config.BAITEREK.x, Config.BAITEREK.z
	local white = Color3.fromRGB(245, 245, 245)
	local deckY = 80
	cylinder(x, 0.3, z, 30, 0.6, Color3.fromRGB(200, 196, 188), Enum.Material.Concrete)
	cylinder(x, 35, z, 3.5, 70, white, Enum.Material.Metal)
	for i = 0, 11 do
		local angle = i / 12 * 2 * math.pi
		local dir = Vector3.new(math.cos(angle), 0, math.sin(angle))
		local from = Vector3.new(x, 52, z) + dir * 3
		local to = Vector3.new(x, deckY + 3, z) + dir * 14
		local strut = part(Vector3.new(0.8, 0.8, (to - from).Magnitude), CFrame.lookAt((from + to) / 2, to), white, Enum.Material.Metal)
		strut.CanCollide = false
		local railPos = Vector3.new(x, deckY + 2, z) + dir * 14.5
		part(Vector3.new(8, 3.4, 0.5), CFrame.lookAt(railPos, Vector3.new(x, deckY + 2, z)), white, Enum.Material.Metal, "Railing")
	end
	cylinder(x, deckY, z, 15, 1, Color3.fromRGB(210, 210, 214), Enum.Material.Metal)
	local sphere = ball(x, deckY + 12.5, z, 23, GOLD)
	sphere.Reflectance = 0.35

	local ticket = block(x + 8, 2, z - 26, 4, 4, 3, Color3.fromRGB(40, 120, 190), nil, "Lift")
	label(ticket, "Лифт", Enum.NormalId.Front)
	prompt(ticket, "baiterekUp", "Подняться", "Байтерек")

	local palm = block(x - 11, deckY + 2.2, z, 2, 3.4, 2, GOLD, Enum.Material.Metal, "Palm")
	prompt(palm, "wish", "Приложить ладонь", "Отпечаток ладони")
	local down = block(x + 11.5, deckY + 2.2, z + 4, 2, 3.4, 2, Color3.fromRGB(40, 120, 190), nil, "LiftDown")
	prompt(down, "baiterekDown", "Спуститься", "Лифт")
	World.baiterekTop = Vector3.new(x + 9, deckY + 4, z)
	World.baiterekBottom = Vector3.new(x + 8, 3, z - 32)
end

local function khanShatyr()
	local x, z = -220, 218
	local tent = Color3.fromRGB(196, 232, 226)
	local layers = 13
	for i = 0, layers - 1 do
		local radius = 44 * (1 - i / layers) ^ 0.8 + 1.5
		local layer = cylinder(x + i * 1.3, 3 + i * 6, z, radius, 6, tent)
		layer.Transparency = 0.12
		layer.Reflectance = 0.1
	end
	block(x + layers * 1.3, layers * 6 + 8, z, 0.8, 18, 0.8, Color3.fromRGB(230, 232, 236), Enum.Material.Metal, "Spire")
end

local function landmarks()
	baiterek()
	khanShatyr()

	-- Нұр Әлем
	cylinder(235, 2, 240, 18, 4, Color3.fromRGB(190, 194, 200), Enum.Material.Concrete)
	local sphere = ball(235, 30, 240, 56, Color3.fromRGB(44, 78, 130), Enum.Material.Glass)
	sphere.Reflectance = 0.3
	label(block(235, 3, 220.6, 16, 2.4, 0.4, Color3.fromRGB(28, 34, 48)), "Нұр Әлем", Enum.NormalId.Front, Color3.fromRGB(255, 230, 160))

	-- Ак Орда
	block(0, 11, 328, 76, 22, 30, Color3.fromRGB(248, 248, 246), Enum.Material.Marble, "AkOrda")
	for cx = -32, 32, 8 do
		block(cx, 10, 312, 1.6, 20, 1.6, Color3.fromRGB(255, 255, 255), Enum.Material.Marble)
	end
	ball(0, 23, 328, 28, Color3.fromRGB(46, 120, 200), Enum.Material.Metal)
	block(0, 44, 328, 0.8, 14, 0.8, GOLD, Enum.Material.Metal)

	-- золотые башни
	for _, side in { -1, 1 } do
		for i = 0, 6 do
			local tower = cylinder(side * 48, 5 + i * 10, 286, 10 - i * 0.7, 10, GOLD, Enum.Material.Glass)
			tower.Reflectance = 0.3
		end
	end
end

local function skyline()
	local panel = { Color3.fromRGB(186, 178, 166), Color3.fromRGB(170, 176, 184), Color3.fromRGB(196, 186, 170), Color3.fromRGB(160, 150, 150) }
	local glass = { Color3.fromRGB(70, 120, 170), Color3.fromRGB(60, 150, 160), Color3.fromRGB(110, 130, 170), Color3.fromRGB(200, 170, 110) }
	-- правый берег: панельные дома
	for _, z in { -232, -304 } do
		for x = -285, 285, 57 do
			if math.abs(x) > 34 then
				decor(x, z, 42, 18, rng:NextInteger(5, 9) * 5, panel[rng:NextInteger(1, #panel)])
			end
		end
	end
	for _, x in { -260, 125, 180, 235, 290 } do
		decor(x, -84, 36, 20, rng:NextInteger(4, 6) * 5, panel[rng:NextInteger(1, #panel)])
	end
	-- левый берег: стеклянные башни
	for _, x in { -160, -42, 42, 165, 225, 285 } do
		decor(x, 158, 30, 26, rng:NextInteger(12, 26) * 5, glass[rng:NextInteger(1, #glass)], true)
	end
	for x = -290, 290, 58 do
		if math.abs(x) > 70 then
			decor(x, 312, 34, 26, rng:NextInteger(10, 22) * 5, glass[rng:NextInteger(1, #glass)], true)
		end
	end
end

local function pedestrians()
	local spots = {
		{ -170, -112, 200, 90, 60 }, { 20, -128, 70, 110, 150 }, { 110, -112, 230, 126, 34 },
		{ -60, 112, 40, 140, 120 }, { 14, 190, 160, 90, 160 }, { 150, 128, 240, 240, 240 },
		{ -6, -30, 60, 160, 90 }, { -150, 60, 190, 140, 60 },
	}
	for i, spot in spots do
		local torso = npc("Прохожий", spot[1], spot[2], Color3.fromRGB(spot[3], spot[4], spot[5]))
		prompt(torso, "ped", "Поговорить", "Прохожий", tostring(i))
	end
end

local function lighting()
	Lighting.Ambient = Color3.fromRGB(110, 118, 136)
	Lighting.OutdoorAmbient = Color3.fromRGB(128, 136, 152)
	Lighting.Brightness = 2
	Lighting.ClockTime = Config.START_HOUR
	Lighting.GeographicLatitude = 51
	Lighting.FogColor = Color3.fromRGB(220, 228, 238)
	Lighting.FogStart = 150
	Lighting.FogEnd = 1400
end

-- Возвращает id здания, внутри которого находится точка, либо nil.
function World.indoor(position: Vector3): string?
	for _, zone in World.zones do
		if position.X > zone.minX and position.X < zone.maxX and position.Z > zone.minZ and position.Z < zone.maxZ and position.Y < zone.top + 2 then
			return zone.id
		end
	end
	return nil
end

function World.place(id: string): Config.Place?
	for _, place in Config.BUILDINGS do
		if place.id == id then
			return place
		end
	end
	return nil
end

-- Точка на улице перед дверью здания.
function World.door(id: string): Vector3
	local place = World.place(id)
	if not place then
		return Vector3.new(Config.SPAWN.x, 4, Config.SPAWN.z)
	end
	return Vector3.new(place.x, 4, place.z + place.door * (place.d / 2 + 6))
end

function World.setBuran(active: boolean)
	Lighting.FogStart = if active then 20 else 150
	Lighting.FogEnd = if active then 220 else 1400
end

function World.build()
	root = Instance.new("Folder")
	root.Name = "Astana"

	ground()
	for _, place in Config.BUILDINGS do
		furnish(place, shell(place))
	end
	bazaar()
	busStops()
	landmarks()
	skyline()
	pedestrians()
	lighting()

	local spawn = Instance.new("SpawnLocation")
	spawn.Anchored = true
	spawn.Neutral = true
	spawn.Transparency = 1
	spawn.CanCollide = false
	spawn.Size = Vector3.new(10, 1, 10)
	spawn.CFrame = CFrame.new(Config.SPAWN.x, 0.6, Config.SPAWN.z)
	spawn.Parent = root

	root.Parent = workspace
end

World.baiterekTop = Vector3.zero
World.baiterekBottom = Vector3.zero

return World
