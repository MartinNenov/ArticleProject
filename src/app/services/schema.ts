import { Schema, DOMParser, Node, Slice, NodeType } from "prosemirror-model"
import { nodes, marks, } from "prosemirror-schema-basic"


let mySchema = new Schema({
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
        toDOM: () => {
          return ["math-display", { class: "math-node" }, 0]
        },
        parseDOM: [{
          tag: "math-display"  // important!
        }]
      },
      text: {
        group: "inline"
      }
    },
    marks: marks
  });

let node = mySchema.node.bind(mySchema);
let text = mySchema.text.bind(mySchema);
let example = mySchema.nodes.example;
let paragraph = mySchema.nodes.paragraph;
let heading = mySchema.nodes.heading;

export {mySchema}