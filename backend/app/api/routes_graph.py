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

    # 3. Map GAT attention weights onto the EgoGraph links
    # The network_reasons contain signals like "gat_attention_edge_rankX"
    # We parse the explanations to extract the source->target attention
    attention_map = {}
    for reason in network_reasons:
        if "gat_attention_edge" in reason.get("signal", ""):
            exp = reason.get("explanation", "")
            weight = reason.get("weight", 0.0)
            
            # Attempt to parse "edge A -> B" from explanation string
            # Example: "GAT Layer-2 assigned attention 0.950 to edge BANK01 -> BANK02"
            if " to edge " in exp and " -> " in exp:
                parts = exp.split(" to edge ")[1].split(" (")[0]
                src_dst = parts.split(" -> ")
                if len(src_dst) == 2:
                    src, dst = src_dst[0].strip(), src_dst[1].strip()
                    attention_map[f"{src}|{dst}"] = weight

    logger.debug(f"Parsed {len(attention_map)} attention edges from GAT.")

    # 4. Enrich links with parsed attention
    enriched_links = []
    for link in ego_data.get("links", []):
        src = link.get("source")
        dst = link.get("target")
        
        # Check both directed and undirected matching
        attn = attention_map.get(f"{src}|{dst}", 
               attention_map.get(f"{dst}|{src}", 0.05))
               
        # Boost visualization flag for high attention
        is_risky = link.get("is_risky", False) or attn > 0.70
        
        link["gat_attention"] = attn
        link["is_risky"] = is_risky
        enriched_links.append(link)
        
    ego_data["links"] = enriched_links
    
    logger.info(f"Successfully enriched {len(enriched_links)} links with GAT attention.")
    return ego_data
