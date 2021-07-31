import { Command, setBlockType } from "prosemirror-commands"
import { EditorView } from "prosemirror-view"
import { Plugin } from 'prosemirror-state'
import {mySchema} from './schema'

class MenuView {
  items
  editorView
  dom: any
  constructor(items: { command: Command, dom: HTMLElement }[], editorView: EditorView) {
    this.items = items
    this.editorView = editorView

    this.dom = document.createElement("div")
    this.dom.className = "menubar"
    items.forEach(({ dom }) => this.dom.appendChild(dom))
    this.update()

    this.dom.addEventListener("mousedown", (e: any) => {
      e.preventDefault()
      editorView.focus()
      items.forEach(({ command, dom }) => {
        if (dom.contains(e.target))
          command(editorView.state, editorView.dispatch, editorView)
      })
    })
  }

  update() {
    this.items.forEach(({ command, dom }) => {
      let active = command(this.editorView.state, undefined, this.editorView)
      dom.style.display = active ? "" : "none"
    })
  }

  destroy() { this.dom.remove() }
}
function menuPlugin(items: { command: Command, dom: HTMLElement }[]) {
  return new Plugin({
    view(editorView: EditorView) {
      let menuView = new MenuView(items, editorView)
      editorView?.dom?.parentNode?.insertBefore(menuView.dom, editorView.dom)
      return menuView
    }
  })
}

function icon(text: string, name: string) {
  let span = document.createElement("button")
  span.className = "menuicon " + name
  span.title = name
  span.textContent = text
  return span
}

function headingMenu(level: number) {
  return {
    command: setBlockType(mySchema.nodes.heading, { level }),
    dom: icon("H" + level, "heading")
  }
}
export { MenuView, menuPlugin,icon,headingMenu}