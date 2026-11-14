const base = "../src/lib/";
const { runAgent } = await import(base + "agent/run.ts");
const { mockLlm } = await import(base + "agent/llm.ts");
const { getAffiliate } = await import(base + "ci/tokens.ts");
const { validateAll } = await import(base + "agent/validate.ts");
const { createSpecStreamCompiler } = await import("@json-render/core");
for (const prompt of ["운영 대시보드", "신청 폼", "CI 위반 시연 대시보드"]) {
  const a = getAffiliate("db-inc"); const c = createSpecStreamCompiler({root:"",elements:{}}); let n=0;
  for await (const l of runAgent({prompt, affiliate:a, currentSpec:null, llm: mockLlm(a.name), modelLabel:"mock"})) {
    const o = JSON.parse(l);
    if (o.__meta) console.log(o.step ?? "usage", o.status ?? "", o.message ?? JSON.stringify(o), (o.issues||[]).map((i: {rule: string; message: string})=>"\n    - "+i.rule+": "+i.message).join(""));
    else { c.push(l); n++; }
  }
  const spec = c.getResult();
  console.log("=> patches", n, "elements", Object.keys(spec.elements).length, "client-side issues", validateAll(spec).length, "\n");
}
