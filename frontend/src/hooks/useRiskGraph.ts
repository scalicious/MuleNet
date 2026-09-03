import { useState, useMemo, useCallback } from 'react';
import { GraphData, GraphNode, GraphLink } from '../types/risk';
import { MOCK_GRAPH_DATA } from '../api/mockGraphData';
import { getAccount, AccountProfile } from '../services/accountService';

export function useRiskGraph(initialGraph: GraphData = MOCK_GRAPH_DATA) {
  const [graphData, setGraphData] = useState<GraphData>(initialGraph);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [accountProfile, setAccountProfile] = useState<AccountProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(false);

  // Compute adjacency matrix
  const adjacency = useMemo(() => {
    const map = new Map<string, Set<string>>();
    graphData.nodes.forEach((n) => map.set(n.id, new Set()));

    graphData.links.forEach((link) => {
      const sourceId = typeof link.source === 'object' ? (link.source as GraphNode).id : (link.source as string);
      const targetId = typeof link.target === 'object' ? (link.target as GraphNode).id : (link.target as string);

      if (!map.has(sourceId)) map.set(sourceId, new Set());
      if (!map.has(targetId)) map.set(targetId, new Set());

      map.get(sourceId)?.add(targetId);
      map.get(targetId)?.add(sourceId);
    });
    return map;
  }, [graphData]);

  // Active selected node object
  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return graphData.nodes.find((n) => n.id === selectedNodeId) || null;
  }, [selectedNodeId, graphData.nodes]);

  // Calculate 2-hop neighborhood
  const { directNeighbors, twoHopNeighbors } = useMemo(() => {
    if (!selectedNodeId) {
      return {
        directNeighbors: new Set<string>(),
        twoHopNeighbors: new Set<string>(),
      };
    }

    const hop1 = adjacency.get(selectedNodeId) || new Set<string>();
    const hop2 = new Set<string>(hop1);
    hop2.add(selectedNodeId);

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
  }, [selectedNodeId, adjacency]);

  // Select account and fetch account profile through service layer
  const selectAccount = useCallback(async (accountId: string | null) => {
    setSelectedNodeId(accountId);
    if (!accountId) {
      setAccountProfile(null);
      return;
    }

    setIsLoadingProfile(true);
    try {
      const profile = await getAccount(accountId);
      setAccountProfile(profile);
    } catch (err) {
      console.warn(`[useRiskGraph] Error fetching account profile for ${accountId}:`, err);
    } finally {
      setIsLoadingProfile(false);
    }
  }, []);

  const resetFocus = useCallback(() => {
    setSelectedNodeId(null);
    setAccountProfile(null);
  }, []);

  return {
    graphData,
    setGraphData,
    selectedNodeId,
    selectedNode,
    accountProfile,
    isLoadingProfile,
    directNeighbors,
    twoHopNeighbors,
    adjacency,
    selectAccount,
    resetFocus,
  };
}
