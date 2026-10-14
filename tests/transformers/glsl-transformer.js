/**
 * GLSL Transformer for Jest
 * Transforms GLSL shader files for testing
 */

module.exports = {
  process(sourceText, sourcePath, options) {
    // Transform GLSL files to export as string
    const transformedSource = `
      module.exports = ${JSON.stringify(sourceText)};
    `;
    
    return {
      code: transformedSource
    };
  }
};