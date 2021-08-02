import { Schema } from 'prosemirror-model'
const {schema: base} = require("prosemirror-schema-basic")
const {addListNodes} = require("prosemirror-schema-list")
let schema = new Schema({
  nodes: addListNodes(base.spec.nodes, "paragraph block*", "block"),
  marks: base.spec.marks
})
export {schema}

