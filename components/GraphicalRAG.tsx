import { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { FaSpinner, FaSearch } from 'react-icons/fa';

interface Document {
  pageId: string;
  pageTitle: string;
  pageUrl: string;
  content: string;
  score?: number;
}

interface Node {
  id: string;
  label: string;
  type: 'document' | 'query' | 'entity';
  url?: string;
  relevance?: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface Edge {
  source: string | Node;
  target: string | Node;
  type: string;
  weight?: number;
}

interface GraphData {
  nodes: Node[];
  edges: Edge[];
  query: string;
}

interface GraphicalRAGProps {
  query: string;
  documents?: Document[];
  isLoading: boolean;
  onSearch: (query: string) => void;
}

export default function GraphicalRAG({ query, documents = [], isLoading, onSearch }: GraphicalRAGProps) {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [searchInput, setSearchInput] = useState(query || '');
  const svgRef = useRef<SVGSVGElement>(null);
  const [highlightedNode, setHighlightedNode] = useState<string | null>(null);
  
  // Generate graph data from documents
  useEffect(() => {
    if (!documents.length) {
      setGraphData(null);
      return;
    }
    
    // Create nodes and edges
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const nodeIds = new Set<string>();
    
    // Add query node at the center
    if (query) {
      const queryNode: Node = {
        id: 'query',
        label: query,
        type: 'query'
      };
      nodes.push(queryNode);
      nodeIds.add(queryNode.id);
    }
    
    // Add document nodes
    documents.forEach(doc => {
      // Document node
      const docId = `doc-${doc.pageId}`;
      if (!nodeIds.has(docId)) {
        nodes.push({
          id: docId,
          label: doc.pageTitle,
          type: 'document',
          url: doc.pageUrl,
          relevance: doc.score || 0.5
        });
        nodeIds.add(docId);
      }
      
      // Connect query to document if query exists
      if (query) {
        edges.push({
          source: 'query',
          target: docId,
          type: 'retrieves',
          weight: doc.score || 0.5
        });
      }
      
      // Extract entities from content (simplified approach)
      const entities = extractEntities(doc.content);
      entities.forEach(entity => {
        const entityId = `entity-${entity.replace(/\s+/g, '-').toLowerCase()}`;
        
        // Add entity node if it doesn't exist
        if (!nodeIds.has(entityId)) {
          nodes.push({
            id: entityId,
            label: entity,
            type: 'entity'
          });
          nodeIds.add(entityId);
        }
        
        // Connect document to entity
        edges.push({
          source: docId,
          target: entityId,
          type: 'contains'
        });
      });
    });
    
    setGraphData({
      nodes,
      edges,
      query
    });
  }, [documents, query]);
  
  // Helper function to extract entities (simple implementation)
  const extractEntities = (content: string): string[] => {
    // Extract potential entities - in a real implementation, use NLP techniques
    const techTerms = [
      "API", "machine learning", "GPU", "CUDA", "Python", "tensor", "model", "training",
      "inference", "data", "algorithm", "deep learning", "neural network", "transformer",
      "driver", "hardware", "software", "framework", "library", "function", "cloud",
      "compute", "cluster", "parallel", "optimization", "performance", "processing",
      "NVIDIA", "architecture", "system", "platform", "interface", "documentation"
    ];
    
    const foundEntities = new Set<string>();
    techTerms.forEach(term => {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      const matches = content.match(regex);
      if (matches && matches.length > 0) {
        foundEntities.add(term);
      }
    });
    
    return Array.from(foundEntities).slice(0, 5); // Limit to 5 entities per document
  };
  
  // Render graph visualization
  useEffect(() => {
    if (!graphData || !svgRef.current) return;
    
    // Clear previous visualization
    d3.select(svgRef.current).selectAll('*').remove();
    
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    
    // Create a force simulation
    const simulation = d3.forceSimulation<Node>()
      .force('link', d3.forceLink<Node, Edge>().id(d => d.id).distance(d => {
        // Adjust distance based on edge type
        if (d.type === 'retrieves') return 100;
        return 60;
      }))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius(30));
    
    const svg = d3.select(svgRef.current);
    
    // Prepare nodes and links data
    const nodeMap = new Map<string, Node>();
    graphData.nodes.forEach(node => nodeMap.set(node.id, { ...node }));
    
    const nodes = Array.from(nodeMap.values());
    const links = graphData.edges.map(edge => ({
      source: nodeMap.get(typeof edge.source === 'string' ? edge.source : edge.source.id)!,
      target: nodeMap.get(typeof edge.target === 'string' ? edge.target : edge.target.id)!,
      type: edge.type,
      weight: edge.weight || 1
    })).filter(link => link.source && link.target);
    
    // Add zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', event => {
        g.attr('transform', event.transform);
      });
    
    svg.call(zoom);
    
    // Container for all elements
    const g = svg.append('g');
    
    // Define arrow markers
    const defs = svg.append('defs');
    const markerTypes = [
      { type: 'retrieves', color: '#4299e1' },
      { type: 'contains', color: '#ed8936' },
      { type: 'related', color: '#48bb78' }
    ];
    
    markerTypes.forEach(m => {
      defs.append('marker')
        .attr('id', `arrow-${m.type}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 20)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('fill', m.color)
        .attr('d', 'M0,-5L10,0L0,5');
    });
    
    // Create links (edges)
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', d => getEdgeColor(d.type))
      .attr('stroke-opacity', d => highlightedNode ? 
        (d.source.id === highlightedNode || d.target.id === highlightedNode ? 0.8 : 0.1) : 0.6)
      .attr('stroke-width', d => Math.max(1, (d.weight || 1) * 3))
      .attr('marker-end', d => `url(#arrow-${d.type})`);
    
    // Create node groups
    const node = g.append('g')
      .selectAll('.node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .on('mouseover', function(event, d) {
        setHighlightedNode(d.id);
        
        // Highlight connected nodes and links
        d3.select(this).select('circle')
          .attr('stroke', '#000')
          .attr('stroke-width', 2);
          
        // Update link opacities
        link
          .attr('stroke-opacity', l => 
            l.source.id === d.id || l.target.id === d.id ? 0.8 : 0.1);
            
        // Update node opacities
        nodeGroup
          .attr('opacity', n => 
            n.id === d.id || 
            links.some(l => 
              (l.source.id === d.id && l.target.id === n.id) || 
              (l.target.id === d.id && l.source.id === n.id)
            ) ? 1 : 0.3);
      })
      .on('mouseout', function() {
        setHighlightedNode(null);
        
        // Reset highlights
        d3.select(this).select('circle')
          .attr('stroke', '#fff')
          .attr('stroke-width', 1.5);
          
        // Reset link opacities
        link.attr('stroke-opacity', 0.6);
        
        // Reset node opacities
        nodeGroup.attr('opacity', 1);
      })
      .call(d3.drag<SVGGElement, Node>()
        .on('start', dragStarted)
        .on('drag', dragged)
        .on('end', dragEnded));
    
    // Add circles for each node with different styles by type
    node.append('circle')
      .attr('r', d => getNodeRadius(d))
      .attr('fill', d => getNodeColor(d))
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5);
    
    // Add node labels
    const nodeGroup = node.append('g')
      .attr('opacity', 1);
      
    nodeGroup.append('text')
      .attr('dy', d => d.type === 'query' ? -20 : -15)
      .attr('text-anchor', 'middle')
      .attr('font-size', d => d.type === 'query' ? '14px' : '11px')
      .attr('font-weight', d => d.type === 'query' ? 'bold' : 'normal')
      .text(d => truncateLabel(d.label))
      .attr('fill', '#333')
      .style('pointer-events', 'none');
    
    // Add hover tooltip
    node.append('title')
      .text(d => {
        if (d.type === 'document') {
          return `Document: ${d.label}\nURL: ${d.url}`;
        } else if (d.type === 'query') {
          return `Query: ${d.label}`;
        } else {
          return `Entity: ${d.label}`;
        }
      });
    
    // Add click handler for documents
    node.filter(d => d.type === 'document')
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        if (d.url) {
          window.open(d.url, '_blank');
        }
      });
    
    // Update positions on simulation tick
    simulation
      .nodes(nodes)
      .on('tick', () => {
        link
          .attr('x1', d => d.source.x!)
          .attr('y1', d => d.source.y!)
          .attr('x2', d => d.target.x!)
          .attr('y2', d => d.target.y!);
        
        node
          .attr('transform', d => `translate(${d.x},${d.y})`);
      });
    
    // Set up link force
    const linkForce = simulation.force('link') as d3.ForceLink<Node, Edge>;
    if (linkForce) {
      linkForce.links(links);
    }
    
    // Drag functions
    function dragStarted(event: d3.D3DragEvent<SVGGElement, Node, Node>) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }
    
    function dragged(event: d3.D3DragEvent<SVGGElement, Node, Node>) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }
    
    function dragEnded(event: d3.D3DragEvent<SVGGElement, Node, Node>) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }
    
    // Helper function for edge colors
    function getEdgeColor(type: string): string {
      switch (type) {
        case 'retrieves':
          return '#4299e1'; // Blue
        case 'contains':
          return '#ed8936'; // Orange
        case 'related':
          return '#48bb78'; // Green
        default:
          return '#a0aec0'; // Gray
      }
    }
    
    // Helper function for node colors
    function getNodeColor(node: Node): string {
      switch (node.type) {
        case 'document':
          return '#4299e1'; // Blue
        case 'query':
          return '#9f7aea'; // Purple
        case 'entity':
          return '#f6ad55'; // Orange
        default:
          return '#a0aec0'; // Gray
      }
    }
    
    // Helper function for node radius
    function getNodeRadius(node: Node): number {
      switch (node.type) {
        case 'document':
          return 12 + (node.relevance ? node.relevance * 5 : 0);
        case 'query':
          return 15;
        case 'entity':
          return 8;
        default:
          return 8;
      }
    }
    
    // Helper function to truncate long labels
    function truncateLabel(label: string): string {
      return label.length > 20 ? label.substring(0, 17) + '...' : label;
    }
    
    // Initial zoom level
    const initialTransform = d3.zoomIdentity.translate(width / 2, height / 2).scale(0.8);
    svg.call(zoom.transform, initialTransform);
    
  }, [graphData, highlightedNode]);
  
  // Handle search form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      onSearch(searchInput);
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md p-4 w-full">
      <h2 className="text-xl font-semibold mb-4">Confluence Knowledge Visualization</h2>
      
      <form onSubmit={handleSearch} className="flex mb-4">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search Confluence content..."
          className="flex-1 p-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-r-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isLoading ? <FaSpinner className="animate-spin" /> : <FaSearch />}
        </button>
      </form>
      
      <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
        <div className="bg-gray-50 p-2 text-sm flex items-center flex-wrap">
          <div className="flex items-center mr-3">
            <div className="w-3 h-3 rounded-full bg-purple-500 mr-1"></div>
            <span>Query</span>
          </div>
          <div className="flex items-center mr-3">
            <div className="w-3 h-3 rounded-full bg-blue-500 mr-1"></div>
            <span>Document</span>
          </div>
          <div className="flex items-center mr-3">
            <div className="w-3 h-3 rounded-full bg-orange-400 mr-1"></div>
            <span>Entity</span>
          </div>
          <div className="border-l border-gray-300 pl-3 ml-1 flex">
            <div className="flex items-center mr-3">
              <div className="w-4 h-0.5 bg-blue-500 mr-1"></div>
              <span>Retrieves</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-0.5 bg-orange-500 mr-1"></div>
              <span>Contains</span>
            </div>
          </div>
        </div>
        
        <div style={{ height: '400px' }}>
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <FaSpinner className="animate-spin text-blue-600 text-4xl" />
              <span className="ml-2 text-gray-600">Loading visualization...</span>
            </div>
          ) : !documents.length ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              {query ? 'No results found. Try another search term.' : 'Search for Confluence content to visualize results.'}
            </div>
          ) : (
            <svg 
              ref={svgRef}
              width="100%"
              height="100%"
              className="bg-gray-50"
            ></svg>
          )}
        </div>
      </div>
      
      {documents.length > 0 && (
        <div className="mt-2 text-xs text-gray-500">
          Showing {documents.length} documents{query ? ` for query: "${query}"` : ''}
          {highlightedNode && " — Hover over nodes to explore connections"}
        </div>
      )}
    </div>
  );
} 