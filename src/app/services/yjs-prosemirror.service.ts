import { Injector, Injectable, Renderer2 } from '@angular/core';
import * as verTrFunc from './versionTrackingFunctions'
import {AddCommentDialogComponent} from '../add-comment-dialog/add-comment-dialog.component'

import * as Y from 'yjs';
import { SignalingConn, WebrtcProvider } from 'y-webrtc';
import { ySyncPlugin, yCursorPlugin, yUndoPlugin, undo, redo } from 'y-prosemirror'
import * as random from 'lib0/random.js'
import * as awarenessProtocol from 'y-protocols/awareness.js'

import { EditorState, Transaction } from "prosemirror-state"
import { EditorView } from "prosemirror-view"
import { NodeType, Slice, } from "prosemirror-model"
import {
  makeBlockMathInputRule, makeInlineMathInputRule,
  REGEX_INLINE_MATH_DOLLARS, REGEX_BLOCK_MATH_DOLLARS
} from "@benrbray/prosemirror-math";
import { mathPlugin, mathBackspaceCmd, insertMathCmd, mathSerializer } from "@benrbray/prosemirror-math";
import { chainCommands, deleteSelection, selectNodeBackward, joinBackward, Command, newlineInCode, createParagraphNear, liftEmptyBlock, splitBlock } from "prosemirror-commands";
import { keymap } from "prosemirror-keymap";
import { inputRules, } from "prosemirror-inputrules";
import { CustomView } from './custom-view';
import { MenuView, menuPlugin, icon, headingMenu } from './menuView';
import { toggleMark, setBlockType, wrapIn } from "prosemirror-commands"
import { mySchema } from './schema';
import { Http2SecureServer } from 'http2';
import { Observable } from 'rxjs';
import { ColorDef } from 'y-prosemirror/dist/src/plugins/sync-plugin';
import { MatDialog } from '@angular/material/dialog';

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
  color = random.oneOf(verTrFunc.colors)
  parentElement: any
  constructor(private injector: Injector) { 
    
  }

  

  printSelention(commentsContainer:any): Command {
    
    return function (editorstate: EditorState,dispatch?:(tr:Transaction)=>void): boolean {
      let { $from, $to ,empty} = editorstate.selection
      if($from ==$to || empty) return true
      if(dispatch){
        console.log($from.pos, $to.pos);
        console.log(editorstate.selection);
        
      }
      return true;
    }
  }
  init(element: HTMLElement,commentsContainer:any, renderer: Renderer2) {
    let emitBtn = document.createElement('button')
    emitBtn.textContent = 'emit';
    let signalingConn: SignalingConn = this.provider.signalingConns.find(el => el.url == "ws://localhost:4444")
    emitBtn.addEventListener('click', () => {
      signalingConn.send('asdasdasdasd')
    })



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
    let colorMapping: Map<string, ColorDef> = new Map([[this.user.username, this.color],]);
    let permanentUserData = new Y.PermanentUserData(this.ydoc)
    permanentUserData.setUserMapping(this.ydoc, this.ydoc.clientID, this.user.username)
    this.ydoc.gc = false
    let colors = verTrFunc.colors
    let edState = EditorState.create({
      schema: mySchema,
      plugins: [

        ySyncPlugin(this.type, { colors, colorMapping, permanentUserData }),
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
          //"Ctrl-Alt-c": chainCommands(this.printSelention),
        }),
        inputRules({ rules: [this.inlineMathInputRule, this.blockMathInputRule] }),
        menuPlugin([
          { command: toggleMark(mySchema.marks.strong), dom: icon(" B ", "strong") },
          { command: toggleMark(mySchema.marks.em), dom: icon(" i ", "em") },
          { command: setBlockType(mySchema.nodes.paragraph), dom: icon(" p ", "paragraph") },
          headingMenu(1), headingMenu(2), headingMenu(3),
          { command: wrapIn(mySchema.nodes.blockquote), dom: icon(" > ", "blockquote") },
          { command: setBlockType(mySchema.nodes.math_display), dom: icon("addMathBlock", "Math") },
          { command: insertMathCmd(mySchema.nodes.math_inline), dom: icon("addMAthInline", "Math inline") },
          { command: this.printSelention(commentsContainer), dom: icon("comment", "Add a comment") },
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
  
}
