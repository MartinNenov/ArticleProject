import { EditorView } from 'prosemirror-view'
import * as Y from 'yjs'
import { YArray } from 'yjs/dist/src/types/YArray'
import * as dom from 'lib0/dom.js'
import * as pair from 'lib0/pair.js'
import { ySyncPluginKey } from 'y-prosemirror'
import { html, render } from 'lit-html'
import { ColorDef } from 'y-prosemirror/dist/src/plugins/sync-plugin'


function addVersion(doc: Y.Doc): void {
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

let liveTracking = (dom.element('input', [
    pair.create('type', 'checkbox'),
    pair.create('name', 'yjs-live-tracking'),
    pair.create('value', 'Live Tracking ')
]) as HTMLInputElement)

let updateLiveTrackingState = (editorstate: any) => {
    setTimeout(() => {
        const syncState = ySyncPluginKey.getState(editorstate.state)
        liveTracking.checked = syncState.prevSnapshot != null && syncState.snapshot == null
    }, 500)
}

function renderVersion(editorview: EditorView, version: {
    date: number,
    snapshot: Uint8Array,
    clientID: number
}, prevSnapshot: Uint8Array | null): any {
    console.log(Y.decodeSnapshot(version.snapshot))
    editorview.dispatch(editorview.state.tr.setMeta(ySyncPluginKey, { snapshot: Y.decodeSnapshot(version.snapshot), prevSnapshot: prevSnapshot == null ? Y.emptySnapshot : Y.decodeSnapshot(prevSnapshot) }))
    updateLiveTrackingState(editorview)
}
let unrenderVersion = (editorview: EditorView) => {
    const binding = ySyncPluginKey.getState(editorview.state).binding
    if (binding != null) {
        binding.unrenderSnapshot()
    }
    updateLiveTrackingState(editorview)
}
let versionTemplate = (editorview: EditorView, version: {
    date: number,
    snapshot: Uint8Array,
    clientID: number
}, prevSnapshot: Uint8Array | null) => html`<div class="version-list" @click=${(e: any) => renderVersion(editorview, version, prevSnapshot)}>${new Date(version.date).toLocaleString()}</div>`

let versionList = (editorview: EditorView, doc: Y.Doc) => {
    const versions: YArray<{
        date: number,
        snapshot: Uint8Array,
        clientID: number
    }> = doc.getArray('versions')
    return html`<div>${versions.length > 0 ? versions.map((version: {
        date: number,
        snapshot: Uint8Array,
        clientID: number
    }, i) => versionTemplate(editorview, version, i > 0 ? versions.get(i - 1).snapshot : null)) : html`<div>No snapshots..</div>`}</div>`
}

let snapshotButton = (doc: Y.Doc) => {
    return html`<button @click=${(e: any) => addVersion(doc)}>Snapshot</button>`
}

let attachVersion = (parent: HTMLElement, doc: Y.Doc, editorview: EditorView) => {
    let open = false
    const rerender = () => {
        render(html`<div class="version-modal" ?hidden=${open}>${snapshotButton(doc)}${versionList(editorview, doc)}</div>`, vContainer)
    }
    updateLiveTrackingState(editorview)
    liveTracking.addEventListener('click', e => {
        if (liveTracking.checked) {
            const versions: YArray<{
                date: number,
                snapshot: Uint8Array,
                clientID: number
            }> = doc.getArray('versions')
            const lastVersion = versions.length > 0 ? Y.decodeSnapshot(versions.get(versions.length - 1).snapshot) : Y.emptySnapshot
            editorview.dispatch(editorview.state.tr.setMeta(ySyncPluginKey, { snapshot: null, prevSnapshot: lastVersion }))
        } else {
            unrenderVersion(editorview)
        }
    })
    parent.insertBefore(liveTracking, null)
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
        unrenderVersion(editorview)
        rerender()
    })
    const vContainer = document.createElement('div')
    parent.insertBefore(btn, null)
    parent.insertBefore(vContainer, null)
    doc.getArray('versions').observe(rerender)
    rerender()
}

let testUsers = [
    { username: 'Alice', color: '#ecd444', lightColor: '#ecd44433' },
    { username: 'Bob', color: '#ee6352', lightColor: '#ee635233' },
    { username: 'Max', color: '#6eeb83', lightColor: '#6eeb8333' }
]

let colors:ColorDef[] = [
    { light: '#ecd44433', dark: '#ecd444' },
    { light: '#ee635233', dark: '#ee6352' },
    { light: '#6eeb8333', dark: '#6eeb83' }
]

export {
    addVersion,
    liveTracking,
    colors,
    testUsers,
    updateLiveTrackingState,
    renderVersion,
    versionList,
    unrenderVersion,
    versionTemplate,
    snapshotButton,
    attachVersion
}