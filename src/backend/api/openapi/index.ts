import { info, error } from '../../common/utils/logger';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml'; // js-yaml@^4.1.0

// Path to the OpenAPI specification YAML file
const specPath = path.resolve(__dirname, './spec.yaml');

/**
 * Loads and parses the OpenAPI specification from the YAML file
 * @returns Parsed OpenAPI specification object
 */
function loadOpenAPISpec(): any {
  try {
    // Get the absolute path to the specification file
    info('Loading OpenAPI specification from', { path: specPath });
    
    // Read the specification file contents
    const specContent = fs.readFileSync(specPath, 'utf8');
    
    // Parse the YAML content to a JavaScript object
    const parsedSpec = yaml.load(specContent);
    
    // Basic validation of the loaded specification
    if (!parsedSpec || typeof parsedSpec !== 'object') {
      throw new Error('Invalid OpenAPI specification format');
    }
    
    info('OpenAPI specification loaded successfully', {
      openapi: parsedSpec.openapi || parsedSpec.swagger,
      title: parsedSpec.info?.title,
      version: parsedSpec.info?.version,
      pathCount: Object.keys(parsedSpec.paths || {}).length
    });
    
    return parsedSpec;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    error('Failed to load OpenAPI specification', { 
      error: errorMessage,
      path: specPath
    });
    
    // Re-throw the error to prevent the application from starting with an invalid spec
    throw new Error(`Failed to load OpenAPI specification: ${errorMessage}`);
  }
}

// Load the specification when this module is imported
const OpenAPISpec = loadOpenAPISpec();

export { OpenAPISpec };