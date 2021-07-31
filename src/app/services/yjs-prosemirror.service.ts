import { Injector, Injectable, Renderer2 } from '@angular/core';
import * as verTrFunc from './versionTrackingFunctions'

import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { ySyncPlugin, yCursorPlugin, yUndoPlugin, undo, redo} from 'y-prosemirror'
import * as random from 'lib0/random.js'
import * as awarenessProtocol from 'y-protocols/awareness.js'

import { EditorState, Plugin, Transaction } from "prosemirror-state"
import {EditorView } from "prosemirror-view"
import { Slice, } from "prosemirror-model"
import {
  makeBlockMathInputRule, makeInlineMathInputRule,
  REGEX_INLINE_MATH_DOLLARS, REGEX_BLOCK_MATH_DOLLARS
} from "@benrbray/prosemirror-math";
import { mathPlugin, mathBackspaceCmd, insertMathCmd, mathSerializer } from "@benrbray/prosemirror-math";
import { chainCommands, deleteSelection, selectNodeBackward, joinBackward, Command, newlineInCode, createParagraphNear, liftEmptyBlock, splitBlock } from "prosemirror-commands";
import { keymap } from "prosemirror-keymap";
import { inputRules, } from "prosemirror-inputrules";
import { CustomView } from './custom-view';
import { MenuView, menuPlugin,icon,headingMenu } from './menuView';
import { toggleMark, setBlockType, wrapIn } from "prosemirror-commands"
import { mySchema } from './schema';

@Injectable({
  providedIn: 'root',
})

export class YjsProsemirrorService {

  inlineMathInputRule = makeInlineMathInputRule(REGEX_INLINE_MATH_DOLLARS, mySchema.nodes.math_inline);
  blockMathInputRule = makeBlockMathInputRule(REGEX_BLOCK_MATH_DOLLARS, mySchema.nodes.math_display);

  ydoc = new Y.Doc()
  provider = new WebrtcProvider('webrtc-test', this.ydoc, {
    signaling: ['ws://localhost:4444'],
    password: null,
    awareness: new awarenessProtocol.Awareness(this.ydoc),
    maxConns: 20 + Math.floor(random.rand() * 15),
    filterBcConns: false,
    peerOpts: {},
  })
  type = this.ydoc.getXmlFragment('prosemirror')
  versions = this.ydoc.getArray('versions');
  

  
  user = random.oneOf(verTrFunc.testUsers)
  parentElement: any

  init(element: HTMLElement, renderer: Renderer2) {
    let emitBtn = document.createElement('button')
    emitBtn.textContent = 'emit';
    emitBtn.addEventListener('click', () => {
      this.provider.emit('emit', ['asd'])
    })
    console.log(element);


    
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
    let colors = verTrFunc.colors
    let edState = EditorState.create({
      schema: mySchema,
      plugins: [

        ySyncPlugin(this.type, { colors, permanentUserData }),
        yCursorPlugin(this.provider.awareness),
        yUndoPlugin(),
        mathPlugin,
        keymap({
          'Mod-z': undo,
          'Mod-y': redo,
          'Mod-Shift-z': redo,
          "Mod-Space": insertMathCmd(mySchema.nodes.math_inline),
          "Enter": chainCommands(newlineInCode, createParagraphNear, liftEmptyBlock, splitBlock),
          // modify the default keymap chain for backspace
          "Backspace": chainCommands(deleteSelection, mathBackspaceCmd, joinBackward, selectNodeBackward),
        }),
        inputRules({ rules: [this.inlineMathInputRule, this.blockMathInputRule] }),
        menuPlugin([
          { command: toggleMark(mySchema.marks.strong), dom: icon(" B ", "strong") },
          { command: toggleMark(mySchema.marks.em), dom: icon(" i ", "em") },
          { command: setBlockType(mySchema.nodes.paragraph), dom: icon(" p ", "paragraph") },
          headingMenu(1), headingMenu(2), headingMenu(3),
          { command: wrapIn(mySchema.nodes.blockquote), dom: icon(" > ", "blockquote") },
          { command: setBlockType(mySchema.nodes.math_display), dom: icon("addMathBlock", "Math") },
        ])
      ]
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
    verTrFunc.attachVersion(this.parentElement, this.ydoc, view)
    renderer.appendChild(element, this.parentElement);
    renderer.appendChild(element, emitBtn);

  }
  constructor(private injector: Injector) {
  }
}
