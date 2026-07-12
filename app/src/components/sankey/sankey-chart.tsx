'use client';

import { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import {
  sankey as d3Sankey,
  sankeyLinkHorizontal,
  type SankeyNode,
  type SankeyLink,
} from 'd3-sankey';

interface SankeyNodeData {
  id: string;
  label: string;
  type: string;
  value?: number;
  color?: string;
}

interface SankeyLinkData {
  source: string;
  target: string;
  value: number;
  color: string;
  category: string;
  count: number;
}

interface Props {
  nodes: SankeyNodeData[];
  links: SankeyLinkData[];
  onLinkClick?: (category: string, direction: 'inflow' | 'outflow') => void;
  width?: number;
  height?: number;
}

// Extra (non-positional) properties d3-sankey carries through the layout
type NodeExtra = Omit<SankeyNodeData, 'value'>;
interface LinkExtra {
  color: string;
  category: string;
  count: number;
}

type LayoutNode = SankeyNode<NodeExtra, LinkExtra>;
type LayoutLink = SankeyLink<NodeExtra, LinkExtra>;

export function SankeyChart({ nodes, links, onLinkClick, width = 900, height = 500 }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0 || links.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Build node/link indices
    const nodeMap = new Map(nodes.map((n, i) => [n.id, i]));

    const sankeyNodes: LayoutNode[] = nodes.map(n => ({
      id: n.id,
      label: n.label,
      type: n.type,
      color: n.color,
    }));
    const sankeyLinks: LayoutLink[] = links
      .filter(l => nodeMap.has(l.source) && nodeMap.has(l.target))
      .map(l => ({
        source: nodeMap.get(l.source)!,
        target: nodeMap.get(l.target)!,
        value: l.value,
        color: l.color,
        category: l.category,
        count: l.count,
      }));

    if (sankeyLinks.length === 0) return;

    const sankeyLayout = d3Sankey<NodeExtra, LinkExtra>()
      .nodeWidth(18)
      .nodePadding(14)
      .extent([[0, 0], [innerWidth, innerHeight]]);

    const { nodes: layoutNodes, links: layoutLinks } = sankeyLayout({
      nodes: sankeyNodes,
      links: sankeyLinks,
    });

    // Draw links
    g.append('g')
      .selectAll('path')
      .data(layoutLinks)
      .join('path')
      .attr('d', sankeyLinkHorizontal())
      .attr('fill', 'none')
      .attr('stroke', d => d.color || '#4b5563')
      .attr('stroke-opacity', 0.4)
      .attr('stroke-width', d => Math.max(1, d.width || 1))
      .style('cursor', 'pointer')
      .on('mouseenter', function (event: MouseEvent, d) {
        d3.select(this).attr('stroke-opacity', 0.7);
        const sourceNode = d.source as LayoutNode;
        const targetNode = d.target as LayoutNode;
        const amountStr = (d.value / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        setTooltip({
          x: event.offsetX,
          y: event.offsetY - 10,
          content: `${sourceNode.label || ''} → ${targetNode.label || ''}\nAmount: ${amountStr}\n${d.count > 0 ? `${d.count} transactions` : 'Reserves carried forward'}`,
        });
      })
      .on('mouseleave', function () {
        d3.select(this).attr('stroke-opacity', 0.4);
        setTooltip(null);
      })
      .on('click', (_event: MouseEvent, d) => {
        if (!onLinkClick || !d.category) return;
        const source = d.source as LayoutNode;
        const direction = source.type?.includes('inflow') || d.category?.startsWith('inflow_')
          ? 'inflow'
          : 'outflow';
        onLinkClick(d.category, direction);
      });

    // Draw nodes
    const nodeGroup = g.append('g')
      .selectAll('g')
      .data(layoutNodes)
      .join('g');

    nodeGroup
      .append('rect')
      .attr('x', d => d.x0 ?? 0)
      .attr('y', d => d.y0 ?? 0)
      .attr('width', d => (d.x1 ?? 0) - (d.x0 ?? 0))
      .attr('height', d => Math.max(1, (d.y1 ?? 0) - (d.y0 ?? 0)))
      .attr('fill', d => {
        if (d.type === 'start_total' || d.type === 'account_start') return '#3b82f6';
        if (d.type === 'end_total' || d.type === 'account_end') return '#8b5cf6';
        return d.color || '#6b7280';
      })
      .attr('rx', 3);

    // Node labels
    nodeGroup
      .append('text')
      .attr('x', d => ((d.x0 ?? 0) < innerWidth / 2 ? (d.x1 ?? 0) + 8 : (d.x0 ?? 0) - 8))
      .attr('y', d => ((d.y0 ?? 0) + (d.y1 ?? 0)) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', d => ((d.x0 ?? 0) < innerWidth / 2 ? 'start' : 'end'))
      .attr('fill', '#d1d5db')
      .attr('font-size', '11px')
      .attr('font-family', 'inherit')
      .text(d => d.label || '');

  }, [nodes, links, width, height, onLinkClick]);

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="overflow-visible"
      />
      {tooltip && (
        <div
          className="absolute pointer-events-none bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-300 whitespace-pre-line shadow-xl z-10"
          style={{ left: tooltip.x + 12, top: tooltip.y }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
}
