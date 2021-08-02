import { AnyMxRecord } from "dns"

export class Reporter {
    state:any;
    node : any;
    setAt:any;
    constructor() {
      this.state = this.node = null
      this.setAt = 0
    }
  
    clearState() {
      if (this.state) {
        document.body.removeChild(this.node)
        this.state = this.node = null
        this.setAt = 0
      }
    }
  
    failure(err:any) {
      this.show("fail", err.toString())
    }
  
    delay(err:any) {
      if (this.state == "fail") return
      this.show("delay", err.toString())
    }
  
    show(type:any, message:any) {
      this.clearState()
      this.state = type
      this.setAt = Date.now()
      this.node = document.body.appendChild(document.createElement("div"))
      this.node.className = "ProseMirror-report ProseMirror-report-" + type
      this.node.textContent = message
    }
  
    success() {
      if (this.state == "fail" && this.setAt > Date.now() - 1000 * 10)
        setTimeout(() => this.success(), 5000)
      else
        this.clearState()
    }
  }