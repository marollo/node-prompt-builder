/**
 * Pricing table for all Claude models available in this tool.
 * Single source of truth — imported by the Settings modal (for display)
 * and by claudeClient.js (for cost calculation after each API call).
 * Prices are in US dollars per 1 million tokens.
 */

const CLAUDE_PRICES = {
  'claude-haiku-4-5-20251001': { input: 0.80,  output: 4.00  },
  'claude-sonnet-4-6':         { input: 3.00,  output: 15.00 },
  'claude-opus-4-6':           { input: 15.00, output: 75.00 },
}

// Fallback when nothing has been saved in localStorage yet
const DEFAULT_MODEL = 'claude-haiku-4-5-20251001'

/**
 * Calculates the exact dollar cost of one Claude API call.
 * Uses the token counts returned by the API in response.usage.
 *
 * @param {string} model        - The model ID used for the call
 * @param {number} inputTokens  - Tokens counted by the API for the request
 * @param {number} outputTokens - Tokens counted by the API for the response
 * @returns {number}            - Cost in dollars, e.g. 0.001234
 */
function calculateClaudeCost(model, inputTokens, outputTokens) {
  // Fall back to Haiku pricing if the model is not in our table
  const prices = CLAUDE_PRICES[model] || CLAUDE_PRICES[DEFAULT_MODEL]
  return (inputTokens / 1_000_000 * prices.input) + (outputTokens / 1_000_000 * prices.output)
}

export { CLAUDE_PRICES, DEFAULT_MODEL, calculateClaudeCost }
