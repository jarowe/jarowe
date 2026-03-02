/**
 * JSON Schema validation for pipeline output.
 *
 * Validates constellation.graph.json and constellation.layout.json
 * against expected schemas using ajv.
 *
 * Fail-closed: invalid output = exit code 1.
 */

import Ajv from 'ajv';
import { createLogger } from '../utils/logger.mjs';

const log = createLogger('schema-validator');

/**
 * JSON Schema for constellation.graph.json
 */
const GRAPH_SCHEMA = {
  type: 'object',
  required: ['nodes', 'edges', 'epochs'],
  properties: {
    nodes: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'type', 'title', 'date', 'epoch'],
        properties: {
          id: { type: 'string', minLength: 1 },
          type: { type: 'string', enum: ['milestone', 'person', 'moment', 'idea', 'project', 'place', 'track'] },
          title: { type: 'string' },
          date: { type: 'string', minLength: 1 },
          epoch: { type: 'string', minLength: 1 },
          description: { type: 'string' },
          media: { type: 'array', items: { type: 'string' } },
          connections: { type: 'array', items: { type: 'string' } },
          size: { type: 'number' },
          significance: { type: 'number', minimum: 0, maximum: 1 },
          isHub: { type: 'boolean' },
          source: { type: 'string' },
          sourceId: { type: 'string' },
          visibility: { type: 'string', enum: ['public', 'friends', 'private'] },
          factuality: { type: 'string', enum: ['factual', 'inferred', 'synthetic'] },
          status: { type: 'string', enum: ['published', 'draft', 'hidden'] },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          sourceMeta: {
            type: 'object',
            properties: {
              source: { type: 'string' },
              sourceItemId: { type: 'string' },
              sourceUrl: { type: 'string' },
              connectorVersion: { type: 'string' },
              authorship: { type: 'string', enum: ['authored', 'tagged_external', 'reshared'] },
              isOwned: { type: 'boolean' },
              reshareReason: { oneOf: [{ type: 'string' }, { type: 'null' }] },
            },
          },
          entities: {
            type: 'object',
            properties: {
              people: { type: 'array', items: { type: 'string' } },
              places: { type: 'array', items: { type: 'string' } },
              tags: { type: 'array', items: { type: 'string' } },
              clients: { type: 'array', items: { type: 'string' } },
              projects: { type: 'array', items: { type: 'string' } },
            },
          },
          location: {
            oneOf: [
              { type: 'null' },
              {
                type: 'object',
                required: ['lat', 'lng'],
                properties: {
                  lat: { type: 'number' },
                  lng: { type: 'number' },
                },
              },
            ],
          },
        },
      },
    },
    edges: {
      type: 'array',
      items: {
        type: 'object',
        required: ['source', 'target', 'weight', 'evidence'],
        properties: {
          source: { type: 'string', minLength: 1 },
          target: { type: 'string', minLength: 1 },
          weight: { type: 'number' },
          evidence: {
            type: 'array',
            items: {
              type: 'object',
              required: ['signal', 'weight'],
              properties: {
                signal: { type: 'string' },
                weight: { type: 'number' },
                detail: { type: 'string' },
              },
            },
          },
        },
      },
    },
    epochs: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'label', 'range', 'color'],
        properties: {
          id: { type: 'string', minLength: 1 },
          label: { type: 'string', minLength: 1 },
          range: { type: 'string', minLength: 1 },
          color: { type: 'string', minLength: 1 },
        },
      },
    },
  },
};

/**
 * JSON Schema for constellation.layout.json
 */
const LAYOUT_SCHEMA = {
  type: 'object',
  required: ['positions', 'helixParams', 'bounds'],
  properties: {
    positions: {
      type: 'object',
      additionalProperties: {
        type: 'object',
        required: ['x', 'y', 'z'],
        properties: {
          x: { type: 'number' },
          y: { type: 'number' },
          z: { type: 'number' },
          strand: { type: 'number' },
          phase: { type: 'number' },
        },
      },
    },
    helixParams: {
      type: 'object',
      required: ['radius', 'turns', 'verticalStep', 'epochBandGap', 'jitterRadial', 'jitterAxial', 'seed'],
      properties: {
        radius: { type: 'number' },
        turns: { type: 'number' },
        verticalStep: { type: 'number' },
        epochBandGap: { type: 'number' },
        jitterRadial: { type: 'number' },
        jitterAxial: { type: 'number' },
        seed: { type: 'number' },
      },
    },
    bounds: {
      type: 'object',
      required: ['minY', 'maxY'],
      properties: {
        minY: { type: 'number' },
        maxY: { type: 'number' },
      },
    },
  },
};

/**
 * Validate graph and layout JSON against their schemas.
 *
 * @param {Object} graph - Graph data { nodes, edges, epochs }
 * @param {Object} layout - Layout data { positions, helixParams, bounds }
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateSchema(graph, layout) {
  log.info('Validating output schemas...');

  const ajv = new Ajv({ allErrors: true });
  const errors = [];

  // Validate graph
  const validateGraph = ajv.compile(GRAPH_SCHEMA);
  const graphValid = validateGraph(graph);
  if (!graphValid) {
    for (const err of validateGraph.errors) {
      errors.push(`graph${err.instancePath}: ${err.message}`);
    }
  }

  // Validate layout
  const validateLayout = ajv.compile(LAYOUT_SCHEMA);
  const layoutValid = validateLayout(layout);
  if (!layoutValid) {
    for (const err of validateLayout.errors) {
      errors.push(`layout${err.instancePath}: ${err.message}`);
    }
  }

  const valid = errors.length === 0;

  if (valid) {
    log.info('Schema validation PASSED');
  } else {
    log.error(`Schema validation FAILED: ${errors.length} error(s)`);
    for (const e of errors) {
      log.error(`  - ${e}`);
    }
  }

  return { valid, errors };
}
