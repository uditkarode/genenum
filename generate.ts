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

/// check if `input-dir` and `output-dir` exist
const dirs = ["input-dir", "output-dir"] as (keyof Args)[];
dirs.forEach(async (k) => {
  const stat = await Deno.stat(args[k]);
  if (!stat.isDirectory) {
    error(`directory '${args[k]}' does not exist`);
  }
});

/// regex to extract enums
const enumRegex = /enum\s\w+\s{.+?}/gs;

/// object that will contain all enums
/// Record<filename, array of enum strings>
const enums: Record<string, string[]> = {};

/**
 * @description scans @param dir for files ending with
 * .sol, checks if they contain any enums and if they do,
 * adds it to `enums`. If they don't displays a warning.
 * If there are any directories in @param dir, recursively
 * calls `generate` on them.
 */
const generate = async (dir: string) => {
  for await (const file of Deno.readDir(dir)) {
    if (file.isDirectory) {
      await generate(`${dir}/${file.name}`);
      continue;
    }

    if (!file.isFile || !file.name.endsWith(".sol")) {
      warn(`'${file.name}' is not a Solidity file`);
      continue;
    }

    // read the solidity source
    const content = await Deno.readTextFile(
      `${dir}/${file.name}`,
    );

    // find enum regex matches the source
    const matches = Array.from(
      content.matchAll(enumRegex),
      (x) => `const ${x[0]}`,
    );

    if (matches.length != 0) {
      // if matches exist, add to `enums`
      const filename = file.name.replace(".sol", "");
      if (enums[filename] != undefined) {
        error(
          "Unable to process multiple contracts with the same filename within the same input-dir",
        );
      }
      enums[filename] = matches;
      success(`'${dir}/${file.name}' contains ${matches.length} enum(s)`);
    } else {
      warn(`'${dir}/${file.name}' contains no enums`);
    }
  }
};

await generate(args["input-dir"]);

/// dir where enum files will be saved
const enumDir = `${await Deno.realPath(args["output-dir"])}/enums`;

/// make sure `enumDir` exists, or create it if it doesn't
await fs.ensureDir(enumDir);

/**
 * writes `enums` to storage. For example, on a value
 * like { "Lottery": [ "const enum {...}" ] },
 * it will write ${enumDir}/Lottery.ts containing
 * "const enum {...}"
 */
for (const [k, v] of Object.entries(enums)) {
  const file = `${enumDir}/${k}.ts`;
  await Deno.writeTextFile(
    file,
    `${genHeader}${v.join("\n\n")}`,
  );

  success(`Wrote ${file}`);
}
