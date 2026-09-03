from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

class TypologyDetector:
    """
    Deterministic motif and laundering topology engine (Person 5 Deliverable).
    
    Identifies deterministic forensic patterns including:
    1. Rapid Pass-Through Mule Behavior (forwarding high ratio of recently received funds, or rapid transfer post-setup)
    2. Fan-In Collection Hub & Fan-Out Distribution Hub (high counterparty interaction within active window)
    3. Smurfing / Structuring (clusters of transactions just below the $10,000 regulatory reporting threshold)
    4. Cross-Bank Coordinated Mule Ring (circular flow patterns traversing multiple accounts/banks)
    """
    
    # Standard AML Threshold Constants
    PASS_THROUGH_TIME_LIMIT_MINS: float = 15.0
    PASS_THROUGH_MIN_AMOUNT: float = 5000.0
    PASS_THROUGH_MIN_RATIO: float = 0.80
    HUB_NEIGHBOR_THRESHOLD: int = 5
    SMURFING_LOWER_THRESHOLD: float = 9000.0
    SMURFING_UPPER_THRESHOLD: float = 9999.0
    SMURFING_MIN_OCCURRENCES: int = 3
    RING_MIN_AMOUNT: float = 20000.0
    RING_MIN_NEIGHBORS: int = 3

    @staticmethod
    def detect_pass_through(
        amount: float,
        setup_gap_minutes: float = 999.0,
        amount_received: Optional[float] = None,
        time_diff_minutes: Optional[float] = None,
        threshold_ratio: float = PASS_THROUGH_MIN_RATIO,
        max_time_window_mins: float = PASS_THROUGH_TIME_LIMIT_MINS
    ) -> Dict[str, str]:
        """
        Detects Rapid Pass-Through Mule Behavior.
        
        Evaluates two forensic triggers:
        1. Inflow-to-outflow forwarding ratio:
           Account receives funds and forwards >= threshold_ratio (e.g., 80%+) within 15 minutes.
        2. Setup-to-action temporal gap:
           Large transfer (>= $5,000) executed within 15 minutes of profile, mobile, or payee modification.
        """
        # Trigger 1: Forensic forwarding ratio (Data Entry 1 in Person 5 workflow)
        if amount_received is not None and amount_received > 0:
            effective_time = time_diff_minutes if time_diff_minutes is not None else setup_gap_minutes
            ratio = amount / amount_received
            if ratio >= threshold_ratio and effective_time <= max_time_window_mins:
                ratio_pct = int(round(ratio * 100))
                evidence_text = f"The sender forwarded {ratio_pct}% of recently received funds within {int(effective_time)} minutes."
                logger.info(f"[Typology] Pass-through ratio triggered: {ratio_pct}% in {effective_time}m")
                return {
                    "name": "Rapid Pass-Through Mule Behavior",
                    "evidence": evidence_text
                }

        # Trigger 2: Setup gap threshold (Preserves default behavior)
        if setup_gap_minutes < max_time_window_mins and amount >= TypologyDetector.PASS_THROUGH_MIN_AMOUNT:
            return {
                "name": "Rapid Pass-Through Mule Behavior",
                "evidence": f"Large transfer (${amount:,.2f}) executed {int(setup_gap_minutes)} minutes after account/payee modification."
            }

        return {}

    @staticmethod
    def detect_fan_in_out(
        neighbor_count: int,
        is_receiving: bool = True,
        threshold: int = HUB_NEIGHBOR_THRESHOLD
    ) -> Dict[str, str]:
        """
        Detects Fan-In Collection Hubs or Fan-Out Distribution Hubs.
        Triggered when an account interacts with >= threshold distinct counterparties in active window.
        """
        if neighbor_count >= threshold:
            direction = "Fan-In Collection Hub" if is_receiving else "Fan-Out Distribution Hub"
            return {
                "name": direction,
                "evidence": f"Account interacts with {neighbor_count} distinct counterparties in active window."
            }
        return {}

    @staticmethod
    def detect_smurfing(
        transaction_amounts: List[float],
        lower_bound: float = SMURFING_LOWER_THRESHOLD,
        upper_bound: float = SMURFING_UPPER_THRESHOLD,
        min_count: int = SMURFING_MIN_OCCURRENCES
    ) -> Dict[str, str]:
        """
        Detects structuring (smurfing) transactions just below reporting thresholds (e.g., $10,000).
        """
        suspicious_txns = [amt for amt in transaction_amounts if lower_bound <= amt <= upper_bound]
        if len(suspicious_txns) >= min_count:
            return {
                "name": "Smurfing / Structuring",
                "evidence": f"{len(suspicious_txns)} transactions detected just below the $10k reporting threshold."
            }
        return {}

    @staticmethod
    def detect_cycles(
        is_ring_member: bool,
        amount: float,
        neighbor_count: int,
        amount_threshold: float = RING_MIN_AMOUNT,
        neighbor_threshold: int = RING_MIN_NEIGHBORS
    ) -> Dict[str, str]:
        """
        Detects coordinated mule rings or circular transaction loops traversing multiple financial entities.
        """
        if is_ring_member or (amount >= amount_threshold and neighbor_count >= neighbor_threshold):
            return {
                "name": "Cross-Bank Coordinated Mule Ring",
                "evidence": "Account identified in a circular transaction flow traversing multiple financial entities."
            }
        return {}

    @staticmethod
    def detect_typologies(
        amount: float,
        setup_gap_minutes: float,
        neighbor_count: int,
        is_ring_member: bool = False,
        historical_amounts: Optional[List[float]] = None,
        amount_received: Optional[float] = None,
        time_diff_minutes: Optional[float] = None
    ) -> List[Dict[str, str]]:
        """
        Runs all deterministic typology rules against the current transaction context and history.
        Returns a structured list of detected typologies and evidence strings.
        """
        if historical_amounts is None:
            historical_amounts = []
            
        typologies: List[Dict[str, str]] = []
        
        # 1. Rapid Pass-Through Mule Behavior
        pt = TypologyDetector.detect_pass_through(
            amount=amount,
            setup_gap_minutes=setup_gap_minutes,
            amount_received=amount_received,
            time_diff_minutes=time_diff_minutes
        )
        if pt:
            typologies.append(pt)
            
        # 2. Fan-In / Fan-Out Hub Detection
        fio = TypologyDetector.detect_fan_in_out(neighbor_count=neighbor_count)
        if fio:
            typologies.append(fio)
            
        # 3. Smurfing / Structuring
        smurf = TypologyDetector.detect_smurfing(transaction_amounts=historical_amounts + [amount])
        if smurf:
            typologies.append(smurf)
            
        # 4. Circular Mule Ring
        cycle = TypologyDetector.detect_cycles(
            is_ring_member=is_ring_member,
            amount=amount,
            neighbor_count=neighbor_count
        )
        if cycle:
            typologies.append(cycle)

        return typologies

    @staticmethod
    def format_forensic_evidence(typologies: List[Dict[str, str]]) -> str:
        """
        Formats detected typology evidence into clean, plain-language text for judges and compliance analysts.
        """
        if not typologies:
            return "No suspicious laundering typologies detected in active window."
        
        bullets = [f"• {t.get('name', 'Typology')}: {t.get('evidence', '')}" for t in typologies]
        return "\n".join(bullets)

typology_detector = TypologyDetector()
