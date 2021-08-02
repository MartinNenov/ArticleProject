// A simple wrapper for XHR.
export function req(conf:any) {
    let req = new XMLHttpRequest(), aborted = false
    let result : any = new Promise((success, failure) => {
      req.open(conf.method, conf.url, true)
      req.addEventListener("load", () => {
        if (aborted) return
        if (req.status < 400) {
          success(req.responseText)
        } else {
          let text = req.responseText
          if (text && /html/.test(req.getResponseHeader("content-type")||'noResponseHeader')) text = makePlain(text)
          let err:any = new Error("Request failed: " + req.statusText + (text ? "\n\n" + text : ""))
          err.status = req.status
          failure(err)
        }
      })
      req.addEventListener("error", () => { if (!aborted) failure(new Error("Network error")) })
      if (conf.headers) for (let header in conf.headers) req.setRequestHeader(header, conf.headers[header])
      req.send(conf.body || null)
    })
    result.abort = () => {
      if (!aborted) {
        req.abort()
        aborted = true
      }
    }
    return result
  }
  
  function makePlain(html:any) {
    var elt:any = document.createElement("div")
    elt.innerHTML = html
    return elt.textContent.replace(/\n[^]*|\s+$/g, "")
  }
  
  export function GET(url:any) {
    return req({url, method: "GET"})
  }
  
  export function POST(url:any, body:any, type:any) {
    return req({url, method: "POST", body, headers: {"Content-Type": type}})
  }