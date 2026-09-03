import logging
from fastapi import APIRouter, HTTPException
from typing import Optional

from app.core.memory_graph import memory_graph
from app.models.schema import EgoGraphResponse
from app.services.network_lens import network_risk_engine

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Graph & Forensics"])

@router.get("/graph/ego/{account_id}", response_model=EgoGraphResponse)
async def get_ego_graph(account_id: str, hops: int = 2, target_id: Optional[str] = None):
    """
    Extracts 1-2 hop ego-subgraph for an account.
    Integrates GAT attention edge weights dynamically from the network risk engine.
    """
    logger.info(f"Extracting {hops}-hop ego graph for {account_id}")
    
    if not account_id:
        raise HTTPException(status_code=400, detail="account_id is required")
        
    if hops < 1 or hops > 3:
        raise HTTPException(status_code=400, detail="hops must be between 1 and 3")

    # 1. Fetch raw topology from MemoryGraph
    ego_data = memory_graph.get_ego_subgraph(account_id=account_id, as_of_timestamp="", hops=hops)
    
    if len(ego_data.get("nodes", [])) <= 1:
        logger.warning(f"Degenerate graph returned for {account_id}")
        return ego_data
        
    # 2. Run GAT Network Risk Engine to extract attention weights
    # target_id is used for attention targeting if provided, otherwise fallback to account_id
    gat_target = target_id if target_id else account_id
    
    try:
        # Score network implicitly runs GAT forward pass and returns attention reasons
        _, network_reasons = network_risk_engine.score_network(
            account_id=account_id,
            counterparty_id=gat_target,
            as_of_timestamp="",
            graph_manager=memory_graph
        )
    except Exception as e:
        logger.error(f"GAT model failed during ego graph extraction: {e}")
        network_reasons = []
