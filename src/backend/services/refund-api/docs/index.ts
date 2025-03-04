import * as yaml from 'js-yaml'; // v4.1.0
import * as swaggerUi from 'swagger-ui-express'; // v4.6.3
import * as path from 'path'; // Node.js built-in
import * as fs from 'fs'; // Node.js built-in
import swaggerDocument from '../docs/swagger.yaml';

/**
 * Loads and parses the Swagger YAML file into a JavaScript object
 * @returns Parsed Swagger document as a JavaScript object
 */
export function getSwaggerDocument() {
  try {
    // Resolve the path to the swagger.yaml file
    const swaggerPath = path.resolve(__dirname, 'swagger.yaml');
    
    // Read the file content using fs.readFileSync
    const swaggerContent = fs.readFileSync(swaggerPath, 'utf8');
    
    // Parse the YAML content into a JavaScript object using js-yaml
    const parsedDocument = yaml.load(swaggerContent);
    
    return parsedDocument;
  } catch (error) {
    console.error('Failed to load Swagger document:', error);
    // Return the imported document as a fallback
    return swaggerDocument;
  }
}

/**
 * Generates HTML for serving the Swagger UI
 * @param basePath Optional base path for the API endpoints
 * @returns HTML string for Swagger UI
 */
export function getSwaggerHtml(basePath?: string) {
  const document = getSwaggerDocument();
  
  // Adjust the basePath in the Swagger document if provided
  if (basePath && document.servers) {
    document.servers = document.servers.map((server: any) => {
      return {
        ...server,
        url: `${basePath}${server.url}`
      };
    });
  }
  
  // Generate HTML for the Swagger UI with proper configuration
  const html = swaggerUi.generateHTML(document, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Brik Refunds API Documentation',
    customfavIcon: '/favicon.ico',
    swaggerOptions: {
      docExpansion: 'list',
      filter: true,
      showExtensions: true,
      showCommonExtensions: true
    }
  });
  
  return html;
}

/**
 * Sets up Swagger UI middleware for Express application
 * @param app Express application instance
 * @param basePath Optional base path for the API endpoints
 */
export function setupSwaggerDocs(app: any, basePath?: string) {
  const document = getSwaggerDocument();
  
  // Adjust the basePath in the Swagger document if provided
  if (basePath && document.servers) {
    document.servers = document.servers.map((server: any) => {
      return {
        ...server,
        url: `${basePath}${server.url}`
      };
    });
  }
  
  // Configure Swagger UI options
  const options = {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
      docExpansion: 'list',
      filter: true,
      showExtensions: true,
      showCommonExtensions: true
    }
  };
  
  // Set up the Swagger UI middleware on the Express app
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(document, options));
  
  // Set up a route to serve the Swagger JSON
  app.get('/api-docs.json', (req: any, res: any) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(document);
  });
}

// Export the swagger document for direct access
export { swaggerDocument };