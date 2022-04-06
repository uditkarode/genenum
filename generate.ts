import { fs, parse } from "./deps.ts";
import { error, genHeader, success, warn } from "./util.ts";

type Args = { "input-dir": string; "output-dir": string };

/*
    regular cast not possible because of the
    presence of the '_' property, but we
    don't care about it in this case
*/
const args = parse(Deno.args, {
  string: ["input-dir", "o"],
  default: { "input-dir": ".", "output-dir": "." },
}) as unknown as Args;

const dirs = ["input-dir", "output-dir"] as (keyof Args)[];
dirs.forEach(async (k) => {
  const stat = await Deno.stat(args[k]);
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

const enumDir = `${await Deno.realPath(args["output-dir"])}/enums`;
await fs.ensureDir(enumDir);

for (const [k, v] of Object.entries(enums)) {
  const file = `${enumDir}/${k}.ts`;
  await Deno.writeTextFile(
    file,
    `${genHeader}${v.join("\n\n")}`,
  );

  success(`Wrote ${file}`);
}
