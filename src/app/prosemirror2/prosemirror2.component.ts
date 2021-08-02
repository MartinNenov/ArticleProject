import { Component, OnInit } from '@angular/core';
import { exampleSetup, buildMenuItems } from "./prosemirror-example-setup-ts"
import { Step } from "prosemirror-transform"
import { EditorState } from "prosemirror-state"
import { EditorView } from "prosemirror-view"
import { history } from "prosemirror-history"
import { collab, receiveTransaction, sendableSteps, getVersion } from "prosemirror-collab"
import { MenuItem } from "prosemirror-menu"
import crel from "crelt"

import { schema } from "./prosemirror-example-setup-ts/schema"
import { GET, POST } from "./prosemirror-example-setup-ts/http"
import { Reporter } from "./prosemirror-example-setup-ts/reporter"
import { commentPlugin, commentUI, addAnnotation, annotationIcon } from "./prosemirror-example-setup-ts/comments"

const report = new Reporter()

class State {
  edit
  comm
  constructor(edit: any, comm: any) {
    this.edit = edit
    this.comm = comm
  }
}

let info:any = {
  name: document.querySelector("#docname"),
  users: document.querySelector("#users")
}

function userString(n:any) {
  return "(" + n + " user" + (n == 1 ? "" : "s") + ")"
}

let menu = buildMenuItems(schema)

class EditorConnection {
  report 
  url 
  state = new State(null, "start")
  request :any
  backOff = 0
  view :any
  window:any;
  constructor(report: any, url: any,window:any) {
    this.report = report
    this.url = url
    this.state = new State(null, "start")
    this.request = null
    this.backOff = 0
    this.view = null
    this.dispatch = this.dispatch.bind(this)
    this.start()
    this.window - window
  }

  // All state changes go through this
  dispatch(action: any) {
    let newEditState = null
    if (action.type == "loaded") {
      info.users.textContent = userString(action.users) // FIXME ewww
      let editState = EditorState.create({
        doc: action.doc,
        plugins: exampleSetup({ schema, history: false, menuContent: menu.fullMenu }).concat([
          history({ preserveItems: true } as any),
          collab({ version: action.version }),
          commentPlugin,
          commentUI((transaction :any) => this.dispatch({ type: "transaction", transaction }))
        ]),
        comments: action.comments
      } as any)
      this.state = new State(editState, "poll")
      this.poll()
    } else if (action.type == "restart") {
      this.state = new State(null, "start")
      this.start()
    } else if (action.type == "poll") {
      this.state = new State(this.state.edit, "poll")
      this.poll()
    } else if (action.type == "recover") {
      if (action.error.status && action.error.status < 500) {
        this.report.failure(action.error)
        this.state = new State(null, null)
      } else {
        this.state = new State(this.state.edit, "recover")
        this.recover(action.error)
      }
    } else if (action.type == "transaction") {
      newEditState = this.state.edit.apply(action.transaction)
    }

    if (newEditState) {
      let sendable
      if (newEditState.doc.content.size > 40000) {
        if (this.state.comm != "detached") this.report.failure("Document too big. Detached.")
        this.state = new State(newEditState, "detached")
      } else if ((this.state.comm == "poll" || action.requestDone) && (sendable = this.sendable(newEditState))) {
        this.closeRequest()
        this.state = new State(newEditState, "send")
        this.send(newEditState, sendable)
      } else if (action.requestDone) {
        this.state = new State(newEditState, "poll")
        this.poll()
      } else {
        this.state = new State(newEditState, this.state.comm)
      }
    }

    // Sync the editor with this.state.edit
    if (this.state.edit) {
      if (this.view)
        this.view.updateState(this.state.edit)
      else
        this.setView(new EditorView(document.querySelector("#editor") as any, {
          state: this.state.edit,
          dispatchTransaction: transaction => this.dispatch({ type: "transaction", transaction })
        }))
    } else this.setView(null)
  }

  // Load the document from the server and start up
  start() {
    this.run(GET(this.url)).then((data: any) => {
      data = JSON.parse(data)
      this.report.success()
      this.backOff = 0
      this.dispatch({
        type: "loaded",
        doc: schema.nodeFromJSON(data.doc),
        version: data.version,
        users: data.users,
        comments: { version: data.commentVersion, comments: data.comments }
      })
    }, (err: any) => {
      this.report.failure(err)
    })
  }

  // Send a request for events that have happened since the version
  // of the document that the client knows about. This request waits
  // for a new version of the document to be created if the client
  // is already up-to-date.
  poll() {
    let query = "version=" + getVersion(this.state.edit) + "&commentVersion=" + commentPlugin.getState(this.state.edit).version
    this.run(GET(this.url + "/events?" + query)).then((data: any) => {
      this.report.success()
      data = JSON.parse(data)
      this.backOff = 0
      if (data.steps && (data.steps.length || data.comment.length)) {
        let tr = receiveTransaction(this.state.edit, data.steps.map((j:any) => Step.fromJSON(schema, j)), data.clientIDs)
        tr.setMeta(commentPlugin, { type: "receive", version: data.commentVersion, events: data.comment, sent: 0 })
        this.dispatch({ type: "transaction", transaction: tr, requestDone: true })
      } else {
        this.poll()
      }
      info.users.textContent = userString(data.users)
    }, (err: any) => {
      if (err.status == 410 || badVersion(err)) {
        // Too far behind. Revert to server state
        this.report.failure(err)
        this.dispatch({ type: "restart" })
      } else if (err) {
        this.dispatch({ type: "recover", error: err })
      }
    })
  }

  sendable(editState: any):any {
    let steps = sendableSteps(editState)
    let comments = commentPlugin.getState(editState).unsentEvents()
    if (steps || comments.length) return { steps, comments }
    return;
  }

  // Send the given steps to the server
  send(editState: any, obj: { steps: any, comments: any }) {
    let json = JSON.stringify({
      version: getVersion(editState),
      steps: obj.steps ? obj.steps.steps.map((s: any) => s.toJSON()) : [],
      clientID: obj.steps ? obj.steps.clientID : 0,
      comment: obj.comments || []
    })
    this.run(POST(this.url + "/events", json, "application/json")).then((data: any) => {
      this.report.success()
      this.backOff = 0
      let tr = (obj.steps)
        ? receiveTransaction(this.state.edit, obj.steps.steps, repeat(obj.steps.clientID, obj.steps.steps.length))
        : this.state.edit.tr
      tr.setMeta(commentPlugin, { type: "receive", version: JSON.parse(data).commentVersion, events: [], sent: obj.comments.length })
      this.dispatch({ type: "transaction", transaction: tr, requestDone: true })
    }, (err: any) => {
      if (err.status == 409) {
        // The client's document conflicts with the server's version.
        // Poll for changes and then try again.
        this.backOff = 0
        this.dispatch({ type: "poll" })
      } else if (badVersion(err)) {
        this.report.failure(err)
        this.dispatch({ type: "restart" })
      } else {
        this.dispatch({ type: "recover", error: err })
      }
    })
  }

  // Try to recover from an error
  recover(err: any) {
    let newBackOff = this.backOff ? Math.min(this.backOff * 2, 6e4) : 200
    if (newBackOff > 1000 && this.backOff < 1000) this.report.delay(err)
    this.backOff = newBackOff
    setTimeout(() => {
      if (this.state.comm == "recover") this.dispatch({ type: "poll" })
    }, this.backOff)
  }

  closeRequest() {
    if (this.request) {
      this.request.abort()
      this.request = null
    }
  }

  run(request: any) {
    return this.request = request
  }

  close() {
    this.closeRequest()
    this.setView(null)
  }

  setView(view: any) {
    if (this.view) this.view.destroy()
    this.view = this.window.view = view
  }
}

function badVersion(err: any) {
  return err.status == 400 && /invalid version/i.test(err)
}

function repeat(val:any, n:any) {
  let result = []
  for (let i = 0; i < n; i++) result.push(val)
  return result
}

@Component({
  selector: 'app-prosemirror2',
  templateUrl: './prosemirror2.component.html',
  styleUrls: ['./prosemirror2.component.scss']
})
export class Prosemirror2Component implements OnInit {
  
  
  annotationMenuItem = new MenuItem({
    title: "Add an annotation",
    run: addAnnotation,
    select: state => addAnnotation(state),
    icon: annotationIcon
  })
  menu = buildMenuItems(schema)
  
  
  
  
  
  
  docList : any
  showDocList(node:any, list:any) {
    if (this.docList) this.docList.parentNode.removeChild(this.docList)
  
    let ul = this.docList = document.body.appendChild(crel("ul", {class: "doclist"}))
    list.forEach((doc:any) => {
      ul.appendChild(crel("li", {"data-name": doc.id},
                          doc.id + " " + userString(doc.users)))
    })
    ul.appendChild(crel("li", {"data-new": "true", style: "border-top: 1px solid silver; margin-top: 2px"},
                        "Create a new document"))
  
    let rect = node.getBoundingClientRect()
    ul.style.top = (rect.bottom + 10 + pageYOffset - ul.offsetHeight) + "px"
    ul.style.left = (rect.left - 5 + pageXOffset) + "px"
  
    ul.addEventListener("click", (e:any) => {
      if (e.target.nodeName == "LI") {
        ul?.parentNode?.removeChild(ul)
        this.docList = null
        if (e.target.hasAttribute("data-name"))
          location.hash = "#edit-" + encodeURIComponent(e.target.getAttribute("data-name"))
        else
          this.newDocument()
      }
    })
  }
  
  
  newDocument() {
    let name = prompt("Name the new document", "")
    if (name)
      location.hash = "#edit-" + encodeURIComponent(name)
  }
  
  connection :any
  
  
  connectFromHash(window:any):any {
    let isID = /^#edit-(.+)/.exec(location.hash)
    if (isID) {
      if (this.connection) this.connection.close()
      console.log(info);
      info.name.textContent = decodeURIComponent(isID[1])
      this.connection = window.connection = new EditorConnection(report, "/collab-backend/docs/" + isID[1],window)
      this.connection.request.then(() => this.connection.view.focus())
      return true
    }
  }
  
  constructor(private window: Window) { 
    
    this.menu.fullMenu[0].push(this.annotationMenuItem)
    addEventListener("hashchange", this.connectFromHash)
    this.connectFromHash(window) || (location.hash = "#edit-Example")
    document.addEventListener("click", () => {
      if (this.docList) {
        this.docList.parentNode.removeChild(this.docList)
        this.docList = null
      }
    })
    document.querySelector("#changedoc")?.addEventListener("click", e => {
      GET("/collab-backend/docs/").then((data:any) => this.showDocList(e.target, JSON.parse(data)),
                                        (err:any) => report.failure(err))
    })

  }

  ngOnInit(): void {
  }



}
