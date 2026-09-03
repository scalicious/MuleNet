import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import ForceGraph2D, { ForceGraphMethods } from 'react-force-graph-2d';
import { Network, Maximize2, RotateCcw, Shield, Layers, DollarSign, Users, AlertTriangle, Activity } from 'lucide-react';
import { GraphData, GraphNode, GraphLink, RiskTier } from '../types/risk';
import { MOCK_GRAPH_DATA } from '../api/mockGraphData';
import RiskBadge from './RiskBadge';

const RISK_COLORS: Record<RiskTier, string> = {
  LOW: '#10b981',      // Green
  MEDIUM: '#eab308',   // Yellow
  HIGH: '#f97316',     // Orange
  CRITICAL: '#ef4444', // Red
};

export interface GraphExplorerProps {
  initialData?: GraphData;
  onSelectAccount?: (accountId: string) => void;
  selectedAccountId?: string | null;
}

export default function GraphExplorer({
  initialData = MOCK_GRAPH_DATA,
  onSelectAccount,
  selectedAccountId,
}: GraphExplorerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<ForceGraphMethods>(null);

  const [dimensions, setDimensions] = useState({ width: 800, height: 560 });
  const [internalSelectedNode, setInternalSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Motion preference detection
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  // Responsive dimensions handler with ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setDimensions({
          width: clientWidth || 800,
          height: clientHeight >= 380 ? clientHeight : 560,
        });
      }
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });

    resizeObserver.observe(containerRef.current);
    window.addEventListener('resize', updateDimensions);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  // Compute adjacency for 2-hop neighborhoods
  const adjacency = useMemo(() => {
    const map = new Map<string, Set<string>>();
    initialData.nodes.forEach((n) => map.set(n.id, new Set()));

    initialData.links.forEach((link) => {
      const sourceId = typeof link.source === 'object' ? (link.source as GraphNode).id : (link.source as string);
      const targetId = typeof link.target === 'object' ? (link.target as GraphNode).id : (link.target as string);

      if (!map.has(sourceId)) map.set(sourceId, new Set());
      if (!map.has(targetId)) map.set(targetId, new Set());

      map.get(sourceId)?.add(targetId);
      map.get(targetId)?.add(sourceId);
    });
    return map;
  }, [initialData]);

  // Selected node (sync with external prop or internal state)
  const activeSelected = useMemo(() => {
    if (selectedAccountId) {
      return initialData.nodes.find((n) => n.id === selectedAccountId) || null;
    }
    return internalSelectedNode;
  }, [selectedAccountId, internalSelectedNode, initialData]);

  // Calculate 2-hop neighborhood set around activeSelected
  const { directNeighbors, twoHopNeighbors } = useMemo(() => {
    if (!activeSelected) {
      return {
        directNeighbors: new Set<string>(),
        twoHopNeighbors: new Set<string>(),
      };
    }

    const hop1 = adjacency.get(activeSelected.id) || new Set<string>();
    const hop2 = new Set<string>(hop1);
    hop2.add(activeSelected.id);

    hop1.forEach((neighborId) => {
      const subNeighbors = adjacency.get(neighborId);
      if (subNeighbors) {
        subNeighbors.forEach((nId) => hop2.add(nId));
      }
    });

    return {
      directNeighbors: hop1,
      twoHopNeighbors: hop2,
    };
  }, [activeSelected, adjacency]);

  // Selected account detailed stats
  const selectedNodeStats = useMemo(() => {
    if (!activeSelected) return null;
    const connectedNodeIds = adjacency.get(activeSelected.id) || new Set<string>();
    const connectedNodes = initialData.nodes.filter((n) => connectedNodeIds.has(n.id));
    const highRiskConnCount = connectedNodes.filter(
      (n) => n.riskTier === 'HIGH' || n.riskTier === 'CRITICAL'
    ).length;

    return {
      directCount: connectedNodeIds.size,
      twoHopCount: twoHopNeighbors.size,
      highRiskCount: highRiskConnCount,
    };
  }, [activeSelected, adjacency, initialData.nodes, twoHopNeighbors]);

  // Handle node click
  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      setInternalSelectedNode(node);
      if (onSelectAccount) {
        onSelectAccount(node.id);
      }

      // Re-center and focus graph around clicked node
      if (fgRef.current && node.x !== undefined && node.y !== undefined) {
        fgRef.current.centerAt(node.x, node.y, 700);
        fgRef.current.zoom(2.4, 700);
      }
    },
    [onSelectAccount]
  );

  // Fit graph to screen
  const handleFitNetwork = useCallback(() => {
    if (fgRef.current) {
      fgRef.current.zoomToFit(600, 45);
    }
  }, []);

  // Reset focus & filters
  const handleResetFocus = useCallback(() => {
    setInternalSelectedNode(null);
    if (onSelectAccount) {
      onSelectAccount('');
    }
    if (fgRef.current) {
      fgRef.current.zoomToFit(600, 45);
    }
  }, [onSelectAccount]);

  // Custom Canvas Node Drawing (High-precision institutional styling)
  const drawNode = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const isFocused = activeSelected?.id === node.id;
      const isDirectNeighbor = directNeighbors.has(node.id);
      const isTwoHopNeighbor = twoHopNeighbors.has(node.id);
      const isDimmed = Boolean(activeSelected && !isFocused && !isTwoHopNeighbor);

      const color = RISK_COLORS[node.riskTier as RiskTier] || '#38bdf8';
      const radius = isFocused ? 9 : node.riskTier === 'CRITICAL' ? 7 : 5.5;

      ctx.save();
      ctx.globalAlpha = isDimmed ? 0.12 : 1;

      // Outer focus ring for selected node
      if (isFocused) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 4.5, 0, 2 * Math.PI, false);
        ctx.strokeStyle = '#06b6d4'; // Cyan focus halo
        ctx.lineWidth = 2.2 / globalScale;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 7, 0, 2 * Math.PI, false);
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
        ctx.lineWidth = 1 / globalScale;
        ctx.stroke();
      }

      // 1-hop direct neighbor subtle ring
      if (activeSelected && isDirectNeighbor && !isFocused) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 2.5, 0, 2 * Math.PI, false);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1.2 / globalScale;
        ctx.stroke();
      }

      // Base Node Fill
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = isFocused ? '#ffffff' : 'rgba(11, 15, 23, 0.9)';
      ctx.lineWidth = 1.2 / globalScale;
      ctx.stroke();

      // Intelligent Text Label
      const shouldShowLabel = isFocused || node === hoveredNode || node.riskTier === 'CRITICAL' || globalScale > 1.8;
      if (shouldShowLabel && !isDimmed) {
        const label = node.id;
        const fontSize = Math.max(9.5 / globalScale, 2.5);
        ctx.font = `600 ${fontSize}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const textWidth = ctx.measureText(label).width;
        const pillHeight = fontSize + 4 / globalScale;
        const pillY = node.y + radius + pillHeight / 2 + 2.5 / globalScale;

        // Clean label backing chip
        ctx.fillStyle = isFocused ? 'rgba(8, 51, 68, 0.95)' : 'rgba(11, 15, 23, 0.88)';
        ctx.strokeStyle = isFocused ? '#06b6d4' : isDirectNeighbor ? 'rgba(56, 189, 248, 0.5)' : 'rgba(31, 41, 61, 0.8)';
        ctx.lineWidth = 0.8 / globalScale;
        ctx.fillRect(node.x - textWidth / 2 - 3 / globalScale, pillY - pillHeight / 2, textWidth + 6 / globalScale, pillHeight);
        ctx.strokeRect(node.x - textWidth / 2 - 3 / globalScale, pillY - pillHeight / 2, textWidth + 6 / globalScale, pillHeight);

        ctx.fillStyle = isFocused ? '#38bdf8' : node.riskTier === 'CRITICAL' ? '#fca5a5' : '#e2e8f0';
        ctx.fillText(label, node.x, pillY);
      }

      ctx.restore();
    },
    [activeSelected, directNeighbors, twoHopNeighbors, hoveredNode]
  );

  return (
    <div className="w-full h-full bg-[#0d131f] border border-[#1f293d] rounded-lg overflow-hidden flex flex-col shadow-sm">
      {/* Header Bar */}
      <div className="px-4 sm:px-6 py-3.5 border-b border-[#1f293d] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0b0f17]/70 shrink-0">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-950/40 border border-indigo-800/40 flex items-center justify-center text-indigo-400 shrink-0">
            <Network className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-bold tracking-wider uppercase text-slate-100 font-sans">
              INTERACTIVE RISK GRAPH • 2-HOP TOPOLOGY
            </h2>
            <p className="text-[11px] text-slate-400 font-mono">
              Graph neural network attention topology of accounts, mule syndicates & routing
            </p>
          </div>
        </div>

        {/* Controls & Legend */}
        <div className="flex items-center flex-wrap gap-2 self-start sm:self-center">
          {/* Risk Legend */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded border border-slate-800 bg-slate-900/60 text-[10px] font-mono font-medium">
            <span className="text-slate-500 uppercase text-[9px]">TIERS:</span>
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> LOW
            </span>
            <span className="flex items-center gap-1 text-yellow-400">
              <span className="w-2 h-2 rounded-full bg-yellow-500"></span> MED
            </span>
            <span className="flex items-center gap-1 text-orange-400">
              <span className="w-2 h-2 rounded-full bg-orange-500"></span> HIGH
            </span>
            <span className="flex items-center gap-1 text-rose-400">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span> CRIT
            </span>
          </div>

          {/* Fit Network Button */}
          <button
            onClick={handleFitNetwork}
            title="Fit network to view"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-medium border border-slate-700/80 bg-slate-800/60 text-slate-200 hover:bg-slate-700/80 hover:text-white transition"
          >
            <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Fit Network</span>
          </button>

          {/* Reset Focus Button */}
          <button
            onClick={handleResetFocus}
            title="Reset focus and show all nodes"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-medium border border-slate-700/80 bg-slate-800/60 text-slate-200 hover:bg-slate-700/80 hover:text-white transition"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* Network Statistics Bar */}
      <div className="px-4 sm:px-6 py-2 bg-[#090d15] border-b border-[#1f293d]/80 flex items-center justify-between flex-wrap gap-3 text-xs font-mono shrink-0">
        <div className="flex items-center space-x-3 sm:space-x-5 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 uppercase">Nodes:</span>
            <span className="font-bold text-slate-200">148</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 uppercase">Active Links:</span>
            <span className="font-bold text-cyan-300">326</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 uppercase">High Risk:</span>
            <span className="font-bold text-amber-400">17</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 uppercase">Critical:</span>
            <span className="font-bold text-rose-400">4</span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-1 text-[11px] text-slate-500">
          <Activity className="w-3 h-3 text-cyan-400" />
          <span>GAT Attention Edge Weights Active</span>
        </div>
      </div>

      {/* Main Canvas & Overlay Area */}
      <div className="relative flex-1 w-full min-h-[420px] sm:min-h-[500px] lg:min-h-[560px] bg-[#090d15]" ref={containerRef}>
        <ForceGraph2D
          ref={fgRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={initialData}
          nodeId="id"
          nodeCanvasObject={drawNode}
          nodePointerAreaPaint={(node: any, color, ctx) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(node.x, node.y, 14, 0, 2 * Math.PI, false);
            ctx.fill();
          }}
          onNodeClick={handleNodeClick}
          onNodeHover={(node) => setHoveredNode(node as GraphNode | null)}
          linkColor={(link: any) => {
            if (activeSelected) {
              const srcId = typeof link.source === 'object' ? link.source.id : link.source;
              const tgtId = typeof link.target === 'object' ? link.target.id : link.target;
              const isConnected = twoHopNeighbors.has(srcId) && twoHopNeighbors.has(tgtId);
              if (!isConnected) return 'rgba(30, 41, 59, 0.12)';
            }
            return link.isRisky ? 'rgba(239, 68, 68, 0.65)' : 'rgba(56, 189, 248, 0.35)';
          }}
          linkWidth={(link: any) => (link.isRisky ? 2 : 1.2)}
          linkDirectionalArrowLength={4}
          linkDirectionalArrowRelPos={0.9}
          linkDirectionalArrowColor={(link: any) =>
            link.isRisky ? '#ef4444' : '#38bdf8'
          }
          linkDirectionalParticles={(link: any) => {
            if (prefersReducedMotion) return 0;
            if (activeSelected) {
              const srcId = typeof link.source === 'object' ? link.source.id : link.source;
              const tgtId = typeof link.target === 'object' ? link.target.id : link.target;
              if (!twoHopNeighbors.has(srcId) || !twoHopNeighbors.has(tgtId)) return 0;
            }
            return link.isRisky ? 4 : 2;
          }}
          linkDirectionalParticleSpeed={(link: any) =>
            link.amount > 50000 ? 0.009 : 0.004
          }
          linkDirectionalParticleWidth={2}
          linkDirectionalParticleColor={(link: any) =>
            link.isRisky ? '#ef4444' : '#06b6d4'
          }
          backgroundColor="#090d15"
          cooldownTicks={120}
        />

        {/* Hover Tooltip Overlay (when hovering over a node) */}
        {hoveredNode && hoveredNode !== activeSelected && (
          <div className="absolute top-4 left-4 pointer-events-none z-10 bg-[#0d131f]/95 border border-[#1f293d] rounded-lg p-3 shadow-xl backdrop-blur-sm max-w-xs font-mono text-xs">
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5 mb-2">
              <span className="text-cyan-300 font-bold text-sm">{hoveredNode.id}</span>
              <RiskBadge tier={hoveredNode.riskTier} score={hoveredNode.riskScore} size="sm" />
            </div>
            <div className="space-y-1 text-slate-300 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Volume:</span>
                <span className="font-semibold text-slate-100">
                  ${hoveredNode.transactedVolume.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Connections:</span>
                <span className="text-slate-200">
                  {adjacency.get(hoveredNode.id)?.size || 0} Accounts
                </span>
              </div>
              {hoveredNode.muleCluster && (
                <div className="flex justify-between text-rose-400 font-semibold">
                  <span className="text-slate-500">Cluster:</span>
                  <span>{hoveredNode.muleCluster}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Active Selected Account HUD Panel */}
        {activeSelected && selectedNodeStats && (
          <div className="absolute bottom-4 right-4 z-10 bg-[#0d131f]/95 border border-cyan-800/60 rounded-lg p-4 shadow-2xl backdrop-blur-md max-w-sm w-full font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-bold text-slate-100">{activeSelected.id}</span>
              </div>
              <RiskBadge tier={activeSelected.riskTier} score={activeSelected.riskScore} size="sm" />
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              {/* Transaction Volume */}
              <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <DollarSign className="w-3 h-3 text-slate-400" /> Volume
                </div>
                <div className="text-sm font-bold text-slate-100 mt-0.5">
                  ${activeSelected.transactedVolume.toLocaleString()}
                </div>
              </div>

              {/* Connected Accounts */}
              <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Users className="w-3 h-3 text-slate-400" /> Connected Accounts
                </div>
                <div className="text-sm font-bold text-cyan-300 mt-0.5">
                  {selectedNodeStats.directCount} Direct ({selectedNodeStats.twoHopCount} in 2-Hop)
                </div>
              </div>

              {/* High Risk Connections */}
              <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-400" /> High Risk Links
                </div>
                <div className="text-sm font-bold text-rose-400 mt-0.5">
                  {selectedNodeStats.highRiskCount} Risky Neighbors
                </div>
              </div>

              {/* Syndicate Cluster */}
              <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Layers className="w-3 h-3 text-slate-400" /> Syndicate
                </div>
                <div className="text-xs font-bold text-amber-300 mt-0.5 truncate">
                  {activeSelected.muleCluster || 'Individual Node'}
                </div>
              </div>
            </div>

            {/* Subgraph Filtering Cue & Clear Button */}
            <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
              <span className="text-slate-400 italic">
                2-Hop focus active (non-related dimmed)
              </span>
              <button
                onClick={handleResetFocus}
                className="text-cyan-400 hover:text-cyan-300 font-semibold underline underline-offset-2"
              >
                Clear Focus
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
