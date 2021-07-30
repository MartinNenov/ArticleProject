import { Injector, Injectable, Renderer2 } from '@angular/core';

import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { ySyncPlugin, yCursorPlugin, yUndoPlugin, undo, redo, ySyncPluginKey } from 'y-prosemirror'
import * as dom from 'lib0/dom.js'
import * as pair from 'lib0/pair.js'
import * as random from 'lib0/random.js'
import { html, render } from 'lit-html'

import { EditorState, Plugin } from "prosemirror-state"
import { EditorView } from "prosemirror-view"
import { Schema, DOMParser, Node, Slice, NodeType } from "prosemirror-model"
import { nodes,marks, } from "prosemirror-schema-basic"
import { addListNodes } from "prosemirror-schema-list"
import {
  makeBlockMathInputRule, makeInlineMathInputRule,
  REGEX_INLINE_MATH_DOLLARS, REGEX_BLOCK_MATH_DOLLARS
} from "@benrbray/prosemirror-math";
import { mathPlugin, mathBackspaceCmd, insertMathCmd, mathSerializer } from "@benrbray/prosemirror-math";
import { chainCommands, deleteSelection, selectNodeBackward, joinBackward, Command, newlineInCode, createParagraphNear, liftEmptyBlock, splitBlock } from "prosemirror-commands";
import { keymap } from "prosemirror-keymap";
import { closeDoubleQuote, inputRules } from "prosemirror-inputrules";
import { CustomView } from './custom-view';
import { YArray } from 'yjs/dist/src/internals';
import { Snapshot } from 'yjs';
import { MenuView } from './menuView';
import { toggleMark, setBlockType, wrapIn } from "prosemirror-commands"

@Injectable({
  providedIn: 'root',
})

export class YjsProsemirrorService {
  
  mySchema = new Schema({
    nodes: {
      ...nodes,
      doc: {
        content: "block+"
      },
      paragraph: {
        content: "inline*",
        group: "block",
        parseDOM: [{ tag: "p" }],
        toDOM() { return ["p", 0]; }
      },
      /* fragmentBox: {
        content: "text",
        group: "block",
        parseDOM: ()=>{},
        toDOM() { return ["p", 0]; }
      }, */
      math_inline: {               // important!
        group: "inline math",
        content: "text*",        // important!
        inline: true,            // important!
        atom: true,              // important!
        toDOM: () => ["math-inline", { class: "math-node" }, 0],
        parseDOM: [{
          tag: "math-inline"   // important!
        }]
      },
      math_display: {              // important!
        group: "block math",
        content: "text*",        // important!
        atom: true,              // important!
        code: true,              // important!
        toDOM: () => ["math-display", { class: "math-node",style:"border-radius: 16px;border: 1px solid #ccc" }, 0],
        parseDOM: [{
          tag: "math-display"  // important!
        }]
      },
      text: {
        group: "inline"
      }
    },
    marks:marks
  });
  node = this.mySchema.node.bind(this.mySchema);
  text = this.mySchema.text.bind(this.mySchema);
  example = this.mySchema.nodes.example;
  paragraph = this.mySchema.nodes.paragraph;
  heading = this.mySchema.nodes.heading;
  inlineMathInputRule = makeInlineMathInputRule(REGEX_INLINE_MATH_DOLLARS, this.mySchema.nodes.math_inline);
  blockMathInputRule = makeBlockMathInputRule(REGEX_BLOCK_MATH_DOLLARS, this.mySchema.nodes.math_display);

  ydoc = new Y.Doc()
  provider = new WebrtcProvider('prosemirror-debug', this.ydoc)
  type = this.ydoc.getXmlFragment('prosemirror')
  versions = this.ydoc.getArray('versions');
  addVersion(doc: Y.Doc): void {
    let versions: YArray<{
      date: number,
      snapshot: Uint8Array,
      clientID: number
    }> = doc.getArray('versions')
    let prevVersion = versions.length === 0 ? null : versions.get(versions.length - 1)
    let prevSnapshot = prevVersion === null ? Y.emptySnapshot : Y.decodeSnapshot(prevVersion.snapshot)
    let snapshot = Y.snapshot(doc)
    if (prevVersion !== null && prevSnapshot.sv.get(prevVersion.clientID) !== undefined) {
      // account for the action of adding a version to ydoc
      prevSnapshot.sv.set(prevVersion.clientID, prevSnapshot.sv.get(prevVersion.clientID)! + 1)
    }
    console.log(snapshot, Y.equalSnapshots(prevSnapshot, snapshot));
    if (!Y.equalSnapshots(prevSnapshot, snapshot)) {
      versions.push([{
        date: new Date().getTime(),
        snapshot: Y.encodeSnapshot(snapshot),
        clientID: doc.clientID
      }])
    }
  }

  liveTracking = (dom.element('input', [
    pair.create('type', 'checkbox'),
    pair.create('name', 'yjs-live-tracking'),
    pair.create('value', 'Live Tracking ')
  ]) as HTMLInputElement)

  updateLiveTrackingState = (editorstate: any) => {
    setTimeout(() => {
      const syncState = ySyncPluginKey.getState(editorstate.state)
      this.liveTracking.checked = syncState.prevSnapshot != null && syncState.snapshot == null
    }, 500)
  }

  renderVersion = (editorview: EditorView, version: {
    date: number,
    snapshot: Uint8Array,
    clientID: number
  }, prevSnapshot: Uint8Array | null) => {
    console.log(Y.decodeSnapshot(version.snapshot))
    editorview.dispatch(editorview.state.tr.setMeta(ySyncPluginKey, { snapshot: Y.decodeSnapshot(version.snapshot), prevSnapshot: prevSnapshot == null ? Y.emptySnapshot : Y.decodeSnapshot(prevSnapshot) }))
    this.updateLiveTrackingState(editorview)
  }
  unrenderVersion = (editorview: EditorView) => {
    const binding = ySyncPluginKey.getState(editorview.state).binding
    if (binding != null) {
      binding.unrenderSnapshot()
    }
    this.updateLiveTrackingState(editorview)
  }
  versionTemplate = (editorview: EditorView, version: {
    date: number,
    snapshot: Uint8Array,
    clientID: number
  }, prevSnapshot: Uint8Array | null) => html`<div class="version-list" @click=${(e: any) => this.renderVersion(editorview, version, prevSnapshot)}>${new Date(version.date).toLocaleString()}</div>`

  versionList = (editorview: EditorView, doc: Y.Doc) => {
    const versions: YArray<{
      date: number,
      snapshot: Uint8Array,
      clientID: number
    }> = doc.getArray('versions')
    return html`<div>${versions.length > 0 ? versions.map((version: {
      date: number,
      snapshot: Uint8Array,
      clientID: number
    }, i) => this.versionTemplate(editorview, version, i > 0 ? versions.get(i - 1).snapshot : null)) : html`<div>No snapshots..</div>`}</div>`
  }

  snapshotButton = (doc: Y.Doc) => {
    return html`<button @click=${(e: any) => this.addVersion(doc)}>Snapshot</button>`
  }

  attachVersion = (parent: HTMLElement, doc: Y.Doc, editorview: EditorView) => {
    let open = false
    const rerender = () => {
      render(html`<div class="version-modal" ?hidden=${open}>${this.snapshotButton(doc)}${this.versionList(editorview, doc)}</div>`, vContainer)
    }
    this.updateLiveTrackingState(editorview)
    this.liveTracking.addEventListener('click', e => {
      if (this.liveTracking.checked) {
        const versions: YArray<{
          date: number,
          snapshot: Uint8Array,
          clientID: number
        }> = doc.getArray('versions')
        const lastVersion = versions.length > 0 ? Y.decodeSnapshot(versions.get(versions.length - 1).snapshot) : Y.emptySnapshot
        editorview.dispatch(editorview.state.tr.setMeta(ySyncPluginKey, { snapshot: null, prevSnapshot: lastVersion }))
      } else {
        this.unrenderVersion(editorview)
      }
    })
    parent.insertBefore(this.liveTracking, null)
    parent.insertBefore(dom.element('label', [
      pair.create('for', 'yjs-live-tracking')
    ], [
      dom.text('Live Tracking ')
    ]), null)
    const btn = document.createElement('button')
    btn.setAttribute('type', 'button')
    btn.textContent = 'Versions'
    btn.addEventListener('click', () => {
      open = !open
      this.unrenderVersion(editorview)
      rerender()
    })
    const vContainer = document.createElement('div')
    parent.insertBefore(btn, null)
    parent.insertBefore(vContainer, null)
    doc.getArray('versions').observe(rerender)
    rerender()
  }

  testUsers = [
    { username: 'Alice', color: '#ecd444', lightColor: '#ecd44433' },
    { username: 'Bob', color: '#ee6352', lightColor: '#ee635233' },
    { username: 'Max', color: '#6eeb83', lightColor: '#6eeb8333' }
  ]

  colors = [
    { light: '#ecd44433', dark: '#ecd444' },
    { light: '#ee635233', dark: '#ee6352' },
    { light: '#6eeb8333', dark: '#6eeb83' }
  ]

  menuPlugin(items: { command: Command, dom: HTMLElement }[]) {
    return new Plugin({
      view(editorView: EditorView) {
        let menuView = new MenuView(items, editorView)
        editorView?.dom?.parentNode?.insertBefore(menuView.dom, editorView.dom)
        return menuView
      }
    })
  }

  icon(text: string, name: string) {
    let span = document.createElement("button")
    span.className = "menuicon " + name
    span.title = name
    span.textContent = text
    return span
  }

  headingMenu(level: number) {
    return {
      command: setBlockType(this.mySchema.nodes.heading, { level }),
      dom: this.icon("H" + level, "heading")
    }
  }

  

  user = random.oneOf(this.testUsers)
  parentElement: any
  init(element: HTMLElement, renderer: Renderer2) {
    console.log(element);


    /* let math_inline = new NodeType;
    math_inline.name = "math_inline";
    math_inline.spec = {               // important!
      group: "inline math",
      content: "text*",        // important!
      inline: true,            // important!
      atom: true,              // important!
      toDOM: () => ["math-inline", { class: "math-node" }, 0],
      parseDOM: [{
        tag: "math-inline"   // important!
      }]
    }

    let math_display = new NodeType;
    math_display.name = "math_display";
    math_display.spec = {              // important!
      group: "block math",
      content: "text*",        // important!
      atom: true,              // important!
      code: true,              // important!
      toDOM: () => ["math-display", { class: "math-node" }, 0],
      parseDOM: [{
        tag: "math-display"  // important!
      }]
    }

    this.mySchema.node(math_inline);
    this.mySchema.node(math_display); */
    let connectionBTN = renderer.createElement('button');
    connectionBTN.textContent = 'Disconnect'
    this.parentElement = renderer.createElement('dib');
    let editorContainer = renderer.createElement('div');
    connectionBTN.addEventListener('click', () => {
      if (this.provider.shouldConnect) {
        this.provider.disconnect()
        connectionBTN.textContent = 'Connect'
      } else {
        this.provider.connect()
        connectionBTN.textContent = 'Disconnect'
      }
    })
    let permanentUserData = new Y.PermanentUserData(this.ydoc)
    permanentUserData.setUserMapping(this.ydoc, this.ydoc.clientID, this.user.username)
    this.ydoc.gc = false
    let colors = this.colors
    let edState = EditorState.create({
      schema: this.mySchema,
      plugins: [

        ySyncPlugin(this.type, { colors, permanentUserData }),
        yCursorPlugin(this.provider.awareness),
        yUndoPlugin(),
        mathPlugin,
        keymap({
          'Mod-z': undo,
          'Mod-y': redo,
          'Mod-Shift-z': redo,
          "Mod-Space": insertMathCmd(this.mySchema.nodes.math_inline),
          "Enter": chainCommands(newlineInCode, createParagraphNear, liftEmptyBlock, splitBlock),
          // modify the default keymap chain for backspace
          "Backspace": chainCommands(deleteSelection, mathBackspaceCmd, joinBackward, selectNodeBackward),
        }),
        inputRules({ rules: [this.inlineMathInputRule, this.blockMathInputRule] }),
        this.menuPlugin([
          { command: toggleMark(this.mySchema.marks.strong), dom: this.icon(" B ", "strong") },
          { command: toggleMark(this.mySchema.marks.em), dom: this.icon(" i ", "em") },
          { command: setBlockType(this.mySchema.nodes.paragraph), dom: this.icon(" p ", "paragraph") },
          this.headingMenu(1), this.headingMenu(2), this.headingMenu(3),
          { command: wrapIn(this.mySchema.nodes.blockquote), dom: this.icon(" > ", "blockquote") },
          { command: setBlockType(this.mySchema.nodes.math_display), dom: this.icon("addMathBlock", "Math") },
          //{ command: wrapIn(this.mySchema.nodes.math_inline), dom: this.icon("addMathInline", "Math") },
        ])
      ]/* .concat(exampleSetup({mySchema}))  ,
      doc: node('doc', {}, [
        this.heading.create({}, [this.text('Test document')]),
        this.example.create({}, []), 
        paragraph.create({}, [text('Some paragraph to drag after')]),
        paragraph.create({}, [text('Some paragraph to drag after')]),
        paragraph.create({}, [text('Some paragraph to drag after')])
      ]) */
    })
    let view = new EditorView(editorContainer, {

      state: edState,
      clipboardTextSerializer: (slice: Slice) => { return mathSerializer.serializeSlice(slice) },
      nodeViews: {
        example: (node, nodeView, getPos) => new CustomView(node, nodeView, getPos, this.injector)
      },
      
    })
    renderer.appendChild(this.parentElement, editorContainer)
    renderer.appendChild(this.parentElement, connectionBTN)
    this.attachVersion(this.parentElement, this.ydoc, view)
    renderer.appendChild(element, this.parentElement);

  }
  constructor(private injector: Injector) {
  }
}
