import { fs, parse } from "./deps.ts";
import { error, genHeader, success, warn } from "./util.ts";

type Args = { _: Array<string | number>; "input-dir": string; "o": string };

const args = parse(Deno.args, {
  string: ["input-dir", "o"],
  default: { "input-dir": ".", "o": "." },
}) as Args;

const dirs = ["input-dir", "o"] as Partial<keyof Args>[];
dirs.forEach(async (k) => {
  const stat = await Deno.stat(args[k] as string);
  if (!stat.isDirectory) {
    error(`directory '${args[k]}' does not exist`);
  }
});

const enumRegex = /enum\s\w+\s{.+?}/gs;
const enums: Record<string, string[]> = {};

for await (const file of Deno.readDir(args["input-dir"])) {
  if (!file.isFile || !file.name.endsWith(".sol")) {
    warn(`'${file.name}' is not a Solidity file`);
    continue;
  }

  const content = await Deno.readTextFile(`${args["input-dir"]}/${file.name}`);
  const matches = Array.from(
    content.matchAll(enumRegex),
    (x) => `const ${x[0]}`,
  );

  if (matches.length != 0) {
    const filename = file.name.replace(".sol", "");
    enums[filename] = matches;
    success(`'${file.name}' contains ${matches.length} enum(s)`);
  } else {
    warn(`'${file.name}' contains no enums`);
  }
}

const enumDir = `${await Deno.realPath(args.o)}/enums`;
await fs.ensureDir(enumDir);

for (const [k, v] of Object.entries(enums)) {
  const file = `${enumDir}/${k}.ts`;
  await Deno.writeTextFile(
    file,
    `${genHeader}${v.join("\n\n")}`,
  );

  success(`Wrote ${file}`);
}
