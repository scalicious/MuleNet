from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import logging

logger = logging.getLogger(__name__)

from app.services.demo_runner import demo_runner

router = APIRouter(tags=["Attack Simulator"])

class SimulationRequest(BaseModel):
    """
    Request model for injecting simulated AML attack scenarios into the live scoring engine.
    """
    scenario_type: str = Field(
        default="ATO",
        description="Type of adversarial pattern to inject: 'ATO' | 'SMURFING' | 'RING_WASH' | 'FAN_IN'"
    )
    account_id: Optional[str] = Field(
        default=None,
        description="Target account identifier (e.g., 'BANK01_ACC1042'). Defaults to synthetic account."
    )
    amount: Optional[float] = Field(
        default=49500.0,
        description="Transaction amount in USD. Defaults to typical scenario values."
    )

    class Config:
        json_schema_extra = {
            "example": {
                "scenario_type": "ATO",
                "account_id": "BANK01_ACC1042",
                "amount": 49500.0
            }
        }


class PresetScenarioInfo(BaseModel):
    id: str
    name: str
    description: str
    default_amount: float
    target_typology: str


@router.get("/simulator/presets", response_model=List[PresetScenarioInfo])
async def list_simulation_presets():
    """
    Lists predefined attack simulation scenarios for Person 1's frontend Attack Simulator Panel.
    Enables judges to trigger preset adversarial typologies with a single click.
    """
    return [
        PresetScenarioInfo(
            id="ATO",
            name="Simulate Account Takeover",
            description="Rapid pass-through mule pattern following credential change.",
            default_amount=49500.0,
            target_typology="Rapid Pass-Through Mule Behavior"
        ),
        PresetScenarioInfo(
            id="SMURFING",
            name="Simulate Smurfing",
            description="High-velocity structuring of repeated amounts just below $10k threshold.",
            default_amount=9500.0,
            target_typology="Smurfing / Structuring"
        ),
        PresetScenarioInfo(
            id="RING_WASH",
            name="Simulate Mule Ring",
            description="Multi-hop circular flow traversing cross-bank coordinated accounts.",
            default_amount=45000.0,
            target_typology="Cross-Bank Coordinated Mule Ring"
        ),
        PresetScenarioInfo(
            id="FAN_IN",
            name="Simulate Fan-In Collection Hub",
            description="Multiple feeder accounts channeling illicit funds into a central collector hub.",
            default_amount=32000.0,
            target_typology="Fan-In Collection Hub"
        )
    ]


@router.post("/simulator/inject")
async def inject_simulation(payload: SimulationRequest):
    """
    Injects an adversarial attack pattern into the live scoring stream.
    Directly feeds into the SSE transaction feed for judge demonstration.
    """
    logger.info(
        f"[Simulator] Inbound attack injection: type={payload.scenario_type}, "
        f"account={payload.account_id}, amount={payload.amount}"
    )
    
    injected_event = await demo_runner.inject_scenario(
        scenario_type=payload.scenario_type,
        account_id=payload.account_id,
        amount=payload.amount
    )
    
    return {
        "status": "INJECTED",
        "scenario_type": payload.scenario_type,
        "transaction_id": injected_event.get("transaction_id"),
        "message": f"Successfully injected {payload.scenario_type} attack pattern."
    }


@router.delete("/simulator/queue")
async def clear_simulation_queue():
    """
    Clears pending injected scenarios from the live demo queue.
    Useful for resetting the presentation state during live demonstrations.
    """
    cleared = demo_runner.clear_injected_queue()
    return {
        "status": "CLEARED",
        "cleared_count": cleared,
        "message": f"Successfully cleared {cleared} pending attack events from queue."
    }

