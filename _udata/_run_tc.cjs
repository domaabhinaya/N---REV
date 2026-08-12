const { spawnSync } = require("child_process");
const path = require("path");
const root = "C:/Users/Abhinaya Doma/OneDrive/Desktop/N-REV-main";
const fs = require("fs");
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
function run(label, args, cwd) {
  const r = spawnSync(pnpm, args, { cwd, encoding: "utf8", timeout: 600000, shell: true });
  return "=== " + label + " exit=" + r.status + " ===\n" + (r.stdout || "") + (r.stderr || "");
}
let out = "";
out += run("typecheck:libs", ["run", "typecheck:libs"], root);
out += "\n\n" + run("artifact typechecks", ["-r", "--filter", "./artifacts/**", "--filter", "./scripts", "--if-present", "run", "typecheck"], root);
out += "\n\n" + run("full build", ["run", "build"], root);
fs.writeFileSync(path.join(root, "_udata/_tc_out.txt"), out);
console.log("DONE");