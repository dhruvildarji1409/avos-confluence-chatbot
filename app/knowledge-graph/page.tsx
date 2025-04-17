'use client';

import { useState, useEffect, useRef } from 'react';
import Header from '@/components/Header';
import { FaSearch, FaSpinner, FaExclamationTriangle } from 'react-icons/fa';
import * as d3 from 'd3';

interface Node {
  id: string;
  label: string;
  type: 'document' | 'entity';
  url?: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface Edge {
  source: string | Node;
  target: string | Node;
  type: string;
}

interface GraphData {
  nodes: Node[];
  edges: Edge[];
  documents: Node[];
  query: string;
}

// Helper functions defined outside of component/useEffect
const getEdgeColor = (type: string): string => {
  switch (type) {
    case 'contains':
      return '#4299e1'; // Blue
    case 'related':
      return '#ed8936'; // Orange
    case 'links_to':
      return '#48bb78'; // Green
    default:
      return '#a0aec0'; // Gray
  }
};

const truncateLabel = (label: string): string => {
  return label.length > 20 ? label.substring(0, 17) + '...' : label;
};

export default function KnowledgeGraphPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Fetch graph data when search query changes
  const fetchGraphData = async (query: string = '') => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/knowledge-graph?query=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch knowledge graph data: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      // Validate data structure to prevent rendering errors
      if (!data.nodes || !Array.isArray(data.nodes) || !data.edges || !Array.isArray(data.edges)) {
        throw new Error('Invalid data format received from server');
      }
      
      setGraphData(data);
    } catch (err: any) {
      console.error('Error fetching knowledge graph:', err);
      setError(err.message || 'Failed to load knowledge graph');
      // Don't clear existing graph data on error unless it's the initial load
      if (!graphData) setGraphData(null);
    } finally {
      setLoading(false);
    }
  };
  
  // Initial data load
  useEffect(() => {
    fetchGraphData();
  }, []);
  
  // Handle search form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchGraphData(searchQuery);
  };
  
  // Render graph visualization when data changes
  useEffect(() => {
    if (!graphData || !svgRef.current) return;
    
    try {
      // Clear previous visualization
      d3.select(svgRef.current).selectAll('*').remove();
      
      // Extract dimensions
      const width = svgRef.current.clientWidth || 800;
      const height = svgRef.current.clientHeight || 600;
      
      // Create a force simulation for layout
      const simulation = d3.forceSimulation<Node>()
        .force('link', d3.forceLink<Node, d3.SimulationLinkDatum<Node>>().id((d) => d.id).distance(100))
        .force('charge', d3.forceManyBody().strength(-300))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collide', d3.forceCollide().radius(50));
      
      const svg = d3.select(svgRef.current);
      
      // Prepare nodes and links data with proper references
      const nodeMap = new Map<string, Node>();
      graphData.nodes.forEach(node => nodeMap.set(node.id, { ...node }));
      
      const nodes = Array.from(nodeMap.values());
      const links = graphData.edges.map(edge => ({
        source: nodeMap.get(typeof edge.source === 'string' ? edge.source : edge.source.id),
        target: nodeMap.get(typeof edge.target === 'string' ? edge.target : edge.target.id),
        type: edge.type
      })).filter(link => link.source && link.target); // Ensure source and target exist
      
      if (nodes.length === 0) {
        // No nodes to display, show a message
        svg.append('text')
          .attr('x', width / 2)
          .attr('y', height / 2)
          .attr('text-anchor', 'middle')
          .attr('fill', '#666')
          .text('No data to display. Try a different search query.');
        return;
      }
      
      // Add zoom behavior
      const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 4])
        .on('zoom', (event) => {
          g.attr('transform', event.transform);
        });
      
      svg.call(zoom);
      
      // Create a container for all elements
      const g = svg.append('g');
      
      // Create links (edges)
      const link = g.append('g')
        .selectAll('line')
        .data(links)
        .enter()
        .append('line')
        .attr('stroke', (d: any) => getEdgeColor(d.type))
        .attr('stroke-opacity', 0.6)
        .attr('stroke-width', 2)
        .attr('marker-end', (d: any) => `url(#arrow-${d.type})`);
      
      // Define arrow markers for different edge types
      const defs = svg.append('defs');
      
      ['contains', 'related', 'links_to'].forEach(type => {
        defs.append('marker')
          .attr('id', `arrow-${type}`)
          .attr('viewBox', '0 -5 10 10')
          .attr('refX', 20)
          .attr('refY', 0)
          .attr('markerWidth', 6)
          .attr('markerHeight', 6)
          .attr('orient', 'auto')
          .append('path')
          .attr('fill', getEdgeColor(type))
          .attr('d', 'M0,-5L10,0L0,5');
      });
      
      // Create nodes
      const node = g.append('g')
        .selectAll('.node')
        .data(nodes)
        .enter()
        .append('g')
        .attr('class', 'node')
        .call(d3.drag<SVGGElement, Node>()
          .on('start', (event) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
          })
          .on('drag', (event) => {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
          })
          .on('end', (event) => {
            if (!event.active) simulation.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
          }));
      
      // Add node circles with different styling based on type
      node.append('circle')
        .attr('r', (d: Node) => d.type === 'document' ? 12 : 8)
        .attr('fill', (d: Node) => d.type === 'document' ? '#4299e1' : '#f6ad55')
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.5);
      
      // Add node labels
      const nodeGroup = node.append('g')
        .attr('opacity', 1);
        
      nodeGroup.append('text')
        .attr('dy', (d: Node) => d.type === 'document' ? -15 : -10)
        .attr('text-anchor', 'middle')
        .attr('font-size', (d: Node) => d.type === 'document' ? '12px' : '10px')
        .text((d: Node) => truncateLabel(d.label || 'Unnamed Node'))
        .attr('fill', '#333')
        .style('pointer-events', 'none');
      
      // Add hover tooltip
      node.append('title')
        .text((d: Node) => {
          if (d.type === 'document') {
            return `Document: ${d.label}\nURL: ${d.url || 'No URL'}`;
          } else {
            return `Entity: ${d.label}`;
          }
        });
      
      // Add click handler for documents
      node.on('click', (event, d: Node) => {
        if (d.type === 'document' && d.url) {
          window.open(d.url, '_blank');
        }
      });
      
      // Make document nodes cursor: pointer - using a boolean filter function
      node.filter((d: Node) => {
        return d.type === 'document' && !!d.url;
      })
      .style('cursor', 'pointer');
      
      // Update node and link positions on each simulation tick
      simulation
        .nodes(nodes)
        .on('tick', () => {
          link
            .attr('x1', (d: any) => d.source.x)
            .attr('y1', (d: any) => d.source.y)
            .attr('x2', (d: any) => d.target.x)
            .attr('y2', (d: any) => d.target.y);
          
          node
            .attr('transform', (d: Node) => `translate(${d.x},${d.y})`);
        });
      
      // Add link force to simulation
      const linkForce = simulation.force('link') as d3.ForceLink<Node, d3.SimulationLinkDatum<Node>>;
      if (linkForce) {
        linkForce.links(links as d3.SimulationLinkDatum<Node>[]);
      }
      
      // Center the view
      const initialTransform = d3.zoomIdentity.translate(width / 2, height / 2).scale(0.8);
      svg.call(zoom.transform, initialTransform);
    } catch (err: any) {
      console.error('Error rendering knowledge graph:', err);
      setError(`Error rendering graph: ${err.message || 'Unknown error'}`);
      
      // Display error message on the SVG
      if (svgRef.current) {
        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();
        
        const width = svgRef.current.clientWidth || 800;
        const height = svgRef.current.clientHeight || 600;
        
        svg.append('text')
          .attr('x', width / 2)
          .attr('y', height / 2)
          .attr('text-anchor', 'middle')
          .attr('fill', '#d32f2f')
          .text('Error rendering graph. Please try again.');
      }
    }
  }, [graphData]);
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <div className="container mx-auto px-4 py-6 flex-1">
        <h1 className="text-2xl font-bold mb-4">Confluence Knowledge Graph</h1>
        
        <div className="mb-6">
          <form onSubmit={handleSearch} className="flex">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Confluence content..."
              className="flex-1 p-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-r-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? <FaSpinner className="animate-spin" /> : <FaSearch />}
            </button>
          </form>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mb-4 flex items-start">
            <FaExclamationTriangle className="mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <p className="font-medium">Error</p>
              <p>{error}</p>
              <button 
                onClick={() => fetchGraphData(searchQuery)} 
                className="mt-2 bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm"
              >
                Retry
              </button>
            </div>
          </div>
        )}
        
        <div className="bg-white rounded-lg shadow-md p-4 mb-4 flex flex-wrap items-center text-sm">
          <div className="flex items-center mr-4 mb-2">
            <div className="w-3 h-3 rounded-full bg-blue-500 mr-1"></div>
            <span>Document</span>
          </div>
          <div className="flex items-center mr-4 mb-2">
            <div className="w-3 h-3 rounded-full bg-orange-400 mr-1"></div>
            <span>Entity</span>
          </div>
          <div className="border-l border-gray-300 pl-4 ml-2 flex flex-wrap">
            <div className="flex items-center mr-4 mb-2">
              <div className="w-4 h-0.5 bg-blue-500 mr-1"></div>
              <span>Contains</span>
            </div>
            <div className="flex items-center mr-4 mb-2">
              <div className="w-4 h-0.5 bg-orange-500 mr-1"></div>
              <span>Related</span>
            </div>
            <div className="flex items-center mb-2">
              <div className="w-4 h-0.5 bg-green-500 mr-1"></div>
              <span>Links to</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden flex-1" style={{ height: 'calc(100vh - 250px)' }}>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <FaSpinner className="animate-spin text-blue-600 text-4xl" />
              <span className="ml-2 text-gray-600">Loading knowledge graph...</span>
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
        
        {graphData && graphData.nodes && graphData.edges && (
          <div className="mt-4 text-sm text-gray-600">
            Showing {graphData.nodes.length} nodes and {graphData.edges.length} connections
            {graphData.query && ` for query: "${graphData.query}"`}
          </div>
        )}
      </div>
    </div>
  );
} 