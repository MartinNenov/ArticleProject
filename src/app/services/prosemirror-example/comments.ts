import { ViewFlags } from "@angular/compiler/src/core";
import crel from "crelt"
import {Plugin} from "prosemirror-state"
import {Decoration, DecorationSet} from "prosemirror-view"

class Comment {
    id:any;
    commentsArray:any
  constructor(commentsArray:any, id:any) {
    this.id = id
    this.commentsArray = commentsArray
  }
}

function deco(from:any, to:any, comment:any) {
  return Decoration.inline(from, to, {class: "comment"}, {comment})
}

class CommentState {
    decos:any
    unsent:any
  constructor( decos:any, unsent:any) {
    this.decos = decos
    this.unsent = unsent
  }

  findComment(id:any) {
    let current = this.decos.find()
    for (let i = 0; i < current.length; i++)
      if (current[i].spec.comment.id == id) return current[i]
  }

  commentsAt(pos:any) {
    return this.decos.find(pos, pos)
  }

  apply(tr:any) {
    let action = tr.getMeta(commentPlugin), actionType = action && action.type
    console.log(action,actionType);
    if (!action && !tr.docChanged) return this
    let base:any = this
    if (actionType == "receive") base = base.receive(action, tr.doc)
    let decos = base.decos, unsent = base.unsent
    decos = decos.map(tr.mapping, tr.doc)
    if (actionType == "newComment") {
      decos = decos.add(tr.doc, [deco(action.from, action.to, action.comment)])
      unsent = unsent.concat(action)
    } else if (actionType == "deleteComment") {
      console.log(decos);
      decos = decos.remove([this.findComment(action.comment.id)])
      console.log(decos);
      unsent = unsent.concat(action)
    }
    return new CommentState(decos, unsent)
  }

  receive(obj:{version:any, events:any, sent:any}, doc:any) {
    let set = this.decos
    for (let i = 0; i < obj.events.length; i++) {
      let event = obj.events[i]
      if (event.type == "delete") {
        let found = this.findComment(event.id)
        if (found) set = set.remove([found])
      } else { // "create"
        if (!this.findComment(event.id))
          set = set.add(doc, [deco(event.from, event.to, new Comment(event.text, event.id))])
      }
    }
    return new CommentState( set, this.unsent.slice(obj.sent))
  }

  unsentEvents() {
    let result = []
    for (let i = 0; i < this.unsent.length; i++) {
      let action = this.unsent[i]
      if (action.type == "newComment") {
        let found = this.findComment(action.comment.id)
        if (found) result.push({type: "create", id: action.comment.id,
                                from: found.from, to: found.to,
                                text: action.comment.text})
      } else {
        result.push({type: "delete", id: action.comment.id})
      }
    }
    return result
  }

  static init(config:any) {
    if(config.comments == undefined){
      return new CommentState(new DecorationSet, [])
    }
    let decos = config?.comments?.comments?.map((c:any) => deco(c.from, c.to, new Comment(c.text, c.id)))
    console.log(config,config.doc, decos);
    return new CommentState(DecorationSet.create(config.doc, decos), [])
  }
}

export const commentPlugin = new Plugin({
  state: {
    init: CommentState.init,
    apply(tr, prev) { return prev?.apply(tr) }
  },
  props: {
    decorations(state) { return this.getState(state).decos }
  }
})

function randomID() {
  return Math.floor(Math.random() * 0xffffffff)
}

// Command for adding an annotation

export const addAnnotation = function(state:any, dispatch?:any) {
  let sel = state.selection
  if (sel.empty) return false
  if (dispatch) {
    let text = prompt("Annotation text", "")
    if (text)
    console.log(text);
      dispatch(state.tr.setMeta(commentPlugin, {type: "newComment", from: sel.from, to: sel.to, comment: new Comment([text], randomID())}))
      console.log(state.tr);
  }
  return true
}

export const annotationIcon = {
  width: 1024, height: 1024,
  path: "M512 219q-116 0-218 39t-161 107-59 145q0 64 40 122t115 100l49 28-15 54q-13 52-40 98 86-36 157-97l24-21 32 3q39 4 74 4 116 0 218-39t161-107 59-145-59-145-161-107-218-39zM1024 512q0 99-68 183t-186 133-257 48q-40 0-82-4-113 100-262 138-28 8-65 12h-2q-8 0-15-6t-9-15v-0q-1-2-0-6t1-5 2-5l3-5t4-4 4-5q4-4 17-19t19-21 17-22 18-29 15-33 14-43q-89-50-141-125t-51-160q0-99 68-183t186-133 257-48 257 48 186 133 68 183z"
}

// Comment UI

export const commentUI = function(dispatch:any) {
  return new Plugin({
    props: {
      decorations(state) {
        return commentTooltip(state, dispatch)
      }
    }
  })
}

function commentTooltip(state:any, dispatch:any) {
  let sel = state.selection
  if (!sel.empty) return null
  let comments = commentPlugin.getState(state).commentsAt(sel.from)
  if (!comments.length) return null
  return DecorationSet.create(state.doc, [Decoration.widget(sel.from, renderComments(comments, dispatch, state))])
}

function renderComments(comments:any, dispatch:any, state:any) {
  return crel("div", {class: "tooltip-wrapper"},
              crel("ul", {class: "commentList"},
                   comments.map((c:any) => renderComment(c.spec.comment, dispatch, state))))
}

function renderComment(comment:any, dispatch:any, state:any) {
  let btn = crel("button", {class: "commentDelete", title: "Delete annotation"}, "×")
  let btn1 = crel("button", "×")
  btn1.addEventListener("click", () =>{
    console.log(comment);
  })
  btn.addEventListener("click", () =>{
    
    dispatch(state.tr.setMeta(commentPlugin, {type: "deleteComment", comment}))}
  )
  console.log(comment);
  return crel("li", {class: "commentText"}, comment.commentsArray.toString(), btn,btn1)
}