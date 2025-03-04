#!/usr/bin/env node
/**
 * Command-line script that generates API documentation from OpenAPI/Swagger specifications.
 * It processes the specification files, creates HTML documentation, and outputs it
 * to a designated directory for serving to developers and API consumers.
 */

import * as path from 'path';
import * as fs from 'fs-extra'; // fs-extra@^11.1.1
import * as commander from 'commander'; // commander@^10.0.1
import * as yaml from 'js-yaml'; // js-yaml@^4.1.0
import { logger } from '../common/utils/logger';
import { OpenAPISpec } from '../api/openapi/index';
import { getSwaggerDocument } from '../services/refund-api/docs/index';

// Initialize commander program
const program = new commander.Command();

// Default output directory for documentation
const outputDir = path.resolve(process.cwd(), 'docs');

// Paths to API specifications
const openApiSpecPath = path.resolve(__dirname, '../api/openapi/spec.yaml');
const refundApiSwaggerPath = path.resolve(__dirname, '../services/refund-api/docs/swagger.yaml');

/**
 * Main function to generate documentation from OpenAPI specifications
 * @param options - Configuration options
 */
async function generateApiDocumentation(options: any): Promise<void> {
  try {
    // Configure output directory
    const outputDirectory = options.output || outputDir;
    logger.info(`Generating API documentation in: ${outputDirectory}`);

    // Create output directory if it doesn't exist
    await fs.ensureDir(outputDirectory);

    // Generate documentation for main OpenAPI spec
    logger.info('Processing main OpenAPI specification');
    const mainSpecOutputPath = path.join(outputDirectory, 'api');
    await fs.ensureDir(mainSpecOutputPath);

    // Generate ReDoc HTML
    const mainRedocHtml = await generateRedocHtml(OpenAPISpec, 'Brik Refund Service API Documentation');
    await fs.writeFile(path.join(mainSpecOutputPath, 'redoc.html'), mainRedocHtml);

    // Generate Swagger UI HTML
    const mainSwaggerHtml = generateSwaggerHtml(OpenAPISpec, 'Brik Refund Service API');
    await fs.writeFile(path.join(mainSpecOutputPath, 'swagger.html'), mainSwaggerHtml);

    // Generate JSON version of the spec for direct consumption
    await fs.writeJSON(path.join(mainSpecOutputPath, 'openapi.json'), OpenAPISpec, { spaces: 2 });

    // Generate documentation for Refund API Swagger spec
    logger.info('Processing Refund API Swagger specification');
    const refundApiOutputPath = path.join(outputDirectory, 'refund-api');
    await fs.ensureDir(refundApiOutputPath);

    // Load Refund API Swagger document
    const swaggerDoc = getSwaggerDocument();

    // Generate ReDoc HTML for Refund API
    const refundRedocHtml = await generateRedocHtml(swaggerDoc, 'Brik Refund API Documentation');
    await fs.writeFile(path.join(refundApiOutputPath, 'redoc.html'), refundRedocHtml);

    // Generate Swagger UI HTML for Refund API
    const refundSwaggerHtml = generateSwaggerHtml(swaggerDoc, 'Brik Refund API');
    await fs.writeFile(path.join(refundApiOutputPath, 'swagger.html'), refundSwaggerHtml);

    // Generate JSON version of the Refund API spec
    await fs.writeJSON(path.join(refundApiOutputPath, 'swagger.json'), swaggerDoc, { spaces: 2 });

    // Create an index.html that links to all generated documentation
    const indexHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Brik Refund Service API Documentation</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
          }
          h1 {
            border-bottom: 1px solid #eaecef;
            padding-bottom: 10px;
          }
          ul {
            padding-left: 20px;
          }
          li {
            margin-bottom: 10px;
          }
          a {
            color: #0366d6;
            text-decoration: none;
          }
          a:hover {
            text-decoration: underline;
          }
          .section {
            margin-bottom: 30px;
            padding: 15px;
            border: 1px solid #e1e4e8;
            border-radius: 6px;
            background-color: #f6f8fa;
          }
        </style>
      </head>
      <body>
        <h1>Brik Refund Service API Documentation</h1>
        
        <div class="section">
          <h2>Main API Documentation</h2>
          <ul>
            <li><a href="./api/redoc.html">ReDoc Documentation</a> - User-friendly API reference</li>
            <li><a href="./api/swagger.html">Swagger UI</a> - Interactive API documentation</li>
            <li><a href="./api/openapi.json">OpenAPI Specification (JSON)</a> - Raw OpenAPI specification</li>
          </ul>
        </div>
        
        <div class="section">
          <h2>Refund API Documentation</h2>
          <ul>
            <li><a href="./refund-api/redoc.html">ReDoc Documentation</a> - User-friendly API reference</li>
            <li><a href="./refund-api/swagger.html">Swagger UI</a> - Interactive API documentation</li>
            <li><a href="./refund-api/swagger.json">Swagger Specification (JSON)</a> - Raw Swagger specification</li>
          </ul>
        </div>
        
        <p>Generated on: ${new Date().toLocaleString()}</p>
      </body>
      </html>
    `;
    await fs.writeFile(path.join(outputDirectory, 'index.html'), indexHtml);

    logger.info(`API documentation generation complete. Documentation is available at ${outputDirectory}`);
  } catch (err) {
    logger.error('Error generating API documentation', { error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

/**
 * Generates static HTML documentation using ReDoc
 * @param spec - OpenAPI/Swagger specification object
 * @param title - Documentation title
 * @returns Promise that resolves with the generated HTML content
 */
async function generateRedocHtml(spec: any, title: string): Promise<string> {
  logger.info('Generating ReDoc HTML documentation', { title });

  try {
    // Create a basic HTML template for ReDoc
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
        <style>
          body {
            margin: 0;
            padding: 0;
            font-family: Roboto, sans-serif;
          }
        </style>
      </head>
      <body>
        <div id="redoc"></div>
        <script src="https://cdn.jsdelivr.net/npm/redoc@next/bundles/redoc.standalone.js"></script>
        <script>
          Redoc.init(
            ${JSON.stringify(spec)},
            {
              title: "${title}",
              theme: { colors: { primary: { main: '#0366d6' } } },
              scrollYOffset: 50,
              expandResponses: '200,201',
              requiredPropsFirst: true
            },
            document.getElementById('redoc')
          );
        </script>
      </body>
      </html>
    `;
    
    return html;
  } catch (err) {
    logger.error('Error generating ReDoc HTML', { error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

/**
 * Generates Swagger UI HTML for interactive API documentation
 * @param spec - OpenAPI/Swagger specification object
 * @param title - Documentation title
 * @returns HTML content for Swagger UI
 */
function generateSwaggerHtml(spec: any, title: string): string {
  logger.info('Generating Swagger UI HTML documentation', { title });

  try {
    // Create the HTML template for Swagger UI
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@4.5.0/swagger-ui.css" />
        <style>
          html {
            box-sizing: border-box;
            overflow: -moz-scrollbars-vertical;
            overflow-y: scroll;
          }
          
          *,
          *:before,
          *:after {
            box-sizing: inherit;
          }
          
          body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          }
          
          .swagger-ui .topbar {
            display: none;
          }
        </style>
      </head>
      <body>
        <div id="swagger-ui"></div>
        
        <script src="https://unpkg.com/swagger-ui-dist@4.5.0/swagger-ui-bundle.js"></script>
        <script src="https://unpkg.com/swagger-ui-dist@4.5.0/swagger-ui-standalone-preset.js"></script>
        <script>
          window.onload = function() {
            // Set up Swagger UI
            window.ui = SwaggerUIBundle({
              spec: ${JSON.stringify(spec)},
              dom_id: '#swagger-ui',
              deepLinking: true,
              presets: [
                SwaggerUIBundle.presets.apis,
                SwaggerUIStandalonePreset
              ],
              plugins: [
                SwaggerUIBundle.plugins.DownloadUrl
              ],
              layout: "StandaloneLayout",
              defaultModelsExpandDepth: 1,
              defaultModelExpandDepth: 1,
              defaultModelRendering: 'model',
              displayOperationId: true,
              displayRequestDuration: true,
              docExpansion: 'list',
              filter: true,
              showExtensions: true,
              showCommonExtensions: true,
              tagsSorter: 'alpha',
              operationsSorter: 'alpha',
              validatorUrl: null
            });
          };
        </script>
      </body>
      </html>
    `;

    return html;
  } catch (err) {
    logger.error('Error generating Swagger UI HTML', { error: err instanceof Error ? err.message : String(err) });
    throw new Error(`Failed to generate Swagger UI HTML: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Sets up command-line interface commands and options
 */
function setupCliCommands(): void {
  program
    .name('generate-docs')
    .version('1.0.0')
    .description('Generate API documentation from OpenAPI/Swagger specifications');
  
  program
    .option('-o, --output <directory>', 'Output directory for documentation', outputDir)
    .option('-f, --format <format>', 'Documentation format (redoc, swagger, or all)', 'all')
    .option('-v, --verbose', 'Enable verbose logging', false)
    .action(async (options) => {
      try {
        // Set log level if verbose option is provided
        if (options.verbose) {
          // Note: This would be implemented if logger supported setting log levels
          logger.info('Verbose logging enabled');
        }

        await generateApiDocumentation(options);
      } catch (err) {
        logger.error('Documentation generation failed', { error: err instanceof Error ? err.message : String(err) });
        process.exit(1);
      }
    });
}

/**
 * Initializes the command-line interface and runs the script
 */
async function initCli(): Promise<void> {
  setupCliCommands();
  await program.parseAsync(process.argv);
}

// Run the CLI when this script is executed directly
if (require.main === module) {
  initCli().catch((err) => {
    logger.error('Unhandled error', { error: err instanceof Error ? err.message : String(err) });
    process.exit(1);
  });
}

// Export the functions for testing or programmatic usage
export {
  generateApiDocumentation,
  generateRedocHtml,
  generateSwaggerHtml,
  setupCliCommands,
  initCli
};