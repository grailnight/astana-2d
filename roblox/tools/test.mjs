// Проверка игры без Roblox Studio: компилирует все скрипты настоящим Luau
// и прогоняет сквозной сценарий в имитации Roblox API (tools/mock.luau).
//   npm install && npm test
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { LuauState } from 'luau-web';
import { SCRIPTS } from './build.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(root, path), 'utf8');

const state = await LuauState.createAsync({ log: (...args) => console.log(...args) });
const run = async (source, name) => await state.loadstring(source, name, true)();

const LOCALS = 'game, workspace, Instance, Vector3, CFrame, Vector2, Color3, UDim2, UDim, NumberRange, NumberSequence, ColorSequence, PhysicalProperties, TweenInfo, Enum, Random, task, require, warn, os';
const prefix = (name) =>
  `__define("${name}", function(script) local ${LOCALS} = ${LOCALS.split(', ').map((n) => `__mock.${n}`).join(', ')}; `;

try {
  await run(read('tools/mock.luau'), 'mock');
  for (const script of SCRIPTS) {
    const source = read(script.file);
    // Сначала компилируем исходник как есть — так он попадёт в Roblox.
    state.loadstring(source, script.name, true);
    // В тесте модуль оборачивается в функцию, где `export type` недопустим.
    await run(prefix(script.name) + source.replace(/^export type /gm, 'type ') + '\nend)', script.name);
  }
  await run(read('tools/scenario.luau'), 'scenario');
} catch (error) {
  console.error(String(error?.message ?? error));
  process.exit(1);
}
