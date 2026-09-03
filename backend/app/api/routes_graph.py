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
