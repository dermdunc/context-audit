// A token-COST APPROXIMATION, not a real tokenizer. Real tokenizers are
// model-specific and this tool is meant to run against any project without
// an API key or a model-specific dependency, so it uses the well-known
// chars/4 heuristic instead. Every place this number surfaces in the CLI
// says "approx" - stating the limits of a measurement is the whole point of
// this tool (see half-life's review-panel discipline this borrows from:
// never claim more precision than the method actually has).
export function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}
