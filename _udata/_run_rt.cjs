const { spawnSync } = require("child_process");
const path = require("path");
const root = "C:/Users/Abhinaya Doma/OneDrive/Desktop/N-REV-main";
const r = spawnSync(process.execPath, [path.join(root, "_udata/test-recovery.mjs")], { cwd: root, encoding: "utf8", timeout: 60000 });
const fs = require("fs");
const out = "=== EXIT " + r.status + " ===\nSTDOUT:\n" + (r.stdout || "") + "\nSTDERR:\n" + (r.stderr || "");
fs.writeFileSync(path.join(root, "_udata/_rt_out.txt"), out);
console.log("done exit=" + r.status);
