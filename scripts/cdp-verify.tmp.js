const url = process.argv[2]
const ws = new WebSocket(url)
let id = 0
const pending = new Map()
const seen = new Set()
function send(method, params = {}) {
  return new Promise((resolve) => {
    const mid = ++id
    pending.set(mid, resolve)
    ws.send(JSON.stringify({ id: mid, method, params }))
  })
}
const reqById = new Map()
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data)
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); return }
  if (msg.method === "Network.requestWillBeSent") {
    const u = msg.params.request.url
    reqById.set(msg.params.requestId, u)
    if (u.includes("/api/")) console.log("API REQ:", u.slice(0, 100))
  }
  if (msg.method === "Network.responseReceived") {
    const u = reqById.get(msg.params.requestId)
    if (u && u.includes("/api/")) console.log("API RESP:", msg.params.response.status, u.slice(0, 100))
  }
  if (msg.method === "Network.loadingFailed") {
    const u = reqById.get(msg.params.requestId)
    if (u && u.includes("/api/")) console.log("API FAILED:", msg.params.errorText, u.slice(0, 100))
  }
  if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") {
    console.log("CONSOLE ERR:", msg.params.args.map(a => a.value || "").join(" ").slice(0, 200))
  }
}
ws.onopen = async () => {
  await send("Network.enable")
  await send("Runtime.enable")
  await send("Page.navigate", { url: "http://10.0.2.2:3000/tools" })
  await new Promise(r => setTimeout(r, 8000))
  const probe = await send("Runtime.evaluate", {
    expression: `JSON.stringify({
      url: location.href,
      cardCount: document.querySelectorAll('a[href*="/tools/"]').length,
      gridKids: [...document.querySelectorAll('.grid > div')].map(d => ({ text: (d.innerText||'').slice(0,25), cc: d.className||'' })).slice(0,6),
      hasEmptyMsg: document.body.innerText.includes('No tools found'),
      sample: document.body.innerText.slice(0,200)
    })`,
    returnByValue: true,
  })
  console.log("PROBE:", probe.result?.result?.value)
  process.exit(0)
}
ws.onerror = (e) => { console.error("WS error", e.message); process.exit(1) }
