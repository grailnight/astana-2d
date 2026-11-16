// Собирает AstanaZhanaOmir.rbxlx — файл места Roblox со всеми скриптами.
// Город строится кодом при запуске сервера, поэтому в файле только сервисы и скрипты.
//   node tools/build.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Куда в дереве места попадает каждый файл.
export const SCRIPTS = [
  { file: 'src/shared/Config.luau', name: 'Config', class: 'ModuleScript', parent: 'Shared' },
  { file: 'src/shared/Logic.luau', name: 'Logic', class: 'ModuleScript', parent: 'Shared' },
  { file: 'src/shared/Questions.luau', name: 'Questions', class: 'ModuleScript', parent: 'Shared' },
  { file: 'src/server/World.luau', name: 'World', class: 'ModuleScript', parent: 'ServerScriptService' },
  { file: 'src/server/Main.server.luau', name: 'Main', class: 'Script', parent: 'ServerScriptService' },
  { file: 'src/client/Main.client.luau', name: 'Client', class: 'LocalScript', parent: 'StarterPlayerScripts' },
];

let nextId = 0;
const escape = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const cdata = (text) => `<![CDATA[${text.replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;

function item(className, name, extra = '', children = []) {
  const id = `RBX${String(nextId++).padStart(4, '0')}`;
  return [
    `<Item class="${className}" referent="${id}">`,
    `<Properties><string name="Name">${escape(name)}</string>${extra}</Properties>`,
    ...children,
    '</Item>',
  ].join('\n');
}

function scriptsFor(parent) {
  return SCRIPTS.filter((s) => s.parent === parent).map((s) =>
    item(s.class, s.name, `<ProtectedString name="Source">${cdata(readFileSync(join(root, s.file), 'utf8'))}</ProtectedString>`),
  );
}

export function build() {
  nextId = 0;
  const xml = [
    '<roblox xmlns:xmime="http://www.w3.org/2005/05/xmlmime" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://www.roblox.com/roblox.xsd" version="4">',
    item('Workspace', 'Workspace', '<bool name="FilteringEnabled">true</bool>'),
    item('Players', 'Players'),
    item('Lighting', 'Lighting'),
    item('ReplicatedStorage', 'ReplicatedStorage', '', [item('Folder', 'Shared', '', scriptsFor('Shared'))]),
    item('ServerScriptService', 'ServerScriptService', '', scriptsFor('ServerScriptService')),
    item('StarterPlayer', 'StarterPlayer', '', [item('StarterPlayerScripts', 'StarterPlayerScripts', '', scriptsFor('StarterPlayerScripts'))]),
    '</roblox>',
    '',
  ].join('\n');
  const out = join(root, 'AstanaZhanaOmir.rbxlx');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, xml);
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log('Собрано:', build());
}
