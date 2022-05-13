import { c } from "./deps.ts";

export const version = "0.3";

export const genHeader = `/*\n\tgenerated by genenum v${version}\n\tdo not modify by hand\n*/\n\n`;

/**
      @param msg the message to print on the screen
      @param transform function to transform the message
      @param exitCode process exit code -- will not exit if < 0
*/
const log = (
  header: string,
  msg: string,
  transform: (v: string) => string,
  exitCode: number
) => {
  console.log(transform(`${c.bold(header)} ${msg}`));
  exitCode >= 0 && Deno.exit(exitCode);
};

export const error = (msg: string) => log("error", msg, c.red, 1);
export const info = (msg: string) => log("info", msg, c.brightCyan, -1);
export const warn = (msg: string) => log("warn", msg, c.yellow, -1);
export const success = (msg: string) => log("success", msg, c.green, -1);
