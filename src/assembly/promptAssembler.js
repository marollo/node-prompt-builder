/**
 * Reads all nodes connected to the Output node and assembles their text
 * into a single prompt string. This is the core logic of the whole app.
 */

/**
 * Iterates over every input slot on the Output node, asks each connected
 * node for its prompt fragment, and joins them as separate sentences.
 * Each section starts with a capital letter and ends with a period.
 * Returns the finished prompt string.
 */
export function assemblePrompt(outputNode) {
  const fragments = []

  // Loop through every input slot the Output node has
  for (let i = 0; i < outputNode.inputs.length; i++) {

    // Get the node plugged into this slot (returns null if slot is empty)
    const connectedNode = outputNode.getInputNode(i)

    // If there is a node and it knows how to produce a prompt fragment, ask it
    if (connectedNode && typeof connectedNode.getPromptFragment === 'function') {
      const fragment = connectedNode.getPromptFragment()

      // Capitalize first letter of each section so it reads as a sentence
      if (fragment) fragments.push(fragment.charAt(0).toUpperCase() + fragment.slice(1))
    }
  }

  // Join sections with ". " so each node's contribution is a distinct sentence
  return fragments.join('. ')
}

/**
 * Collects all reference images from nodes connected to the Output node.
 * Returns an array of { data, label } objects — one entry per uploaded image.
 * 'data' is the base64 image string. 'label' describes the image's role (e.g. 'subject reference').
 */
export function assembleImages(outputNode) {
  const images = []

  for (let i = 0; i < outputNode.inputs.length; i++) {
    const node = outputNode.getInputNode(i)

    // Only collect from nodes that have images uploaded and a label describing their role
    if (node && Array.isArray(node.images) && node.referenceLabel) {
      for (const img of node.images) {
        // Use the image's own label if the user typed one, otherwise fall back to the node label
        images.push({ data: img.data, label: img.label || node.referenceLabel })
      }
    }
  }

  return images
}
