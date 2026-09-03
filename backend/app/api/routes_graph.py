from fastapi import APIRouter
from app.core.memory_graph import memory_graph
from app.models.schema import EgoGraphResponse

router = APIRouter(tags=["Graph & Forensics"])

@router.get("/graph/ego/{account_id}", response_model=EgoGraphResponse)
async def get_ego_graph(account_id: str, hops: int = 2):
    """
    Extracts 1-2 hop ego-subgraph for an account with GAT attention edge weights.
    """
    # ---------------------------------------------------------
    # PERSON 2 PLACEHOLDER: Network Forensics & Ego-Graph
    # Queries in-memory graph for 1-2 hop neighborhood.
    # TO BE IMPLEMENTED: Attach GAT attention scores to edges dynamically.
    # ---------------------------------------------------------
    ego_data = memory_graph.get_ego_subgraph(account_id=account_id, as_of_timestamp="", hops=hops)
    
    # Placeholder: GAT attention coefficients to be injected here by Person 2
    
    return ego_data
