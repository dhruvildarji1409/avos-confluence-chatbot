import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import ConfluenceContent from '@/models/ConfluenceContent';

// Helper function to extract entity nodes
function extractEntities(content: string): string[] {
  // This is a simple implementation - in a production environment,
  // you would use NLP techniques or an API to extract entities
  
  // Extract potential entities (nouns that might be important concepts)
  // For this example, we'll use a simple heuristic to identify potential tech entities
  const techTerms = [
    "API", "machine learning", "GPU", "CUDA", "Python", "tensor", "model", "training",
    "inference", "data", "algorithm", "deep learning", "neural network", "transformer",
    "driver", "hardware", "software", "framework", "library", "function", "cloud",
    "compute", "cluster", "parallel", "optimization", "performance", "processing",
    "NVIDIA", "architecture", "system", "platform", "interface", "documentation"
  ];
  
  // Find matches in content
  const foundEntities = new Set<string>();
  
  techTerms.forEach(term => {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    const matches = content.match(regex);
    if (matches) {
      matches.forEach(match => foundEntities.add(match));
    }
  });
  
  return Array.from(foundEntities);
}

// Helper function to create relationships between entities
function createRelationships(entities: string[], content: string) {
  const relationships = [];
  
  // Check which entities appear close to each other in the content
  // This is a simple proximity-based approach
  for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      const entity1 = entities[i];
      const entity2 = entities[j];
      
      // Check if entities appear within a certain window of each other
      const windowSize = 200; // characters
      
      // Find positions of both entities in the content
      const positions1 = findAllPositions(content, entity1);
      const positions2 = findAllPositions(content, entity2);
      
      // Check if any instance of entity1 is close to any instance of entity2
      let related = false;
      
      for (const pos1 of positions1) {
        for (const pos2 of positions2) {
          if (Math.abs(pos1 - pos2) < windowSize) {
            related = true;
            break;
          }
        }
        if (related) break;
      }
      
      if (related) {
        relationships.push({
          source: entity1,
          target: entity2,
          type: "related"
        });
      }
    }
  }
  
  return relationships;
}

// Helper function to find all positions of a string in text
function findAllPositions(text: string, searchString: string): number[] {
  const positions = [];
  const lowerText = text.toLowerCase();
  const lowerSearchString = searchString.toLowerCase();
  let pos = lowerText.indexOf(lowerSearchString);
  
  while (pos !== -1) {
    positions.push(pos);
    pos = lowerText.indexOf(lowerSearchString, pos + 1);
  }
  
  return positions;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '';
    
    await connectToDatabase();
    
    // Find relevant Confluence content
    let results;
    
    if (query) {
      try {
        // Text search with query
        results = await ConfluenceContent.find(
          { $text: { $search: query } },
          { score: { $meta: "textScore" } }
        ).sort({ score: { $meta: "textScore" } }).limit(15);
      } catch (searchError) {
        console.error('Text search failed, falling back to regular search:', searchError);
        
        // Fallback to regular search if text search fails
        results = await ConfluenceContent.find({
          $or: [
            { pageTitle: { $regex: query, $options: 'i' } },
            { content: { $regex: query, $options: 'i' } }
          ]
        }).sort({ updatedAt: -1 }).limit(15);
      }
    } else {
      // Get recent documents if no query
      results = await ConfluenceContent.find().sort({ updatedAt: -1 }).limit(15);
    }
    
    // Build knowledge graph
    const nodes = new Map();
    const edges = [];
    const documentNodes = [];
    
    // Process each document
    for (const doc of results) {
      // Add document as a node
      const docNode = {
        id: doc.pageId,
        label: doc.pageTitle,
        type: 'document',
        url: doc.pageUrl
      };
      documentNodes.push(docNode);
      nodes.set(docNode.id, docNode);
      
      // Extract entities from content
      const entities = extractEntities(doc.content);
      
      // Add entity nodes
      for (const entity of entities) {
        const entityId = `entity-${entity.toLowerCase().replace(/\s+/g, '-')}`;
        if (!nodes.has(entityId)) {
          nodes.set(entityId, {
            id: entityId,
            label: entity,
            type: 'entity'
          });
        }
        
        // Connect document to entity
        edges.push({
          source: docNode.id,
          target: entityId,
          type: 'contains'
        });
      }
      
      // Create entity-to-entity relationships
      const relationships = createRelationships(entities, doc.content);
      for (const rel of relationships) {
        const sourceId = `entity-${rel.source.toLowerCase().replace(/\s+/g, '-')}`;
        const targetId = `entity-${rel.target.toLowerCase().replace(/\s+/g, '-')}`;
        
        // Add the relationship edge
        edges.push({
          source: sourceId,
          target: targetId,
          type: rel.type
        });
      }
      
      // Add connections between documents via shared links
      if (doc.nestedLinks && doc.nestedLinks.length > 0) {
        for (const linkedPageId of doc.nestedLinks) {
          // Check if the linked document is also in our results
          const linkedDoc = results.find(d => d.pageId === linkedPageId);
          if (linkedDoc) {
            edges.push({
              source: doc.pageId,
              target: linkedPageId,
              type: 'links_to'
            });
          }
        }
      }
    }
    
    // Convert nodes Map to array for response
    const nodeArray = Array.from(nodes.values());
    
    return NextResponse.json({
      nodes: nodeArray,
      edges: edges,
      documents: documentNodes,
      query: query
    });
  } catch (error: any) {
    console.error('Error fetching knowledge graph data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate knowledge graph' },
      { status: 500 }
    );
  }
} 