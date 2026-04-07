/**
 * Adds Claude cost tracking display to any content node class.
 * Called once per node class after the class is defined.
 * Avoids copy-pasting identical drawing code into all 5 content node files.
 *
 * Adds two methods to the node prototype:
 *   computeSize      — extends the node height by 28px to make room for the stats bar
 *   onDrawForeground — draws the separator line and cost text on the canvas
 */

import { LiteGraph } from 'litegraph.js'

/**
 * Attaches computeSize and onDrawForeground to the given node class.
 * Pass the constructor function — e.g. addClaudeStatsDrawing(SubjectNode).
 */
function addClaudeStatsDrawing(NodeClass) {

  /**
   * Tells LiteGraph how tall this node must be.
   * Adds 28px to the standard widget height so the stats bar always has its own space.
   */
  NodeClass.prototype.computeSize = function () {
    const size = LiteGraph.LGraphNode.prototype.computeSize.call(this)
    size[1] += 28
    return size
  }

  /**
   * Draws the Claude cost bar at the bottom of the node.
   * Called by LiteGraph on every render frame.
   * Shows a separator line and either "Claude: –" or "$0.0000 · N calls".
   */
  NodeClass.prototype.onDrawForeground = function (ctx) {
    // Nothing to draw when the node is collapsed to just its title bar
    if (this.flags.collapsed) return

    const w     = this.size[0]
    const lineY = this.size[1] - 24   // separator line position
    const textY = this.size[1] - 9    // text baseline

    // Subtle separator line to visually separate stats from the last widget
    ctx.strokeStyle = '#444'
    ctx.lineWidth   = 1
    ctx.beginPath()
    ctx.moveTo(8, lineY)
    ctx.lineTo(w - 8, lineY)
    ctx.stroke()

    ctx.font      = '10px monospace'
    ctx.fillStyle = '#888'
    ctx.textAlign = 'center'

    // Show "–" until the first Describe call has been made on this node
    if (!this.claudeCallCount) {
      ctx.fillText('Claude: –', w / 2, textY)
    } else {
      // Format cost to 4 decimal places so small amounts like $0.0012 are visible
      const cost = this.claudeSpent.toFixed(4)
      const calls = this.claudeCallCount === 1 ? '1 call' : `${this.claudeCallCount} calls`
      ctx.fillText(`$${cost}  ·  ${calls}`, w / 2, textY)
    }

    // Reset alignment so other drawing code is not affected
    ctx.textAlign = 'left'
  }
}

export { addClaudeStatsDrawing }
