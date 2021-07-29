import { Directive, ViewContainerRef, Injector } from '@angular/core';

import { EditorState, Plugin } from "prosemirror-state"
import { EditorView } from "prosemirror-view"
import { Schema, DOMParser, Node } from "prosemirror-model"
import { schema } from "prosemirror-schema-basic"
import { addListNodes } from "prosemirror-schema-list"
//import { exampleSetup } from "prosemirror-example-setup"
import {
  makeBlockMathInputRule, makeInlineMathInputRule,
  REGEX_INLINE_MATH_DOLLARS, REGEX_BLOCK_MATH_DOLLARS
} from "@benrbray/prosemirror-math";
import { mathPlugin, mathBackspaceCmd, insertMathCmd, mathSerializer } from "@benrbray/prosemirror-math";
import { chainCommands, deleteSelection, selectNodeBackward, joinBackward, Command, newlineInCode, createParagraphNear, liftEmptyBlock, splitBlock } from "prosemirror-commands";
import { keymap } from "prosemirror-keymap";
import { inputRules } from "prosemirror-inputrules";



// create input rules (using default regex)


import { CustomView } from './custom-view';
import { ProsemirrorModule } from './prosemirror.module';

//const nodes: any = addListNodes(schema.spec.nodes, "paragraph block*", "block");


/* let plugins: Plugin[] = [
  mathPlugin,
  keymap({
    "Mod-Space": insertMathCmd(schema.nodes.math_inline),
    // modify the default keymap chain for backspace
    "Backspace": chainCommands(deleteSelection, mathBackspaceCmd, joinBackward, selectNodeBackward),
  }),
  inputRules({ rules: [inlineMathInputRule, blockMathInputRule] })
]; */

//let state = 
let mySchema = new Schema({
  nodes: {
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
      toDOM: () => ["math-display", { class: "math-node" }, 0],
      parseDOM: [{
        tag: "math-display"  // important!
      }]
    },
    text: {
      group: "inline"
    }
  }
  /* nodes: {
    doc: {
      content: "block+"
    },
    paragraph: {
      content: "inline*",
      group: "block",
      parseDOM: [{ tag: "p" }],
      toDOM() { return ["p", 0]; }
    },
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
      toDOM: () => ["math-display", { class: "math-node" }, 0],
      parseDOM: [{
        tag: "math-display"  // important!
      }]
    },
    text: {
      group: "inline"
    }
  }*/
}
);

const node = mySchema.node.bind(mySchema);
const text = mySchema.text.bind(mySchema);
const example = mySchema.nodes.example;
const paragraph = mySchema.nodes.paragraph;
const heading = mySchema.nodes.heading;
const inlineMathInputRule = makeInlineMathInputRule(REGEX_INLINE_MATH_DOLLARS, mySchema.nodes.math_inline);
const blockMathInputRule = makeBlockMathInputRule(REGEX_BLOCK_MATH_DOLLARS, mySchema.nodes.math_display);

@Directive({
  selector: '[appEditor]'
})
export class EditorDirective {

  view = new EditorView(this.viewContainerRef.element.nativeElement, {
    state: EditorState.create({
      schema: mySchema,
      plugins: [
        mathPlugin,
        keymap({
          "Mod-Space": insertMathCmd(schema.nodes.math_inline),
          //"Enter":chainCommands(newlineInCode, createParagraphNear, liftEmptyBlock, splitBlock),
          // modify the default keymap chain for backspace
          "Backspace": chainCommands(deleteSelection, mathBackspaceCmd, joinBackward, selectNodeBackward),
        }),
        inputRules({ rules: [inlineMathInputRule, blockMathInputRule] })
      ],
      doc: node('doc', {}, [
        /* this.heading.create({}, [this.text('Test document')]),
        this.example.create({}, []), */
        paragraph.create({}, [text('Some paragraph to drag after')]),
        paragraph.create({}, [text('Some paragraph to drag after')]),
        paragraph.create({}, [text('Some paragraph to drag after')])
      ])
    }),
    clipboardTextSerializer: (slice) => { return mathSerializer.serializeSlice(slice) },
    nodeViews: {
      example: (node, nodeView, getPos) => new CustomView(node, nodeView, getPos, this.injector)
    }
  })
  /* view = new EditorView(this.viewContainerRef.element.nativeElement, {
    state: EditorState.create({
      doc: node('doc', {}, [
        heading.create({}, [text('Test document')]),
        example.create({}, []),
        paragraph.create({}, [text('Some paragraph to drag after')])
      ]),
      plugins: exampleSetup({ schema: mySchema }),
    }),
    nodeViews: {
      example: (node, nodeView, getPos) => new CustomView(node, nodeView, getPos, this.injector)
    }
  }); */

  constructor(public viewContainerRef: ViewContainerRef, private injector: Injector) {

  }

}
